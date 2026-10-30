# Báo cáo P7-02 — migration draft an toàn sau inventory

**Thời điểm:** 29/10/2026, 22:07 UTC+7  
**Trạng thái:** Hoàn thành bản SQL review-only; chưa chạy trên database nào.  
**Phạm vi:** Chuyển local migration thành đề xuất DDL phù hợp schema inventory; xử lý default ACL/RLS phát hiện ở P7-01. Không kết nối DB trong bước này.

## Artifact tạo mới

- [SQL migration draft — REVIEW ONLY](20261029_220700_p7_sepay_additive_migration_review.sql)

Draft có một transaction, `lock_timeout=2s`, `statement_timeout=30s`, tạo ba bảng SePay cùng FK/index/check/unique constraints; chỉ thay đổi object mới.

## Điều chỉnh sau inventory

P7-01 xác nhận không có collision tên, các FK UUID tương thích, nhưng default ACL public của role tạo bảng cấp toàn quyền cho `anon`, `authenticated`, `service_role`; các bảng public được rà soát không bật RLS. Vì vậy draft:

- Bật RLS trên riêng ba bảng SePay mới, không thêm policy cho client roles.
- Revoke toàn quyền `PUBLIC`, `anon`, `authenticated`, `service_role` trên riêng ba bảng này.
- Không đổi default privileges toàn schema, quyền/RLS bảng cũ, data hiện hữu hoặc Supabase API settings.
- Giữ backend direct connection dùng role owner đã quan sát; owner có thể thực hiện workflow server-side. Nếu production đổi sang runtime role ít quyền hơn, phải thiết kế và review grant tối thiểu trước khi apply.

RLS/grants được đặt trong cùng transaction với `CREATE TABLE`, tránh trạng thái commit trung gian có quyền mặc định rộng. Khi apply cần xác nhận runner thực thi migration trong transaction và target roles tồn tại; nếu một điều kiện không đúng phải dừng thay vì bỏ qua revoke.

## Kiểm tra và tiêu chí chưa đạt

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| So khớp tên bảng/index với inventory P7-01 | PASS theo metadata read-only | Không collision. |
| FK key type | PASS theo metadata | `payments.id uuid`, `users.idUser uuid`. |
| Data/API cũ trong DDL | PASS theo review | Không có UPDATE/DELETE/ALTER bảng cũ. |
| RLS + grants trên bảng mới | Đã đưa vào draft | Cần test quyền allow/deny trên clone trước apply. |
| SQL parser/build | NOT RUN | Chưa chạy parser hoặc migration. |
| Local disposable migration test | NOT RUN | Không ghi DB trong bước này; cần bước riêng được giao. |
| Backup/restore và clone rehearsal | NOT RUN | Chưa được phép thao tác backup/clone. |
| Supabase DDL | NOT RUN | Người dùng chỉ cho phép inventory read-only; draft tuyệt đối không được chạy. |

## Rủi ro/giới hạn cần duyệt

- Đây là draft dựa trên schema inventory lúc 22:05 UTC+7; schema có thể thay đổi trước apply.
- `REVOKE` giữ cả `service_role` ngoài Data API. Điều này đúng với luồng backend hiện dùng direct PostgreSQL owner connection; phải xác minh lại nếu kiến trúc production khác.
- `lock_timeout`/`statement_timeout` là giá trị đề xuất, cần đo và review trên clone.
- `down()` không được đề xuất drop tables sau khi đã nhận payment; rollback mặc định giữ bảng/dữ liệu và rollback code.
- Chưa có backup/restore proof nên chưa thể bảo đảm tuyệt đối không xung đột.

## Bước tiếp theo cần tách quyền

Có thể tiếp tục review/test draft trên disposable PostgreSQL local, không dùng Supabase. Trước bất kỳ backup/clone operation nào ở Supabase cần phạm vi cho phép riêng; trước DDL cần phê duyệt cụ thể sau khi có backup restore proof và kết quả clone rehearsal. Hiện P7 dừng tại review-only draft, chưa apply.
