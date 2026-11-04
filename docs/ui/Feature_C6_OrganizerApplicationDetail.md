# C6 — Kế hoạch trang chi tiết hồ sơ đăng ký BTC và xét duyệt

## 1. Phạm vi và trạng thái

- Lập ngày **2026-11-05 01:24:11 UTC+07**, Asia/Ho_Chi_Minh; cập nhật **01:41:15 UTC+07: ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN**. [Report triển khai](../reports/stitch/C6_20261105_012835_detail_implementation.md).
- Trang con của **C6 — Xét duyệt hồ sơ Ban Tổ Chức**, không đặt mã màn hình Stitch mới.
- [Report phiên](../reports/stitch/C6_20261105_012411_detail_plan.md); [plan C6 danh sách](Feature_C6_Approve.md); [C5 tham chiếu](Feature_C5_OrganizerDetail.md); [Master Plan](../PROJECT_MASTER_PLAN.md).
- Yêu cầu: nhấn **Xét duyệt** ở dòng PENDING hoặc **Xem** ở dòng REJECTED trên “Hồ sơ đăng ký BTC” để mở trang riêng tương tự C5, thay modal hiện tại.
- Phiên lập plan chỉ tài liệu; sau yêu cầu thực hiện đã triển khai C6 detail/App/active sidebar, C6 list/back và DTO. Không sửa source C5/C4 hoặc mở rộng nghiệp vụ ngoài xét duyệt.
- Đã dùng `AdminShell`/`AdminHeader`/`AdminSidebar`; JSX và CSS multi-line trong `client/src/pages/admin/C6OrganizerApplicationDetail.tsx`, namespace `.c6-detail-*`.

“Tương tự C5” áp dụng cho khung trang, breadcrumb, card hồ sơ, phong cách và hành vi URL/back/reload. Cột danh sách sự kiện C5 được thay bằng vùng thông tin đăng ký và quyết định xét duyệt; không thêm event list, GMV hoặc tính năng vận hành BTC vào trang xét duyệt.

## 2. Nguồn thiết kế và hiện trạng

Các mô tả modal/chưa có route/thiếuDTO bên dưới là bằng chứng **trước triển khai**; kết quả hiện tại ở mục10. Nguồn Stitch giữ nguyên, không có screen detail mới được tạo.

| Nguồn | Bằng chứng |
|---|---|
| Stitch chính thức | Project `10374042969343935993` — EventHub |
| C6 | Screen `14785a10e0cf42c89d308996b8149813`, DESKTOP2560×4952 |
| HTML / ảnh C6 | `3437601346411197027` / `5223566903835692269`, đã lấy qua MCP, đọc HTML và xem ảnh trực tiếp |
| C5 | `client/src/pages/admin/C5OrganizerDetail.tsx` và plan/report C5 đã triển khai; tham chiếu cấu trúc, không đổi source C5 trong phiên plan |
| Frontend C6 | `/admin/applications/review`, `C6Approve.tsx`: `openDetail(row)` → `.c6-overlay/.c6-dialog`; dùng snapshot list, không có URL riêng |
| Backend | GET admin detail đã được bổ sung khi triển khai C5; POST review dùng chung C4/C6, chỉ chấp nhận hồ sơ PENDING |

Artifact C6 là trang danh sách/thẩm định với hồ sơ mở rộng, không có bằng chứng về một screen chi tiết độc lập. Bố cục đề xuất mới là kết hợp **khung C5** theo yêu cầu với **nội dung xét duyệt C6**, không tuyên bố đã tạo/xác minh thiết kế mới trên Stitch. Không edit/generate/copy screen trên Stitch trong phiên này.

Tokens giữ theo C5/artifact hiện có: nền `#0f1222`, card `#181b2a`, lớp nổi `#262939`, chữ `#e0e1f7`, chữ phụ `#ccc3d8`, tím `#7c3aed/#d2bbff`, cyan `#5de6ff`; Syne cho heading, Be Vietnam Pro cho nội dung, Space Grotesk cho metadata. Ghi nhận khác biệt với palette prose Cosmic Graffiti; không tự recolor hoặc nhân bản shell.

## 3. Luồng và route đề xuất

