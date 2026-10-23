# Kế hoạch tách trang frontend web thành các `pages` riêng

Ngày lập: 23/10/2026. Trạng thái: **đã triển khai xong, đang chờ review** (xem mục 12). Phạm vi: `client/` (web React). Không áp dụng cho `mobile/`.

Tài liệu này gồm: báo cáo hiện trạng, kế hoạch công việc, thứ tự thực hiện, tiêu chí bắt buộc cho người thực hiện, tiêu chí đánh giá hoàn thành và biểu mẫu báo cáo sau khi hoàn tất.

> **Nguyên tắc tối thượng:** đây là đợt **tái cấu trúc thuần túy**. Chỉ di chuyển file/khối code và cập nhật đường dẫn import. Không thay đổi bất kỳ dòng logic, JSX, CSS, route, kiểu dữ liệu, tên component hay hành vi nào.

---

## 1. Báo cáo hiện trạng

### 1.1. Kiến trúc hiện tại

- Web dùng Vite + React 19 + TypeScript + React Router 7.
- Chuỗi khởi động: `client/src/main.tsx` → `client/src/route.ts` → `client/src/App.tsx`.
- `App.tsx` đang gánh cả bốn vai trò:
  - Layout: header, footer, banner thanh toán demo.
  - Khởi tạo phiên: gọi `authService.getCurrentUser()`, đồng bộ `revision`.
  - Phân quyền: component `Guard` (dòng 38–55).
  - Bảng route: `<Routes>` (dòng 136–257).
- Các trang không nằm trong thư mục `pages/`. Chúng bị gộp trong các file feature rất lớn:

| File | Số dòng | Nội dung |
| --- | ---: | --- |
| `client/src/features/ticketing/customer.tsx` | 902 | `ActionForm` + 8 trang khách |
| `client/src/features/ticketing/management.tsx` | 885 | `StatCards`, helper ngày giờ + 4 trang Organizer/Admin |
| `client/src/features/ticketing/staff.tsx` | 302 | 2 trang check-in + 2 component quản lý staff |
| `client/src/features/ticketing/notifications.tsx` | 207 | `NotificationLink` + trang thông báo |
| `client/src/features/ticketing/shared.tsx` | 229 | UI dùng chung |
| `client/src/features/ticketing/event-visuals.tsx` | 124 | Component hiển thị sự kiện |
| `client/src/features/ticketing/wait-queue.tsx` | 122 | Component danh sách chờ |
| `client/src/features/ticketing/scanner.tsx` | 115 | Component quét QR |

### 1.2. Hệ quả

- File quá dài, khó review, khó xác định phạm vi thay đổi.
- Trang và component bị trộn lẫn: `ActionForm` nằm trong `customer.tsx` nhưng bị `scanner.tsx`, `staff.tsx`, `management.tsx` import.
- Split trang buộc phải kéo theo import chéo giữa các file page nếu không tách component dùng chung trước.
- Rủi ro regression cao khi sửa UI vì mọi trang dùng chung một file.

### 1.3. Danh sách route hiện tại

Tổng cộng 18 route thật + 1 route bắt lỗi `*`:

| # | Route | Component | Guard |
| ---: | --- | --- | --- |
| 1 | `/` | `Explore` | Không |
| 2 | `/events/:slug` | `EventDetail` | Không |
| 3 | `/auth/login` | `AuthPage` | Không |
| 4 | `/auth/register` | `AuthPage` (`register`) | Không |
| 5 | `/auth/reset-password` | `AuthPage` (`reset`) | Không |
| 6 | `/checkout/:id` | `Checkout` | Đăng nhập |
| 7 | `/orders` | `MyOrders` | Đăng nhập |
| 8 | `/tickets` | `MyTickets` | Đăng nhập |
| 9 | `/tickets/:id` | `TicketPage` | Đăng nhập |
| 10 | `/profile` | `Profile` | Đăng nhập |
| 11 | `/notifications` | `Notifications` | Đăng nhập |
| 12 | `/checkin` | `StaffAssignments` | Đăng nhập |
| 13 | `/checkin/events/:id` | `StaffCheckin` | Đăng nhập |
| 14 | `/organizer` | `Organizer` | `ORGANIZER`, `ADMIN` |
| 15 | `/organizer/new` | `EditorPage` | `ORGANIZER`, `ADMIN` |
| 16 | `/organizer/events/:id` | `EditorPage` | `ORGANIZER`, `ADMIN` |
| 17 | `/organizer/events/:id/:tab` | `Operations` | `ORGANIZER`, `ADMIN` |
| 18 | `/admin/:tab` | `Admin` | `ADMIN` |
| 19 | `*` | Khối “Không tìm thấy trang” trong `App.tsx` | Không |

### 1.4. Những phần không thay đổi

- API backend, database, Supabase, worker.
- Toàn bộ `mobile/`.
- CSS (`index.css`, `ticketing.css`), token màu, font.
- Nội dung chữ tiếng Việt, `className`, cấu trúc JSX.
- Route, guard, cách khởi tạo phiên, cơ chế refresh token.
- Test hiện có.

---

## 2. Mục tiêu và phạm vi

### 2.1. Mục tiêu

