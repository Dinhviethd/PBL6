# B11 — Dùng lại các bảng hiện có

Thời điểm khảo sát: **2026-10-31 16:30:45 UTC+7**. Cập nhật mới nhất: người dùng đã yêu cầu áp dụng Supabase và giao diện thật; migration hai cột đã chạy thành công, B11 runtime đã triển khai/kiểm thử. Phương án ba bảng mới vẫn bị rút lại. [Report rollout](../reports/stitch/B11_20261031_170011_runtime_rollout.md).

**Quyết định:** bỏ `legal_representative_name` và `is_profile_public`. Chỉ thêm `logo_url` và `pending_legal_changes` trên bảng hiện có; đã kiểm thử DB tạm và sau đó áp dụng Supabase theo yêu cầu tiếp theo. Không thêm cột version, membership hoặc bảng mới. Báo cáo source: [B11 reuse implementation](../reports/stitch/B11_20261031_164427_existing_tables_implementation.md); kết quả thực tế theo report rollout ở trên.

## Nguồn dữ liệu đã xác minh

`organizer_applications` trên DB đang dùng đã có organization_name, contact_name/email/phone, description, business_name, tax_id_or_business_license, website_or_social, head_office_address, main_event_category, expected_event_scale, status và các trường xét duyệt. Có unique index một APPROVED và một PENDING trên mỗi user. Có một hồ sơ APPROVED và một REJECTED; riêng tài khoản organizer@example.test không có application liên kết. Không sử dụng application thuộc user khác.

`event_checkin_staff` đã có event_id/user_id, tên/email snapshot, PENDING/ACTIVE/DECLINED/REVOKED, hạn lời mời7ngày, thời gian phản hồi/thu hồi và unique(event_id,user_id). Luồng hiện có đã gửi notification, kiểm quyền owner/event, nhận/từ chối và thu hồi, đồng thời scanner kiểm quyền theo từng sự kiện.

## Thực hiện không cần đổi schema

- GET B11 lấy application APPROVED thuộc chủ thể; không tạo bảng/profile mới, không GET tự INSERT.
- PATCH brand/bio/website/contact cập nhật đúng các cột đã có trên application đó; audit thay đổi qua audit_logs. Chưa có hồ sơ thì báo thiếu dữ liệu, không bịa dữ liệu pháp nhân.
- Optimistic concurrency dùng ETag SHA-256 từ application và dữ liệu hồ sơ; không cần thêm cột version hoặc updated_at.
- Team B11 là tổng hợp event_checkin_staff qua các events thuộc BTC, gom theo user_id và hiển thị từng phân công/trạng thái. Không tạo membership hoặc lời mời cấp tổ chức độc lập.
- Thêm nhân sự: chọn event và email rồi dùng POST staff hiện có; người nhận chấp nhận qua checkin-assignments/checkin-invitations hiện có. Thu hồi một event dùng DELETE staff hiện có; thu hồi tất cả chỉ điều phối các grants thuộc đúng BTC.
- KPI/search vẫn dùng public interfaces Event/Order, không cần thêm cột/bảng.
- Đã bỏ public profile route/CTA/consent khỏi bản triển khai điều chỉnh; không tự công khai hồ sơ application.

## Hai cột bổ sung đã chốt cho source và DB tạm

Chỉ đề xuất bổ sung vào **organizer_applications**, không tạo bảng mới hoặc sửa event_checkin_staff:

| Cột | Kiểu / mặc định | Lý do cần |
|---|---|---|
| logo_url | text NULL | Logo tổ chức độc lập avatar cá nhân; bảng hiện chưa có |
| pending_legal_changes | jsonb NULL | Lưu một yêu cầu sửa tên pháp nhân/mã thuế cùng requestId, giá trị đề xuất, dấu vết phiên bản gốc và requestedAt; giữ dữ liệu đang duyệt nguyên vẹn |

Lịch sử duyệt/từ chối lấy từ audit_logs sẵn có, không tạo organizer_profile_change_requests. Khi ADMIN duyệt, cập nhật business_name/tax_id_or_business_license trong application APPROVED, xóa giá trị pending vềNULL và ghi audit trong cùng transaction. Không có trường người đại diện pháp luật, không đổi ngữ nghĩa contact_name. Không gán KYC/Tier từ trạng thái APPROVED. Thay đổi brand trong lúc chờ duyệt không được ghi đè pháp nhân; kiểm fingerprint pháp nhân gốc khi duyệt.

Không dùng một application mới cho mỗi lần sửa pháp nhân rồi APPROVED lần nữa vì unique index hiện tại chỉ cho một APPROVED/user. Không đổi status của hồ sơ đã duyệt chỉ để né constraint; pendingJSON là phần bổ sung nhỏ nhất cho luồng tái duyệt được yêu cầu.

Khi DB chưa có hai cột: source hỗ trợ đọc/sửa các cột hiện có và team theo event, khóa logo/tái duyệt. Migration [OrganizerApplicationProfile1793437200000.ts](../../server/src/migrations/OrganizerApplicationProfile1793437200000.ts) chỉ ALTER TABLE thêm hai cột nullable; không tạo bảng, không backfill, không thay event_checkin_staff. **Đã áp dụng Supabase lúc16:53:53 UTC+7**, hash dữ liệu applicationgốc trước/sau khớp.

## Phạm vi xác nhận

Quyết định trước đây “chưa áp dụng Supabase” đã được thay bằng yêu cầu mới “cập nhật thay đổi Supabase và giao diện B11 thực tế”. Người dùng đồng thời cho phép application TEST B11 riêng cho organizer@example.test và dọn sau test. Đã hoàn thành migration/rollout/kiểm thử/dọn fixture, không thay application thật hoặc staff grants. Mật khẩu không đổi. ADMIN approve/reject và staff mutation thành công chỉ kiểm ở DB tạm; trên runtime kiểm đọc và quyền từ chối.

Report phiên: [B11 existing tables](../reports/stitch/B11_20261031_163045_existing_tables_replan.md).

## Seed demo sau rollout

Ngày 2026-10-31, theo yêu cầu tự điền nội dung và mở B11, đã seed một application cho `organizer@example.test`. Toàn bộ nội dung pháp nhân/địa chỉ/mã số thuế được ghi rõ DEMO; trạng thái APPROVED được seed để trang hiển thị, không phải Admin review hoặc xác minh pháp nhân thật. API GET và Chrome UI đã kiểm tra. Trước nghiệp vụ thật phải thay các giá trị DEMO và hoàn tất duyệt đúng quy trình. [Report seed](../reports/stitch/B11_20261031_230034_demo_application_seed.md).
