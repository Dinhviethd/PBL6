# B9 — Làm rõ danh sách sự kiện và nút quét QR

- **Màn hình:** B9 — Quét mã QR check-in.
- **Stitch:** project `10374042969343935993`, screen `d5ec1ed78e9d49e9922c75a3d768991f`. Không gọi Stitch; phiên này chỉ cập nhật kế hoạch.
- **Thời điểm:** 2026-10-30 22:48:11 UTC+07:00.
- **Hành động:** Làm rõ UI chọn sự kiện khi vào từ sidebar ngoài ngữ cảnh sự kiện.

## Kiểm tra

Đã đọc `docs/PROJECT_MASTER_PLAN.md` trước khi sửa. Kiểm tra `EventDiscovery.tsx`: danh sách khám phá dùng từng event card riêng, có ảnh bìa, ngày, tên, địa điểm và CTA trong từng card. Kiểm tra `Organizer.tsx` và backend route: dashboard Organizer đã dùng `GET /organizer/events?page=N&limit=...`; API yêu cầu role ORGANIZER/ADMIN và giới hạn danh sách theo `userId` đang đăng nhập. Đây là xác minh tĩnh source; không gọi runtime API hay mở Stitch/browser trong phiên này.

## Yêu cầu đã chốt vào plan

Khi nhấn **Quét mã QR** ở sidebar mà chưa có event context, mở trang/list chọn sự kiện theo bố cục card riêng từng event, tham khảo component card trong `EventDiscovery` nhưng dùng dữ liệu `GET /organizer/events?page=N&limit=...` thay vì public discovery. Mỗi card cần thông tin nhận diện sự kiện phù hợp (ảnh bìa khi có, tên, ngày giờ, địa điểm) và nút **Quét mã** riêng đặt trong card. Nhấn nút của card nào thì điều hướng đúng tới `/organizer/events/{id}/checkin` của event đó. Card không điều hướng scanner chỉ bằng click vùng bất kỳ; CTA phải gắn rõ với event để tránh nhầm sự kiện.

Danh sách chỉ gồm các event API trả cho organizer hiện tại; không hard-code, không lấy dữ liệu public, không tự chọn event mặc định. Giữ loading/error/retry/empty, phân trang khi còn kết quả và kiểm tra quyền như endpoint/route hiện có. Nếu đã ở trong event context, Quét mã QR vẫn mở trực tiếp scanner event hiện tại. Các sidebar item không có route giữ nguyên. Chi tiết CSS/component cần bám Cosmic Graffiti và không thay đổi `EventDiscovery` hoặc B9 Stitch.

## Trạng thái

Plan được làm rõ; danh sách event cards và CTA theo từng event chưa triển khai. Không sửa source, không sửa Stitch, không thay đổi kết quả review/triển khai B9. API đã tìm thấy trong source nhưng chưa kiểm tra runtime trong phiên này.

## Master Plan

Cập nhật mục B9 để mô tả event cards lấy từ organizer API, nút quét riêng trên mỗi card và trạng thái chưa triển khai; cập nhật đường dẫn báo cáo và thời gian.
