# A7 — Xác định môi trường Supabase cho kiểm thử thanh toán

- Thời điểm: 2026-10-30 22:01 (Asia/Ho_Chi_Minh)
- Mục tiêu: tiếp tục kiểm thử thật Checkout → PaymentStatus với tài khoản/event do người dùng chỉ định, sử dụng Supabase.

## Kiểm tra thực hiện

- Đọc Master Plan và cấu hình frontend/API trong repo. Không tìm thấy URL frontend/runtime của môi trường được yêu cầu; `client/.env.local` không khai báo `VITE_API_BASE_URL`.
- Local runtime vẫn là Docker API ở `localhost:8000`, cấu hình `paymentMode=disabled`, `sepayEnabled=true`; không có frontend đang phục vụ tại `localhost:5173`.
- Local API kết nối runtime dữ liệu hiện có nhưng không tìm thấy event ID được cung cấp: `GET /api/events` trả 13 mục khác; `GET /api/events/{id}` trả 404.
- Không gửi credential tới local, không tạo order và không phát sinh payment.

## Trạng thái

**Chưa thể chạy trên môi trường Supabase mà người dùng muốn vì chưa xác định được URL frontend/runtime/API tương ứng; event không có trong local dataset hiện được phục vụ bởi API.** Cần URL frontend đang chứa event này. Sau đó có thể đăng nhập, tạo order test, quan sát transition; nếu đến bước cần chuyển khoản Live sẽ dừng để người dùng tự hỗ trợ/xác nhận.

## Master Plan

A7 giữ trạng thái runtime end-to-end chưa xác minh, bổ sung blocker thiếu URL runtime đúng; report phiên trước về local event 404 vẫn còn hiệu lực cho môi trường local.
