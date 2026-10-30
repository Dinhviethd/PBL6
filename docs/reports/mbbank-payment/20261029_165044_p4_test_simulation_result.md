# Báo cáo kết quả mô phỏng SePay Test mode — payment khớp và phát hành vé

Thời điểm kiểm tra backend: 29/10/2026, 16:50 UTC+7. Người dùng cung cấp kết quả SePay gửi webhook tại 16:48:30 UTC+7: HTTP 200, 645 ms, response `{"success":true}`. Nội dung payload có thông tin tài khoản ngân hàng; báo cáo không chép lại số tài khoản hoặc payload đầy đủ.

## Phạm vi và database

Chỉ kiểm tra DB local `eventhub_sepay_local` (`127.0.0.1:55432`) sau `node scripts/sepay-local.cjs verify` xác nhận container/volume riêng. Không kết nối, đọc, ghi hoặc migrate Supabase; không gọi backend cũ. API/worker đang chạy bằng launcher P3 riêng đã được xác nhận qua process inspection. Không gửi thêm giao dịch mô phỏng.

## Đối chiếu kết quả

| Hạng mục | Kết quả | Bằng chứng local |
|---|---|---|
| SePay delivery | PASS theo bằng chứng người dùng: HTTP 200, `success=true` | Đối chiếu transaction ID `42679` tồn tại local |
| Môi trường / ngân hàng / chiều | PASS: `test`, `MBBank`, `in` | Bản ghi webhook local; account number so với runtime được xác nhận bằng boolean match, không in giá trị |
| Nội dung/mã | PASS: `code` webhook rỗng/null; worker trích mã duy nhất từ content `tkhPN8V` | `payment_code` có thể null nhưng `content` khớp payment transfer content |
| Số tiền | PASS: 150000 VND, đúng payment và order | Transaction amount = payment amount = order total = 150000 |
| Transaction | PASS: `PROCESSED`, reason null, gắn đúng `payment_id` | Một bản ghi webhook ID `42679`; transaction review count 0 |
| Payment | PASS: `SUCCEEDED`, `requires_review=false` | DB local payment row |
| Order | PASS: `PAID` | DB local order row |
| Vé | PASS: đúng 1 ticket `VALID` cho order | `tickets=1`, `valid=1` |
| Notification/audit | PASS: 1 notification `ORDER_PAID`, 1 audit `payment.verified` | Query local theo order/payment |
| Trùng lặp/tra soát | PASS cho lần chạy này: không có review hoặc vé trùng | `sepay_transaction_reviews=0`; fixture chỉ có 1 vé |

Kiểm tra tổng hợp sau xử lý: users=4, events=3, orders=1, payments=1, tickets=1, sepay_payment_details=1, sepay_transactions=1, sepay_transaction_reviews=0. `node scripts/sepay-local.cjs check` xác nhận DB identity và constraints PASS.

## Kết luận

**Mô phỏng Test mode đã thành công end-to-end cho happy path**: webhook được ACK sau lưu bền vững; worker ghép theo nội dung transfer dù trường `code` không có; payment và order chuyển thành công; vé được phát một lần. Số tiền không nhân 100 và được so sánh đúng VND. Không có giao dịch REVIEW.

Đây là bằng chứng sandbox cho một ca thành công. Chưa chứng minh chuyển khoản tiền thật, QR scan bằng app ngân hàng, SePay Live, retry/failure matrix ngoài các test local P3, hoặc production readiness. Không thay đổi API demo/VNPAY và không tác động Supabase.

## Trạng thái cổng P4

Điều kiện người dùng tự mô phỏng thành công đã được đáp ứng và kiểm chứng backend. P4 có bằng chứng PASS cho ca happy-path thực tế Test mode; không đánh dấu toàn bộ P4/P5 nghiệm thu vì các ca vận hành bổ sung và đối soát API v2 còn lại. Không tự chuyển sang thao tác Supabase hay tắt demo/VNPAY.