# A1 — Trang chủ: triển khai web sang mobile

Thời điểm ghi nhận: 2026-11-10 18:05:23 UTC+07; hành động: triển khai và kiểm tra. Trạng thái: NEEDS_REVIEW / ĐẠT CÓ ĐIỀU KIỆN, còn nghiệm thu native.

## Phạm vi và nguồn

- Người dùng yêu cầu thực hiện plan A1 mobile, giữ giao diện web và sắp xếp cho điện thoại.
- Xác nhận bổ sung: mọi nút dẫn tới chức năng mobile; nếu chưa có thì hiện **“Chức năng đang phát triển”**. Quyết định này thay phương án mở website cho CTA Ban tổ chức trong plan trước.
- Master Plan mục 5.1 A1 và MP-14: giữ Cosmic Graffiti, hero/search/categories/events/benefits/organizer/footer, dữ liệu thật và kiểm tra responsive.
- [Plan được cập nhật](../../ui/Feature_A1_Mobile_Home_Plan.md). Nguồn web: `client/src/pages/public/Explore.tsx`, `home.css`, `pages/auth/AuthHeader.tsx`, `AuthFooter.tsx`; web runtime `https://eventhubqrmarketing.tech/`.
- Stitch project `10374042969343935993`, screen `f9b7d6b096af4e598718c3f855ffe1e6` — Trang chủ. Đọc project/get_screen qua MCP trực tiếp bằng cấu hình sẵn có; không in API key. Project trả 49 canvas instances, updateTime `2026-11-10T10:45:43.484740Z`. Screen metadata DESKTOP 2560×6660; instance trên canvas 1280×3218.
- Screenshot/HTML downloadUrl của A1 trả HTTP 401 dù metadata đọc được; không thể pixel-diff Stitch. Không sửa artifact, không tạo màn trùng. Chụp web runtime 1440px và 390px để đối chiếu.

## Ban đầu và thay đổi thực tế

Mobile index trước đây là ExploreScreen với hero sự kiện đầu, màu pastel và danh sách gộp. Bản mới gồm:

1. Tab Trang chủ, header logo từ web, guest Đăng nhập, giữ bell/count cho người đăng nhập.
2. Hero chữ Cosmic Graffiti, nền gradient nhẹ, CTA native; token màu riêng A1, font Be Vietnam Pro có sẵn.
3. Panel tìm kiếm và sheet thành phố/khoảng ngày, lịch chọn ngày, validate ngày và thứ tự. Chip chủ đề lấy từ API.
4. Danh mục hai cột, một cột khi fontScale lớn; icon theo slug có fallback.
5. Sáu thẻ xem trước từ API, tổng số thật, nút Xem tất cả; ảnh có fallback, metadata, giá 0 = Miễn phí, ngày lỗi có nhãn rõ.
6. Ba thẻ lợi ích, banner Ban tổ chức, footer thu gọn nhóm chính sách. Chức năng chưa có dùng sheet thông báo, giữ người dùng trong ứng dụng.
7. Route `/explore` dùng FlatList, nhận tham số từ A1, giữ tìm kiếm/danh mục/thành phố/ngày và phân trang 24/lô. Đổi trang hoặc xóa lọc cuộn về đầu; back giữ draft A1. Route `/events/[slug]`, tickets, auth, notifications tiếp tục dùng màn sẵn có.
8. Loading/error/empty độc lập cho categories/events, retry và refresh. Không hiển thị empty cùng error. Giữ thông báo demo theo config.

Code ở `mobile/src/components/home/`, `mobile/src/theme/home.ts`, `mobile/src/lib/event-search.ts`; index chỉ export màn Home. Stack/tab layout có route và header tương ứng. Thêm logo web nguyên gốc vào assets và `expo-linear-gradient ~57.0.2` qua Expo SDK 57 installer; không đổi theme các màn khác. Đọc Expo 57, Router params, LinearGradient và tài liệu RN trước khi viết code.

Không sửa backend, database, web product hoặc `.env.local`. Thay đổi dưới client chỉ là cấu hình và regression tests của mobile. Giữ các thay đổi workspace có sẵn, bao gồm audit, tar và phần Master Plan từ phiên trước.

## API runtime và bằng chứng

Base URL được đọc từ cấu hình mobile: `https://eventhubqrmarketing.tech/api`.

| Method/path | Bằng chứng |
|---|---|
| GET `/categories` | HTTP 200, envelope success/data mảng, 6 danh mục |
| GET `/events?page=0` | HTTP 200, data.items/total, 15 sự kiện |
| GET `/config` | HTTP 200, paymentMode disabled, sepayEnabled true |
| GET `/events` với q/city/category/from/to/page | HTTP 200, chấp nhận query đúng hợp đồng |
| GET `/events/swimming-championship` | HTTP 200 |