1. Danh sách C6 giữ `/admin/applications/review`, tiếp tục chỉ lấy `PENDING_OR_REJECTED` hoặc lọc PENDING/REJECTED; không thêm APPROVED vào hàng đợi.
2. PENDING → nút “Xét duyệt”; REJECTED → nút “Xem”; cả hai tới **`/admin/applications/review/:applicationId`**, ADMIN guard.
3. Đọc GET detail theo **application UUID**, không truyền user UUID/tên BTC thay thế; reload/new tab luôn đọc lại API.
4. Breadcrumb “Hồ sơ đăng ký BTC / Chi tiết hồ sơ”; nút “Quay lại danh sách” về C6 với `q/status/page/limit` cũ. Đồng bộ filter/page C6 lên URL và kiểm tra returnTo chỉ thuộc C6; deep link không state mặc định về C6.
5. C5 vẫn `/admin/applications/:applicationId`, C6 detail có nhánh `/review/:applicationId`; nhận diện `isAdminConsolePage` và active sidebar “Hồ sơ đăng ký BTC” cho route mới, không active đồng thời “Ban tổ chức”.
6. Sau quyết định thành công giữ trang chi tiết, tải lại hồ sơ và hiển thị trạng thái mới. Quay lại danh sách sẽ truy vấn lại; hồ sơ APPROVED biến mất khỏi hàng đợi, REJECTED vẫn ở đúng tập lọc. Nếu trang cuối rỗng sau duyệt, điều chỉnh trang và giữ search/status/limit.

## 4. Bố cục dự kiến

### Header nội dung

- Breadcrumb, tiêu đề “Chi tiết hồ sơ đăng ký Ban Tổ Chức”.
- Tên BTC, badge **Chờ duyệt / Đã từ chối / Đã phê duyệt** theo API, ngày nộp và nút quay lại.
- Không dùng “đang hoạt động”, “KYC approved” hoặc “đã đối soát thuế” thay cho trạng thái duyệt đơn.

### Cột trái — thông tin tổ chức (khoảng 1/3)

- Card tương tự C5: logo hoặc chữ cái fallback; tên BTC; tên doanh nghiệp; MST/giấy phép **khai báo**; trụ sở.
- Người liên hệ, email, điện thoại, website/mạng xã hội. `contact_name` là người liên hệ, chưa chứng minh đại diện pháp luật được xác thực.
- Website chỉ link khi HTTP/HTTPS; nội dung không có hiển thị “Chưa cập nhật”, không dùng hồ sơ mẫu.

### Cột phải — nội dung đăng ký và quyết định (khoảng 2/3)

1. Card **Nội dung đăng ký**: giới thiệu tổ chức, danh mục sự kiện chính, quy mô dự kiến; giữ xuống dòng văn bản và xử lý tên/URL dài.
2. Metadata **Ngày nộp / Ngày xét duyệt**. Không hiển thị tên người duyệt vì DTO hiện không trả identity người duyệt và scope C6 trước đã loại mục đó.
3. Card **Thẩm tra pháp lý**: giữ sáu mục AI Score/MST/eKYC/tài liệu/blacklist/SLA theo scope C6 đã duyệt trước, chỉ nhãn “Đang phát triển” rõ ràng + toast khi bấm; không hiển thị score, giấy tờ, chứng nhận hoặc kết quả giả. Không tự triển khai API cho các mục này. Yêu cầu C5 bỏ chức năng nâng cao không tự động thay scope C6.
4. Card **Quyết định xét duyệt** theo trạng thái ở bảng dưới.

| Trạng thái thật | Nội dung và thao tác |
|---|---|
| PENDING | Form lý do, đếm ký tự0–2000; “Từ chối hồ sơ” yêu cầu reason trim không rỗng; “Phê duyệt & cấp quyền BTC”; xác nhận trước gửi |
| REJECTED | Lý do từ chối, ngày xử lý; chỉ đọc; không duyệt lại/mở lại bằng POST cũ |
| APPROVED | Hiển thị đã phê duyệt, ngày xử lý; chỉ đọc. Có thể gặp qua deep link hoặc sau submit; không cần đưa vào list C6 |

Desktop hai cột gap24–32px, card padding24px/radius12px theo C5; tablet/mobile chuyển một cột, toàn trang cuộn, không khóa canvas/chiều cao. Form và nút đủ rộng trên390px, luôn thấy thông báo lỗi; không dùng thanh cố định che nội dung. Không render vùng danh sách sự kiện, KPI GMV, Escrow/payout, hạn mức, yêu cầu bổ sung, biên bản nội bộ, mã SUB hoặc audit đã ngoài scope C6.

## 5. API và dữ liệu đã đối chiếu

**Cập nhật triển khai:** GET detail đã thêm2trường danh mục/quy mô, POST đã kiểm trên DB riêng trước tích hợp. Bảng bên dưới giữ bằng chứng phiên plan; kết quả31HTTP và runtime mới ở mục10/report triển khai.

Môi trường đọc thực tế **localhost8000/api**, phiên01:24:11; đăng nhập ADMIN demo bằng cấu hình sẵn có, không lưu credentials/token. Không gửi mutation nghiệp vụ trong phiên plan.

