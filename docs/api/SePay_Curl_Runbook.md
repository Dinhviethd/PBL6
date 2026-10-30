# Kiểm thử SePay bằng curl — backend/API

Request mẫu cho PowerShell trên Windows, dùng `curl.exe` (không dùng alias `curl` của PowerShell). Chạy từng request khi đã có môi trường được phép; không chạy toàn bộ như script trên Supabase chứa dữ liệu thật. L3 chỉ kiểm thử synthetic local; chưa có listener SePay Live được xác nhận qua ngrok.

## Chuẩn bị

Đặt các biến môi trường trong terminal riêng: `SEPAY_API_BASE` (ví dụ `http://127.0.0.1:8011` hoặc URL ngrok được chốt ở L4), `BUYER_TOKEN`, `ADMIN_TOKEN`, `ORDER_ID`, `TRANSACTION_ID`. Token buyer/admin lấy từ tài khoản được cấp phép qua API đăng nhập hiện có; không dùng webhook secret hoặc API v2 token làm Bearer của các route ứng dụng. Không lưu token thật trong file tracked, không bật `curl -v` hoặc xuất transcript chứa credential.

`TRANSACTION_ID` là UUID nội bộ inbox trả bởi API list, không phải webhook integer ID hay API v2 UUID. `ORDER_ID` là UUID của đơn thuộc buyer, đã có reservation hợp lệ. Bộ test local tự tạo fixtures; request manual không tự tạo đơn/vé/credential.

## 1. Tạo payment — buyer

```powershell
'{}' | curl.exe --silent --show-error --include --request POST "$env:SEPAY_API_BASE/api/sepay/orders/$env:ORDER_ID/payment" --header "Authorization: Bearer $env:BUYER_TOKEN" --header "Content-Type: application/json" --data-binary '@-'
```

Expected: 201 lần đầu, 200 khi dùng lại attempt; `{success:true,data:...}`. Body chỉ được rỗng; truyền amount/account/token phải 400. Sai chủ đơn 404; không token 401; attempt provider/môi trường khác 409. Không retry bằng cách sửa amount hoặc tự hủy attempt.

## 2. Đọc payment — buyer

```powershell
curl.exe --silent --show-error --include "$env:SEPAY_API_BASE/api/sepay/orders/$env:ORDER_ID/payment" --header "Authorization: Bearer $env:BUYER_TOKEN"
```

Expected: 200, `Cache-Control: no-store`; snapshot amount/account/content lấy từ server, `environment` đúng runtime. `qrUrl=null` khi không thể chuyển tiền. Poll tối đa 30 lần/phút/user/process; vượt trả 429. QR chưa đồng nghĩa thanh toán thành công; kiểm tra `status`, `orderStatus`, `requiresReview`.

## 3. Webhook HMAC — chỉ mô phỏng trên local cô lập

```powershell
curl.exe --silent --show-error --include --request POST "$env:SEPAY_API_BASE/api/payments/sepay/webhook" --header 'Content-Type: application/json' --header "X-SePay-Timestamp: $env:SEPAY_TEST_TIMESTAMP" --header "X-SePay-Signature: $env:SEPAY_TEST_SIGNATURE" --data-binary "@$env:SEPAY_TEST_BODY_FILE"
```

Không chạy request synthetic này vào ngrok Live/Supabase thật. Với local test, body file phải là JSON UTF-8 không đổi sau khi ký. Signature: `sha256=` + hex HMAC-SHA256 của bytes `timestamp + '.' + rawBody` bằng secret synthetic; timestamp Unix giây trong cửa sổ ±300s. Hai header phải xuất hiện đúng một lần. Dùng `--data-binary` để giữ nguyên byte; không ký JSON rồi format lại.

Expected: thiếu/sai/trùng signature hoặc timestamp 401; JSON null/array/sai UTF-8 400; body lớn hơn 32KB bị từ chối; lỗi DB không trả ACK thành công. Hợp lệ trả 200 `{success:true}` **sau khi lưu inbox**; worker chạy riêng mới xử lý. Trong Live, SePay Dashboard gửi webhook thật; curl không được dùng để giả lập PAID.

## 4. Đối soát — admin