Source route, DTO dùng chung và page bắt đầu 0 đã đối chiếu với `server/src/app.ts`, `mobile/src/lib/data.ts`, type web. Không thêm endpoint hoặc dữ liệu mẫu vào ứng dụng.

Preview Expo web ở localhost bị CORS của máy chủ Live chặn. Lượt browser smoke dùng **response proxy chỉ trong phiên Playwright** để đọc dữ liệu thật, giữ nguyên body/status; không thay backend CORS hoặc public config. Categories/events/config HTTP 200, Home hiện 6 thẻ, Explore hiện 15 sự kiện, không có pageerror. Guest refresh trả 403 ở origin localhost; smoke này không nghiệm thu đăng nhập Live. Không tạo đơn, thanh toán hoặc ghi dữ liệu nghiệp vụ.

Bằng chứng cục bộ dưới `.local/qa/` (không commit dữ liệu runtime): `a1-stitch-project.json`, `a1-stitch-screen.json`, `a1-web-source-{1440,390}.png`, `home-api-verification.json`, `home-live-smoke.json`, `home-live-{390,categories-390,events-390}.png`, `home-mobile-{top,bottom}-{320,360,390,430,768}.png`.

## Kiểm thử và nghiệm thu

Tiêu chí: đủ section/nhận diện web, bố cục điện thoại đọc và chạm được, route native đúng, API thật, trạng thái dữ liệu rõ, không ảnh hưởng luồng sẵn có.

- `npm run typecheck` trong mobile: PASS.
- `npm run lint` trong mobile: PASS.
- `npm test` trong mobile: **26/26 PASS**; gồm ba test mới cho query/date validation, leap day, ngày Việt Nam và timestamp lỗi.
- `npm run export` trong mobile: **Android/iOS/web PASS**. Đã xóa Metro cache để lấy đúng public API URL; export cuối chứa origin cấu hình. Export không tương đương chạy trên thiết bị native.
- `npx playwright test --config playwright.mobile-ui.config.ts` trong client: **18/18 PASS (27.1s)** ở lượt cuối. Các bài bao gồm viewport 320/360/390/430/768, modal phát triển, policy accordion, query/category/date, back draft, pagination reset, lỗi API/retry, empty/clear, viewport ngang thấp và regression notification/booking/demo payment/QR/check-in. Dữ liệu mô phỏng chỉ nằm trong test.
- Đã xem ảnh giao diện top/footer và danh mục/sự kiện dữ liệu thật, so với cấu trúc web. Logo dùng contain để không crop ảnh gốc; nút thẻ hiển thị ngắn Xem vé, accessible name có tên sự kiện.
- Lượt thử trước phát hiện thiếu accessible label ở accordion chính sách và đã sửa. Test mới từng đếm cả màn Home ẩn khi route Explore giữ stack; đã sửa assertion chỉ đếm giá đang hiển thị.

| Tiêu chí rà soát | Kết quả | Giới hạn |
|---|---|---|
| Yêu cầu/nội dung | PASS | Đủ section, CTA native hoặc thông báo theo yêu cầu mới |
| Bố cục | PASS trên Expo web | Năm viewport và viewport ngang thấp; native cần thử |
| Design system | PARTIAL | Token/font/structure theo web; không pixel-diff Stitch do download 401 |
| Tiếng Việt/khả năng đọc | PARTIAL | Đã xem ảnh; chưa đo toàn bộ contrast hoặc kiểm font hệ thống lớn |
| Điều hướng/nghiệp vụ | PASS trong UI tests | Native back gesture và auth Live chưa nghiệm thu |
| Trạng thái dữ liệu | PASS trong UI tests | API public thật 200; trạng thái lỗi/empty mô phỏng trong test |
| Responsive/accessibility | PARTIAL | Browser layout/labels được kiểm; chưa VoiceOver/TalkBack và thiết bị |
| Nhất quán | PARTIAL | A1 theo web, các màn khác giữ theme hiện tại |

## Tồn đọng và bàn giao

1. Kiểm tra Android/iOS trên thiết bị hoặc simulator: camera cutout/home indicator, keyboard, back gesture, refresh, fontScale lớn, VoiceOver/TalkBack. Máy hiện không có adb được tìm thấy.
2. Khôi phục quyền tải screenshot/HTML Stitch nếu cần pixel-diff chính thức; chỉ phần download artifact bị chặn, code triển khai không bị dừng.
3. Nếu dùng Expo web localhost với API Live, cần môi trường preview có proxy/origin được backend cho phép; native không chịu CORS trình duyệt. Không thay cấu hình này ngoài phạm vi.
4. A5/hỗ trợ/chính sách native chưa có nên hiện đúng thông báo đang phát triển theo xác nhận người dùng.

Master Plan cập nhật ghi chú A1 mobile và MP-14 thành NEEDS_REVIEW; giữ trạng thái A1 web/thiết kế lịch sử. Không đánh dấu nghiệm thu native hoàn tất.
