# A12 — Thông báo của bạn: kế hoạch tái hiện giao diện

- Cập nhật: 2026-11-01 15:52:22 UTC+07 (Asia/Ho_Chi_Minh).
- Trạng thái: **ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN**; API/frontend runtime local đã nạp, test API/Chrome trên DB riêng đạt; còn Live nonempty/native/accessibility đầy đủ và image rebuild.
- [Báo cáo mới nhất: đích đơn hàng](../reports/stitch/A12_20261101_155222_order_destination.md); [triển khai](../reports/stitch/A12_20261101_154342_implementation.md); [chốt10/trang](../reports/stitch/A12_20261101_153116_ten_notifications_plan.md); [bổ sung phạm vi](../reports/stitch/A12_20261101_152657_pagination_scope_plan.md); [review gốc](../reports/stitch/A12_20261101_151949_review_plan.md).
- Nguồn: project Stitch `10374042969343935993`, screen `34f73bfd827e4025b19d91f00e3b2b88`, tên “A12. Thông báo của bạn - EventHub”. Metadata DESKTOP 2560×6438; HTML canvas 1280×3219, nội dung chính tối đa 960px. Đã đọc HTML và xem screenshot qua MCP download_file.

## 1. Phạm vi và quyết định đã được yêu cầu

Các phiên lập kế hoạch trước chỉ sửa tài liệu. Theo giao việc mới, phiên15:43:42 đã triển khai frontend A12 và backend phân trang trong phạm vi kế hoạch; xác minh API/browser trên database test riêng và nạp local runtime. Không sửa schema/database Supabase, cấu hình/env, workflow hoặc màn khác. Không gọi edit_screens/generate/apply_design_system.

Tái hiện phần nội dung A12 theo artifact hiện có. Dùng lại AuthHeader/AuthFooter trong `client/src/pages/auth/AuthShell.tsx`; không sao chép header/footer mẫu có brand ENVENTHUB. Giữ route `/notifications` có Guard. JSX và CSS riêng của trang cùng nằm trong `client/src/pages/account/Notifications.tsx`, CSS có scope `.a12-notifications`, xuống dòng rõ ràng; không tạo stylesheet A12 riêng, không chép CDN Tailwind hay script mô phỏng của Stitch. Các module API/type/shared component hiện có vẫn tái sử dụng.

Không đưa thanh “Danh sách chính / Mô phỏng…” vào sản phẩm. Tại mỗi thời điểm chỉ hiển thị trạng thái phù hợp với request và dữ liệu thực tế. Danh sách có thể chứa nhiều loại thông báo thật; “một trường hợp” không có nghĩa chỉ cho phép một thẻ hay một loại thông báo.

**Chốt phạm vi bổ sung 15:26:57:** chỉ mở rộng backend để hỗ trợ phân trang đầy đủ cho A12. Các chức năng khác backend chưa hỗ trợ bị loại khỏi kế hoạch và giao diện triển khai, không để nút giả, disabled placeholder hay toast “sắp có”. Phạm vi này đã được thực hiện trong phiên15:43:42. Chức năng backend đã có nhưng thiếu dữ liệu kiểm thử vẫn giữ và ghi NOT_VERIFIED, không coi là chưa hỗ trợ.

## 2. Căn cứ Master Plan và điểm thiếu

Master Plan mục 4, dòng 20 ghi module Thông báo cho tất cả vai trò, đã tích hợp Notifications/NotificationLink và bốn API; việc còn lại là đồng bộ UI. Trước phiên này mục 5.1/5.4 chưa có A12; danh mục tổng vẫn ghi A1–A11/35 màn. Đây là thông tin cũ, không phải bằng chứng A12 chưa tồn tại. Phiên này bổ sung dòng A12 theo screen xác minh thực tế; không đánh giá lại các màn khác hoặc xác nhận lại toàn bộ danh mục.

## 3. Các điểm chưa đạt tại review ban đầu

Bảng này lưu finding trước triển khai; trạng thái khắc phục mới nhất xem mục9 và report15:43:42.

