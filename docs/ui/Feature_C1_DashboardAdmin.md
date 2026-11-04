# Feature C1 — Dashboard Quản trị

> Route `/admin/stats`. Phiên lập kế hoạch: 2026-11-04 16:35:30 UTC+07 (Asia/Ho_Chi_Minh).
> **ĐÃ TRIỂN KHAI 2026-11-04 22:47:44 UTC+07 — ĐẠT CÓ ĐIỀU KIỆN.** API doanh thu ngày/UI đã chạy trên source và local5173/API8000. Giữ chức năng cơ bản dùng API hiện có; nhóm thiếu API khác đã bỏ theo scope16:52.
> [Report triển khai và bằng chứng](../reports/stitch/C1_20261104_224744_implementation.md):21checkpoints HTTP DB riêng,19nhóm Chrome/4viewport, local30ngày695000đ/0writes, build/lint/boundaries PASS. Còn fulla11y/benchmark/image-static-public rollout.
> [Report cập nhật phạm vi](../reports/stitch/C1_20261104_165219_scope_update.md). Phạm vi mới ở mục 4–6 thay thế yêu cầu triển khai đầy đủ của bản review trước.
> [Báo cáo phiên](../reports/stitch/C1_20261104_163530_review_plan.md) · [Master Plan](../PROJECT_MASTER_PLAN.md).

## 1. Phạm vi và nguồn xác thực

- Đã đọc Master Plan trước khi gọi Stitch. Mục 4.17 xác nhận trang thống kê hệ thống đang dùng `Admin.tsx` và `GET /admin/stats`; mục 5.3 ghi “Có code, cần đồng bộ”; mục 7 yêu cầu dashboard dùng số liệu thật. Chưa có tiêu chí nghiệp vụ C1 chi tiết hoặc review C1 trước trong bảng 5.4.
- Dự án Stitch duy nhất: `10374042969343935993`, EventHub. Screen `cd7e1058651c44998a4cb6abff53813b`, title `C1. Dashboard Quản trị - Cosmic Ticket Quản Trị Viên`, DESKTOP metadata 2560×5060.
- Đã đọc HTML file `11892045641853691356`, xem ảnh file `18162607819823123333` qua `download_file`. Tải URL trực tiếp ban đầu trả 401; MCP tải được cả hai, nên không còn trở ngại truy cập thiết kế. Không gọi edit/generate/apply-design-system.
- Phiên review ban đầu chỉ sửa tài liệu. Theo yêu cầu tiếp theo “thực hiện plan”, phiên22:47 đã triển khai source C1/API ngày và kiểm trên DB riêng, nạp API local; không sửa màn khác/Stitch hoặc dữ liệu nghiệp vụ dùng chung. Các thay đổi được ghi trong report triển khai mới.
- Người dùng đã chốt riêng C1: chỉ thêm API biểu đồ doanh thu theo ngày; loại bỏ các chức năng thiếu API khác. Không giữ nút giả, placeholder hoặc toast “đang phát triển” cho chức năng đã loại.

## 2. Thiết kế đã kiểm tra và khoảng cách hiện trạng

### 2.1. Cấu trúc artifact gốc (bằng chứng review, không phải scope triển khai mới)

1. Dùng `AdminShell` → `AdminHeader` + `AdminSidebar` hiện có, giữ điều hướng và cơ chế menu mobile. Không chép lại header/sidebar từ HTML Stitch.
2. Banner “Bảng Điều Khiển Quản Trị Hệ Thống”: trạng thái trực tuyến, máy chủ, latency, xuất báo cáo, cảnh báo và hỗ trợ.
3. Sáu KPI: người dùng; BTC; sự kiện và số đang mở bán; vé đã bán/GMV; lượt quét QR/tỷ lệ; phí thu sàn 5%. Các trend, Tier và progress là dữ liệu nghiệp vụ riêng.
4. Khối biểu đồ hai cột: xu hướng GMV/phí sàn sáu tháng, thông tin cao điểm vé/phút; donut cơ cấu sự kiện theo danh mục.
5. Hai hàng đợi: sự kiện chờ duyệt (ảnh, tên, BTC, quy mô vé, chi tiết, duyệt nhanh); BTC mới (hồ sơ, cấp phép).
6. Khối an ninh/đối soát: phát hiện bot/chặn IP; webhook/ping; khiếu nại/từ chối/duyệt hoàn; hỗ trợ, hash và làm mới.

