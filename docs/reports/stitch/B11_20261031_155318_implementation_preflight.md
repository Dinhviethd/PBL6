# B11 — Triển khai API/frontend, kiểm thử và xác nhận DB

Thời điểm: **2026-10-31 15:53:18 UTC+7**. Project10374042969343935993, screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`, tên Hồ sơ Ban Tổ Chức. Loại phiên: bắt đầu triển khai theo plan, chờ xác nhận thay đổi DB theo yêu cầu người dùng.

## Yêu cầu và trạng thái

Người dùng yêu cầu thực hiện plan B11, thêm API thiếu, dùng tài khoản organizer@example.test để test; mọi việc thêm/sửa/xóa DB phải được xác nhận. Không ghi mật khẩu/token vào report. Master Plan đã đọc trước Stitch; B11 đang KHÔNG ĐẠT, full integration BLOCKED, chưa route/page/profile API riêng. Kế hoạch gốc: `docs/ui/Feature_B11_OrganizerProfile.md`.

Tiêu chí: giữ artifact, dùng sidebar chung, TSX/CSS cùng file; kiểm API thật, phân quyền/round-trip, browser desktop/mobile và build/lint; không thay đổi DB khi chưa được xác nhận. Source có sửa B6/B7 và ảnh bị xóa từ trước phiên, giữ nguyên.

## Thực hiện và bằng chứng

- Đọc Master Plan, plan B11, ownership, manifest migration, routes/service/store và component liên quan.
- `get_screen` xác nhận B11 vẫn DESKTOP2560×4436, HTML12524529387351101265/JPEG6887434625983419854. Không gọi edit/generate Stitch; thiết kế giữ nguyên. HTML/ảnh đã được đọc ở phiên review trước, phiên này lấy lại metadata, chưa kiểm browser.
- POST `/api/auth/login` qua `http://localhost:8000` bằng tài khoản được chỉ định **200**, role USER/ORGANIZER. Login tạo auth session theo cơ chế sẵn có, đã nằm trong yêu cầu dùng tài khoản test.
- GET `/api/auth/me` **200**, có avatar; không giả định avatar cá nhân là logo tổ chức.
- GET `/api/me/organizer-applications?page=0` **200**, `[]`. Organizer seed có quyền nhưng không có application; cần hồ sơ nháp trống thay vì giả pháp nhân được duyệt.
- GET `/api/organizer/events/status-counts` **200**: DRAFT3, PENDING_REVIEW1, PUBLISHED12, REJECTED4 (tổng20).
- GET `/api/organizer/events?page=0&limit=6` **200**, sáu event thuộc chủ thể. Chưa gọi API ghi nghiệp vụ khác trên runtime.
- Tạo [đề xuất DB cụ thể](../../ui/B11_DatabaseChangeProposal.md): bảng/cột/FK/default, dữ liệu nháp, membership/lời mời, lựa chọn tái duyệt, phạm vi test tạm và runtime tách riêng. Chưa tạo/chạy migration, chưa thêm/sửa/xóa dữ liệu B11.
- Đặt câu hỏi phạm vi team và chính sách pháp nhân; chờ người dùng trả lời. Ghi nhật ký mọi sửa đổi tiếp theo vào report này và report mới nếu sang phiên khác.

## Review và giới hạn hiện tại

| Tiêu chí | Kết quả |
|---|---|
| Nội dung/contract | PARTIAL — API cũ có dữ liệu account/event; thiếu profile tổ chức/team |
| Bố cục | NOT_VERIFIED phiên triển khai — chưa tạo UI |
| Design system | PARTIAL theo review trước; giữ artifact |
| Ngôn ngữ/khả năng đọc | NOT_VERIFIED phiên triển khai |
| Điều hướng/nghiệp vụ | FAIL hiện tại — chưa route B11 |
| Trạng thái dữ liệu | NOT_VERIFIED UI |
| Responsive/accessibility | NOT_VERIFIED |
| Nhất quán/sidebar | PARTIAL — component có sẵn, chưa nối B11 |

