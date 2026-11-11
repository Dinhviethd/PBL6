# EventHub — bổ sung icon và hiệu chỉnh trải nghiệm mobile

Thời điểm: 2026-11-11 19:08:22 UTC+07. Kết quả: ĐÃ TRIỂN KHAI SOURCE, web/API regression đạt; Android emulator đã chạy bản APK mới và xác minh một số tương tác. ĐẠT CÓ ĐIỀU KIỆN; chưa nghiệm thu toàn bộ37màn, iOS hoặc điện thoại vật lý.

## Yêu cầu và kế hoạch

Người dùng gọi appllama-app-design-skill và yêu cầu thêm icon, tham khảo ứng dụng có sẵn, tùy chỉnh mobile giống ứng dụng thực sự. Đây là quyền điều chỉnh presentation mobile; luồng/API/nghiệp vụ/quyền hiện có tiếp tục giữ nguyên. Kế hoạch trước sửa: [native polish plan](MOBILE_20261111_184609_native_polish_plan.md).

Đã đọc Master Plan, mobile/AGENTS.md và áp dụng appllama-app-design-skill cùng eventhub-stitch-review. Repo vốn có nhiều thay đổi chưa commit; không hoàn tác code có sẵn. Không chỉnh artifact Stitch, backend, API client hoặc dependencies/config của app.

## Nghiên cứu ứng dụng và nguồn Stitch

