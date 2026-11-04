# C9 — Phê duyệt chi tiết một sự kiện

- Thời điểm review: 2026-11-04 14:49:10 UTC+07 (Asia/Ho_Chi_Minh).
- Trạng thái hiện tại: **ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN**, tổng hợp 2026-11-04 16:26:57 UTC+07. Các phần review ban đầu bên dưới giữ bằng chứng lịch sử.
- [Report triển khai](../reports/stitch/C9_20261104_162657_implementation.md): route `/admin/events/review/:id`, `C9ApproveEventDetail.tsx`, AdminShell, TSX+CSS một file multi-line; C11 ảnh/title/Xem chi tiết tới C9; back giữ search/category/page.
- Kiểm thử: backend/client build và client lint PASS; 23 API checkpoints, Chrome 10 nhóm + 6 nhóm dữ liệu biên/network trên DB riêng PASS. Local5173/API8000 bản cuối Chrome1440/1024/768/390 PASS, 0 event writes; 20 control chưa hỗ trợ chỉ toast cuối màn hình. Chưa full a11y/contrast/browser khác/pixel-diff/benchmark/static8000-public rollout.
- Phạm vi đã chốt: **chỉ logic duyệt/từ chối**, 2026-11-04 15:13:15 UTC+07, đã triển khai ở phiên sau. Thiếu API nâng cao không chặn phạm vi này.
- [Report cập nhật phạm vi](../reports/stitch/C9_20261104_151315_scope_update.md). Kết luận KHÔNG ĐẠT/BLOCKED trong review ban đầu áp dụng cho phạm vi đầy đủ trước khi thu gọn.
- [Báo cáo phiên](../reports/stitch/C9_20261104_144910_review_plan.md).
- Nguồn: [Master Plan](../PROJECT_MASTER_PLAN.md), skill `.agents/skills/eventhub-stitch-review/SKILL.md`, Stitch project `10374042969343935993`.

## 1. Xác định đúng màn hình và phạm vi

Canvas hiện tại gắn nhãn **C9** cho screen `4450a0d934414f53aefdd786247d53da`. Metadata của screen còn tên **C10. Chi tiết thẩm định sự kiện & Phê duyệt mở bán - Cosmic Ticket Quản Trị Viên**. Dùng screen này vì canvas và nội dung khớp yêu cầu chi tiết một sự kiện, không dùng screen hàng đợi.

Master Plan trước review ghi C9 = “Hàng đợi duyệt sự kiện khẩn cấp”, ID `5ed99a94ec5d44448ae0703061ef61ae`; canvas hiện gắn ID đó với C11. Đây là alias lịch sử, không phải hai màn hình C9 cần dựng. Hàng C10 cũ trong Master Plan vẫn trỏ ID chi tiết; giữ nguyên mục màn khác theo phạm vi người dùng, ghi nhận việc chuẩn hóa toàn bộ danh mục là tồn đọng.

Đã truy cập project, lấy metadata, đọc HTML và xem screenshot bằng MCP; không gọi edit/generate/apply design system. HTML file `12185777148802080972`, ảnh `9834108020378024947`; metadata DESKTOP 2560×6136, canvas instance 1280×1727. Các kích thước thuộc hai lớp metadata khác nhau, không dùng làm bằng chứng responsive.

Yêu cầu triển khai ở phiên sau:

1. Vào C9 khi chọn một sự kiện tại hàng đợi `/admin/events/review`.
2. Dùng lại `AdminShell` → `AdminHeader` và `AdminSidebar`; không chép shell mẫu của Stitch hay tạo sidebar mới.
3. Giữ bố cục nội dung hiện có trên Stitch; không tự sửa thiết kế, không tự phục hồi module đã bị bỏ khỏi artifact.
4. TSX và CSS của C9 cùng **một file**, dự kiến `client/src/pages/admin/C9ApproveEventDetail.tsx`. JSX và CSS viết multi-line; CSS scope `.c9-...`, dùng template literal + `<style>{styles}</style>`, không tạo CSS riêng.
5. Phiên này chỉ tạo kế hoạch, report và cập nhật Master Plan. Mọi sửa tài liệu trong phiên đều ghi tại nhật ký report; các phiên thay đổi tiếp phải có report mới và cập nhật liên kết.

### Phạm vi C9 đã được người dùng xác nhận

