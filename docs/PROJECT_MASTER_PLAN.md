# Project Master Plan — EventHub

## 1. Thông tin tài liệu

| Mục | Giá trị |
|---|---|
| Tên dự án | EventHub |
| Mục đích | Tài liệu bộ nhớ tổng của dự án: giúp AI hiểu trạng thái hiện tại, quản lý tiến độ, xác định công việc tiếp theo và điều hướng đến các tài liệu chi tiết trong các phiên làm việc sau. |
| Phạm vi | Tổng quan, trạng thái đã kiểm chứng, phạm vi chức năng, danh mục màn hình Stitch, kế hoạch chuyển thiết kế thành frontend, tích hợp API, luồng nghiệp vụ, rủi ro/phụ thuộc, tiến độ, điều hướng tài liệu. Không bao gồm triển khai chi tiết từng hàm/endpoint. |
| Ngày lập | 2026-10-24 |
| Ngày cập nhật gần nhất | 2026-10-25 (A11 React recreation built and browser-reviewed at desktop/mobile; Stitch artifact unchanged; report `A11_20261025_165155_implementation.md`) |
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
- **Thanh toán**: demo local + VNPay sandbox. Worker xử lý giữ chỗ / nhắc lịch / hết hạn. Xem `server/src/modules/payment/`, `docs/EMAIL-PAYMENT-SETUP.md`, `docs/WAIT-QUEUE.md`.

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
| 2 | Hồ sơ cá nhân | Customer/Organizer | `pages/account/Profile.tsx` | `PATCH /me`, `POST /me/password` | Đã tích hợp | Đồng bộ A10. |
| 3 | Đăng ký & phê duyệt Organizer | Customer/Admin | `Profile.tsx`, `pages/admin/Admin.tsx` | `GET/POST /me/organizer-applications`; `GET/POST /admin/organizer-applications/:id/review` | Đã tích hợp | Đồng bộ A5, C4–C6. |
| 4 | Danh mục sự kiện | Admin | `Admin.tsx` (categories) | `GET /categories`; `POST/PATCH/DELETE /admin/categories/*` | Đã tích hợp | Đồng bộ C7. |
| 5 | Tạo/sửa/gửi duyệt/hủy sự kiện | Organizer/Admin | `pages/organizer/EditorPage.tsx`, `Organizer.tsx` | `POST/PATCH /organizer/events/*`, `/submit`, `/cancel` | Đã tích hợp | Đồng bộ B2–B4; làm rõ luồng trạng thái DRAFT/PENDING_REVIEW/APPROVED/REJECTED/PUBLISHED. |
| 6 | Duyệt sự kiện | Admin | `Admin.tsx` | `POST /admin/events/:id/review`, `/admin/events*` | Đã tích hợp | Đồng bộ C8–C10. |
| 7 | Khám phá/tìm kiếm/chi tiết sự kiện | Mọi người | `pages/public/Explore.tsx`, `EventDetail.tsx` | `GET /events`, `GET /events/:slug`, `GET /categories` | Đã tích hợp | Đồng bộ A1–A3; kiểm tra trường hiển thị còn thiếu. |
| 8 | Quản lý loại vé | Organizer | `EditorPage.tsx` | `POST/PATCH/DELETE /organizer/events/:id/ticket-types/*` | Đã tích hợp | Đồng bộ B5. |
| 9 | Đặt vé/tạo đơn | Customer | `EventDetail.tsx`, `pages/booking/Checkout.tsx` | `POST /orders`, `POST /orders/:id/cancel` | Đã tích hợp | Đồng bộ A6. |
| 10 | Thanh toán/kết quả giao dịch | Customer/Admin | `Checkout.tsx` | `POST /orders/:id/payments`, `POST /payments/:id/demo`, `GET /payments/vnpay/*`, `GET /admin/payments` | Đã tích hợp | Đồng bộ A7; theo dõi đối soát; chỉ phát hành vé khi thanh toán thành công. |
| 11 | Vé điện tử/QR | Customer | `pages/account/MyTickets.tsx`, `TicketPage.tsx` | `GET /me/tickets`, `GET /me/tickets/:id` | Đã tích hợp | Đồng bộ A8. |
| 12 | Lịch sử đơn hàng | Customer | `pages/account/MyOrders.tsx` | `GET /me/orders`, `GET /me/orders/:id` | Đã tích hợp | Đồng bộ A9. |
| 13 | Đơn hàng phía Organizer | Organizer | `pages/organizer/Operations.tsx` | `GET /organizer/events/:id/orders` | Đã tích hợp | Đồng bộ B6, B7; kiểm tra pagination/filter. |
| 14 | Người tham dự | Organizer | `Operations.tsx` | `GET /organizer/events/:id/attendees` | Đã tích hợp | Đồng bộ B8. |
| 15 | Quét QR/check-in & nhân viên | Organizer/Staff | `pages/staff/StaffCheckin.tsx`, `Operations.tsx`, `components/ticketing/scanner.tsx` | `GET /checkin/events/:id`, `POST /checkin/events/:id/checkins`, `GET /organizer/events/:id/checkins`, `GET/POST/DELETE /organizer/events/:id/staff*`, `GET /me/checkin-assignments`, `POST /me/checkin-invitations/:id/respond` | Đã tích hợp | Đồng bộ B9, B12; kiểm tra quyền staff theo sự kiện. |
| 16 | Thống kê Organizer | Organizer | `Operations.tsx`, `Organizer.tsx` | `GET /organizer/events/:id/stats` | Đã tích hợp | Đồng bộ B1, B10. |
| 17 | Thống kê hệ thống | Admin | `Admin.tsx` | `GET /admin/stats` | Đã tích hợp | Đồng bộ C1. |
| 18 | Quản lý người dùng | Admin | `Admin.tsx` | `GET /admin/users`, `PATCH /admin/users/:id` | Đã tích hợp | Đồng bộ C2, C3. |
| 19 | Quản lý giao dịch | Admin | `Admin.tsx` (payments) | `GET /admin/payments` | Đã tích hợp | Đồng bộ C11; C12 (cấu hình hệ thống & cổng thanh toán) **chưa rõ API**. |
| 20 | Thông báo | Tất cả | `Notifications`, `NotificationLink` | `GET /me/notifications*`, `POST /me/notifications/:id/read`, `/read-all` | Đã tích hợp | Hoàn thiện đồng bộ UI. |
| 21 | Media | Organizer/Admin | `ImageField` (`shared.tsx`) | `POST /media` | Đã tích hợp | Kiểm tra giới hạn/format; xem E2 (mục 8). |

