# L5 — Giao dịch Live có kiểm soát 10.000 VND

Ngày: 30/10/2026, UTC+7. **Chốt 01:10: L5 PASS trong phạm vi giao dịch thật 10.000 VND và đối soát không trùng. Người dùng xác nhận HTTP 200 và MBBank đã ghi có. Retry webhook thật NOT RUN vì Dashboard không cho gửi lại theo xác nhận người dùng; không ghi PASS cho tiêu chí này.**

## Quyết định và phạm vi

Người dùng yêu cầu L5 theo MBBank_SePay_Live_Plan/MBBank_Payment; xác nhận số tiền **10.000 VND**, tiền giữ lại trong tài khoản của người dùng, có thể tự chuyển từ tài khoản khác. Trước đó người dùng đã xác nhận Dashboard Live đúng URL/HMAC và cho phép seed dữ liệu kiểm thử. Không thực hiện chuyển tiền thay người dùng, không xin OTP/credential ngân hàng. Không tự hoàn tiền. Không xóa lịch sử thanh toán thật.

## Chuẩn bị và bằng chứng đầu phiên

- Loader cấu hình Live PASS; public health qua ngrok trả 200.
- API cổng 8011/PID 27284 và worker PID 40592 được quan sát đang chạy. Không tạo process trùng.
- Truy vấn Supabase bằng TLS xác minh, transaction READ ONLY: inbox Live rỗng trước khi tạo đơn.
- Thêm `server/scripts/sepay-l5-prepare.cjs`: opt-in `--agreed-10000-retained`, từ chối nếu case đã tồn tại, ghi ID từng bước để không seed mù khi lỗi. Tạo organizer/buyer riêng, category/event/ticket type capacity 1, một đơn một vé giá 10.000 VND, payment bằng API Live. Bỏ quyền ADMIN tạm thời của organizer sau chuẩn bị.
- Thêm `server/scripts/sepay-live-acceptance.cjs`: chỉ đọc; lấy trạng thái đơn/payment, account-match boolean, amount, trạng thái inbox và nguồn webhook/API, đếm ticket/notification/audit. Evidence ghi file ignored, không raw payload, token hoặc số tài khoản.
- QR và hướng dẫn riêng tại `.local/sepay-l5/transfer.html`; hết hạn **01:18:07 ngày 30/10/2026 UTC+7**. Người dùng đã được nhắc chỉ chuyển một lần, đúng số tiền/nội dung/tên người nhận, không dùng QR L4 đã xóa. Không kéo dài deadline bằng sửa DB.
- Baseline 01:03:34: order PENDING_PAYMENT, payment PENDING/10000/requires_review=false, transactions=0, tickets=0, notifications ORDER_PAID=0, payment.verified audit=0.
- Node syntax checks và `git diff --check` PASS (chỉ cảnh báo LF/CRLF ở file đã sửa trước đó). Chưa đổi TypeScript trong phiên này.

## Ma trận nghiệm thu

| Tiêu chí | Trạng thái | Bằng chứng cần thu |
|---|---|---|
| Số tiền và xử lý tiền được thống nhất | PASS | 10.000 VND, giữ lại, người dùng tự chuyển |
| Runtime và kết nối DB | PASS tại đầu phiên | Health 200, loader Live, TLS read-only |
| Đơn/payment mới, đúng một vé dự kiến | PASS | PENDING_PAYMENT/PENDING, amount 10000, quantity 1 |
| Đối chiếu QR trước chuyển và ngân hàng báo thành công | PASS — người dùng xác nhận | Đã chuyển thành công, đúng người nhận/số tiền/nội dung |
| Account/amount/reference đúng | PASS phía ứng dụng | MBBank, in, account_matches=true, content_matches=true, amount=10000, bank reference hiện diện |
| Webhook HMAC hợp lệ, lưu inbox | PASS | Numeric webhook ID hiện diện; audit source SEPAY_WEBHOOK; người dùng xác nhận lần gửi đầu HTTP 200 |
| Settlement | PASS | PROCESSED, SUCCEEDED, PAID, requires_review=false |
| Một vé, một thông báo, audit đúng | PASS | ticket=1, ORDER_PAID=1, payment.verified=1 |
| Đối soát API và không cấp vé trùng | PASS | Hai reconcile lại: scanned=1, duplicates=1, imported=0; số vé/thông báo/audit không tăng |
| Duplicate webhook thật | NOT RUN — giới hạn Dashboard | Người dùng cho biết SePay không cho gửi lại; không giả lập callback để thay bằng chứng Live |
| Hoàn tất xử lý tiền | PASS — người dùng xác nhận | Tiền đã ghi có tại MBBank và giữ lại theo thỏa thuận |

