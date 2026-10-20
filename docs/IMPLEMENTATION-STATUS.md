# Trạng thái triển khai MVP — 2026-10-01

## Cập nhật 20/10/2026: chuyển DB sang Supabase

Backend local dùng Supabase Session pooler qua SSL có xác minh CA. Đã áp dụng đủ 3 migration, xác nhận 23 bảng và seed 4 tài khoản, 3 sự kiện, 3 danh mục. Compose hiện chạy API + worker kết nối Supabase, không khai báo service PostgreSQL local. Các container `pbl6-db-1`, `eventhub-staff-tests`, `supabase_db_pbl6` đã dừng và đặt restart policy `no`; container và dữ liệu được giữ nguyên. Các ghi nhận PostgreSQL local bên dưới là lịch sử trước khi chuyển đổi.

Sau đó đã chuyển dữ liệu từ database `postgres` trong `pbl6-db-1` lên Supabase, thay phần seed ban đầu. Sao lưu cả nguồn và đích bằng `pg_dump` tại `.local/db-transfer-20261020/`; kiểm tra đọc được hai archive. Nhập thử trong transaction rồi rollback trước khi nhập chính thức. Đã đối chiếu đầy đủ nội dung của 22 bảng ứng dụng trước và sau commit, giữ nguyên ID, quan hệ, mật khẩu băm và lịch sử migration. Dữ liệu gồm 6 tài khoản, 5 sự kiện, 6 đơn hàng, 6 thanh toán, 1 vé và 37 audit log; ảnh local được tham chiếu đã chuyển vào volume uploads. API healthy; web, API sự kiện và ảnh đều HTTP 200. Khi bật lại, worker xử lý 1 đơn hết hạn và tạo 1 nhắc lịch theo nghiệp vụ, nên dữ liệu runtime tiếp tục thay đổi sau thời điểm đối chiếu. DB local đã tắt lại, không xóa dữ liệu.

## Xác nhận 12/10/2026: migration thông báo và PostgreSQL thật

Đã chạy `Notifications1791331200000` vào database `postgres` tại `127.0.0.1:55436` (container `pbl6-db-1`) theo cấu hình hiện có. Database có đủ ba migration; chạy lại trả `Applied migrations: []`. Đã xác nhận bảng `notifications`, không sửa `.env` hoặc seed lại dữ liệu dự án.

Build backend thành công. Toàn bộ **16/16 kiểm thử backend đạt, 0 lỗi, 0 bỏ qua**, gồm 12 bài integration trên PostgreSQL 17.11 thật và 4 bài logic/ownership. Database xác nhận riêng: `eventhub_notifications_verified_20261012_test` trên container `eventhub-staff-tests`, cổng 55437. Bao gồm chống trùng callback/nhắc lịch đồng thời, rollback, phân quyền hộp thư, người nhận tham gia muộn, loại trừ vé/sự kiện không hợp lệ và phân trang. Đã sửa ép kiểu `varchar` cho tham số trạng thái trong fixture integration mà PostgreSQL báo lỗi `42P08`. E2E trình duyệt với API thật chưa chạy trong lần xác nhận này.

## Bổ sung 07/10/2026: thông báo và nhắc lịch

Thêm module Notification, migration `Notifications1791331200000`, thông báo mua vé/lời mời nhân viên/cập nhật lịch cho nhân viên trong cùng transaction nghiệp vụ và worker nhắc sự kiện trong 24 giờ tới. Web/mobile có biểu tượng chuông, số chưa đọc, hộp thư phân trang, lọc và đánh dấu đã đọc. Chi tiết: [NOTIFICATIONS.md](NOTIFICATIONS.md).

Đã qua build backend/web, lint/boundary checker, mobile typecheck/lint và 8 kiểm thử API client; 2 kiểm thử logic/SQL thông báo và 3 kiểm thử Chromium UI dùng API giả lập (web 1280px/390px và Expo web 390px). Đã xem ảnh cả ba giao diện và export Expo Android/iOS/web thành công. Bộ PostgreSQL integration và E2E với API thật đã được bổ sung nhưng chưa chạy trong phiên này: Docker Desktop lỗi khởi động socket `sailor-ingest.sock`, không có PostgreSQL local hoạt động. Chưa áp dụng migration vào database người dùng. Chưa có email/push hệ điều hành.

## Bổ sung 04/10/2026: migration local và ứng dụng mobile

Đã khởi tạo PostgreSQL qua Compose (`pbl6-db-1`, named volume `pbl6_eventhub_db`, port 55436) và chạy cả baseline + `EventCheckinStaff1791072000000` vào database `postgres` theo `server/.env`. Đã xác nhận migration, bảng phân công và 3 sự kiện seed. Không đổi `.env`; database `eventhub` do Compose tạo vẫn là database riêng.

Đã thêm Expo SDK 57/React Native trong `mobile/`: đăng ký/đăng nhập/khôi phục phiên, khám phá sự kiện, đặt vé, thanh toán demo, lịch sử đơn, ví QR, nhận/từ chối phân công và camera/manual check-in. Backend bổ sung native auth với rotating refresh token trong response body; web giữ cookie HttpOnly. Có script chạy API/worker/Expo và localhost preview; CI kiểm tra mobile.

