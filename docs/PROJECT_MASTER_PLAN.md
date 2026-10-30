# Project Master Plan — EventHub

## 1. Thông tin tài liệu

| Mục | Giá trị |
|---|---|
| Tên dự án | EventHub |
| Mục đích | Tài liệu bộ nhớ tổng của dự án: giúp AI hiểu trạng thái hiện tại, quản lý tiến độ, xác định công việc tiếp theo và điều hướng đến các tài liệu chi tiết trong các phiên làm việc sau. |
| Phạm vi | Tổng quan, trạng thái đã kiểm chứng, phạm vi chức năng, danh mục màn hình Stitch, kế hoạch chuyển thiết kế thành frontend, tích hợp API, luồng nghiệp vụ, rủi ro/phụ thuộc, tiến độ, điều hướng tài liệu. Không bao gồm triển khai chi tiết từng hàm/endpoint. |
| Ngày lập | 2026-10-24 |
| Ngày cập nhật gần nhất | 2026-10-30 16:59 (A6 VNPay sandbox source/runtime + Supabase read-only review; reports/stitch/A6_20261030_165926_vnpay_sandbox_review.md) |
| Trạng thái tài liệu | Đang hoạt động |
| Quy tắc cập nhật | Sau mỗi nhiệm vụ liên quan, cập nhật tiến độ / ma trận tích hợp / rủi ro bằng bằng chứng từ repo hoặc kết quả kiểm thử. Chỉ đánh dấu `COMPLETED` khi có bằng chứng. Nếu thông tin lỗi thời, đối chiếu repo trước khi dùng. |
| Thứ tự ưu tiên nguồn khi mâu thuẫn | 1) Code đang chạy (route/API/module thực tế) → 2) Migration/schema/contract → 3) Tài liệu đã xác minh (README, IMPLEMENTATION-STATUS, audit) → 4) Tài liệu kế hoạch/Stitch → 5) Giả định (phải ghi rõ). |

## 2. Tổng quan dự án

### 2.1. Mục tiêu
Hệ thống quản lý sự kiện, bán vé trực tuyến và check-in bằng QR Code với 3 vai trò:
- **Customer**: khám phá sự kiện, đăng ký/đăng nhập, đặt vé, thanh toán, quản lý vé QR, hồ sơ cá nhân, lịch sử đơn hàng.
- **Organizer**: tạo/quản lý sự kiện, loại vé, đơn hàng, người tham dự, mời/thu hồi nhân viên check-in, quét QR/check-in, thống kê sự kiện.
- **Administrator**: quản lý người dùng, Organizer, danh mục, sự kiện; phê duyệt hồ sơ Organizer/sự kiện; quản lý giao dịch và thống kê hệ thống.

### 2.2. Kiến trúc (theo repo thực tế)
- **Repo**: monorepo gồm `client/` (web), `server/` (API), `mobile/` (Expo), `docs/`.
- **Backend**: Express 5 + TypeScript + TypeORM + PostgreSQL. Modular monolith với ownership chặt (Auth/Event/Order/Payment/Notification/Audit); transaction phối hợp qua Workflow/UnitOfWork; module chỉ truy cập qua public interface. Xem `docs/SERVICE-OWNERSHIP.md`, `server/src/app.ts`, `server/src/workflows/`.
- **Frontend web**: React 19 + Vite + TypeScript + React Router 7 + Axios + Zustand + Tailwind 3 + Radix UI. Đã tách thành `pages/*`, `components/ticketing/*`, `features/ticketing/*` (xem `docs/ui/FRONTEND-PAGES-REFACTOR-PLAN.md`, `client/src/App.tsx`).
- **Mobile**: Expo SDK 57 + React Native + expo-router; có native auth (refresh token trong body), check-in, thông báo.
- **Cơ sở dữ liệu**: PostgreSQL (hiện dùng Supabase). Migrations: `InitialMvp1790812800000`, `EventCheckinStaff1791072000000`, `Notifications1791331200000`, `WaitQueue1792627200000`. Không dùng `synchronize`. Xem `docs/database/`, `docs/IMPLEMENTATION-STATUS.md`.
- **Thanh toán**: demo local + VNPay sandbox; repo đã có backend SePay/MB Bank (QR/chuyển khoản, webhook, đối soát API v2, admin giao dịch), mức độ vận hành thực tế chưa xác minh. Worker xử lý giữ chỗ / nhắc lịch / hết hạn. Xem `server/src/modules/payment/`, `docs/EMAIL-PAYMENT-SETUP.md`, `docs/WAIT-QUEUE.md` và kế hoạch A6.

### 2.3. Nguồn thiết kế Stitch (chính thức)
- **Stitch project ID:** `10374042969343935993` — dự án **EventHub**, DESKTOP. Là nguồn duy nhất để xây dựng danh mục và đánh giá trạng thái thiết kế.
- **Design system:** Cosmic Graffiti (`assets/0503f907895a45129827e137b5bd7442`) — DARK, primary `#7c3aed`, secondary `#22d3ee`, tertiary `#f472b6`, headline Syne, body Be Vietnam Pro, roundness ROUND_EIGHT, có `designMd`.
- **Không sử dụng** các project `1181052013590326889` (READER, 14 screens) và `13564631082963909735` (remix, 9 screens) cho danh mục/đánh giá.
- **Số lượng màn hình:** project có 36 entries nhưng B7 (Chi tiết đơn hàng) xuất hiện 2 lần với ID khác nhau → danh mục chính thức gồm **35 màn hình** (A1–A11, B1–B12, C1–C12). Biến thể trùng được ghi riêng ở mục 5.

## 3. Trạng thái kỹ thuật hiện tại

> "Đã có code" không đồng nghĩa "hoàn thành". Nhiều trang đã được refactor/theme theo Stitch nhưng cần đối chiếu chi tiết từng màn (mục 5).

| Hạng mục | Trạng thái | Bằng chứng | Công việc còn lại |
|---|---|---|---|
| Backend (Express/TypeORM/Modules) | Đã triển khai | `server/src/app.ts`, `server/src/modules/*`, `server/src/workflows/*`, ownership checker | Giữ ownership/boundary; xử lý các finding audit chưa sửa. |
| API endpoints | Đã có (71 routes) | `server/src/app.ts` | Đối chiếu contract với frontend; bổ sung API cho các màn Stitch còn thiếu. |
| Database/Migrations | Đã có | `docs/database/mvp-schema.sql`, `server/src/migrations/`, `docs/IMPLEMENTATION-STATUS.md` | Không viết migration down; đảm bảo áp dụng đủ khi deploy. |
| Auth/Authorization | Đã triển khai (cookie HttpOnly refresh cho web, body token cho mobile; role USER/ADMIN + ORGANIZER qua application; session isolation) | `server/src/modules/auth/*`, `client/src/lib/api.ts`, `docs/AUDIT-2026-10-12.md` | Theo dõi E1/E3 (xem mục 8). |
| Frontend scaffold/routing | Đã có (18 routes + `*`) | `client/src/App.tsx`, `client/src/pages/*` | Đồng bộ với Stitch. |
| Design system/tokens | Đã áp dụng theme dark + Be Vietnam Pro + token cơ bản | `client/src/index.css`, `client/src/features/ticketing/ticketing.css`, `docs/STITCH-WEB-IMPLEMENTATION.md` | Thống nhất với token Cosmic Graffiti (accent, radius, typography). |
| Loading/error/empty | Có cơ bản | `components/ticketing/shared.tsx` | Hoàn thiện cho các luồng mới. |
| Responsive | Có (13/13 UI tests qua viewport) | `docs/STITCH-WEB-IMPLEMENTATION.md` | Kiểm tra lại với thiết kế Stitch ở các breakpoint. |
| Kiểm thử | Có (unit/integration/E2E/UI mock) | `server/test/*`, `client/tests/*`, `client/tests-mobile/*`, CI | Bổ sung theo luồng Stitch quan trọng. |
| Build/Lint | Có | CI, scripts | Duy trì pass; lưu ý cảnh báo bundle size / Browserslist. |

## 4. Phạm vi chức năng và ma trận tích hợp Frontend–Backend

Chỉ liệt kê endpoint đã thấy trong `server/src/app.ts`/code; chưa xác định thì ghi "Chưa xác minh".

