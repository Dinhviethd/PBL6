# B11 — Thực hiện trên bảng application và staff hiện có

Thời điểm lập: **2026-10-31 16:44:27 UTC+7**. Màn hình: **B11 — Hồ sơ Ban Tổ Chức**. Project `10374042969343935993`; screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`, DESKTOP2560×4436; HTML12524529387351101265/JPEG6887434625983419854 đã xem phiên trước. Loại phiên: tiếp tục refactor/API/UI/test sau yêu cầu giảm thay đổi DB. Không gọi công cụ sửa Stitch.

## Yêu cầu và xác nhận

Đã đọc Master Plan và schema/source trước khi sửa. Phiên trước đã có source B11 dựa trên ba bảng mới, chưa deploy/migrate Supabase. Người dùng yêu cầu dùng organizer_applications/event_checkin_staff; thay DB chỉ khi cần và phải xác nhận. Sau câu hỏi4cột, người dùng yêu cầu **bỏ legal_representative_name và is_profile_public**. Bản hiện tại chỉ chuẩn bị logo_url/pending_legal_changes trên application cho source/DB tạm. Người dùng đã trả lời **chưa áp dụng Supabase, giữ source để xem**; không tiếp tục đề nghị rollout ba bảng.

## Thay đổi đã thực hiện

- Auth đọc application APPROVED đúng principal; thiếu application trả dữ liệu thiếu hồ sơ, initialized=false, không GET tự INSERT. UPDATE các cột có sẵn, ETag SHA256 kiểm xung đột, role/owner guard và lock user trong transaction. Giữ omitted, từ chối null ở trường NOT NULL. Profile không còn bảng hoặc cột version.
- Migration cũ `OrganizerProfiles1793433600000`/script migrate-organizer-profile đã gỡ; gỡ3bảng khỏi ownership và manifests. Migration mới `OrganizerApplicationProfile1793437200000` chỉ ALTER TABLE organizer_applications ADD logo_url text và pending_legal_changes jsonb (nullable); không backfill, không thêm bảng, không sửa event_checkin_staff. Đã gỡ JS migration cũ do build trước tạo ở host; chưa chạm runtime container.
- Pháp nhân chỉ businessName/taxIdOrBusinessLicense: pendingJSON chứa id/requestedAt/changes/baseLegalVersion. ADMIN review cập nhật field sau duyệt, giữ brand đã sửa, xóa pendingNULL và audit trong cùng transaction. Lịch sử duyệt/từ chối từ audit_logs qua Audit public interface, không query chéo owner. Version pháp nhân chỉ dựa pháp nhân để cho phép sửa brand trong lúc chờ. Không suy diễn KYC.
- Team không có membership riêng. Event store aggregate event_checkin_staff JOIN events cùng owner, gom theo user_id/phân trang; invite/accept/decline/revoke dùng Booking/Event workflow hiện có, giữ notification và scope event. Recipient page gọi GET me/checkin-assignments, POST me/checkin-invitations/:id/respond. Thêm nhân sự cần eventId ngay ở form.
- UI giữ bố cục, sidebar chung và TSX/CSS cùng file; đã bỏ trường đại diện/consent public/CTA public cùng route/view/API public. Tình trạng DB thiếu hai cột chỉ khóa logo/tái duyệt; không phá phần đọc/sửa field cũ/team/password. Missing application hiển thị thông báo rõ, không dữ liệu mẫu hoặc giả lưu thành công.
- Tạo/cập nhật plan dùng bảng hiện có, ghi chú nguồn mới tại Feature_B11 và proposal cũ. Report trước giữ lịch sử; Master Plan cần phản ánh kết quả mới thay vì90HTTP của kiến trúc đã rút.

## Kiểm thử checkpoint

PostgreSQL17 container `eventhub-b11-reuse-test`, loopback55443, DB eventhub_b11_reuse_test. Không sử dụng Supabase cho fixture. Khởi tạo migrations cũ, tạo application qua API rồi ADMIN approve. Tài khoản organizer@example.test/password do người dùng cung cấp được dựng riêng trên DB tạm để Chrome; không phải sửa hồ sơ tài khoản runtime.

- **55 HTTP checks PASS**: đọc/sửa field cũ trước khi thêm cột, thiếu application không tạo giả, chặn legal/public/representative input ngoài schema, null/URL validation, ETag stale409, profile account không đổi, optional capability trước/sau2cột, pending/approve/reject/audit history, brand sửa khi pending, team reuse invitation/accept/revoke/owner isolation, stats/search.
- **Chrome PASS**: save/reload/cancel, logo staging/lưu, pháp nhân pending chưa áp dụng, chọn event/invite/recipient accept, xem phân công, missing-application disabled, password logout;1440/1024/768/390 không tràn ngang, sidebar mobile Escape. Ảnh thật trong `evidence/B11_20261031_existing_tables/`.
- Server build/boundaries và client build/lint PASS checkpoint; cảnh báo bundle/Browserslist cũ còn nguyên.
- Đang chạy full backend trên container DB tạm sạch khác `eventhub-b11-reuse-regression`, loopback55444. Kết quả cuối bổ sung sau. Refactor để lại import schema staff cũ gây một lượt TSC lỗi; đã gỡ import và build/boundaries lạiPASS trước nghiệm thu.

## Tiêu chí nghiệm thu và giới hạn

| Tiêu chí | Trạng thái checkpoint |
|---|---|
| Dữ liệu/nguồn/ownership | PASS source/API DB tạm; dùng đúng2bảng hiện có |
| Nội dung theo phạm vi mới | PASS fieldđại diện/public đã bỏ, role chỉ check-in |
| Bố cục/Cosmic | PARTIAL: giữ nguồn artifact và sidebar; dữ liệu/trường thay theo xác nhận |
| Điều hướng/nghiệp vụ | PASS các luồng Chrome/API đã ghi |
| Loading/empty/error/success | PARTIAL: đã kiểm missing/empty/error cơ bản; chưa toàn bộ network failure |
| Responsive | PASS bốn viewport đã thử, không tràn ngang |
| Accessibility | PARTIAL: label, dialog/Escape/menu focus; chưa full contrast/screenreader |
| Runtime/Supabase | NOT_VERIFIED bản refactor; chưa migrate/deploy theo yêu cầu |

Kết quả source checkpoint **ĐẠT CÓ ĐIỀU KIỆN**, runtime chưa hoàn tất. Admin review chỉ API, chưa có AdminUI mới; không sửa các màn admin ngoài phạm vi. Không thêm tài khoản/application/permission runtime. Thông tin thật đã kiểm trước: organizer@example.test có role ORGANIZER/20events nhưng không application liên kết; không lấy application chủ khác.

## Nhật ký tài liệu và Master Plan

Mỗi sửa đổi trong phiên được ghi ở report này: source/UI/contracts/workflow/store/audit; xóa phương án migration ba bảng, thêm migration2cột và manifests; thay tests theo kiến trúc mới; cập nhật Feature_B11/B11_ExistingTablesPlan/proposal banner và dòng B11 ở4/5.2/5.4/6.F. Các sửa B6/B7/ảnh bị xóa có sẵn không hoàn tác. Không ghi đè báo cáo cũ. Kiểm tra cuối tiếp tục dưới đây.

## Xác minh cuối — 2026-10-31 16:48:38 UTC+7

- Server build/boundaries PASS sau khi gỡ import schema staff cũ; client build/lint PASS, không lỗi/warning ESLint. Build cảnh báo chunk/Browserslist cũ giữ nguyên.
- B11 cuối **55 HTTP checks +3 unit tests PASS**, không skip, exit0. Test chạy hai giai đoạn: schema cũ hỗ trợ đọc/sửa field có sẵn và staff; logo/tái duyệt trả409 khi thiếu cột. Sau đó chỉ migration2cột trên DB tạm, xác nhận runMigrations chỉ áp dụng OrganizerApplicationProfile1793437200000 và lần hai trả[], không3bảng mới hoặc hai cột bị loại. Con số55 đã bao gồm GET/PATCH trước/sau chuyển schema.
- Chrome cuối PASS (4viewport, profile save/reload/cancel, logo/upload, pháp nhân pending, lời mời event/recipient, missingapplication disabled, password logout). Ảnh [desktop1440](evidence/B11_20261031_existing_tables/1440.png), [1024](evidence/B11_20261031_existing_tables/1024.png), [768](evidence/B11_20261031_existing_tables/768.png), [mobile390](evidence/B11_20261031_existing_tables/390.png). Đã xem trực tiếp desktop1440/mobile390. Nội dung banner sau đó chỉ chỉnh cách diễn đạt cho người dùng, bỏ tên bảng/DB khỏi UI; contactEmail UI max254 khớp schema/API.
- Hai lượt full backend trên DB sạch: cùng77tests,74PASS/1FAIL/2SKIP. Lượt1 B6 QRdecode fail; chạy riêng B6 lạiPASS. Lượt2 B6PASS, B7 QRdecode fail; chạy riêng B7 lạiPASS, gồm contact/timeline/bank/ownership/QR. Không sửa source QR hoặc tests B6/B7; đây là biểu hiện không ổn định của nhánh QR trong integration suite, chưa xác định nguyên nhân tận gốc. **Không báo full suite xanh** hoặc dùng kết quả75PASS của kiến trúc trước để thay kết quả này.
- Đã kiểm tĩnh đúng2ADD COLUMN nullable, không CREATE TABLE/UPDATE/DELETE/backfill hoặc cột đại diện/public; không còn references3bảng cũ trong runtime source/manifests/ownership. `git diff --check` PASS. Manifest hiện nạp migration2cột; runtime không auto-migrate, chưa chạy lệnh migrate trên Supabase.

### API cuối và dữ liệu tái sử dụng

| API | Nguồn / bằng chứng |
|---|---|
| GET/PATCH `/api/organizer/profile` | organizer_applications APPROVED thuộc principal, ETag409; PATCH brand/contact/bio/website và logo khi có cột |
| GET/POST `/api/organizer/profile/legal-requests` | Pending từ application.pending_legal_changes; lịch sử duyệt/từ chối qua audit_logs; field NOT NULL được giữ |
| GET `/api/admin/organizer-profile-requests`, POST `/:id/review` | ADMIN-only; cập nhật business_name/tax_id_or_business_license sau duyệt, brand trong lúcpending không mất |
| GET/POST `/api/organizer/team` | Aggregate event_checkin_staff theo user; POST bắt buộc eventId/email và dùng Booking.inviteStaff/notification cũ |
| GET `/api/organizer/team/:userId/events` | Các phân công hiện có thuộc eventowner; không membership độc lập |
| DELETE `/api/organizer/team/:userId/events/:staffId`, DELETE `/api/organizer/team/:userId` | Thu hồi một/tất cả phân công thuộcBTC qua workflow cũ; không xóa user |
| GET `/api/me/checkin-assignments`, POST `/api/me/checkin-invitations/:id/respond` | Routes cũ recipient, không route/lời mời cấp tổ chức mới |
| GET `/api/organizer/profile/stats`, GET `/api/organizer/search` | Aggregate owner-scoped qua Event/Order public interfaces, không đổi schema |

Route/page/API public và fieldđại diện/consent đã gỡ theo lựa chọn người dùng; không gán lại người liên hệ thành đại diện. Admin review mới vẫn API-only, chưa có AdminUI tích hợp; audit history riêng theo user. ETag là SHA256 dữ liệu, không tạo cột version/updated_at. Không giả trạng thái presence/KYC.

### Kết luận bàn giao source

**B11 source ĐẠT CÓ ĐIỀU KIỆN**, giới hạn full regression QR không ổn định và accessibility/browserkhác chưa đầy đủ; runtime **CHƯA TRIỂN KHAI theo yêu cầu**. Supabase không đổi schema hoặc dataB11. Tài khoản organizer@example.test đã dùng để đăng nhập/read runtime ở phiên trước; application của tài khoản chưa có nên không tự điền hoặc ghép dữ liệu. Test dùng application được tạo/duyệt trên DB tạm độc lập. Các container test được dừng sau phiên, không restart container API/worker.

Mọi thao tác source/test/docs của phiên nằm trong nhật ký này. Chỉ thay các phần B11 trong MasterPlan, cập nhật report/time, trạng thái hai cột/source; giữ lịch sử báo cáo và sửa đổi người dùng có sẵn.

Chốt **2026-10-31 16:50:12 UTC+7**: đã dừng hai container test và tự xóa bằng --rm; chỉ pbl6-api-1/pbl6-worker-1 giữ nguyên. Kiểm tra liên kết report/plan, UTF-8, đúng2cột và loại bỏ migration/script3bảng đềuPASS; git diff --checkPASS. Không thực hiện thêm thao tác Supabase hoặc runtime rollout.

## Nhật ký55 HTTP kiểm tra cuối (DB tạm)

| # | Case | Method | Path sau /api | HTTP | Code |
|---|---|---|---|---|---|
| 1 | create approved source | POST | `/me/organizer-applications` | 200 | — |
| 2 | approve source | POST | `/admin/organizer-applications/5161168b-71f4-479a-9524-68dd79dd8abc/review` | 200 | — |
| 3 | guest profile | GET | `/organizer/profile` | 401 | UNAUTHORIZED |
| 4 | buyer profile forbidden | GET | `/organizer/profile` | 403 | FORBIDDEN |
| 5 | read original table | GET | `/organizer/profile` | 200 | — |
| 6 | seed account missing application | GET | `/organizer/profile` | 200 | — |
| 7 | missing account cannot create fake application | PATCH | `/organizer/profile` | 409 | PROFILE_REQUIRED |
| 8 | strict legal bypass | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 9 | removed representative rejected | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 10 | removed public setting rejected | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 11 | contact null rejected | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 12 | unsafe URL rejected | PATCH | `/organizer/profile` | 400 | VALIDATION |
| 13 | patch existing fields | PATCH | `/organizer/profile` | 200 | — |
| 14 | stale ETag | PATCH | `/organizer/profile` | 409 | VERSION_CONFLICT |
| 15 | account not overwritten | GET | `/auth/me` | 200 | — |
| 16 | logo unavailable before columns | PATCH | `/organizer/profile` | 409 | FIELD_NOT_AVAILABLE |
| 17 | legal unavailable before columns | POST | `/organizer/profile/legal-requests` | 409 | FIELD_NOT_AVAILABLE |
| 18 | capabilities after two fields | GET | `/organizer/profile` | 200 | — |
| 19 | logo stored on application | PATCH | `/organizer/profile` | 200 | — |
| 20 | request legal change | POST | `/organizer/profile/legal-requests` | 200 | — |
| 21 | pending retains old legal data | GET | `/organizer/profile` | 200 | — |
| 22 | duplicate pending rejected | POST | `/organizer/profile/legal-requests` | 409 | REQUEST_PENDING |
| 23 | request only own user | GET | `/organizer/profile/legal-requests` | 200 | — |
| 24 | organizer cannot approve | POST | `/admin/organizer-profile-requests/46401bea-8be8-4e5d-8e3f-a4e77e9d0290/review` | 403 | FORBIDDEN |
| 25 | edit bio during pending | PATCH | `/organizer/profile` | 200 | — |
| 26 | reject requires reason | POST | `/admin/organizer-profile-requests/46401bea-8be8-4e5d-8e3f-a4e77e9d0290/review` | 400 | REASON_REQUIRED |
| 27 | approve only requested legal fields | POST | `/admin/organizer-profile-requests/46401bea-8be8-4e5d-8e3f-a4e77e9d0290/review` | 200 | — |
| 28 | approved roundtrip | GET | `/organizer/profile` | 200 | — |
| 29 | review cannot repeat | POST | `/admin/organizer-profile-requests/46401bea-8be8-4e5d-8e3f-a4e77e9d0290/review` | 404 | NOT_FOUND |
| 30 | history from audit | GET | `/organizer/profile/legal-requests` | 200 | — |
| 31 | another request | POST | `/organizer/profile/legal-requests` | 200 | — |
| 32 | reject legal request | POST | `/admin/organizer-profile-requests/5ebc8484-ea4e-4cdf-bfce-3da875ebfe95/review` | 200 | — |
| 33 | rejection history | GET | `/organizer/profile/legal-requests` | 200 | — |
| 34 | admin list and history | GET | `/admin/organizer-profile-requests` | 200 | — |
| 35 | fixture category | POST | `/admin/categories` | 200 | — |
| 36 | fixture owned event | POST | `/organizer/events` | 200 | — |
| 37 | fixture foreign event | POST | `/organizer/events` | 200 | — |
| 38 | empty team | GET | `/organizer/team` | 200 | — |
| 39 | team requires event | POST | `/organizer/team` | 400 | VALIDATION |
| 40 | foreign event cannot invite | POST | `/organizer/team` | 403 | FORBIDDEN |
| 41 | reuse event staff invitation | POST | `/organizer/team` | 200 | — |
| 42 | team aggregate | GET | `/organizer/team` | 200 | — |
| 43 | duplicate invitation | POST | `/organizer/team` | 409 | STAFF_EXISTS |
| 44 | existing recipient inbox | GET | `/me/checkin-assignments` | 200 | — |
| 45 | accept existing invitation | POST | `/me/checkin-invitations/c1849c60-6731-42b7-965c-aa2c791adee7/respond` | 200 | — |
| 46 | scan scope active | GET | `/checkin/events/759afba3-b0a6-4eed-9143-9d78f09d5be1` | 200 | — |
| 47 | foreign team empty | GET | `/organizer/team` | 200 | — |
| 48 | foreign cannot revoke | DELETE | `/organizer/team/7623d66a-a67d-44f7-96ff-0eb0f65d9e91/events/c1849c60-6731-42b7-965c-aa2c791adee7` | 403 | FORBIDDEN |
| 49 | revoke event grant | DELETE | `/organizer/team/7623d66a-a67d-44f7-96ff-0eb0f65d9e91/events/c1849c60-6731-42b7-965c-aa2c791adee7` | 200 | — |
| 50 | access removed | GET | `/checkin/events/759afba3-b0a6-4eed-9143-9d78f09d5be1` | 403 | FORBIDDEN |
| 51 | reinvite via existing logic | POST | `/organizer/team` | 200 | — |
| 52 | revoke all own grants | DELETE | `/organizer/team/7623d66a-a67d-44f7-96ff-0eb0f65d9e91` | 200 | — |
| 53 | list revoked assignment | GET | `/organizer/team/7623d66a-a67d-44f7-96ff-0eb0f65d9e91/events` | 200 | — |
| 54 | stats existing schema | GET | `/organizer/profile/stats` | 200 | — |
| 55 | search scoped empty | GET | `/organizer/search?q=empty` | 200 | — |
