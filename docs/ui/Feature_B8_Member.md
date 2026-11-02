# Feature B8 — Danh sách người tham dự

## Phạm vi hiện hành — cập nhật 2026-11-01 22:15:52 UTC+07

Theo yêu cầu mới của người dùng, **chỉ bổ sung API hỗ trợ bộ lọc và tổng số trang; loại bỏ các chức năng còn lại ngoài danh sách cốt lõi**. Phần này thay thế kế hoạch triển khai/nghiệm thu đầy đủ ở mục 1–3 và 5–7 bên dưới; các mục đó giữ làm lịch sử review, không còn là danh sách phải thực hiện. Mục 4 là bằng chứng API legacy của phiên trước, không chứng minh API mở rộng đã hoạt động.

Trạng thái cập nhật **2026-11-01 22:29:02 UTC+07: ĐÃ TRIỂN KHAI SOURCE, ĐẠT CÓ ĐIỀU KIỆN trên API/DB test riêng**. Bộ lọc/tổng trang, page B8, sidebar/header và picker qse-grid đã hoạt động; 75 HTTP checkpoints, snapshot concurrency, 3 Chrome tests, build/lint/boundaries PASS. Chưa rollout Docker8000/Live hoặc audit accessibility đầy đủ. [Report triển khai](../reports/stitch/B8_20261101_222902_implementation.md); [xác nhận phạm vi trước](../reports/stitch/B8_20261101_221552_scope_update.md).

### Giữ và loại bỏ khỏi UI B8

| Thành phần | Phạm vi triển khai mới |
|---|---|
| Shell/picker | Giữ OrganizerSidebar, OrganizerHeader, qse-grid chọn event khi thiếu ID; TSX và CSS B8 cùng một file, viết nhiều dòng dễ đọc |
| Ngữ cảnh | Giữ tên/ngày/địa điểm sự kiện và đổi sự kiện; bỏ Gate Active |
| Danh sách | Giữ tên/email người mua snapshot, chữ đầu avatar, mã vé/copy, hạng vé, status, checked_in_at; một dòng là một vé, không gọi là số người duy nhất |
| Search | Tìm mã vé/tên/email theo dữ liệu hiện có; bỏ tìm SĐT/mã đơn |
| Bộ lọc trạng thái | Tất cả, Đã check-in (CHECKED_IN), Chưa check-in (VALID). VOID chỉ nằm ở Tất cả và hiện đúng nhãn, không gộp vào chưa check-in |
| Bộ lọc hạng vé | Lọc theo ticketTypeId thật thuộc event, options từ GET event.ticketTypes; không suy VIP/VVIP từ tên hạng |
| Bộ lọc cổng/VIP/SĐT | Bỏ vì cần dữ liệu/mô hình ngoài phạm vi. Bộ lọc được bổ sung chỉ gồm trạng thái và loại vé, kết hợp search hiện có |
| Phân trang | Bổ sung total/totalPages trên toàn bộ kết quả đã lọc; 5 vé/trang theo mẫu Stitch, không đếm riêng lô đang tải |
| KPI | Bỏ toàn bộ khối KPI, phần trăm, số đếm trên tab, dự báo/30 phút/hủy-vắng mặt; chỉ giữ tổng kết quả tại footer phân trang |
| Metadata phụ | Bỏ phone, holder riêng, VIP/VVIP, khu/ghế/bàn/cổng/làn, nhân viên và thiết bị/POS/IP/BLE/Dynamic QR |
| Actions nghiệp vụ | Bỏ Excel, nhập danh bạ VIP, chi tiết attendee, đổi/thu hồi vé, check-in ngay/thủ công, menu phụ và modal preview/check-in |
| Telemetry/nội dung mẫu | Bỏ Live Gate Sync/VN-S1/12ms/SHA-256, Zalo/SMS/Merch; dùng hideLiveSync trên sidebar B8 |

Không để lại nút disabled hoặc toast “chưa hỗ trợ” cho phần bị loại. Giữ màu/font/phong cách các phần Stitch còn lại, bố cục mới: **hero → bộ lọc → bảng → phân trang**. Đây là sai lệch UI so với Stitch đã được người dùng duyệt; artifact Stitch giữ nguyên. B8 mới không gọi stats/checkin-history/POST checkins; không xóa các API đó hay thay đổi B9.

