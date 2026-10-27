# Kế hoạch A3 — Chi tiết sự kiện & đặt vé

Cập nhật: 2026-10-27 19:34 (Asia/Ho_Chi_Minh). Frontend: **ĐẠT CÓ ĐIỀU KIỆN**; artifact Stitch: **KHÔNG ĐẠT**, hiệu chỉnh **BLOCKED**. [Báo cáo triển khai](../reports/stitch/A3_20261027_193458_frontend_implementation.md); [review trước](../reports/stitch/A3_20261027_144355_review.md).

## Nguồn và phạm vi

Project `10374042969343935993`, màn `fc8d79b4b6f14de19b6aa2f81e3380e6`, DESKTOP 2560×6086, “Chi tiết sự kiện & Đặt vé - Cosmic Sound Festival”. Ảnh và HTML đã đọc qua Stitch MCP. Master Plan ghi route `/events/:slug`, luồng chi tiết → chọn vé → tạo đơn → thanh toán; code hiện có cần đồng bộ. Cosmic Graffiti dùng nền tối, tím/cyan/hồng, Syne, Be Vietnam Pro và Space Grotesk.

Các phiên lập kế hoạch ban đầu chỉ sửa tài liệu. Người dùng đã yêu cầu triển khai frontend A3 và tích hợp backend trong phiên tiếp theo; giữ nguyên artifact Stitch, không gọi `edit_screens` và không tạo màn trùng. Kết quả triển khai và kiểm chứng được ghi trong nhật ký và report mới.

## Giao diện cần sao chép

Giữ header, hero ảnh sự kiện với thông tin và nút lưu/chia sẻ, lưới ảnh, giới thiệu, địa điểm và lưu ý; bảng chọn hạng vé và số lượng, tổng đơn, CTA, hỗ trợ và footer. Desktop có nội dung bên trái và bảng vé bên phải. HTML có breakpoint `lg`, nhưng mobile chưa được kiểm tra thực tế. Dữ liệu trên thiết kế là mẫu, không coi là dữ liệu thật.

## Điểm chưa đạt trước khi chỉnh sửa

1. Header/footer ghi “ENVENT HUB”, footer còn TicketHub, khác tên EventHub.
2. Tạm tính 499.000 đ nhưng tổng 449.100 đ, không có dòng giảm giá; script đặt giảm 10% dù phần coupon đã bị loại bỏ.
3. Script tham chiếu `btn-apply-coupon` và `summary-discount` không có trong HTML, có thể gây lỗi; cần kiểm tra runtime để xác nhận.
4. Ngày mẫu “Thứ Bảy, 25/11/2025” sai thứ; link bản đồ đến Google Maps chung. Email người nhận, đánh giá và tồn kho là dữ liệu mẫu chưa xác minh contract.
5. Tên sự kiện dùng Be Vietnam Pro trực tiếp thay vì Syne; token màu sinh ra khác một số mã mô tả trong designMd. Xem xét nhất quán, không tự ý thay đổi toàn bộ bố cục.
6. Link `#`, nút icon thiếu nhãn truy cập; loading, lỗi, rỗng, giới hạn vé, đăng nhập, chuyển tạo đơn, responsive, tương phản và bàn phím chưa được nghiệm thu.

## Quyết định sản phẩm và tính tổng tiền

- Dùng tên thương hiệu **EventHub** ở header, footer và nội dung chung khi tái tạo; sửa các tên mẫu không nhất quán theo yêu cầu mới.
- Theo xác nhận trong phiên triển khai: xóa đánh giá sao; nút yêu thích chỉ bật/tắt sáng bằng state frontend, không lưu database hoặc lưu qua lần tải trang; thay bộ ảnh bằng ảnh bìa; giữ quy định đồ uống/vật cấm và độ tuổi từ 16 thành nội dung chung frontend cho mọi sự kiện. Các nội dung này do người dùng yêu cầu, không phải trường backend.
- Bỏ giao diện và logic áp dụng mã giảm giá, gồm cả giảm giá 10% mẫu. Không gọi API mã giảm giá và không tự áp dụng phí, thuế hay khuyến mãi chưa được backend xác nhận.
- Backend là nguồn quyết định tổng thanh toán: `POST /api/orders` tính tổng từ giá loại vé trong backend nhân số lượng, kiểm tra điều kiện bán và tồn kho, tạo đơn và giữ vé; lấy `total_amount` của đơn làm số tiền chính thức, hiển thị ở bước checkout. Không gửi giá hoặc tổng tiền do client tính làm căn cứ thanh toán.
- Chưa thấy endpoint báo giá riêng trong route hiện tại. Trước khi tạo đơn, nếu cần hiển thị số tiền tức thời thì chỉ tính **tạm tính** từ `ticketTypes[].price_amount` API trả về và số lượng chọn; ghi rõ có thể thay đổi, không coi là tổng backend xác nhận. Không gọi tạo đơn mỗi lần đổi số lượng vì thao tác đó giữ chỗ. Nếu bắt buộc backend tính cả tổng xem trước, cần bổ sung hoặc xác minh API báo giá trong công việc backend riêng trước khi triển khai; phiên này không sửa backend.
- Xử lý chênh lệch giá/tồn kho và lỗi khi tạo đơn bằng thông báo rõ ràng, tải lại dữ liệu khi phù hợp; dùng `Idempotency-Key` cho thao tác tạo đơn, không phát hành QR trước thanh toán thành công.

