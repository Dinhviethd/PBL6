# Feature C11 — Kế hoạch tái hiện hàng đợi thẩm định và phê duyệt sự kiện

## 1. Phạm vi và định danh

- Cập nhật: 2026-11-04 14:20:43 UTC+07 (Asia/Ho_Chi_Minh).
- Đã triển khai frontend tại `/admin/events/review`, component `client/src/pages/admin/C11ApproveEvent.tsx`; dùng backend hiện có, không sửa Stitch. Mutation chỉ kiểm trên PostgreSQL cô lập; local8000 chỉ đọc sự kiện.
- Báo cáo mới nhất: [C11 implementation](../reports/stitch/C11_20261104_140907_implementation.md); [scope trước](../reports/stitch/C11_20261104_140254_scope_update.md); [review/API trước](../reports/stitch/C11_20261104_135521_review_plan.md).
- Nguồn chuẩn: project Stitch `10374042969343935993`, canvas **C11**, screen `5ed99a94ec5d44448ae0703061ef61ae`.
- Tên hiển thị: **Hàng Đợi Thẩm Định & Phê Duyệt Sự Kiện**. Metadata screen vẫn mang tên **C9. Hàng đợi duyệt sự kiện khẩn cấp - Cosmic Ticket Quản Trị Viên**.

**Mâu thuẫn lịch sử:** Master Plan đầu phiên ghi C11 là “Quản lý giao dịch & dòng tiền ký quỹ Escrow”, ID `ede3a107c9da4722827c2fede190646a`, route `/admin/payments`; canvas hiện gắn ID đó nhãn C10. Theo yêu cầu thực hiện plan ApproveEvent và xác nhận phạm vi của người dùng, phiên triển khai dùng **C11 theo canvas** với route `/admin/events/review`. Không đổi mã/trạng thái C9/C10/C6/C8 hoặc giao diện thanh toán; tên metadata C9 và danh mục cũ vẫn được ghi để tránh mất lịch sử. Việc dọn ánh xạ danh mục toàn dự án là công việc riêng, không chặn trang C11 đã xác định.

## 2. Nguồn thiết kế đã kiểm chứng

Đã truy cập project, lấy metadata screen, đọc HTML và xem ảnh trực tiếp qua MCP `download_file`. Không gọi edit/generate/apply design system.

| Nguồn | Định danh / kích thước |
|---|---|
| Screen | `projects/10374042969343935993/screens/5ed99a94ec5d44448ae0703061ef61ae`, DESKTOP 2560×4580 |
| Canvas instance | Nhãn C11, 1280×1991 |
| HTML | `projects/10374042969343935993/files/18155503785190351451`; root 1280×3341, overflow hidden |
| Screenshot | `projects/10374042969343935993/files/18005247407722295538`; ảnh tải thực 1920×2986 |

Kích thước metadata/canvas/HTML/ảnh khác nhau; không coi chúng là cùng một viewport để đánh giá pixel-diff. Ba poster đầu trong ảnh xuất không hiện hình, trong khi HTML có URL ảnh; phải kiểm tra asset trước triển khai, không tự thay poster.

### Quyết định phạm vi đã chốt — 2026-11-04 14:02:54 UTC+07

Theo yêu cầu trực tiếp của người dùng, **loại bỏ khỏi kế hoạch triển khai C11** các chức năng **AI, SLA, hồ sơ pháp lý, Escrow, duyệt hàng loạt và PDF**. Loại bỏ cả nội dung, chỉ số, bộ lọc/tab, nút, badge và luồng phụ thuộc tương ứng; không giữ placeholder, nút disabled hoặc toast “đang phát triển” cho sáu nhóm này. Không lập kế hoạch bổ sung API cho chúng và không coi việc thiếu API của chúng là blocker C11 nữa.

