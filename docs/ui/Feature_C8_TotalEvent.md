# Kế hoạch thực hiện lại C8 — Quản lý toàn bộ sự kiện

## Thông tin đã xác minh

| Mục | Giá trị |
|---|---|
| Mã / tên | C8 — Quản lý toàn bộ sự kiện |
| Stitch project / screen | `10374042969343935993` / `30a2dc63c58b45aca620d1eff2b5a5ba` |
| Thiết kế | DESKTOP 2560 × 3100; HTML `16451943868441198875`, ảnh `2618257575618107449` |
| Route hiện có | `/admin/events`, hiện được xử lý bởi `Admin.tsx` qua `/admin/:tab` |
| Trạng thái | Review + lập kế hoạch; không chỉnh sửa Stitch hay mã nguồn |

## Thiết kế Stitch và tiêu chí triển khai

C8 là console giám sát sự kiện toàn hệ thống. Artifact có sidebar/header admin, tiêu đề, nút Xuất Báo Cáo/Duyệt Hàng Loạt/Khóa Khẩn Cấp; KPI tổng sự kiện, mở bán, hàng đợi, tạm ngưng và vé/check-in; tab trạng thái; tìm kiếm; lọc địa bàn/quy mô; bảng mã-tên/hợp đồng, BTC, danh mục, thời gian/địa điểm, vé, GMV, doanh thu, trạng thái/thao tác; cùng chỉ báo Socket.

Khi được yêu cầu triển khai: copy đúng artifact, tái sử dụng `AdminShell`, `AdminSidebar`, `AdminHeader`, và dùng `/organizer/events/:id` cho xem/sửa. TSX và CSS C8 đặt trong cùng một tệp. Chỉ bật chức năng có API thật; phần còn lại phải disabled/hiện “Chức năng đang phát triển”, không mock.

## Cosmic Graffiti

Artifact dùng nền/bề mặt `#0f1222`/`#181b2a`, tím `#7c3aed`, cyan `#5de6ff`/`#22d3ee`, hồng `#ffafd3`, Syne/Be Vietnam Pro/Space Grotesk: phù hợp Cosmic Graffiti. Giữ bảng compact, tương phản cao, glow tiết chế. Artifact desktop tĩnh nên responsive/a11y chưa thể PASS.

## Khoảng cách với code hiện tại

`client/src/pages/admin/Admin.tsx` chỉ có card tiêu đề/trạng thái/thời gian-địa điểm, link `/organizer/events/:id` và form review PENDING. Nó chưa dùng `AdminShell`; `/admin/events` cũng chưa thuộc `isAdminConsolePage` trong `App.tsx`.

| Hạng mục Stitch | Kết luận |
|---|---|
| Shell header/sidebar | Chưa đạt |
| KPI, bảng global, phân trang có tổng | Chưa đạt |
| Tab/tìm kiếm/lọc địa bàn/quy mô | Chưa đạt |
| BTC, hợp đồng, vé, GMV/doanh thu, check-in | Chưa đạt |
| Link xem/sửa `/organizer/events/:id` | Một phần; cần kiểm quyền ADMIN |
| Review một PENDING | Một phần; route có nhưng chưa mutation phiên này |
| Export, bulk review, lock/pause, realtime, analytics | Chưa đạt |

## API đã kiểm thử

Môi trường `http://localhost:8000/api`, 2026-11-03 21:21 UTC+07. Login `admin@example.test` HTTP 200, roles `USER, ADMIN`; token chỉ dùng GET.

| Endpoint | Kết quả | Phục vụ C8 |
|---|---|---|
| `GET /health` | 200 `{status:"ok"}` | Backend hoạt động |
| `GET /admin/events?page=0` | 200, 22 items; `id,title,status,slug,starts_at,ends_at,venue_name,category_id` | Danh sách cơ bản |
| `GET /admin/events?status=PENDING_REVIEW&page=0` | 200, 1 item | Lọc trạng thái duy nhất |
| GET không token | 401 | Guard hoạt động |
| `POST /admin/events/:id/review` | Route/schema `{approve,reason}` đã đối chiếu; không gọi | Cần test DB cô lập |

`server/src/app.ts` và `store.ts` cho thấy GET chỉ nhận `status`/`page`, limit 50 và không có total. Runtime sample có `organizer_id: null`.