- Chỉ phát triển logic nghiệp vụ **phê duyệt và từ chối sự kiện** bằng API hiện có. Các GET đọc chi tiết, vé, BTC và identity vẫn phục vụ hiển thị/ngữ cảnh quyết định; điều hướng, xác thực, loading/error/retry vẫn cần thiết.
- **Không phát triển API/backend mới** cho bất kỳ chức năng còn thiếu tại mục 5.
- **Giữ khung giao diện giống Stitch**, gồm vị trí, card, bảng, nhãn và nút của các khối nâng cao. Không xóa các khối này chỉ vì chưa có API.
- Các chức năng chưa có chỉ là **hiển thị**. Nhấn nút hoặc phần tử tương tác của chúng sẽ hiện toast ở **cuối màn hình** với nội dung chính xác: **“Chức năng đang được phát triển”**. Không gọi API, tải ZIP, gửi yêu cầu bổ sung, thay đổi trạng thái hoặc hiển thị thành công giả.
- Nhóm chỉ hiển thị gồm SLA/priority, AI, KYC/Tier/PGP, ZIP hồ sơ, yêu cầu bổ sung, key visual verification, GMV/phí dự kiến chưa có policy, chống bot/định danh, QR động, Escrow/Anti-Dump và chữ ký số. Giữ hình thức Stitch; giá trị chưa có nguồn dùng “—”/“Chưa có dữ liệu” hoặc nhãn “Đang phát triển”, không trình bày số/đánh giá mẫu như kết quả thật của sự kiện. Không chạy countdown SLA hay AI giả.
- Các khối thông tin tĩnh không cần biến toàn bộ thành nút. Mọi control dành cho chức năng chưa hỗ trợ phải bắt được click và thao tác bàn phím, chỉ hiện toast; không dùng disabled khiến người dùng không nhận được thông báo.
- Ý kiến kiểm duyệt là `reason` gửi cùng quyết định; không thêm lưu nháp/autosave. Hai nút “Phê duyệt & Mở bán” và “Ký duyệt sự kiện này” cùng thực hiện approve thật qua một handler/submit lock; không biến CTA duyệt thành toast và không coi approve là ký số.
- Toast cố định gần mép dưới viewport, dùng cơ chế thông báo hiện có nếu phù hợp, có `role="status"`/`aria-live="polite"`, không lấy focus; hỗ trợ đóng/tự ẩn, không che CTA hoặc tràn màn hình mobile. Nhấn lặp cập nhật một thông báo thay vì chồng nhiều toast.

Quyết định này thay thế yêu cầu chờ API mới/chờ chốt scope cho nhóm nâng cao trong bản plan ban đầu. Đây là phạm vi riêng đã xác nhận cho C9; các chức năng chỉ hiển thị không được báo là đã triển khai nghiệp vụ.

## 2. Bản thiết kế hiện có và Cosmic Graffiti

| Khối đang tồn tại | Nội dung cần đối chiếu khi dựng |
|---|---|
| Breadcrumb / hồ sơ | Sự kiện & kiểm duyệt → hàng đợi → mã hồ sơ; SLA và priority |
| Hero / command bar | Banner, trạng thái thẩm định, Tier 1, quy mô, Escrow; tên, thời gian, địa điểm; ZIP, từ chối, bổ sung, phê duyệt & mở bán |
| Cột trái 8/12 — Module A | Poster, thông tin BTC/liên hệ/pháp nhân; tổng phát hành, GMV tối đa, phí sàn dự kiến |
| Cột trái — Module C | Bảng hạng vé: tên/mã, số lượng, giá, tổng doanh thu, trạng thái kho; ba thẻ định danh/QR động/Anti-Dump |
| Cột phải 4/12 — Module E | Cosmic AI Validator, điểm 96/100, mức rủi ro, độ tin cậy, kết luận |
| Cột phải — Module G | Ý kiến kiểm duyệt, thông tin người ký, thời điểm, nút ký duyệt |

HTML chỉ còn comment cho Module B (pháp lý), D (sơ đồ địa điểm), F (financial escrow); không có khối nội dung tương ứng. Checklist G rỗng. Không lấy bố cục của bản cũ hoặc tự thêm các module này.

**Đối chiếu design system:** project designMd mô tả nền #080B1A, card #10162B, tím #7C3AED, cyan #22D3EE, hồng #F472B6, chữ #F8FAFC/#94A3B8. Tuy nhiên named tokens thực tế của project và HTML dùng surface #0F1222, card #181B2A/#1C1F2F, primary #D2BBFF, primary-container #7C3AED, secondary #5DE6FF, tertiary #FFAFD3, text #E0E1F7/#CCC3D8. Đây là khác biệt giữa mô tả và token sinh ra, không tự ép đổi màu artifact theo bảng lý tưởng. Shell hiện có cũng dùng #0F1222.

