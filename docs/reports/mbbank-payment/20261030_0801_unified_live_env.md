# Báo cáo hợp nhất cấu hình SePay Live vào một file `.env`

**Ngày:** 30/10/2026  
**Phạm vi:** Docker Live API/worker, Cloudinary media và monitor SePay.  
**Kết quả:** Hoàn thành; API và worker đang chạy từ cấu hình `server/.env`.

## Tóm tắt thay đổi

- Hợp nhất biến SePay Live từ file local cũ vào `server/.env`. Các biến hiện có của ứng dụng, bao gồm Cloudinary, được giữ lại. Các giá trị trùng được ưu tiên theo cấu hình Live.
- Tạo bản dự phòng cục bộ bị Git ignore tại `server/.local/server-env-before-unified-2026-10-30T07-52-45-640Z.env`. Không ghi giá trị cấu hình vào report.
- Cập nhật `server/scripts/sepay-live-runtime.cjs` để chỉ nạp `server/.env`; từ chối khi không phải SePay Live hoặc thiếu một trong ba biến Cloudinary.
- Runtime loại `VNPAY_*`, `TEST_DATABASE_URL` và credential SePay sandbox khỏi tiến trình Live. `PAYMENT_MODE=disabled` được xác nhận trong runtime.
- Cập nhật `compose.sepay-live.yaml` để mount `server/.env` read-only vào API và worker. Giữ CA Supabase, volume `pbl6_uploads` và cổng localhost `8011`.
- Worker ghi heartbeat vào thư mục local riêng được mount vào container. Cách này cho phép worker ghi file tạm rồi rename nguyên tử, đồng thời để monitor trên host đọc được heartbeat.
- Cập nhật script acceptance, smoke, L5 prepare, monitor và runbook để dùng `.env`. Đánh dấu `server/.env.sepay-live.example` là template cũ, không còn là nguồn runtime.
- Thay Cloudinary API key/secret trong `server/.env.example` bằng placeholder rỗng và thêm các trường SePay mẫu. File thật `server/.env` được Git ignore.

## Kiểm thử và tiêu chí

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Kiểm tra cấu hình Live từ `.env` | PASS | Wrapper báo cấu hình hợp lệ, `environment=live`, `cloudinaryConfigured=true`, `legacyVnpayExcluded=true`. |
| Git ignore cho `.env` | PASS | `git check-ignore server/.env` trả `.env`. |
| Compose validation | PASS | `docker compose -f compose.sepay-live.yaml config -q`. |
| Build backend/image | PASS | Backend build và Docker image API/worker build thành công. Cài dependency có cảnh báo audit: 39 vulnerabilities (2 low, 14 moderate, 20 high, 3 critical). |
| Backend tests | PASS | `node --test test/sepay-live-config.test.cjs test/media.test.cjs`: 7/7 tests, 0 failed. |
| Nhánh upload Cloudinary trong media module | PASS | Mock `upload_stream` nhận ảnh đã xử lý và trả URL mock; không upload asset thật. |
| Cloudinary credential/connectivity | PASS | Cloudinary API ping read-only thành công từ cấu hình mounted. |
| API health local/public | PASS | Local `127.0.0.1:8011/api/health` = HTTP 200; URL ngrok `/api/health` = HTTP 200. |
| Webhook guard | PASS | POST body rỗng không chữ ký trả HTTP 401 ở localhost. |
| API/worker mode | PASS | API healthy; worker heartbeat báo `environment=live`, `failures=0`; không có credential VNPAY trong runtime Live. |
| Database/queue monitor | PASS | `databaseHealthy=true`, lỗi/review/lease hết hạn đều bằng 0; monitor kết thúc `status=OK`, `alerts=[]`. Truy vấn kiểm tra là read-only. |

Trong lần chạy monitor đầu tiên, heartbeat cũ trên host tạo cảnh báo stale vì worker ghi trong filesystem container. Đã sửa bằng cách mount một thư mục heartbeat riêng, giữ được thao tác ghi tệp nguyên tử, rồi chạy lại monitor thành công. Không mount toàn bộ `server/.local`.

## Trạng thái sau triển khai

- Compose Live đang có hai container: API healthy tại `127.0.0.1:8011` và worker Live.
- Ngrok vẫn chạy trên host và forward tới `localhost:8011`; public health trả HTTP 200. Không đổi URL webhook.
- Worker và monitor đọc cùng heartbeat mới tại `server/.local/sepay-live-runtime/sepay-worker-health.json`.
- Volume upload `pbl6_uploads` được tái sử dụng; không xóa volume hoặc dữ liệu.
- File `server/.local/sepay-live.env` cũ được giữ lại để rollback nhưng không còn được Compose, wrapper hoặc script hiện hành đọc.

## Giới hạn kiểm thử

- Không thực hiện upload thật lên Cloudinary để tránh tạo asset production; đã xác minh kết nối bằng ping và nhánh upload bằng mock.
- Không tạo giao dịch ngân hàng mới. Webhook chỉ kiểm tra phản hồi từ chối request thiếu HMAC.
- Monitor xác nhận trạng thái database/queue hiện tại, không chứng minh mọi giao dịch lịch sử đã được thanh toán.
- Không commit thay đổi. Backup cục bộ và `.env` đều không được đưa vào Git.

## Khởi động lại

Từ thư mục gốc dự án:

```powershell
docker compose -f compose.sepay-live.yaml up -d --build --force-recreate
```

Ngrok tiếp tục chạy riêng trên host. Không cần chạy một tunnel ngrok thứ hai.
