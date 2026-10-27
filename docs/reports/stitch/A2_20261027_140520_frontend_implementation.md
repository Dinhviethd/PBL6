# A2 — Khám phá & bộ lọc sự kiện: triển khai frontend

- **Thời điểm:** 2026-10-27 14:05:20, Asia/Ho_Chi_Minh.
- **Project Stitch:** `10374042969343935993` — EventHub.
- **Screen:** `108b533834414d3a826cd32cfae54fe6`, “Khám phá & Bộ lọc sự kiện - Cosmic Ticket”, DESKTOP 2560×4702.
- **Loại phiên:** triển khai React, tích hợp API hiện có, kiểm tra runtime và cập nhật tài liệu.
- **Nguồn:** Master Plan mục 4, 5.1, 5.4, 6.F; [kế hoạch](../../ui/Feature_A2_Explore_Screen.md), [review trước](A2_20261027_134356_review.md), [bổ sung kế hoạch](A2_20261027_135042_plan_update.md).

## Ban đầu và quyết định đã xác nhận

A2 chưa có page riêng; A1 dùng Explore tại `/`. Artifact còn sai thương hiệu, link placeholder và chức năng chưa có backend. Correction artifact trước đây BLOCKED; việc triển khai frontend từ nguồn đọc được không bị chặn.

Người dùng xác nhận: tạo route `/explore` riêng và giữ A1 tại `/`; chỉ dùng chức năng backend hiện có, sidebar dùng danh mục thật, bỏ lưu sự kiện/trường phái âm nhạc/loại không gian, hiển thị thứ tự ngày gần nhất. Brand EventHub và AuthHeader/AuthFooter chung theo kế hoạch đã duyệt.

Không sửa Stitch, không tạo bản trùng, không gọi edit_screens; không sửa backend hay dữ liệu.

## Thao tác và nguồn thiết kế

Đọc Master Plan trước; get_project/get_screen xác nhận đúng project/A2; download_file lấy và đọc HTML, xem ảnh:

- HTML: `projects/10374042969343935993/files/18425746987370547040`.
- Screenshot: `projects/10374042969343935993/files/7335647946545489671`, ảnh 1920×3505, khác metadata screen 2560×4702.

Giữ breadcrumb, tiêu đề, filter/chips, kết quả, sidebar, lưới ba cột/sáu thẻ, phân trang, CTA/footer. Dùng palette thực của HTML (`#0f1222`, `#181b2a`, `#5de6ff`, `#7c3aed`) và font Syne/Be Vietnam Pro/Space Grotesk có sẵn; không áp lại theme làm đổi artifact.

Thay đổi có căn cứ: dữ liệu sự kiện/ảnh/giá/danh mục từ API; brand frontend EventHub; dùng shared shell; bỏ tuyên bố chưa chứng minh về “thời gian thực”, check-in 0,1 giây/chống gian lận tuyệt đối. Không tuyên bố pixel equivalence tuyệt đối.

## Các tệp triển khai

- `client/src/pages/public/EventDiscovery.tsx`, `explore.css`: A2, card, filter URL, ngày UTC+07, validation, reset, pagination, skeleton/empty/error/retry; style scoped, responsive, focus, reduced motion.
- `App.tsx`: route `/explore`, shared shell và header search. `Explore.tsx`: chỉ nối điểm vào tìm kiếm/khám phá/danh mục, giữ bố cục A1.
- `AuthHeader.tsx`, `AuthFooter.tsx`: link A2 trong nhánh home và link tìm kiếm; không đổi nhánh reset A11.
- `client/tests/a2-explore.spec.ts`: live read-only tests, không seed/ghi dữ liệu. Abort request để kiểm thử lỗi mạng, không mock dữ liệu kinh doanh.

Backend trả 24 sự kiện/đợt, UI chia thành bốn trang sáu thẻ. UI page bắt đầu 0, backend page=floor(UI page/4). Filter mới reset page; Back/Forward phục hồi URL. Trang ngoài phạm vi hiển thị thông báo và nút về trang đầu; không khẳng định tổng sự kiện bằng 0 do response trang rỗng.

Lọc giá theo sự kiện có loại vé trong khoảng, giá hiển thị là giá thấp nhất toàn sự kiện theo contract; có ghi chú trong sidebar.

CTA `/organizer/new` cho ORGANIZER/ADMIN; khách/user thường tới `/organizer` kèm nhãn yêu cầu quyền, giữ Guard. Kiểm tra code thấy Profile không còn form đăng ký organizer nên không dẫn tới Profile với lời hứa đăng ký.

## API đã xác minh trước tích hợp

Backend `http://127.0.0.1:8000/api`, frontend `http://127.0.0.1:5173`; Axios `/api`, proxy Vite tới 8000. Các GET bên dưới public, không yêu cầu xác thực.