| Nhóm loại bỏ | Thành phần cụ thể không triển khai |
|---|---|
| AI | AI Scrutiny, điểm/rủi ro AI, bộ lọc rủi ro, phân bổ AI, đồng bộ AI, danh sách xanh và cảnh báo do AI |
| SLA | Cam kết 4h, countdown, cấp bách <2h, bộ đếm GẤP, nhãn khẩn cấp và footer cam kết SLA |
| Hồ sơ pháp lý | Giấy phép/VCPMC/PCCC/y tế/hợp đồng, Tier 1/KYC trong vùng thẩm định, tiến độ và tab thẩm định sơ bộ, chờ bổ sung, yêu cầu bổ sung/hỏi thêm hồ sơ, gửi cảnh báo pháp lý, đình chỉ/phong tỏa hồ sơ và cam kết bảo chứng pháp lý |
| Escrow | Ký quỹ, số dư/trạng thái ký quỹ, xác nhận/phong tỏa Escrow, điều kiện mở bán dựa Escrow và nội dung bảo chứng tự động |
| Duyệt hàng loạt | Chọn nhiều để duyệt, duyệt danh sách xanh, batch decision; chỉ giữ phê duyệt/từ chối từng sự kiện |
| PDF | Nút xuất PDF thẩm định và luồng tạo/tải/in PDF thẩm định |

Đây là sai lệch so với artifact Stitch **đã được người dùng cho phép**. Giữ màu/font và cấu trúc card của phần còn lại; thu gọn các khối bị loại. Giữ thông tin sự kiện/BTC cơ bản, loại vé, ngày tiếp nhận, lịch sử quyết định cơ bản và xem chi tiết sự kiện. Dùng header/sidebar chung; chỉ đổi đích liên kết hàng đợi.

### Xác nhận bổ sung trong phiên triển khai

Người dùng đã chọn: **“Bỏ các chi tiết này, giữ danh sách/tìm kiếm/danh mục/chi tiết và duyệt từng sự kiện”** khi được hỏi về người phụ trách, mã `#EVT`, GMV dự kiến, NFC và tab >5.000 vé. Cả năm chi tiết này đã loại khỏi giao diện và điều kiện nghiệm thu; không thêm API cho chúng. Không dùng nhãn LIVE/tự đồng bộ vì trang tải lại dữ liệu qua GET/refresh thủ công.

### Kết quả triển khai đã xác minh

- Route ADMIN `/admin/events/review`, sidebar riêng và public shell được ẩn đúng; header/sidebar dùng lại `AdminShell`.
- Card có ảnh thật hoặc fallback rõ ràng, BTC, thể loại, thời gian UTC+7, submitted_at, capacity/hạng vé từ detail; search/category và phân trang 6/trang dùng API toàn tập.
- Modal Radix tải lại chi tiết trước quyết định, giữ focus và Escape, hiển thị mô tả/ticketTypes/reviews; approve xác nhận, reject bắt buộc lý do <=2.000 ký tự; khóa gửi hai lần và yêu cầu kiểm lại trạng thái sau lỗi mạng/409.
- Loading/empty/error/retry/success, hủy request cũ khi đổi bộ lọc/trang, xử lý một phần detail/BTC không tải được; không có mock trong ứng dụng.
- Server/client build và eslint tệp thay đổi PASS; PostgreSQL cô lập 23 checkpoint API và Chrome 11 nhóm kiểm tra PASS, 1440/1024/768/390 không tràn ngang. Local5173/API8000 smoke đọc thật PASS (1 pending, detail và 1440/390, không POST review).
- [Bằng chứng API](../reports/stitch/evidence/C11_20261104_140907/api-results.json), [browser](../reports/stitch/evidence/C11_20261104_140907/browser-results.json), [local smoke](../reports/stitch/evidence/C11_20261104_140907/local-smoke.json).

### Bố cục triển khai sau khi giảm phạm vi

1. Dùng lại `AdminShell` gồm `AdminHeader` và `AdminSidebar`; không sao chép thêm shell của HTML Stitch.
2. Breadcrumb, tiêu đề và mô tả hàng đợi duyệt sự kiện; bỏ nội dung SLA/AI/pháp lý/Escrow và nhóm nút AI/PDF/duyệt danh sách xanh.
3. Hàng đợi tất cả, tìm kiếm, thể loại và refresh; bỏ tab quy mô >5.000 cùng tab SLA/chờ bổ sung/thẩm định sơ bộ và bộ lọc rủi ro.
4. Card giữ poster, tên/BTC/địa điểm/thời gian, loại vé, thời điểm tiếp nhận và vùng hành động từng sự kiện. Bỏ mã #EVT, người phụ trách, GMV dự kiến, NFC và toàn bộ badge/khối SLA, AI, hồ sơ pháp lý, Escrow.
5. Giữ xem chi tiết, phê duyệt hoặc từ chối từng sự kiện với lý do; bỏ biến thể cảnh báo AI/pháp lý/khẩn cấp. Không gắn từ chối với đình chỉ BTC hay phong tỏa hồ sơ.
6. Bỏ footer cam kết SLA/pháp lý/Escrow và phần liên hệ mẫu của artifact; dùng thành phần tài khoản/header chung.