## 5. Danh mục màn hình Stitch (35) và theo dõi triển khai

Tiền tố Stitch ID: `projects/10374042969343935993/screens/<ID>`. Ba lớp trạng thái được tách riêng: **Thiết kế** (Stitch) / **Review** / **Triển khai** (frontend–API–test). Thiết kế: cả 35 màn `ĐÃ TẠO` (đã xác minh qua Stitch MCP). Review: **A4 `KHÔNG ĐẠT`** (correction `BLOCKED` — `edit_screens` không làm thay đổi artifact khi xác minh lại), **A11 Stitch review `BLOCKED`** (artifact vẫn `KHÔNG ĐẠT`; lượt sửa in-place 16:38 không đổi HTML/screenshot readback); frontend A11 đã được tái tạo theo ảnh, build thành công và browser-review ở desktop/mobile; runtime API/accessibility chưa xác minh. 33 màn còn lại `CHƯA REVIEW`. Báo cáo A4: `reports/stitch/A4_20261025_094146_correction.md`; báo cáo A11 mới nhất: `reports/stitch/A11_20261025_165155_implementation.md`. Cột "Triển khai" ghi trạng thái code hiện tại, chưa đối chiếu pixel với thiết kế Stitch.

### 5.1. Khu vực khách hàng (A1–A11)
| ID | Màn hình | Stitch ID | Route/Page hiện tại | Triển khai |
|---|---|---|---|---|
| A1 | Trang chủ | `f9b7d6b096af4e598718c3f855ffe1e6` | `/` | Có code, cần đồng bộ |
| A2 | Khám phá & bộ lọc sự kiện | `108b533834414d3a826cd32cfae54fe6` | `/` (Explore) | Có code, cần đồng bộ |
| A3 | Chi tiết sự kiện & đặt vé | `fc8d79b4b6f14de19b6aa2f81e3380e6` | `/events/:slug` | Có code, cần đồng bộ |
| A4 | Đăng nhập / Đăng ký | `2d3d2187e79b4a3683caf7aa148bdbf3` | `/auth/login`, `/auth/register` | Có code (đã cập nhật theo Stitch), cần hoàn thiện |
| A5 | Đăng ký Ban Tổ Chức & xét duyệt hồ sơ | `5257666c32e1487687c8f44957e784e2` | `/profile` (trong Profile) | Có code, cần đồng bộ |
| A6 | Thanh toán & xác nhận đơn hàng | `682d24a1b87b410dbbbcc01baa983b21` | `/checkout/:id` | Có code, cần đồng bộ |
| A7 | Kết quả thanh toán | `4330e7e4069e49bcb54e47dbc8f3851b` | Chưa xác minh (trang riêng hay trạng thái) | Cần kiểm tra |
| A8 | Vé của tôi & thẻ QR check-in | `4ff75d38004140409e70cd99de7e1432` | `/tickets`, `/tickets/:id` | Có code, cần đồng bộ |
| A9 | Lịch sử đơn hàng | `4c62fed99aea4822ab345033e5d95dba` | `/orders` | Có code, cần đồng bộ |
| A10 | Hồ sơ cá nhân | `2ffc6d2afffe4e98928685030e86b1c8` | `/profile` | Có code, cần đồng bộ |
| A11 | Quên mật khẩu & đặt lại mật khẩu | `5d922b967e394167982a27a2dc35f31c` | `/auth/reset-password` | Đã tái tạo header, nội dung hai cột, panel preview, dải an toàn, footer theo ảnh; build và browser-review desktop 1440px/mobile 390px đạt, không tràn ngang |

