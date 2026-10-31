# B6 — Hiển thị 10 đơn mỗi trang

- **Màn hình:** B6 — Quản lý đơn hàng (Organizer).
- **Stitch:** project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`; không sửa Stitch trong phiên này. Thay đổi số dòng bảng theo yêu cầu trực tiếp của người dùng.
- **Thời điểm:** 2026-10-31 13:18:51 UTC+7; chỉnh frontend và cập nhật tài liệu.
- **Yêu cầu hiện tại:** bảng B6 hiển thị tối đa 10 đơn trên tổng số đơn, có thể chuyển qua tất cả đơn sau lọc.
- **Trạng thái đầu:** API trả `pageSize=50`, frontend hiển thị toàn bộ 50 dòng và footer ghi 50. B6 đã có KPI, tab, bộ lọc và QR.

## Tiêu chí và kết quả

| Tiêu chí | Kết quả |
|---|---|
| 10 dòng/trang | `OrderManagerPage.tsx` chia mỗi lô API 50 đơn thành 5 trang hiển thị; render đúng lát cắt 10 đơn theo trang hiện tại. |
| Không bỏ sót đơn | Trang hiển thị 1–5 dùng lô API 0, trang 6–10 dùng lô API 1, v.v. Khi qua ranh giới 50 đơn, frontend đổi `page` gửi API; số trang hiển thị tính từ `pagination.total / 10`. |
| Tổng số đơn | Footer ghi tối đa 10 trên tổng `pagination.total` của nhóm và bộ lọc hiện hành; KPI/tabs vẫn dùng scope API như trước. |
| Lọc và sự kiện | Đổi tab, ngày, từ khóa vẫn reset trang về 1; đổi sự kiện remount B6; QR preview vẫn chọn đúng đơn. |
| API runtime | Không thêm/sửa API. `GET /api/organizer/events/:eventId/order-manager?page=0&group=all` trên Docker cổng 8000 trả 401 khi không token, xác nhận route và auth đang hoạt động. Payload có token trên Live không được kiểm trong phiên này. |
| Kiểm tra source | `npm run build` client PASS; ESLint `OrderManagerPage.tsx` PASS; `git diff --check` cho file TSX PASS. |

## Rà soát và giới hạn

- **Tuân thủ giao diện:** giữ bố cục Cosmic Graffiti và bảng B6; chỉ thay số dòng/trang cùng footer. Không thay đổi màn khác, backend hoặc Docker.
- **Đã giải quyết:** bảng không còn dồn 50 đơn vào một trang; điều hướng vẫn tiếp cận toàn bộ tập đơn theo `pagination.total`.
- **Còn tồn tại:** chưa chạy browser với tài khoản Organizer và dữ liệu Live sau thay đổi, nên 10 dòng, trang cuối và ranh giới 50 đơn chưa được quan sát end-to-end. API vẫn tải 50 đơn mỗi request; hiệu năng payload chưa được đo lại. Dữ liệu có thể đổi giữa hai request, như hành vi phân trang cũ.
- **Đánh giá:** triển khai frontend hoàn tất theo source/build/lint, nghiệm thu Live tiếp tục có điều kiện.
- **Tài liệu:** cập nhật B6 ở Master Plan mục 4, 5.2, 5.4 và 6.F; bổ sung nhật ký mục 14.7 trong `docs/ui/Feature_B6_OrderManager.md` để phân biệt 10 dòng UI với 50 dòng API.