### Cosmic Graffiti

Project xác nhận DARK, tím `#7C3AED`, cyan `#22D3EE`, hồng `#F472B6`; Syne / Be Vietnam Pro / Space Grotesk. HTML dùng palette sinh từ design system: nền `#0F1222`, surface thấp `#181B2A`, chữ `#E0E1F7`, tím nhạt `#D2BBFF`, cyan `#5DE6FF`, primary-container `#7C3AED`. Các giá trị này khác palette cơ sở trong skill (`#080B1A`, `#10162B`, `#F8FAFC`) nhưng có trong namedColors của project, không tự đổi về token cơ sở. Shell code hiện dùng cùng nhóm màu này và sidebar 288px/header 80px.

HTML có font/token đúng hệ thống, nhưng bo góc DEFAULT 4px, lg 8px, xl 12px không hoàn toàn trùng quy ước card 16px trong designMd. Giữ artifact hiện tại và ghi sai lệch; không tự thiết kế lại. Responsive/a11y chưa thể kết luận từ ảnh desktop, nhất là root HTML khóa kích thước/ẩn overflow và sidebar cố định.

## 3. Phát hiện trước triển khai (lịch sử review)

Các vấn đề dưới đây được ghi ở phiên khảo sát. Trang/route/sidebar/luồng quyết định và UI states đã xử lý trong phiên triển khai; các chi tiết chưa có API được loại theo xác nhận ở mục 2. Không dùng bảng lịch sử này để kết luận trạng thái hiện tại.

| Mức | Phát hiện có bằng chứng | Hướng xử lý dự kiến |
|---|---|---|
| P0 | C11 chưa có component/route riêng; Master Plan và canvas khác định danh | Chốt ánh xạ C11 trước triển khai, giữ lịch sử ID cũ |
| P0 | `AdminSidebar.tsx`: “Toàn bộ sự kiện” và “Hàng đợi duyệt sự kiện” cùng `/admin/events` | Route đề xuất `/admin/events/review`, guard ADMIN; chỉ thay liên kết hàng đợi trong phiên triển khai được giao |
| P0 | `Admin.tsx` return `C8TotalEvent` khi tab events; form review trong `AdminData` nhánh events không còn được đi tới | Tạo trang duyệt chuyên biệt dùng API review, không dựa vào form cũ |
| P0 | `C8TotalEvent.tsx` là bảng toàn bộ sự kiện, chỉ có link xem/sửa, thiếu card thẩm định và approve/reject | Tái hiện vùng nội dung C11 theo artifact, dùng lại shell |
| Ngoài phạm vi | Thiếu nguồn AI/SLA/pháp lý/Escrow, duyệt hàng loạt và PDF | Đã loại bỏ theo quyết định 14:02:54; không còn là blocker hay hạng mục phải bổ sung API |
| P1 | LARGE của API là >3.000, tab Stitch là >5.000 vé | Không map LARGE thành >5.000; cần contract ngưỡng chính xác |
| P1 | List không trả submitted_at, reviews, ticketTypes; detail có các trường này | Ghép detail khi cần; cân nhắc DTO/batch riêng nếu cần cho mọi card, tránh N+1 |
| P1 | GMV API metrics là doanh thu PAID, không phải “Dự kiến GMV” | Cần chốt công thức dự kiến; không đổi nhãn dữ liệu PAID thành dự kiến |
| P1 | `created_at` không phải ngày tiếp nhận; UUID/slug không phải mã #EVT | Dùng submitted_at từ detail; mã hồ sơ cần contract riêng nếu giữ nguyên thiết kế |
| P1 | Chưa có bằng chứng UI loading/empty/error, modal quyết định, mobile và bàn phím cho C11 | Kiểm thử ở phiên triển khai; không kế thừa PASS của C8/C6 |

## 4. API hiện có và kết quả gọi thực tế

