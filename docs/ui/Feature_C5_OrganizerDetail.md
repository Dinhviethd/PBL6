# Feature C5 — Hồ sơ chi tiết Ban Tổ Chức

## 1. Trạng thái và phạm vi

- Ngày review: 2026-11-05, UTC+07 (Asia/Ho_Chi_Minh).
- Tên trong Master Plan: **C5 — Chi tiết Ban Tổ Chức**.
- Phạm vi chốt ngày **2026-11-05 00:53:49 UTC+07**: chỉ phát triển **mở hồ sơ C5 trực tiếp/tải lại URL** và **danh sách sự kiện đúng BTC, phân trang và tổng số chính xác**. Các chức năng còn lại loại bỏ khỏi giao diện và kế hoạch triển khai C5.
- Trạng thái ngày **2026-11-05 01:13:21 UTC+07**: **ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN** trong scope đã chốt. GET detail và exact owner filter đã có, kiểm HTTP trước tích hợp; không còn hai blocker API. Xem [report triển khai](../reports/stitch/C5_20261105_005837_implementation.md).
- [Báo cáo phạm vi mới](../reports/stitch/C5_20261105_005349_scope_update.md), [Review trước](../reports/stitch/C5_20261105_004419_review_plan.md), [Master Plan](../PROJECT_MASTER_PLAN.md).
- Phiên lập plan/scope trước chỉ tài liệu. Sau yêu cầu thực hiện plan, đã triển khai source frontend/backend và test; Stitch/schema/config/worker giữ nguyên. Đã nối C4/App và đánh dấu sidebar active cho C5.
- Đã tái sử dụng `AdminShell` → `AdminHeader` + `AdminSidebar`; JSX và CSS cùng `client/src/pages/admin/C5OrganizerDetail.tsx`, multi-line, namespace `.c5-*`.
- Luồng yêu cầu: **Ban tổ chức (C4) → Xem → C5 đúng hồ sơ → quay lại C4**. Không tự chuyển thành luồng xét duyệt C6.
- Người dùng đã xác nhận loại bỏ các chức năng còn lại. Không render placeholder, nút disabled, tab rỗng hoặc toast “đang phát triển” cho các nhóm đã bỏ; không dùng mock. Phạm vi này thay thế yêu cầu tái hiện toàn bộ C5 trong kế hoạch trước, nhưng giữ nguyên artifact Stitch.

## 2. Nguồn chuẩn và tiêu chí

Đã đọc Master Plan trước Stitch. Mục 5.3 trước review ghi C5 “Có code, cần đồng bộ”, route `/admin/applications` hoặc tab; chưa có dòng review C5 riêng. Kiểm tra code cho thấy đó là modal C4, không phải trang chi tiết C5 đầy đủ. Master Plan chỉ mô tả nghiệp vụ admin tổng quát, chưa có đặc tả C5 chi tiết; danh sách dưới đây được trích từ artifact C5, không coi mọi nội dung mẫu là nghiệp vụ backend đã có.

| Nguồn | Tham chiếu đã kiểm tra |
|---|---|
| Project chính thức | `10374042969343935993` — EventHub |
| Screen | `b2b2902ef53844d99da9a23373eccd5b` — C5. Chi tiết Ban Tổ Chức - Cosmic Ticket Quản Trị Viên |
| HTML | `projects/10374042969343935993/files/5259836474588793836`, đã lấy qua `download_file` và đọc |
| Screenshot | `projects/10374042969343935993/files/1105828165129674912`, đã lấy qua `download_file` và xem trực tiếp |
| Kích thước metadata | DESKTOP 2560×3938; HTML đặt canvas 1280×1757, khác kích thước metadata |
| Design system | Cosmic Graffiti, project `designTheme/designMd`; Syne / Be Vietnam Pro / Space Grotesk |

Tiêu chí nghiệm thu: giữ phong cách và các vùng hồ sơ/danh sách còn trong phạm vi theo Stitch; dùng shell chung; đúng hồ sơ từ C4, tải lại hoặc mở URL mới vẫn lấy đúng dữ liệu; danh sách, tổng số, phân trang đều lọc owner chính xác tại backend; quyền ADMIN; loading/empty/error; kiểm desktop/mobile/bàn phím; có report mới và cập nhật Master Plan. Các khối đã loại bỏ không còn là blocker hoặc tiêu chí nghiệm thu.

## 3. Giao diện trong phạm vi đã chốt

