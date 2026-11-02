# Feature C4 — Quản lý Ban Tổ Chức (Manager Organizer)

## 0. Thông tin phiên & trạng thái

| Mục | Giá trị |
|---|---|
| Màn hình | **C4 — Quản lý Ban Tổ Chức** (Stitch: “C4. Quản lý ban tổ chức - Cosmic Ticket Quản Trị Viên”) |
| Route đích | `/admin/applications` (giữ nguyên route hiện có; sidebar mục “Ban tổ chức” đã trỏ tới route này) |
| Stitch project | `10374042969343935993` (EventHub) |
| Stitch screen ID | `49d8174a88b542969b1985afb3e70bd4` |
| Thiết bị / kích thước | `DESKTOP`, `2560 × 3526` |
| HTML artifact | `projects/10374042969343935993/files/12517984753637434845` — tải thành công (≈51.7 KB) |
| Ảnh artifact | `projects/10374042969343935993/files/2473751384729227754` — JPEG (đã trả về, chưa xem trực tiếp do dung lượng lớn) |
| Thời điểm phiên | Review/plan: **2026-11-02 21:25:25 UTC+07**; Chốt phạm vi: **2026-11-02 21:44:24 UTC+07**; Triển khai: **2026-11-02 22:02:33 UTC+07** |
| Loại phiên | Review + lập kế hoạch + chốt phạm vi + **đã triển khai code**. **Không sửa artifact Stitch.** |
| Report | Review: [`../reports/stitch/C4_20261102_212525_review_plan.md`](../reports/stitch/C4_20261102_212525_review_plan.md); Scope update: [`../reports/stitch/C4_20261102_214424_scope_update.md`](../reports/stitch/C4_20261102_214424_scope_update.md); Triển khai: [`../reports/stitch/C4_20261102_220233_implementation.md`](../reports/stitch/C4_20261102_220233_implementation.md) |

Trạng thái hiện tại: **ĐÃ TRIỂN KHAI CODE** — `C4ManagerOrganizer.tsx` dùng `AdminShell`; API `GET /admin/organizer-applications` hỗ trợ 3 KPI + `q` + `status` + GMV + phân trang (11/11 kiểm thử HTTP PASS trên DB tạm; build/lint/boundary/test đạt). Review runtime trình duyệt/responsive/a11y và Docker 8000/Live **chưa xác minh**. Stitch C4 giữ nguyên.

---

## 1. Mục tiêu & phạm vi (đã chốt)

### 1.1. Mục tiêu

Tái hiện giao diện C4 đã có trên Stitch bằng React + CSS hiện có, **chỉ tập trung màn hình C4**, không đụng màn hình khác (C5, C6 và các màn admin khác giữ nguyên). Cụ thể:

1. Tách trang C4 riêng (`C4ManagerOrganizer.tsx`) dùng `AdminShell`/`AdminSidebar`/`AdminHeader` đã có (giống C2/C7); giữ route `/admin/applications`.
2. Dựng lại bố cục theo artifact nhưng thu gọn: header + quick action xét duyệt (badge) + **3 KPI** + toolbar (tìm `q` + lọc `status`) + bảng + phân trang.
3. **Bổ sung API backend** để phục vụ: 3 KPI tổng hợp, tìm kiếm `q`, lọc `status`, tổng doanh thu (GMV), phân trang (`total/totalPages`).
4. Chỉ hiển thị dữ liệu/field mà API thật cung cấp; **loại bỏ các chức năng còn lại** khỏi UI (không hard-code).
5. Giữ nguyên artifact Stitch; không gọi `edit_screens`, không generate lại màn hình.

### 1.2. Trong phạm vi

