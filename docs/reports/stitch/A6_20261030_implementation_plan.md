# Kế hoạch mở rộng A6 — Thanh toán MB Bank qua SePay

- Mã/tên màn hình: **A6 — Thanh toán & xác nhận đơn hàng** (`/checkout/:id`)
- Ngày lập: **2026-10-30 (Asia/Ho_Chi_Minh)**
- Hành động: **implementation_plan / rà soát tài liệu và source**
- Trạng thái: **ROLLED OUT TO LIVE UI — ready for user-controlled test; xem `A6_20261030_164752_live_ui_rollout.md`**
- Nguồn thiết kế: Stitch project `10374042969343935993`, screen `682d24a1b87b410dbbbcc01baa983b21`; tiếp tục giữ artifact nguyên trạng.
- Báo cáo nền: [A6 implementation 2026-10-27](A6_20261027_233053_implementation.md)

## 1. Mục tiêu

Bổ sung lựa chọn thanh toán chuyển khoản tự động MB Bank qua SePay ngay trong khung A6 đang có. Người mua có thể chọn VNPay hoặc MB Bank/SePay; khi chọn MB Bank, hệ thống tạo chỉ dẫn thanh toán duy nhất cho đơn, hiển thị QR VietQR và thông tin chuyển khoản, nhận giao dịch ngân hàng tự động, đối chiếu đúng đơn và chỉ hoàn tất đơn/phát hành vé sau khi xác nhận đủ điều kiện.

Giữ nguyên shell/header/footer, stepper, hai cột, thẻ tóm tắt vé, panel người nhận read-only, màu sắc và ngôn ngữ thiết kế đang triển khai. Chỉ mở rộng vùng “Phương thức thanh toán” bên trong panel sẵn có; không thay đổi artifact Stitch vì chưa có yêu cầu sửa thiết kế Stitch. Giữ VNPay và bốn phương thức phụ hiện có theo hành vi đã ghi nhận.

## 2. Căn cứ đã rà soát

### A6 hiện tại

Báo cáo A6 ngày 2026-10-27 ghi nhận VNPay là lựa chọn lớn nhất/mặc định; bốn phương thức phụ đang hiển thị toast “Chức năng sẽ sớm được cập nhật” và không tạo giao dịch. `POST /orders/:id/payments` từng trả `vnpay_sandbox`, `PENDING`; chưa xác minh giao dịch VNPay end-to-end, callback/PAID thật hoặc accessibility toàn diện. Thiết kế Stitch gốc có VietQR/MB Bank dạng minh họa, nhưng dùng thông tin giả lập; không được tái sử dụng thông tin giả làm thanh toán thật.

### Backend SePay có trong source (đã xác minh tĩnh ngày 2026-10-30)

- `POST /api/sepay/orders/:orderId/payment`: yêu cầu đăng nhập; tạo/tái sử dụng payment và trả dữ liệu hướng dẫn thanh toán. Có thể trả `201` khi tạo mới hoặc `200` khi lấy lại.
- `GET /api/sepay/orders/:orderId/payment`: yêu cầu đăng nhập; đọc trạng thái/thông tin hướng dẫn; giới hạn polling 30 lần/phút/người dùng.
- `POST /api/payments/sepay/webhook`: nhận raw JSON; kiểm tra một `X-SePay-Timestamp` và `X-SePay-Signature`, xác minh HMAC trước khi nhận sự kiện.
- `POST /api/admin/sepay/reconcile`: ADMIN; gọi SePay API v2 để đối soát giao dịch trong lookback 5–1440 phút.
- `GET /api/admin/sepay/transactions`: ADMIN; lọc trạng thái, khoảng ngày, reference và phân trang.
- `GET /api/admin/sepay/transactions/:id`: ADMIN; chi tiết và lịch sử review.
- `POST /api/admin/sepay/transactions/:id/reprocess`: ADMIN; xếp lại giao dịch ERROR/REVIEW.
- `POST /api/admin/sepay/transactions/:id/resolve`: ADMIN; ghi nhận xử lý thủ công với outcome, lý do và evidence reference.

