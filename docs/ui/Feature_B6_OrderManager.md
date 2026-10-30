# Feature B6 — Quản lý đơn hàng

- Thời điểm lập: 2026-10-30 23:05:24 (Asia/Ho_Chi_Minh, UTC+07:00).
- Trạng thái: `ĐẠT CÓ ĐIỀU KIỆN` trên backend/Vite/DB test cô lập; frontend B6 đã triển khai, cổng backend 8000 chưa có API mới.
- Nguồn: [Master Plan](../PROJECT_MASTER_PLAN.md), [skill](../../.agents/skills/eventhub-stitch-review/SKILL.md), [báo cáo phiên](../reports/stitch/B6_20261030_230524_review_plan.md).
- Stitch chính thức: project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`, DESKTOP 2560×3158.
- Tiêu đề metadata: “B6. Quản lý đơn hàng - Cosmic Ticket Ban Tổ Chức”; tiêu đề nội dung: “Quản lý đơn hàng & Giao dịch vé”.

**Phạm vi hiện hành (2026-10-30 23:27:50):** chỉ bổ sung API cho KPI/số lượng tabs, lọc ngày và tìm email, bảng đơn đầy đủ, preview/in QR. **Mục 11–14 là kế hoạch thực hiện và nghiệm thu hiện hành**, thay cho các đầu việc rộng hơn trong mục 7–8. Mục 3–10 giữ bằng chứng review lịch sử; chức năng bị loại khỏi phạm vi không còn là điều kiện chặn nghiệm thu đợt này.

**Cập nhật API 2026-10-30 23:52:10 UTC+7:** hai GET ở mục 11.2 đã triển khai và chạy trên build mới với DB test cô lập. Kết quả/giới hạn kiểm thử xem mục 14.3 và [report API](../reports/stitch/B6_20261030_235210_api_implementation.md). Frontend B6 và in thực tế chưa làm.

**Cập nhật giao diện 2026-10-31 00:14:31 UTC+7:** route B6 riêng và trang TSX chứa CSS đã triển khai; browser/API test cô lập 1440/1024/768/390, đổi event và PDF A4 đạt. Cổng local 8000 vẫn trả 404 cho route mới; xem mục 14.4 và [report frontend](../reports/stitch/B6_20261031_001431_frontend_implementation.md).

**Kiểm tra Docker 2026-10-31 00:27:21 UTC+7:** `pbl6-api-1` hiện vẫn dùng image cũ không có hai route B6. Image ứng viên `eventhub-b6-candidate:20261031` đã build và chứa API/frontend mới, **chưa được triển khai** lên cổng 8000; xem mục 14.5 và [report Docker](../reports/stitch/B6_20261031_002721_docker_runtime_review.md).

## 1. Phạm vi và quyết định đã xác nhận

Người dùng đã xác nhận chọn **B6 — Quản lý đơn hàng, dùng sidebar Organizer** sau khi được thông báo mâu thuẫn mã màn hình. Yêu cầu ban đầu gọi B6 là trạng thái thanh toán và chuyển đến ngay sau Checkout thuộc A7 theo Master Plan và source hiện tại. Không đưa redirect từ Checkout sang B6: người mua không được điều hướng tự động vào khu vực Organizer. A7 và code Checkout giữ nguyên trong phiên này.

Phiên lập kế hoạch ban đầu chỉ tạo tài liệu này, báo cáo mới và cập nhật mục B6 trong Master Plan; không chỉnh source frontend/backend hoặc Stitch ở phiên đó. Phiên API sau đã chỉnh backend theo yêu cầu mới, xem mục 14.3. Không gọi `edit_screens`, không tạo bản thiết kế trùng.

Phiên triển khai mới đã sao chép giao diện B6 theo Stitch và phạm vi được chọn, tái sử dụng `OrganizerSidebar` với `active="Đơn hàng"`. JSX và CSS riêng của trang nằm chung trong `OrderManagerPage.tsx`, CSS khai báo trong module và render qua `<style>` với selector `.b6-*`; không có file CSS riêng. CSS sidebar vẫn thuộc component dùng chung.

## 2. Yêu cầu đã có trong Master Plan

- Mục 5.2: B6 là Quản lý đơn hàng, route `/organizer/events/:id/orders`; hiện có code, cần đồng bộ.
- Mục 4, dòng 13: chức năng đơn hàng phía Organizer đang ở `Operations.tsx`, gọi `GET /organizer/events/:id/orders`; còn đồng bộ B6/B7, kiểm tra phân trang/bộ lọc.
- Mục 2.3: Cosmic Graffiti, Syne cho tiêu đề, Be Vietnam Pro cho nội dung, Space Grotesk cho nhãn/dữ liệu.
- Mục 7: dữ liệu dashboard phải là dữ liệu thật; thanh toán thành công mới phát hành vé, thất bại không được hiển thị vé hợp lệ; quyền truy cập phải đúng vai trò.
- Master Plan không mô tả chi tiết mọi hành động trong bản Stitch. Các hành động dưới đây là inventory từ thiết kế, chưa đồng nghĩa đã có API hoặc đã được duyệt mở rộng backend.

## 3. Nguồn thiết kế đã kiểm tra

Đã dùng `get_project`, `get_screen` và `download_file` đọc HTML, xem ảnh B6. HTML file `7004176431460157052`; ảnh file `8369068700193780000`. Metadata screen 2560×3158; ảnh tải về 1920×2368. Không dùng kích thước ảnh tải làm kích thước CSS viewport mặc định.

URL tải trực tiếp từng trả HTTP 401; tải qua MCP `download_file` đã thành công. Đây không còn là trở ngại truy cập. Không có ảnh chụp browser của code hiện tại trong phiên này; so sánh code dựa trên source, so sánh thiết kế dựa trên HTML và ảnh Stitch.

Thứ tự bố cục cần tái hiện:

1. Sidebar trái 16rem dùng chung, header Organizer cao 4rem: breadcrumb, tìm kiếm, tạo sự kiện, thông báo, danh tính.
2. Tiêu đề, nhãn đồng bộ, chọn sự kiện; nút Đối soát ngân hàng và Xuất báo cáo Excel/CSV.
3. Năm KPI: Tổng đơn hàng; Doanh thu ghi nhận; Thành công và tỷ lệ; Đang xử lý; Hủy / Thất bại.
4. Tabs trạng thái; tìm kiếm mã/tên/điện thoại/email; khoảng ngày, cổng thanh toán, lọc nâng cao, làm mới.
5. Bảng gồm checkbox, mã đơn & thời gian, khách hàng, sự kiện & hạng vé, số tiền & cổng thanh toán, thanh toán, trạng thái vé, thao tác.
6. Chọn 10/25/50/100 bản ghi, tổng kết quả, phân trang có số trang.
7. Hai panel cuối: preview vé và thao tác in/gửi email; nhật ký webhook & đối soát ngân hàng.

## 4. Đối chiếu Cosmic Graffiti và lỗi artifact

| Hạng mục | Bằng chứng và kết luận | Quy tắc thực hiện |
|---|---|---|
| Font | HTML dùng Syne, Be Vietnam Pro, Space Grotesk; phù hợp phân vai font | Dùng font đã có trong build, không chép CDN/script Tailwind từ HTML |
| Màu | Artifact: background/surface `#0f1222`, surface-low `#181b2a`, primary `#d2bbff`, primary-container `#7c3aed`, secondary `#5de6ff`, text `#e0e1f7` | Giữ palette artifact khi copy; không tự thay bằng palette mô tả |
| Mâu thuẫn token | Mô tả Cosmic Graffiti dùng nền `#080B1A`, card `#10162B`, cyan `#22D3EE`, chữ `#F8FAFC`; theme sinh tự động trong project khác phần mô tả | Ghi nhận sai lệch; đổi token cần xác nhận riêng |
| Bo góc | HTML cấu hình DEFAULT 4px, lg 8px, xl 12px; mô tả design system có cơ sở 8px và card 16px | Bám lớp thực tế của B6, không sửa toàn hệ thống |
| Khả năng đọc | Ảnh Stitch có doanh thu bị cắt thành dấu ba chấm; header/cột cuối bảng chật, nhãn ngày/cổng thanh toán cắt; tiêu đề preview vé va vào mã; brand sidebar chỉ thấy EVENT, badge BTC xuống dòng | Là lỗi artifact cần quyết định xử lý trước nghiệm thu; không tự sửa thiết kế trong phiên lập kế hoạch |
| Nội dung | Có dữ liệu cá nhân mẫu, năm 2025, QR SVG mô phỏng, log mẫu, PORT 8089/TCP và khẳng định Escrow đã khớp | Dữ liệu động lấy API đã xác minh; không mang dữ liệu mẫu/QR/log/cam kết vận hành vào production |
| Trạng thái | Tabs mô phỏng thất bại/hoàn tiền, MoMo/Visa; nhãn Hủy / Thất bại gồm cả hoàn tiền | Cần quy tắc mapping nghiệp vụ thật; không suy diễn từ màu hoặc tên tab |

