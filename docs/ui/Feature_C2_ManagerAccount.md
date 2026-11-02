# Feature C2 — Quản lý tài khoản khách hàng

## 0. Thông tin phiên & trạng thái

| Mục | Giá trị |
|---|---|
| Màn hình | **C2 — Quản lý khách hàng** (Stitch: “C2. Quản lý khách hàng - Cosmic Ticket Quản Trị Viên”) |
| Route đích | `/admin/users` (giữ nguyên route hiện có, route thật trong `client/src/App.tsx`) |
| Stitch project | `10374042969343935993` |
| Stitch screen ID | `c1ed0c8be6404a3aa9193a0e9365cc85` |
| Thiết bị / kích thước | `DESKTOP`, `2560 × 3104` |
| HTML artifact | `projects/10374042969343935993/files/7650597168407413277` — tải thành công, 57.610 ký tự |
| Ảnh artifact | `projects/10374042969343935993/files/6422513724812820818` — JPEG `1920 × 2350`, đã xem trực tiếp |
| Ngày review | **2026-11-02 08:33:39 UTC+07** (review gốc); **2026-11-02 09:06:09 UTC+07** (chốt phạm vi); **2026-11-02 10:32:53 UTC+07** (triển khai source); **2026-11-02 11:00:22 UTC+07** (tách admin shell) |
| Loại phiên | Review và kiểm thử API ban đầu; sau đó chốt phạm vi; phiên hiện tại triển khai source frontend/backend. Không sửa artifact Stitch, không tạo màn hình Stitch mới. |
| Report review gốc | [`docs/reports/stitch/C2_20261102_083339_review_plan.md`](../reports/stitch/C2_20261102_083339_review_plan.md) |
| Report chốt phạm vi API | [`docs/reports/stitch/C2_20261102_090609_api_scope.md`](../reports/stitch/C2_20261102_090609_api_scope.md) |
| Phạm vi API bổ sung | Đúng 8 nhóm: phân trang `total/totalPages`, lọc `status`/`role`, counts khách hàng, field `phone`/`emailVerified`/`roles`/`lock_reason`, chi tiết user, batch lock, CSV export, tổng đơn/chi tiêu. **Chỉ khách hàng (role `USER`)**; loại ADMIN/ORGANIZER. |

Trạng thái hiện tại: source frontend/backend C2 đã triển khai; build/lint đạt. Stitch được giữ nguyên. API runtime và browser chưa xác minh; rollout/tích hợp runtime **BLOCKED** do chưa có PostgreSQL test an toàn. Phạm vi API cần phát triển đã được chốt tại **mục 8**: chỉ 8 nhóm phục vụ C2, trang chỉ quản lý **khách hàng** (role `USER`), không hiển thị ADMIN/ORGANIZER. Các chức năng ngoài danh sách đó (KYC, tier, tạo user, resend, reset, mã `#CUST`, audit read) được xác định **NGOÀI PHẠM VI** và phải ẩn khỏi UI.

---

| Report triển khai source | [`docs/reports/stitch/C2_20261102_103253_implementation.md`](../reports/stitch/C2_20261102_103253_implementation.md) |
| Report tách admin shell | [`docs/reports/stitch/C2_20261102_110022_reusable_admin_shell.md`](../reports/stitch/C2_20261102_110022_reusable_admin_shell.md) |

## 1. Mục tiêu & phạm vi

### 1.1. Mục tiêu

Tái hiện đúng giao diện C2 đã có trên Stitch bằng React + CSS hiện có của EventHub, sau đó mới nối API thật. Kế hoạch ưu tiên:

1. Tách `AdminSidebar`, `AdminHeader`, `AdminShell` thành component dùng lại; C2 dùng shell theo thiết kế Stitch, các màn khác có thể chuyển sang shell này theo từng task.
2. Dựng lại bố cục C2 theo artifact: hero, 4 KPI, thanh lệnh (tab trạng thái + hành động), bộ lọc, bảng khách hàng, phân trang, chi tiết user, modal xác nhận batch lock, toast.
3. Chỉ hiển thị dữ liệu/field mà backend thật cung cấp; field chưa có API phải ẩn hoặc ghi rõ `BLOCKED`, không hard-code dữ liệu giả.
4. Giữ nguyên artifact Stitch; không gọi `edit_screens`, không generate lại màn hình.

### 1.2. Trong phạm vi

- Triển khai C2 frontend và 8 nhóm API backend theo mục 6/8.
- Kiểm tra build, lint, module ownership và test suite; kiểm thử HTTP trên PostgreSQL cô lập còn chờ môi trường test.
- Report phiên + cập nhật Master Plan cho riêng C2.

### 1.3. Ngoài phạm vi

- Không sửa schema/migration hoặc database.
- Không sửa C1, C3–C12 hay bất kỳ artifact Stitch nào.
- Không triển khai C3 riêng; chi tiết user thuộc C2 qua panel/modal chỉ đọc.
- Không tạo dữ liệu mẫu, không mock API, không tuyên bố đã tích hợp khi API chưa đáp ứng.

---

## 2. Nguồn thiết kế Stitch & design system

### 2.1. Cách lấy nguồn

| Bước | Công cụ | Kết quả thực tế |
|---|---|---|
| Xác minh project | `get_project` | `EventHub`, 45 `screenInstances` |
| Xác minh màn hình | `get_screen` | ID `c1ed0c8be6404a3aa9193a0e9365cc85`, DESKTOP, `2560 × 3104` |
| Tải HTML | `download_file` | 57.610 ký tự HTML |
| Tải ảnh | `download_file` | JPEG 1920 × 2350, đã xem để đối chiếu bố cục |

Không gọi `edit_screens`/`generate_screen_from_text`/apply design system. Stitch được xem là **read-only** trong phiên này.

### 2.2. Token thực tế trong artifact

Artifact dùng Tailwind config riêng. Các giá trị thực tế đọc được từ HTML:

| Vai trò | Giá trị trong artifact |
|---|---|
| Nền trang | `#0f1222` (`surface`, `background`) |
| Bề mặt thấp (sidebar/card) | `#181b2a` (`surface-container-low`) |
| Bề mặt card | `#1c1f2f` (`surface-container`) |
| Bề mặt cao | `#262939` (`surface-container-high`) |
| Nền sâu nhất | `#0a0d1c` (`surface-container-lowest`) |
| Tím nhấn | `#7c3aed` (`primary-container`) |
| Cyan nhấn | `#5de6ff` (`secondary`) |
| Cyan đậm | `#00cbe6` (`secondary-container`) |
| Hồng nhấn | `#ffafd3` (`tertiary`) |
| Hồng đậm | `#ae397b` (`tertiary-container`) |
| Chữ chính | `#e0e1f7` (`on-surface`) |
| Chữ phụ | `#ccc3d8` (`on-surface-variant`) |
| Chữ mờ | `#958da1` (`outline`) |
| Viền | `#4a4455` (`outline-variant`) |
| Lỗi | `#ffb4ab` (`error`) |
| Nền lỗi | `#93000a` (`error-container`) |