### 2.2. Những điểm chưa đạt ở lần review ban đầu

Các phát hiện dưới đây giữ làm bằng chứng. Việc triển khai/loại bỏ tương ứng tuân theo mục 4–6 mới; phí sàn, donut, audit, export và các nhóm đã loại không còn là blocker nghiệm thu.

| Mã | Bằng chứng và phát hiện | Hướng thực hiện sau khi đủ điều kiện |
|---|---|---|
| C1-01 | `Admin.tsx:16–64` còn PageHead, tabs và `StatCards`; chưa có bố cục banner/sáu KPI/chart/queue/audit của C1 | Page riêng C1, giữ bố cục nội dung Stitch |
| C1-02 | `App.tsx` chọn `AuthHeader` cho `/admin/stats`; C1 chưa dùng AdminShell như C2/C4/C6/C7/C8/C9/C11 | Dùng lại AdminShell; điều chỉnh riêng nhận diện route C1 để tránh hai header/footer, không sửa shell dùng chung |
| C1-03 | StatCards lặp chín trường API, thay vì sáu KPI theo thiết kế; không có trend, Tier, phí sàn hoặc biểu đồ | Mapping tường minh từng field; không đổi nhãn revenue thành phí thu sàn |
| C1-04 | Stats bỏ qua mọi query; không hỗ trợ sáu tháng, tăng trưởng tháng hoặc bộ lọc thời gian | Bổ sung hợp đồng thống kê khi được giao triển khai backend; hiện BLOCKED |
| C1-05 | `users=15` gồm mọi vai trò, `/admin/users/stats?role=USER` trả 9 khách hàng; `organizers=5` khác `stats.active=2` hồ sơ được duyệt | Chốt mẫu số: người dùng toàn hệ thống/khách hàng, người có role BTC/hồ sơ duyệt; không tráo chỉ số |
| C1-06 | Category stats có `total_events=22`, overview có `events=23` | Kiểm tra phạm vi archive/category/null trước donut; không tự dùng 23 làm mẫu số hoặc gán phần thiếu cho danh mục bất kỳ |
| C1-07 | HTML/ảnh còn “Cosmic Ticket”, dữ liệu năm 2025, tên/liên hệ quản trị cố định, server/version/hash, số liệu lớn mẫu | Không đưa dữ liệu mẫu thành dữ liệu thật; ghi điểm cần xác nhận về nội dung tĩnh trước thay đổi thiết kế |
| C1-08 | Tiêu đề và mô tả banner bị truncate ngay trên ảnh desktop; hàng đợi nhiều chữ xuống dòng; sidebar fixed 288px không có breakpoint ẩn trong artifact | Giữ nguồn tham chiếu, ghi rõ sai lệch; cần nghiệm thu responsive thay vì suy luận từ ảnh |
| C1-09 | Nút export chỉ setTimeout đổi chữ “Đã tải CSV thành công!”, không tạo tệp; nhiều `href="#"`, nút chưa có handler | Không chép mô phỏng thành chức năng thật; nối route/hành vi đã xác minh |
| C1-10 | UI hiện có Loading/Notice cơ bản; chưa có trạng thái riêng cho biểu đồ, queue, lỗi từng vùng, dữ liệu chưa hỗ trợ | Thiết kế trạng thái trung thực; không biến lỗi thành số 0 hoặc thông báo thành công |

### 2.3. Cosmic Graffiti

