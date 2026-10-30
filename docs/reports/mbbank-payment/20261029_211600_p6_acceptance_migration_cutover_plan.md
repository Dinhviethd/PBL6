# Báo cáo P6 — tổng hợp nghiệm thu, đề xuất migration và cutover SePay

**Thời điểm:** 29/10/2026, 21:16 UTC+7  
**Trạng thái:** Hoàn thành gói review/đề xuất P6 trên tài liệu; chưa cho phép hay thực hiện P7, chưa sẵn sàng Live.  
**Phạm vi:** Đọc plan, reports P3/P4/P5, migration local và runner/source liên quan; cập nhật `docs/MBBank_Payment.md`. Không kết nối, đọc, ghi hoặc migrate Supabase. Không chạy app/worker hay lệnh có khả năng truy cập database.

## Kết quả rà soát bằng chứng

| Mục | Đánh giá | Bằng chứng và giới hạn |
|---|---|---|
| P0–P3 | Đạt theo các report đã ghi trong plan | Các báo cáo ghi nhận cấu hình ban đầu và implementation/test local. Đây là tổng hợp hồ sơ, không chạy lại test trong phiên P6. |
| P4 happy path | Đạt theo phạm vi Test mode | Report P3/P4 ghi SePay Test mode nhận HTTP 200; DB local có transaction `PROCESSED`, payment `SUCCEEDED`, order `PAID`, đúng 1 vé. |
| P4 backend scenario matrix | 49/49 synthetic local PASS | Bao phủ nhánh âm/race/failure ở backend. Không chứng minh Dashboard thật retry khi endpoint lỗi/outage. |
| P4 quét QR | NOT RUN | Chưa có bằng chứng quét bằng app ngân hàng và xác nhận chính xác người nhận, amount, transfer content. QR URL contract test không thay được việc scan. |
| P4 retry/outage Dashboard | NOT RUN | Chưa có bằng chứng SePay gửi lại sau timeout/5xx/outage và hệ thống xử lý idempotent trong vận hành thật. |
| P5 API/backend-only | Đạt theo report 18:22 | API v2 Sandbox tìm lại giao dịch khi webhook bị tắt; payment/order hoàn tất, phát một vé; reconcile lặp không tạo vé trùng. Giao dịch lịch sử không còn reservation vào REVIEW, không phát vé. UI checkout/admin nằm ngoài phạm vi người dùng đã chọn. |
| Local schema/migration | Đã có local foundation | `SepayLocalFoundation1793289600000` tạo ba bảng SePay mới; local runner riêng đăng ký migration này. Runner chung `server/scripts/migrate.cjs` hiện chưa đăng ký migration SePay. |
| Supabase/schema thực tế | Chưa biết và chưa truy cập | Không có schema snapshot, migration history, quyền, dung lượng, backup hay kết quả restore của Supabase. Không thể xác nhận migration tương thích hoặc “không ảnh hưởng” tại thời điểm này. |

## Đề xuất migration

### Inventory bảng, cột và ràng buộc từ local migration

Đây là schema source hiện có, chưa phải xác nhận schema Supabase:

