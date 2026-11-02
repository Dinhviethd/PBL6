# C2 — Tách sidebar/header quản trị thành component dùng lại

- Thời gian: 2026-11-02 11:00:22 UTC+07, Asia/Ho_Chi_Minh. Màn hình: C2 — Quản lý khách hàng. Hành động: refactor frontend shell theo yêu cầu.
- Master Plan yêu cầu C2 tại `/admin/users`, giữ nội dung khách hàng USER-only, không đưa ADMIN/ORGANIZER vào danh sách. Mục tiêu phiên: tách phần sidebar/header khỏi page để dùng lại và giữ hình thức C2 theo Stitch.
- Stitch project `10374042969343935993`, screen `c1ed0c8be6404a3aa9193a0e9365cc85`. Không sửa artifact Stitch; không thay đổi backend/API.

## Thay đổi

- Tạo `AdminSidebar.tsx`: menu quản trị chia theo nhóm, dùng NavLink tới các tab admin hiện có, active state và callback đóng menu mobile.
- Tạo `AdminHeader.tsx`: breadcrumb/title, trạng thái, notification và danh tính người dùng, có callback mở menu mobile.
- Tạo `AdminShell.tsx`: ghép sidebar/header, quản lý trạng thái menu mobile/scrim và vùng nội dung.
- Chuyển `C2ManagerAccount.tsx` sang dùng `AdminShell`. Các trang Admin khác chưa chuyển shell, tránh đổi ngoài phạm vi C2. App bỏ header/footer toàn cục trên riêng route C2.

## Kiểm tra

- Client `npm run build`: PASS; cảnh báo bundle trên 500 kB và dữ liệu Browserslist cũ.
- Client `npm run lint`: PASS, không lỗi/warning.
- `git diff --check`: PASS.
- Không chạy browser test vì API local chưa sẵn theo báo cáo triển khai trước; giao diện thực tế/responsive/a11y chưa được xác minh.
- Không gọi API và không thay đổi dữ liệu.

## Kết luận

Sidebar, header và shell đã tách thành component riêng, có thể tái sử dụng qua props/children. C2 dùng shell này; giao diện các route khác chưa đổi. Stitch giữ nguyên. Master Plan cập nhật ngày, dòng C2, bảng review và ghi chú 6.F để liên kết report này.