Đã đối chiếu `get_project.designTheme/designMd` và HTML: đúng họ font Syne / Be Vietnam Pro / Space Grotesk, nền tối, accent tím/cyan/hồng, nhịp 24px, sidebar 288px/header 80px. Nhưng artifact dùng palette sinh tự động: nền `#0f1222`, card `#181b2a`, primary `#d2bbff`, cyan `#5de6ff`, hồng `#ffafd3`, chữ `#e0e1f7`; khác bộ màu mô tả `#080B1A/#10162B/#7C3AED/#22D3EE/#F472B6/#F8FAFC/#94A3B8`. Chính designMd hiện cũng có khác biệt giữa frontmatter token và phần mô tả; không coi palette lệch là lỗi code đã được phép tự sửa.

Ưu tiên tái hiện artifact và shell đã có theo yêu cầu người dùng, không tự recolor. HTML dùng radius mặc định 4px/lg 8px/xl 12px, khác mô tả card lớn 16px; cần ghi nhận khi nghiệm thu. Không xác nhận tương phản, keyboard hay mobile đạt chỉ bằng ảnh desktop.

## 3. API thực tế và hợp đồng dùng lại

Base đã gọi: `http://localhost:8000/api`. Các path dưới đây tương đối với `/api`. ADMIN đăng nhập bằng tài khoản seed hiện có; không lưu mật khẩu, token hoặc dữ liệu cá nhân vào tài liệu. Kết quả chỉ chứng minh runtime local8000 tại thời điểm kiểm tra, không chứng minh production hay toàn bộ source đang chạy đồng nhất.

| Method / path, input đã truyền | Kết quả thực tế | Dùng cho C1 và giới hạn |
|---|---|---|
| GET `/health` | 200, `data.status` | Health cơ bản; không chứng minh uptime 99.98%, server name hoặc latency webhook |
| GET `/admin/stats` | 200, chín field string; mẫu ở dưới | KPI toàn thời gian; không có body/query được xử lý |
| GET `/admin/stats?from=2099-01-01&to=2099-01-31` | 200, số liệu y hệt không lọc | Thử nghiệm xác nhận query bị bỏ qua, không phải API lọc đúng |
| GET `/admin/events/kpis` | 200, total 23, selling 11, pending_review 2, paused_or_cancelled 3 | Số sự kiện/đang bán; source selling = PUBLISHED, chưa pause, ends_at > now; chưa xét toàn bộ cửa sổ bán từng loại vé |
| GET `/admin/events?status=PENDING_REVIEW&page=0&limit=3` | 200, 2 items, total 2 | Hàng đợi cơ bản, không có ưu tiên khẩn cấp/SLA |
| GET `/admin/events/metrics?eventIds=<hai UUID từ list>` | 200, capacity 1000 và 100; issued/sold/GMV/revenue/checkins đều 0, rate 0 | Quy mô và số liệu từng event; không là time series toàn hệ thống |
| GET `/admin/events/metrics?eventIds=bad` | 400 | UUID sai bị từ chối |
| GET `/organizer/events/:id` với từng UUID từ pending list | Hai response 200, có ticketTypes/reviews | Chi tiết event/hạng vé cho ADMIN; không có chứng từ pháp lý/NFC |
| GET `/admin/organizer-applications?status=PENDING&page=0&limit=2` | 200, 1 item; stats total 4, active 2, pending 1 | Hàng đợi BTC cơ bản; chú ý pagination.pageSize thay vì limit |
| GET `/admin/categories?page=0&limit=100` | 200; 7 mục, stats total 6, archived 1, total_events 22 | Có event_count để nghiên cứu donut, chưa chốt quy tắc mẫu số |
| GET `/admin/users/stats?role=USER` | 200, total 9/active 8/inactive 0/locked 1 | Chỉ tập khách hàng, không thay users của overview |
| GET `/admin/payments?status=SUCCEEDED&from=2026-11-01T00:00:00%2B07:00&to=2026-11-05T00:00:00%2B07:00&page=0` | 200, 1 payment | Hỗ trợ lọc giao dịch theo datetime có offset, không trả tỷ lệ webhook hay phí sàn |
| GET `/admin/sepay/transactions?page=0&limit=10` | 200, 9 records | Có đối soát SePay, không phải dashboard đa ngân hàng/MoMo hoặc kiểm tra ping |
| GET `/admin/organizer-profile-requests?page=0` | 200, mảng rỗng | Có workflow sửa hồ sơ pháp lý; không phải xác minh CCCD/MST/eKYC hoặc Tier |
| GET `/admin/stats` không token / token CUSTOMER | 401 UNAUTHORIZED / 403 FORBIDDEN | Quyền ADMIN được bảo vệ |