Typography khai báo Syne/Be Vietnam Pro/Space Grotesk, nhưng Google Fonts link trong HTML **không nạp Be Vietnam Pro**; ảnh có nội dung hiển thị serif. Border radius DEFAULT 4px/lg 8px/xl 12px khác mô tả DS 8px/card lớn 16px. Giữ nguồn tham chiếu, ghi sai lệch; sửa font/radius thiết kế cần quyết định riêng, không tự coi là được duyệt.

## 3. Các điểm chưa đạt

| Mức | Phát hiện có bằng chứng | Hướng xử lý trong kế hoạch |
|---|---|---|
| P0 | Chưa có page/route C9 trong App.tsx; C11 gọi openEvent và mở Dialog | Thêm route chi tiết ở phiên triển khai; nối chọn sự kiện vào đúng UUID |
| Ngoài phạm vi nghiệp vụ | Các khối nâng cao dùng số/nhãn mẫu, không có backend tương ứng | Giữ khung hiển thị + toast cuối màn hình theo phạm vi đã chốt; không phát triển API, không còn blocker API nâng cao |
| P0 | Script Stitch đổi nút thành thành công và alert mà không gọi API | Không chuyển script demo thành nghiệp vụ; chỉ báo thành công sau POST thật |
| P1 | Canvas C9 / metadata C10 / Master Plan cũ C9 bị lệch | Dùng mapping đã xác minh, lưu alias; không sửa các hàng màn khác |
| P1 | Ảnh banner trong screenshot là vùng placeholder “img”; poster có dấu hiệu ảnh chụp có chữ giao diện | Dùng cover_image_url thật, cần quyết định nguồn poster riêng; không hard-code ảnh mẫu |
| P1 | Font Be Vietnam Pro thiếu trong link; ngắt dòng GMV, ROOT SIGN/thời điểm khó đọc | Ghi vấn đề thiết kế; kiểm font hiện có khi dựng, không tự sửa Stitch |
| P1 | GMV mẫu 4.850.000.000đ không khớp bảng vé | 7.000×499.000 + 4.000×1.299.000 + 1.000×2.999.000 = **11.688.000.000đ**; không dùng số mẫu làm dữ liệu |
| P1 | “Tổng phát hành” có thể bị nhầm với capacity; doanh thu bảng là capacity×price | Chốt định nghĩa: năng lực bán dự kiến khác vé đã phát hành và doanh thu PAID |
| P1 | “Phê duyệt & mở bán” đặt PUBLISHED nhưng thời điểm bán vé còn tùy sale_starts_at/sale_ends_at/sales_paused | Không hứa mua được vé ngay sau approve nếu chưa vào cửa sổ bán |
| P1 | C9 thiếu bằng chứng loading/error/empty/disabled, deep link và back | Bổ sung trạng thái ở triển khai, kiểm thử độc lập; không kế thừa PASS C11 |
| P1 | Sidebar HTML fixed 288px/pl-72, không có hành vi mobile đầy đủ | Dùng shell chung, kiểm tablet/mobile và bảng cuộn ngang trong card |
| P2 | Nhãn “SUPER ADMIN/ROOT SIGN”, thời điểm và liên hệ mẫu không phản ánh role/identity thật | Hiển thị identity từ phiên ADMIN; chữ ký số không được suy ra từ đăng nhập |
| P2 | label textarea không có htmlFor/id; ảnh poster chỉ có data-alt; prototype chưa có điều hướng thật | Kiểm và hoàn thiện semantic/focus ở phiên code |

## 4. API: contract và kiểm thử thực tế

Các kết quả API dưới đây thuộc phiên review 2026-11-04 14:49:10 UTC+07; phiên cập nhật scope 15:13:15 không gọi lại API. Môi trường: `http://localhost:8000/api`; login ADMIN seed bằng cấu hình local, không ghi mật khẩu/token. GET dùng dữ liệu thật; không reset/seed DB, không gửi quyết định hợp lệ lên sự kiện đang chờ duyệt.

Route Express tại `server/src/app.ts` gọi trực tiếp module/workflow (không có controller riêng cần giả định): detail → events.guard + orders.types + events.reviews; decision → booking.review → event store, transaction/row lock + audit.

