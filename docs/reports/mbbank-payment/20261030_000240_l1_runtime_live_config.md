# Báo cáo L1 — cấu hình Live, worker, đối soát và isolation

**Phiên:** bắt đầu 29/10/2026 23:49, kiểm tra kết thúc 30/10/2026 khoảng 00:03 UTC+7. **Kết luận:** L1 đạt tiêu chí triển khai và kiểm thử local trong phạm vi đã chốt: build, boundaries và **69/69 test PASS, 0 skipped**. Không nghiệm thu kết nối SePay Live, webhook ngrok hoặc migration Supabase.

## 1. Phạm vi và xác nhận

- Source workspace hiện tại, không commit theo yêu cầu. Giữ các thay đổi tồn tại trước phiên; không sửa UI, không thay source demo/VNPAY contract.
- Người dùng đã xác nhận **webhook secret Live và token API v2 Live được tạo riêng**. Không đọc/sử dụng chúng trong phiên này; mọi request v2 của test dùng fetch giả lập, tài khoản và secret synthetic.
- Tiếp tục chỉ dùng ngrok cho Live sau khi các bước sau sẵn sàng; không yêu cầu deployment dài hạn hay backup/PITR. Không dừng Test/ngrok hoặc tự cấu hình Dashboard vì chưa cutover.
- Tham chiếu [Live Plan](../../MBBank_SePay_Live_Plan.md), [MBBank Payment](../../MBBank_Payment.md), [quyết định L0](20261029_234409_l0_scope_and_real_database_read.md).

## 2. Thay đổi triển khai

| Thành phần | Thay đổi và lý do |
|---|---|
| `server/src/configs/sepay-runtime.ts` | Loader chung API/worker: opt-in boolean strict, enum Test/Live, credential environment phải khớp, account/token/secret bắt buộc; Test chỉ cho DB loopback và non-production. Live yêu cầu CA hợp lệ, TLS xác thực, DB target khớp hostname/port/database, JWT/QR secret cố định. Chặn connection-string query override host/user/settings; bỏ tham số SSL từ URL để không ghi đè TLS đã kiểm chứng. Không đọc `.local/sepay/runtime.json`. |
| `server/src/main.ts` | Dùng loader trước startup; không tự sinh secrets; lỗi startup chỉ ghi classification, không ghi toàn bộ lỗi có thể chứa credential. |
| `server/scripts/worker.cjs`, `server/src/workflows/sepay-worker.ts` | Dùng cùng loader; thêm vòng inbox và reconcile riêng để polling inbox không phải chờ lượt v2. Giữ expiry, VNPAY reconcile, wait queue và reminders. Log health có số lượt, lỗi/busy, thời điểm thành công; không chứa tài khoản/token. SIGTERM/SIGINT chờ task hiện tại và đóng DB. |
| `server/src/modules/payment/sepay.ts` | Hỗ trợ `live`, yêu cầu số tài khoản dạng số và webhook secret Live ít nhất 32 byte; giữ tương thích cấu hình Test hiện tại. |
| `server/src/modules/payment/sepay-api-v2.ts` | Allowlist URL theo enum; cấm redirect; timeout 10s; che lỗi upstream/network; bắt buộc envelope pagination có boolean `has_more`; lookback thực tế theo phút thay vì cả ngày. Tối đa 10 trang, 100 dòng/trang, chờ 400ms trước mỗi request kể cả request đầu lượt. |
| `server/src/platform/database.ts`, `contracts/core.ts` | `ExclusiveWork` dùng `pg_try_advisory_xact_lock` trong transaction riêng, context AsyncLocalStorage dùng cùng kết nối cho các query. Khóa theo môi trường v2 trên cùng DB, serialize cả tài khoản cùng môi trường; 409 BUSY trước upstream request khi khóa đang giữ. Tự giải phóng khi commit/rollback/process chết. SQL khóa nằm trong platform, không nới allowlist hàm SQL module. Không cần bảng/migration mới. |
| `server/src/app.ts` | Token v2 chung theo môi trường, alias Sandbox cũ chỉ dùng Test; Live từ chối alias Sandbox. Nối khóa DB vào admin reconcile và worker. Giữ 8 route, auth và guard không bật provider thử cùng SePay. |
| `sepay-store.ts`, `sepay-booking.ts` | Worker claim, admin read/reprocess/review/resolve và buyer snapshot được giới hạn môi trường + tài khoản. Attempt của môi trường khác gây conflict, không trả QR Test từ API Live hoặc tự hủy attempt. |
| `server/.env.sepay-live.example` | Template không chứa credential, mặc định `SEPAY_ENABLED=false`. Các biến worker và DB target được ghi rõ; không sửa `.env` thực tế. |

