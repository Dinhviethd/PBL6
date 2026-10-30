# A7 — Xác minh event mục tiêu trên runtime và Supabase

- Thời điểm: 2026-10-30 22:03 (Asia/Ho_Chi_Minh)
- Runtime được cung cấp: `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev`.
- Mục tiêu: kiểm tra khả năng đặt vé/test chuyển trang cho event ID `2366bb09-24e5-4118-940f-12353f4071ad`.

## Bằng chứng chỉ đọc

- Runtime root trả HTTP 200 và phục vụ SPA EventHub.
- `GET /api/health`: HTTP 200, `status=ok`.
- `GET /api/config`: HTTP 200, `paymentMode=disabled`, `sepayEnabled=true`.
- `GET /api/events`: HTTP 200, có 13 event; không có ID mục tiêu.
- `GET /api/events?q=<event-id>` trả 0 kết quả.
- `GET /api/events/<event-id>` trả HTTP 404 `NOT_FOUND` (message: sự kiện chưa được công khai).
- Kết nối trực tiếp bằng cấu hình Supabase hiện có trong `server/.env`, TLS CA được xác minh; transaction `READ ONLY`. Query chính xác `public.events.id` trả không có row; query `public.ticket_types.event_id` cũng trả 0 row. Transaction rollback, không đọc dữ liệu cá nhân và không ghi DB.
- Danh sách API của runtime ngrok và API local trước đó khớp 13 event ID/title, cho thấy đang nhắm cùng dữ liệu ứng dụng trong phiên này.

## Kết luận

**Không thể kiểm thử đặt vé/chuyển Checkout → A7 cho event ID được yêu cầu trên Supabase đang cấu hình. Event không tồn tại trong bảng `public.events` của DB hiện tại và cũng không được API runtime công khai.** Không đăng nhập, tạo order, giữ chỗ hoặc khởi tạo thanh toán. Cấu hình runtime là SePay-enabled và `paymentMode=disabled`; không phát sinh giao dịch.

Để tiếp tục, cần event được tạo/khôi phục vào đúng Supabase đang dùng hoặc xác nhận UUID của event thuộc database này. Sau khi event hiện diện, có thể thực hiện test order; nếu đến bước chuyển khoản Live, dừng để người dùng hỗ trợ.

## Master Plan

Đã cập nhật A7: test user/order bị chặn bởi event ID không có trong Supabase (`events` và `ticket_types` đều không có bản ghi liên quan). Report trước về API-mock tests vẫn là bằng chứng riêng cho nhánh frontend `PAID`, không thay thế kiểm thử runtime.
