# Kế hoạch B2 — Quản lý sự kiện (Ban Tổ Chức)

Lập 2026-10-28 11:46, giờ Việt Nam (Asia/Ho_Chi_Minh). Tài liệu này là **kế hoạch** cho việc thực hiện lại màn hình B2; chưa thực hiện sửa code. Phạm vi chỉ B2; B1, B3–B12 là các màn hình khác, không thuộc phiên này.

## Lưu ý về tên gọi

Yêu cầu phiên ghi “B2 — Lịch sử đơn hàng và giao dịch”, nhưng theo Master Plan và tiêu đề Stitch, B2 là **“Quản lý sự kiện”**; “Lịch sử đơn hàng” là A9 (`/orders`). Tên file `Feature_B2_ManagerEvent` khớp “Manager Event”, nên đối tượng thực hiện là **B2 — Quản lý sự kiện**. Sai lệch tên gọi được ghi nhận, không xử lý A9 trong phiên này.

## Nguồn và phạm vi

- Stitch project `10374042969343935993`, screen `b0bca491c8694c069de76d684bd55843`, tiêu đề “B2. Quản lý sự kiện - Cosmic Ticket Ban Tổ Chức”, DESKTOP 2560×2048.
- HTML file `11790387134387571069`, ảnh file `13662411730510336636`. Đã tải và xem cả HTML lẫn ảnh tham chiếu; giữ nguyên artifact, không gọi `edit_screens`.
- Route hiện tại `/organizer` (`client/src/pages/organizer/Organizer.tsx`), guarded role `["ORGANIZER","ADMIN"]` trong `App.tsx`.
- Không chỉnh sửa code frontend/backend hay màn hình khác trong phiên lập kế hoạch này.

## Bối cảnh thiết kế Stitch B2

Ảnh tham chiếu thể hiện trang quản lý sự kiện dạng **dashboard Ban Tổ Chức** với:

1. **Sidebar điều hướng bên trái**: logo/brand BTC, danh sách menu gồm Tổng quan (Dashboard), Quản lý sự kiện, Tạo sự kiện mới, Chi tiết & Phê duyệt, Quản lý loại vé, Đơn hàng, Người tham dự, Quét mã QR, Thống kê doanh thu, Hồ sơ BTC; kèm widget “LIVE GATE SYNC” và badge/khối danh tính Ban Tổ Chức (BTC).
2. **Header organizer**: breadcrumb, ô tìm kiếm, nút thông báo, avatar người dùng.
3. **Thanh KPI/thống kê**: các ô số liệu tổng quan (ví dụ tổng sự kiện, doanh thu, tỷ lệ lấp đầy, …).
4. **Bộ lọc & tab trạng thái**: tab theo trạng thái sự kiện, bộ lọc tìm kiếm/danh mục, sắp xếp, chuyển đổi chế độ xem (lưới/bảng).
5. **Bảng dữ liệu sự kiện**: cột mã sự kiện (dạng `#EVT-xxxx`), tiêu đề, danh mục, trạng thái, thời gian, tỷ lệ lấp đầy (đã bán/sức chứa), doanh thu, hành động.
6. **Phân trang**.

Palette artifact B2 dùng token riêng (gần với Cosmic Graffiti nhưng không trùng hẳn): nền/surface `#0f1222`, surface-container-low `#181b2a`, primary-container `#7c3aed`, secondary `#5de6ff`, tertiary `#ffafd3`, on-surface `#e0e1f7`. Cần đối chiếu với token Cosmic Graffiti chuẩn (`#080B1A`, `#10162B`, `#7C3AED`, `#22D3EE`, `#F472B6`, `#F8FAFC`/`#94A3B8`) khi triển khai.

## Chênh lệch so với code hiện tại (`Organizer.tsx`)

Code hiện tại là danh sách thẻ tối giản, chưa đạt bố cục dashboard B2. Các điểm chưa đạt:

| # | Hạng mục | Stitch B2 | Code hiện tại |
|---|---|---|---|
| 1 | Sidebar điều hướng | Có, đầy đủ menu BTC + LIVE GATE SYNC + badge BTC | Không có |
| 2 | Header organizer | breadcrumb + tìm kiếm + thông báo + avatar | Không có (dùng `site-header` chung) |
| 3 | Thanh KPI/thống kê | Có các ô số liệu tổng quan | Không có |
| 4 | Tab trạng thái | Có tab theo trạng thái | Không có |
| 5 | Tìm kiếm / danh mục / sắp xếp / chế độ xem | Có | Không có |
| 6 | Bảng dữ liệu | Có bảng với cột mã, tiêu đề, danh mục, trạng thái, thời gian, tỷ lệ lấp đầy, doanh thu | Không có; chỉ danh sách thẻ (icon ngày/tháng, trạng thái, tiêu đề, nút Chỉnh sửa/Quản lý) |
| 7 | Mã sự kiện `#EVT-xxxx` | Có | Không có trường tương ứng |
| 8 | Cột tỷ lệ lấp đầy (đã bán/sức chứa) | Có | Không hiển thị |
| 9 | Cột doanh thu | Có | Không hiển thị |

### Phạm vi dữ liệu/API đã chốt (2026-10-28)

**Phạm vi tập trung:** phiên này chỉ thực hiện **B2 — Quản lý sự kiện**; không quan tâm đến các chức năng khác trong sidebar (B1, B3–B12). Sidebar ở B2 chỉ có chức năng **hiển thị giao diện** (menu tĩnh theo artifact), chưa nối route — việc tách route cho từng mục sẽ làm sau.

**Ràng buộc nghiệp vụ:** organizer chỉ được xem các event do chính họ tạo. Route `GET /organizer/events` đã lọc theo `owner` (`events.list({owner: userId})`) và `events.guard` kiểm tra `organizer_id === userId` — ràng buộc này giữ nguyên, không nới rộng.

**Khối “Quick Stats” (số đếm theo trạng thái):** chỉ đếm các event của **organizer đang đăng nhập** (`organizer_id = who(res).userId`), **không** đếm toàn bộ event của hệ thống. Đây là thành phần “tổng quan” duy nhất nằm trong nội dung B2.

**Giữ lại (cần xác minh trước tích hợp):**
1. Response list hiện chỉ trả cột `events`, **không có** doanh thu tạm tính và tỷ lệ lấp đầy (`sold/capacity`). `TicketType` có `capacity`/`sold_quantity` nhưng nằm ở endpoint chi tiết, không ở list — cần bổ sung vào list bằng query đọc dữ liệu sẵn có (không đổi schema).
2. Doanh thu mỗi sự kiện hiện có thể lấy qua `GET /organizer/events/:id/stats` (`{orders, revenue, sold, checkins}`) nhưng không sẵn trong list.

**Loại khỏi phạm vi (không triển khai):** bộ lọc (status/q/category), sort whitelist, sắp xếp theo doanh thu/fill-rate, mã sự kiện `#EVT-xxxx`, tổng quan cấp organizer (Dashboard/KPI — thuộc B1).

**Ràng buộc bổ sung (đã chốt):**
- API bổ sung **không quản lý mã sự kiện** (`#EVT-xxxx`): không tạo, không lưu, không sinh mã; cột mã trong artifact B2 bỏ qua khi triển khai.
- API bổ sung **không được phép ảnh hưởng database**: không thêm bảng/cột, không migration, không DDL, không trigger, không seed — chỉ đọc dữ liệu hiện có.

**Nguyên tắc:** không hard-code dữ liệu mẫu hoặc cam kết chưa xác minh. Nếu API thiếu/sai hợp đồng và không thể xác minh, ghi `BLOCKED` theo quy trình, không tuyên bố hoàn thành.

## Kiểm tra hoạt động các API cần thiết cho B2

### Phân loại API theo trạng thái backend

#### A. API đã có và cần cho B2

| Method & đường dẫn | Vai trò trong B2 | Trạng thái backend |
|---|---|---|
| `GET /api/organizer/events` | Danh sách sự kiện (bảng dữ liệu) | Đã có (`server/src/app.ts:558`), route chỉ truyền `owner` + `offset` |
| `GET /api/organizer/events/:id` | Chi tiết sự kiện (điều hướng sang B4) | Đã có, trả event + `ticketTypes` + `reviews` (`app.ts:573`) |
| `GET /api/organizer/events/:id/stats` | Doanh thu/đã bán/check-in của **một** sự kiện | Đã có, gọi `booking.overview` → `orders.summary(eventId)` trả `{orders, revenue, sold, checkins}` (`app.ts:806`, `workflows/booking.ts:587`) |
| `GET /api/organizer/events/:id/ticket-types` | Sức chứa (capacity) để tính tỷ lệ lấp đầy | Có dữ liệu qua `orders.types(eventId)` (trả `ticket_types` đầy đủ gồm `capacity`, `sold_quantity`, `reserved_quantity`) — route hiện gắn vào `GET .../events/:id`, không có endpoint riêng |

