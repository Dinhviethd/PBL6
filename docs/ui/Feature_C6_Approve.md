# Feature C6 — Thẩm Định & Xét Duyệt Hồ Sơ Ban Tổ Chức (Approve)

## 0. Thông tin phiên & trạng thái

**Mới nhất 2026-11-05 01:41:15 UTC+07:** ĐÃ TRIỂN KHAI trang chi tiết `/admin/applications/review/:applicationId`, thay modal khi nhấn Xét duyệt/Xem. Shell/khungC5, DTO đủ2trường, approve/reject/confirm/recheck/backURL;31HTTP +15nhómChrome, build/lint/boundaries PASS. API8000 nạp1JS/local5173 read smoke PASS, không mutation hồ sơ thật. ĐẠT CÓ ĐIỀU KIỆN; fulla11y/image-static-public rollout còn thiếu. [Plan chi tiết](Feature_C6_OrganizerApplicationDetail.md); [Report triển khai](../reports/stitch/C6_20261105_012835_detail_implementation.md). Các mô tả modal/chưa triển khai phía dưới giữ lịch sử trước thay đổi.

**Cập nhật 2026-11-05 01:24:11 UTC+07:** đã lập [plan trang chi tiết xét duyệt theo khung C5](Feature_C6_OrganizerApplicationDetail.md), mở từ Xét duyệt/Xem tại danh sách C6; route dự kiến `/admin/applications/review/:applicationId`. Trang mới **chưa triển khai**, hiện vẫn modal. API detail đã200 cho PENDING/REJECTED, còn thiếu2trường danh mục/quy mô; POST chưa kiểm lại phiên này. Đã xem trực tiếp ảnh C6 qua MCP; các ghi chú không xem được ảnh phía dưới thuộc lịch sử. [Report mới](../reports/stitch/C6_20261105_012411_detail_plan.md). Nội dung kế hoạch mới ưu tiên cho phần chi tiết; danh sách và scope nghiệp vụ C6 giữ nguyên.

| Mục | Giá trị |
|---|---|
| Màn hình | **C6 — Xét duyệt hồ sơ Ban Tổ Chức** (Stitch: “C6. Xét duyệt hồ sơ Ban Tổ Chức - Cosmic Ticket Quản Trị Viên”) |
| Route đích | **“Hồ sơ đăng ký BTC”** trong sidebar admin (hiện cả “Ban tổ chức” C4 và “Hồ sơ đăng ký BTC” C6 đều trỏ `/admin/applications`) |
| Stitch project | `10374042969343935993` (EventHub) |
| Stitch screen ID | `14785a10e0cf42c89d308996b8149813` |
| Thiết bị / kích thước | `DESKTOP`, `2560 × 4952` |
| HTML artifact | `projects/10374042969343935993/files/3437601346411197027` — tải và đọc đầy đủ thành công |
| Ảnh artifact | `projects/10374042969343935993/files/5223566903835692269` — JPEG (~223K tokens, vượt giới hạn đọc trực tiếp của công cụ MCP; **chưa xem trực tiếp**, chỉ đối chiếu qua HTML) |
| Thời điểm phiên | 2026-11-02 22:38 UTC+07 |
| Phiên triển khai | 2026-11-02 23:22 UTC+07 — đã triển khai code frontend tại `/admin/applications/review` |
| Loại phiên | **Review + lập kế hoạch** (chỉ tạo tài liệu). **Không sửa artifact Stitch, không sửa source frontend/backend.** Sau đó **phiên triển khai** tạo `C6Approve.tsx`, nối route/sidebar, không sửa backend/Stitch. |
| Tài khoản test admin (local demo) | `admin@example.test` / `LocalDemo2026!` — đã đăng nhập **200** và xác minh API admin (xem mục 4.1) |
| Report | [`../reports/stitch/C6_20261102_223828_review_plan.md`](../reports/stitch/C6_20261102_223828_review_plan.md); [`../reports/stitch/C6_20261102_230015_scope_update.md`](../reports/stitch/C6_20261102_230015_scope_update.md); [`../reports/stitch/C6_20261102_232211_implementation.md`](../reports/stitch/C6_20261102_232211_implementation.md) |