Response mẫu thật của `/admin/stats` (nằm trong envelope `{success:true,data:...}`):

```json
{
  "orders": "13",
  "revenue": "695000",
  "sold": "13",
  "checkins": "4",
  "provider_received": "695000",
  "needs_review": "11",
  "events": "23",
  "users": "15",
  "organizers": "5"
}
```

Nguồn contract: `server/src/app.ts:1199` → `booking.overview` (`server/src/workflows/booking.ts:588`) → summary của order/payment/event/auth. `orders/revenue/sold` chỉ tính đơn PAID; checkins đếm checkins; provider_received cộng payment SUCCEEDED; needs_review đếm payment chưa resolve. Không thể diễn giải provider_received là hoa hồng, hoặc checkins là mọi lần quét/thành công + thất bại. Tổng hợp gọi nhiều summary liên tiếp, chưa có snapshot chung trong overview; cần kiểm tính nhất quán khi dữ liệu thay đổi.

API hành động đã thấy trong source, **chưa gọi nhánh thành công trong phiên này**:

- `POST /admin/events/:id/review`: UUID event thực, `{ "approve": true, "reason": "" }`; từ chối phải có reason, tối đa 2000 ký tự; workflow duyệt event hiện tại cần được kiểm lại trên DB cô lập trước nối Duyệt nhanh.
- `POST /admin/organizer-applications/:id/review`: UUID application thực, cùng payload decision; dùng cho cấp quyền BTC cơ bản. Không coi là cấp chứng nhận pháp lý.
- SePay có `POST /admin/sepay/transactions/:id/resolve` với outcome `confirmed_external/refund_external/unmatched`, reason 3–1000 và evidenceReference tùy chọn: chỉ ghi nhận giải quyết bên ngoài, không chuyển tiền hoàn tự động.

Phiên này không duyệt/từ chối/hoàn tiền, không seed hay chỉnh dữ liệu nghiệp vụ. HTTP 200 là smoke test contract, chưa đối soát độc lập với DB cho toàn bộ phép tổng hợp và chưa kiểm success mutation/race.

## 4. Phạm vi đã chốt — chỉ thêm API doanh thu theo ngày

Xác nhận của người dùng ngày 2026-11-04: “chỉ bổ sung api hỗ trợ chức năng biểu đồ doanh thu theo ngày, loại bỏ các chức năng còn lại”. Áp dụng cho danh sách chức năng còn thiếu API của bản review: giữ chức năng cơ bản đã có backend, chỉ phát triển thêm một API biểu đồ ngày. Không mở rộng backend cho các nhóm dưới đây.

### 4.1. Giữ lại

- AdminShell/header/sidebar hiện có; tiêu đề Dashboard Quản trị.
- Năm nhóm KPI từ API có sẵn: người dùng toàn hệ thống, BTC theo role, sự kiện/số đang bán, vé đã bán/doanh thu PAID, số lượt check-in thành công. Không có trend/Tier/progress/tỷ lệ chưa được chứng minh.
- Hàng đợi sự kiện và BTC cơ bản, chi tiết/điều hướng và review bằng API hiện có; bỏ chi tiết pháp lý/nâng cao không được backend hỗ trợ.
- Làm mới dữ liệu, loading/empty/error/retry.
- **Một biểu đồ doanh thu theo ngày**, có bộ chọn khoảng ngày; thay biểu đồ GMV/phí sàn sáu tháng trong artifact. Không có đường phí sàn, donut hoặc cao điểm vé/phút.

### 4.2. Loại khỏi giao diện và kế hoạch backend

Danh sách sau là phạm vi đã loại, không còn là backlog bắt buộc của C1:

