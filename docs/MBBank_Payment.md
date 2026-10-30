# Kế hoạch thanh toán MBBank qua SePay

**L6 — 30/10/2026:** đã bổ sung monitor backend/inbox, heartbeat worker, maintenance gate và runbook rollback. Build PASS, PG17 regression 70/70, monitor policy 5/5; Live health/DB/worker OK tại snapshot. Supabase Data API không cần cho backend dùng direct PostgreSQL; chưa cấu hình và không phải dependency, REST test N/A hiện tại. [Báo cáo L6](reports/mbbank-payment/20261030_011000_l6_operations_acceptance.md), [runbook](runbooks/SePay_Live_Operations.md).

**Chốt L5 — 30/10/2026 01:10 UTC+7:** giao dịch thật 10.000 VND và đối soát lặp PASS, đúng một vé/thông báo/audit; người dùng xác nhận HTTP 200 và MBBank đã ghi có. Retry webhook Live NOT RUN vì Dashboard không cho gửi lại theo người dùng. Giữ lịch sử thật, chưa commit; Data API L4 vẫn chưa kiểm tra. [Báo cáo nghiệm thu](reports/mbbank-payment/20261030_010334_l5_controlled_transfer.md). Các trạng thái chờ dưới đây là lịch sử.

**L5 cập nhật 01:07 — 30/10/2026:** giao dịch thật 10.000 VND đã PAID/SUCCEEDED qua webhook, đúng một vé/thông báo/audit; reconcile lại hai lần không nhân đôi. Chờ Dashboard retry/HTTP và xác nhận ghi có độc lập; giữ lịch sử giao dịch thật. [Báo cáo L5](reports/mbbank-payment/20261030_010334_l5_controlled_transfer.md).

**L5 — 30/10/2026:** đã thống nhất khoản thật 10.000 VND, người dùng giữ tiền và tự chuyển. Case Live mới đã chuẩn bị; đang chờ giao dịch để kiểm chứng webhook/settlement/một vé/notification/audit và đối soát không trùng. [Báo cáo L5](reports/mbbank-payment/20261030_010334_l5_controlled_transfer.md). Không xóa lịch sử giao dịch thật theo cleanup L4.

**Cập nhật runtime L4 — 30/10/2026:** API/worker Live hoạt động trên Supabase, ngrok → 8011; 14 curl checks PASS, fixture đã dọn. Worker reconcile Live thành công, chưa có giao dịch trong inbox. Người dùng xác nhận webhook Dashboard đúng URL/HMAC. Chưa nghiệm thu settlement Live/Data API và chưa chuyển khoản L5. [Báo cáo chi tiết](reports/mbbank-payment/20261030_005533_l4_live_runtime_smoke.md).

**Bổ sung L4 — 30/10/2026:** đã chuẩn bị file cấu hình Live ignored và URL webhook cho người dùng điền; chưa bật runtime. Người dùng cho phép seed thêm dữ liệu kiểm thử và dọn sau khi thành công, chỉ áp dụng dữ liệu tạo riêng có ghi nhận ID. [Báo cáo bàn giao](reports/mbbank-payment/20261030_l4_live_configuration_handoff.md).

**Cập nhật mới nhất L4 — 30/10/2026:** đã apply và commit migration SePay riêng lên Supabase theo yêu cầu thực hiện L4. Ba bảng mới bật RLS, năm index, history tăng lên năm; kiểm tra quyền SQL và preservation dữ liệu/schema/default ACL PASS, đọc lại bằng kết nối mới thành công. Chưa bật runtime Live hoặc chuyển ngrok; L4 còn kiểm thử API/worker/Data API, chờ vị trí credential và tài khoản/đơn được chọn. [Báo cáo chi tiết L4](reports/mbbank-payment/20261030_003444_l4_supabase_apply.md). Các giới hạn “chỉ đọc/chưa DDL” trong ghi nhận P7 và các mục lịch sử bên dưới đã được mở rộng riêng cho migration L4 này; không áp dụng cho các migration/restore khác.

Ngày lập: 29/10/2026 (UTC+7). Cập nhật P7-01: 29/10/2026, 22:05 UTC+7. Trạng thái: **P0–P5 đã nghiệm thu theo phạm vi; P4 QR scan và SePay Test auto-retry/outage PASS; P6 hồ sơ migration/rollback hoàn tất; P7-01 inventory Supabase read-only hoàn tất: không có collision bảng/index, UUID FK tương thích, baseline 4 migration khớp; phát hiện default ACL cấp quyền rộng và RLS disabled nên migration local hiện chưa an toàn để apply vào `public`. Không chạy DDL, backup hay cutover.**

## 1. Mục tiêu và ranh giới bắt buộc

Khách đặt vé, quét VietQR chuyển khoản vào MBBank; SePay gửi webhook, backend xác thực và đối chiếu giao dịch, sau đó tự cập nhật đơn và phát hành vé. Đây là tích hợp **SePay Webhooks theo dõi tài khoản ngân hàng**, không phải API SePay Payment Gateway/Bank Hub.

- Tạo API SePay mới với đường dẫn và workflow riêng; không đổi contract, hành vi, dữ liệu hoặc chức năng của API demo và VNPAY sandbox trong quá trình phát triển. Không chỉnh logic các endpoint cũ để phục vụ SePay. Các middleware dùng chung nếu bắt buộc thay đổi phải giữ nguyên hành vi cũ và có kiểm thử hồi quy.
- Theo yêu cầu mới nhất: **giữ nguyên demo và VNPAY sandbox**, không tự vô hiệu hóa hoặc xóa API/khả năng tạo giao dịch trong môi trường phù hợp; giữ callback và lịch sử. Giới hạn hiện có ngăn demo/VNPAY sandbox bật trong production vẫn được giữ. Không mặc định SePay và provider cũ đã chạy đồng thời: source hiện có guard `SEPAY_LEGACY_MODE`, cần thiết kế/test staging riêng.
- Trong phát triển và kiểm thử chức năng, sử dụng PostgreSQL local riêng; không chạy app/worker trỏ Supabase, không migrate/seed/test hay ghi Supabase. Người dùng đã cho phép riêng P7 inventory read-only và backup schema `public` cùng khôi phục thử cô lập; các thao tác đó đã được thực hiện, không mở rộng quyền sang migration hay production runtime. Mọi thao tác mới với Supabase cần đúng phạm vi đã được cho phép; migration/restore lên Supabase cần phê duyệt cụ thể theo mục 9.
- Không chạy migration tới Supabase từ `server/.env` hay `compose.yaml` hiện hữu. Trước mọi lệnh có khả năng truy cập DB phải xác minh đích local, host/port/database, cơ chế kết nối và tiến trình thực sự dùng cấu hình local; fail closed nếu không chứng minh được. Không in credential vào log hoặc báo cáo.
- Không dùng endpoint test công khai không xác thực để tạo trạng thái PAID. Test mode và webhook thật phải tách cấu hình, dữ liệu và secret; không để giao dịch mô phỏng phát hành vé trong môi trường thật.
- Mỗi công việc liên quan chức năng, kể cả khảo sát, migration, code, test, cấu hình và triển khai: tạo báo cáo mới dưới `docs/reports/mbbank-payment/` và cập nhật tiến độ, bằng chứng, vấn đề còn lại trong tài liệu này. Không ghi secret, token, toàn bộ số tài khoản hoặc payload nhạy cảm vào báo cáo.

## 2. Bằng chứng hiện trạng (chỉ đọc source và trạng thái local)

| Hạng mục | Quan sát | Hệ quả |
|---|---|---|
| Ngrok | API local `127.0.0.1:4040/api/tunnels` ngày 29/10/2026 ghi nhận `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` → `http://localhost:8000`. | Chỉ chứng minh cấu hình tunnel lúc kiểm tra; chưa chứng minh SePay gửi thành công hay backend đang chạy. URL có thể thay đổi. |
| Backend | Khảo sát đầu không kết nối được; phiên kiểm tra lại đã nhận HTTP 200. P0 đọc source xác định `/api/health` gọi `events.categories()`, có truy cập DB, không phải liveness thuần mạng. | Không dùng health để kiểm tra khi chưa xác minh DB đích. Không xác định được DB mà phiên health trước đã truy vấn; không khẳng định phiên đó không đọc Supabase. P0 không gọi health hay API nghiệp vụ. |
| Routes | `server/src/app.ts`: `POST /api/orders/:id/payments`, `POST /api/payments/:id/demo`, `GET /api/payments/vnpay/ipn`, `GET /api/payments/vnpay/return`, `GET /api/me/orders/:id`; không thấy route SePay. | Các route cũ giữ nguyên; xây route mới độc lập. |
| Provider | `payment/public.ts` chỉ cho `disabled`, `demo`, `vnpay_sandbox`; `app.ts` và provider factory chặn provider thử trong production. `VerifiedPayment.amount` theo đơn vị VNPAY nhân 100. | Không tái sử dụng xác minh VNPAY cho SePay; tích hợp SePay riêng và cấu hình riêng, không mở khóa demo/sandbox. |
| Transaction | `booking.ts` khóa event/order/inventory/payment; `order/public.ts` `complete` kiểm tra amount/currency, giữ chỗ, cập nhật đơn và phát vé. | Tái sử dụng interface nghiệp vụ và UoW hiện có, kiểm thử race, không thay ý nghĩa nghiệp vụ cũ. |
| Schema nguồn | `docs/database/mvp-schema.sql`: `payments` có `provider`, `merchant_reference`, unique provider/merchant/reference và unique transaction; `payments_one_unresolved_idx` chỉ cho một payment PENDING/UNKNOWN mỗi order; `payment_notifications.payment_id` nullable. | Phải từ chối tạo attempt SePay khi có payment cũ unresolved, không tự chuyển trạng thái cũ. Snapshot SePay và inbox mới tách riêng, không thay data cũ. Schema Supabase thực tế chưa kiểm tra. |
| Worker | `scripts/worker.cjs` gọi expire, VNPAY reconcile và tác vụ khác; `booking.expire()` dùng `reconcile_until`. | Bổ sung worker SePay riêng hoặc nhánh riêng; chứng minh không ảnh hưởng lịch xử lý cũ và không giữ chỗ vô hạn. |
| Ownership | `platform/database.ts` phân quyền bảng bằng owner và parser SQL; payment owner hiện chỉ có `payments`, `payment_notifications`. | Thêm bảng SePay vào ownership, viết SQL tương thích guard và test boundaries. |
| Parser/rate limit | `app.ts` dùng `express.json` toàn cục; rate limit POST chung theo IP; `trust proxy` là loopback. | Đặt route raw body trước JSON parser và xem xét rate limit riêng có giới hạn; không làm suy yếu bảo vệ endpoint cũ. Test với ngrok/proxy. |
| Migration/runtime | `scripts/migrate.cjs` đăng ký migration tường minh; `compose.yaml` dùng `server/.env`, CA Supabase; mặc định `DATABASE_URL` theo môi trường. | Tạo cấu hình local riêng và guard cứng; cập nhật danh sách migration một cách kiểm thử được. Không dùng compose hiện hữu khi chưa chứng minh DB local. |