Trạng thái hiện tại: **ĐÃ TRIỂN KHAI CODE — ĐẠT CÓ ĐIỀU KIỆN.** Trang C6 riêng tại `/admin/applications/review` (`client/src/pages/admin/C6Approve.tsx`, TSX + CSS một file) dùng `AdminShell`; phê duyệt/từ chối gọi `POST /admin/organizer-applications/:id/review`; nhóm AI/eKYC/MST/blacklist/tài liệu/SLA chỉ hiển thị và phát toast “Chức năng đang phát triển”. Client build + eslint PASS, smoke test Chrome desktop/mobile PASS, API cốt lõi xác minh 200 và các nhánh lỗi 409/400/401 (không ghi dữ liệu). Chưa xác minh: nhánh POST review thành công trên DB dùng chung, pixel-diff Stitch (ảnh không xem được), a11y đầy đủ, viewport 1440/1024/768, Docker/Live.

---

## 1. Mục tiêu & phạm vi (dự kiến)

### 1.1. Mục tiêu

Tái hiện màn hình **C6 — Thẩm Định & Xét Duyệt Hồ Sơ Ban Tổ Chức** đã có trên Stitch thành một trang React riêng, **chỉ dùng dữ liệu/API backend đã có**, nối với route “Hồ sơ đăng ký BTC”. Cụ thể:

1. Tách trang C6 riêng (một file `.tsx` **gộp TSX + CSS**, viết xuống hàng dễ đọc), dùng lại `AdminShell`/`AdminSidebar`/`AdminHeader` đã có.
2. Nối route riêng cho “Hồ sơ đăng ký BTC” (hiện đang trỏ chung `/admin/applications` với C4).
3. Chỉ **phát triển thật** luồng xét duyệt (approve/reject) và các chức năng backend đã hỗ trợ (3 KPI, tìm `q`, lọc `status`, chi tiết hồ sơ, phân trang). Nhóm **AI/eKYC/MST/blacklist/tài liệu/SLA** được **dựng giao diện chỉ để hiển thị** (bám thiết kế Stitch); khi người dùng bấm vào → hiện **toast ở đáy màn hình “Chức năng đang phát triển”**, không gọi API, không hard-code dữ liệu. Các chức năng còn lại **loại bỏ khỏi UI**.
4. Giữ nguyên artifact Stitch C6; không gọi `edit_screens`, không tạo màn trùng.

> Ghi chú: phiên hiện tại **chỉ tạo tài liệu kế hoạch** (theo yêu cầu). Việc viết code frontend/backend là phiên triển khai riêng và phải tuân thủ xác minh API trước khi tích hợp.

### 1.2. Trong phạm vi (được phép dựng lại, có API hỗ trợ)

- **Header màn hình:** badge “Hệ thống Thẩm tra Pháp lý” (tĩnh), H1 “Thẩm Định & Xét Duyệt Hồ Sơ Ban Tổ Chức”, mô tả. Nút **“Tự động rà soát AI”** giữ hiển thị nhưng bấm → toast “Chức năng đang phát triển” (nhóm 1); bỏ nút **“Nhật ký thẩm tra”** (nhóm 2).
- **KPI (3, ánh xạ từ `stats`):** Chờ thẩm định (`stats.pending`), Đã phê duyệt (`stats.active`), Từ chối/Vi phạm (`stats.total - stats.active - stats.pending`). Không có số liệu “tháng này”, “khẩn cấp”, “+12%” (không có API).
- **Toolbar:** ô tìm `q` (tên tổ chức / người đại diện / email / MST — đã có); tabs lọc `status` (Tất cả / Chờ thẩm định PENDING / Đã duyệt APPROVED / Từ chối REJECTED); nút Làm mới. Bỏ tabs “Hồ sơ khẩn cấp / Doanh nghiệp mới / Hộ KD” và select “Loại hình pháp nhân” (không có trường).
- **Danh sách hồ sơ:** thẻ hoặc bảng theo mẫu C4, gồm: tổ chức, đại diện & liên hệ, MST/pháp nhân, trạng thái, ngày nộp, GMV (nếu giữ), hành động “Xét duyệt” khi PENDING / “Xem” khi đã xử lý.
- **Xét duyệt (lõi C6):** `POST /admin/organizer-applications/:id/review` với `approve` (Phê duyệt & cấp quyền BTC) / `reject` (Từ chối) + lý do bắt buộc khi từ chối.
- **Chi tiết hồ sơ:** hiển thị đầy đủ trường `organizer_applications` (MST, đại diện, email, phone, website, địa chỉ, danh mục, quy mô, mô tả, ngày nộp, ngày xét duyệt, lý do từ chối).
- **Phân trang:** `pagination.total/totalPages`.