Kết quả tổng thể hiện tại: **CHƯA ĐỦ BẰNG CHỨNG cho triển khai; thay đổi DB CHỜ XÁC NHẬN**. Review trước KHÔNG ĐẠT còn hiệu lực. Đã giải quyết khảo sát tài khoản local; chưa giải quyết các API thiếu. Chưa chạy build/lint/API mutation tests trong phiên này. Không tuyên bố hoàn tất UI/API.

## Tài liệu/Master Plan

Tạo proposal DB và report mới này. Cập nhật mục B11 tại5.2/5.4 và ma trận4,6.F với authenticated local evidence, đề xuất DB chờ duyệt, report và thời gian. Không cập nhật trạng thái các màn khác. Phần dưới bổ sung các thay đổi sau khi người dùng xác nhận.

## Xác nhận và triển khai sau khảo sát

Người dùng đã xác nhận: bỏ mọi quyền ngoài đội ngũ/check-in; cho sửa thương hiệu/bio/website/logo và tái duyệt pháp nhân/thuế/đại diện; duyệt schema ba bảng cùng kiểm thử DB tạm riêng. Chưa cho phép migration hoặc ghi B11 ở DB runtime8000.

Đã thêm migration `OrganizerProfiles1793433600000` tạo ba bảng Auth-owned, index/FK/constraint; cập nhật manifest script/CLI và ownership allowlist. Không có backfill hoặc migration down phá dữ liệu. Container DB test `eventhub-b11-implementation-test`, loopback55441, DB `eventhub_b11_test`, PostgreSQL17; đã áp dụng migration ở DB này và xác minh chạy lại không còn migration pending. Không chạy migration trên Supabase/runtime8000.

Backend: thêm schema strict, persistence Auth, public Auth ports, workflow aggregate/team, routes profile/public/legal-review/team/recipient/assignment/search. PATCH chỉ sửa whitelist thương hiệu/liên hệ, giữ field omitted, hỗ trợ null, kiểm version. Ba field pháp nhân bị chặn ở PATCH; chỉ ADMIN review mới áp dụng request, version stale409. GET không tự INSERT hồ sơ, public response whitelist không lộ pháp nhân/team/contact. Team chỉ CHECKIN_STAFF, lời mời7 ngày và không cấp global ORGANIZER; phân công event qua workflow hiện có, thu hồi membership thu hồi cả event grants. KPI lấy event từng published + vé PAID còn VALID/CHECKED_IN, query từng owner trong snapshot. Search chỉ orders/tickets/buyer thuộc event của chủ thể, tối đa20 kết quả.

Frontend: thêm `OrganizerProfilePage.tsx` chứa JSX/CSS multiline; tái dùng OrganizerSidebar, thêm entry Hồ sơ BTC và route/shell B11. Cùng file có view public và lời mời recipient, route mở rộng thuộc B11; không sửa màn admin/customer khác. Bỏ Finance/override/giải ngân theo xác nhận; badge dùng trạng thái dữ liệu thật, không Tier/KYC giả. Form brand/legal/contact/public consent/logo; password xác nhận, chạy cuối và logout; hủy draft, trạng thái tải/lỗi, partial save; team invite/assignment/revoke, inbox nhận lời mời, header search/notification. Mobile sidebar dùng chung có Escape/focus trap; các modal dùng dialog native.

Kiểm thử checkpoint: server build/boundaries PASS; client build PASS (cảnh báo bundle/Browserslist), lint ban đầu có một hook warning đã sửa; 69 HTTP checks PASS trên DB tạm. Chrome đã kiểm save/reload/cancel/logo/legal pending/password mismatch/team accept/public view và bốn viewport; lượt đầu dừng do test bấm tâm backdrop nằm dưới sidebar mobile, đã đổi thao tác Escape và chạy lại PASS. Không coi lỗi test đó là API lỗi. Test fixture VOID ban đầu thiếu voided_at/void_reason, đã sửa đúng contract và chạy lại PASS. TypeScript snapshot/Row type ban đầu đã sửa, build lại PASS. Cần chạy lại kiểm tra cuối sau các chỉnh nhỏ, kết quả sẽ bổ sung ở cuối report.

