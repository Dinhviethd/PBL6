# Organizer — Tách header dùng chung cho các trang BTC

- **Thời điểm:** 2026-10-31 23:35:21 UTC+7
- **Màn hình/route:** B2 `/organizer`, B4 `/organizer/new`, B6 `/organizer/order-events`, B9 `/organizer/qr-scan`, B11 `/organizer/profile`.
- **Stitch:** project `10374042969343935993`; không chỉnh sửa artifact Stitch.
- **Loại phiên:** tách `org-header` thành component dùng lại và thay header riêng tại các route được yêu cầu.

## Thay đổi

- Tạo `OrganizerHeader.tsx`. Component sở hữu breadcrumb, tìm kiếm mặc định, CTA tạo sự kiện, thông báo, avatar tài khoản, dropdown hồ sơ/đăng xuất và nhận slot tùy chọn cho search, notification, mobile menu.
- Dùng component tại dashboard B2, trang tạo sự kiện B4, trang chọn sự kiện đơn hàng B6, trang chọn sự kiện QR B9 và trang hồ sơ BTC B11.
- B6/B9 giữ nguyên toggle/sidebar mobile hiện có và notification link; thêm top spacing tương ứng với shared header cố định.
- B11 giữ lại form tìm kiếm/API, unread notification count và nút mở sidebar mobile thông qua slots; điều chỉnh style riêng để link/CTA/account menu hoạt động với generic B11 styles.
- Dùng chung `authService.logout()` cùng avatar `user.avatarUrl`; fallback vẫn là chữ cái đầu tên. CSS header tiếp tục nằm trong `organizer.css`.

## Xác minh và giới hạn

- Đã đọc Master Plan và đối chiếu markup/style từng route trước khi sửa.
- `git diff --check` PASS; rà soát source xác nhận năm route dùng `OrganizerHeader`.
- Không chạy build hoặc browser/responsive tests; các layout sau thay thế header chưa được xác minh trực quan.
- Không sửa backend, API, database, route hoặc Stitch.

## Master Plan

Đã cập nhật mục ma trận tích hợp và dòng review B2, B4, B6, B9, B11; mỗi dòng trỏ về report này và ghi rõ giới hạn browser/build chưa kiểm chứng. Không đổi trạng thái thiết kế Stitch.