1. Mỗi trang là một file riêng dưới `client/src/pages/<domain>/`.
2. Component dùng chung chuyển sang `client/src/components/ticketing/`.
3. Dữ liệu/hook/type dùng chung giữ tại `client/src/features/ticketing/`.
4. `App.tsx` chỉ còn layout + route table + `Guard`; chỉ thay đổi các dòng import.
5. Không thay đổi hành vi, giao diện, route hay API.

### 2.2. Không nằm trong phạm vi

- Không lazy-load/code-splitting.
- Không đổi tên component, hàm, biến, type, prop.
- Không tách `App.tsx` thành `AppLayout` + `Outlet`.
- Không sửa CSS, không đổi cấu trúc DOM.
- Không sửa test, không thêm test mới.
- Không đổi route, guard, quyền truy cập.
- Không format lại file, không sắp xếp lại import ngoài phạm vi di chuyển.

---

## 3. Cấu trúc đích

```text
client/src/
├── pages/
│   ├── public/
│   │   ├── Explore.tsx
│   │   └── EventDetail.tsx
│   ├── auth/
│   │   └── AuthPage.tsx
│   ├── booking/
│   │   └── Checkout.tsx
│   ├── account/
│   │   ├── MyOrders.tsx
│   │   ├── MyTickets.tsx
│   │   ├── TicketPage.tsx
│   │   ├── Profile.tsx
│   │   └── Notifications.tsx
│   ├── staff/
│   │   ├── StaffAssignments.tsx
│   │   └── StaffCheckin.tsx
│   ├── organizer/
│   │   ├── Organizer.tsx
│   │   ├── EditorPage.tsx
│   │   └── Operations.tsx
│   └── admin/
│       └── Admin.tsx
├── components/
│   └── ticketing/
│       ├── action-form.tsx
│       ├── stat-cards.tsx
│       ├── staff-management.tsx
│       ├── checkin-history.tsx
│       ├── notification-link.tsx
│       ├── scanner.tsx
│       ├── shared.tsx
│       ├── event-visuals.tsx
│       └── wait-queue.tsx
├── features/
│   └── ticketing/
│       ├── data.ts
│       ├── types.ts
│       ├── payment.ts
│       ├── wait-queue-data.ts
│       ├── notifications-data.ts
│       ├── staff-data.ts        # mới
│       ├── dates.ts             # mới
│       └── ticketing.css
├── app/                         # KHÔNG tạo trong đợt này
├── lib/                         # giữ nguyên
└── main.tsx                     # giữ nguyên
```

Lưu ý: tên file page giữ trùng tên export hiện tại (`Explore.tsx` export `Explore`, ...) để không phải đổi tên component.

---

## 4. Ánh xạ file chi tiết

> Số dòng theo HEAD hiện tại. Trước khi cắt, người thực hiện phải mở file và xác nhận ranh giới bằng tên export/function, không chỉ dựa vào số dòng.

### 4.1. `customer.tsx` → 8 page + 1 component

| Khối nguồn | Dòng | Đích | Export giữ nguyên |
| --- | --- | --- | --- |
| `ActionForm` | 47–89 | `components/ticketing/action-form.tsx` | `ActionForm` |
| `Explore` | 90–203 | `pages/public/Explore.tsx` | `Explore` |
| `EventDetail` | 204–367 | `pages/public/EventDetail.tsx` | `EventDetail` |
| `AuthPage` | 368–482 | `pages/auth/AuthPage.tsx` | `AuthPage` |
| `Checkout` | 483–680 | `pages/booking/Checkout.tsx` | `Checkout` |
| `MyOrders` | 681–748 | `pages/account/MyOrders.tsx` | `MyOrders` |
| `MyTickets` | 749–781 | `pages/account/MyTickets.tsx` | `MyTickets` |
| `TicketPage` | 782–804 | `pages/account/TicketPage.tsx` | `TicketPage` |
| `Profile` | 805–902 | `pages/account/Profile.tsx` | `Profile` |

Yêu cầu: mỗi file page chỉ import những gì khối đó thực sự dùng. `customer.tsx` bị xóa sau khi cả 9 khối đã chuyển và không còn tham chiếu.

### 4.2. `management.tsx` → 4 page + 2 file dùng chung

| Khối nguồn | Dòng | Đích | Export giữ nguyên |
| --- | --- | --- | --- |
| `local`, `iso`, `eventTime` | 40–48 | `features/ticketing/dates.ts` | Thêm `export` cho 3 hàm |
| `statLabel` + `StatCards` | 49–94 | `components/ticketing/stat-cards.tsx` | `StatCards` (giữ `statLabel` private) |
| `Organizer` | 95–145 | `pages/organizer/Organizer.tsx` | `Organizer` |
| `EditorPage` | 146–149 | `pages/organizer/EditorPage.tsx` | `EditorPage` |
| `ExistingEditor` | 150–155 | cùng file `EditorPage.tsx` | private |
| `EditorForm` | 156–459 | cùng file `EditorPage.tsx` | private |
| `Operations` | 460–498 | `pages/organizer/Operations.tsx` | `Operations` |
| `OperationData` | 499–570 | cùng file `Operations.tsx` | private |
| `Admin` | 571–593 | `pages/admin/Admin.tsx` | `Admin` |
| `AdminData` | 594–885 | cùng file `Admin.tsx` | private |

