# Feature B11 — Hồ sơ Ban Tổ Chức

Ngày lập: **2026-10-31 15:31:55 UTC+7**. Trạng thái mới nhất: **ĐÃ ÁP DỤNG HAI CỘT LÊN SUPABASE VÀ TRIỂN KHAI B11 RUNTIME, ĐẠT CÓ ĐIỀU KIỆN**. Dùng organizer_applications/event_checkin_staff, không bảng mới. Lịch sử giữ bên dưới; kết quả thực tế xem mục11 và [report rollout](../reports/stitch/B11_20261031_170011_runtime_rollout.md).

Phiên review ban đầu chỉ rà soát và viết tài liệu, được ghi trong [report review B11](../reports/stitch/B11_20261031_153155_review_plan.md). Sau đó người dùng đã yêu cầu thực hiện plan; mọi thay đổi source/test/DB tạm và kết quả triển khai được ghi trong [report triển khai B11](../reports/stitch/B11_20261031_155318_implementation_preflight.md) và mục9 bên dưới. Stitch giữ nguyên.

## 1. Nguồn và phạm vi

- Đã đọc `docs/PROJECT_MASTER_PLAN.md` trước khi gọi Stitch. Mục 5.2 ghi B11 “Hồ sơ Ban Tổ Chức”, “Trong Profile/Organizer”, “Có code một phần”; chưa có dòng review B11 ở 5.4. Master Plan chưa mô tả contract chi tiết B11, vì vậy các chức năng dưới đây được phân biệt giữa yêu cầu dự án, nội dung artifact và đề xuất.
- Project chính thức: `10374042969343935993` — EventHub; screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`.
- Title metadata: `B11. Hồ sơ Ban Tổ Chức - Cosmic Ticket Ban Tổ Chức`; DESKTOP **2560 × 4436**.
- HTML: `projects/10374042969343935993/files/12524529387351101265`; ảnh JPEG: `projects/10374042969343935993/files/6887434625983419854`. Đã đọc HTML và xem ảnh qua `download_file`; không gọi `edit_screens` hoặc tạo bản sao màn hình.
- Nguồn code: `client/src/App.tsx`, `pages/account/Profile.tsx`, `pages/organizer/OrganizerSidebar.tsx`, `organizer-sidebar.css`; `server/src/app.ts`, `modules/auth/public.ts`, `modules/auth/infrastructure/store.ts`, `modules/event/public.ts`, `workflows/booking.ts`, `platform/media.ts`.

Mục tiêu phiên triển khai tương lai: tái hiện B11 hiện có, dùng lại sidebar chung, nối API thật sau khi xác minh. Các đề xuất API trong tài liệu **chưa tồn tại**, chưa được triển khai và không phải cam kết đã hoàn thành.

## 2. Cấu trúc phải sao chép từ Stitch

1. Sidebar chung rộng 16rem, menu Hồ sơ BTC active. Header cao 4rem: breadcrumb EventHub / Ban Tổ Chức, tìm kiếm, Tạo sự kiện, thông báo và tài khoản.
2. Banner đầu trang: badge xác minh, tiêu đề, mô tả, Xem trang công khai của BTC và Lưu thay đổi.
3. Nội dung desktop lưới 12 cột: trái 4 cột, phải 8 cột; khoảng cách chính 24px. Cột trái gồm logo có nút camera, mã/tên BTC, pháp nhân, đại diện/liên hệ, hai KPI và điều hướng nội trang.
4. Cột phải: thông tin pháp nhân/thương hiệu; đội ngũ; bảo mật/đổi mật khẩu. Cuối trang có dock Hủy thay đổi / Lưu tất cả thiết lập; toast chỉ được hiển thị sau kết quả lưu thực tế.
5. Giữ thứ tự trường, nhịp khoảng cách, icon, gradient, vùng chứa theo HTML. Không chép CDN Tailwind, inline script hay listener DOM vào React.

**Phân biệt nội dung đang có với phần đã bỏ:** HTML chỉ còn comment cho phần ngân hàng/escrow và banner 2FA, không có form ngân hàng hoặc công tắc 2FA. Điều hướng vẫn ghi “Bảo mật 2FA & Mật khẩu”, mô tả còn nhắc đối soát. Không tự bổ sung form ngân hàng/2FA trong lần tái hiện này. Ảnh và HTML có chênh lệch: HTML có ba liên kết điều hướng nội trang và tiêu đề mục 2/3; ảnh xuất không hiển thị đầy đủ chúng. Cần đối chiếu khi render, chưa kết luận lỗi browser hoặc tự xóa phần HTML.

## 3. Đối chiếu Cosmic Graffiti

| Thành phần | Artifact thực tế | So với quy chuẩn |
|---|---|---|
| Nền | `#0f1222`, card `#181b2a`, input `#0a0d1c` | Khác mô tả `#080B1A` / `#10162B`; khớp namedColors của project hiện tại |
| Nhấn | primary-container `#7c3aed`, primary `#d2bbff`, cyan `#5de6ff`, pink `#ffafd3` | Tím brand đúng; cyan/pink khác `#22D3EE` / `#F472B6` |
| Chữ | `#e0e1f7`, `#ccc3d8`, muted `#958da1` | Khác mô tả `#F8FAFC` / `#94A3B8` |
| Font | Syne / Be Vietnam Pro / Space Grotesk | Đúng hệ font dự án |
| Bo góc | default 4px, lg 8px, xl 12px | Khác quy ước mô tả 8px nền tảng/card 16px |
| Sidebar hiện có | Dùng palette gần như artifact, EventHub | Tái sử dụng theo yêu cầu; không dựng sidebar B11 riêng |