## 5. Điểm chưa đạt của code trước phiên triển khai frontend

| ID | Finding có bằng chứng trong repo | Ưu tiên / hướng xử lý dự kiến |
|---|---|---|
| B6-01 | `Operations.tsx` render back link, PageHead và tabs; không render `OrganizerSidebar` | P0: dùng lại sidebar hiện có, active Đơn hàng |
| B6-02 | `App.tsx` chỉ bật shell Organizer riêng cho dashboard/new/qr-scan/tickets/checkin; orders đi route động `:tab` | P0: dự kiến route riêng cho orders trước route động và điều kiện shell chính xác; giữ các tab khác |
| B6-03 | Bảng hiện tại chỉ có đơn hàng, người mua, tổng tiền, trạng thái; thiếu thời gian/email/hạng vé/provider/trạng thái vé/thao tác/checkbox so với Stitch | P1: tái hiện bảng 8 cột, xác minh dữ liệu từng ô |
| B6-04 | Không có header Organizer theo B6, event switcher, 5 KPI, tabs có số lượng và hai panel cuối | P1: giữ vị trí/hình thức theo Stitch; thiếu dữ liệu là dependency, không hard-code |
| B6-05 | Client chỉ gửi `page`, `q`; không gửi `status`, ngày hoặc provider. Placeholder nói mã vé, nhưng query order chỉ tìm mã đơn/tên người mua | P1: xác minh contract, nhãn tìm kiếm phải đúng khả năng thật |
| B6-06 | Pager chỉ suy ra trang sau bằng `length === 50`, không có tổng kết quả/số trang/chọn kích thước | P1: cần contract metadata; không suy tổng từ 50 dòng |
| B6-07 | Click mã đơn dẫn tới `/checkout/:id` của người mua, chưa có hành vi chi tiết đơn hàng Organizer phù hợp | P0: không dùng buyer Checkout thay B7; ghi dependency B7, không triển khai B7 trong phiên này |
| B6-08 | Có Loading/Notice cơ bản nhưng bảng không có thông báo empty riêng, chưa có retry B6/selection/disabled theo hành động | P1: bổ sung tiêu chí trạng thái, quyền và vòng đời request |
| B6-09 | Không có chức năng export/đối soát/gửi lại vé/in/hóa đơn/log trong trang hiện tại | P0 API dependency: không thêm nút giả hoạt động, không gọi API admin bằng phiên Organizer |
| B6-10 | Chưa có bằng chứng browser đối chiếu pixel, responsive, keyboard/screen reader cho B6 | P1: kiểm tra runtime trước nghiệm thu, không suy PASS từ ảnh Stitch |

Không khẳng định lỗi responsive hoặc contrast của frontend đã được tái hiện; hai nội dung này chưa kiểm thử runtime.

## 6. Inventory API và khoảng trống hợp đồng

Các đường dẫn dưới đây có prefix `/api` khi gọi HTTP, do `app.use("/api", api)`. Inventory ban đầu đã được kiểm tra sâu hơn ở mục 10 ngày 2026-10-30 23:12:54: có smoke HTTP không đăng nhập và kiểm tra logic source; chưa có response B6 authenticated, không có tích hợp mới.

| API / nguồn | Hợp đồng đã thấy | Kết luận cho B6 |
|---|---|---|
| `GET /api/organizer/events/:id/orders` — `server/src/app.ts` | `protect` + `events.guard`; nhận `page`, `status`, `q`; `orders.list(null,eventId,page*50,status,q)` | Có source, cần kiểm chứng HTTP có xác thực/ownership trước tích hợp |
| `order/infrastructure/store.ts:list` | Array order, tối đa 50, sắp `created_at DESC,id`; tìm `order_code`/`buyer_name_snapshot`; không tìm email/điện thoại; không trả total/pages/items/payment/tickets join | Thiếu dữ liệu cho bảng đầy đủ, KPI và pagination; không lọc chỉ trên trang hiện tại rồi coi là kết quả toàn tập |
| Ngày / provider | Store nhận from/to nhưng route orders không truyền; route chưa truyền provider/page size | UI bộ lọc và chọn 10/25/50/100 chưa có contract trực tiếp tương ứng |
| `GET /api/organizer/events/:id` và `GET /api/organizer/events` | Nguồn event hiện dùng trong Operations/Organizer | Dùng để xác minh event hiện tại và event switcher; không dùng event mẫu |
| `GET /api/organizer/events/:id/stats` | `booking.overview` → `orders.summary`: orders/revenue/sold cho đơn `PAID` | Không đủ 5 KPI tổng mọi trạng thái, trend, kỳ thanh toán, count từng tab |
| `GET /api/me/orders/:id` | **Đính chính sau kiểm tra workflow:** `booking.detail` cho buyer hoặc `events.guard` (ADMIN/chủ event có role ORGANIZER); trả order/event/items/active payment/latest payment | Đã có khả năng đọc chi tiết cho Organizer ở source, dù tên route `/me`; không đồng nghĩa dùng trang Checkout làm B7. Chưa có ticket summary/payment canonical đầy đủ |
| `GET /api/me/order-history/:id` | `createOrderHistory.detail` bắt buộc buyer_id bằng userId | Không dùng để đọc đơn khách hàng bằng phiên Organizer; khác quyền của `/me/orders/:id` |
| `POST /api/admin/sepay/reconcile` | Hành động admin, có kiểm tra ADMIN | Không có quyền tương đương cho Organizer; không nối nút B6 vào API này |
| Gửi lại email/vé, hóa đơn VAT, xuất Excel/CSV, webhook audit, refund | Đã rà route và logic liên quan ở mục 10; chưa có API Organizer tương ứng; đối soát/log tồn tại cho ADMIN, không có luồng hoàn tiền thực | Dependency backend/quyền; CSV và in có thể xử lý frontend khi có đủ dữ liệu hợp lệ, không bắt buộc API tạo file riêng |