### 4.3. `staff.tsx` → 2 page + 2 component + 1 file dữ liệu

| Khối nguồn | Dòng | Đích | Ghi chú |
| --- | --- | --- | --- |
| `Assignment`, `status`, `labels` | 9–34 | `features/ticketing/staff-data.ts` | Thêm `export` cho type và 2 hàm/bản đồ |
| `StaffManagement` | 36–124 | `components/ticketing/staff-management.tsx` | Export giữ nguyên |
| `StaffAssignments` | 126–216 | `pages/staff/StaffAssignments.tsx` | Export giữ nguyên |
| `StaffCheckin` | 218–244 | `pages/staff/StaffCheckin.tsx` | Export giữ nguyên |
| `Checkin` type + `CheckinHistory` | 246–302 | `components/ticketing/checkin-history.tsx` | `Checkin` giữ private trong file này |

### 4.4. `notifications.tsx` → 1 page + 1 component

| Khối nguồn | Dòng | Đích | Export giữ nguyên |
| --- | --- | --- | --- |
| `NotificationLink` | 13–52 | `components/ticketing/notification-link.tsx` | `NotificationLink` |
| `Notifications` | 54–207 | `pages/account/Notifications.tsx` | `Notifications` |

### 4.5. File chuyển nguyên khối

| Nguồn | Đích |
| --- | --- |
| `features/ticketing/shared.tsx` | `components/ticketing/shared.tsx` |
| `features/ticketing/event-visuals.tsx` | `components/ticketing/event-visuals.tsx` |
| `features/ticketing/scanner.tsx` | `components/ticketing/scanner.tsx` |
| `features/ticketing/wait-queue.tsx` | `components/ticketing/wait-queue.tsx` |

### 4.6. File giữ nguyên tại chỗ

`features/ticketing/data.ts`, `types.ts`, `payment.ts`, `wait-queue-data.ts`, `notifications-data.ts`, `ticketing.css`.

### 4.7. Quy ước import sau khi di chuyển

Dùng alias `@/` đã cấu hình sẵn trong `client/vite.config.ts` và `client/tsconfig.app.json`:

```ts
import { ActionForm } from "@/components/ticketing/action-form";
import { useLoad } from "@/features/ticketing/data";
import api from "@/lib/api";
import { Explore } from "@/pages/public/Explore";
```

Không tạo file barrel `index.ts`. Không đổi các import không liên quan đến vị trí mới.

---

## 5. Quy tắc bắt buộc cho người thực hiện

### 5.1. Được phép

- Tạo thư mục/file mới.
- Di chuyển nguyên khối code từ file cũ sang file mới.
- Cập nhật đường dẫn import/export cho đúng vị trí mới.
- Thêm `export` cho hàm/type được chuyển sang file dùng chung (bắt buộc về mặt kỹ thuật).
- Xóa import không còn dùng ở file nguồn sau khi khối code đã rời đi.
- Xóa file nguồn khi không còn tham chiếu.
- Cập nhật **chỉ các dòng import** trong `App.tsx`.

### 5.2. Bị cấm

- Sửa JSX, text, `className`, cấu trúc DOM.
- Đổi tên component, hàm, biến, type, prop, route.
- Đổi logic, hook, state, điều kiện, API call, kiểu dữ liệu.
- Đổi route path, guard, quyền truy cập, key remount.
- Đổi CSS, token, layout, responsive.
- Format lại file hoặc sắp xếp lại code không liên quan.
- Thêm lazy-load, `Suspense`, `Outlet`, tách `AppLayout`.
- Sửa test hoặc thêm test.
- Sửa backend, mobile, database.

### 5.3. Quy tắc vàng

1. **Byte-identical:** nội dung khối được di chuyển phải giống hệt bản gốc, chỉ khác đường dẫn import và `export` bắt buộc.
2. **Không sửa cho “đẹp hơn”:** nếu thấy code xấu, ghi vào báo cáo, không sửa trong đợt này.
3. **Dừng khi bí:** nếu một khối không thể di chuyển mà không phải sửa logic, dừng lại và báo người review; không tự quyết định refactor.
4. **Một phase một commit:** mỗi phase (P0–P3) là một commit riêng để dễ revert.
5. **Kiểm tra sau mỗi phase:** lint + build phải xanh trước khi sang phase tiếp theo.

---

## 6. Thứ tự thực hiện

### P0 — Chuẩn bị và baseline

1. `git status --short` phải sạch (không có thay đổi dở dang).
2. Ghi lại `git rev-parse --short HEAD` vào báo cáo.
3. Tạo nhánh riêng, ví dụ `refactor/frontend-pages`.
4. Chạy và ghi kết quả baseline:
   - `npm run lint --prefix client`
   - `npm run build --prefix client`
   - `npm run test:ui --prefix client` (nếu môi trường cho phép)
5. Mở `client/src/App.tsx` và đối chiếu bảng route ở mục 1.3.

**Điều kiện qua P0:** baseline build/lint xanh hoặc mọi lỗi sẵn có được ghi lại rõ ràng.

### P1 — Tách component dùng chung

Thứ tự bắt buộc để tránh import gãy tạm thời:

1. Tạo `client/src/components/ticketing/`.
2. Cắt `ActionForm` (customer.tsx:47–89) sang `action-form.tsx`.
   - Import `useState`, `FormEvent`, `ReactNode`, `Notice`, `values`, `message`.
   - Cập nhật import `ActionForm` trong `customer.tsx`, `management.tsx`, `staff.tsx`, `scanner.tsx`.
3. Chuyển nguyên file `shared.tsx`, `event-visuals.tsx`, `scanner.tsx`, `wait-queue.tsx` sang `components/ticketing/`.
   - Cập nhật mọi import trỏ tới các file này.
   - `scanner.tsx` import `ActionForm` từ `./action-form`.
   - `action-form.tsx` chuyển import `Notice` sang `./shared`.
   - `event-visuals.tsx` chuyển import `./data`, `./types` sang `@/features/ticketing/...`.
   - `shared.tsx` chuyển import `./data` sang `@/features/ticketing/data`.
4. Tách `StatCards` + `statLabel` (management.tsx:49–94) sang `stat-cards.tsx`.
5. Tách `staff.tsx`:
   - `Assignment` + `status` + `labels` → `features/ticketing/staff-data.ts` (thêm `export`).
   - `StaffManagement` → `components/ticketing/staff-management.tsx`.
   - `Checkin` type + `CheckinHistory` → `components/ticketing/checkin-history.tsx`.
   - Cập nhật import trong `staff.tsx` và `management.tsx`.
6. Tách `NotificationLink` (notifications.tsx:13–52) sang `components/ticketing/notification-link.tsx`; cập nhật import trong `App.tsx`.
7. Tách `local`, `iso`, `eventTime` (management.tsx:40–48) sang `features/ticketing/dates.ts` (thêm `export`).
8. Chạy `rg` kiểm tra không còn import cũ; chạy lint + build.

**Điều kiện qua P1:** các file page tạm thời vẫn nằm trong `customer.tsx`/`management.tsx`/`staff.tsx`/`notifications.tsx`, nhưng đã dùng component từ vị trí mới; build/lint xanh.

### P2 — Tách page

1. Tạo các thư mục `pages/public`, `auth`, `booking`, `account`, `staff`, `organizer`, `admin`.
2. Lần lượt cắt từng page theo bảng mục 4:
   - `customer.tsx` → 8 page.
   - `management.tsx` → 4 page.
   - `staff.tsx` → 2 page.
   - `notifications.tsx` → 1 page.
3. Với mỗi page:
   - Chép khối nguyên văn.
   - Chép đúng các import mà khối cần từ phần đầu file nguồn.
   - Đổi đường dẫn import sang `@/...` hoặc đường dẫn tương đối mới.
   - Không đổi tên export.
4. Cập nhật **duy nhất các dòng import** trong `client/src/App.tsx` để trỏ tới file page mới.
5. Xóa `customer.tsx`, `management.tsx`, `staff.tsx`, `notifications.tsx` sau khi `rg` xác nhận không còn tham chiếu.
6. Chạy lint + build.

**Điều kiện qua P2:** không còn file page gộp; `App.tsx` chỉ khác bản gốc ở các dòng import; route table, `Guard`, layout giữ nguyên.

### P3 — Kiểm tra, đối chiếu và báo cáo

1. Review diff bằng `git diff --color-moved=dimmed-zebra` để xác nhận code chỉ bị di chuyển, không bị sửa.
2. Kiểm tra route parity theo Phụ lục A.
3. Chạy lại toàn bộ lệnh kiểm tra ở mục 9.
4. Smoke test thủ công các route theo Phụ lục A.
5. Kiểm tra kích thước file: mỗi page là file riêng; không còn file page > 300 dòng (trừ trường hợp cá biệt được ghi chú).
6. Điền mục 12 “Báo cáo hoàn thành”.
7. Commit cuối và bàn giao.

---

## 7. Tiêu chí thực hiện (checklist cho người làm)

### 7.1. Trước khi bắt đầu

- [x] Đã đọc hết tài liệu này.
- [x] `git status` sạch trước khi bắt đầu (ngoài tài liệu kế hoạch untracked). Chưa tạo nhánh riêng — xem 12.7.
- [x] Đã chạy baseline lint/build và ghi kết quả.
- [x] Đã xác nhận không có thay đổi dở dang khác tại thời điểm bắt đầu.

### 7.2. Trong khi thực hiện

- [x] Mỗi khối được cắt bằng đúng ranh giới `export function ...` / `function ...`.
- [x] Không tự ý sửa code khi di chuyển.
- [x] Mọi import mới đều trỏ đúng file.
- [x] Không tạo vòng import: `components/ticketing/*` không được import bất kỳ file nào trong `pages/*`.
- [x] Không để lại file nguồn rỗng hoặc file mồ côi.
- [x] Không sửa `route.ts`, `main.tsx`, `index.css`, `ticketing.css`.
- [x] `App.tsx` chỉ thay đổi các dòng import.

### 7.3. Sau mỗi phase

- [x] `npm run lint --prefix client` xanh.
- [x] `npm run build --prefix client` xanh.
- [x] `rg` không còn import trỏ tới đường dẫn cũ.
- [ ] Commit riêng cho phase với thông điệp rõ ràng — chưa commit, thay đổi đang ở working tree để review (xem 12.7).

