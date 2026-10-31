# B2 — Dropdown tài khoản trên Organizer dashboard

- **Thời điểm:** 2026-10-31 23:24:27 UTC+7
- **Màn hình:** B2 — Quản lý sự kiện
- **Stitch:** project `10374042969343935993`, screen `b0bca491c8694c069de76d684bd55843`; không chỉnh sửa thiết kế.
- **Loại phiên:** thêm menu tài khoản cho `org-identity`.

## Thay đổi

- `org-identity` đổi thành nút có `aria-haspopup="menu"` và `aria-expanded`.
- Khi click mở dropdown gồm `Hồ sơ cá nhân` → `/profile` và `Đăng xuất`.
- Nút đăng xuất gọi `authService.logout()` đang có, dùng endpoint và cơ chế xóa phiên/thông báo tab khác hiện hành.
- Menu đóng khi chọn hồ sơ, click ngoài hoặc nhấn Escape; thêm style cho dropdown, hover và focus.
- Giữ avatar tài khoản `avatarUrl` cùng fallback chữ cái đầu đã triển khai ở phiên trước.

## Xác minh và giới hạn

- Đã đối chiếu `AuthHeader` và `authService.logout()` hiện có để dùng cùng hành vi logout.
- Không chạy build hoặc browser test trong phiên này; tương tác dropdown/logout chưa được xác minh trực tiếp.
- Không sửa API, backend, DB, route hoặc Stitch.

## Master Plan

Đã cập nhật ngày gần nhất, mục tích hợp B2, dòng B2 ở mục 5.2 và review B2 ở mục 5.4 với menu mới, các route/hành vi và giới hạn chưa kiểm tra. Không đổi trạng thái của màn hình khác.