Các route cũ giữ nguyên path/method và contract kiểm thử hồi quy. Hành vi bảo vệ mới: Live không nhận token qua trường Sandbox; reconcile không có DB lock bị từ chối; admin chỉ thấy dữ liệu của integration đang cấu hình.

## 3. Môi trường và lệnh kiểm thử

Runner `server/scripts/sepay-local-test.cjs` xác thực dedicated container `eventhub-sepay-local`, PostgreSQL 16, binding `127.0.0.1:55432`, network/volume/credential local. Runner không load `.env` ứng dụng; tạo DB disposable và chạy baseline + migration SePay local. DB cuối: **`eventhub_sepay_830000ed6f7f_test`**, giữ lại để kiểm tra. Không chứa bản sao dữ liệu Supabase. Lượt đầu `eventhub_sepay_da3d4757a97c_test` có 68 PASS; sau bổ sung Live E2E và siết URL, lượt cuối có 69 PASS.

| Lệnh trong `server` | Kết quả |
|---|---|
| `npm.cmd run build` | PASS exit 0 |
| `npm.cmd run check:boundaries` | PASS exit 0 |
| `node scripts/sepay-local-test.cjs` | PASS exit 0; 69 test, 69 pass, 0 fail, 0 skipped; ~31.2 giây |
| `git diff --check` từ repo | PASS exit 0; cảnh báo LF/CRLF đã biết, không whitespace error |

## 4. Ma trận nghiệm thu

| Tiêu chí | Kết quả | Bằng chứng và giới hạn |
|---|---|---|
| Opt-in/fail closed | PASS local | Bỏ từng biến bắt buộc, enum sai, token ngắn, thiếu CA, target sai, account sai, cấu hình worker ngoài giới hạn đều bị từ chối. Disabled giữ hành vi legacy. |
| DB TLS/target | PASS cấu hình | URL `sslmode=no-verify`/`ssl=0` không tắt TLS cấu hình; host/port/user/options override bị chặn. Dùng CA synthetic đáng tin cậy có sẵn cho unit; không thử handshake Live mới trong phiên này. |
| Credential isolation | PASS cấu hình; Live provider NOT RUN | Env marker không khớp hoặc biến Sandbox/Test trong runtime Live bị từ chối. Người dùng xác nhận credential riêng; chưa gọi provider để chứng minh token thực thuộc Live. |
| Endpoint v2 | PASS mock | Live/Sandbox đúng host, redirect error, timeout signal, 401/429/500/302 và network failure không lộ body/token; pagination thiếu/sai bị từ chối, theo trang và lookback 60 phút đúng. |
| Khóa nhiều process | PASS DB local | Child Node giữ lock, reconciler process khác trả BUSY không gọi fetch; kill child giải phóng khóa và process còn lại lấy được. |
| Rollback/recovery | PASS DB local | Ném lỗi sau insert trong exclusive work rollback dữ liệu và giải phóng khóa; lease inbox hết hạn được reclaim qua suite cũ. |
| Worker/admin isolation | PASS DB local | Cùng ID giao dịch ở Test/Live và tài khoản khác; Live chỉ claim/read integration của mình; không reprocess hoặc thêm review vào transaction Test. |
| Buyer Live synthetic | PASS API/DB local | Tạo payment Live, retry cùng ID, POST HMAC hai lần; worker xử lý một transaction và phát đúng một vé. GET/POST vào attempt Test trả 404/409; admin Live không truy cập/reprocess transaction Test. |
| Worker loops | PASS task-level | Inbox vẫn chạy khi reconcile mock đang treo; counters busy và lần thành công đúng. Chưa nghiệm thu process worker dài hạn/ngrok hoặc restart trên máy đích. |
| Hồi quy cũ | PASS local | Demo, VNPAY URL/signature/IPN/reconcile/race/late payment; SePay ownership, durable ACK, duplicate, REVIEW, expiry; auth/order/notification/QR. |
| Không đổi Supabase | Đạt phạm vi | Không kết nối Supabase, không gọi API v2 thật, không apply migration, seed hoặc đổi ACL trong phiên L1. Mọi mutation là DB disposable local. |
| Staging, ngrok Live, chuyển khoản | NOT RUN | Ngoài nghiệm thu L1 local; không báo cáo PASS Live. |

