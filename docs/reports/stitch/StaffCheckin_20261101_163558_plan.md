# StaffCheckin — Lập kế hoạch thiết kế lại

- Thời điểm: 2026-11-01 16:35:58 UTC+07; hành động: review source và lập plan.
- Trang: `/checkin/events/:id`, trang con luồng A13; chưa có mã Stitch riêng được xác minh.
- Project: `10374042969343935993`; list_screens truy cập thành công. B9 trả ID `fe0cb469487e4ae0ac3be48de65c375b`, khác ID cũ trong Master Plan. Chưa xem ảnh/HTML mới, không sửa mapping B9.
- Yêu cầu Master Plan: quyền đúng sự kiện, chống quét trùng, giữ nghiệp vụ; user yêu cầu dùng giao diện organizer và header/footer user.
- Ban đầu: StaffCheckin dùng Scanner cũ, chưa thuộc shared home shell; organizer có layout và thẻ kết quả đầy đủ.
- Đã làm: đọc skill, Master Plan, A13/B9 plans, hai page, scanner, CSS, App, GET/POST routes và checkinGuard; hỏi và nhận xác nhận phạm vi từ user; tạo kế hoạch.
- Đã chốt: đầy đủ tên khách/hạng vé/mã vé/thời điểm; camera/nhập mã/kết quả; không thêm thống kê/lịch sử.
- API đã kiểm source: GET `/api/checkin/events/:id`, POST `/api/checkin/events/:id/checkins`; guard staff ACTIVE/chủ organizer/admin. Chưa gọi runtime trong phiên, chưa xác minh authenticated response mới.
- Tiêu chí và checklist: layout/shell/điều hướng đã lập phương án; phân quyền/luồng và camera đã lập test matrix; responsive/accessibility/runtime/build chưa chạy vì chưa triển khai.
- Sai lệch được yêu cầu: dùng shell user thay organizer; quay lại danh sách phân công. Không thay artifact Stitch.
- Kết quả: PLAN READY, chưa nghiệm thu UI hoặc tích hợp; thiết kế nguồn và code không thay đổi.
- Tồn tại: ID B9 trong danh sách mới khác tài liệu cũ; cần đối chiếu artifact khi triển khai; camera thật và API runtime còn kiểm.
- Master Plan: thêm ghi chú trang con StaffCheckin, liên kết kế hoạch/báo cáo; không nâng trạng thái A13 danh sách hoặc B9.
- Kế hoạch và nghiệm thu đầy đủ: [Feature_StaffCheckin_Redesign.md](../../ui/Feature_StaffCheckin_Redesign.md).