| Method / route (sau /api) | Dữ liệu gửi và kết quả phiên này |
|---|---|
| GET /health | 200; data.status=ok |
| POST /auth/login | Tài khoản admin seed, 200, nhận access token; không lưu secret |
| GET /auth/me | 200; idUser/name/email/phone/roles/permissions có trong contract |
| GET /admin/events | status=PENDING_REVIEW&page=0&limit=6 → 200; total=2, page=0, totalPages=1 |
| GET /organizer/events/:id | UUID thật a5572651-c50c-443a-a55e-1474e615c852 → 200 ADMIN; TECH CONNECT SUMMIT 2026, PENDING_REVIEW, review_version=1; ticketTypes 1; reviews=[] |
| GET /admin/organizers/summaries | ids=44f75b80-80dd-41b0-acdb-d8acf066284c → 200; organization_name/contact_name/account_name |
| GET /admin/events/filter-options | 200; 6 danh mục |
| GET /admin/organizer-applications | status=APPROVED&page=0&limit=50 → 200; 2 records tổng; có 1 hồ sơ khớp user_id BTC, có contact_email/contact_phone |
| POST /admin/events/:id/review | UUID thật + {approve:false,reason:""} → 400 VALIDATION |
| POST /admin/events/:id/review | UUID thật + {approve:"true",reason:""} → 400 VALIDATION; approve phải boolean |
| GET /organizer/events/:id không token | UUID thật → 401 UNAUTHORIZED |
| GET /organizer/events/:id lần sau | 200; toàn bộ response bằng lần trước, không đổi sự kiện/reviews sau kiểm validation |
| GET /organizer/events/00000000-0000-4000-8000-000000000000 | 404 NOT_FOUND |
| POST /admin/events/00000000-0000-4000-8000-000000000000/review | {approve:true,reason:""} và {approve:false,reason:"C9 verification: missing record"} đều 404 NOT_FOUND; payload qua validation, không chứng minh nhánh mutation thành công |

Envelope thành công `{success:true,data:...}`; lỗi `{success:false,code,message}`. Detail có snake_case và `ticketTypes`/reviews; giá là chuỗi số nguyên. Vé thực tế: VIP, price_amount="100000", capacity=100, reserved_quantity=0, sold_quantity=0, waiting_count="0"; cửa sổ bán 2026-11-05T06:36Z–09:36Z. submitted_at=2026-11-04T07:36:51.935Z. Dùng Intl với Asia/Ho_Chi_Minh; không coi created_at là submitted_at.

Contract review: `approve:boolean`; `reason:string`, trim, tối đa 2000, mặc định rỗng; reject bắt buộc lý do sau trim. ADMIN và event PENDING_REVIEW. Thành công theo source: approve → **PUBLISHED**, reject → **REJECTED**, lưu event_reviews (decision APPROVED/REJECTED, reviewer_id, review_version, reason, snapshot) và audit. Không có event status APPROVED.

**Giới hạn kiểm thử:** chưa chạy approve/reject thành công, 403 vai trò khác, stale 409, race 2 ADMIN trong phiên C9. Các test C11 trên DB riêng ở report 20261104_140907 là bằng chứng lịch sử tham khảo, không ghi thành test mới C9. Kiểm thử thành công phải dùng DB cô lập/fixture riêng ở phiên triển khai; không phê duyệt dữ liệu dùng chung chỉ để kiểm tra.

## 5. Chức năng giao diện chưa có API hoặc chỉ hỗ trợ một phần

Bảng này lưu khảo sát khoảng thiếu, **không phải backlog phát triển API**. Theo scope mới, phần chưa hỗ trợ giữ khung hiển thị và click → toast cuối màn hình; chỉ đọc dữ liệu sẵn có khi phù hợp. Không mở rộng contract/backend, không tự tính phí hay chứng nhận trạng thái nâng cao.

