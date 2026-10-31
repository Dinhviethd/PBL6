# B11 — Điều chỉnh dùng organizer_applications và event_checkin_staff

Thời điểm: **2026-10-31 16:30:45 UTC+7**. Project10374042969343935993, screen f3ad3d9d0cf94e96b1a8a5e7bdc616ff, Hồ sơ Ban Tổ Chức. Hành động: rà soát kiến trúc/điều chỉnh source theo yêu cầu dùng lại DB.

Đã đọc Master Plan trước khi thực hiện. Người dùng yêu cầu ưu tiên bảng/logic có sẵn, không thay DB khi không thực sự cần; bổ sung trường phải xác nhận. Người dùng cũng đã trả lời **chưa áp dụng Supabase, giữ source để xem trước** cho đề nghị ba bảng của phiên cũ. Không coi đề nghị cũ là còn được phép áp dụng.

## Kiểm tra đã thực hiện

- Đọc route/service Auth, schema organizer_applications và unique index APPROVED/PENDING; event staff migration/logic hiện có; source B11 và proposal trước.
- SELECT metadata cột và status counts trên Supabase qua API container: organizer_applications có đủ phần lớn11trường; APPROVED1/REJECTED1; không application cho organizer@example.test. Không lấy thông tin nhận dạng của chủ hồ sơ khác hoặc ghép application vào tài khoản test.
- Xác nhận event_checkin_staff có đầy đủ vòng đời invitation/grant. Không cần membership/lời mời cấp tổ chức độc lập để phục vụ phạm vi check-in đã chốt.
- Tạo [phương án bảng hiện có](../../ui/B11_ExistingTablesPlan.md). Rút phương án ba bảng khỏi triển khai; chỉ đề xuất4cột còn thiếu trên application, chưa tạo/chạy DDL.
- Không gọi công cụ chỉnh sửa Stitch; thiết kế và sidebar chung tiếp tục là nguồn chuẩn, team chỉ check-in theo xác nhận trước.

## Tiêu chí và trạng thái

| Tiêu chí | Kết quả tại khảo sát |
|---|---|
| Tái sử dụng schema/nghiệp vụ | PASS về khả năng: application/staff đã có; source cũ phải refactor |
| Nguồn hồ sơ đúng chủ | PASS xác minh đọc; tài khoản test thiếu application, không tự tạo |
| Các phần cần thêm trường | NOT_VERIFIED/chờ xác nhận4cột |
| UI/backend sau refactor | NOT_VERIFIED, chưa kiểm lại; kết quả90HTTP/Chrome của source cũ không được dùng chứng minh source mới |
| Stitch/Cosmic | Giữ nguyên artifact; chưa review hình mới |
| Responsive/accessibility mới | NOT_VERIFIED |

Kết luận hiện tại: **ĐANG ĐIỀU CHỈNH source; KHÔNG ÁP DỤNG DB; chờ xác nhận trường bổ sung**. Các thay đổi triển khai/test và Master Plan tiếp theo sẽ ghi nối vào report này. Không ghi đè các report trước.
