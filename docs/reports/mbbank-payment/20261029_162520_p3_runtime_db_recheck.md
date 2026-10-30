# Báo cáo kiểm tra lại runtime và database trước mô phỏng

Thời điểm: 29/10/2026, 16:25 UTC+7. Yêu cầu: xác minh runtime config, tiến trình cổng 8010 và database; không gọi health/API nghiệp vụ, không truy cập Supabase.

## Quan sát trong workspace

| Kiểm tra | Kết quả |
|---|---|
| `Get-NetTCPConnection -State Listen -LocalPort 8010` | `NO_LISTENER` trong môi trường hiện tại. Không có PID/command line để xác định process. |
| `.local/sepay/runtime.json` | `MISSING`; không có cấu hình Test mode local. |
| `node scripts/sepay-local.cjs verify` | PASS: DB riêng `eventhub_sepay_local`, user `sepay_local`, host `127.0.0.1:55432`, container/volume SePay cô lập. |
| Supabase | Không kết nối/đọc/ghi. |

Người dùng cho biết đã ngắt dịch vụ cổng 8000 và chạy lại backend ở 8010, nhưng trạng thái đó không được quan sát trong workspace/tool session hiện tại. Không thể kết luận backend người dùng vừa chạy đang dùng DB local hay Supabase. Chỉ xác minh được DB local riêng tồn tại và guard runner P1 trỏ đúng DB local.

## Runtime config có cần không?

Có, để chạy đúng listener SePay P3 đã triển khai. Cấu hình cần bank/account MBBank Test mode và HMAC secret Test mode để xác thực chữ ký và đối chiếu giao dịch. Không có cấu hình thì `sepay-local-api.cjs` từ chối khởi động. Không gửi secret/token/số tài khoản đầy đủ vào chat.

Lưu ý: chạy backend thường trên 8010 không tự biến nó thành API SePay P3. Cần xác nhận process được khởi động bởi `node scripts/sepay-local-api.cjs`; launcher này bắt buộc dùng guard DB local và không tải dotenv. Không dùng `npm start`/backend thường nếu chưa chứng minh cấu hình DB của nó, vì có khả năng lấy `DATABASE_URL` từ `.env`/Supabase.

## Kết luận và điều kiện trước mô phỏng

**Chưa sẵn sàng mô phỏng.** DB SePay local đã sẵn sàng, nhưng API P3 chưa được xác nhận đang chạy; runtime config thiếu; đích DB của backend do người dùng vừa chạy chưa biết. Cần tạo runtime config Test mode local, dùng launcher P3, xác minh listener 8010 và ngrok forward tới đúng listener trước khi nhập URL SePay. Không chạy mô phỏng tới backend chưa được xác minh.

P4 tiếp tục chờ người dùng tự xác nhận mô phỏng Test mode thành công theo yêu cầu trước đó. Không có thay đổi code, không đổi ngrok và không gửi webhook.