#### B. API đã loại khỏi phạm vi B2 (không triển khai)

Bộ lọc (status/q/category) và sort whitelist **bị loại**: organizer chỉ xem event của chính họ nên danh sách đã giới hạn theo `owner`, không cần bộ lọc/sắp xếp phức tạp ở phiên này. Store hiện có hỗ trợ nhưng route không truyền thêm tham số nào.

#### C. API cần bổ sung (giữ lại — read-only, không ảnh hưởng database)

1. **Doanh thu + tỷ lệ lấp đầy theo từng sự kiện trong list:** `GET /organizer/events` không trả `revenue`/`fill_rate`; bổ sung bằng aggregate đọc dữ liệu sẵn có, **không** thay đổi schema.
2. **Số đếm theo trạng thái của organizer:** phục vụ khối “Quick Stats” ở sub-header B2 (`Tổng: N / Mở bán / Chờ duyệt / Nháp / …`); bổ sung bằng `GROUP BY status` đọc bảng `events`, **không** thay đổi schema. Chỉ đếm event của organizer đang đăng nhập, không phải toàn bộ hệ thống. Đây là thành phần “tổng quan” duy nhất nằm trong nội dung B2.

#### D. API đã loại khỏi phạm vi B2 (không triển khai ở phiên này)

1. **Thống kê tổng quan cấp Ban Tổ Chức (thanh KPI/Dashboard):** thuộc **B1** chứ không phải B2; trong B2 chỉ có mục sidebar “Tổng quan (Dashboard)” (liên kết sang B1) và khối “Quick Stats” số đếm trạng thái. `booking.overview` không có eventId chỉ cho `ADMIN`; **loại** khỏi phạm vi B2.
2. **Mã sự kiện `#EVT-xxxx`:** bảng `events` không có cột `code`; cần thêm cột → ảnh hưởng database, **loại** theo yêu cầu không ảnh hưởng database.
3. **Sắp xếp theo doanh thu/tỷ lệ lấp đầy:** **loại**; giữ `ORDER BY starts_at,id` hiện có.

### Kết quả kiểm tra runtime (đã thực hiện 2026-10-28 11:46)

- `GET http://localhost:8000/api/health` → HTTP **200** `{"success":true,"data":{"status":"ok"}}` — server đang chạy.
- `GET http://localhost:8000/api/config` → HTTP **200** `{"success":true,"data":{"paymentMode":"vnpay_sandbox"}}`.
- `GET http://localhost:8000/api/organizer/events` (không có session) → HTTP **401** — route được bảo vệ đúng.
- Chưa xác minh response có dữ liệu (revenue/fill_rate/số đếm trạng thái) vì cần session ORGANIZER/ADMIN; bước này thuộc phiên triển khai (gọi thật với tài khoản có quyền, ghi status + response đã loại dữ liệu nhạy cảm).

### Thiết kế API bổ sung (không ảnh hưởng database)

Nguyên tắc: **chỉ đọc** dữ liệu từ các bảng/cột hiện có, **không** thêm bảng, cột, migration hay DDL.

#### 1. Bổ sung doanh thu + tỷ lệ lấp đầy vào `GET /organizer/events`

Mở rộng query `events.list` bằng subquery aggregate (không lưu gì vào DB):

- `revenue` = `(SELECT coalesce(sum(total_amount),0) FROM orders o WHERE o.event_id = e.id AND o.status='PAID')` — dùng cột `orders.total_amount`, `orders.status` hiện có; index hỗ trợ `orders_event_status_idx (event_id, status, ...)`.
- `capacity` = `(SELECT coalesce(sum(capacity),0) FROM ticket_types t WHERE t.event_id = e.id)` — cột `ticket_types.capacity` hiện có; index `ticket_types_event_idx (event_id, price_amount)`.
- `sold_quantity` = `(SELECT coalesce(sum(sold_quantity),0) FROM ticket_types t WHERE t.event_id = e.id)` — dùng inventory để đồng nhất.
- `fill_rate` tính ở tầng service/route: `capacity = 0 ? 0 : sold_quantity / capacity` (không chia cho 0, không lưu DB).

**Nguồn “đã bán” đã chốt:** dùng `ticket_types.sold_quantity` (inventory, cập nhật giao dịch) cho fill-rate; doanh thu dùng `orders.total_amount` đơn `PAID`. Không dùng `orders.summary.sold` để tránh lệch với inventory.

