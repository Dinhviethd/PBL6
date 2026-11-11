# A1 — Kế hoạch chuyển trang chủ web sang mobile

Ngày lập: 2026-11-10 17:33 UTC+07. Cập nhật triển khai: 2026-11-10 18:05 UTC+07. Trạng thái: NEEDS_REVIEW — đã triển khai, còn nghiệm thu Android/iOS trên thiết bị thật.

## 1. Mục tiêu và căn cứ

Tái hiện trang chủ web EventHub trong ứng dụng Expo bằng component native, giữ nội dung, nhận diện Cosmic Graffiti, màu, font, icon, ảnh và thứ tự các section; điều chỉnh kích thước và cách xếp cho thao tác trên điện thoại. Không nhúng toàn bộ web vào WebView.

Nguồn triển khai chính theo yêu cầu người dùng:

- `client/src/pages/public/Explore.tsx`: trang chủ A1 thực tế; không nhầm với `EventDiscovery.tsx` là A2.
- `client/src/pages/public/home.css`: token và responsive hiện có.
- `client/src/pages/auth/AuthHeader.tsx`, `AuthFooter.tsx`: header/footer dùng chung.
- `mobile/src/app/(tabs)/index.tsx`, `(tabs)/_layout.tsx`, `components/ui.tsx`, `components/event-artwork.tsx`, `theme/tokens.ts`, `lib/data.ts`.
- Master Plan mục 5.1, kế hoạch `Feature_A1_Home_Screen.md` và audit mobile 10/11/2026.

Stitch chính thức: project `10374042969343935993`; A1 `f9b7d6b096af4e598718c3f855ffe1e6`. Khi lập plan chưa truy cập Stitch. Phiên triển khai đã đọc project/screen qua MCP cấu hình trên máy; metadata A1 trả 2560×6660, canvas instance 1280×3218, nhưng download screenshot/HTML trả 401. Artifact không bị sửa; đối chiếu trực quan bằng web đang chạy và source web theo yêu cầu.

## 2. Chênh lệch hiện tại

- Mobile gộp trang chủ và tìm kiếm vào tab “Khám phá”, hero “Đi đâu cuối tuần này?” lấy sự kiện đầu danh sách; khác hero chữ của web.
- Mobile thiếu section danh mục dạng thẻ, lợi ích, banner Ban tổ chức và footer tương ứng web.
- Mobile dùng nền `#0c0d14`, primary `#b5a0ff`; web A1 dùng nền `#080B1A`, primary `#7C3AED`.
- Đã có font Be Vietnam Pro 400–800, component ảnh, session, API client và route `/events/[slug]`; nên tái sử dụng.
- Chưa có route khám phá độc lập hoặc đăng ký Ban tổ chức trên mobile. Không được chép nguyên URL React Router vào Expo Router.
- Web hiện gọi danh sách public, không có endpoint xếp hạng “nổi bật” riêng; giữ cách chọn dữ liệu tương ứng, không tự gắn nhãn bán chạy hay thêm thống kê.

## 3. Bố cục điện thoại đề xuất

Thứ tự từ trên xuống:

1. Header gọn: logo EventHub; guest có nút Đăng nhập, người đã đăng nhập có thông báo theo logic hiện có.
2. Hero: badge “NỀN TẢNG SỰ KIỆN & VÉ ĐIỆN TỬ”, tiêu đề “LỄ HỘI ÂM NHẠC & SỰ KIỆN VŨ TRỤ”, mô tả và hai CTA của web.
3. Panel tìm kiếm: ô từ khóa toàn chiều rộng; hàng Thành phố / Bộ lọc; nút Tìm kiếm; chip chủ đề cuộn ngang. Bộ lọc mở sheet có Từ ngày, Đến ngày, Áp dụng và Xóa lọc. Hiển thị số điều kiện đang chọn.
4. Danh mục sự kiện nổi bật: lưới hai cột, icon và sắc tím/cyan/hồng như web; lấy tên và ID từ API.
5. Sự kiện nổi bật: thẻ một cột trên điện thoại; ảnh, badge, ngày, tên, địa điểm, giá và nút Xem vé giữ cấu trúc web. Ban đầu hiển thị 6 sự kiện từ lô đầu API, có “Xem tất cả” mở màn khám phá. Đây là điều chỉnh có chủ đích để section dưới không bị đẩy quá xa; không đổi tổng số API thành 6.
6. Trải nghiệm EventHub: ba thẻ lợi ích xếp dọc, giữ nội dung web.
7. Banner Ban tổ chức: nội dung trước, CTA sau, nút rộng toàn khung.
8. Footer gọn: thương hiệu, hỗ trợ, liên kết nhanh; nhóm chính sách có thể thu gọn. Chính sách chưa có nội dung vẫn phải thông báo đúng trạng thái như web.
9. Thanh tab cố định dưới: đổi nhãn tab đầu thành “Trang chủ”, giữ các tab Vé của tôi, Đơn hàng, Check-in và Tài khoản.

### Quy tắc kích thước

