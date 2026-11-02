# Feature B1 — Tổng quan dashboard EventHub

Cập nhật phạm vi được người dùng xác nhận: **2026-11-02 00:32:17 UTC+07**.
Trạng thái cập nhật **2026-11-02 07:35:05 UTC+07**: **ĐÃ TRIỂN KHAI SOURCE/API, ĐẠT CÓ ĐIỀU KIỆN trên DB test và Chrome**. API tổng hợp đã xây dựng/kiểm thử và nối B1; Docker8000/Live chưa rollout. [Report triển khai](../reports/stitch/B1_20261102_073505_implementation.md).

## 1. Phạm vi hiện hành

Chỉ xây dựng API và nội dung B1 cho **5 nhóm chức năng** sau. Quyết định này thay thế phạm vi rộng trong bản kế hoạch trước; các phần đã loại bỏ không còn là blocker hoặc tiêu chí nghiệm thu B1.

| Nhóm | Chức năng giữ lại | Dữ liệu cần phục vụ |
|---|---|---|
| 1 | Bộ lọc tất cả sự kiện + khoảng ngày | Tổng hợp toàn bộ sự kiện thuộc BTC; có thể chọn một sự kiện thuộc cùng BTC; 7 ngày, 30 ngày mặc định, tháng này, ngày tùy chọn |
| 2 | KPI doanh thu, vé bán, đơn đã thanh toán | Doanh thu đã thanh toán, số vé thuộc đơn PAID và số đơn PAID trong kỳ |
| 3 | KPI sự kiện đang mở bán | Số sự kiện thực sự còn mở bán tại thời điểm server trả dữ liệu |
| 4 | Biểu đồ doanh thu/vé toàn BTC | Chuỗi theo ngày trong kỳ, chuyển doanh thu/vé, zero-fill ngày không có giao dịch |
| 5 | 5 sự kiện sắp/đang diễn ra kèm check-in | Tối đa 5 sự kiện, thông tin lịch/địa điểm/ảnh, vé bán/sức chứa, số đã check-in và tổng vé hợp lệ |

Giữ sidebar/header dùng chung theo yêu cầu trước. Loading, empty, lỗi/thử lại, làm mới và định dạng UTC+7/VNĐ là xử lý kỹ thuật phục vụ 5 nhóm trên, không mở thêm API nghiệp vụ.

Phạm vi được chốt ở phiên00:32:17; phiên07:35:05 đã triển khai đủ5 nhóm. API28HTTP/snapshot, Chrome3tests/4viewport, build client/server, lint và boundaries PASS. Chi tiết và giới hạn trong report triển khai.

## 2. Chức năng loại bỏ khỏi kế hoạch B1

Không xây dựng API, DTO, UI riêng, nút giả hoặc dữ liệu mẫu cho:

- Đơn hàng gần đây/toàn BTC, thông tin người mua/phone, chi tiết đơn từ khối B1.
- Công việc cần xử lý: nháp/chờ duyệt/từ chối, lý do, phần trăm hoàn tất, xóa/bỏ qua việc, xem mọi công việc.
- So sánh kỳ trước, phần trăm tăng trưởng.
- Doanh thu thực nhận sau phí/quyết toán; nghiệp vụ hoàn tiền.
- Xuất PDF/CSV từ B1.
- Giờ cao điểm, traffic/lượt truy cập, tỷ trọng cổng thanh toán.
- Telemetry Live Gate Sync/VN-S1, nhãn dữ liệu thời gian thực chưa có nguồn.
- Chỉ số phụ sự kiện diễn ra trong 48 giờ.
- Bộ nút mô phỏng trạng thái và các khối/CTA riêng ngoài 5 nhóm đã chọn: lời chào tổ chức động, tạo sự kiện, mở máy quét, xem mọi đơn/công việc, thống kê chi tiết.

Danh sách 5 sự kiện trong B1 chỉ cần hiển thị thông tin và tiến độ; không bổ sung API thao tác quản lý/quét QR cho B1. Điều hướng sẵn có của sidebar/header vẫn được tái sử dụng; không xóa chức năng hay API của các màn B2–B12, không sửa shared shell để loại bỏ chức năng ở màn khác.

Đây là điều chỉnh phạm vi triển khai đã được người dùng cho phép. **Không chỉnh sửa artifact trên Stitch**; khi triển khai chỉ tái hiện các khối được giữ, không để khoảng trống giả cho các khối bỏ.

