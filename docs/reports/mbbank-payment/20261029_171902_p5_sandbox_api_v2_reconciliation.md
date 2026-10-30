# Báo cáo P5 — đối soát SePay API v2 Sandbox (backend)

**Thời điểm:** 29/10/2026, 17:27 UTC+7  
**Trạng thái:** Code/backend, local suite và kết nối API v2 Sandbox thật đã đạt; P5 chưa nghiệm thu API-only recovery.  
**Phạm vi đã xác nhận:** Chỉ API/backend; chưa làm UI checkout/admin.  
**Database:** Test suite dùng PostgreSQL local cô lập, container `eventhub-sepay-local`, ánh xạ `127.0.0.1:55432`; database dùng cho lượt suite cuối là `eventhub_sepay_3fa57e500fde_test`. Reconcile thật ghi/đọc ở DB local `eventhub_sepay_local`. Không kết nối hoặc truy cập Supabase.

## 1. Mục tiêu

Bổ sung tra cứu đối soát dùng SePay API v2 Sandbox để phục hồi giao dịch webhook thất lạc; giữ định danh UUID API độc lập với ID số webhook, tránh nhập hai lần một giao dịch và chỉ đưa các giao dịch đủ điều kiện vào worker hiện có. Không đổi luồng API thanh toán demo/VNPAY hoặc webhook đã nghiệm thu ở P3/P4.

## 2. Contract API và hành vi

Đã thêm endpoint ADMIN:

```http
POST /api/admin/sepay/reconcile
Authorization: Bearer <phiên đăng nhập admin EventHub>
Content-Type: application/json

{"lookbackMinutes": 60}
```

- `lookbackMinutes` tùy chọn, mặc định 60, giới hạn 5–1440. Body rỗng hợp lệ.
- Token SePay không nằm trong request; backend đọc `apiV2SandboxToken` từ runtime local. Thiếu token trả 503, tài khoản thiếu quyền trả 401/403, input sai trả 400, lượt đối soát đang chạy trả 409.
- Backend gọi `GET https://userapi-sandbox.sepay.vn/v2/transactions` với bearer token; trang tối đa 100 dòng, tối đa 10 trang mỗi lượt, khoảng ngày Việt Nam và chỉ lọc giao dịch vào. Có timeout 10 giây, tối thiểu 400 ms giữa request trang và khóa lượt chạy đồng thời trong cùng process. Không hỗ trợ Live URL trong code P5.
- Output gồm `scanned`, `imported`, `reviewed`, `matchedWebhook`, `duplicates`, `ignored`, `windowMinutes`. Token, response body upstream và số dư không được đưa vào response hoặc log.
- Với giao dịch khớp chính xác với webhook đã lưu (tài khoản, ngân hàng, chiều, amount, nội dung, transaction time, bank reference), API UUID được gắn vào cùng row. Webhook đến sau cũng ghép vào row API đã nhập nếu tuple khớp duy nhất. UUID API và ID webhook không bao giờ được so sánh trực tiếp.
- Giao dịch tiền vào có mã thanh toán duy nhất được lưu `RECEIVED` để worker hiện có kiểm tra order, số tiền, thời hạn và inventory. Thiếu/mơ hồ mã, nhiều webhook tuple trùng hoặc mã trùng được lưu `REVIEW`, không đi vào worker cấp vé. Giao dịch khác tài khoản hoặc không phải tiền vào bị bỏ qua.
- Không thêm migration: schema local P1 đã có `api_transaction_id uuid` nullable, unique theo môi trường/tài khoản tích hợp.