### 5.2. Khu vực ban tổ chức (B1–B12)
| ID | Màn hình | Stitch ID | Route/Page hiện tại | Triển khai |
|---|---|---|---|---|
| B1 | Dashboard Ban Tổ Chức (sự kiện & doanh thu) | `9871e5e5a3cb4c4a9c1ac87736052b72` | `/organizer` | Có code, cần đồng bộ |
| B2 | Quản lý sự kiện | `b0bca491c8694c069de76d684bd55843` | `/organizer` | Có code, cần đồng bộ |
| B3 | Tạo / chỉnh sửa sự kiện | `d2adc0966946438da408cd7fe644c439` | `/organizer/new` | Có code, cần đồng bộ |
| B4 | Chi tiết sự kiện & phê duyệt | `c508b9714484450b8be80d733faf8e0b` | `/organizer/events/:id` | Có code, cần đồng bộ |
| B5 | Quản lý loại vé | `a9084c52e88a4b46932f2bb330cb2d15` | `EditorPage` | Có code, cần đồng bộ |
| B6 | Quản lý đơn hàng | `391bc738f4ea4e25be5e43993616ca7f` | `/organizer/events/:id/orders` | Có code, cần đồng bộ |
| B7 | Chi tiết đơn hàng | `0e7d1d0aa45f47e7be30f44864b09272` | `/organizer/events/:id/orders` | Có code, cần đồng bộ |
| B8 | Quản lý người tham dự | `361b579259ca4b7cb6fbef553436b3c3` | `/organizer/events/:id/attendees` | Có code, cần đồng bộ |
| B9 | Quét mã QR check-in | `d5ec1ed78e9d49e9922c75a3d768991f` | `/organizer/events/:id/checkin`, `/checkin` | Có code, cần đồng bộ |
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
| A4 | `ĐÃ TẠO` — HTML `6748196296944310261`, ảnh `6313009675931005984` | `KHÔNG ĐẠT` | Brand `ENVENT` (0 `EVENTHUB`); bộ chọn vai trò ở màn đăng nhập; 0 `<h1>`, 0 `<label for>`, 0 `aria-label`; social login không có backend; dữ liệu cá nhân; `© 2025`; thiếu trạng thái lỗi/loading; palette lệch token Cosmic Graffiti; correction `BLOCKED` — đã thử lại 09:30 (brand) và 09:35 (đầy đủ), `edit_screens` trả `dom_operations` (`43028f4f`, `08805e32`) nhưng artifact không đổi | [`reports/stitch/A4_20261025_094146_correction.md`](reports/stitch/A4_20261025_094146_correction.md) | 2026-10-25 09:41 |
| A11 | `ĐÃ TẠO` — Stitch screen `5d922b967e394167982a27a2dc35f31c` giữ nguyên; logic reset 3 bước, password/nút cập nhật ở LUỒNG 02, countdown/resend, logo, hourglass và màu nút active đã triển khai; build/lint đạt | Stitch review `BLOCKED` / artifact gốc `KHÔNG ĐẠT`; triển khai correction `ĐẠT CÓ ĐIỀU KIỆN` ở source/build/lint | Đã thêm logo phía trên tiêu đề, hourglass xoay trước countdown, min-height tận dụng viewport và màu active cho các nút LUỒNG 01. Form chính giữ OTP; password/nút cập nhật nằm ở LUỒNG 02. Browser visual review sau correction, runtime API và accessibility runtime chưa kiểm tra. | [`reports/stitch/A11_20261025_174555_visual_fullscreen_correction.md`](reports/stitch/A11_20261025_174555_visual_fullscreen_correction.md); correction trước: [`reports/stitch/A11_20261025_173921_flow2_submit_button_correction.md`](reports/stitch/A11_20261025_173921_flow2_submit_button_correction.md); implementation: [`reports/stitch/A11_20261025_172753_reset_flow_implementation.md`](reports/stitch/A11_20261025_172753_reset_flow_implementation.md) | 2026-10-25 17:45 |

