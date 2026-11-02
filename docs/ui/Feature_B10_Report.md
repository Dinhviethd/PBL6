# B10 — Kế hoạch thực hiện lại Báo cáo phân tích EventHub

Ngày review: **2026-11-01 22:51:08 UTC+07**. Tên trong Master Plan: **Phân tích & thống kê sự kiện**.

Trạng thái: **ĐÃ TRIỂN KHAI SOURCE — ĐẠT CÓ ĐIỀU KIỆN trên DB test/API source/Chrome; Docker8000/Live chưa rollout**.

Kết quả triển khai ghi nhận 2026-11-01 23:18:42 UTC+07: [Report triển khai](../reports/stitch/B10_20261101_231842_implementation.md). Hai GET analytics/CSV đã được kiểm thử trước khi tích hợp. Các mục review và câu “phiên tài liệu” bên dưới ghi nhận lịch sử lập kế hoạch; kết quả hiện tại xem mục 9.

Cập nhật phạm vi: **2026-11-01 23:02:51 UTC+07**. [Report cập nhật](../reports/stitch/B10_20261101_230251_scope_update.md). Chỉ bổ sung API cho **bộ lọc ngày → biểu đồ doanh thu/vé bán → bảng loại vé → xuất CSV**; các tính năng phụ khác bị loại khỏi kế hoạch triển khai, không còn là blocker.

Báo cáo phiên: [B10_20261101_225108_review_plan.md](../reports/stitch/B10_20261101_225108_review_plan.md). Tài liệu quản lý: [PROJECT_MASTER_PLAN.md](../PROJECT_MASTER_PLAN.md).

## 1. Phạm vi và nguồn đã xác minh

- Chỉ lập kế hoạch, review thiết kế/code và kiểm thử API hiện có. Không thêm/sửa source frontend/backend, database, cấu hình hoặc màn hình khác.
- Đã đọc Master Plan trước Stitch và skill `.agents/skills/eventhub-stitch-review/SKILL.md`. Master Plan ghi B10 có code cần đồng bộ, route `/organizer/events/:id/stats`; mục 4.16 ghi API stats đã tích hợp nhưng chưa mô tả đầy đủ analytics.
- Stitch chính thức: project `10374042969343935993`, tên EventHub, quyền trả về `OWNER`; screen `f174f363ba5f418da3d92ea4a4734ba9`, tên “B10. Phân tích và thống kê sự kiện - Cosmic Ticket Ban Tổ Chức”.
- Metadata screen DESKTOP **2560×4288**; instance canvas **1280×2144**, không nhầm kích thước canvas với ảnh xuất.
- HTML `projects/10374042969343935993/files/9151814127863387894`; ảnh JPEG `projects/10374042969343935993/files/7985848518418969067`. Đã tải bằng MCP `download_file`, đọc HTML và xem ảnh. Không gọi edit-screen/create/generate/update; giữ nguyên artifact.
- Master Plan không có đặc tả riêng từng KPI B10. Chi tiết bên dưới lấy từ ảnh/HTML B10, phân biệt rõ với quyết định triển khai còn đề xuất.
- Yêu cầu đã được người dùng xác định: dùng lại `OrganizerSidebar`, `OrganizerHeader`; thiếu event ID thì chọn bằng `qse-grid`; JSX/TSX và CSS riêng của B10 nằm cùng một file, viết nhiều dòng dễ đọc. Không tạo CSS riêng cho B10; CSS dùng chung hiện có vẫn tái sử dụng.

## 2. Review thiết kế Cosmic Graffiti

Thiết kế gồm hero và bộ chọn sự kiện/thời gian, nút xuất báo cáo/đối soát, bốn KPI, biểu đồ xu hướng cạnh donut hạng vé, ba khối kênh mua/địa lý/lưu lượng cổng, cuối trang là bảng sự kiện hàng đầu và khối hỗ trợ điều phối. Đây là ghi nhận artifact gốc. Khi triển khai áp dụng phạm vi thu gọn đã được người dùng duyệt tại mục 5: chỉ giữ các khối cần thiết, giữ phong cách/token của Stitch; không sửa artifact.

