# L3 — hoàn thiện backend/API và chuẩn bị curl

**Phiên:** 30/10/2026, từ 00:23 UTC+7. Phạm vi backend-only theo [Live Plan](../../MBBank_SePay_Live_Plan.md) và [MBBank Payment](../../MBBank_Payment.md). Người dùng chọn **curl**; đã chuẩn bị [request/runbook tám route](../../api/SePay_Curl_Runbook.md), không yêu cầu gửi token hoặc secret. Không UI, commit, apply Supabase, thay Dashboard/ngrok hoặc chuyển tiền. Backup/PITR và triển khai dài hạn vẫn ngoài phạm vi.

## Thay đổi và phát hiện

| Thành phần | Trước / sau |
|---|---|
| Webhook UTF-8 | So sánh độ dài ký tự và số byte làm nội dung tiếng Việt hợp lệ bị từ chối. Dùng TextDecoder fatal để chấp nhận Unicode hợp lệ, từ chối UTF-8 lỗi; JSON null/array bị 400 trước truy cập field. HMAC vẫn ký bytes gốc. |
| Header HMAC | Yêu cầu đúng một timestamp và một signature trong rawHeaders; header thiếu/trùng/sai trả 401 trước ghi inbox. |
| Worker lease | Trước xử lý mỗi snapshot claim, query lại id/token/status/lease/environment/account và giữ row lock trong transaction settlement. Claim đã bị thay thế/hết hạn/đưa REVIEW không được phát vé từ snapshot cũ. |
| Durable ACK | Khi webhook khớp nhiều API transaction, source cũ trả conflict mà không lưu webhook mới. Nay lưu row REVIEW với `API_WEBHOOK_MATCH_AMBIGUOUS` trước ACK, không mất sự kiện. |
| Reprocess/audit | Cũ dùng hai UoW; audit lỗi vẫn có thể để transaction queued. Nay enqueue và review audit cùng transaction; audit lỗi rollback enqueue. Body reprocess strict empty. |
| Admin list | Bổ sung `from/to` ISO8601 có timezone, lọc inclusive theo transaction_at và `reference` exact match, vẫn giới hạn page/limit. Range sai 400. Thêm api_transaction_id/transaction_at vào DTO list; giữ account mask. List/detail trả no-store. |
| Bộ chạy test | `server/scripts/sepay-l3-test.cjs` kiểm tra container PG17 synthetic L2 và loopback 55434, tạo DB/owner mới NOSUPERUSER/NOBYPASSRLS, chạy bốn baseline + migration Live L2. Không load `.env` thật; không dùng lại data fixture cũ. |
| Kiểm tra Supabase | Helper read-only bổ sung inventory tên bảng SePay và migration history; không chạy app/worker/migration, không query chi tiết khách hàng. |

Không thêm route công khai mới hoặc API giả lập PAID. Các endpoint demo/VNPAY không đổi; các route SePay còn nguyên method/path và phân quyền. Thay đổi contract bổ sung là bộ lọc/field list và từ chối body thừa ở reprocess.

## Tám API và tiêu chí

| API | Kiểm chứng local |
|---|---|
| POST buyer payment | Ownership, body empty, conflict unresolved, idempotency/concurrency, hạn order/reservation; Live không trả attempt Test. |
| GET buyer payment | DTO/polling/expiry/isolation; status SUCCEEDED sau settlement synthetic. |
| POST webhook | HMAC, Unicode, duplicate header, malformed JSON/UTF-8, durable ACK/DB failure, duplicate/collision, ambiguity REVIEW, exact amount và deadlines. |
| POST admin reconcile | Auth/admin, body/range, missing config; HTTP endpoint → v2 mock Live → inbox → worker → một vé, lặp lại duplicate không thêm vé; token/URL caller không được chấp nhận. |
| GET admin transactions | ADMIN, status/page/limit và from/to/reference, no raw account, lọc integration. |
| GET admin transaction | ADMIN, masked detail/history, transaction Test không đọc được từ runtime Live. |
| POST admin reprocess | ADMIN, ERROR/REVIEW, audit transaction, audit failure rollback, không bỏ qua settlement checks. |
| POST admin resolve | ADMIN/outcome/reason, review history; chỉ ghi nhận tra soát ngoài hệ thống, không chuyển tiền/cấp vé. |

## Database và giới hạn quyền

