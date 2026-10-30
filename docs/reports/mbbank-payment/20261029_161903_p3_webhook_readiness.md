# Báo cáo kiểm tra URL webhook và trạng thái sẵn sàng

Thời điểm: 29/10/2026, 16:19 UTC+7. Phạm vi: kiểm tra read-only trước khi người dùng tự chạy mô phỏng SePay Test mode. Không bắt đầu P4, không cấu hình SePay Dashboard, không đổi ngrok, không gọi Supabase hoặc backend cũ.

## Kết quả runtime quan sát được

| Hạng mục | Kết quả |
|---|---|
| Ngrok local admin `127.0.0.1:4040/api/tunnels` | Có tunnel HTTPS `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev`, hiện chuyển tiếp tới `http://localhost:8000`. |
| Listener local cổng 8010 | Không lắng nghe; đây là cổng dành cho API SePay local. |
| Listener local cổng 8000 | Có process lắng nghe; không gọi endpoint này do có thể là backend cũ và chưa xác minh đích DB. |
| `.local/sepay/runtime.json` | Chưa tồn tại; API local chưa có cấu hình MBBank Test mode/HMAC và chưa khởi chạy. Chỉ kiểm tra sự hiện diện/trạng thái, không đọc hay in credential. |
| Route source | `POST /api/payments/sepay/webhook`. |

## URL webhook

URL dự kiến sau khi API local chạy ở 8010 và ngrok được chuyển tiếp tới cổng đó:

`https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/payments/sepay/webhook`

HTTPS domain đang tồn tại ở thời điểm kiểm tra, nhưng **đường dẫn hiện chưa tới API SePay** vì tunnel vẫn forward cổng 8000. Do đó chưa nhập URL này để chạy mô phỏng. Nếu đổi tunnel sang 8010 sẽ làm thay đổi đích của URL đang dùng cho dịch vụ cổng 8000; báo cáo này không tự thực hiện thay đổi đó.

## Trạng thái sẵn sàng

- URL/route trong source: xác định được.
- HTTPS tunnel: đang hoạt động, nhưng đích hiện tại không đúng.
- API SePay local: chưa chạy.
- MBBank Test runtime config và HMAC secret local: chưa cấu hình.
- SePay Dashboard simulation: chưa thực hiện.
- Kết luận: **NOT READY để gửi mô phỏng**; P4 vẫn chờ người dùng xác nhận mô phỏng thành công theo điều kiện đã đặt. Không có request webhook thật hoặc giả nào được gửi trong lần kiểm tra này.

## Điều kiện trước khi mô phỏng

1. Người dùng thiết lập `.local/sepay/runtime.json` cục bộ theo runbook P3, với tài khoản MBBank Test mode và HMAC secret Test mode; không gửi credential qua chat.
2. Khởi động API và worker P3; xác minh API thực sự lắng nghe `127.0.0.1:8010`.
3. Quyết định cách chuyển ngrok sang 8010. Khi chuyển, domain hiện tại sẽ ngừng forward đến cổng 8000 trong cấu hình một tunnel này; giữ nguyên thông tin để có thể khôi phục sau test.
4. Chỉ sau khi tunnel tới 8010 và listener sẵn sàng, nhập URL webhook ở trên vào SePay Test mode rồi chạy mô phỏng.
5. Người dùng xác nhận kết quả thành công (HTTP delivery và transaction test đã mask). Khi đó mới tiếp tục P4 runtime theo yêu cầu.

Không thực hiện bước 1–5 thay người dùng trong lần kiểm tra này; đặc biệt không thay đổi route ngrok công khai khi chưa thống nhất ảnh hưởng lên dịch vụ hiện tại.