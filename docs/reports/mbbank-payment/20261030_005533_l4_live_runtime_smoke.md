# L4 — Runtime Live qua ngrok và curl trên Supabase

Ngày: 30/10/2026, khoảng 00:51–00:58 UTC+7. Tiếp nối báo cáo migration L4 và bàn giao cấu hình.

## Kết quả

**API/worker Live đã chạy, ngrok đã chuyển, 14 kiểm tra curl PASS và fixture đã dọn.** Người dùng xác nhận đã bật webhook Live đúng URL/HMAC. Chưa có giao dịch trong inbox Live; chưa nghiệm thu end-to-end chuyển tiền → webhook → PAID → vé. Data API/PostgREST chưa kiểm tra thực tế. Không đánh dấu toàn bộ L4/L5 hoàn tất.

## Cấu hình và vận hành

- Validate file riêng `server/.local/sepay-live.env` bằng loader dùng chung: PASS. Không xuất giá trị secret, token hoặc tài khoản. Chuyển `SEPAY_ENABLED=true`; Live, production, PAYMENT_MODE disabled, DB target/TLS/CA đều qua guard.
- Thêm `server/scripts/sepay-live-runtime.cjs` với các mode `check`, `api`, `worker`; kiểm tra Live trước khi chạy, xóa ambient config liên quan, nạp file riêng và đặt DOTENV_CONFIG_PATH để không lấy nhầm `.env` Test.
- API nghe `127.0.0.1:8011`; PID quan sát 27284, lưu `.local/sepay-l4/api.pid`. Health dùng DB trả 200. Startup đầu chưa mở cổng khi probe nên curl báo không kết nối; probe lại sau startup thành công. Không coi lỗi tạm thời đó là health PASS.
- Worker dùng entry point chung, gồm inbox/reconcile SePay và tác vụ legacy expiry/wait queue/reminders. Quan sát 68 inbox runs, 3 reconcile runs, failures=0, busy=0. Đây là số quan sát trong phiên, không phải bảo đảm uptime. API v2 Live đã phản hồi được client chấp nhận; inbox rỗng nên chưa có bằng chứng settlement giao dịch.
- Ngrok chuyển từ `localhost:8010` sang `127.0.0.1:8011`, giữ hostname `richelle-unrelapsing-flavourlessly.ngrok-free.dev`. POST tạo tunnel trả 201. Tắt traffic inspection cho tunnel mới. Không dừng/xóa các container legacy; Test không còn được tunnel này phục vụ.
- Public health trả 200; POST webhook không chữ ký trả 401. Người dùng sau đó xác nhận Dashboard đã bật URL và HMAC. Không có quyền Dashboard để tự đọc cấu hình đó; phân biệt xác nhận người dùng với bằng chứng HTTP.

URL webhook:

`https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`