#### 2. Số đếm theo trạng thái của organizer

- `SELECT status, count(*) FROM events WHERE organizer_id = $1 GROUP BY status` — `$1` = `organizer_id` của organizer đang đăng nhập (`who(res).userId`); đọc bảng `events`, index `events_owner_idx (organizer_id, ...)`.
- Trả qua endpoint riêng (vd `GET /organizer/events/status-counts`) hoặc field `meta` trong response list để không phụ thuộc phân trang.

### Kế hoạch kiểm thử API

1. **Kiểm thử tầng store (unit/integration):** seed dữ liệu hai organizer A/B (A: 2 event, B: 1 event); gọi list/status-counts cho A; assert chỉ trả event của A.
2. **Kiểm thử runtime (gọi thật):** dùng session ORGANIZER, ghi status code + response đã loại dữ liệu nhạy cảm cho `GET /organizer/events` và endpoint số đếm trạng thái.
3. **Case giá trị:** event không có đơn → `revenue=0`; event không có `ticket_types` → `capacity=0` → `fill_rate=0` (không lỗi chia 0); đơn `PENDING_PAYMENT`/`EXPIRED`/`CANCELLED` không cộng vào `revenue`.
4. **Case cross-tenant:** organizer B không thấy event của A (kiểm tra ràng buộc `owner`).
5. **Phân trang:** `limit 50` + `total_results` vẫn đúng sau khi thêm aggregate.
6. **Không ảnh hưởng database:** kiểm tra bằng git diff / danh sách migration — không có DDL mới.

### Tiêu chí đánh giá API hoạt động đúng

1. Chỉ trả event thuộc `organizer_id` của người gọi (không rò dữ liệu chéo).
2. `revenue` của mỗi event = tổng `total_amount` các đơn `PAID` của event đó.
3. `capacity` = tổng `capacity` các `ticket_types`; `sold_quantity` = tổng `sold_quantity`; `fill_rate = sold/capacity`, bằng 0 khi `capacity=0`, luôn trong `[0,1]`.
4. Tổng số đếm theo trạng thái = tổng số event của organizer.
5. Đơn không phải `PAID` không cộng vào `revenue`/`sold`.
6. Phân trang và `total_results` hoạt động đúng.
7. Không có migration/DDL mới (đối chiếu git diff / thư mục migration).

## Trình tự thực hiện (khi được giao triển khai)

1. Xác nhận phạm vi B2 và phương án xử lý các điểm mâu thuẫn (tên gọi “Lịch sử đơn hàng”, cột doanh thu/tỷ lệ lấp đầy khi list chưa trả, palette artifact khác token chuẩn). Giữ artifact gốc.
2. Kiểm tra route, guard và shell organizer; tạo layout chung B1–B12 để đặt Sidebar dùng chung. Ở B2, Sidebar chỉ hiển thị giao diện (menu tĩnh theo artifact), chưa nối route cho các mục khác (xem mục dưới).
3. Xác minh API `GET /organizer/events?page=…` (bổ sung revenue/fill_rate) và endpoint số đếm trạng thái: method/đường dẫn/quyền/response thật; gọi thử với tài khoản ORGANIZER, ghi status và response đã loại dữ liệu nhạy cảm. Nếu thiếu bằng chứng, ghi BLOCKED. Không bổ sung lọc/sort/mã sự kiện/tổng quan (ngoài phạm vi).
4. Ánh xạ bố cục và token từ artifact sang JSX/CSS: sidebar (chỉ hiển thị giao diện, chưa nối route), header, khối “Quick Stats” số đếm trạng thái (chỉ của organizer đang đăng nhập), bảng dữ liệu (tiêu đề, danh mục, trạng thái, thời gian, tỷ lệ lấp đầy, doanh thu), phân trang. Bỏ qua tab/bộ lọc/sắp xếp, thanh KPI tổng và cột mã sự kiện.
5. Kiểm thử trạng thái loading/empty/error, phân trang, quyền sở hữu (chỉ thấy event của mình); responsive desktop/tablet/mobile, bàn phím, focus, tương phản. Chạy build và kiểm thử liên quan.
6. Tạo report mới và cập nhật B2 trong Master Plan với bằng chứng; không kết luận đạt từ ảnh tĩnh.

## Yêu cầu Sidebar (component + style riêng)