| API | Hợp đồng / bằng chứng phiên này | Việc cần làm khi triển khai |
|---|---|---|
| POST `/auth/login` |200 | Dùng auth/Axios hiện có |
| GET `/admin/organizer-applications?status=PENDING_OR_REJECTED&page=0&limit=10` |200,total2, một PENDING/một REJECTED; `{items,pagination,stats}` | Giữ contract/filter; lưu filter/page trên URL để back |
| GET `/admin/organizer-applications/:id` |200 cho cả hai status; có identity/liên hệ/pháp nhân/logo/status/created_at/reviewed_at/rejection_reason | Bổ sung allowlist hai trường `main_event_category`, `expected_event_scale` từ bảng đã có; không migration hoặc GET mới |
| POST `/admin/organizer-applications/:id/review` | Route/controller/service/repository đã đọc source; **không gọi POST trong phiên này** | Kiểm lại success/400/401/403/404/409 trên DB riêng trước khi tích hợp form mới |

GET detail hiện đủ phần lớn card C5 nhưng **chưa trả `main_event_category`, `expected_event_scale`**, trong khi modal C6 lấy được từ list. Không lấy cache list hoặc fetch toàn bộ list để che thiếu DTO. Mở rộng DTO này là dependency nhỏ cần làm trước phần nội dung đăng ký, sau đó kiểm không làm hỏng C5.

Request review: `{ approve: boolean, reason?: string }`, reason trim tối đa2000, mặc định rỗng; từ chối phải có lý do. Phê duyệt chuyển PENDING→APPROVED và cấp role ORGANIZER trong transaction; từ chối PENDING→REJECTED, không cấp role. Backend khóa hồ sơ qua SELECT FOR UPDATE trước kiểm trạng thái, chỉ một quyết định có thể thành công; hồ sơ đã xử lý trả409 ALREADY_REVIEWED. Audit append trong transaction route. Không diễn giải cấp role thành xác minh pháp lý hoặc kích hoạt ký quỹ.

Sau POST không giả định response trả hồ sơ: GET detail lại; cập nhật trạng thái từ GET. Nếu POST thành công nhưng GET lỗi, hiển thị “Đã gửi quyết định, chưa tải được trạng thái mới”, khóa gửi lại và cho tải lại. Nếu timeout/network error khi POST, recheck GET trước retry; không tự gửi mutation lặp. Nếu409, tải lại trạng thái và chuyển chỉ đọc. Nếu401/403/session đổi, ngừng gửi và không retry bằng tài khoản khác.

## 6. Các điểm hiện tại chưa đạt mục tiêu mới

Danh sách gap khi lập plan; các gap chức năng dưới đây đã giải quyết trong phiên triển khai. Full a11y/pixel-diff còn chưa xác minh.

- Modal không có deep link/reload hoặc browser history riêng; dữ liệu từ snapshot hàng danh sách.
- C6 đang lưu q/page/limit/status trong state, nên quay từ trang riêng chưa có bảo đảm giữ vị trí.
- Form/lỗi nằm trong modal và còn chung error state danh sách; cần state theo trang detail để người dùng thấy kết quả tại đúng hồ sơ.
- Thiếu hai trường DTO nêu trên; GET detail C5 không trả GMV và trang mới không cần GMV.
- Chưa có confirm/recheck rõ ràng cho response thất lạc và409 theo luồng trang mới.
- Chưa có bằng chứng runtime của page mới ở các viewport hoặc a11y; không coi style C5 đã pass là trang mới cũng pass.

## 7. Các bước triển khai sau khi thực hiện plan

**Đã thực hiện các bước dưới đây**; trạng thái và giới hạn kiểm chứng xem mục10.

1. **Contract trước UI:** bổ sung hai trường DTO, kiểm detail PENDING/REJECTED/APPROVED/null; xác minh POST review và rào cản quyền trên DB riêng, dùng đúng ID. Không mở rộng chức năng backend nâng cao.
2. **Trang riêng:** tạo component+CSS một file multi-line, dùng shell chung, giữ token/layout phần hồ sơ C5; route ADMIN, active sidebar và console đúng.
3. **Nối C6:** thay `openDetail` bằng Link theo ID ở nút Xét duyệt/Xem; serialize filter/page/limit/q; bỏ modal/handler chỉ còn dùng cho modal khi đã chuyển đủ chức năng, giữ mọi control danh sách không liên quan.
4. **Data/state:** GET độc lập theo URL; AbortController và reset/key theo applicationId; loading/error/retry/404/400 và chống stale response; null không thay bằng dữ liệu giả.
5. **Xét duyệt:** chỉ PENDING có form; confirm đúng tổ chức/quyết định; reject lý do bắt buộc2000ký tự, chống double submit; hiển thị kết quả, GET recheck và handling race/timeout/lost response; nhắc khi rời trang còn lý do chưa gửi nếu cần.
6. **Kiểm thử và báo cáo:** chạy build/lint phù hợp, boundary nếu đổi backend; API integration và Chrome; report mới, cập nhật đúng C6 Master Plan và nhật ký plan.