```powershell
'{"lookbackMinutes":60}' | curl.exe --silent --show-error --include --request POST "$env:SEPAY_API_BASE/api/admin/sepay/reconcile" --header "Authorization: Bearer $env:ADMIN_TOKEN" --header 'Content-Type: application/json' --data-binary '@-'
```

Body có thể `{}`, default 60, min 5/max 1440. Không truyền token/URL provider. Expected 200 với scanned/imported/reviewed/matchedWebhook/duplicates/ignored; process khác đang đối soát trả 409; chưa cấu hình token trả 503. Request này có ghi inbox: không xem là read-only chỉ vì upstream dùng GET. Import không tự chứng minh đã phát vé, cần worker.

## 5. Danh sách giao dịch — admin

```powershell
curl.exe --silent --show-error --include --get "$env:SEPAY_API_BASE/api/admin/sepay/transactions" --header "Authorization: Bearer $env:ADMIN_TOKEN" --data-urlencode 'status=REVIEW' --data-urlencode 'page=0' --data-urlencode 'limit=20'
```

Tùy chọn thêm `--data-urlencode 'from=2026-10-30T00:00:00+07:00'`, `to` và `reference`. Khoảng thời gian inclusive dựa trên `transaction_at`, bắt buộc ISO 8601 có timezone; reference khớp chính xác mã ngân hàng, không phải tìm chứa chuỗi. Page bắt đầu 0, limit 1–100. Response vẫn là array trong `data`; thêm `api_transaction_id` và `transaction_at` để hỗ trợ tra soát. Chỉ dữ liệu cùng môi trường/tài khoản runtime; không có raw payload/secret, account được mask. Range sai trả 400.

## 6. Chi tiết giao dịch — admin

```powershell
curl.exe --silent --show-error --include "$env:SEPAY_API_BASE/api/admin/sepay/transactions/$env:TRANSACTION_ID" --header "Authorization: Bearer $env:ADMIN_TOKEN"
```

Expected 200 kèm `history`; sai UUID 400; không tồn tại/khác integration 404. Buyer gọi admin routes trả 403, không token 401.

## 7. Reprocess — admin, có ghi

```powershell
'{}' | curl.exe --silent --show-error --include --request POST "$env:SEPAY_API_BASE/api/admin/sepay/transactions/$env:TRANSACTION_ID/reprocess" --header "Authorization: Bearer $env:ADMIN_TOKEN" --header 'Content-Type: application/json' --data-binary '@-'
```

Chỉ ERROR/REVIEW; thành công `{queued:true}`. Body strict empty. Chuyển trạng thái và ghi review audit trong cùng transaction; audit lỗi thì không enqueue. Worker kiểm lại account/amount/thời hạn/reservation; không bỏ qua quy tắc hay phát vé thủ công. Trạng thái khác 409.

## 8. Ghi nhận xử lý ngoài hệ thống — admin, có ghi

```powershell
'{"outcome":"unmatched","reason":"Synthetic local review only","evidenceReference":"local-test"}' | curl.exe --silent --show-error --include --request POST "$env:SEPAY_API_BASE/api/admin/sepay/transactions/$env:TRANSACTION_ID/resolve" --header "Authorization: Bearer $env:ADMIN_TOKEN" --header 'Content-Type: application/json' --data-binary '@-'
```

Outcomes: `confirmed_external`, `refund_external`, `unmatched`. Reason 3–1000 ký tự; evidenceReference optional, tối đa 256. Chỉ ghi nhận kết quả tra soát bên ngoài; không thực hiện hoàn tiền hoặc cấp vé. Trong Live phải dùng lý do/bằng chứng thực, không dùng body synthetic mẫu trên. Response `{recorded:true}`.

## Bằng chứng nghiệm thu

Ghi môi trường, thời gian, HTTP status và trạng thái mong đợi/thực tế, ID mask, số ticket/audit/notification theo kết quả kiểm tra được phép. Không đưa Bearer, webhook secret, v2 token, account đầy đủ hoặc raw payload nhạy cảm vào report. Với thanh toán thành công, xác minh độc lập: inbox PROCESSED, payment SUCCEEDED, order PAID, đúng một vé; duplicate/reconcile lại không phát thêm. Ghi NOT RUN nếu chưa có worker, endpoint hoặc quyền cho thao tác đó.