Trước triển khai: thống nhất contract đủ cho customer snapshots, order items, provider/payment canonical, trạng thái vé thực tế, tổng/breakdown, bộ lọc và phân trang. Không đồng nhất `PAID` với việc QR đã phát hành khi chưa có dữ liệu vé; không gộp CANCELLED/EXPIRED thành lỗi payment tùy ý; không tự suy ra hoàn tiền. Không thêm MoMo/Visa hay hoạt động Escrow khi chưa có nguồn thật.

## 7. Kế hoạch triển khai cho phiên được giao sau

Kế hoạch ban đầu trước khi chốt giảm phạm vi; khi triển khai dùng mục 11–14 bên dưới.

1. Chốt các sai lệch artifact và khả năng API: giữ Stitch nguyên bản; phần thiếu API phải được giải quyết hoặc có quyết định giảm phạm vi rõ ràng trước khi nối hành vi. Chưa tự coi disabled/ẩn thành phần là ngoại lệ được duyệt.
2. Tải lại B6 bằng MCP và xem ảnh/HTML; lập bảng ánh xạ chính xác token, kích thước, asset. Dùng lại sidebar hiện có, không sửa các trang Organizer khác.
3. Kiểm chứng runtime API chỉ đọc bằng môi trường phát triển và tài khoản hợp lệ: method/path/query/envelope, 200, 401, sai owner, event rỗng, lỗi validation; ghi response đã loại dữ liệu nhạy cảm. API thiếu/sai/không chạy thì dừng tích hợp phần đó, ghi BLOCKED.
4. Dựng một module trang B6 chứa JSX + CSS riêng, selector `.b6-order-manager...`; không thêm stylesheet B6. Route orders riêng có Guard Organizer/Admin; shell/layout scoped cho orders, không ảnh hưởng route động khác.
5. Nối event selector, bộ lọc server và pagination đã xác minh; reset trang khi đổi event/filter, tránh response cũ ghi lên event mới. KPI tính toàn tập đúng phạm vi; dữ liệu khách hàng và tiền theo snapshot/API, giờ Asia/Ho_Chi_Minh.
6. Mọi thao tác cần có contract/quyền/loading/error/disabled rõ ràng; không thực hiện reconcile, refund, resend, export bằng dữ liệu giả. Chi tiết đơn B7 chỉ nối khi route/API riêng đã được xác minh, không dựng lại B7 trong B6.
7. Kiểm tra và báo cáo kết quả: build theo script client, lint phần thay đổi, browser so ảnh Stitch và các luồng B6 thực tế. Tạo report phiên mới, cập nhật tài liệu này bằng nhật ký và Master Plan; không ghi đè report phiên cũ.

## 8. Tiêu chí nghiệm thu

Checklist ban đầu cho toàn artifact; tiêu chí thành công của phạm vi đã chọn nằm tại mục 14.

- Bám bố cục/typography/palette B6; ngoại lệ có xác nhận và report, không tự sửa Stitch.
- Sidebar dùng đúng `OrganizerSidebar`, active Đơn hàng; không có header/footer Customer chồng shell Organizer.
- Bảng/KPI/filter/pagination/event selector dùng dữ liệu thật đúng hợp đồng và quyền; không còn link mã đơn đưa Organizer sang buyer Checkout.
- Phân biệt order/payment/ticket status; không hiển thị QR giả, log mẫu hoặc khẳng định tài chính không có bằng chứng.
- Loading ban đầu/refetch, empty, không có event, lỗi/retry, 401/403/404, disabled và chống thao tác lặp được kiểm tra phù hợp.
- JSX và CSS riêng của B6 trong cùng một `.tsx`; CSS scoped; sidebar giữ tài nguyên dùng chung hiện có.
- Browser 1440/1024/768/390: bảng được xem đủ cột bằng cuộn phù hợp, không mất CTA/giá trị; keyboard, focus, label tìm kiếm, checkbox/nút icon và thông báo trạng thái có thể sử dụng.
- Kiểm thử tìm mã/tên và trường được API hỗ trợ, đổi trạng thái/event/ngày, trang đầu/cuối, >50 đơn, owner khác, event rỗng, dữ liệu tiền dài; xác minh số tổng không bị lấy từ trang hiện tại.
- Build/lint phù hợp đạt; không chạy giao dịch tiền thật chỉ để kiểm tra UI nếu chưa được giao riêng.

Tại phiên lập kế hoạch 23:05:24, chưa đánh dấu tiêu chí triển khai nào là hoàn tất: source lúc đó **KHÔNG ĐẠT**, artifact Stitch **ĐẠT MỘT PHẦN** và chưa có nghiệm thu runtime. Kết quả mới nhất nằm ở mục 14.4.

## 9. Nhật ký bắt buộc cho mọi chỉnh sửa tài liệu này

| Thời điểm UTC+7 | Thao tác | Báo cáo / kết quả |
|---|---|---|
| 2026-10-30 23:05:24 | Tạo kế hoạch B6; ghi nhận xác nhận đúng màn hình, inventory thiết kế/API, gaps, sidebar dùng chung và JSX/CSS cùng file; cập nhật B6 trong Master Plan | [Báo cáo review & plan](../reports/stitch/B6_20261030_230524_review_plan.md); chỉ tài liệu, chưa sửa source/Stitch |
| 2026-10-30 23:12:54 | Kiểm tra sâu route → workflow → public module → SQL/schema; đính chính quyền đọc `/me/orders/:id`, phân loại từng chức năng Stitch; 7 kiểm tra source cô lập PASS, health8000 200/protected401; cập nhật B6 Master Plan | [Báo cáo kiểm tra backend](../reports/stitch/B6_20261030_231254_backend_capability_review.md); không sửa source, chưa kiểm chứng authenticated runtime |
| 2026-10-30 23:27:50 | Chốt kế hoạch API cho 4 nhóm chức năng được chọn; thêm contract, thứ tự triển khai, test matrix, bảng kết quả và tiêu chí thành công; các chức năng còn lại bỏ qua | [Báo cáo lập kế hoạch API](../reports/stitch/B6_20261030_232750_api_extension_plan.md); chỉ tài liệu, API/test mới NOT_RUN |
| 2026-10-30 23:52:10 | Triển khai hai API B6, test HTTP/QR decode/snapshot, benchmark 10.000 đơn × 5 attempts và cập nhật kết quả; không làm frontend/Stitch | [Báo cáo triển khai API](../reports/stitch/B6_20261030_235210_api_implementation.md); API đã chạy trên DB test, các ca biên chưa phủ hết |
| 2026-10-31 00:14:31 | Thêm frontend B6 route riêng, dùng sidebar cũ, JSX/CSS chung một TSX; nối API thật, kiểm Chrome 1440/1024/768/390, đổi event, print/PDF A4; cập nhật Master Plan | [Báo cáo triển khai giao diện](../reports/stitch/B6_20261031_001431_frontend_implementation.md); đạt có điều kiện trên DB test, cổng 8000 chưa deploy API mới |
| 2026-10-31 00:27:21 | Kiểm tra container API 8000, xác nhận image cũ thiếu route B6; build image Docker ứng viên chứa backend/frontend mới, chưa recreate container Live | [Báo cáo kiểm tra Docker](../reports/stitch/B6_20261031_002721_docker_runtime_review.md); runtime B6 vẫn chưa có trên 8000 |