| Chức năng | Mức hỗ trợ / khoảng thiếu |
|---|---|
| SLA countdown 41:28, PRIORITY P1-HIGH | Có submitted_at, chưa có policy deadline/SLA/priority; không tự trừ một hằng số |
| Mã #EVT-2025-998, #ORG-CYBER-2025, TK-GA-2025 | Có UUID/slug, chưa có contract mã nghiệp vụ theo mẫu |
| Tier 1, KYC cấp cao, Verified ID, đại diện pháp luật, PGP | Hồ sơ đăng ký có contact_name/business_name/tax_id_or_business_license; không chứng minh danh tính pháp lý/KYC/Tier/PGP |
| Liên hệ BTC | **Có dữ liệu** trong organizer-applications, summary chưa trả email/phone; endpoint list chưa lọc theo user_id. Có thể ghép hồ sơ APPROVED bằng user_id nhưng phải duyệt đầy đủ phân trang/chọn đúng hồ sơ; cần contract detail BTC phù hợp nếu muốn tránh quét danh sách. contact_name không đồng nghĩa đại diện pháp luật |
| Tải ZIP hồ sơ | Chưa tìm thấy endpoint hồ sơ sự kiện/archive download; media upload không thay thế chức năng này |
| Yêu cầu bổ sung | Chưa có workflow/trạng thái/endpoint nội dung yêu cầu, phản hồi BTC và lịch sử; không dùng reject thay thế |
| KEY VISUAL APPROVED / poster độc lập | Event có một cover URL; chưa có chứng nhận duyệt key visual hoặc cặp asset 9:16/16:9 |
| GMV tối đa / phí sàn 5% | Có capacity/price để đề xuất tính tổng dự kiến; chưa có policy phí 5% hay snapshot dự báo. GMV metrics PAID không phải dự kiến |
| Kho “khóa chờ mở bán” | Có event status, sales_paused, thời gian bán, capacity/reserved/sold/archived; thiếu trạng thái khóa kho nghiệp vụ riêng như nhãn mẫu |
| Giới hạn 4 vé/CCCD/SĐT và khớp tại cổng | Validation quantity mỗi line hiện tối đa 10; không tương đương giới hạn tích lũy theo CCCD/SĐT |
| Dynamic QR 45 giây | QR/check-in hiện có không chứng minh rotating QR; order-manager capabilities.dynamicQr=false |
| Escrow Secure / Anti-Dump 72h | Chưa có contract ký quỹ/khóa chuyển nhượng; payment/SePay không tương đương Escrow |
| Cosmic AI Validator | Chưa có score/risk/confidence/insight moderation/MST/track record API |
| Ý kiến kiểm duyệt | Có reason lưu **khi ra quyết định**; chưa có autosave nháp ghi chú độc lập |
| ROOT SIGN / thời điểm ký | reviews/reviewer_id/created_at hỗ trợ lịch sử quyết định; auth/me hỗ trợ người thao tác; không có chữ ký số/chứng thư ROOT SIGN |
| Hai nút phê duyệt và ký duyệt | Có cùng POST review; phải dùng chung một submit lock/confirmation, không gọi hai lần |

Các module B/D/F không còn trong HTML nên không phục dựng. Giữ các khối đang có theo Stitch; phần chưa hỗ trợ áp dụng hiển thị/toast đã được xác nhận ở mục 1, không chờ hoặc xây thêm API.

## 6. Kế hoạch đã thực hiện trong phiên triển khai

### Bước 1 — Áp dụng phạm vi đã chốt

- Giữ screen C9 đã xác minh; không edit-screen.
- Chỉ tích hợp approve/reject và GET phục vụ hiển thị bằng API hiện có; không phát triển API cho mục 5.
- Giữ khung tất cả chức năng đang có trên artifact; chức năng chưa hỗ trợ chỉ hiển thị và toast cuối màn hình. Số liệu thật có nguồn thì hiển thị; GMV/phí/KYC/AI chưa có nguồn dùng trạng thái chưa có dữ liệu, không tự tạo policy hay số mẫu.
- Dùng shell có sẵn; không chỉnh sửa Stitch. Các phát hiện asset/font trong review vẫn được giữ để đối chiếu khi dựng.

### Bước 2 — Page và điều hướng

- Route **đã triển khai**: `/admin/events/review/:id`, ADMIN Guard.
- Thêm page C9 single-file, dùng AdminShell; cập nhật điều kiện `isAdminConsolePage` nhận route chi tiết để không chồng header/footer công khai.
- Điểm tích hợp C11: title/ảnh hoặc “Xem chi tiết” điều hướng theo item.id; không bọc toàn bộ card trong link chứa các nút approve/reject. Chỉ thay điểm chuyển trang khi được triển khai, không thiết kế lại C11.
- Giữ back về hàng đợi và search/category/page bằng URL query hoặc router state; deep link trực tiếp/reload vẫn tải theo param và có back fallback an toàn.
- Sidebar dùng menu “Hàng đợi duyệt sự kiện” hiện có, không thêm menu C9 riêng.