| Thành phần | Quy tắc đề xuất |
|---|---|
| Khung nội dung | Padding ngang 16 ở 360–430 dp, 12 ở 320 dp; khoảng cách section 28–32 |
| Hero | Chiều cao theo nội dung, không mang min-height 700 của desktop sang native; padding dọc khoảng 24–32 |
| Tiêu đề | Hero 30–36, section 22–24, tên sự kiện 18–20; cho phép xuống dòng và tăng cỡ chữ hệ thống |
| Nội dung | 14–16; metadata tối thiểu 12, không sao chép mức 9px của CSS web mobile |
| CTA/input | Vùng chạm tối thiểu 48×48; hai CTA hero xếp dọc trên điện thoại |
| Thẻ danh mục | Hai cột, gap 10–12; chuyển một cột nếu cỡ chữ lớn làm thiếu chỗ |
| Thẻ sự kiện | Một cột dưới 600 dp; từ 600 có thể hai cột nếu mỗi thẻ đủ rộng; ảnh giữ tỷ lệ và crop phù hợp |
| Góc bo | Button/input 10–12; card 16–20, nhất quán theo nguồn web |
| Safe area | Header dưới vùng camera; footer/nội dung không bị tab bar che, tránh cộng inset hai lần |

Giữ bảng màu web: canvas `#080B1A`, surface `#10162B`, raised `#141C36`, line `#1E293B`, purple `#7C3AED`, cyan `#22D3EE`, pink `#F472B6`, text `#F8FAFC`, muted `#94A3B8`. Ưu tiên Be Vietnam Pro theo code web hiện tại, không tự thay sang Syne chỉ vì tài liệu cũ. Hiệu ứng gradient/glow cần tái hiện nhẹ, không làm giảm tương phản hay chặn tương tác; tôn trọng giảm chuyển động.

## 4. Mapping component và phạm vi file

| Nguồn web | Component mobile dự kiến | Cách chuyển |
|---|---|---|
| AuthHeader | `HomeHeader` | Logo/nhận diện giữ nguyên, điều hướng desktop chuyển sang tab/CTA |
| home-hero | `HomeHero` | Chữ, badge, CTA, gradient; bỏ hero sự kiện đầu của mobile cũ |
| home-search-panel | `HomeSearchPanel`, `HomeFilterSheet` | Giữ điều kiện tìm kiếm; chuyển date/select sang tương tác phù hợp native |
| home-category-grid | `HomeCategoryGrid` | Hai cột, icon map bằng slug, fallback icon khi slug mới |
| EventTile | `HomeEventCard` | Giữ poster, metadata, giá và CTA; dùng lại logic ảnh fallback |
| home-benefits | `HomeBenefits` | Ba thẻ xếp dọc |
| home-organizer | `HomeOrganizerCTA` | Banner một cột, CTA có đích thật |
| AuthFooter | `HomeFooter` | Nhóm nội dung thu gọn, liên kết hoạt động |

Component nằm dưới `mobile/src/components/home/`; hook dữ liệu nếu cần nằm ngoài thư mục route. `mobile/src/app/(tabs)/index.tsx` chỉ ghép màn A1. Đưa chức năng danh sách/lọc/phân trang hiện có sang `mobile/src/app/explore.tsx` và khai báo trong stack; đây là phần điều hướng phụ thuộc A1, không phải thiết kế lại toàn bộ A2.

Thêm token riêng `mobile/src/theme/home.ts` hoặc nhóm `home` trong token hiện có; không đổi hàng loạt theme các màn khác. Header và tab active của Trang chủ cần cùng màu với A1; kiểm tra tác động lên shell dùng chung. Tái sử dụng font, API client và session; không thay cơ chế auth hoặc `.env.local` trong công việc UI.

## 5. Hành vi và hợp đồng dữ liệu

- Hero “Khám phá”, “Xem tất cả” → `/explore`; submit tìm kiếm và chọn danh mục truyền các tham số tương ứng vào route này. Back trở về A1 với vị trí cuộn và điều kiện đã nhập còn nguyên.
- Card/“Xem vé” → `/events/[slug]`; không đi thẳng sang thanh toán.
- **Xác nhận mới của người dùng khi triển khai:** mọi nút mở chức năng trong mobile; chức năng chưa có hiện “Chức năng đang phát triển”. Vì vậy CTA Ban tổ chức, hỗ trợ và chính sách dùng sheet thông báo trong ứng dụng; không mở web hoặc trình duyệt ngoài. Các chức năng đã có dùng route mobile thật.
- Thông báo tiếp tục dùng route `/notifications` và count hiện có; guest đăng nhập qua `/auth`.
- Đã xác minh trong source `server/src/app.ts`: `GET /api/categories`; `GET /api/events` nhận `q`, `category` UUID, `city`, `from`, `to`, `minPrice`, `maxPrice`, `page` bắt đầu 0; server lấy 24 bản ghi/lô và trả `items`, `total`. `mobile/lib/data.ts` dùng chung type Event/Category với web.
- Phiên triển khai đã xác minh GET categories/events/config, kết hợp bộ lọc và event detail trên `https://eventhubqrmarketing.tech/api`: HTTP 200. Có 6 danh mục và 15 sự kiện tại thời điểm kiểm tra. Mốc ngày theo giờ địa phương chuyển ISO, kiểm tra ngày hợp lệ và từ ngày ≤ đến ngày; hiển thị ngày sự kiện theo giờ Việt Nam. Truy cập từ thiết bị native chưa nghiệm thu.
- A1 không cần API mới. Giá 0, thiếu giá, thiếu ảnh, tên dài và ngày không hợp lệ phải có cách hiển thị rõ; không tự tạo event/category để lấp chỗ trống.
- Loading/error/empty riêng cho danh mục và sự kiện; lỗi có Thử lại, không hiển thị đồng thời lỗi và thông báo “không có sự kiện”. Pull-to-refresh tải lại cả hai nguồn. Giữ thông báo demo nếu cấu hình trả về demo.