Project `designMd` chứa cả YAML namedColors và phần mô tả màu không hoàn toàn đồng nhất. Đây là sai lệch nguồn thiết kế, không phải lý do tự đổi màu. Ưu tiên sao chép artifact đã xác minh; thay đổi thiết kế ngoài việc dùng sidebar chung phải được duyệt ở phiên sau.

## 4. Các điểm chưa đạt của project hiện tại

| Mức | Phát hiện đã xác minh | Tác động |
|---|---|---|
| Chặn | Chưa có route/page B11 riêng; menu Hồ sơ BTC đang render `span`, không có entry trong `routes` | Không vào được B11 từ sidebar |
| Chặn | `Profile.tsx` là A10: tên/điện thoại/avatar cá nhân và mật khẩu, không có hồ sơ pháp nhân/team B11 | Không thể coi A10 là B11 hoàn chỉnh |
| Chặn | Không có API cập nhật hồ sơ tổ chức sau duyệt | Không lưu được các trường pháp nhân/bio/website/logo tổ chức |
| Chặn | Team hiện tại thuộc từng event; thiết kế mô tả Owner, Gate Lead, Finance và quyền override/giải ngân | Không được gán ý nghĩa quyền tổ chức cho API check-in staff |
| Chặn | CTA trang BTC công khai chưa có route/API riêng; publicOrganizer hiện chỉ trả name/avatar trong chi tiết event | Link công khai chưa thực hiện được |
| Cao | Verified Tier 1, bảo chứng pháp lý 2025, mã BTC, chức danh đại diện và trạng thái hiện trường là dữ liệu mẫu | Không có nguồn xác thực; APPROVED không đồng nghĩa KYC/Tier 1 |
| Cao | KPI 12 sự kiện / 42.500+ vé hard-code; chưa có aggregate BTC đúng ý nghĩa “đã mở bán” / “lượt vé phục vụ” | Không dùng số mẫu hoặc cộng một trang dữ liệu làm tổng |
| Cao | `PATCH /me` bỏ qua field lạ và xóa phone/avatar khi bỏ khỏi payload | HTTP 200 không chứng minh lưu pháp nhân; có nguy cơ mất thông tin cá nhân |
| Cao | HTML lưu chỉ hiện toast; thêm nhân sự chỉ `alert`; liên kết `#` và không có xử lý hủy | Chưa có nghiệp vụ thật hoặc trạng thái lỗi/đang lưu |
| Vừa | Bio UI ghi 500 ký tự nhưng application API cho 4000; contactName không chứng minh người đại diện pháp luật | Phải chốt ngữ nghĩa/validation, không tự đổi tên dữ liệu |
| Vừa | Label không nối `for/id`; password có giá trị mẫu; sidebar fixed và `pl-64` không có cơ chế thu gọn mobile | Accessibility/responsive chưa nghiệm thu |
| Vừa | Metadata còn Cosmic Ticket, badge BTC bị xuống dòng trong ảnh; sidebar không active Hồ sơ BTC | Giữ sidebar chung đã được yêu cầu; các correction khác ghi nhận để duyệt |

