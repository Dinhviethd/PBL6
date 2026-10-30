# Kế hoạch đưa MBBank/SePay từ Test mode sang Live

Ngày lập: 29/10/2026, 22:24 UTC+7; cập nhật L5: 30/10/2026 01:10 UTC+7. Đã nghiệm thu giao dịch thật 10.000 VND qua webhook và đối soát không trùng; retry webhook thật NOT RUN vì Dashboard không cho gửi lại theo người dùng. Tài liệu theo dõi gốc: [MBBank_Payment.md](MBBank_Payment.md). Mỗi công việc tiếp theo phải có report và cập nhật tài liệu gốc.

**Quyết định mới nhất có hiệu lực:** tập trung SePay Live trên máy hiện tại qua ngrok; không yêu cầu domain/deployment dài hạn, staging hoặc chạy SePay Test và Live đồng thời để bắt đầu L1. Người dùng xác nhận Test đã mô phỏng thành công; ngắt sử dụng runtime Test khi chuyển Live nếu không chạy song song. Backup đã được người dùng lưu và được loại khỏi phạm vi xác minh tiếp theo; không dùng backup/PITR làm chặn L0/L1. Source hiện tại được chọn, commit hoãn đến sau tích hợp thành công. Các đoạn tiến độ cũ bên dưới là lịch sử, được thay thế ở những điểm mâu thuẫn bởi [quyết định và bằng chứng mới](reports/mbbank-payment/20261029_234409_l0_scope_and_real_database_read.md). L0 đóng phần quyết định phạm vi để chuyển L1, chưa phải nghiệm thu kỹ thuật Live.

## 1. Phạm vi và quyết định của người dùng

- Bổ sung SePay Live cho thanh toán MBBank tự động, bao gồm QR, webhook, worker, đối soát và các API cần thiết.
- Giữ nguyên API, lịch sử và khả năng sử dụng demo/VNPAY sandbox trong môi trường phù hợp; không xóa hoặc vô hiệu hóa hai phương thức này khi bổ sung SePay. **Không bật demo/VNPAY sandbox trong production**: source hiện chặn provider thử trong production; giữ nguyên giới hạn này. Nếu cần sử dụng đồng thời cả ba phương thức, triển khai trên môi trường phát triển/staging tách biệt có cấu hình phù hợp và chứng minh test không tạo vé Live; production chạy SePay Live và vẫn giữ mã/API callback cũ theo contract đã được kiểm tra.
- Không thay đổi contract/hành vi API cũ. Việc đồng thời khởi tạo hai phương thức trên một đơn phải bị từ chối theo unique unresolved/khóa order; không tự hủy attempt cũ để chuyển phương thức.
- Theo yêu cầu cập nhật: **giai đoạn này chỉ triển khai backend/API, worker, database và kiểm thử; L3 không làm UI checkout/admin**. Kiểm thử buyer/admin qua API client có xác thực hoặc script được kiểm soát. UI là công việc tương lai khi có yêu cầu riêng; không dùng trạng thái hoàn thiện UI làm điều kiện nghiệm thu backend.
- Người dùng xác nhận đã lưu backup database bên ngoài và yêu cầu không tiếp tục xác minh backup/PITR. Phần này không còn là tiêu chí bắt buộc của phạm vi hiện tại; không ghi PASS phục hồi khi chưa kiểm thử. Việc review DDL, phân quyền và tính tương thích dữ liệu vẫn thuộc công việc migration.

## 2. Hiện trạng source và các chặn Live

**Chốt L6 — 30/10/2026:** build PASS; PG17 isolated regression **70/70 PASS, 0 skip**; monitor policy 5/5; runtime Live được restart bằng wrapper mới, health local/public và DB healthy, worker heartbeat mới, monitor `OK` không alert. Thêm `SEPAY_ACCEPT_NEW_PAYMENTS=false` maintenance gate giữ webhook/worker để xử lý payment hiện tại. Data API không cần cho backend đang dùng direct PostgreSQL TLS, theo xác nhận người dùng hiện chưa cấu hình; REST endpoint chưa được kiểm thử và là N/A cho kiến trúc hiện tại. [Runbook vận hành](runbooks/SePay_Live_Operations.md), [báo cáo L6](reports/mbbank-payment/20261030_011000_l6_operations_acceptance.md). Hạn chế còn lại: process chạy trên máy hiện tại, monitor local không paging và không tự restart sau reboot; retry webhook thật NOT RUN theo L5.

**Chốt L5 — 30/10/2026 01:10 UTC+7:** PASS phạm vi giao dịch thật và reconcile không trùng. Người dùng xác nhận HTTP 200 lần đầu và tiền đã ghi có tại MBBank; snapshot cuối vẫn một giao dịch/vé/thông báo/audit. Retry webhook thật **NOT RUN** do Dashboard không cho gửi lại theo người dùng, không lấy reconcile làm bằng chứng retry. Data API của L4 vẫn chưa kiểm tra. [Báo cáo nghiệm thu L5](reports/mbbank-payment/20261030_010334_l5_controlled_transfer.md). Các ghi nhận “đang chờ” bên dưới là lịch sử.

