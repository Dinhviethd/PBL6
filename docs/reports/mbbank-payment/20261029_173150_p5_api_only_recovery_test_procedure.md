# Hướng dẫn ca API-only recovery cho P5

**Thời điểm:** 29/10/2026, 17:31 UTC+7  
**Trạng thái:** Runbook đã chuẩn bị; chưa tạo giao dịch mới trong SePay Test mode. Đang chờ người dùng thực hiện bước mô phỏng.  
**Mục tiêu:** Có một transaction Test mode với đúng mã/amount của payment PENDING, transaction xuất hiện trong SePay API v2 Sandbox nhưng webhook không được gửi. Sau đó backend reconcile và worker tự phát đúng một vé.  
**Ranh giới:** Chỉ SePay Test mode và PostgreSQL local `eventhub_sepay_local`; không dùng tiền thật, không truy cập Supabase, không đụng Live.

## Điều kiện hiện có

- Người dùng xác nhận đã điền API v2 Sandbox token vào runtime local; không ghi credential vào report/chat.
- Guarded local API và worker đã được khởi động lại; API health tại `http://127.0.0.1:8010/api/health` trả HTTP 200 khi kiểm tra gần nhất.
- API v2 Sandbox thật đã trả 3 giao dịch cho lookback 60 phút ở lượt trước. Một transaction đã được webhook xử lý trước; hai giao dịch không có mã duy nhất được đưa REVIEW.
- Payment P4 cũ hết hạn lúc 16:59:40 UTC+7; phải tạo payment PENDING mới, không tái sử dụng số tiền/mã cũ.

## Quy trình người dùng

1. **Xác minh local và tạo payment mới.** Tại repo root, kiểm tra lại DB đích và local API; sau đó backup/đổi tên fixture cũ để helper có thể tạo file mới:

   ```powershell
   node server/scripts/sepay-local.cjs verify
   Invoke-WebRequest http://127.0.0.1:8010/api/health -TimeoutSec 10
   $backup = ".local/sepay/simulation-order-p4-$(Get-Date -Format yyyyMMdd-HHmmss).json"
   Move-Item -LiteralPath .local/sepay/simulation-order.json -Destination $backup
   node .local/sepay/prepare-simulation-order.cjs
   ```

   Lệnh verify chỉ kết nối database sau khi guard chứng thực đúng container local. Helper tạo order/payment PENDING mới và ghi fixture vào `.local/sepay/simulation-order.json` (Git ignored). Không sửa số tiền/hạn trong DB. Ghi nhớ `amount` và `transferContent` trong kết quả tại máy; không cần gửi ID, mã, tài khoản hay credential vào chat. Xác nhận `status=PENDING`, `environment=test`, amount VND và `expiresAt` còn ở tương lai. Nếu health không phải HTTP 200, dừng tại đây và báo assistant; không chạy helper trên backend khác.

2. **Ngăn gửi webhook cho đúng một lần mô phỏng.** Trong SePay Dashboard bật Test mode, mở Test mode → Webhooks/Tích hợp Webhook. Tắt toggle của webhook Test đang trỏ tới endpoint P5; nếu có nhiều webhook Test cùng nhận tài khoản này, tắt các webhook đó trong lúc thử. Không xóa webhook. Không tắt hay sửa webhook Live.

   Tắt webhook làm nó không nhận giao dịch cho tới khi bật lại. Đây là cách tạo ca API-only rõ ràng hơn việc dừng ngrok/listener: endpoint lỗi có thể khiến SePay tự retry và gửi webhook sau đó, làm mất tính chất “không webhook”. [Tài liệu bật/tắt webhook](https://developer.sepay.vn/vi/sepay-webhooks/tao-webhook), [cơ chế retry](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/so-sanh-voi-live).

3. **Tạo transaction mô phỏng.** Mở Test mode → Giao dịch → Mô phỏng. Chọn đúng tài khoản MBBank Test, loại **Tiền vào**, amount VND đúng bằng fixture payment mới, nội dung chỉ dùng mã `transferContent` mới để parser nhận diện chính xác, VA để trống vì fixture dùng tài khoản chính. Bấm Mô phỏng một lần. SePay ghi transaction rồi mới xét webhook đang bật và bộ lọc, nên giao dịch mô phỏng vẫn được lưu trong Test mode/API khi webhook tắt. [Luồng mô phỏng chính thức](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/mo-phong-giao-dich).

4. **Khôi phục cấu hình webhook.** Sau khi thấy transaction được tạo trong Test mode, bật lại webhook Test đã tắt. Không bấm “Phát lại/Replay” cho giao dịch này. Kiểm tra chi tiết giao dịch xác nhận không có delivery thành công tới backend trong lần mô phỏng; nếu SePay đã gửi một webhook từ webhook khác, báo lại trước khi reconcile.

5. **Báo assistant để chạy đối soát.** Chỉ cần nhắn “đã tạo giao dịch P5, webhook đã tắt trong lúc mô phỏng rồi bật lại”. Không gửi token, payload, số tài khoản hoặc ảnh chứa thông tin tài khoản. Assistant sẽ gọi route ADMIN `POST /api/admin/sepay/reconcile` trên local API với cửa sổ phù hợp, để worker xử lý và chỉ đọc kiểm tra DB local.

## Tiêu chí đạt

- SePay API v2 Sandbox trả về đúng một giao dịch mới có MBBank Test account, tiền vào, amount và nội dung khớp fixture mới.
- Request reconcile nhập giao dịch API mới (không chỉ đếm duplicate), worker đánh dấu `PROCESSED`.
- Cùng một row có `api_transaction_id` UUID và chưa cần `webhook_transaction_id` tại thời điểm xác minh; payment `SUCCEEDED`, order `PAID`, đúng một ticket `VALID`.
- Gọi reconcile lại không tạo transaction/payment/ticket trùng. Không có webhook delivery trong lúc mô phỏng.

Nếu code/amount/account/time không khớp, hoặc có nhiều candidate, transaction phải vào `REVIEW` và không phát vé. Không resolve thủ công chỉ để làm test xanh; ghi lại nguyên nhân, sửa dữ liệu/config rồi tạo payment mới.

**Kết luận:** Cách thử được đề xuất là tắt tạm webhook Test trong đúng một lần mô phỏng, không làm ngrok/backend ngừng hoạt động. Giao dịch được ghi ở Test mode nhưng SePay không gửi webhook đến backend; API v2 reconciliation sẽ là đường xác nhận duy nhất trong lần kiểm thử đó. Chưa thực hiện giao dịch thay người dùng.
