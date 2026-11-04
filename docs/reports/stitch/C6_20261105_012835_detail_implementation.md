# C6 — Triển khai trang chi tiết hồ sơ xét duyệt

## Phiên, nguồn và yêu cầu

- Bắt đầu **2026-11-05 01:28:35 UTC+07**, Asia/Ho_Chi_Minh; kết quả cập nhật **01:41:15 UTC+07**; loại `detail_implementation`.
- Màn hình **C6 — Xét duyệt hồ sơ Ban Tổ Chức**, trang con `/admin/applications/review/:applicationId`.
- [Plan](../../ui/Feature_C6_OrganizerApplicationDetail.md); [report lập plan](C6_20261105_012411_detail_plan.md); [plan C6 danh sách](../../ui/Feature_C6_Approve.md).
- Project Stitch chính thức `10374042969343935993`, screen `14785a10e0cf42c89d308996b8149813`, DESKTOP2560×4952; HTML `3437601346411197027`, ảnh `5223566903835692269`.
- Đã đọc Master Plan/plan trước dùng Stitch. Phiên này gọi lại get_screen và tải/đọc HTML44152ký tự; ảnh C6 đã xem trực tiếp trong phiên lập plan trước. Nguồn C5 là component/plan đã triển khai và artifact C5 được review trước đó. Không gọi edit/generate/copy screen; không có screen chi tiết C6 mới trên Stitch.
- Người dùng yêu cầu thực hiện plan. Giữ scope C6: core approve/reject, nhóm pháp lý chỉ nhãn đang phát triển/toast, không mở rộng nghiệp vụ nâng cao.

## Trạng thái đầu và tiêu chí nghiệm thu

Đầu phiên C6 dùng modal từ snapshot list, không deep link hoặc back giữ filter; GET detail thiếu main_event_category/expected_event_scale. C5 đã có khung page đọc hồ sơ. Mục tiêu chuyển nút Xét duyệt/Xem sang page tương tự C5, shell chung, URL/reload độc lập; PENDING có quyết định, REJECTED/APPROVED chỉ đọc; giữ filter/page khi back; confirm/lock/recheck/lost-response và quyền ADMIN.

## Thay đổi đã thực hiện

| Tệp | Kết quả |
|---|---|
| `server/src/modules/auth/infrastructure/store.ts` | Thêm main_event_category/expected_event_scale vào allowlist GET detail hiện có; không schema/migration/route mới |
| `client/src/pages/admin/C6OrganizerApplicationDetail.tsx` | Page mới, TSX+CSS multi-line cùng file; hồ sơ trái, nội dung đăng ký/pháp lý/quyết định phải; ADMIN shell, logo fallback, link HTTP/HTTPS, trạng thái/ngày UTC+7 |
| `client/src/pages/admin/C6Approve.tsx` | Thay modal bằng Link đúng ID; PENDING Xét duyệt, REJECTED Xem; lưu q/status/page/limit trên URL và state returnTo, clamp trang cuối khi total giảm; bỏ handler/state/modal cũ |
| `client/src/App.tsx` | Import/route ADMIN `/admin/applications/review/:applicationId`, nhận diện console để shell không chồng; C5 và C6 list route giữ riêng |
| `client/src/pages/admin/AdminSidebar.tsx` | Nhận diện C6 detail, active “Hồ sơ đăng ký BTC”; C5 vẫn active “Ban tổ chức” |
| `server/test/admin-organizer-review.test.cjs` | HTTP regression trên DB riêng: DTO/roles/validation/approve/reject/race2admin/audit rollback |
| `server/test/fixtures/c5.cjs` | Cho truyền clientUrl optional để tái sử dụng fixture với origin5186; mặc định5185 cũ giữ nguyên |
| `client/tests/c6-detail-runtime.cjs`, `client/tests/c6-detail-edge.cjs` | Chrome API thật, confirm/mutation/error/409/response thất lạc/route/back/session/stale và responsive |

Các file docs cập nhật: plan chi tiết, plan C6 tổng, report mới này và đúng mục C6 Master Plan. Không sửa source C5/C4/C12. Điểm nối App/Sidebar là cần thiết cho page mới; không đổi nội dung shell hoặc artifact Stitch.

## Hành vi đã triển khai