1. Shared AdminShell; breadcrumb Ban tổ chức → hồ sơ đang chọn, nút quay lại C4; tiêu đề “Hồ sơ Ban Tổ Chức”.
2. Khối hồ sơ chỉ đọc phục vụ chức năng mở hồ sơ: logo/tên BTC, tên pháp nhân, MST khai báo, địa chỉ, người liên hệ/email/điện thoại, website/mô tả và trạng thái hồ sơ có dữ liệu thật. Không khẳng định đã xác thực pháp lý/KYC.
3. Khối danh sách sự kiện thuộc đúng `user_id` của hồ sơ: ảnh, tên, trạng thái sự kiện, thời gian, địa điểm; tổng số kết quả và điều khiển phân trang. Không thêm hành động giám sát vé, báo cáo hoặc đối soát.
4. Dùng hai vùng hồ sơ/danh sách theo phong cách C5; bỏ toàn bộ KPI tài chính, tab nghiệp vụ nâng cao và risk panel. Không giữ nhãn Escrow ở tiêu đề/breadcrumb hoặc khoảng trống dành cho các khối đã bỏ.

Không chỉnh Stitch. Khác biệt ảnh/HTML về card payout đã ghi trong review trước không còn ảnh hưởng nghiệm thu vì card đó đã loại khỏi phạm vi. Không phát triển chức năng chỉnh sửa hồ sơ, duyệt/từ chối hoặc thao tác thay đổi nghiệp vụ trong C5.

## 4. Đối chiếu Cosmic Graffiti và code — lịch sử trước triển khai

Các phát hiện dưới đây là bằng chứng review ban đầu, không phải yêu cầu phát triển các khối đã loại bỏ. Chỉ áp dụng token, khả năng đọc, shell và responsive cho hai vùng còn giữ.

| Hạng mục | Phát hiện / yêu cầu kế hoạch |
|---|---|
| Palette | Artifact dùng nền `#0f1222`, card `#181b2a`, text `#e0e1f7`, primary `#d2bbff`, cyan `#5de6ff`, tím container `#7c3aed`. Khác palette mô tả trong skill (`#080B1A`, `#10162B`, `#F8FAFC`, `#22D3EE`), nhưng khớp named tokens của project. Giữ artifact, không tự recolor. |
| Typography | Có đủ Syne, Be Vietnam Pro, Space Grotesk; phù hợp phân cấp admin. |
| Radius | HTML default 4px/lg 8px/xl 12px; designMd nêu cơ sở 8px/card 16px. Ghi sai lệch, không âm thầm chuẩn hóa. |
| Khả năng đọc | Ảnh có tên pháp nhân xuống dòng giữa từ, số tiền và đơn vị bị tách dòng; tab phải cần cuộn. Nút tím “Giám sát vé” dùng `text-on-primary` trên `primary-container`, cần đo contrast. |
| Responsive | HTML có breakpoint nhưng khóa chiều rộng/cao root và `overflow:hidden`; shell sidebar cố định 288px. Không sao chép khóa canvas vào ứng dụng; kiểm bố cục thích ứng riêng. Chưa kiểm browser C5. |
| Tương tác Stitch | `switchAdminTab` chỉ đổi class và console.log; chỉ có panel events, không có nội dung thực ba tab còn lại. Safe Hold là div trang trí, không phải input range. Nhiều nút không có handler; thiếu nhãn truy cập cho control. |
| Code hiện tại | `C4ManagerOrganizer.tsx` có `openDetail(row)` → modal với bản sao dữ liệu list. Không có C5 component/route; không có hai cột, KPI đầy đủ, tabs, thẻ sự kiện hoặc risk panel. |
| Shell/routing | `AdminShell` đã có header/sidebar dùng chung. `App.tsx` mới nhận diện chính xác `/admin/applications` và `/review`; route C5 tương lai phải vào admin console để tránh chồng shell công khai. |
| Dữ liệu | C4 đã có liên hệ/pháp nhân/GMV thật, nhưng type hiện chưa dùng `logo_url`; `APPROVED` đang ghi “Đang hoạt động”, không chứng minh quyền phát hành đang mở hoặc đạt KYC. |

## 5. API hiện có, hợp đồng và kết quả gọi thật

Bảng này giữ lịch sử kiểm thử phiên review 00:44:19; phiên chốt phạm vi không gọi lại API. Chỉ triển khai GET hồ sơ theo ID và danh sách sự kiện exact-owner. Metrics/stats/analytics/review/profile-requests và các API khác bên dưới không phải danh sách cần tích hợp vào C5 mới.

