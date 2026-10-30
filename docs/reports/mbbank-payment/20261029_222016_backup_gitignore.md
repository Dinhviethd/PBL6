# Báo cáo xác minh backup và cấu hình Git ignore

**Thời điểm:** 29/10/2026, 22:20 UTC+7.

## Phạm vi và kết quả

- Đối chiếu metadata và [báo cáo backup](20261029_221500_p7_backup_restore_rehearsal.md): archive được tạo bằng `pg_dump` từ schema `public` của database Supabase ứng dụng, gồm dữ liệu thực tại thời điểm backup. Restore thử đã khớp số dòng 24/24 bảng, không chứng minh từng giá trị dữ liệu giống nhau. Không bao gồm schema `auth`, `storage`, object storage, global roles hoặc PITR.
- Backup nằm tại `D:\Nam4Ky1\PBL6\Backups\supabase\`, bên ngoài Git root `D:\Nam4Ky1\PBL6\SrcCode\PBL6`. `.gitignore` của repository không áp dụng trực tiếp cho thư mục bên ngoài đó; vị trí hiện tại không thuộc working tree của repository.
- Bổ sung vào `.gitignore`: `Backups/` (bất kỳ thư mục tên này trong repository), `*.dump.aesgcm`, `*.key.dpapi`. Các quy tắc bảo vệ bản sao đưa vào repository trong tương lai, không có tác dụng với file đã được Git theo dõi trước đó hoặc các định dạng backup khác.
- Không di chuyển/copy backup; không truy cập database; không đổi data/API.

## Kiểm tra

`git check-ignore -v --no-index` PASS cho path `Backups/supabase/eventhub-public-20261029.dump.aesgcm`, và hai file mẫu `.dump.aesgcm`, `.key.dpapi` ở thư mục khác trong repository. `git diff --check -- .gitignore` PASS. Đây là kiểm tra rule đối với đường dẫn giả định; không tạo file backup trong repository.
