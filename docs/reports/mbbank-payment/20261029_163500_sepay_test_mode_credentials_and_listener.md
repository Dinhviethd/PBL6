# Báo cáo hướng dẫn credential Test mode và kiểm tra listener

Thời điểm: 29/10/2026, 16:35 UTC+7. Mục tiêu mô phỏng do người dùng xác nhận: giao dịch khớp với payment local và phát hành vé. Không truy cập Dashboard thay người dùng, không gửi webhook, không kết nối Supabase.

## Vị trí lấy thông tin trong SePay

1. `accountNumber`, `accountName`: vào **Test mode → Tài khoản ngân hàng**, mở tài khoản ngân hàng MBBank đang chọn để mô phỏng. Sao chép số tài khoản và tên chủ tài khoản hiển thị của chính tài khoản Test này vào file local. Theo tài liệu SePay, tài khoản Test tạo mới được cấp số tài khoản 10 chữ số và tên chủ; nếu tạo kiểu sao chép từ Live, thông tin được sao chép từ tài khoản gốc. Không dùng thông tin Live cho cấu hình Test nếu mục tiêu là sandbox.
2. `webhookSecret`: vào **Test mode → Tích hợp Webhook → Thêm webhook** (hoặc sửa webhook Test), tới bước **Bảo mật**, chọn **HMAC-SHA256**, nhập hoặc tạo **Secret Key**, lưu lại. Đây là HMAC secret của webhook, không phải API Access Sandbox token. SePay chỉ hiện đầy đủ Secret Key lúc tạo/lưu; lần mở sau chỉ còn 4 ký tự cuối. Nếu không lưu bản gốc, tạo/đổi Secret Key trên webhook Test rồi cập nhật cùng giá trị vào file local. Không chia sẻ secret qua chat/email.
3. Tại webhook đó, cấu hình URL, JSON, loại giao dịch tiền vào, tài khoản MBBank Test được chọn và bộ lọc mã phù hợp. Có thể bật “Dùng để xác thực thanh toán” và chọn tiền tố `tkh` nếu giao dịch mô phỏng phải được nhận diện; cần giữ bộ lọc tương thích với cấu hình mã ở SePay và nội dung payment pending.

Nguồn chính thức: [Tạo webhook trong Test mode](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/tao-webhook), [tài khoản ngân hàng Test mode](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/tai-khoan-ngan-hang), [xác thực HMAC webhook](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc), [mô phỏng giao dịch](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/mo-phong-giao-dich).

## Trạng thái đã kiểm tra trong workspace

| Hạng mục | Quan sát |
|---|---|
| `.local/sepay/runtime.json` | Có file; `environment=test`, `bankCode=MBBank`; ba trường accountNumber/accountName/webhookSecret hiện chưa có giá trị. Nội dung nhạy cảm không được in ra. |
| Listener `127.0.0.1:8010` | Không có process LISTENING tại thời điểm kiểm tra. |
| Ngrok | HTTPS `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` đang forward `http://localhost:8010`. |
| DB local | `node scripts/sepay-local.cjs verify` PASS: `127.0.0.1:55432`, `eventhub_sepay_local`, user `sepay_local`, container/volume cô lập. |
| Dữ liệu local | users=4, events=3, orders=0, payments=0, tickets=0, sepay transactions=0. Constraints check PASS. |
| Supabase | Không truy cập. |

## 8010 listener có ảnh hưởng không?

Có, là điều kiện chặn trực tiếp. Ngrok đã forward vào cổng 8010, nhưng nếu không có API process lắng nghe thì kết nối công khai không tới route webhook. SePay sẽ nhận lỗi kết nối/HTTP ngoài 2xx, không có inbox được ghi bền vững và worker không thể xử lý payment/phát vé. Ngrok hiển thị tunnel đang forward chỉ chứng minh đường hầm được cấu hình, không chứng minh backend tại đích hoạt động.

Cần chạy đúng launcher `node scripts/sepay-local-api.cjs` sau khi runtime hợp lệ; launcher đó dùng `verifiedConfig()` xác nhận DB local riêng và không nạp dotenv. Worker phải chạy riêng bằng `node scripts/sepay-local-worker.cjs`. Backend thường hoặc process tùy ý trên 8010 không được xem là an toàn nếu chưa chứng minh process/database; không gọi endpoint backend cũ.

## Điều kiện để mô phỏng và phát vé

- Người dùng điền ba trường trong `.local/sepay/runtime.json` bằng dữ liệu Test mode đúng; không gửi giá trị vào chat.
- Khởi chạy API P3 và worker; xác minh listener 8010, kiểm tra endpoint qua ngrok bằng cách không tạo giao dịch nghiệp vụ (readiness check an toàn sẽ được thực hiện trước test).
- Tạo order và payment SePay `PENDING` trong DB local bằng buyer API; lưu mã chuyển khoản và số tiền do server trả.
- Trong SePay Test mode mô phỏng tiền vào MBBank Test đúng tài khoản, đúng số tiền, nội dung chứa chính xác mã `tkh` của pending payment. Tài liệu SePay mô tả giao dịch mô phỏng tạo bản ghi giả và đẩy webhook bất đồng bộ; chỉ chọn mô phỏng sau khi có payment tương ứng để worker đối chiếu.
- Tiêu chí thành công: SePay delivery nhận 2xx/`success:true`; inbox được ghi; worker xử lý transaction `PROCESSED`; payment thành công/order PAID và ticket được phát đúng một lần. Nếu payload mismatch thì phải REVIEW, không phát vé.

## Câu hỏi cần người dùng xác nhận

Không yêu cầu gửi giá trị credential. Sau khi cập nhật local file, chỉ xác nhận:

1. Ba trường đã được điền từ tài khoản MBBank Test và Secret Key HMAC-SHA256 của đúng webhook Test chưa?
2. Webhook Test đã chọn JSON, tiền vào, tài khoản MBBank Test, và HMAC-SHA256 chưa?
3. Có thể tạm dùng ngrok domain hiện tại cho endpoint SePay P3 ở cổng 8010 trong lúc test không? Khi service đã chạy, domain này sẽ gửi webhook tới API local P3.

P4 chưa bắt đầu; người dùng vẫn tự chạy mô phỏng và phải xác nhận thành công trước khi tiếp tục P4 theo yêu cầu.