### 1.3. Ngoài phạm vi phát triển — chia 2 nhóm xử lý UI

> Quyết định phạm vi (cập nhật 2026-11-02 23:00 UTC+07): **chỉ phát triển luồng phê duyệt (approve) và từ chối (reject)**. Nhóm AI/eKYC/MST/blacklist/tài liệu/SLA chỉ dựng giao diện để hiển thị (bám Stitch), bấm vào hiện toast; các chức năng còn lại loại bỏ khỏi UI.

**Nhóm 1 — Hiển thị giao diện, bấm vào hiện toast “Chức năng đang phát triển”** (không có API/không có trường dữ liệu; giữ giao diện để khớp thiết kế Stitch):

- AI eKYC / “AI SCORE SCAN” / “Tự động rà soát AI”.
- Đối soát mã số thuế qua API Tổng cục Thuế (nút `verified`).
- Xác thực CCCD/eKYC người đại diện.
- Tài liệu đính kèm (DKKD, CCCD 2 mặt, hợp đồng thuê, năng lực tài chính) — chưa có bảng lưu tài liệu hồ sơ.
- “Danh sách đen / Blacklist”, “Bằng chứng”, “Nghi vấn trùng lặp pháp nhân”.
- SLA 24h, “Hồ sơ khẩn cấp”, thời gian còn lại, “SLA tuân thủ trung bình”.

**Nhóm 2 — Loại bỏ hoàn toàn khỏi UI** (không hiển thị, không toast; không có API và không cần giữ giao diện):

- Loại hình pháp nhân (JSC/TNHH/Hộ KD/Tổ hợp) — không có cột.
- Mã `#SUB-...` (submission code).
- Trạng thái “Yêu cầu bổ sung” (status chỉ có PENDING/APPROVED/REJECTED).
- “Nhật ký thẩm tra” (chưa có GET lịch sử review cho admin; chỉ có `audit.append` ghi nhật ký nội bộ).
- “Biên Bản Thẩm Tra Nội Bộ” (ghi chú nội bộ) — không có cột.
- “Hạn Mức Đề Xuất Cấp Quyền” (hạn mức vé / tỷ lệ giữ doanh thu) — không có cột.
- KPI “Đã phê duyệt tháng này”, breakdown “Doanh nghiệp / Hộ KD”, xu hướng “+12%”.
- “Người duyệt hiện tại” (tên/email reviewer) — `reviewed_by` là uuid, list response chưa join tên.

> Quy tắc toast: component dùng chung toast ở đáy màn hình (mẫu `shared.tsx`/C4/C7), nội dung **“Chức năng đang phát triển”**; không gọi API, không mở modal, không hard-code dữ liệu giả.

---

## 2. Nguồn thiết kế Stitch & design system

### 2.1. Cách lấy nguồn

| Bước | Công cụ | Kết quả thực tế |
|---|---|---|
| Xác minh màn hình | `list_screens` | Tìm thấy C6 `14785a10e0cf42c89d308996b8149813`, title “C6. Xét duyệt hồ sơ Ban Tổ Chức - Cosmic Ticket Quản Trị Viên”, 2560×4952 |
| Tải HTML | `download_file` | C6 HTML đọc đầy đủ thành công |
| Tải ảnh | `download_file` | JPEG trả về nhưng vượt giới hạn đọc của công cụ; **chưa xem trực tiếp** |

### 2.2. Cấu trúc C6 (từ HTML artifact)