| Thuộc tính | Chuẩn mô tả Cosmic Graffiti | Artifact B10 thực tế | Kết luận |
|---|---|---|---|
| Nền/canvas | `#080B1A` | `background #0f1222` | Khác bảng màu mô tả |
| Surface | `#10162B` | card `surface-container-low #181b2a`, lớp phụ `#1c1f2f` | Khác token mô tả |
| Accent | tím `#7C3AED`, cyan `#22D3EE`, hồng `#F472B6` | tím container `#7c3aed`, secondary `#5de6ff`, tertiary `#ffafd3` | Tím đúng; cyan/hồng là biến thể sinh từ theme |
| Text | `#F8FAFC`, `#94A3B8` | `#e0e1f7`, `#958da1`, `#ccc3d8` | Chưa đo contrast |
| Font | Syne / Be Vietnam Pro / Space Grotesk | Đủ ba font | Phù hợp; JetBrains Mono được tham chiếu riêng nhưng không có trong Google Fonts link |
| Bo góc | cơ sở 8px, card lớn 16px trong mô tả | Tailwind DEFAULT 4px, lg 8px, xl 12px | Không đồng nhất tuyệt đối |

Project hiện tại có chính mâu thuẫn giữa `designMd` phần văn xuôi và palette sinh ra trong frontmatter/theme. B10 khớp palette sinh ra. Ghi **PARTIAL**, không tự đổi toàn bộ màu thành token mô tả khi sao thiết kế.

Vấn đề ngay trong artifact: dùng sự kiện/ngày 2025 và số liệu mẫu; còn thương hiệu Cosmic Ticket/Đội Điều Phối Cosmic; các nhãn REAL-TIME, VN-S1, 14ms, SSL256 chưa có bằng chứng vận hành. Event/date picker là `div` có cursor, sidebar `href="#"`; không có hành vi ứng dụng. Đường biểu đồ minh họa đi xuống dưới mốc 0, không được sao thành dữ liệu doanh thu âm. Ví dụ hạng VIP 520×1.200.000 không khớp chính xác 623,9M hiển thị; không dùng số mẫu để kiểm chứng nghiệp vụ. Chưa xác minh responsive/a11y chỉ từ ảnh desktop.

## 3. Các điểm code hiện tại chưa đạt — lịch sử review toàn bộ artifact

Bảng dưới ghi nhận review 22:51:08, không phải danh sách phải triển khai sau khi thu gọn. Các khối bị loại tại mục 5 không còn là tiêu chí nghiệm thu hoặc dependency.

| Khối thiết kế/yêu cầu | Hiện trạng source | Khoảng thiếu |
|---|---|---|
| Shell Organizer | `Operations.tsx` có back/PageHead/tabs nghiệp vụ | Không dùng sidebar/header chung. `App.tsx` chưa đưa `/stats` vào điều kiện organizer shell |
| Chọn sự kiện | Sidebar chỉ tạo link stats khi có `id`; picker chung có scan/edit/tickets/attendees | Thiếu purpose stats và route picker; ngoài event chỉ hiện span |
| Hero, event/date selector và actions | Không có trong stats tab | Thiếu toàn bộ khối đầu theo Stitch |
| Bốn KPI B10 | `StatCards` duyệt response gồm orders/revenue/sold/checkins | Khác bốn KPI revenue/occupancy/check-in rate/ARPU; thiếu denominator, progress, mục tiêu và so sánh |
| Trend + donut + phase cards | Không có | Thiếu chart, legend, tooltip và mapping dữ liệu |
| Kênh/địa lý/lưu lượng cổng | Không có | Thiếu cả UI và phần lớn dữ liệu |
| Top events + CSAT + hỗ trợ | Không có | Thiếu bảng, tổng, chu kỳ đối soát, support panel |
| Trạng thái | Có Loading và Notice cơ bản | Chưa có empty/retry theo khối, lỗi filter/export, stale data khi đổi event, thông báo cập nhật thật |
| Hợp đồng request | Operations gửi `?page=0&q=` vào stats | Stats không đọc query, không phải API lọc theo thời gian |

Nguồn chính: `client/src/pages/organizer/Operations.tsx`, `OrganizerSidebar.tsx`, `OrganizerHeader.tsx`, `OrganizerEventListPage.tsx`, `client/src/components/ticketing/stat-cards.tsx`, `client/src/App.tsx`. Chỉ đọc, không chỉnh các file này.

