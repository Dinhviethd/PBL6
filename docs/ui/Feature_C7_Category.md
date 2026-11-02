# Kế hoạch thực hiện lại màn hình C7 — Quản lý danh mục sự kiện (EventHub)

## 1. Thông tin màn hình

| Mục | Giá trị |
|---|---|
| Mã màn hình | C7 |
| Tên chính thức | Quản lý danh mục sự kiện — Cosmic Ticket Quản Trị Viên |
| Stitch project ID | `10374042969343935993` |
| Stitch screen ID | `4f419a1013a94108811a4c30613e72cf` |
| Kích thước thiết kế | DESKTOP 2560 × 3612 |
| Route hiện tại | `/admin/categories` (render qua component `Admin` với tab `categories`) |
| Trạng thái hiện tại (Master Plan) | Có code, cần đồng bộ |

## 2. Thiết kế Stitch hiện tại (đã xác minh qua Stitch MCP)

Đã tải HTML và ảnh chụp của màn hình C7. Thiết kế gồm các vùng chính:

1. **Sidebar cố định** (rộng 288px): các nhóm TỔNG QUAN (Dashboard Quản trị), QUẢN LÝ TÀI KHOẢN (Khách hàng, Ban tổ chức, Hồ sơ đăng ký BTC), SỰ KIỆN & KIỂM DUYỆT (Danh mục sự kiện, Toàn bộ sự kiện, Hàng đợi duyệt sự kiện), TÀI CHÍNH & VẬN HÀNH (Quản lý giao dịch, Cấu hình hệ thống); chân sidebar "EventHub v4.8 / Server VN-Central".
2. **Header**: breadcrumb `SYSTEM ROOT / SUPER ADMIN`, ô tìm kiếm, trạng thái Online, chuông thông báo, nút terminal, danh tính admin.
3. **Tiêu đề + hành động chính**: "QUẢN LÝ DANH MỤC SỰ KIỆN & THỂ LOẠI"; các nút `+ Thêm danh mục mới`, `Sắp xếp thứ tự`, `Tối ưu Tags xu hướng`, `Xuất JSON`.
4. **4 thẻ KPI**: Tổng danh mục chính (08), Tổng mục con & tags (48), Sự kiện liên kết (3.480), Lượt truy cập cao nhất (Âm nhạc & Rave Festival 64.2%).
5. **Thanh tìm kiếm + bộ lọc trạng thái** (Tất cả trạng thái / Đang hiển thị / Tạm ẩn trên menu).
6. **Bảng dữ liệu** với các cột: STT, Danh Mục & Icon Neon (tên + icon + nhãn/tag + badge HERO SPOTLIGHT), Slug URL Chuẩn SEO, Sự Kiện Trực Thuộc (số lượng), Doanh Thu GMV, Trạng Thái Menu (Hiển thị Hero / Đang hiển thị / Tạm ẩn trên Menu), Thao Tác (sửa / thêm mục con / xóa).
7. **Phân trang**: "Hiển thị 6 / 8 danh mục cấp cao".
8. **Lưới Visual Highlight & SEO Insight**: preview banner danh mục, Top Tags Xu Hướng, khuyến nghị AI.
9. **Drawer (slide-over) "Thêm / Chỉnh sửa danh mục"**: Tên danh mục (bắt buộc), Slug SEO (tự sinh, read-only, có nút mở khóa sửa thủ công), Mô tả ngắn SEO, Chọn Icon đại diện (4 lựa chọn), Banner đại diện 16:9 (upload), Danh sách Tags, 2 toggle (HOT trên Menu, yêu cầu xác thực 18+), nút Hủy Bỏ / Lưu Thay Đổi.
   - Trong thiết kế đã có script `autoGenerateSlug` tự sinh slug tiếng Việt (bỏ dấu, thường, gạch nối).

## 3. Đối chiếu design system Cosmic Graffiti

- **Màu**: thiết kế dùng `#0f1222`/`#181b2a` làm bề mặt, tím `#7c3aed` (primary-container/primary), cyan `#5de6ff`/`#22d3ee` (secondary), hồng `#ffafd3` (tertiary), chữ `#e0e1f7`. Phù hợp với palette Cosmic Graffiti (nền tối, nhấn tím/cyan/hồng). Lưu ý: artifact dùng palette Material dynamic (`primary #d2bbff`, `secondary #5de6ff`), khác một chút so với token mô tả (`#7C3AED`, `#22D3EE`); giữ theo artifact như các màn admin khác.
- **Kiểu chữ**: Syne (headline), Be Vietnam Pro (body), Space Grotesk (label) — khớp design system.
- **Bố cục**: bảng dữ liệu, KPI, drawer — ưu tiên khả năng đọc, phù hợp trang quản trị (không lạm dụng hiệu ứng phát sáng quá mức).

