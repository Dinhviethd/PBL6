# B9 — Triển khai danh sách chọn sự kiện để quét QR

- **Màn hình:** B9 — Quét mã QR check-in.
- **Stitch:** EventHub project `10374042969343935993`, screen `d5ec1ed78e9d49e9922c75a3d768991f`. Không chỉnh sửa Stitch; giữ artifact hiện có.
- **Thời điểm:** 2026-10-30 22:52:08 UTC+07:00.
- **Hành động:** Triển khai luồng chọn sự kiện theo kế hoạch và xác minh API/build/lint.

## Yêu cầu triển khai

Khi chọn Quét mã QR từ sidebar ngoài ngữ cảnh event, hiển thị danh sách card riêng theo kiểu `EventDiscovery`; từng card có nút Quét mã điều hướng đúng `/organizer/events/{id}/checkin`. Trong event context, sidebar tiếp tục mở scanner của event đó. Giữ nguyên các mục sidebar chưa có route.

## Xác minh API trước khi tích hợp

- `GET /api/health` tại local `http://localhost:8000`: HTTP 200, `status=ok`.
- `POST /api/auth/login`: HTTP 200 với organizer demo đã được cung cấp trong phiên làm việc; principal có role `ORGANIZER` (cùng `USER`).
- `GET /api/organizer/events?page=0&limit=5`: HTTP 200, trả 5 event và trường `total_results`; các item có `id`, `title`, `cover_image_url`, `starts_at`, `venue_name`, `city_code`, `status`. Route backend kiểm tra role ORGANIZER/ADMIN và truy vấn theo `userId` của principal.
- Không in access token hoặc thông tin xác thực vào báo cáo. Không gọi API scan/check-in và không thay đổi dữ liệu.

## Thay đổi thực hiện

- `OrganizerSidebar.tsx`: mục Quét mã QR không có event context dẫn đến `/organizer/qr-scan`; khi có event ID thì vẫn dẫn đến `/:id/checkin`.
- `App.tsx`: thêm route được bảo vệ bởi Guard role ORGANIZER/ADMIN và coi route danh sách là organizer shell để không hiện shell khách hàng dùng chung.
- `QRScanEventListPage.tsx` và `qr-scan-events.css`: thêm trang dùng lại sidebar/header B9, lấy dữ liệu từ API Organizer theo trang, hiển thị từng card với ảnh hoặc fallback, tiêu đề, status, ngày giờ GMT+7, địa điểm và CTA Quét mã QR riêng. Nút xây route từ ID của chính card.
- Có loading, lỗi/thử lại, empty state, phân trang, mobile sidebar, responsive card grid, keyboard focus và nhãn truy cập được. Dữ liệu không hard-code; không đổi EventDiscovery hoặc các màn khác.

## Kết quả kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Route API, quyền và response thực tế | PASS — health, login, organizer event list HTTP 200 như trên |
| Build frontend | PASS — `npm run build` (`tsc -b` + Vite build) |
| Lint frontend | PASS — `npm run lint -- --no-warn-ignored` |
| `git diff --check` | PASS |
| Browser/ảnh chụp/điều hướng thao tác trực tiếp | NOT_VERIFIED — không chạy browser trong phiên |
| Camera vật lý, quét mã, accessibility runtime | NOT_VERIFIED trong phiên này; các phần scanner đã triển khai trước đó giữ nguyên |

Build có cảnh báo hiện hữu về dữ liệu Browserslist/Baseline cũ và bundle JS lớn hơn 500 kB; build vẫn thành công. Không chạy test suite.

## Kết luận và trạng thái

Luồng UI/API cần thiết đã được triển khai và build/lint đạt. Trạng thái review tổng thể cho thay đổi phiên này: **ĐẠT CÓ ĐIỀU KIỆN** do browser visual/navigation review chưa thực hiện. API xác minh runtime ở local và kết quả lấy event thật; các thao tác check-in không được gọi. B9 Stitch giữ nguyên.

## Master Plan

Đã cập nhật mục B9 trong bảng route/page, trạng thái tích hợp và bảng review: ghi route danh sách, GET Organizer API đã xác minh runtime, tình trạng triển khai và tiêu chí browser còn mở; cập nhật báo cáo mới nhất cùng thời điểm. Kế hoạch chi tiết B9 cũng được cập nhật với kết quả phiên.
