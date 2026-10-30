# Runbook vận hành SePay Live trên máy hiện tại

Cập nhật: 30/10/2026. Phạm vi: API/worker trên Windows, Supabase PostgreSQL qua TLS và ngrok.

## Thành phần

- Cấu hình runtime duy nhất: `server/.env` (Git ignored), mount read-only vào `/app/.env` cho API và worker. File `.local/sepay-live.env` cũ không còn được đọc.
- Logs: `docker compose -f compose.sepay-live.yaml logs --tail=100 api worker`.
- API: Docker service `api`, port 8011 bound to `127.0.0.1`.
- Worker: Docker service `worker`; it runs EventHub jobs and SePay inbox/reconciliation.
- Monitor: `node scripts/sepay-live-monitor.cjs --watch` trong terminal riêng. Kiểm tra mỗi 30 giây; JSON latest/JSONL ở `.local/sepay-l6`. Người vận hành xem console và `monitor-latest.json`; monitor chưa gửi email/SMS/push/page.
- Ngrok: `https://richelle-unrelapsing-flavourlessly.ngrok-free.dev` → `http://127.0.0.1:8011`; webhook `/api/payments/sepay/webhook`.
- Người vận hành chính: chủ dự án, người dùng đã nhận trách nhiệm các nhiệm vụ vận hành.

## Khởi động/kiểm tra

Từ thư mục gốc dự án, vận hành Live Docker stack:

1. `docker compose -f compose.sepay-live.yaml config -q` phải qua.
2. `docker compose -f compose.sepay-live.yaml up -d --build` khởi chạy/rebuild API và worker.
3. Xác minh API: `docker compose -f compose.sepay-live.yaml ps` và `curl.exe http://127.0.0.1:8011/api/health`.
4. Xác minh worker: `docker compose -f compose.sepay-live.yaml logs --tail=100 worker`; heartbeat phải báo `environment=live`.
5. Xác minh health qua ngrok và monitor `status=OK`, DB healthy. Có thể chạy monitor trên host bằng `node server/scripts/sepay-live-monitor.cjs --watch`.

Giữ terminal API/worker/monitor mở. `Ctrl+C` dừng thành phần tương ứng. Không chạy worker thứ hai trừ khi đang kiểm thử khóa phối hợp.

## Ngưỡng monitor

| Alert | Ngưỡng/ý nghĩa | Hành động đầu tiên |
|---|---|---|
| `API_UNHEALTHY` | Health local không trả success | Kiểm tra log API/error, TLS/env; payment mới sẽ không dùng được |
| `NGROK_UNHEALTHY` | Health qua hostname hiện tại lỗi | Kiểm tra agent/forward target; giữ URL không trỏ sang runtime Test |
| `DATABASE_UNHEALTHY` | Read-only query thất bại | Kiểm tra TLS/CA/network/Supabase status; không đổi schema để chữa kết nối |
| `WORKER_HEARTBEAT_STALE` | File heartbeat cũ hơn 90s | Kiểm tra worker log/PID rồi khởi động lại bằng runtime wrapper |
| `WORKER_INBOX_STALE` | Inbox loop không thành công trong 60s | Kiểm tra DB/worker và inbox backlog |
| `WORKER_RECONCILE_STALE` | Reconcile không thành công trong tối đa 180s | Kiểm tra log và lỗi upstream token/429/outage; không lặp lệnh reconcile dồn dập |
| `INBOX_LAG` | Received/processing/error cũ hơn 60s | Xem queue tổng hợp và giao dịch trong admin; giữ inbox bền vững |
| `EXPIRED_LEASE` | Có lease processing đã hết hạn | Worker có thể reclaim; xác minh số lần thử/status |
| `INBOX_ERROR` | Có giao dịch ERROR | Admin xem detail/history, chỉ reprocess khi evidence giao dịch rõ |
| `REVIEW_REQUIRED` | Có giao dịch REVIEW | Admin đối chiếu sao kê, không tự xác nhận hoặc phát vé |

`REVIEW_REQUIRED`/`INBOX_ERROR` cần xử lý thủ công, không tự bỏ qua. Monitor chỉ tổng hợp, không ghi payment hay tự retry. Chỉ số inbox là aggregate, không đưa raw payload hoặc số tài khoản vào log.

## Tạm dừng tạo payment mới

Trong `server/.env`, đặt `SEPAY_ACCEPT_NEW_PAYMENTS=false`, sau đó khởi động lại **API**. API trả 503 `SEPAY_MAINTENANCE` cho POST tạo payment mới; GET trạng thái, webhook inbox và worker vẫn chạy để hoàn tất/đối soát giao dịch đã mở. Kiểm tra monitor và webhook trước khi bật lại thành `true` rồi restart API.

Nếu có lỗi release: dừng tạo payment mới theo bước trên, giữ API/webhook nếu còn khỏe để nhận inbox và giữ worker xử lý; giữ bảng/history SePay. Triển khai lại code phiên bản đã review tương thích schema. Không xóa bảng, không chạy migration revert và không trỏ ngrok sang cổng 8010/Test. Nếu API không thể khởi động, người vận hành ghi lại thời điểm/tunnel/provider delivery, khôi phục API Live; sau đó reconcile cửa sổ phù hợp và duyệt REVIEW thủ công.

## Đối soát và xử lý giao dịch

- Buyer xem trạng thái qua `/api/sepay/orders/:id/payment`; admin đọc `/api/admin/sepay/transactions` và detail.
- Reconcile admin có ghi inbox và có khóa DB. Giới hạn cửa sổ 5–1440 phút, mặc định 60; worker tự chạy 60 giây một lượt. Tránh khởi nhiều lệnh cùng lúc.
- Chỉ reprocess trạng thái ERROR/REVIEW sau khi đối chiếu ngân hàng. Resolve chỉ ghi nhận kết quả tra soát; không hoàn tiền hoặc cấp vé.
- Giao dịch trễ, số tiền khác, sai account, mã không rõ hoặc reservation đã nhả phải REVIEW; không sửa payment/order bằng SQL thủ công.
- Khi tiền đã chuyển nhưng app chưa PAID: giữ bằng chứng provider, không yêu cầu khách chuyển lần hai; tra inbox, reconcile, worker, order/payment/audit. Tạm dừng payment mới nếu có dấu hiệu diện rộng.

## Giới hạn vận hành hiện tại

Máy phát triển + ngrok là phương án được chủ dự án yêu cầu cho giai đoạn hiện tại. Không có process supervisor, alert ra ngoài máy hoặc cam kết uptime/restart sau reboot. Người vận hành cần giữ ba tiến trình và quan sát monitor. Hostname tunnel hiện tại có thể thay đổi khi agent khởi động lại; khi đổi phải cập nhật Dashboard trước khi nhận thanh toán mới.

Backend kết nối Supabase PostgreSQL trực tiếp qua TLS. Supabase Data API là một giao diện REST riêng cho app/browser; ứng dụng SePay hiện không dùng URL/API key Data API, vì vậy Data API không cần thiết cho luồng thanh toán hoặc L6 backend hiện tại. Chỉ cần test nó nếu client dùng Supabase REST/GraphQL hoặc project bật API và muốn xác minh bề mặt truy cập. [Supabase mô tả REST API là lớp truy cập database riêng, có thể dùng trực tiếp hoặc bổ sung cho API server](https://supabase.com/docs/guides/api); [quyền Data API dựa trên Postgres grants và RLS](https://supabase.com/docs/guides/api/securing-your-api). Kiểm tra SQL grants/RLS của ba bảng SePay đã làm ở L4; không suy ra REST endpoint đã được gọi.