### API duy nhất cần mở rộng: GET attendees

**Contract đã triển khai và kiểm thử trên source API8018/DB test riêng:** `GET /api/organizer/events/:id/attendees`. Mô tả dưới đây là hợp đồng của bản source mới; Docker8000 chưa rollout.

- Giữ tương thích legacy: không có `paginated=true` thì response mảng `data` và lô50 như hiện tại. B8 mới dùng `paginated=true`, vẫn giữ `data` là mảng và thêm `pagination` ở envelope.
- Query B8: `paginated=true&page=0&limit=5&q=&status=VALID&ticketTypeId=<uuid>`. Chọn Tất cả thì bỏ status/ticketTypeId.
- `page`: integer0..10000; `limit`: integer1..50, mặc định5 khi paginated; `q`: trim, tối đa200, tìm mã vé/tên/email. Xác định và kiểm escape `%`/`_` để tìm literal khi triển khai; không mở rộng tìm phone.
- `status`: VALID hoặc CHECKED_IN; giá trị khác trả400. `ticketTypeId`: UUID thuộc event, sai định dạng/trái event trả400. Query không hỗ trợ trong chế độ paginated phải trả400 thay vì bỏ qua.
- Lọc bằng `order_items.ticket_type_id`, không so tên snapshot. Kiểm options gồm loại đã lưu trữ còn vé nếu GET event hiện có trả về chúng; không thêm API options/metadata ngoài phạm vi.
- Response: `{ success: true, data: [...], pagination: { page, pageSize, total, totalPages } }`, `totalPages = Math.ceil(total / pageSize)`. Không thêm summary/KPI/telemetry/contact/holder.
- COUNT và SELECT có cùng event/owner/q/status/ticketTypeId, cùng snapshot DB; sort ổn định `issued_at DESC,id`. Trang rỗng vẫn trả total thật.
- total=0 → totalPages=0, UI hiển thị 0 kết quả và khóa phân trang, không hiển thị trang1/0. Trang vượt phạm vi trả [] cùng tổng thật, cho phép quay lại trang hợp lệ.
- Giữ guard owner/Admin, guest401/khác chủ403. Không thêm schema hoặc POST/PATCH/DELETE nghiệp vụ cho B8.

### Trình tự thực hiện và nghiệm thu mới

Kết quả phiên triển khai: các bước1–5 đã kiểm theo bảng bên dưới; bước6 đã ghi report/plan/Master Plan. Header dùng searchSlot là nhãn ngữ cảnh, input tìm kiếm hoạt động tại bộ lọc để tránh hai input trùng nhau. Khi API runtime cũ thiếu pagination, B8 hiện lỗi rõ ràng thay vì suy đoán total từ lô50.

| Hạng mục | Kết quả thực tế |
|---|---|
| Backend | GET `paginated=true`, status/type/q, COUNT+SELECT trong REPEATABLE READ; strict validation; no-store; legacy mảng50 không đổi |
| Frontend | AttendeeManagerPage.tsx chứa JSX/CSS nhiều dòng; shared shell; route/picker/sidebar không ID; list5/trang; search250ms/ESC/copy; status/type/archived options |
| Trạng thái | Loading/empty/filter-empty/network retry/not found; request cũ bị hủy; đổi event reset dữ liệu; API cũ thiếu pagination hiện lỗi |
| API tests | 63 vé (40 VALID/20 CHECKED_IN/3 VOID), 2 hạng trùng tên khácID, loại archive; 75 HTTP checkpoints PASS; count/list vẫn khớp khi rename giữa hai query |
| Browser | Chrome3tests PASS, viewport1440/1024/768/390; ảnh và JSON tại evidence/B8_20261101_implementation; picker3/2/1 cột, copy/ESC, filter/page, table scroll/mobile menu |
| Checks | Server/client build, client lint, boundaries, ownership2tests và git diff --check PASS |
| Giới hạn | Docker8000/Live chưa rollout; browser khác/full a11y/benchmark lớn chưa kiểm; không còn mutation B8 trong phạm vi |