| # | Module | Vai trò | Trang frontend | API/backend (đã xác minh) | Trạng thái | Việc còn lại |
|---|---|---|---|---|---|---|
| 1 | Tài khoản, đăng nhập/đăng xuất | Tất cả | `pages/auth/AuthPage.tsx`, App Guard | `POST /auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`; `GET /auth/me` | Đã tích hợp | Đồng bộ UI Stitch (A4, A11); theo dõi session isolation. |
| 2 | Hồ sơ cá nhân | Customer/Organizer | `pages/account/Profile.tsx` | `GET /auth/me` (`createdAt`), `GET /me/tickets`, `PATCH /me` (profile + avatar autosave), `POST /media`, `POST /me/password` | Đã tích hợp có điều kiện | A10 có nút “Lưu thay đổi” riêng cho họ tên/số điện thoại; email read-only không gửi; avatar chỉ tự lưu qua picker nhỏ cạnh ảnh; form mật khẩu có xác nhận và icon, kiểm tra khớp trước API; browser authenticated/runtime mutation/responsive cần xác minh. |
| 3 | Đăng ký & phê duyệt Organizer | Customer/Admin | `pages/organizer/RegisterOrganizer.tsx`, `pages/admin/Admin.tsx` | `GET/POST /me/organizer-applications`; `GET/POST /admin/organizer-applications/:id/review` | Đã tích hợp (A5) | A5 dùng API thật cho nộp/theo dõi; review admin đã kiểm thử trực tiếp bằng API, thao tác qua Admin UI chưa kiểm thử. C4–C6 còn đồng bộ UI. |
| 4 | Danh mục sự kiện | Admin | `Admin.tsx` (categories) | `GET /categories`; `POST/PATCH/DELETE /admin/categories/*` | Đã tích hợp | Đồng bộ C7. |
| 5 | Tạo/sửa/gửi duyệt/hủy sự kiện | Organizer/Admin | `pages/organizer/CreateEventPage.tsx`, `EditorPage.tsx`, `Organizer.tsx` | `POST/PATCH /organizer/events/*`, `/submit`, `/cancel`; `GET /organizer/events?page=N`, `GET /organizer/events/status-counts`, `GET /categories` (map tên danh mục client-side) | Đã tích hợp (B2 frontend; B3 slug tự động) | B2 dashboard đã dựng theo Stitch và nối 3 API; browser/responsive chưa xác minh (xem 5.4). B3: `POST/PATCH /organizer/events` nhận `slug` optional — tạo thì tự sinh từ title (bỏ dấu/thường/gạch nối, trùng thì thêm `-2`/`-3`), sửa thì giữ slug cũ khi đổi title; ô slug bỏ ở chế độ tạo và read-only ở chế độ sửa (report `reports/stitch/B3_20261028_160604_implementation.md`). B4 đã triển khai form riêng, category/create/media thật, local draft và map search; 23 HTTP assertions + 2 browser tests PASS trên DB cô lập (reports/stitch/B4_20261028_170233_implementation.md); Docker 8000 chưa rebuild, B5 đã triển khai và kiểm thử, xem mục 5.4. làm rõ luồng trạng thái DRAFT/PENDING_REVIEW/APPROVED/REJECTED/PUBLISHED. |
| 6 | Duyệt sự kiện | Admin | `Admin.tsx` | `POST /admin/events/:id/review`, `/admin/events*` | Đã tích hợp | Đồng bộ C8–C10. |
| 7 | Khám phá/tìm kiếm/chi tiết sự kiện | Mọi người | `pages/public/Explore.tsx`, `EventDiscovery.tsx`, `EventDetail.tsx` | `GET /api/events`, `GET /api/events/:slug`, `GET /api/categories` — local 8000 HTTP 200 ngày 2026-10-27 | A2 đã tích hợp, public tests đạt; A3 tích hợp có điều kiện, xem 5.4 | A2 /explore dùng tên/danh mục/thành phố/ngày/giá, sáu thẻ/trang từ API 24 bản ghi/đợt; city exact-match còn dữ liệu hai dấu cách; chưa test vai trò đăng nhập và >24 sự kiện. A3 dùng dữ liệu thật, ảnh bìa và shared shell; responsive 1440/768/390 đạt; không nâng trạng thái A1. |
| 8 | Quản lý loại vé | Organizer | `CreateTicketsPage.tsx`, editor cũ giữ nguyên | `GET /organizer/events/:id`, `POST /organizer/events/:id/ticket-types`, `PATCH/DELETE /organizer/events/:id/ticket-types/:typeId`, `POST /organizer/events/:id/submit` | B5 đã tích hợp, ĐẠT CÓ ĐIỀU KIỆN | 41 HTTP assertions và 2 Chrome tests PASS trên API source/DB cô lập; CRUD + submit thật. Docker8000 chưa rebuild; xem 5.4. |
| 9 | Đặt vé/tạo đơn | Customer | `EventDetail.tsx`, `EventTicketSelector.tsx`, `pages/booking/Checkout.tsx` | `POST /api/orders`, `GET /api/me/orders/:id`, `POST /api/orders/:id/cancel` — HTTP 200 ngày 2026-10-27 | A3 → đăng nhập → tạo đơn → checkout/hủy đã kiểm thử | Tổng backend và idempotency đúng; tối đa 10 vé/đơn, bỏ coupon. Refresh sau full reload bị 403 ORIGIN trên môi trường đang chạy; A6 đã đồng bộ và kiểm thử PENDING/CANCELLED (report A6_20261027_233053_implementation.md), thanh toán thật chưa hoàn tất. |
| 10 | Thanh toán/kết quả giao dịch | Customer/Admin | `Checkout.tsx` | `POST /orders/:id/payments`, `/sepay/orders/:orderId/payment`; `GET /sepay/orders/:orderId/payment`; `POST /payments/sepay/webhook`; `POST /admin/sepay/reconcile`; `GET /admin/sepay/transactions*`; VNPay IPN/return và admin payments giữ nguyên | SePay Live hoạt động; VNPay sandbox source/route có sẵn nhưng runtime Live đang tắt | Checkout DOM đã xếp MB Bank trước VNPay; build client đạt. Backend có VNPay provider + create/IPN/return routes. API 8011 trả `paymentMode=disabled`, `sepayEnabled=true`, do runtime guard không cho bật legacy VNPay khi SePay chạy. Read-only Supabase đếm 14 users/28 orders/16 payments/6 tickets; không dùng chung DB Live cho sandbox. Cần runtime + DB sandbox riêng. [Báo cáo kiểm tra VNPay/Supabase](reports/stitch/A6_20261030_165926_vnpay_sandbox_review.md); [báo cáo rollout](reports/stitch/A6_20261030_164752_live_ui_rollout.md); [kế hoạch SePay](reports/stitch/A6_20261030_implementation_plan.md). |
| 11 | Vé điện tử/QR | Customer | `pages/account/MyTickets.tsx`, `TicketPage.tsx` | `GET /api/me/tickets`, `GET /api/me/tickets/:id` — HTTP 200, metadata sự kiện/người mua và QR thật; sai chủ sở hữu 404, chưa đăng nhập 401 | A8 đã tích hợp, ĐẠT CÓ ĐIỀU KIỆN | Ba trạng thái thật, empty/error/retry, QR giải mã, thông báo, PDF và responsive đã kiểm thử. Chưa nghiệm thu >50 vé, máy quét cổng và accessibility đầy đủ; xem báo cáo A8 tại 5.4. |
| 12 | Lịch sử đơn hàng | Customer | `pages/account/MyOrders.tsx` | `GET /api/me/order-history`, `/api/me/order-history/:id` — local 200, guest 401, validation 400, missing 404; buyer khác 403 và POST hủy/thanh toán được kiểm thử trên DB riêng | A9 đã tích hợp, ĐẠT CÓ ĐIỀU KIỆN | KPI toàn kỳ, tìm event/mã, pagination, vé theo đơn, UTC+7 đã có; giữ API legacy. Chưa benchmark tải lớn, mutation browser, VNPay ngân hàng end-to-end và audit accessibility đầy đủ; xem report A9 tại 5.4. |
| 13 | Đơn hàng phía Organizer | Organizer | `pages/organizer/Operations.tsx` | `GET /organizer/events/:id/orders` | Đã tích hợp | Đồng bộ B6, B7; kiểm tra pagination/filter. |
| 14 | Người tham dự | Organizer | `Operations.tsx` | `GET /organizer/events/:id/attendees` | Đã tích hợp | Đồng bộ B8. |
| 15 | Quét QR/check-in & nhân viên | Organizer/Staff | `QRScanPage.tsx`, scanner staff và Operations | `GET /checkin/events/:id`, `POST /checkin/events/:id/checkins` (thêm buyer_name/ticket_type_name/ticket_code); các API staff/lịch sử hiện hữu giữ nguyên | B9 tích hợp thật, ĐẠT CÓ ĐIỀU KIỆN | 24 HTTP assertions và Chrome test DB riêng PASS; bỏ nhật ký B9; camera vật lý và accessibility chưa kiểm tra đầy đủ; B12 giữ nguyên. Xem 5.4. |
| 16 | Thống kê Organizer | Organizer | `Operations.tsx`, `Organizer.tsx` | `GET /organizer/events/:id/stats` | Đã tích hợp | Đồng bộ B1, B10. |
| 17 | Thống kê hệ thống | Admin | `Admin.tsx` | `GET /admin/stats` | Đã tích hợp | Đồng bộ C1. |
| 18 | Quản lý người dùng | Admin | `Admin.tsx` | `GET /admin/users`, `PATCH /admin/users/:id` | Đã tích hợp | Đồng bộ C2, C3. |
| 19 | Quản lý giao dịch | Admin | `Admin.tsx` (payments) | `GET /admin/payments` | Đã tích hợp | Đồng bộ C11; C12 (cấu hình hệ thống & cổng thanh toán) **chưa rõ API**. |
| 20 | Thông báo | Tất cả | `Notifications`, `NotificationLink` | `GET /me/notifications*`, `POST /me/notifications/:id/read`, `/read-all` | Đã tích hợp | Hoàn thiện đồng bộ UI. |
| 21 | Media | Organizer/Admin | `ImageField` (`shared.tsx`) | `POST /media` | Đã tích hợp | Kiểm tra giới hạn/format; xem E2 (mục 8). |