| Nhóm | Phần thiếu / không tương đương API hiện có |
|---|---|
| KPI nâng cao | Tăng trưởng theo tháng, Tier BTC, mục tiêu/progress, hoa hồng ròng/phí 5%, tỷ lệ khớp lệnh QR 99.2%; không tự nhân revenue × 5% |
| Biểu đồ | Series GMV và phí sàn sáu tháng, GMV tháng hiện tại, cao điểm vé/phút; overview không nhận thời gian. Donut có nguồn một phần nhưng chưa thống nhất status/archive/category/mẫu số |
| Xuất báo cáo | Chưa có export tổng hợp C1; export khách hàng không tương đương; script export của Stitch không tải CSV |
| Telemetry | Uptime, latency ngân hàng, server/version/hash, số cảnh báo, feed realtime 3 giây và tỷ lệ thành công webhook đa cổng |
| An ninh | Feed bot/brute-force, quốc gia/IP/request-per-second, trạng thái Cloudflare/drop, chặn IP vĩnh viễn |
| Hoàn tiền | Hàng đợi khiếu nại, quyết định duyệt/từ chối và hoàn tới ví đích; SePay resolve không thay thế luồng này |
| Pháp lý BTC | CCCD/MST/eKYC, phân tầng hồ sơ, định mức ví, ủy quyền sự kiện, đối chiếu hotline; legal-request hiện có chỉ hỗ trợ yêu cầu sửa thông tin |
| Thẩm định sự kiện | Ưu tiên khẩn/SLA 4 giờ, hợp đồng điện tử, giấy phép sở, diễn giả quốc tế, giải thưởng, NFC; list/detail/review cơ bản chỉ hỗ trợ một phần |
| Shell artifact | Tìm toàn cục vé/UID/hash, terminal, trạng thái hạ tầng; giữ shared header/sidebar hiện có, không phát triển bản sao các control này |

Loại toàn bộ donut cơ cấu danh mục vì chưa có hợp đồng đủ rõ; không phát triển API bổ sung cho donut. Bỏ cả khối an ninh/đối soát/hoàn tiền, CTA export/cảnh báo, server/version/hash, thông tin kỹ thuật/hỗ trợ cố định của artifact trong phần nội dung C1. Không sửa shared header/sidebar; không thêm control shell giả từ artifact. Các endpoint SePay/legal/payment đã kiểm ở mục 3 chỉ còn là bằng chứng khảo sát, không tự đưa các khối bị loại trở lại C1.

Không để placeholder, nút vô hiệu hóa, dữ liệu mẫu hoặc toast thay cho chức năng đã bỏ. Thu gọn khoảng trống của các khối bị loại, giữ màu/font/style của phần còn lại; đây là sai lệch triển khai đã được người dùng cho phép, không chỉnh artifact Stitch.

### 4.3. API duy nhất bổ sung — đã triển khai và kiểm thử

`GET /api/admin/stats/revenue-daily?fromDate=2026-11-01&toDate=2026-11-04`

- Quyền ADMIN; envelope `{success:true,data:...}` theo backend hiện có. Không thay contract tổng quan `/admin/stats` hoặc giả định endpoint đó đã hỗ trợ ngày.
- Query bắt buộc `fromDate`, `toDate` dạng ngày lịch hợp lệ `YYYY-MM-DD`; bao gồm cả ngày đầu/cuối. Đề xuất giới hạn tối đa 366 ngày, fromDate <= toDate; request sai trả 400. Frontend mặc định 30 ngày gần nhất tính cả hôm nay theo Asia/Ho_Chi_Minh và truyền đủ hai tham số.
- Timezone cố định `Asia/Ho_Chi_Minh`. Lọc bằng khoảng UTC nửa mở từ đầu fromDate tới đầu ngày sau toDate; nhóm theo ngày địa phương. Không nhóm theo created_at của đơn.
- Doanh thu vé PAID toàn hệ thống: mỗi đơn chỉ tính một lần, lấy total_amount của đơn PAID; mốc ngày theo payment thành công chuẩn được liên kết bởi paid_payment_id, `succeeded_at`. Đối chiếu pattern `organizer-dashboard.ts` và public interfaces khi triển khai; không cộng mọi lần retry payment SUCCEEDED. Không dùng endpoint Organizer có phạm vi owner để thay dữ liệu toàn sàn.
- Tiền VND dạng chuỗi số nguyên, cộng bằng BigInt/SQL numeric. Không tính phí 5%, không gọi doanh thu này là hoa hồng hoặc doanh thu ròng sau hoàn tiền. Đơn không PAID không được tính.
- Backend trả đủ từng ngày theo thứ tự tăng dần, ngày không có doanh thu là chuỗi `"0"`; tổng kỳ phải bằng tổng các điểm. Thiếu liên kết payment chuẩn/thời điểm thành công là lỗi dữ liệu cần báo rõ (đề xuất 409), không tự bỏ đơn hoặc đoán ngày từ created_at.
- Thực hiện tổng/series trong snapshot nhất quán; tôn trọng ownership module, không thêm migration/dịch vụ phụ. Endpoint đã hoạt động:SourceAPI8031/DB55471 kiểm21checkpoints; local8000 authenticated200/tổng695000đ30ngày. Báo cáo/evidence phân biệt rõ fixture và local.