## 5. Ánh xạ dữ liệu hiện có

Tất cả đường dẫn API dưới đây có tiền tố `/api`, response thành công theo `{success:true,data:...}`.

| Trường/chức năng B11 | Nguồn hiện có | Giới hạn và cách dùng đúng |
|---|---|---|
| Người dùng đang đăng nhập/header | `GET /auth/me` | name/email/phone/avatarUrl/roles/createdAt; không phải pháp nhân |
| Tên thương hiệu, tên doanh nghiệp | `GET /me/organizer-applications?page=0` → organization_name/business_name | Snapshot hồ sơ nộp; lọc APPROVED, duyệt hết trang nếu cần, không mặc định bản đầu là bản được duyệt |
| Thuế/ĐKKD, trụ sở, bio, website | tax_id_or_business_license/head_office_address/description/website_or_social | Có để đọc từ application, không có API sửa B11 |
| Hotline/email/người liên hệ | contact_phone/contact_email/contact_name | Không đồng nhất với account phone/email hay đại diện pháp luật |
| Người đại diện pháp luật/chức danh/mã tổ chức | Không có field chuyên biệt | Cần contract mới; không dùng UUID application làm mã thương hiệu |
| Logo BTC | Upload `/media` có; nơi lưu logo tổ chức chưa có | `/me.avatarUrl` là avatar cá nhân, không mặc định dùng chung logo |
| Trạng thái duyệt | application.status/reviewed_at/rejection_reason | Chỉ phản ánh duyệt hồ sơ; không chứng nhận pháp lý/Tier |
| KPI | `/organizer/events/status-counts`, `/organizer/events`, `/:id/stats` | Có số theo trạng thái/event; thiếu tổng nghiệp vụ cấp BTC nhất quán |
| Team | GET/POST `/organizer/events/:id/staff`, DELETE `/:staffId` | Cần eventId; chỉ check-in, mời tài khoản có sẵn, PENDING/ACTIVE/REVOKED... không phải online/offline |
| Mật khẩu | `POST /me/password` | currentPassword/newPassword; xác nhận ở frontend; thành công thu hồi mọi phiên |
| Chuông thông báo | `GET /me/notifications?page=0`, `/count` | API inbox có sẵn; không hard-code chấm chưa đọc |
| Tạo sự kiện/anchor/hủy nháp | Route `/organizer/new`; state frontend | Không cần API mới cho điều hướng và hủy chỉnh sửa chưa lưu |
| Tìm vé/đơn/khách toàn cục | Chưa có API tìm kiếm tổng hợp không cần event | Không giả tìm kiếm bằng toast; cần định nghĩa phạm vi trước |

### Contract và kết quả thử thực tế

Đã chạy **37 lượt HTTP có assertion** trên source TypeScript qua `ts-node`, PostgreSQL17 riêng `eventhub_b11_test`, loopback `127.0.0.1:55441`, API cổng động. Không mock backend. Tài khoản, hồ sơ duyệt, sự kiện DRAFT và nhân sự đều là fixture tự tạo ở DB này. DB/container thử đã dừng; không sửa dữ liệu Supabase, không gửi email hoặc giao dịch thanh toán. Chi tiết từng lượt nằm trong report.