1. Triển khai/kiểm thử GET mở rộng trên DB cô lập: VALID/CHECKED_IN/VOID, nhiều vé cùng buyer, hai loại vé trùng tên nhưng khác ID, >50 vé; q/status/type kết hợp, count/trang cuối/zero/vượt trang, validation và quyền. Kiểm response legacy không đổi.
2. Thêm picker purpose attendees dùng qse-grid hiện có; route đề xuất `/organizer/events/attendees`, route roster `/organizer/events/:id/attendees`. Sidebar không ID vào picker; có ID vào đúng event; đổi event/reset filter/page, không tự chọn event đầu tiên.
3. Dùng shared sidebar/header, searchSlot nối search, menu mobile/NotificationLink; chỉ CSS riêng B8 scoped trong TSX nhiều dòng. Không refactor shell/CSS của màn khác.
4. Dựng các phần giữ lại trong bảng trên; filter server-side, search debounce/cancel response cũ, reset page khi đổi filter. Không lọc riêng lô50 rồi tính tổng. Có loading, empty event/search/filter, retry, forbidden/not found, keyboard labels/focus và copy lỗi clipboard.
5. Build/lint và browser1440/1024/768/390, kiểm picker/shell/table scroll, direct URL/reload/đổi event và phân trang dữ liệu lớn. So với phần Stitch còn giữ; KPI/modal đã bỏ không phải lỗi nghiệm thu. Không yêu cầu kiểm mutation B8 vì không có mutation nghiệp vụ trong phạm vi mới.
6. Tạo report mới, cập nhật nhật ký file này và Master Plan sau từng lần chỉnh sửa. Chưa triển khai source/API trong phiên cập nhật plan này; không dùng kết quả GET legacy để kết luận contract mới PASS.

---

## Nội dung review và kế hoạch ban đầu (lịch sử, đã được phạm vi trên thay thế)

Ngày review: **2026-11-01 22:08:41 UTC+07**. Phạm vi phiên: chỉ tài liệu, không triển khai source, không chỉnh Stitch hoặc dữ liệu nghiệp vụ.

- Tên trong Master Plan: **B8 — Quản lý người tham dự**.
- Route đích: `/organizer/events/:id/attendees`.
- Stitch project: `10374042969343935993`; screen: `361b579259ca4b7cb6fbef553436b3c3`, DESKTOP **2560×3552**.
- HTML: `projects/10374042969343935993/files/4237471753379167870`; ảnh: `projects/10374042969343935993/files/15248808741387588317`.
- Đã đọc HTML và xem ảnh qua MCP `download_file`. Không gọi `edit_screens`/generate/apply design system.
- [Báo cáo phiên](../reports/stitch/B8_20261101_220841_review_plan.md), [Master Plan](../PROJECT_MASTER_PLAN.md).
- Kết luận: **KHÔNG ĐẠT** đối với code hiện tại so với B8; kế hoạch tài liệu hoàn tất. **Tích hợp đầy đủ BLOCKED** bởi các thiếu hụt API; không phải bị chặn quyền Stitch.

## 1. Yêu cầu và nguyên tắc thực hiện

Master Plan mục 4 ghi `Operations.tsx` đã tích hợp GET attendees; mục 5.2 ghi “Có code, cần đồng bộ”. Mục 7 yêu cầu đúng sự kiện, quyền và chống check-in trùng. Master Plan chưa mô tả chi tiết từng hành động B8; danh mục dưới đây lấy từ HTML/ảnh thực tế, không xem số liệu mẫu là yêu cầu dữ liệu thật.

1. Sao lại bố cục nội dung B8 hiện có, giữ thứ tự hero → 4 KPI → bộ lọc → bảng → phân trang → modal check-in.
2. Dùng lại `OrganizerSidebar` và `OrganizerHeader` theo yêu cầu người dùng. Không sao chép shell riêng từ HTML; khác biệt shell này đã được người dùng chỉ định.
3. Khi thiếu event ID, dùng picker `qse-grid` của `OrganizerEventListPage`, không tự chọn sự kiện đầu tiên.
4. Khi được triển khai sau này, JSX/TSX và CSS riêng B8 nằm **cùng một file `.tsx`**, CSS trong template literal nhiều dòng, scope `.b8-page`; không tạo file CSS B8 riêng. CSS/component dùng chung hiện có tiếp tục được tái sử dụng, không chuyển toàn bộ CSS chung vào B8.
5. Không mang script Tailwind CDN, onclick/alert mẫu, tên khách, số vé, IP máy, số KPI hoặc thông báo thành công mẫu sang ứng dụng. Chưa có API thì ghi rõ chưa hỗ trợ; không tự bỏ/thiết kế lại thành phần hoặc tạo thành công giả.
6. Mỗi lần sửa tài liệu hoặc triển khai tiếp theo phải cập nhật nhật ký **ngay trong file này**, tạo report mới và cập nhật riêng B8 trong Master Plan. Không ghi đè report cũ.