## 8. Ma trận nghiệm thu

| Nhóm | Tiêu chí phải kiểm |
|---|---|
| Điều hướng | PENDING Xét duyệt/REJECTED Xem tới đúng applicationId; deep link/new tab/reload; back link/browser back giữ q/status/page/limit; C5/C6 list không bị route bắt nhầm |
| DTO | Đủ danh mục/quy mô thật, null logo có fallback; không lộ secret/pending legal data; C5 regression giữ hoạt động |
| Quyền | Guest401, USER/ORGANIZER403 ở API; route ADMIN; missing404/invalid UUID400; đổi session ngừng gửi |
| Thành công | Approve→APPROVED + role ORGANIZER, reject→REJECTED + reason; GET phản ánh kết quả; refresh list/count/last page đúng |
| An toàn thao tác | Hai admin đồng thời chỉ một thành công; confirm/cancel; blank/2001ký tự; double click; timeout/GET lỗi sau POST; không tự retry quyết định |
| State | Loading/empty field/error/retry,409 và hồ sơ đã xử lý read-only; đổi ID khi request cũ chưa xong không hiển thị nhầm |
| Bố cục |1440/1024/768/390, toàn trang cuộn, nút không cắt, tên/URL dài; shell đúng một lần |
| A11y | Label/aria lỗi, bàn phím/focus và confirm dialog, focus trả lại đúng nút, contrast; không đánh full PASS từ screenshot |
| Scope | Placeholder pháp lý nói rõ đang phát triển, không chứng nhận giả; không thêm event/GMV/escrow/audit/hạn mức hoặc chỉnh C5 |

Mutation thành công/race/rollback chỉ trên DB test cô lập. Không duyệt hoặc từ chối hồ sơ đang dùng để tạo ảnh smoke. Trước bàn giao cần có bằng chứng chứ không dùng kết quả test modal C6 cũ thay cho page mới.

## 9. Nhật ký và giới hạn

| Thời điểm | Thao tác | Report |
|---|---|---|
|2026-11-05 01:24:11 UTC+07|Lập plan tách chi tiết C6 từ modal theo khung C5; đọc C6 Stitch/ảnh/HTML, source và GET API thật; chưa sửa source/Stitch|[Detail plan](../reports/stitch/C6_20261105_012411_detail_plan.md)|
|2026-11-05 01:41:15 UTC+07|Triển khai page/detailDTO/luồng approve-reject/back;31HTTP +15nhómChrome và local read smoke PASS; nạp1JS DTO API8000|[Implementation](../reports/stitch/C6_20261105_012835_detail_implementation.md)|

Trạng thái: page đã triển khai, **ĐẠT CÓ ĐIỀU KIỆN**;2trường DTO và kiểm POST trên DB riêng đã xong. Giữ bằng chứng review cũ; AI/eKYC/MST/blacklist/SLA vẫn chỉ đang phát triển.

## 10. Kết quả triển khai và kiểm chứng

- Route ADMIN `/admin/applications/review/:applicationId`; nút Xét duyệt/Xem dùng Link; C6 list giữ q/status/page/limit trên URL, back/reload/new tab đúng, clamp trang cuối khi APPROVED bị loại khỏi hàng đợi.
- GET `/api/admin/organizer-applications/:id` đủ main_event_category/expected_event_scale; không migration/API mới. PENDING có form, REJECTED/APPROVED chỉ đọc; không hiển thị GMV/event list.
- POST review thật, reason trim/max2000; confirm Radix/cancel/Escape/focus, lock double submit, session revision, GET recheck trước/sau POST;409/timeout/lost response không tự gửi lại; sau commit nhưng GET lỗi phải tải lại trạng thái.
- API31calls:16×200,2×401,4×403,4×400,1×404,3×409,1×500.500 chủ đích kiểm audit rollback; race haiADMIN1success1conflict. C6 và C5integration DB riêng PASS; backend45pass0fail21skip.
- Chrome11core+4edge PASS,4viewport1440/1024/768/390,0pageErrors; đổiID/session/GET lỗi/back/lastpage/confirm/lostPOST/409 kiểm thật; ảnh desktop/mobile đã xem. Server/client build, lint và boundaries PASS.
- API8000 nạp1JS auth store cùng container/image, health/GET detail200; localhost5173 pending/rejected/reload/confirmCancel/mobile PASS,0adminwrites. Cần rebuild image để giữ thay đổi sau recreate; static/public chưa rollout.
- Còn full a11y/screen reader/contrast/browser khác/benchmark/pixel-diff; không lưu reason dở thành draft. [Report và evidence](../reports/stitch/C6_20261105_012835_detail_implementation.md).
