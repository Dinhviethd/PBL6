# A12 — Đổi đích Xem đơn hàng

- Thời điểm: 2026-11-01 15:52:22 UTC+07 (Asia/Ho_Chi_Minh).
- Màn hình A12 — Thông báo của bạn; project Stitch `10374042969343935993`, screen `34f73bfd827e4025b19d91f00e3b2b88` theo report triển khai trước.
- [Kế hoạch và nhật ký](../../ui/Feature_A12_Notifications.md); [triển khai trước](A12_20261101_154342_implementation.md).

Đã đọc mục A12 trong Master Plan. Theo yêu cầu người dùng, đổi destination target ORDER trong Notifications.tsx từ `/checkout/${target_id}` sang `/payment-status/${target_id}`. Giữ orderId thật trong URL; thao tác đánh dấu đã đọc vẫn phải thành công trước điều hướng. Route `/payment-status/:orderId` đã tồn tại trong App.tsx; không đổi PaymentStatus hoặc API. Đích này áp dụng cho mọi notification target ORDER, kể cả WAIT_QUEUE_OFFER; PaymentStatus tiếp tục thể hiện trạng thái đơn backend như hiện có, không tự xác nhận PAID.

Cập nhật selector kỳ vọng trong notifications.spec.ts và helper a12-browser.cjs. Bổ sung vào regression UI có sẵn thao tác Xem đơn hàng: URL đi thẳng payment-status/order, không gọi API `/me/orders/` của Checkout. Hai test Chrome1280/390 PASS với API mock của suite; không coi đây là kiểm thử backend hoặc thanh toán thật. Client build và ESLint các file liên quan PASS; giữ cảnh báo bundle/Browserslist cũ. Không chạy lại integration database vì hợp đồng API không thay đổi.

Đã nạp assets mới và index vào container local, giữ assets cũ; không restart backend/worker. GET `/notifications` trỏ bundle `/assets/index-D8_uk-dm.js`; tải bundle200 và xác nhận nhánh “Xem đơn hàng” dùng payment-status; API container healthy. Backup index trước thay đổi tại `%TEMP%/a12-route-index-20261101-155222.html`. Image vẫn chưa rebuild. Hộp thư runtime đang trống nên chưa bấm CTA dữ liệu thật trên runtime trong phiên này.

Không gọi Stitch hoặc sửa thiết kế; đây là điều chỉnh hành vi được người dùng yêu cầu. Đã cập nhật plan (mapping target, báo cáo mới, thời điểm, nhật ký và kết quả runtime), Master Plan các mục A12 với report/thời điểm mới; giữ report cũ. Tiêu chí đổi route PASS bằng source/build/UI test; review A12 tổng thể giữ ĐẠT CÓ ĐIỀU KIỆN. Các giới hạn Live nonempty/native/accessibility/image rebuild ở report trước giữ nguyên. Không sửa backend, config, schema hoặc màn khác.
