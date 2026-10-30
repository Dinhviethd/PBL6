# Báo cáo chuẩn bị môi trường mô phỏng SePay Test mode

Thời điểm: 29/10/2026, 16:28 UTC+7. Mục tiêu: chuẩn bị an toàn để người dùng tự gửi mô phỏng; chưa thực hiện mô phỏng và chưa mở trạng thái P4.

## Xác minh hiện tại

| Hạng mục | Kết quả |
|---|---|
| PostgreSQL | PASS, DB local `eventhub_sepay_local` trên `127.0.0.1:55432`, container/volume dành riêng SePay. Chạy `sepay-local.cjs verify` và `check`; không kết nối Supabase. |
| Build và boundaries | PASS `npm run build`, `npm run check:boundaries`. |
| Runtime config | Đã tạo file `.local/sepay/runtime.json` dạng khung trống bằng tiện ích local không nhận credential làm tham số. File được Git ignore. Các trường MBBank Test account/account name/HMAC secret chưa được nhập; không đọc hoặc lưu credential vào báo cáo. |
| Ngrok | PASS đang tồn tại HTTPS `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` forward tới `http://localhost:8010`. |
| API listener | NOT READY; hiện không có process lắng nghe cổng 8010 trong phiên kiểm tra. |
| Local fixtures | users=4, events=3; orders=0, payments=0, tickets=0. DB sạch cho SePay nhưng chưa có payment pending để đối chiếu tiền mô phỏng thành công. |
| Supabase | Không kết nối, đọc, ghi hoặc migrate. |

## URL nhận webhook

Khi API P3 local khởi động thành công, nhập URL này vào SePay **Test mode**:

`https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`

Tunnel đã hướng đúng cổng 8010 tại thời điểm kiểm tra; nhưng route chưa thể nhận request khi API chưa lắng nghe. URL/domain ngrok có thể đổi, cần kiểm tra lại trước lúc test.

## Tiện ích cấu hình an toàn

Cập nhật `server/scripts/sepay-local-runtime.cjs`: chạy `node scripts/sepay-local-runtime.cjs` tạo khung cấu hình trống; không truyền account/secret trong command line. Người dùng tự điền `accountNumber`, `accountName`, `webhookSecret` trong file bị ignore `.local/sepay/runtime.json`. Chỉ dùng tài khoản MBBank Test mode và HMAC secret Test mode; tuyệt đối không gửi nội dung file/secret vào chat hoặc Git.

## Còn thiếu để có khả năng phát sinh kết quả mô phỏng thành công

1. Người dùng nhập đủ ba trường cấu hình local và xác nhận chỉ trạng thái đã nhập, không chia sẻ giá trị.
2. Khởi chạy `node scripts/sepay-local-api.cjs`; xác minh process/route ở 8010. Khởi chạy worker riêng `node scripts/sepay-local-worker.cjs` để xử lý inbox.
3. Tạo một đơn và payment SePay PENDING trên DB local qua buyer API; ghi lại mã chuyển khoản và số tiền từ response an toàn. Không tạo trạng thái PAID thủ công.
4. Người dùng cấu hình mô phỏng SePay Test mode với đúng ngân hàng/tài khoản, mã/nội dung và số tiền tương ứng payment pending; sau đó gửi thử webhook. Kết quả thành công cần HTTP ACK bền vững và worker đối chiếu đúng, order/payment/ticket đổi trạng thái như kỳ vọng. Nếu chỉ gửi giao dịch mô phỏng không khớp pending payment, webhook có thể ACK nhưng transaction vào REVIEW và không cấp vé.
5. Chỉ người dùng xác nhận mô phỏng thành công mới mở cổng tiếp tục P4.

## Các bước đã thực thi

- `node scripts/sepay-local.cjs verify`: PASS; DB identity local đúng.
- `node scripts/sepay-local.cjs check`: PASS constraints; users=4, events=3, orders/payments/tickets=0.
- `npm run build`: PASS.
- `npm run check:boundaries`: PASS.
- Kiểm tra ngrok admin API: HTTPS domain đang forward `localhost:8010`.
- Listener check: 8010 chưa lắng nghe.
- Không gọi webhook/health/backend cũ, không chạy SePay Dashboard, không truy cập Supabase.

Kết luận: **môi trường nền local và tunnel đã chuẩn bị phần lớn; chưa sẵn sàng gửi mô phỏng vì thiếu runtime values, listener và payment pending để đối chiếu**.