## 4. Hiện trạng code (đã khảo sát repo)

### 4.1 Frontend hiện tại — `client/src/pages/admin/Admin.tsx` (tab `categories`, dòng 187–241)

- Render qua component `Admin` dùng `PageHead` + thanh `tabs` chung, **không** dùng `AdminShell`.
- Tab "Danh mục" gồm 2 panel tối giản:
  - Panel "Danh mục sự kiện": liệt kê `name` + `/<slug>`, nút "Sửa" (form `name` + `slug` bắt buộc), nút "Ẩn danh mục" (gọi DELETE).
  - Panel "Thêm danh mục": form `Tên danh mục` + `Slug` (cả hai bắt buộc).
- Không có: KPI, bảng dữ liệu đầy đủ, tìm kiếm/bộ lọc, drawer thêm/sửa, icon/banner/tags/toggles, phân trang, sắp xếp thứ tự, xuất JSON.

### 4.2 Backend hiện tại — `server/src/app.ts` (dòng 1301–1322), `server/src/modules/event/infrastructure/store.ts`

- `categorySchema = z.object({ name: text.max(100), slug: text.regex(/^[a-z0-9-]+$/).max(120) })` — **`slug` đang bắt buộc**.
- `POST /admin/categories` → `events.saveCategory(body)`; `PATCH /admin/categories/:id` → `events.saveCategory(body, id)`; `DELETE /admin/categories/:id` → `events.archiveCategory(id)`; `GET /categories` → `events.categories()`.
- `saveCategory`: chỉ ghi `name` + `slug` (INSERT/UPDATE), **không tự sinh slug**, không xử lý `description` (cột đã tồn tại trong DB nhưng không dùng).
- `categories()`: `SELECT * FROM categories WHERE archived_at IS NULL ORDER BY name`.

### 4.3 Schema DB — `docs/database/mvp-schema.sql` (dòng 129–137)

`categories`: `id`, `name varchar(100)`, `slug varchar(120) UNIQUE`, `description text`, `archived_at`, `created_at`, `updated_at`.
→ **Không có** cột cho icon, banner/image, tags, `is_hot`, `18+`, thứ tự sắp xếp, trạng thái hiển thị menu (ngoài `archived_at`).

### 4.4 Shell dùng chung sẵn có (để tái sử dụng)

- `client/src/pages/admin/AdminShell.tsx` — bọc `AdminSidebar` + `AdminHeader` + `main`.
- `client/src/pages/admin/AdminSidebar.tsx` — sidebar admin (đã có mục "Danh mục" → `/admin/categories`).
- `client/src/pages/admin/AdminHeader.tsx` — header (breadcrumb, account menu, thông báo, đăng xuất).
- Đây chính là header/sidebar cần tái sử dụng theo yêu cầu.

## 5. Điểm chưa đạt so với thiết kế Stitch (đối chiếu code hiện tại)

| # | Hạng mục theo Stitch | Hiện trạng code | Kết luận |
|---|---|---|---|
| 1 | Shell admin (sidebar + header cố định) | `/admin/categories` dùng tab chung của `Admin`, chưa dùng `AdminShell` | Chưa đạt |
| 2 | 4 thẻ KPI (tổng danh mục, mục con & tags, sự kiện liên kết, traffic) | Không có | Chưa đạt |
| 3 | Bảng dữ liệu 7 cột (icon, slug SEO, số sự kiện, GMV, trạng thái menu) | Chỉ liệt kê `name` + `/slug` dạng line-item | Chưa đạt |
| 4 | Tìm kiếm + bộ lọc trạng thái menu | Không có | Chưa đạt |
| 5 | Drawer thêm/sửa danh mục (tên, slug tự sinh, mô tả, icon, banner, tags, toggles) | Form tối giản `name` + `slug` bắt buộc | Chưa đạt |
| 6 | Slug tự sinh từ tên (Âm nhạc → `am-nhac`) | `slug` bắt buộc nhập tay ở frontend lẫn backend | Chưa đạt |
| 7 | Icon đại diện (selector) | Không có trường/API | Chưa đạt |
| 8 | Banner đại diện 16:9 (upload) | Không có trường/API | Chưa đạt |
| 9 | Tags xu hướng | Không có trường/API | Chưa đạt |
| 10 | Toggle HOT Menu / 18+ | Không có trường/API | Chưa đạt |
| 11 | Trạng thái menu (Hiển thị / Tạm ẩn) | Chỉ có soft-delete `archived_at` (DELETE) | Một phần |
| 12 | Sắp xếp thứ tự (drag reorder), Xuất JSON, Tối ưu Tags | Không có | Chưa đạt |

