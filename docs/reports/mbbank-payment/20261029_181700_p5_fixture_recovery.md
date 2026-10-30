# P5 local fixture recovery after expired attempt

**Thời điểm:** 29/10/2026, 18:17 UTC+7  
**Mục tiêu:** Gỡ chặn tạo fixture P5 mới sau khi payment mô phỏng trước hết hạn, bằng workflow hết hạn hiện có và helper local.  
**Phạm vi:** Chỉ PostgreSQL local `eventhub_sepay_local`, API/worker local, Test mode chưa được gọi trong lần này. Không kết nối Supabase, không thay đổi API nghiệp vụ cũ.

## Phát hiện

- DB guard xác nhận `127.0.0.1:55432 / eventhub_sepay_local / sepay_local / isolated Docker volume`; API local cổng 8010 trả HTTP 200.
- Payment trước vẫn `PENDING` sau khi order hết hạn. Worker `sepay-local-worker.cjs` chỉ xử lý webhook inbox; nó không chạy `booking.expire()`.
- Chạy workflow `booking.expire()` một lần qua helper tạm thời có guard DB local đã chuyển order sang `EXPIRED`, giữ payment cũ để tra soát (`requires_review`), và nhả reservation theo nghiệp vụ.
- Fixture helper ban đầu chặn mọi payment `PENDING/UNKNOWN` trên toàn DB, kể cả payment lịch sử gắn với order đã EXPIRED. Đây là điều kiện quá rộng cho việc tạo order độc lập trong test.

## Thay đổi và thực thi

- Cập nhật `.local/sepay/prepare-simulation-order.cjs` (file Git ignored): chỉ chặn nếu còn attempt PENDING/UNKNOWN gắn với order `PENDING_PAYMENT` chưa hết hạn. Không sửa/xóa payment cũ và không nới lỏng kiểm tra bên trong API.
- Tạo thành công fixture mới qua API local: order `78cad958-9994-4657-865c-5e44d235a497`, payment `9e8c2858-68b0-44e4-abcf-6a39ae4b3492`, trạng thái order `PENDING_PAYMENT`, payment `PENDING`, amount `150000 VND`, transfer content `tkhMYG`, hết hạn `2026-10-29T11:32:36.526Z` UTC (18:32:36 UTC+7), giữ chỗ đến `2026-10-29T11:47:36.526Z` UTC (18:47:36 UTC+7).
- Mã `tkhMYG` có hậu tố 3 ký tự, thuộc quy tắc Test mode đã xác nhận `tkh[A-Za-z0-9]{3,10}`.
- Chưa gọi SePay API v2 và chưa gửi giao dịch mô phỏng; chưa xác nhận webhook/API-only recovery.

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| DB đích được guard | PASS — DB local riêng |
| API local health | PASS — HTTP 200 |
| Workflow expire | PASS — một đơn hết hạn chuyển EXPIRED; payment giữ audit/review |
| Helper tạo fixture mới | PASS — order/payment PENDING mới, số tiền và mã hợp lệ |
| SePay Test simulation / reconcile | NOT RUN — chờ người dùng mô phỏng |
| Supabase | NOT ACCESSED |
| Hồi quy API demo/VNPAY | NOT RUN |

## Giới hạn và việc tiếp theo

Trong bước kiểm tra trước, một lần đọc runtime đã làm giá trị credential xuất hiện trong đầu ra công cụ. Không chép lại các giá trị vào báo cáo. Người dùng cần thu hồi/đổi API v2 Sandbox token và webhook secret, cập nhật `.local/sepay/runtime.json`, rồi khởi động lại API và worker trước lần reconcile/webhook tiếp theo. Payment mới đã được tạo trước khi việc xoay credential này được xác nhận; thao tác tạo payment không gọi SePay.

Trong SePay Test mode, mô phỏng đúng tài khoản MBBank, loại tiền vào, amount `150000` VND và nội dung chính xác `tkhMYG`. Để thử nhánh API-only, tạm tắt riêng webhook Test trong lúc mô phỏng rồi bật lại sau khi giao dịch xuất hiện; không replay webhook. Payment cần được mô phỏng trước 18:32:36 UTC+7. Sau đó báo đã mô phỏng và tình trạng webhook để chạy reconcile/đối chiếu local.
