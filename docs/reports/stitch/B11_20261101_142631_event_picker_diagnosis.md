# B11 — Organizer Profile: chẩn đoán danh sách chọn sự kiện

- Thời điểm: 2026-11-01 14:26:31 UTC+07; loại phiên: rà soát mã nguồn theo câu hỏi của người dùng.
- Stitch: dự án `10374042969343935993`, màn hình `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`; không truy cập hoặc chỉnh sửa artifact trong phiên này. Trạng thái thiết kế giữ nguyên như Master Plan.
- Yêu cầu liên quan: B11 `/organizer/profile`, chọn sự kiện để gửi lời mời check-in. Tiêu chí: xác định nguồn giới hạn sáu sự kiện và điều kiện hiển thị.
- Đã kiểm tra `EventPicker` trong `client/src/pages/organizer/OrganizerProfilePage.tsx`, `useLoad` trong `client/src/features/ticketing/data.ts`, route `GET /organizer/events` trong `server/src/app.ts`, và truy vấn trong `server/src/modules/event/infrastructure/store.ts`.
- Kết quả: frontend gọi `GET /organizer/events?page=${page}&limit=6`; backend áp dụng `LIMIT 6 OFFSET page*6`. `useLoad` thay dữ liệu theo URL, không gộp các trang. `<select>` hiển thị riêng trang đang chọn; nút `Trước`/`Sau` đổi trang. Lọc `CANCELLED`/`ARCHIVED` được áp dụng sau khi backend phân trang, nên một trang có thể còn dưới sáu lựa chọn. `total_results` đếm toàn bộ sự kiện của organizer trước lọc trạng thái tại frontend.
- API xác minh ở mức mã nguồn: `GET /organizer/events`, role `ORGANIZER`/`ADMIN`, `limit` hợp lệ 1–100. Chưa gọi HTTP runtime hoặc xác minh dữ liệu tài khoản thực tế trong phiên này.
- Không chỉnh sửa mã nguồn, API hoặc Stitch; không chạy build/test vì chỉ giải thích hành vi hiện có. Không thay đổi trạng thái review thiết kế đã ghi trước đó.
- Vấn đề còn tồn tại: dropdown chỉ chứa tối đa sáu mục trên mỗi trang; phân trang trước lọc có thể làm trang ít mục hoặc trống. Nếu muốn hiện toàn bộ, cần thay đổi cách tải/phân trang và xử lý trạng thái hợp lệ.
- Master Plan: bổ sung chẩn đoán B11 và tham chiếu báo cáo này ở mục 5.2 và 5.4; các đánh giá runtime trước đây giữ nguyên. Tiêu chí chưa xác minh: số sự kiện cụ thể trong DB và hành vi browser authenticated hiện tại.