- **Sidebar/Header:** dùng lại `AdminSidebar`/`AdminHeader`/`AdminShell` (đã có). Sidebar artifact C6 có mục **“Hồ sơ đăng ký BTC”** (icon `assignment_ind`) tách riêng khỏi “Ban tổ chức”.
- **Header module:** badge “Hệ thống Thẩm tra Pháp lý” + “AI eKYC V4 Active”, H1 “Thẩm Định & Xét Duyệt Hồ Sơ Ban Tổ Chức”, mô tả SLA 24h; 2 nút “Nhật ký thẩm tra”, “Tự động rà soát AI”.
- **4 KPI:** Chờ thẩm định mới (38), Đã phê duyệt tháng này (142), [card 3 trống], Từ chối/Vi phạm (05).
- **Quy trình SLA 4 bước (tĩnh):** Kiểm tra MST (API Thuế) → Xác thực CCCD (eKYC) → Thẩm định năng lực & pháp lý → Cấp quyền phát hành vé.
- **Toolbar:** 4 tabs (Tất cả 38 / Hồ sơ khẩn cấp 8 / Doanh nghiệp mới 22 / Hộ KD-Tổ chức độc lập 8), ô tìm (tên công ty, MST, người đại diện, `#SUB-`), select “Loại hình pháp nhân”, nút refresh.
- **Danh sách hồ sơ (cards chuyên sâu):** mã `#SUB-`, trạng thái thẩm tra, SLA còn lại, **AI SCORE** (94/72/38), khối pháp nhân + MST `verified` + đại diện + chức vụ + SĐT (OTP) + email, **tài liệu đính kèm** (4 file), **AI OCR report**, **Biên bản thẩm tra nội bộ**, **Hạn mức đề xuất**, nút hành động “Phê Duyệt & Cấp Quyền BTC” / “Yêu cầu bổ sung” / “Từ chối & Đưa vào Danh sách đen” / “Bằng chứng”, “Người duyệt hiện tại”.
- **Phân trang + SLA:** “1–3 trong 38”, “SLA Tuân thủ trung bình 4h18m”.

### 2.3. Đối chiếu design system Cosmic Graffiti

- Artifact C6 dùng cùng dynamic color system với C4: `surface #0f1222`, `surface-container-low #181b2a`, `primary #d2bbff`/`primary-container #7c3aed`, `secondary #5de6ff`, `tertiary #ffafd3`, `error #ffb4ab`; font Syne (headline), Be Vietnam Pro (body), Space Grotesk (label).
- `AdminShell`/`C4ManagerOrganizer` hiện đang theo đúng token này. **C6 sẽ dùng lại `AdminShell` và cùng palette như C4** để nhất quán, không phát sinh style mới không cần thiết.

---

## 3. Đối chiếu hiện trạng (đã code) với thiết kế C6 — các điểm chưa đạt

Hiện trạng: **chưa có trang C6 riêng.** Chức năng xét duyệt BTC hiện nằm gọn trong modal của `C4ManagerOrganizer.tsx` (tab “Ban tổ chức”); sidebar “Hồ sơ đăng ký BTC” trỏ chung `/admin/applications` với C4.

| Hạng mục | Thiết kế C6 | Hiện trạng code | Chưa đạt |
|---|---|---|---|
| Trang riêng + route | Trang “Xét duyệt hồ sơ BTC” riêng, route “Hồ sơ đăng ký BTC” | Không có trang C6 riêng; “Hồ sơ đăng ký BTC” trỏ chung `/admin/applications` (C4) | **Có** |
| KPI xét duyệt | 4 KPI (chờ mới, đã duyệt tháng, từ chối, …) | Chỉ 3 KPI C4 (tổng/hoạt động/chờ) | Một phần |
| Quy trình SLA 4 bước | Khối thông tin quy trình | Không có | **Có** |
| AI/eKYC/MST/CCCD | AI score, xác thực MST, eKYC | Không có (không API) | **Có** (gap API) |
| Tài liệu đính kèm | 4 tệp pháp lý | Không có (không bảng lưu) | **Có** (gap API) |
| Blacklist / Bằng chứng | Đưa vào danh sách đen | Không có | **Có** (gap API) |
| Loại hình pháp nhân / #SUB | Filter loại hình, mã #SUB | Không có cột | **Có** (gap API) |
| Yêu cầu bổ sung | Trạng thái “cần bổ sung” | Chỉ PENDING/APPROVED/REJECTED | **Có** (gap API) |
| Xét duyệt approve/reject | Phê duyệt & cấp quyền / Từ chối + lý do | Đã có (modal C4, `POST .../:id/review`) | **Không** (đã có, cần tách sang C6) |
| Tìm kiếm / lọc trạng thái | Ô tìm đa tiêu chí + tabs | Đã có trong C4 (`q`, `status`) | **Không** (tái sử dụng) |
| Chi tiết hồ sơ | Đầy đủ trường pháp nhân/liên hệ | Đã có trong modal C4 | **Không** (tái sử dụng) |
| Phân trang | `1–N / Tổng` | Đã có (C4) | **Không** (tái sử dụng) |
| GMV | (C6 không hiển thị GMV rõ; C4 có) | Đã có `gmv` trong API | Tùy chọn |