- **UI C4:** tiêu đề + mô tả; quick action “Xét Duyệt Hồ Sơ Mới” (badge = đếm PENDING); **3 KPI** (Tổng đối tác / Đang hoạt động / Chờ thẩm định); ô tìm `q`; lọc `status` (tabs); bảng thu gọn; phân trang; xét duyệt inline (C6 gộp vào C4).
- **API backend (bổ sung):** mở rộng `GET /admin/organizer-applications` với `q`, `status`, `page`, `limit`; trả `stats` (3 KPI), `pagination` (`total/totalPages/page/limit`), mỗi item thêm `gmv` (tổng doanh thu đã thanh toán của các sự kiện thuộc ban tổ chức đó).
- Build/lint/test; report phiên + cập nhật Master Plan cho riêng C4.

### 1.3. Ngoài phạm vi (loại bỏ khỏi UI)

- Phân hạng Tier 1/2/3.
- Mã BTC `#ORG-...`.
- Cột “Sự kiện / Vé bán” (event_count/ticket_count).
- KPI “Tạm Dừng / Khóa Quyền” và KPI “Escrow Payout”.
- Card chính sách Escrow 24H + nút “Cấu Hình Hạn Mức Giải Ngân”.
- Xuất Báo Cáo Đối Soát.
- Thêm BTC Mới.
- Khóa quyền mở bán / Tạm dừng / Mở khóa.
- Cấu hình dòng tiền Escrow.
- Trang/panel chi tiết C5 riêng; C6 xét duyệt riêng (gộp inline vào C4).
- Không sửa schema/migration (không thêm cột `tier`, `org_code`, `suspended`…).
- Không sửa C1, C2, C3, C5–C12 hoặc bất kỳ artifact Stitch nào.

---

## 2. Nguồn thiết kế Stitch & design system

### 2.1. Cách lấy nguồn

| Bước | Công cụ | Kết quả thực tế |
|---|---|---|
| Xác minh màn hình | `get_screen` | C4 ID `49d8174a88b542969b1985afb3e70bd4`, DESKTOP 2560×3526 |
| Xác minh màn liên quan | `get_screen` | C5 `b2b2902ef53844d99da9a23373eccd5b` (2560×3938), C6 `14785a10e0cf42c89d308996b8149813` (2560×4952) |
| Tải HTML | `download_file` | C4 HTML đọc đầy đủ |
| Tải ảnh | `download_file` | JPEG trả về (chưa xem trực tiếp do lớn) |

### 2.2. Cấu trúc C4 (từ HTML artifact) — phần giữ lại

- **Sidebar/Header:** dùng lại `AdminSidebar`/`AdminHeader`/`AdminShell` (đã có).
- **Tiêu đề:** badge `PORTAL QUẢN TRỊ BTC`, H1 `Quản Lý Ban Tổ Chức (Organizers & Promoters)`, mô tả.
- **Quick action (giữ 1):** `Xét Duyệt Hồ Sơ Mới` với badge đếm hồ sơ chờ thẩm định (PENDING). Bỏ `Xuất Báo Cáo Đối Soát` và `Thêm BTC Mới`.
- **KPI (giữ 3):** Tổng Đối Tác BTC, Đang Hoạt Động (APPROVED), Chờ Thẩm Định Pháp Lý (PENDING). Bỏ `Tạm Dừng/Khóa Quyền` và `Escrow Payout`.
- **Toolbar (giữ):** ô tìm (tên công ty / người đại diện / MST); tab lọc trạng thái (Tất cả / Đang hoạt động / Chờ thẩm định / Từ chối). Bỏ lọc Hạng (Tier) và mã BTC.
- **Bảng (thu gọn 6 cột):** `Đơn Vị` | `Người Đại Diện & Liên Hệ` | `Mã Số Thuế / Pháp Nhân` | `Tổng Doanh Thu GMV` | `Trạng Thái` | `Thao Tác` (xét duyệt khi PENDING, xem hồ sơ). Bỏ cột `Sự Kiện / Vé Bán` và `Phân Hạng`.
- **Phân trang:** `1–N / Tổng` (dùng `total/totalPages` từ API).
- **Bỏ:** card chính sách Escrow, các hành động khóa quyền/cấu hình escrow.