## 3. Nguồn thiết kế và bằng chứng trước đó

- Đã đọc Master Plan trước cập nhật; áp dụng skill `.agents/skills/eventhub-stitch-review/SKILL.md`.
- Project chính thức `10374042969343935993`, EventHub; B1 được xác minh ở phiên review trước: `fafc603bf0e54c3d8206606b6a0e35a1`, “Tổng quan — Ban tổ chức - EventHub”, DESKTOP2560×5260, canvas1280×2597.
- ID cũ `9871e5e5a3cb4c4a9c1ac87736052b72` và biến thể `051e4fd61c4e4c01b2bb832677a981ad` hidden theo metadata của phiên trước.
- Bố cục còn giữ: bộ lọc → 4 thẻ KPI → biểu đồ → 5 sự kiện. Sau khi bỏ cột công việc, biểu đồ dùng chiều rộng vùng nội dung; giữ phong cách/màu/font/chi tiết khối còn lại của B1, tái sử dụng shell hiện có.
- Nền/card/tím/cyan/hồng khớp nhận diện Cosmic Graffiti. Sai lệch đã ghi: heading Plus Jakarta Sans thay Syne, text/border khác một số token; không tự đổi font toàn hệ thống. Số mẫu và SVG chart tĩnh không dùng làm dữ liệu thật.
- Phiên scope00:32:17 không gọi Stitch/API; phiên triển khai07:35:05 đã lấy lại project/screen/HTML/ảnh và kiểm API mới trên DB test. Kết quả runtime cũ bên dưới chỉ dùng làm lịch sử.

Lịch sử: [review/API gốc](../reports/stitch/B1_20261102_001906_review_plan.md), [brief trước](../reports/stitch/B1_20261102_000139_design_brief.md).
Report phạm vi mới: [B1 scope update](../reports/stitch/B1_20261102_003217_scope_update.md).

## 4. API nền và phần cần bổ sung

Bằng chứng **phiên 00:19:06**, không phải chạy lại trong phiên cập nhật:

| API đã có (tiền tố /api) | Kết quả trước | Khả năng tái sử dụng / giới hạn |
|---|---|---|
| GET /organizer/events?page=0&limit=50 | 200, 21 sự kiện | Danh sách chọn event, metadata; không cộng một trang thành KPI toàn BTC |
| GET /organizer/events/status-counts | 200, PUBLISHED13 | Không thay cho số sự kiện thực sự mở bán |
| GET /organizer/events/:id | 200 | Metadata/lịch/ticket types của event thuộc quyền |
| GET /organizer/events/:id/stats | 200 | orders/revenue/sold/checkins toàn kỳ một event |
| GET /organizer/events/:id/analytics?fromDate=2026-10-04&toDate=2026-11-02 | 200, 30 ngày | Doanh thu/vé/PAID trong kỳ và daily một event, chưa owner aggregate |
| GET /organizer/profile/stats | 200 | EVER_PUBLISHED/servedTickets toàn kỳ, không thay KPI B1 |

Event mẫu `cbe172d3-a06a-42fa-8557-abeb50a4044b`: analytics revenue="150000", sold="1", paidOrders=1; tổng dailyRevenue="150000", khớp stats trên dữ liệu đã thử. Event rỗng trả0 và đủ30 ngày zero-fill.
Analytics input sai ngày/query →400; guest401; Customer và Organizer khác403.
Không suy rộng thành đối soát DB, concurrency hoặc chứng minh mọi endpoint.

**Đã xây dựng và kiểm thử** contract tổng hợp theo owner cho 5 nhóm, xem mục5/8. Không yêu cầu API recent orders, tasks, comparison, PDF, traffic hoặc provider breakdown.

## 5. Contract API — đã triển khai source và kiểm thử

Endpoint đọc đã triển khai:

`GET /api/organizer/dashboard?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&eventId=<UUID tùy chọn>`

Một endpoint có thể phục vụ đủ 5 nhóm; không bắt buộc tách thành 5 API. Client bỏ eventId để chọn “Tất cả sự kiện”, không gửi eventId=all. Dùng API danh sách event hiện có cho dropdown, tải/phân trang đúng phạm vi, không dùng dữ liệu trang đầu làm toàn bộ lựa chọn.

### Request và phạm vi