## 2. Thiết kế đã xác minh và Cosmic Graffiti

| Vùng | Thiết kế thực tế | Quy tắc sao lại |
|---|---|---|
| Hero | “Danh sách người tham dự & Roster Check-in”, pill tên/ngày/địa điểm/Gate Active; xuất Excel, nhập danh bạ VIP, check-in thủ công | Lấy ngữ cảnh từ GET event, ngày UTC+7; Gate Active phải có logic được xác minh |
| KPI | Tổng vé phát hành/đã bán, đã check-in, chưa check-in, vé hủy/vắng mặt; phần trăm, +312 trong 30 phút, dự báo giờ dồn khách | Không dùng số mẫu, không đồng nhất vé với số người duy nhất hoặc vé hủy với vắng mặt |
| Lọc | Tất cả, đã check-in, chưa check-in, VIP/VVIP; tìm tên/SĐT/mã vé, ESC xóa; chọn hạng vé/cổng | Filter toàn tập dữ liệu ở backend; không lọc chỉ một lô 50 rồi gọi đó là tổng |
| Bảng | Người tham dự (avatar/chữ đầu, tên, email, phone, VIP), mã/hạng/khu vé, cổng, trạng thái/giờ/nhân viên, thiết bị, thao tác | Dùng đúng trường API; giữ khác biệt dữ liệu người mua và người thực sự giữ vé |
| Hành động dòng | Copy mã, xem chi tiết, đổi vé, thu hồi, check-in ngay, menu khác | Copy có thể làm client-side; phần còn lại cần contract tương ứng |
| Footer | Live Gate Sync, SHA-256/VN-S1/12ms; 1–5 trên 3.420 và trang 1…684 | Cần total/telemetry thật, không hiển thị xác nhận vận hành từ dữ liệu mẫu |
| Modal | Nhập mã vé/QR, chọn cổng, nhân viên/máy read-only, preview VALID, hủy/xác nhận | Preview không được gọi API thực hiện check-in; cần xác minh riêng, không báo VALID khi chưa kiểm |

HTML dùng Syne cho heading, Be Vietnam Pro cho body, Space Grotesk cho nhãn; tím `#7c3aed`, cyan `#5de6ff`, nền `#0f1222`, surface thấp `#181b2a`, chữ `#e0e1f7`, hồng `#ffafd3`. Đây là palette sinh ra trong chính theme project. Phần mô tả designMd/skill lại nêu `#080B1A`, `#10162B`, `#22D3EE`, `#F8FAFC`, `#F472B6`. Ghi nhận lệch token, **không tự recolor B8**: ưu tiên sao artifact đã có, shell dùng shared components theo yêu cầu. Radius HTML DEFAULT 4px/lg 8px/xl 12px khác mô tả card 16px; cũng cần giữ và ghi nhận.

Ảnh desktop cho thấy tiêu đề lớn hai dòng, KPI bốn cột; bảng rộng, ảnh không cho thấy trọn hai cột cuối nhưng HTML có thiết bị và thao tác. Không bỏ các cột đó chỉ vì ảnh bị giới hạn ngang. Logo/BTC trong ảnh bị xuống dòng/cắt, shared sidebar hiện có tránh việc sao nguyên lỗi shell. Nội dung còn tiếng Anh, brand title “Cosmic Ticket”, dữ liệu sự kiện 2025, thông báo Zalo/SMS/Merch mẫu. HTML có breakpoint cho nội dung nhưng sidebar fixed `w-64` và wrapper `pl-64`; responsive/a11y chưa thể kết luận đạt từ ảnh.

## 3. Những điểm code hiện tại chưa đạt