## 5. Danh mục màn hình Stitch (35) và theo dõi triển khai

Tiền tố Stitch ID: `projects/10374042969343935993/screens/<ID>`. Ba lớp trạng thái được tách riêng: **Thiết kế** (Stitch) / **Review** / **Triển khai** (frontend–API–test). Thiết kế: cả 35 màn `ĐÃ TẠO` (đã xác minh qua Stitch MCP). Review: **A4 `KHÔNG ĐẠT`** (correction `BLOCKED` — `edit_screens` không làm thay đổi artifact khi xác minh lại), **A11 Stitch review `BLOCKED`** (artifact vẫn `KHÔNG ĐẠT`; lượt sửa in-place 16:38 không đổi HTML/screenshot readback); frontend A11 đã được tái tạo theo ảnh, build thành công và browser-review ở desktop/mobile; runtime API/accessibility chưa xác minh. A2: see section 5.4 for the latest review. Báo cáo A4: `reports/stitch/A4_20261025_094146_correction.md`; báo cáo A11 mới nhất: `reports/stitch/A11_20261025_165155_implementation.md`. Cột "Triển khai" ghi trạng thái code hiện tại, chưa đối chiếu pixel với thiết kế Stitch.

### 5.1. Khu vực khách hàng (A1–A11)
| ID | Màn hình | Stitch ID | Route/Page hiện tại | Triển khai |
|---|---|---|---|---|
| A1 | Trang chủ | `f9b7d6b096af4e598718c3f855ffe1e6` | `/` | Đã tái hiện frontend theo bố cục A1 bằng Explore/home.css; giữ AuthHeader/AuthFooter; GET /api/events và /api/categories trả 200; build và browser review desktop 1440px/mobile 390px đạt có điều kiện; runtime tương tác/accessibility cần review |
| A2 | Khám phá & bộ lọc sự kiện | `108b533834414d3a826cd32cfae54fe6` | `/explore` (EventDiscovery) | Đã triển khai theo Stitch với brand EventHub và AuthHeader/AuthFooter chung; API public thật, build/lint và 5/5 Playwright tests đạt; ĐẠT CÓ ĐIỀU KIỆN, xem 5.4 |
| A3 | Chi tiết sự kiện & đặt vé | `fc8d79b4b6f14de19b6aa2f81e3380e6` | `/events/:slug` | Frontend đã triển khai; lỗi refresh được sửa và xác minh bằng test API/browser với Origin khớp; môi trường API đang chạy cổng 8000 vẫn cần khởi động lại đúng `CLIENT_URL`, xem 5.4 | A3 tiếp tục còn các tiêu chí thanh toán, hàng chờ thành công và accessibility; runtime refresh cần xác minh sau restart. |
| A4 | Đăng nhập / Đăng ký | `2d3d2187e79b4a3683caf7aa148bdbf3` | `/auth/login`, `/auth/register` | Có code (đã cập nhật theo Stitch), cần hoàn thiện |
| A5 | Đăng ký Ban Tổ Chức & xét duyệt hồ sơ | `5257666c32e1487687c8f44957e784e2` | `/register-organizer` (RegisterOrganizer) | Đã triển khai trang riêng theo bố cục Stitch, dùng AuthHeader/AuthFooter chung; form 3 mục, nháp localStorage, nộp/theo dõi bằng API thật; trạng thái PENDING/APPROVED/REJECTED và nộp lại sau từ chối đã kiểm thử; build và responsive 1440/768/390 đạt; ĐẠT CÓ ĐIỀU KIỆN, xem 5.4 |
| A6 | Thanh toán & xác nhận đơn hàng | `682d24a1b87b410dbbbcc01baa983b21` | `/checkout/:id` | Đã tái hiện theo Stitch: stepper + đếm ngược, người nhận read-only, VNPay và MB Bank/SePay trong panel hiện tại (4 phương thức phụ giữ nguyên), QR/hướng dẫn từ API, polling trạng thái; không đổi artifact Stitch. UI đã rollout lên local/Vite và tunnel; API Live trả `sepayEnabled=true`, localhost origin được cho phép refresh, payment acceptance bật; health API/tunnel 200, worker Live heartbeat failures=0; chưa chạy giao dịch tiền thật mới; xem 5.4 |
| A7 | Kết quả thanh toán | `4330e7e4069e49bcb54e47dbc8f3851b` | Chưa xác minh (trang riêng hay trạng thái) | Cần kiểm tra |
| A8 | Vé của tôi & thẻ QR check-in | `4ff75d38004140409e70cd99de7e1432` | `/tickets`, `/tickets/:id` | Đã triển khai theo Stitch và các ngoại lệ được duyệt: shell chung, QR/data thật, lọc trạng thái, bốn nút thông báo, in/PDF; build và 3/3 Playwright đạt; ĐẠT CÓ ĐIỀU KIỆN, xem 5.4 |
| A9 | Lịch sử đơn hàng | `4c62fed99aea4822ab345033e5d95dba` | `/orders` | Đã triển khai theo Stitch và các điều chỉnh được duyệt, shell chung, KPI/filter/table/detail/vé từ API thật; build/lint, 5 backend tests và browser bốn viewport đạt; ĐẠT CÓ ĐIỀU KIỆN, xem 5.4 |
| A10 | Hồ sơ cá nhân | `2ffc6d2afffe4e98928685030e86b1c8` | `/profile` | Đã cập nhật frontend theo Stitch/ảnh tham chiếu với header/footer Login dùng chung, icon trước trường thông tin, email chỉ hiển thị, avatar autosave, animation, avatar lớn và picker; build/lint đã đạt; runtime authenticated cần xác minh |
| A11 | Quên mật khẩu & đặt lại mật khẩu | `5d922b967e394167982a27a2dc35f31c` | `/auth/reset-password` | Đã tái tạo header, nội dung hai cột, panel preview, dải an toàn, footer theo ảnh; build và browser-review desktop 1440px/mobile 390px đạt, không tràn ngang |

### 5.2. Khu vực ban tổ chức (B1–B12)
| ID | Màn hình | Stitch ID | Route/Page hiện tại | Triển khai |
|---|---|---|---|---|
| B1 | Dashboard Ban Tổ Chức (sự kiện & doanh thu) | `9871e5e5a3cb4c4a9c1ac87736052b72` | `/organizer` | Có code, cần đồng bộ |
| B2 | Quản lý sự kiện | `b0bca491c8694c069de76d684bd55843` | `/organizer` | Frontend dashboard đã dựng theo Stitch (sidebar/header/quick-stats/bảng/phân trang) + tích hợp `GET /organizer/events`, `/status-counts`, `/categories`; build/lint pass; render trình duyệt & responsive chưa xác minh, xem 5.4 |
| B3 | Chi tiết sự kiện & phê duyệt (label canvas) | `c508b9714484450b8be80d733faf8e0b` | `/organizer/events/:id` | Có code editor chung; mapping đính chính theo canvas 2026-10-28 16:42. Title nội bộ Stitch vẫn ghi B4; chưa review lại frontend B3 |
| B4 | Tạo sự kiện (label canvas) | `d2adc0966946438da408cd7fe644c439` | `/organizer/new` | Đã triển khai `CreateEventPage`; ĐẠT CÓ ĐIỀU KIỆN; đã nối nút tiếp tục sang B5 bằng ID server và browser-test PASS; Docker8000 chưa rebuild; xem 5.4 |
| B5 | Quản lý loại vé | `a9084c52e88a4b46932f2bb330cb2d15` | `/organizer/events/:id/tickets` — `CreateTicketsPage` | ĐẠT CÓ ĐIỀU KIỆN; sidebar, form/bảng/preview, CRUD và submit thật; build/lint, API/browser tests PASS trên môi trường cô lập; xem 5.4 |
| B6 | Quản lý đơn hàng | `391bc738f4ea4e25be5e43993616ca7f` | `/organizer/events/:id/orders` | Có code, cần đồng bộ |
| B7 | Chi tiết đơn hàng | `0e7d1d0aa45f47e7be30f44864b09272` | `/organizer/events/:id/orders` | Có code, cần đồng bộ |
| B8 | Quản lý người tham dự | `361b579259ca4b7cb6fbef553436b3c3` | `/organizer/events/:id/attendees` | Có code, cần đồng bộ |
| B9 | Quét mã QR check-in | `d5ec1ed78e9d49e9922c75a3d768991f` | `/organizer/events/:id/checkin` — `QRScanPage`; staff `/checkin` giữ nguyên | ĐẠT CÓ ĐIỀU KIỆN: sidebar/hero/camera/nhập mã/thẻ kết quả thật; API tên khách/hạng vé; build/lint, 24 HTTP assertions và Chrome 1440/768/390 PASS; xem 5.4 |
| B10 | Phân tích & thống kê sự kiện | `f174f363ba5f418da3d92ea4a4734ba9` | `/organizer/events/:id/stats` | Có code, cần đồng bộ |
| B11 | Hồ sơ Ban Tổ Chức | `f3ad3d9d0cf94e96b1a8a5e7bdc616ff` | Trong Profile/Organizer | Có code một phần |
| B12 | Lịch sử check-in | `b5393d5988464ccc93963da6d5506471` | `/organizer/events/:id/checkins` | Có code, cần đồng bộ |