Mỗi lần sửa tiếp phải bổ sung nhật ký tại đây, tạo report mới trong `docs/reports/stitch/` và cập nhật Master Plan bằng bằng chứng của phiên đó.

## 10. Kết quả xác minh sâu chức năng backend (2026-10-30 23:12:54)

Nguồn và bằng chứng đầy đủ: [báo cáo backend mới](../reports/stitch/B6_20261030_231254_backend_capability_review.md). Trạng thái dưới đây đánh giá khả năng **API cho phiên Organizer**, không thay cho nghiệm thu runtime.

| Chức năng B6 Stitch | Khả năng hiện tại | Phần chưa hỗ trợ / lưu ý |
|---|---|---|
| Chọn sự kiện, tải tên sự kiện | CÓ ở source | List/detail event có guard; dùng event thật, không giữ tên mẫu |
| Danh sách mã đơn, thời gian, tên/email khách, tổng tiền, tên sự kiện | CÓ ở source | Order list trả các snapshot này; frontend hiện chưa render hết |
| Tìm mã đơn/tên khách; lọc một order status; làm mới | CÓ ở source | `q` tìm ILIKE mã/tên, `status` exact; làm mới bằng refetch. Tìm bằng giọng nói là khả năng frontend/thiết bị, không có dịch vụ speech trong backend đã rà |
| Điện thoại khách và tìm điện thoại/email | THIẾU | Order không lưu phone snapshot; list không join phone, q không tìm email/phone; email đã có trong response để hiển thị |
| Lọc khoảng ngày, cổng thanh toán, lọc nâng cao | THIẾU ở route B6 | Store có from/to nhưng route Organizer không truyền; không có provider filter hay hợp đồng lọc nâng cao |
| Tổng đơn/thành công/đang xử lý/hủy/thất bại/hoàn tiền, số trên tabs | MỘT PHẦN | Stats trả orders/revenue/sold cho PAID và checkins; thiếu total mọi trạng thái, breakdown và nhóm payment-review |
| Doanh thu ghi nhận, tỷ lệ thành công, tăng trưởng hôm qua, kỳ vé | MỘT PHẦN | Có tổng tiền đơn PAID, không có so sánh ngày/tỷ lệ đầy đủ/kỳ đối soát. Không coi orders trong stats là tổng mọi đơn |
| Phân trang 10/25/50/100, tổng trang | MỘT PHẦN | `page` 0-based, 50 cố định; không total/page-size. Có thể tải nối các trang nhưng không phải API phân trang đúng contract Stitch |
| Xem chi tiết đơn, hạng vé và số lượng | CÓ MỘT PHẦN qua `/me/orders/:id` | Owner Organizer/ADMIN đọc được event/items, active/latest payment; không thiếu hoàn toàn detail API như lo ngại ban đầu. Chưa có HTTP200 authenticated trong phiên |
| Cổng thanh toán/trạng thái thanh toán chính xác trên từng dòng | MỘT PHẦN | List không join payments; detail trả active/latest, không chọn trực tiếp payment theo paid_payment_id. Latest có thể FAILED sau payment đã trả thành công; cần canonical payment và batch tránh N+1 |
| Trạng thái phát hành/thu hồi vé theo đơn | MỘT PHẦN | Có logic phát hành và attendees, nhưng list orders/detail không trả ticket summary; attendees không có order_id để nối chắc chắn từng đơn. History enrich có dữ liệu theo đơn nhưng buyer-only |
| Preview QR thật và in vé cho khách | THIẾU quyền đọc QR cho Organizer | `/me/tickets/:id` kiểm buyer, không có ngoại lệ owner/ADMIN; attendees chỉ metadata không token/qrImage. In có thể là frontend nhưng đang thiếu dữ liệu QR hợp lệ |
| Gửi lại vé QR / Resend Email | CHƯA CÓ API phù hợp | Notification ORDER_PAID là ghi inbox DB, không phải email vé; SMTP reset password không phải ticket resend |
| Hóa đơn / VAT | CHƯA CÓ | Không route/service phát hành hóa đơn; order history công bố capabilities.vat=false. Biên nhận in trên trình duyệt không đồng nghĩa hóa đơn VAT |
| Xuất Excel/CSV | CHƯA CÓ API export; dữ liệu còn thiếu | CSV không nhất thiết cần endpoint riêng, nhưng export toàn bộ/đúng filter và đủ cột chưa được list hiện tại đáp ứng trực tiếp; không chỉ xuất 50 dòng rồi gọi là toàn bộ |
| Đối soát ngân hàng, kiểm tra IPN, xem log lỗi/sổ phụ | CÓ nội bộ/ADMIN, THIẾU cho Organizer | SePay reconcile/list/detail/reprocess/resolve là ADMIN và điều kiện cấu hình. SePay buyer poll không cho owner Organizer dùng để xem đơn khách; VNPay IPN/return là callback xác minh chữ ký, không nút sync tùy ý |
| Đã hoàn tiền/100% hoàn tiền, lịch sử giao dịch hoàn | CHƯA CÓ nghiệp vụ đầy đủ | Order chỉ PENDING_PAYMENT/PAID/EXPIRED/CANCELLED; payment PENDING/UNKNOWN/SUCCEEDED/FAILED. `refund_external` chỉ ghi biên bản/review ngoài hệ thống, không chuyển tiền, không ghi refunded amount/order REFUNDED hay thu hồi vé |
| MoMo, Visa/Cybersource, số cuối thẻ, cổng A/GATE A02 | CHƯA CÓ nguồn tương ứng | Factory legacy demo/VNPay sandbox và SePay độc lập; không có tích hợp MoMo/Cybersource hoặc field last4/gate trong contract đã rà |
| REAL-TIME SYNC và Escrow đã khớp/chuyển tiền | CHƯA CÓ bằng chứng đủ | Có nền socket nhưng chưa thấy emit sự kiện order/payment dành cho B6; refetch/polling có thể dùng list đọc. Không có settlement/escrow ledger/payout để bảo đảm câu khẳng định trên Stitch |
| Checkbox chọn dòng, copy mã, sidebar, thông báo, tạo sự kiện | Không phải mọi mục đều cần API mới | Selection/copy là frontend; event/create và inbox notification đã có API; thao tác hàng loạt chỉ cần API khi xác định nghiệp vụ cụ thể |

