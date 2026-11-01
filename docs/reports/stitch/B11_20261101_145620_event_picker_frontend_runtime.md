# B11 — Organizer Profile: cập nhật bundle frontend local

- Thời điểm: 2026-11-01 14:56:20 UTC+07. Hành động: khắc phục frontend runtime cũ sau khi xác minh API route đã được cập nhật.
- Màn hình: B11 `/organizer/profile`, official Stitch screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff`; official artifact giữ nguyên.
- Phát hiện: `GET http://127.0.0.1:8000/` trả HTML tham chiếu `/assets/index-C3zdBPTt.js`; bundle đó không chứa `b11-event-search`. Vite dev server cổng 5173 không chạy.
- Thao tác: sao lưu HTML cũ vào `server/.local/b11-picker-runtime-backup-20261101_145340/public-index.html`; chép `client/dist/index.html` và `client/dist/assets/index-d1VL4koT.js` vào `/app/public`; giữ file bundle cũ trong container để rollback. Container API không cần restart lần nữa vì static middleware đọc index từ filesystem.
- Bằng chứng sau rollout: `GET /` trả 200, tham chiếu `/assets/index-d1VL4koT.js`; tải bundle qua HTTP xác nhận có `b11-event-search` và nhãn tìm kiếm. SHA-256 bundle trong container khớp client build: `E4C55B76...DD6370C6`. `/api/health` vẫn 200. Backend route đã cập nhật ở report `B11_20261101_145418_published_event_picker_runtime.md`.
- Trạng thái worker/container: API container giữ nguyên ID/image và healthy; worker không đổi. Không thay đổi database.
- Kiểm tra còn thiếu: không có phiên Organizer authenticated để xác minh danh sách kết quả thực; không chạy browser interaction test. Khi mở trang, cần tải lại cứng để bỏ bundle cũ trong cache.
- Kết luận: API và static frontend local hiện đều chứa thay đổi bộ chọn sự kiện. Kết quả tìm kiếm trên tài khoản thực và thao tác browser vẫn cần xác minh.
