# A1 — Trang chủ EventHub: kế hoạch tái hiện theo Stitch

## Phạm vi và nguồn xác minh

- Stitch project: `10374042969343935993`.
- Màn hình hiện hữu: `f9b7d6b096af4e598718c3f855ffe1e6` — `Trang chủ - Cosmic Ticket`, DESKTOP `2560×6660`.
- Design system: Cosmic Graffiti; dark canvas, tím `#7C3AED`, cyan `#22D3EE`, hồng `#F472B6`, tiêu đề Syne, nội dung Be Vietnam Pro.
- Kế hoạch ban đầu chỉ sửa thiết kế Stitch/tài liệu. Theo yêu cầu tiếp nối, phiên này tái hiện giao diện A1 trong frontend từ artifact Stitch hiện có; không sửa backend hoặc màn hình khác.

## Yêu cầu A1 và tiêu chí nghiệm thu

1. Giữ màn hình A1 hiện có, không tạo màn hình trùng lặp.
2. Trang chủ khách chưa đăng nhập chỉ hiển thị điều hướng công khai: Trang chủ, Khám phá sự kiện, Đăng nhập và Đăng ký.
3. Chuẩn hóa thương hiệu hiển thị là `EventHub`/`EVENTHUB`; không để typo `ENVENTHUB` hay tên sản phẩm cũ `Cosmic Ticket`.
4. Giữ các khối hiện có: hero, tìm kiếm/lọc, danh mục, sự kiện nổi bật, lợi ích, CTA Ban Tổ Chức và footer.
5. Duy trì Cosmic Graffiti, tiếng Việt dễ đọc, tương phản tốt và không thay dữ liệu sự kiện tĩnh thành dữ liệu bịa đặt.
6. Sau mỗi hiệu chỉnh phải tải lại HTML và screenshot từ đúng screen ID để xác minh artifact thực sự đổi.

## Review trước hiệu chỉnh (2026-10-26 10:39, UTC+07:00)

Artifact hiện hữu có nền tối, neon tím/cyan/hồng, typography và cấu trúc khối phù hợp Cosmic Graffiti. Các điểm chưa đạt:

- Logo header/footer viết sai `ENVENTHUB`; title/artifact còn `Cosmic Ticket`.
- Header trộn trạng thái guest (Đăng nhập/Đăng ký) với avatar và điều hướng cá nhân; ảnh screenshot còn mục `Vé của tôi`.
- Nội dung sự kiện và mốc năm 2025 là dữ liệu tĩnh, không có bằng chứng được đồng bộ API ở phiên thiết kế này.
- Không có bằng chứng viewport mobile, keyboard/focus, loading, empty, error hay trạng thái disabled.

## Thao tác Stitch đã thử và kết quả

Đã gọi `edit_screens` in-place cho đúng A1, yêu cầu chỉ sửa thương hiệu và header guest, đồng thời giữ nguyên layout/ảnh/màu/dữ liệu. Stitch trả về `dom_operations` (session `10629565304197153202`, event `077dc5cb`), nhưng lần tải lại sau đó vẫn trả cùng HTML/screenshot file `6901868965624864515` / `3630964027280437565`; typo, title cũ và avatar vẫn còn. Vì artifact không được lưu, không thực hiện retry hoặc tạo màn hình thay thế.

## Kế hoạch tiếp tục khi Stitch lưu artifact được

1. Sửa in-place A1: `ENVENTHUB` → `EVENTHUB`, tên hiển thị/title `Cosmic Ticket` → `EventHub`.
2. Ở trạng thái guest, giữ Đăng nhập/Đăng ký; bỏ avatar/dropdown và mục cá nhân `Vé của tôi`; giữ Trang chủ/Khám phá sự kiện.
3. Không đổi layout, màu, ảnh, date/count event hoặc các màn khác.
4. Tải lại screen, HTML và screenshot; xác minh từng điều kiện trên rồi cập nhật report/Master Plan bằng artifact mới.

## Giới hạn hiện tại

Trạng thái: `BLOCKED` — MCP Stitch phản hồi thao tác sửa nhưng artifact A1 không thay đổi khi đọc lại. Không có API nào được gọi hoặc tích hợp trong phạm vi tài liệu/thiết kế này.

Xem chi tiết bằng chứng tại `docs/reports/stitch/A1_20261026_103938_correction_attempt.md`.

## Kết quả thực hiện plan (2026-10-26 10:52, UTC+07:00)

- Giữ nguyên `AuthHeader` và `AuthFooter` hiện có; nội dung A1 được dựng trong `client/src/pages/public/Explore.tsx` và style riêng tại `client/src/pages/public/home.css`.
- Tái hiện hero, ô tìm kiếm/lọc, danh mục, thẻ sự kiện, lợi ích và banner Ban Tổ Chức theo cấu trúc/nhịp thị giác của A1.
- Nối `GET /api/categories` và `GET /api/events?page=0` qua client API hiện hữu; không dùng event/category hardcode. Trạng thái loading, lỗi và rỗng có hiển thị.
- Build production đạt. Browser review ở desktop 1440px và mobile 390px xác nhận header/footer, nội dung chính và bố cục mobile; ảnh được tạo trong thư mục Temp của máy, không đưa vào repo.
- Stitch artifact A1 vẫn chưa được sửa: lần trước `edit_screens` không persist, theo báo cáo correction attempt. Lần này không gọi `edit_screens`.
- Kết luận triển khai: `ĐẠT CÓ ĐIỀU KIỆN`; trang dùng API thật đang hoạt động. Cần kiểm tra tương tác bằng người dùng, xác thực hiển thị danh mục/thời gian và dữ liệu thực tế trên môi trường đích.

Báo cáo phiên triển khai: `docs/reports/stitch/A1_20261026_105221_frontend_implementation.md`.