---

## 4. API — hiện trạng đã xác minh & gap

### 4.1. API hiện có (đã xác minh live, `localhost:8000/api`)

| Endpoint | Method | Quyền | Bằng chứng phiên này |
|---|---|---|---|
| `/api/auth/login` | POST | Công khai | **200** với `admin@example.test` / `LocalDemo2026!` → trả `accessToken` + `user.roles=["USER","ADMIN"]`; set cookie `refreshToken` HttpOnly. |
| `/api/admin/organizer-applications` | GET | ADMIN | **200** với Bearer token admin (đã xác minh phiên này): `?page=0&limit=5` → `items` đầy đủ trường (kèm `gmv`), `pagination`, `stats {total:4, active:2, pending:1}`; `?status=PENDING&limit=3` → lọc đúng, chỉ trả hồ sơ PENDING, `stats.total` giữ 4 (không theo filter). Không token → **401** `UNAUTHORIZED`. |
| `/api/admin/organizer-applications/:id/review` | POST | ADMIN | Route tồn tại; hợp đồng `{approve, reason}` (reason bắt buộc khi từ chối); đã kiểm thử 11/11 ở phiên C4 trên DB tạm (chưa gọi lại trên Live để tránh thay đổi dữ liệu thật). |
| `/api/me/organizer-applications` | GET/POST | USER | Không token → **401** (dùng cho A5, giữ nguyên). |

Field `organizer_applications` hiện có: `id, user_id, organization_name, contact_name, contact_email, contact_phone, description, business_name, tax_id_or_business_license, website_or_social, head_office_address, main_event_category, expected_event_scale, status, reviewed_by, reviewed_at, rejection_reason, created_at, logo_url, pending_legal_changes`.

Envelope `GET /admin/organizer-applications` (đã có từ C4): `{ items (kèm gmv), pagination {page,pageSize,total,totalPages}, stats {total,active,pending} }`, hỗ trợ `q`, `status`, `page`, `limit`.

### 4.2. Chức năng C6 trên giao diện nhưng **chưa có API hỗ trợ** (gap)

| # | Chức năng (thiết kế C6) | Gap API/DB |
|---|---|---|
| 1 | AI SCORE / AI eKYC / “Tự động rà soát AI” | Không có endpoint, không có trường `ai_score` |
| 2 | Đối soát mã số thuế (Tổng cục Thuế, nút `verified`) | Không có tích hợp/thuê bao tra cứu MST; không có trường kết quả |
| 3 | Xác thực CCCD/eKYC người đại diện | Không có OCR/eKYC; không có trường |
| 4 | Tài liệu đính kèm (DKKD, CCCD, hợp đồng, năng lực TC) | Không có bảng/tài liệu cho hồ sơ (chỉ `logo_url`, `pending_legal_changes`) |
| 5 | Danh sách đen / “Bằng chứng” / nghi vấn trùng lặp | Không có bảng blacklist |
| 6 | Loại hình pháp nhân (JSC/TNHH/Hộ KD/Tổ hợp) | Không có cột phân loại |
| 7 | SLA 24h / “Hồ sơ khẩn cấp” / thời gian còn lại | Không có trường hạn SLA/độ ưu tiên |
| 8 | Mã `#SUB-...` | Không có cột submission code |
| 9 | “Yêu cầu bổ sung” | `status` chỉ 3 giá trị, không có trạng thái bổ sung |
| 10 | “Nhật ký thẩm tra” | `audit.append("organizer.reviewed")` có ghi, nhưng **chưa có GET lịch sử** cho admin |
| 11 | “Biên Bản Thẩm Tra Nội Bộ” (ghi chú nội bộ) | Không có cột |
| 12 | “Hạn Mức Đề Xuất” (vé mở bán / tỷ lệ giữ doanh thu) | Không có cột |
| 13 | KPI “Đã phê duyệt tháng này”, “Doanh nghiệp/Hộ KD”, “+12%” | `stats` chỉ có total/active/pending |
| 14 | “Người duyệt hiện tại” (tên/email) | `reviewed_by` là uuid, list response chưa join tên |

### 4.3. Kết luận xác minh API