Môi trường kiểm: `http://localhost:8000/api`, 2026-11-05 UTC+07. Route bên dưới bỏ prefix `/api`. Đăng nhập tài khoản demo ADMIN bằng credentials sẵn có trong môi trường, không lưu mật khẩu/token. Code route tại `server/src/app.ts`; service `modules/auth/public.ts`, `modules/auth/organizer.ts`; repository `modules/auth/infrastructure/store.ts`; event/order metrics và workflow analytics.

Định danh đã dùng: application `90f0819e-6ea6-4cf4-b329-3c92cf9a5c59`; owner `44f75b80-80dd-41b0-acdb-d8acf066284c`; event `a5572651-c50c-443a-a55e-1474e615c852`. **Không dùng application ID thay cho user ID hoặc event ID.**

| API / request thực tế | Kết quả | Dùng cho C5 / giới hạn |
|---|---|---|
| GET `/health` | 200, `data.status=ok` | Chỉ chứng minh API reachable |
| POST `/auth/login` | 200 | Xác thực ADMIN; không ghi token vào tài liệu |
| GET `/admin/organizer-applications?page=0&limit=100` | 200; 4 hồ sơ, stats `{total:4,active:2,pending:1}` | Envelope `{success,data:{items,pagination,stats}}`; hồ sơ mẫu APPROVED, `gmv:"685000"`; có `logo_url` và các trường hồ sơ |
| GET cùng route `page=0&limit=1&status=APPROVED` | 200; 1 item, total 2, totalPages 2 | Page 0-based, limit 1–100; stats toàn cục, không phải KPI riêng BTC |
| GET cùng route `page=0&limit=10&q=EventHub%20Community` | 200; 1 hồ sơ đúng tên | q tìm tên/liên hệ/MST; không phải exact ID lookup |
| GET `/admin/organizers/summaries?ids=<ownerId>` | 200; tên tổ chức/liên hệ/tài khoản | ids là UUID user, tối đa 100, không trùng; DTO không có toàn bộ hồ sơ |
| GET `/admin/events?page=0&limit=100&q=<ownerId>` | 200, có danh sách event mang owner đã chọn | q tìm cả title và organizer; chưa phải bộ lọc owner exact, không dùng tổng lọc text như tổng chắc chắn của BTC |
| GET `/admin/events?...&organizerId=<ownerId>` | 400 VALIDATION, `Unrecognized key: "organizerId"` | Backend strict, chưa hỗ trợ filter này |
| GET `/admin/events/metrics?eventIds=<UUIDs lấy từ list>` | 200; `ticketCapacity,ticketsIssued,ticketsSold,gmv,revenue,checkins,checkinRate` | Ghép theo eventId, tối đa 100; tiền/count dạng chuỗi, không tự coi GMV là Escrow/payout |
| GET `/organizer/events/<eventId>` | 200 cho ADMIN | Chi tiết/loại vé/reviews; API phân quyền theo sự kiện |
| GET `/organizer/events/<eventId>/stats` | 200; orders/revenue/sold/checkins đều `"0"` ở event mẫu | Có dữ liệu giám sát cơ bản |
| GET `/organizer/events/<eventId>/analytics` | 200; timezone Asia/Ho_Chi_Minh, khoảng mặc định 2026-10-07…2026-11-05, totals 0 | Báo cáo kinh doanh sự kiện; không phải quyết toán payout; CSV có route trong source, chưa gọi |
| GET `/organizer/profile` bằng ADMIN | 200, `ownerId` là admin, `initialized:false` | Chỉ đọc chính người đăng nhập; không dùng để đọc BTC đang chọn |
| GET `/admin/organizer-profile-requests?page=0` | 200, `data:[]` | Yêu cầu đổi pháp nhân; không phải lịch sử kiểm toán tổng quát C5 |
| GET `/admin/users/<ownerId>` | 404 NOT_FOUND | Endpoint chỉ khách hàng; source loại ADMIN/ORGANIZER |
| POST `/admin/organizer-applications/<applicationId>/review`, `{approve:true,reason:""}` | 409 ALREADY_REVIEWED trên hồ sơ đã APPROVED | Route tồn tại, không đổi trạng thái; chưa kiểm nhánh thành công phiên này |
| POST cùng route `{approve:false,reason:""}` | 400 VALIDATION, cần lý do | Payload hợp lệ phải boolean approve, reason trim tối đa 2000; từ chối cần reason |
| GET summaries `ids=not-a-uuid` | 400 VALIDATION | Không truyền ID hiển thị `#ORG-...` vào API |
| GET applications không token | 401 UNAUTHORIZED | Đã kiểm rào cản đăng nhập |
| GET application detail theo UUID ở trên | 404 NOT_FOUND | Không có route GET hồ sơ theo ID trong source |
| GET applications bằng tài khoản demo USER | 403 FORBIDDEN | Đã kiểm rào cản quyền admin |