| API | Bằng chứng HTTP 200 | Tích hợp |
|---|---|---|
| GET /api/health | data.status=ok, handler đọc categories | Xác minh môi trường |
| GET /api/categories | Sáu danh mục có id/name/slug | Chips và radio |
| GET /api/events?page=0 | total=10, mười bản ghi có slug/title/category_id/cover_image_url/venue_name/city_code/starts_at/priceFrom | Danh sách, thẻ, tổng, phân trang |
| GET /api/events?category=81ab66e7-a3cd-4a70-b5d4-33c073a8114e | total=2 | Danh mục |
| GET /api/events?q=Indie | total=1 | Tìm theo title; không hứa tìm nghệ sĩ |
| GET /api/events?city=TP.%20H%E1%BB%93%20Ch%C3%AD%20Minh | total=2 | Thành phố exact-match |
| GET /api/events?minPrice=0&maxPrice=50000 | total=3 | Khoảng giá |
| GET /api/events?from=2026-12-01T00%3A00%3A00.000Z&to=2026-12-31T23%3A59%3A59.999Z | total=3 | Khoảng ngày ISO |
| GET /api/events?page=1 | items=[], total=0 do chỉ có 10 bản ghi | Contract trang rỗng |
| GET /api/events/dem-nhac-mua-dong-ben-song-2026 | Có title/ticketTypes | Link sang A3 hiện có |

Đọc `server/src/app.ts`, `modules/event/public.ts`, `modules/event/infrastructure/store.ts`, `modules/order/infrastructure/store.ts`: PUBLISHED, q theo title, category UUID, city chính xác, from/to ISO, min/max số nguyên không âm, page 0..10000, limit 24, ORDER BY starts_at,id. Response `{success,data}`; dùng useLoad/Axios hiện có.

## Kiểm tra và bằng chứng

- **Build PASS:** npm run build tại client (TypeScript/Vite). Cảnh báo bundle >500kB và Browserslist/baseline data cũ, không phải lỗi build.
- **Lint PASS:** ESLint các file App, Explore, EventDiscovery, AuthHeader, AuthFooter và test.
- **Playwright 5/5 PASS**, lần cuối 24,6 giây: tên, category, thành phố, giá, ngày hợp lệ UTC+07, validation, reset, Back, phân trang 1→2, chi tiết, A1→A2, header search, lỗi/retry, empty và trang ngoài phạm vi.
- **Responsive:** 1440/768/390px không tràn ngang, một shared header/footer; đã xem ảnh desktop/tablet/mobile và mobile đầu trang; ảnh sự kiện được tải sau cuộn lazy loading.
- Lần đầu Playwright thiếu Chromium; tải bị timeout. Dùng Chrome đã cài qua PLAYWRIGHT_CHANNEL=chrome, kiểm thử thành công. Không coi lỗi môi trường này là lỗi ứng dụng.

Chạy lại trong client với backend/frontend đang chạy:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5173'
$env:PLAYWRIGHT_CHANNEL='chrome'
npx playwright test tests/a2-explore.spec.ts --config playwright.config.ts
```

Ảnh: [1440px](evidence/A2_20261027_implementation/1440.png), [768px](evidence/A2_20261027_implementation/768.png), [390px](evidence/A2_20261027_implementation/390.png), [mobile đầu trang](evidence/A2_20261027_implementation/390-top.png).

## Checklist nghiệm thu

| Tiêu chí | Trạng thái | Kết luận |
|---|---|---|
| Yêu cầu/nội dung | PASS | Theo phạm vi đã xác nhận, dữ liệu thật, brand EventHub |
| Bố cục | PASS | Xem ba viewport, cấu trúc A2 và shared shell |
| Cosmic Graffiti | PARTIAL | Palette/font artifact; khác token mô tả chung đã ghi nhận |
| Ngôn ngữ/độ đọc | PARTIAL | Nhãn tiếng Việt; chưa audit contrast đầy đủ |
| Điều hướng/nghiệp vụ | PARTIAL | Luồng public đã test, chưa đăng nhập các vai trò |
| Trạng thái UI | PASS | Skeleton, empty, lỗi/retry, validation, disabled pagination |
| Responsive/accessibility | PARTIAL | Ba viewport/focus cơ bản; chưa screen reader/toàn bộ keyboard |
| Nhất quán | PARTIAL | Shared shell, A1 giữ bố cục; chưa regression toàn bộ màn dùng chung |

## Tồn tại và kết luận

1. Một city_code “Đà  Nẵng” có hai dấu cách; backend exact-match không trả bản ghi đó khi nhập “Đà Nẵng”. Không sửa dữ liệu/backend trong phiên. Ô thành phố cho nhập tự do, không giới hạn bốn gợi ý.
2. Chưa kiểm tra runtime vai trò đã đăng nhập, screen reader, contrast toàn diện và tập dữ liệu >24 sự kiện (hiện có 10).
3. Artifact Stitch giữ lỗi theo review trước; không có correction mới. Chức năng backend chưa hỗ trợ đã được người dùng loại khỏi phạm vi.

**Frontend A2: ĐẠT CÓ ĐIỀU KIỆN** trong phạm vi đã xác nhận; public UI/API/build/lint/tests hoàn tất, các giới hạn trên giữ mở. **Artifact Stitch:** giữ nguyên, review trước KHÔNG ĐẠT.

Đã giải quyết ở frontend: brand, link placeholder, filter/result thật, phân trang, shared shell và trạng thái UI. Master Plan cập nhật A2 mục 5.1 (route/triển khai), 5.4 (review/vấn đề/report/thời điểm), mục 4 (API) và ghi chú 6.F. Không nâng trạng thái màn khác.