### 7.4. Điều kiện dừng và báo cáo ngay

Dừng lại, không tự xử lý, nếu gặp một trong các trường hợp:

- Một khối code cần sửa logic mới tách được.
- Có import vòng giữa page và component.
- Route hoặc guard buộc phải đổi.
- Test hiện có thất bại vì lý do không liên quan đến đường dẫn import.
- Phát hiện file nguồn đã bị người khác sửa trong lúc thực hiện.

---

## 8. Tiêu chí đánh giá hoàn thành

Chỉ được coi là hoàn thành khi **tất cả** điều kiện sau đây đúng:

### 8.1. Cấu trúc

- [x] Đủ 15 file page tại đúng đường dẫn mục 3.
- [x] Đủ 9 file component tại `client/src/components/ticketing/`.
- [x] Có `features/ticketing/staff-data.ts` và `features/ticketing/dates.ts`.
- [x] Không còn `customer.tsx`, `management.tsx`, `staff.tsx`, `notifications.tsx` trong `features/ticketing/`.
- [x] `features/ticketing/` chỉ còn `data.ts`, `types.ts`, `payment.ts`, `wait-queue-data.ts`, `notifications-data.ts`, `staff-data.ts`, `dates.ts`, `ticketing.css`.

### 8.2. Không thay đổi code

- [x] `git diff --color-moved=dimmed-zebra` cho thấy các khối chỉ bị di chuyển, không bị sửa nội dung.
- [x] Không có thay đổi trong JSX, text, `className`, logic, hook, state, API call, type.
- [x] Không đổi tên component/export.
- [x] `App.tsx` chỉ khác bản gốc ở các dòng import.
- [x] `route.ts`, `main.tsx`, CSS, test không đổi.
- [x] `mobile/`, `server/`, `docs/database/` không đổi.

### 8.3. Chức năng

- [x] 18 route + route `*` hoạt động đúng như trước (route table byte-identical; xem 12.5–12.6).
- [x] Guard và quyền ORGANIZER/ADMIN giữ nguyên.
- [x] Các luồng chính chạy được: khám phá → chi tiết → checkout → vé; thông báo; check-in; admin (13 UI test mock pass). Auth/profile/organizer: đối chiếu route table + build, chưa smoke thủ công vì cần backend/DB.
- [x] Không có lỗi runtime trong 13 UI test mock.

### 8.4. Chất lượng kỹ thuật

- [x] `npm run lint --prefix client` thành công.
- [x] `npm run build --prefix client` thành công.
- [x] `npm run test:ui --prefix client` thành công khi dùng Chrome hệ thống (13/13 pass); bản Chromium bundled chưa tải được do CDN timeout (xem 12.7).
- [x] Không có import chết, import vòng, file mồ côi.
- [x] Không có file page nào còn gộp nhiều trang.

### 8.5. Báo cáo

- [x] Mục 12 đã được điền đầy đủ.
- [x] Có commit hash baseline; commit hoàn tất chưa tạo (working tree, xem 12.7).
- [x] Có kết quả lệnh kiểm tra thực tế.
- [x] Có xác nhận “không thay đổi code” kèm cách đã kiểm chứng.

---

## 9. Lệnh kiểm tra

Chạy tại thư mục gốc repo.

```powershell
# 1. Trạng thái và baseline
git status --short
git rev-parse --short HEAD

# 2. Tìm import còn trỏ tới file cũ
rg -n 'from "\./(customer|management|staff|notifications|scanner|shared|event-visuals|wait-queue)"' client/src

# 3. Lint và build
npm run lint --prefix client
npm run build --prefix client

# 4. UI test dùng API mock (không cần DB)
npm run test:ui --prefix client

# 5. Kiểm tra diff chỉ là di chuyển
git diff --stat -M
git diff --color-moved=dimmed-zebra -- client/src

# 6. Kiểm tra App.tsx chỉ đổi import
git diff -M -- client/src/App.tsx
```

Kỳ vọng:

- Lệnh 2 không trả kết quả sau P2.
- Lệnh 3 và 4 thành công.
- Lệnh 6 chỉ hiển thị các dòng `import ... from ...` bị thay đổi, không có thay đổi trong `Guard`, `<Routes>`, `<Route>`, header/footer.

---

## 10. Rủi ro và cách xử lý

| Rủi ro | Dấu hiệu | Cách xử lý |
| --- | --- | --- |
| Cắt sai ranh giới khối | Thiếu hàm/component, build lỗi | Xác định lại theo `export function`/`function`, không dựa hoàn toàn vào số dòng |
| Import vòng | Build/lint cảnh báo, runtime lỗi | Component không được import page; dữ liệu dùng chung đặt trong `features/ticketing/` |
| Sót import cũ | `rg` còn kết quả, build lỗi | Chạy `rg` sau từng phase |
| Unused import | `tsconfig` bật `noUnusedLocals` | Xóa import không còn dùng sau khi khối rời file; chỉ xóa import, không sửa code |
| Mất CSS | Giao diện mất style | `ticketing.css` vẫn được import trong `App.tsx`; không di chuyển dòng import này |
| Đổi hành vi remount | Trang thông báo/check-in giữ state cũ | Không sửa `key` trong `App.tsx`; giữ nguyên `key={user?.idUser}`, `key={location.pathname}` |
| Tên `status`/`labels` trùng | Lint/TS báo trùng | Giữ nguyên tên, export từ `staff-data.ts`; không đổi tên để tránh thay đổi code |
| Format làm nhiễu diff | Diff quá lớn | Không chạy Prettier trên file vừa di chuyển |
| File nguồn bị sửa đồng thời | Merge conflict | Dừng, đồng bộ với người sửa trước khi tiếp tục |

