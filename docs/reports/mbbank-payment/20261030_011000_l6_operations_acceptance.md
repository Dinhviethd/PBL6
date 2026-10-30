# L6 — Vận hành, giám sát và nghiệm thu backend Live

Ngày: 30/10/2026, UTC+7. Kết quả: **L6 hoàn thành phạm vi vận hành backend được yêu cầu cho máy hiện tại/ngrok; giới hạn giám sát cục bộ được ghi rõ.** Không commit Git.

## Bối cảnh và quyết định

Người dùng yêu cầu L6, tham chiếu `MBBank_SePay_Live_Plan.md` và `MBBank_Payment.md`. Người dùng xác nhận chưa cấu hình Supabase Data API và hỏi có cần không. Backend EventHub kết nối PostgreSQL trực tiếp bằng TLS; không có API URL/key Supabase trong cấu hình backend, không gọi REST/GraphQL Data API. Vì vậy Data API **không phải dependency** cho thanh toán SePay hoặc tiêu chí vận hành L6. Việc test endpoint REST sẽ chỉ cần nếu ứng dụng/client bắt đầu dùng Supabase REST/GraphQL hoặc có yêu cầu audit bề mặt đó. Đây là quyết định phạm vi dựa trên kiến trúc hiện tại; SQL grants/RLS trên bảng SePay vẫn là kiểm soát cần thiết.

Người dùng trước đó đã xác nhận tự chịu trách nhiệm vận hành và quản lý secret; runbook ghi chủ dự án là người trực chính. Không yêu cầu backup/PITR, domain dài hạn hoặc staging.

## Thay đổi L6

- `SEPAY_ACCEPT_NEW_PAYMENTS` mặc định bật và chỉ nhận chuỗi `true|false`. Khi `false`, API từ chối POST tạo payment với 503 `SEPAY_MAINTENANCE`; GET status, webhook, inbox worker và reconcile vẫn hoạt động. Cờ không hủy các đơn/payment đang mở.
- Thêm health file cho worker, chỉ có counters, PID, environment và timestamp; ghi atomic mỗi 30 giây từ worker mới.
- Thêm monitor read-only, kiểm tra API local, API công khai ngrok, database TLS/read-only, heartbeat/loop worker và aggregate inbox.
- Alert: API/ngrok/DB down; heartbeat >90s; inbox >60s; reconcile >180s; pending/error/review/expired lease. Monitor không sửa DB hoặc tự reprocess.
- Thêm unit test chính sách monitor (5 cases) và test tích hợp maintenance. Runbook có startup, ngưỡng alert, xử lý giao dịch, maintenance/rollback tương thích schema.
- Restart API/worker bằng Live wrapper sau build. API trả health local 200; ngrok health 200. Worker PID mới 10148 tạo heartbeat; monitor chạy `status=OK`, `alerts=[]`, database healthy, queue errors/reviews/expired leases=0. L5 tiếp tục giữ PROCESSED, PAID, SUCCEEDED, đúng một vé/thông báo/audit.

## Kết quả kiểm thử

| Kiểm thử | Kết quả | Bằng chứng |
|---|---|---|
| Build | PASS | `npm.cmd run build` exit 0 |
| PG17 isolated regression L3 | PASS 70/70, 0 skip | `server/scripts/sepay-l3-test.cjs` tạo DB synthetic; gồm cả test maintenance block POST nhưng vẫn đọc/webhook/health |
| Monitor policy | PASS 5/5 | Healthy, DB/worker stale, queue lag/error/review, invalid heartbeat, public tunnel failure |
| Full `npm test` không cấp TEST_DATABASE_URL | 36 pass, 9 skipped, 0 fail | Các ca cần PostgreSQL bị skip có chủ đích; dùng PG17 regression suite ở trên để có coverage DB |
| Runtime config Live | PASS | `node scripts/sepay-live-runtime.cjs check`; không xuất secret |
| API local/public | PASS | health success 200 qua `127.0.0.1:8011` và ngrok |
| Monitor Live | PASS tại snapshot | status OK; public/local/database khỏe; inbox lag/errors/reviews/expired lease = 0 |
| L5 sau restart | PASS | read-only snapshot: transaction PROCESSED, payment SUCCEEDED, order PAID, ticket/notification/audit=1/1/1; không chạm lịch sử |
| Data API REST/GraphQL | N/A theo kiến trúc, chưa gọi | Backend sử dụng direct PostgreSQL; không có cấu hình REST trong app |
| Retry webhook Live | NOT RUN | Dashboard không có chức năng resend theo xác nhận L5; không làm lại giao dịch tiền thật |

Artifacts monitor: `.local/sepay-l6/monitor-latest.json`, `monitor.jsonl`, log runtime; heartbeat `.local/sepay-worker-health.json`. Các file local bị Git ignore.

## Đánh giá và rủi ro vận hành

L5 giao dịch thật đạt settlement và đối soát chống trùng; báo cáo L5 ghi người dùng xác nhận HTTP 200 và tiền ghi có. Retry webhook thật chưa kiểm chứng vì giới hạn Dashboard. L6 monitor phát hiện được lỗi tại máy và log, nhưng không có kênh alert ngoài máy hoặc supervisor auto-restart. Vận hành hiện yêu cầu ba tiến trình API, worker, monitor mở liên tục. Người dùng là người trực chính theo phân công đã có. Máy tắt/reboot hoặc ngrok hostname đổi sẽ làm gián đoạn webhook; khi đó cần khôi phục runtime/tunnel và reconcile cửa sổ phù hợp trước khi đánh giá các payment đang chờ.

Không có lỗi blocker quan sát được tại snapshot. L6 nghiệm thu backend trong môi trường được chỉ định; không tuyên bố high availability, on-call paging, Data API REST kiểm thử, retry webhook thật hoặc uptime dài hạn.

Runbook thao tác: [SePay Live operations](../../runbooks/SePay_Live_Operations.md). Báo cáo giao dịch thật L5: [L5 acceptance](20261030_010334_l5_controlled_transfer.md).