### Bước 3 — Dữ liệu và bố cục

- Lấy detail mới theo UUID từ API organizer có quyền ADMIN, không dùng public slug API cho pending, không dùng dữ liệu card cũ thay detail.
- Lấy category/organizer/identity bằng API đã kiểm; xử lý thiếu dữ liệu từng khối rõ ràng.
- Copy cấu trúc hero + grid 8/4 + A/C/E/G theo artifact trong phạm vi đã được chốt; không thêm B/D/F.
- Giữ giá chính xác bằng BigInt hoặc decimal phù hợp; phân biệt total capacity, issued, sold, projected và paid. Hạng vé archived không đưa vào tổng active.
- Không copy script Tailwind CDN/DOM alert, thông tin cá nhân mẫu hoặc số liệu AI vào React.

### Bước 4 — Quyết định và trạng thái

- Hai CTA approve dùng chung handler và trạng thái busy; reject kiểm trim reason <=2000; xác nhận ý định trước POST.
- Disable khi đang tải/gửi hoặc event không còn pending. Không optimistic success trước response.
- Sau thành công tải lại detail/trạng thái, thể hiện PUBLISHED/REJECTED và làm mới hàng đợi khi quay lại.
- 401 dùng auth flow sẵn có; 403 không có quyền; 404 sự kiện không tồn tại; 400 chỉ rõ trường; 409 reload và yêu cầu kiểm tra trạng thái mới.
- Khi timeout/network không rõ commit, GET lại detail/reviews trước cho gửi lại, tránh ký trùng.
- Loading skeleton; missing cover; empty tickets/reviews; error/retry từng phần; textarea không tự điền lời nhận xét mẫu.
- Các control chưa hỗ trợ dùng chung handler hiện “Chức năng đang được phát triển” tại cuối màn hình; không gửi request hoặc thay đổi dữ liệu. Cơ chế này tách khỏi xử lý approve/reject thật.

### Bước 5 — Kiểm thử và nghiệm thu

- API DB cô lập: detail đúng ID; approve/reject hợp lệ, reason trắng/>2000/sai kiểu; guest/USER/ORGANIZER trái quyền; 404; 409; hai ADMIN đồng thời; snapshot/history/audit; không gửi trùng.
- UI: từ mỗi card tới đúng C9, deep link/reload/back giữ bộ lọc, shared shell chỉ một lần, hai CTA cùng handler, loading/empty/error/success/disabled/network retry.
- Kiểm từng control chưa hỗ trợ bằng chuột và bàn phím: toast đúng nội dung ở cuối viewport, không gọi API/mutation/download, không đổi trạng thái, không xếp chồng khi nhấn lặp. Desktop/mobile không bị toast che nút duyệt; card nâng cao vẫn giữ vị trí/khung Stitch và không hiển thị kết quả giả.
- Data: zero tickets, archived ticket, tên dài, giá lớn, ảnh lỗi, ngày UTC+7, PUBLISHED nhưng chưa tới sale window.
- Viewports 1440/1024/768/390: so với ảnh Stitch, không tràn toàn trang, bảng chỉ cuộn nội bộ nếu cần, CTA không bị cắt.
- Accessibility: heading, alt, textarea label, focus-visible, keyboard, dialog Escape/focus trap/return focus, reduced motion, contrast.
- Đọc scripts thực tế rồi chạy build/lint phù hợp ở phiên code; phiên chỉ tài liệu này không chạy build UI và không tuyên bố UI PASS.
- Tạo report mới, ghi phạm vi sai lệch đã được duyệt và cập nhật C9 trong Master Plan.

## 7. Tiêu chí hoàn thành

Chỉ hoàn thành khi route/điều hướng C9 tồn tại, shell được tái sử dụng, khung giao diện giữ theo Stitch, dữ liệu nghiệp vụ đang hiển thị có nguồn thật, approve/reject hoạt động trên fixture cô lập, trạng thái lỗi/quyền/race được kiểm, desktop/mobile có bằng chứng, TSX+CSS cùng file multi-line và report/Master Plan được cập nhật. Chức năng chưa có API chỉ hiển thị và click → toast “Chức năng đang được phát triển” ở cuối màn hình, không có side effect; không yêu cầu phát triển API nhóm này. **Đã đạt các kiểm tra chức năng trong report triển khai; ĐẠT CÓ ĐIỀU KIỆN**, còn full accessibility/contrast, browser khác Chrome, pixel-diff định lượng, benchmark và static/public rollout.