- Owner lấy từ principal xác thực, không nhận organizerId/ownerId từ client. Role/quyền theo cơ chế Organizer hiện có; Admin không được ngầm nhận dữ liệu toàn hệ thống.
- eventId nếu có phải hợp lệ và thuộc scope; không rò dữ liệu BTC khác.
- fromDate/toDate là ngày thật, thứ tự hợp lệ, tối đa366 ngày; mặc định30 ngày gồm hôm nay theo Asia/Ho_Chi_Minh.
- Quy đổi khoảng ngày thành `[00:00 fromDate, 00:00 ngày sau toDate)` UTC+7.
- Lọc event áp dụng tất cả các khối. Lọc ngày chỉ áp dụng 3 KPI thanh toán và chart. KPI mở bán và danh sách sự kiện là hiện trạng tại `asOf`, có nhãn rõ trên UI.

### Response tối thiểu

Envelope theo chuẩn dự án `{success:true,data:...}`, data gồm:

| Field | Ý nghĩa |
|---|---|
| asOf, timezone | Thời điểm snapshot và Asia/Ho_Chi_Minh |
| range | fromDate/toDate đã chuẩn hóa |
| scope | eventId hoặc null cho toàn BTC |
| totals | revenue dạng chuỗi tiền nguyên VND, sold dạng chuỗi số nguyên, paidOrders dạng count |
| currentEventCounts | onSale: số event đang mở bán tại asOf |
| dailySeries | date, revenue, sold; đủ mỗi ngày trong range |
| upcomingEvents | Mảng tối đa5: id/title/coverImageUrl/venueName/startsAt/endsAt/temporalStatus/capacity/sold/checkedIn/eligibleTickets |

Không đưa `previousTotals`, `comparison`, `actionItems`, `recentOrders`, buyer/contact, export hay insight phụ vào DTO. Endpoint đã trả200 trên sourceAPI8021/PostgreSQLtest55451; capacity/sold/checkedIn/eligibleTickets trong upcomingEvents là string nguyên. Docker8000/Live chưa rollout.

### Quy tắc số liệu

1. **KPI thanh toán:** tái sử dụng quy tắc canonical payment đã dùng ở B10; tính một lần mỗi đơn PAID, theo ngày thanh toán, không theo createdAt của đơn. Loại PENDING/CANCELLED; tránh cộng mọi payment SUCCEEDED khi retry. Vé là quantity lịch sử của đơn, không lấy giá/vé hiện tại để tính lại doanh thu. UI dùng nhãn **Doanh thu đã thanh toán**, không dùng net payout.
2. **Biểu đồ:** tổng daily revenue/sold phải khớp totals trong cùng snapshot. Zero-fill, không dựng đường mẫu. Không tính kỳ trước hoặc phần trăm tăng trưởng.
3. **Đang mở bán:** event PUBLISHED, không archived/cancelled, không sales_paused, chưa kết thúc; có ít nhất một ticket type còn hoạt động, đang trong sale window và còn khả năng mua theo quy tắc tồn kho của booking (tính cả lượng giữ chỗ nếu booking trừ reserved). Kiểm biên thời gian và giữ chỗ theo source booking khi triển khai để không tạo định nghĩa thứ hai.
4. **Sắp/đang diễn ra:** event thuộc scope, PUBLISHED, không archived/cancelled, endsAt>asOf. Đang diễn ra nếu startsAt<=asOf<endsAt; sắp diễn ra nếu startsAt>asOf. Ưu tiên đang diễn ra, rồi startsAt tăng dần, id để ổn định; lọc/sort toàn tập trước LIMIT5. Không giới hạn48h.
5. **Tiến độ sự kiện:** vé bán/sức chứa là toàn kỳ event; eligibleTickets là tổng vé có hiệu lực VALID hoặc CHECKED_IN, checkedIn là số vé CHECKED_IN tương ứng, không đếm trùng log quét. Mẫu số0 hiển thị0/không có vé, không NaN. Chốt xử lý ticket type đã archived theo lịch sử bán thực tế, không bỏ mất vé đã bán.
6. Aggregate dùng public interfaces Event/Order/Payment trong workflow và snapshot nhất quán; tiền tính chính xác, không Number cho số lớn. Không truy cập chéo store hoặc tải mọi đơn/vé về browser. Không thay bằng /admin/stats.

## 6. Kế hoạch triển khai

