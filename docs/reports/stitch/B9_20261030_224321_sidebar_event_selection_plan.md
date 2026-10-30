# B9 — Bổ sung luồng chọn sự kiện từ sidebar

- **Màn hình:** B9 — Quét mã QR check-in.
- **Stitch:** project `10374042969343935993`, screen `d5ec1ed78e9d49e9922c75a3d768991f`. Không gọi Stitch trong phiên này; yêu cầu chỉ cập nhật kế hoạch.
- **Thời điểm:** 2026-10-30 22:43:21 UTC+07:00.
- **Hành động:** Cập nhật kế hoạch điều hướng; không chỉnh sửa frontend/backend.

## Yêu cầu và kiểm tra

Master Plan xác định trang quét QR theo sự kiện tại `/organizer/events/:id/checkin`. Kiểm tra source hiện tại cho thấy `OrganizerSidebar` chỉ tạo liên kết Quét mã QR khi có `id` trong route; tại trang tổng quan `/organizer`, mục này không có đích. `App.tsx` hiện khai báo route scanner theo event ID. Backend có `GET /organizer/events` để liệt kê sự kiện của organizer và `GET /checkin/events/:id` cho dữ liệu scanner.

Đây là kiểm tra tĩnh source, không gọi API runtime trong phiên này. Không xác minh lại giao diện Stitch hoặc browser vì phạm vi là bổ sung yêu cầu vào tài liệu.

## Bổ sung vào kế hoạch

Khi người dùng nhấn **Quét mã QR** từ sidebar mà chưa có ngữ cảnh sự kiện, mở một bộ chọn sự kiện lấy danh sách từ `GET /organizer/events?page=N`. Sau khi chọn một sự kiện, điều hướng tới `/organizer/events/{eventId}/checkin` để quét riêng sự kiện đó. Nếu sidebar đã nằm trong ngữ cảnh event hợp lệ, mục Quét mã QR tiếp tục mở trực tiếp scanner của event hiện tại.

Bộ chọn cần có loading, lỗi và thử lại, trạng thái rỗng, phân trang nếu cần, cùng kiểm tra quyền sở hữu/khả năng truy cập của sự kiện. Không tự chọn sự kiện mặc định, không dùng dữ liệu giả và không điều hướng nếu chưa chọn được ID hợp lệ. Các mục sidebar không có route vẫn giữ nguyên. Chi tiết giao diện bộ chọn có thể bám sidebar và Cosmic Graffiti; chưa quyết định route riêng vì luồng có thể được triển khai dưới dạng dialog từ sidebar.

## Trạng thái và vấn đề còn lại

- Plan cập nhật; chưa triển khai luồng chọn sự kiện trong source.
- `GET /organizer/events` đã có trong source nhưng chưa kiểm tra runtime trong phiên này.
- Việc chọn một event rồi đến route scanner hiện hữu là tiêu chí cần kiểm thử khi triển khai.
- Không đổi kết quả review/triển khai B9, không sửa Stitch, không sửa code.

## Master Plan

Đã thêm yêu cầu chọn event, nhắc trạng thái còn thiếu tại sidebar và liên kết tới báo cáo này trong mục B9. Kết quả triển khai B9 vẫn là `ĐẠT CÓ ĐIỀU KIỆN`; lựa chọn event từ sidebar chưa được triển khai.
