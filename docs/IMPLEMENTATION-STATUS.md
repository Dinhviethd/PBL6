# Trạng thái triển khai MVP — 2026-10-01

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