Đính chính nghiệp vụ: đơn CANCELLED/EXPIRED không đồng nghĩa payment FAILED; PAID không đồng nghĩa mọi vé còn VALID. QR đã check-in vẫn là vé đã phát hành. Không tự đổi chữ “Đang xử lý” thành PENDING_PAYMENT nếu bỏ qua review hoặc payment UNKNOWN.

Đã thực thi 7 kiểm tra với module TypeScript source và dependency trong bộ nhớ: owner đọc detail; Organizer khác bị 403; history owner không phải buyer bị 403; QR owner không phải buyer bị 404; SePay detail owner không phải buyer bị 404; query list giới hạn50/q mã-tên/from-to null; stats chỉ PAID. PASS ở mức logic source, không phải HTTP integration hoặc PostgreSQL execution.

Smoke chỉ đọc: localhost8000 `/api/health` HTTP200, orders không token HTTP401; localhost8011 từ chối kết nối. Chưa có phiên xác thực/order được chọn cho B6, không đăng nhập bằng tài khoản cũ hoặc ghi dữ liệu để kiểm tra. Các phần thiếu nêu trên là kết luận source/contract; phần vận hành authenticated còn NOT_VERIFIED.

## 11. Kế hoạch bổ sung API — phạm vi đã chọn

### 11.1. Phạm vi và giới hạn

Triển khai dự kiến chỉ gồm:

1. Năm KPI cốt lõi: tổng đơn, doanh thu PAID, số đơn PAID và tỷ lệ, đang xử lý, đã đóng; số lượng tabs tương ứng.
2. Lọc theo ngày tạo đơn (UTC+7); q tiếp tục tìm mã/tên và mở rộng sang email snapshot, không tìm điện thoại/cổng thanh toán.
3. Bảng đơn: mã/thời gian, khách hàng, sự kiện/hạng vé/số lượng, số tiền/provider thật, trạng thái order/payment và trạng thái phát hành vé.
4. Preview vé QR thật theo đơn cho Organizer sở hữu event/ADMIN; in bằng trình duyệt. Không tạo vé hay sửa trạng thái khi preview/in.

Không triển khai export Excel/CSV, resend email, VAT, đối soát/IPN/sổ phụ/log, hoàn tiền, MoMo/Cybersource, Escrow, realtime push, tìm giọng nói, advanced/provider/phone filter. Không mở rộng chọn page size 10/25/100: giữ 50/trang; trả total/totalPages là dữ liệu phụ trợ cho bảng/tabs. Không thêm kỳ thanh toán/trend mẫu, gate hoặc last4 thẻ. Số điện thoại hiển thị “Chưa có dữ liệu” khi không có snapshot; không join users để lấp dữ liệu và không thêm phone vào schema trong đợt này.

Tabs đề xuất: **Tất cả / Đã thanh toán / Đang xử lý / Đã đóng**; không dựng tab Hoàn tiền hoặc coi hết hạn/hủy là payment FAILED. Trong B6 triển khai sau, bỏ các chức năng ngoài phạm vi theo chỉ đạo người dùng, giữ các vùng còn lại theo Stitch, sidebar dùng chung và JSX/CSS riêng cùng một `.tsx`. Không sửa artifact Stitch. Đây là giảm phạm vi đã được người dùng yêu cầu, không cần giữ action giả hoặc dữ liệu mẫu để giống hình.

### 11.2. Hai API GET theo kế hoạch, đã triển khai trong backend

Hai endpoint được lập kế hoạch để giữ envelope array của API orders cũ và ý nghĩa stats cũ. Đến phiên 23:52:10, cả hai đã được kiểm thử HTTP trên build mới/DB cô lập; chưa xác nhận cổng runtime cũ đã deploy. Chi tiết evidence tại mục 14.3.

| Method / đường dẫn dự kiến | Chức năng | Quyền |
|---|---|---|
| `GET /api/organizer/events/:eventId/order-manager` | Trả bảng enriched, KPI, counts và pagination trong một response | protect + events.guard(eventId, principal) |
| `GET /api/organizer/events/:eventId/orders/:orderId/tickets` | Danh sách vé của đúng đơn để preview/in QR, tối đa 10 vé theo giới hạn đơn hiện tại | guard event trước, kiểm order.event_id, rồi lấy vé thuộc order; owner ORGANIZER/ADMIN |

Không mở rộng quyền `/me/tickets/:id`, history hay buyer SePay poll; các route đó giữ buyer-only. Không tạo API in/POST print: browser in từ dữ liệu GET preview. Không dựng màn B7 riêng trong phạm vi API này.

### 11.3. Query và validation cho order-manager