Tài liệu nguồn chính thức: [SePay API v2 overview và Sandbox base URL](https://developer.sepay.vn/vi/sepay-api/v2/gioi-thieu), [API danh sách giao dịch, UUID và pagination](https://developer.sepay.vn/vi/sepay-api/v2/giao-dich/danh-sach), [API chi tiết giao dịch](https://developer.sepay.vn/vi/sepay-api/v2/giao-dich/chi-tiet), [tạo API token](https://developer.sepay.vn/vi/sepay-api/v2/tao-api-token), [xác thực và rate limiting](https://developer.sepay.vn/vi/sepay-api/v2/xac-thuc).

## 3. Thay đổi trong repository

- `server/src/modules/payment/sepay-api-v2.ts`: Sandbox HTTP client, xác thực envelope/UUID và trường giao dịch, phân trang/lookback, lọc, điều phối ghép/nhập/review.
- `server/src/modules/payment/infrastructure/sepay-v2-store.ts`: persistence dùng payment owner; ghép API UUID/webhook ID theo tuple chính xác và ghi transaction vào inbox/review.
- `server/src/workflows/sepay-webhook.ts`: worker dùng API UUID làm provider transaction ID khi API v2 phục hồi trước webhook.
- `server/src/app.ts`: route ADMIN mới, fail closed nếu chưa có token.
- `server/src/modules/payment/public.ts`: export service v2.
- `server/scripts/sepay-local-runtime.cjs`, `server/scripts/sepay-local-api.cjs`: template runtime và truyền token riêng trong process server-side, không đọc `.env`.
- `.local/sepay/runtime.json`: thêm field `apiV2SandboxToken` rỗng trong template, sau đó người dùng tự điền; file được Git ignore. Chỉ xác minh trạng thái có token, không đọc/in giá trị vào log/report.
- `server/test/sepay-v2.test.cjs`, `server/test/sepay.integration.test.cjs`, `server/scripts/sepay-local-test.cjs`: test client/reconcile, quyền endpoint và liên kết UUID/webhook.
- `docs/MBBank_Payment.md`: cập nhật contract, trạng thái P5, tiến độ và link báo cáo.

## 4. Kết quả kiểm thử

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Build TypeScript | PASS | `npm run build`, exit 0. |
| Module boundaries | PASS | `npm run check:boundaries`, `Module boundary checks passed.` |
| Local disposable suite | PASS 56/56 | `node scripts/sepay-local-test.cjs`; guard xác nhận DB local port 55432 và tạo DB test disposable. Không chạy test trên Supabase hoặc DB ứng dụng dùng chung. |
| API v2 mock | PASS | Bearer/Sandbox URL, envelope, lỗi 401 không rò upstream body, phân trang, import ID UUID, bỏ qua tài khoản sai, lưu thiếu code thành REVIEW, lookback giới hạn. |
| API admin | PASS | Local integration xác nhận không token trả 503, user không phải ADMIN 403, chưa đăng nhập 401, lookback ngoài giới hạn 400. |
| API UUID ↔ webhook | PASS | Integration tạo bản ghi API UUID, gửi webhook có ID số với tuple chính xác, worker xử lý cùng row và phát đúng một vé. |
| Hồi quy SePay/demo/VNPAY | PASS | Bao gồm toàn bộ integration P3 và suite demo/VNPAY trong 56/56. |
| Supabase isolation | PASS theo phạm vi chạy | Runner xác thực dedicated container/volume/port local; không chạy app/worker hoặc migration trỏ Supabase. |
| Gọi SePay Sandbox thật bằng API v2 | PASS HTTP 200 | Người dùng xác nhận token đã điền; runtime nạp token server-side nhưng không in ra. Local admin reconcile quét 3 giao dịch: 0 nhập mới, 2 REVIEW (mã thiếu/mơ hồ), 1 UUID duplicate đã có trong DB và gắn với giao dịch webhook. |
| Idempotency upstream/runtime | PASS | Reconcile lần hai quét 3, trả 3 duplicate, không thêm bản ghi/ticket. |
| API UUID thực, worker và DB runtime | PARTIAL | DB local xác nhận 1 transaction PROCESSED có cả API UUID và webhook ID; payment SUCCEEDED, order PAID, 1 vé. Đây là giao dịch webhook đã xử lý trước, không chứng minh phục hồi API-only. Hai giao dịch API còn lại vào REVIEW, không tạo payment/ticket. |
| API-only recovery thực | BLOCKED | Sandbox hiện không cung cấp trong cửa sổ vừa truy vấn giao dịch có mã duy nhất khớp payment pending và không có webhook. Cần một ca mô phỏng như vậy để nghiệm thu tự phục hồi. |
| UI P5 checkout/admin | NOT IN SCOPE | Người dùng xác nhận P5 chỉ gồm API/backend. |

Trong lượt đầu, suite phát hiện 9 regression test do SQL guard không hỗ trợ `IS NOT DISTINCT FROM`. Câu SQL được viết lại theo cú pháp guard hiểu; boundary check và suite cuối 56/56 đều đạt. Lượt gọi Sandbox thật đầu tiên xác thực admin và đọc được API, nhưng ghi row kế tiếp gặp PostgreSQL `42P08` do tham số kiểu chưa rõ; câu lệnh được ép kiểu rõ ràng, build/boundaries/suite chạy lại PASS, API được khởi động lại và lượt gọi kế tiếp cùng lượt lặp đều HTTP 200. Lượt reconcile ghi nhận từng transaction riêng, vì vậy lỗi giữa lượt có thể để lại row đã xử lý trước đó; lượt retry phát hiện UUID trùng và không nhập lại. Log test cũng có lỗi/deny được tạo chủ ý (inbox DB failure và refresh Origin không hợp lệ); assertion tương ứng PASS.

## 5. Giới hạn và điểm cần xác minh

1. Token đã được người dùng điền vào runtime local; API và worker guarded local đã được khởi động lại, API health HTTP 200. Không ghi token vào report.
2. Reconcile thật đã được gọi bằng phiên ADMIN với lookback 60 phút. Lần đầu trả 500 do SQL 42P08; sau khi sửa code, build/boundaries/suite 56/56 PASS và gọi lại trả HTTP 200. Lần lặp trả 3 duplicate.
3. DB local đã kiểm tra read-only sau reconcile: một row PROCESSED ghép API UUID với webhook ID và tương ứng payment SUCCEEDED/order PAID/1 ticket; hai row REVIEW do thiếu/mơ hồ mã, không gắn payment/ticket. Không có API-only payment nào được tự động phát hành trong lượt thử thật.
4. API truy vấn các ngày bao trùm lookback, giới hạn an toàn 10 trang × 100 dòng; nếu hơn 1.000 dòng thì trả lỗi yêu cầu thu hẹp lookback. Pagination `since_id` chưa dùng.
5. Chưa có poll nền tự động; route ADMIN là thao tác reconcile. Webhook vẫn là tín hiệu realtime.
6. Cần thêm một giao dịch Test mode có account, amount, code chính xác khớp payment pending nhưng không gửi webhook, để kiểm chứng API-only recovery và phát đúng một vé. Chưa có migration Supabase, chưa truy cập Supabase, chưa cấu hình Live hoặc vô hiệu hóa API cũ.

## 6. Câu hỏi xác minh để tiếp tục

- Bạn có thể tạo một giao dịch mô phỏng Test mode có nội dung khớp payment pending, trong lúc SePay không gửi webhook cho giao dịch đó, để chứng minh API v2 phục hồi và worker cấp vé? Chỉ cần xác nhận có thể/không thể; không cần gửi payload hay credential.
- Nếu không thể tắt webhook riêng cho một giao dịch, bạn muốn tôi chuẩn bị một cửa sổ test có kiểm soát bằng cách tạm ngắt listener/ngrok trong lúc mô phỏng rồi bật lại sau đó không? Việc đó chỉ ảnh hưởng môi trường Test mode và local listener, không dùng tiền thật.

**Kết luận:** API v2 Sandbox thật đã được gọi thành công, database local đã đối chiếu và lượt lặp idempotent. Backend P5 sẵn sàng; nghiệm thu recovery API-only còn phụ thuộc giao dịch Test mode có mã khớp nhưng webhook thất lạc. Chưa chuyển sang P6.