Ghi chú: quản lý nhân viên check-in (`/organizer/events/:id/staff`) đã có code nhưng chưa có màn Stitch riêng.

### 5.3. Khu vực quản trị viên (C1–C12)
| ID | Màn hình | Stitch ID | Route/Page hiện tại | Triển khai |
|---|---|---|---|---|
| C1 | Dashboard Quản trị | `cd7e1058651c44998a4cb6abff53813b` | `/admin/stats` | Có code, cần đồng bộ |
| C2 | Quản lý khách hàng | `c1ed0c8be6404a3aa9193a0e9365cc85` | `/admin/users` | Có code, cần đồng bộ |
| C3 | Chi tiết tài khoản khách hàng | `d085471ebbdb4e97842bb61d606d82c1` | `/admin/users` | Có code, cần đồng bộ |
| C4 | Quản lý Ban Tổ Chức | `49d8174a88b542969b1985afb3e70bd4` | `/admin/applications` hoặc tab | Có code, cần đồng bộ |
| C5 | Chi tiết Ban Tổ Chức | `b2b2902ef53844d99da9a23373eccd5b` | `/admin/applications` hoặc tab | Có code, cần đồng bộ |
| C6 | Xét duyệt hồ sơ Ban Tổ Chức | `14785a10e0cf42c89d308996b8149813` | `/admin/applications` hoặc tab | Có code, cần đồng bộ |
| C7 | Quản lý danh mục sự kiện | `4f419a1013a94108811a4c30613e72cf` | `/admin/categories` | Có code, cần đồng bộ |
| C8 | Quản lý toàn bộ sự kiện | `30a2dc63c58b45aca620d1eff2b5a5ba` | `/admin/events` | Có code, cần đồng bộ |
| C9 | Hàng đợi duyệt sự kiện khẩn cấp | `5ed99a94ec5d44448ae0703061ef61ae` | Chưa xác minh (tab/filter) | Cần xác minh |
| C10 | Chi tiết thẩm định & phê duyệt mở bán | `4450a0d934414f53aefdd786247d53da` | Chưa xác minh | Cần xác minh |
| C11 | Quản lý giao dịch & dòng tiền ký quỹ Escrow | `ede3a107c9da4722827c2fede190646a` | `/admin/payments` | Có code, cần đồng bộ |
| C12 | Cấu hình hệ thống & cổng thanh toán | `34aa55a7c6a14d4489815e436cbfe34b` | Chưa có route rõ ràng | Chưa xác minh; cần kiểm tra backend và phân loại màn hình |

**Biến thể ghi nhận (không thuộc 35 màn hình chính):** `0a2708e17325456990198cec0f0d162a` — trùng tên "B7. Chi tiết đơn hàng".

### 5.4. Theo dõi review Stitch đã xác minh