---

## 11. Ước lượng và bàn giao

| Hạng mục | Số lượng |
| --- | ---: |
| Page mới | 15 |
| Component mới/di chuyển | 9 |
| File dữ liệu/helper mới | 2 |
| File page nguồn bị xóa | 4 |
| File component chuyển vị trí | 4 |
| Route cần đối chiếu | 19 (18 route + `*`) |
| Ước lượng | 1–2 ngày làm việc, tùy kinh nghiệm |

Bàn giao theo từng commit P0 → P3. Mỗi commit phải kèm kết quả lint/build tương ứng.

---

## 12. Báo cáo hoàn thành (người thực hiện điền)

### 12.1. Thông tin chung

- Người thực hiện: opencode (AI)
- Ngày bắt đầu: 23/10/2026
- Ngày hoàn tất: 23/10/2026
- Nhánh: `Huy` (không tạo nhánh mới — xem 12.7)
- Commit baseline: `169849a`
- Commit hoàn tất: chưa commit; thay đổi đang ở working tree để review

### 12.2. Kết quả baseline

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npm run lint --prefix client` | Pass | Chạy trước khi sửa source |
| `npm run build --prefix client` | Pass sau `npm ci` | Lần đầu fail `TS2307: Cannot find module '@zxing/browser'` do `client/node_modules` thiếu; `npm ci --prefix client` thêm 430 packages; build 1981 modules, JS 792.83 kB |
| `npm run test:ui --prefix client` | Chưa chạy baseline | Chromium bundled chưa có trong máy; xem 12.7 |

### 12.3. Kết quả sau refactor

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npm run lint --prefix client` | Pass | Exit 0, không lỗi |
| `npm run build --prefix client` | Pass | `tsc -b && vite build`; 1999 modules; JS 792.83 kB; CSS 67.41 kB; 5.79s |
| `npm run test:ui --prefix client` | 13/13 pass | Chạy bằng Chrome hệ thống qua config tạm `channel: "chrome"` (22.6s). Lệnh gốc fail vì thiếu Chromium bundled; xem 12.7 |
| `rg` kiểm tra import cũ | Không kết quả | `rg -n 'from "\./(customer\|management\|staff\|notifications\|scanner\|shared\|event-visuals\|wait-queue)"' client/src` → `NO_OLD_RELATIVE_IMPORTS` |

### 12.4. Danh sách file đã tạo/di chuyển/xóa

| Loại | Đường dẫn | Ghi chú |
| --- | --- | --- |
| Page mới | `client/src/pages/public/Explore.tsx` | Từ `customer.tsx:90–203` |
| Page mới | `client/src/pages/public/EventDetail.tsx` | Từ `customer.tsx:204–367` |
| Page mới | `client/src/pages/auth/AuthPage.tsx` | Từ `customer.tsx:368–482` |
| Page mới | `client/src/pages/booking/Checkout.tsx` | Từ `customer.tsx:483–680` |
| Page mới | `client/src/pages/account/MyOrders.tsx` | Từ `customer.tsx:681–748` |
| Page mới | `client/src/pages/account/MyTickets.tsx` | Từ `customer.tsx:749–781` |
| Page mới | `client/src/pages/account/TicketPage.tsx` | Từ `customer.tsx:782–804` |
| Page mới | `client/src/pages/account/Profile.tsx` | Từ `customer.tsx:805–902` |
| Page mới | `client/src/pages/account/Notifications.tsx` | Từ `notifications.tsx:54–207` |
| Page mới | `client/src/pages/staff/StaffAssignments.tsx` | Từ `staff.tsx:126–216` |
| Page mới | `client/src/pages/staff/StaffCheckin.tsx` | Từ `staff.tsx:218–244` |
| Page mới | `client/src/pages/organizer/Organizer.tsx` | Từ `management.tsx:95–145` |
| Page mới | `client/src/pages/organizer/EditorPage.tsx` | Từ `management.tsx:146–459` (gồm `ExistingEditor`, `EditorForm`) |
| Page mới | `client/src/pages/organizer/Operations.tsx` | Từ `management.tsx:460–570` (gồm `OperationData`) |
| Page mới | `client/src/pages/admin/Admin.tsx` | Từ `management.tsx:571–885` (gồm `AdminData`) |
| Component mới | `client/src/components/ticketing/action-form.tsx` | Từ `customer.tsx:47–89` |
| Component mới | `client/src/components/ticketing/stat-cards.tsx` | Từ `management.tsx:49–94` (giữ `statLabel` private) |
| Component mới | `client/src/components/ticketing/staff-management.tsx` | Từ `staff.tsx:36–124` |
| Component mới | `client/src/components/ticketing/checkin-history.tsx` | Từ `staff.tsx:246–302` (giữ `Checkin` private) |
| Component mới | `client/src/components/ticketing/notification-link.tsx` | Từ `notifications.tsx:13–52` |
| Component di chuyển | `client/src/components/ticketing/scanner.tsx` | Nguyên file, chỉ đổi import |
| Component di chuyển | `client/src/components/ticketing/shared.tsx` | Nguyên file, chỉ đổi import |
| Component di chuyển | `client/src/components/ticketing/event-visuals.tsx` | Nguyên file, chỉ đổi import |
| Component di chuyển | `client/src/components/ticketing/wait-queue.tsx` | Nguyên file, chỉ đổi import |
| File dữ liệu mới | `client/src/features/ticketing/staff-data.ts` | `Assignment`, `status`, `labels`; thêm `export` |
| File dữ liệu mới | `client/src/features/ticketing/dates.ts` | `local`, `iso`, `eventTime`; thêm `export` |
| File đã xóa | `client/src/features/ticketing/customer.tsx` | Đã chuyển 9 khối |
| File đã xóa | `client/src/features/ticketing/management.tsx` | Đã chuyển 4 page + 2 file dùng chung |
| File đã xóa | `client/src/features/ticketing/staff.tsx` | Đã chuyển 2 page + 2 component + 1 file dữ liệu |
| File đã xóa | `client/src/features/ticketing/notifications.tsx` | Đã chuyển 1 page + 1 component |
| File đã xóa | `client/src/features/ticketing/scanner.tsx` | Đã chuyển sang `components/ticketing/` |
| File đã xóa | `client/src/features/ticketing/shared.tsx` | Đã chuyển sang `components/ticketing/` |
| File đã xóa | `client/src/features/ticketing/event-visuals.tsx` | Đã chuyển sang `components/ticketing/` |
| File đã xóa | `client/src/features/ticketing/wait-queue.tsx` | Đã chuyển sang `components/ticketing/` |

