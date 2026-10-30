# L0: xác nhận đích và thử kiểm tra Supabase

Thời điểm: 29/10/2026 23:24 UTC+7. Bổ sung [báo cáo xác nhận L0](20261029_232205_l0_user_confirmation.md).

## Thông tin người dùng xác nhận

- Project tên `pbl6-eventhub`, đã kết nối và có dữ liệu thật. Backend và worker Live dự kiến chạy trên máy hiện tại. Ngrok chỉ là giải pháp thử nghiệm tạm thời; sẽ deploy sau.
- Người dùng cho biết đã lưu backup database. Phạm vi backup, thời điểm, retention, khả năng khôi phục, PITR, RPO/RTO chưa được xác nhận bằng bằng chứng trong phiên này. [Báo cáo backup trước](20261029_221500_p7_backup_restore_rehearsal.md) chỉ chứng minh restore thử schema `public`, không phải full Supabase.

## Kiểm tra thực hiện

Thử client PostgreSQL riêng dùng `server/.env`, chỉ chấp nhận hostname Supabase, TLS xác thực chứng chỉ/hostname; dự kiến mở transaction `READ ONLY` rồi chỉ đọc metadata database, version, role và số bảng, cuối cùng rollback. Không khởi động API/worker, không đọc row nghiệp vụ hoặc in thông tin kết nối.

| Kiểm tra | Kết quả |
|---|---|
| Kết nối trong sandbox | BLOCKED: `EACCES` khi truy cập mạng. |
| Kết nối được cấp quyền mạng | FAIL: `SELF_SIGNED_CERT_IN_CHAIN` khi kiểm tra TLS; kết nối database không hoàn tất, không chạy SQL. |
| Project, runtime role, trạng thái schema hiện tại | BLOCKED: chưa đối chiếu được qua kết nối mới. Tên project do người dùng cung cấp; không suy ra hostname/pooler đã được ánh xạ tới tên đó. |
| Inventory trước đó | [P7 read-only](20261029_220500_p7_supabase_readonly_inventory.md) ghi TLS verify-full và 24 bảng public, không có ba bảng SePay tại thời điểm trước; không thay thế kiểm tra hiện tại. Báo cáo cũ cho biết có CA local nhưng phiên này chưa xác định được file CA phù hợp. |
| Backup | Đã có theo xác nhận người dùng; chưa đủ bằng chứng phạm vi/restore/PITR để nghiệm thu backup phục hồi. |
| Ngrok | Đã rõ là tạm thời; không xem là endpoint production lâu dài. Chưa xác minh tunnel, TLS, HMAC qua proxy hoặc readiness Live. |

Không tắt xác thực TLS hay thử kết nối kém an toàn. Script kiểm tra tạm thời đã được xóa; không thay source runtime, dữ liệu, migration, ACL hoặc cấu hình Dashboard. Không ghi credential hoặc dữ liệu thật vào báo cáo.

## Kết luận và bước tiếp theo

L0 còn chưa đạt: thiếu kết nối đã xác thực, xác minh role/project, đánh giá backup, contract và secret scan. Cần xác định CA đáng tin cậy đã dùng ở P7 hoặc xử lý chuỗi chứng chỉ, sau đó kiểm tra lại metadata ở chế độ chỉ đọc. Chuẩn bị điều kiện cô lập kiểm thử và đánh giá ngrok tạm thời; không tự seed/test ghi vào DB có dữ liệu thật. Việc DDL, chạy backend/worker trỏ database thật và giao dịch thật vẫn cần phạm vi được xác định cụ thể theo kế hoạch.