### 2.3. Đối chiếu design system Cosmic Graffiti

- Artifact C4 dùng dynamic color system: `surface #0f1222`, `surface-container-low #181b2a`, `primary #d2bbff`/`primary-container #7c3aed`, `secondary #5de6ff`, `tertiary #ffafd3`, `error #ffb4ab`; font Syne (headline), Be Vietnam Pro (body), Space Grotesk (label).
- `AdminShell` (C2/C7) đang theo token Cosmic Graffiti (`#7c3aed` primary, `#5de6ff` secondary, nền tối). **Giữ theo `AdminShell` đã có**, không phát sinh style mới không cần thiết.

---

## 3. Đối chiếu hiện trạng (đã code) với thiết kế C4 — các điểm chưa đạt

| Hạng mục | Thiết kế C4 | Hiện trạng code | Chưa đạt |
|---|---|---|---|
| Shell | Sidebar + header admin riêng | `Admin.tsx` dùng tab-nav cũ, chưa `AdminShell` | Có |
| KPI | 3 KPI (tổng/hoạt động/chờ thẩm định) | Không có | Có |
| Quick action | Xét duyệt (badge đếm) | Chỉ form xét duyệt inline | Có |
| Tìm kiếm | Ô tìm đa tiêu chí `q` | Không có | Có |
| Lọc trạng thái | Tab trạng thái + đếm | Không có | Có |
| Bảng | 6 cột | Danh sách card 3 dòng | Có |
| Phân trang | `1–N / Tổng` | `Pager` theo mảng 50, không `total` | Có |
| Tổng doanh thu GMV | Cột GMV mỗi BTC | Không có | Có |
| Xét duyệt (C6) | Luồng duyệt rõ ràng | Inline trong card (thô) | Một phần |

---

## 4. API — hiện trạng đã xác minh & bổ sung cần thực hiện

### 4.1. API hiện có (đã xác minh live, `localhost:8000/api`)

| Endpoint | Method | Quyền | Bằng chứng |
|---|---|---|---|
| `/api/admin/organizer-applications` | GET | ADMIN | Không token `401`; token admin `200`, `{success,data:[...]}` (3 bản ghi: 2 APPROVED, 1 REJECTED); mảng phẳng, không `total`/`q`/`status` |
| `/api/admin/organizer-applications/:id/review` | POST | ADMIN | Source: `{approve, reason}` (reason bắt buộc khi từ chối) |
| `/api/me/organizer-applications` | GET/POST | USER | Không token `401`; dùng cho A5 (giữ nguyên, không sửa) |

Field hiện có: `id, user_id, organization_name, contact_name, contact_email, contact_phone, description, status (PENDING/APPROVED/REJECTED), reviewed_by, reviewed_at, rejection_reason, created_at, business_name, tax_id_or_business_license, website_or_social, head_office_address, main_event_category, expected_event_scale, logo_url, pending_legal_changes`.

### 4.2. API cần bổ sung (phiên triển khai)

Mở rộng **chỉ** `GET /admin/organizer-applications` (giữ nguyên `/me/organizer-applications` cho A5):

| Tham số mới | Ý nghĩa |
|---|---|
| `q` | Tìm kiếm không phân biệt hoa thường (`ILIKE`) trên `organization_name`, `contact_name`, `contact_email`, `business_name`, `tax_id_or_business_license` |
| `status` | Lọc `PENDING` / `APPROVED` / `REJECTED` (optional) |
| `page`, `limit` | Phân trang (giữ `limit` mặc định 10–50) |

Response mới (envelope):

```
{
  success: true,
  data: {
    stats: { total, active, pending },            // 3 KPI tổng hợp (toàn bộ, không theo q/status)
    pagination: { total, totalPages, page, limit },
    items: [ { ...fields hiện có, gmv: "..." } ]  // gmv = tổng doanh thu đã thanh toán
  }
}
```