| Mức | Phát hiện và bằng chứng | Hướng thực hiện |
|---|---|---|
| Cao | `App.tsx: usesSharedHomeShell` chưa chứa `/notifications`; trang dùng shell legacy | Bổ sung điều kiện riêng A12 để dùng shell chung, không sửa component hoặc hành vi các màn khác |
| Cao | `Notifications.tsx` dùng chung Bell cho mọi kind; CSS hiện tại icon 40px, thẻ padding24/gap18, h2 17px, mô tả13px. Stitch icon44px, thẻ padding20/gap16, h2 Syne20px, nội dung16px, badge theo loại, CTA cyan/tím | Tái hiện class/token và hình thức từng loại, trạng thái read/unread theo HTML |
| Vừa | Loading/Empty/Notice dùng chung chưa tái hiện panel trạng thái có icon, tiêu đề, mô tả và CTA của A12 | Tạo nhánh trạng thái trong cùng TSX; empty → `/explore`, unread-empty → bộ lọc tất cả, error → retry thật |
| Vừa | Badge chưa đọc hiện là chuỗi trong nút; icon refresh/schedule và kiểu pill chưa giống Stitch | Badge lấy `unreadCount`, bổ sung icon và kiểu trình bày theo artifact |
| Cao | Stitch “Trang 1 / 3” là dữ liệu mẫu; API đã có page/hasNext nhưng chưa có total/totalPages | Mở rộng duy nhất API inbox để trả metadata phân trang theo mục5.1; hiển thị “Trang N / M” từ backend sau khi xác minh, không dùng số mẫu |
| Cao | CTA mẫu có thể trái `target`: WAIT_QUEUE_OFFER trong workflow có target ORDER, trong Stitch ghi “Xem vé của tôi” | Nhãn/đích theo target backend: ORDER → payment-status (yêu cầu cập nhật15:52:22), STAFF → checkin, TICKETS → tickets; không suy từ kind hoặc chép CTA mẫu |
| Vừa | Stitch có ENVENTHUB/Cosmic Ticket, năm2025, account mẫu và đồng thời đăng nhập/avatar | Dùng shell chung và user thật như người dùng yêu cầu; không mang dữ liệu mẫu sang trang |
| Vừa | Artifact dùng palette sinh từ theme khác màu literal trong mô tả Cosmic Graffiti | Giữ palette artifact cho nội dung A12, ghi rõ khác biệt; không đổi theme toàn dự án |
| Chưa xác minh | Hai tài khoản demo đều chưa có notification; chưa kiểm chứng card thật, read thành công, cross-user, >50 items | Kiểm thử bằng dữ liệu có sẵn phù hợp hoặc môi trường test cô lập ở phiên sau; không seed bản ghi vào runtime phiên này |

## 4. Design system và cấu trúc cần giữ

Artifact dùng nền `#0f1222`, surface card `#1c1f2f`, read-card `#181b2a`, primary `#d2bbff`, primary-container `#7c3aed`, secondary `#5de6ff`, chữ `#e0e1f7`, phụ `#ccc3d8`. Các màu này khớp namedColors của project, nhưng khác phần mô tả Cosmic Graffiti: nền `#080B1A`, card `#10162B`, cyan `#22D3EE`, chữ `#F8FAFC`/`#94A3B8`. Không coi hai bộ token là một. Font Syne / Be Vietnam Pro / Space Grotesk phù hợp design system. HTML radius mặc định4px/lg8px/xl12px khác mô tả DS default8px/card16px; tái hiện radius từng thành phần thực tế, không tự chuẩn hóa lại Stitch.

Giữ container960px, heading/eyebrow/mô tả và nút đọc tất cả; toolbar Tất cả/Chưa đọc + Làm mới, ghi chú nhắc24h; danh sách card theo chiều dọc; icon + badge loại + pill chưa đọc + thời gian + title/message + CTA; phân trang bên dưới. Không sao chép fixed width/height/overflow:hidden của ảnh xuất vào runtime. Dùng bố cục HTML responsive làm căn cứ, nghiệm thu lại trên trình duyệt.