## 6. Kế hoạch chuyển Stitch thành frontend code

| Giai đoạn | Nội dung | Trạng thái | Ghi chú / bằng chứng |
|---|---|---|---|
| A. Khảo sát & chuẩn bị | Cấu trúc frontend, dependency, component dùng chung | Đã có phần lớn | `main.tsx`, `route.ts`, `App.tsx`, `package.json`. Còn: map chi tiết 35 màn với route/component (mục 5) và rà soát vấn đề trước triển khai. |
| B. Nền tảng giao diện | Layout Customer/Organizer/Admin, routing + Guard, API client, auth state | Đã có | `App.tsx`, `client/src/lib/api.ts` (session binding, refresh lock, cross-tab check), `features/auth/stores/authStore.ts`. Còn: áp dụng token Cosmic Graffiti. |
| C. Trang Customer | A1–A11 | Có code, chưa đồng bộ đầy đủ | Ưu tiên A4/A11 (auth), A1–A3, A6–A7. |
| D. Trang Organizer | B1–B12 | Có code, chưa đồng bộ đầy đủ | Xem mục 5.2. |
| E. Trang Administrator | C1–C12 | Có code, chưa đồng bộ đầy đủ | C9, C10, C12 cần xác minh route/API. |
| F. Tích hợp API & nghiệp vụ | Mapping dữ liệu, phân trang/lọc, upload, thanh toán & phát hành vé, QR/check-in chống trùng, thống kê từ dữ liệu thực | Đang tiến hành | Rà soát payload/response so với UI mới (mục 4). |
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
| MP-07 | Đồng bộ Vé/Lịch sử/Hồ sơ (A5, A8–A10) | P1 | IN_PROGRESS | Chưa đánh giá | API tickets/orders/me | `client/src/pages/account/*` |
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
| `docs/ui/Feature_A11_ResetPassword_Screen.md` | Đã tạo | Kế hoạch hiệu chỉnh A11 trên Stitch; không bao gồm sửa source code. |
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
