# B11 — Đề xuất thay đổi DB chờ xác nhận

> **PHƯƠNG ÁN CŨ ĐÃ RÚT LẠI.** Người dùng yêu cầu dùng organizer_applications/event_checkin_staff và đã từ chối áp dụng Supabase lúc này. Ba bảng bên dưới chỉ là lịch sử đề xuất, không được áp dụng. Nguồn mới: [B11_ExistingTablesPlan.md](B11_ExistingTablesPlan.md).

> **Cập nhật triển khai:** sau đó người dùng đã yêu cầu rolloutSupabase. Đã áp dụng phương án **hai cột trên bảng hiện có**, không phải ba bảng trong tài liệu này. Kết quả và quyền tạo/dọn fixtureTEST: [report runtime](../reports/stitch/B11_20261031_170011_runtime_rollout.md).

Lập lúc **2026-10-31 15:53:18 UTC+7**. Trạng thái: **ĐÃ ĐƯỢC DUYỆT schema và DB test tạm riêng; DB runtime8000 chưa được duyệt áp dụng**.

Người dùng đã xác nhận trong chat: chỉ giữ đội ngũ BTC và phân công check-in, bỏ Finance/override/giải ngân; pháp nhân/mã thuế/đại diện phải tái duyệt. Đã cho phép viết migration ba bảng và tạo/sửa/xóa fixtures trên DB tạm riêng. Bản triển khai thu hẹp role membership thành `CHECKIN_STAFF` duy nhất, owner lấy từ chủ thể; không có quyền điều phối mở rộng. Chưa có xác nhận chạy migration hoặc sửa dữ liệu B11 trên DB đang phục vụ localhost8000.

Nguồn: [kế hoạch B11](Feature_B11_OrganizerProfile.md), schema/routes/source đã đọc, đăng nhập local bằng tài khoản người dùng cung cấp. GET profile/applications/events đều200. Tài khoản `organizer@example.test` có role USER/ORGANIZER,20 sự kiện (DRAFT3, PENDING_REVIEW1, PUBLISHED12, REJECTED4), **không có organizer application**. Không thể tự khởi tạo pháp nhân từ application cho tài khoản này.

## 1. Thay đổi cấu trúc đề xuất

Các bảng mới thuộc Auth; bảng cũ không bị xóa/đổi tên. FK không cascade xóa dữ liệu. Ownership allowlist và migration manifest được cập nhật cùng code sau khi được duyệt.

### organizer_profiles

| Cột | Kiểu/ràng buộc | Mục đích |
|---|---|---|
| owner_id | UUID PRIMARY KEY, FK users.idUser | Một hồ sơ trên tài khoản Organizer hiện tại |
| source_application_id | UUID nullable, FK organizer_applications.id | Truy vết nguồn được duyệt, không sửa application cũ |
| organization_name | varchar(200), nullable trong nháp | Tên thương hiệu |
| business_name | varchar(200), nullable | Tên pháp nhân |
| tax_id_or_business_license | varchar(100), nullable | Thuế/ĐKKD |
| legal_representative_name | varchar(150), nullable | Người đại diện pháp luật; không tự lấy contactName |
| contact_name | varchar(150), nullable | Người liên hệ |
| contact_email | varchar(320), nullable | Email tổ chức; không sửa account email |
| contact_phone | varchar(30), nullable | Hotline |
| head_office_address | varchar(500), nullable | Trụ sở |
| description | text, tối đa4000 | Không cắt mất bio đã có từ application; UI đếm theo giới hạn thực |
| website_or_social | varchar(500), nullable | URL website được validate |
| logo_url | text, nullable | Logo tổ chức độc lập avatar cá nhân |
| slug | varchar(250), UNIQUE, nullable khi chưa công khai | URL công khai; tạo từ tên và hậu tố chống trùng khi lưu |
| is_public | boolean NOT NULL DEFAULT false | Công khai theo lựa chọn rõ ràng, không tự lộ hồ sơ |
| version | integer NOT NULL DEFAULT1 | Khóa lạc quan, PATCH version sai trả409 |
| created_at / updated_at | timestamptz NOT NULL DEFAULT now() | Mốc thời gian thật |

