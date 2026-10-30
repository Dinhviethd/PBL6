# B6 — Đồng bộ trang chọn sự kiện với trang quét QR

- Màn hình: B6 — Quản lý đơn hàng, bước chọn sự kiện `/organizer/order-events`.
- Thời điểm: 2026-10-31 00:58:17 UTC+7; chỉnh giao diện theo yêu cầu người dùng.
- Stitch: project `10374042969343935993`; B6 chính có screen `391bc738f4ea4e25be5e43993616ca7f` theo Master Plan. Phiên này không truy cập hoặc sửa Stitch; nguồn giao diện được người dùng chỉ định là `QRScanEventListPage.tsx` hiện có. Không xác minh lại artifact Stitch.
- Yêu cầu Master Plan: chọn sự kiện trước khi quản lý đơn, dùng sidebar Organizer và giữ luồng API/phân trang hiện có.
- Ban đầu: picker không có `qs-header`, còn `site-header` ở shell ứng dụng; CSS riêng đặt chiều cao nội dung 100vh và menu mobile từ đỉnh trang.

## Thay đổi và nghiệm thu

| Tiêu chí | Kết quả |
|---|---|
| Bỏ site-header của picker | PASS theo source: thêm `/organizer/order-events` vào điều kiện khung Organizer trong `App.tsx`. |
| Dùng qs-header như trang QR | PASS theo source: menu mobile, breadcrumb Đơn hàng, tạo sự kiện, thông báo và tài khoản dùng cùng cấu trúc/CSS như trang QR. |
| Khung danh sách như trang QR | PASS theo source: bỏ CSS ghi đè riêng và toolbar cũ; dùng cùng `qs-body`, `qs-content qse-content`, grid và breakpoint đang có. |
| Giữ chức năng | PASS theo diff: giữ API danh sách event, page size 6, phân trang, loading/error/empty và link tới đơn hàng theo event. Không sửa backend hoặc trang QR. |
| Build | PASS: `npm run build` tại client; còn cảnh báo bundle lớn và dữ liệu Browserslist/baseline cũ. |
| Lint | PASS: ESLint `OrderManagerEventListPage.tsx` và `App.tsx`. |
| Browser/responsive/accessibility thực tế | NOT_VERIFIED: chưa mở browser trong phiên này. |

Không thêm hoặc thay đổi tích hợp API nghiệp vụ; không gọi lại authenticated API. Header tái sử dụng `NotificationLink` có sẵn như trang QR.

Kết quả: ĐẠT CÓ ĐIỀU KIỆN theo kiểm tra source/build/lint; cần kiểm tra trực quan và thao tác desktop/mobile. Các giới hạn nghiệm thu dữ liệu Live B6 trước đây giữ nguyên. Master Plan cập nhật trạng thái bước chọn sự kiện và liên kết báo cáo này.
