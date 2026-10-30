# B6 — Bỏ header trang chọn sự kiện và chỉnh khung hiển thị

- **Màn hình:** B6 — Quản lý đơn hàng (Organizer), bước chọn sự kiện `/organizer/order-events`.
- **Thời điểm/loại việc:** 2026-10-31 00:49:28 UTC+7; chỉnh giao diện theo yêu cầu.
- **Stitch:** project `10374042969343935993`, screen B6 `391bc738f4ea4e25be5e43993616ca7f`. Không thao tác Stitch; thay đổi chỉ ở bước chọn sự kiện được bổ sung sau thiết kế B6 chính.
- **Yêu cầu Master Plan:** B6 dùng sidebar Organizer, chọn event trước khi xem đơn; API danh sách event và API đơn thật. Thiết kế Cosmic Graffiti giữ nguyên màu và thẻ sự kiện đang dùng.
- **Trạng thái ban đầu:** trang picker B6 có `qs-header` cao tối thiểu 64px; `qse-content` chỉ có chiều cao tối thiểu `100vh - 64px` từ CSS trang QR.

## Thao tác và tiêu chí

| Tiêu chí | Kết quả/bằng chứng |
|---|---|
| Bỏ thanh header | Xóa toàn bộ phần header/breadcrumb/tài khoản khỏi `OrderManagerEventListPage.tsx`; bỏ các import và dữ liệu user không còn dùng. |
| Khung vừa viewport | Thêm class riêng `qse-order-picker`; `qs-body` và vùng `qse-content` có `min-height:100vh`, `width:100%`, giữ `max-width:1600px` và gutter từ mẫu `qr-scan.css`. Các quy tắc được đặt trong cùng file TSX. |
| Điều hướng trên màn nhỏ | Đưa nút menu ra đầu nội dung; sidebar/backdrop phủ từ đỉnh viewport khi mở menu, không còn chừa 64px cho header đã bỏ. |
| Phạm vi | Không sửa trang QR, trang B6 chính, API, Docker hoặc màn khác. Card, API, phân trang, loading/error vẫn giữ nguyên. |
| Kiểm tra | `npm run build` tại `client/` PASS; ESLint `OrderManagerEventListPage.tsx` PASS. |

## Kết luận và giới hạn

- **Review:** yêu cầu bỏ header và dùng chiều cao viewport đã được thực hiện trong mã nguồn; giữ cùng layout/sidebar/CSS card như trang chọn event QR.
- **API đã xác minh:** không thêm API. Picker tiếp tục dùng `GET /api/organizer/events?page=N&limit=6`, đã xác minh trước trong report B9; không gọi lại authenticated trong phiên này.
- **Trạng thái cuối:** `ĐẠT CÓ ĐIỀU KIỆN` theo build/lint. Chưa mở browser để đo khung hiển thị thực tế ở desktop/mobile; chưa kiểm điều hướng menu bằng thao tác người dùng sau thay đổi. B6 Live authenticated vẫn chưa được nghiệm thu từ các report trước.
- **Master Plan:** cập nhật B6 ở mục 4 dòng 13, 5.2, 5.4 và 6.F với kết quả, giới hạn, report và thời điểm mới.

