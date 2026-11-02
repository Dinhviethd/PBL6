# Báo cáo chỉnh sửa header/sidebar C2

## 1. Thông tin màn hình

- Mã màn hình: C2
- Tên chính thức: Quản lý khách hàng
- Stitch project: `10374042969343935993` — EventHub
- Stitch screen: `c1ed0c8be6404a3aa9193a0e9365cc85`
- Thời điểm phiên: 2026-11-02 17:30:12 UTC+07
- Loại hành động: header_sidebar_correction

## 2. Yêu cầu liên quan

- Giữ phong cách header/sidebar quản trị theo thiết kế C2 trên Stitch.
- Sửa lỗi hiển thị mojibake như `ÄÃ³ng Ä‘iá»u hÆ°á»›ng quáº£n trá»‹`.
- Nối sidebar tới các route quản trị đang tồn tại.
- Avatar admin hiển thị ảnh thu nhỏ khi có `avatarUrl`, fallback về chữ cái đầu.
- Click avatar mở dropdown gồm `Hồ sơ cá nhân` và `Đăng xuất`.

## 3. Thao tác đã thực hiện

- Đối chiếu metadata, HTML và screenshot của screen C2 trên Stitch.
- Sửa các chuỗi accessibility/nhãn tiếng Việt trong `AdminShell`, `AdminSidebar` và `AdminHeader` về UTF-8 đúng.
- Giữ bố cục shell tối, sidebar cố định, header trong suốt có blur và token màu tím/cyan theo thiết kế.
- Sửa route sidebar:
  - Dashboard → `/admin/stats`
  - Khách hàng → `/admin/users`
  - Ban tổ chức/hồ sơ đăng ký → `/admin/applications`
  - Danh mục → `/admin/categories`
  - Sự kiện/hàng đợi duyệt → `/admin/events`
  - Giao dịch → `/admin/payments`
- Loại bỏ mục cấu hình hệ thống vì chưa có route/page admin tương ứng đã xác minh.
- Thêm dropdown tài khoản có đóng khi click ngoài hoặc nhấn Escape.
- Nối Hồ sơ cá nhân tới `/profile`; Đăng xuất gọi `authService.logout()` rồi chuyển tới `/auth/login`.

## 4. API và dữ liệu

- Không thêm API mới và không thay thế API bằng mock.
- `avatarUrl` dùng trực tiếp từ user session hiện có; fallback là initials.
- Endpoint logout được gọi qua `authService.logout()` → `POST /auth/logout`.
- Runtime/API authenticated và browser flow chưa được xác minh trong phiên này.

## 5. Kết quả kiểm tra

| Tiêu chí | Trạng thái | Bằng chứng |
|---|---|---|
| Đúng project/screen Stitch | PASS | EventHub `10374042969343935993`, C2 `c1ed0c8be6404a3aa9193a0e9365cc85` |
| Header/sidebar theo shell C2 | PASS | Giữ cấu trúc và token shell quản trị hiện có |
| Không còn mojibake trong shell đã chỉnh sửa | PASS | Nhãn tiếng Việt đã được sửa trực tiếp |
| Route sidebar tương ứng | PASS | Các đích trỏ tới route đã có trong `App.tsx` |
| Avatar ảnh/fallback | PASS | `avatarUrl` hoặc initials |
| Dropdown hồ sơ/đăng xuất | PASS | Có menu, keyboard/outside close và logout navigation |
| TypeScript/Vite build | PASS | `npm run build` |
| ESLint client | PASS | `npm --prefix client run lint` |
| Browser responsive/accessibility thực tế | NOT_VERIFIED | Chưa có browser page được chia sẻ |
| API runtime/logout thực tế | NOT_VERIFIED | Chưa chạy authenticated browser flow |

## 6. Tuân thủ Stitch và vấn đề còn tồn tại

- Không tạo màn hình Stitch mới và không thay đổi artifact Stitch ngoài phạm vi yêu cầu.
- Chỉ chỉnh sửa các component shell quản trị liên quan và tài liệu theo quy trình.
- Các thay đổi sẵn có khác trong worktree không thuộc phạm vi phiên này và không bị hoàn tác.
- Chưa xác minh trực quan runtime ở desktop/mobile, avatar URL thực tế và phản hồi lỗi logout trên môi trường chạy.

## 7. Kết luận

- Kết quả: `ĐẠT CÓ ĐIỀU KIỆN`.
- Header/sidebar và tương tác avatar đã được triển khai; build/lint đạt.
- Cần browser/authenticated verification để kết luận hoàn toàn về responsive, accessibility và logout runtime.