## 5. Hợp đồng API đã đối chiếu trước triển khai

Bảng sau là bằng chứng lịch sử phiên15:19:49. API hiện tại đã có pagination10; bằng chứng mới xem mục9 và report triển khai.

Base runtime đã thử: `http://localhost:8000/api`; health qua `http://localhost:5173/api/health` cũng200. Port8011 không kết nối được; không suy luận proxy đang trỏ8011. Auth dùng Bearer token qua Axios client hiện có. Backend route/controller nằm trong `server/src/app.ts`, service `modules/notification/public.ts`, truy vấn `modules/notification/infrastructure/store.ts`.

| Method + đường dẫn (sau /api) | Request đúng | Response/hành vi | Kết quả phiên |
|---|---|---|---|
| GET `/me/notifications` | `page=0&unread=false`; page nguyên0..10000, unread chuỗi true/false; không gửi userId | `{success:true,data:{items,hasNext,unreadCount}}`; 50 items/trang, query lấy51; sort created_at DESC,id DESC | Auth200 với danh sách trống; page1/unread=true200; page=-1 hoặc unread=1 trả400; guest401 |
| GET `/me/notifications/count` | Bearer, không body | `{success:true,data:{unreadCount:number}}` | Auth200/count0, guest401 |
| POST `/me/notifications/:id/read` | UUID lấy từ `items[].id`, không body | success data null; scope theo principal; idempotent bằng coalesce(read_at,now()) | UUID sai400, UUID hợp lệ không tồn tại404, guest401; thành công trên ID thật NOT_VERIFIED |
| POST `/me/notifications/read-all` | Bearer, không body | success data null; tất cả unread của principal, không chỉ trang đang xem | 200 trên hộp thư demo rỗng; count sau vẫn0; guest401. Chưa chứng minh cập nhật hàng thật |

Item theo source: `id,kind,title,message,target,target_id,created_at,read_at`; `read_at === null` là chưa đọc. Kind gồm ORDER_PAID, STAFF_INVITED, EVENT_UPDATED, EVENT_REMINDER, WAIT_QUEUE_OFFER. Không có endpoint tạo notification công khai phục vụ trang; thông báo sinh từ nghiệp vụ. Không có total, phân loại query theo kind hay SSE/WebSocket trong contract inbox này.

| target backend | Nhãn/đường dẫn hiện có cần giữ |
|---|---|
| ORDER | Xem đơn hàng → `/payment-status/${target_id}` trực tiếp, theo yêu cầu15:52:22; không qua Checkout |
| STAFF | Xem phân công → `/checkin` |
| TICKETS | Xem vé của tôi → `/tickets` |

Không hiển thị lời hứa thời gian giữ chỗ, VIP, ghế, tên sự kiện hay ngày mẫu. Render title/message từ backend như text. Chỉ format created_at, không tạo timestamp thay thế. Nhãn/icon là mapping tĩnh hợp lệ; kind chưa biết dùng nhãn chung, target chưa biết không điều hướng tùy tiện.

### 5.1. Mở rộng API duy nhất được đưa vào kế hoạch: phân trang

Contract sau đây đã **triển khai và kiểm chứng** trong phiên15:43:42, thay cho API cũ50 mục/trang. Theo yêu cầu15:31:16, kích thước là **10 thông báo mỗi trang**, có metadata tổng trang, không tạo endpoint mới. Các số50 trong bằng chứng runtime/nhật ký cũ chỉ mô tả lịch sử.