## 4. API hiện có và kết quả gọi thật

Môi trường kiểm thử: `http://127.0.0.1:8000/api`; các path dưới đây đã bao gồm prefix `/api`. Dùng tài khoản demo có sẵn qua `POST /api/auth/login` (200), bearer token chỉ trong bộ nhớ. Không seed/tạo đơn/thanh toán/check-in, không gọi mutation đối soát. Login tạo phiên xác thực theo hành vi có sẵn. Không đưa mật khẩu, token, tên/email người mua vào tài liệu.

Route stats: `server/src/app.ts` → `booking.overview` trong `server/src/workflows/booking.ts` → `events.guard` và `orders.summary` trong `server/src/modules/order/infrastructure/store.ts`. Guard cho chủ sự kiện có role ORGANIZER hoặc ADMIN; UUID bắt buộc. Response `{success:true,data:{orders,revenue,sold,checkins}}`, bốn giá trị aggregate trả dạng chuỗi. `orders/revenue/sold` chỉ lấy đơn PAID; `checkins` đếm bản ghi check-in. Hai truy vấn tổng riêng biệt, chưa bảo đảm snapshot thống nhất khi có giao dịch đồng thời.

Event E lấy thực từ picker: `cbe172d3-a06a-42fa-8557-abeb50a4044b`. Type T lấy từ detail: `c0198e6f-6b79-48d6-8cac-f0fd7dce7b21`.

| Request thực tế | Kết quả |
|---|---|
| GET `/api/health` | 200, `success:true,data.status:"ok"` |
| GET `/api/organizer/events?page=0&limit=6` | 200, 6 event; có id/metadata/capacity/sold_quantity/revenue phục vụ picker |
| GET `/api/organizer/events/{id}/stats` cho 6 ID picker | Cả 6 trả 200; 5 toàn số 0, E có orders="1", revenue="150000", sold="1", checkins="0" |
| GET `/api/organizer/events/E` | 200, event + ticketTypes + reviews; T capacity=100, sold_quantity=1; trường giá là `price_amount`, không phải `price` |
| GET `/api/organizer/events/E/orders?page=0&status=PAID` | 200, 1 đơn; tổng total_amount=150000 và total_quantity=1 khớp stats |
| GET `/api/organizer/events/E/order-manager?page=0&group=paid` | 200; summary toàn scope: totalOrders=3, paidOrders=1, revenuePaid="150000", processingOrders=2, closedOrders=0 |
| GET `/api/organizer/events/E/checkins?page=0` | 200, [] khớp checkins=0; log có dữ liệu chưa kiểm |
| GET stats với `fromDate=2099-01-01&toDate=2099-01-31` | 200 vẫn revenue="150000", sold="1": query bị bỏ qua, không lọc |
| GET stats với `fromDate=bad&toDate=bad` hoặc `page=-1` | 200 và cùng dữ liệu; không có query validation cho stats |
| GET order-manager với `page=0&group=paid&fromDate=2099-01-01&toDate=2099-01-31` | 200, summary toàn số 0 |
| GET order-manager với `page=0&group=paid&fromDate=bad` | 400 VALIDATION |
| GET stats không token / Organizer khác / Customer / Admin | 401 / 403 / 403 / 200; Admin nhận cùng aggregate |
| GET stats ID `not-a-uuid` | 400 VALIDATION |
| GET stats UUID `00000000-0000-4000-8000-000000000000` | 404 NOT_FOUND |

`E` trong bảng là ID trên, không phải request literal. Sáu ID thử stats: `1c403640-c361-43ff-96c8-1cbcaaaf67ea`, `f52b7717-1703-4888-a588-1fe6544f6b85`, `85f68a39-f324-478a-99ed-9ac0e5afa7ef`, E, `f3c0455d-c1b6-4237-95ce-b5561be7d4d6`, `8bd97807-2e05-4cc4-978a-659ffb42d6a8` (capacity=0).