| Mức | Phát hiện và bằng chứng | Hướng xử lý trong phiên triển khai sau |
|---|---|---|
| P1 | `Operations.tsx` chỉ PageHead, tabs nghiệp vụ, tìm kiếm và bảng 4 cột; thiếu toàn bộ hero/KPI/filter/actions/modal B8 | Page B8 riêng, giữ bố cục Stitch |
| P1 | `App.tsx` dùng `/organizer/events/:id/:tab`; điều kiện shell organizer chưa bao gồm attendees | Route tường minh và nhận diện shell B8, tránh header ngoài lồng header Organizer |
| P1 | `OrganizerSidebar.tsx`: Người tham dự = `base && ...`; không ID chỉ render span | Route picker đề xuất `/organizer/events/attendees` và link fallback tương ứng |
| P1 | `OrganizerEventListPage` chỉ có purpose scan/edit/tickets | Sau khi được triển khai, thêm purpose attendees dùng `qse-grid`, suffix `/attendees`, active “Người tham dự” |
| P1 | API trả email nhưng bảng hiện tại chỉ tên người mua; chưa avatar/chữ đầu, contact, nhân viên/cổng/thiết bị | Map các trường đã có; không bịa trường còn thiếu |
| P1 | Search placeholder “Mã vé, mã đơn hoặc tên”, backend attendees không tìm mã đơn; chưa debounce | Placeholder đúng contract; debounce/cancel request và reset trang khi đổi q/event |
| P1 | Pagination chỉ trước/sau, `hasNext = length === 50`; không total/totalPages, chưa khớp mẫu 5 dòng/trang | Cần total server trước khi triển khai numbered pagination; phân biệt index API 0 và UI 1 |
| P1 | Chưa filter status/ticketType/gate/VIP và KPI đúng định nghĩa | Bổ sung contract, không truyền query rồi tưởng backend đã lọc |
| P2 | Có Loading/Notice nhưng bảng trống không có thông điệp rõ, chưa retry riêng/luồng mutation | Bổ sung loading, empty event, empty search, error/retry, forbidden/not found, pending/success/duplicate |
| P2 | Header mặc định có input tìm kiếm không handler | Dùng `searchSlot` nối search có phạm vi sự kiện, hoặc mô tả rõ phạm vi; không sửa shared header ngoài nhu cầu B8 |

## 4. API hiện có và kết quả kiểm thử

Base đã thử: `http://127.0.0.1:8000/api` (Docker `pbl6-api-1`). API prefix `/api` bắt buộc khi gọi HTTP; client Axios đang dùng đường tương đối. Chỉ GET dữ liệu nghiệp vụ, POST login tài khoản demo đã có. Không seed, migration, tạo đơn/vé, check-in, gửi email hoặc thay đổi cấu hình/container. Không ghi password/token/PII vào tài liệu.

Nguồn: `server/src/app.ts:1030`, `modules/event/public.ts` guard, `modules/order/public.ts`, `modules/order/infrastructure/store.ts:191`, `workflows/booking.ts`. Guard cho ADMIN hoặc ORGANIZER sở hữu event; người mua/staff không mặc nhiên có quyền roster.

| Endpoint | Contract thực tế | Kiểm chứng runtime |
|---|---|---|
| GET `/health` | health envelope | 200, `{"success":true,"data":{"status":"ok"}}` |
| GET `/organizer/events?page=0&limit=6` | Mảng event, `total_results` trên row | Owner 200, 6 sự kiện, total_results="21"; có ảnh/địa điểm/thời gian phục vụ qse-grid |
| GET `/organizer/events/:id` | Event + ticketTypes + reviews | 200 cho ID chọn bên dưới; có checkin_opens_at/closes_at/paused/status |
| GET `/organizer/events/:id/attendees?page=0&q=` | `page` integer 0..10000; `q` tối đa 200, không trim; mỗi lô cố định 50; mảng trong `data` | 200 trên cả 6 ID từ picker; 5 event rỗng, 1 event có 1 vé VALID |
| GET `/organizer/events/:id/stats` | orders/revenue/sold/checkins, giá trị chuỗi số | 200, `{"orders":"1","revenue":"150000","sold":"1","checkins":"0"}` |
| GET `/organizer/events/:id/checkins?page=0` | Mảng log có ticket_id, checked_in_by, checked_in_by_name, checked_in_at, method | 200, `[]`; chưa kiểm response có log thật |
| POST `/organizer/events/:id/checkins` | Body `{ "code": "<ticket_code hoặc QR token thật>" }`, code max 256; actor từ token | Có source, **chưa gọi mutation**; cần DB test riêng cho thành công/trùng/sai event/hủy/ngoài giờ |

