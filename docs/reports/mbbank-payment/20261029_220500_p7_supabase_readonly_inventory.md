# Báo cáo P7-01 — inventory Supabase chỉ đọc

**Thời điểm:** 29/10/2026, 22:05 UTC+7  
**Trạng thái:** Inventory read-only hoàn tất; chưa backup, không DDL, chưa migration/cutover.  
**Ủy quyền:** Người dùng cho phép chỉ inventory read-only; P4 đã đóng trước khi bắt đầu.  
**Phạm vi dữ liệu:** Chỉ metadata schema, constraint/index, migration history, ACL/RLS/default privileges. Không truy vấn hàng nghiệp vụ hoặc giá trị customer/payment.

## Xác minh đích và chế độ kết nối

- Dùng `DATABASE_URL` từ `server/.env` do người dùng chỉ định là cấu hình Supabase của ứng dụng. Đích nhận diện là Supabase pooler ở khu vực AP South, database `postgres`, schema `public`; project ref và role được mask, credential không in.
- TLS `verify-full`; CA file local hiện diện và được nạp; hostname được kiểm chứng. Không dùng SSL tắt hoặc bỏ xác thực chứng chỉ.
- Tạo kết nối PostgreSQL trực tiếp bằng client riêng, không chạy API/worker hay migration runner chung.
- Mọi truy vấn nằm trong `BEGIN TRANSACTION READ ONLY`; `transaction_read_only=on` được xác nhận, kết thúc bằng `ROLLBACK`. Không có lệnh ghi.

## Inventory schema và migration history

| Hạng mục | Kết quả |
|---|---|
| PostgreSQL/database | PostgreSQL 17.11; database `postgres`; schema hiện hành `public`. |
| Tables | 24 bảng trong schema `public`; inventory metadata thấy 63 bảng trong các schema ứng dụng/Supabase không thuộc system catalogs. Không đọc hàng dữ liệu. |
| Các bảng SePay mục tiêu | Không tồn tại `sepay_payment_details`, `sepay_transactions`, `sepay_transaction_reviews` trong `public` hoặc schema khác được kiểm tra. |
| Tên index SePay | Không có collision cho các index local dự kiến: `sepay_transactions_work_idx`, `_payment_idx`, `_code_idx`, `_received_idx`, `sepay_reviews_transaction_idx`. Tổng object-name collision bằng 0. |
| Migration history `public.migrations` | Bốn migration: `InitialMvp1790812800000`, `EventCheckinStaff1791072000000`, `Notifications1791331200000`, `WaitQueue1792627200000`. Không có migration SePay. |
| Khóa cha | `public.payments.id uuid NOT NULL`; `public.users."idUser" uuid NOT NULL`. Cùng kiểu với hai FK từ local SePay migration. |
| DB role capabilities | Schema/database CREATE và REFERENCES trên hai bảng cha hiện trả true cho role cấu hình; role không phải superuser. Đây là metadata quyền, không phải cho phép sử dụng quyền đó. |

P1 baseline 4 migration khớp migration history quan sát được theo tên/timestamp. Không phát hiện conflict cấu trúc với ba tên bảng và các index dự kiến. Điều này hỗ trợ tính khả thi kỹ thuật của migration additive, nhưng không bảo đảm lock-free hoặc thay thế backup/restore test.

## Phát hiện bảo mật ảnh hưởng trực tiếp tới thiết kế migration

Read-only metadata cho thấy:

- Các bảng ứng dụng được rà soát (`users`, `payments`, `orders`, `tickets`, `payment_notifications`, `notifications`, `audit_logs`, `migrations`) hiện `relrowsecurity=false`; không có policy RLS cho các bảng này.
- Default privileges cho bảng mới trong `public` do role `postgres` tạo cấp toàn bộ privileges cho `anon`, `authenticated`, `service_role`; gồm SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER và `MAINTAIN` trên PostgreSQL 17.
- ACL của các bảng core được rà soát cũng cho thấy các API roles có full table privileges. Không đọc dữ liệu rows. Chưa kiểm tra cấu hình Supabase Dashboard về schema thực sự được bật trong Data API, nên **không kết luận endpoint bên ngoài hiện có thể truy cập**.