Sidebar Ban Tổ Chức được tách thành component và file style riêng để dùng lại ở B1–B12. **Ở phiên B2, sidebar chỉ có chức năng hiển thị giao diện** (menu tĩnh theo artifact), **chưa nối route** — việc tách route và nối điều hướng cho từng mục sẽ làm ở các phiên sau. Đề xuất (chỉ là kế hoạch, chưa tạo file):

- **Component:** `client/src/pages/organizer/OrganizerSidebar.tsx` — nhận props gồm `active` (mục đang chọn, mặc định “Quản lý sự kiện”) và `user` (danh tính BTC). Không dùng `NavLink`/`Link` nối route trong phiên này; chỉ render menu tĩnh theo artifact.
- **Style:** `client/src/pages/organizer/organizer-sidebar.css` — chứa token sidebar (màu nền/surface, mục active, hover, badge BTC, widget LIVE GATE SYNC) theo palette artifact B2, tách khỏi style trang.
- **Menu items** (hiển thị tĩnh theo artifact, chưa nối điều hướng ở B2): Tổng quan (Dashboard), Quản lý sự kiện, Tạo sự kiện mới, Chi tiết & Phê duyệt, Quản lý loại vé, Đơn hàng, Người tham dự, Quét mã QR, Thống kê doanh thu, Hồ sơ BTC. Việc ánh xạ sang route thực tế (B1–B12) được hoãn sang các phiên tách route sau.
- Không trùng với `client/src/components/ui/sidebar.tsx` (shadcn chung, hiện không dùng cho organizer) trừ khi có quyết định tái sử dụng rõ ràng.

## Tiêu chí nghiệm thu

- Bố cục đối chiếu Stitch B2 và các ngoại lệ được xác nhận; shell organizer hoạt động.
- Sidebar dùng chung hiển thị đúng theo artifact trên B2 (menu tĩnh, chưa nối route) và sẵn sàng tái sử dụng cho B1–B12 ở các phiên tách route sau.
- Dữ liệu bảng (doanh thu, tỷ lệ lấp đầy) đến từ API hoạt động thực tế (read-only, không đổi database); không dùng mock/hard-code thay thế (trừ khi được yêu cầu rõ và ghi chú).
- Phân trang hoạt động đúng; organizer chỉ thấy event do chính họ tạo. Bộ lọc/sắp xếp/thanh KPI tổng/mã sự kiện nằm ngoài phạm vi phiên này.
- Trạng thái loading/empty/error, điều hướng, responsive và accessibility được kiểm chứng.
- Build và kiểm thử liên quan đạt. Nội dung mẫu, chức năng và hợp đồng API chưa xác minh trong phiên lập kế hoạch.

## Quyết định và kết quả phiên lập kế hoạch (2026-10-28)

- Đã đọc Master Plan, xác minh B2 = “Quản lý sự kiện” (không phải “Lịch sử đơn hàng” = A9); ghi nhận sai lệch tên gọi.
- Đã kiểm tra thiết kế B2 trên Stitch (screen `b0bca491c8694c069de76d684bd55843`), tải HTML + ảnh tham chiếu; artifact giữ nguyên, không gọi `edit_screens`.
- Đã đối chiếu code hiện tại (`Organizer.tsx`) và liệt kê 9 hạng mục chênh lệch UI + 5 hạng mục chênh lệch API ở trên.
- Đã thu hẹp phạm vi API (2026-10-28): loại bộ lọc/sort whitelist/sắp xếp theo doanh thu-fill-rate/mã sự kiện/tổng quan organizer; giữ bổ sung doanh thu + tỷ lệ lấp đầy và số đếm trạng thái bằng query read-only không ảnh hưởng database; bổ sung kế hoạch kiểm thử và tiêu chí đánh giá API hoạt động đúng.
- Đã chốt phạm vi B2 (2026-10-28): chỉ tập trung B2 — Quản lý sự kiện, không quan tâm các chức năng khác trong sidebar; sidebar chỉ hiển thị giao diện (menu tĩnh), việc tách route làm sau; khối “Quick Stats” chỉ đếm event của organizer đang đăng nhập, không đếm toàn bộ hệ thống.
- Chưa chỉnh sửa bất kỳ code frontend/backend hay màn hình khác; phiên này chỉ tạo tài liệu.
- Kết quả rà soát chi tiết và bằng chứng: xem [report phiên](../reports/stitch/B2_20261028_114609_review.md).