Order-manager có item snapshot/giá/số lượng và ngày lọc, có thể là dữ liệu tham chiếu để mở rộng analytics. Nhưng lọc hiện tại dựa trên **created_at của đơn**, không đồng nghĩa doanh thu theo ngày thanh toán; summary không thay đổi theo group thành chỉ một tập đơn. Không ghép một trang tối đa50 đơn thành tổng doanh thu hay cơ cấu toàn kỳ. `ticketTypes.reviews` không phải contract: `reviews` ở cấp event là lịch sử phê duyệt, không phải CSAT khách hàng.

Kết luận kiểm thử: request cơ bản đúng UUID/quyền, aggregate khớp một mẫu giao dịch thật. **Không đủ kết luận API phục vụ toàn bộ B10**; UI chưa truyền bộ lọc thời gian và backend stats cũng không hỗ trợ. Chưa kiểm multi-page/large data/concurrency, hoàn tiền, nhiều hạng vé, log không rỗng hoặc DB đối chứng trực tiếp.

## 5. Phạm vi được duyệt — chỉ bổ sung bốn chức năng API

Quyết định người dùng ngày 2026-11-01: “chỉ bổ sung api cho các chức năng bộ lọc ngày → biểu đồ doanh thu/vé bán → bảng loại vé → xuất CSV còn những chức năng còn lại thì loại bỏ”.

### 5.1. Thành phần nền giữ lại, dùng API hiện có

- Chọn/đổi sự kiện bằng `qse-grid`, sidebar và header Organizer dùng chung; route nội dung giữ nguyên.
- Ba KPI cơ bản toàn kỳ: doanh thu đơn PAID, vé bán/sức chứa, check-in/số vé bán. Dùng stats/detail/list đã có; ghi nhãn **Toàn sự kiện**, không để bộ lọc ngày tạo cảm giác các KPI này đã lọc.
- Tỷ lệ check-in ở đây là tỷ lệ **vé**, không phải số khách duy nhất; mẫu số 0 hiển thị “—”. Không bổ sung ARPU.
- Loading, empty, error/retry, quyền truy cập, thời điểm cập nhật và responsive/a11y vẫn là yêu cầu chất lượng.
- Không xây thêm API nghiệp vụ cho các thành phần nền này trong phạm vi B10.

### 5.2. Bốn chức năng cần bổ sung API

| Chức năng | Phạm vi dữ liệu và hành vi |
|---|---|
| Bộ lọc ngày | `fromDate/toDate` dạng YYYY-MM-DD theo Asia/Ho_Chi_Minh; mặc định 30 ngày gồm hôm nay; server đổi sang [đầu ngày from, đầu ngày sau to). Kiểm ngày hợp lệ và from≤to; ngày tương lai trả dữ liệu rỗng nếu không có giao dịch. Áp dụng chart/bảng/CSV, không thay đổi KPI toàn kỳ |
| Biểu đồ doanh thu/vé bán | Tổng doanh thu PAID và số vé theo **ngày thanh toán thành công**, không theo ngày tạo đơn; bucket ngày không có giao dịch phải có giá trị0; trả timezone/range/asOf và tổng kỳ. Không thêm phase/campaign/mục tiêu/tăng trưởng |
| Bảng loại vé | Loại vé, sức chứa hiện tại (ghi rõ toàn sự kiện), vé bán trong kỳ, doanh thu trong kỳ; group theo ID loại vé, dùng quantity/line_total snapshot của đơn PAID thuộc kỳ. Giữ các hạng có giao dịch kể cả archived; không nhân giá hiện tại với số vé để suy ra doanh thu |
| Xuất CSV | Backend xuất báo cáo của đúng sự kiện và cùng bộ lọc/nghiệp vụ với chart/bảng; gồm tổng kỳ, series ngày, bảng loại vé. UTF-8 hỗ trợ tiếng Việt, escape dấu phẩy/quote/newline, bảo vệ ô text khỏi spreadsheet formula injection; không xuất PII. Không bổ sung PDF/Excel |

**Contract đề xuất, chưa tồn tại/chưa kiểm thử:** hai GET dưới prefix `/api`, chia sẻ cùng service tổng hợp và validation:

- `GET /organizer/events/:id/analytics?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`: envelope success/data với `eventId, asOf, timezone, range, totals, dailySeries, ticketTypes`.
- `GET /organizer/events/:id/analytics/export.csv?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`: `text/csv; charset=utf-8`, Content-Disposition attachment; lỗi dùng JSON contract chung. Không đổi contract legacy `/stats`.

