# A7 — Kết quả kiểm thử thanh toán thật trên Supabase

- Thời điểm: 2026-10-30 22:14 (Asia/Ho_Chi_Minh)
- Runtime: `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev`.
- Event đã chọn: `d168e3d7-f960-49cb-8920-5f08309fc543` (Swimming Championship).
- Phạm vi: order UI thật, SePay Live, backend state và Checkout → A7; không sửa source/deploy.

## Kết quả thanh toán

- UI login thành công, order một vé Phổ Thông tạo qua `POST /api/orders` HTTP 200; SePay Live instructions tạo qua `POST /api/sepay/orders/:orderId/payment` HTTP 201.
- Sau khi người dùng xác nhận đã chuyển khoản, Supabase được kiểm tra trong transaction chỉ đọc, TLS CA verified: order `PAID`, payment provider `sepay`, payment `SUCCEEDED`, `requires_review=false`, `last_verified_at` có giá trị và có 1 ticket.
- Không lưu account/password, dữ liệu chuyển khoản, QR hoặc order ID trong report.

## Kết quả redirect

- Browser automation giữ nguyên trang Checkout đang polling. Sau khi order đã là `PAID` trong Supabase, trang không tự điều hướng sang `/payment-status/:orderId` trong khoảng quan sát (hơn 30 giây); không nhận được kết quả A7.
- Bundle JavaScript đang được phục vụ bởi runtime (`/assets/index-BmqyIP6d.js`) có các module checkout/order-history nhưng không chứa chuỗi route `payment-status`, symbol `PaymentStatus` hoặc heading `Thanh toán thành công`. Repo source hiện tại có route/page A7 tương ứng.

## Nguyên nhân được xác minh

**Frontend trên runtime ngrok chưa được cập nhật theo source có A7.** Backend/SePay đã xác nhận thanh toán và phát hành vé, nhưng bundle đang chạy không chứa A7 route/redirect nên browser không thể chuyển sang trang A7. Đây là nguyên nhân trực tiếp của lần test này; không phải webhook/reconciliation/payment bị lỗi.

## Trạng thái và bước cần làm

- Luồng ngân hàng/Webhook/DB đến `PAID` và phát hành vé: **PASS** trong giao dịch này.
- Redirect Checkout → A7 trên runtime đang triển khai: **FAIL**.
- Source frontend trong repo vẫn có redirect/page A7; cần build/redeploy frontend runtime bằng source có A7 rồi chạy lại browser test. Không thực hiện build/deploy trong phiên này.
- Không ghi nhận thông tin tài khoản/thanh toán trong tài liệu. Report trước `A7_20261030_221101_live_order_pending.md` mô tả trạng thái trước khi user xác nhận giao dịch.