Event có dữ liệu đã chọn từ API owner: `cbe172d3-a06a-42fa-8557-abeb50a4044b`. Response attendee có đúng 10 trường: `id`, `event_id`, `ticket_code`, `status`, `issued_at`, `ticket_type_name_snapshot`, `event_title_snapshot`, `buyer_name_snapshot`, `buyer_email_snapshot`, `checked_in_at`. Vé quan sát: VALID, checked_in_at=null. Không có total, phone, ticket_type_id, order_id, gate, device, VIP hay người giữ vé riêng.

Các kiểm thử thực hiện trên event này:

| Request/tình huống | Kết quả |
|---|---|
| q = ticket_code thật, buyer_name_snapshot thật, buyer_email_snapshot thật (encodeURIComponent) | Mỗi lần 200, 1 dòng, đúng ticket ID gốc |
| q = `B8_NO_MATCH_20261101` | 200, `[]` |
| page=1 | 200, `[]` (chưa có >50 vé để kiểm ranh giới) |
| page=-1 | 400 VALIDATION |
| ID `not-a-uuid` | 400 VALIDATION |
| UUID không tồn tại `00000000-0000-4000-8000-000000000000` | 404 NOT_FOUND |
| Không token | 401 UNAUTHORIZED |
| Organizer khác / Customer | 403 FORBIDDEN / 403 FORBIDDEN |
| ADMIN | 200, 1 dòng |
| `status=BOGUS&ticketTypeId=BOGUS&gateId=BOGUS&limit=1` | 200, vẫn dòng gốc. Source chỉ đọc page/q; các query này bị bỏ qua, không phải filter hợp lệ |

SQL tìm `ticket_code`, tên và email bằng ILIKE `%q%`; không tìm phone hoặc mã đơn. `%`/`_` có nghĩa wildcard SQL, cần xác định semantics nếu nâng API. Thứ tự `issued_at DESC,id`; không có sort API. Stats `sold` là tổng quantity đơn PAID, không chứng minh tổng mọi vé phát hành/hủy/vắng mặt. Một dòng là một **vé** với snapshot người mua, không chứng minh một người tham dự duy nhất.

## 5. Chức năng Stitch chưa được API hỗ trợ đầy đủ

| Chức năng | Phân loại thiếu hụt | Điều kiện trước khi nối UI |
|---|---|---|
| Tổng kết quả/số trang, lọc status/hạng vé/VIP/cổng, tìm SĐT | GET attendees thiếu contract | Endpoint paginated có count cùng bộ lọc; ticketTypeId ổn định; xử lý query không hỗ trợ rõ ràng |
| Điện thoại/nhãn VIP/VVIP/người giữ vé thực | Roster thiếu dữ liệu; phone buyer có hướng tái sử dụng ở nghiệp vụ order detail nhưng roster không có order_id | Chốt phone current hay snapshot, phân biệt buyer/holder; không suy VIP chỉ từ tên loại vé |
| Cổng/zone/làn ưu tiên/ghế/bàn | Chưa thấy model/route phục vụ B8 | Cần mô hình và API gán/lọc cổng; không dùng venue làm gate |
| POS/IP/BLE/Dynamic QR | Chưa có telemetry/contract thiết bị trong roster | Không hiển thị IP hoặc đồng bộ giả |
| KPI vé hủy/vắng mặt, +30 phút, dự báo dồn khách | Stats chỉ orders/revenue/sold/checkins | Chốt định nghĩa/count theo status; vắng mặt cần mốc thời gian; forecast cần dữ liệu/thuật toán |
| Excel | Không có endpoint export roster | Có thể xuất client-side nếu lấy đủ dữ liệu, nhưng hiện thiếu tổng/snapshot; phải chốt phạm vi “toàn bộ” hay “đang lọc”, XLSX thật và chống formula injection |
| Nhập danh bạ VIP | Không có endpoint import/validation/dedupe | Cần contract, quyền, kiểm lỗi từng dòng và quy tắc phát hành vé; không gọi order tạo vé thay thế |
| Xem chi tiết attendee | Không có GET attendee detail | B7 detail/preview QR cần orderId, roster chưa trả orderId; `/me/tickets/:id` là quyền người mua, không thay API organizer |
| Đổi vé/thu hồi một vé | Không thấy endpoint organizer tương ứng | Không dùng hủy event/đơn để thay thu hồi vé; cần policy và transaction |
| Check-in thủ công/check-in ngay | POST checkins hỗ trợ code/QR nhưng chưa kiểm mutation phiên này | Chỉ gửi code, actor lấy từ token; gate/device trong modal chưa được ghi nhận |
| Preview VALID trước xác nhận | Không có endpoint preview mã/QR không mutation dành B8 | Không gọi POST checkins để “xem trước”; q tìm vé không thay kiểm tính hợp lệ đầy đủ |
| Nhân viên soát | Log checkins có actor name, roster không có | Cần join/endpoint aggregate; không gộp chỉ trang đầu log để kết luận toàn bộ |
| Zalo/SMS/Merch, Live Gate Sync/VN-S1/12ms/SHA-256 | Không có API trạng thái tương ứng | Giữ ghi nhận thiếu hụt; không tuyên bố dịch vụ đang chạy |

