# Inventory web → mobile → API

Được tạo bằng `node scripts/mobile-inventory.cjs`; thời điểm 2026-11-11T09:48:39.096Z.

Mapping mobile là đích triển khai, không khẳng định đã có route. Endpoint mapping cần đối chiếu với danh sách source phía dưới; API contract/runtime được ghi riêng trong báo cáo theo đợt. Các trang web hiện hành có thể chứa placeholder theo scope đã duyệt.

## Mapping 37 mã màn

| Màn hình | Route web | Đích mobile | Nhóm API cần xác minh | Quyền |
|---|---|---|---|---|
| A1 — Trang chủ | / | / | GET /events; GET /categories | Guest |
| A2 — Khám phá & bộ lọc sự kiện | /explore | /explore; /discovery | GET /events; GET /categories | Guest |
| A3 — Chi tiết sự kiện & đặt vé | /events/:slug | /events/[slug] | GET /events/:slug; POST /orders | Guest/User |
| A4 — Đăng nhập / Đăng ký | /auth/login; /auth/register | /auth | POST /auth/mobile/login; POST /auth/mobile/register | Guest |
| A5 — Đăng ký Ban Tổ Chức & xét duyệt hồ sơ | /register-organizer | /register-organizer | GET/POST /me/organizer-applications | User |
| A6 — Thanh toán & xác nhận đơn hàng | /checkout/:id | /orders/[id] | GET /config; GET /me/orders/:id; POST /orders/:id/payments; GET/POST /sepay/orders/:orderId/payment; POST /orders/:id/cancel | User |
| A7 — Kết quả thanh toán | /payment-status/:orderId | /payment-status/[id] | GET /me/order-history/:id | User |
| A8 — Vé của tôi & thẻ QR check-in | /tickets; /tickets/:id | /tickets; /tickets/[id] | GET /me/tickets; GET /me/tickets/:id | User |
| A9 — Lịch sử đơn hàng | /orders | /orders | GET /me/orders; GET /me/order-history | User |
| A10 — Hồ sơ cá nhân | /profile | /profile; /change-password | GET /auth/me; PATCH /me; POST /me/password; POST /media | User |
| A11 — Quên mật khẩu & đặt lại mật khẩu | /auth/reset-password | /reset-password | POST /auth/forgot-password; POST /auth/verify-otp; POST /auth/reset-password | Guest |
| A12 — Thông báo của bạn | /notifications | /notifications | GET /me/notifications; GET /me/notifications/count; POST /me/notifications/read-all; POST /me/notifications/:id/read | User |
| A13 — Sự kiện được phân công | /checkin | /staff | GET /me/checkin-assignments; POST /me/checkin-invitations/:id/respond | Assigned user |
| B1 — Dashboard Ban Tổ Chức (sự kiện & doanh thu) | /organizer/dashboard | /organizer | GET /organizer/dashboard | Organizer/Admin |
| B2 — Event management | /organizer; /organizer/events | /organizer/events | GET /organizer/events; GET /organizer/events/status-counts | Organizer/Admin |
| B3 — Chi tiết sự kiện & phê duyệt (label canvas) | /organizer/events/:id | /organizer/events/[id] | GET/PATCH /organizer/events/:id; POST /organizer/events/:id/submit; POST /organizer/events/:id/cancel; POST /organizer/events/:id/pause | Owner |
| B4 — Tạo sự kiện (label canvas) | /organizer/new | /organizer/events/new | POST /organizer/events; GET /categories; POST /media | Organizer/Admin |
| B5 — Quản lý loại vé | /organizer/events/:id/tickets | /organizer/events/[id]/tickets | POST /organizer/events/:id/ticket-types; PATCH/DELETE /organizer/events/:id/ticket-types/:typeId | Owner |
| B6 — Quản lý đơn hàng | /organizer/order-events; /organizer/events/:id/orders | /organizer/events/[id]/orders | GET /organizer/events/:id/order-manager | Owner |
| B7 — Chi tiết đơn hàng | /organizer/events/:id/orders/:orderId | /organizer/events/[id]/orders/[orderId] | GET /organizer/events/:id/orders/:orderId; GET /organizer/events/:eventId/orders/:orderId/tickets | Owner |
| B8 — Quản lý người tham dự | /organizer/events/:id/attendees | /organizer/events/[id]/attendees | GET /organizer/events/:id/attendees; GET/POST /organizer/events/:id/staff; DELETE /organizer/events/:id/staff/:staffId | Owner |
| B9 — Quét mã QR check-in | /organizer/qr-scan; /organizer/events/:id/checkin; /checkin/events/:id | /checkin/[id] | POST /checkin/events/:id/checkins | Owner/Assigned staff |
| B10 — Phân tích & thống kê sự kiện | /organizer/events/:id/stats | /organizer/events/[id]/stats | GET /organizer/events/:id/analytics; GET /organizer/events/:id/analytics/export.csv; GET /organizer/events/:id/stats | Owner |
| B11 — Organizer Profile | /organizer/profile | /organizer/profile; /organizer/team | GET/PATCH /organizer/profile; GET/POST /organizer/team; GET /organizer/team/:id/events; DELETE /organizer/team/:id; DELETE /organizer/team/:id/events/:staffId | Organizer/Admin |
| B12 — Lịch sử check-in | /organizer/events/:id/:tab | /organizer/events/[id]/checkins | GET /organizer/events/:id/checkins | Owner |
| C1 — Dashboard Quản trị | /admin/dashboard | /admin | GET /admin/stats; GET /admin/stats/revenue-daily | Admin |
| C2 — Quản lý khách hàng | /admin/users | /admin/users | GET /admin/users; PATCH /admin/users/:id; PATCH /admin/users/bulk-status; GET /admin/users/export | Admin |
| C3 — Chi tiết tài khoản khách hàng | /admin/users | /admin/users/[id] | GET /admin/users/:id | Admin |
| C4 — Quản lý Ban Tổ Chức | /admin/applications | /admin/organizers | GET /admin/organizer-applications | Admin |
| C5 — Chi tiết Ban Tổ Chức | /admin/applications/:applicationId | /admin/organizers/[id] | GET /admin/organizer-applications/:id; GET /admin/events?organizerId=:userId | Admin |
| C6 — Xét duyệt hồ sơ Ban Tổ Chức | /admin/applications/review; /admin/applications/review/:applicationId | /admin/applications; /admin/applications/[id] | GET /admin/organizer-applications; POST /admin/organizer-applications/:id/review | Admin |
| C7 — Quản lý danh mục sự kiện | /admin/categories | /admin/categories | GET/POST /admin/categories; PATCH/DELETE /admin/categories/:id | Admin |
| C8 — Quản lý toàn bộ sự kiện | /admin/events | /admin/events | GET /admin/events; GET /admin/events/kpis; GET /admin/events/metrics | Admin |
| C9 — Phê duyệt chi tiết một sự kiện — canvas C9, metadata C10 | /admin/events/review/:id | /admin/events/[id] | GET /organizer/events/:id; POST /admin/events/:id/review | Admin |
| C10 — Quản lý giao dịch — phạm vi thu gọn; canvas C10, metadata C11 Escrow | /admin/payments | /admin/payments | GET /admin/payments; GET /admin/sepay/transactions | Admin |
| C11 — Hàng đợi thẩm định & phê duyệt sự kiện — theo canvas/plan đã thực hiện; tên cũ Escrow được giữ dấu vết trong plan | /admin/events/review | /admin/reviews | GET /admin/events | Admin |
| C12 — Cấu hình hệ thống & cổng thanh toán — scope thu gọn | /admin/settings | /admin/settings | GET /admin/settings/payment-information; GET /admin/administrators | Admin |