## Phạm vi API đã chốt (cập nhật 2026-11-03)

Chỉ bổ sung API cho sáu nhu cầu: **KPI; doanh thu/vé/check-in; thông tin BTC; tìm kiếm/lọc đầy đủ; phân trang có tổng**. Loại khỏi phạm vi C8: xuất báo cáo, duyệt một/lô, khóa/tạm dừng/mở bán lại, audit cho các thao tác đó, Socket realtime và analytics action. Các nút/khối tương ứng trong artifact không được triển khai như chức năng hoạt động.

Các API phải tách theo trách nhiệm; không tạo một endpoint trả toàn bộ danh sách, KPI, BTC và metric vận hành trong cùng response.

| API đề xuất | Trách nhiệm duy nhất | Request / response tối thiểu |
|---|---|---|
| `GET /admin/events` (mở rộng route có sẵn) | Danh sách metadata và phân trang tổng | Query: `q,status,categoryId,cityCode,startsFrom,startsTo,ticketScale,page,limit`; response: `items` chỉ chứa metadata event (`id,title,slug,status,category_id,organizer_id,starts_at,ends_at,venue_name,city_code`) và `pagination {page,limit,total,totalPages}`. Không kèm KPI/BTC/metric. |
| `GET /admin/events/kpis` | KPI theo cùng bộ lọc | Query filter tương tự, không `page/limit`; response chỉ `total, selling, pendingReview, pausedOrCancelled`. |
| `GET /admin/events/metrics` | Tổng hợp vé, doanh thu và check-in cho các event đang hiển thị | Query `eventIds` (UUID lặp hoặc CSV có giới hạn); response map/array `eventId, ticketsIssued, ticketsSold, gmv, revenue, checkins, checkinRate`. Không kèm metadata/BTC. |
| `GET /admin/organizers/summaries` | Thông tin BTC theo `organizer_id` của trang hiện tại | Query `ids`; response `id, organizationName, contactName` và định danh công khai được phép hiển thị. Không kèm event/metric. |
| `GET /admin/events/filter-options` | Dữ liệu nguồn cho filter | Response chỉ category, city và bucket `ticketScale`; không kèm danh sách event hay KPI. |

`categoryId` phải dùng ID thực từ API category; `ticketScale` là enum backend định nghĩa rõ, không suy đoán từ nhãn Stitch. Hệ thống chỉ gọi `metrics` và `organizers/summaries` sau khi `GET /admin/events` trả page hiện tại; empty page không gọi batch endpoint. Tất cả endpoint mới/mở rộng phải ADMIN-only, validate UUID/query/giới hạn batch và được kiểm thử trên DB cô lập trước khi nối UI.

## Kế hoạch khi được yêu cầu triển khai

1. Chỉ xây dựng năm contract tách riêng ở mục phạm vi đã chốt; không triển khai các chức năng đã loại.
2. Kiểm thử từng endpoint độc lập trên DB cô lập: quyền ADMIN, validation query, filter, total pagination, batch metrics/BTC rỗng và nhiều ID.
3. Tạo C8 dùng shell admin và thêm route vào admin-console, không ảnh hưởng màn khác; gọi list trước, sau đó batch BTC/metric theo IDs hiện trên trang.
4. Detail/edit dùng route được yêu cầu; không đưa review, export, bulk, lock/pause, realtime hoặc analytics vào C8.
5. Thêm loading/empty/error/retry; kiểm ADMIN/non-admin, responsive, keyboard/screen reader và build/lint.

Kết quả review tổng thể: **KHÔNG ĐẠT** với frontend hiện tại. Stitch giữ nguyên. Chi tiết: [`../reports/stitch/C8_20261103_212105_review_plan.md`](../reports/stitch/C8_20261103_212105_review_plan.md).

## Kết quả triển khai — 2026-11-03 21:50 UTC+07

**Trạng thái: ĐÃ TRIỂN KHAI SOURCE — CHƯA ĐỦ BẰNG CHỨNG NGHIỆM THU.** C8 đã dùng `AdminShell`, nối `/admin/events`, tái hiện bảng Cosmic Graffiti và các nhu cầu trong scope; detail/edit dùng `/organizer/events/:id`. Không sửa Stitch, không thêm tính năng đã loại khỏi phạm vi.