Copy mã, mở/đóng modal, ESC xóa, điều hướng và chữ đầu avatar không cần API riêng. GET event có thể cung cấp tên/ngày/địa điểm và dữ liệu đánh giá cửa sổ check-in; server vẫn là nơi quyết định cuối cùng. Không xếp toàn bộ UI vào “thiếu API”.

## 6. Kế hoạch triển khai sau review

### P0 — Chốt nghiệp vụ và contract

- Chốt đơn vị roster là vé hay người giữ vé; định nghĩa total/checkedIn/notCheckedIn/void/noShow/VIP.
- Thống nhất phần thiếu API: triển khai backend trong phiên được giao riêng, hoặc xin duyệt cách hiển thị chưa hỗ trợ. Phiên này không tự cắt tính năng hay đổi thiết kế.
- Đề xuất mở rộng tương thích GET attendees hoặc endpoint mới, response items + pagination + summary + filter options, total trên cùng scope/filter; giữ contract mảng legacy nếu còn consumer.
- Kiểm thử API mới trên DB cô lập: nhiều người mua/mỗi người nhiều vé, VALID/CHECKED_IN/VOID, >50 vé, quyền owner/admin/khác chủ/staff, event không tồn tại, filter kết hợp, total và snapshot consistency.
- Kiểm thử POST check-in code/QR, chống trùng và đồng thời, ngoài giờ/paused/cancelled, sai event, unpaid, void; không chạy trên vé thật đang vận hành.

### P1 — Picker, route và shell

- Route đề xuất `/organizer/events/attendees` → picker; route event cụ thể `/organizer/events/:id/attendees` → page B8. Route tĩnh phải được kiểm để không bị nhận thành `:id`/`:tab`.
- Tái sử dụng `OrganizerEventListPage` với purpose attendees và `qse-grid`/`qse-card`; 6 sự kiện/trang như component hiện có, cover fallback, thời gian Asia/Ho_Chi_Minh. Không áp filter PUBLISHED tùy tiện vì lịch sử attendee vẫn có giá trị ở sự kiện khác trạng thái.
- Sidebar không ID mở picker; có ID mở đúng roster; nút đổi sự kiện đưa về picker. Chọn event không dùng q từ event cũ; reset page và dữ liệu khi ID thay đổi.
- Dùng `OrganizerSidebar active="Người tham dự"`, `OrganizerHeader title="Người tham dự"`, NotificationLink và menu mobile hiện có. Cân nhắc `hideLiveSync` để không đưa tuyên bố telemetry tĩnh vào UI; thay đổi hiển thị này phải được ghi nhận khi chốt scope.

### P2 — Dựng nội dung trong một TSX

