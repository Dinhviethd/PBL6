# Nghiệm thu P5 API-only recovery trên SePay Sandbox

**Thời điểm:** 29/10/2026, 18:22 UTC+7  
**Mục tiêu:** Xác minh backend khôi phục giao dịch qua SePay API v2 khi webhook Test không được gửi, tự hoàn tất payment/order và phát hành vé đúng một lần.  
**Phạm vi:** API v2 Sandbox thật và PostgreSQL local riêng; backend-only theo phạm vi P5 người dùng xác nhận. Không dùng tiền thật, không truy cập Supabase.

## Tiền điều kiện và bằng chứng

- Người dùng báo đã sửa parser Test mode thành `tkh[A-Za-z0-9]{3,10}`, mô phỏng MBBank tiền vào 150.000 VND với nội dung `tkhMYG`, tắt webhook khi mô phỏng rồi bật lại.
- Fixture local khớp giao dịch: payment `9e8c2858-68b0-44e4-abcf-6a39ae4b3492`, order `78cad958-9994-4657-865c-5e44d235a497`, amount 150.000 VND, transfer content `tkhMYG`, lúc bắt đầu còn PENDING và chưa hết hạn.
- `node server/scripts/sepay-local.cjs verify` PASS: PostgreSQL `127.0.0.1:55432 / eventhub_sepay_local / sepay_local`, volume riêng. API `127.0.0.1:8010/api/health` trả HTTP 200.
- Local runtime có API v2 Sandbox token và webhook secret; file runtime được cập nhật trước khi API/worker hiện hành khởi động. Giá trị credential không đọc/in vào báo cáo. Không xác nhận độc lập với Dashboard việc token/secret mới đã được rotate; chỉ xác nhận cấu hình runtime được nạp và Sandbox API v2 trả thành công.

## Thực hiện

1. Dùng tài khoản ADMIN seed local để gọi `POST /api/admin/sepay/reconcile` với `lookbackMinutes=60`; credential chỉ đọc trong process, không ghi ra console.
2. Reconcile đầu trả HTTP 200: `scanned=6`, `imported=2`, `reviewed=0`, `matchedWebhook=0`, `duplicates=4`, `ignored=0`.
3. Worker local xử lý inbox. Bản ghi của payment mục tiêu đạt `PROCESSED`, có API v2 UUID và không có webhook transaction ID. Payment `SUCCEEDED`, không cần review; order `PAID`; có đúng 1 ticket.
4. Lặp reconcile: `scanned=6`, `imported=0`, `reviewed=0`, `matchedWebhook=0`, `duplicates=6`, `ignored=0`. Bản ghi mục tiêu vẫn `PROCESSED`, payment vẫn `SUCCEEDED`, order `PAID`, số ticket vẫn 1.
5. Trong khoảng reconcile có thêm một transaction khác được đưa vào `REVIEW / RESERVATION_NOT_HELD`; transaction này không gắn payment mục tiêu. Không tạo vé cho giao dịch đó. Đây là giao dịch lịch sử không còn reservation hợp lệ, được fail closed.

## Đánh giá tiêu chí P5 backend

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Cô lập DB local | PASS | Guard xác minh database/port/user/container/volume; không dùng `.env` hoặc Supabase. |
| API v2 Sandbox thật | PASS | Reconcile ADMIN trả HTTP 200 và import transaction API-only. |
| Webhook vắng trong lần mô phỏng | PASS theo bằng chứng người dùng và dữ liệu | Người dùng tắt webhook; transaction mục tiêu có API UUID nhưng không có webhook ID, `matchedWebhook=0`. |
| Matching code/amount/account | PASS | Giao dịch MBBank Test 150.000 VND với mã đầy đủ `tkhMYG` gắn đúng payment fixture 150.000 VND. |
| Tự động hoàn tất | PASS | Worker đưa transaction sang `PROCESSED`, payment `SUCCEEDED`, order `PAID`, phát 1 ticket. |
| Idempotency | PASS | Reconcile lặp chỉ duplicate; không import thêm mục tiêu, không tạo vé thứ hai. |
| Giao dịch cũ thiếu reservation | PASS fail closed | `REVIEW / RESERVATION_NOT_HELD`, không gắn vào payment mục tiêu, không cấp vé. |
| Hồi quy toàn hệ thống / QR ngân hàng thật / retry thực từ SePay | NOT RUN trong lượt này | Ngoài phạm vi ca API-only; không kết luận các tiêu chí đó đạt. |

## Kết luận và giới hạn

**P5 API/backend recovery đạt cho ca SePay Test mode API-only**: giao dịch được phục hồi từ API v2 Sandbox dù webhook không tới, payment/order hoàn tất và phát đúng một vé; lần reconcile lặp không tạo trùng. Đây không phải nghiệm thu Live, không chứng minh retry webhook, QR/ứng dụng ngân hàng thật hoặc UI checkout/admin. Không có thay đổi API demo/VNPAY; không truy cập Supabase.

P5 backend-only có thể đóng theo scope đã xác nhận. P6 là tổng hợp nghiệm thu và chuẩn bị đề xuất migration/cutover; P7 vẫn cần cho phép cụ thể trước mọi truy cập hoặc thay đổi Supabase/Live.