Response **minh họa contract, không phải kết quả API đã chạy**:

```json
{
  "success": true,
  "data": {
    "fromDate": "2026-11-01",
    "toDate": "2026-11-02",
    "timezone": "Asia/Ho_Chi_Minh",
    "currency": "VND",
    "totalRevenue": "150000",
    "series": [
      { "date": "2026-11-01", "revenue": "150000" },
      { "date": "2026-11-02", "revenue": "0" }
    ]
  }
}
```

Khoảng ngày chỉ lọc biểu đồ/tổng kỳ, không thay KPI toàn thời gian hoặc hàng đợi. Nhãn trên UI phải phân biệt rõ hai phạm vi.

## 5. Các giai đoạn thực hiện — đã hoàn tất source và kiểm chứng local

Kết quả22:47: đã tạo `C1DashboardAdmin.tsx` (TSX+CSS multi-line), nối nhánh stats/AdminShell, bỏ user shell riêng C1; thêm workflow `admin-revenue.ts`, SELECT batch500 và route GET ngày. Xem hồ sơ BTC mở đúng bản ghi inline vì C6 chưa hỗ trợ q trong URL. Cấp quyền/duyệt có confirm, recheck, khóa gửi trùng và xử lý mất phản hồi. Toàn bộ bước dưới đã thực hiện trong phạm vi source/DB test/local, trừ giới hạn ghi ở mục6.

### Giai đoạn 1 — Bổ sung API doanh thu ngày ở phiên triển khai

1. Giữ nguyên screen/HTML/ảnh làm chuẩn, đối chiếu lại trước triển khai nếu artifact thay đổi.
2. Giữ định nghĩa KPI hiện có, tách toàn thời gian và theo kỳ. Áp dụng contract doanh thu ngày tại 4.3; kiểm schema/public interfaces và mẫu payment chuẩn trước viết query.
3. Chỉ thêm endpoint doanh thu ngày, kiểm quyền, validation, UTC+7, tổng/series và payment trùng trên DB cô lập; không bổ sung endpoint cho nhóm đã loại.
4. Đã xác minh HTTP thật trước tích hợp biểu đồ; API ngày đã triển khai. Các nhóm đã bỏ không còn chặn scope mới.

### Giai đoạn 2 — Dựng nội dung C1 và dùng shell sẵn có

1. Đã tạo `client/src/pages/admin/C1DashboardAdmin.tsx` và nối `/admin/stats`.
2. TSX và CSS cùng một file: CSS template literal nhiều dòng, mỗi selector/property trên dòng riêng, JSX/props/handler cũng multi-line. Không tách `.css`, không chép Tailwind CDN/script DOM từ Stitch, không minify thành dòng dài.
3. Dùng AdminShell hiện có. Khi được phép code, nối `tab === "stats"` tới page C1; điều chỉnh riêng C1 trong App để không lặp AuthHeader/footer. Không thay đổi cấu trúc/behavior các màn admin khác.
4. Thứ tự sau giảm scope: tiêu đề → năm nhóm KPI có dữ liệu → biểu đồ doanh thu ngày → event/BTC queues. Bỏ donut/audit và khối nâng cao. Scope style bằng `.c1-*`; giữ màu/font/khoảng cách phần còn lại của artifact.
5. Dữ liệu tải qua Axios client hiện có, typed response tường minh; không dùng Object.entries để quyết định thứ tự KPI. Tiền VND hiển thị vi-VN, xử lý giá trị chuỗi lớn, không hard-code trend hoặc percent.

