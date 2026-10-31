# B11 — Khôi phục màu link gốc của sidebar

- **Thời điểm:** 2026-10-31 23:12:21 UTC+7
- **Màn hình:** B11 — Hồ sơ Ban Tổ Chức
- **Stitch:** project `10374042969343935993`, screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`; không chỉnh sửa thiết kế Stitch.
- **Loại phiên:** sửa CSS B11 để sidebar dùng lại đúng màu gốc.

## Finding và thay đổi

Rule `.b11-page a` áp màu cyan lên mọi anchor trong wrapper B11, bao gồm link sidebar. Rule này có độ ưu tiên cao hơn `.osb-item`, vì vậy các mục sidebar không active bị cyan hóa.

Trong `client/src/pages/organizer/OrganizerProfilePage.tsx`, bổ sung rule scope vào `.b11-page .osb-sidebar a.osb-item` để khôi phục token sẵn có của sidebar:

- Bình thường: `var(--osb-on-surface-variant)` (xám nhạt gốc).
- Hover: `var(--osb-on-surface)` (màu chữ sáng gốc).
- Active: `var(--osb-on-primary)` (chữ trắng tím gốc trên nền tím).

Các màu cyan của link nội dung B11 vẫn giữ nguyên; sidebar dùng lại palette trong `organizer-sidebar.css`.

## Xác minh

- Đối chiếu selector và độ ưu tiên CSS: các rule B11 mới có specificity cao hơn `.b11-page a` và `.osb-item`, đồng thời khôi phục đủ trạng thái thường/hover/active.
- Không chạy browser/test suite trong phiên này; màu trên giao diện đang chạy chưa được xác minh trực tiếp.
- `git diff --check` được dùng để kiểm tra patch tài liệu/source.

## Phạm vi và kết quả

Chỉ sửa CSS nằm trong cùng `OrganizerProfilePage.tsx` như cấu trúc hiện tại; không sửa backend, API, DB, routes, sidebar component hoặc các màn hình khác. Kết quả source: **ĐÃ SỬA; browser NOT_VERIFIED**.

Đã cập nhật trạng thái và thời điểm B11 trong Master Plan, thêm report liên kết. Không đổi kết luận runtime/API hoặc trạng thái các màn hình khác.