Kiểm bổ sung cùng phiên: event query owner UUID trả đủ **22 events**, `totalPages:1`, tất cả `organizer_id` đúng; metrics trả **22 dòng**, cộng BigInt `gmv` được **685000**, khớp GMV hồ sơ. Đây là bằng chứng trên dữ liệu hiện có, không thay thế filter owner exact cần bổ sung.

Map trường: tên BTC→`organization_name`; pháp nhân→`business_name`; MST→`tax_id_or_business_license`; địa chỉ→`head_office_address`; đại diện liên hệ→`contact_name/contact_email/contact_phone`; logo→`logo_url`; website→`website_or_social`; mô tả→`description`; quyết định→`status/reviewed_at/rejection_reason`; GMV→`gmv`. `contact_name` chưa chứng minh là đại diện pháp luật đã xác minh. `created_at` không phải ngày cấp MST. Không lấy 5% × GMV để giả lập phí sàn đã thu.

## 6. Chức năng chưa có API hoặc chỉ hỗ trợ một phần

**Cập nhật triển khai 01:13:21:** hai gap đầu trong bảng dưới đã giải quyết bằng GET detail và filter organizerId; bảng giữ bằng chứng trước triển khai. Các nhóm khác vẫn loại khỏi scope.

**Chỉ hai dòng đầu được giữ trong kế hoạch phát triển. Tất cả các dòng còn lại đã LOẠI BỎ theo xác nhận 00:53:49, không chờ bổ sung API và không còn là blocker của C5.** Ngoài ra bỏ KPI GMV/doanh thu/vé/check-in, chức năng giám sát vé, báo cáo tổng kết và xét duyệt/chỉnh sửa hồ sơ khỏi C5; không mở rộng chỉ vì API đã có.

| Chức năng C5 | Khoảng trống |
|---|---|
| Mở trực tiếp/tải lại hồ sơ theo ID | Chưa có GET admin application detail; list search không exact ID. Cache từ C4 chỉ là dữ liệu ban đầu, không giải quyết deep link/stale data. |
| Danh sách và tổng sự kiện đúng BTC | q owner UUID đã trả dữ liệu, nhưng cần filter owner exact ở backend trước khi bảo đảm phân trang/tổng đúng trong mọi trường hợp. |
| Mã `#ORG`, Tier, Verified, trạng thái phát hành | Chưa có contract tương ứng; APPROVED không thay thế được. |
| MST đã đối soát, ngày cấp; chức danh đại diện; CCCD/sinh trắc học/eKYC | Có chuỗi MST và thông tin liên hệ, không có API xác thực/giấy tờ/chứng nhận. |
| Khóa/mở quyền phát hành toàn BTC | Chưa có endpoint/policy; PATCH admin users chỉ khách hàng, pause một event không tương đương. |
| Tài khoản payout, ngân hàng/chi nhánh/chủ hưởng/kênh giải ngân | Cấu hình cổng thu SePay/VNPay không phải tài khoản hưởng của từng BTC. |
| Phí sàn đã thu, tăng trưởng quý, Escrow giữ, payout đã giải ngân | Chỉ GMV/revenue hiện có; chưa có ledger/settlement/tổng hợp riêng các chỉ tiêu này. |
| Tab dòng tiền; đối soát; chứng từ payout | Có module thanh toán/đối soát thu tiền, chưa có contract C5 theo BTC và chứng từ giải ngân. |
| Safe Hold 5–50%, 48h, policy V4-SMART; toggle webhook payout; lưu/reset/điều chỉnh hạn mức | Không có API cấu hình/validation/lưu/version hoặc engine payout tương ứng. |
| Điểm tín nhiệm, hoàn tiền, rating 4.8/5, tranh chấp/vi phạm | Chưa có API nghiệp vụ/aggregates; không được ghi 0 hoặc 96/100 khi thiếu dữ liệu. |
| Gửi thông báo vi phạm | Inbox/đánh dấu đã đọc có sẵn; không có admin violation-send endpoint. |
| Nhật ký kiểm toán Admin theo BTC | Có audit nội bộ và legal-request history; chưa có endpoint C5 đầy đủ, lọc owner và phân trang. |
| Xuất hồ sơ PDF | Chưa có API hồ sơ xuất PDF; nếu chọn xuất phía client cần đặc tả riêng, chưa được triển khai. |
| Giám sát vé / báo cáo tổng kết | Detail/stats/analytics có thể dùng một phần; cần kiểm route UI, quyền ADMIN, nghĩa của báo cáo trước khi nối; không gắn nhãn báo cáo quyết toán cho analytics bán vé. |