Nguồn chính thức đã mở và ảnh đã tải/xem:
- [Eventbrite app](https://www.eventbrite.com/consumer/eventbrite-app/): discovery và ticket wallet. Pattern áp dụng: bốn tab rõ mục đích, thông tin thẻ dễ quét, ví vé có CTA mở vé, menu tài khoản có nhóm.
- [Ticketmaster Mobile Tickets](https://www.ticketmaster.com/mobile-tickets): tham khảo cách truy cập vé từ tài khoản và hướng dẫn mở vé ở điện thoại; không sao chép tính năng transfer/wallet/offline/barcode động vào EventHub.
- Ba ảnh tham khảo lưu ở .local/mobile-native-polish/reference-*.png; không chép hình/brand đối thủ vào sản phẩm. DICE trả403, không tính là đã xem app đó. Không có Appllama MCP; không đạt tiêu chí nghiên cứu10+ảnh cho mỗi loại màn của skill.

Stitch chính thức10374042969343935993. A1/A2/A4 ảnh/HTML đã xem ở phiên trước, tiếp tục dùng cùng hệ Cosmic Graffiti. Phiên này get_screen và download_file:

| Màn | Screen ID | Ảnh đã tải và xem | Kết quả |
|---|---|---|---|
| A8 — Vé của tôi & thẻ QR |4ff75d38004140409e70cd99de7e1432|12860080206984097624|Giữ dữ liệu/QR/trạng thái, thêm icon và card mobile; web PASS, native ví vé authenticated chưa kiểm lại|
| A9 — Lịch sử đơn hàng |4c62fed99aea4822ab345033e5d95dba|12724823235326917199|Giữ search/filter/KPI/route; icon calendar/search/file-text và CTA gọn; local API/UI PASS|
| A10 — Hồ sơ cá nhân |2ffc6d2afffe4e98928685030e86b1c8|16117180421929131284|Icon user/phone/camera/check theo pattern form; profile/avatar local regression PASS|

Tài khoản tab là route phụ liên quan A10/A9/A12/A13. Giữ body Be Vietnam Pro, nền#080B1A/surface#10162B, tím#7C3AED và hệ cyan/hồng hiện có. Một họ Feather vì tab/home/password hiện dùng Feather, tránh thêm họ icon hoặc dependency mới. Đây là lựa chọn giữ nhất quán repo, không tuyên bố đã chuyển sang SF Symbols/Material Symbols. Không thêm theme light vì app đang dark-only theo thiết kế EventHub.

## Thay đổi theo phạm vi

| Khu vực | Thay đổi | Điều được bảo toàn |
|---|---|---|
| Shared UI |AppIcon/IconBadge, MenuRow, EmptyState, InfoLine; icon tùy chọn cho Button/Field, icon notice; borderCurve continuous, nhãn co theo chiều rộng|Nhãn trợ năng, disabled/onPress/value/onChange, token màu/font|
| A1 — Trang chủ |Hero ngắn hơn, hierarchy trái trên phone, CTA cạnh nhau và xếp dọc khi font lớn; icon radio/grid/calendar/shield/briefcase thay ký tự trang trí|Đủ section, CTA, bộ lọc và route cũ|
| Tab tài khoản |Avatar/fallback chữ đầu từ dữ liệu thật; nhóm Cá nhân/Công việc bằng hàng icon+nhãn+chevron; đăng xuất riêng|Mọi đích điều hướng, quyền ORGANIZER/ADMIN, logout và busy/error|
| A4/A11, bảo mật tài khoản |Icon login/register/mail/lock/help; icon đứng trước nội dung input|Validation, autocomplete, secureTextEntry, OTP, next và xác thực|
| A8 — Ví vé |Icon tag/type/QR, empty state; mã selectable/tabular; nhãn hiển thị Mở vé|Accessible label vẫn Mở vé + mã đầy đủ; mở đúng ticket ID, phân trang/trạng thái|
| A9 — Đơn hàng |Icon search/calendar/file-text/tag, số tiền tabular; nhãn hiển thị Xem đơn hàng|Accessible label vẫn Xem đơn + mã; dữ liệu tiền/vé/filter/pagination/route|
| A10 — Profile |Icon camera/user/phone/check|API lưu/upload/email read-only và thông báo|
| A12 — Thông báo |Icon theo kind, dòng thời gian/CTA, empty state|Mark read/all, polling30s, unread và target route|
| A13 — Phân công |Icon refresh/check/x|Điều kiện lời mời, quyền, response và trạng thái|
| Booking và BTC/Admin dùng chung |Icon ba bước, search/filter/date/detail, sheet scroll/safe area|Transaction, nút/đường dẫn/endpoint và quyền không đổi|

Các lỗi thấy khi xem ảnh đã được xử lý tiếp:
- Ở320px, mã vé dài từng tràn nút/thẻ. CTA rút gọn phần nhìn; mã giữ đầy đủ trong dữ liệu/nhãn trợ năng, thẻ danh sách ellipsize; ảnh sau đã xem không tràn.
- Hai CTA hero trên Android từng đưa icon sang dòng riêng. Bỏ flexWrap của HomeButton, cho nhãn flexShrink/minWidth0; build lại APK và xem ảnh native mới.

Không dùng icon trang trí thay thế nhãn quan trọng; icon bên trong control đặt accessible=false/aria-hidden để không tạo nhãn đọc lặp. Không thêm nhãn trạng thái giả, API giả hoặc dữ liệu nghiệp vụ hard-code.

## Kiểm tra thực tế

| Lớp | Kết quả | Phạm vi |
|---|---|---|
| Mobile typecheck/lint |PASS|Source cuối; log trong evidence|
| Mobile unit |34/34PASS|Auth/session/payment/filter/date/document; chạy trong phiên|
| Web export |PASS|Bundle cuối phục vụ kiểm tra giao diện|
| UI fixture/mock hiện có |19/19PASS|Home320–768, filter/calendar/landscape thấp, notifications, booking retry/guest return, demo payment/QR/VOID/check-in; chỉ là bằng chứng UI|
| UI với API/SMTP local thật |22/22PASS,0SKIP/0FAIL|6.3phút; profile/avatar/password/OTP, history, event/ticket/review/category/team/admin/role guards và signed webhook QA→PAID/tickets/cancel|
| Menu/patterns riêng |3/3profilesPASS|320/390/768; bốn đích menu, touch≥48, không admin cho buyer, không tràn/lỗi runtime; vé tải xong trước chụp|
| APK standalone |BUILD/CÀI/MỞ PASS|x86_64, nội bộ debug keystore,52.812.321bytes; không phải APK ARM64/store hoặc IPA|
| Native auth |PASS cho thao tác đã chạy|Nhập chuỗi QA vào mật khẩu, mask→unmask→mask; guest account gate. Không submit tài khoản/thanh toán thật|
| Native font200 |PASS cho auth→đăng ký|Chờ Activity recreation xong, tìm thấy Email, tiếp cận và mở đăng ký; có ảnh. Khôi phục font_scale1.0|
| Native recording |PARTIAL|Clip55.95giây đã giải mã và xem frame mẫu; không đo FPS hoặc kiểm frame-by-frame toàn bộ|

22local API tests chạy trước hai chỉnh sửa presentation cuối (nhãn mã dài/HomeButton wrap); bộ UI fixture cuối và kiểm tra menu/card chụp lại trên bundle cuối. Không thay hợp đồng API hay luồng khi chỉnh hai điểm đó. Backend8016/DB QA55433/SMTP8026 được dùng cho mutation tests; không tạo đơn/chuyển tiền trên server sản xuất. Native APK dùng API HTTPS đã cấu hình sẵn và kiểm tra guest/biểu mẫu không submit.

SHA256 APK cuối:712F5F30EF64B3D9F63AA1A6953D8F0562EEB47D7F8616408C62EC57D09F028A. Artifact: .local/mobile-native-polish/EventHub-mobile-polish-x86_64.apk. Bản mới đã cài trên emulator-5554; không cần Metro.

API GET /api/health,/api/config,/api/events,/api/categories local được kiểm tra trong phiên UI trước; lần này không có tích hợp API mới. Kết quả API hiện có thể hiện trong22UI local. Không dùng UI fixture để chứng minh backend.

## Giới hạn và các lần kiểm tra cần phân biệt

- Lượt build đầu thiếu ANDROID_HOME; bổ sung SDK D:/AndroidStudiosdk trong environment của lệnh build rồi build thành công. Không chỉnh file Android sinh tự động hoặc .env.local.
- Runner native đầu chuyển deep link khi React Native đang tạo surface, dẫn tới màn trắng và UIAutomator null. Cold start rồi chờ sẵn sàng đã render đúng. Đây là vấn đề tái hiện trong harness/khởi động; chưa đủ bằng chứng kết luận mọi cold/warm deep link đều đúng. Không che việc runner đầu FAIL.
- Runner font200 đầu gửi deep link ngay lúc Activity recreation nên chụp Home thay Auth và assertion FAIL. Bài riêng chờ sẵn sàng rồi dùng control đã PASS, có font200-checks.json. Native-checks.json giữ nguyên kết quả phần chạy được của runner trước, không tự gán toàn PASS.
- Clip được ghi trong lần kiểm tra có Activity recreation, nên không coi full flow native hoàn tất. Chỉ xem mẫu frame4/14/24/34/44/52; chưa watch/scrub từng frame, chưa60fps/release trên máy chậm/Reduce Motion.
- Emulator có bàn phím phần cứng và nút accessibility nổi; ảnh native-keyboard không chứng minh software IME hiện hoặc nội dung tránh IME. Chưa nghiệm thu bàn phím mềm/iOS.
- Chưa test native menu authenticated, banking/camera/VoiceOver/TalkBack toàn diện hoặc tất cả37màn/dữ liệu dài/error states. Không đóng các gate phát hành/UAT từ MP-15.

## Bàn giao

- Evidence: [thư mục bằng chứng](evidence/MOBILE_POLISH_20261111_190822/).
- [Xem giao diện điện thoại](../../ui/MOBILE_PHONE_PREVIEW.html): đã cập nhật gallery ảnh mới tài khoản/ví vé/xác thực và nativefont200, phân biệt ảnh web/native; ảnh không phải ứng dụng tương tác Live.
- Master Plan: ghi chú mobile polish tại5.4, link report mới ởMP-15; trạng thái vẫn IN_PROGRESS/NEEDS_REVIEW cho nghiệm thu toàn bộ. Không đổi trạng thái thiết kế desktop hoặc ghi hoàn thành hàng loạt37màn.