## 6. Kiểm thử API backend hiện có

**Kết quả**: đã đối chiếu route/contract trong mã nguồn (không gọi HTTP thực tế vì phiên chỉ tạo tài liệu, không khởi động server).

| Method | Đường dẫn | Tồn tại | Ghi chú |
|---|---|---|---|
| GET | `/categories` | Có (`app.ts:586`) | Trả danh sách category chưa archive, `SELECT *` |
| POST | `/admin/categories` | Có (`app.ts:1305`) | `categorySchema` yêu cầu `name` + `slug` |
| PATCH | `/admin/categories/:id` | Có (`app.ts:1312`) | Cùng schema, `slug` bắt buộc |
| DELETE | `/admin/categories/:id` | Có (`app.ts:1319`) | Soft-delete (`archived_at`) |

- **Chưa xác minh bằng HTTP thực tế** (không có bằng chứng status code/response mẫu) — đánh dấu `NOT_VERIFIED`.
- **Phát hiện quan trọng**: `POST/PATCH /admin/categories` hiện **bắt buộc `slug`**; nếu gửi đúng dữ liệu `{ name }` không kèm `slug` sẽ bị từ chối (400 validation). Đây chính là điểm cần sửa theo yêu cầu.

## 7. Phạm vi được duyệt (bổ sung 2026-11-02)

Theo xác nhận của người dùng, chỉ **phát triển** các chức năng/API sau; **loại bỏ** toàn bộ các chức năng còn lại khỏi phạm vi C7.

**Phát triển (có API + giao diện):**
1. Mô tả ngắn SEO (`description`) — nhận/lưu qua `POST/PATCH /admin/categories`.
2. KPI: Tổng danh mục chính (đếm category chưa archive) và Tổng sự kiện liên kết (tổng sự kiện đang hoạt động).
3. Tìm kiếm/lọc danh mục: theo tên/slug (`q`), lọc trạng thái ẩn/hiển thị qua `archived_at`.
4. Drawer thêm/sửa danh mục: `name` + `description` (SEO) + slug tự sinh read-only.
5. Phân trang danh sách danh mục.
6. Số sự kiện trực thuộc từng danh mục (aggregate từ `events`).

**Loại bỏ (không phát triển):**
- Icon đại diện danh mục.
- Banner đại diện 16:9 (upload).
- Tags xu hướng / nhãn phụ.
- Toggle HOT trên Menu; toggle yêu cầu xác thực 18+.
- Doanh thu GMV theo danh mục.
- Sắp xếp thứ tự (drag reorder).
- Xuất JSON cấu hình.
- Thêm mục con (sub-category); nút "Tối ưu Tags xu hướng".
- Trạng thái menu "Hiển thị Hero / Đang hiển thị" (chỉ giữ Ẩn/Hiển thị qua `archived_at`).

**Logic slug:** tự sinh từ tên bằng `slugify` (Âm nhạc → `am-nhac`); trùng thì thêm hậu tố `-2`, `-3`.

## 8. Kế hoạch sửa đổi API — chỉ ghi kế hoạch, chưa áp dụng code

### 8.1 Slug tự động (bắt buộc)
- `server/src/app.ts` — `categorySchema`: `slug: text.regex(/^[a-z0-9-]+$/).max(120).optional()` (bỏ bắt buộc).
- Luồng tạo/sửa category: khi tạo và `slug` rỗng → tự sinh từ `name` bằng `slugify(name)` (Âm nhạc → `am-nhac`); trùng thì thêm hậu tố `-2`, `-3` (mẫu `uniqueSlug` của sự kiện tại `server/src/modules/event/public.ts:127`). Khi sửa đổi tên → giữ slug cũ trừ khi gửi slug mới (nhất quán B3).

### 8.2 Mô tả SEO
- `categorySchema` thêm `description: text.max(500).optional()` (cột `description` đã có trong DB).
- `saveCategory` INSERT/UPDATE thêm cột `description`.

### 8.3 Số sự kiện trực thuộc + KPI
- `GET /categories` (hoặc endpoint admin riêng `GET /admin/categories`) trả thêm `event_count` = đếm `events` theo `category_id` (chưa xóa).
- KPI: "Tổng danh mục chính" = đếm category chưa `archived_at`; "Tổng sự kiện liên kết" = tổng `event_count`.

### 8.4 Tìm kiếm/lọc + phân trang
- Mở rộng danh sách danh mục: tham số `q` (ILIKE `name`/`slug`), `archived` (lọc hiển thị/ẩn), `page`/`limit` + `total`.
- Giữ nguyên `GET /categories` public hiện có (không phá vỡ A1–A3/B2 đang dùng để map tên danh mục); có thể bổ sung endpoint admin riêng để tránh ảnh hưởng.