- Giữ `GET /api/me/notifications?page=0&unread=false`, page zero-based0..10000, kích thước cố định10; không thêm lựa chọn page size. Backend OFFSET = page ×10, trả tối đa10 items; nếu giữ cách đọc dư một hàng để tính hasNext thì LIMIT11. Frontend hiển thị trực tiếp trang API, không lấy50 rồi cắt10 làm sai tổng trang.
- Giữ nguyên `items`, `hasNext`, `unreadCount` và envelope; bổ sung `pagination: { page, pageSize: 10, total, totalPages }` trong data. Cấu trúc response cũ được giữ nhưng kích thước trang thay đổi; cần kiểm tra consumer web/mobile không giả định50 trước rollout, không tự sửa màn khác trong phạm vi A12.
- `total` là số thông báo của principal khớp bộ lọc unread hiện hành, trước LIMIT/OFFSET; `totalPages = Math.ceil(total / 10)`. `unreadCount` vẫn là tổng chưa đọc của tài khoản trên toàn hộp thư, không phụ thuộc trang.
- Count và items dùng cùng điều kiện user/filter và cùng snapshot truy vấn hoặc transaction để tránh metadata lệch nhau trong một response. Giữ sort `created_at DESC, id DESC`; `hasNext` nhất quán với metadata. Không dùng độ dài items làm total.
- Với total0: totalPages0, items[], hasNext false; UI hiển thị empty tương ứng và ẩn pager, không hiện “Trang 1 / 0”. Page hợp lệ về cú pháp nhưng vượt dữ liệu trả items[] và metadata thật; UI lùi tới `totalPages - 1` rồi fetch lại, hoặc về0 nếu hộp thư trống.
- Khi đổi filter/read-all, về trang0; khi đọc hết trang cuối trong filter unread, dùng metadata mới để về trang còn hợp lệ. Sau POST, reload để nhận count/total mới; không tự trừ số giả.
- Phạm vi backend dự kiến: route/service/store notification và test phân trang liên quan; không migration, không sửa workflow phát thông báo hoặc module nghiệp vụ khác. Không thay endpoint count/read/read-all.
- Chỉ tích hợp “Trang N / M” khi API mới đã kiểm chứng. Nếu runtime chưa có metadata, ghi BLOCKED cho tích hợp phân trang đầy đủ; không giả tổng trang hay báo đã hoàn thành.

### 5.2. Giữ và loại bỏ chức năng

| Giữ vì đã có backend hoặc chỉ là trình bày/điều hướng | Loại khỏi phạm vi A12 vì chưa có backend tương ứng |
|---|---|
| Inbox, Tất cả/Chưa đọc, badge unreadCount, đọc một/đọc tất cả | Tìm kiếm nội dung, lọc theo kind hoặc ngày, API tổng hợp bổ sung ngoài phân trang |
| Năm kind hiện có, title/message thật, CTA theo target hiện có | Tạo/gửi thông báo thủ công, xóa/lưu trữ, đánh dấu trở lại chưa đọc |
| Refresh GET thủ công/30s/focus; loading/error/retry/empty | Realtime push/SSE/WebSocket, đăng ký push hoặc cài đặt kênh thông báo mới |
| AuthHeader/AuthFooter chung, icon/badge, định dạng thời gian, link khám phá | Các thao tác hoặc thông tin nghiệp vụ chỉ có trong dữ liệu mẫu mà contract chưa cung cấp |

Các mục loại bỏ là ranh giới phạm vi, không khẳng định tất cả đều xuất hiện trên Stitch. Không bỏ loading/empty/error, phân loại icon hay link điều hướng hợp lệ vì chúng không cần endpoint riêng. Không xóa chức năng backend hiện có. Giữ nguyên artifact Stitch; chỉ phần giao diện triển khai bỏ chức năng không có dữ liệu/hành vi backend theo yêu cầu người dùng.

## 6. Thứ tự triển khai dự kiến