Các kết quả dưới đây thuộc phiên review 13:55:21; phiên cập nhật phạm vi 14:02:54 không gọi lại API. Môi trường: `http://localhost:8000/api`, ADMIN seed đăng nhập bằng cấu hình local (không ghi mật khẩu/token). Envelope thành công `{success:true,data:...}`. Không reset/seed DB, không phê duyệt/từ chối sự kiện thật. Cổng 8011 không kết nối được; chỉ xác nhận runtime 8000, không xác nhận môi trường public.

| API và dữ liệu gửi | Kết quả phiên này | Khả năng dùng |
|---|---|---|
| GET `/health` | 200, `data.status=ok` | Health |
| POST `/auth/login` với tài khoản admin seed | 200, có accessToken | Xác thực các request sau |
| GET `/admin/events?page=0&limit=10` | 200; total 22, totalPages 3 | Metadata list + phân trang từ 0 |
| GET `/admin/events?page=1&limit=10` | 200; page 1, total 22 | Trang tiếp |
| GET `/admin/events?status=PENDING_REVIEW&page=0&limit=10` | 200; 1 item, status đúng | Hàng đợi cơ bản |
| GET list với q bằng title thật | 200; 1 kết quả đúng title | Search; phải URL encode |
| GET list với q=`__C11_NO_MATCH_20261104__` | 200; items rỗng, total/totalPages 0 | Empty |
| GET list kết hợp pending/category/city/date/page/limit | 200; 1 item đúng city và pending sau sửa encoding | Bộ lọc kết hợp |
| GET `/admin/events?ticketScale=LARGE` | 200; total 0 | Chỉ xác nhận request chạy; chưa có fixture >3.000 để kiểm biên |
| GET `/admin/events/kpis` | 200; total 22, selling 11, pending_review 1, paused_or_cancelled 3 (chuỗi) | KPI C8; không đủ KPI SLA C11 |
| GET `/admin/events/filter-options` | 200; 6 categories, cities, 3 ticketScales | Danh mục thật; city có nhiều cách viết |
| GET `/admin/events/metrics?eventIds=<10 UUID thật từ list>` | 200; trả capacity/issued/sold/gmv/revenue/checkins/checkinRate | Metrics C8, không phải AI/Escrow/GMV dự kiến |
| GET `/admin/organizers/summaries?ids=<UUID BTC loại trùng>` | 200; 2 rows, id/organization_name/contact_name/account_name | Tên BTC, không chứng minh Tier 1/KYC |
| GET `/organizer/events/102d3e8b-55f4-43e0-8256-1f1bb15d05f1` | 200 ADMIN; PUBLISHED, submitted_at, ticketTypes, metadata | Detail cơ bản |
| GET `/organizer/events/1c403640-c361-43ff-96c8-1cbcaaaf67ea` | 200 ADMIN; PENDING_REVIEW, submitted_at `2026-10-28T03:59:28.431Z`, 1 ticket type, reviews | Detail hàng đợi; lịch sử review cơ bản đã có |
| POST `/admin/events/102d3e8b-55f4-43e0-8256-1f1bb15d05f1/review` body `{approve:false,reason:""}` | 400 VALIDATION, “Cần nhập lý do từ chối.” | Chỉ kiểm validation, không ghi sự kiện |
| GET list status=APPROVED / page=-1 | 400 VALIDATION | APPROVED không phải event status hợp lệ |
| GET `/admin/events` không token | 401 UNAUTHORIZED | Guest bị chặn |

Request bộ lọc kết hợp đúng: `status=PENDING_REVIEW`, `categoryId=bc3898c2-3eee-4826-9ca1-0175bc2da657`, `cityCode=đà nẵng`, `startsFrom=2026-10-01T00:00:00+07:00`, `startsTo=2026-12-01T00:00:00+07:00`, `page=0`, `limit=10`. Gửi bằng URLSearchParams để dấu `+` thành `%2B`. Lần đầu script PowerShell→Node làm city thành dấu `?`, trả 200/rỗng; đã gọi lại bằng Unicode escape đúng và xác nhận total 1. Không coi lần đầu là lỗi backend.