```json
// PATCH /api/me — hồ sơ CÁ NHÂN; phải gửi lại giá trị muốn giữ
{
  "name": "B11 Updated",
  "phone": "0900000022",
  "avatarUrl": "https://example.test/b11-logo.png"
}
```

PATCH 200 và GET đọc lại đúng. `name` bắt buộc, tối đa 150; phone optional tối đa 30; avatarUrl optional URL http(s) hoặc `/uploads/<uuid>.webp`. `avatarUrl:null` và thiếu name trả **400 VALIDATION**. Chỉ gửi name trả **200 nhưng phone/avatarUrl thành null**. Gửi thêm businessName/email trả 200 nhưng chúng bị schema loại bỏ: email và hồ sơ pháp nhân không đổi. Đây là bằng chứng API này không thay thế API B11.

`POST /media`: multipart field **image**, một ảnh tối đa 5MB; thử PNG thật 4×4 → **200**, nhận `/uploads/<uuid>.webp`, lưu qua PATCH thành công. Chưa thử Cloudinary production, giới hạn file lớn hoặc ảnh hỏng ở phiên này.

`POST /me/password`: gửi currentPassword/newPassword, không gửi confirmPassword. Mật khẩu mới 8–72 ký tự và không quá 72 byte UTF-8; sai hiện tại **400 INVALID_PASSWORD**, mật khẩu ngắn **400 VALIDATION**, đúng **200/data:null**, token cũ **401 INVALID_SESSION**. Đăng nhập qua service bằng mật khẩu mới và GET profile bằng phiên mới **200**. B11 không được tiếp tục gọi lưu pháp nhân bằng token cũ sau bước đổi mật khẩu.

`GET /me/organizer-applications?page=0`: **200**, array snake_case, 50 bản ghi/trang, page bắt đầu 0. Đã thử empty → POST đúng 11 trường → admin duyệt → GET APPROVED khớp dữ liệu. Organizer gọi lại POST trả **409 ALREADY_ORGANIZER**; endpoint này là đăng ký A5, không phải cập nhật B11.

POST staff `{ "email": "<email tài khoản fixture>" }` → **200/PENDING**, GET thấy đúng email, DELETE bằng **id bản ghi staff** → **200/REVOKED**, GET đọc lại đúng. Email sai định dạng **400**, chưa đăng ký **400 INVALID_INVITEE**, Organizer khác đọc event **403**, guest **401**. Chưa thử nhận lời mời/scan trong phiên B11.

GET list event/status-counts/stats/notifications/count đều **200**; fixture chỉ có event DRAFT, chưa bán vé, stats `orders/revenue/sold/checkins = "0"`. Kết quả này không xác nhận aggregate BTC với vé bán thật.

Runtime đang dùng `localhost:8000`: health **200**, auth/me và organizer-applications không token **401**. Chưa xác minh authenticated runtime hoặc equivalence source với image Docker; không dùng 401 để kết luận dữ liệu nghiệp vụ live đã PASS.

## 6. API còn thiếu tại thời điểm review và tính khả thi

Các route sau là **đề xuất tại phiên review ban đầu**. Trạng thái triển khai mới nhất nằm tại mục9; bảng này giữ căn cứ lập kế hoạch. Ước lượng tương đối, chưa phải lịch cam kết.