**L5 cập nhật 01:07 ngày 30/10/2026:** khoản thật 10.000 VND đã settlement qua webhook: inbox PROCESSED, payment SUCCEEDED, order PAID, đúng một vé/thông báo/audit. Hai lần reconcile lại nhận duplicates=1/imported=0, không phát thêm vé. Curl buyer xác nhận PAID và một vé. Đang chờ xác nhận retry webhook/HTTP Dashboard và ghi có độc lập. [Bằng chứng L5](reports/mbbank-payment/20261030_010334_l5_controlled_transfer.md).

**L5 đang thực hiện — 30/10/2026 01:03 UTC+7:** người dùng thống nhất thử 10.000 VND và giữ tiền trong tài khoản. Đã tạo case Live riêng, QR/hướng dẫn local và công cụ read-only kiểm tra settlement; baseline PENDING_PAYMENT/PENDING, chưa có inbox/vé/notification/audit verified. Đang chờ người dùng chuyển tiền; chưa nghiệm thu L5. [Báo cáo L5](reports/mbbank-payment/20261030_010334_l5_controlled_transfer.md).

**Cập nhật L4 runtime — 30/10/2026 00:58 UTC+7:** API/worker Live đã chạy với Supabase; ngrok chuyển sang 8011, public health 200, unsigned webhook 401. 14 curl checks với fixture được phép PASS; fixture đã dọn, số users/orders/payments/tickets trở lại 12/24/14/4. Worker đối soát Live ba lượt không lỗi; inbox rỗng. Người dùng xác nhận Dashboard đã bật URL/HMAC. Chưa nghiệm thu webhook có chữ ký thật/settlement hoặc Data API; chưa chuyển khoản L5. [Báo cáo runtime L4](reports/mbbank-payment/20261030_005533_l4_live_runtime_smoke.md). Ghi nhận “chưa bật runtime” phía dưới là lịch sử.

**Bổ sung L4 — bàn giao cấu hình:** người dùng xác nhận credential chưa lưu; đã chuẩn bị file ignored `server/.local/sepay-live.env`, cần điền bốn trường account/secret/token. Đã xác minh URL webhook từ ngrok và route; tunnel còn trỏ 8010, chưa chuyển sang Live 8011. Người dùng cho phép seed dữ liệu kiểm thử riêng và dọn sau khi thành công; chưa seed. [Chi tiết bàn giao](reports/mbbank-payment/20261030_l4_live_configuration_handoff.md).

**Cập nhật L4 — 30/10/2026:** migration `SepayLiveFoundation1793319300000` đã commit trên Supabase qua runner riêng. Preflight, preservation schema/dữ liệu/default ACL, ba bảng RLS, năm index và quyền SQL PASS; kết nối mới xác nhận năm migration. Build/boundaries PASS. **L4 chưa hoàn tất:** chưa chạy API/worker Live, Data API hoặc curl buyer/admin; chờ đường dẫn credential và tài khoản/đơn kiểm thử. Ngrok hiện trỏ 8010, chưa chuyển đến runtime Live. File cấu hình ignored đã chuẩn bị, disabled. [Báo cáo L4](reports/mbbank-payment/20261030_003444_l4_supabase_apply.md). Các ghi nhận “chưa apply” dưới đây là lịch sử trước L4.

**Cập nhật L3 — 30/10/2026:** hoàn thiện Unicode/HMAC headers, kiểm tra lease trước settlement, durable REVIEW cho webhook mơ hồ, reprocess/audit atomic và lọc admin theo thời gian/reference. Suite PostgreSQL 17 hardened: **68/68 PASS, 0 skipped**; chuẩn bị [curl cho tám API](api/SePay_Curl_Runbook.md). Supabase chỉ đọc xác nhận vẫn bốn baseline và chưa có ba bảng SePay; chưa apply hoặc bật Live. [Báo cáo L3](reports/mbbank-payment/20261030_002925_l3_backend_acceptance.md).

**Cập nhật L2 — 30/10/2026 00:20 UTC+7:** migration `SepayLiveFoundation1793319300000` đã chuẩn bị riêng, chưa đăng ký runner chung. Rehearsal PostgreSQL 17.11 local: 10/10 nhóm migration và 62/62 test hồi quy PASS dưới owner không superuser; có RLS/revoke MAINTAIN, preservation, history, collision, lock timeout và rollback. Chưa apply Supabase. [Báo cáo L2](reports/mbbank-payment/20261030_002002_l2_migration_acceptance.md), [runbook review](reports/mbbank-payment/20261030_001340_l2_migration_runbook.md).