**Cách tính `gmv` (tổng doanh thu theo BTC):** tổng `orders.total_amount` của các đơn `status='PAID'` thuộc các sự kiện có `events.organizer_id = application.user_id` (đã xác minh quan hệ: `events.organizer_id` là `user_id` của chủ BTC; `orders.event_id` → `events.id`; mẫu sum `total_amount FILTER (WHERE status='PAID')` đã có trong `order/infrastructure/store.ts`). Trả dạng string (BigInt) để tránh tràn.

**3 KPI:** đếm toàn bộ `organizer_applications` trong cùng snapshot: `total` = tổng bản ghi, `active` = `status='APPROVED'`, `pending` = `status='PENDING'`.

### 4.3. Chức năng bị LOẠI BỎ khỏi UI (không cần API)

Tier, mã BTC `#ORG-`, sự kiện/vé bán, Escrow payout, Escrow config, khóa quyền/tạm dừng/mở khóa, Xuất báo cáo, Thêm BTC mới, chi tiết C5 riêng — **ẩn hoàn toàn khỏi UI**, không mock.

---

## 5. Kế hoạch triển khai (dự kiến)

> File plan này chỉ ghi kế hoạch; triển khai là phiên riêng (sẽ sửa code frontend + backend trong phiên đó).

### 5.1. Cấu trúc file

- Tạo `client/src/pages/admin/C4ManagerOrganizer.tsx`: **gộp TSX + CSS trong 1 file** (style inline `<style>{...}</style>`, viết xuống hàng dễ đọc), không tách css riêng.
- `Admin.tsx` khi `tab === "applications"` trả về `<C4ManagerOrganizer />`, dùng `AdminShell`.
- Backend: mở rộng route/handler `GET /admin/organizer-applications` trong `server/src/app.ts` + phương thức store trong `auth` module.

### 5.2. Tái sử dụng thành phần

- `AdminShell`, `AdminSidebar`, `AdminHeader` (đã có) — giữ nguyên.
- `api` (Axios), `shared.tsx` (Loading/Empty/Notice/Status/Pager), `types.ts` (bổ sung type `Application` với `gmv`).

### 5.3. Bố cục trang

1. **Tiêu đề:** “Quản Lý Ban Tổ Chức (Organizers & Promoters)” + mô tả.
2. **Quick action:** nút “Xét Duyệt Hồ Sơ Mới” (badge = `stats.pending`).
3. **3 KPI:** Tổng Đối Tác BTC (`stats.total`), Đang Hoạt Động (`stats.active`), Chờ Thẩm Định (`stats.pending`).
4. **Toolbar:** ô tìm `q` (gọi API) + tabs lọc `status` (Tất cả / Đang hoạt động=APPROVED / Chờ thẩm định=PENDING / Từ chối=REJECTED).
5. **Bảng 6 cột:** Đơn Vị (`organization_name` + `business_name`) · Người Đại Diện (`contact_name`/`contact_email`/`contact_phone`) · Mã Số Thuế/Pháp Nhân (`tax_id_or_business_license` + `business_name`) · Tổng Doanh Thu GMV (`gmv`) · Trạng Thái (`status`) · Thao Tác (Xem hồ sơ; Xét duyệt khi `PENDING`).
6. **Phân trang:** `pagination.total/totalPages`.
7. **Xét duyệt (C6 inline):** form `POST /admin/organizer-applications/:id/review` với `approve`/`reason`.

### 5.4. Trạng thái giao diện

- Loading / empty / error / success (toast) theo mẫu `shared.tsx` và C2/C7.

### 5.5. Kiểm thử & nghiệm thu (khi triển khai)

