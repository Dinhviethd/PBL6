# Báo cáo preflight môi trường mô phỏng SePay: payment khớp và phát hành vé

Thời điểm: 29/10/2026, 16:45 UTC+7. Phạm vi: chuẩn bị và xác minh local/API/tunnel/order cho mô phỏng do người dùng thực hiện. **Không gửi giao dịch mô phỏng SePay**; không tác động Supabase. Tiêu chí mong muốn do người dùng xác nhận là payment khớp và phát hành vé.

## Kết quả chuẩn bị

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Runtime local | PASS: file `.local/sepay/runtime.json` có `environment=test`, `bankCode=MBBank`; `accountNumber`, `accountName`, `webhookSecret` đều không rỗng. Giá trị không được đọc ra log/report. | Trạng thái field-only check. |
| Database | PASS: `node scripts/sepay-local.cjs verify` xác nhận `127.0.0.1:55432`, DB `eventhub_sepay_local`, user `sepay_local`, container/volume riêng. | Local attestation. |
| API P3 | PASS: process PID 26892 chạy `node scripts/sepay-local-api.cjs`, bind `127.0.0.1:8010`; launcher gọi guard local và không tải dotenv. | Process inspection; GET local `/api/config` trả 200. |
| Worker P3 | PASS: process PID 5824 chạy `node scripts/sepay-local-worker.cjs`; launcher dùng cùng guard DB local, không dùng worker chung hoặc dotenv. | Process inspection/log khởi động. |
| Ngrok | PASS tại thời điểm kiểm tra: HTTPS domain `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` forward `http://localhost:8010`. | Ngrok local admin API. |
| Public HTTPS/API route | PASS: GET `/api/config` qua curl client trả HTTP 200. POST thăm dò tới webhook với chữ ký sai trả HTTP 401 (đúng kỳ vọng); kiểm tra này không ghi transaction. | HTTP status; `sepay_transactions=0`. |
| Pending order/payment | PASS: dùng buyer API trên API P3 local tạo 1 order với 1 vé và payment SePay `PENDING`, VND 150.000. `transferContent=tkhPN8V`; order `PENDING_PAYMENT`. | Response API đã kiểm tra; sau đó DB local có orders=1, payments=1, sepay_payment_details=1. |
| Vé | 0 trước mô phỏng — đúng kỳ vọng. | DB local `tickets=0`; chưa đánh dấu đơn PAID hoặc tạo vé thủ công. |
| Inbox/review | 0 giao dịch trước mô phỏng. | DB local `sepay_transactions=0`, `sepay_transaction_reviews=0`. |
| Supabase/legacy backend | Không truy cập, không gọi backend cũ. | Launcher local và DB identity xác minh. |

Local event mẫu: `Build Together · Tech Meetup`; buyer seed `customer@example.test`. Password/token không được ghi vào report. Payment dự kiến hết hạn **29/10/2026 16:59:40 UTC+7**; nếu mô phỏng sau thời điểm này, workflow có thể đưa giao dịch REVIEW và không phát vé. Hạn giữ tra soát tới 17:14:40 UTC+7 nhưng không kéo dài thời gian khách chuyển tiền.

## URL nhận webhook

`https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`

Endpoint hiện đã tới API listener. Route chỉ nhận `POST` JSON; HMAC-SHA256 phải ký đúng raw body và timestamp. Với mô phỏng user, dùng tài khoản MBBank Test đã cấu hình; nội dung chuyển khoản chính xác `tkhPN8V`, số tiền `150000` VND, loại tiền vào. Giao dịch SePay Test mode là mô phỏng, không phải chuyển khoản/tiền thật.

## Điều kiện đối chiếu còn cần user xác nhận

Runtime field presence, tunnel, listener và payment fixture đã kiểm chứng. Tuy nhiên không đăng nhập Dashboard/đọc secret nên không thể tự chứng minh các giá trị khớp chéo. Trước khi bấm mô phỏng, người dùng xác nhận không chia sẻ giá trị:

1. `webhookSecret` local là **đúng Secret Key HMAC-SHA256 của webhook Test hiện đang bật** (nếu đã sửa secret ở Dashboard thì file local đã cập nhật cùng giá trị).
2. Webhook Test chọn đúng **chính tài khoản MBBank Test** có account number đã nhập ở runtime, không chỉ cùng tên ngân hàng nếu đang có nhiều tài khoản.
3. Bộ lọc webhook không loại nội dung `tkhPN8V`; nếu bật “chỉ gửi khi có mã”, prefix `tkh` đã được nhận diện trong Cấu trúc mã thanh toán.

Khi nhận các xác nhận trên, có thể cho phép người dùng chạy đúng một mô phỏng trước `16:59:40 UTC+7`. Assistant không gửi mô phỏng thay người dùng. Nếu hết hạn, cần hủy/đóng attempt an toàn rồi tạo pending payment mới bằng buyer API; không sửa hạn trực tiếp và không tạo vé thủ công.

## Tiêu chí đánh giá sau mô phỏng

- SePay log delivery thành công, backend trả 200 `{"success":true}`.
- Local `sepay_transactions` có đúng một giao dịch `PROCESSED`, cùng `payment_id` của fixture.
- Payment `SUCCEEDED`, order `PAID`, đúng một ticket `VALID` được phát hành, inventory được cập nhật và notification/audit tạo đúng một lần.
- Retry cùng webhook không tăng số vé/notification; không có giao dịch REVIEW/ERROR trùng.
- Nếu bất kỳ điều kiện matching nào không khớp, kết quả phải REVIEW và không có ticket; ghi nhận FAIL/BLOCKED theo bằng chứng, không tự xác nhận thanh toán.

## Lệnh/kiểm tra đã thực hiện

- `node scripts/sepay-local.cjs verify`: PASS.
- `node scripts/sepay-local.cjs check`: PASS constraints; trước khi tạo fixture ghi nhận DB rỗng về order/payment; sau tạo fixture counts: orders=1, payments=1, tickets=0, sepay transaction=0.
- `npm run build`: PASS; `npm run check:boundaries`: PASS (lần preflight gần nhất).
- GET `/api/config` local: 200; GET qua ngrok bằng curl: 200.
- POST webhook public với chữ ký invalid: 401; không ghi giao dịch.
- Process inspection: đúng launcher API và worker SePay local.

Kết luận: **hạ tầng runtime đã sẵn sàng và có pending payment phù hợp; chưa mở mô phỏng cho tới khi user xác nhận ba điều kiện đối chiếu Secret Key/account/filter ở trên. Chưa bắt đầu/hoàn tất P4 và chưa nghiệm thu SePay.**