# Báo cáo triển khai A1 — Trang chủ EventHub theo Stitch

## Thông tin phiên

- Màn hình: A1 — Trang chủ.
- Stitch project chính thức: `10374042969343935993` (EventHub).
- Stitch screen: `f9b7d6b096af4e598718c3f855ffe1e6`, artifact DESKTOP `2560×6660`.
- Thời điểm: 2026-10-26 10:52 (Asia/Ho_Chi_Minh, UTC+07:00).
- Hành động: tái hiện frontend theo artifact A1, tích hợp API đã xác minh, review browser và build.

## Yêu cầu và trạng thái ban đầu

Master Plan xác định A1 là Trang chủ, route `/`; frontend đã có trang Explore và public home chưa được visual/runtime review. Design system chính thức là Cosmic Graffiti. Thiết kế Stitch gốc có hero, tìm kiếm/lọc, danh mục, sự kiện nổi bật, phần lợi ích, CTA Ban Tổ Chức và footer. Báo cáo trước ghi việc `edit_screens` trả thao tác nhưng artifact không đổi; lần này yêu cầu là lấy thiết kế Stitch làm chuẩn và giữ lại header/footer đã tạo.

## Tiêu chí nghiệm thu

1. Giữ header/footer dùng chung hiện có.
2. Tái hiện các khối A1 trong trang `/` và dùng Cosmic Graffiti: canvas tối, tím/cyan/hồng, bề mặt card và tiêu đề hiển thị.
3. Hiển thị sự kiện và danh mục từ API backend thật; không bịa event/category, số lượng hoặc dữ liệu giá.
4. Tìm kiếm/lọc gửi đúng query params mà API hỗ trợ.
5. Có nội dung loading/error/empty; nội dung đáp ứng desktop/mobile và có nhãn trợ năng cơ bản.
6. Không sửa backend hoặc màn hình không thuộc phạm vi.

## Xác minh API trước tích hợp

Đối chiếu `server/src/app.ts`:

- `GET /api/health`: kiểm tra health của event/category backend.
- `GET /api/categories`: lấy danh mục.
- `GET /api/events`: nhận `page`, `q`, `category`, `city`, `from`, `to`, `minPrice`, `maxPrice`; trả `{ items, total }`, chỉ trạng thái `PUBLISHED`, kèm `priceFrom`.

Gọi live tại `http://127.0.0.1:8000` trước tích hợp: `/api/health` trả HTTP 200 với `{ "status": "ok" }`; `/api/categories` trả HTTP 200 và 6 danh mục; `/api/events?page=0` trả HTTP 200, 5 sự kiện đã xuất bản, `total: 5`. Không thay đổi endpoint hay hợp đồng backend.

## Thay đổi đã thực hiện

- Tái cấu trúc `client/src/pages/public/Explore.tsx` thành trang chủ A1: hero/CTA, tìm kiếm, bộ lọc địa điểm và khoảng ngày, chủ đề từ categories, danh mục, cards sự kiện, lợi ích và CTA organizer.
- Thêm stylesheet riêng `client/src/pages/public/home.css` với token màu Cosmic Graffiti, card/gradient và breakpoint desktop/tablet/mobile.
- Giữ nguyên sử dụng `AuthHeader` và `AuthFooter` do `App.tsx` quản lý trên guest home; không sửa component header/footer trong phiên này.
- Cards sự kiện dùng dữ liệu thật và ảnh bìa thật từ API. Trường hợp không có ảnh bìa dùng nền trang trí không chứa dữ kiện sự kiện giả. Danh mục hiển thị theo response; không thêm số lượng giả như “128+”.
- Form lọc gửi các tham số tương ứng API; thời gian chọn được đổi sang ISO datetime. Dùng component shared `Loading`, `Notice`, `Empty` cho trạng thái tải, lỗi và không có kết quả.
- CTA tiếp tục dẫn đến route hồ sơ/đăng ký tổ chức có sẵn.
- Không thay đổi Stitch artifact, backend, API, database hoặc màn hình khác.

## Review sau triển khai

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Yêu cầu và nội dung | PASS | Các vùng chính A1 có trong trang, event/category từ API. |
| Bố cục | PASS | Browser render full page ở viewport 1440×1000; các khối hero → categories → events → benefits → organizer rõ ràng. |
| Cosmic Graffiti | PASS | Palette `#080B1A`, `#10162B`, `#7C3AED`, `#22D3EE`, `#F472B6`; tiêu đề Syne và body Be Vietnam Pro từ app theme. |
| Tiếng Việt và khả năng đọc | PASS | Nội dung tiếng Việt, tiêu đề/label phân cấp, controls có nhãn ẩn hoặc aria-label. |
| Điều hướng/nghiệp vụ | PARTIAL | Detail card, category query, header search, CTA được nối route/query; chưa thao tác kiểm thử mọi luồng bằng tay. |
| UI states | PARTIAL | Loading/error/empty được nối bằng shared components trong code; browser review chưa ép từng trạng thái để chụp đối chiếu. |
| Responsive/accessibility | PARTIAL | Browser screenshot desktop 1440px và mobile 390px cho thấy layout co về cột và không có tràn ngang nhìn thấy; chưa audit keyboard/screen reader/contrast tự động. |
| Nhất quán | PASS | Header/footer shared giữ nguyên; A1 nội dung dùng cùng hệ thống font/brand EventHub. |

Kết luận triển khai: `ĐẠT CÓ ĐIỀU KIỆN`. Build đạt; review Stitch source và triển khai frontend là hai trạng thái khác nhau: artifact Stitch vẫn cũ/typo, còn frontend đã được tái hiện theo cấu trúc A1.

## Bằng chứng kiểm tra

- `npm run build` tại `client/`: `tsc -b` và Vite production build thành công. Có cảnh báo dữ liệu Browserslist cũ và bundle JS lớn hơn 500 kB; build vẫn exit thành công.
- Browser review qua Playwright dùng Chrome local tại `http://127.0.0.1:5174/`: full-page desktop `1440×1000` và mobile `390×844`. Header `AuthHeader`, footer `AuthFooter`, category cards và event cards đều xuất hiện trong ảnh.
- Screenshot tạm: `%TEMP%\a1-home-desktop-full.png`, `%TEMP%\a1-home-mobile-full.png`; đây là file tạm trên máy chạy, không được commit vào repo.
- API live: ba endpoint và status/response tóm tắt ghi tại mục “Xác minh API trước tích hợp”.
- Không thực hiện thay đổi lên Stitch trong phiên này; không có artifact sau-chỉnh sửa để xác minh.

## Vấn đề còn lại và giới hạn

- Artifact A1 trên Stitch chưa được chỉnh; theo `A1_20261026_103938_correction_attempt.md`, lần gọi `edit_screens` trước đó không persist khi đọc lại. Phiên hiện tại không cố gọi `edit_screens` theo yêu cầu.
- Dữ liệu staging hiện có một số tiêu đề/địa điểm sự kiện thử nghiệm và event không có ảnh; chúng được hiển thị đúng response backend.
- Browser screenshots không chứng minh keyboard/screen-reader accessibility hoặc tất cả trạng thái tương tác.
- Kết quả live API phản ánh database ở môi trường local tại thời điểm gọi; cần xác minh lại dữ liệu môi trường đích.

## Master Plan

Đã cập nhật hàng A1 trong mục 5.1 và 5.4: triển khai frontend, API đã kiểm tra, kết quả browser/build, vấn đề Stitch artifact chưa đổi, liên kết báo cáo và thời gian cập nhật `2026-10-26 10:52`.