**Sai lệch cần ghi nhận:** skill ghi token chuẩn `#080B1A` / `#10162B`; artifact C2 thực tế dùng `#0f1222` / `#181b2a`. Khi triển khai, **ưu tiên artifact C2** vì đây là màn đã được duyệt, đồng thời tái sử dụng token đang dùng ở `organizer.css` / `qr-scan.css` để không tạo thêm hệ màu thứ ba. Ghi chú sai lệch này trong report và không tự đổi thiết kế Stitch.

### 2.3. Typography

| Vai trò | Font / cỡ |
|---|---|
| Tiêu đề màn (h1) | Syne, 32px / 40px, 700 |
| Số KPI lớn | Syne, 40px / 48px, 700 |
| Tên khách hàng | Syne, 16px, 600 |
| Nội dung | Be Vietnam Pro, 14–16px |
| Nhãn, mã, breadcrumb | Space Grotesk, 11–14px, letter-spacing 0.04–0.06em |
| Mã khách hàng / tiền | Space Grotesk + `font-mono` |

### 2.4. Bố cục artifact

```
┌─────────────┬──────────────────────────────────────────────┐
│ Sidebar     │ Header fixed (80px)                          │
│ 288px       ├──────────────────────────────────────────────┤
│ fixed       │ Hero: pill C2 / ID / h1 / mô tả / telemetry  │
│             │ 4 KPI cards (grid 4 cột)                     │
│             │ Command center: tab trạng thái + 3 CTA       │
│             │   search + 3 filter + reset                  │
│             │ Table: chọn tất cả + 8 cột + action buttons  │
│             │ Pagination: 1–5 / 148.520 + rows/page        │
│             │ 3 footer strips (KYC / Anti-Scalp / VIP)     │
│ Footer card │ Modal xác nhận khóa/mở khóa + toast          │
└─────────────┴──────────────────────────────────────────────┘
```

Chi tiết cố định:

- Sidebar `width: 288px`, `position: fixed`, `left: 0`, `top: 0`, `height: 100%`, có logo EventHub + nhãn `SUPER CONTROL`, 4 nhóm menu, card trạng thái server.
- Header `height: 80px`, `position: fixed`, `left: 288px`, `right: 0`, breadcrumb `SYSTEM ROOT / SUPER ADMIN`, ô search toàn cục, trạng thái `Online 99.98%`, chuông, terminal, khối danh tính admin.
- Main `padding-top: 80px`, `padding-left: 288px`, padding ngang 24px.

### 2.5. Nội dung artifact gốc (tham khảo lịch sử)