| ID | Thiết kế | Review | Vấn đề tồn tại | Báo cáo | Cập nhật |
|---|---|---|---|---|---|
| A5 | `ĐÃ TẠO` — screen `5257666c32e1487687c8f44957e784e2`, DESKTOP 2560×5256; đã đọc HTML/ảnh tham chiếu, artifact giữ nguyên | Frontend `ĐẠT CÓ ĐIỀU KIỆN`; review trước `CHƯA ĐỦ BẰNG CHỨNG` | Trang riêng `/register-organizer` dùng AuthHeader/AuthFooter chung; form 3 mục, bỏ ô Chức vụ, website bắt buộc theo API, nháp localStorage. GET/POST hồ sơ và review admin HTTP 200; đã kiểm thử nộp, theo dõi, tải lại, APPROVED, REJECTED + nộp lại. Chưa có API nháp backend; chưa audit screen reader/contrast; thao tác review qua Admin UI chưa kiểm thử. Không sửa Stitch | [Báo cáo triển khai](reports/stitch/A5_20261027_175650_implementation.md); [review trước](reports/stitch/A5_20261027_155710_review.md) | 2026-10-27 17:56 |
| A6 | `ĐÃ TẠO` — screen `682d24a1b87b410dbbbcc01baa983b21`, DESKTOP 2560×3916; artifact Stitch giữ nguyên | Frontend SePay `ROLLED OUT`; VNPay sandbox source có sẵn, runtime sandbox cần môi trường tách biệt | Checkout giữ nguyên khung, MB Bank/SePay đứng trước VNPay. API Live 8011 đang `paymentMode=disabled`, `sepayEnabled=true`; guard ngăn bật VNPay trong cùng tiến trình SePay. Supabase hiện có 14 users/28 orders/16 payments/6 tickets (kiểm tra chỉ đọc); cần DB sandbox riêng để không pha trộn dữ liệu. [Báo cáo kiểm tra VNPay/Supabase](reports/stitch/A6_20261030_165926_vnpay_sandbox_review.md); [báo cáo rollout](reports/stitch/A6_20261030_164752_live_ui_rollout.md); [kế hoạch](ui/Feature_A6_Checkout_Screen.md) | 2026-10-30 16:59 |
| A9 | `ĐÃ TẠO` — screen `4c62fed99aea4822ab345033e5d95dba`, DESKTOP 2560×3722; HTML/ảnh đã xem, Stitch giữ nguyên | Frontend/API `ĐẠT CÓ ĐIỀU KIỆN`; thiếu contract đã giải quyết | Hai API history thật; KPI/UTC+7/search/pagination/payment canonical/vé theo đơn. VAT thông báo, bỏ Points mẫu, hộp thoại/MyWaitQueue thu gọn/mobile cuộn đã duyệt. 63 đơn và payment retry/late/duplicate kiểm thử DB riêng; browser 1440/1024/768/390 đạt. Còn tải lớn, mutation browser, VNPay ngân hàng và accessibility đầy đủ | [Hoàn tất/xác minh](reports/stitch/A9_20261028_134852_completion.md); [phiên triển khai](reports/stitch/A9_20261028_105834_implementation.md); [review thiết kế](reports/stitch/A9_20261028_103258_review.md); [Kế hoạch](ui/Feature_A9_Orders_Screen.md) | 2026-10-28 13:48 (phiên xác minh cuối) |
| A8 | `ĐÃ TẠO` — screen `4ff75d38004140409e70cd99de7e1432`, DESKTOP 2560×5324; artifact giữ nguyên | Frontend `ĐẠT CÓ ĐIỀU KIỆN`; artifact gốc giữ kết quả review trước `KHÔNG ĐẠT` | Người dùng duyệt sửa bố cục QR hai cột desktop/một cột mobile, dữ liệu thật và PDF trình duyệt. Shell chung; API HTTP 200; VALID/CHECKED_IN/VOID, bốn thông báo, PDF, QR decode, lỗi/retry và quyền sở hữu đã kiểm thử; 3/3 Playwright đạt, responsive 1440/1024/768/390. Còn >50 vé/lưới nhiều vé, scan tại cổng, audit accessibility đầy đủ và lưu PDF thủ công | [Triển khai](reports/stitch/A8_20261028_102426_implementation.md); [review trước](reports/stitch/A8_20261028_005242_review.md); [Kế hoạch](ui/Feature_A8_Mytickets_Screen.md) | 2026-10-28 10:24 |
| A2 | Screen `108b533834414d3a826cd32cfae54fe6` đã đọc lại HTML/ảnh, DESKTOP 2560×4702; artifact giữ nguyên | Frontend `ĐẠT CÓ ĐIỀU KIỆN`; artifact review trước `KHÔNG ĐẠT`, không correction mới | /explore riêng, chỉ chức năng backend hiện có theo xác nhận; API HTTP 200, 5/5 tests public và ảnh 1440/768/390px đạt. Còn dữ liệu city_code hai dấu cách, kiểm thử vai trò đăng nhập, >24 sự kiện, screen reader/contrast. Palette theo artifact khác token mô tả | [Báo cáo triển khai](reports/stitch/A2_20261027_140520_frontend_implementation.md); [review trước](reports/stitch/A2_20261027_134356_review.md); [kế hoạch](ui/Feature_A2_Explore_Screen.md) | 2026-10-27 14:05 |
| A3 | Screen `fc8d79b4b6f14de19b6aa2f81e3380e6`, DESKTOP 2560×6086; đọc lại ảnh/HTML, artifact giữ nguyên | Frontend ĐẠT CÓ ĐIỀU KIỆN; artifact KHÔNG ĐẠT, correction BLOCKED | EventHub, bỏ coupon/sao; yêu thích cục bộ, ảnh bìa và quy định frontend theo xác nhận. API thật, đặt vé/checkout/hủy và responsive đã thử. Refresh code/config đã sửa; browser reload nhận refresh 200 trên backend kiểm thử có Origin khớp. API hiện đang chạy cổng 8000 vẫn trả 403 với Vite do cấu hình runtime cũ; restart Compose với `DOCKER_CLIENT_URL=http://localhost:5173` rồi xác minh lại. Còn thanh toán, hàng chờ thành công và accessibility đầy đủ | [Báo cáo triển khai A3](reports/stitch/A3_20261027_193458_frontend_implementation.md); [báo cáo khắc phục refresh](reports/stitch/auth-refresh-origin-20261028.md); [kế hoạch](ui/Feature_A3_DetailsEvent_Screen.md) | 2026-10-28 |
| A1 | `STITCH` — screen `f9b7d6b096af4e598718c3f855ffe1e6`, DESKTOP 2560×6660; artifact gốc chưa sửa và còn brand/title cũ. Frontend `/` đã tái hiện bố cục A1, giữ shared AuthHeader/AuthFooter, categories/events nối API | `Stitch artifact correction: BLOCKED`; `frontend: ĐẠT CÓ ĐIỀU KIỆN` — live health/categories/events HTTP 200; build đạt; browser full-page desktop 1440px/mobile 390px đã xem | Stitch A1 còn `ENVENTHUB`/`Cosmic Ticket` và header artifact cũ; correction không persist (event `077dc5cb`). Frontend hiển thị dữ liệu hiện có, gồm dữ liệu thử nghiệm; chưa audit thao tác đầy đủ, keyboard/screen reader/contrast; screenshot là file tạm | [`reports/stitch/A1_20261026_105221_frontend_implementation.md`](reports/stitch/A1_20261026_105221_frontend_implementation.md); review trước: [`reports/stitch/A1_20261026_103938_correction_attempt.md`](reports/stitch/A1_20261026_103938_correction_attempt.md); plan: [`ui/Feature_A1_Home_Screen.md`](ui/Feature_A1_Home_Screen.md) | 2026-10-26 10:52 |
| A4 | `ĐÃ TẠO` — HTML `6748196296944310261`, ảnh `6313009675931005984` | `KHÔNG ĐẠT` | Brand `ENVENT` (0 `EVENTHUB`); bộ chọn vai trò ở màn đăng nhập; 0 `<h1>`, 0 `<label for>`, 0 `aria-label`; social login không có backend; dữ liệu cá nhân; `© 2025`; thiếu trạng thái lỗi/loading; palette lệch token Cosmic Graffiti; correction `BLOCKED` — đã thử lại 09:30 (brand) và 09:35 (đầy đủ), `edit_screens` trả `dom_operations` (`43028f4f`, `08805e32`) nhưng artifact không đổi | [`reports/stitch/A4_20261025_094146_correction.md`](reports/stitch/A4_20261025_094146_correction.md) | 2026-10-25 09:41 |
| A11 | `ĐÃ TẠO` — Stitch screen `5d922b967e394167982a27a2dc35f31c` giữ nguyên; logic reset 3 bước, password/nút cập nhật ở LUỒNG 02, countdown/resend, logo, hourglass và màu nút active đã triển khai; build/lint đạt | Stitch review `BLOCKED` / artifact gốc `KHÔNG ĐẠT`; triển khai correction `ĐẠT CÓ ĐIỀU KIỆN` ở source/build/lint | Đã thêm logo phía trên tiêu đề, hourglass xoay trước countdown, min-height tận dụng viewport và màu active cho các nút LUỒNG 01. Form chính giữ OTP; password/nút cập nhật nằm ở LUỒNG 02. Browser visual review sau correction, runtime API và accessibility runtime chưa kiểm tra. | [`reports/stitch/A11_20261025_174555_visual_fullscreen_correction.md`](reports/stitch/A11_20261025_174555_visual_fullscreen_correction.md); correction trước: [`reports/stitch/A11_20261025_173921_flow2_submit_button_correction.md`](reports/stitch/A11_20261025_173921_flow2_submit_button_correction.md); implementation: [`reports/stitch/A11_20261025_172753_reset_flow_implementation.md`](reports/stitch/A11_20261025_172753_reset_flow_implementation.md) | 2026-10-25 17:45 |
| A10 | `ĐÃ XÁC NHẬN CÓ THỂ TRUY CẬP` — Stitch screen `2ffc6d2afffe4e98928685030e86b1c8`, DESKTOP 2560×4002; artifact giữ nguyên | `ĐẠT CÓ ĐIỀU KIỆN` cho frontend / `CHƯA ĐỦ BẰNG CHỨNG` cho runtime | A10 dùng `AuthHeader`/`AuthFooter` chung của Login; App shell header/demo banner/footer bị tắt riêng trên `/profile`. Button “Lưu thay đổi” cập nhật họ tên/số điện thoại và gửi lại avatarUrl hiện tại để không xóa ảnh; email disabled/read-only không gửi. Avatar vẫn tự lưu qua picker nhỏ cạnh ảnh. Form mật khẩu có ba trường, icon KeyRound và chặn submit nếu mật khẩu mới không khớp. Icon UserRound/Phone/Mail, avatar 126px, animation, ẩn URL avatar, số sự kiện và loại bỏ ticket wallet vẫn giữ. Browser chưa đăng nhập nên upload, mutation, responsive/accessibility chưa xác minh | [`reports/stitch/A10_20261025_231720_preserve_avatar_on_profile_save.md`](reports/stitch/A10_20261025_231720_preserve_avatar_on_profile_save.md); trước đó: [`reports/stitch/A10_20261025_231310_profile_save_button.md`](reports/stitch/A10_20261025_231310_profile_save_button.md); kế hoạch: [`docs/ui/Feature_A10_Profile_Screen.md`](docs/ui/Feature_A10_Profile_Screen.md) | 2026-10-25 23:17 |
| B2 | `ĐÃ TẠO` — screen `b0bca491c8694c069de76d684bd55843` “B2. Quản lý sự kiện - Cosmic Ticket Ban Tổ Chức”, DESKTOP 2560×2048; đã đọc HTML (`11790387134387571069`) và ảnh (`13662411730510336636`), artifact giữ nguyên, không sửa Stitch | Frontend `ĐẠT CÓ ĐIỀU KIỆN` (code + build/lint pass; browser/responsive/accessibility chưa xác minh); **API backend `ĐẠT CÓ ĐIỀU KIỆN`** — đã triển khai + kiểm thử runtime | Dashboard B2 đã dựng theo Stitch: `OrganizerSidebar` (menu tĩnh 10 mục + LIVE GATE SYNC), header organizer (breadcrumb/tìm kiếm/nút tạo sự kiện/chuông/danh tính), subheader + Quick Stats (tổng/mở bán/chờ duyệt/nháp từ `status-counts`), bảng 6 cột (thumb+tên+danh mục, thời gian & địa điểm, vé & tỷ lệ lấp đầy, doanh thu tạm tính, trạng thái, thao tác), phân trang theo `total_results`; nối `GET /organizer/events?page=N`, `GET /organizer/events/status-counts`, `GET /categories` (map tên danh mục client-side). `App.tsx` ẩn header/footer chung trên `/organizer`, dùng class `organizer-main`. Build (`tsc -b` + `vite build`) và eslint 4 file PASS (2026-10-28 13:22). API backend (phiên 12:57): 200, 15 event, revenue/sold khớp `orders.summary`, status-counts tổng khớp list, cross-tenant rỗng, 401 chưa đăng nhập. **Chưa xác minh:** render trình duyệt (Playwright không cài được binary Chromium headless-shell do download timeout), responsive 1440/768/390 và accessibility runtime; sidebar menu tĩnh chưa nối route (tách sau); chưa đối chiếu pixel với ảnh Stitch; case `capacity=0` và đơn không `PAID` chưa seed. Palette artifact khác token chuẩn — giữ theo artifact. Ghi chú phiên 16:28: yêu cầu lập kế hoạch tạo mang nhãn B4 có nhắc cập nhật B2; không review lại B2, giữ kết quả trên; sidebar đã có được chọn để tái sử dụng. | [Review & kế hoạch](reports/stitch/B2_20261028_114609_review.md); [Kế hoạch](ui/Feature_B2_ManagerEvent.md); [Triển khai + kiểm thử API](reports/stitch/B2_20261028_125724_api_implementation.md); [Triển khai giao diện](reports/stitch/B2_20261028_132214_implementation.md); [Ghi chú phiên B4](reports/stitch/B4_20261028_162855_review_plan.md) | 2026-10-28 13:22 (review B2); 2026-10-28 16:28 (ghi chú); 2026-10-28 17:33 (B5: [review](reports/stitch/B5_20261028_173324_review_plan.md), B2 unchanged) |
| B3 | Lịch sử báo cáo mã B3 trước khi đính chính mapping: screen `d2adc0966946438da408cd7fe644c439` là label canvas B4 Tạo sự kiện; B3 canvas hiện là `c508b9714484450b8be80d733faf8e0b`, chưa review lại | Review B3 canvas `CHƯA REVIEW`; kết quả slug của editor tạo trong báo cáo lịch sử `ĐẠT CÓ ĐIỀU KIỆN` | Slug tự động sinh từ title qua `server/src/utils/slug.ts` (`slugify` bỏ dấu tiếng Việt/thường/gạch nối, fallback `su-kien-<hex>`); `eventSchema.slug` thành optional; `create` sinh slug duy nhất (`-2`/`-3` khi trùng); `saveEvent` giữ slug cũ khi đổi title; EditorPage bỏ ô slug ở chế độ tạo, read-only (`disabled`) ở chế độ sửa. Kiểm thử: unit `Âm Nhạc`→`am-nhac`, integration `POST` không slug→HTTP 200 sinh `su-kien-kiem-thu-slug-tu-dong`, `PATCH` đổi title không slug→slug giữ nguyên; tạo rồi xóa 1 sự kiện test (xóa trực tiếp SQL vì không có endpoint xóa cứng). `tsc --noEmit` và `vite build` PASS. **Chưa xác minh:** render trình duyệt/responsive/accessibility; trùng slug thực tế (`-2`/`-3`) chưa chạy tích hợp; Docker cổng 8000 chưa rebuild mã mới. | [Triển khai](reports/stitch/B3_20261028_160604_implementation.md) | 2026-10-28 16:06 (lịch sử triển khai slug); 2026-10-28 16:42 (đính chính mapping) |
| B4 | `ĐÃ TẠO` — canvas B4 `d2adc0966946438da408cd7fe644c439`; title nội bộ ghi B3; HTML `3126640626866283910`, ảnh `5144337055934097385`; không sửa Stitch | `ĐẠT CÓ ĐIỀU KIỆN` — frontend và API source trong DB test cô lập | Route tạo độc lập dùng lại sidebar; chỉ thông tin event, plaintext có đếm từ/ký tự, không poster/vé; banner 5 MB; local draft theo user, map search địa chỉ. API 23 HTTP assertions PASS: create/read/PATCH/owner/media/validation/no-ticket submit. Chrome 2 tests PASS gồm reload/storage/account, upload, offline, timezone GMT+7, 1440/768/390; build/lint PASS. ĐÃ TRIỂN KHAI success inline: giữ form/preview và URL, thông báo Tạo bản nháp thành công + nút Tạo loại vé dưới submit; khóa form, chống gửi lặp, giữ CTA khi lỗi storage. 3 Chrome tests + 41 HTTP assertions PASS trên DB riêng; build/lint PASS; responsive 1440/768/390. [Report mới](reports/stitch/B4_20261028_205941_inline_success_implementation.md). ID success chưa phục hồi sau reload; chưa có idempotency server. Đã nối B5 và browser-test giữ ID; [report điều hướng](reports/stitch/B4_20261028_180743_navigation.md). Còn: chưa server autosave, chưa audit accessibility đầy đủ/category empty/refresh giữa request; Docker 8000 chưa rebuild; 3 ảnh test local chưa xóa do policy chặn. | [Triển khai](reports/stitch/B4_20261028_170233_implementation.md); [Kế hoạch](ui/Feature_B4_CreateEvent.md); [Review trước](reports/stitch/B4_20261028_164647_review_plan.md) | 2026-10-28 21:07 (inline đã test) |
| B5 | `ĐÃ TẠO` — canvas B5 `a9084c52e88a4b46932f2bb330cb2d15`, DESKTOP 2560×3758; HTML `10465278454534937034`, ảnh `5830095464257483379`; không sửa Stitch | `ĐẠT CÓ ĐIỀU KIỆN` — frontend và API source/DB cô lập | B4 → B5; form/bảng/preview, POST/PATCH/DELETE/GET và gửi duyệt thật; 41 HTTP assertions + 2 Chrome tests PASS, build/lint PASS, 1440/768/390 không tràn ngang. Bỏ QR động và toggle; các chức năng chưa hỗ trợ giữ giao diện và hiện toast theo xác nhận. Còn Docker8000 chưa rebuild, REJECTED runtime, concurrency/mất response, browser khác và accessibility đầy đủ. | [Triển khai](reports/stitch/B5_20261028_175629_implementation.md); [Kế hoạch](ui/Feature_B5_CreateTickets.md) | 2026-10-28 18:11 |
| B7 | `ĐÃ TẠO` — `0e7d1d0aa45f47e7be30f44864b09272`, tiêu đề Chi tiết đơn hàng đã xác minh metadata; không sửa Stitch | `CHƯA REVIEW` chi tiết đơn hàng; phiên yêu cầu quét QR `CHƯA ĐỦ BẰNG CHỨNG` | Yêu cầu ban đầu gọi quét QR là B7; người dùng xác nhận quét QR là B9, Chi tiết đơn hàng là B7. Không thay trạng thái triển khai B7. | [Báo cáo phiên](reports/stitch/B7_20261028_212432_review_plan.md); [Kế hoạch B9](ui/Feature_B9_QRScan.md) | 2026-10-28 21:24 (ghi chú ban đầu); 21:31 (xác nhận mã) |
| B9 | `ĐÃ TẠO` — screen `d5ec1ed78e9d49e9922c75a3d768991f`, DESKTOP 2560×3218; HTML/ảnh đã xem, Stitch giữ nguyên | `ĐẠT CÓ ĐIỀU KIỆN` — frontend/API đã triển khai và test DB riêng | Sidebar nối route có sẵn, mục chưa có giữ nguyên; hero, camera/nhập mã trái và kết quả phải; bỏ nhật ký/cổng/thiết bị/offline/relay/in thẻ, một trạng thái. API thêm tên khách/hạng vé/mã vé sau kiểm tra quyền. 24 HTTP assertions + Chrome test thật PASS, build/lint/boundaries PASS, 1440/768/390 không tràn. Docker API local đã rebuild, health/login/event 200. Kiểm tra 29/10: Docker Desktop chưa chạy, chưa xác minh lại runtime. Còn camera vật lý, mất response giữa mutation, browser khác và accessibility đầy đủ. | [Kiểm tra kết thúc](reports/stitch/B9_20261029_071702_completion_check.md); [Triển khai](reports/stitch/B9_20261028_223941_implementation.md); [Kiểm thử API trước](reports/stitch/B9_20261028_221456_api_full_check.md); [Kế hoạch](ui/Feature_B9_QRScan.md) | 2026-10-29 07:17 (kiểm tra); 28/10 22:39 (triển khai) |