- GET độc lập theo application UUID, không dựa dữ liệu list; remount theo ID và abort request; invalid400/missing404/error/retry rõ ràng, không hiện snapshot sai hồ sơ.
- Hiển thị thông tin đăng ký thật và trạng thái/ngày. REJECTED có reason; APPROVED chỉ đọc cả khi deep link hoặc ngay sau duyệt.
- PENDING có reason tối đa2000, từ chối cần trim không rỗng, confirm đúng tổ chức/quyết định. Khóa đồng bộ bằng ref chống double click, kiểm revision phiên; read lại trạng thái trước POST.
- POST thành công → GET lại, không giả định POST trả DTO. Lỗi GET sau POST giữ form khóa, thông báo chưa tải trạng thái, chỉ mở sau explicit reload thành công. Mất response/500/409 → recheck GET; không tự POST lại. Session đổi ngừng UI thao tác.
- Confirm Radix có focus trap/Escape/cancel; focus trở về nút gốc hoặc tiêu đề quyết định khi nút không còn. Các nhóm AI/MST/eKYC/tài liệu/blacklist/SLA luôn ghi đang phát triển, không có score/chứng nhận giả.
- Hai cột desktop/1cột mobile theo C5, toàn trang cuộn; không event list/GMV/escrow/payout/audit/hạn mức trong detail.

## API xác minh trước tích hợp

Môi trường source API test loopback, PostgreSQL17 container `eventhub-c5-test`, cổng55473; DB `c6_api2_test`. DB chỉ dành kiểm thử, fixture kiểm tra loopback/tên `_test`/fresh empty. Không dùng DB hiện hữu cho mutation test.

| API | Bằng chứng |
|---|---|
| GET `/api/admin/organizer-applications/:id` |200 cho PENDING/REJECTED/APPROVED; đủ2trường mới; không secret/pending_legal/reviewed_by; guest401,USER/ORGANIZER403 |
| POST `/api/admin/organizer-applications/:id/review` | `{approve:boolean,reason?:string}`;200approve→APPROVED+role ORGANIZER;200reject→REJECTED+trim reason/ngày; reject không cấp role; blank/2001ký tự/sai type400; bad UUID400; missing404;401/403 theo quyền |
| POST đã xử lý/đồng thời |409 cho quyết định lặp; hai ADMIN khác nhau gửi đồng thời cho cùng pending: một200,một409 |
| POST audit failure | Trigger chỉ trên DB test làm audit INSERT thất bại500; GET vẫn PENDING và không có ORGANIZER role, chứng minh rollback transaction |
| GET list PENDING_OR_REJECTED |200, không có APPROVED sau duyệt; C5 exact-owner/list/detail regression chạy riêng PASS |

**31 HTTP calls:**16×200,2×401,4×403,4×400,1×404,3×409,1×500.500 là lỗi audit có chủ đích trên fixture, không phải lỗi runtime còn mở. [API evidence](evidence/C6_20261105_012835/api-results.json).

## Kiểm thử UI và chất lượng

- Build server/client PASS; ESLint App/C6 list/detail/Sidebar PASS; check:boundaries PASS.
- Backend suite45PASS/0FAIL/21SKIP (integration suites khác thiếu env DB); C6 integration và C5 integration chạy riêng trên DB riêng đều PASS.
- Chrome nguồn5186/API8036, DB `c6_browser3_test`: **11nhóm core +4nhóm edge PASS**,0pageErrors. Sáu review requests trong core test gửi tới fixture; thêm external review để tạo409 có chủ đích, không mutation dữ liệu hiện hữu.
- Core: deep link/reload/new tab, DTO, shell/menu,4viewport, placeholder/toast, reject blank/max2000, confirm/cancel/Escape/focus, approve doubleclick1POST, reject/persist, response POST mất sau commit,409, GET lỗi sau commit, C6 back/filter/lastpage clamp,400/404, C5 regression và quyền Customer/Organizer.
- Edge: mô tả dài/mobile, GET lỗi→retry thật, response cũ khi đổi hồ sơ không ghi đè, đổi phiên khi confirm mở không gửi POST.
- [Core results](evidence/C6_20261105_012835/browser-results.json); [edge results](evidence/C6_20261105_012835/edge-results.json). Ảnh1440/1024/768/390 không tràn ngang; đã xem trực tiếp [desktop](evidence/C6_20261105_012835/c6-detail-1440.png) và [mobile](evidence/C6_20261105_012835/c6-detail-390.png).
- Kiểm đầu phát hiện cancel confirm không trả focus đúng; đã bổ sung focus handling và chạy lại PASS. Script sửa C6 ban đầu làm hỏng2nhãn tiếng Việt do encoding pipe; đã sửa UTF-8 bằng patch trước test cuối, không giữ nhãn lỗi. Build còn cảnh báo bundle/Browserslist có sẵn, không đổi dependencies ngoài scope.

