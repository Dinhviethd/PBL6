# Danh sách chờ vé

Đã triển khai trên nhánh `feature/wait-queue`, ngày 22/10/2026. Theo yêu cầu người dùng, migration đã được áp dụng lên Supabase; API/web và worker Docker local đã được build và khởi động lại với bản mới. Web tại `http://localhost:8000`. Chưa deploy lên cloud.

## Kế hoạch và phạm vi

1. Thêm migration hàng chờ thuộc module Order; một lượt đang chờ/được mời cho mỗi tài khoản và loại vé, mỗi lượt một vé.
2. API đăng ký khi hết vé, xem hàng chờ cá nhân và rời hàng. FIFO theo số thứ tự tăng dần; không cung cấp thông tin người khác.
3. Worker tạo đơn giữ vé 15 phút cho người đầu hàng khi có tồn. Dùng nguyên luồng reservation/payment hiện tại, gửi thông báo trong cùng transaction. Người mua thường không vượt hàng khi còn người chờ.
4. Web và Expo: đăng ký tại chi tiết sự kiện, xem/rời hàng tại danh sách đơn, mở đơn từ lời mời.
5. Kiểm thử DB thật: đăng ký trùng, FIFO, cạnh tranh mua/worker, expiry/cancel/payment, quyền sở hữu, dừng bán, gửi thông báo đúng một lần. Build, lint, kiểm tra mobile và browser regression.

## Quy tắc

- WAITING → OFFERED → COMPLETED / EXPIRED / CANCELLED. WAITING có thể CANCELLED khi khách rời hàng hoặc sự kiện/loại vé đóng vĩnh viễn.
- Đăng ký lại sau khi rời/hết hạn được xếp cuối hàng. Retry khi còn lượt active trả về lượt đó.
- Khi được mời, một đơn và một reservation được tạo; vé chưa thanh toán không phải vé vào cửa. Thời hạn bắt đầu thanh toán là 15 phút, hoặc thời điểm hết bán/kết thúc sự kiện nếu sớm hơn. Thanh toán đang xử lý tuân theo thời gian đối soát hiện có.
- Tạm ngừng bán giữ hàng chờ nhưng không mời thêm; đóng/hết bán hủy các lượt WAITING. Đơn OFFERED tuân theo chính sách đơn hàng hiện có.
- Worker chạy mỗi khoảng 30 giây. Không email/push ở bản đầu. Không bảo đảm sẽ có vé.
- Migration phải chạy trước khi khởi động API/worker mới. Không tự chạy migration vào database dùng chung trong quá trình phát triển.

## API và lưu trữ

| API | Hành vi |
| --- | --- |
| `POST /api/events/:id/wait-queue` | Body `{ "ticketTypeId": "uuid" }`; cần đăng nhập. Trả lượt active hiện có nếu retry. Chỉ nhận khi hết vé hoặc đang có hàng chờ. |
| `GET /api/me/wait-queue?page=0` | 50 lượt/trang, mới nhất trước; chỉ của tài khoản hiện tại. Trả vị trí WAITING, trạng thái, mã đơn và hạn bắt đầu thanh toán. |
| `DELETE /api/me/wait-queue/:id` | Rời lượt WAITING; từ chối OFFERED bằng hủy đơn và nhả reservation. Không hủy nếu đã có giao dịch cần xử lý. Retry lượt đã đóng không tạo thêm thay đổi. |

Migration `WaitQueue1792627200000` thêm `wait_queue` thuộc Order và loại thông báo `WAIT_QUEUE_OFFER`. Unique index chặn hai lượt active của cùng người/loại vé. Số thứ tự tăng dần quyết định FIFO. Workflow lấy khóa sự kiện trước khóa loại vé; join/leave/promote dùng khóa độc quyền, mua trực tiếp dùng khóa chia sẻ và kiểm tra người chờ trước khi lấy tồn. Retry đơn cũ vẫn trả đơn đã tạo.