| Chức năng | Đề xuất | Khả thi / phụ thuộc |
|---|---|---|
| Đọc/lưu hồ sơ BTC hiện hành | GET/PATCH `/organizer/profile` | Cao, độ phức tạp vừa. Auth sở hữu bảng organizer_profiles mới; khởi tạo từ application APPROVED, giữ lịch sử application bất biến; có organizationName/businessName/taxIdOrBusinessLicense/legalRepresentativeName/contactName/contactEmail/contactPhone/headOfficeAddress/description/websiteOrSocial/logoUrl/version |
| Thay đổi thông tin pháp lý | Request thay đổi + trạng thái xét duyệt | Vừa. Phân biệt phần công khai có thể sửa và pháp lý cần tái duyệt; audit trước/sau, không tự giữ badge verified sau đổi pháp nhân; workflow admin là phần việc tương lai ngoài phiên này |
| Logo BTC | `/media` hiện có + PATCH organizer/profile.logoUrl | Cao sau khi có profile. Không ghi đè avatar người dùng; cần ownership tài nguyên, dọn ảnh không dùng và xử lý upload thành công/lưu thất bại |
| Trang BTC công khai | GET `/organizers/:slug`, route UI riêng tương ứng | Cao, độ phức tạp vừa. Whitelist trường public, slug duy nhất, chỉ lộ hồ sơ được phép; không trả thuế, địa chỉ riêng, email nhân sự hay quyền nội bộ |
| Hai KPI toàn BTC | GET `/organizer/profile/stats` | Cao, vừa. Event/Order cung cấp aggregate qua public interface/workflow, không query chéo ownership. Chốt event từng mở bán hay đang PUBLISHED, ticket issued/paid/used và xử lý VOID/cancelled; zero/large data/pagination/timezone phải thử |
| Team cấp tổ chức | GET/POST `/organizer/team`, PATCH/DELETE `/:memberId` | Vừa–cao về công sức. Cần membership, invitation, role scopes, chủ sở hữu không thể mất quyền cuối cùng, audit; không chỉ thêm cột role vào event staff |
| Gate Lead / Finance / override / giải ngân | Policy + endpoint nghiệp vụ cho từng quyền | Phức tạp cao; backend hiện chưa có đủ nghiệp vụ tương ứng. Chỉ hiển thị role không tạo ra quyền thật; cần kiểm tra quyền tại mọi API, không map toàn bộ thành ORGANIZER |
| Online/ngoại tuyến/tại hiện trường | Presence/heartbeat gắn event/session | Vừa, yêu cầu TTL và nguồn tín hiệu; trạng thái invitation không thay thế presence |
| KYC / Verified Tier / bảo chứng pháp lý | Verification record + quy trình kiểm chứng | Kỹ thuật khả thi nhưng phụ thuộc nghiệp vụ/chứng cứ. Không tự sinh chứng nhận từ emailVerified hoặc APPROVED |
| Tìm kiếm toàn cục | GET `/organizer/search?q=...` | Vừa; phân quyền theo chủ event, giới hạn dữ liệu khách, pagination và index; tránh N+1 trên toàn bộ sự kiện |
| Lưu tất cả | Điều phối lưu theo nhóm, version/409 conflict; hoặc endpoint settings tổng hợp nếu có yêu cầu atomic | Vừa. Profile/team/password có side effect khác nhau; không Promise.all rồi báo thành công toàn bộ. Mật khẩu thực hiện cuối, hiển thị rõ phần đã lưu khi phần khác lỗi |
| 2FA | Chưa lập route triển khai trong phạm vi bản hiện tại | HTML còn nhãn nhưng không có control. Nếu yêu cầu mở rộng: setup/verify/recovery/disable, challenge login, rate limit và mã hóa secret; công sức cao |

Hợp đồng đề xuất profile: Bearer token, chủ thể lấy từ session, không nhận ownerId để ghi cho người khác; phân biệt omitted/null; kiểm tra URL, độ dài và version. Lỗi cần có 400 validation, 401 session, 403 quyền, 404 chưa có profile và 409 conflict. Không dùng PATCH application cũ để ghi đè chứng cứ đã xét duyệt. Giới hạn bio 500/4000 phải được chốt và xử lý dữ liệu cũ không mất nội dung.

Ngân hàng/escrow, hóa đơn VAT/PDF và đồng bộ mọi landing page chỉ đang được nhắc trong copy/role mô tả. Không đưa thành chức năng hoàn tất của B11 hoặc tự mở rộng sửa A3/A8/payment; cần kế hoạch riêng nếu muốn thực hiện đúng các lời hứa đó.