### Giai đoạn 3 — Nối hành vi và trạng thái

- Event detail đi `/admin/events/review/:id`, hàng đợi đầy đủ `/admin/events/review`; BTC đi `/admin/applications/review`. Kiểm chọn đúng bản ghi với khả năng route thực tế, không giả định C6 đã có deep-link theo UUID.
- Duyệt nhanh/cấp quyền cần xác nhận, đọc lại trạng thái, khóa double submit và xử lý 409/reload; chứng minh mutation trên DB cô lập trước tích hợp.
- Loading/empty/error/retry riêng từng vùng; lỗi API không thành 0, dữ liệu chưa biết không thành “đạt”. Làm mới giữ trạng thái lỗi phù hợp, hủy request cũ khi unmount.
- Bộ lọc ngày gọi API doanh thu ngày, hủy/bỏ response cũ khi đổi kỳ; không trộn điểm dữ liệu hai kỳ. Chart một đường doanh thu, trục ngày và VND, tooltip ngày/số tiền; lỗi có retry, kỳ toàn 0 có thông báo rõ. Không triển khai CSV hoặc control đã loại.
- Font tiếng Việt, label cho icon button, focus, keyboard, chart có mô tả/bảng dữ liệu; reduced-motion cho animation cần kiểm.

### Giai đoạn 4 — Kiểm thử và nghiệm thu

- API: ADMIN 200, anonymous 401, USER/ORGANIZER 403; ngày không hợp lệ/đảo ngược/thiếu/vượt giới hạn trả400; một ngày, cuối tháng/năm, mốc 00:00 UTC+7, ngày trống, large sums; PAID/canonical payment/retry không đếm trùng, đơn không PAID không tính; tổng bằng sum(series), lỗi dữ liệu chuẩn và snapshot. Không gọi overview với date rồi coi đã lọc.
- Kiểm mutation approve/reject/409/race trên DB cô lập, không dữ liệu dùng chung; không coi report C9/C11 là test C1.
- UI: 1440/1024/768/390, đối chiếu phần Stitch giữ lại và sai lệch scope đã duyệt; không tràn ngang/nhân đôi shell; kiểm route/refresh/queue/chart/date-filter/loading/error/empty, keyboard/contrast. Xác nhận không còn control hoặc số liệu nhóm đã bỏ.
- Khi có code mới chạy `npm run build --prefix client`, lint và test phù hợp backend nếu có thay đổi. Phiên chỉ tài liệu không chạy build/test source.
- Mỗi phiên tạo report mới, cập nhật plan này với việc đã làm và C1 ở Master Plan (4/5.3/5.4/6.F); không ghi đè report cũ.

## 6. Tiêu chí hoàn tất và trạng thái hiện tại

**ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN**. API ngày đúng UTC+7/zero-fill/tổng/canonical payment/BigInt/snapshot và quyền đã kiểm trên DB riêng; UI/filter/queue/confirm/409/mất phản hồi/4viewport đã kiểm Chrome. Local5173/API8000 GET200,30ngày/tổng695000đ,0businesswrites. Server suite44PASS/18SKIP; C1 có21checkpoints HTTP riêng và19nhóm UI; client/server build, lint/boundaries/diff-check PASS. Còn fulla11y/contrast/browser khác/pixel-diff/benchmark toàn bộ PAID và image/static/public rollout. Image local chưa rebuild, runtime API đã nạp3JS tại chỗ. Stitch giữ nguyên; report mới ghi đầy đủ thay đổi source/API/tài liệu và bằng chứng.
