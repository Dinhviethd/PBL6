# Gmail SMTP và VNPay Sandbox

Đây là cấu hình phát triển cho EventHub: email OTP thật, thanh toán thử trên web và mobile. Không hỗ trợ thu tiền thật hoặc hoàn tiền. Không đưa App Password, HashSecret hay ngrok authtoken vào Git/chat.

## 1. Gmail

1. Đăng nhập Gmail riêng cho project, bật xác minh hai bước tại https://myaccount.google.com/security.
2. Tạo App Password tại https://myaccount.google.com/apppasswords, đặt tên EventHub. Nếu không có mục này, kiểm tra chính sách tài khoản trường/công ty hoặc Advanced Protection: https://support.google.com/accounts/answer/185833.
3. Điền trực tiếp vào `server/.env` (bỏ khoảng trắng trình bày trong App Password):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-project@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="EventHub <your-project@gmail.com>"
```

STARTTLS bắt buộc; không dùng mật khẩu đăng nhập Gmail thông thường. `SMTP_FROM` phải trùng tài khoản gửi. App Password bị thu hồi khi đổi mật khẩu Google.

```powershell
npm run smtp:check --prefix server -- --config-only
npm run smtp:check --prefix server
```

Lệnh đầu chỉ kiểm tra cấu hình; lệnh sau kiểm tra kết nối và xác thực, **không gửi thư**. Để nghiệm thu: đăng ký một user bằng hộp thư bạn kiểm soát, dùng Quên mật khẩu, kiểm tra Inbox/Spam, nhập OTP và đặt mật khẩu mới. Kiểm tra mã chỉ dùng một lần và hết hạn sau 5 phút. Không ghi OTP vào log. Gmail thành công ở bước verify chưa chứng minh email đã đến Inbox.

## 2. Backend HTTPS bằng ngrok

Cài ngrok theo https://ngrok.com/docs/getting-started/ và đăng nhập tài khoản. Thêm authtoken theo dashboard ở terminal riêng; không đưa token vào lệnh được chia sẻ.

```powershell
ngrok http 8000
```

Lấy HTTPS origin được cấp, ví dụ `https://your-name.ngrok-free.app` (không thêm `/api`), và điền:

```dotenv
PUBLIC_API_URL=https://your-name.ngrok-free.app
CLIENT_URL=http://localhost:5173
```

Giữ terminal tunnel chạy. Backend tin proxy loopback để nhận IP khách qua ngrok; không mở trực tiếp cổng 8000 ra Internet. Web local tiếp tục dùng proxy `/api` của Vite, tránh đổi cơ chế cookie đăng nhập. Nếu đổi domain tunnel: sửa `PUBLIC_API_URL`, cấu hình IPN trên VNPay và `EXPO_PUBLIC_API_URL`, restart API/worker/mobile; dùng đơn mới vì URL checkout cũ chứa return URL cũ.

## 3. Merchant VNPay Sandbox

1. Đăng ký tại https://sandbox.vnpayment.vn/devreg, dùng email nhận thông tin merchant và HTTPS website/tunnel vừa chuẩn bị.
2. Lấy TmnCode và HashSecret từ thông tin VNPay cung cấp; điền `.env`:

```dotenv
PAYMENT_MODE=vnpay_sandbox
VNPAY_TMN_CODE=your-eight-character-code
VNPAY_HASH_SECRET=your-sandbox-secret
VNPAY_QUERY_IP=127.0.0.1
```

`VNPAY_QUERY_IP` dùng cho truy vấn server-to-server; cập nhật thành IP outbound công khai nếu merchant sandbox yêu cầu. Cổng thanh toán và querydr được cố định ở sandbox trong code. Chế độ thử bị chặn khi `NODE_ENV=production`. Khi chưa có khóa, để `PAYMENT_MODE=disabled` để API vẫn chạy.

3. Đăng ký IPN với VNPay theo hướng dẫn merchant:

```text
IPN:    https://your-name.ngrok-free.app/api/payments/vnpay/ipn
Return: https://your-name.ngrok-free.app/api/payments/vnpay/return
```