## Runtime local

Đã sao lưu rồi nạp **1JS** `dist/modules/auth/infrastructure/store.js` vào `pbl6-api-1`, restart cùng container/image, SHA256 host/container khớp. Health/login200; GET list200 với2hồ sơ PENDING/REJECTED; cả2GET detail200 và đủ danh mục/quy mô. Không migration/config/worker/payment/static update. [Rollout evidence](evidence/C6_20261105_012835/local-rollout.json).

Chrome **localhost5173/API8000**: C6 Xét duyệt→đúng hồ sơ, reload, confirm→Hủy, back và REJECTED read-only PASS;1440/390 không tràn;0pageErrors, **0admin writes**. [Local result](evidence/C6_20261105_012835/local-browser.json); [local desktop](evidence/C6_20261105_012835/local-1440.png), [local mobile](evidence/C6_20261105_012835/local-390.png).

Nạp JS tại chỗ không cập nhật image: recreate từ image cũ mất DTO mới. Cần rebuild image cho triển khai bền vững; static frontend/public chưa rollout. Không tuyên bố đã xét duyệt thành công hồ sơ thật qua local smoke.

## Review cuối, tồn tại và Master Plan

| Tiêu chí | Trạng thái | Bằng chứng/giới hạn |
|---|---|---|
| Yêu cầu/nội dung | PASS | Trang riêng, đủ DTO, core approve/reject và scope pháp lý cũ |
| Bố cục | PASS | Khung C5/cards/Cosmic Graffiti; desktop/mobile đã xem |
| Design system | PASS | Token/font/card theo C5/phần nội dung C6 được duyệt |
| Tiếng Việt/khả năng đọc | PARTIAL | Nhãn rõ, không chứng nhận giả; chưa đo contrast đầy đủ |
| Điều hướng/nghiệp vụ | PASS | URL/back/reload/quyền/approve/reject/race/lost response |
| State | PASS | Loading/error/retry/400/404/409/uncertain/read-only và session |
| Responsive/a11y | PARTIAL |4viewport và confirm keyboard/focus PASS; chưa screen reader/full a11y/browser khác |
| Nhất quán | PASS | Shared shell một lần, đúng active menu; C5 còn hoạt động |

**Kết quả: ĐẠT CÓ ĐIỀU KIỆN**. Đã giải quyết modal/deep link,2trườngDTO, form/recheck/back/filter. Thiết kế Stitch giữ nguyên; bố cục page mới theo yêu cầu kết hợp C5/C6, không có thay đổi artifact được thực hiện.

Còn full screen reader/contrast/browser khác, benchmark/pixel-diff, image/static/public rollout chưa xác minh. Dữ liệu reason nhập dở không được lưu thành draft; trang hiện không có nghiệp vụ lưu ghi chú nội bộ.

Master Plan cập nhật đúng4vị trí C6: ma trận API, bảng5.3 route/triển khai,5.4review/vấn đề/report/time,6.F; bảo toàn lịch sử/report trước và trạng thái các màn khác. Plan cập nhật trạng thái, contract/test/runtime và nhật ký; không lấy thành công tài liệu làm bằng chứng thay test.

Kiểm cuối: UTF-8/liên kết plan-report PASS, Master Plan so với bản trước sửa chỉ đổi4dòng C6, `git diff --check` PASS. Hash baseline xác nhận không sửa source C4/C5/C12 hoặc thay đổi có sẵn ngoài các file trong bảng;8file cũ thay trong phiên gồm3docs,3frontend,1authstore và1fixture; component/tests/report/evidence là file mới. Đã xem ảnh local390 sau smoke, không tràn hoặc sidebar che nội dung. Evidence JSON không chứa credentials/token; script runtime và backup nằm `.local/qa/` không đưa vào report.