Supabase docs nói grants và RLS là hai lớp riêng; bảng trong schema exposed không có RLS và được grant sẽ đọc/ghi theo quyền đó. Họ cũng mô tả mặc định của một số project cấp quyền đầy đủ cho `anon`/`authenticated`/`service_role` trên bảng mới public. Xem [RLS và grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [bảo vệ Data API](https://supabase.com/docs/guides/api/securing-your-api), [default privileges Supabase](https://supabase.com/kb/troubleshooting/cant-change-the-default-privileges-of-supabase_admin-in-the-public-schema).

**Hệ quả:** Không thể dùng nguyên local migration hiện tại trên Supabase. Bản local tạo bảng SePay nhưng chưa bật RLS/revoke grants. Nếu được phép triển khai về sau, migration production mới phải tạo ba bảng, bật RLS và revoke quyền `anon`, `authenticated`, `service_role` (và `PUBLIC` nếu có grant) trên riêng các bảng SePay; backend đang dùng direct PostgreSQL connection và owner role nên vẫn thao tác được. Không thay global default privileges, không sửa ACL/RLS của bảng cũ trong migration SePay. Nếu production backend chuyển sang một role khác owner, cần thiết kế grant tối thiểu riêng trước khi deploy.

Đây là blocker bảo mật cho mọi DDL SePay vào `public` cho đến khi migration được cập nhật và kiểm thử allow/deny. Không tự sửa cấu hình RLS/ACL hiện có vì điều đó nằm ngoài phạm vi và có thể ảnh hưởng ứng dụng đang chạy.

## Đánh giá xung đột và tác động dữ liệu

| Câu hỏi | Kết luận hiện có |
|---|---|
| Tên bảng/index SePay trùng object hiện hữu? | Không, inventory catalog cho kết quả 0. |
| Kiểu FK có tương thích với schema hiện tại? | Có theo metadata: hai PK là UUID. |
| Migration history có baseline khác source? | Không thấy khác theo bốn tên/timestamp đã xác minh; migration SePay chưa được ghi nhận. |
| Có chạy DDL hoặc thay dữ liệu hiện có? | Không. Transaction read-only; không đọc row nghiệp vụ. |
| Có thể cam kết không xung đột dữ liệu? | Chưa thể cam kết tuyệt đối; chưa có backup/restore-test, migration trên clone, đo lock hoặc xác minh cấu hình Data API. Tuy nhiên chưa thấy xung đột tên/kiểu ở inventory hiện tại. |
| Sẵn sàng apply? | Không. Chỉ có quyền inventory read-only; còn blocker RLS/grants và chưa có backup/restore evidence/ủy quyền DDL. |

## Kiểm thử/an toàn và giới hạn

- PASS: đúng host pattern Supabase pooler từ app config; TLS verify-full + CA validation; database/schema đúng; `transaction_read_only=on`.
- PASS: catalog queries cho tables/columns/constraints/indexes/migration history/ACL/RLS/default privileges.
- PASS: transaction đóng bằng ROLLBACK; không query business rows; không chạy API/worker/migrate.
- Một truy vấn tổng hợp metadata đầu tiên lỗi GROUP BY; connection đóng khi transaction read-only, sau đó truy vấn sửa được chạy thành công. Không có tác động dữ liệu.
- NOT RUN: backup/export, restore, clone migration, lock test, Supabase Data API settings, DDL, smoke test, cutover hoặc Live.

## Bước kế tiếp

1. Cập nhật migration production draft với RLS enabled và explicit revokes trên riêng ba bảng SePay; giữ migration local/runner hiện tại nguyên trạng cho tới khi có quyết định triển khai rõ ràng.
2. Thử draft trên DB disposable local và một bản sao tương thích được phép; kiểm thử quyền `anon/authenticated/service_role` bị từ chối, role backend trực tiếp vẫn hoạt động.
3. Xin phê duyệt riêng cho backup/restore-test và DDL. Phạm vi read-only đã cấp không bao gồm backup, tạo clone, ghi migration, thay RLS/grants hoặc deploy/cutover.

Không có thay đổi data Supabase, không có thay đổi API cũ, không có SePay Live operation.
