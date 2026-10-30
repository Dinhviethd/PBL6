# L4 — Bàn giao cấu hình Live

Ngày: 30/10/2026, UTC+7. Tiếp nối báo cáo `20261030_003444_l4_supabase_apply.md`.

Người dùng xác nhận credential Live chưa lưu trên máy; yêu cầu tạo file và cung cấp URL webhook chính xác. Người dùng cũng cho phép seed thêm dữ liệu phục vụ kiểm thử thực tế và xóa sau khi kiểm thử thành công. Quyết định này mở rộng phạm vi kiểm thử L4 trước đó; chưa seed trong phiên bàn giao này. Khi thực hiện phải ghi nhận ID dữ liệu tạo riêng, chỉ dọn dữ liệu thuộc lần kiểm thử; không xóa lịch sử giao dịch ngân hàng thật hoặc dữ liệu có trước.

Đã chuẩn bị `server/.local/sepay-live.env`, được Git ignore. Bốn trường cần người dùng điền: `SEPAY_ACCOUNT_NUMBER` (dòng 11), `SEPAY_ACCOUNT_NAME` (13), `SEPAY_WEBHOOK_SECRET` (15), `SEPAY_API_V2_TOKEN` (17). Điền giữa dấu ngoặc kép. Không sửa template tracked. DATABASE_URL/CLIENT_URL lấy từ cấu hình hiện có khi có giá trị; DB target tính từ URL. JWT/QR secret dùng giá trị hiện có nếu đủ 32 ký tự, nếu thiếu hoặc ngắn thì tạo ngẫu nhiên trong file riêng. Không in giá trị vào log. `SEPAY_ENABLED=false` được giữ nguyên.

Đã kiểm tra agent ngrok hiện tại: `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` → `http://localhost:8010`. Source đăng ký `POST /api/payments/sepay/webhook`. URL để nhập:

`https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`

URL này ghép từ tunnel hiện tại và route thực tế, **chưa phải xác nhận nhận webhook Live thành công**. Cấu hình Live dùng cổng 8011; cần khởi động và validate runtime, chuyển tunnel đến 8011 trước khi bật webhook Live. Chưa đổi tunnel, bật worker/API hoặc gửi giao dịch. Ngrok đổi hostname thì URL trên phải cập nhật theo hostname mới.

Phần database L4 đã PASS theo báo cáo trước; phần runtime và kiểm thử Live còn chờ người dùng điền bốn trường. Không yêu cầu gửi credential qua hội thoại.
