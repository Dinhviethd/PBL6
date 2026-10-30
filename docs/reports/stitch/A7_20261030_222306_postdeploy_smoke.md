# A7 — Smoke test sau khi cập nhật frontend runtime

- Thời điểm: 2026-10-30 22:23 (Asia/Ho_Chi_Minh)
- Runtime ngrok upstream được xác nhận là `http://localhost:8000`.
- Không tạo order mới và không phát sinh thanh toán mới.

## Kiểm tra bundle

- Người dùng kiểm tra HTML runtime và nhận bundle mới `/assets/index-DYDEyZ0Q.js`.
- JavaScript bundle trả `Contains("payment-status") = true`.

## Browser smoke test với order đã thanh toán

- Đăng nhập UI: `POST /api/auth/login` HTTP 200.
- Mở `/checkout/{existingPaidOrderId}` trong cùng browser context.
- Checkout tự điều hướng đến `/payment-status/{orderId}`.
- A7 render H1 `Thanh toán thành công`.
- `GET /api/me/orders/{orderId}`: HTTP 200, `status=PAID`.
- `GET /api/me/order-history/{orderId}`: HTTP 200, `status=PAID`.

## Kết luận và giới hạn

**PASS smoke test không thu thêm tiền:** frontend bundle sau redeploy có route A7 và Checkout tự chuyển sang A7 khi order API trả `PAID`; A7 tải chi tiết đơn thành công.

Test này mở Checkout với một order đã `PAID`, nên xác minh redirect khi Checkout nạp được trạng thái `PAID` ngay từ đầu. Chưa chạy lại nhánh Checkout đang mở ở `PENDING_PAYMENT` rồi nhận SePay Live confirmation sau deploy; nhánh đó cần payment/order mới và sẽ phát sinh thêm giao dịch. Browser mock tests trước đó vẫn xác minh polling-to-PAID logic phía client.

## Master Plan

A7 runtime bundle được cập nhật và smoke redirect thực với order paid đạt. Ghi rõ nhánh payment-in-progress sau deploy chưa được thử lại.