Năm API riêng đã được thêm vào source: `GET /admin/events` (metadata + total pagination), `GET /admin/events/kpis`, `GET /admin/events/metrics?eventIds=...`, `GET /admin/organizers/summaries?ids=...`, `GET /admin/events/filter-options`. API được đặt dưới guard ADMIN. Search cover event title/slug/ID và BTC; filters có status, category, city, date và capacity bucket. Metrics trả số ticket rows không `VOID`, sold quantity từ inventory, GMV/doanh thu đơn `PAID`, check-in và rate. Summary BTC chỉ được tải riêng cho organizer IDs trên trang hiện tại.

Kiểm tra tại source: server build PASS; client build/lint PASS; module boundary PASS; backend suite 39 PASS/0 FAIL/18 SKIP; `git diff --check` PASS. Test API C8 đã được thêm trong `server/test/integration.test.cjs`, nhưng không chạy được vì môi trường thiếu `TEST_DATABASE_URL` (hậu tố DB yêu cầu `_test`). Chưa chạy browser/responsive/a11y với backend source mới; runtime container không được deploy hoặc kiểm API.

Giới hạn dữ liệu: schema không có mã hợp đồng; GMV và revenue cùng là tổng `total_amount` của đơn `PAID`, chưa có payout net để phân biệt. KPI vé/check-in trên đầu trang là tổng của trang hiện tại; bảng có metric từng event. Ngưỡng quy mô vé dựa trên tổng capacity ticket type chưa archive: `<1000`, `1000–3000`, `>3000`.

Report triển khai: [`../reports/stitch/C8_20261103_215000_implementation.md`](../reports/stitch/C8_20261103_215000_implementation.md). Report review và scope trước đó được giữ nguyên.

### Bổ sung điều tra lỗi metrics — 2026-11-03 22:15 UTC+07

Lỗi `INTERNAL` trên `GET /admin/events/metrics` do truy vấn source bắt đầu bằng CTE `WITH`; `assertOwned()` dùng `pgsql-ast-parser` và chỉ chấp nhận AST top-level `SELECT/INSERT/UPDATE/DELETE`, nên từ chối CTE bằng `Unsupported runtime SQL for order`. Source đã chuyển sang một `SELECT` với derived `VALUES` và aggregate subqueries; ownership regression test xác nhận dạng mới được chấp nhận (3/3 test pass). Container `pbl6-api-1` không mount source và artifact `dist` trong container vẫn chứa CTE cũ. Chưa rebuild/restart container, nên runtime có thể còn lỗi. Chi tiết: [`../reports/stitch/C8_20261103_221500_metrics_guard_fix.md`](../reports/stitch/C8_20261103_221500_metrics_guard_fix.md).

### Bổ sung dữ liệu metrics và progress bar — 2026-11-03 22:26 UTC+07

Đã thêm `ticketCapacity` vào metrics API; cột “Vé · check-in” hiển thị sold/capacity, số phát hành, số check-in và 2 progress bar riêng. Đã rebuild/recreate `api` từ source bằng Compose. Runtime verification: ADMIN login 200; list 200 (5 dòng); metrics 200 (5 metrics), mẫu có capacity 119/sold 9/issued 9/check-ins 3/revenue 95.000 VND. Smoke Chrome local 1440×900: 10 dòng, 20 progress bars, doanh thu và vé/check-in render dữ liệu; viewport 390×844 không tràn trang ngang (bảng cuộn riêng). Server/client build, lint, ownership 3/3, boundary check PASS. Chi tiết: [`../reports/stitch/C8_20261103_222600_metrics_ui_fix.md`](../reports/stitch/C8_20261103_222600_metrics_ui_fix.md).

### Tinh giản progress bar — 2026-11-03 22:32 UTC+07

Theo yêu cầu chỉ còn một progress bar tính `ticketsIssued / ticketCapacity`. Check-in vẫn hiển thị số và tỷ lệ, bỏ thanh riêng. Build/lint PASS; runtime Chrome desktop có 10 dòng/10 bar/0 check-in bar, viewport 390 không tràn ngang toàn trang. [`Report`](../reports/stitch/C8_20261103_223200_single_issued_progress.md).