- **Xét duyệt (approve/reject) — CÓ API, hoạt động, đã xác minh 200 với tài khoản admin.** Đây là chức năng cốt lõi của C6, sẽ phát triển thật.
- **Mọi chức năng “AI/thẩm tra pháp lý tự động/tài liệu/blacklist/SLA” của thiết kế C6 — KHÔNG CÓ API.** Chỉ dựng giao diện để hiển thị, bấm vào hiện toast “Chức năng đang phát triển”; không mock, không gọi API giả.

---

## 5. Kế hoạch triển khai (dự kiến — phiên sau)

> File plan này chỉ ghi kế hoạch; triển khai là phiên riêng (sẽ sửa code frontend, và nếu cần, backend trong phiên đó).
>
> **Đã thực hiện 2026-11-02 23:22 UTC+07:** tạo `C6Approve.tsx`, thêm route `/admin/applications/review` trong `App.tsx` (kèm `isAdminConsolePage`), trỏ sidebar “Hồ sơ đăng ký BTC” sang route mới; không sửa backend/Stitch. Chi tiết và bằng chứng: [`C6_20261102_232211_implementation.md`](../reports/stitch/C6_20261102_232211_implementation.md).

### 5.1. Cấu trúc file

- Tạo `client/src/pages/admin/C6Approve.tsx`: **gộp TSX + CSS trong 1 file** (style inline `<style>{...}</style>`, viết xuống hàng dễ đọc), không tách css riêng.
- `Admin.tsx` thêm nhánh route riêng (ví dụ `tab === "applications-review"` hoặc route `/admin/applications/review`) trả về `<C6Approve />`, dùng `AdminShell`.
- `AdminSidebar.tsx`: trỏ mục **“Hồ sơ đăng ký BTC”** sang route C6 (hiện trỏ chung `/admin/applications` với “Ban tổ chức”).
- `App.tsx`: thêm route C6 vào danh sách `isAdminConsolePage` (bỏ header/footer công khai chồng lấn, như đã làm cho C4/C7).

### 5.2. Tái sử dụng thành phần

- `AdminShell`, `AdminSidebar`, `AdminHeader` (đã có) — giữ nguyên.
- `api` (Axios), `shared.tsx` (Loading/Empty/Notice/Status), mẫu giao diện và token CSS từ `C4ManagerOrganizer.tsx`.

### 5.3. Bố cục trang (bám artifact nhưng thu gọn theo API)

1. **Header:** badge “Hệ thống Thẩm tra Pháp lý” (tĩnh) + H1 “Thẩm Định & Xét Duyệt Hồ Sơ Ban Tổ Chức” + mô tả. Nút “Tự động rà soát AI” hiển thị → bấm hiện toast; bỏ nút “Nhật ký thẩm tra”.
2. **3 KPI:** Chờ thẩm định (`stats.pending`), Đã phê duyệt (`stats.active`), Từ chối (`total−active−pending`).
3. **Toolbar:** ô tìm `q` + tabs `status` (Tất cả / Chờ thẩm định / Đã duyệt / Từ chối) + Làm mới.
4. **Danh sách hồ sơ:** bảng/thẻ theo C4 — tổ chức, đại diện & liên hệ, MST/pháp nhân, trạng thái, ngày nộp, hành động.
5. **Khối AI/eKYC/MST/tài liệu/SLA (nhóm 1):** dựng giao diện hiển thị (badge AI SCORE, nút đối soát MST, khối tài liệu, SLA) để khớp thiết kế Stitch; mọi điểm bấm trong nhóm này → **toast “Chức năng đang phát triển”** ở đáy màn hình, không gọi API.
6. **Xét duyệt (lõi C6):** form approve/reject + lý do bắt buộc khi từ chối, gọi `POST .../:id/review` (API thật).
7. **Chi tiết hồ sơ:** modal/drawer hiển thị đầy đủ trường.
8. **Phân trang:** `total/totalPages`.

### 5.4. Trạng thái giao diện

- Loading / empty / error / success (toast) theo mẫu `shared.tsx` và C4/C7.

### 5.5. Kiểm thử & nghiệm thu (khi triển khai)

