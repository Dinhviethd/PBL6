# A4 — Chuyển Organizer tới dashboard sau đăng nhập

- **Thời điểm:** 2026-10-31 23:27:46 UTC+7
- **Phạm vi:** điều hướng sau đăng nhập trong `AuthPage`; không chỉnh sửa thiết kế Stitch.
- **Loại phiên:** sửa frontend auth navigation theo role trong response login.

## Thay đổi

Sau `authService.login()`, nếu `result.data.user.roles` có `ORGANIZER` thì điều hướng thẳng tới `/organizer` với `replace: true`, ưu tiên hơn `location.state.from` và lựa chọn persona đang hiển thị trong form. Các tài khoản không có role ORGANIZER tiếp tục dùng safe redirect hiện có; lựa chọn persona organizer cho Admin-only tiếp tục tới dashboard, còn tài khoản không đủ role về trang chủ.

## Xác minh và giới hạn

- Đã kiểm tra `/organizer` là route có Guard cho `ORGANIZER` hoặc `ADMIN`, và Auth response cung cấp `user.roles`.
- Chưa chạy build hoặc browser test cho luồng đăng nhập sau thay đổi.
- Không sửa API/backend, database, route guard hoặc thiết kế Stitch.

## Master Plan

Đã cập nhật mục auth integration và tiến độ B2/A4 navigation trong Master Plan; ghi rõ source behavior và browser/build chưa xác minh. Không đổi trạng thái thiết kế Stitch của A4 hoặc trạng thái màn hình không liên quan.