**Cập nhật L1 — 30/10/2026 00:03 UTC+7:** đã triển khai loader Test/Live chung API/worker, v2 allowlist, khóa transaction DB cho reconcile và isolation theo môi trường/tài khoản. Build/boundaries PASS; suite local cuối **69/69 PASS, 0 skipped**, có Live synthetic E2E và kiểm thử khóa giữa hai process. Chưa bật Live hoặc thay Supabase. Các ghi nhận trong bảng khảo sát ban đầu bên dưới được cập nhật bởi [báo cáo L1](reports/mbbank-payment/20261030_000240_l1_runtime_live_config.md); migration/verified Live vẫn còn việc.

| Thành phần | Đã xác minh trong source | Việc cần làm |
|---|---|---|
| `server/src/modules/payment/sepay.ts` | `SepayConfig.environment` chỉ có `test`; `validateSepayConfig` từ chối Live. Tạo QR qua `https://vietqr.app/img`. | Bổ sung environment `live` có kiểm tra cấu hình tách biệt; kiểm chứng provider QR thực và contract trước Live. |
| `server/src/main.ts` | Tạo app từ env nhưng chưa truyền `sepay` hay token API v2. | Thêm config loader có validate, opt-in và fail closed; không dùng launcher local làm production. |
| `server/scripts/sepay-local-api.cjs`, `sepay-local-worker.cjs` | Chỉ Test mode, DB guard local, đọc `.local/sepay/runtime.json`. | Giữ công cụ test local; tạo cấu hình/launcher Live có xác minh target và secret riêng. Live qua ngrok ở giai đoạn hiện tại; không dùng runtime Test làm launcher Live. |
| `server/src/modules/payment/sepay-api-v2.ts` | Chỉ `https://userapi-sandbox.sepay.vn/v2`; token Sandbox; giới hạn request theo process. | Thêm Live client theo environment, token Live riêng; kiểm chứng contract, phân trang/rate limit, lịch chạy và đồng bộ giữa nhiều worker. SePay công bố production `https://userapi.sepay.vn/v2`. [API v2](https://developer.sepay.vn/vi/sepay-api/v2/gioi-thieu). |
| `server/scripts/worker.cjs` | Chạy expire, VNPAY reconcile và các job khác; không poll SePay inbox hoặc gọi SePay API v2. Worker SePay local chỉ poll inbox. | Thiết kế worker Live riêng có inbox + health/metrics; duy trì job expire/reconcile cũ; bổ sung lịch đối soát v2 bền vững, giám sát và kiểm thử nhiều instance. |
| `server/src/app.ts` | Có 8 route SePay khi `config.sepay` được bật; `SEPAY_LEGACY_MODE` từ chối SePay + provider cũ enabled. Provider thử còn bị chặn production. | Runtime Live có thể chạy riêng; giữ contract cũ và regression local, không bắt buộc cùng tồn tại ở staging. Giữ guard demo/sandbox production. |
| `client/src/pages/booking/Checkout.tsx` | Nhận `paymentMode` demo/VNPAY sandbox; phương thức VietQR chưa gọi SePay. | Ngoài phạm vi giai đoạn này. Vì chưa có UI SePay, kiểm thử qua API client; chưa tuyên bố người mua có thể dùng chức năng qua checkout hiện tại. |
| Supabase/migration | Inventory read-only P7 ghi 4 baseline migration, không có 3 bảng/index SePay; FK cha UUID khớp. Default ACL `public` rộng cho API roles; local migration chưa revoke/bật RLS. | Review draft [SQL](reports/mbbank-payment/20261029_220700_p7_sepay_additive_migration_review.sql); tạo migration versioned mới, bảo vệ 3 bảng, rehearsal PostgreSQL 17 và duyệt trước apply. Backup/PITR ngoài phạm vi. Không sửa migration local đã chạy. |

Các kết quả này là khảo sát source và report theo thời điểm lập plan. Phải kiểm tra lại tại commit triển khai và trạng thái Supabase trước khi apply.

## 3. Các vị trí phải cấu hình khi chuyển Live

L1 đã hỗ trợ các biến runtime trong `server/.env.sepay-live.example`: ngoài biến dưới đây còn có `SEPAY_CREDENTIAL_ENV`, `SEPAY_DB_TARGET`, `DB_SSL_CA_FILE` và thông số worker. Không đưa giá trị thật vào repo, report, URL log, chat hay frontend env. Loader nhận biến môi trường, không tự load template; Live yêu cầu TLS xác thực và target khớp. Xem báo cáo L1 để biết cách dùng và giới hạn.

| Vị trí | Cấu hình đề xuất | Kiểm tra và nguyên tắc |
|---|---|---|
| Backend `server/src/main.ts` và config loader mới | `SEPAY_ENABLED`, `SEPAY_ENV=live`, `SEPAY_BANK_CODE=MBBank`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_NAME`, `SEPAY_WEBHOOK_SECRET`, `SEPAY_API_V2_TOKEN`. | Không dùng token Sandbox/secret Test. Validate đầy đủ trước khởi động; không có hoặc sai thì không bật route thanh toán, báo lỗi an toàn. `PAYMENT_MODE` cũ giữ ý nghĩa hiện tại. |
| Backend/worker chung | `DATABASE_URL`, TLS CA, `JWT_ACCESS_SECRET`, `QR_SECRET`, `CLIENT_URL`, `HOST`, `PORT`, log và thông số worker theo hệ thống triển khai. | DB Live phải là project Supabase đích đã xác minh sau phê duyệt, TLS verify-full. JWT/QR secret ổn định giữa các instance và lần restart; không dùng `randomBytes` lúc khởi động như launcher local. Không in secrets. |
| Đối soát API v2 | `SEPAY_API_V2_TOKEN`, base URL chọn theo enum environment, lịch/lượt quét và lookback có giới hạn. | Không cho client tùy chọn URL; allowlist `https://userapi.sepay.vn/v2` và Sandbox tương ứng. Token dùng server-side; scope chỉ đọc cần thiết; kiểm thử pagination, giới hạn, timeout và dữ liệu Live đã được phép. |
| Worker SePay Live | Kết nối DB/secret tương ứng backend, đồng hồ UTC/NTP, batch/lease/retry, concurrency, metrics; tách tên service và process local. | Phải chạy xử lý inbox trước mở traffic, tự recover lease, không ảnh hưởng worker expiry/VNPAY; giám sát liveness và tuổi inbox. Không nhầm token/DB giữa Test và Live. |
| SePay Dashboard **Live** | Tài khoản MBBank chính đã liên kết theo người dùng; webhook `https://<ngrok-host>/api/payments/sepay/webhook`, JSON, sự kiện tiền vào, HMAC-SHA256, secret Live riêng, auto-retry và alert. | Chốt URL ngrok đang hoạt động khi runtime Live sẵn sàng; xác minh tài khoản, bộ lọc và delivery. Ngừng sử dụng Test khi chuyển Live, không yêu cầu chạy song song. [Test/Live](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/so-sanh-voi-live). |
| Nhận diện mã trên Dashboard Live | Tiền tố `tkh` chữ thường, hậu tố 3–10 chữ/số; mẫu `tkh[A-Za-z0-9]{3,10}` nếu giao diện Live chấp nhận. | Xác minh cách Live trích `code`, hoa/thường và ranh giới bằng chứng được phép; không làm mất quan sát giao dịch thiếu mã. Cấu hình Live và Test độc lập. |
| Ngrok/TLS | URL ngrok hiện tại, chứng chỉ hợp lệ, POST public đến backend Live đúng route, body nguyên byte, giới hạn kích thước và timeout, proxy trust chính xác. | Chỉ tập trung ngrok theo chỉ đạo; không yêu cầu domain/deployment dài hạn. Kiểm tra HMAC raw bytes, retry và xác định listener đúng trước chuyển tunnel. |
| API client phục vụ kiểm thử | Base URL backend, buyer/admin token của tài khoản thử được cấp phép; POST/GET theo mục 4. | Chỉ nhận giá trị an toàn từ server; không đưa webhook secret/API v2 token vào client, script log hay report. Không phát triển UI trong L3. |
| Supabase | Migration versioned, role backend trực tiếp, RLS/grants trên bảng mới và observability. Backup do người dùng quản lý ngoài phạm vi. | Không dùng `server/.env`/compose hiện hữu để tự apply; xác minh project, schema drift, locks, ACL trước khi duyệt migration. Không copy fixture Test vào DB production. |

## 4. API và workflow cần có

Tám route tồn tại khi SePay được cấu hình; L3 đã kiểm thử Test và Live synthetic trên PostgreSQL 17 local, có API-only recovery qua HTTP với upstream mock. Chưa xác minh runtime Supabase/ngrok Live. Request mẫu và expected response: [curl runbook](api/SePay_Curl_Runbook.md).

| Method + route | Trạng thái source / quyền | Contract và công việc Live |
|---|---|---|
| `POST /api/sepay/orders/:orderId/payment` | Có, buyer Bearer | Body rỗng; server tính amount, lưu snapshot bank/account/code và tạo QR. Trả 201 mới/200 attempt hiện có; conflict khi có unresolved provider cũ. Test ownership, idempotency, concurrency, DB constraints, hạn giữ chỗ. |
| `GET /api/sepay/orders/:orderId/payment` | Có, buyer Bearer | DTO hiện có `paymentId`, `orderId`, `orderStatus`, `status`, `environment`, amount/currency, bank/account/name, content, `qrUrl`, `canTransfer`, `expiresAt`, `holdUntil`, `requiresReview`, `updatedAt`, `lastVerifiedAt`. Xem lại việc lộ số tài khoản nhận theo nhu cầu QR; `qrUrl=null` khi không thể chuyển. |
| `POST /api/payments/sepay/webhook` | Có, không session; HMAC | Đọc bytes gốc, kiểm signature/timestamp, validate, lưu durable inbox rồi 200 `{"success":true}`. Không dùng ACK để suy ra vé đã phát. Test delivery, retry, invalid signature, duplicate, collision và log redaction. [Webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook). |
| `POST /api/admin/sepay/reconcile` | Có, ADMIN, hiện Sandbox | Body tùy chọn `lookbackMinutes` 5–1440, trả counters; bổ sung Live token/base URL và ngăn 2 instance reconcile cùng phạm vi bằng cơ chế DB/lease, không chỉ boolean trong process. Không nhận token/URL từ caller. |
| `GET /api/admin/sepay/transactions` | Có, ADMIN | Lọc status, phân trang; mask dữ liệu; nếu cần lọc thời gian/reference như plan P6 thì bổ sung và test, không tự coi đã có. |
| `GET /api/admin/sepay/transactions/:id` | Có, ADMIN | Chi tiết an toàn và lịch sử xử lý; không lộ secret/raw payload mặc định. |
| `POST /api/admin/sepay/transactions/:id/reprocess` | Có, ADMIN | Đưa ERROR/REVIEW vào xử lý lại, có audit; không bỏ qua kiểm tra tiền/thời hạn, không tạo vé trùng. |
| `POST /api/admin/sepay/transactions/:id/resolve` | Có, ADMIN | Body `outcome`, `reason`, `evidenceReference?`; chỉ ghi nhận tra soát bên ngoài, không tự chuyển tiền hoặc cấp vé. |

**Phân loại theo nhu cầu hiện tại:** ba route buyer tạo/đọc payment và webhook là bắt buộc cho giao dịch; `POST /api/admin/sepay/reconcile` cần thiết cho đối soát khi webhook không đến; bốn route quản trị transaction phục vụ REVIEW/reprocess/resolve và kiểm tra vận hành. Cả tám route đã có source Test, cần hoàn thiện và xác minh Live, không tạo route trùng. `GET /api/sepay/config` chỉ là ý tưởng phục vụ UI, **không triển khai trong phạm vi backend hiện tại** nếu không xuất hiện nhu cầu khác có bằng chứng. Health nội bộ cho worker có thể dùng hệ giám sát thay vì public API. Không tạo API giả lập `PAID` công khai.

Workflow server: webhook được xác thực → inbox durable → ACK → worker đối chiếu account/VA, direction, mã duy nhất, exact amount VND, timestamp, order/reservation → transaction cập nhật payment/order/vé/notification/audit. Thiếu/sai/thừa tiền, thiếu/mơ hồ mã, quá hạn, đã nhả chỗ, hai giao dịch trùng mã hoặc xung đột payload → REVIEW; không tự hoàn tiền hoặc phát vé. API v2 dùng webhook integer ID và v2 UUID riêng, chỉ ghép khi có bằng chứng phù hợp. QR không thể bị thu hồi tại ngân hàng sau hết hạn.

Hạn payment giữ nguyên `order.expires_at`; chờ webhook thêm 15 phút đến `reconcile_until`, reservation còn HELD. SePay có thể retry tới khoảng 33 phút khi bật tùy chọn gửi lại; retry sau thời điểm nhả chỗ phải REVIEW, không tự phát vé. [Chính sách retry SePay](https://developer.sepay.vn/vi/sepay-webhooks/xu-ly-loi). Đồng hồ máy và timezone giao dịch phải được kiểm thử.

## 5. Supabase migration và phương án phục hồi

### 5.1. Database cần thiết và kiểm tra với Supabase

Migration dự kiến tạo ba bảng mới đã mô tả chi tiết ở [plan gốc, mục 9.1](MBBank_Payment.md#91-đề-xuất-migration-để-review-chưa-áp-dụng): `sepay_payment_details` lưu snapshot QR; `sepay_transactions` là inbox/webhook/API v2 và lease; `sepay_transaction_reviews` lưu lịch sử tra soát. Chúng liên kết các bảng hiện có qua FK, không bổ sung cột hay sửa dữ liệu hiện hữu. Index/unique/check/RLS/revoke phải được review theo bản draft và runtime role thực tế. Nếu cơ chế khóa đối soát nhiều instance cần bảng/cột mới, thiết kế migration additive riêng và kiểm thử; không giả định ba bảng hiện có tự đáp ứng mọi chức năng.

Mục tiêu là kiểm tra backend với **database Supabase thực tế** sau khi migration được review và áp dụng theo các cổng bên dưới. Ưu tiên Supabase project/branch staging cô lập; nếu chỉ có database hiện tại, không tự seed, chạy Test mode, phát vé giả hoặc gửi webhook mô phỏng vào đó. Cần phân định test data, token/secret, môi trường, cleanup và tác động đối với dữ liệu thật trước khi phê duyệt từng thao tác. DDL, runtime trỏ Supabase, seed/test ghi, cấu hình Live và khoản chuyển thật là các bước khác nhau và phải có phạm vi cho phép cụ thể tương ứng; quyền inventory/backup trước đây không tự cho phép chúng.

### 5.2. Trình tự migration và phục hồi

1. Chốt commit/DDL và inventory mới đúng project, history, tên object/index/constraint, khóa `payments.id`/`users.idUser`, role, default grants, RLS, dung lượng và concurrent traffic. Dừng khi drift hoặc object trùng; không `IF NOT EXISTS` che sai lệch.
2. Tạo migration mới versioned từ draft review: chỉ thêm `sepay_payment_details`, `sepay_transactions`, `sepay_transaction_reviews` và index/FK/constraints trong transaction. Bật RLS và revoke quyền thừa trên **các bảng mới** cùng transaction; xác định chính xác quyền runtime backend thực tế. Không sửa data/bảng/ACL/default privileges cũ, không đăng ký migration vào runner chung cho đến khi integration/runner an toàn được test.
3. Backup: người dùng đã tự lưu và loại khỏi phạm vi xác minh tiếp theo (quyết định 23:44 UTC+7). Không yêu cầu thêm PITR/retention/restore test trong phạm vi hiện tại, không tự chạy backup/restore; trạng thái phục hồi kỹ thuật không được ghi PASS.
4. Trên clone cô lập được cho phép, dùng PostgreSQL 17 và schema/ACL tương ứng; kiểm thử migration **commit**, history, lần chạy lại, collision, timeout lock, rollback transaction, RLS + ACL của `anon`, `authenticated`, `service_role`, runtime role backend, và hồi quy với dữ liệu giả demo/VNPAY. Không coi rehearsal PostgreSQL 16 rollback trước đó là test đầy đủ.
5. Review window, người chịu trách nhiệm, lock/statement timeout dự kiến, source snapshot theo quyết định hoãn commit, plan xác minh trước/sau, chỉ tiêu dừng và rollback. Chỉ sau phê duyệt cụ thể mới apply migration Supabase. Snapshot các số liệu/schema cần thiết trước/sau mà không in dữ liệu cá nhân. Kiểm tra tương thích ứng dụng và callbacks cũ.
6. Nếu migration chưa commit và lỗi: transaction rollback; kiểm tra history/object/lock trước retry. Nếu đã commit và ứng dụng lỗi: dừng tạo payment SePay mới, giữ webhook/inbox và bảng mới, rollback code/config tương thích, đối soát giao dịch đang bay. Không drop bảng hay `pg_restore --clean` trên DB hoạt động. Nếu cần khôi phục thực, đóng ghi, đánh giá giao dịch sau backup, RPO/RTO và duyệt riêng phương án restore/PITR có kiểm chứng.

## 6. Các giai đoạn thực hiện

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| L0 | Chốt source ứng viên, contract mục tiêu và phạm vi triển khai hiện tại. | Đóng phần quyết định theo chỉ đạo mới: hoãn commit, Live qua ngrok, Test không cần chạy song song, backup do người dùng quản lý. TLS và đọc dữ liệu nghiệp vụ Supabase PASS; không đồng nghĩa Live đã nghiệm thu. |
| L1 | Config loader Live fail closed; hỗ trợ API/worker, v2 allowlisted, concurrency bảo vệ DB; giữ endpoint cũ. | Test local cô lập, regression cũ, Test/Live isolation PASS; chưa đổi Supabase. Staging chưa có, không bắt buộc ở phạm vi hiện tại và không được ghi đã test. |
| L2 | Migration mới và rehearsal PostgreSQL 17 cô lập; backup/PITR ngoài phạm vi theo người dùng. | DDL/ACL/RLS/locks và preservation PASS; có runbook được review. Không copy real data vào môi trường không được phép. |
| L3 | Hoàn thiện backend/API Live và chuẩn bị kiểm thử trực tiếp bằng API client; xác minh ba bảng/migration và runtime DB theo mục 5. Không làm UI. | Tám API cần thiết sẵn sàng theo scope mục 4; cấu hình Live/worker/v2 fail closed; bộ test API/auth/webhook/reconcile/REVIEW và hồi quy cũ PASS trên local/clone được phép; migration versioned sẵn sàng review. Chưa tự áp dụng Supabase. |
| L4 | Apply Supabase sau phê duyệt cụ thể; chạy backend/worker trên máy hiện tại qua ngrok và kiểm tra với DB Supabase sau phê duyệt tương ứng. | Preflight trước apply và schema/data/ACL sau apply PASS; API client xác minh tạo/đọc payment, webhook/worker/reconcile theo môi trường được duyệt, callback cũ tương thích. Không dùng mô phỏng Test trên DB Live. Backup do người dùng quản lý ngoài phạm vi. |
| L5 | Người dùng cấu hình Dashboard Live, Live secret/token và thử giao dịch thật có kế hoạch. | Chính xác account, amount, reference, một vé; thông báo/đối soát/audit đúng. Chỉ thực hiện khoản thật sau thống nhất số tiền và xử lý hoàn trả. |
| L6 | Vận hành backend, monitoring, tổng hợp nghiệm thu/rollback. | Các ca backend bắt buộc mục 7 đạt; không có lỗi nghiêm trọng chưa xử lý, có người trực và báo cáo. UI là giai đoạn sau có yêu cầu riêng. |

**Trạng thái L0, 29/10/2026 23:12 UTC+7:** đã rà soát source, build và boundaries PASS; chưa chốt commit, môi trường, role, domain và quyền vận hành. Các câu hỏi xác minh đã gửi, đang chờ trả lời; L0 chưa hoàn thành. Xem [báo cáo L0](reports/mbbank-payment/20261029_231241_l0_verification.md).

**Cập nhật L0, 23:22 UTC+7:** người dùng chọn source hiện tại, hoãn commit đến sau tích hợp thành công; chưa có staging hay domain production, dự kiến dùng ngrok; tự phụ trách vận hành/secret và xác nhận quyền Live. L0 vẫn chưa đủ bằng chứng, đặc biệt deployment, project/role, backup/PITR và contract. Xem [xác nhận và đánh giá](reports/mbbank-payment/20261029_232205_l0_user_confirmation.md).

**Cập nhật L0, 23:24 UTC+7:** người dùng xác nhận `pbl6-eventhub` có dữ liệu thật, chạy API/worker trên máy hiện tại, ngrok tạm thời và đã lưu backup. Kiểm tra mới chỉ đọc chưa kết nối được do lỗi xác thực chuỗi TLS; chưa xác minh lại role/schema hoặc phạm vi/restore backup. [Báo cáo kiểm tra](reports/mbbank-payment/20261029_232421_l0_supabase_recheck.md).

**Cập nhật L0, 23:30 UTC+7:** kết nối metadata chỉ đọc qua CA local và TLS xác thực PASS; PostgreSQL 17.11, role kết nối `postgres` không superuser, 24 bảng public, chưa có ba object SePay. Chưa đối chiếu độc lập project name/ref hoặc role process runtime; L0 chưa hoàn thành. [Báo cáo](reports/mbbank-payment/20261029_233018_l0_supabase_tls_recheck.md).

**Cập nhật L0, 23:33 UTC+7:** rà soát contract và 13 unit/mock/guard test PASS; Live và coexistence chưa đạt. Credential Cloudinary đang dùng bị phát hiện trong file mẫu tracked, đã thay placeholder trong workspace; cần xoay vòng và xử lý lịch sử/bản sao. [Báo cáo](reports/mbbank-payment/20261029_233321_l0_contract_secret_review.md).

**Cập nhật L0, 23:34 UTC+7:** người dùng xác nhận `DEMO_PASSWORD` chỉ dùng demo/test; credential Cloudinary vẫn cần xoay vòng. [Báo cáo xác nhận](reports/mbbank-payment/20261029_233414_l0_demo_password_confirmation.md).

**Đối chiếu L0/L1, 23:36 UTC+7:** guard DB test local PASS; đã phân định công việc L1 local và các cổng staging, backup/restore và Live còn thiếu. Đang chờ xác nhận PITR, xoay credential Cloudinary và phương án test local; L0 chưa hoàn thành. [Báo cáo readiness](reports/mbbank-payment/20261029_233644_l0_l1_readiness.md).

**Xác nhận L0/L1, 23:37 UTC+7:** Supabase Free, backup lưu bên ngoài, Cloudinary đã xoay vòng theo người dùng; PITR chưa xác minh. Người dùng đồng ý phát triển/kiểm thử L1 với DB local cô lập và dữ liệu giả, để staging là điều kiện còn mở. L0 chưa hoàn thành theo tiêu chí ban đầu; chưa commit theo chỉ đạo. [Báo cáo](reports/mbbank-payment/20261029_233742_l0_l1_user_confirmation.md).

**Chốt phạm vi L0, 23:44 UTC+7:** người dùng ưu tiên Live qua ngrok, Test đã mô phỏng thành công theo xác nhận, ngừng Test khi chuyển Live nếu không chạy song song; bỏ xác minh backup/PITR và phương án deploy dài hạn. Đọc thực bảng Supabase PASS: 12 users, 24 orders, 14 payments, 4 tickets trong transaction chỉ đọc. L0 đóng phần quyết định theo phạm vi mới, sẵn sàng triển khai L1 local; chưa bật Live. [Báo cáo](reports/mbbank-payment/20261029_234409_l0_scope_and_real_database_read.md).

**L1 — 30/10/2026 00:03 UTC+7:** hoàn thành phạm vi triển khai/kiểm thử local, 69/69 PASS; người dùng xác nhận đã tạo riêng secret và token Live. Chưa kết nối Live, chưa đổi Supabase/ngrok, chưa dừng Test hoặc commit. Bước tiếp theo L2: migration/rehearsal PostgreSQL 17; giới hạn scheduler/monitoring và pooler được ghi trong [báo cáo chi tiết](reports/mbbank-payment/20261030_000240_l1_runtime_live_config.md).

Không có bước tự động vô hiệu hóa demo/VNPAY sandbox; quyết định mới của người dùng là giữ chúng. Không tự đổi cổng `PAYMENT_MODE` production để bật provider thử.

## 7. Kiểm thử và tiêu chí nghiệm thu

Mỗi ca ghi môi trường, thời gian, ID đã mask, request/response an toàn, trạng thái DB, số vé, expected/actual, PASS/FAIL/BLOCKED và report; không ghi token, secret, account đầy đủ hay payload nhạy cảm.

| Nhóm | Bằng chứng bắt buộc |
|---|---|
| Config/isolation | Live thiếu secret/token/account → fail closed; Test credential không được đưa vào Live; đúng URL v2 cho từng env; QR secret ổn định; không kết nối nhầm DB. |
| API buyer | Ownership và unauthorized; body bị từ chối nếu truyền amount/account; order hết hạn/đã trả/hủy/không còn reservation; polling/rate limit; QR đúng số VND/account/content; request lặp không tạo attempt mới; response/contract được tài liệu hóa. Kiểm tra bằng API client, không đòi UI. |
| Tương thích và isolation | Giữ source/API demo/VNPAY; regression bằng dữ liệu giả trên local, không cần chạy cùng runtime Live. Guard provider thử vẫn giữ; cross-provider unresolved/race không cấp trùng. SePay Test và Live được tách cấu hình, không yêu cầu cùng hoạt động. |
| Webhook | HMAC raw Unicode/whitespace, header thiếu/trùng/sai, timestamp/replay, JSON sai/oversize, account/VA sai, in/out, body DB failure; không ACK khi chưa lưu bền vững. Retry SePay và duplicate/different payload ID không gây mất sự kiện/cấp vé trùng. |
| Đối soát/vận hành | API v2 pagination, 401/429/5xx, outage, API-only, webhook tới trước/sau, lease/crash tại các điểm commit, nhiều process, giám sát lag; hết 15 phút hoặc reservation nhả → REVIEW. |
| Giá trị/thời hạn | Đúng/sai/thừa/thiếu tiền, code null/multiple/case, giao dịch muộn/nhanh sát hạn, order PAID/canceled, reservation released/oversell. REVIEW không phát vé, không giả lập hoàn tiền. |
| Supabase migration | Schema pre/post, 3 bảng + indexes + RLS/grants, 4 migration cũ giữ nguyên, old data/constraints, lock budget, rerun và rollback; không khẳng định không ảnh hưởng khi chưa có bằng chứng. Backup/PITR ngoài phạm vi theo chỉ đạo mới. |
| RBAC/security | Buyer không truy cập admin, admin reprocess/resolve có audit; API roles không có quyền bảng SePay mới qua SQL/Data API theo thiết kế, runtime role chỉ đủ quyền; secrets không xuất hiện trong log/client. |
| Live có kiểm soát | Sau chấp thuận riêng: QR scan trước chuyển, xác minh tên tài khoản/số tiền/nội dung, chuyển khoản thật theo số tiền được thống nhất, SePay webhook HMAC hợp lệ → 1 transaction/1 payment/1 order/1 vé/notification/audit, kiểm tra số dư/lịch sử độc lập và quy trình xử lý tiền; không dùng thông tin thanh toán của khách thật để thử. |

Nghiệm thu Live chỉ khi các mục bắt buộc trong phạm vi cập nhật PASS hoặc có quyết định chấp nhận giới hạn được ghi nhận; không suy ra đối soát/quyền/Live đã đạt từ Test mode. Backup/PITR đã được người dùng loại khỏi phạm vi. Test mode P4 và API v2 Sandbox P5 đã PASS theo report; người dùng xác nhận Test đã mô phỏng thành công, nhưng không thay thế bằng chứng Live.

## 8. Nguồn và quyền thực hiện

- [SePay webhook và xác thực](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc); [so sánh Test và Live](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/so-sanh-voi-live); [API v2](https://developer.sepay.vn/vi/sepay-api/v2/gioi-thieu); [retry](https://developer.sepay.vn/vi/sepay-webhooks/xu-ly-loi).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API security](https://supabase.com/docs/guides/api/securing-your-api), [backup](https://supabase.com/docs/guides/platform/backups).
- Lập plan không cho phép kết nối/ghi Supabase, cấu hình Dashboard, triển khai hoặc chuyển tiền thật. Từng thao tác P7 còn phải qua các cổng quyền đã thống nhất; demo và VNPAY sandbox được giữ theo quyết định mới của người dùng.