### 8.5 Drawer thêm/sửa
- Frontend: form `name` + `description`, slug hiển thị read-only (tự sinh), bỏ ô nhập slug bắt buộc.

**Lưu ý**: phiên này **không chỉnh sửa mã nguồn** — chỉ ghi kế hoạch. Việc áp dụng cần phiên triển khai riêng (có báo cáo + cập nhật Master Plan riêng).

## 9. Kỹ thuật chuyển thiết kế thành React component (kế hoạch)

- **Tái sử dụng** `AdminShell` + `AdminSidebar` + `AdminHeader` (không tạo shell mới).
- Tạo trang riêng `C7CategoryManager.tsx` tại `client/src/pages/admin/`, **gộp TSX + CSS vào một file** (theo mẫu `C2ManagerAccount.tsx`, `AdminSidebar.tsx` dùng `<style>{styles}</style>`), viết xuống dòng cho dễ đọc.
- Nối route `/admin/categories` vào trang mới (hoặc thay nhánh tab `categories` trong `Admin.tsx`).
- Giao diện giữ theo Stitch nhưng thu gọn theo phạm vi mục 7:
  - Tiêu đề + nút "Thêm danh mục mới" (mở drawer).
  - KPI: Tổng danh mục chính + Tổng sự kiện liên kết.
  - Ô tìm kiếm (tên/slug) + bộ lọc trạng thái (Hiển thị / Tạm ẩn).
  - Bảng danh mục: STT, Tên + mô tả SEO, Slug, Số sự kiện trực thuộc, Trạng thái (Hiển thị/Tạm ẩn), Thao tác (Sửa / Xóa-ẩn).
  - Phân trang.
  - Drawer thêm/sửa: Tên danh mục + Mô tả SEO + slug (read-only, tự sinh).
- Dữ liệu động: `GET /categories` (có `event_count` + phân trang/lọc sau khi bổ sung API mục 8), `POST/PATCH/DELETE /admin/categories/*`.
- **Bỏ các khối ngoài phạm vi**: icon, banner, tags, HOT/18+, GMV, sắp xếp, xuất JSON, mục con — không dựng, không dùng dữ liệu giả.

## 10. Tiêu chí nghiệm thu

1. Trang dùng shell admin dùng chung (sidebar/header), route `/admin/categories` đúng.
2. Danh sách danh mục từ API (dữ liệu thật), có phân trang, tìm kiếm theo tên/slug, lọc trạng thái.
3. Hiển thị mô tả SEO và số sự kiện trực thuộc từng danh mục; KPI tổng danh mục + tổng sự kiện liên kết từ API.
4. Thêm/sửa/ẩn danh mục dùng `POST/PATCH/DELETE` thật; thêm danh mục không cần slug, slug tự sinh `am-nhac` từ "Âm nhạc" (và hậu tố khi trùng).
5. Xử lý loading/empty/error; responsive desktop/mobile.
6. Không dựng/dùng dữ liệu giả cho các chức năng đã loại bỏ (icon/banner/tags/HOT/18+/GMV/sắp xếp/xuất JSON/mục con).

## 11. Giới hạn và nội dung chưa xác minh

- Chưa gọi thử API bằng HTTP thực tế (chỉ đối chiếu contract trong code).
- Chưa xác minh responsive/accessibility ở runtime (chỉ có ảnh/HTML tĩnh từ Stitch).
- Các chức năng ngoài phạm vi (icon, banner, tags, HOT/18+, GMV, sắp xếp, xuất JSON, mục con) đã loại bỏ theo phê duyệt — không phát triển.
- API bổ sung (description, event_count, phân trang/lọc) cần một phiên triển khai riêng; chưa áp dụng code trong phiên này.

## 12. Nhật ký bổ sung

- 2026-11-02 18:34:14 (UTC+07): bổ sung phạm vi được duyệt — chỉ phát triển mô tả SEO, KPI, tìm kiếm/lọc, drawer thêm/sửa, phân trang, số sự kiện trực thuộc; loại bỏ các chức năng còn lại; slug tự sinh. [Report](reports/stitch/C7_20261102_183414_scope_update.md)
- 2026-11-02 18:52 (UTC+07): triển khai theo phạm vi mục 7 — `C7CategoryManager.tsx` dùng `AdminShell`; `GET /admin/categories` (q/archived/page/limit, `event_count`, `stats`); `POST/PATCH` slug optional tự sinh, `description`; test tích hợp 16/16 PASS, build server/client PASS, UI Chrome desktop/mobile đã kiểm thử (mobile bảng cuộn ngang). Chưa rollout Docker 8000/Live và chưa kiểm a11y đầy đủ. [Report](reports/stitch/C7_20261102_185252_implementation.md)