| Bảng | Cột | Kiểu / ràng buộc chính |
|---|---|---|
| `sepay_payment_details` | `payment_id` | UUID PK/FK `payments(id)`, `ON DELETE RESTRICT` |
|  | `environment` | `varchar(8)` NOT NULL, chỉ `test`/`live` |
|  | `bank_code` | `varchar(32)` NOT NULL |
|  | `account_number` | `varchar(100)` NOT NULL |
|  | `account_name` | `varchar(150)` NOT NULL |
|  | `sub_account` | `varchar(100)` NULL |
|  | `transfer_content` | `varchar(13)` NOT NULL, regex `^tkh[A-Za-z0-9]{3,10}$` |
|  | `created_at` | `timestamptz` NOT NULL DEFAULT `now()` |
|  | Unique | `(environment, bank_code, account_number, transfer_content)` |
| `sepay_transactions` | `id` | UUID PK |
|  | `environment`, `integration_account` | `varchar(8)` và `varchar(100)`, NOT NULL; environment `test`/`live` |
|  | `webhook_transaction_id` | `varchar(128)` NULL; nếu có phải là chuỗi số |
|  | `api_transaction_id` | UUID NULL; giữ UUID API v2 riêng với ID webhook |
|  | `reference_code` | `varchar(256)` NULL |
|  | `bank_code`, `account_number` | `varchar(32)`, `varchar(100)`, NOT NULL |
|  | `sub_account` | `varchar(100)` NULL |
|  | `transfer_type` | `varchar(3)` NOT NULL, `in`/`out` |
|  | `amount`, `currency` | `bigint` NOT NULL trong 1..9007199254740991; currency mặc định/giới hạn `VND` |
|  | `payment_code` | `varchar(128)` NULL |
|  | `content` | `text` NOT NULL |
|  | `transaction_at` | `timestamptz` NOT NULL |
|  | `payload_hash` | `varchar(64)` NOT NULL, 64 ký tự hex thường |
|  | `payment_id` | UUID NULL/FK `payments(id)`, `ON DELETE RESTRICT` |
|  | `status`, `reason` | status mặc định `RECEIVED`, thuộc `RECEIVED/PROCESSING/PROCESSED/REVIEW/ERROR`; reason `text` NULL, bắt buộc có nội dung khi REVIEW |
|  | Retry/lease | `attempt_count integer` NOT NULL DEFAULT 0; `next_retry_at`, `lease_until` timestamptz NULL; `lease_token uuid` NULL |
|  | Thời điểm | `received_at timestamptz` NOT NULL DEFAULT `now()`; `processed_at timestamptz` NULL |
|  | Checks/unique | Phải có ít nhất một webhook/API ID; unique `(environment, integration_account, webhook_transaction_id)` và tương tự với `api_transaction_id` |
|  | Index | `(status,next_retry_at,lease_until,id)`, `(payment_id,received_at,id)`, `payment_code`, `(received_at,id)` |
| `sepay_transaction_reviews` | `id` | UUID PK |
|  | `transaction_id` | UUID NOT NULL/FK `sepay_transactions(id)`, `ON DELETE RESTRICT` |
|  | `actor_id` | UUID NULL/FK `users(idUser)`, `ON DELETE RESTRICT` |
|  | `action` | `varchar(64)` NOT NULL |
|  | `reason` | `text` NOT NULL, không được rỗng sau trim |
|  | `evidence_reference` | `text` NULL |
|  | `created_at` | `timestamptz` NOT NULL DEFAULT `now()` |
|  | Index | `(transaction_id,created_at,id)` |

Không có cột nào được thêm trực tiếp vào bảng cũ `payments`, `orders`, `users` hay `tickets` trong migration này. Các liên kết dùng FK mới.

### API bổ sung và kiểm tra xung đột route

| Method + path | Auth | Route cũ gần nhất / đánh giá |
|---|---|---|
| `POST /api/payments/sepay/webhook` | HMAC, không session | Tách khỏi `/api/payments/vnpay/ipn` và `/api/payments/vnpay/return`; được đăng ký raw-body trước JSON parser. Không trùng method/path. |
| `POST /api/sepay/orders/:orderId/payment` | Buyer Bearer | Mới dưới namespace `/api/sepay`; không đè `POST /api/orders/:id/payments` hoặc `POST /api/payments/:id/demo`. |
| `GET /api/sepay/orders/:orderId/payment` | Buyer Bearer | Khác method với route POST cùng path và tách namespace khỏi API order cũ. |
| `POST /api/admin/sepay/reconcile` | ADMIN Bearer | Tách namespace; gọi API v2 Sandbox server-side. |
| `GET /api/admin/sepay/transactions` | ADMIN Bearer | Tách namespace với admin payment cũ. |
| `GET /api/admin/sepay/transactions/:id` | ADMIN Bearer | Tách namespace với route transaction/payment khác. |
| `POST /api/admin/sepay/transactions/:id/reprocess` | ADMIN Bearer | Route hành động mới, không khớp route detail. |
| `POST /api/admin/sepay/transactions/:id/resolve` | ADMIN Bearer | Route hành động mới, không khớp route detail. |

Static route check trên `server/src/app.ts` trích 82 literal registrations, chuẩn hóa tên path parameter và so sánh cặp method + path: **0 route duplicate**. Build TypeScript và `npm run check:boundaries` cũng PASS trong workspace local. Đây là kiểm tra source/build, không phải HTTP smoke test với Supabase hay kiểm thử mọi router runtime. Contract cũ được giữ nguyên trong source review; chưa chạy hồi quy trong lượt P6.