Bảng trên là mốc khảo sát trước triển khai. Sau đó P4 đã có QR scan và webhook Test thành công; P7 đã inventory Supabase read-only theo quyền người dùng, nhưng chưa kiểm chứng toàn bộ schema hay tính tương thích migration. P1 đã dựng schema local ở mục 7.2. SePay liệt kê MBBank hỗ trợ tiền vào và VA: [tài khoản ngân hàng](https://developer.sepay.vn/vi/sepay-webhooks/tai-khoan-ngan-hang).

## 3. Kiến trúc và trạng thái

1. Người mua tạo đơn qua API hiện tại. Sau đó gọi API SePay mới để tạo/lấy payment đang hoạt động. Server dùng tổng đơn, snapshot tài khoản MBBank và mã tham chiếu ngẫu nhiên duy nhất để tạo QR.
2. Khách chuyển khoản. SePay POST giao dịch tiền vào tới endpoint SePay mới. HMAC hợp lệ + payload đúng cấu trúc → ghi sự kiện bền vững rồi ACK, không chờ xử lý phát vé.
3. Worker claim inbox, đối chiếu chính xác tài khoản/VA, mã và số tiền, kiểm tra thời hạn và chỗ giữ; transaction hoàn tất payment/đơn/vé/thông báo/audit. Khách dùng API trạng thái mới để theo dõi.
4. Thiếu mã, sai tiền, thanh toán trùng hoặc đến muộn → lưu sự kiện, đưa vào REVIEW; không phát vé. Không khẳng định thất bại nếu webhook chưa đến. QR không bị vô hiệu hóa tại ngân hàng khi đơn hết hạn.
5. Khi mất webhook, đối soát bằng SePay API v2 nếu quyền tài khoản cho phép; nếu chưa có quyền, dùng lịch sử/phát lại Dashboard và báo rõ chưa tự động phục hồi hoàn toàn.

Quy tắc thời gian theo phản hồi người dùng ngày 29/10/2026: hạn tạo/chuyển tiền giữ nguyên `order.expires_at`; **chờ webhook thêm 15 phút sau hạn này** (cách hiểu câu trả lời “cho phép chờ 15 phút webhook” cho câu hỏi thời gian cộng thêm). `reconcile_until = order.expires_at + 15 phút`, đồng bộ `reservation.release_after` theo workflow SePay mới. Không đặt lại hạn từ lúc mở QR, refresh hoặc retry. Ví dụ đơn tạo 15:00, hết hạn thanh toán 15:15 thì giữ chỗ chờ xác nhận tới 15:30; đơn wait queue có thể có hạn ngắn hơn. Khoảng chờ không kéo dài thời hạn khách chuyển tiền: giao dịch có thời điểm ngân hàng sau `order.expires_at` vào REVIEW. Giao dịch ghi nhận đúng hạn chỉ được cấp vé khi xử lý trước `release_after` và reservation còn HELD; nếu chỗ đã nhả hoặc đến deadline thì REVIEW, không phát vé. Timestamp ngân hàng không gia hạn tồn kho. Chính sách này chỉ áp dụng luồng SePay mới, không đổi demo/VNPAY.

## 4. API mới cần thực hiện

Bảng dưới đây ghi contract mục tiêu. API buyer được thêm ở P2; webhook và API admin SePay được thêm ở P3, chỉ bật khi cấu hình SePay riêng được cung cấp. Chúng đã được kiểm thử trên local, chưa kiểm chứng với Dashboard/ngrok. Không đổi route/contract payment cũ.

| API mới | Quyền / input | Output và quy tắc |
|---|---|---|
| `POST /api/sepay/orders/:orderId/payment` | Buyer đã xác thực; UUID order; không nhận số tiền/tài khoản từ client. | 201 mới hoặc 200 attempt SePay hiện có; trả `paymentId`, `orderId`, `status`, `amount` chuỗi VND, `currency`, `bank`, `accountNumber`/VA, `accountName`, `transferContent`, `qrUrl`, `expiresAt`, `holdUntil`. Kiểm tra owner, event, hạn, inventory; khóa và idempotent khi nhấn lặp. Có attempt cũ PENDING/UNKNOWN → 409, không sửa attempt đó. |
| `GET /api/sepay/orders/:orderId/payment` | Buyer sở hữu đơn | DTO an toàn trạng thái order/payment, hạn và thời điểm cập nhật; không lộ payload ngân hàng/secret. 404 nếu không có quyền hoặc không có attempt theo contract quyết định khi triển khai. Poll có giới hạn. |
| `POST /api/payments/sepay/webhook` | Không có user session; HMAC SePay bắt buộc | Kiểm chữ ký và schema; lưu inbox trước ACK. 200 `{"success":true}` cho sự kiện hợp lệ đã lưu hoặc bản gửi lại giống hệt; 401 chữ ký sai; 400 payload sai; 5xx khi không lưu được. Kiểm tra thực tế SePay retry với các response này. Không trả 2xx khi chưa lưu bền vững. |
| `GET /api/admin/sepay/transactions` | ADMIN; lọc trạng thái, thời gian, tham chiếu; phân trang giới hạn | Danh sách đã mask dữ liệu nhạy cảm, gồm transaction ID, amount, kết quả đối chiếu. |
| `GET /api/admin/sepay/transactions/:id` | ADMIN | Chi tiết an toàn và lịch sử xử lý, không trả secret/raw payload mặc định. |
| `POST /api/admin/sepay/transactions/:id/reprocess` | ADMIN; idempotency/rate limit | Đưa sự kiện đã lưu vào xử lý lại; không vượt qua đối chiếu và khóa. Không tạo tiền hay vé thủ công. |
| `POST /api/admin/sepay/transactions/:id/resolve` | ADMIN; outcome + lý do bắt buộc | Chỉ ghi nhận kết quả tra soát/hoàn tiền đã thực hiện bên ngoài, người xử lý và bằng chứng tham chiếu; không tự chuyển tiền hoặc tự cấp vé. |
| `POST /api/admin/sepay/reconcile` | ADMIN; JSON tùy chọn `{ "lookbackMinutes": 5..1440 }`, mặc định 60; bắt buộc token API v2 Sandbox cấu hình ở runtime local | Gọi `GET https://userapi-sandbox.sepay.vn/v2/transactions` theo trang và khoảng ngày, lọc tiền vào; lưu giao dịch thiếu/mơ hồ vào REVIEW; import giao dịch có mã vào inbox để worker đối chiếu. Trả bộ đếm `scanned/imported/reviewed/matchedWebhook/duplicates/ignored/windowMinutes`; không nhận token từ request. Rate limit API v2 được tôn trọng. |

API admin chỉ xây phần cần thiết cho tra soát; không có API test công khai để giả lập thanh toán. Route reconcile chỉ dành cho ADMIN, dùng token server-side, GET chỉ đọc upstream, có lookback giới hạn và không trả token/payload ngân hàng. Mã nguồn đã có route; xác minh API thật còn chờ token Sandbox được điền vào cấu hình local.

## 5. Contract webhook và bảo mật

Theo [tài liệu payload SePay](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), request là POST JSON:

| Trường | Kiểu và xử lý |
|---|---|
| `id` | integer, bắt buộc, ID giao dịch SePay ổn định qua retry/replay; validate an toàn số nguyên, lưu dạng chuỗi nếu cần. |
| `gateway`, `accountNumber` | string bắt buộc; đối chiếu mapping ngân hàng và snapshot account, không dựa vào tên hiển thị tùy tiện. |
| `subAccount` | Tài liệu webhook chung mô tả string/rỗng; ví dụ Test mode dùng `null`. Cần tiếp nhận string hoặc null, chuẩn hóa không có VA thành null và kiểm thử cả hai; chỉ khớp VA khi tài khoản cấu hình dùng VA. |
| `code` | string hoặc `null`; SePay trích theo cấu hình mã. Phải xác thực cấu hình tiền tố và hành vi MBBank, `null` không được tự coi là trùng. |
| `content` | string bắt buộc; nội dung gốc. Chỉ parse mã với quy tắc ranh giới rõ ràng; nếu nhiều mã/không chắc → REVIEW. |
| `transferType` | `in` hoặc `out`; chỉ `in` đủ điều kiện thanh toán. |
| `transferAmount` | integer VND dương; validate safe integer và so sánh chính xác với bigint payment, không nhân 100 như VNPAY. |
| `transactionDate` | string `YYYY-MM-DD HH:mm:ss`, giờ Việt Nam; validate và chuyển có timezone rõ ràng. |
| `description`, `referenceCode` | string có thể rỗng; mã ngân hàng hỗ trợ tra soát, không giả định luôn có hoặc duy nhất. |
| `accumulated` | integer có thể 0; không dùng để xác nhận đơn hay tính số dư. |

Header `X-SePay-Timestamp` là Unix seconds, `X-SePay-Signature` dạng `sha256=<hex>`. Xác minh HMAC-SHA256 trên **bytes gốc** `timestamp + '.' + rawBody`, so sánh constant-time, từ chối timestamp lệch quá 5 phút và đồng bộ giờ máy; thử cả retry/replay thực tế để xác nhận SePay ký lại timestamp. [Tài liệu xác thực](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc), [bảo mật](https://developer.sepay.vn/vi/sepay-webhooks/bao-mat). Không ghi secret/header xác thực vào log; hạn chế raw payload vì có số dư/nội dung cá nhân, chỉ lưu bản cần thiết có kiểm soát truy cập và retention.

Webhook ACK là `200` hoặc `201` với JSON `{"success":true}` trong 30 giây; ACK nghĩa là đã nhận bền vững, không có nghĩa đã cấp vé. Sự kiện xử lý thất bại được worker retry/tra soát. [Hợp đồng phản hồi](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook).

## 6. Database local: migration dự kiến

P1 đã thêm ba bảng SePay bằng migration local additive, không sửa baseline cũ hay dữ liệu payment hiện có. P3 dùng các bảng này; chưa đăng ký migration vào runner chung và không áp dụng lên Supabase:

1. `sepay_payment_details`: `payment_id` PK/FK tới payments, snapshot `bank_code`, `account_number`, `account_name`, `sub_account` nếu dùng, `transfer_content`, thời điểm tạo. Mã tham chiếu vẫn lưu ở `payments.merchant_reference`; đặt constraint/index hợp lệ, không thay unique cũ.
2. `sepay_transactions`: UUID nội bộ; `environment` (`test`/`live`), định danh tài khoản SePay, webhook transaction ID, API v2 UUID nullable, bank reference nullable, account/VA, amount bigint, currency, code/content cần thiết, transaction time, payload hash, `payment_id` nullable, trạng thái `RECEIVED/PROCESSING/PROCESSED/REVIEW/ERROR`, lý do, retry/lease, received/processed timestamps. Unique theo nguồn + môi trường + phạm vi ID sau khi xác minh tài liệu/tài khoản; conflict payload khác → ghi bất thường và REVIEW. API v2 UUID không mặc định bằng webhook integer ID; chưa xác minh mapping thì không tự ghép qua mã ngân hàng không duy nhất.
3. `sepay_transaction_reviews`: FK transaction, actor FK users nullable theo ngữ cảnh, action, lý do, bằng chứng tham chiếu tối thiểu và timestamp; lịch sử append-only ở mức ứng dụng.
4. Index cho claim/retry, reference/payment, review và phân trang. Đăng ký bảng vào payment ownership, migration runner; test parser, constraints, FK, rollback an toàn và upgrade trên dữ liệu giả lập demo/VNPAY. Không thay các index hay constraint hiện có trừ khi có bằng chứng và được duyệt thiết kế.

Không lưu toàn bộ payload nếu không cần; nếu cần lưu raw để audit, phải có thời hạn xóa, kiểm soát truy cập và cân nhắc mã hóa. Không log `accumulated`, token hay mật khẩu.

## 7. Phát triển theo giai đoạn

| Mốc | Công việc | Điều kiện hoàn thành |
|---|---|---|
| P0 | Xác nhận tài khoản MBBank liên kết SePay, chế độ test, HMAC, quy tắc code/VA, quyền v2; chốt hạn giữ chỗ. | Có bằng chứng không chứa secret; phần chưa rõ ghi BLOCKED, không suy đoán. |
| P1 | Dựng PostgreSQL local rỗng; cấu hình DB riêng không dùng `.env` Supabase, guard chỉ cho phép local, tạo baseline + migration mới, seed dữ liệu giả. | Chứng minh đích bằng host/port/database và bằng chứng guard; không liên hệ Supabase. |
| P2 | Viết API tạo/đọc SePay, QR, schema/store và ownership; giữ nguyên API cũ. | Unit/integration và hồi quy demo/VNPAY đạt trên DB local. |
| P3 | Webhook raw body/HMAC, inbox, worker, idempotency, tra soát và API admin riêng. | PASS/nghiệm thu phạm vi P3: build, ownership/boundaries, durable ACK, worker, REVIEW, admin và hồi quy; suite cuối 46/46 PASS. |
| P4 | Sau khi người dùng tự nhập URL Test mode và xác nhận mô phỏng thành công: chạy backend + worker với DB local qua ngrok, kiểm tra QR/Test mode. | PASS: happy-path Test mode thực tế và synthetic scenario suite 49/49; transaction PROCESSED, payment SUCCEEDED, order PAID, 1 ticket VALID. Dashboard chỉ chạy ca thành công; negative/retry/outage dashboard và QR app scan chưa chạy. |
| P5 | Đối soát API v2 nếu được cấp quyền, giao diện checkout/admin và kiểm thử end-to-end. | Đang làm phần API/backend theo phạm vi phiên hiện tại; UI checkout/admin còn chờ thực hiện. Không đóng P5 trước khi gọi Sandbox API v2 thật với token local và xác minh giao dịch, webhook/API UUID mapping, worker cùng kết quả DB. |
| P6 | Tổng hợp nghiệm thu, lập migration Supabase và kế hoạch chuyển đổi/rollback. | Tài liệu sẵn sàng duyệt; chưa động Supabase. |
| P7 | Sau khi hoàn thiện và được cho phép cụ thể, kiểm tra Supabase, backup, triển khai migration và chuyển đổi. | Kết quả từng bước, đối soát attempt cũ, smoke test và giám sát; báo cáo riêng. |

### 7.1. Kết quả P0 và các điểm chờ xác minh

Báo cáo: [khảo sát P0](reports/mbbank-payment/20261029_141800_p0_verification.md), [bổ sung xác nhận người dùng](reports/mbbank-payment/20261029_151647_p0_user_confirmation.md), [đóng P0](reports/mbbank-payment/20261029_152033_p0_completion.md). Người dùng đã trả lời ngày 29/10/2026; thông tin tài khoản dưới đây là **người dùng xác nhận**, không phải kết quả assistant đăng nhập Dashboard hay kiểm thử runtime.

| ID | Hạng mục | Đã xác minh | Còn thiếu / trạng thái |
|---|---|---|---|
| P0-01 | MBBank cá nhân | Người dùng xác nhận MBBank đã thêm vào SePay, tài khoản chính hoạt động và có thông báo tiền vào. | ĐẠT xác nhận cấu hình; chưa chứng minh webhook EventHub đã nhận. Không yêu cầu VA cho thiết kế hiện tại. |
| P0-02 | Test mode | Người dùng đã vào được Test mode; xác nhận sẽ tự nhập URL nhận webhook và chạy mô phỏng khi P3 sẵn sàng. | Mô phỏng SePay thực tế chưa chạy. P4 runtime chỉ bắt đầu sau khi người dùng xác nhận mô phỏng thành công. |
| P0-03 | HMAC | Người dùng chọn được HMAC-SHA256 và đã có secret riêng. | ĐẠT xác nhận có secret; P3/P4 vẫn phải xác minh secret được đặt đúng môi trường Test và chữ ký thực tế, không yêu cầu gửi secret. |
| P0-04 | Mã/VA và bộ lọc | Người dùng chốt tiền tố **`tkh` chữ thường**, hậu tố **3–10 ký tự chữ/số**, không mặc định 10 ký tự. | Mã EventHub theo `^tkh[A-Za-z0-9]{3,10}$`; giữ nguyên tiền tố chữ thường khi tạo nội dung/QR, không ép hậu tố thành 10 ký tự. Bảo đảm unique DB và xử lý collision. Kiểm thử độ dài 3–10, từ chối 2/11 và ký tự ngoài chữ/số. Cách SePay trả hoa/thường trong `code` cần xác minh fixture; nếu cần chuẩn hóa khi đối chiếu phải có quy tắc riêng được kiểm thử, không tự thay tiền tố hiển thị hoặc ghép mơ hồ. |
| P0-05 | API v2 | Người dùng xác nhận có quyền API giao dịch v2 và **đã tạo, lưu token Sandbox riêng**. | ĐẠT xác nhận điều kiện API; chưa gọi thử token, chưa nhận/lưu giá trị token trong repo/chat. Mapping UUID API ↔ integer webhook vẫn chờ fixture P4/P5. |
| P0-06 | Hạn thanh toán | Người dùng chọn chờ webhook 15 phút. | Ghi nhận thêm 15 phút sau `order.expires_at` như mục 3; không thay chính sách API cũ hoặc reset hạn khi mở QR. |
| P0-07 | Ngrok | API quản trị local xác nhận domain hiện có → localhost:8000 trong phiên P0. | PASS cấu hình tunnel; endpoint SePay chưa có, DB backend chưa xác minh. Không kiểm thử public endpoint trong P0. |

Đề xuất webhook Test mode: JSON, HMAC, chỉ tiền vào và đúng tài khoản thử. Trong giai đoạn kiểm tra mã, không bật bộ lọc bỏ giao dịch không có `code`, để còn quan sát sai nội dung; quyết định phạm vi nhận giao dịch thực tế sau khi xác định tài khoản chính/VA và quyền riêng tư. Cấu hình test/live phải riêng; token v2 và webhook secret là hai credential khác nhau. Không đưa credential vào plan/report.

P0 đóng ngày 29/10/2026 sau khi P0-01..06 có thông tin cấu hình/quyết định và nguồn xác nhận rõ ràng, P0-07 có bằng chứng tunnel local từ phiên khảo sát. Không đòi endpoint hoạt động để đóng P0 vì triển khai và mô phỏng thuộc P3/P4. Việc đóng P0 không chứng minh token đã gọi API thành công hoặc webhook/QR đã hoạt động. Kiểm tra tài khoản mô phỏng, webhook và secret đúng môi trường trước P4; kiểm chứng mapping ID khi đối soát. P1 và P2 sau đó hoàn thành trong local theo báo cáo; không truy cập Supabase.

Nguồn bổ sung: [Test mode](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/bat-dau-nhanh), [Test/Live](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/so-sanh-voi-live), [cấu hình mã](https://developer.sepay.vn/vi/sepay-webhooks/cau-hinh-ma-thanh-toan), [API v2 Sandbox](https://developer.sepay.vn/vi/sepay-api/v2/sandbox).

### 7.2. Bàn giao P1 — database local riêng

Người dùng xác nhận chưa có DB local cần giữ, đồng ý tạo mới. Đã hoàn thành: PostgreSQL **16-alpine**, container `eventhub-sepay-local`, volume `eventhub-sepay-local-data`, DB `eventhub_sepay_local`, user `sepay_local`, port **127.0.0.1:55432**. Baseline 4 migration, seed 4 users/3 events giả và migration `SepayLocalFoundation1793289600000` thêm ba bảng SePay đã chạy trên local. Chạy lại migration không có thay đổi; fingerprint 23 bảng cũ giữ nguyên. Không truy cập Supabase.

Chỉ dùng `node server/scripts/sepay-local.cjs init|verify|baseline|migrate|seed|check` (mỗi lần chọn một action) và build trước migrate. Runner không đọc `.env`, kiểm tra literal local URL + Docker identity/port/volume/network trước kết nối. Cấu hình và password sinh ngẫu nhiên trong `.local/sepay/`, được git ignore. Compose riêng: `compose.sepay-local.yaml`. Migration mới **chưa đăng ký vào runner chung**; chỉ runner local đăng ký ở P1. P2 đã thêm API buyer opt-in và launcher có guard trước mở DB; P3 webhook/worker vẫn chưa viết. Không dùng script cũ để chạy SePay vì guard chưa áp dụng cho luồng cũ.
Kiểm thử P1: build, guard, boundaries, constraint checks rollback; migration fresh baseline/upgrade/idempotent. P2: HTTP/concurrency và hồi quy payment trên DB riêng. Chưa có QR scan bằng app ngân hàng hoặc webhook SePay runtime. Container/API/worker cũ và ngrok không đổi; ngrok chưa phục vụ API SePay. [Báo cáo P1](reports/mbbank-payment/20261029_152827_p1_local_database.md).

### 7.3. Bàn giao P3 — webhook, worker và tra soát

Đã hoàn tất code P3 và 45/45 kiểm thử local. Webhook HMAC dùng raw body, inbox durable/idempotent, worker tự đối chiếu và phát vé trong transaction, các giao dịch bất thường vào REVIEW; admin API có phân quyền và che số tài khoản. Không thêm migration mới vì ba bảng inbox/review đã có trong migration local P1. Không chạy backend SePay, worker, ngrok hay Dashboard trong P3; chưa có kết quả SePay Test mode thật.

Người dùng đã tự gửi mô phỏng SePay Test mode qua URL `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`. Kiểm tra DB local xác nhận giao dịch `PROCESSED`, payment `SUCCEEDED`, order `PAID`, 1 vé `VALID`; bằng chứng và giới hạn ở [báo cáo kết quả P4](reports/mbbank-payment/20261029_165044_p4_test_simulation_result.md). P4 happy-path đã được nghiệm thu; QR app scan và retry/outage thật chưa chạy. Chi tiết ở [báo cáo nghiệm thu P3/P4](reports/mbbank-payment/20261029_165907_p3_p4_acceptance.md). [Báo cáo P3](reports/mbbank-payment/20261029_161000_p3_webhook_worker.md) có runbook local và chi tiết test.
Kiểm thử đã đạt: build, 7 unit tests (3 guard + 4 VNPAY), boundaries, 4 constraint checks DB rollback; migration fresh baseline/upgrade/idempotent. Chưa có orders/payments thật hoặc giả đã thanh toán trong fixture upgrade; HTTP và concurrency P2 đã thử trên DB riêng; webhook và QR scan bằng app ngân hàng chưa thử. Container/API/worker cũ và ngrok không đổi. Ngrok vẫn chưa phục vụ API SePay. [Báo cáo chi tiết và runbook P1](reports/mbbank-payment/20261029_152827_p1_local_database.md).

### 7.5. Ma trận kịch bản P4 bổ sung

Backend matrix PASS 49/49 trên DB disposable local; gồm HMAC/payload, durable ACK khi DB lỗi, matching/REVIEW, duplicate/conflict, retry/lease, race và hồi quy. Chỉ một ca success chạy qua SePay Dashboard thật; các nhánh âm chạy synthetic. QR app scan và dashboard retry/outage còn NOT RUN. Chi tiết: [ma trận P4](reports/mbbank-payment/20261029_170854_p4_scenario_matrix.md).
### 7.4. Tiến độ P5 — SePay API v2 reconciliation (backend only)

Theo xác nhận của người dùng trong phiên 29/10/2026, phạm vi công việc hiện tại chỉ gồm API/backend; UI checkout/admin không thuộc scope đã chọn. Đã triển khai POST /api/admin/sepay/reconcile, client riêng cho API v2 Sandbox, phân trang tối đa 10 trang × 100 dòng, khoảng tra cứu 5–1440 phút (mặc định 60), timeout 10 giây, tối thiểu 400 ms giữa các request trang và chặn lượt đồng thời trong cùng process. Route yêu cầu ADMIN, không nhận credential từ client; token chỉ được nạp từ runtime local.

Đối soát nhận UUID v2 và không đồng nhất nó với ID số webhook. Ghép UUID vào webhook hiện có chỉ khi tuple account, amount, nội dung, thời gian và bank reference khớp duy nhất. Nếu API row đến trước webhook, worker có thể xử lý row đó; payment transaction ID lưu UUID API. Webhook đến sau gắn vào cùng row nếu tuple vẫn khớp. Giao dịch tiền vào có mã duy nhất được đưa vào worker; thiếu/mơ hồ mã hoặc tuple webhook mơ hồ được lưu REVIEW và không cấp vé.

Không cần migration P5: P1 đã có api_transaction_id uuid nullable cùng unique theo môi trường/tài khoản tích hợp. Thêm field apiV2SandboxToken vào file runtime bị Git ignore; người dùng tự điền. Build và module boundary PASS; disposable suite dùng DB PostgreSQL local được xác minh (eventhub_sepay_3fa57e500fde_test, port 55432) PASS 56/56. Người dùng xác nhận đã điền token; API/worker guarded local được khởi động lại và health trả HTTP 200. Reconcile thật qua API v2 Sandbox trả HTTP 200: 3 bản ghi quét; 0 nhập mới; 2 bản ghi REVIEW do thiếu/mơ hồ mã; một UUID đã tồn tại từ transaction đã được webhook xử lý. DB local xác nhận một row PROCESSED gắn API UUID với webhook ID, payment SUCCEEDED, order PAID và một vé; hai row REVIEW chưa gắn payment. Chạy lại nhận 3 duplicate, không tạo bản ghi/ticket trùng. Lượt đầu trước khi sửa lỗi tham số SQL trả 500 sau khi đã ghép một UUID; lỗi đã sửa và lần chạy sau cùng cùng lượt lặp đều thành công. Không truy cập Supabase. Báo cáo chi tiết: [P5 API v2](reports/mbbank-payment/20261029_171902_p5_sandbox_api_v2_reconciliation.md).

P5 backend chưa nghiệm thu đầy đủ: lần gọi thật chưa có transaction API-only mang mã khớp một payment pending để chứng minh recovery khi webhook thất lạc. Một transaction đã được webhook xử lý trước; hai transaction không có mã duy nhất nên được đưa REVIEW đúng chính sách. Cần một ca Sandbox E2E trong đó API v2 thấy giao dịch vào đúng account, amount và mã payment, còn webhook không đến; sau đó xác minh worker phát đúng một vé. Không chuyển sang P6/P7 hoặc Live.
## 8. Kiểm thử và tiêu chí đánh giá

Chỉ chạy test trên DB local được xác minh. Mỗi ca báo PASS/FAIL/BLOCKED, điều kiện, dữ liệu giả, kết quả quan sát và bằng chứng; không đánh PASS do chỉ đọc code hoặc do SePay trả 200.

| Nhóm | Ca tối thiểu / kết quả bắt buộc |
|---|---|
| DB và cô lập | Migrate fresh và upgrade có data giả demo/VNPAY; chạy lại migration; dữ liệu cũ/constraints không đổi. Guard từ chối URL không phải local, kể cả URL Supabase và compose cấu hình cũ; không kết nối Supabase. |
| API buyer | Đúng owner; user khác 403/404; order hết hạn/sự kiện đóng/tồn hết; nhấn lặp hoặc đồng thời chỉ một attempt; có payment cũ pending → 409, không sửa data cũ. |
| QR | Payload quét đúng MBBank/VA, người nhận, số VND và mã; không tin client; xác minh thực tế bằng app ngân hàng tại giai đoạn được phép dùng giao dịch thật. QR giả lập không chứng minh tiền thật. |
| HMAC | Body Unicode/khoảng trắng, sai secret/chữ ký, timestamp cũ/tương lai, header thiếu/trùng, JSON lỗi, body quá lớn; không ghi event hay cấp vé khi không xác thực. |
| Matching | Tiền vào đúng, tiền ra, sai account/VA, thiếu/multiple code, reference lạ, sai/thừa/thiếu tiền, amount lớn/không nguyên, code null/rỗng và thời gian không hợp lệ; sai/không chắc → REVIEW hoặc từ chối theo contract, không phát vé. |
| Retry/race | Cùng ID cùng payload và đồng thời; cùng ID khác payload; hai giao dịch cùng mã; worker crash trước/sau ACK/commit, lease hết hạn; chỉ một lần cấp vé và không mất inbox. |
| Thời hạn | Trước hạn; sát hạn; webhook đến sau hạn, đơn hủy/đã PAID, reservation nhả hoặc bị bán; không oversell, thanh toán muộn vào REVIEW. |
| Vận hành | Ngrok down, webhook retry/replay, API 5xx/timeout, phân trang v2, đối soát chồng lấn; chỉ đánh đạt tự phục hồi sau khi test thực sự với quyền v2. |
| Hồi quy | Chạy suite payment demo/VNPAY, đơn, vé, wait queue, ownership và kiểm tra route/response cũ trên local; không thay đổi hành vi API cũ. |
| Quyền/admin | Buyer không truy cập tra soát; admin reprocess lặp không tạo vé trùng; resolve có audit và không giả lập hoàn tiền. |

Chỉ coi chức năng **đạt nghiệm thu** khi toàn bộ ca bắt buộc PASS, migration local thành công, không còn lỗi nghiêm trọng, webhook thật/test mode đã được xác minh đúng phạm vi, và báo cáo nêu rõ những gì chưa thử. Tiền thật chỉ được thử sau khi thống nhất môi trường, dữ liệu và quy trình xử lý khoản chuyển; không đồng nghĩa cho phép truy cập Supabase.

## 9. Cổng cập nhật Supabase và chuyển đổi API cũ

**Kế hoạch chuyển SePay Live mới nhất:** [MBBank_SePay_Live_Plan.md](MBBank_SePay_Live_Plan.md). L3 chỉ gồm backend/API/worker/migration và kiểm thử bằng API client; UI checkout/admin chưa làm. Kế hoạch chi tiết điều kiện kiểm tra với database Supabase sau các phê duyệt tương ứng. Quyết định giữ demo/VNPAY sandbox thay thế các đề xuất tắt provider cũ trong báo cáo lịch sử.

### 9.1. Đề xuất migration để review (chưa áp dụng)

P1/P3 đã tạo và dùng local migration `SepayLocalFoundation1793289600000`, gồm `sepay_payment_details`, `sepay_transactions`, `sepay_transaction_reviews` và index/FK/check/unique constraints. Bản migration hiện được đăng ký riêng trong runner local; `server/scripts/migrate.cjs` dùng runner chung chưa đăng ký migration SePay. Đây là chủ ý cô lập, không phải thiếu sót cần khắc phục bằng cách chạy runner chung.

**Inventory chi tiết từ migration local (chưa xác minh trên Supabase):**

| Bảng | Cột | Constraints / indexes |
|---|---|---|
| `sepay_payment_details` | `payment_id uuid`; `environment varchar(8)`; `bank_code varchar(32)`; `account_number varchar(100)`; `account_name varchar(150)`; `sub_account varchar(100) NULL`; `transfer_content varchar(13)`; `created_at timestamptz` | PK/FK `payments(id)` RESTRICT; environment `test/live`; content regex `^tkh[A-Za-z0-9]{3,10}$`; unique `(environment,bank_code,account_number,transfer_content)`. |
| `sepay_transactions` | `id uuid`; `environment varchar(8)`; `integration_account varchar(100)`; `webhook_transaction_id varchar(128) NULL`; `api_transaction_id uuid NULL`; `reference_code varchar(256) NULL`; `bank_code varchar(32)`; `account_number varchar(100)`; `sub_account varchar(100) NULL`; `transfer_type varchar(3)`; `amount bigint`; `currency varchar(3)`; `payment_code varchar(128) NULL`; `content text`; `transaction_at timestamptz`; `payload_hash varchar(64)`; `payment_id uuid NULL`; `status varchar(16)`; `reason text NULL`; `attempt_count integer`; `next_retry_at timestamptz NULL`; `lease_until timestamptz NULL`; `lease_token uuid NULL`; `received_at timestamptz`; `processed_at timestamptz NULL` | PK; FK `payments(id)` RESTRICT; environment test/live; transfer in/out; amount 1..9007199254740991; currency VND; hash 64 hex; phải có webhook ID hoặc API UUID; webhook ID dạng số; REVIEW bắt buộc reason; unique webhook/API ID theo environment + integration account. Index work queue, payment/time, code, received/time. |
| `sepay_transaction_reviews` | `id uuid`; `transaction_id uuid`; `actor_id uuid NULL`; `action varchar(64)`; `reason text`; `evidence_reference text NULL`; `created_at timestamptz` | PK; FK transaction và `users(idUser)` RESTRICT; reason không rỗng; index `(transaction_id,created_at,id)`. |

Không thêm cột vào `payments`, `orders`, `users` hay `tickets`; chỉ thêm ba bảng SePay. Điều này mô tả ý định additive theo source, **không chứng minh không ảnh hưởng DB Supabase đang tồn tại**. Hiện không có bằng chứng schema Supabase, migration history, object trùng, version/quyền PostgreSQL, backup/restore hoặc lock measurement. Do đó tác động thực tế tại Supabase: **chưa thể kết luận**; cần được phép inventory và thử trên bản sao trước khi apply.

**API mới và xung đột:** `POST /api/payments/sepay/webhook` (HMAC); `POST/GET /api/sepay/orders/:orderId/payment` (buyer); `POST /api/admin/sepay/reconcile`; `GET /api/admin/sepay/transactions`; `GET /api/admin/sepay/transactions/:id`; `POST /api/admin/sepay/transactions/:id/reprocess`; `POST /api/admin/sepay/transactions/:id/resolve` (các route admin cần ADMIN). So với API cũ `/api/orders/:id/payments`, `/api/payments/:id/demo`, `/api/payments/vnpay/ipn`, `/api/payments/vnpay/return`, source registrations không trùng method + path; namespace SePay riêng. Static check trên `server/src/app.ts` trích 82 route literal, chuẩn hóa path parameters, thấy **0 duplicate**. Build và `npm run check:boundaries` PASS. Đây là kết quả build/static source, không phải production HTTP smoke test; P6 không chạy hồi quy API cũ.

Đề xuất cho P7 là tạo một migration triển khai riêng sau khi đối chiếu schema thực tế được cho phép: chỉ tạo ba bảng SePay và index mới; không `ALTER`, `UPDATE`, `DELETE`, truncate hoặc đổi constraint/index của các bảng hiện có. Các FK dự kiến tham chiếu `payments(id)` và `users(idUser)`; phải so khớp kiểu, tên và schema đích trước khi chốt. Nếu bất kỳ bảng, tên constraint/index hoặc migration tương tự đã tồn tại một phần, dừng để review thay vì dùng `IF NOT EXISTS` che khuất schema drift. Không coi migration local là bằng chứng schema Supabase giống nhau.

P7-01 read-only inventory (báo cáo [inventory Supabase](reports/mbbank-payment/20261029_220500_p7_supabase_readonly_inventory.md)) xác nhận hiện không có collision bảng/index, `payments.id` và `users.idUser` là UUID, và history `public.migrations` có đúng 4 baseline hiện tại. Tuy nhiên migration local chưa đủ an toàn cho Supabase: default privileges của role tạo bảng cấp toàn quyền cho `anon`, `authenticated`, `service_role`, còn các bảng public được rà soát đang tắt RLS. Migration production phải bật RLS và revoke quyền trên riêng ba bảng SePay trong cùng migration; không sửa ACL/RLS hoặc default privileges của bảng cũ. Chưa kiểm tra Data API exposure setting.

Migration hiện tại là DDL không idempotent (`CREATE TABLE/INDEX` trực tiếp), và `down()` cố ý từ chối xóa dữ liệu. Vì vậy trước P7 phải sinh migration production mới đã review từ schema được phép đọc, thử upgrade trên bản sao cô lập có baseline/schema tương ứng, kiểm tra fresh/upgrade và chạy lại có kiểm soát. Không sửa migration lịch sử đã chạy ở local. Không đưa migration vào runner chung trước khi có gate P7 riêng.

Rủi ro và biện pháp:

- Thêm bảng mới/FK/index không dự kiến sửa các hàng nghiệp vụ hiện có; tuy nhiên PostgreSQL vẫn cần lock ngắn trên bảng được tham chiếu khi tạo FK. Ước lượng lock/downtime trên bản sao trước, đặt `lock_timeout`/`statement_timeout`, và hủy an toàn nếu vượt ngưỡng.
- Kiểm tra trước xung đột tên, phiên bản PostgreSQL, owner/privileges, migration history, kiểu ID, schema/search path, extension và các bảng/constraint tương đồng. Không kết luận không ảnh hưởng khi chưa có snapshot/backup thực tế.
- Backup phải có bằng chứng hoàn thành và restore thử trên môi trường cô lập. Rollback ưu tiên rollback ứng dụng về bản không dùng bảng mới; không drop bảng SePay sau khi đã nhận giao dịch. Nếu phải đảo dữ liệu/schema, dừng ghi, đối soát giao dịch và dùng restore có phê duyệt hoặc migration forward đã review.

### 9.2. Trình tự P7 đề xuất

1. Hoàn tất các cổng nghiệm thu còn thiếu ở mục 9.4; chuẩn bị production backend/worker, HTTPS hợp lệ, secrets Live tách biệt và runbook trực vận hành.
2. Nhận cho phép cụ thể trước khi kết nối Supabase. Xác minh project/host/schema đích một cách an toàn; chỉ đọc inventory/migration history trước, không chạy app/worker và không chạy migration trong bước khảo sát.
3. Tạo backup và chứng minh restore chỉ sau phê duyệt riêng; lấy schema snapshot được phép, so sánh với migration local, chốt migration production mới có explicit RLS/revokes và thử trên bản sao tương thích.
4. Review/duyệt migration và rollback; kiểm tra cửa sổ, quyền tối thiểu, lock budget, quan sát, tiêu chí dừng và người chịu trách nhiệm. Sau phê duyệt riêng cho thao tác, apply theo từng bước rồi xác minh schema, tables, indexes, constraints và dữ liệu hiện hữu.
5. Triển khai code tương thích schema, smoke test chức năng SePay ở môi trường được duyệt, bật giám sát webhook/inbox/worker/reconcile/REVIEW, đối soát không tạo vé trùng.
6. Chỉ cutover nguồn tạo payment sau khi xử lý/đợi hết các attempt demo/VNPAY unresolved; giữ callbacks cũ cần thiết cho attempt đang bay. Bật SePay Live bằng tài khoản MBBank Live, HMAC Live riêng và URL HTTPS production; không dùng ngrok local.
7. Có ngưỡng rollback rõ ràng. Khi lỗi: dừng tạo payment mới SePay, giữ nguyên webhook/inbox để không mất giao dịch, đối soát bank/SePay và attempt cũ; chỉ hoàn nguyên routing sau khi xác nhận không có giao dịch đang bay có thể bị xử lý hai lần. Mọi bước có log/report không chứa secret.

### 9.3. Chuyển đổi API thanh toán cũ

Theo yêu cầu mới của người dùng, **giữ demo và VNPAY sandbox** trong môi trường phù hợp và giữ toàn bộ API/lịch sử/callback/IPN/return; không có bước tắt provider cũ trong kế hoạch mới. Production tiếp tục chặn provider thử theo source hiện tại. Nếu chạy đồng thời SePay Test với provider cũ trên staging, phải thiết kế thay thế guard `SEPAY_LEGACY_MODE` có kiểm thử; trước mở traffic cần kiểm tra attempt unresolved, callbacks, unique constraints/locking và không có hai provider cùng hoàn tất một order.

### 9.4. Các cổng còn thiếu trước P7/Live

- P4: QR scan PASS; người dùng xác nhận Dashboard Test mode có initial delivery failure và automatic retry success; DB local xác nhận webhook được xử lý, payment/order thành công, đúng một vé. Backend synthetic matrix 49/49 và happy-path webhook cũng đạt. Nghiệm thu chỉ trong phạm vi Test mode.
- P5: API/backend-only đã nghiệm thu theo phạm vi người dùng chọn; UI checkout/admin không nằm trong scope P5 hiện tại. Sandbox recovery khi webhook không đến đã phát đúng một vé và reconcile lặp idempotent.
- P6: gói tổng hợp, đề xuất migration và rollback đã lập; chưa đối chiếu bất kỳ schema/backup nào của Supabase.
- P7: chưa được cho phép và chưa bắt đầu. Cần ủy quyền cụ thể trước mọi kết nối/đọc/ghi/migrate Supabase, và quyết định riêng về production/Live.

### 9.5. Cổng chuyển Test mode sang SePay Live

**Chưa chuyển Live.** Chỉ xem xét sau khi cổng P4 còn thiếu được đóng, P6 được review, P7 được cho phép/thực hiện an toàn, production backend/worker/DB sẵn sàng, MBBank Live và HMAC secret riêng được xác minh, URL HTTPS production có chứng chỉ hợp lệ, cùng cutover/rollback đã được duyệt. P5 hiện là API/backend-only; UI không phải điều kiện được người dùng chọn cho P5. SePay Test mode/ngrok không chứng minh điều kiện Live.

Không có ngày chuyển Live cố định. Trước các cổng trên, không cấu hình webhook Live, không dùng credential Test trong Live, không tắt khởi tạo demo/VNPAY và không tác động Supabase.

Báo cáo rà soát: [cổng chuyển Live](reports/mbbank-payment/20261029_170334_live_transition_gate_review.md).

### 9.1. Cổng chuyển Test mode sang SePay Live

**Chưa chuyển Live.** P4 đã PASS happy-path Test mode và backend matrix local 49/49, nhưng QR scan cùng Dashboard retry/outage thật còn NOT RUN. P5 API/backend-only đã nghiệm thu theo scope người dùng chọn; UI checkout/admin không thuộc scope P5. Chỉ xem xét Live sau khi: (a) các cổng P4 còn thiếu được đóng hoặc có quyết định chấp nhận giới hạn được ghi nhận; (b) P6 được review; (c) người dùng cho phép cụ thể P7 truy cập/migrate Supabase; (d) production backend/worker và DB được triển khai, xác minh; (e) MBBank Live, HMAC Live riêng và domain HTTPS production hợp lệ được xác minh; (f) cutover/rollback và attempt demo/VNPAY unresolved có phương án xử lý.

SePay phân biệt Test mode với Live ở nguồn dữ liệu và xác minh SSL: Test mode chấp nhận HTTP/self-signed, Live yêu cầu endpoint HTTPS có chứng chỉ hợp lệ. Vì vậy ngrok→localhost:8010 chỉ phục vụ thử nghiệm, không phải production endpoint. Xem [so sánh Test mode/Live](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/so-sanh-voi-live), [bảo mật webhook](https://developer.sepay.vn/vi/sepay-webhooks/bao-mat).

Không có ngày chuyển Live cố định; mốc dự kiến là **sau khi đóng P5–P6 và hoàn thành P7 được cho phép**. Trước đó không cấu hình webhook Live, không dùng token/secret Test trong Live, không tắt khởi tạo payment demo/VNPAY và không tác động Supabase.

Báo cáo rà soát: [cổng chuyển Live](reports/mbbank-payment/20261029_170334_live_transition_gate_review.md).
## 10. Báo cáo bắt buộc và tiến độ

**L3 — 30/10/2026:** hoàn thiện backend tám API, sửa Unicode/HMAC, fencing lease, durable ambiguity REVIEW, reprocess/audit atomic và bộ lọc tra soát. PostgreSQL 17 hardened suite **68/68 PASS**, 0 skipped. Đã chuẩn bị curl theo lựa chọn người dùng; Supabase chỉ đọc vẫn chưa có ba bảng SePay, không apply migration/Live. [Báo cáo L3](reports/mbbank-payment/20261030_002925_l3_backend_acceptance.md), [curl runbook](api/SePay_Curl_Runbook.md).

**L2 — 30/10/2026 00:20 UTC+7:** hoàn thành migration ứng viên có RLS/revoke và runbook; rehearsal PostgreSQL 17.11 cô lập đạt 10 nhóm kiểm tra, API/regression 62/62 PASS (0 skipped) dưới owner không superuser. Không đổi Supabase, migration local cũ hoặc runner chung; chưa commit. [Báo cáo L2](reports/mbbank-payment/20261030_002002_l2_migration_acceptance.md), [runbook](reports/mbbank-payment/20261030_001340_l2_migration_runbook.md).

**L1 — 30/10/2026 00:03 UTC+7:** loader Test/Live chung API/worker, v2 allowlist và DB lock nhiều process, isolation environment/account đã triển khai. Build/boundaries PASS; test local disposable 69/69 PASS, không skipped, có synthetic Live HMAC → một vé và hồi quy demo/VNPAY. Người dùng xác nhận Live secret/token riêng. Chưa bật Live, sửa Supabase/ngrok hoặc commit. [Báo cáo đầy đủ và giới hạn](reports/mbbank-payment/20261030_000240_l1_runtime_live_config.md).

**Quyết định hiện hành, 29/10/2026 23:44 UTC+7:** tập trung SePay Live qua ngrok trên máy hiện tại; người dùng xác nhận Test đã mô phỏng thành công, ngắt sử dụng Test khi chuyển Live nếu không chạy song song. Không yêu cầu domain/deploy dài hạn hoặc xác minh tiếp backup/PITR; backup do người dùng quản lý. Chưa commit theo chỉ đạo. Đã đọc dữ liệu bảng Supabase thật qua TLS/transaction chỉ đọc: 12 users, 24 orders, 14 payments, 4 tickets. L0 đóng phần quyết định phạm vi để chuyển L1 local; chưa nghiệm thu Live. Quyết định này thay thế các yêu cầu cũ mâu thuẫn trong tài liệu. [Báo cáo đầy đủ](reports/mbbank-payment/20261029_234409_l0_scope_and_real_database_read.md).

**L0 Live, 29/10/2026 23:12 UTC+7:** đã rà soát và gửi câu hỏi xác minh; chưa hoàn thành do chưa chốt commit, môi trường, runtime role, domain và quyền Live/backup. Build và boundaries local PASS. [Báo cáo chi tiết](reports/mbbank-payment/20261029_231241_l0_verification.md).

**Cập nhật L0, 23:22 UTC+7:** người dùng chọn source hiện tại, hoãn commit; chưa có staging/domain, dự kiến ngrok và xác nhận quyền SePay Live. Còn thiếu xác minh deployment, project/role và backup/PITR; L0 chưa hoàn thành. [Báo cáo xác nhận](reports/mbbank-payment/20261029_232205_l0_user_confirmation.md).

**Cập nhật L0, 23:24 UTC+7:** `pbl6-eventhub` chứa dữ liệu thật theo người dùng; chạy trên máy hiện tại, ngrok tạm thời, backup đã lưu. Kết nối kiểm tra chỉ đọc bị lỗi xác thực chuỗi TLS; cần xác minh lại role/schema và phạm vi phục hồi. [Báo cáo](reports/mbbank-payment/20261029_232421_l0_supabase_recheck.md).

**Cập nhật L0, 23:30 UTC+7:** TLS qua CA local và metadata chỉ đọc PASS; role kết nối `postgres`, PostgreSQL 17.11, 24 bảng public, chưa có ba object SePay. Mapping project và role process runtime chưa được xác minh độc lập; L0 chưa hoàn thành. [Báo cáo](reports/mbbank-payment/20261029_233018_l0_supabase_tls_recheck.md).

**Cập nhật L0, 23:33 UTC+7:** contract đã rà soát, 13 unit/mock/guard test PASS; phát hiện credential Cloudinary đang dùng trong file mẫu tracked, đã thay placeholder và cần xoay vòng. L0 chưa hoàn thành. [Báo cáo](reports/mbbank-payment/20261029_233321_l0_contract_secret_review.md).

**Cập nhật L0, 23:34 UTC+7:** `DEMO_PASSWORD` chỉ dùng demo/test theo xác nhận người dùng; Cloudinary vẫn cần xoay vòng. [Báo cáo](reports/mbbank-payment/20261029_233414_l0_demo_password_confirmation.md).

**Đối chiếu L0/L1, 23:36 UTC+7:** DB test local qua guard PASS; L0 chưa hoàn thành và staging còn thiếu. Chờ xác nhận PITR, xoay credential Cloudinary và phương án test local. [Báo cáo readiness](reports/mbbank-payment/20261029_233644_l0_l1_readiness.md).

**Xác nhận L0/L1, 23:37 UTC+7:** người dùng xác nhận Supabase Free, backup lưu bên ngoài, đã xoay credential Cloudinary và đồng ý test L1 bằng dữ liệu giả trên DB local. PITR và staging chưa xác minh/hoàn thành; chưa commit theo chỉ đạo. [Báo cáo](reports/mbbank-payment/20261029_233742_l0_l1_user_confirmation.md).

Tên báo cáo: `docs/reports/mbbank-payment/YYYYMMDD_HHMMSS_<cong-viec>.md` (giờ UTC+7). Mỗi báo cáo ghi: mục tiêu; phạm vi/commit và thay đổi; DB đích đã xác minh (không có secret); lệnh và kết quả; bảng test PASS/FAIL/BLOCKED kèm bằng chứng; sự cố và giới hạn; ảnh hưởng API cũ/dữ liệu; công việc kế tiếp. Sau đó cập nhật bảng này và link báo cáo. Không ghi thành công khi thiếu bằng chứng thực thi.

| Ngày | Mốc | Trạng thái | Bằng chứng / việc tiếp theo |
|---|---|---|---|
| 29/10/2026 | Khảo sát và lập kế hoạch | Hoàn thành khảo sát tĩnh; chưa triển khai | [Báo cáo khảo sát](reports/mbbank-payment/20261029_initial_plan.md). Ngrok cấu hình tới localhost:8000; health không kết nối được; chưa truy cập Supabase. |
| 29/10/2026 | Kiểm tra lại tunnel và health | Health local hiện trả 200 | [Báo cáo kiểm tra lại](reports/mbbank-payment/20261029_health_recheck.md). Chưa xác minh đích database của backend đang chạy. |
| 29/10/2026 14:18 UTC+7 | P0 | Đã thực hiện khảo sát; chờ xác nhận, chưa hoàn thành | [Báo cáo P0](reports/mbbank-payment/20261029_141800_p0_verification.md), trạng thái từng điều kiện ở mục 7.1. Không gọi DB hay API nghiệp vụ. |
| 29/10/2026 15:16 UTC+7 | P0 bổ sung | Đã xác nhận cấu hình chính; còn token Sandbox | [Báo cáo phản hồi](reports/mbbank-payment/20261029_151647_p0_user_confirmation.md). MBBank chính, HMAC, TKH + 3–10 chữ/số, quyền v2, chờ webhook thêm 15 phút; chưa test webhook hoặc DB. |
| 29/10/2026 15:20 UTC+7 | Đóng P0 | Hoàn thành xác nhận điều kiện tích hợp | [Báo cáo đóng P0](reports/mbbank-payment/20261029_152033_p0_completion.md). Người dùng xác nhận token Sandbox riêng đã tạo/lưu; chưa kiểm thử API, webhook hoặc DB. |
| 29/10/2026 15:26 UTC+7 | Đính chính mã thanh toán | Đã cập nhật yêu cầu | [Báo cáo đính chính](reports/mbbank-payment/20261029_152619_payment_code_correction.md): tiền tố `tkh` chữ thường, hậu tố 3–10 chữ/số, không mặc định 10. Thay thế quyết định TKH+10 trước đó. |
| 29/10/2026 | P1 | Hoàn thành local foundation | [Báo cáo P1](reports/mbbank-payment/20261029_152827_p1_local_database.md). Container/DB riêng, guard, baseline, migration SePay, seed và kiểm thử; không truy cập Supabase. |
| 29/10/2026 15:50 UTC+7 | P2 | API buyer SePay hoàn thành trên local; chưa nghiệm thu runtime SePay | [Báo cáo P2](reports/mbbank-payment/20261029_155012_p2_buyer_api.md). Hai route tạo/xem, QR URL và store mới; test DB local PASS 38/38, hồi quy demo/VNPAY đạt. Chưa thử scan QR/webhook thật. |
| 29/10/2026 16:10 UTC+7 | P3 | Webhook, worker và tra soát hoàn thành; chưa kiểm thử SePay Dashboard/public | [Báo cáo P3](reports/mbbank-payment/20261029_161000_p3_webhook_worker.md). Full suite gần nhất 45/45; xác minh bổ sung build, boundaries, 10/10 test mục tiêu và DB local PASS. Không truy cập Supabase. URL webhook chỉ sẵn sàng khi ngrok forward tới 8010; P4 chờ người dùng mô phỏng Test mode thành công. |
| 29/10/2026 16:19 UTC+7 | Kiểm tra sẵn sàng URL webhook | NOT READY: ngrok forward 8000, listener 8010 chưa chạy, runtime config thiếu | [Báo cáo readiness](reports/mbbank-payment/20261029_161903_p3_webhook_readiness.md). URL dự kiến là `/api/payments/sepay/webhook`; chưa gửi request/đổi tunnel. P4 chờ người dùng tự mô phỏng thành công. |
| 29/10/2026 16:25 UTC+7 | Kiểm tra lại runtime/DB | NOT READY; DB local tồn tại nhưng listener 8010 và runtime config không thấy trong phiên kiểm tra | [Báo cáo recheck](reports/mbbank-payment/20261029_162520_p3_runtime_db_recheck.md). Không xác minh được backend người dùng vừa chạy có dùng local hay Supabase; chỉ launcher `sepay-local-api.cjs` mới chứng minh guard local. |
| 29/10/2026 16:28 UTC+7 | Chuẩn bị Test mode | DB local/build/boundaries PASS; ngrok forward 8010; runtime khung trống, listener và payment pending còn thiếu | [Báo cáo chuẩn bị](reports/mbbank-payment/20261029_162826_sepay_test_preparation.md). URL: `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`. Cần người dùng điền config local; sau đó launcher P3 và pending payment fixture trước mô phỏng. P4 vẫn chờ xác nhận thành công. |
| 29/10/2026 16:35 UTC+7 | Hướng dẫn Test mode và listener | NOT READY: runtime ba trường trống, 8010 chưa listen; DB local PASS, ngrok forward 8010 | [Báo cáo hướng dẫn/kiểm tra](reports/mbbank-payment/20261029_163500_sepay_test_mode_credentials_and_listener.md). Mục tiêu mô phỏng là khớp payment pending và phát vé; cần config Test local, API+worker, tạo order/payment trước khi simulate. |
| 29/10/2026 16:45 UTC+7 | Preflight mô phỏng phát vé | Hạ tầng local/API/worker/ngrok PASS; payment pending khớp đã tạo | [Báo cáo readiness](reports/mbbank-payment/20261029_164535_local_simulation_readiness.md). Amount 150.000 VND, content `tkhPN8V`, hết hạn 16:59:40 UTC+7. |
| 29/10/2026 16:50 UTC+7 | Mô phỏng SePay Test mode | PASS happy-path end-to-end: transaction PROCESSED, payment SUCCEEDED, order PAID, 1 ticket VALID | [Báo cáo kết quả](reports/mbbank-payment/20261029_165044_p4_test_simulation_result.md). SePay HTTP 200; DB local được xác minh; 1 notification/audit, không REVIEW. P4 test gate đạt; chưa nghiệm thu toàn bộ P4, không truy cập Supabase. |
| 29/10/2026 16:59 UTC+7 | Nghiệm thu P3/P4 | P3 PASS; P4 PASS cho Test mode happy-path; QR app scan và operational retry/outage chưa chạy | [Báo cáo nghiệm thu](reports/mbbank-payment/20261029_165907_p3_p4_acceptance.md). Build/boundaries PASS; full disposable local suite 46/46; runtime DB local giữ một vé đã phát; không truy cập Supabase. |
| 29/10/2026 17:03 UTC+7 | Rà soát thời điểm chuyển Live | Chưa sẵn sàng: P5–P7 chưa thực hiện | [Báo cáo cổng Live](reports/mbbank-payment/20261029_170334_live_transition_gate_review.md). Chuyển sau P5–P6, rồi P7 chỉ khi có cho phép cụ thể; cần production DB, HTTPS hợp lệ, Live secret/account riêng và cutover/rollback. |
| 29/10/2026 17:08 UTC+7 | Ma trận kịch bản P4 mở rộng | Synthetic backend matrix PASS 49/49; Dashboard thật vẫn chỉ có một ca happy path | [Báo cáo ma trận P4](reports/mbbank-payment/20261029_170854_p4_scenario_matrix.md). Bao phủ HMAC, mismatch/REVIEW, duplicate/conflict, retry/lease, DB failure, race và regression. QR scan, retry/outage Dashboard, API v2 chưa chạy. |
| 29/10/2026 17:27 UTC+7 | P5 API v2 (backend only) | Backend/mock/local tests và upstream Sandbox HTTP 200; chờ API-only E2E recovery, UI không thuộc scope người dùng chọn | [Báo cáo P5](reports/mbbank-payment/20261029_171902_p5_sandbox_api_v2_reconciliation.md). Local suite 56/56 PASS; 3 giao dịch quét, 2 REVIEW thiếu/mơ hồ mã, một đã khớp webhook; lượt lặp idempotent; không truy cập Supabase. |
| 29/10/2026 17:31 UTC+7 | Runbook P5 API-only recovery | Hướng dẫn đã chuẩn bị; chờ người dùng tạo mô phỏng, chưa gửi giao dịch | [Quy trình kiểm tra](reports/mbbank-payment/20261029_173150_p5_api_only_recovery_test_procedure.md). Tắt webhook Test tạm thời trong lúc mô phỏng, dùng payment PENDING mới trên DB local; không dừng ngrok để tránh retry. |
| 29/10/2026 17:36 UTC+7 | Kiểm tra payment fixture P5 | Chưa có payment PENDING mới; fixture hiện có là P4 cũ, đã SUCCEEDED và hết hạn | [Báo cáo trạng thái fixture](reports/mbbank-payment/20261029_173643_p5_payment_fixture_status_check.md). DB local có 0 payment PENDING/UNKNOWN; cần tạo fixture mới trước khi nhập giao dịch. |
| 29/10/2026 17:40 UTC+7 | Hỗ trợ CMD chạy runbook | Lỗi do chạy lệnh PowerShell trong CMD; API local health hiện HTTP 200, fixture P4 cũ chưa đổi | [Hướng dẫn CMD](reports/mbbank-payment/20261029_174035_p5_cmd_shell_guidance.md). Dùng `curl.exe` kiểm tra health, `ren` giữ fixture P4 rồi chạy helper tạo payment P5 mới. |
| 29/10/2026 18:17 UTC+7 | Khôi phục fixture P5 sau payment hết hạn | Đã tạo payment PENDING mới trên DB local; chờ người dùng mô phỏng Test mode | [Báo cáo khôi phục fixture](reports/mbbank-payment/20261029_181700_p5_fixture_recovery.md). Worker webhook không chạy expiry booking; chạy workflow expire có guard local, sửa điều kiện helper để payment lịch sử gắn order EXPIRED không chặn order mới. Giao dịch SePay chưa chạy. Credential rotation cần hoàn tất trước reconcile/webhook tiếp theo. |
| 29/10/2026 18:22 UTC+7 | P5 API-only recovery | Hoàn thành nghiệm thu backend-only | [Báo cáo nghiệm thu recovery](reports/mbbank-payment/20261029_182200_p5_api_only_recovery_acceptance.md). API v2 Sandbox import giao dịch khi webhook vắng; transaction PROCESSED, payment SUCCEEDED, order PAID, đúng 1 ticket; reconcile lặp không tạo trùng. Một giao dịch lịch sử khác vào REVIEW/RESERVATION_NOT_HELD và không phát vé. |
| 29/10/2026 21:16 UTC+7 | P6 | Hoàn tất gói rà soát/đề xuất trên tài liệu; chưa sẵn sàng P7/Live | [Báo cáo P6](reports/mbbank-payment/20261029_211600_p6_acceptance_migration_cutover_plan.md). Inventory 3 bảng, đánh giá API (82 route, 0 duplicate), build/boundaries PASS; migration additive feasibility có điều kiện. Không chạy test DB hay truy cập Supabase. P4 QR scan và Dashboard retry/outage còn thiếu. |
| 29/10/2026 21:28 UTC+7 | P7-00 preflight | Source review PASS; user chọn đóng P4 trước, nên chưa dùng quyền inventory read-only | [Báo cáo P7 preflight](reports/mbbank-payment/20261029_212800_p7_preflight.md). Chưa có kết nối DB; sau P4 xác minh project rồi chỉ inventory read-only theo xác nhận. |
| 29/10/2026 21:29 UTC+7 | P4 QR/retry readiness | Hạ tầng local/API/worker/ngrok PASS; khi đó fixture hết hạn và auto-retry chưa xác nhận | [Báo cáo P4 readiness](reports/mbbank-payment/20261029_212900_p4_qr_retry_readiness.md). |
| 29/10/2026 21:39 UTC+7 | P4 QR fixture | Payment local mới tạo và xác minh; người dùng xác nhận QR fields đúng | [Báo cáo fixture QR](reports/mbbank-payment/20261029_213900_p4_qr_fixture.md). 150.000 VND, nội dung `tkh7JKCHXPHQN`, hạn 21:54:29; không chuyển tiền. Auto-retry Test mode đã bật theo xác nhận người dùng. |
| 29/10/2026 21:49 UTC+7 | P4 QR scan | PASS theo xác nhận người dùng; payment vẫn PENDING | Hiển thị đúng tài khoản, amount, lời nhắn; truy vấn local xác nhận fixture còn hạn tới 21:54:29. Chưa chuyển tiền. Retry/outage vẫn NOT RUN. |
| 29/10/2026 21:55 UTC+7 | P4 retry fixture | PASS tạo payment local mới; chờ mô phỏng có giám sát | [Báo cáo fixture retry](reports/mbbank-payment/20261029_215500_p4_retry_fixture.md). 150.000 VND, content `tkhLPP5R`, expiry 22:09:47 UTC+7; auto-retry Test mode bật theo xác nhận. |
| 29/10/2026 22:00 UTC+7 | P4 outage/retry | PASS theo xác nhận Dashboard + DB local | [Báo cáo kết quả retry](reports/mbbank-payment/20261029_220000_p4_retry_outcome.md). Initial delivery fail, retry success theo Dashboard; webhook ID 42741 được nhận sau restart; payment SUCCEEDED, order PAID, đúng 1 ticket/notification/payment audit. Test mode only. |
| 29/10/2026 22:05 UTC+7 | P7-01 inventory | Hoàn tất read-only; migration chưa sẵn sàng do RLS/grants blocker | [Báo cáo inventory](reports/mbbank-payment/20261029_220500_p7_supabase_readonly_inventory.md). Không có collision tên, UUID FK khớp, baseline 4 migration khớp; default ACL rộng/RLS disabled cần được xử lý trên các bảng SePay mới. Không backup/DDL/đụng data rows. |
| 29/10/2026 22:07 UTC+7 | P7-02 draft | SQL migration review-only hoàn tất; chưa thực thi | [Báo cáo draft](reports/mbbank-payment/20261029_220700_p7_migration_draft_review.md), [SQL draft](reports/mbbank-payment/20261029_220700_p7_sepay_additive_migration_review.sql). Có explicit RLS/revoke cho bảng SePay mới. Không chạy trên DB; cần test disposable local/clone và quyền riêng cho backup/DDL. |
| 29/10/2026 22:09 UTC+7 | P7-03 local migration rehearsal | PASS trong transaction rollback trên DB disposable PostgreSQL 16 | [Báo cáo thử draft](reports/mbbank-payment/20261029_220922_p7_local_migration_rehearsal.md). RLS, revoke, role SELECT deny, owner insert và fingerprint 24 bảng giả PASS; roles/bảng thử được rollback. PostgreSQL 17 MAINTAIN, commit, Data API, clone/restore chưa thử. |
| 29/10/2026 22:15 UTC+7 | P7 backup/restore | PASS schema `public` backup và restore thử local PostgreSQL 17; chưa phải full Supabase backup | [Báo cáo backup/restore](reports/mbbank-payment/20261029_221500_p7_backup_restore_rehearsal.md). Backup mã hóa ngoài repo; 24 bảng/252 cột/số dòng khớp. Restore thử bỏ owner/ACL; không bao gồm auth/storage/PITR, chưa xác minh di chuyển DPAPI. |
| 29/10/2026 22:20 UTC+7 | P7 bảo vệ backup trong Git | Đã thêm ignore cho thư mục `Backups/` và file backup mã hóa/khóa DPAPI | [Báo cáo Git ignore](reports/mbbank-payment/20261029_222016_backup_gitignore.md). Backup thực tế nằm ngoài repository và chứa snapshot dữ liệu `public` Supabase; `git check-ignore` PASS với đường dẫn giả định trong repo. |
| 29/10/2026 22:24 UTC+7 | Kế hoạch SePay Live | Hoàn thành kế hoạch, chưa triển khai | [Plan Live](MBBank_SePay_Live_Plan.md), [báo cáo khảo sát](reports/mbbank-payment/20261029_222440_sepay_live_plan.md). Cấu hình và tám API hiện có/đề xuất bổ sung, migration Supabase, RLS/backup, test/tiêu chí; giữ demo/VNPAY sandbox theo môi trường phù hợp. |
| 29/10/2026 23:06 UTC+7 | Điều chỉnh L3 | Chốt backend-only, chưa làm UI | [Báo cáo điều chỉnh](reports/mbbank-payment/20261029_230630_live_l3_backend_scope.md). L3 hoàn thiện tám API cần thiết và migration review; kiểm thử Supabase ở L4 sau phê duyệt tương ứng, phân biệt Test/Live. |
| — | P7-04+ | Còn việc và chờ ủy quyền DDL | Xác minh full backup/PITR, ACL/owner và rollback, test migration/lock trên bản sao được phép, role/MAINTAIN, migration history. DDL Supabase cần phê duyệt riêng; không cutover/Live. |