Nguồn: `server/src/app.ts`, `server/src/modules/payment/sepay.ts`, `server/src/modules/payment/sepay-api-v2.ts`, `server/src/modules/payment/infrastructure/sepay-store.ts`, `server/src/workflows/sepay-booking.ts`, `server/src/workflows/sepay-webhook.ts`. Đây là xác minh source/route, **không phải** bằng chứng API đang chạy hoặc SePay/MB Bank đã cấu hình, kết nối tài khoản thành công hay giao dịch đã được xử lý thực tế.

## 3. Khung UI dự kiến (không đổi layout tổng)

1. Trong panel phương thức hiện tại, thêm lựa chọn **Chuyển khoản ngân hàng — MB Bank qua SePay** cạnh lựa chọn VNPay. Dùng radio/card và token Cosmic Graffiti đang có; VNPay vẫn giữ card/nút hiện tại.
2. Khi chọn SePay và đã tạo payment: trong panel hiện tại mở vùng hướng dẫn gồm QR từ response backend, ngân hàng, số tài khoản, tên chủ tài khoản (nếu cấu hình trả về), số tiền chính xác, nội dung chuyển khoản chính xác, hạn thanh toán và trạng thái “Đang chờ thanh toán”. Có nút sao chép cho số tiền/nội dung/số tài khoản và xử lý lỗi clipboard.
3. Nêu rõ khách phải chuyển đúng số tiền và nội dung; không hiển thị thông tin tài khoản mẫu hoặc QR hard-code. Không hỏi thông tin đăng nhập/ngân hàng của khách và không thực hiện lệnh chuyển tiền thay khách.
4. Tái sử dụng vùng trạng thái/CTA hiện có: pending, succeeded/PAID, hết hạn, hủy, cần hỗ trợ/đối soát. Không đánh dấu thành công dựa trên redirect, ảnh chụp, thao tác người dùng hay chỉ vì webhook HTTP 2xx.
5. Làm mới trạng thái có kiểm soát, tôn trọng giới hạn 30 request/phút; dừng polling khi đơn/payment kết thúc, trang rời hoặc lỗi quyền. Có nút “Kiểm tra trạng thái” thủ công nếu cần.
6. Khi API tạo hướng dẫn báo lỗi/cấu hình chưa sẵn sàng, hiển thị lỗi có thể hành động và giữ nguyên tổng tiền/đơn; không tự chuyển sang demo hoặc báo đã thanh toán.

## 4. API/contract cần dùng hoặc xác nhận

| Thành phần | Method/đường dẫn | Mục đích | Bằng chứng hiện có / việc cần xác minh |
|---|---|---|---|
| Tạo/lấy hướng dẫn SePay | `POST /api/sepay/orders/:orderId/payment` | Tạo hoặc lấy payment cùng QR/thông tin MB Bank | Route và auth có trong source; xác minh runtime contract, response schema, ownership, idempotency, timeout và mã lỗi trên môi trường mục tiêu. Request hiện strict empty object. |
| Trạng thái SePay | `GET /api/sepay/orders/:orderId/payment` | Tải lại payment/order status | Route và giới hạn 30 lần/phút có trong source; xác minh payload và nhịp polling phù hợp. |
| Tiếp nhận biến động | `POST /api/payments/sepay/webhook` | SePay báo giao dịch vào | Route raw-body và xác thực HMAC có trong source; cấu hình webhook HTTPS, secret, timestamp/signature, retry, duplicate và cảnh báo cần được xác minh với SePay. |
| Đối soát dự phòng | `POST /api/admin/sepay/reconcile` | Đồng bộ giao dịch API v2, nối webhook với giao dịch, phát hiện sự kiện thiếu | Route ADMIN/source có; xác minh sandbox/live token và API base, giới hạn upstream, thời gian lookback, kết quả reconcile. |
| Tra cứu giao dịch | `GET /api/admin/sepay/transactions` | Vận hành, theo dõi unmatched/review/error | Route ADMIN/source có; cần kiểm tra vai trò, filter/pagination và dữ liệu masking. |
| Chi tiết giao dịch | `GET /api/admin/sepay/transactions/:id` | Xem chi tiết và audit review | Route ADMIN/source có; kiểm tra masking/PII/audit. |
| Thử xử lý lại | `POST /api/admin/sepay/transactions/:id/reprocess` | Đưa giao dịch lỗi/review vào hàng đợi lại | Route ADMIN/source có; xác nhận idempotency và audit trail. |
| Ghi nhận xử lý ngoại lệ | `POST /api/admin/sepay/transactions/:id/resolve` | Lưu kết quả điều tra thủ công | Body source: `outcome` = `confirmed_external` / `refund_external` / `unmatched`, `reason`, `evidenceReference` tùy chọn; không đồng nghĩa tự hoàn tiền. |
| VNPay hiện hữu | `POST /api/orders/:id/payments` và `/api/payments/vnpay/return`, `/api/payments/vnpay/ipn` | Giữ phương thức hiện hữu | A6 đã xác minh tạo sandbox PENDING; callback/IPN và thanh toán end-to-end vẫn cần xác minh riêng. |
| Đơn và vé | `GET /api/me/orders/:id`, `POST /api/orders/:id/cancel`, `GET /api/me/tickets` | Dựng UI, hủy đơn, xác nhận vé sau thanh toán | A6 đã xác minh order detail/cancel; khi nghiệm thu SePay cần xác nhận lại trạng thái PAID và vé chỉ được phát hành đúng một lần. |