## Route phụ cần bảo toàn

- Chọn sự kiện trước quản lý vé/đơn/người tham dự/thống kê/scanner.
- Lời mời đội ngũ: `/organizer/team-invitations`, accept/decline; GET/POST /organizer/team, GET /organizer/team/:id/events, DELETE /organizer/team/:id/events/:staffId, DELETE /organizer/team/:id.
- Chi tiết vé, chi tiết đơn, chi tiết hồ sơ duyệt; search/export/filters và thay đổi trạng thái phải kiểm tra trong từng page, không suy ra đầy đủ chỉ từ URL.
- Quản lý quản trị viên mới và yêu cầu thay đổi pháp lý BTC phải được rà soát thêm ngoài 37 mã lịch sử.

## Toàn bộ route JSX quan sát được (42)

- `/notifications`
- `/checkin`
- `/checkin/events/:id`
- `/`
- `/explore`
- `/events/:slug`
- `/register-organizer`
- `/auth/login`
- `/auth/register`
- `/auth/reset-password`
- `/checkout/:id`
- `/payment-status/:orderId`
- `/orders`
- `/tickets`
- `/tickets/:id`
- `/profile`
- `/organizer`
- `/organizer/dashboard`
- `/organizer/profile`
- `/organizer/team-invitations`
- `/organizer/new`
- `/organizer/qr-scan`
- `/organizer/order-events`
- `/organizer/events`
- `/organizer/events/tickets`
- `/organizer/events/attendees`
- `/organizer/events/stats`
- `/organizer/events/:id/stats`
- `/organizer/events/:id/attendees`
- `/organizer/events/:id`
- `/organizer/events/:id/tickets`
- `/organizer/events/:id/checkin`
- `/organizer/events/:id/orders`
- `/organizer/events/:id/orders/:orderId`
- `/organizer/events/:id/:tab`
- `/admin/applications/review`
- `/admin/applications/review/:applicationId`
- `/admin/applications/:applicationId`
- `/admin/events/review/:id`
- `/admin/events/review`
- `/admin/:tab`
- `*`