- `npm run build`, `npm run check` (client + server).
- API: GET 401/200, `q`/`status`/phân trang, POST review approve/reject (trên DB test riêng).
- Browser desktop/mobile (1440/1024/768/390).

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí | Mục tiêu |
|---|---|---|
| 1 | Yêu cầu & nội dung | Trang C6 riêng, xét duyệt approve/reject bằng API thật; 3 KPI + tìm + lọc + chi tiết + phân trang. Nhóm AI/eKYC/MST/tài liệu/SLA chỉ hiển thị giao diện; chức năng nhóm 2 bị loại bỏ. |
| 2 | Bố cục | Bám sát artifact C6 (thu gọn theo phạm vi đã chốt). |
| 3 | Design system | Dùng `AdminShell`, giữ token Cosmic Graffiti. |
| 4 | Tiếng Việt & tương phản | Nhãn tiếng Việt đúng, đủ tương phản. |
| 5 | Điều hướng | Sidebar “Hồ sơ đăng ký BTC” → route C6 riêng. |
| 6 | Trạng thái | Loading/empty/error/success. |
| 7 | Toast nhóm 1 | Mọi điểm bấm thuộc nhóm AI/eKYC/MST/tài liệu/SLA hiện toast “Chức năng đang phát triển” ở đáy màn hình; không gọi API, không mock. |
| 8 | Responsive & a11y | Không tràn ngang; bảng cuộn ngang mobile. |
| 9 | Nhất quán | Đồng bộ C4/C2/C7 (cùng `AdminShell`). |

---

## 7. Rủi ro & phụ thuộc

- **Không có API** cho nhóm AI/eKYC/MST/blacklist/SLA/tài liệu → nhóm này chỉ dựng giao diện hiển thị + toast “Chức năng đang phát triển” (không phát triển logic); các chức năng nhóm 2 loại bỏ. Nếu sau này muốn có thật thì cần phiên bổ sung backend riêng (ngoài phạm vi).
- Route “Hồ sơ đăng ký BTC” hiện trỏ chung `/admin/applications` với C4 → cần tách route, tránh làm hỏng tab “Ban tổ chức” (C4).
- `reviewed_by` là uuid; nếu muốn hiển thị “người duyệt” cần join bảng `users` (gap nhỏ, tùy chọn).
- Envelope `GET /admin/organizer-applications` đã đổi sang object ở phiên C4 → C6 phải dùng đúng envelope này, không dùng mảng phẳng cũ.

---

## 8. Report liên quan

- [`../reports/stitch/C6_20261102_223828_review_plan.md`](../reports/stitch/C6_20261102_223828_review_plan.md) — rà soát thiết kế + xác minh API + danh sách gap + kế hoạch.
- [`../reports/stitch/C6_20261102_230015_scope_update.md`](../reports/stitch/C6_20261102_230015_scope_update.md) — cập nhật phạm vi (nhóm hiển thị + toast) và xác minh API 200 bằng tài khoản admin.
- [`../reports/stitch/C6_20261102_232211_implementation.md`](../reports/stitch/C6_20261102_232211_implementation.md) — triển khai code, build/lint, xác minh API và smoke test Chrome desktop/mobile.
- [`../reports/stitch/C6_20261102_233625_layout_correction.md`](../reports/stitch/C6_20261102_233625_layout_correction.md) — chỉnh `.c6-table-card/.c6-table-head/.c6-table-scroll` theo C2, cuộn cả trang; build/lint + Playwright 1280×700/390×844 PASS.
- Tham chiếu C4 (hồ sơ BTC cùng bảng dữ liệu): [`../reports/stitch/C4_20261102_220233_implementation.md`](../reports/stitch/C4_20261102_220233_implementation.md).

---

## 9. Lịch sử chỉnh sửa giao diện

| Thời điểm | Thay đổi | Bằng chứng |
|---|---|---|
| 2026-11-02 23:36 UTC+07 | `.c6-page` bỏ `height`/`overflow:hidden`/flex, dùng `min-height:calc(100vh - 80px)` flow tự nhiên; `.c6-table-card` viền/bo/nền như `.c2-table-card`; `.c6-table-head` flex space-between padding 15px 18px; `.c6-table-scroll` chỉ `overflow:auto` (bỏ `max-height:55vh`); xóa media khóa chiều cao ≤900px/≤760px — **cuộn cả trang**, bảng chỉ cuộn ngang. | Client build PASS (6.84s), eslint exit 0; Playwright Chrome 1280×700/390×844 PASS; ảnh `.local/qa/c6-page-scroll-{desktop,mobile}.png`. [Report](../reports/stitch/C6_20261102_233625_layout_correction.md) |