| Khối | Nội dung |
|---|---|
| Hero | Pill `Module Phân Hệ Quản Trị C2`, `ID: EVENTHUB-ACC-ROOT`; h1 `Quản Lý Tài Khoản Khách Hàng`; mô tả “Quản trị danh sách người dùng mua vé, trạng thái xác thực KYC, bảo mật và phân quyền toàn sàn.” |
| Telemetry | `Sync Token Matrix` / `REALTIME SECURE`; `Phiên Kiểm Tra` / `v4.8 • Tier 1 Hub` |
| KPI 1 | Tổng khách hàng — `148.520` — “Tài khoản kích hoạt tổng hệ thống” |
| KPI 2 | Đang hoạt động — `142.100` — `95.7%` — “Sẵn sàng giao dịch & check-in QR” |
| KPI 3 | Chưa kích hoạt / mới — `4.820` — “Chờ xác minh SMS OTP / Email link” |
| KPI 4 | Bị khóa / tạm dừng — `1.600` — “Vi phạm chính sách / Nghi vấn gian lận” |
| Tab trạng thái | Tất cả, Đang hoạt động, Không hoạt động, Bị khóa (kèm số) |
| CTA | Xuất CSV / Excel; Khóa hàng loạt; Thêm người dùng mới |
| Search | “Nhập tên, email, SĐT hoặc mã khách hàng (VD: #CUST-9921)...” |
| Filter | Cấp độ (VIP Galaxy Patron / VIP Cosmic Explorer / Thân thiết / Mới); Trạng thái KYC (đã xác minh / chưa / bị từ chối); Theo ngày tham gia; nút reset |
| Bảng | `#`, `Mã & Khách Hàng`, `Email & SĐT`, `Ngày Đăng Ký`, `Tổng Đơn / Chi Tiêu`, `Cấp Độ & KYC`, `Trạng Thái`, `Thao Tác` |
| Dòng mẫu | Avatar chữ cái + chấm online; mã `#CUST-8841`; badge cấp độ; KYC; badge trạng thái; lý do khóa; nút xem/khóa/mở khóa/gửi lại mã/… |
| Chọn dòng | Checkbox master “Chọn toàn bộ hiển thị (5 / 148.520)”; ghi chú “mã hóa lượng tử AES-256” |
| Pagination | “Hiển thị 1 – 5 trên tổng số 148.520 khách hàng”; rows/page 5/10/25/50; first/prev/1/2/3/…/29704/next/last |
| Footer strips | `KYC Verification Gate`; `EventHub Shield Anti-Scalp`; `Hỗ trợ khách hàng VIP` |
| Modal | Icon khóa/mở khóa; cảnh báo; tài khoản; mã định danh; người thực thi; ô “Lý do điều chỉnh (ghi vào Audit Log)”; Hủy / Xác nhận |
| Toast | Góc dưới phải, icon + thông điệp, tự ẩn ~3,2 giây |

Các số liệu và tên riêng trong artifact là **dữ liệu minh hoạ của thiết kế**, không phải dữ liệu thật và không được hard-code khi triển khai.

---

## 3. Đối chiếu thiết kế với yêu cầu C2

Master Plan chỉ ghi C2 là “Quản lý khách hàng” với route `/admin/users`, chưa có đặc tả field. Vì vậy tiêu chí dưới đây lấy từ artifact + nghiệp vụ hiện có:

| # | Tiêu chí | Hiện trạng thiết kế | Kết luận |
|---|---|---|---|
| 1 | Danh sách khách hàng có định danh, email, SĐT, ngày tham gia | Có đủ cột | PASS (thiết kế) |
| 2 | Tìm kiếm theo tên/email/SĐT/mã khách | Có ô search toàn cục + search trong trang | PARTIAL — backend chỉ tìm tên/email |
| 3 | Lọc theo trạng thái | 4 tab + badge trạng thái | PASS (thiết kế), thiếu API lọc |
| 4 | Lọc theo cấp độ thành viên | Có | FAIL — schema/backend không có khái niệm cấp độ |
| 5 | Lọc/siển thị KYC | Có | FAIL — schema/backend không có KYC |
| 6 | Tổng đơn & chi tiêu mỗi khách | Có | FAIL — API danh sách không trả dữ liệu đơn/chi tiêu |
| 7 | Khóa / mở khóa tài khoản có lý do | Có modal + reason | PARTIAL — API PATCH có, nhưng UI hiện tại dùng form; chưa có modal |
| 8 | Khóa hàng loạt | Có CTA | FAIL — không có API batch |
| 9 | Xuất CSV/Excel | Có CTA | FAIL — không có API export |
| 10 | Thêm người dùng mới | Có CTA | FAIL — không có API admin tạo user |
| 11 | Gửi lại mã kích hoạt | Có CTA trên dòng | FAIL — không có API resend verification |
| 12 | Xem chi tiết hồ sơ | Có nút visibility | FAIL — không có `GET /admin/users/:id`; C3 chưa có route riêng |
| 13 | Reset mật khẩu / bảo mật | Có nút key | FAIL — không có API admin reset |
| 14 | Phân trang theo tổng thật | Có số trang | FAIL — API không trả `total/totalPages` |
| 15 | Audit log hiển thị lý do | Modal ghi “Audit Log” | PARTIAL — backend ghi audit nhưng không có API đọc |
| 16 | Trạng thái loading/empty/error | Chỉ là ảnh tĩnh | NOT_VERIFIED — phải bổ sung khi code |
| 17 | Responsive | Chỉ có ảnh desktop | NOT_VERIFIED — chưa có bằng chứng mobile/tablet |
| 18 | Accessibility | Không có bằng chứng | NOT_VERIFIED |

Kết luận mục 3: thiết kế **vượt** dữ liệu backend hiện có ở 8 nhóm chức năng (cấp độ, KYC, chi tiêu, batch, CSV, tạo user, resend, reset) và **thiếu bằng chứng** cho 3 tiêu chí phi thị giác.

---

## 4. Đối chiếu thiết kế với code hiện tại

Nguồn code đã đọc:

- `client/src/App.tsx`: route `/admin/:tab` → `<Guard roles={["ADMIN"]}><Admin /></Guard>`.
- `client/src/pages/admin/Admin.tsx` (325 dòng): một trang tab chung, tab `users` render **danh sách panel dọc**, mỗi user một `<section className="panel review-card">` chứa `ActionForm`.
- `client/src/components/ticketing/shared.tsx`: `PageHead`, `Status`, `Pager`, `Empty`, `Loading`.
- `client/src/features/ticketing/types.ts`: `Account { idUser, name, email, status, locked_at? }`.
- `server/src/app.ts` dòng 1172–1206: guard `/admin` + `GET /admin/users` + `PATCH /admin/users/:id`.
- `server/src/modules/auth/public.ts` dòng 294–304: `users()` và `status()`.
- `server/src/modules/auth/infrastructure/store.ts` dòng 83–92: câu SQL danh sách/cập nhật.

### 4.1. Gap giao diện

| Thành phần Stitch | Code hiện tại | Mức độ |
|---|---|---|
| Sidebar quản trị 288px, 4 nhóm menu | Không có; dùng `site-header` toàn cục | **Thiếu hoàn toàn** |
| Header quản trị cao 80px, breadcrumb, search toàn cục, danh tính admin | Không có; `site-header` chung | **Thiếu hoàn toàn** |
| Hero C2 + pill module + telemetry | `PageHead eyebrow="QUẢN TRỊ HỆ THỐNG" title="Trung tâm quản trị"` | Khác nội dung/bố cục |
| 4 KPI | Không có | **Thiếu** |
| Tab trạng thái có số lượng | `nav.tabs` dạng text, không số, không lọc | Khác |
| CTA Xuất CSV / Khóa hàng loạt / Thêm user | Không có | **Thiếu** |
| Search + filter cấp độ/KYC/ngày | Chỉ có `Pager` + reload; không filter | **Thiếu** |
| Bảng 8 cột | Danh sách panel dọc, mỗi user 1 form | **Khác hoàn toàn** |
| Avatar chữ cái, mã khách, badge cấp/KYC/trạng thái | Chỉ `Status value` đơn giản | **Thiếu** |
| Modal xác nhận khóa/mở khóa + lý do | Không có; form luôn hiển thị trong panel | **Thiếu** |
| Toast | Không có; lỗi đổ vào `setError` | **Thiếu** |
| Phân trang theo tổng, rows/page | `Pager` với `hasNext = data.length === 50` | **Sai hợp đồng** |
| Dải footer audit | Không có | **Thiếu** |
| Responsive/mobile menu | Không có | **Thiếu** |
| Design token Cosmic Graffiti | Dùng `ticketing.css` token riêng | **Chưa đồng bộ** |

### 4.2. Điểm có thể tái sử dụng ngay

- `Guard roles={["ADMIN"]}` đã đúng quyền.
- `api` client (`@/lib/api`) đã gắn access token + refresh; dùng lại, không tạo axios instance mới.
- `message()` trong `features/ticketing/data.ts` để chuẩn hoá lỗi.
- `NotificationLink` cho chuông thông báo.
- Pattern “TSX + CSS cùng một file” đã dùng ở `B8` (`AttendeeManagerPage.tsx`): `const styles = \`...\`;` + `<style>{styles}</style>`.
- `OrganizerSidebar` / `OrganizerHeader` là tham chiếu cấu trúc, **không sửa** và không tái dùng trực tiếp vì menu/nhãn khác khu vực.

### 4.3. Kết luận gap

Code hiện tại chỉ là **CRUD tối thiểu** (xem danh sách + đổi status/locked). Để đạt C2 cần **viết lại trang** theo artifact, không phải chỉnh CSS. Khối lượng chính là UI + hợp đồng API, không phải logic phức tạp.

---

## 5. Kiểm thử API backend

### 5.1. Môi trường & phương pháp

| Mục | Giá trị |
|---|---|
| Thời điểm | 2026-11-02, khoảng 08:24–08:31 UTC+07 |
| API runtime | `http://localhost:8000/api` (container `pbl6-api-1`, healthy; `pbl6-worker-1` up) |
| Tài khoản | `admin@example.test` / `LocalDemo2026!`; đối chứng `customer@example.test` |
| Phương thức | HTTP thật bằng `Invoke-WebRequest`/`Invoke-RestMethod`, không mock |
| Dữ liệu | DB dev hiện có 14 user; test mutation trên user test `L5 acceptance buyer`, sau đó **khôi phục nguyên trạng** |

### 5.2. Bảng kết quả

| # | Method / đường dẫn | Payload / query | Status | Kết quả thực tế |
|---|---|---|---|---|
| 1 | `POST /api/auth/login` | `{email:"admin@example.test",password:"LocalDemo2026!"}` | **200** | Trả `accessToken`, user `roles:["USER","ADMIN"]` |
| 2 | `GET /api/admin/users` | — | **200** | Mảng **14** user; field `idUser,name,email,status,locked_at,createdAt`; gồm cả ADMIN/ORGANIZER |
| 3 | `GET /api/admin/users?q=org&page=0` | `q=org` | **200** | 4 user khớp tên/email |
| 4 | `GET /api/admin/users?page=1` | `page=1` | **200** | `data: []` (offset 50; không có `total`) |
| 5 | `GET /api/admin/stats` | — | **200** | `{orders:"13",revenue:"695000",sold:"13",checkins:"4",provider_received:"695000",needs_review:"11",events:"22",users:"14",organizers:"5"}` |
| 6 | `PATCH /api/admin/users/:id` | `{status:"INACTIVE",locked:true,reason:"C2 API test - lock"}` | **200** | `data:null`; GET lại thấy `status:"INACTIVE"`, `locked_at` có giá trị |
| 7 | `PATCH /api/admin/users/:id` | `{status:"ACTIVE",locked:false,reason:"C2 API test - restore"}` | **200** | Khôi phục `ACTIVE`, `locked_at:null` |
| 8 | `PATCH /api/admin/users/:id` | `{status:"BANNED"}` | **400** | Zod enum từ chối |
| 9 | `GET /api/admin/users/:id` | — | **404** | Không có route chi tiết |
| 10 | `GET /api/admin/users` với token CUSTOMER | — | **403** | Guard role ADMIN hoạt động |
| 11 | `GET /api/admin/users` không token | — | **401** | `protect` hoạt động |
| 12 | `PATCH /api/admin/users/:id` | `{status:"ACTIVE",locked:true,reason:"C2 consistency test"}` | **200** | `ACTIVE` nhưng `locked_at` vẫn được set (API không chặn tổ hợp không nhất quán) |
| 13 | `PATCH /api/admin/users/:id` (id của chính admin) | `{status:"INACTIVE",locked:true,reason:"..."}` | **400** | `SELF_LOCK` — không thể tự khóa |

### 5.3. Response mẫu (rút gọn, nguyên văn field)

```json
{
  "success": true,
  "data": [
    {
      "idUser": "95208a2f-41f3-48f6-b2a7-0e880fb68f5b",
      "name": "L5 acceptance buyer",
      "email": "l5-0d814fb6-3267-4e6a-923b-14a6ed27f6c9-buyer@example.test",
      "status": "ACTIVE",
      "locked_at": null,
      "createdAt": "2026-10-29T18:02:49.679Z"
    }
  ]
}
```

```json
{
  "success": true,
  "data": {
    "orders": "13",
    "revenue": "695000",
    "sold": "13",
    "checkins": "4",
    "provider_received": "695000",
    "needs_review": "11",
    "events": "22",
    "users": "14",
    "organizers": "5"
  }
}
```

### 5.4. Hợp đồng hiện tại (đã xác minh)

`GET /api/admin/users?q=<string>&page=<int>`

- Guard: `protect` + role `ADMIN` (401/403 đã kiểm).
- `q`: tìm `name ILIKE %q%` **hoặc** `email ILIKE %q%`; không tìm phone.
- `page`: offset = `page * 50`; **cố định 50 dòng/trang**, không có `limit`.
- Sort: `createdAt DESC, idUser`.
- Response: `{ success: true, data: Account[] }`; **không có** `pagination`, `total`, `totalPages`, `hasNext`.
- `Account`: `{ idUser, name, email, status, locked_at, createdAt }`.
- Không trả `phone`, `emailVerified`, `roles`, `order_count`, `total_spend`, `lock_reason`, `avatarUrl`.

`PATCH /api/admin/users/:id`

- Body bắt buộc đủ 3 field: `status` (`ACTIVE|INACTIVE`), `locked` (boolean), `reason` (string ≤ 2000).
- Chạy trong `uow.run`, ghi audit `user.status`.
- Response `{ success: true, data: null }`.
- Không kiểm tra `status` và `locked` có nhất quán không: đã kiểm thử `ACTIVE` + `locked:true` trả 200 và set `locked_at`.
- Có chặn tự khóa: id trùng admin hiện tại trả **400 `SELF_LOCK`** (đã kiểm thử).
- Khi `status=INACTIVE` hoặc `locked=true`, backend gọi `revokeAll(id)` — thu hồi toàn bộ phiên đăng nhập của user đó.
- Không trả lại bản ghi sau cập nhật; client phải GET lại.

`GET /api/admin/stats`

- Chỉ số toàn hệ thống, **dạng chuỗi**, gồm `users` và `organizers`; không tách khách hàng theo ACTIVE/INACTIVE/locked.
- Không có `customers`, `active_customers`, `locked_customers`.

### 5.5. Kết luận API

- API **đang chạy thật**, quyền đúng, mutation hoạt động và có audit nội bộ.
- Nhưng hợp đồng **không đủ** cho giao diện C2: thiếu phân trang thật, thiếu field hiển thị, thiếu lọc, thiếu các thao tác phụ.
- Không có bằng chứng nào cho KYC, cấp độ thành viên, chi tiêu, mã khách hàng, email verification resend.

---

## 6. Phạm vi đã chốt

Chỉ hiển thị khách hàng có role USER và không có ADMIN/ORGANIZER, kể cả tài khoản nhiều role. Người truy cập trang vẫn phải có quyền ADMIN. C2 cố định role=USER, không có tab quản lý admin/organizer.

Chỉ bổ sung 8 nhóm API: phân trang total/totalPages; lọc status/role; counts khách hàng; phone/emailVerified/roles/lock_reason; chi tiết user; batch lock; CSV export; tổng đơn/chi tiêu.

Giữ tìm tên/email hiện có. Loại khỏi C2: KYC, cấp độ/VIP, tạo user, resend verification, reset mật khẩu, sửa hồ sơ/phân quyền, mã #CUST, audit read, lịch sử đơn chi tiết, lọc ngày, sort tùy chọn, Excel, telemetry, khóa/mở khóa đơn lẻ và batch unlock. Không giữ nút disabled hoặc lập task API cho chức năng bị loại. Batch lock là thao tác thay đổi dữ liệu duy nhất được giữ theo yêu cầu.

Bảng hiển thị định danh thật, tên/email/phone, ngày đăng ký, emailVerified, roles chỉ đọc, status/lock_reason, tổng đơn/chi tiêu; có xem chi tiết chỉ đọc, chọn dòng, CSV, batch lock, phân trang và 4 counts tổng/active/inactive/locked.

Mục 2–5 là bằng chứng review gốc; yêu cầu triển khai và nghiệm thu phải theo mục 6, 8, 10. Không coi các chức năng đã bỏ là blocker. Artifact Stitch chưa thay đổi.

---

## 7. Kiến trúc component & kế hoạch tái sử dụng

### 7.1. Cây file đề xuất

```
client/src/pages/admin/
├── AdminShell.tsx          # layout + sidebar + header dùng chung C1–C12
├── AdminSidebar.tsx        # sidebar 288px (TSX + CSS cùng file)
├── AdminHeader.tsx         # header 80px (TSX + CSS cùng file)
├── Admin.tsx               # giữ nguyên route, render shell + tab
└── C2ManagerAccount.tsx    # nội dung C2 (TSX + CSS cùng file)

client/src/components/admin/
├── admin-ui.tsx            # Badge, Avatar, KpiCard, Toolbar, EmptyState
├── admin-table.tsx         # bảng + selection + responsive card mode
├── admin-pagination.tsx    # phân trang theo total/totalPages
├── admin-confirm-modal.tsx # modal khóa/mở khóa + reason
└── admin-toast.tsx         # toast
```

Quy ước: mỗi file **gộp CSS vào cùng file TSX** bằng `const styles = \`...\`` và `<style>{styles}</style>` như B8. Không tạo file `.css` riêng cho C2. CSS phải scope dưới `.c2-page` / `.admin-shell` để không ảnh hưởng màn khác.

### 7.2. `AdminSidebar.tsx` — TSX + CSS cùng file (dòng theo dòng)

```tsx
// 1
import { Link, useLocation } from "react-router-dom";
// 2
// 3
const groups = [
// 4
  {
// 5
    label: "TỔNG QUAN",
// 6
    items: [{ label: "Dashboard Quản trị", icon: "grid_view", to: "/admin/stats" }],
// 7
  },
// 8
  {
// 9
    label: "QUẢN LÝ TÀI KHOẢN",
// 10
    items: [
// 11
      { label: "Khách hàng", icon: "group", to: "/admin/users" },
// 12
      { label: "Ban tổ chức", icon: "corporate_fare", to: "/admin/organizers" },
// 13
      { label: "Hồ sơ đăng ký BTC", icon: "assignment_ind", to: "/admin/applications" },
// 14
    ],
// 15
  },
// 16
  {
// 17
    label: "SỰ KIỆN & KIỂM DUYỆT",
// 18
    items: [
// 19
      { label: "Danh mục sự kiện", icon: "category", to: "/admin/categories" },
// 20
      { label: "Toàn bộ sự kiện", icon: "confirmation_number", to: "/admin/events" },
// 21
      { label: "Hàng đợi duyệt sự kiện", icon: "pending_actions", to: "/admin/queue" },
// 22
    ],
// 23
  },
// 24
  {
// 25
    label: "TÀI CHÍNH & VẬN HÀNH",
// 26
    items: [
// 27
      { label: "Quản lý giao dịch", icon: "payments", to: "/admin/payments" },
// 28
      { label: "Cấu hình hệ thống", icon: "tune", to: "/admin/settings" },
// 29
    ],
// 30
  },
// 31
];
// 32
// 33
export function AdminSidebar({
// 34
  open = false,
// 35
  onNavigate,
// 36
}: {
// 37
  open?: boolean;
// 38
  onNavigate?: () => void;
// 39
}) {
// 40
  const { pathname } = useLocation();
// 41
  return (
// 42
    <aside className={`admin-sidebar${open ? " is-open" : ""}`} aria-label="Điều hướng quản trị">
// 43
      <div className="admin-brand">
// 44
        <span className="admin-brand-mark" aria-hidden="true">▮</span>
// 45
        <span className="admin-brand-name">EVENT<span>HUB</span></span>
// 46
        <span className="admin-brand-tag">SUPER CONTROL</span>
// 47
      </div>
// 48
      <nav className="admin-nav">
// 49
        {groups.map((group) => (
// 50
          <div className="admin-nav-group" key={group.label}>
// 51
            <p className="admin-nav-label">{group.label}</p>
// 52
            {group.items.map((item) => {
// 53
              const active = pathname === item.to;
// 54
              return (
// 55
                <Link
// 56
                  key={item.to}
// 57
                  to={item.to}
// 58
                  className={`admin-nav-link${active ? " is-active" : ""}`}
// 59
                  aria-current={active ? "page" : undefined}
// 60
                  onClick={onNavigate}
// 61
                >
// 62
                  <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
// 63
                  <span>{item.label}</span>
// 64
                </Link>
// 65
              );
// 66
            })}
// 67
          </div>
// 68
        ))}
// 69
      </nav>
// 70
      <div className="admin-sidebar-foot">
// 71
        <span>EventHub</span><span className="admin-version">v4.8</span>
// 72
      </div>
// 73
    </aside>
// 74
  );
// 75
}
// 76
// 77
const styles = `
// 78
.admin-sidebar {
// 79
  position: fixed; inset: 0 auto 0 0; width: 288px; z-index: 50;
// 80
  display: flex; flex-direction: column; justify-content: space-between;
// 81
  overflow-y: auto; background: #181b2a; color: #ccc3d8;
// 82
  border-right: 1px solid #262939;
// 83
}
// 84
.admin-brand { display: flex; align-items: center; gap: 8px; height: 80px; padding: 0 16px; }
// 85
.admin-brand-mark { color: #7c3aed; }
// 86
.admin-brand-name { font: 700 20px/28px Syne, sans-serif; color: #e0e1f7; letter-spacing: -.02em; }
// 87
.admin-brand-name span { color: #5de6ff; }
// 88
.admin-brand-tag { font: 600 11px/14px "Space Grotesk", sans-serif; letter-spacing: .08em; color: #7c3aed; }
// 89
.admin-nav { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; }
// 90
.admin-nav-label { margin: 12px 8px 4px; font: 500 11px/14px "Space Grotesk", sans-serif; letter-spacing: .08em; color: #958da1; text-transform: uppercase; }
// 91
.admin-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: #ccc3d8; font: 600 14px/20px "Space Grotesk", sans-serif; text-decoration: none; }
// 92
.admin-nav-link:hover { background: #262939; color: #e0e1f7; }
// 93
.admin-nav-link.is-active { background: #7c3aed; color: #ede0ff; box-shadow: 0 0 20px -4px #22d3ee59; }
// 94
.admin-nav-icon { width: 20px; text-align: center; font: 400 18px/1 "Material Symbols Outlined", sans-serif; }
// 95
.admin-sidebar-foot { margin: 12px; padding: 12px; border-radius: 8px; background: #26293999; display: flex; justify-content: space-between; font: 500 11px/14px "Space Grotesk", sans-serif; color: #ccc3d8; }
// 96
.admin-version { color: #5de6ff; }
// 97
@media (max-width: 1024px) {
// 98
  .admin-sidebar { transform: translateX(-100%); transition: transform .2s ease; }
// 99
  .admin-sidebar.is-open { transform: translateX(0); }
// 100
}
// 101
`;
```

Ghi chú:

- Icon có thể dùng `lucide-react` (đang có sẵn) thay vì Material Symbols để không phải tải font ngoài. Nếu đổi, phải giữ đúng kích thước 18–20px và canh giữa.
- Các route `organizers`, `queue`, `settings` **chưa tồn tại**; sidebar phải render dạng `span` disabled + `aria-disabled` cho đến khi có route/API, không tạo link chết `href="#"`.
- Sidebar **không** đổi route hiện tại của C1 (`/admin/stats`) hay màn khác; chỉ thêm shell.

### 7.3. `AdminHeader.tsx` — TSX + CSS cùng file (dòng theo dòng)

```tsx
// 1
import { Bell, Menu, Search, Terminal } from "lucide-react";
// 2
import { useAuth } from "@/features/auth/stores/authStore";
// 3
// 4
export function AdminHeader({
// 5
  title,
// 6
  onMenu,
// 7
  search,
// 8
  onSearch,
// 9
}: {
// 10
  title: string;
// 11
  onMenu?: () => void;
// 12
  search?: string;
// 13
  onSearch?: (value: string) => void;
// 14
}) {
// 15
  const user = useAuth((s) => s.user);
// 16
  return (
// 17
    <header className="admin-header">
// 18
      <div className="admin-header-left">
// 19
        <button className="admin-icon-btn admin-menu-btn" onClick={onMenu} aria-label="Mở menu">
// 20
          <Menu size={18} />
// 21
        </button>
// 22
        <p className="admin-breadcrumb">
// 23
          <span>SYSTEM ROOT</span><span>/</span><strong>{title}</strong>
// 24
        </p>
// 25
        <label className="admin-search">
// 26
          <Search size={16} aria-hidden="true" />
// 27
          <input
// 28
            value={search ?? ""}
// 29
            onChange={(e) => onSearch?.(e.target.value)}
// 30
            placeholder="Tìm kiếm nhanh trong trang..."
// 31
            aria-label="Tìm kiếm trong trang quản trị"
// 32
          />
// 33
        </label>
// 34
      </div>
// 35
      <div className="admin-header-right">
// 36
        <span className="admin-online"><i />Online</span>
// 37
        <button className="admin-icon-btn" aria-label="Thông báo"><Bell size={18} /></button>
// 38
        <button className="admin-icon-btn" aria-label="Nhật ký hệ thống"><Terminal size={18} /></button>
// 39
        <div className="admin-identity">
// 40
          <span className="admin-identity-name">{user?.name ?? "Quản trị viên"}</span>
// 41
          <span className="admin-identity-email">{user?.email}</span>
// 42
        </div>
// 43
        <span className="admin-avatar" aria-hidden="true">
// 44
          {(user?.name ?? "A").slice(0, 1).toUpperCase()}
// 45
        </span>
// 46
      </div>
// 47
    </header>
// 48
  );
// 49
}
// 50
// 51
const styles = `
// 52
.admin-header {
// 53
  position: fixed; top: 0; left: 288px; right: 0; height: 80px; z-index: 40;
// 54
  display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 24px;
// 55
  background: #0f1222cc; backdrop-filter: blur(16px); border-bottom: 1px solid #26293999;
// 56
}
// 57
.admin-header-left, .admin-header-right { display: flex; align-items: center; gap: 12px; min-width: 0; }
// 58
.admin-breadcrumb { display: flex; align-items: center; gap: 8px; margin: 0; font: 500 11px/14px "Space Grotesk", sans-serif; letter-spacing: .06em; color: #958da1; }
// 59
.admin-breadcrumb strong { color: #d2bbff; }
// 60
.admin-search { display: flex; align-items: center; gap: 8px; min-width: 240px; max-width: 420px; padding: 8px 12px; border-radius: 8px; background: #181b2a; color: #958da1; }
// 61
.admin-search input { width: 100%; border: 0; outline: 0; background: transparent; color: #e0e1f7; font: 500 12px/16px "Space Grotesk", sans-serif; }
// 62
.admin-online { display: inline-flex; align-items: center; gap: 6px; color: #5de6ff; font: 600 11px/14px "Space Grotesk", sans-serif; }
// 63
.admin-online i { width: 8px; height: 8px; border-radius: 50%; background: #5de6ff; box-shadow: 0 0 8px #5de6ff; }
// 64
.admin-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 0; border-radius: 8px; background: transparent; color: #ccc3d8; cursor: pointer; }
// 65
.admin-icon-btn:hover { background: #262939; color: #e0e1f7; }
// 66
.admin-identity { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; }
// 67
.admin-identity-name { font: 600 14px/20px "Space Grotesk", sans-serif; color: #e0e1f7; }
// 68
.admin-identity-email { font: 500 11px/14px "Space Grotesk", sans-serif; color: #d2bbff; }
// 69
.admin-avatar { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #d2bbff; color: #3f008e; font: 700 14px/1 Syne, sans-serif; }
// 70
.admin-menu-btn { display: none; }
// 71
@media (max-width: 1024px) {
// 72
  .admin-header { left: 0; padding: 0 16px; }
// 73
  .admin-menu-btn { display: inline-flex; }
// 74
  .admin-identity, .admin-online { display: none; }
// 75
}
// 76
@media (max-width: 640px) {
// 77
  .admin-search { display: none; }
// 78
}
// 79
`;
```

Lưu ý: ô search ở header chỉ nên tìm trong trang đang mở (C2). Không dùng nó cho “tìm vé/sự kiện/UID” toàn hệ thống như artifact vì backend không có API tổng hợp.

### 7.4. `AdminShell.tsx` — layout dùng chung

```tsx
// 1
import { useState, type ReactNode } from "react";
// 2
import { AdminSidebar } from "./AdminSidebar";
// 3
import { AdminHeader } from "./AdminHeader";
// 4
// 5
export function AdminShell({
// 6
  title,
// 7
  search,
// 8
  onSearch,
// 9
  children,
// 10
}: {
// 11
  title: string;
// 12
  search?: string;
// 13
  onSearch?: (value: string) => void;
// 14
  children: ReactNode;
// 15
}) {
// 16
  const [open, setOpen] = useState(false);
// 17
  return (
// 18
    <div className="admin-shell">
// 19
      <style>{styles}</style>
// 20
      <AdminSidebar open={open} onNavigate={() => setOpen(false)} />
// 21
      <AdminHeader title={title} onMenu={() => setOpen(true)} search={search} onSearch={onSearch} />
// 22
      <main className="admin-main">{children}</main>
// 23
    </div>
// 24
  );
// 25
}
// 26
// 27
const styles = `
// 28
.admin-main { min-height: 100vh; padding: 104px 24px 32px 312px; background: #0f1222; color: #e0e1f7; }
// 29
.admin-shell { min-height: 100vh; background: #0f1222; }
// 30
@media (max-width: 1024px) { .admin-main { padding: 104px 16px 24px; } }
// 31
@media (max-width: 640px) { .admin-main { padding: 88px 12px 24px; } }
// 32
`;
```

`App.tsx` cần chuyển `/admin/:tab` sang render `AdminShell` (hoặc `Admin` tự bọc shell) để **không** dùng `site-header` nữa. Đây là thay đổi ở bước triển khai, không thực hiện trong phiên này.

### 7.5. Các component C2 tái sử dụng

| Component | Props chính | Dùng lại cho |
|---|---|---|
| `KpiCard` | `label, value, hint, tone, icon, progress` | C1, C4, C11 |
| `StatusTabs` | `items:{value,label,count}[], value, onChange` | C4, C8, C11 |
| `FilterBar` | `search, onSearch, filters[], onReset, actions` | C4, C8, C11 |
| `AdminTable` | `columns, rows, selectable, selected, onSelect` | C4, C8, C11 |
| `StatusBadge` | `tone: active/inactive/locked/success/error` | Toàn bộ admin |
| `Pagination` | `page, pageSize, total, onPage, onPageSize` | Toàn bộ admin |
| `ConfirmModal` | `open, tone, title, description, target, reason, onConfirm, onClose` | C3, C4, C8 |
| `Toast` | `message, tone, onClose` | Toàn bộ admin |
| `EmptyState` | `title, description, action` | Toàn bộ admin |

### 7.6. CSS token & responsive

- Định nghĩa biến scope trong `.c2-page`:
  `--c2-bg:#0f1222; --c2-surface:#181b2a; --c2-surface-2:#1c1f2f; --c2-line:#262939; --c2-ink:#e0e1f7; --c2-muted:#ccc3d8; --c2-dim:#958da1; --c2-purple:#7c3aed; --c2-cyan:#5de6ff; --c2-pink:#ffafd3; --c2-error:#ffb4ab;`
- Breakpoint: `>1280px` 4 KPI; `1024–1280px` 2 KPI; `<1024px` sidebar off-canvas + 1 cột; `<640px` bảng chuyển sang card, ẩn cột `#`, `Ngày đăng ký`, gộp action vào menu.
- Không dùng `position: fixed` cho bảng; chỉ sidebar/header cố định.
- Bảng phải có `overflow-x:auto` và `min-width` để tránh vỡ cột.

---

## 8. Hợp đồng API đề xuất — chưa triển khai

### 8.1. Danh sách, phân trang, lọc và field

`GET /api/admin/users?q=...&status=ACTIVE|INACTIVE|LOCKED&role=USER&page=0&limit=10`

- Giữ tìm tên/email; page từ 0, limit 1–100, mặc định 10; thứ tự ổn định createdAt DESC, idUser.
- Server bắt buộc có USER và không có ADMIN/ORGANIZER trước phân trang. Trong phạm vi C2, role khác USER bị từ chối, không mở rộng danh sách.
- LOCKED khi locked_at khác null; ACTIVE/INACTIVE khi status tương ứng và locked_at null. Ba nhóm không chồng lấn.
- Giữ data là mảng, bổ sung pagination `{page, pageSize, total, totalPages}`; total theo tập lọc, totalPages = ceil(total/pageSize), bằng 0 khi rỗng. Trang vượt cuối trả mảng rỗng và tổng thật.
- Field: idUser, name, email, phone, emailVerified, roles, status, locked_at, lock_reason, createdAt, orderCount, totalSpend. Giữ null khi thiếu; không trả password/OTP/token.

### 8.2. Counts

`GET /api/admin/users/stats?role=USER&q=...` trả `{total, active, inactive, locked}` trong data. Cùng phạm vi khách hàng và tìm kiếm với list, không áp dụng status đang chọn để các tab luôn có counts. Tổng ba nhóm bằng total; không dùng tổng user toàn hệ thống.

### 8.3. Chi tiết user

`GET /api/admin/users/:id` trả hồ sơ và tổng đơn/chi tiêu như list, hiển thị panel/modal chỉ đọc trong C2, không phụ thuộc C3. 404 khi không tồn tại hoặc thuộc ADMIN/ORGANIZER. Không kèm audit/lịch sử đơn/chỉnh role.

### 8.4. Batch lock

Đề xuất `PATCH /api/admin/users/bulk-status` với `{ids: [uuid], status: "INACTIVE", locked: true, reason: "..."}`. Không nhận batch unlock hoặc đổi status tùy ý.

- 1–50 ID duy nhất; reason không rỗng, tối đa 2.000 ký tự. Chọn dòng trang hiện tại; xóa selection khi đổi trang/filter.
- Kiểm tra toàn bộ ID trong transaction trước cập nhật; có ID không hợp lệ hoặc ADMIN/ORGANIZER thì từ chối toàn batch, không cập nhật một phần; chặn tự khóa.
- User đã khóa được bỏ qua, giữ lý do cũ; trả `{updated, skipped}`. Ghi audit nội bộ cho thay đổi thật, không phát triển audit read.
- Modal xác nhận số lượng/lý do; thành công reload list/counts, lỗi giữ modal.

### 8.5. CSV export

`GET /api/admin/users/export?role=USER&q=...&status=...`: xuất toàn bộ tập lọc, không chỉ trang hiện tại, không nhận page/limit. Chỉ field thuộc phạm vi C2; text/csv, UTF-8 BOM; escape dấu phẩy/ngoặc kép/xuống dòng và chống công thức bảng tính từ dữ liệu nhập. Vượt giới hạn vận hành phải báo lỗi, không cắt âm thầm. Không Excel.

### 8.6. Tổng đơn / chi tiêu

Aggregation vào list/detail/export. Định nghĩa đề xuất: orderCount đếm toàn bộ đơn của buyer; totalSpend cộng total_amount của đơn PAID (VND), không cộng đơn chưa trả/hủy/hoàn. Không có đơn trả 0. Đối chiếu tên cột và quy tắc hoàn tiền thực tế trước triển khai; không nhân đôi do join roles/order items, không N+1 query.

### 8.7. Quy tắc chung

Guard ADMIN: 401 khi thiếu xác thực, 403 khi không đủ quyền. Phạm vi khách hàng áp dụng nhất quán cho list/counts/detail/batch/export và aggregation. Route tĩnh stats/export đặt trước /:id. Kiểm thử API thật trước tích hợp. Không bổ sung API ngoài 8 nhóm đã chốt.

---

## 9. Trạng thái giao diện bắt buộc

| Trạng thái | Cách xử lý |
|---|---|
| Loading lần đầu | Skeleton 4 KPI + 5 dòng bảng; không layout shift |
| Loading filter/page | Giữ dữ liệu cũ mờ nhẹ + spinner nhỏ; disable nút phân trang |
| Empty (không có khách) | `EmptyState`: “Chưa có khách hàng”, CTA reload |
| Empty do filter | “Không tìm thấy khách hàng phù hợp” + nút “Xoá bộ lọc” |
| Lỗi mạng | Banner lỗi + nút “Thử lại”; giữ filter hiện tại |
| 401 | Điều hướng login, giữ `from` |
| 403 | Thông báo không đủ quyền, không render bảng |
| Mutation thành công | Toast xanh + reload đúng trang hiện tại |
| Mutation lỗi | Toast đỏ + giữ modal mở + hiển thị lý do |
| Đang gửi | Disable nút confirm, spinner, chặn double submit |
| Modal | Focus trap, `Esc` đóng, `aria-modal`, trả focus về nút mở |
| Bảng | `caption` ẩn, `scope="col"`, checkbox có label, hàng hover/focus |
| Responsive | 1440/1024/768/390; bảng → card ở `<640px` |

---

## 10. Trình tự và nghiệm thu

1. Triển khai 8 nhóm API mục 8, kiểm tra schema và consumer hiện có.
2. Kiểm thử phân trang/filter/counts, tài khoản nhiều role, detail, batch transaction, CSV và aggregation.
3. Khi API đã hoạt động thật, dựng C2 theo style/bố cục Stitch với nội dung thu hẹp tại mục 6. Chỉ áp dụng shell cho C2; mẫu mục 7 là tham khảo, không mở rộng C1–C12, bỏ terminal/audit/telemetry và điều khiển ngoài phạm vi.
4. Nối dữ liệu thật, chi tiết chỉ đọc, batch lock, CSV; không suy tổng từ length===50 hoặc mock KPI.
5. Kiểm tra build/lint, browser responsive/a11y, hồi quy trang dùng chung; tạo report và cập nhật Master Plan.

- [ ] Không ADMIN/ORGANIZER trong list/counts/detail/export, kể cả USER đi kèm; batch không tác động các tài khoản đó.
- [ ] Status/role, total/totalPages đúng khi rỗng, vượt cuối và đổi filter; counts không chồng lấn.
- [ ] phone/emailVerified/roles/lock_reason có dữ liệu thật, xử lý null; detail chỉ đọc.
- [ ] Batch có xác nhận/lý do, kiểm tra quyền và transaction, trả kết quả thật.
- [ ] CSV khớp toàn bộ tập lọc, không field nhạy cảm; không nhân đôi tổng đơn/tiền.
- [ ] Tổng đơn/chi tiêu được kiểm tra với user chưa có đơn, nhiều đơn, PAID/hủy/hoàn.
- [ ] Không còn chức năng bị loại ở mục 6; không có nút/toast giả.
- [ ] Loading/empty/error, 401/403/400/404, debounce/hủy request cũ hoạt động.
- [ ] Build/lint đạt; browser 1440/1024/768/390, keyboard/focus được xác minh.
- [ ] Report và Master Plan có bằng chứng; cập nhật tài liệu không đồng nghĩa hoàn tất API/UI.

## 11. Trở ngại và giới hạn

API mục 8 đã được triển khai trong source; runtime HTTP chưa xác minh nên việc đưa vào môi trường chạy còn BLOCKED. API legacy trước phiên này trả mọi role, 50 dòng/trang và không có total. KYC/tier/create/resend/reset/audit read không còn là blocker.

Phiên triển khai đã sửa frontend/backend source, nhưng không gọi runtime và không sửa Stitch/database. Bằng chứng HTTP mục 5 thuộc phiên review trước. Chưa xác minh API mới qua HTTP, UI responsive/a11y, Live và quy tắc hoàn tiền cho chi tiêu.

---

## 12. Kết quả triển khai 2026-11-02

- Frontend: `client/src/pages/admin/AdminSidebar.tsx`, `AdminHeader.tsx`, `AdminShell.tsx` là các component tách riêng có props và mobile navigation; C2 bọc nội dung trong `AdminShell`. Các route admin khác vẫn giữ giao diện cũ cho đến khi được chuyển riêng. C2 có search, status tabs, counts, phân trang total thật, table, email verification, role USER, phone, tổng đơn/chi tiêu, detail chỉ đọc, CSV, batch lock và modal lý do.
- Backend: list/pagination/filter, stats, customer detail, batch lock và CSV tại `/admin/users`; aggregation đơn/chi tiêu đi qua module Order. C2 chỉ nhận role USER và loại mọi user có ADMIN/ORGANIZER.
- Chưa khởi động API: `localhost:8000` không phản hồi; không có `TEST_DATABASE_URL`; `server/.env` trỏ DB Supabase từ xa. Không chạy mutation hoặc kiểm thử tích hợp trên DB đó. Vì vậy code API chưa được xác nhận bằng HTTP và UI chưa được nối với runtime thật.
- Kiểm tra: backend build PASS; client build PASS; client lint PASS; server boundaries PASS; `npm test`: 39 PASS, 18 SKIP (các kiểm tra PostgreSQL bị skip do thiếu TEST_DATABASE_URL), 0 FAIL; kiểm tra parser/ownership cho các SQL C2 PASS. Build cảnh báo bundle JS vượt 500 kB và dữ liệu Browserslist cũ.
- Stitch: xác minh lại screen ID `c1ed0c8be6404a3aa9193a0e9365cc85`; tải HTML 57.610 ký tự và JPEG 1920×2350. Không chỉnh sửa artifact. Bố cục frontend dùng shell/table tối theo C2 và đã loại các khối/chức năng bị yêu cầu bỏ; so khớp browser/pixel chưa thực hiện.
- Còn chờ: PostgreSQL test cục bộ/cô lập để chạy HTTP assertions gồm 401/403, paging/filter/counts, multi-role exclusion, detail 404, batch atomicity, CSV, totals; browser authenticated ở 1440/1024/768/390 và accessibility/focus.


- Tách shell admin riêng không thay đổi chức năng/API. `npm run build` và `npm run lint` đạt sau thay đổi; browser chưa xác minh do runtime API chưa sẵn.

## 13. Liên kết

- Report tách shell: [`docs/reports/stitch/C2_20261102_110022_reusable_admin_shell.md`](../reports/stitch/C2_20261102_110022_reusable_admin_shell.md)
- Report triển khai: [`docs/reports/stitch/C2_20261102_103253_implementation.md`](../reports/stitch/C2_20261102_103253_implementation.md)
- Report review gốc: [`docs/reports/stitch/C2_20261102_083339_review_plan.md`](../reports/stitch/C2_20261102_083339_review_plan.md)
- Master Plan: [`docs/PROJECT_MASTER_PLAN.md`](../PROJECT_MASTER_PLAN.md)
- Tham chiếu pattern cùng file TSX+CSS: `client/src/pages/organizer/AttendeeManagerPage.tsx`
- Tham chiếu shell organizer: `client/src/pages/organizer/OrganizerSidebar.tsx`, `OrganizerHeader.tsx`
