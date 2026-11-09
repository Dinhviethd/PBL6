# Triển khai bản sửa bảo mật Organizer và headers

Branch: `fix-security`. Chưa deploy live. Không migration DB, không đổi API, trust proxy, cookie hoặc CORS.

## Kiểm tra trước triển khai

Dùng Node theo engines của dự án. Trong checkout sạch của branch:

```powershell
npm ci --prefix server
npm ci --prefix client
npx --prefix client playwright install chromium
npm run build
npm run check
node --test server/test/security-headers.test.cjs server/test/auth-origin.test.cjs server/test/sepay-live-config.test.cjs
npm run test:security --prefix client
npm run test:security-smoke --prefix client
```

Suite browser dùng dữ liệu tổng hợp/API mock, không thanh toán thật. Cần cổng 5174, 5188, 5199 trống. CI cài Chromium kèm dependencies và chạy hai suite mới; kết quả CI remote chưa được xác minh.

## Rollout có kiểm soát

1. Xác định service/image và reverse proxy thực sự phục vụ domain; lưu phiên bản đang chạy để rollback. Rebuild cả frontend và backend (`npm run build`); đóng gói `client/dist` cùng backend theo cơ chế triển khai hiện tại, tránh chỉ thay một bundle trong container cũ.
2. Trên deployment HTTPS, đặt `HSTS_MAX_AGE_SECONDS=86400` trong môi trường backend rồi restart/recreate theo quy trình vận hành. Không dùng includeSubDomains/preload. Mặc định 0 không phát HSTS; chỉ nhận số nguyên 0–31536000, sai cấu hình làm startup thất bại. HTTP local giữ 0.
3. Xác minh health, static HTML, SPA fallback, API và response lỗi qua domain/proxy. Proxy không được xóa headers hoặc thay CSP riêng của VNPay. Kiểm cả redirect HTTP→HTTPS và response HTTPS cuối cùng; không giả định headers Express bao phủ lỗi do proxy tự tạo.

```powershell
curl.exe -sS -D - -o NUL https://eventhubqrmarketing.tech/
curl.exe -sS -D - -o NUL https://eventhubqrmarketing.tech/register-organizer
curl.exe -sS -D - -o NUL https://eventhubqrmarketing.tech/api/config
curl.exe -sS -D - -o NUL https://eventhubqrmarketing.tech/api/auth/me
```

Kỳ vọng X-Frame-Options DENY, CSP `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, nosniff, Referrer-Policy same-origin và HSTS max-age=86400. VNPay return giữ CSP chặt hơn và no-referrer; xem route thực tế trong test headers để kiểm bằng dữ liệu tổng hợp. Thử iframe từ origin kiểm thử khác: bị chặn; truy cập trực tiếp vẫn hoạt động.

4. Nghiệm thu bằng tài khoản tổng hợp: Customer A lưu/reload, đăng xuất sang guest rồi Customer B không thấy A; đổi phiên ở tab khác xóa form/thông báo cũ. Guest nhập được nhưng không lưu/chuyển nháp qua login. Xóa/nộp hồ sơ trong môi trường nghiệm thu chỉ xóa nháp của chính tài khoản. Organizer và Admin vẫn truy cập đúng khu vực, xem trạng thái hồ sơ theo quyền. Không dùng credential thật trong báo cáo hoặc artifact; không tạo giao dịch/thanh toán thật. Kiểm VNPay/SePay bằng mock/sandbox được phê duyệt.
5. Chỉ đóng finding trên domain sau khi xác minh release và toàn bộ nghiệm thu sau deploy. Kết quả local không chứng minh proxy/live đã sửa.

## Rollback

Rollback frontend cũ có thể khôi phục lỗi lộ nháp; ưu tiên sửa tiếp thay vì quay lại cơ chế v1. Khóa v1 bị xóa khi mở trang và không được migration sang tài khoản mới. Nháp v2 chỉ đọc sau xác minh owner; dữ liệu localStorage không được mã hóa.

Rollback backend bằng release trước nếu cần. Đặt HSTS về 0 chỉ ngừng phát header, không xóa chính sách trình duyệt đã nhớ. Muốn thu hồi HSTS phải trả response **HTTPS** `Strict-Transport-Security: max-age=0` từ proxy hoặc cấu hình tạm thời được kiểm soát; xác minh response rồi bỏ cấu hình tạm. Giữ HTTPS trong thời gian thu hồi và cân nhắc trình duyệt chưa truy cập lại.