1. Giữ nguyên migration local đã sử dụng; không sửa migration lịch sử và không thêm nó vào runner chung trong P6.
2. Trước P7, sau khi được cho phép cụ thể, chỉ đọc schema/migration history Supabase để đối chiếu các bảng `payments`, `users`, kiểu ID, owner/schema, indexes, constraints và các tên SePay có thể đã tồn tại. Không chạy API/worker trong bước inventory.
3. Tạo migration production riêng, review được, chỉ tạo `sepay_payment_details`, `sepay_transactions`, `sepay_transaction_reviews` và index/constraints mới. Không sửa hoặc backfill bảng nghiệp vụ cũ. FK dự kiến tới `payments(id)` và `users(idUser)` phải xác nhận bằng schema snapshot trước khi đóng DDL.
4. Nếu thấy object trùng hoặc schema một phần, dừng triển khai và review drift; không dùng `IF NOT EXISTS` để che mismatch. Migration local hiện dùng `CREATE TABLE/INDEX` trực tiếp nên không an toàn khi apply trên schema chưa kiểm kê.
5. Thử migration production trên bản sao được cho phép với baseline tương thích; đo lock/time, kiểm tra fresh/upgrade, schema diff và dữ liệu cũ. Dùng `lock_timeout`/`statement_timeout` đã duyệt; hủy an toàn khi quá ngân sách.
6. Migration `down()` hiện chủ ý throw để tránh xóa dữ liệu thanh toán. Rollback mặc định là dừng tạo payment mới/rollback code tương thích nhưng giữ nguyên bảng và giao dịch SePay. Không drop bảng sau khi đã nhận giao dịch; cần restore hoặc migration forward phải có quyết định và đối soát riêng.

Migration additive giảm phạm vi thay đổi nhưng chưa đủ để cam kết không tác động: tạo FK có thể cần lock ngắn trên bảng cha; quyền, tên object, PostgreSQL version và schema Supabase chưa được xác minh. Cần backup có kiểm tra restore trước khi apply bất kỳ DDL nào. Kết luận hiện tại về Supabase là **chưa thể đánh giá tác động thực tế**; source chỉ cho thấy mục tiêu thiết kế không sửa/xóa dữ liệu bảng cũ, còn khả năng tương thích/lock/conflict phải xác minh trên schema đích sau phê duyệt.

### Khả thi khi đưa schema local lên Supabase

| Kiểm tra tương thích theo source | Đánh giá |
|---|---|
| Kiểu khóa tham chiếu | Repo schema khai báo `payments.id uuid` và `users.idUser uuid`, khớp kiểu FK trong migration local. Đây mới là đối chiếu source; phải xác minh live schema sau khi được phép. |
| Kiểu dữ liệu/DDL | DDL dùng UUID, `bigint`, `varchar`, `text`, `timestamptz`, CHECK/UNIQUE/FK và regex PostgreSQL. Thiết kế phù hợp với PostgreSQL local của dự án; chưa xác minh phiên bản/extension/role trên Supabase. |
| Tính additive | Migration chỉ tạo ba bảng mới và FK tới bảng hiện hữu; không thêm/sửa cột hoặc cập nhật hàng trong bảng cũ. Theo thiết kế, rủi ro ghi đè dữ liệu hiện hữu thấp; vẫn có rủi ro object trùng, quyền thiếu và lock FK. |
| Migration history/runner | Migration SePay chỉ đăng ký trong runner local; runner chung chưa đăng ký. Không bật trong runner triển khai cho đến khi có migration production mới, schema snapshot và review. |
| Idempotency/rollback | DDL local không idempotent khi object đã tồn tại; `down()` chủ ý không xóa. Cần collision preflight và rollback bằng giữ schema/rollback ứng dụng hoặc forward/restore có phê duyệt. |
| Kết luận khả thi | **Có khả năng triển khai sau khi xác minh**, vì kiểu dữ liệu trong source tương thích và thay đổi được thiết kế additive. Chưa thể kết luận “đạt tương thích Supabase” hay ảnh hưởng thực tế nếu chưa đọc schema/migration history/privileges và thử restore trên bản sao được cho phép. |

### Kiểm thử/đánh giá đã thực hiện trong P6

