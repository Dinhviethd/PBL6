# Thông báo và nhắc lịch

Thông báo trong ứng dụng dùng chung trên web và Expo mobile. Mở biểu tượng chuông để xem tất cả/chưa đọc, đánh dấu một hoặc tất cả đã đọc, mở đơn hàng, ví vé hoặc phân công liên quan. Bộ đếm và danh sách tự làm mới mỗi 30 giây khi đang xem; có thao tác làm mới thủ công. Không cần SMTP hoặc quyền thông báo hệ điều hành. Phiên bản này chưa gửi email hoặc push khi ứng dụng đóng.

## Các thông báo

- `ORDER_PAID`: phát hành vé thành công; một thông báo cho mỗi đơn. Thanh toán thất bại, tới muộn hoặc callback lặp không tạo thông báo thành công mới.
- `STAFF_INVITED`: mỗi lời mời nhân viên mới có một thông báo; mời lại sau khi thu hồi/hết hạn tạo thông báo mới.
- `EVENT_UPDATED`: đổi thời gian, địa điểm hoặc giờ check-in gửi thông báo cho nhân viên ACTIVE và người có lời mời PENDING chưa hết hạn. Giữ nguyên quy tắc không đổi thời gian/địa điểm khi đã bán vé; không mở rộng quyền sửa sự kiện.
- `EVENT_REMINDER`: một lần cho mỗi người/sự kiện/giờ bắt đầu trong khoảng `(hiện tại, hiện tại + 24 giờ]`. Người mua phải có đơn PAID và ít nhất một vé VALID; nhân viên phải ACTIVE. Người vừa mua vé hoặc vừa nhận phân công trong khoảng này được nhắc ở lượt chạy sau. Nếu vừa là khách vừa là nhân viên thì nhận một thông báo dẫn tới vé.

Nhắc lịch chỉ áp dụng sự kiện PUBLISHED chưa bắt đầu, kể cả đang ngừng bán. Không nhắc cho vé đã check-in/VOID, đơn chưa thanh toán, lời mời chưa nhận hoặc đã thu hồi, sự kiện hủy/nháp/đã bắt đầu. Nếu worker gián đoạn, nó tạo nhắc bù khi chạy lại và sự kiện vẫn chưa bắt đầu; không tạo nhắc quá hạn. Nội dung lịch dùng UTC+7, thời điểm tạo/đọc hiển thị theo thiết bị.

## Cài đặt và vận hành

```powershell
npm run db:migrate --prefix server
npm run dev
```

Migration `Notifications1791331200000` thêm bảng `notifications` và index hộp thư/chưa đọc; truy vấn sự kiện sắp tới dùng index thời gian đã có. Không sửa bản migration baseline. Cần chạy migration trước khi khởi động code mới. `npm run dev` đã chạy worker; nếu triển khai riêng, chạy `npm run jobs:watch --prefix server` cùng cấu hình database với API. Worker xử lý nhả giữ chỗ và nhắc lịch mỗi khoảng 30 giây, ghi log lỗi riêng cho từng job.

Notification sở hữu bảng `notifications`; Event và Order cung cấp người nhận qua public ports, workflow phối hợp trong UnitOfWork. Thông báo mua vé/lời mời/cập nhật nằm trong cùng transaction nghiệp vụ. Nhắc lịch đọc lại sự kiện dưới khóa chia sẻ; khóa duy nhất `(user_id, dedupe_key)` chống trùng giữa các worker và khi retry. Không đọc chéo bảng owner. Quét sự kiện dùng keyset theo lô 100; người nhận được xử lý trong một transaction mỗi sự kiện, phù hợp quy mô MVP.

## API yêu cầu đăng nhập

| API | Kết quả |
| --- | --- |
| `GET /api/me/notifications?page=0&unread=false` | `{items, hasNext, unreadCount}`, 50 bản ghi/trang, mới nhất trước |
| `GET /api/me/notifications/count` | `{unreadCount}` |
| `POST /api/me/notifications/:id/read` | Đánh dấu đã đọc, gọi lặp giữ thời gian đọc đầu tiên; ID thuộc tài khoản khác trả 404 |
| `POST /api/me/notifications/read-all` | Đánh dấu tất cả thông báo hiện có của chính tài khoản |

API luôn lấy người nhận từ phiên đăng nhập, không nhận userId từ client. Worker chạy nội bộ, không có endpoint công khai kích hoạt hoặc gửi thông báo tùy ý.

## Kiểm thử

Xác nhận ngày 12/10/2026: migration đã áp dụng vào database dự án `postgres` (cổng 55436), chạy lại không áp dụng trùng. Toàn bộ 16 kiểm thử backend đạt, không bỏ qua; integration dùng PostgreSQL 17.11 ở database riêng `eventhub_notifications_verified_20261012_test` (cổng 55437). E2E trình duyệt với API thật vẫn là bước kiểm tra riêng chưa chạy trong lần này.

`npm run build`, `npm run check`, `npm run check:mobile`. Bộ PostgreSQL integration trong `server/test/integration.test.cjs` kiểm tra thông báo giao dịch, callback/worker lặp, người nhận tham gia muộn, trạng thái không hợp lệ, phân trang và cách ly tài khoản. Đặt `TEST_DATABASE_URL` trỏ database riêng có tên kết thúc `_test`, sau đó chạy `npm test`.

Web E2E: chạy backend/web với database test đã seed rồi `cd client; npx playwright test tests/notifications.spec.ts`. Kiểm tra hộp thư ở 1280px/390px, chưa đọc, liên kết tới đơn và đăng xuất. Ảnh kiểm tra lưu tại `.local/qa/notifications-*.png`.

Kiểm tra UI độc lập, không cần database: chạy Vite rồi `cd client; npx playwright test tests/notifications-ui.spec.ts`. Bộ này giả lập API để kiểm tra đọc một/tất cả, lọc, bộ đếm, chuyển trang và khôi phục sau lỗi mạng; không thay thế kiểm thử backend/PostgreSQL.

Kiểm tra Expo UI độc lập: export mobile, phục vụ `mobile/dist` trên port 8082 với SPA fallback, rồi chạy `cd client; npx playwright test --config playwright.mobile.config.ts tests-mobile/notifications-ui.spec.ts`. Kiểm tra chuông, bộ đếm, đọc tất cả và điều hướng phân công; ảnh lưu `.local/qa/notifications-expo.png`. Chưa kiểm thử thông báo trên thiết bị vật lý.