1. Đọc lại route/workflow/store và quy tắc booking hiện hành; xây contract mục5 cho đúng5 nhóm. Viết kiểm thử API meaningful trên DB cô lập, đối soát số liệu. Không thêm endpoint cho chức năng đã loại.
2. Khi API tồn tại và HTTP đã kiểm đúng hợp đồng, mới tích hợp frontend. API thiếu/lỗi thì ghi BLOCKED, không mock/hardcode.
3. Route B1 dự kiến `/organizer/dashboard`; giữ B2 ở `/organizer`. Thêm Guard và shell detection khi được giao triển khai. Đây chưa phải thay đổi source đã thực hiện.
4. File dự kiến `client/src/pages/organizer/DashboardPage.tsx`: JSX + CSS trong cùng file, chuỗi CSS nhiều dòng trong style, scope `.b1-dashboard`; không tách CSS B1, không chép script/CDN Stitch.
5. Reuse OrganizerSidebar active Tổng quan và OrganizerHeader; không thêm khối công việc/đơn/CTA riêng bị loại. Không đổi các màn khác.
6. Axios/session hiện có; trạng thái loading/empty/error/retry, hủy/bỏ response cũ khi đổi lọc/tài khoản; làm mới thật. Không thay lỗi bằng số0. Bố cục responsive của các khối còn giữ, không giữ khoảng trống cột công việc.
7. Mỗi phiên sửa tạo report mới và cập nhật B1 trong Master Plan; report cũ giữ nguyên.

## 7. Kiểm thử và nghiệm thu phạm vi thu gọn

- Quyền owner/khác owner/Customer/guest/Admin scope; UUID/date sai, query lạ, ngày đảo, giới hạn366, boundary UTC+7.
- Nhiều event và >50 đơn để bảo đảm không tính trên một trang; PAID/retry/pending/cancel, số tiền lớn, snapshot consistency; totals bằng tổng daily.
- Sale window chưa mở/hết hạn, pause, hết vé/đang giữ chỗ, archived/cancelled, event kết thúc; kết quả KPI mở bán khớp khả năng booking.
- Danh sách0/1/5/>5 event, đang/sắp/kết thúc, thứ tự ổn định, không lẫn owner; check-in đúng vé có hiệu lực, không đếm quét lặp, capacity/eligibleTickets0.
- UI filter/refresh/toggle/tooltip, skeleton/empty/error/session; 1440/1024/768/390, keyboard/focus/nhãn biểu đồ và nội dung thay thế. Không yêu cầu test đơn gần đây/tasks/PDF/comparison đã loại.
- Build/lint và tests phù hợp trong phiên triển khai; so Stitch chỉ với khối còn giữ và sai lệch thu gọn đã được duyệt.
- Hoàn tất source khi5 nhóm có dữ liệu thật, shared shell + TSX/CSS cùng file, kiểm thử đạt và report/Master Plan được cập nhật. **Đã đạt có điều kiện trên source/API/DB test/Chrome; còn rollout8000/Live, audit accessibility đầy đủ và benchmark.**

## 8. Kết quả triển khai mới nhất

- Route /organizer/dashboard, sidebar Tổng quan đã nối; B2 giữ /organizer.
- GET /api/organizer/dashboard: owner scope, canonical payment, UTC+7, snapshot, BigInt;49event mở bán/61PAID/6.200.000đ trên fixture nhiều event. Top5 và check-in dùng vé hợp lệ, giữ lịch sử vé archived đã bán; sale KPI xét reserved/pause/window/waiting queue của booking.
- DashboardPage.tsx chứa JSX+CSS; reuse shell, filter đầy đủ mọi trang event, chart có tooltip/keyboard/table, states/error/retry/stale-session; khối bị loại không triển khai.
- 28HTTP + snapshot concurrency PASS; tiền tổng lớn vượt Number safe integer chính xác; Chrome3tests1440/1024/768/390 PASS;6regression tests(B10/B11/ownership), build/lint/boundaries PASS.
- Những câu “dự kiến/chưa” trong mục6 là trình tự kế hoạch ban đầu; kết quả thực hiện hiện hành là mục8 và report mới. Không suy rộng thành đã deploy.
- [Report triển khai và nhật ký chỉnh sửa](../reports/stitch/B1_20261102_073505_implementation.md). Report scope/review cũ giữ nguyên làm lịch sử.
