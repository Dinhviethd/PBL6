# Báo cáo P4 — kiểm tra readiness cho QR scan và webhook retry

**Thời điểm:** 29/10/2026, 21:29 UTC+7  
**Trạng thái:** Hạ tầng local/HTTPS sẵn sàng; chưa tạo payment mới hoặc chạy mô phỏng. Chờ người dùng sẵn sàng thao tác QR và xác nhận bật auto-retry Test mode.  
**Phạm vi:** DB SePay local đã guard, process listener/worker, ngrok tunnel và fixture metadata; không truy cập Supabase, không dùng tiền thật, không thay đổi cấu hình SePay.

## Kết quả preflight

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Database local | PASS | `node server/scripts/sepay-local.cjs verify` xác nhận `127.0.0.1:55432 / eventhub_sepay_local / sepay_local / isolated Docker volume`. |
| Local DB health/constraints | PASS | `node server/scripts/sepay-local.cjs check`: users=4, events=3, orders=3, payments=3, tickets=2, sepay_payment_details=3, sepay_transactions=6, reviews=0; các kiểm tra duplicate webhook, amount âm, review reason và FK payment đều PASS. Đây là dữ liệu local. |
| API listener | PASS | TCP 127.0.0.1:8010 thuộc Node process `scripts/sepay-local-api.cjs`. Chưa gọi endpoint health trong lượt này. |
| Worker | PASS | Process Node `scripts/sepay-local-worker.cjs` đang chạy. |
| Ngrok | PASS | Agent API local 127.0.0.1:4040 trả tunnel HTTPS `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` → `http://localhost:8010`. |
| Payment fixture sẵn dùng | FAIL/EXPIRED | Các file `simulation-order*.json` hiện có đều có `expiresAt` ngày 29/10 trước 21:29 UTC+7; không dùng để thử thanh toán/scan. JSON còn ghi PENDING nhưng đã cũ và không chứng minh trạng thái DB hiện thời. |
| QR app scan | NOT RUN | Cần tạo fixture mới gần thời điểm người dùng sẵn sàng; hạn thanh toán ngắn. |
| SePay Test auto-retry | NOT VERIFIED | Cần xác nhận toggle tự động retry lỗi đang bật trên webhook Test mode. |

## Quy trình P4 đề xuất

### QR scan (không chuyển tiền)

1. Xác nhận đang ở SePay Test mode, đúng webhook Test, HMAC và ngân hàng MBBank Test; không đổi cấu hình Live.
2. Ngay khi người dùng sẵn sàng mở ứng dụng ngân hàng, tạo một order/payment mới trên DB local qua guarded launcher. Fixture có hạn, không tạo trước quá lâu.
3. Mở QR URL của payment bằng thiết bị/phiên phù hợp; dùng ứng dụng ngân hàng quét nhưng dừng ở màn hình xác nhận trước khi chuyển tiền.
4. Người dùng xác nhận ngân hàng hiển thị đúng người nhận MBBank, amount VND và transfer content; không bấm xác nhận chuyển. Ghi kết quả PASS/FAIL và chỉ dùng thông tin đã che/mã hóa tối thiểu trong report.

### Kiểm thử retry/outage (Test mode)

1. Dùng fixture mới và giao dịch Test mode; xác nhận auto-retry được bật. Không dùng giao dịch thật.
2. Tạo outage có kiểm soát ở local listener ngay trước khi bấm mô phỏng để initial delivery thất bại; khôi phục listener trước retry đầu tiên. Ngrok agent vẫn chạy. Không để backend trỏ sang Supabase.
3. Theo dõi SePay delivery log để xác nhận delivery đầu thất bại và retry thành công; theo dõi worker/local DB để transaction `PROCESSED`, payment `SUCCEEDED`, order `PAID`, đúng một ticket.
4. Nếu hết hạn giữ chỗ trước retry hoặc có delivery không rõ trạng thái, fail closed: ghi nhận REVIEW, không kéo dài reservation và không tạo vé thủ công. Không lặp transaction mô phỏng ngoài kế hoạch.

Tài liệu SePay mô tả auto-retry theo cấu hình webhook và nhiều lần retry trong khoảng tối đa khoảng 33 phút; ở đây chỉ cần chứng minh ít nhất một retry có kiểm soát, không cần chờ hết toàn bộ lịch retry. Vì reservation có giới hạn thời gian, không thử outage dài kéo qua deadline rồi kỳ vọng hệ thống cấp vé.

## Quyết định P7 theo phản hồi người dùng

Người dùng chọn hoàn tất P4 QR scan + Dashboard retry/outage trước. Dù đã chọn phạm vi inventory read-only, không bắt đầu P7-01 và không kết nối Supabase cho tới sau cổng P4. Không có migration/cutover trong báo cáo này.

## Kết luận

Hạ tầng local được guard và listener/worker/ngrok sẵn sàng. Chưa thể đánh PASS cho P4 QR/retry vì không có fixture mới còn hạn, chưa xác minh auto-retry và chưa có kết quả người dùng quét QR/SePay delivery retry. Bước tiếp theo: người dùng xác nhận đang sẵn sàng scan và auto-retry Test mode đang bật; sau đó mới tạo payment fixture có hạn ngắn và thực hiện test có giám sát.