## 6. Kế hoạch chuyển Stitch thành frontend code

| Giai đoạn | Nội dung | Trạng thái | Ghi chú / bằng chứng |
|---|---|---|---|
| A. Khảo sát & chuẩn bị | Cấu trúc frontend, dependency, component dùng chung | Đã có phần lớn | `main.tsx`, `route.ts`, `App.tsx`, `package.json`. Còn: map chi tiết 35 màn với route/component (mục 5) và rà soát vấn đề trước triển khai. |
| B. Nền tảng giao diện | Layout Customer/Organizer/Admin, routing + Guard, API client, auth state | Đã có | `App.tsx`, `client/src/lib/api.ts` (session binding, refresh lock, cross-tab check), `features/auth/stores/authStore.ts`. Còn: áp dụng token Cosmic Graffiti. |
| C. Trang Customer | A1–A11 | Có code, chưa đồng bộ đầy đủ | Ưu tiên A4/A11 (auth), A1–A3, A6–A7. |
| D. Trang Organizer | B1–B12 | Có code, chưa đồng bộ đầy đủ | Xem mục 5.2. |
| E. Trang Administrator | C1–C12 | Có code, chưa đồng bộ đầy đủ | C9, C10, C12 cần xác minh route/API. |
| F. Tích hợp API & nghiệp vụ | Mapping dữ liệu, phân trang/lọc, upload, thanh toán & phát hành vé, QR/check-in chống trùng, thống kê từ dữ liệu thực | Đang tiến hành | A2 tích hợp GET events/categories, filter và phân trang đã kiểm thử public với dữ liệu thật (report A2_20261027_140520_frontend_implementation.md); A5 đã tích hợp GET/POST `/me/organizer-applications` và kiểm thử review admin trực tiếp (report A5_20261027_175650_implementation.md); A3 tích hợp chi tiết và tạo đơn/tổng backend, checkout/hủy đã kiểm thử; refresh Origin đã sửa, API và browser reload đạt với cấu hình khớp; API đang chạy cần restart với Origin frontend (report `reports/stitch/auth-refresh-origin-20261028.md`); A6 đã rollout Checkout SePay lên local/Vite và tunnel; API config trả `sepayEnabled=true`, localhost proxy tới 8011, Live create-payment flag bật; health/tunnel 200, worker heartbeat mới, chưa giao dịch thật mới trong phiên (reports/stitch/A6_20261030_164752_live_ui_rollout.md); backend Live evidence trước đó tại docs/MBBank_SePay_Live_Plan.md; A8 tích hợp hai API vé mở rộng, HTTP 200 và QR thật, ba trạng thái/quyền sở hữu/PDF đã kiểm thử; backend hiện chạy với Origin localhost:5173 (report `reports/stitch/A8_20261028_102426_implementation.md`); B2 tích hợp `GET /organizer/events`, `/status-counts`, `/categories` vào dashboard Organizer, build/lint pass (report `reports/stitch/B2_20261028_132214_implementation.md`); B3 tích hợp slug tự động cho `POST/PATCH /organizer/events` (tự sinh từ title khi tạo, giữ nguyên khi đổi title), unit + integration + build pass (report `reports/stitch/B3_20261028_160604_implementation.md`); A9 tích hợp hai API order-history, KPI/vé theo đơn và UTC+7; 5 backend tests + browser bốn viewport đạt, còn giới hạn theo report `reports/stitch/A9_20261028_134852_completion.md`; B4 form tạo riêng tích hợp categories/POST event/media; local autosave, map search, 23 HTTP assertions + 2 Chrome tests PASS; Docker 8000 chưa rebuild, B5 đã triển khai, xem report mới (report `reports/stitch/B4_20261028_170233_implementation.md`); phần khác tiếp tục rà soát mục 4.  B5: CRUD/GET/submit API thật, 41 HTTP assertions và 2 Chrome tests PASS; [report](reports/stitch/B5_20261028_175629_implementation.md). |
| G. Kiểm thử & nghiệm thu | Route, quyền theo vai trò, form/CRUD, luồng đầu cuối, lỗi/empty, responsive, build/lint/test | Cần xác minh | Lệnh: `npm run build`, `npm run check`, `npm test`, `npm run test:ui`. |

