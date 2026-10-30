# A7 — Tạo order live để kiểm tra chuyển trang

- Thời điểm: 2026-10-30 22:11 (Asia/Ho_Chi_Minh)
- Runtime: EventHub trên `richelle-unrelapsing-flavourlessly.ngrok-free.dev`, API kết nối Supabase.
- Event: `d168e3d7-f960-49cb-8920-5f08309fc543` (Swimming Championship).
- Phạm vi: tạo một order test trên runtime qua UI thật và mở Checkout/SePay; không sửa source.

## Kết quả

- Runtime `/api/health`, `/api/config`, event list/detail trả HTTP 200; cấu hình `paymentMode=disabled`, `sepayEnabled=true`.
- Event đang `PUBLISHED`, `sales_paused=false`, thời gian mở bán còn hiệu lực. Phổ Thông có giá 10.000 VND, sức chứa 10, đã bán 6, đang giữ 0 (còn 4); VIP 20.000 VND.
- Đăng nhập UI qua route từ trang sự kiện thành công (`POST /api/auth/login` HTTP 200). Thử điều hướng bằng full page load làm mất state xác thực phía client; không phát sinh request tạo order trong lượt đó.
- Thử lại đúng luồng SPA: từ trang sự kiện chọn một vé Phổ Thông, chuyển qua đăng nhập rồi quay lại trang sự kiện; `POST /api/orders` trả HTTP 200. Order test một vé 10.000 VND được tạo.
- Từ Checkout, `POST /api/sepay/orders/:orderId/payment` trả HTTP 201; provider response báo `environment=live`, `canTransfer=true`. Checkout được giữ mở trong browser automation để chờ backend cập nhật PAID và kiểm tra tự redirect A7.
- Chưa có giao dịch chuyển khoản được xác nhận. Chưa kết luận A7 end-to-end. Người dùng tự thực hiện bước chuyển tiền; không ghi thông tin ngân hàng, nội dung chuyển khoản, credential hoặc order ID vào report.

## Trạng thái tại thời điểm report

Order đang pending và chờ người dùng chuyển đúng số tiền/nội dung hiển thị ở Checkout. Browser Checkout tiếp tục polling; thời hạn giữ chỗ ngắn, nếu order hết hạn trước khi SePay ghi nhận thì luồng redirect thành công chưa thể được xác minh bằng order này.

## Master Plan

A7 có bằng chứng runtime thật đến bước tạo order và SePay Live instructions; kết quả transition sau xác nhận thanh toán vẫn đang chờ.