Mỗi GET phải kiểm UUID/owner Organizer hoặc Admin, tổng hợp toàn bộ dữ liệu phù hợp thay vì một trang50đơn, trả amount dưới dạng chuỗi số nguyên. Chọn một lần thanh toán thành công chuẩn cho mỗi đơn để không cộng trùng retry/webhook; xác minh trường thời điểm canonical trước implementation. Chỉ cộng đơn hiện PAID; không xây nghiệp vụ doanh thu ròng/hoàn tiền mới. Nếu tổng order khác tổng line items phải điều tra và xác định cách phân bổ trước khi nghiệm thu, không tự cân bằng bằng số giả.

Analytics JSON cần snapshot nhất quán trong một request. CSV dùng cùng logic và trả asOf riêng; không hứa hai request ở thời điểm khác nhau có snapshot giống nhau. Khi không có giao dịch mới, tổng kỳ = tổng dailySeries = tổng doanh thu/quantity của bảng loại vé = tổng CSV.

### 5.3. Loại khỏi UI triển khai và kế hoạch API B10

- ARPU/unique customer; mục tiêu doanh thu, tăng trưởng, so sánh năm trước/kỳ trước.
- Donut riêng và phase/campaign cards; dùng bảng loại vé thay khối cơ cấu phức tạp.
- Kênh mua vé/conversion/CAC/ROI/UTM.
- Địa lý/tuổi/mobile analytics.
- Gate traffic theo giờ/cổng, tốc độ/lỗi quét, thiết bị/active lanes/latency.
- Top events, ranking, CSAT.
- Nút đối soát, kỳ settlement và API đối soát Organizer; không gọi Admin SePay reconcile.
- Khối hỗ trợ điều phối/contact/staff trực; REAL-TIME/Live Gate, VN-S1, SSL256 và số liệu vận hành mẫu. Với sidebar dùng chung, ưu tiên prop `hideLiveSync` hiện có thay vì thay component cho các màn khác.
- PDF/Excel và các analytics ngoài bốn chức năng đã duyệt.

Đây là điều chỉnh phạm vi đã được người dùng duyệt, không phải tính năng chờ API ở vòng này. Không thêm placeholder cho các khối bị loại, không sửa/xóa API hoặc trang khác đang dùng chúng. Artifact Stitch giữ nguyên; khi triển khai chỉ giữ các phần phù hợp với phạm vi này.

## 6. Kế hoạch triển khai sau phiên tài liệu

### Bước 1 — Hoàn thiện contract bốn chức năng đã duyệt

- Dùng đặc tả mục 5.2 làm giới hạn API; xác minh timestamp thanh toán canonical, group type và tổng tiền snapshot trong source trước implementation.
- Giữ KPI cơ bản toàn kỳ và nhãn phạm vi rõ ràng; chỉ chart/bảng/CSV nhận filter ngày. Không mở rộng API cho các chức năng đã loại.
- Orders/Event/Payments giữ ownership; aggregation qua public interface, snapshot nhất quán, không join vượt boundary tùy tiện.
- Hai GET analytics/export là đề xuất trong kế hoạch; chỉ được đánh dấu tồn tại sau khi triển khai và kiểm thử thật.

### Bước 2 — Xác minh backend trước UI

- Chỉ triển khai backend trong nhiệm vụ được giao sau; phiên hiện tại không sửa backend.
- Kiểm thử endpoint thực, envelope, UUID/quyền tenant, ngày sai/đảo/ngày tương lai và dữ liệu rỗng; lưu status/response đã loại thông tin cá nhân.
- Dữ liệu kiểm thử riêng: ít nhất hai Organizer, nhiều hạng vé/giá lịch sử, hơn50 đơn, PAID/PENDING/CANCELLED, check-in, capacity0 và ranh giới UTC+7; so tổng độc lập với order/payment/item/ticket.
- Chỉ đánh dấu API READY khi route đang chạy đúng contract; phân biệt source với Docker/local/Live. Không sửa container hoặc rollout trong phiên tài liệu.

### Bước 3 — Luồng sự kiện và shared shell