Supabase được kiểm tra **read-only**, TLS xác thực CA local: database `postgres`, PostgreSQL 17.11, role kết nối `postgres`, `transaction_read_only=on`, kết thúc ROLLBACK. Counts: users=12, orders=24, payments=14, tickets=4. **Chưa có ba bảng SePay**; history vẫn bốn baseline `InitialMvp1790812800000`, `EventCheckinStaff1791072000000`, `Notifications1791331200000`, `WaitQueue1792627200000`. Tên project `pbl6-eventhub` theo xác nhận người dùng; không tự suy ra tên Dashboard từ role PostgreSQL. Không thay dữ liệu/schema.

Kiểm thử mutation chỉ trên PG17.11 `127.0.0.1:55434` trong container `eventhub-sepay-l2-1dfe9317c1b1` đã được xác minh image/label/binding. Mỗi lượt tạo database và owner riêng; credentials ngẫu nhiên không in. Migration L2 giữ nguyên SHA-256 `AD0CC5DE900912E8B25C614BCDCF207864F647867011D04CBA9F44DAAFF486D9`, không đăng ký runner chung. Runtime role non-superuser owner trên local không chứng minh cấu hình process live đã đúng; cần xác minh ở L4.

## Kiểm thử và sự cố

**Kết quả cuối: 68/68 PASS, 0 fail, 0 skipped**, khoảng 43.3 giây trên `eventhub_sepay_a41cdcf4d8b6_test`. Lệnh `node scripts/sepay-l3-test.cjs eventhub-sepay-l2-1dfe9317c1b1` trong `server` trả exit 0. Evidence giữ ở `.local/sepay-l3/a41cdcf4d8b6-tests.log` (Git ignored). `npm.cmd run build`, `npm.cmd run check:boundaries`, `git diff --check` PASS. `node scripts/sepay-supabase-readonly-check.cjs` exit 0 với kết quả chỉ đọc đã ghi ở trên.

**Đánh giá L3:** đạt phần backend và kiểm thử local/clone theo phạm vi hiện tại; tám API có source và bằng chứng test, curl runbook đã chuẩn bị, migration L2 không đổi và sẵn sàng review. Không tuyên bố các API đã hoạt động trên Supabase/ngrok Live: ba bảng chưa có trên Supabase, nên nghiệm thu runtime thực tế vẫn thuộc L4/L5.

- Build, boundaries và diff whitespace: PASS. Warning LF/CRLF ở file có trước không phải lỗi test.
- Lượt đầu PG17 `eventhub_sepay_9f29d1d8aa97_test`: 67/67 PASS. Sau thêm duplicate header và API-only HTTP recovery, fixture v2 dùng ISO timestamp có mili-giây trong khi parser contract hiện chấp nhận giây, gây 502; test đã phát hiện, sửa fixture về timestamp giây. Không sửa parser để chấp nhận payload ngoài contract chỉ nhằm cho test qua.
- Fault injection inbox/audit gây lỗi DB có chủ đích; expected là không ACK hoặc rollback payment/audit. Không coi các dòng log lỗi synthetic đó là sự cố runtime Live.
- Các test dùng HTTP local/fetch và upstream v2 mock; curl requests là tài liệu thao tác chuẩn bị, chưa chạy với credential Live qua ngrok. Template webhook chỉ dành cho local cô lập; webhook Live do SePay gửi.

## Còn lại trước Live

- L4: apply migration theo phạm vi được cho phép, xác minh roles/Data API/ACL và API/worker dùng đúng target; kiểm tra HTTPS/ngrok raw bytes và delivery. Chưa thực hiện các bước này trong L3.
- L5: kiểm chứng Live token/secret, dashboard account/code/retry và giao dịch thật theo số tiền/phạm vi riêng. Người dùng đã xác nhận credential Live tách Test, nhưng phiên này không dùng credential thật.
- Reconcile hiện dùng lookback, chưa có cursor/checkpoint bền vững cho outage dài; health mới là counters/log, chưa có alert inbox lag. Các kiểm thử dài hạn/retry qua provider/monitoring thuộc hoàn thiện vận hành, không báo PASS từ suite local.
- Khóa lease được kiểm thử ở tình huống thay token và reclaim; không khẳng định mọi interleaving provider/webhook/v2 đã được bao phủ. Khóa đối soát bảo vệ cùng DB; không giới hạn traffic ngoài ứng dụng dùng chung token.
- Không lặp lại yêu cầu backup/PITR, domain dài hạn hoặc commit đã hoãn theo người dùng.