## 7. Luồng nghiệp vụ quan trọng

| Luồng | Trạng thái | Tiêu chí nghiệm thu |
|---|---|---|
| 1. Đăng ký/đăng nhập → phân quyền → truy cập đúng khu vực | Đã có | Chỉ role đúng truy cập được route bảo vệ; logout xóa session. |
| 2. Khám phá → chi tiết → chọn vé → tạo đơn → thanh toán | Đã có | Chọn vé đúng, kiểm tra tồn kho, tạo đơn thành công. |
| 3. Thanh toán thành công → phát hành vé → hiển thị QR | Đã có | Chỉ khi thanh toán thành công mới phát hành vé; QR hiển thị đúng. |
| 4. Thanh toán thất bại/đang xử lý → không phát hành vé hợp lệ | Đã có (logic backend); cần kiểm tra UI | Không hiển thị vé thành công khi thất bại; trạng thái rõ ràng. |
| 5. Organizer tạo sự kiện → quản lý loại vé → gửi duyệt | Đã có | Luồng đúng trạng thái, validation đầy đủ. |
| 6. Admin duyệt/từ chối sự kiện → Organizer nhận trạng thái | Đã có | Trạng thái/thông báo cập nhật đúng. |
| 7. Organizer quản lý người tham dự → quét QR → check-in | Đã có | Chỉ vé hợp lệ của đúng sự kiện mới check-in; ngăn trùng. |
| 8. Admin quản lý tài khoản/danh mục/sự kiện/giao dịch | Đã có | Đúng quyền; xác nhận hành động quan trọng. |
| 9. Dashboard hiển thị số liệu thực | Đã có | Chỉ dùng API thực, không hardcode; số liệu khớp backend. |

## 8. Rủi ro, phụ thuộc và vấn đề cần xác minh

| Vấn đề | Mức độ | Trạng thái | Bằng chứng | Công việc đề xuất |
|---|---|---|---|---|
| E1: Expo web tự retry thao tác bằng phiên khác (nguy cơ ghi nhầm tài khoản) | Cao | Chưa sửa (open) | `docs/AUDIT-2026-10-22.md` | Cách ly danh tính request, bind với session revision/userId, xác minh chủ thể trước khi retry, xử lý missed signal. |
| E2: Upload ảnh dùng Sharp 0.34.5, chưa vá advisory (cần ≥ 0.35.4) | Cao | Chưa sửa (open) | `docs/AUDIT-2026-10-22.md` | Nâng Sharp + libvips, cập nhật lockfile, build lại, kiểm thử upload. |
| E3: Refresh đồng thời nhiều tab có thể thu hồi cả phiên mới | Trung bình–Cao | Chưa sửa (open) | `docs/AUDIT-2026-10-22.md` | Phối hợp refresh giữa tab; phân biệt replay độc hại và hợp lệ. |
| Session isolation web/mobile | Trung bình | Đang cải thiện | `client/src/lib/api.ts` | Tiếp tục regression tests. |
| Đồng bộ UI với 35 màn Stitch | Trung bình–Cao | Đang tiến hành | Mục 5 | Map từng màn, áp dụng token, kiểm tra route. |
| API contract khớp UI mới (đặc biệt C9, C10, C12) | Trung bình | Cần xác minh | So sánh client calls và server routes | Rà soát payload/response. |
| Camera check-in trên thiết bị thật/HTTPS | Trung bình | Chưa nghiệm thu đầy đủ | `docs/IMPLEMENTATION-STATUS.md` | Kiểm thử thực tế. |
| VNPay sandbox vs demo | Trung bình | Có hỗ trợ sandbox | `docs/EMAIL-PAYMENT-SETUP.md` | Kiểm thử callback/return. |
| Bundle size lớn / Browserslist cũ | Thấp–Trung bình | Cảnh báo build | Build warnings | Tách chunk sau (không block MVP). |
| Migration/DB Supabase | Thấp | Đã xử lý | `docs/IMPLEMENTATION-STATUS.md` | Giữ quy trình migrate an toàn. |

## 9. Bảng theo dõi tiến độ tổng

Trạng thái: `NOT_STARTED` | `IN_PROGRESS` | `BLOCKED` | `NEEDS_REVIEW` | `COMPLETED` | `NOT_APPLICABLE`. Không ghi phần trăm nếu không có căn cứ.

| ID | Hạng mục | Ưu tiên | Trạng thái | Tiến độ | Phụ thuộc | Tài liệu chi tiết |
|---|---|---|---|---|---|---|
| MP-01 | Khảo sát repo & đọc tài liệu | P0 | COMPLETED | 100% | - | README.md, IMPLEMENTATION-STATUS.md, AUDIT-*.md, MVP-BACKEND-WEB-PLAN.md, SERVICE-OWNERSHIP.md |
| MP-02 | Liệt kê dự án Stitch & screens EventHub | P0 | COMPLETED | 100% | Stitch MCP | Mục 2.3, mục 5 |
| MP-03 | Tạo & refactor PROJECT_MASTER_PLAN.md | P0 | COMPLETED | 100% | MP-01, MP-02 | `docs/PROJECT_MASTER_PLAN.md` (file này) |
| MP-04 | Đồng bộ Auth UI (A4, A11) | P0 | NEEDS_REVIEW | Chưa đánh giá | API auth | `client/src/pages/auth/AuthPage.tsx`, `docs/ui/Report1.md` |
| MP-05 | Đồng bộ trang chủ/khám phá/chi tiết (A1–A3) | P1 | IN_PROGRESS | Chưa đánh giá | API events/categories | `client/src/pages/public/*` |
| MP-06 | Đồng bộ Checkout/kết quả thanh toán (A6, A7) | P1 | IN_PROGRESS | Chưa đánh giá | API orders/payments | `client/src/pages/booking/Checkout.tsx` |
| MP-07 | Đồng bộ Vé/Lịch sử/Hồ sơ (A5, A8–A10) | P1 | IN_PROGRESS | A5 đã triển khai; A8 đạt có điều kiện, xem 5.4; các màn còn lại tiếp tục theo trạng thái riêng | API tickets/orders/me | `client/src/pages/organizer/RegisterOrganizer.tsx`, `client/src/pages/account/*`; [A8](reports/stitch/A8_20261028_102426_implementation.md) |
| MP-08 | Đồng bộ Organizer (B1–B12) | P1 | IN_PROGRESS | Chưa đánh giá | API organizer | `client/src/pages/organizer/*` |
| MP-09 | Đồng bộ Admin (C1–C12) | P1 | IN_PROGRESS | Chưa đánh giá | API admin | `client/src/pages/admin/*` |
| MP-10 | Xử lý audit findings E1/E2/E3 | P0 | BLOCKED / NEEDS_REVIEW | Chưa đánh giá | `docs/AUDIT-2026-10-22.md` | `docs/AUDIT-FIXES-2026-10-22.md` |
| MP-11 | Rà soát tích hợp API còn thiếu | P1 | NEEDS_REVIEW | Chưa đánh giá | Mục 4, mục 5 | Mục 4 |
| MP-12 | Kiểm thử build/lint/E2E theo luồng chính | P1 | NEEDS_REVIEW | Chưa đánh giá | CI/scripts | `npm run build`, `check`, `test`, `test:ui` |
| MP-13 | Hoàn thiện responsive, design tokens Cosmic Graffiti, trạng thái loading/empty/error | P2 | NOT_STARTED | - | MP-04…MP-09 | `index.css`, `ticketing.css`, `components/ticketing/shared.tsx` |

## 10. Kế hoạch hành động tiếp theo

