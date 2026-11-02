# C4 — Báo cáo chỉnh khung bảng theo C2 (cuộn cả trang)

## 1. Màn hình

- Mã / tên: **C4 — Quản lý Ban Tổ Chức** (route `/admin/applications`).
- Stitch project: `10374042969343935993`; screen: `49d8174a88b542969b1985afb3e70bd4` (kèm C5/C6 cùng nhóm).
- Trang triển khai: `client/src/pages/admin/C4ManagerOrganizer.tsx`.

## 2. Thời điểm & loại phiên

- Thời điểm: **2026-11-02 23:36:25 UTC+07**.
- Loại phiên: **Chỉnh sửa giao diện (layout correction)** theo yêu cầu: “thiết kế lại c6-table-card và c4-table-scroll, c4 table-head tương tự như c2-table-card cho phép scroll cả trang”.
- Không gọi `edit_screens`; artifact Stitch giữ nguyên.

## 3. Yêu cầu liên quan (Master Plan)

- C4 dùng `AdminShell`, token Cosmic Graffiti; `GET /admin/organizer-applications` envelope `{items,pagination,stats}` + `gmv`; approve/reject inline.
- Yêu cầu mới: `.c4-table-card` / `.c4-table-head` / `.c4-table-scroll` giống C2 và **toàn trang cuộn**, bỏ khóa chiều cao viewport.

## 4. Trạng thái trước khi sửa

`.c4-page` dùng `height:calc(100vh - 80px)`, `overflow:hidden`, flex column; `.c4-table-scroll` có `max-height:55vh`; fallback `@media(max-width:900px),(max-height:760px)`. Trang bị khóa, chỉ vùng bảng cuộn dọc.

## 5. Tiêu chí nghiệm thu

1. `.c4-page` chảy tự nhiên, tài liệu cuộn được khi nội dung dài.
2. Khung bảng đồng bộ C2: card bo 10px, viền `--line`, nền `--surface`; head flex space-between padding 15–18px; `.c4-table-scroll` chỉ `overflow:auto`, không max-height.
3. Bảng cuộn ngang trong card trên mobile, không tràn ngang trang.
4. Không đổi nội dung, dữ liệu, API, hành vi lọc/tìm/phân trang/review.

## 6. Thao tác đã thực hiện

- `client/src/pages/admin/C4ManagerOrganizer.tsx` (CSS trong cùng file):
  - `.c4-page`: bỏ `height`, `overflow:hidden`, flex; thêm `box-sizing:border-box;width:100%;min-width:0;min-height:calc(100vh - 80px);padding:24px clamp(16px,2.5vw,40px) 26px`.
  - `.c4-table-card`: `overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)`.
  - `.c4-table-head`: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line)`.
  - `.c4-table-scroll`: chỉ còn `overflow:auto`; bỏ `max-height:55vh`.
  - Xóa khối `@media(max-width:900px),(max-height:760px)` khóa chiều cao.
- Không sửa TSX/logic, API backend, hay Stitch.

## 7. Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` (client) | **PASS** — built in 6.84s (warning chunk >500 kB có sẵn). |
| ESLint `C4ManagerOrganizer.tsx` | **PASS** — exit 0. |
| Playwright tạm `tests/c4-c6-page-scroll.spec.ts` (Chrome hệ thống, `localhost:5173`) | **PASS** — 1 test passed (25.4s). |
| Desktop 1280×700 | `.c4-page` `overflow-y` khác `hidden`; `document.scrollHeight > innerHeight`; `.c4-table-scroll` không có chênh lệch cuộn dọc (≤1px). |
| Mobile 390×844 | `document.scrollWidth <= window.innerWidth` — không tràn ngang. |
| Ảnh chụp | `.local/qa/c4-page-scroll-desktop.png`, `.local/qa/c4-page-scroll-mobile.png` (đã xem, bảng 4 dòng dữ liệu thật). |
| File test tạm | Đã xóa sau khi chạy (không để lại spec/artifact). |

## 8. Danh sách rà soát

| # | Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Yêu cầu & nội dung | PASS | Chỉ đổi khung; nội dung/chức năng giữ nguyên. |
| 2 | Bố cục | PASS | Card/head/scroll đồng bộ C2; trang cuộn tự nhiên. |
| 3 | Hệ thống thiết kế | PASS | Giữ token Cosmic Graffiti và `AdminShell`. |
| 4 | Ngôn ngữ & khả năng đọc | PASS | Không đổi nhãn; ảnh chụp không cắt/tràn chữ. |
| 5 | Điều hướng & nghiệp vụ | PASS | Route `/admin/applications` và sidebar không đổi. |
| 6 | Trạng thái giao diện | NOT_VERIFIED | Chưa chạy lại loading/empty/error sau đổi CSS. |
| 7 | Khả năng thích ứng & a11y | PARTIAL | Đã kiểm 1280×700 và 390×844; chưa 1440/1024/768, focus, screen reader. |
| 8 | Tính nhất quán | PASS | C4/C6 cùng khung C2. |

## 9. Tuân thủ Stitch

- Không chỉnh artifact Stitch; chỉ đổi CSS khung hiển thị trong code.

## 10. API đã xác minh

- Không thay đổi/không gọi mới API trong phiên này.
- Khi chạy Playwright, trang C4 tải 4 hồ sơ và KPI 4/2/1 từ `GET /api/admin/organizer-applications` (dữ liệu thật, tài khoản `admin@example.test`) — xác nhận endpoint hoạt động ở runtime trình duyệt.
- `POST .../:id/review` không gọi (tránh thay đổi dữ liệu dùng chung). Bằng chứng 11/11 kiểm thử HTTP trước đó trên DB tạm vẫn giữ nguyên trong báo cáo triển khai.

## 11. Vấn đề đã giải quyết

- C4 hết khóa chiều cao viewport; cuộn cả trang; khung bảng đồng bộ C2.
- Bảng vẫn cuộn ngang trong card trên mobile.

## 12. Vấn đề còn tồn tại

- Chưa kiểm lại loading/empty/error sau thay đổi CSS.
- Chưa pixel-diff với ảnh Stitch C4 (ảnh artifact lớn, chưa xem trực tiếp).
- Chưa kiểm 1440/1024/768 và a11y đầy đủ.

## 13. Kết quả rà soát tổng thể

**ĐẠT CÓ ĐIỀU KIỆN** — yêu cầu layout đạt và có bằng chứng build/lint/browser.

## 14. Trạng thái cuối

ĐÃ TRIỂN KHAI CODE — khung bảng C4 theo C2, cuộn cả trang; build + eslint + Playwright PASS.

## 15. Trường cập nhật trong Master Plan

- Header “Ngày cập nhật gần nhất”.
- Bảng 5.3/5.4 dòng C4, Ghi chú 6.F — C4.
- Liên kết báo cáo này và thời điểm 23:36 UTC+07.

## 16. Giới hạn

- Playwright dùng Chrome cài sẵn; chromium tải lỗi mạng.
- Phiên này không kiểm API mutation (giữ dữ liệu dùng chung).