## 7. Kế hoạch thực hiện sau phiên tài liệu

**Đã thực hiện bước1–4 trong phiên triển khai**, xem kết quả mục9. Nội dung dưới là kế hoạch gốc để đối chiếu; các ghi chú “chưa tồn tại/chưa triển khai/không sửa trong phiên tài liệu” mô tả thời điểm lập plan, không phủ nhận source/runtime đã cập nhật.

### Bước 1 — Bổ sung hai contract trong phạm vi (P0)

- Giữ screen C5, không gọi edit/generate. Ghi nhận khác biệt ảnh/HTML và palette; không tự thay đổi màn hình.
- Phạm vi đã chốt: chỉ GET detail và danh sách exact-owner; không phát triển API cho nhóm đã loại bỏ.
- Đề xuất, **chưa tồn tại**: GET `/admin/organizer-applications/:id` trả DTO hồ sơ chỉ đọc và `user_id`; validate UUID, ADMIN guard, 404 khi không tồn tại, không trả dữ liệu nhạy cảm không phục vụ hồ sơ.
- Mở rộng GET `/admin/events` với `organizerId` UUID: so sánh chính xác `event.organizer_id`; list và count dùng cùng điều kiện và snapshot, thứ tự ổn định có ID để phân trang. Giữ page 0-based/limit theo contract hiện có, trả total/totalPages từ backend. Không lọc owner client-side sau phân trang và không dùng q thay organizerId.
- Xác minh HTTP success/error/quyền của contract mới trước khi tích hợp. Nếu thiếu, giữ BLOCKED ở chức năng phụ thuộc.

### Bước 2 — Khung C5 và điều hướng (P1)

- Dự kiến route `/admin/applications/:applicationId`, ADMIN guard. Route tĩnh `/admin/applications/review` giữ nguyên ưu tiên; dùng UUID hồ sơ, không dùng tên BTC.
- Tái sử dụng nguyên `AdminShell`; nhận diện route detail trong admin console. Không nhân bản header/sidebar từ HTML Stitch; không sửa nội dung shell.
- Sau khi được triển khai, nút “Xem” C4 điều hướng đúng ID; giữ filter/page/search khi back. Đây là điểm nối tối thiểu cần thiết trong tương lai, **không được sửa C4/App trong phiên tài liệu này**.
- Render trang bằng một TSX có `const styles = \`...\`` và `<style>{styles}</style>`; namespace `.c5-*`, mỗi selector/declaration/JSX props trình bày nhiều dòng, tránh ảnh hưởng shell/C4.

### Bước 3 — Tái hiện và nối dữ liệu (P1, phụ thuộc P0)

- Dựng breadcrumb/tiêu đề, hồ sơ chỉ đọc và danh sách sự kiện có tổng/phân trang; không dựng KPI/tabs/risk panel hoặc control đã loại bỏ.
- Không chép Tailwind CDN/script inline, khóa root canvas hoặc thông tin mẫu vào React. Giữ style/artifact trong hệ build hiện có; logo null có fallback chữ cái, không tự sinh brand.
- Tải hồ sơ theo applicationId trên mỗi lần mở trực tiếp/reload; lấy owner từ response để gọi danh sách, không phụ thuộc navigation state/cache C4. Chỉ hiển thị total/totalPages của API owner exact; reset page khi đổi hồ sơ; format thời gian Asia/Ho_Chi_Minh.
- Dùng Axios/auth hiện có, hủy request cũ khi đổi ID, tránh race hiển thị hồ sơ cũ. Loading/error/404/401/403/retry riêng; API lỗi không hiển thị số 0 giả.
- C5 trong phạm vi này chỉ đọc; không gọi mutation review/khóa/payout/thông báo hoặc lưu cấu hình.