Không thêm cờ KYC/Tier1 giả. GET không tạo record. Chưa có profile thì trả cấu trúc nháp cùng nguồn application APPROVED nếu tồn tại; thiếu thì để trống. Chỉ PATCH rõ ràng mới lưu. Public API whitelist tên/bio/logo/website, không trả thuế, hotline riêng, địa chỉ pháp lý hoặc team.

### organizer_team_members

| Cột | Kiểu/ràng buộc | Mục đích |
|---|---|---|
| id | UUID PRIMARY KEY | ID membership |
| owner_id | UUID FK users.idUser | BTC sở hữu đội ngũ |
| user_id | UUID FK users.idUser | Thành viên đã có tài khoản |
| role | varchar, CHECK theo phạm vi được chốt | Điều phối/check-in; chưa cấp Finance/override/giải ngân |
| status | CHECK PENDING/ACTIVE/DECLINED/REVOKED | Trạng thái lời mời, không đồng nghĩa online/offline |
| invited_at / expires_at | timestamptz | Mời có hạn7 ngày |
| responded_at / revoked_at | timestamptz nullable | Audit vòng đời |
| version | integer DEFAULT1 | Chống ghi đè khi chỉnh quyền |
| UNIQUE(owner_id,user_id) | unique | Mời lại dùng record hiện có, không tạo trùng |
| CHECK(owner_id <> user_id) | check | Owner lấy từ chủ thể, không phải membership có thể bị xóa |

Không cấp global role ORGANIZER cho thành viên. Quyền quét vẫn được phân công vào `event_checkin_staff` của đúng sự kiện qua workflow/API hiện có, không UPDATE/DELETE trực tiếp bảng này từ Auth. Không sửa trạng thái lời mời thành ACTIVE trước khi người nhận chấp nhận. Thu hồi membership phải xác định ảnh hưởng tới phân công event trong contract trước khi triển khai.

### organizer_profile_change_requests — chỉ khi chọn tái duyệt pháp nhân

`id UUID PK`, `owner_id UUID FK users.idUser`, `base_version integer`, `requested_changes jsonb` (whitelist businessName/taxIdOrBusinessLicense/legalRepresentativeName), `status` PENDING/APPROVED/REJECTED, `reason text nullable`, `reviewed_by UUID nullable`, `created_at/reviewed_at timestamptz`; mỗi owner chỉ một request PENDING. Duyệt bằng ADMIN, kiểm tra version và audit trong cùng transaction. Tên pháp nhân đang công khai giữ bản cũ đến khi duyệt. Nếu người dùng chọn sửa trực tiếp pháp nhân, không tạo bảng này.

## 2. Thao tác dữ liệu đề xuất

1. **DB test tạm riêng:** tạo PostgreSQL local với database kết thúc `_test`, chạy migrations, thêm fixtures tổng hợp profile/team/user/event; test PATCH/update/soft revoke/review chỉ ở DB tạm. Dừng/xóa đúng container test sau khi kiểm tra. Không dùng Supabase làm fixture.
2. **DB đang phục vụ cổng8000:** chỉ áp dụng DDL sau xác nhận riêng. Không backfill hàng loạt, không đổi các users/applications/events/orders/tickets/payments hiện có. Không chạy seed/demo payment. GET profile không tự INSERT.
3. **Tài khoản organizer@example.test:** chỉ lưu thông tin tổ chức sau khi có giá trị do người dùng xác nhận hoặc sau khi được phép round-trip cùng giá trị. Không bịa thuế/pháp nhân. Test mật khẩu đổi sang giá trị khác rồi hoàn nguyên cần đồng ý riêng vì thu hồi các phiên; hiện chỉ dùng thông tin đăng nhập đã được chỉ định.
4. Không DELETE dữ liệu nghiệp vụ. Thu hồi thành viên là UPDATE status=REVOKED. Không viết migration down để xóa bảng.