1. Đọc lại Master Plan, tài liệu này và report; lấy lại A12 từ đúng project, kiểm tra không đổi artifact. Xác minh lại API runtime trước tích hợp.
2. Cho riêng route notifications dùng shell chung tại App; giữ Guard và session isolation hiện có. Không dựng header/footer thứ hai trong page.
3. Tái hiện content bằng JSX + scoped CSS trong cùng Notifications.tsx; tận dụng type, Axios, auth, NotificationLink và utilities. Không thay stylesheet chung ảnh hưởng trang khác.
4. Mở rộng và kiểm thử API phân trang theo mục5.1 trước khi nối UI “Trang N / M”. Giữ page zero-based và unread filter server-side. Đổi filter về trang0. Count toàn hộp thư lấy server, không đếm items của trang. Read-all reset trang0; trang cuối rỗng thì dùng metadata mới để lùi về trang hợp lệ và fetch lại. Loại khỏi UI các chức năng ở mục5.2, không mở rộng API khác.
5. State ưu tiên loading lần đầu → fetch error → empty theo filter → list. Lỗi mutation hiển thị cùng dữ liệu đang có; không giả thành empty hoặc đổi read_at khi POST lỗi. Retry gọi GET thật; chặn click trùng trong khi xử lý. Chỉ báo thành công khi HTTP thành công; reload inbox và phát `notifications:changed` để đồng bộ badge.
6. Giữ refresh30s khi tab hiện và focus refresh đang có; không quảng cáo realtime push. Đảm bảo request cũ không ghi đè filter/page mới hoặc session khác; xác minh cơ chế useLoad trước khi sửa. Loading nền không làm mất nội dung đọc nếu có thể giữ snapshot an toàn.
7. Chạy build/check và test liên quan khi triển khai; review desktop/mobile, điều hướng, API thật. Mỗi thay đổi ghi nhật ký vào tài liệu này, tạo report riêng mới rồi cập nhật A12 trong Master Plan.

## 7. Tiêu chí nghiệm thu phiên triển khai

- [x] Header/footer đúng component chung, không trùng; chỉ A12 thay đổi.
- [x] Main content gần artifact về kích thước/font/token/card/badge/CTA; không có tab mô phỏng, dữ liệu mẫu hoặc tổng trang giả.
- [x] Loading, error/retry, empty, unread-empty, list xuất hiện đúng dữ liệu; không render đồng thời các panel đối nghịch.
- [x] GET thật có items cho năm kind từ fixture DB riêng; read/read-all xác nhận bằng GET sau đó, giữ idempotency và quyền chủ sở hữu. Chưa nghiệm thu pipeline nghiệp vụ sinh từng kind.
- [x] Guest401, ID sai400, missing/khác chủ404; logout và đổi tài khoản qua browser.
- [x] Phân trang API thật với0/1/10/11/20/21 thông báo: mỗi trang tối đa10; totalPages lần lượt0/1/1/2/2/3, đúng theo filter và principal; page biên/vượt dữ liệu/validation đúng; read cuối trang/read-all cập nhật metadata; sort ổn định khi trùng created_at. Đọc source consumer mobile không giả định50, native chưa test.
- [x] UI hiển thị “Trang N / M” từ metadata thật, không hiện1/0; Trước/Sau đúng biên, đổi filter về0, focus-refresh/count toàn hộp thư đúng.
- [x] Chỉ bổ sung API phân trang; chức năng backend chưa hỗ trợ không còn nút/placeholder/toast giả hoặc yêu cầu phát triển trong phạm vi A12.
- [x] CTA đúng target và route thật; nếu POST đọc lỗi không báo đã đọc/điều hướng như thành công. Detail của màn đích ngoài phạm vi.
- [ ] Desktop1440/1024, tablet768, mobile390 không tràn; bàn phím/focus/aria-live/contrast/reduced-motion được kiểm tra thực tế.
- [x] Build/check đạt; report mới ghi rõ test thật và test mô phỏng. Không đánh dấu đạt chỉ dựa screenshot.

Responsive4 viewport, keyboard Tab và reduced-motion đã đạt; dòng accessibility ở trên còn mở vì chưa screen reader/contrast đầy đủ. Test dữ liệu nhiều trang/mutation trên database local riêng; runtime8000 đã kiểm chứng bằng authenticated inbox trống, không suy thành PASS cho Live nonempty.

## 8. Nhật ký tài liệu và thao tác