- Route nội dung giữ `/organizer/events/:id/stats`.
- Đề xuất picker `/organizer/events/stats`, thêm purpose `stats` vào `OrganizerEventListPage` ở phiên triển khai; khai báo route cụ thể trước generic `:id`/`:tab`.
- Không có id: sidebar mở picker, không tự chọn event đầu. Picker dùng `qse-grid`/`qse-card`, API list đúng chủ sở hữu, phân trang6, loading/empty/error/retry. Không giới hạn chỉ PUBLISHED vì báo cáo cần xem cả sự kiện đã kết thúc.
- Chọn card → đúng ID stats. Có id → sidebar vào thẳng stats; selector/đổi sự kiện quay picker. ID không hợp lệ/sai chủ phải hiển thị lỗi, không fallback sang event khác.
- Dùng `OrganizerSidebar active="Thống kê doanh thu"`, `OrganizerHeader title="Báo cáo phân tích"`; xử lý menu mobile giống trang hiện có và bổ sung nhận diện shell trong App cho stats. Không copy sidebar/header từ HTML Stitch.

### Bước 4 — Sao nội dung Stitch sang TSX

- Dự kiến `ReportPage.tsx` trong thư mục organizer: import → type/helper → component/state/data → JSX nhiều dòng → CSS scope `.b10-*` cùng file qua `<style>`. Tên file là đề xuất, chưa tạo source.
- Không tạo `report.css`; không gom/sửa CSS dùng chung. Không nén JSX/CSS thành một dòng; có thể dùng component con nội bộ cùng file để dễ đọc.
- Bố cục đã duyệt: chọn sự kiện → ba KPI toàn kỳ → bộ lọc ngày → chart doanh thu/vé bán → bảng loại vé → xuất CSV. Giữ token/spacing/font của vùng Stitch được tái sử dụng; bỏ các khối mục 5.3, không sửa artifact.
- SVG/chart phải vẽ từ series thật, có legend/tooltip/bảng thay thế; không sao path và số liệu mẫu. Type/nhãn động theo dữ liệu thật, không hard-code VIP/VVIP/GA hay tháng3/2025.
- Dùng API client/auth hiện có; khi đổi event/kỳ bỏ response cũ, reset lỗi, ngăn stale response. Hiển thị thời điểm cập nhật thật; không gắn REAL-TIME với polling chưa triển khai.
- Selector dùng control có label, focus và keyboard; link nội bộ dùng Router. Export có pending/error, tránh bấm lặp. Thiếu contract thì dừng tích hợp chức năng liên quan, ghi blocker.

### Bước 5 — Nghiệm thu và tài liệu

- So ảnh Stitch desktop và browser1440/1024/768/390, không tràn ngang ngoài vùng bảng cho phép; shared shell, qse-grid, điều hướng và back hoạt động.
- Kiểm các trạng thái loading/zero/empty/error/retry/forbidden/not-found, đổi event nhanh, filter ngày, pagination picker và dữ liệu cập nhật.
- Đối chiếu totals/series/bảng loại vé/CSV theo cùng kỳ và logic; tách KPI toàn kỳ. Kiểm timestamp payment khác ngày tạo đơn, retry không đếm trùng, archived type, zero-day, CSV tiếng Việt/escaping/formula injection, hơn50đơn; decimal/BigInt không mất chính xác và UTC+7 đúng.
- Keyboard/focus/label/contrast và nội dung thay thế chart; giảm motion nếu có animation.
- Chạy build/lint và tests phù hợp **khi có sửa source**, không cần chạy build trong phiên chỉ tài liệu này.
- Mỗi lần sửa phải thêm nhật ký vào file này, tạo report mới `docs/reports/stitch/B10_<timestamp>_<action>.md`, cập nhật đúng B10 trong Master Plan. Không ghi đè report cũ.

## 7. Điều kiện hoàn thành

Chỉ kết luận B10 ĐẠT khi có bằng chứng giao diện tuân thủ phạm vi thu gọn tại mục 5 và phong cách artifact, shell/picker được tái sử dụng, API đủ và được gọi thật, số liệu đối chiếu đúng, tương tác/responsive/a11y đạt. Bản kế hoạch này không xác nhận đã triển khai hay đã hoàn thiện backend.