SePay hiện hướng dẫn webhook nhận `HTTP POST` với chọn sự kiện tiền vào, tài khoản ngân hàng và phương thức xác thực; nền tảng cũng cung cấp API để chủ động truy vấn giao dịch. Repo tích hợp v2 dùng các endpoint riêng dưới `userapi(-sandbox).sepay.vn/v2`; phải đối chiếu tài liệu và credential đúng môi trường khi cấu hình, không nhầm với OAuth API v1 hay User API v1. Tài liệu tham chiếu: [SePay Webhooks](https://docs.sepay.vn/tich-hop-webhooks.html), [Giới thiệu SePay API](https://docs.sepay.vn/gioi-thieu-api.html), [SePay API Giao dịch](https://docs.sepay.vn/api-giao-dich.html), [OAuth2 API Webhooks](https://docs.sepay.vn/oauth2/api-webhooks.html). Tài liệu upstream có thể thay đổi; đối chiếu lại lúc triển khai.

## 5. Kết quả mong muốn

- Khách chọn được VNPay hoặc MB Bank/SePay trong cùng checkout, không rời khung A6 cho tới khi chọn “Thanh toán VNPay” hoặc hoàn tất chuyển khoản.
- SePay tạo payment tham chiếu đơn, số tiền VND chính xác, mã nội dung chuyển khoản duy nhất, hạn giữ chỗ và QR tương ứng với tài khoản MB Bank đã cấu hình.
- Chuyển khoản đến được nhận tự động bằng webhook đã xác thực; sự kiện được lưu/idempotent, đối chiếu đúng payment và cập nhật đơn qua workflow/transaction hiện có.
- Giao dịch trùng, sai số tiền/nội dung, ngoài hạn, sai tài khoản, mâu thuẫn payload hoặc không ghép được chuyển sang review; không tự cấp vé nhầm.
- Giao dịch thành công hợp lệ chỉ hoàn tất đơn và phát hành vé một lần; UI cập nhật trạng thái bằng API thật.
- Admin có khả năng tìm, xem, reconcile, reprocess hoặc ghi nhận xử lý ngoại lệ theo quyền; dữ liệu tài khoản được che/masking.
- Lỗi hoặc cấu hình thiếu được thể hiện rõ; A6 không báo thành công giả.

## 6. Tiêu chí đánh giá / nghiệm thu

| # | Tiêu chí | Đạt khi |
|---|---|---|
| 1 | Giữ khung hiện tại | Header/footer, stepper, cột, thẻ đơn, panel người nhận và style A6 không bị tái bố cục; chỉ mở rộng panel payment. Không thay đổi Stitch. |
| 2 | Phương thức | VNPay tiếp tục hoạt động; SePay/MB Bank có lựa chọn dễ hiểu; 4 phương thức phụ giữ hành vi đã yêu cầu trước đó. |
| 3 | Dữ liệu payment | QR, ngân hàng, account, amount, transfer content, expiry và trạng thái đều lấy từ API; không có tài khoản/mã thanh toán nghiệp vụ hard-code. |
| 4 | Tạo payment | Chỉ tạo cho đơn của người dùng, đúng một payment hoạt động theo quy tắc backend; refresh/retry không tạo thanh toán trùng hoặc đổi nội dung. |
| 5 | Bảo mật webhook | Sai/thiếu chữ ký, timestamp không hợp lệ hoặc payload lỗi bị từ chối; raw body được dùng để kiểm HMAC; secret không lộ client/log. |
| 6 | Ghi nhận giao dịch | Webhook duplicate được xử lý idempotent; conflict/mismatch/underpayment/overpayment/late payment không tự đánh dấu PAID và có trạng thái review phù hợp. |
| 7 | Đối soát | Admin reconcile có thể phát hiện/gắn giao dịch bị mất webhook mà không tạo xử lý trùng; tôn trọng token/môi trường/rate limit. |
| 8 | Cấp vé | Chỉ giao dịch thành công đã xác minh mới hoàn tất order; vé và QR tạo đúng một lần; pending/failure/cancel/expired không có vé hợp lệ. |
| 9 | UI trạng thái | Loading, lỗi, chờ, đã thanh toán, hết hạn, hủy và cần hỗ trợ hiển thị đúng; polling tuân giới hạn server và dừng sau trạng thái cuối. |
| 10 | Quyền/admin | Customer chỉ đọc payment/order của mình; admin routes yêu cầu ADMIN; thông tin tài khoản được che nơi cần thiết; có audit xử lý thủ công. |
| 11 | Môi trường thật | Sandbox/test và live được tách cấu hình; test dùng test credential; live chỉ bật khi account MB Bank/SePay, webhook HTTPS/secret và API token đúng môi trường đã xác minh. |
| 12 | Kiểm chứng kỹ thuật | API runtime, build và kiểm thử luồng webhook/đối soát/UI trên DB cô lập có bằng chứng; kiểm tra desktop/mobile và accessibility chính của vùng payment. Kết quả được ghi report triển khai riêng. |

## 7. Rủi ro, giả định và phụ thuộc

- SePay hỗ trợ kết nối ngân hàng bằng phương thức khác nhau tùy ngân hàng/tài khoản; cần xác minh tài khoản MB Bank cụ thể đã kết nối và có biến động giao dịch khả dụng. “Tự động” phụ thuộc khả năng lấy giao dịch của tài khoản và webhook/đối soát được cấu hình, không được suy ra chỉ từ việc source có adapter.
- Kiểm tra `server/.env.example`, config parser/deployment secrets và migration/schema trước khi triển khai; không đưa secret vào client hoặc commit. Phải phân biệt `test`/sandbox với `live` và kiểm soát bật thanh toán mới.
- Chuyển khoản có thể đến trễ hoặc sai nội dung/số tiền; cần quy trình điều tra/refund ngoài hệ thống. Endpoint resolve hiện ghi quyết định vận hành, không thực hiện chuyển khoản hoàn tiền.
- Không poll quá 30 lần/phút/người dùng; đặt chu kỳ thấp hơn giới hạn, xử lý 429/backoff và không dựa vào polling làm nguồn xác nhận giao dịch.
- Không thể đánh dấu thanh toán đầu-cuối đạt trước khi có môi trường/credential phù hợp; khi thiếu sẽ ghi `BLOCKED` ở hạng mục runtime integration thay vì dùng mock.

## 8. Trạng thái và bước tiếp theo

- Source/API SePay: **PRESENT — xác minh tĩnh**.
- API đang hoạt động và config SePay/MB Bank: **NOT_VERIFIED**.
- A6 frontend SePay: **ROLLED OUT**; API `/config` trả `sepayEnabled=true` trên local/Vite và tunnel; tạo payment Live được bật.
- Webhook MB Bank và đối soát thật: **NOT_VERIFIED**.
- UI/UX: **kế hoạch giữ khung hiện tại; không sửa Stitch**.

Đã phát hành API/bundle và bật cờ nhận payment Live; runtime local, Vite proxy, tunnel, config, auth origin, API/worker đã được kiểm tra read-only. Chi tiết ở [báo cáo rollout](A6_20261030_164752_live_ui_rollout.md). Chưa tạo giao dịch mới; người dùng tự kiểm tra thông tin và thực hiện chuyển tiền.

## 9. Thay đổi Master Plan

Cập nhật ngày 2026-10-30: mục tổng quan thanh toán, ma trận tích hợp mục 4 #10 và mục 5.4 A6 ghi nhận backend SePay có trong source, phần A6 SePay là kế hoạch chưa triển khai, cùng liên kết báo cáo này. Không thay đổi mã nguồn, cấu hình hoặc artifact Stitch trong phiên.