Ảnh checkpoint: `evidence/B11_20261031_155318/1440.png`, `1024.png`, `768.png`, `390.png`; đã xem desktop trực tiếp. Các ảnh chứa fixture DB test, không phải hồ sơ pháp nhân thật của Organizer local. Các report cũ giữ nguyên.

## Kết quả cuối source — 2026-10-31 16:19:23 UTC+7

- Server `npm run build`, `npm run check:boundaries`: PASS.
- Client `npm run build`, `npm run lint`: PASS, lint không còn warning. Build còn cảnh báo bundle lớn và dữ liệu Browserslist/baseline cũ, không đổi dependency ngoài phạm vi.
- Toàn bộ `npm test` với PostgreSQL tạm sạch `eventhub_b11_regression_test`, container riêng loopback55442: **77 tests,75PASS,0FAIL,2SKIP**,79.3giây. Hai skip là suite SePay riêng cần cấu hình chuyên biệt. Không liên hệ ngân hàng thật trong fixtures.
- Lượt full suite trước chạy trên DB đã có fixture browser nên B5 lỗi trùng `organizer@example.test`; đã xác định do tái sử dụng DB test, không sửa code B5. Chạy lại trên container DB sạch đạt toàn bộ như trên.
- B11 tích hợp cuối: **90 HTTP checks PASS**, cùng3 unit tests aggregate. Thử thêm ADMIN không vượt owner-scope của team, expiry/reinvite,52membership pagination, legacy application/contact≠legal representative, lọc URL legacy và public hide404; đã kiểm thành công thu hồi riêng một phân công, đọc lại REVOKED rồi mời lại/chấp nhận. Migration chạy lại không pending; script B11 read-only check và `--apply-b11` trên DB test trả `appliedNow:[]`.
- Chrome cuối: PASS luồng lưu/reload/hủy, logo staging+lưu, pháp nhân pending không áp dụng sớm, password mismatch không gọiAPI, đổi mật khẩu thành công→login→vào lạiB11, team invite/recipient accept/modalEscape, public whitelist; bốn viewport1440/1024/768/390 không tràn ngang. Dùng đúng email `organizer@example.test` và mật khẩu được cung cấp trên **DB test độc lập**; đổi password chỉ ở DB test.
- Một lượt browser mở trang ngay sau nút login trước khi request login hoàn tất, đã sửa test chờ response200 và navigation rồi chạy lạiPASS. Các lỗi khởi động DB tạm khi PostgreSQL chưa ready đã được phân biệt với API; chạy khi pg_isready báo accepting connections thìPASS. Các lỗi thử nghiệm trung gian không được tính là PASS cuối.
- Đã xem trực tiếp ảnhdesktop1440 và mobile390. Ảnh có sticky dock theo viewport; chưa audit đầy đủ việc scroll/focus với assistive technology. Không kết luận pixel-perfect hoặc full accessibility.

### API mới đã kiểm chứng trên backend source/DB tạm

Tiền tố `/api`; route cần auth trừ public:

| Method | Route | Hành vi đã kiểm chứng |
|---|---|---|
| GET/PATCH | `/organizer/profile` | Nháp không ghiDB, whitelist, version409, omitted giữ, null xóa, account không đổi |
| GET | `/organizer/profile/stats` | Event từng published, vé PAID/VALID/CHECKED_IN, VOID bị loại, owner isolation |
| GET | `/organizers/:slug` | Chỉ public/whitelist, private/hidden404, URL legacy an toàn |
| GET/POST | `/organizer/profile/legal-requests` | Lịch sử thuộc owner, pending409, không apply trước duyệt |
| GET | `/admin/organizer-profile-requests` | ADMIN-only |
| POST | `/admin/organizer-profile-requests/:id/review` | Approve/reject có lý do, version409, xử lý một lần, audit |
| GET/POST | `/organizer/team` | Pagination50+hasNext, chỉ CHECKIN_STAFF, mời account có sẵn |
| DELETE | `/organizer/team/:id` | Version/owner guards, thu hồi cả phân công event |
| GET/POST | `/organizer/team/:id/events` | MemberACTIVE, owner event, event invitationPENDING |
| DELETE | `/organizer/team/:id/events/:staffId` | Thu hồi grant thuộc đúng thành viên/eventowner |
| GET | `/me/organizer-team-invitations` | Inbox riêng từng recipient, phân trang |
| POST | `/me/organizer-team-invitations/:id/respond` | Accept/decline/expiry/version, không cấp globalORGANIZER |
| GET | `/organizer/search?q=...` | Query validation, order/ticket/buyer scope owner, giới hạn20 |

DELETE riêng một event grant200/REVOKED→mời lại/chấp nhận và DELETE membership→thu hồi grant đã kiểm end-to-end. Fixture lời mời event đổiID khi mời lại, test ADMIN đã được điều chỉnh dùng ID mới thay vì ID không còn tồn tại, chạy lại90checks PASS. Admin review là API mới, chưa có view trên màn Admin hiện hữu; có thể vận hành qua client API được cấp quyền. Không báo đã kiểm thao tác Admin UI.

### Trạng thái runtime và bước chờ duyệt

Đọc cấu hìnhDB ngay trong API container xác nhận runtime8000 dùng **Supabase `aws-0-ap-south-1.pooler.supabase.com` database `postgres`, TLS**, chưa có cả3bảngB11. Migration history có InitialMvp/EventCheckinStaff/Notifications/WaitQueue/SepayLiveFoundation, chưaB11. Thao tác kiểm tra này chỉSELECT; lần thử node -e đầu lỗi quote trước khi chạy, sau đó pipe stdin thực hiệnSELECT thành công. Không in/lưu credentials.

[Migration cụ thể](../../../server/src/migrations/OrganizerProfiles1793433600000.ts) và [script chạy riêng B11](../../../server/scripts/migrate-organizer-profile.cjs) đã sẵn sàng. Script mặc định read-only, chỉ ghi khi có `--apply-b11`; chỉ nạpB11, không chạy các migrationkhác. Nội dung áp dụng:3bảng/index/FK/constraint và1dòngmigrationhistory, không backfill/seed/update/delete dữ liệu nghiệp vụ cũ. Chưa được xác nhận áp dụng Supabase; chưa chép/restart runtime API. Tài khoản đang dùng không bị đổi mật khẩu/profile/logo/team.

### Tiêu chí cuối, phạm vi và tài liệu

Kết luận mới: **ĐẠT CÓ ĐIỀU KIỆN cho source/API/frontend theo phạm vi được duyệt trên DB riêng; runtime CHỜ XÁC NHẬN migration/rollout**, không đánh dấu hoàn tất deploy. Nội dung/điều hướng/trạng thái có bằng chứng code+HTTP+Chrome; responsive có chứng cứ4viewport; full a11y/contrast/screen-reader/browserkhác vẫnNOT_VERIFIED. Stitch artifact giữ nguyên; source điều chỉnh quyền/nhãn/dữ liệu thật theo xác nhận và contract, contact/public consent thêm để không trộn account/phápnhân. Không phát triển KYC/presence/2FA/bank/Finance/override/giảingân.