### 12.5. Đối chiếu route

- [x] Đã kiểm tra đủ 19 mục ở Phụ lục A.
- [x] Không route nào đổi path, component, guard hoặc key.

Cách đối chiếu: so khớp nguyên văn phần `App.tsx` từ `function Guard(` đến hết file với bản `HEAD` — giống hệt từng byte (sau chuẩn hóa CRLF). Phần import đầu file cũng giống hệt đến trước block import page. Vì vậy toàn bộ `<Routes>`, `<Route>`, `Guard`, `key`, layout không đổi. UI test mock đi qua `/`, `/events/dem-nhac`, `/checkout/order`, `/tickets/ticket`, `/admin/stats`, `/checkin`, `/checkin/events/show`, `/notifications`.

### 12.6. Xác nhận không thay đổi code

- Cách kiểm chứng đã dùng:
  1. Script so khớp từng khối với `git show HEAD:client/src/features/ticketing/...`: mọi khối page/component trùng khớp 100% (chuẩn hóa CRLF), xuất hiện đúng một lần trong file đích.
  2. Bốn file chuyển nguyên khối (`shared`, `event-visuals`, `scanner`, `wait-queue`) được so khớp toàn file sau khi thay import — chỉ khác các dòng import.
  3. `App.tsx`: phần từ `function Guard` đến EOF và phần import đầu file giống hệt bản `HEAD`.
  4. `git diff -M -- client/src/App.tsx` chỉ hiển thị thay đổi trong block import page/component.
- Kết luận: [x] Chỉ di chuyển khối code, không sửa nội dung.
- Sai lệch ngoài phạm vi di chuyển: không có. Các thay đổi bắt buộc:

| File | Sai lệch | Lý do bắt buộc | Người review xác nhận |
| --- | --- | --- | --- |
| `features/ticketing/staff-data.ts` | Thêm `export` cho `Assignment`, `status`, `labels` | Để page/component dùng chung |  |
| `features/ticketing/dates.ts` | Thêm `export` cho `local`, `iso`, `eventTime` | Để page dùng chung |  |
| `client/src/App.tsx` | Chỉ thay block import page/component | Trỏ tới file mới |  |
| Tất cả file mới | Đổi đường dẫn import sang `@/...` hoặc tương đối mới | Theo vị trí mới |  |

### 12.7. Vấn đề phát sinh

- `client/node_modules` thiếu `@zxing/browser` ở baseline; đã chạy `npm ci --prefix client` (430 packages) trước khi build baseline.
- `npm run test:ui --prefix client` không chạy được vì thiếu Chromium bundled (`chromium_headless_shell-1243`). Tải browser từ CDN Playwright timeout 5 lần. Đã chạy lại 13 test bằng config tạm kế thừa `playwright.ui.config.ts` và `channel: "chrome"` (Chrome hệ thống); 13/13 pass; đã xóa config tạm. Không sửa test hay config tracked.
- Chưa tạo nhánh `refactor/frontend-pages` và chưa commit phase nào; toàn bộ thay đổi đang ở working tree trên nhánh `Huy` để review. Baseline `169849a` vẫn là commit gần nhất.
- `client/src/pages/admin/Admin.tsx` (324 dòng) và `client/src/pages/organizer/EditorPage.tsx` (322 dòng) vượt mốc 300 dòng. Đây là hệ quả của việc giữ nguyên khối `AdminData`/`EditorForm`; không cắt nhỏ để tránh thay đổi code ngoài phạm vi.
- Chưa smoke thủ công toàn bộ 18 route cần backend/DB (auth, profile, organizer). Đã bù bằng đối chiếu route table byte-identical, build/lint và 13 UI test mock.

