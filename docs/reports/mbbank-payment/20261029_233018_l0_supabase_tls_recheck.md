# L0: kiểm tra lại Supabase với CA

**Thời điểm:** 29/10/2026 23:30 UTC+7. Bổ sung [báo cáo lần thử trước](20261029_232421_l0_supabase_recheck.md).

## Mục tiêu và phạm vi

Người dùng cung cấp đường dẫn `server/certs/supabase-ca`. Đường dẫn đó không tồn tại trong workspace; tìm thấy `server/.local/certs/supabase-ca.crt` và sử dụng file này làm CA cho client PostgreSQL. Kết nối dùng `DATABASE_URL` từ `server/.env`, chỉ cho phép hostname thuộc Supabase; TLS xác thực chứng chỉ và hostname, không tắt verification. Không in URL, project ref, credentials hoặc dữ liệu nghiệp vụ.

## Kết quả kiểm tra

| Tiêu chí | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| TLS và kết nối | PASS | `node scripts/l0-readonly-check.cjs` exit 0 với CA local và `rejectUnauthorized=true`; lỗi chuỗi TLS ở lần trước được giải quyết cho kết nối này. |
| Chỉ đọc | PASS | `BEGIN TRANSACTION READ ONLY`; `transaction_read_only=on`; chỉ query metadata PostgreSQL, kết thúc `ROLLBACK`. Không query hàng nghiệp vụ. |
| Cấu hình database | PASS một phần | Database `postgres`, PostgreSQL `17.11`; role kết nối `postgres`, `rolsuper=false`. Đây là role của URL trong `.env`, chưa chứng minh role của backend/worker đang chạy hay least privilege. |
| Schema SePay | PASS kiểm tra tên object; chưa sẵn sàng migration | 24 bảng `public`; không thấy object có tên của ba bảng SePay. Chưa kiểm tra lại đầy đủ index, migration history, grants, RLS hay locks ở phiên này. |
| Nhận dạng project | BLOCKED | Người dùng xác nhận tên `pbl6-eventhub`; kết nối thành công tới host Supabase từ config ứng dụng, nhưng chưa đối chiếu độc lập project name/ref trên Dashboard. |
| Backup/PITR | BLOCKED | Có backup theo xác nhận người dùng và rehearsal `public` trước đó; chưa chứng minh full backup, retention, PITR hoặc restore với owner/ACL. |

Script tạm được tạo để kiểm tra và xóa sau khi chạy. Không sửa source runtime, data, schema, migration, ACL hoặc cấu hình Dashboard. Không chạy API/worker, webhook hoặc giao dịch. Tên project do người dùng cung cấp không phải bằng chứng mapping độc lập tới kết nối.

## Đánh giá L0 và việc tiếp theo

L0 còn chưa đủ tiêu chí: source chưa commit theo yêu cầu người dùng, chưa chốt contract Live và quét secret, chưa chứng minh staging/coexistence, project mapping, runtime role tối thiểu, backup/PITR và deployment. TLS kết nối metadata đã PASS không đồng nghĩa sẵn sàng DDL hay Live. Tiếp tục chuẩn bị và kiểm thử cục bộ; trước thao tác có ghi lên DB chứa dữ liệu thật cần xác định đích, phạm vi, backup/restore và sự cho phép phù hợp theo kế hoạch.