Tạo đơn, giữ tồn, chuyển OFFERED và ghi thông báo nằm trong cùng UnitOfWork. Thông báo dùng dedupe key theo lượt chờ. Khi đơn PAID/EXPIRED/CANCELLED, Order cập nhật trạng thái hàng chờ trong cùng transaction. Worker bỏ qua tài khoản đã khóa/ngừng hoạt động và xét lượt kế tiếp. Mỗi lượt xử lý tối đa 100 ứng viên mỗi loại vé, phân trang sự kiện để tiếp tục các hàng khác.

## Bật tính năng và kiểm thử

Khi đưa phiên bản này vào môi trường ứng dụng, chạy migration bằng cấu hình database đúng môi trường (`npm run db:migrate --prefix server`), rồi khởi động lại API và worker cùng phiên bản. Migration không xóa dữ liệu cũ. Không tự downgrade/xóa lịch sử hàng chờ.

Để tái hiện E2E, dùng **database test riêng** có tên kết thúc `_test`, tuyệt đối không đặt URL database ứng dụng vào biến test:

```powershell
# Đặt TEST_DATABASE_URL bằng URL database test riêng trước các lệnh sau.
npm run build
$env:EXPO_PUBLIC_API_URL = '/api'
npm run export --prefix mobile
node scripts/test-wait-queue.cjs
Remove-Item Env:EXPO_PUBLIC_API_URL
```

Harness migrate database test, tạo dữ liệu riêng, mở API/preview tại localhost 18826/18827 và chạy worker nhanh cho kiểm thử. Không gọi provider thanh toán thật. Cần Playwright Chromium đã cài cho client. Test browser thường sẽ skip hai bài E2E này nếu thiếu fixture từ harness; lượt xác nhận dưới đây chạy bằng harness và không skip.

## Kết quả xác nhận

Lượt khởi động và E2E bổ sung ngày 22/10/2026: Docker local API healthy, worker chạy job hàng chờ, web/health/public events trả thành công. Bộ Playwright tổng cộng **46 pass**: 31 web + 13 Expo web + 2 E2E hàng chờ riêng (bao gồm cả test API/DB thật và UI mock). Dữ liệu E2E nằm trong PostgreSQL tạm riêng, không seed/đặt đơn thử vào Supabase. Log: `.local/start-e2e.log`, `.local/wait-queue-compose-build.log`.

- Backend PostgreSQL: **38 pass, 0 fail, 0 skip**, gồm 6 tình huống hàng chờ trong một suite: join trùng/quyền HTTP, FIFO/hai worker/thanh toán, hết hạn/từ chối, rollback khi ghi thông báo lỗi, pause/tài khoản khóa/đóng bán, mua trực tiếp chạy đua worker.
- UI mock: **2 web** (1280px/390px) và **1 Expo web** (390px) qua; kiểm tra đăng ký, rời hàng, lời mời, lỗi hủy khi có payment và điều hướng mở đơn. Đã xem ảnh chụp giao diện, không tràn ngang.
- E2E API/DB thật: **1 web + 1 Expo web** qua luồng hết vé → chờ → nhả tồn → lời mời → thanh toán demo → đúng một vé và một thông báo mời.
- Build backend/client, boundary check, lint web/mobile, mobile typecheck đều qua; **23 unit mobile** qua. Expo export Android/iOS/web thành công; chưa kiểm tra thiết bị native thật.
- Log Git ignored tại `.local/wait-queue-backend-final.log`, `.local/wait-queue-e2e-final.log`, `.local/wait-queue-ui.log`, `.local/wait-queue-mobile-ui.log`, `.local/wait-queue-check-final.log`, `.local/wait-queue-mobile-check.log`, `.local/wait-queue-mobile-export.log`.
- Trong log UI đầu tiên, web qua nhưng Expo được mở trước khi export tạo xong `index.html`; lượt Expo cuối trong `wait-queue-mobile-ui.log` đã qua. E2E đầu phát hiện nút đăng ký chưa chờ web khôi phục phiên; đã sửa và xác nhận ở log E2E cuối.
