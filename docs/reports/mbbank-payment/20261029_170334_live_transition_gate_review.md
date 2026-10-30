# Rà soát cổng chuyển SePay Test mode sang Live

Thời điểm: 29/10/2026, 17:03 UTC+7. Phạm vi: đọc kế hoạch và báo cáo P3/P4, xác định các cổng trước khi nhận thanh toán Live. Không truy cập Supabase, không cấu hình Live, không chuyển provider và không gửi giao dịch tiền thật.

## Trạng thái mốc hiện tại

| Mốc | Trạng thái theo kế hoạch |
|---|---|
| P0–P3 | Đã nghiệm thu trong phạm vi đã báo cáo. |
| P4 | PASS một ca SePay Test mode end-to-end: webhook được xử lý, payment/order thành công và phát một vé. QR app scan, retry/outage thực tế còn chưa chạy. |
| P5 | Chưa thực hiện: API v2 reconciliation và UI/kiểm thử end-to-end. Người dùng đã xác nhận có API v2 Sandbox token, nhưng token chưa được gọi kiểm chứng. |
| P6 | Chưa thực hiện: tổng nghiệm thu, migration production/Supabase additive, rollback/cutover plan. |
| P7 | Chưa được cho phép/thực hiện: xác minh Supabase, backup, apply migration, production rollout và chuyển cấu hình Live. |

## Cổng bắt buộc trước Live

1. Hoàn tất P5 trên Sandbox/local: gọi API v2 bằng credential Sandbox trong secret store local, phân trang/đối soát chồng lấn, dedupe với webhook, phục hồi webhook mất, kiểm thử timeout/401/5xx và chứng minh không phát vé trùng. Hoàn thiện buyer/admin UI và end-to-end.
2. Đóng P6: tất cả ca bắt buộc trong matrix nghiệm thu có PASS hoặc ngoại lệ được chấp thuận bằng văn bản; quét/đọc QR theo đúng phạm vi test an toàn; runbook giám sát/retry/tra soát/hoàn tiền và rollback; review migration additive tương thích với schema thực tế. Hiện DB test vẫn là local; không suy ra schema Supabase giống repository.
3. Chỉ khi P0–P6 hoàn tất, xin sự cho phép cụ thể cho thao tác Supabase/P7. Xác minh project/schema/history thật, backup và restore plan, thử migration trên bản sao được cho phép; sau đó apply additive migration theo change plan, xác minh dữ liệu và rollback.
4. Triển khai API/worker lên host production có domain công khai ổn định và chứng chỉ HTTPS hợp lệ; kiểm tra health/readiness và kết nối đúng production DB đã được duyệt. Không dùng ngrok/localhost làm production endpoint.
5. Tạo cấu hình Live riêng: tài khoản MBBank Live, webhook Live HMAC Secret mới và riêng, URL production, JSON/tiền vào, đúng account và prefix/filter `tkh`; không dùng Test account, Test secret hay Sandbox token. SePay nói payload/retry tương tự nhưng Live bắt buộc xác thực SSL endpoint; cấu hình Live phải được kiểm tra trên Dashboard và delivery logs.
6. Cutover có phê duyệt: chặn tạo payment mới bằng demo/VNPAY theo lịch, nhưng duy trì callback cho attempt cũ; kiểm tra không còn attempt unresolved hoặc có kế hoạch xử lý; route một payment nhỏ do người dùng chấp thuận, theo dõi webhook→DB→ticket và reconciliation; có rollback config/worker. Không gửi giao dịch thật trong lần rà soát này.

Nguồn SePay: [so sánh Test mode và Live](https://developer.sepay.vn/vi/sepay-webhooks/test-mode/so-sanh-voi-live), [bảo mật webhook](https://developer.sepay.vn/vi/sepay-webhooks/bao-mat), [hướng dẫn webhook Live](https://developer.sepay.vn/vi/sepay-webhooks/tao-webhook).

## Kết luận

**Chưa thể chuyển sang SePay Live ngay.** Thời điểm chuyển là sau khi P5 và P6 hoàn tất, P7 được người dùng cho phép cụ thể, production DB/schema/migration và endpoint HTTPS được triển khai/xác minh, rồi chạy cutover có rollback. Hiện không có ngày lịch cố định; các mốc đang chờ vì P5–P7 chưa thực hiện. P4 Test mode PASS chỉ chứng minh một happy path, không cấp quyền truy cập Supabase hoặc nhận tiền thật.