Tệp đã thêm/sửa trong phiên: pageB11 mộtfile, App routing/shell, sidebar entry; app routes, Auth public factory, Auth organizer service/store, Event/Order store aggregate, workflow, contracts, migration/manifests/ownership; tests unit/integration/browserhelper; script migrationchuyênbiệt; proposalDB, planB11, reportnày, MasterPlan;4ảnh bằng chứngB11. Các thay đổi B6/B7 có sẵn được giữ nguyên, không sửa các reportcũ. `git diff --check` PASS. Cập nhật B11 tại4/5.2/5.4/6.F, thờiđiểm/report và tình trạng chờDB; không thay trạng thái mànkhác.

Chốt lúc **2026-10-31 16:23:21 UTC+7**: liên kết tài liệu/UTF-8 và đủ10JS triển khai đã kiểmPASS; đã sao lưu `/app/dist` hiện hành của API container vào `C:\Users\trank\AppData\Local\Temp\eventhub-b11-runtime-before\dist` để chuẩn bị khôi phục code nếu cần. Chỉ sao chép ra host, chưa cập nhật/restart API. Hai container DB test đã dừng và tự xóa bằng `--rm`; runtime api/worker vẫn giữ nguyên. Đã gửi yêu cầu xác nhận rõ targetSupabase và3bảng/migration; **chưa nhận xác nhận áp dụng runtime**, giữ bước này pending. Ngoài phiên auth được cho phép và các SELECT xác minh, chưa ghiDBruntime.

## Nhật ký90 HTTP checks cuối trên DB tạm

