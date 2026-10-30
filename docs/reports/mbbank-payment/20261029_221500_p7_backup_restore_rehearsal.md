# Báo cáo P7 — backup `public` Supabase và khôi phục thử cô lập

**Thời điểm:** 29/10/2026, 22:15 UTC+7  
**Quyền:** Người dùng cho phép tạo backup Supabase và kiểm tra khôi phục trên môi trường cô lập. Không bao gồm áp dụng migration hoặc khôi phục lên Supabase.  
**Kết quả:** PASS backup và restore thử đối với schema ứng dụng `public`; chưa phải bản khôi phục toàn bộ dịch vụ Supabase.

## Backup

- Nguồn: Supabase pooler được cấu hình cho ứng dụng, database `postgres`, schema `public`. Kết nối TLS `verify-full` với CA; không ghi credential vào report.
- `pg_dump` PostgreSQL 18.3 dùng custom format, `--schema=public`, `--lock-wait-timeout=10000`. Snapshot nhất quán theo `pg_dump`; kiểm tra source sau dump nằm ở thời điểm khác.
- Backup được mã hóa trực tiếp khi ghi bằng AES-256-GCM; không tạo file dump plaintext. Khóa 256 bit được bảo vệ bằng Windows DPAPI `CurrentUser`; thư mục ngoài Git giới hạn ACL cho tài khoản Windows hiện tại và SYSTEM.
- Vị trí: `D:\Nam4Ky1\PBL6\Backups\supabase\`. Artifact: `eventhub-public-20261029.dump.aesgcm`, `eventhub-public-20261029.key.dpapi`, `eventhub-public-20261029.metadata.json`.
- Kích thước archive mã hóa 158144 byte; SHA-256 `2c8e64f9b578f066a1bf4fba10a862e695fae8327f6e1230874b4524178f28ca`; hoàn thành 15:13:58 UTC / 22:13:58 UTC+7.
- DPAPI gắn với tài khoản Windows hiện tại: sao chép file key sang máy/tài khoản khác không bảo đảm giải mã được. Chưa tạo bản sao khóa di động hoặc kiểm tra khôi phục trên máy khác; mất profile/khóa Windows có thể làm backup không dùng được.

## Khôi phục thử

Container riêng `eventhub-p7-restore-20261029`, image `postgres:17-alpine`, DB/user `p7_restore`, chỉ bind `127.0.0.1:55433`; không dùng container/database local SePay đang phục vụ test. Trước ghi, script kiểm tra tên, label, image, container chạy, bind loopback/port, DB/user và major version 17. Database thử được xác nhận rỗng.

1. Xác thực SHA-256 và AES-GCM thành công bằng khóa DPAPI; dữ liệu giải mã chỉ nằm trong bộ nhớ tiến trình và được chuyển qua stdin cho `pg_restore`.
2. Lần đầu `pg_restore --exit-on-error` dừng vì PostgreSQL mới đã có schema `public` mặc định, trong khi archive chứa lệnh tạo schema. Kiểm tra container/DB đích và xác minh `public` rỗng, sau đó chỉ xóa schema rỗng trong DB thử; chạy lại restore thành công.
3. Restore dùng `--no-owner --no-acl` vì role Supabase không tồn tại trong container. Vì vậy đây là kiểm tra schema/data, **không kiểm chứng việc khôi phục owner, grants hoặc RLS policy behavior tương đương Supabase**.
4. Hai transaction read-only so sánh nguồn và bản restore: 24/24 tên bảng `public` trùng, 252/252 metadata cột so sánh trùng (tên, kiểu, nullability, độ dài), số dòng 24/24 bảng trùng tại lúc kiểm tra. Không ghi nội dung hàng vào báo cáo. Số dòng bằng nhau không chứng minh toàn bộ giá trị dữ liệu, index/constraint/sequence hoặc quyền trùng nhau.

Container thử hiện chứa dữ liệu thật từ schema ứng dụng. Cổng chỉ bind loopback và container có label riêng; giữ lại để phục vụ kiểm tra đã cho phép. Cần xóa/retention theo quyết định vận hành sau khi hoàn tất; không tự xóa trong phiên này.

## Đánh giá và giới hạn

| Tiêu chí | Kết quả |
|---|---|
| `pg_dump` `public` thành công, archive mã hóa | PASS; SHA-256 và xác thực AES-GCM PASS. |
| Restore vào PostgreSQL 17 local cô lập | PASS sau khi xử lý schema `public` rỗng trong DB thử. |
| So sánh số bảng, cột, số dòng | PASS ở thời điểm đối chiếu; 24 bảng, 252 cột, không lệch số dòng. |
| Khôi phục ACL/owner/grants/policies | NOT TESTED; rehearsal cố ý dùng `--no-owner --no-acl`. |
| Backup toàn bộ Supabase | NOT COVERED: không bao gồm schema `auth`, `storage`, object storage, global roles, cấu hình project, realtime, secrets, PITR hoặc WAL. |
| Restore lên Supabase | NOT RUN; chưa được cho phép. |
| Bằng chứng backup độc lập/khôi phục trên máy khác | NOT RUN; khóa DPAPI phụ thuộc profile Windows hiện tại. |

## Phương án khi migration thất bại

1. Migration additive phải chạy trong transaction; nếu DDL lỗi trước commit, PostgreSQL rollback transaction. Xác minh migration history/object và lock sau lỗi; không tự chạy lại.
2. Nếu code mới lỗi sau migration đã commit, dừng tạo payment SePay mới, giữ webhook/inbox và các bảng SePay, rollback code/routing tương thích; đối soát giao dịch đang bay. Không drop bảng hoặc ghi đè data cũ.
3. Nếu cần phục hồi dữ liệu/schema, dừng ghi và xác định RPO/RTO, thời điểm backup, các giao dịch phát sinh sau backup và ảnh hưởng auth/storage. Phương án ưu tiên là Supabase backup/PITR được xác minh phù hợp hoặc restore chọn lọc sau khi đối chiếu trên môi trường cách ly. Không tự `pg_restore --clean` lên DB đang hoạt động: có thể xóa dữ liệu hoặc mất giao dịch sau thời điểm backup.
4. File `public` mã hóa này là một phương án bổ sung cho dữ liệu ứng dụng, không thay thế Supabase full backup/PITR. Trước mọi restore thực lên Supabase cần xác minh backup, owner/ACL/dependencies, phương án merge dữ liệu mới, thời gian downtime và phê duyệt thao tác cụ thể.

## Lệnh và sự cố

- `pg_dump --format=custom --schema=public --no-password --lock-wait-timeout=10000`: PASS, source read-only; stream mã hóa.
- `pg_restore --dbname=p7_restore --no-owner --no-acl --exit-on-error`: lần đầu FAIL `schema public already exists`; lần hai PASS sau khi xác minh và xóa schema rỗng chỉ trong DB thử.
- So sánh catalog và số dòng: PASS như trên, dùng read-only transaction trên source và restore.
- Lỗi cú pháp helper backup xảy ra trước khi chạy dump; đã sửa và chạy lại thành công. Không có partial archive từ lần lỗi cú pháp.

Chưa áp dụng migration, thay dữ liệu Supabase, vô hiệu hóa API cũ hoặc chuyển SePay Live.