## 7. Kế hoạch triển khai theo thứ tự

1. Chốt contract dữ liệu tổ chức, team, KPI, xác minh và hành vi Lưu tất cả. Giữ các thiếu hụt là BLOCKED; nếu chọn phiên bản giảm phạm vi, phải ghi rõ và được duyệt trước khi bỏ/ẩn/đổi thành phần Stitch.
2. Bổ sung backend/migration/API profile và các phụ thuộc được chọn trong phiên triển khai riêng. Chạy HTTP đúng payload, round-trip và quyền trên DB riêng trước khi nối UI. Không thay đổi API account để âm thầm lưu pháp nhân.
3. Tạo `client/src/pages/organizer/OrganizerProfilePage.tsx` **trong tương lai**: JSX và CSS riêng của B11 cùng file; CSS multiline trong template literal, render `<style>{styles}</style>`, selector có scope `.b11-page`. Không tạo `OrganizerProfilePage.css`, không nhồi một dòng. Giữ `OrganizerSidebar.tsx` và CSS chung hiện có được import qua component; không chép CSS sidebar vào B11.
4. Route đề xuất `/organizer/profile`, guard phù hợp Organizer; thêm route vào App và entry Hồ sơ BTC của sidebar khi triển khai được phép. Chưa có route này trong repo. Tái sử dụng `<OrganizerSidebar active="Hồ sơ BTC" />`; dùng cơ chế shell/mobile đã có, không sửa diện mạo màn hình khác. `hideLiveSync` hiện có có thể dùng nếu thống nhất không hiển thị trạng thái hạ tầng chưa có dữ liệu, nhưng cần duyệt cách hiển thị trước.
5. Chuyển đúng HTML sang JSX, map CSS artifact, dữ liệu API tách khỏi nhãn tĩnh. Logo/tên/KPI/team/verified lấy dữ liệu thật; không chép thông tin cá nhân, số liệu, ảnh nhân sự mẫu. Không thêm hiệu ứng ngoài thiết kế.
6. Dùng Axios/session binding hiện có. Tách dữ liệu đã lưu và draft; Hủy phục hồi snapshot, bảo vệ draft khi request lỗi; hai nút Lưu dùng cùng handler, khóa double submit. Password luôn trống lúc tải, không giữ mật khẩu trong localStorage/log; kiểm tra confirm, đổi mật khẩu cuối rồi clearAuth/đăng nhập lại.
7. Loading/error/retry/empty/forbidden/conflict/partial success và disabled theo trạng thái thật. Chưa có API thì dừng tích hợp nhóm đó, không toast giả thành công. Form dùng label/htmlFor/id, error liên kết field, focus rõ; modal team thao tác được bằng bàn phím.
8. Nghiệm thu desktop 1440/1024, tablet 768, mobile 390; so với ảnh và HTML, xem header/sidebar/dock có che form không. Kiểm tra font, contrast, anchor scroll, zoom, focus và nội dung dài; static screenshot không đủ PASS responsive.
9. Khi có sửa code ở phiên sau: chạy `npm run build`, `npm run lint` trong client; build/check:boundaries và test API phù hợp trong server. Browser round-trip save/reload/cancel/password/logout/team permissions. Lập report mới, cập nhật đúng B11 ở Master Plan.

## 8. Tiêu chí nghiệm thu và kết luận

- B11 có route thật, menu hoạt động, dùng sidebar chung, không ảnh hưởng A10/B2/B7.
- Tái hiện bố cục, font, palette theo artifact; mọi sai lệch được ghi nhận/duyệt. Không coi khác biệt giữa prose token và namedColors là quyền tự thiết kế lại.
- Lưu pháp nhân/bio/website/logo có API đúng nghĩa, đọc lại sau reload; không mất phone/avatar và không dùng application POST làm update.
- Team có đúng scope/quyền, không rò dữ liệu event khác; không gán trạng thái presence giả.
- Public page/KPI/verified có nguồn và định nghĩa; không số liệu mẫu. Mọi phần thiếu API vẫn chặn nghiệm thu đầy đủ.
- Mật khẩu được xác nhận và phiên bị thu hồi theo backend; không báo lưu tất cả khi có nhóm thất bại.
- Có bằng chứng browser đa viewport, keyboard và các trạng thái lỗi/empty/loading; build/lint/API tests đạt khi triển khai.