## Artifact và giới hạn

`.local/sepay-l5/case.json` giữ ID để truy vết, `payment-private.json`/`transfer.html` giữ chi tiết thanh toán riêng; `organizer-private.json`/`buyer-private.json` chứa credential cục bộ, được Git ignore, không đưa vào report hoặc commit. Các file `evidence-*.json` ghi snapshot nghiệm thu theo thời gian. Không dùng script cleanup L4 để xóa case L5.

Supabase Data API còn chưa kiểm tra theo báo cáo L4; không coi kết quả SQL ACL trước đây là REST PASS. API-only recovery/duplicate synthetic đã kiểm tra ở L3, không được thay bằng chứng giao dịch thật L5. Chưa commit Git.

## Kết quả thực tế sau chuyển khoản

- 01:05:53: một inbox PROCESSED, một payment SUCCEEDED, order PAID; account đúng, amount 10000, webhook_received=true, api_reconciled=true, bank reference hiện diện; ticket/notification/audit đều bằng 1. Người dùng xác nhận đã chuyển đúng người nhận, số tiền, nội dung.
- 01:06:22: chủ động chạy hai lần đối soát Live, mỗi lần scanned=1/duplicates=1/imported=0/reviewed=0/truncated=false. Artifact `.local/sepay-l5/reconcile-repeat.json`.
- Curl buyer sau thanh toán: payment 200 SUCCEEDED/PAID; order detail 200 PAID; danh sách vé 200 có đúng một vé. Artifact `buyer-curl.json`. Không in Bearer hoặc ticket QR token.
- 01:07:11: kiểm tra bổ sung nội dung chuyển khoản khớp và audit source **SEPAY_WEBHOOK**. Điều này phân biệt xử lý từ webhook với settlement API-only; API v2 đã liên kết cùng giao dịch, không tạo inbox thứ hai. Snapshot read-only mới vẫn một vé/thông báo/audit.
- Thay trang hướng dẫn local bằng thông báo **ĐÃ THANH TOÁN — KHÔNG CHUYỂN THÊM**; không tiếp tục hiển thị QR thanh toán trên trang đó. Ảnh QR đã tải chỉ giữ làm artifact riêng.
- Giữ nguyên lịch sử thật và case L5; chưa xóa user/order/payment/inbox/ticket/audit/notification. Quyền ADMIN tạm của organizer đã bỏ ngay sau setup.
- 01:10:03: đọc lại Supabase xác nhận vẫn một inbox PROCESSED, order PAID, payment SUCCEEDED, đúng amount/account/content, ticket/notification/audit = 1/1/1, audit source SEPAY_WEBHOOK. Người dùng xác nhận lần gửi đầu HTTP 200 và tiền đã có tại MBBank; không tự truy cập Dashboard/ngân hàng để xác nhận thay người dùng.

## Kết luận nghiệm thu

Đóng L5 theo tiêu chí giao dịch thật đã thống nhất: đúng tài khoản/số tiền/nội dung, webhook xử lý thanh toán, một vé/thông báo/audit và đối soát lặp không nhân đôi. Retry webhook Live không thực hiện được trong Dashboard hiện tại theo người dùng; giữ NOT RUN, tách khỏi duplicate qua reconcile đã PASS. Không yêu cầu chuyển thêm tiền để thay kiểm thử retry. Supabase Data API còn là mục chưa kiểm tra của L4; việc đóng L5 không tự đóng mục đó. Không commit Git hoặc xóa lịch sử giao dịch thật.
