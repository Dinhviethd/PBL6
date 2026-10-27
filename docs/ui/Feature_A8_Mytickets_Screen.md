# Kế hoạch A8 — Vé của tôi & thẻ QR check-in

Cập nhật 2026-10-28 00:59, giờ Việt Nam. Đây là kế hoạch, chưa triển khai. Phiên làm việc và kế hoạch chỉ tập trung thiết kế màn hình A8 — Vé của tôi & thẻ QR check-in; A6 là màn hình khác, không liên quan đến phiên này.

## Nguồn và phạm vi

- Stitch project `10374042969343935993`, screen `4ff75d38004140409e70cd99de7e1432`, DESKTOP 2560×5324; HTML file `11005173468658712969`, ảnh file `12860080206984097624`. Giữ nguyên artifact; dùng ảnh và HTML làm tham chiếu.
- Các route `/tickets`, `/tickets/:id`; dùng lại `AuthHeader` và `AuthFooter` chung. Hai route hiện chưa thuộc `usesSharedHomeShell` trong `App.tsx`.
- [Báo cáo cập nhật kế hoạch](../reports/stitch/A8_20261028_005904_plan_update.md); [báo cáo review trước](../reports/stitch/A8_20261028_005242_review.md).

## Chênh lệch và vấn đề

1. `MyTickets.tsx` chỉ có tiêu đề, lưới link với icon, trạng thái, tên sự kiện, loại vé, mã và phân trang; thiếu tổng quan, tab trạng thái, vé nổi bật với QR, các thẻ phụ và hướng dẫn ba bước như Stitch. `TicketPage.tsx` hiển thị QR riêng cùng tên, hạng, trạng thái và mã.
2. Kiểu `Ticket`/`TicketDetail` hiện không khai báo thời gian, địa điểm, cổng và đặc quyền được minh họa trong Stitch. Cần kiểm tra response và hợp đồng thực tế trước khi ánh xạ; chưa kết luận backend thiếu dữ liệu.
3. HTML Stitch có đồng hồ đếm ngược lặp lại và SVG mô phỏng QR. Các khẳng định QR động, SHA-256, tốc độ quét, RFID, thông tin cá nhân và liên hệ, cùng thao tác PDF/Wallet/email/chuyển nhượng/VAT chưa có bằng chứng hỗ trợ. Không đưa dữ liệu mẫu hoặc cam kết chưa xác minh thành chức năng thật; xác nhận phương án xử lý xung đột trước khi thay đổi thiết kế hay nội dung. Với Wallet, email, chuyển nhượng và VAT, giữ các nút trong thiết kế; khi người dùng nhấn, hiển thị thông báo “Chức năng đang trong quá trình phát triển”. Đây là hành vi thông báo, chưa thực hiện nghiệp vụ tương ứng. PDF vẫn cần xác minh riêng.
4. Ảnh desktop cho thấy vùng QR xuống dưới phần thông tin và để trống phần lớn bên phải; HTML dùng grid 12 cột với 7 + phần tử nối + 5. Cần xác nhận cách xử lý trước khi sửa thiết kế; không tự chỉnh Stitch.
5. Artifact có màu tối, tím/cyan/hồng theo Cosmic Graffiti; HTML khai báo Syne cho headline nhưng không tải font Syne, ảnh thể hiện chữ serif và nhãn bị ngắt dòng. Logo/footer viết ENVENTHUB/Cosmic Ticket; theo yêu cầu sử dụng shell EventHub chung. Chưa đo tương phản hoặc kiểm chứng font runtime.

## Trình tự thực hiện sau khi được giao triển khai

1. Xác nhận phạm vi A8 và các điểm mâu thuẫn; giữ artifact gốc, không gọi `edit_screens`, không tạo bản trùng. Thống nhất phương án cho vùng QR bị lệch và nội dung mẫu.
2. Kiểm tra route, guard và shell; dùng `AuthHeader`/`AuthFooter` chung, tránh lặp và giữ điều hướng hiện có.
3. Trước tích hợp, kiểm tra route/controller/service, quyền, request/response `GET /api/me/tickets?page=…` và `GET /api/me/tickets/:id`; gọi thật với tài khoản có quyền, ghi status và response đã loại dữ liệu nhạy cảm. Xác minh phân trang, trạng thái, QR và metadata; nếu thiếu bằng chứng ghi BLOCKED, không hard-code.
4. Ánh xạ bố cục và token từ artifact: tổng quan, tab, vé nổi bật, metadata, QR, vé khác và hướng dẫn; xử lý dữ liệu thiếu theo phương án được xác nhận. Wallet, email, chuyển nhượng và VAT cho phép nhấn để hiển thị thông báo đang phát triển; các hành động nghiệp vụ thật chỉ triển khai khi API và nghiệp vụ hỗ trợ. Không dựng QR giả.
5. Kiểm thử vé hợp lệ/đã check-in/đã hủy, loading/empty/error, phân trang, quyền sở hữu và scan QR thật; kiểm tra desktop/tablet/mobile, bàn phím, focus và tương phản. Chạy build và kiểm thử phù hợp sau khi sửa mã.
6. Tạo report mới và cập nhật A8 trong Master Plan với bằng chứng; không kết luận đạt từ ảnh tĩnh.

## Tiêu chí nghiệm thu

Bố cục đối chiếu Stitch và các ngoại lệ được xác nhận; shell chung hoạt động; dữ liệu và QR đến từ API hoạt động thực tế; nhấn từng nút Wallet, email, chuyển nhượng và VAT hiển thị “Chức năng đang trong quá trình phát triển”, không thực hiện nghiệp vụ tương ứng; trạng thái, điều hướng, responsive và accessibility được kiểm chứng; build và kiểm thử liên quan đạt. Nội dung mẫu, chức năng và khả năng scan chưa được xác minh trong phiên lập kế hoạch.