- `npm run build`, `npm run check` (client + server).
- API: GET 401/200, `q`/`status`/phân trang đúng, `gmv` khớp tổng đơn PAID; POST review (trên DB test riêng).
- Browser desktop/mobile (1440/1024/768/390).

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí | Mục tiêu |
|---|---|---|
| 1 | Yêu cầu & nội dung | 3 KPI + tìm `q` + lọc `status` + bảng (có GMV) + phân trang hoạt động với dữ liệu thật. |
| 2 | Bố cục | Bám sát artifact C4 (thu gọn theo phạm vi đã chốt). |
| 3 | Design system | Dùng `AdminShell`, giữ token Cosmic Graffiti. |
| 4 | Tiếng Việt & tương phản | Nhãn tiếng Việt đúng, đủ tương phản. |
| 5 | Điều hướng | Sidebar “Ban tổ chức” → `/admin/applications`; xét duyệt inline. |
| 6 | Trạng thái | Loading/empty/error/success. |
| 7 | Responsive & a11y | Không tràn ngang; bảng cuộn ngang mobile. |
| 8 | Nhất quán | Đồng bộ C2/C7 (cùng `AdminShell`). |

---

## 7. Rủi ro & phụ thuộc

- Cần bổ sung API backend (3 KPI + `q` + `status` + `gmv` + phân trang) trước khi nối UI; nếu chưa có, phần KPI/tìm/lọc/GMV phải `BLOCKED` theo quy định.
- `gmv` cần truy vấn join `events`/`orders` (PAID) theo `organizer_id`; cần đảm bảo ownership/boundary (chỉ ADMIN, snapshot).
- Envelope `GET /admin/organizer-applications` đổi từ mảng phẳng sang object → chỉ ảnh hưởng tab C4 (đang thay), không ảnh hưởng `/me/organizer-applications` (A5).

---

## 8. Report liên quan

- [`../reports/stitch/C4_20261102_212525_review_plan.md`](../reports/stitch/C4_20261102_212525_review_plan.md) — review + API verification ban đầu.
- [`../reports/stitch/C4_20261102_214424_scope_update.md`](../reports/stitch/C4_20261102_214424_scope_update.md) — chốt phạm vi thu hẹp.
- [`../reports/stitch/C4_20261102_220233_implementation.md`](../reports/stitch/C4_20261102_220233_implementation.md) — triển khai code frontend + backend, 11/11 kiểm thử API PASS, các nội dung chưa xác minh.
- [`../reports/stitch/C4_20261102_222046_layout_fit.md`](../reports/stitch/C4_20261102_222046_layout_fit.md) — chỉnh khung hiển thị vừa màn hình: console layout cho `/admin/applications`, khóa chiều cao viewport, chỉ cuộn vùng bảng.
- [`../reports/stitch/C4_20261102_233625_layout_correction.md`](../reports/stitch/C4_20261102_233625_layout_correction.md) — chỉnh `.c4-table-card/.c4-table-head/.c4-table-scroll` theo C2, bỏ khóa chiều cao để cuộn cả trang; build/lint + Playwright 1280×700/390×844 PASS.

---

## 9. Lịch sử chỉnh sửa giao diện

| Thời điểm | Thay đổi | Bằng chứng |
|---|---|---|
| 2026-11-02 23:36 UTC+07 | `.c4-page` bỏ `height`/`overflow:hidden`/flex, dùng `min-height:calc(100vh - 80px)` flow tự nhiên; `.c4-table-card` viền/bo/nền như `.c2-table-card`; `.c4-table-head` flex space-between padding 15px 18px; `.c4-table-scroll` chỉ `overflow:auto` (bỏ `max-height:55vh`); xóa media khóa chiều cao ≤900px/≤760px — **cuộn cả trang**, bảng chỉ cuộn ngang. | Client build PASS (6.84s), eslint exit 0; Playwright Chrome 1280×700/390×844 PASS; ảnh `.local/qa/c4-page-scroll-{desktop,mobile}.png`. [Report](../reports/stitch/C4_20261102_233625_layout_correction.md) |