Đăng nhập đã được cho phép theo yêu cầu dùng tài khoản test; backend tạo phiên xác thực theo cơ chế sẵn có. Chưa gọi PATCH profile, POST staff/password/media hoặc API ghi nghiệp vụ trên runtime8000.

## 3. Phạm vi API đề xuất

- GET/PATCH `/api/organizer/profile`; GET `/api/organizer/profile/stats`.
- GET `/api/organizers/:slug` và trang public tương ứng; chỉ trả hồ sơ đã cho phép công khai.
- GET/POST/PATCH/DELETE `/api/organizer/team` theo đúng route memberId; endpoint người nhận chấp nhận/từ chối lời mời.
- Nếu chọn tái duyệt: POST/GET yêu cầu đổi pháp nhân, ADMIN review; chỉ backend nghiệp vụ, không sửa các màn admin đã có ngoài phạm vi được duyệt.
- Aggregate và tìm kiếm dùng public interface từng owner, không JOIN chéo Auth/Event/Order. Không cần thay schema cũ cho thống kê/tìm kiếm.
- Finance/override/giải ngân, presence, KYC và control2FA cần phạm vi nghiệp vụ riêng; UI giữ vị trí thiết kế và hiển thị rõ phần chưa hỗ trợ nếu người dùng chọn phiên bản phù hợp backend hiện tại.

## 4. Điểm cần xác nhận

- Cho phép tạo migration với các bảng trên theo lựa chọn nghiệp vụ, chạy trên DB test tạm và thêm/sửa/thu hồi fixtures tại đó.
- Sau khi code/test và migration được đưa ra xem xét: xác nhận riêng việc chạy trên DB đang phục vụ local8000.
- Chốt team/RBAC và chính sách đổi pháp nhân ở các câu hỏi của phiên.

Nhật ký phiên nằm trong [report triển khai/chờ DB](../reports/stitch/B11_20261031_155318_implementation_preflight.md).

## 5. Nội dung áp dụng runtime đang chờ xác nhận

Đã kiểm tra chỉ đọc từ container `pbl6-api-1`: API `localhost:8000` dùng **Supabase**, host `aws-0-ap-south-1.pooler.supabase.com`, database `/postgres`, TLS bật. Đây không phải PostgreSQL tạm trên máy. Lịch sử hiện có InitialMvp/EventCheckinStaff/Notifications/WaitQueue/SepayLiveFoundation; **chưa có cả ba bảng B11**. Chưa thay đổi schema/dữ liệu runtime.

Bản migration cụ thể: [OrganizerProfiles1793433600000.ts](../../server/src/migrations/OrganizerProfiles1793433600000.ts). Script chạy riêng [migrate-organizer-profile.cjs](../../server/scripts/migrate-organizer-profile.cjs), mặc định chỉ kiểm tra; `--apply-b11` chỉ nạp migration B11, tránh áp dụng migration khác đang pending. Chạy trong transaction, không backfill, không thay đổi bảng users/applications/events/orders/payments; chỉ tạo ba bảng/index/FK/constraint và ghi một dòng lịch sử migration. Không migration down/xóa bảng.

Sau xác nhận runtime: chép các JS đã build của B11 vào chính API container, chạy script B11 bằng env đang có của container, restart API rồi kiểm tra health/login/GET profile/team/stats/legal-requests/search. Worker giữ nguyên. Không tự tạo dữ liệu pháp nhân, không gọi PATCH/POST team/password/media với tài khoản đang dùng; mutation đã kiểm thử ở DB tạm. Việc restart là cập nhật local container, image gốc chưa được rebuild nên recreate từ image cũ sẽ mất bản code cập nhật tại chỗ. Có thể khôi phục JS cũ từ bản sao trước rollout; ba bảng bổ sung không bị xóa khi khôi phục code.

Code/source đã hoàn tất theo phạm vi duyệt; backend75 tests PASS/2 skip, B11 HTTP90checks và Chrome4viewport PASS; còn bước runtime DB/rollout cần xác nhận riêng trong chat.
