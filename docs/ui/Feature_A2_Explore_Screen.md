# Kế hoạch A2 — Khám phá & bộ lọc sự kiện

Nguồn chuẩn là project Stitch `10374042969343935993`, screen `108b533834414d3a826cd32cfae54fe6` (desktop 2560×4702). A2 đã triển khai tại **`/explore`** theo xác nhận của người dùng; A1 vẫn ở `/`. Phiên triển khai được phép sửa frontend và tích hợp API, thay cho giới hạn chỉ tài liệu của phiên lập kế hoạch.

**Trạng thái:** frontend **ĐẠT CÓ ĐIỀU KIỆN**; API thật, build/lint và 5/5 kiểm thử trình duyệt đạt. Artifact Stitch giữ nguyên, không gọi edit hay tạo screen mới; review artifact trước không đổi. Xem [báo cáo triển khai](../reports/stitch/A2_20261027_140520_frontend_implementation.md), [review ban đầu](../reports/stitch/A2_20261027_134356_review.md).

**Phạm vi người dùng đã chốt:** route riêng `/explore`; chỉ dùng backend hiện có. Sidebar dùng danh mục thật; bỏ lưu sự kiện, trường phái âm nhạc, loại không gian; thứ tự ngày gần nhất theo backend. Thương hiệu EventHub và shared header/footer theo yêu cầu.

## Bố cục cần giữ

Header và breadcrumb; tiêu đề khám phá; tìm kiếm, địa điểm, thời gian và chip danh mục; thông báo kết quả và sắp xếp; sidebar lọc; lưới ba cột gồm sáu thẻ có ảnh, tên, ngày, địa điểm, giá và hành động; phân trang; CTA ban tổ chức và footer. Đây là ảnh tĩnh desktop, chưa chứng minh hành vi.

## Phát hiện từ artifact và cách xử lý

1. Khi triển khai A2, dùng thương hiệu **EventHub** nhất quán trong nội dung, logo, alt, aria-label và metadata thuộc A2; không chép các tên `ENVENT HUB` hoặc `Cosmic Ticket` từ artifact. Đây là yêu cầu điều chỉnh cho frontend, không khẳng định artifact Stitch đã được sửa.
2. Bộ lọc mẫu chọn TP. Hồ Chí Minh và cuối tuần, nhưng banner nêu thêm Hà Nội, có thẻ Đà Nẵng và ngày mẫu 2025–2026. Kiểm tra tính nhất quán theo dữ liệu thực.
3. Link placeholder của artifact đã được thay bằng route thật trong frontend. Tìm kiếm, lọc, reset, phân trang và link A3 đã được kiểm thử; backend chỉ hỗ trợ thứ tự starts_at,id tăng dần, không có sort tùy chọn.
4. Frontend đã có skeleton, empty, error/retry, validation và disabled pagination; kiểm tra 1440/768/390px không tràn ngang và focus cơ bản. Chưa audit contrast, bàn phím và screen reader đầy đủ.
5. HTML dùng font Syne, Be Vietnam Pro, Space Grotesk và bảng màu tối/tím/cyan; các giá trị theme như nền `#0f1222`, surface `#181b2a`, cyan `#5de6ff` khác token mô tả `#080B1A`, `#10162B`, `#22D3EE`. Named colors trong theme Stitch cũng khác designMd; cần thống nhất nguồn token trước khi chỉnh.
6. Frontend bỏ tuyên bố 0,1 giây/chống gian lận tuyệt đối, dùng nội dung chức năng đã có.

## Các bước thực hiện tiếp theo

1. Kiểm tra các vai trò đã đăng nhập, screen reader, keyboard và contrast đầy đủ.
2. Kiểm thử tập dữ liệu >24 sự kiện để đi qua ranh giới đợt phân trang backend; dữ liệu thực hiện tại có 10 sự kiện.
3. Nếu được giao, xử lý dữ liệu city_code “Đà  Nẵng” hai dấu cách: backend exact-match không khớp “Đà Nẵng”. Không tự sửa dữ liệu trong phiên A2.
4. Mỗi lần sửa tiếp theo tạo báo cáo mới và cập nhật Master Plan; không ghi đè report cũ. Chỉ mở rộng chức năng chưa có backend khi được giao và đã xác minh contract/API.

## Ánh xạ code và điều hướng khi triển khai

- A2 dùng `client/src/pages/public/EventDiscovery.tsx` và `explore.css`, route `/explore` trong App. Explore/home.css vẫn phục vụ A1; chỉ thay điểm vào tìm kiếm/khám phá/danh mục tới A2.
- App render AuthHeader/AuthFooter từ AuthShell đúng một lần cho A2 với variant home, tìm kiếm và onNotice; không lồng shell trong page. Giữ menu/auth/thông báo dùng chung. A1 giữ điều kiện shell theo vai trò hiện có.
- Logo/breadcrumb Trang chủ: `/`; Khám phá: `/explore`; danh mục: `/explore?category=<id>`; tìm kiếm: `/explore?q=<giá trị mã hóa>`. Filter URL dùng q/category/city/from/to/minPrice/maxPrice; ngày gửi ranh giới UTC+07 thành ISO. UI page bắt đầu 0, sáu thẻ/trang; backend page=floor(UI page/4), 24 bản ghi/đợt.
- Thẻ sự kiện, tên và CTA xem vé: `/events/:slug` với slug thực tế, theo `EventTile`. Vé của tôi: `/tickets`; đăng nhập `/auth/login`, đăng ký `/auth/register`; hồ sơ `/profile`, đơn hàng `/orders`. Các route vé, hồ sơ và đơn hàng được `Guard` bảo vệ; bảo toàn chuyển hướng đăng nhập và state hiện có.
- CTA tạo sự kiện: `/organizer/new` cho ORGANIZER/ADMIN; người khác tới `/organizer` với nhãn rõ khu vực cần quyền. Kiểm tra code thấy Profile không còn form đăng ký organizer nên không dẫn vào luồng giả. Giữ Guard; footer chính sách giữ notice, không dùng URL giả.
- Nhánh home của AuthHeader dẫn “Khám phá sự kiện” đúng /explore cho khách và user; không thay nhánh reset/A11. Footer tìm kiếm tới A2.
- API public GET /api/health, /api/categories, /api/events và /api/events/:slug đã trả HTTP 200. Đã đối chiếu route, facade và truy vấn backend trước tích hợp. Runtime public được kiểm thử; vai trò đã đăng nhập chưa kiểm tra.

## Tiêu chí nghiệm thu

- Bố cục khớp A2 được xác minh; thương hiệu nhất quán và các thay đổi đã được thống nhất.
- Tìm kiếm, lọc, reset, sắp xếp, phân trang và liên kết chi tiết hoạt động với dữ liệu thực; có trạng thái loading/empty/error/disabled khi cần.
- Palette và font theo nguồn token đã thống nhất; kiểm tra tiếng Việt, contrast, focus, keyboard, screen reader và responsive bằng bằng chứng thực tế.
- Không kết luận đạt chỉ từ ảnh tĩnh hoặc khi API chưa kiểm chứng.
