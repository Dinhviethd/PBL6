# B6 — Bước chọn sự kiện trước khi quản lý đơn hàng

- **Màn hình:** B6 — Quản lý đơn hàng, Organizer.
- **Thời điểm/loại việc:** 2026-10-31 00:42:49 UTC+7; bổ sung điều hướng và giao diện chọn sự kiện.
- **Stitch:** project `10374042969343935993`, screen B6 `391bc738f4ea4e25be5e43993616ca7f`. Không gọi hay sửa Stitch trong phiên này. Bước chọn sự kiện dùng mẫu card đã code cho luồng QR; nội dung màn B6 theo Stitch được giữ lại, riêng cách đổi sự kiện thay đổi theo yêu cầu mới.
- **Yêu cầu Master Plan:** B6 quản lý đơn theo một sự kiện, dùng sidebar Organizer và API dữ liệu thật; frontend/API đạt có điều kiện theo report trước.
- **Trạng thái ban đầu:** sidebar “Đơn hàng” là mục không nhấn được khi không có `eventId`; B6 có dropdown đổi sự kiện ngay trong trang.

## Thao tác và kết quả kiểm tra

| Tiêu chí | Kết quả |
|---|---|
| Chọn sự kiện trước B6 | Tạo `OrderManagerEventListPage.tsx`, route được bảo vệ `/organizer/order-events`; card sự kiện dẫn tới `/organizer/events/:id/orders`. Dùng lại sidebar và CSS của trang chọn sự kiện quét QR, không sửa màn B9. |
| Sidebar | Trong ngữ cảnh sự kiện, “Đơn hàng” dẫn thẳng B6 của sự kiện hiện tại. Khi không có `eventId`, mục này dẫn tới trang chọn sự kiện. |
| Sự kiện cố định trong B6 | Bỏ dropdown và lần tải danh sách sự kiện riêng của B6. Hiển thị tên sự kiện hiện tại và liên kết “Đổi sự kiện” về trang chọn; route B6 và API KPI/bảng/QR không đổi. |
| Dữ liệu picker | Dùng `GET /api/organizer/events?page=N&limit=6`; API này đã được kiểm HTTP 200 với dữ liệu thật trong report B9 trước. Phiên này kiểm container Docker cổng 8000 trả 401 khi không token, xác nhận route và auth đang có. Có loading, lỗi/retry, danh sách trống và phân trang theo `total_results`. |
| Build/lint | `npm run build` tại `client/` PASS; ESLint bốn file TSX sửa/tạo PASS. |
| Phạm vi chỉnh sửa | `App.tsx`, `OrganizerSidebar.tsx`, `OrderManagerPage.tsx`, file picker mới; report và Master Plan. Không sửa backend, Docker, Stitch hoặc code B9. |

## Đánh giá

- **Đạt:** Điều hướng chọn sự kiện trước B6 được nối trong source, route có guard Organizer/Admin, B6 giữ `eventId` cố định cho đến khi chọn “Đổi sự kiện”. API đọc sự kiện đang tồn tại và yêu cầu xác thực.
- **Chưa xác minh:** Chưa chạy browser test với phiên đăng nhập Organizer sau thay đổi, nên chưa đánh dấu visual/accessibility hay điều hướng end-to-end trên môi trường Live là PASS. Chưa có thay đổi nào được đóng gói vào Docker frontend; Vite dùng source local nếu đang chạy. Các giới hạn dữ liệu Live B6 trong report Docker trước vẫn còn.
- **Trạng thái cuối:** `ĐẠT CÓ ĐIỀU KIỆN` cho bước chọn sự kiện; B6 chưa nghiệm thu toàn diện.
- **Master Plan:** cập nhật mục 4 dòng 13, 5.2 B6, 5.4 B6, 6.F và nhật ký kết quả B6 với report/thời điểm này.