Đã qua typecheck/lint mobile, 5 kiểm thử API client, 9 kiểm thử backend, Expo Doctor 21/21 và export JS/Hermes cho Android/iOS/web. E2E Expo trên trình duyệt đã xác nhận mua vé → nhận QR → nhận phân công → check-in → thu hồi → đăng xuất. Chưa nghiệm thu camera/SecureStore trên thiết bị vật lý và chưa build/ký APK/IPA. Hướng dẫn: [mobile/README.md](../mobile/README.md).

## Bổ sung 04/10/2026: nhân viên check-in theo sự kiện

Đã thêm lời mời trong ứng dụng theo email tài khoản, chấp nhận/từ chối, thời hạn lời mời 7 ngày, mời lại, thu hồi quyền, màn hình quét riêng và nhật ký hiển thị người quét. Nhân viên chỉ được check-in sự kiện đã nhận phân công; không có quyền quản lý hay xem doanh thu/đơn hàng. Migration bổ sung bảng `event_checkin_staff` thuộc Event, nâng tổng số bảng nghiệp vụ lên 21. Chi tiết API, nâng cấp và kiểm thử: [CHECKIN-STAFF.md](CHECKIN-STAFF.md).

Đã qua build backend/frontend, lint, boundary checker, 8 kiểm thử backend (gồm PostgreSQL integration, không skip) và 5 E2E Chromium. Đã xem ảnh desktop/mobile 390px của lời mời, quản lý nhân viên và màn hình check-in. Kiểm thử dùng container PostgreSQL riêng `eventhub-staff-tests` tại port 55437, database `eventhub_staff_test` và `eventhub_staff_web_test`; không sửa `server/.env` hay nâng cấp database local của người dùng tại port 55436 vì đích đó không hoạt động trong phiên này. Camera thiết bị thật chưa kiểm thử.

## Baseline MVP 01/10/2026

Phạm vi hiện tại: backend + web local demo theo lựa chọn của người dùng. Dùng Express + TypeORM, một PostgreSQL và các module chặt trong một backend. Chưa tách microservice process.

Build backend/web, lint và boundary checker đã qua. 7 kiểm thử backend trên PostgreSQL và 4 kiểm thử E2E Chromium đã qua. Browser đã xác nhận các luồng khách hàng, quản trị và Organizer tạo/duyệt sự kiện, bao gồm upload ảnh; đã kiểm tra ảnh chụp giao diện desktop và mobile 390px.

Phiên demo trên máy hiện tại dùng container `pbl6-mvp-local` ở port 55436, database `postgres`, cấu hình trong `server/.env`. Container này là môi trường kiểm thử tạm, không có volume bền vững. Không xóa container nếu cần giữ dữ liệu demo hiện tại. `compose.yaml` là cách khởi tạo mới có named volume, database `eventhub`; cần tránh trùng port và cập nhật DATABASE_URL khi chuyển sang Compose.

| Mốc | Đã có trong code | Giới hạn nghiệm thu |
| --- | --- | --- |
| M0 | Migration 20 bảng, seed, owner stores, AST query guard, checker import, shared transaction, CI | Migration fresh DB; chưa chuyển dữ liệu hệ thống cũ |
| M1 | Đăng ký/đăng nhập, refresh rotation/revoke, profile/password, OTP SMTP, đăng ký/duyệt Organizer, khóa tài khoản | SMTP thật chưa cấu hình |
| M2 | Danh mục, tạo/sửa sự kiện và loại vé, upload ảnh, gửi/duyệt/từ chối, tìm kiếm/lọc, ngừng bán | Cloudinary thật chưa cấu hình; dùng ảnh local |
| M3 | Snapshot đơn hàng, idempotency, khóa tồn, giữ chỗ, hủy/expire, worker | Worker cần giám sát ở môi trường triển khai |
| M4 | PaymentProvider + local demo adapter, kết quả lặp/muộn, phát hành QR, lịch sử đơn/vé | Chưa tích hợp provider sandbox, signed webhook và network reconciliation |
| M5 | QR camera/manual, check-in một lần, người tham dự, đơn, thống kê, tra cứu giao dịch | Camera vật lý/HTTPS chưa kiểm thử |
| M6 | Build/lint, PostgreSQL integration, browser E2E, Docker/Compose/CI, hướng dẫn | Chưa deploy staging/production; chưa nghiệm thu Definition of Done sandbox thật trong plan |

Kiểm thử PostgreSQL bao gồm 20 yêu cầu đặt vé đồng thời cạnh tranh 5 chỗ; callback lặp; rollback Payment/Order/kho khi phát hành vé lỗi; hai check-in cạnh tranh; phân quyền/ownership; expiry lặp và thanh toán muộn; refresh token replay/logout/khóa tài khoản. Browser kiểm tra desktop/mobile, tìm kiếm, đăng ký, thanh toán demo, QR/manual check-in và quản trị.

Implementation dùng AsyncLocalStorage riêng trong platform thay cho việc truyền WorkContext tường minh. Module không nhận EntityManager; owner adapter tự lấy transaction hiện hành. Các thay đổi nhiều owner đi qua workflow UnitOfWork; integration fault injection xác nhận rollback. Tham khảo `server/src/platform/database.ts` và `server/src/workflows/booking.ts`.

Payment demo là mô phỏng trong process, chưa đại diện giao thức một ngân hàng. Khi có sandbox, phải bổ sung xác minh chữ ký, amount/currency/reference, retry/reconciliation và cấu hình provider; external network call không được đặt trong transaction đang giữ khóa kho.