## 8. Nhật ký thay đổi bắt buộc

| Thời điểm UTC+07 | Thao tác thực tế | Kết quả và báo cáo |
|---|---|---|
| 2026-11-01 22:51:08 | Tạo kế hoạch Feature_B10_Report.md; tạo report phiên mới; cập nhật B10 mục4.16,5.2,5.4 và ghi chú6.F Master Plan | Đã xem HTML/ảnh Stitch giữ nguyên; HTTP stats/list/detail/orders/checkins/order-manager và quyền đã thử. Code hiện tại KHÔNG ĐẠT; tích hợp đủ BLOCKED; [report](../reports/stitch/B10_20261101_225108_review_plan.md) |

| 2026-11-01 23:02:51 | Cập nhật plan chỉ bổ sung API date filter/chart/bảng loại vé/CSV; loại các analytics phụ; cập nhật đúng B10 Master Plan và tạo report mới | Phạm vi thu gọn đã duyệt, chưa sửa source hoặc gọi lại API/Stitch; [report](../reports/stitch/B10_20261101_230251_scope_update.md) |
| 2026-11-01 23:18:42 | Triển khai Order analytics adapter/Payment outcome port/workflow và2GET; ReportPage TSX+CSS, route/sidebar/picker; thêm integration/Chrome tests, evidence và cập nhật Master Plan | 37HTTP+snapshot, Chrome3/3 ở4viewport, build/lint/boundaries/ownership/B6 regression PASS; xem lại Stitch giữ nguyên; [report](../reports/stitch/B10_20261101_231842_implementation.md) |

Mọi sửa đổi sau phải ghi thêm dòng, nêu rõ file/phạm vi và liên kết report mới; không coi dòng này là ủy quyền sửa source hoặc bỏ tính năng.

## 9. Kết quả thực hiện kế hoạch

- Đã tạo `ReportPage.tsx`, CSS scope cùng file; dùng sidebar/header và picker `qse-grid` có purpose stats. Route picker `/organizer/events/stats`, nội dung `/organizer/events/:id/stats`.
- API thực: `GET /api/organizer/events/:id/analytics` và `GET /api/organizer/events/:id/analytics/export.csv`; query fromDate/toDate, default30ngày, tối đa366ngày, UTC+7. Legacy stats giữ nguyên.
- Ngày doanh thu lấy đúng canonical `paid_payment_id` → `payments.succeeded_at`. Chỉ PAID, không cộng retry; Order/Payment giữ ownership qua public interface. Type revenue từ line_total snapshot, không lấy giá hiện tại. Thiếu outcome hoặc tổng item/đơn sai trả409.
- Ba KPI cơ bản toàn kỳ; sức chứa gồm các hạng đã lưu trữ, đã có nhãn giải thích. Chart/bảng/CSV theo khoảng ngày. JSON và CSV từng request có snapshot/asOf riêng.
- Kiểm chứng trên PostgreSQL17 test riêng port55450/API8020/Vite5190:60đơnPAID/120successful attempts,7.770.000đ/60vé; PENDING/CANCELLED bị loại;2hạng vé/giá lịch sử/archived; boundary UTC+7/zero-day;37HTTP/quyền/validation/CSV và snapshot concurrency PASS.
- Chrome3tests PASS: bốn viewport1440/1024/768/390, filter/download thật/picker/menuESC/rỗng/lỗi/retry/stale response. Mobile chart/table cuộn ngang kèm chỉ dẫn; bảng ngày thay thế cho chart.
- Build server/client, lint phần thay đổi, boundaries, ownership2tests và B6 regression1test PASS. Có warnings bundle/Browserslist cũ.
- Còn lại: chưa rollout Docker8000/Live, full a11y/screen reader/contrast/browser khác, benchmark dữ liệu lớn, check-in dương và mở CSV thủ công trong Excel/LibreOffice. Không coi các chức năng đã loại là blocker.
- [Report](../reports/stitch/B10_20261101_231842_implementation.md), [API evidence](../reports/stitch/evidence/B10_20261101_implementation/api.json), [desktop](../reports/stitch/evidence/B10_20261101_implementation/report-1440.png), [mobile](../reports/stitch/evidence/B10_20261101_implementation/report-390.png).
