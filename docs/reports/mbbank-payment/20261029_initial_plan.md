# Báo cáo khảo sát và lập kế hoạch MBBank / SePay

- Ngày: 29/10/2026 (UTC+7). Phạm vi: đọc source, schema trong repository, trạng thái tunnel/health local và tài liệu công khai SePay; không sửa code ứng dụng.
- Kết quả: ngrok API local hiển thị URL `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` chuyển tiếp `localhost:8000`; health local tại cổng 8000 không kết nối được. Không thử URL công khai tới backend, webhook SePay hoặc chuyển tiền.
- Backend chưa có route SePay trong source; API demo và VNPAY sandbox đang có. Schema repository có unique một payment pending/unknown mỗi order, `payment_notifications.payment_id` nullable, owner guard theo bảng. Worker và payment provider hiện dành cho luồng hiện có.
- Database: không kết nối, đọc, ghi hay migrate Supabase; không chạy PostgreSQL/migration/test. Schema đã xem là file trong repo, không khẳng định trạng thái Supabase thực tế.
- Tài liệu đối chiếu: [payload và phản hồi webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), [xác thực HMAC](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc), [MBBank](https://developer.sepay.vn/vi/sepay-webhooks/tai-khoan-ngan-hang), [đối soát](https://developer.sepay.vn/vi/sepay-webhooks/doi-soat-giao-dich).
- Kết quả kiểm thử: khảo sát source và API ngrok local **PASS**; health backend **BLOCKED** (không kết nối); webhook, migration, giao dịch và hồi quy **CHƯA THỰC HIỆN**.
- Tác động: thêm tài liệu kế hoạch và báo cáo; không thay đổi code, API hay dữ liệu. Việc tiếp theo: xác minh yêu cầu P0 và tạo PostgreSQL local cô lập trước bất kỳ thao tác DB.
