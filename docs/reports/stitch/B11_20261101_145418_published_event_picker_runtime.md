# B11 — Organizer Profile: nạp bộ lọc sự kiện vào API runtime

- Thời điểm: 2026-11-01 14:54:18 UTC+07. Hành động: điều tra nguyên nhân không có lựa chọn sau tìm kiếm và rollout route API cục bộ.
- Màn hình: B11, Organizer Profile, `/organizer/profile`; Stitch project `10374042969343935993`, official screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`.
- Yêu cầu: tìm trên toàn bộ sự kiện PUBLISHED theo tên, sáu sự kiện mỗi trang, giữ điều khiển chuyển trang.
- Nguyên nhân đã xác minh: file `/app/dist/app.js` trong `pbl6-api-1` trước rollout gọi `events.list` chỉ với `owner`, `limit`, `offset`, bỏ qua query `status` và `q`. `server/dist/app.js` mới truyền đủ hai tham số.
- Thao tác: sao lưu file runtime cũ tại `server/.local/b11-picker-runtime-backup-20261101_145340/app.js`; chép `server/dist/app.js` vào `/app/dist/app.js`; SHA-256 trong container khớp file source build (`B91B832B...BCF19CB8`); restart container API hiện có. Không build image hoặc thay container; không restart worker.
- Runtime sau rollout: container ID giữ nguyên `78bd1726...ac516`, image giữ nguyên `sha256:840f3944...c2cb002`, trạng thái `running healthy`; worker ID/trạng thái không đổi. `GET /api/health` trả 200. Route organizer chứa `status: query(req, "status")` và `q: query(req, "q")` trong file đang chạy. Request không token trả 401 theo middleware bảo vệ; chưa xác minh payload có token Organizer.
- Frontend: thay đổi EventPicker, debounce 300 ms, trạng thái tải/trống, và trang 1 khi sửa từ khóa đã được build thành công ở phiên trước. Bản build frontend chưa chép vào container; frontend dev server sẽ cần được dùng để xem source mới nếu trang đang mở từ bundle tĩnh của Docker.
- Stitch: màn hình chính thức được giữ nguyên; không thay đổi artifact.
- Kiểm tra: backend build PASS; client build PASS; hash route runtime khớp; health 200; worker không đổi. Chưa chạy browser và chưa có xác thực authenticated search.
- Kết luận: nguyên nhân runtime backend đã được khắc phục ở container local. Kết quả cuối cùng trên trình duyệt/tài khoản Organizer chưa được xác minh.
- Khôi phục: file `app.js` cũ được lưu trong đường dẫn backup trên; restart lại container sau khi chép ngược nếu cần.