| Tham số | Quy tắc |
|---|---|
| eventId/orderId | UUID hợp lệ; sai định dạng HTTP400 |
| page | Số nguyên 0–10000, mặc định0, pageSize cố định50; trang vượt cuối trả items rỗng và metadata đúng |
| q | Trim, tối đa200 ký tự; tìm không phân biệt hoa thường bằng OR mã đơn/tên/email snapshot. Parameterized SQL; escape `%`, `_`, `\` để tìm literal, không cho wildcard ngoài chủ đích |
| group | `all`, `paid`, `processing`, `closed`; mặc định all, giá trị khác HTTP400 |
| fromDate/toDate | Ngày thật dạng YYYY-MM-DD, theo Asia/Ho_Chi_Minh, bao gồm cả hai ngày. Có thể truyền một đầu; from>to hoặc ngày không tồn tại HTTP400 |

Backend chuyển fromDate thành 00:00 UTC+7 và toDate thành đầu ngày kế tiếp (exclusive), dùng `created_at >= fromUtc AND created_at < toExclusiveUtc`. Không lọc theo paid_at; không lấy timezone máy server/browser. Ví dụ 30/10/2026 là `[2026-10-29T17:00:00Z, 2026-10-30T17:00:00Z)`. Không dùng 23:59:59 vì sẽ bỏ sót phần mili/vi giây.

Các query không thuộc contract (provider, pageSize, limit, status cũ, advanced) trả400 trong API mới, tránh khiến UI tưởng bộ lọc đã được áp dụng. API cũ giữ hành vi cũ.

### 11.4. Response dự kiến và quy tắc tính

Payload nằm trong envelope thành công hiện có của ứng dụng:

```ts
type OrderManagerPayload = {
  asOf: string; // ISO instant của snapshot đọc
  items: Array<{
    id: string; orderCode: string; createdAt: string;
    buyer: { name: string; email: string; phone: null };
    event: { id: string; title: string };
    totalQuantity: number; totalAmount: string; currency: "VND";
    status: "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";
    group: "paid" | "processing" | "closed";
    items: Array<{ typeName: string; quantity: number; unitPrice: string; lineTotal: string }>;
    payment: {
      paid: PaymentSummary | null; active: PaymentSummary | null;
      latest: PaymentSummary | null; display: PaymentSummary | null;
      unresolvedReview: boolean;
    };
    tickets: { expected: number; issued: number; valid: number; checkedIn: number; void: number };
    actions: { canPreviewTickets: boolean; canPrintTickets: boolean };
  }>;
  counts: { all: number; paid: number; processing: number; closed: number };
  summary: {
    totalOrders: number; revenuePaid: string; paidOrders: number;
    paidRatePercent: number; processingOrders: number; closedOrders: number;
  };
  pagination: { page: number; pageSize: 50; total: number; totalPages: number };
};
type PaymentSummary = {
  id: string; provider: string;
  status: "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED";
  amount: string; createdAt: string; succeededAt: string | null;
};
```

- Phạm vi gốc S = đúng event + q + ngày; **counts và summary không bị giới hạn bởi page/group**. Danh sách/total chỉ thêm group vào S. Đổi tab giữ nguyên counts; đổi q/ngày/event tính lại counts/KPI.
- Group loại trừ nhau, theo thứ tự: unresolved payment review → processing; nếu không review và order PAID → paid; còn PENDING_PAYMENT hoặc attempt PENDING/UNKNOWN → processing; còn lại → closed. `all = paid + processing + closed`.
- `paidOrders`/`revenuePaid` tính mọi order có status PAID trong S, mỗi đơn đúng một lần, không cộng payment attempts. Vì PAID có unresolved review được nhóm processing, paidOrders có thể lớn hơn counts.paid; tooltip phải giải thích để không coi đây là lỗi tổng. `processingOrders=counts.processing`, `closedOrders=counts.closed`; `paidRatePercent=paidOrders/totalOrders*100`, làm tròn2 chữ số, total0 trả0.
- Tiền trả chuỗi số nguyên; tính tổng bằng BigInt/SQL bigint/numeric, không ép Number gây sai số. Sorting cố định created_at DESC,id DESC.
- Canonical: `payment.paid` phải lấy đúng paid_payment_id; display ưu tiên paid, rồi active, rồi latest, không lấy latest FAILED đè lần đã SUCCEEDED. Thiếu bản ghi paid pointer phải ghi nhận bất nhất nội bộ, không tự chọn attempt khác làm bằng chứng thanh toán.
- issued gồm VALID/CHECKED_IN/VOID; chưa issued đủ expected phải hiện “Phát hành chưa đủ”, không suy từ PAID. canPreview/canPrint chỉ true khi order PAID, có vé VALID hoặc CHECKED_IN và không có unresolvedReview. VOID/chưa thanh toán/review không cấp QR có thể sử dụng.
- Không trả payment entity, merchant account/reference nhạy cảm, checkout URL ký, raw webhook, ciphertext/hash/token QR trong list. Payment provider hiển thị từ dữ liệu thật, không thêm MoMo/Visa giả.

### 11.5. Contract preview/in QR

Response dự kiến: `{ orderId, orderCode, event: { id, title, startsAt, venueName }, asOf, tickets: [{ id, code, typeName, buyerName, status, issuedAt, qrImage: string | null, printable: boolean }] }`.

Kiểm tra lần lượt session → quyền event → order tồn tại và thuộc event → vé thuộc order → trạng thái hiện tại. Không tin orderId/ticketId truyền từ browser để bỏ qua scope. Guest401, người không có quyền event403, event/order không tồn tại hoặc order khác event404; đơn chưa PAID/đang review409; PAID chưa có vé trả tickets rỗng để UI thông báo, không tự phát hành bổ sung. Không cần thêm ticketId query tùy ý; trả tối đa10 vé của đúng đơn.

Order public port riêng thực hiện decrypt QR sau khi workflow đã xác nhận quyền event và order; dùng cơ chế QR hiện có, không thay payload/khóa mã hóa. VALID được in/preview; CHECKED_IN vẫn xem/in nhưng phải có nhãn “Đã sử dụng”, quét lại bị từ chối; VOID trả metadata với qrImage=null, printable=false. Không render QR SVG mô phỏng.

HTTP `Cache-Control: no-store`, không lưu response vào localStorage/service worker, không ghi QR/base64/token vào log/report; list không prefetch QR mọi đơn. Frontend chỉ tải khi mở preview, xóa dữ liệu khi đóng/đổi event/đăng xuất, tải lại trước in để giảm trạng thái cũ; in chỉ vé printable và có nhãn rõ trạng thái. Có khoảng trắng quanh QR, nền trắng và không cắt QR qua hai trang. In không check-in, không resend, không đổi trạng thái đơn/vé. Vé VOID sau khi đã in vẫn bị backend scan từ chối; bản in không thể bảo đảm hợp lệ vĩnh viễn.

## 12. Thiết kế backend và thứ tự triển khai dự kiến

Tuân thủ [SERVICE-OWNERSHIP](../SERVICE-OWNERSHIP.md): Order chỉ query orders/items/tickets/checkins; Payment query payments; Event kiểm quyền/nội dung. Workflow tổng hợp DTO qua public ports; không SQL join từ Order sang payments hoặc users, không chuyển private store/entity qua module.

1. **Contract và fixtures:** chốt các DTO/query/error/group/date như mục11; chuẩn bị DB test tách biệt có ít nhất2 Organizer,1 ADMIN,1 buyer và2 event. Giữ legacy orders/stats/history/QR unchanged.
2. **Order read ports:** projection candidate theo event/q/ngày; batch items/ticket summaries cho IDs trong trang; danh sách vé đúng order. Email dùng snapshot đã lưu. Chưa cần migration nghiệp vụ; chỉ cân nhắc index khi EXPLAIN/test tải chứng minh cần, không chỉnh index mù.
3. **Payment read ports:** projection outcome nhỏ theo batch orderIds, gồm paid pointer, active/latest và unresolved review. Reuse logic history nhưng tách phần dùng chung có kiểm soát, không thay buyer guard hoặc đọc Payment store trực tiếp từ Order.
4. **Workflow order-manager:** guard event, tạo scope, phân nhóm/count/KPI trước pagination, enrich theo batch; triển khai các route GET mới và serializer allowlist. Có thể chunk IDs500 cho projection summary; không N+1 theo từng đơn, không trả toàn bộ attempts/PII không cần thiết về browser.
5. **Độ nhất quán:** UoW hiện READ COMMITTED không bảo đảm nhiều SELECT cùng snapshot. Dự kiến thêm public read-snapshot port trong platform dùng REPEATABLE READ riêng cho hai GET mới, không có mutation nghiệp vụ; không đặt transaction READ ONLY vì `events.guard` hiện có SELECT FOR SHARE. Không đổi isolation của checkout/webhook hay cho owner store chạy SET TRANSACTION tùy ý. Kiểm tra không lồng vào transaction ghi; mọi owner read trong workflow dùng cùng context. `asOf` chỉ có ý nghĩa snapshot khi việc này được kiểm chứng. Nếu chưa làm được, không tuyên bố counts/list đồng nhất khi payment đang đổi.
6. **QR:** port cấp DTO QR theo order sau guard, kiểm lại trạng thái trong snapshot; không mở rộng buyer QR endpoint. Không phát sinh mutation khi GET/in.
7. **Xác minh API trước frontend:** thực thi matrix mục13 qua HTTP trên source build mới/DB riêng; ghi response metadata và status đã loại PII/QR. Endpoint thiếu hoặc lỗi thì dừng nối phần tương ứng, ghi BLOCKED.
8. **Tích hợp B6 sau khi API đạt:** dùng sidebar cũ, JSX/CSS chung file; bỏ tính năng ngoài phạm vi, nối filter/date/email/tabs/preview/print. Không sửa Checkout/A7, không dựng lại B7 hay màn khác. Chỉ bước này khi được giao triển khai frontend.
9. **Báo cáo:** chạy checks theo phạm vi thay đổi, lưu kết quả thực tế, update mục14/nhật ký/report mới/Master Plan; không đánh dấu COMPLETED chỉ vì đã tạo route.

Chỉ tiêu hiệu năng đề xuất: với 10.000 đơn/event và 5 attempts/đơn trong DB cô lập đã index, p95 GET list+summary ≤2s qua30 lần đo sau warm-up; preview10 QR ≤2s. Ghi rõ máy, dataset, query count, p50/p95; đây là ngưỡng nghiệm thu dự kiến, chưa phải benchmark đạt. Enrich một trang phải dùng batch, số query phần enrich không tăng tuyến tính theo50 dòng; summary có thể tăng theo số chunk500 nhưng không theo từng order. Nếu không đạt, tối ưu projection/aggregate qua ports và index của từng owner trước nghiệm thu.

## 13. Kế hoạch kiểm thử

Ma trận dưới đây là tiêu chí kiểm thử đã lập trước khi triển khai; kết quả thực tế và phần chưa phủ được cập nhật ở mục 14.3 cùng report phiên API. Bảy kiểm tra source ở mục10 là bằng chứng lịch sử, không thay các ca này.

| ID | Lớp / tình huống | Kết quả kỳ vọng |
|---|---|---|
| T01 | HTTP: guest, owner Organizer, Organizer khác, buyer không có quyền, staff-only, ADMIN | 401/200/403/403/403/200 đúng vai trò; không rò dữ liệu event khác |
| T02 | HTTP: UUID sai, missing event/order, order thuộc event khác | 400/404/404/404; không cấp QR nhờ thay eventId/orderId |
| T03 | Unit+HTTP: ngày đầu/cuối, sát 17:00Z, phần vi giây, một đầu ngày, leap day, 31/02, from>to | Bao gồm đủ ngày UTC+7, exclusive đầu ngày sau; invalid400 |
| T04 | SQL+HTTP: q email hoa/thường/trim, một phần email, tên/mã, dấu %, _, backslash và chuỗi SQL injection | Tìm đúng snapshot và event; wildcard literal; không mở rộng query/rò dữ liệu; q>200 trả400 |
| T05 | Integration: PAID, pending chưa có attempt, PENDING/UNKNOWN, CANCELLED/EXPIRED, review, PAID+review | Mỗi đơn đúng1 group; counts.all bằng tổng3 nhóm; paid KPI/revenue vẫn theo order status như contract |
| T06 | Integration: nhiều attempts, paid cũ + latest FAILED, retry/late/review resolved | display chọn đúng paid_payment_id; không nhân doanh thu; resolve review chuyển group đúng, không tạo REFUNDED |
| T07 | Integration: q/ngày/event kết hợp, đổi tab/page | KPI/count cùng scope, không đổi khi chỉ đổi page/tab; total bằng số dòng trong group đúng; không double count do join items |
| T08 | HTTP+DB: 0/1/50/51/120 đơn; created_at trùng; page vượt cuối; query ngoài contract | Trang ổn định theo id; 50 cố định; counts đúng; invalid400, page cuối rỗng hợp lệ |
| T09 | Integration: một đơn nhiều loại vé, snapshot khác dữ liệu event hiện tại, tiền lớn | Đủ item/quantity/unitPrice/lineTotal; tên event/khách theo snapshot nơi đã quy định; tiền chính xác dạng string |
| T10 | Integration: expected≠issued, VALID/CHECKED_IN/VOID, PAID chưa issued | Ticket summary đúng, không biến PAID thành đủ QR; empty không tự cấp vé |
| T11 | HTTP+decode: preview owner/ADMIN,10 vé, trạng thái VOID/mixed, pending/review | QR hợp lệ decode đúng token đã cấp; VOID null/không in; pending/review409; quyền buyer endpoint không bị mở rộng |
| T12 | HTTP+DB diff: mở/đóng preview, tải/in lặp, giả mạo ids; kiểm cache/log/DTO | GET không phát hành/check-in/tạo payment; no-store, không ciphertext/hash/raw token; QR không trong list/log |
| T13 | Concurrency: webhook đổi PAID/issued/review trong khi đọc summary/list; revoke/VOID trước lần preview kế tiếp | Một response cùng snapshot; lần đọc mới thấy trạng thái mới; không query snapshot trộn; scan từ chối VOID/đã check-in |
| T14 | Ownership checker+regression | Không query cross-owner; legacy orders array/stats/buyer history/QR và checkout/payment/check-in tests liên quan vẫn pass |
| T15 | Benchmark fixture lớn | Ghi p50/p95/query count; đáp ứng ngưỡng mục12, không N+1 enrich |
| T16 | Browser B6 sau tích hợp: q/email/date/tab/refetch/empty/error401-403-404-409/retry | Khớp API, reset page khi đổi filter/event, không để response event cũ đè state mới; không hiển thị dữ liệu/QR mẫu |
| T17 | Browser print preview desktop/A4; viewport1440/768/390; keyboard/focus | QR không cắt, decode được từ ảnh/PDF; status đã dùng rõ, VOID không in; sidebar/tables/preview dùng được bằng phím; không có action ngoài phạm vi |

Fixtures/tạo trạng thái chỉ chạy DB test cô lập; không seed/đánh dấu PAID hoặc scan vào Live/Supabase đang dùng. QR test dùng secret test riêng; báo cáo chỉ ticketId giả, trạng thái và kết quả decode, không chứa token/QR có thể sử dụng.

Lệnh dự kiến sau khi có implementation: tại server `npm run build`, `npm run check:boundaries`, test Node chọn các file mới/liên quan rồi `npm test` với môi trường DB test theo harness; lưu số test pass/fail/skip. Nếu có frontend: tại client `npm run build`, lint file thay đổi, Playwright B6 theo config repo. Không dùng dist cũ và không coi test SKIP do thiếu DB là PASS. Không chạy các lệnh này trong phiên chỉ lập tài liệu.

## 14. Kết quả và tiêu chí đánh giá thành công

### 14.1. Kết quả thực tế tại thời điểm lập kế hoạch

| Hạng mục | Trạng thái / bằng chứng |
|---|---|
| Kế hoạch/contract/test matrix | ĐÃ LẬP trong phiên 23:27:50; đã thu hẹp phạm vi đúng yêu cầu |
| Hai API GET đề xuất | NOT_IMPLEMENTED; chưa có route runtime để gọi |
| T01–T17, benchmark, integration/browser/print mới | NOT_RUN; chưa có kết quả pass/fail cho API mới |
| Xác minh backend ở phiên trước | 7 kiểm tra logic source với dependency bộ nhớ PASS; health8000 200/protected401; authenticated NOT_VERIFIED — xem report23:12:54, không chạy lại phiên này |
| Source/Stitch/data | Không chỉnh sửa trong phiên lập kế hoạch; Stitch không được gọi mới |

### 14.2. Điều kiện nghiệm thu sau triển khai

Chỉ ghi **COMPLETED / ĐẠT cho phạm vi đã chọn** khi đồng thời:

- T01–T14 bắt buộc đều PASS bằng evidence của source build mới/DB cô lập/HTTP thật; không còn test bắt buộc SKIP. Bảng payload, KPI/tabs/filter và QR đúng contract mục11, không có truy cập chéo tenant hoặc tăng quyền buyer endpoint.
- Tiền/canonical payment/ticket summary/timezone/scope counts không sai ở dataset biên; `counts.all=sum(groups)`; list pagination không nhân/thiếu đơn trong snapshot; không có dữ liệu hard-code nghiệp vụ.
- T15 đáp ứng mục tiêu hiệu năng hoặc được người dùng duyệt một ngưỡng thay thế có evidence; chưa đo thì ghi NOT_VERIFIED, không tự đánh PASS.
- Build/boundary checks và regression liên quan PASS; GET không có mutation nghiệp vụ; không lộ QR trong list/log/cache và không trả QR cho VOID/chưa thanh toán/review.
- **Nghiệm thu API** có thể hoàn tất độc lập với frontend, nhưng không ghi hoàn tất màn B6 khi T16–T17 chưa PASS. In thực tế trên máy in vật lý nếu chưa có thiết bị phải ghi NOT_VERIFIED riêng; browser print/PDF/QR decode phải được kiểm chứng.
- Report phiên triển khai ghi môi trường, dataset, commit/build, command, HTTP assertions, số PASS/FAIL/SKIP và liên kết artifact an toàn; cập nhật bảng kết quả này và Master Plan. Kỳ vọng trong test matrix không được chép thành kết quả thực tế.

Nếu KPI/filter/list/QR thuộc phạm vi còn lỗi bắt buộc hoặc thiếu quyền/API → KHÔNG ĐẠT/BLOCKED phần triển khai tương ứng, không thay bằng mock. Những chức năng đã bỏ qua (resend/VAT/refund/reconcile/export/provider filter/Escrow…) ghi OUT_OF_SCOPE và **không chặn nghiệm thu đợt này**.

### 14.3. Kết quả triển khai API ngày 2026-10-30 23:52:10 UTC+7

| Hạng mục | Kết quả thực tế |
|---|---|
| Hai GET mục 11.2 | Đã triển khai trong source backend; HTTP 200/401/403/404/409 trên DB PostgreSQL test cô lập. API cũ `/organizer/events/:id/orders` vẫn trả array. |
| KPI/tabs, email/ngày, bảng enriched | Test các trạng thái chính, canonical paid payment, review, literal search, ngày UTC+7, 50/trang và scope counts PASS. Một số fixture biên T01–T10 còn thiếu; chi tiết trong report. |
| Preview/in QR | API cấp PNG QR thật; ZXing giải mã ảnh đúng token buyer, VOID null, pending/review409, no-store, GET lặp không phát hành thêm vé. Browser print/PDF chưa chạy. |
| Build/boundary/regression | Build và checker PASS. Suite 72 tests: 70 pass, 0 fail, 2 skip SePay ngoài B6; test B6 chạy riêng sau bổ sung: 1 pass, 0 fail, 0 skip. |
| T15 local | 10.000 đơn × 5 attempts, 30 lượt: list p50 412 ms/p95 445 ms; 10 QR preview p50 92 ms/p95 99 ms. Chưa instrument SQL query count hoặc đo production. |
| T16–T17 | NOT_RUN: chưa tạo frontend, chưa thử browser, PDF/máy in. Không ghi hoàn thành toàn màn B6. |

**Đánh giá:** backend API đã sẵn sàng cho bước tích hợp frontend trên build mới; nghiệm thu đầy đủ T01–T15 còn phụ thuộc fixture biên/race và đo query count trong [report](../reports/stitch/B6_20261030_235210_api_implementation.md). Cổng backend đang chạy trước phiên chưa được restart/deploy, nên chưa xác nhận route mới có sẵn trên cổng đó. Thiết kế Stitch giữ nguyên.

### 14.4. Kết quả frontend ngày 2026-10-31 00:14:31 UTC+7

| Hạng mục | Kết quả thực tế |
|---|---|
| Trang B6 | `OrderManagerPage.tsx` có JSX và CSS B6 cùng file, sidebar Organizer dùng chung; `App.tsx` có route riêng trước route động. Không sửa Stitch/frontend màn khác. |
| API tích hợp | List/KPI/counts/filter/email/ngày/50 trang và QR preview từ hai GET thật; selector event từ API Organizer. HTTP quyền và QR đã kiểm trên DB test. |
| Browser | Chrome 1440/1024/768/390: login Organizer, KPI/tabs/email/ngày/empty, đổi event, QR preview, in/PDF A4, menu và cuộn bảng mobile PASS trong test cô lập. Ảnh runtime 1440/768/390 đã xem; chưa đo pixel/a11y đầy đủ. |
| Build/lint/test | Client build PASS, ESLint hai file thay đổi PASS; test B6 HTTP+browser 1 pass/0 fail/0 skip. |
| Cổng thường dùng | `127.0.0.1:8000` health200 nhưng route B6 mới trả404 khi gọi không token; backend hiện chạy chưa deploy bản mới. Frontend Vite 5173 hiện trỏ cổng này, nên chưa coi rollout thường dùng đạt. |
| Giới hạn | Error/retry browser chưa thử; decode QR từ PDF/máy in chưa thử; các fixture backend T01–T15 còn thiếu như report API trước. Các chức năng ngoài scope vẫn bỏ qua. |

**Kết luận:** `ĐẠT CÓ ĐIỀU KIỆN` cho frontend/API trên môi trường test cô lập, chưa phải nghiệm thu triển khai trên backend 8000. Không đánh dấu B6 hoàn thành toàn diện khi các tiêu chí trên còn `NOT_VERIFIED`.

### 14.5. Kiểm tra Docker runtime ngày 2026-10-31 00:27:21 UTC+7

| Hạng mục | Kết quả |
|---|---|
| `pbl6-api-1` | Healthy trên cổng 8000 nhưng image `eventhub-local` cũ; `/app/dist/app.js` không có hai route B6, GET order-manager trả 404. |
| Image mới | `eventhub-b6-candidate:20261031` build PASS; kiểm read-only trong image thấy hai route và bundle frontend B6. Chưa chạy với cấu hình Live. |
| Trạng thái rollout | `NOT_DEPLOYED`: chưa restart/recreate API hoặc worker, Vite 5173 vẫn proxy tới 8000 cũ. Stack dùng Supabase/SePay Live nên rollout cần xử lý như thay đổi runtime thanh toán. |

Chi tiết và bằng chứng: [report Docker mới](../reports/stitch/B6_20261031_002721_docker_runtime_review.md). Trạng thái frontend/API cô lập ở mục 14.4 vẫn giữ nguyên; không suy từ image build rằng API đã hoạt động trên container đang chạy.