| Ưu tiên | Công việc | Liên quan | Tiêu chí hoàn thành |
|---|---|---|---|
| P0 | Rà soát và theo dõi audit E1/E2/E3: ghi owner, kế hoạch fix | MP-10 | Trạng thái, owner, kế hoạch sửa được ghi vào Master Plan. |
| P0 | A4: đã thử lại in-place 09:30/09:35 nhưng `edit_screens` vẫn không lưu artifact; cần quyết định hướng xử lý (sửa qua UI Stitch, khắc phục MCP hoặc tạo màn thay thế có kiểm soát) | MP-04 | Có artifact A4 mới được xác minh và review lại; không tạo trùng lặp khi chưa được duyệt. |
| P0 | Hoàn thiện cột "Route/Page" và đối chiếu Stitch cho các màn còn "Chưa xác minh" (A7, C9, C10, C12) | MP-02, MP-11 | Mục 5 không còn ô "Chưa xác minh" về route. |
| P0 | Xác nhận `npm run build` và `npm run check` pass | MP-12 | Build/lint không lỗi. |
| P1 | Đồng bộ UI theo thứ tự: Auth → Explore/EventDetail/Checkout → Organizer → Admin (giữ nguyên logic auth/API) | MP-04…MP-09 | Lint/build pass; luồng nghiệp vụ mục 7 hoạt động đúng. |
| P1 | Rà soát API contract, cập nhật mục 4 | MP-11 | Mỗi gap có hướng xử lý hoặc "cần xác minh". |
| P2 | Hoàn thiện responsive, tokens, loading/empty/error | MP-13 | Nhất quán trên các trang chính. |
| P3 | Chạy test suite, kiểm tra luồng đầu cuối, cập nhật Master Plan bằng bằng chứng | MP-12 | `npm test`, `npm run test:ui` pass (hoặc ghi nhận failures); checklist mục 7 đạt. |

## 11. Cấu trúc tài liệu chi tiết

Master Plan chỉ điều hướng, không thay thế tài liệu chi tiết.

| Tài liệu | Trạng thái | Mục đích |
|---|---|---|
| `docs/PROJECT_MASTER_PLAN.md` | Đang dùng (file này) | Bản đồ tổng thể, tiến độ, phụ thuộc, rủi ro, hành động tiếp theo. |
| `docs/FRONTEND_IMPLEMENTATION_PLAN.md` | Dự kiến tạo | Chi tiết từng trang Stitch → code, component mapping, token, checklist nghiệm thu. |
| `docs/API_INTEGRATION_PLAN.md` | Dự kiến tạo | Endpoint, request/response, mapping, gaps, contract verification. |
| `docs/TESTING_AND_ACCEPTANCE_PLAN.md` | Dự kiến tạo | Kế hoạch test theo luồng, regression, E2E, tiêu chí nghiệm thu. |
| `docs/ui/FRONTEND-PAGES-REFACTOR-PLAN.md` | Đã tồn tại | Kế hoạch refactor pages (đã thực hiện). |
| `docs/STITCH-WEB-INTEGRATION-PLAN.md` | Đã tồn tại | Kế hoạch tích hợp Stitch web (khảo sát). |
| `docs/STITCH-WEB-IMPLEMENTATION.md` | Đã tồn tại | Báo cáo triển khai Stitch web. |
| `docs/ui/Report1.md` | Đã tồn tại | Báo cáo triển khai Login theo Stitch. |
| `docs/ui/Feature_A1_Home_Screen.md` | Đã thực hiện frontend A1; artifact Stitch correction còn blocked | Kế hoạch, tiêu chí và trạng thái triển khai Trang chủ theo Stitch. |
| `docs/ui/Feature_A11_ResetPassword_Screen.md` | Đã tạo | Kế hoạch hiệu chỉnh A11 trên Stitch; không bao gồm sửa source code. |
| `docs/ui/Feature_A10_Profile_Screen.md` | Đã tạo | Kế hoạch hiệu chỉnh A10 trên Stitch; không bao gồm sửa source code. |
| `docs/ui/Feature_B4_CreateEvent.md` | Đã triển khai B4, đạt có điều kiện | Kế hoạch, nhật ký triển khai, API/browser thật, giới hạn và report mới tại 5.4; đã nối B5; report điều hướng trong plan. |
| `docs/ui/Feature_B5_CreateTickets.md` | Đã triển khai, ĐẠT CÓ ĐIỀU KIỆN | [B5 implementation](reports/stitch/B5_20261028_175629_implementation.md); API/browser thật, giới hạn xem report. |
| `docs/reports/stitch/` | Đã tạo (02 báo cáo A4, 05 báo cáo A11) | Báo cáo review/triển khai từng màn hình theo Stitch (xem mục 12). |

## 12. Quy tắc review, báo cáo và lịch sử

- **Tách ba lớp trạng thái:** thiết kế (Stitch) / kết quả review / triển khai frontend–API–testing.
- **Tiêu chí review tối thiểu:** đáp ứng yêu cầu, bố cục/phân cấp, design system (Cosmic Graffiti), khả năng đọc tiếng Việt/độ tương phản, điều hướng & luồng nghiệp vụ, trạng thái giao diện, responsive/accessibility, nhất quán giữa các màn cùng phân hệ.
- **Báo cáo:** lưu tại `docs/reports/stitch/`, đặt tên `<SCREEN_ID>_<YYYYMMDD_HHMMSS>_<ACTION>.md`, múi giờ `Asia/Ho_Chi_Minh`. Báo cáo bất biến: không ghi đè/xóa/tái sử dụng; tạo báo cáo mới nếu đính chính.
- **Master Plan chỉ lưu** trạng thái mới nhất đã xác minh và liên kết báo cáo gần nhất (`Chưa có` nếu chưa có), không chứa toàn bộ lịch sử.
- **Cập nhật theo từng màn hình:** chỉ cập nhật màn thực sự được xử lý/xác minh, không cập nhật hàng loạt. Thời điểm theo định dạng `YYYY-MM-DD HH:mm`; dùng `Chưa xác minh` nếu không xác định được.

## 13. Hướng dẫn sử dụng Master Plan trong các phiên làm việc sau

1. **Đọc trước:** AI phải đọc `docs/PROJECT_MASTER_PLAN.md` trước khi bắt đầu phiên triển khai mới.
2. **Đi sâu theo module:** đọc tài liệu chi tiết tương ứng và khảo sát code thực tế; Master Plan không thay thế source code.
3. **Xác định mục tiêu:** trước khi làm, xác định mục tiêu, trạng thái, phụ thuộc và tiêu chí hoàn thành.
4. **Cập nhật sau nhiệm vụ:** cập nhật trạng thái, tiến độ, bằng chứng, vấn đề phát sinh và công việc tiếp theo.
5. **Chỉ đánh dấu hoàn thành có bằng chứng:** `COMPLETED` chỉ khi có bằng chứng từ code, kết quả kiểm thử hoặc quy trình xác minh phù hợp.
6. **Cập nhật khi lỗi thời:** nếu thông tin cũ, đối chiếu repo và cập nhật; không dựa tiếp trên thông tin cũ.
7. **Phân biệt rõ** thiết kế, triển khai code, tích hợp API và kiểm thử.
8. **Không tự ý thay đổi phạm vi requirement:** nếu phát hiện mâu thuẫn, ghi nhận và yêu cầu xác minh.
9. **Giữ lịch sử quan trọng:** khi cập nhật, giữ các quyết định quan trọng, tránh mất bối cảnh cần thiết.
10. **Giữ ngắn gọn:** chỉ chứa tổng quan, trạng thái, phụ thuộc, tiêu chí nghiệm thu và liên kết; không thành nhật ký dài hay bản sao source code.
11. **Chỉ dùng project Stitch chính thức** `10374042969343935993`; không dùng `1181052013590326889` và `13564631082963909735` để đánh giá.
12. **Danh mục chuẩn gồm 35 màn hình** A1–A11, B1–B12, C1–C12; biến thể ghi riêng.
13. **Không bịa dữ liệu:** không tạo URL/screen ID/báo cáo/timestamp giả; dùng `Chưa xác minh` / `CHƯA REVIEW` khi thiếu bằng chứng.

## 14. Lịch sử thay đổi quan trọng

| Ngày | Thay đổi |
|---|---|
| 2026-10-24 | Lập Master Plan; chốt Stitch project chính thức và danh mục 35 màn hình. |
| 2026-10-25 | Refactor: loại bỏ các mục lặp (mục Stitch/quy tắc bị lặp nhiều lần, các bảng chồng chéo giữa phạm vi/tích hợp/giai đoạn), đánh lại số mục, quy ước màn hình theo mã A/B/C thay cho số thứ tự, bỏ phần "báo cáo ngắn gọn" của tác vụ cũ, thống nhất tên dự án là EventHub (bỏ "Cosmic Ticket"). |
| 2026-10-27 | A5: triển khai trang riêng `/register-organizer`, nối CTA từ trang chủ/khám phá/footer, tích hợp GET/POST hồ sơ và trạng thái thật; build đạt, kiểm thử PENDING/APPROVED/REJECTED/nộp lại; báo cáo `reports/stitch/A5_20261027_175650_implementation.md`. |