Contract source: `server/src/app.ts` schema/filter/routes → `modules/event/public.ts` → `modules/event/infrastructure/store.ts`; review đi qua `workflows/booking.ts` kiểm ADMIN, khóa/guard event, chỉ nhận PENDING_REVIEW, lưu event_reviews và audit. `{approve:true,reason:""}` đổi event sang **PUBLISHED**; `{approve:false,reason:"Lý do cụ thể"}` đổi sang **REJECTED**. APPROVED là decision trong event_reviews, không phải trạng thái để lọc event. Hai payload hợp lệ này mới xác minh source, **chưa gọi nhánh thành công** trong phiên.

## 5. Chức năng trên Stitch chưa được API hỗ trợ đầy đủ

Bảng sau giữ kết quả khảo sát artifact ban đầu, **không phải danh sách phải triển khai**. Sáu nhóm cùng người phụ trách, mã #EVT, GMV dự kiến, NFC, tab >5.000 và nhãn LIVE mang trạng thái `OUT_OF_SCOPE` theo mục 2; không cần API và không chặn nghiệm thu. Lịch sử reviews cơ bản và ngày tiếp nhận vẫn được hỗ trợ bằng detail API hiện có.

| Chức năng | Khoảng thiếu / phân biệt với API đã có |
|---|---|
| SLA 4h, thời gian còn lại, queue <2h, bộ đếm 6 GẤP | Có submitted_at ở detail nhưng chưa có policy deadline/SLA/priority và aggregate; không tự suy ra cam kết từ thời gian |
| AI Scrutiny score/risk, thời điểm sync, phân bổ AI, danh sách xanh | Chưa tìm thấy service/route/contract tương ứng |
| Người phụ trách hiện tại, tiến độ 95%, thẩm định sơ bộ | reviews lưu người đã ra quyết định, không phải assignment đang xử lý hay tiến độ |
| Giấy phép Sở VHTT, PCCC/y tế, VCPMC, hợp đồng địa điểm/diễn giả/nghệ sĩ | Detail event chỉ có mô tả và review cơ bản; chưa có kho hồ sơ/trạng thái thẩm tra theo tài liệu |
| Escrow đã ký quỹ/giữ/phong tỏa, bảo chứng tự động | Thanh toán/SePay không tương đương quản lý ký quỹ; chưa có contract cho UI này |
| Tier 1 Verified/KYC của BTC | Organizer summary không có trường xác minh này |
| Hỏi thêm, yêu cầu bổ sung VCPMC, chờ bổ sung | Không có request/response và workflow trạng thái bổ sung |
| Duyệt nhanh danh sách xanh | POST review chỉ xử lý một ID; chưa có batch, điều kiện danh sách xanh và kết quả từng item |
| Đình chỉ & từ chối mở bán | Reject PENDING_REVIEW chỉ từ chối event; không đồng nghĩa đình chỉ BTC/phong tỏa hồ sơ |
| Gửi cảnh báo pháp lý | Chưa có endpoint gửi cảnh báo theo hồ sơ này |
| PDF thẩm định | Chưa có tài liệu thẩm định đầy đủ/API export; không coi window.print là hồ sơ thẩm định được xác thực |
| Mã #EVT, GMV dự kiến, nhãn NFC | Chưa có contract tương ứng; ticketTypes có giá/capacity nhưng công thức dự kiến chưa được chốt |
| Tab >5.000 và lọc risk/chờ bổ sung/sơ bộ | Filter hiện có không hỗ trợ đúng ngữ nghĩa; không lọc trên riêng trang đã phân trang rồi coi là toàn bộ |
| Live queue / tự đồng bộ AI | Chưa có feed realtime AI; refresh GET chỉ là tải lại |

Quyết định loại bỏ sáu nhóm và năm chi tiết bổ sung tại mục 2 là yêu cầu riêng cho C11 đã được chốt, không kế thừa từ C6. Phần còn trong phạm vi đã có API và đã tích hợp; các khoảng thiếu trong bảng lịch sử không còn là blocker. Không dùng toast/disabled để giữ lại các nhóm đã loại.

## 6. Kế hoạch thực hiện và đối chiếu kết quả

Phạm vi đã chốt và các bước triển khai dưới đây đã thực hiện. Ngoại lệ: không xây API cho chi tiết đã loại; kiểm mutation trên DB riêng, không chạy POST review dữ liệu local8000. Chi tiết kết quả, giới hạn và nhật ký tệp nằm trong report triển khai.

