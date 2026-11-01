# B11 — Organizer Profile: tìm sự kiện đã xuất bản

- Thời điểm: 2026-11-01 14:41:36 UTC+07. Hành động: triển khai bộ lọc trạng thái, tìm kiếm tên sự kiện và phân trang trong EventPicker.
- Màn hình: B11, `OrganizerProfilePage`, `/organizer/profile`. Project Stitch: `10374042969343935993`; màn hình chính thức `f3ad3d9d0cf94e96b1a8a5e7bdc616ff` (DESKTOP 2560×4436).
- Yêu cầu: chỉ hiện sự kiện `PUBLISHED`; tìm trên toàn bộ sự kiện đã xuất bản của organizer; tối đa 6 mục/trang; giữ nút chuyển trang.
- Trạng thái ban đầu: mã frontend lấy 6 sự kiện rồi lọc trạng thái ở client. Backend route `/organizer/events` không truyền `status` hoặc `q` vào truy vấn. Thiết kế B11 chính thức đã có giao diện tìm kiếm và phân trang mẫu trong hộp mời nhân sự.
- Đã sửa frontend: thêm ô tìm kiếm có debounce 300 ms; gửi `status=PUBLISHED`, `q`, `page`, `limit=6`; reset về trang 1 và bỏ lựa chọn khi đổi từ khóa; giữ nút Trước/Sau dựa theo `total_results`; hiển thị trạng thái tải và không có kết quả; bỏ lọc trạng thái phía client.
- Đã sửa backend: route `GET /organizer/events` chuyển tiếp `status` và `q` tới `events.list`. Truy vấn hiện tại đã lọc theo organizer, trạng thái và tên trước `LIMIT/OFFSET`; `count(*) OVER()` cung cấp tổng số kết quả sau lọc. Các caller hiện tại không truyền tham số tiếp tục nhận hành vi cũ.
- API xác minh trước/sau tích hợp: `GET http://127.0.0.1:8000/api/health` trả HTTP 200. Route `/api/organizer/events?...` trả 401 khi không có token, xác nhận route được bảo vệ; chưa có phiên Organizer để xác minh kết quả dữ liệu authenticated.
- Stitch: đã đọc màn hình chính thức và thử `edit_screens` theo yêu cầu. Công cụ trả về preview ID `26881614faa1437faac82650ce8735f5`, có grid thẻ sự kiện thay cho native select và dữ liệu mẫu; ID này không xuất hiện trong `list_screens`, còn màn hình chính thức giữ nguyên. Không dùng preview làm thiết kế chuẩn và không tuyên bố đã cập nhật màn hình chính thức.
- Kiểm tra: `npm run build` trong `client/` PASS; `npm run build` trong `server/` PASS. Không chạy browser hoặc kiểm thử authenticated API.
- Tiêu chí: chỉ PUBLISHED từ backend — đã đảm bảo theo mã nguồn; tìm toàn bộ bản ghi trước phân trang — đã đảm bảo theo SQL hiện có và tham số được truyền; tối đa sáu mỗi trang/nút Sau theo tổng lọc — đã triển khai; browser/authenticated runtime — NOT_VERIFIED.
- Vấn đề còn lại: cần phiên Organizer để xác minh dữ liệu thực, tìm kiếm ở trang sau và hành vi browser. API sửa trong source chưa được rollout vào container đang chạy.