## 6. Các bước triển khai

1. **Chốt ảnh chuẩn:** chụp web A1 ở desktop và 390px, lưu bảng đối chiếu từng section. Kiểm tra logo, font và crop ảnh. Nếu Stitch kết nối lại, đối chiếu đúng A1; không sửa artifact.
2. **Chuẩn bị shell và route:** tách khám phá hiện tại khỏi index, giữ hành vi tìm kiếm/phân trang; đổi tab đầu thành Trang chủ. Thiết lập token A1 và safe area.
3. **Tái hiện giao diện:** làm header → hero/search → danh mục → card sự kiện → lợi ích → organizer → footer. Mỗi section đối chiếu nguồn web, ưu tiên nhận diện và bố cục trước animation.
4. **Nối dữ liệu/tương tác:** xác minh API runtime rồi tích hợp; hoàn thiện sheet lọc, query params, refresh, auth CTA, thông báo và link ngoài.
5. **Nghiệm thu:** so sánh screenshot cùng dữ liệu; kiểm tra Android/iOS và responsive, sửa sai lệch, tạo báo cáo và cập nhật Master Plan.

Trước khi viết code dùng Expo/React Native, đọc tài liệu version Expo 57 theo `mobile/AGENTS.md`; chưa quyết định thêm thư viện gradient/date picker trong bước lập plan. Chỉ thêm dependency tương thích SDK nếu thành phần có sẵn không đáp ứng.

## 7. Tiêu chí nghiệm thu

- Đủ các section web theo đúng thứ tự; nội dung, màu, font, badge, icon và thẻ sự kiện nhận diện được là cùng giao diện. Ghi rõ các thay đổi mobile đã liệt kê ở mục 3; không tuyên bố pixel-perfect giữa desktop và native.
- Kiểm tra 320, 360, 390, 430 và 768 dp; không tràn ngang hoặc cắt CTA, hoạt động khi tăng font, xoay màn hình và mở bàn phím.
- Kiểm tra Android và iOS: vùng camera/home indicator, back gesture, cuộn, sheet, focus và screen reader. Expo web chỉ là kiểm tra bổ sung, không thay bằng chứng native.
- Tìm kiếm từ khóa, thành phố, khoảng ngày, danh mục, xóa lọc, xem tất cả, phân trang, mở sự kiện và quay lại đều đúng. Không mất chức năng khám phá cũ.
- Kiểm tra guest/user, lỗi mạng, empty, loading, retry, refresh; ảnh lỗi, tiêu đề dài, ngày không hợp lệ và giá 0.
- Không lồng danh sách cuộn dọc không cần thiết; danh sách dài ở Explore cần cơ chế render phù hợp. A1 giới hạn phần preview giúp giữ footer dễ tiếp cận.
- Chạy `npm run typecheck`, `npm run lint`, `npm test` trong mobile và export Android/iOS/web sau triển khai. Regression các tab, đăng nhập và mở chi tiết; cập nhật test cũ nếu route Khám phá thay đổi.

## 8. Trạng thái bàn giao

Đã triển khai A1 native, route Explore riêng, tìm kiếm/bộ lọc ngày, phân trang và các trạng thái dữ liệu. Token A1 riêng; tái sử dụng font và logo web, thêm `expo-linear-gradient ~57.0.2` bằng `expo install`. Mọi CTA tuân theo xác nhận mới: route mobile hoặc thông báo đang phát triển.

Typecheck/lint, 26 unit tests, 18 browser UI tests và export Android/iOS/web đã PASS. API public đã gọi thực tế; browser UI đã đối chiếu ở 320/360/390/430/768 và màn hình ngang thấp. Preview web localhost cần proxy CORS riêng để kiểm dữ liệu thật; không sửa CORS/backend hoặc `.env.local`. Android/iOS thiết bị thật, font hệ thống lớn, VoiceOver/TalkBack và pixel-diff Stitch chưa nghiệm thu.

Bằng chứng, kết quả kiểm thử UI cuối cùng và các giới hạn: [báo cáo triển khai](../reports/stitch/A1_20261110_180523_mobile_home_implementation.md).