| Hạng mục | Kết quả | Ý nghĩa/giới hạn |
|---|---|---|
| `npm run build` | PASS | Biên dịch source; không kết nối DB. |
| `npm run check:boundaries` | PASS | Kiểm tra boundaries module; không xác minh Supabase schema. |
| Static API route inventory | PASS: 82 literal routes, 0 duplicate method + normalized path | So sánh route source; không thay runtime/proxy/integration test. |
| Kiểm tra tài liệu | PASS: UTF-8 không lỗi; plan không có trailing whitespace, report chỉ có hard-break Markdown ở đầu | Kiểm tra file docs. |
| Migration trên local/Supabase | NOT RUN | Không thực hiện lệnh DB trong P6. |
| Tác động thực tế lên dữ liệu Supabase | CHƯA THỂ ĐÁNH GIÁ | Chưa đọc schema; chưa có backup, bản sao, đo lock hay restore evidence. Không đồng nghĩa “không ảnh hưởng”. |

## Trình tự P7/cutover đề xuất

1. Đóng P4 QR scan và Dashboard retry/outage, hoặc có quyết định chấp nhận giới hạn có ghi nhận; review P6.
2. Nhận ủy quyền cụ thể cho truy cập Supabase. Xác minh đích an toàn, thực hiện inventory read-only, kiểm tra lịch sử migration và schema drift.
3. Backup/restore thử, thử migration trên bản sao, review quyền tối thiểu, lock budget, thời gian, giám sát, rollback và tiêu chí dừng.
4. Chỉ sau phê duyệt riêng mới apply migration additive và xác minh schema/dữ liệu hiện hữu. Triển khai code tương thích schema, smoke test và quan sát inbox/worker/reconcile/REVIEW.
5. Inventory payment attempt demo/VNPAY chưa kết thúc. Chỉ chuyển cấu hình tạo payment mới khi không còn attempt unresolved hoặc đã có đường callback cũ được duy trì.
6. Live cần backend/worker/DB production, MBBank Live, HMAC/token Live riêng, domain HTTPS production và vận hành giám sát. Ngrok/Test mode không thay thế các điều kiện này.
7. Nếu lỗi, dừng tạo payment mới SePay và giữ inbox/webhook để không mất giao dịch; đối soát trước khi hoàn nguyên routing. Không xóa lịch sử, không chặn callback cũ, không để hai nguồn cùng cấp vé một order.

## Tiêu chí hoàn tất P6

| Tiêu chí | Kết quả |
|---|---|
| Tổng hợp trạng thái P0–P5 và bằng chứng gần nhất | PASS — kèm giới hạn, tách Test/Sandbox khỏi Live |
| Xác định migration local và ranh giới chưa dùng runner chung | PASS — source review |
| Đề xuất migration production additive và điều kiện tương thích | PASS — đề xuất, chưa phải DDL được phép chạy |
| Rollback/backup/restore/lock risk và thứ tự cutover | PASS — runbook đề xuất |
| P4 vận hành đầy đủ | BLOCKED — còn QR scan và Dashboard retry/outage thật |
| Supabase compatibility/backup/migration | BLOCKED — cố ý chưa truy cập; chờ P7 approval riêng |
| Live readiness/cutover | BLOCKED — không phải mục tiêu được thực hiện ở P6 |

## An toàn dữ liệu và ảnh hưởng

- Không kết nối hoặc truy cập Supabase; không chạy migration/seed/test DB trong phiên này.
- Không sửa source, API, runtime hoặc dữ liệu local; chỉ cập nhật hai tài liệu P6.
- Không đổi API demo/VNPAY, không đổi cấu hình provider, không vô hiệu hóa API/callback cũ.
- Không ghi credential hoặc số tài khoản vào report.
- Đã chạy build, module boundary check và static route collision check như mục kiểm thử; không chạy test tích hợp/DB mới vì P6 không được truy cập database.

## Kết luận

P6 hoàn tất ở mức **hồ sơ review/đề xuất**: trạng thái P0–P5 được tổng hợp; migration additive, các rủi ro, thứ tự triển khai, backup và rollback được xác định. Điều này không phải phê duyệt triển khai. P4 còn QR scan và Dashboard retry/outage NOT RUN; schema/backup Supabase chưa kiểm tra. Vì vậy chưa đủ điều kiện tuyên bố toàn bộ chức năng nghiệm thu hoặc chuyển Live. P7 phải chờ người dùng cho phép cụ thể trước mọi kết nối/đọc/ghi/migrate Supabase.