### 12.8. Ký xác nhận

- Người thực hiện: opencode (AI)
- Người review:
- Ngày review:

---

## Phụ lục A — Checklist route parity

Kết quả `[x]` = đã đối chiếu route table byte-identical với `HEAD`; route có UI test mock được ghi trong ngoặc. Không smoke thủ công toàn bộ vì cần backend/DB.

| # | Route | Component | Guard | Kết quả |
| ---: | --- | --- | --- | --- |
| 1 | `/` | `Explore` | Không | [x] (UI test) |
| 2 | `/events/:slug` | `EventDetail` | Không | [x] (UI test) |
| 3 | `/auth/login` | `AuthPage` | Không | [x] (route table) |
| 4 | `/auth/register` | `AuthPage` (`register`) | Không | [x] (route table) |
| 5 | `/auth/reset-password` | `AuthPage` (`reset`) | Không | [x] (route table) |
| 6 | `/checkout/:id` | `Checkout` | Đăng nhập | [x] (UI test) |
| 7 | `/orders` | `MyOrders` | Đăng nhập | [x] (route table) |
| 8 | `/tickets` | `MyTickets` | Đăng nhập | [x] (route table) |
| 9 | `/tickets/:id` | `TicketPage` | Đăng nhập | [x] (UI test) |
| 10 | `/profile` | `Profile` | Đăng nhập | [x] (route table) |
| 11 | `/notifications` | `Notifications` | Đăng nhập | [x] (UI test) |
| 12 | `/checkin` | `StaffAssignments` | Đăng nhập | [x] (UI test gián tiếp) |
| 13 | `/checkin/events/:id` | `StaffCheckin` | Đăng nhập | [x] (UI test) |
| 14 | `/organizer` | `Organizer` | `ORGANIZER`, `ADMIN` | [x] (route table) |
| 15 | `/organizer/new` | `EditorPage` | `ORGANIZER`, `ADMIN` | [x] (route table) |
| 16 | `/organizer/events/:id` | `EditorPage` | `ORGANIZER`, `ADMIN` | [x] (route table) |
| 17 | `/organizer/events/:id/:tab` | `Operations` | `ORGANIZER`, `ADMIN` | [x] (route table) |
| 18 | `/admin/:tab` | `Admin` | `ADMIN` | [x] (UI test `/admin/stats`) |
| 19 | `*` | Khối “Không tìm thấy trang” | Không | [x] (route table) |

## Phụ lục B — Checklist file sau refactor

### Pages

- [x] `client/src/pages/public/Explore.tsx`
- [x] `client/src/pages/public/EventDetail.tsx`
- [x] `client/src/pages/auth/AuthPage.tsx`
- [x] `client/src/pages/booking/Checkout.tsx`
- [x] `client/src/pages/account/MyOrders.tsx`
- [x] `client/src/pages/account/MyTickets.tsx`
- [x] `client/src/pages/account/TicketPage.tsx`
- [x] `client/src/pages/account/Profile.tsx`
- [x] `client/src/pages/account/Notifications.tsx`
- [x] `client/src/pages/staff/StaffAssignments.tsx`
- [x] `client/src/pages/staff/StaffCheckin.tsx`
- [x] `client/src/pages/organizer/Organizer.tsx`
- [x] `client/src/pages/organizer/EditorPage.tsx`
- [x] `client/src/pages/organizer/Operations.tsx`
- [x] `client/src/pages/admin/Admin.tsx`

### Components

- [x] `client/src/components/ticketing/action-form.tsx`
- [x] `client/src/components/ticketing/stat-cards.tsx`
- [x] `client/src/components/ticketing/staff-management.tsx`
- [x] `client/src/components/ticketing/checkin-history.tsx`
- [x] `client/src/components/ticketing/notification-link.tsx`
- [x] `client/src/components/ticketing/scanner.tsx`
- [x] `client/src/components/ticketing/shared.tsx`
- [x] `client/src/components/ticketing/event-visuals.tsx`
- [x] `client/src/components/ticketing/wait-queue.tsx`

### Data/helper

- [x] `client/src/features/ticketing/staff-data.ts`
- [x] `client/src/features/ticketing/dates.ts`

### Đã xóa khỏi vị trí cũ

- [x] `client/src/features/ticketing/customer.tsx`
- [x] `client/src/features/ticketing/management.tsx`
- [x] `client/src/features/ticketing/staff.tsx`
- [x] `client/src/features/ticketing/notifications.tsx`
- [x] `client/src/features/ticketing/scanner.tsx`
- [x] `client/src/features/ticketing/shared.tsx`
- [x] `client/src/features/ticketing/event-visuals.tsx`
- [x] `client/src/features/ticketing/wait-queue.tsx`

### Không đổi

- [x] `client/src/App.tsx` chỉ đổi import
- [x] `client/src/route.ts`
- [x] `client/src/main.tsx`
- [x] `client/src/features/ticketing/ticketing.css`
- [x] `client/src/index.css`
- [x] `client/tests/`
- [x] `mobile/`
- [x] `server/`
