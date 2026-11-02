# C6 — Báo cáo chỉnh khung bảng theo C2 (cuộn cả trang)

## 1. Màn hình

- Mã / tên: **C6 — Thẩm Định & Xét Duyệt Hồ Sơ Ban Tổ Chức** (route “Hồ sơ đăng ký BTC”).
- Stitch project: `10374042969343935993`; screen: `14785a10e0cf42c89d308996b8149813`.
- Trang triển khai: `client/src/pages/admin/C6Approve.tsx` tại `/admin/applications/review`.

## 2. Thời điểm & loại phiên

- Thời điểm: **2026-11-02 23:36:25 UTC+07**.
- Loại phiên: **Chỉnh sửa giao diện (layout correction)** theo yêu cầu người dùng: “thiết kế lại c6-table-card và c4-table-scroll, c4 table-head tương tự như c2-table-card cho phép scroll cả trang”.
- Không gọi `edit_screens`; artifact Stitch giữ nguyên.

## 3. Yêu cầu liên quan (Master Plan)

- C6 dùng `AdminShell`, giữ token Cosmic Graffiti, trang riêng `/admin/applications/review`.
- Không thay đổi nội dung/chức năng đã chốt (nhóm 1 hiển thị + toast, nhóm 2 đã loại bỏ, approve/reject dùng API thật).
- Yêu cầu mới: khung bảng giống C2 (`.c2-table-card` / `.c2-table-head` / `.c2-table-scroll`) và **toàn trang cuộn**, không khóa chiều cao viewport.

## 4. Trạng thái trước khi sửa

`.c6-page` dùng `height:calc(100vh - 80px)`, `overflow:hidden`, flex column; `.c6-table-scroll` có `max-height:55vh` và fallback `@media(max-width:900px),(max-height:760px)` — chỉ vùng bảng cuộn dọc, trang bị khóa. Khác C2 (trang chảy tự nhiên, cuộn cả trang).

## 5. Tiêu chí nghiệm thu

1. `.c6-page` không khóa chiều cao/overflow; tài liệu cuộn được khi nội dung dài.
2. Khung bảng giống C2: card bo 10px, viền `--line`, nền `--surface`, head flex space-between padding 15–18px, `.c6-table-scroll` chỉ `overflow:auto` (không max-height).
3. Bảng vẫn cuộn ngang trên mobile, không tràn ngang trang.
4. Không thay đổi nội dung, dữ liệu, API, hành vi approve/reject/toast.

## 6. Thao tác đã thực hiện

- `client/src/pages/admin/C6Approve.tsx` (CSS trong cùng file):
  - `.c6-page`: bỏ `height`, `overflow:hidden`, flex; thêm `box-sizing:border-box;width:100%;min-width:0;min-height:calc(100vh - 80px);padding:24px clamp(16px,2.5vw,40px) 26px`.
  - `.c6-table-card`: `overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)` (đồng bộ C2).
  - `.c6-table-head`: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line)`.
  - `.c6-table-scroll`: chỉ còn `overflow:auto`; bỏ `max-height:55vh`.
  - Xóa khối `@media(max-width:900px),(max-height:760px)` khóa chiều cao.
- Không sửa TSX/logic, không sửa API, không sửa Stitch.

## 7. Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` (client) | **PASS** — `tsc -b && vite build`, built in 6.84s (chỉ warning chunk >500 kB có sẵn). |
| ESLint `C6Approve.tsx` | **PASS** — exit 0, không lỗi/cảnh báo. |
| Playwright tạm `tests/c4-c6-page-scroll.spec.ts` (Chrome hệ thống, `localhost:5173`) | **PASS** — 1 test passed (25.4s), tổng 26.4s. |
| Desktop 1280×700 | `.c6-page` `overflow-y` khác `hidden`; `document.scrollHeight > innerHeight`; `.c6-table-scroll` chênh lệch cuộn dọc ≤ 1px (bảng không tự cuộn dọc). |
| Mobile 390×844 | `document.scrollWidth <= window.innerWidth` — không tràn ngang. |
| Ảnh chụp | `.local/qa/c6-page-scroll-desktop.png`, `.local/qa/c6-page-scroll-mobile.png` (đã xem, bố cục đúng). |
| File test tạm | Đã xóa `client/tests/c4-c6-page-scroll.spec.ts` và `client/test-results/.last-run.json` sau khi chạy. |

## 8. Danh sách rà soát

| # | Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Yêu cầu & nội dung | PASS | Chỉ đổi khung hiển thị; nội dung/chức năng giữ nguyên. |
| 2 | Bố cục | PASS | Card/head/scroll đồng bộ C2; trang cuộn tự nhiên. |
| 3 | Hệ thống thiết kế | PASS | Giữ token Cosmic Graffiti và `AdminShell`. |
| 4 | Ngôn ngữ & khả năng đọc | PASS | Không đổi nhãn; ảnh chụp không thấy cắt/tràn chữ. |
| 5 | Điều hướng & nghiệp vụ | PASS | Route/sidebar không đổi. |
| 6 | Trạng thái giao diện | NOT_VERIFIED | Phiên này chỉ kiểm dữ liệu thật; loading/empty/error không chạy lại. |
| 7 | Khả năng thích ứng & a11y | PARTIAL | Đã kiểm 1280×700 và 390×844; chưa kiểm 1440/1024/768, focus trap, screen reader. |
| 8 | Tính nhất quán | PASS | C4/C6 cùng khung C2. |

## 9. Tuân thủ Stitch

- Không gọi công cụ chỉnh sửa Stitch; artifact C6 giữ nguyên.
- Thay đổi chỉ ở CSS khung hiển thị trong code, không đổi bố cục nội dung so với thiết kế.

## 10. API đã xác minh

- Không thay đổi/không gọi mới API trong phiên này.
- Trang tải dữ liệu thật khi chạy Playwright: bảng 4 hồ sơ, KPI 1/2/1 hiển thị từ `GET /api/admin/organizer-applications` (đăng nhập `admin@example.test` thành công). Đây là bằng chứng gián tiếp endpoint hoạt động; không gọi `POST .../:id/review` để tránh đổi dữ liệu.

## 11. Vấn đề đã giải quyết

- C6 hết khóa chiều cao viewport; cuộn cả trang; khung bảng đồng bộ C2.
- Bảng vẫn cuộn ngang trong card trên mobile, không tràn trang.

## 12. Vấn đề còn tồn tại

- Chưa kiểm lại các trạng thái loading/empty/error sau thay đổi CSS.
- Chưa pixel-diff với ảnh Stitch (ảnh artifact vượt giới hạn đọc từ phiên trước).
- Chưa kiểm 1440/1024/768 và a11y đầy đủ.

## 13. Kết quả rà soát tổng thể

**ĐẠT CÓ ĐIỀU KIỆN** — yêu cầu layout đạt và có bằng chứng build/lint/browser; các mục chưa kiểm không chặn yêu cầu này.

## 14. Trạng thái cuối

ĐÃ TRIỂN KHAI CODE — khung bảng C6 theo C2, cuộn cả trang; build + eslint + Playwright PASS.

## 15. Trường cập nhật trong Master Plan

- Header “Ngày cập nhật gần nhất”.
- Bảng 5.3/5.4 dòng C6, Ghi chú 6.F — C6.
- Liên kết báo cáo này và thời điểm 23:36 UTC+07.

## 16. Giới hạn

- Ảnh Stitch C6 chưa xem trực tiếp được (dung lượng lớn) nên không pixel-diff.
- Playwright dùng Chrome cài sẵn (`channel: "chrome"`) do tải chromium lỗi mạng.
