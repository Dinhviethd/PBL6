# Báo cáo khắc phục `403 ORIGIN` khi khôi phục phiên web

- Thời điểm: 2026-10-28, Asia/Ho_Chi_Minh.
- Phạm vi: cấu hình Origin của web auth refresh, hướng dẫn chạy local/Compose và xác minh tải lại trang A3. Không thay đổi luồng đăng nhập mobile hay các màn hình khác.
- Report A3 trước đó vẫn được giữ nguyên để bảo toàn bằng chứng lịch sử: [`A3_20261027_193458_frontend_implementation.md`](A3_20261027_193458_frontend_implementation.md).

## Nguyên nhân và thay đổi

Backend so khớp chính xác `Origin` với `CLIENT_URL` trong route `POST /auth/refresh-token`. CORS và route trước đây cùng dùng cấu hình đó nhưng khai báo lặp riêng. Frontend mở bằng `localhost:5173`, trong khi Vite bind `127.0.0.1`; Compose mặc định phục vụ cùng origin `localhost:8000`, và chỉ dùng được Vite riêng khi đặt `DOCKER_CLIENT_URL`. Vì vậy request từ Vite tới backend Compose mặc định bị từ chối; bài kiểm thử trên tiến trình cũ xác nhận refresh trả `403` sau reload.

- Dùng một biến `clientOrigin` cho CORS và kiểm tra route refresh. Origin khác vẫn nhận code `ORIGIN`/HTTP 403; log chẩn đoán chỉ ghi Origin nhận được và Origin cấu hình, không ghi cookie/token.
- Kiểm tra cookie trước khi gọi service refresh. Cookie thiếu trả `401 UNAUTHORIZED`, tách biệt với lỗi Origin.
- Chọn `http://localhost:5173` làm host chuẩn khi chạy Vite; hướng dẫn local, Compose và yêu cầu restart backend sau đổi env đã được làm rõ. Compose tích hợp tiếp tục dùng `http://localhost:8000`; khi chạy Vite riêng phải đặt `DOCKER_CLIENT_URL=http://localhost:5173`.
- Thêm integration test không cần PostgreSQL cho Origin chuẩn, Origin khác, CORS credentials và cookie thiếu; mở rộng test suite refresh để có Origin tường minh.
- Thêm Playwright A3 kiểm tra login → reload → refresh HTTP 200 → trang `/profile`, cùng thuộc tính HttpOnly/SameSite/path của cookie.

## Kết quả kiểm chứng

- `npm run build --prefix server`: PASS.
- `npm run build --prefix client`: PASS; còn cảnh báo dữ liệu Browserslist cũ và bundle JS lớn hơn 500 kB.
- ESLint cho test A3 và Vite config: PASS.
- `node --test server/test/auth-origin.test.cjs`: PASS (1/1). Xác nhận Origin chuẩn đi qua kiểm tra và tới bước xác thực cookie (401 khi thiếu), Origin `127.0.0.1:5173` trả `403 ORIGIN`.
- `npm test --prefix server`: 10 PASS, 0 FAIL, 3 PostgreSQL suites SKIP vì không có `TEST_DATABASE_URL`.
- Playwright Edge, A3 reload: PASS khi chạy API đã build trên cổng tạm 8001 với `CLIENT_URL=http://localhost:5174` và Vite tạm trên 5174. Đăng nhập tạo cookie đúng flags, reload nhận refresh 200 và `/profile` tải được.
- Trước lần chạy tạm trên, cùng browser test trỏ vào API đang chạy mặc định ở 8000 tái hiện `403`. Không dừng/thay thế tiến trình hiện hữu của người dùng. Vì thế API đang phục vụ ở 8000 cần được khởi động lại với Origin khớp URL frontend đang dùng; với Vite 5173 đặt `DOCKER_CLIENT_URL=http://localhost:5173` trước khi khởi động Compose. Nếu dùng web tích hợp tại 8000, tiếp tục mở `http://localhost:8000`.

## Trạng thái

Code và cấu hình hướng dẫn đã sửa; kiểm thử tự động và browser test với cấu hình khớp đều đạt. Môi trường đang chạy ở cổng 8000 vẫn tái hiện lỗi cho frontend Vite do tiến trình/cấu hình runtime hiện hành chưa được thay đổi. Sau khi khởi động lại đúng cấu hình, chạy lại Playwright A3 trên `http://localhost:5173` để xác nhận môi trường đó.