- File dự kiến `client/src/pages/organizer/AttendeeManagerPage.tsx` (chưa tạo): imports, types, helpers, component chính/subcomponents cục bộ, rồi `const styles = \`...\`` nhiều dòng và `<style>{styles}</style>` dưới root `.b8-page`.
- Scope CSS cả modal, breakpoint và focus để không rò sang B3/B5/B9. Không refactor CSS/shared component ngoài nhu cầu B8.
- Tái hiện artifact đã đọc: hero/action bar, KPI bốn ô, filter, đủ sáu nhóm cột, footer và modal. Số lượng 5 dòng/trang là mẫu Stitch; chỉ triển khai numbered pagination khi có total đã xác minh.
- Axios/auth hiện có; chuyển string số an toàn; trạng thái vé mapping tường minh. Không xem VOID là chưa check-in hay vắng mặt. Không giữ dữ liệu sự kiện cũ khi response mới chưa xong.
- Search debounce, bỏ response cũ/cancel, filter reset trang, keyboard copy/ESC; không cho mutation lặp. Modal focus trap, restore focus, label và lỗi inline; thành công chỉ sau response server, refetch roster/KPI, phân biệt mutation thành công nhưng refresh thất bại.
- Các controls thiếu backend không có handler giả; quyết định disabled + lý do hoặc phạm vi khác phải được duyệt và báo cáo trước khi thay diện mạo/chức năng Stitch.

### P3 — Kiểm chứng và báo cáo

- Build/lint theo script `client/package.json` khi thực sự đổi source; hiện chỉ docs nên không chạy build để ngụ ý frontend mới đã đạt.
- Browser desktop 1440/1024, tablet 768, mobile 390: qse-grid 3/2/1 cột, sidebar/menu, table horizontal scroll nội bộ, không cắt mất actions, modal/keyboard.
- Test direct URL/reload/đổi event, owner/guest/forbidden/not found, empty event/empty search/loading/network/retry, pagination >50 và filter kết hợp.
- So ảnh với đúng B8; kiểm contrast/focus/screen reader. Không kết luận PASS chỉ từ breakpoint trong source.
- Report mới, nhật ký file này, Master Plan; không rollout hoặc chỉnh màn khác nếu chưa thuộc nhiệm vụ triển khai.

## 7. Điều kiện nghiệm thu

- [x] Đọc Master Plan trước Stitch, xác minh đúng project/screen, đọc HTML/xem ảnh.
- [x] Rà code và gọi GET backend với event ID/dữ liệu thật, kiểm quyền cơ bản.
- [x] Lập danh sách thiếu API, kế hoạch reuse shell/qse-grid, TSX+CSS cùng file.
- [ ] API đầy đủ cho phạm vi B8 được chốt và kiểm mutation trên DB riêng.
- [ ] Frontend B8 theo Stitch, picker/điều hướng và states hoạt động.
- [ ] Browser/responsive/a11y và ranh giới phân trang đạt.
- [ ] Build/lint khi triển khai, báo cáo và Master Plan có bằng chứng.

## 8. Nhật ký thay đổi tài liệu

| Thời điểm UTC+07 | Thao tác | Report | Giới hạn |
|---|---|---|---|
| 2026-11-01 22:08:41 | Tạo Feature_B8_Member.md; review Stitch/source/API; cập nhật B8 tại mục 4, 5.2, 5.4, ghi chú 6.F Master Plan | [B8 review/plan](../reports/stitch/B8_20261101_220841_review_plan.md) | Chỉ tài liệu; giữ Stitch/source; POST check-in, dữ liệu >50, responsive/a11y chưa kiểm |
| 2026-11-01 22:15:52 | Bổ sung phạm vi hiện hành thay thế kế hoạch cũ: chỉ GET filter/status/type và total/totalPages; bỏ KPI, metadata/actions/modal/telemetry phụ; giữ danh sách/shell/qse-grid; cập nhật riêng B8 Master Plan | [Scope update](../reports/stitch/B8_20261101_221552_scope_update.md) | Chỉ tài liệu; contract mới là đề xuất, không gọi lại API/Stitch hoặc sửa source |
| 2026-11-01 22:29:02 | Triển khai source API paginated/filter và B8 TSX+CSS, route/sidebar/picker; kiểm75HTTP+snapshot và Chrome3tests/4viewport; sửa header mobile scoped B8/picker; cập nhật trạng thái/report/API/giới hạn tại Master Plan | [Implementation](../reports/stitch/B8_20261101_222902_implementation.md) | Stitch giữ nguyên; chỉ DB/container test riêng; Docker8000/Live chưa rollout; browser khác/full a11y/benchmark chưa kiểm |