Return URL được backend tự đưa vào mỗi URL thanh toán. Truy cập lại return không tạo vé; IPN/querydr đã xác thực mới cập nhật đơn. Return không cần đăng nhập và không hiển thị dữ liệu cá nhân. Đường dẫn chi tiết đơn yêu cầu đúng tài khoản chủ đơn.

## 4. Chạy local

Từ thư mục gốc, sau khi cấu hình kết nối Supabase, chứng chỉ CA và các secret nền tảng trong `server/.env` theo README. Không cần khởi động PostgreSQL local:

```powershell
npm run db:migrate --prefix server
npm run dev
```

`npm run dev` chạy API 8000, web 5173 và worker. Sau khi sửa backend phải build lại rồi restart. Nếu chạy tách worker: `npm run jobs:watch --prefix server`. Worker cần cùng cấu hình VNPay với API.

Mobile: đặt `EXPO_PUBLIC_API_URL=https://your-name.ngrok-free.app/api` trong `mobile/.env`, restart Expo và mở trên điện thoại. Kiểm tra endpoint `/api/config` trả `vnpay_sandbox`. Nếu ngrok có trang cảnh báo trình duyệt, xử lý theo dashboard/ngrok docs và xác minh IPN/API trả JSON, không phải trang HTML trung gian.

Mobile mở trình duyệt hệ thống, tương thích Expo Go; sau thanh toán quay lại app để tải trạng thái. Web có link từ trang return về đơn hàng. Hai giao diện tự kiểm tra mỗi 3 giây trong 60 giây khi chờ; sau đó dùng Cập nhật trạng thái.

## 5. Nghiệm thu và xử lý lỗi

- Dùng bộ thẻ test chính thức: https://sandbox.vnpayment.vn/apis/vnpay-demo/. Không nhập thẻ thật. Thử thành công, hủy, thất bại; cả web và điện thoại phải mở được checkout.
- Thanh toán thành công phát hành đúng một bộ vé và một thông báo; tải lại return/IPN lặp không phát hành thêm.
- Đóng trình duyệt sau khi thanh toán: IPN hoặc worker vẫn cập nhật đơn. Querydr chạy tối đa mỗi phút khi đang giữ chỗ; lỗi mạng/không tìm thấy giao dịch không được coi là thất bại.
- Hạn thanh toán theo đơn; giữ chỗ thêm 5 phút để đối soát. Sau đó nhả chỗ, đánh dấu cần kiểm tra nếu chưa có kết quả. Tiếp tục query mỗi 15 phút tối đa 24 giờ sau hạn đối soát; IPN muộn vẫn được tiếp nhận. Thành công muộn được ghi nhận nhưng không lấy lại tồn kho hay tự phát hành vé.
- SMTP `EAUTH`: kiểm tra App Password, 2FA và tài khoản gửi. `ETIMEDOUT`/`ECONNECTION`: kiểm tra mạng và cổng 587. Không tắt TLS để bỏ qua lỗi.
- IPN `97`: chữ ký/merchant; `04`: số tiền; `01`: mã tham chiếu; `99`: lỗi xử lý/chưa bật VNPay. `00` đã xử lý; `02` đã xác nhận trước đó. Kiểm tra trạng thái trong admin và nhật ký bằng payment ID, không ghi URL có chữ ký hoặc secret.
- Khi mạng VNPay lỗi kéo dài, giao dịch được giữ ở trạng thái chưa rõ kết quả, sau hạn giữ chỗ chuyển cần kiểm tra. Hoàn tiền cần xử lý ngoài phạm vi tích hợp này.

Kiểm thử tự động dùng chữ ký và phản hồi VNPay giả lập cùng PostgreSQL test; không thay cho kiểm thử tài khoản merchant thật. Chỉ xác nhận tích hợp thực tế hoàn tất sau khi nhận OTP, nhận IPN qua tunnel và kiểm tra QR trên thiết bị.

Tài liệu giao thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html và https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html.