Tham chiếu thao tác tunnel: [ngrok Agent CLI API](https://ngrok.com/docs/gateway/agent/api), đã đối chiếu API start/stop tunnel. Không đổi hostname trong phiên.

## Kiểm thử có xác thực và dữ liệu

Người dùng đã cho phép seed dữ liệu kiểm thử riêng và xóa sau thành công. Script `server/scripts/sepay-live-smoke.cjs --authorized-fixtures` tạo ba tài khoản ngẫu nhiên tại domain example.test, một category, một event, một ticket type capacity 1, một order và một payment Live. Không gọi ngân hàng để chuyển tiền, không tạo webhook giả hoặc sửa PAID. Các request dùng curl.exe; Bearer truyền qua stdin config, không đưa token vào command line/log.

| Request/tiêu chí | Kết quả |
|---|---|
| Tạo category cho fixture bằng admin | 200 |
| Buyer thiếu token | 401 |
| Buyer khác đọc đơn | 404 |
| Client cố override amount | 400 |
| Tạo payment Live | 201, environment live, amount 10000 |
| Tạo lại cùng đơn | 200, cùng paymentId |
| Đọc payment | 200, cùng paymentId |
| Buyer gọi admin transactions | 403 |
| Admin list | 200 |
| Reconcile range không hợp lệ | 400 |
| Transaction UUID không tồn tại | 404 |
| Reprocess UUID không tồn tại | 404 |
| Resolve UUID không tồn tại | 404 |
| Webhook không chữ ký | 401 |

Tổng 14/14 HTTP checks PASS, bao gồm tạo category. Ngoài ra, xác minh đơn PENDING_PAYMENT, không có ticket. Hai callback VNPAY với query rỗng vẫn trả HTTP 200; chỉ là route smoke, không thay bằng chứng hồi quy chữ ký/settlement từ local L3.

Script gặp lỗi SQL 42703 ở bước kiểm tra ticket vì dùng `tickets.order_id`; đã sửa thành join qua `order_items` đúng schema. Lần lỗi giữ fixture và lưu bằng chứng; chạy `--resume-cleanup` xác minh lại trạng thái/ticket rồi dọn thành công, không seed lại. Artifact giữ error ban đầu để truy vết, đồng thời có passed=true và cleaned=true.

Cleanup chạy trong transaction, khóa event, từ chối nếu có đơn của buyer ngoài fixture, giao dịch bank liên kết payment hoặc payment đã thành công. Chỉ xóa ID fixture, tài khoản/session/audit liên quan; không xóa inbox ngân hàng. FK sẽ rollback nếu còn phụ thuộc chưa xử lý.

Read-only postcheck độc lập: fixture users còn 0; số dòng users/orders/payments/tickets lần lượt **12/24/14/4**, đúng số trước seed. Ba bảng RLS và năm migration còn nguyên. Inbox của integration Live hiện rỗng. Không tuyên bố toàn bộ fingerprint database bất biến vì worker thật đang chạy.

## Bằng chứng local (Git ignored)

- `.local/sepay-l4/live-smoke.json`: run ID, ID fixture, 14 HTTP checks, trạng thái cleanup và lỗi đã xử lý; không token/password.
- `.local/sepay-l4/live-postcheck.json`: thời gian, inbox tổng hợp và số fixture users còn lại.
- `.local/sepay-l4/ngrok-before.json`: endpoint trước chuyển đổi.
- `.local/sepay-l4/api.log`, `api-error.log`, `api.pid`: runtime API. Worker hiện chạy trong phiên thực thi riêng; log health quan sát trong phiên, chưa có supervisor tự khởi động lại.
- Node syntax checks cho hai script và module boundaries PASS. Không sửa TypeScript trong phiên này; dùng build L4 đã PASS. Không commit Git.

## Trạng thái nghiệm thu và bước tiếp theo

| Phần | Trạng thái |
|---|---|
| Migration/TLS/SQL ACL/preservation | PASS theo báo cáo L4 trước |
| Cấu hình, API/worker, ngrok Live | PASS tại thời điểm kiểm tra |
| Curl buyer/admin và dọn fixture | PASS trong phạm vi bảng trên |
| Webhook Dashboard URL/HMAC | Người dùng xác nhận đã bật |
| Webhook có chữ ký thật và settlement | CHƯA CHẠY; inbox rỗng |
| Reprocess/resolve thành công trên giao dịch thật | CHƯA CHẠY; không tạo giao dịch ngân hàng giả để lấp tiêu chí |
| Admin reconcile HTTP thành công | CHƯA CHẠY; worker reconcile Live đã thành công |
| Supabase Data API/PostgREST | CHƯA CHẠY; chưa có URL/key REST trong cấu hình đã kiểm tra; SQL ACL PASS không thay REST |
| Chuyển khoản nhỏ, đúng một vé, duplicate/recovery | L5, chưa thực hiện |

Chạy lại runtime từ thư mục server khi cần: `node scripts/sepay-live-runtime.cjs check`, rồi API và worker trong hai terminal bằng mode `api`/`worker`. Không khởi động thêm bản trùng khi process hiện tại còn chạy. Phiên hiện tại không thiết lập service tự khởi động lại sau reboot.

Trước L5 chọn đơn mới dành cho chuyển khoản thật; fixture L4 đã bị xóa, không sử dụng QR/nội dung của fixture. Giao dịch thật phải giữ lịch sử đối soát. Không yêu cầu bổ sung backup/PITR hoặc phương án domain dài hạn.
