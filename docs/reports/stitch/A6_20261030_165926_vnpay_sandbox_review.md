# Báo cáo A6 — kiểm tra VNPay sandbox và dữ liệu Supabase

- Ngày: 2026-10-30 16:59 (Asia/Ho_Chi_Minh)
- Phạm vi: kiểm tra thứ tự phương thức checkout, khả năng VNPay sandbox trong backend/runtime và chỉ đọc tổng số dữ liệu Supabase để đánh giá có thể dùng làm sandbox hay không.
- Trạng thái: **UI đã đổi thứ tự; VNPay sandbox có trong source nhưng đang tắt trên runtime SePay Live; Supabase hiện tại có dữ liệu thật và không được dùng làm database sandbox dùng chung.**

## 1. Kết quả giao diện

Trong `client/src/pages/booking/Checkout.tsx`, thứ tự DOM trong nhóm phương thức thanh toán hiện là **MB Bank/SePay trước, VNPay sau**. VNPay tiếp tục phụ thuộc `paymentMode` trả về từ API cấu hình. Đã thêm assertion trong `client/tests/sepay-ui.spec.ts` kiểm tra hai radio đầu tiên có ID `ck-method-mbbank`, `ck-method-vnpay`.

`npm run build` trong `client/` thành công (TypeScript và Vite). Test Playwright `sepay-ui.spec.ts` chạy trên Chrome, **1/1 PASS**, bao gồm assertion thứ tự MB Bank rồi VNPay. Vite có cảnh báo bundle JavaScript lớn hơn 500 kB và dữ liệu Browserslist cũ; không có lỗi build.

## 2. VNPay sandbox đã có trong backend

Đã rà source:

- `server/src/modules/payment/vnpay.ts` triển khai adapter gọi VNPay sandbox, ký/xác minh chữ ký, tạo giao dịch và xác minh kết quả.
- `server/src/modules/payment/public.ts` hỗ trợ `PAYMENT_MODE=vnpay_sandbox` và đọc cấu hình merchant/server từ môi trường backend.
- `POST /api/orders/:id/payments` tạo intent theo provider đang cấu hình.
- `GET /api/payments/vnpay/ipn` nhận kết quả IPN và `GET /api/payments/vnpay/return` xử lý chuyển về giao diện; route được đăng ký tại `server/src/app.ts`.
- `server/src/workflows/booking.ts` xác minh callback trước khi áp dụng trạng thái thanh toán.

Đây là xác nhận **source và route tồn tại**, không phải xác nhận giao dịch sandbox end-to-end với merchant VNPay.

## 3. Runtime hiện tại

Kiểm tra API local trên cổng 8011: `/api/config` trả `paymentMode=disabled`, `sepayEnabled=true`. Container `pbl6-sepay-live-api-1` đang healthy; worker SePay vẫn chạy. Cổng 8000 hiện không có API trả lời.

Runtime SePay kiểm tra `PAYMENT_MODE=disabled` khi SePay được bật (`server/src/configs/sepay-runtime.ts`); lớp tạo app cũng chặn chạy đồng thời SePay và provider legacy. Runtime Live còn loại cấu hình `VNPAY_*` khỏi môi trường của API. Vì vậy **VNPay sandbox chưa được bật trên API Live đang chạy**. Thay `PAYMENT_MODE` trong tiến trình này sẽ vừa xung đột với guard SePay, vừa trộn giao dịch sandbox với dữ liệu đơn hàng thật.

## 4. Kiểm tra Supabase chỉ đọc

Chạy `server/scripts/sepay-supabase-readonly-check.cjs`. Script mở kết nối TLS đã xác minh và transaction `READ ONLY` với timeout, chỉ đếm hàng ở các bảng nghiệp vụ; không đọc thông tin định danh/giao dịch từng dòng, không ghi dữ liệu, và kết thúc bằng `ROLLBACK`.

| Hạng mục | Số hàng hiện có |
|---|---:|
| Người dùng | 14 |
| Đơn hàng | 28 |
| Thanh toán | 16 |
| Vé | 6 |

Kết nối xác nhận PostgreSQL 17.11 và vai trò kết nối là `postgres`. Số liệu này cho thấy Supabase đã lưu dữ liệu ứng dụng hiện hữu; **không nên dùng database này để chạy đơn thanh toán sandbox** vì giao dịch/đơn thử có thể xuất hiện cùng dữ liệu thật, gây ảnh hưởng kiểm toán, trạng thái vé hoặc đối soát.

## 5. Kết luận và điều kiện để bật sandbox

VNPay sandbox API đã có; yêu cầu “kích hoạt lại” chưa thể hoàn tất an toàn trên tiến trình SePay Live hiện tại. Cần một runtime sandbox riêng trỏ đến **database riêng biệt** (có thể là Supabase project/database riêng hoặc PostgreSQL local), với sandbox merchant credentials và `PUBLIC_API_URL`/callback tương ứng. Frontend sandbox cần gọi API sandbox riêng. SePay Live tiếp tục giữ nguyên provider và database hiện tại.

Không có thay đổi nào được ghi vào Supabase; không tạo đơn, payment hoặc chuyển tiền trong phiên kiểm tra này. Bằng chứng chỉ đọc cho phép xác nhận trạng thái và số hàng hiện tại, nhưng không được lưu/nhân bản dữ liệu thật vào sandbox.