## API cần thiết và bằng chứng mã nguồn

Các đường dẫn dưới đây có tiền tố `/api` theo `server/src/app.ts`. Bảng được lập từ mã nguồn; kết quả HTTP/runtime của phiên triển khai được ghi trong report mới nhất: chi tiết/danh mục/auth/create-order/order-detail/cancel trả 200; thanh toán chưa gọi. Refresh phiên sau reload trả 403 ORIGIN và còn cần xử lý cấu hình môi trường.

| API | Mục đích / dữ liệu liên quan | Quyền và lưu ý |
|---|---|---|
| `GET /api/events/:slug` | Lấy chi tiết sự kiện, organizer và `ticketTypes` chưa archived; giá, số lượng tồn và thời gian bán phục vụ lựa chọn. | Public; kiểm tra contract và dữ liệu thực tế trước tích hợp. |
| `GET /api/auth/me` | Xác định người dùng hiện tại cho luồng đặt vé và thông tin liên quan. | Cần xác thực; sử dụng cơ chế auth sẵn có. |
| `POST /api/orders` | Tạo đơn: `{ eventId, items: [{ ticketTypeId, quantity }] }`; backend tính và trả đơn có `total_amount`. | Cần xác thực và header `Idempotency-Key`; mỗi mục 1–10 vé, tổng tối đa 10, không lặp loại; tạo đơn giữ chỗ, có kiểm tra tồn kho và hàng chờ. |
| `GET /api/me/orders/:id` | Lấy đơn, items và thông tin payment để checkout hiển thị tổng backend. | Cần xác thực và quyền truy cập đơn; thuộc bước A6 tiếp theo. |
| `POST /api/orders/:id/payments` | Bắt đầu thanh toán đơn. | Cần xác thực; thuộc A6, kiểm tra provider và phản hồi trước tích hợp. |
| `POST /api/orders/:id/cancel` | Hủy đơn nếu người dùng chọn hủy trong luồng tiếp theo. | Cần xác thực; chỉ dùng khi có hành động hủy tương ứng. |

Nguồn: `server/src/app.ts`, `server/src/modules/order/public.ts`, `server/src/workflows/booking.ts`, `client/src/pages/booking/Checkout.tsx`. API hàng chờ, lưu/chia sẻ hoặc đánh giá không mặc định cần cho tổng tiền; xác minh riêng trước khi đưa vào phạm vi. Trước tích hợp phải thử API thật, kiểm tra status, contract, quyền, lỗi, trường hợp giá/tồn kho thay đổi và ghi bằng chứng; không dùng mock thay API thật.

## Các bước tiếp theo

1. Giữ màn A3 hiện có; cần phương thức cập nhật chính màn hình không dùng `edit_screens` hoặc hướng xử lý do người dùng chỉ định nếu chỉ có thể tạo bản trùng. Sau thay đổi phải đọc lại ảnh và HTML, đối chiếu các điểm trên và lập report mới.
2. Khi được yêu cầu triển khai sau này, khảo sát page, route và component chung; xác minh route, method, quyền, payload và hoạt động thực tế của API chi tiết sự kiện và tạo đơn trước khi tích hợp. Không giả định API đánh giá, yêu thích hoặc giảm giá đã tồn tại.
3. Sao chép bố cục và diện mạo artifact; dùng dữ liệu thật, không hard-code giá, tồn kho hoặc danh tính. Xác định hành vi chưa có contract trước khi thêm.
4. Kiểm tra desktop/mobile, bàn phím, nhãn icon, tương phản, loading/empty/error, số lượng, hết vé, tổng tiền, đăng nhập, tạo đơn và thanh toán; chạy build/lint và kiểm thử phù hợp khi có code. Chỉ hoàn thành khi có bằng chứng.
5. Mỗi phiên hoặc thao tác chỉnh sửa phải ghi vào file này, tạo report mới bất biến trong `docs/reports/stitch/` và cập nhật Master Plan.

## Nhật ký

- 2026-10-27 14:43: đọc Master Plan và skill; xem project, design system, screen, ảnh và HTML A3; lập kế hoạch và report. Không chỉnh Stitch hoặc code; không có kết quả hậu hiệu chỉnh.
- 2026-10-27 14:48: bổ sung quyết định EventHub, bỏ mã giảm giá, tổng chính thức do backend tính và danh sách API theo mã nguồn; [report](../reports/stitch/A3_20261027_144844_plan_update.md). Chưa kiểm thử API runtime hay chỉnh Stitch/code.
- 2026-10-27 19:34: triển khai EventDetail, EventTicketSelector và CSS A3; nối shared shell, tích hợp API thật, giữ tổng backend ở checkout. Thực hiện các điều chỉnh người dùng xác nhận; build/lint đạt, 7 trường hợp Playwright đạt sau chạy lại riêng luồng đăng nhập. Đã xem ảnh 1440/768/390; còn lỗi refresh 403 ORIGIN khi full reload và các tiêu chí ghi trong [report triển khai](../reports/stitch/A3_20261027_193458_frontend_implementation.md). Không sửa Stitch/backend.
