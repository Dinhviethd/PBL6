# Kiểm tra fixture payment cho ca P5 API-only

**Thời điểm:** 29/10/2026, 17:36 UTC+7  
**Mục tiêu:** Xác minh có payment PENDING mới cho người dùng nhập vào SePay Test mode hay chưa.  
**Database:** Chỉ đọc PostgreSQL local đã guard: `eventhub_sepay_local`, user `sepay_local`, port host `127.0.0.1:55432`. Không truy cập Supabase.

## Kết quả

- Có file `.local/sepay/simulation-order.json`, nhưng đó là fixture P4 cũ, không phải fixture P5 mới. Status trong file là PENDING khi tạo; hạn `expiresAt` đã qua.
- Sau `node server/scripts/sepay-local.cjs verify`, truy vấn read-only xác nhận payment tương ứng trong DB local đã ở trạng thái `SUCCEEDED`, amount `150000` VND. Đây là giao dịch P4 đã thanh toán, không được sử dụng lại cho P5.
- DB local hiện có một SePay payment `SUCCEEDED` và **0 payment PENDING/UNKNOWN**. Chưa có payment P5 mới để cung cấp số tiền/mã hợp lệ.
- Helper `node .local/sepay/prepare-simulation-order.cjs` dùng chế độ tạo file mới (`flag: wx`), nên trước khi chạy phải đổi tên fixture P4 hiện tại để tránh ghi đè hoặc từ chối tạo file. Runbook P5 đã có lệnh backup/đổi tên này.

## Phạm vi và tác động

- Chỉ đọc fixture và DB local sau khi guard xác nhận Docker container/database local.
- Không tạo order/payment mới, không sửa dữ liệu, không gọi SePay, không thay đổi webhook/ngrok.
- Không ghi mã thanh toán đầy đủ hoặc credential vào báo cáo.

## Việc tiếp theo

Người dùng tạo fixture mới theo [runbook P5](20261029_173150_p5_api_only_recovery_test_procedure.md), xác nhận order/payment PENDING còn hạn, rồi nhập đúng amount và transfer content sinh mới vào SePay Test mode. Sau đó mới có thể chạy ca API-only recovery.