**Kết luận ở phiên review ban đầu: KHÔNG ĐẠT cho B11 hoàn chỉnh; tích hợp đầy đủ BLOCKED bởi contract/API thiếu.** Kết luận này ghi lại trạng thái trước triển khai; kết quả mới nhất xem mục9.

## 9. Thực hiện theo xác nhận tiếp theo của người dùng

Người dùng đã duyệt triển khai source/API và schema ba bảng trên DB test tạm; yêu cầu sửa DB runtime phải xác nhận riêng. Chỉ giữ đội ngũ BTC/check-in, bỏ Finance/override/giải ngân. Sửa brand/bio/website/logo trực tiếp; businessName/taxIdOrBusinessLicense/legalRepresentativeName qua request ADMIN review. Đây là phạm vi nghiệm thu mới thay cho toàn bộ quyền minh họa trong Stitch gốc; artifact Stitch giữ nguyên.

Đã triển khai profile/public/requests/review/team/recipient/assignment/search/stats, migration Auth-owned, sidebar/route B11 và `OrganizerProfilePage.tsx` chứa JSX/CSS multiline. Các view public/invitations cùng file, là phần hỗ trợ B11; admin review có API mới, chưa thay giao diện Admin hiện có. Không triển khai KYC/presence/2FA/bank, không hiển thị thông tin chứng nhận giả. Hai KPI định nghĩa: event từng có published_at và vé thuộc PAID order còn VALID/CHECKED_IN. Bio giữ giới hạn4000 để không mất dữ liệu application; logo tách avatar. Phần contactName/email được bổ sung cho contract tổ chức, có consent công khai whitelist riêng. Không tự backfill tài khoản thiếu application.

Kiểm tra cuối source: client build/lint PASS, server build/boundaries PASS; toàn bộ backend75PASS/2skip trên DB sạch; B11 HTTP90checks PASS, gồm ownership ADMIN, expiry/reinvite,52membership pagination, legacy application và URL, legal approval/conflict, thu hồi event grant, KPI vé VOID. Chrome PASS save/reload/cancel/upload/logo/legal-pending/password mismatch và đổi mật khẩu/đăng nhập lại, team accept và public data; ảnh1440/1024/768/390 có trong report, không tràn ngang. Chưa audit screen reader/contrast/toàn bộ trình duyệt khác.

Tài khoản `organizer@example.test` đã đăng nhập/đọc runtime8000 thành công, có20events nhưng không application. Tài khoản cùng email/mật khẩu cũng được dựng riêng trên DB test để chạy Chrome; đổi mật khẩu chỉ ở DB test. **Supabase/runtime8000 chưa migration hoặc deploy B11**, chưa kiểm mutation runtime; xem [đề xuất DB và rollout](B11_DatabaseChangeProposal.md). Kết luận triển khai source: **ĐẠT CÓ ĐIỀU KIỆN**, chưa đánh dấu runtime hoàn tất.

## 10. Thay thế phương án ba bảng bằng dữ liệu hiện có

Theo yêu cầu tiếp theo, đã rút phương án `organizer_profiles`, `organizer_team_members`, `organizer_profile_change_requests`, xóa migration/script tạo ba bảng và gỡ chúng khỏi manifest/ownership. Kết quả90HTTP/Chrome của phiên trước là lịch sử của kiến trúc cũ; không dùng để nghiệm thu bản hiện tại.