| Thời điểm UTC+07 | Thay đổi | Bằng chứng |
|---|---|---|
| 2026-11-01 15:52:22 | Đổi CTA target ORDER thẳng sang payment-status/:orderId; cập nhật kỳ vọng test/helper, regression UI2/2 và build/lint PASS; nạp bundle local mới, cập nhật Master Plan và report. Không sửa backend/Stitch | [Report đổi đích](../reports/stitch/A12_20261101_155222_order_destination.md) |
| 2026-11-01 15:43:42 | Triển khai A12 TSX+CSS/shell chung, backend metadata10/trang bằng một snapshot;41HTTP + Chrome4 viewport DB riêng PASS, build/lint/boundaries PASS; nạp2JS API và frontend local, smoke8000/5173 PASS; sửa test liên quan, tạo report mới, cập nhật Master Plan. Stitch giữ nguyên | [Report triển khai](../reports/stitch/A12_20261101_154342_implementation.md) |
| 2026-11-01 15:31:16 | Thay đề xuất50 bằng10 thông báo/trang; cập nhật pageSize, OFFSET/LIMIT, totalPages, kiểm thử biên và lưu ý consumer; tạo report mới, cập nhật A12 trong Master Plan. Chỉ sửa tài liệu | [Report 10 thông báo/trang](../reports/stitch/A12_20261101_153116_ten_notifications_plan.md) |
| 2026-11-01 15:26:57 | Chốt chỉ mở rộng API inbox cho metadata phân trang, giữ50 mục/trang và contract cũ; loại chức năng chưa có backend; cập nhật checklist, report mới và các dòng A12 trong Master Plan. Không sửa source/Stitch, không gọi lại API | [Report bổ sung phạm vi](../reports/stitch/A12_20261101_152657_pagination_scope_plan.md) |
| 2026-11-01 15:19:49 | Tạo kế hoạch A12; ghi mapping source/design/API, gaps, phạm vi một trạng thái, shell chung và TSX+CSS một file; tạo report mới; bổ sung A12 vào Master Plan 5.1/5.4, dòng20 mục4 và ghi chú6.F | [Report review/plan](../reports/stitch/A12_20261101_151949_review_plan.md) |

Mọi chỉnh sửa tài liệu hoặc triển khai A12 về sau phải bổ sung nhật ký tại đây và liên kết report mới; không ghi đè report cũ.

## 9. Kết quả triển khai15:43:42 và giới hạn

Cập nhật15:52:22: target ORDER đi trực tiếp `/payment-status/:orderId`; bundle runtime hiện tại `/assets/index-D8_uk-dm.js` thay bundle phiên15:43:42 bên dưới. Test UI2/2 và build/lint PASS; API giữ nguyên. Chi tiết trong report đổi đích mới nhất.

- Source: Notifications.tsx dùng JSX+CSS cùng file, hook có AbortController/query key/session; App chỉ thêm route notification vào shared shell; notification types có pagination; service/store backend trả10/trang, tổng trang/filter/count trong một SELECT.
- Finding shell/card/icon/badge/states/metadata/trang cuối đã khắc phục. Header1024 overflow khắc phục bằng CSS chỉ A12; Stitch không sửa. API liên quan giữ nguyên bốn route.
- Backend build/boundaries/unit PASS; lệnh test tổng39PASS/13SKIP; A12 integration41HTTP + Chrome1440/1024/768/390 PASS chạy riêng có PostgreSQL17 test thật; UI regression mock2/2 PASS bằng Chrome. Client build và lint đạt.
- Runtime8000 container đã nạp riêng2JS notification và frontend `/assets/index-CKbfdDwy.js`, giữ ID/image/env/worker; hash khớp. GET inbox qua8000/5173 trả200, pagination.pageSize10,total0,totalPages0 cho customer demo. Chrome static8000 desktop/mobile: shell, empty/unread-empty thật PASS.
- Image chưa rebuild; recreate từ image cũ mất bản nạp tại chỗ. Còn Live nonempty, native mobile, full accessibility/cross-browser/load lớn và pipeline sinh thông báo; không kết luận những phần này đã hoàn thành.
- Bằng chứng và phạm vi từng phép thử, backup/runtime hash và các tệp chỉnh sửa xem report mới nhất. Mã nguồn B11/app.ts đã có thay đổi trước phiên giữ nguyên hash; không sửa màn khác.