## Toàn bộ đăng ký API tĩnh quan sát được (117)

- `POST /sepay/orders/:orderId/payment`
- `GET /sepay/orders/:orderId/payment`
- `POST /admin/sepay/reconcile`
- `GET /admin/sepay/transactions`
- `GET /admin/sepay/transactions/:id`
- `POST /admin/sepay/transactions/:id/reprocess`
- `POST /admin/sepay/transactions/:id/resolve`
- `GET /me/notifications`
- `GET /me/notifications/count`
- `POST /me/notifications/read-all`
- `POST /me/notifications/:id/read`
- `GET /health`
- `GET /config`
- `GET /payments/vnpay/ipn`
- `GET /payments/vnpay/return`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/mobile/register`
- `POST /auth/mobile/login`
- `POST /auth/mobile/refresh-token`
- `POST /auth/forgot-password`
- `POST /auth/verify-otp`
- `POST /auth/reset-password`
- `GET /auth/me`
- `POST /auth/logout`
- `PATCH /me`
- `POST /me/password`
- `GET /categories`
- `GET /events`
- `GET /events/:slug`
- `GET /me/organizer-applications`
- `GET /organizer/profile/stats`
- `GET /organizer/profile`
- `PATCH /organizer/profile`
- `GET /organizer/profile/legal-requests`
- `POST /organizer/profile/legal-requests`
- `GET /admin/organizer-profile-requests`
- `POST /admin/organizer-profile-requests/:id/review`
- `GET /organizer/team`
- `POST /organizer/team`
- `GET /organizer/team/:id/events`
- `DELETE /organizer/team/:id/events/:staffId`
- `DELETE /organizer/team/:id`
- `GET /organizer/search`
- `POST /me/organizer-applications`
- `GET /organizer/dashboard`
- `GET /organizer/events`
- `GET /organizer/events/status-counts`
- `POST /organizer/events`
- `GET /organizer/events/:id`
- `PATCH /organizer/events/:id`
- `POST /organizer/events/:id/submit`
- `POST /organizer/events/:id/pause`
- `POST /organizer/events/:id/cancel`
- `POST /organizer/events/:id/ticket-types`
- `PATCH /organizer/events/:id/ticket-types/:typeId`
- `DELETE /organizer/events/:id/ticket-types/:typeId`
- `GET /me/wait-queue`
- `POST /events/:id/wait-queue`
- `DELETE /me/wait-queue/:id`
- `POST /orders`
- `GET /me/order-history`
- `GET /me/order-history/:id`
- `GET /me/orders`
- `GET /me/orders/:id`
- `POST /orders/:id/payments`
- `POST /orders/:id/cancel`
- `POST /payments/:id/demo`
- `GET /me/tickets`
- `GET /me/tickets/:id`
- `GET /organizer/events/:id/orders`
- `GET /organizer/events/:eventId/order-manager`
- `GET /organizer/events/:eventId/orders/:orderId/tickets`
- `GET /organizer/events/:id/orders/:orderId`
- `GET /organizer/events/:id/attendees`
- `GET /organizer/events/:id/analytics`
- `GET /organizer/events/:id/analytics/export.csv`
- `GET /organizer/events/:id/stats`
- `POST /organizer/events/:id/checkins`
- `GET /organizer/events/:id/staff`
- `POST /organizer/events/:id/staff`
- `DELETE /organizer/events/:id/staff/:staffId`
- `GET /organizer/events/:id/checkins`
- `GET /me/checkin-assignments`
- `POST /me/checkin-invitations/:id/respond`
- `GET /checkin/events/:id`
- `POST /checkin/events/:id/checkins`
- `GET /admin/settings/payment-information`
- `GET /admin/administrators/catalog`
- `GET /admin/administrators`
- `GET /admin/administrators/:id`
- `POST /admin/administrators`
- `PATCH /admin/administrators/:id`
- `GET /admin/stats`
- `GET /admin/stats/revenue-daily`
- `GET /admin/users/stats`
- `GET /admin/users/export`
- `GET /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/bulk-status`
- `PATCH /admin/users/:id`
- `GET /admin/organizer-applications`
- `GET /admin/organizer-applications/:id`
- `POST /admin/organizer-applications/:id/review`
- `GET /admin/events/filter-options`
- `GET /admin/events/kpis`
- `GET /admin/events/metrics`
- `GET /admin/organizers/summaries`
- `GET /admin/events`
- `POST /admin/events/:id/review`
- `GET /admin/categories`
- `POST /admin/categories`
- `PATCH /admin/categories/:id`
- `DELETE /admin/categories/:id`
- `GET /admin/payments`
- `POST /media`

## Route file native hiện có (55)

- `(tabs)/account.tsx`
- `(tabs)/discovery.tsx`
- `(tabs)/index.tsx`
- `(tabs)/orders.tsx`
- `(tabs)/staff.tsx`
- `(tabs)/tickets.tsx`
- `(tabs)/_layout.tsx`
- `admin/administrators/index.tsx`
- `admin/administrators/[id].tsx`
- `admin/applications/index.tsx`
- `admin/applications/[id].tsx`
- `admin/categories.tsx`
- `admin/events/index.tsx`
- `admin/events/[id].tsx`
- `admin/index.tsx`
- `admin/legal-requests.tsx`
- `admin/manage.tsx`
- `admin/organizers/index.tsx`
- `admin/organizers/[id].tsx`
- `admin/payments.tsx`
- `admin/reviews.tsx`
- `admin/settings.tsx`
- `admin/transactions/[id].tsx`
- `admin/users/index.tsx`
- `admin/users/[id].tsx`
- `admin/_layout.tsx`
- `auth.tsx`
- `change-password.tsx`
- `checkin/[id].tsx`
- `events/[slug].tsx`
- `explore.tsx`
- `notifications.tsx`
- `orders/[id].tsx`
- `organizer/checkin.tsx`
- `organizer/events/index.tsx`
- `organizer/events/new.tsx`
- `organizer/events/[id]/attendees.tsx`
- `organizer/events/[id]/checkins.tsx`
- `organizer/events/[id]/edit.tsx`
- `organizer/events/[id]/index.tsx`
- `organizer/events/[id]/orders/index.tsx`
- `organizer/events/[id]/orders/[orderId].tsx`
- `organizer/events/[id]/staff.tsx`
- `organizer/events/[id]/stats.tsx`
- `organizer/events/[id]/tickets.tsx`
- `organizer/index.tsx`
- `organizer/profile.tsx`
- `organizer/team.tsx`
- `organizer/_layout.tsx`
- `payment-status/[id].tsx`
- `profile.tsx`
- `register-organizer.tsx`
- `reset-password.tsx`
- `tickets/[id].tsx`
- `_layout.tsx`

## Gate M0 còn lại

Inventory route đã lập. Chưa đóng M0 cho toàn hệ thống: cần kiểm kê từng nút/action/filter/export trong B/C, xác minh contract thực tế, wireframe theo vai trò, thiết bị/OS và review. Không coi mapping đề xuất là API đã chạy.