B11 lấy application APPROVED đúng user; PATCH cập nhật các cột brand/contact/bio/website ngay trên application, giữ omitted và chặn null cho cột NOT NULL. ETag hash từ dữ liệu thật thay cột version; request stale trả409. Tài khoản không có application hiển thị thiếu hồ sơ, khóa sửa; không tự INSERT, không ghép application người khác. Team tổng hợp người được phân công trong event_checkin_staff; thêm nhân sự phải chọn event, dùng lời mời/nhận/từ chối/thu hồi và notification hiện có. Không còn lời mời cấp tổ chức hai bước hoặc membership độc lập.

Người dùng đã yêu cầu bỏ legal_representative_name và is_profile_public: đã bỏ input người đại diện pháp luật, consent public, CTA/view/API public của source B11; contact_name giữ nghĩa người liên hệ. Chỉ thêm hai cột nullable logo_url/pending_legal_changes vào organizer_applications ở migration source và DB test. Logo không ghi đè users.avatarUrl; pháp nhân/mã thuế cần ADMIN review, lưu pendingJSON và lịch sử audit_logs sẵn có. Brand sửa trong lúc pending không làm mất pháp nhân hoặc vô hiệu yêu cầu nếu pháp nhân gốc không đổi.

[Kế hoạch bảng hiện có](B11_ExistingTablesPlan.md) và [report kiểm chứng](../reports/stitch/B11_20261031_164427_existing_tables_implementation.md) là nguồn mới nhất. Source giữ sidebar dùng chung và TSX/CSS multiline mộtfile. Supabase/runtime8000 chưa migration/deploy, theo lựa chọn giữ source để xem trước.

## 11. Supabase và giao diện thực tế sau khi được cho phép

Theo yêu cầu triển khai tiếp theo, đã chạy riêng migration OrganizerApplicationProfile1793437200000 trên Supabase, chỉ thêm logo_url/pending_legal_changes nullable. Application cũ có2record, hash dữ liệu cũ trước/sau khớp. Đã nạp10JS B11 và client/dist vào API8000, giữ nguyên worker; Vite5173 và static8000 hiển thị B11 mới. Code cập nhật tại chỗ; image chưa rebuild, cần build source khi recreate container.

Đã dùng application TEST B11 do người dùng cho phép để thử lưu/hủy/reload/logoCloudinary/gửiphápnhânPENDING, ETag409, payloadngoàischema400, Organizerreview403 và Chrome4viewport. Có19API checkpoints trực tiếp cùng UI/mutation kiểm tra runtime, dữ liệuKPI/staff thật. Sau đó xóa đúng applicationfixture/auditapplicationId/ảnhCloudinary; fingerprint applicationgốc, staff và useraccount khớp. Không thay mật khẩu hoặc cấp/thu hồi staff thật.

Tài khoản organizer@example.test trở về initialized=false do không có application thật liên kết; UI hiển thị thiếu hồ sơ và khóa sửa, không dữ liệu giả. KPI/staff vẫn200. ADMINapprove/reject, staffinvite/accept/revoke và passwordsuccess đãPASS DBtạm trước đó; chưa xác minh các mutation đó bằng phiên phù hợp trên runtime. Kết quả: **ĐẠT CÓ ĐIỀU KIỆN**, không fulla11y/crossbrowser hoặc fullbackendQRsuite. Report và ảnh thật: [B11 runtime rollout](../reports/stitch/B11_20261031_170011_runtime_rollout.md).

## 12. Seed application DEMO theo yêu cầu

Sau rollout, người dùng yêu cầu tự điền application cho `organizer@example.test` và chọn `APPROVED` để dùng B11. Đã thêm một application có các trường pháp nhân/địa chỉ/mã số thuế đánh dấu DEMO, không phải thông tin thật hoặc thẩm định pháp lý. Login, `GET /api/organizer/profile` và Chrome UI đều xác nhận hồ sơ hiển thị. Trạng thái APPROVED được seed trực tiếp theo yêu cầu, không qua Admin review; không dùng dữ liệu này cho nghiệp vụ thật. [Report seed](../reports/stitch/B11_20261031_230034_demo_application_seed.md).