| # | Case | Method | Path (sau /api) | Status | Code |
|---|---|---|---|---|---|
| 1 | guest rejected | GET | `/organizer/profile` | 401 | UNAUTHORIZED |
| 2 | user rejected | GET | `/organizer/profile` | 403 | FORBIDDEN |
| 3 | read draft | GET | `/organizer/profile` | 200 | — |
| 4 | legal cannot bypass review | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 5 | owner injection rejected | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 6 | unsafe website rejected | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 7 | save brand | PATCH | `/organizer/profile` | 200 | — |
| 8 | account untouched | GET | `/auth/me` | 200 | — |
| 9 | stale version | PATCH | `/organizer/profile` | 409 | VERSION_CONFLICT |
| 10 | private profile hidden | GET | `/organizers/eventhub-b11-test-bc60463e-5ca4-460e-8ef0-2ed50a9421fc` | 404 | NOT_FOUND |
| 11 | publish brand | PATCH | `/organizer/profile` | 200 | — |
| 12 | public whitelist | GET | `/organizers/eventhub-b11-test-bc60463e-5ca4-460e-8ef0-2ed50a9421fc` | 200 | — |
| 13 | clear nullable website | PATCH | `/organizer/profile` | 200 | — |
| 14 | legal request | POST | `/organizer/profile/legal-requests` | 200 | — |
| 15 | duplicate pending | POST | `/organizer/profile/legal-requests` | 409 | REQUEST_PENDING |
| 16 | legal not applied before approval | GET | `/organizer/profile` | 200 | — |
| 17 | organizer cannot approve | POST | `/admin/organizer-profile-requests/ad3b650b-f48e-4a9e-b00f-f3958c4b8a55/review` | 403 | FORBIDDEN |
| 18 | reject requires reason | POST | `/admin/organizer-profile-requests/ad3b650b-f48e-4a9e-b00f-f3958c4b8a55/review` | 400 | REASON_REQUIRED |
| 19 | reject legal request | POST | `/admin/organizer-profile-requests/ad3b650b-f48e-4a9e-b00f-f3958c4b8a55/review` | 200 | — |
| 20 | resubmit legal | POST | `/organizer/profile/legal-requests` | 200 | — |
| 21 | approve legal | POST | `/admin/organizer-profile-requests/76d6b2a0-ad2d-4563-8359-1a5f6a087609/review` | 200 | — |
| 22 | cannot review twice | POST | `/admin/organizer-profile-requests/76d6b2a0-ad2d-4563-8359-1a5f6a087609/review` | 409 | ALREADY_REVIEWED |
| 23 | approved legal roundtrip | GET | `/organizer/profile` | 200 | — |
| 24 | foreign request list isolated | GET | `/organizer/profile/legal-requests` | 200 | — |
| 25 | new legal request | POST | `/organizer/profile/legal-requests` | 200 | — |
| 26 | brand update during pending | PATCH | `/organizer/profile` | 200 | — |
| 27 | stale review rejected | POST | `/admin/organizer-profile-requests/cb65206e-74c9-4197-beb3-f861e2cae98e/review` | 409 | VERSION_CONFLICT |
| 28 | reject stale request | POST | `/admin/organizer-profile-requests/cb65206e-74c9-4197-beb3-f861e2cae98e/review` | 200 | — |
| 29 | admin review list | GET | `/admin/organizer-profile-requests?page=0` | 200 | — |
| 30 | team empty | GET | `/organizer/team` | 200 | — |
| 31 | self invite rejected | POST | `/organizer/team` | 400 | OWNER_MEMBER |
| 32 | missing account rejected | POST | `/organizer/team` | 400 | INVALID_INVITEE |
| 33 | unsupported role rejected | POST | `/organizer/team` | 400 | VALIDATION |
| 34 | invite team | POST | `/organizer/team` | 200 | — |
| 35 | duplicate invite | POST | `/organizer/team` | 409 | INVITATION_PENDING |
| 36 | fixture category | POST | `/admin/categories` | 200 | — |
| 37 | fixture owner event | POST | `/organizer/events` | 200 | — |
| 38 | fixture foreign event | POST | `/organizer/events` | 200 | — |
| 39 | pending member cannot assign | POST | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events` | 409 | MEMBER_NOT_ACTIVE |
| 40 | foreign cannot accept | POST | `/me/organizer-team-invitations/db68e1d8-93e1-4722-b992-68e36d168c2d/respond` | 404 | NOT_FOUND |
| 41 | recipient inbox | GET | `/me/organizer-team-invitations` | 200 | — |
| 42 | accept membership | POST | `/me/organizer-team-invitations/db68e1d8-93e1-4722-b992-68e36d168c2d/respond` | 200 | — |
| 43 | membership does not grant organizer | GET | `/auth/me` | 200 | — |
| 44 | foreign event assignment rejected | POST | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events` | 403 | FORBIDDEN |
| 45 | assign to owned event | POST | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events` | 200 | — |
| 46 | event invitation accepted | POST | `/me/checkin-invitations/3814f113-ade0-4272-b22a-15e54f898826/respond` | 200 | — |
| 47 | revoke one event grant | DELETE | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events/3814f113-ade0-4272-b22a-15e54f898826` | 200 | — |
| 48 | single event grant revoked | GET | `/organizer/events/2d8c5592-1a86-4b27-8b8c-b4fe276286f5/staff` | 200 | — |
| 49 | reassign revoked event grant | POST | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events` | 200 | — |
| 50 | accept renewed event grant | POST | `/me/checkin-invitations/0230b3ab-feef-4e71-93be-c0b50e6bd815/respond` | 200 | — |
| 51 | list assignment | GET | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events?version=2` | 200 | — |
| 52 | foreign cannot revoke member | DELETE | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d` | 404 | NOT_FOUND |
| 53 | stale revoke version | DELETE | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d` | 409 | VERSION_CONFLICT |
| 54 | revoke team member | DELETE | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d` | 200 | — |
| 55 | event access revoked | GET | `/organizer/events/2d8c5592-1a86-4b27-8b8c-b4fe276286f5/staff` | 200 | — |
| 56 | scan access removed | GET | `/checkin/events/2d8c5592-1a86-4b27-8b8c-b4fe276286f5` | 403 | FORBIDDEN |
| 57 | reinvite revoked | POST | `/organizer/team` | 200 | — |
| 58 | decline membership | POST | `/me/organizer-team-invitations/db68e1d8-93e1-4722-b992-68e36d168c2d/respond` | 200 | — |
| 59 | declined cannot assign | POST | `/organizer/team/db68e1d8-93e1-4722-b992-68e36d168c2d/events` | 409 | MEMBER_NOT_ACTIVE |
| 60 | profile stats zero | GET | `/organizer/profile/stats` | 200 | — |
| 61 | search validation | GET | `/organizer/search?q=x` | 400 | VALIDATION |
| 62 | search empty | GET | `/organizer/search?q=ZZZZ` | 200 | — |
| 63 | stats guest rejected | GET | `/organizer/profile/stats` | 401 | UNAUTHORIZED |
| 64 | stats user rejected | GET | `/organizer/profile/stats` | 403 | FORBIDDEN |
| 65 | fixture ticket type | POST | `/organizer/events/2d8c5592-1a86-4b27-8b8c-b4fe276286f5/ticket-types` | 200 | — |
| 66 | fixture submit | POST | `/organizer/events/2d8c5592-1a86-4b27-8b8c-b4fe276286f5/submit` | 200 | — |
| 67 | fixture publish | POST | `/admin/events/2d8c5592-1a86-4b27-8b8c-b4fe276286f5/review` | 200 | — |
| 68 | fixture demo payment | POST | `/orders/31f084aa-d89a-4158-a71e-b587ed190956/payments` | 200 | — |
| 69 | stats paid tickets | GET | `/organizer/profile/stats` | 200 | — |
| 70 | search real order | GET | `/organizer/search?q=EH-01F25B4155B85339` | 200 | — |
| 71 | search ownership | GET | `/organizer/search?q=EH-01F25B4155B85339` | 200 | — |
| 72 | void excluded | GET | `/organizer/profile/stats` | 200 | — |
| 73 | stats owner isolation | GET | `/organizer/profile/stats` | 200 | — |
| 74 | admin team invite | POST | `/organizer/team` | 200 | — |
| 75 | accept admin team | POST | `/me/organizer-team-invitations/24efd8df-437b-4d42-8356-792bb6efea1a/respond` | 200 | — |
| 76 | admin personal team cannot assign foreign event | POST | `/organizer/team/24efd8df-437b-4d42-8356-792bb6efea1a/events` | 403 | FORBIDDEN |
| 77 | admin personal team cannot revoke foreign grant | DELETE | `/organizer/team/24efd8df-437b-4d42-8356-792bb6efea1a/events/0230b3ab-feef-4e71-93be-c0b50e6bd815` | 403 | FORBIDDEN |
| 78 | reinvite for expiry test | POST | `/organizer/team` | 200 | — |
| 79 | expired response rejected | POST | `/me/organizer-team-invitations/db68e1d8-93e1-4722-b992-68e36d168c2d/respond` | 409 | INVITATION_CLOSED |
| 80 | reinvite expired | POST | `/organizer/team` | 200 | — |
| 81 | decline renewed invitation | POST | `/me/organizer-team-invitations/db68e1d8-93e1-4722-b992-68e36d168c2d/respond` | 200 | — |
| 82 | team first page | GET | `/organizer/team?page=0` | 200 | — |
| 83 | team second page | GET | `/organizer/team?page=1` | 200 | — |
| 84 | legacy application | POST | `/me/organizer-applications` | 200 | — |
| 85 | approve legacy | POST | `/admin/organizer-applications/33f0428d-8276-463a-b7de-2f0f4c3fe6a8/review` | 200 | — |
| 86 | read approved source | GET | `/organizer/profile` | 200 | — |
| 87 | save legacy profile | PATCH | `/organizer/profile` | 200 | — |
| 88 | legacy URL sanitized | GET | `/organizers/legacy-brand-26a9634e-3239-429c-bbb9-2bb5220dc549` | 200 | — |
| 89 | hide public profile | PATCH | `/organizer/profile` | 200 | — |
| 90 | hidden profile 404 | GET | `/organizers/legacy-brand-26a9634e-3239-429c-bbb9-2bb5220dc549` | 404 | NOT_FOUND |