Các dòng log lỗi inbox và VNPAY pending trong suite là ca fault injection/mismatch có chủ đích; suite exit 0. Build lần đầu lỗi kiểu TypeScript cho TLS, đã sửa thành type chỉ gồm CA/rejectUnauthorized rồi build lại PASS.

## 5. Cấu hình và trình tự sử dụng sau L1

Template: `server/.env.sepay-live.example`. Đưa giá trị vào môi trường được bảo vệ cho cả API và worker; không điền secret vào template tracked. Loader không tự đọc file template. `SEPAY_DB_TARGET` là `hostname:port/database`, không credential; `SEPAY_CREDENTIAL_ENV=live` là khai báo môi trường, không phải chứng nhận từ provider. API chạy `npm start`, worker `npm run jobs:watch` sau build, trong `server`, **chỉ khi migration và phạm vi runtime Supabase ở giai đoạn sau đã sẵn sàng**. Không chạy các lệnh đó với Live env ở phiên này.

Các default: inbox 2 giây, batch 10, reconcile 60 giây, lookback 60 phút. Ngrok sẽ trỏ listener Live đã xác minh; port 8011 trong template chỉ là giá trị đề xuất, chưa mở listener hoặc thay tunnel. Test launcher vẫn giữ cho regression local; không yêu cầu chạy Test cùng Live.

## 6. Giới hạn và việc tiếp theo

1. L2 cần migration mới cho Supabase có RLS/revoke và rehearsal PostgreSQL 17; không dùng migration local cũ để tự apply. Backup/PITR vẫn ngoài phạm vi theo chỉ đạo.
2. Khóa transaction giữ một DB connection trong lúc chờ provider (tối đa 10 trang, timeout mỗi request 10s); cần xác minh timeout pooler khi vận hành. Khóa chỉ đồng bộ process dùng cùng database/khóa này; không giới hạn traffic của công cụ ngoài hệ thống hoặc DB khác dùng cùng token.
3. Reconcile dùng cửa sổ lookback, chưa có checkpoint bền vững/cursor catch-up hoặc lịch lưu DB. Outage dài hơn cửa sổ cần đối soát lại có kiểm soát (tối đa 1440 phút mỗi request). Health log mới không thay thế alert inbox lag hoặc giám sát dài hạn L3/L6.
4. Worker isolation và lease hiện được kiểm thử; các failure/race nâng cao quanh webhook/v2 và lease renewal vẫn thuộc kiểm thử vận hành đầy đủ trước Live. Không suy ra mọi lỗi production đã được bao phủ.
5. Credential thực chỉ được xác nhận bởi người dùng; cần runtime/provider verification đúng giai đoạn. Không có hình thức kiểm tra tĩnh nào chứng minh token nhập vào biến Live thực sự do Live cấp.
6. Chưa commit, chưa bật Live, chưa dừng Test, không sửa ngrok hoặc Dashboard. UI vẫn ngoài phạm vi.

## 7. Nguồn kỹ thuật kiểm tra trong phiên

Đã đối chiếu [SePay API v2 môi trường](https://developer.sepay.vn/vi/sepay-api/v2/gioi-thieu), [danh sách giao dịch](https://developer.sepay.vn/vi/sepay-api/v2/giao-dich/danh-sach), [xác thực/rate limit](https://developer.sepay.vn/vi/sepay-api/v2/xac-thuc): base URL tách theo môi trường, Bearer, pagination và timestamp format. Đối chiếu thêm parser `pg-connection-string` đang cài trong repo để chặn query-param override. Không gửi credential đến các trang tài liệu.