1. **Chốt định danh và phần còn lại:** dùng C11 canvas và `/admin/events/review`; người dùng đã xác nhận bỏ người phụ trách/mã/GMV/NFC/ngưỡng quy mô cùng sáu nhóm ban đầu. Không cần API mới.
2. **Xác minh lại nguồn:** lấy HTML/ảnh C11 ở thời điểm triển khai, kiểm poster và kích thước, lập mapping từng vùng. Giữ header/sidebar dùng chung theo yêu cầu; không gọi edit-screen.
3. **Định tuyến:** đã tạo `C11ApproveEvent.tsx` tại `/admin/events/review`, ADMIN guard và console shell; sidebar hàng đợi trỏ đúng route. C8/C6 giữ nguyên nội dung.
4. **Tổ chức tệp:** JSX/TSX và CSS cùng một file, CSS scoped `.c11-*` trong template literal với `<style>{styles}</style>`. Multi-line formatting cho imports, types, hooks, JSX props, từng CSS selector và declaration; không thêm file CSS riêng, không chép CDN/script Tailwind của HTML vào app.
5. **Dữ liệu:** dùng Axios client/session hiện có; pending list + pagination, options, organizer summaries theo UUID loại trùng; detail có ticketTypes/reviews/submitted_at. Ghép theo ID, tối đa 6 detail/trang; C11 không cần gọi metrics/KPI C8. Dữ liệu thiếu được báo rõ, không thay bằng số mẫu.
6. **Quyết định duyệt:** xác nhận event ID/title trước POST; từ chối bắt buộc lý do, khóa nút khi gửi; thành công reload list/KPI/detail. Lỗi trạng thái do người khác duyệt thì reload; lỗi mạng không tự báo thành công hoặc tự retry mutation mù.
7. **Trạng thái UI:** đã có loading/empty/error/retry/success; báo lỗi nguồn phụ; disabled khi đang gửi, cần kiểm lại hoặc event không pending. Loại hẳn toàn bộ nhóm đã xác nhận ở mục 2.
8. **Kiểm thử:** dùng DB/fixture cô lập cho approve/reject, race 2 ADMIN, sai quyền/ID, quá hạn phiên; không duyệt record thật để chứng minh. Test UI 1440/1024/768/390, keyboard/focus/modal, không tràn ngang toàn trang; so sánh Stitch đúng scale. Chạy build/lint phù hợp ở phiên code.
9. **Báo cáo:** mỗi phiên thay đổi phải có report mới và cập nhật mục C11 trong Master Plan; ghi kết quả thực tế, tồn tại, thời gian và link. Không sửa report cũ để che lịch sử.

## 7. Điều kiện nghiệm thu và trạng thái hiện tại

- Định danh C11 không còn mơ hồ; route và active sidebar đúng, dùng lại shell.
- Nội dung còn trong phạm vi tái hiện theo Stitch; ghi rõ khác biệt shell và sáu nhóm đã loại theo yêu cầu; không tự đổi palette hoặc thiết kế phần còn lại.
- Không còn UI, nhãn, tab, chỉ số, nút hoặc request API cho AI/SLA/hồ sơ pháp lý/Escrow/duyệt hàng loạt/PDF trong C11; luồng approve/reject chỉ xử lý từng sự kiện.
- Mỗi dữ liệu/hành động có API đã xác minh hoặc phạm vi xử lý thiếu API được chốt rõ, không mock.
- Approve/reject hợp lệ chạy trên fixture cô lập, reload đúng, không duplicate/race; kiểm quyền ADMIN.
- Filter/phân trang đúng toàn tập; tab >5.000 đã loại, không dùng ngưỡng >3.000 để giả lập.
- UI states/responsive/a11y và đối chiếu hình ảnh có bằng chứng kiểm thử.
- Report mới/Master Plan cập nhật, kiểm git không có thay đổi ngoài phạm vi.

**Hiện tại (14:20:43): ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN** theo phạm vi đã giảm. API mutation/quyền/race đã kiểm trên DB cô lập; Chrome và source build/lint PASS, local5173 đọc thật PASS. Stitch giữ nguyên. Chưa kiểm a11y đầy đủ/screen reader/contrast, browser khác, benchmark N+1 và pixel-diff định lượng; chưa rollout bundle vào container static8000/public hoặc mutation sự kiện dùng chung. Đây là các giới hạn nghiệm thu, không phải API bị thiếu cho chức năng đã loại.
