# Kiểm tra lại ngrok và backend local

> Đính chính P0 ngày 29/10/2026: source `/api/health` gọi `events.categories()` nên phép GET health có đọc database của backend. Do đích DB lúc đó chưa xác minh, nhận định bên dưới rằng không truy cập/đọc Supabase không đủ bằng chứng. Không kết luận đã truy cập Supabase; chỉ xác nhận không thể loại trừ bằng phép kiểm tra đã làm. Xem [báo cáo P0](20261029_141800_p0_verification.md). Từ P0 không gọi health/API nghiệp vụ khi chưa xác minh DB local.

- Ngày: 29/10/2026 (UTC+7). Chỉ kiểm tra trạng thái local, không thay đổi ứng dụng hay cấu hình.
- Ngrok API tại `127.0.0.1:4040` cho thấy URL `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` chuyển tiếp `http://localhost:8000`.
- Cổng `127.0.0.1:8000` có tiến trình `com.docker.backend` lắng nghe. `curl.exe` gọi `/api/health` trả HTTP 200 và `{"success":true,"data":{"status":"ok"}}`.
- `Invoke-WebRequest` trong PowerShell phát sinh lỗi nội bộ; dùng curl xác minh phản hồi HTTP. Chưa xác định nguyên nhân backend không kết nối trong lần khảo sát trước; không chứng minh webhook hay kết nối SePay hoạt động.
- Không truy cập, đọc, thay đổi hay migrate Supabase. Không xác minh database mà backend hiện chạy sử dụng; không được dùng backend đó để thử chức năng SePay khi chưa chứng minh DB local.
- Kết quả: tunnel cấu hình **PASS**, health local **PASS**, webhook/DB đích **CHƯA KIỂM TRA**.