### Bước 4 — Kiểm thử và bàn giao (P1)

- Route: C4 Xem → đúng applicationId/owner; deep link/reload/back; ID sai/không tồn tại; role USER/ORGANIZER không truy cập dữ liệu admin.
- Dữ liệu: hai BTC khác nhau, nhiều trang, BTC không có sự kiện, tên/title chứa UUID BTC khác, null logo/pháp nhân; kiểm mọi item đúng owner và total/totalPages đúng toàn tập. Trang vượt giới hạn xử lý rõ, thứ tự ổn định; phản hồi cũ khi đổi ID không ghi đè hồ sơ mới.
- Kiểm deep link không có state, reload, applicationId sai định dạng400/không tồn tại404; không token401, USER/ORGANIZER403 cho cả hai API. Dữ liệu kiểm thử tạo trên DB cô lập khi triển khai.
- UI tại 1440/1024/768/390; cuộn toàn trang, danh sách cuộn ngang nội bộ khi cần; focus/keyboard/label/contrast; so phần còn giữ với Stitch. Xác nhận không còn nhóm chức năng đã bỏ hoặc request đến API ngoài phạm vi.
- Khi có sửa code: build client và lint phù hợp; backend tests nếu backend được cho phép sửa. Phiên tài liệu không chạy build/test suite không liên quan.
- Mỗi lần sửa phải tạo report mới, ghi rõ file thay đổi, thao tác đã chạy, kết quả/giới hạn và cập nhật plan này cùng đúng mục C5 Master Plan.

## 8. Nhật ký tài liệu

| Thời điểm | Thao tác | Report |
|---|---|---|
| 2026-11-05 00:44:19 UTC+07 | Tạo kế hoạch C5; review Stitch, code và HTTP API local; chưa sửa source/Stitch | [C5 review plan](../reports/stitch/C5_20261105_004419_review_plan.md) |
| 2026-11-05 00:53:49 UTC+07 | Chốt chỉ mở hồ sơ trực tiếp/reload và danh sách sự kiện đúng BTC/phân trang/tổng; loại bỏ các chức năng còn lại, sửa bố cục/contract/kế hoạch/nghiệm thu; chỉ tài liệu | [Scope update](../reports/stitch/C5_20261105_005349_scope_update.md) |
| 2026-11-05 01:13:21 UTC+07 | Triển khai C5/API/exact-owner, C4 Xem/back, shell; build/lint/boundaries/HTTP/Chrome PASS; cập nhật4JS API8000 tại chỗ | [Implementation](../reports/stitch/C5_20261105_005837_implementation.md) |

## 9. Kết quả triển khai hiện tại

- Route `/admin/applications/:applicationId`, ADMIN guard. C4 Xem dùng application UUID; back giữ q/status/page/limit. C6 route tĩnh và PENDING review modal vẫn hoạt động.
- GET `/api/admin/organizer-applications/:id`: ADMIN, UUID/strict query, DTO hồ sơ/user_id allowlist, no-store,400/404/401/403 đã kiểm.
- GET `/api/admin/events?organizerId=<userId>&page=0&limit=10`: exact owner AND với bộ lọc khác, list/count cùng REPEATABLE READ, order created_at DESC/id; `{success,data:{items,pagination:{page,limit,total,totalPages}}}`. Owner không có event trả0; page ngoài tập vẫn trảtotal đúng. C5 hiển thị10/trang và clamp/reset page khi cần.
- Deep link/reload/new tab đọc API lại, không phụ thuộc cache C4. Hủy request và remount theo ID chống response cũ; loading/error/empty/retry/keyboard và ảnh fallback.
- HTTP fixture PostgreSQL riêng:33calls,19×200/2×401/4×403/6×400/2×404;23events ownerA,3ownerB, collision search26 nhưng exact23; page10/10/3.
- Chrome13nhóm PASS,4viewport1440/1024/768/390 không tràn,0pageErrors/0admin writes. Build server/client, lint và boundaries PASS; backend suite45pass/0fail/20skip, C5 integration chạy riêng PASS.
- API8000 đã nạp4JS tại chỗ, cùng container/image; health/detail/exactlist200,22events đúng owner. Cần rebuild image để giữ thay đổi sau recreate; static frontend/public chưa rollout. Chi tiết và evidence trong report triển khai.
- Còn full accessibility/screen reader/contrast, browser khác, benchmark/pixel-diff; trạng thái **ĐẠT CÓ ĐIỀU KIỆN**.
