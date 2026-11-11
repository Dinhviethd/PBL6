# Kiểm tra tiếp APK độc lập với server thực

Thời điểm bắt đầu ghi nhận: **11/11/2026 17:23:48 UTC+07**. Tiếp tục công việc được người dùng cho phép; dùng skill `eventhub-stitch-review`. Nguồn: Master Plan MP-15, kế hoạch mobile và [phiên triển khai11/11](A1-A13_B1-B12_C1-C12_20261111_164652_server_completion.md). Không thay thiết kế Stitch hoặc backend trong lượt xác minh này.

Project thiết kế chuẩn **10374042969343935993**; tham chiếu A9/B1/B10/C1 theo report trước. Lượt này không gọi lại Stitch, không tuyên bố đã khắc phục download401. Thiết kế ban đầu là source chuyển thể đã build; tiêu chí: mở độc lập không Metro, đăng nhập đúng vai trò, đọc API Live, xuất tệp qua hệ thống, giữ phiên sau restart, kiểm tra cơ bản chữ lớn.

## Bản cài được kiểm tra

- `com.pbl6.eventhub`, v1.0.0/versionCode1, Android17 Pixel_8 emulator, ABI x86_64.
- APK `.local/mobile-migration/EventHub-server-preview-x86_64.apk`,52.806.297bytes.
- SHA256 `49C377E834F75229701D63DD9FD1875A12F3406E6EA4C942A7BB14E59EB297F4`.
- Build release thành công5m42s,797tasks; ký debug keystore để thử nội bộ. Chưa phải ký store/ARM64/IPA.
- Nhúng bundle2.574.532bytes, có `https://eventhubqrmarketing.tech/api`, không có API test8016; mở biểu tượng EventHub qua Android launcher, không cần Metro.

## Kết quả từng màn

| Màn | Thực hiện thực tế | Kết quả |
|---|---|---|
| A1 Trang chủ | Mở APK độc lập, danh mục từ server Live, hero gọn và4tab | PASS trong emulator |
| A4 Đăng nhập | Đăng nhập lần lượt Customer, Organizer, Admin bằng tài khoản demo được cung cấp; kiểm email trên màn tài khoản | PASS; bước chờ UIAutomator Customer ban đầu timeout nhưng ảnh sau đó xác nhận đúng tài khoản, không coi timeout là app login thất bại |
| A9 Lịch sử | Customer mở Đơn hàng của tôi; màn lịch sử hiển thị dữ liệu | PASS smoke; kết hợp filter đầy đủ đã kiểm UI local |
| A8 Ví vé/chi tiết/PDF | Mở ví, chọn vé VALID từ Live, xuất PDF; Android chooser hiện “Sharing1file” và tệp.pdf | PASS tạo PDF và mở chooser; đóng bằng Back, không gửi tệp cho ứng dụng khác |
| B1 Tổng quan BTC | Mở không gian BTC, bộ chọn ngày native có OK/Cancel, hủy picker rồi chọn7ngày và áp dụng; khoảng hiển thị05/11–11/11/2026 | PASS smoke; chỉ thay filter, không thay dữ liệu server |
| B10 Thống kê/CSV | Từ sự kiện của BTC mở thống kê, xuất CSV; chooser hiện tệp.csv | PASS tạo CSV/mở chooser; đóng không gửi |
| C1 Tổng quan Admin | Mở không gian Quản trị sau đăng nhập Admin, KPI/chart/filter hiển thị | PASS smoke |
| C8 Toàn bộ sự kiện | Quản lý→Toàn bộ sự kiện→mở bộ lọc nâng cao→quy mô dưới1.000vé; lựa chọn hiển thị đúng | PASS smoke; không mutation |
| A4/A10 Phiên native | Buộc dừng process, mở lại từ launcher, vào Tài khoản vẫn đúng Admin | PASS SecureStore restore cơ bản với API Live |
| A4 Mất mạng lúc khởi động | Tắt Wi-Fi và mobile data emulator, tắt/mở app, vào Tài khoản có “Thử khôi phục phiên”; bật mạng lại và retry khôi phục đúng Admin | PASS2checks; đã phục hồi Wi-Fi/mobile data về1/1 |
| A1 Chữ200% | Đổi Android font_scale1→2, xem trực tiếp ảnh home; chữ nội dung lớn và cuộn được, nhãn tab bị ellipsis | PARTIAL — nhãn điều hướng chưa đạt đọc đầy đủ ở200%; không tuyên bố TalkBack/font200 toàn app PASS |

Đã khôi phục `font_scale=1.0`. Ảnh/UI dumps của tài khoản thật và QR giữ ở `.local/mobile-migration/`, không chép vé/email thật vào evidence trong repo. Những ảnh có tên native-pdf-result/native-live-valid-ticket/native-live-organizer-account/native-live-admin-account/native-admin-final cùng snapshot sau filter được quan sát bằng UIAutomator; không lưu token/mật khẩu trong báo cáo. Không gửi email/tin nhắn/tệp cho người khác, không tạo đơn, chuyển tiền, phê duyệt hoặc khóa dữ liệu nghiệp vụ Live.

## Đánh giá

- Chức năng trong bảng: **ĐẠT CÓ ĐIỀU KIỆN** theo phạm vi smoke Android emulator và giới hạn chữ lớn.
- Giữ kết quả code:34unit/typecheck/lint mobile, lint client PASS;21UI API local +19UI mock trước đó PASS. Sau sửa filter/chart, kiểm mục tiêu2+2 PASS và gallery đã xem. Không cộng lượt kiểm lại thành số kịch bản mới.
- Ban đầu chỉ xác minh source đã cài; sau khi phát hiện font200, sửa `mobile/src/app/(tabs)/_layout.tsx` như kết quả bên dưới và chạy lại typecheck/lint/34unit, build/cài/kiểm200% native. Không tuyên bố đã chạy lại toàn bộ21UI browser sau sửa nhãn tab; kiểm thay đổi trực tiếp bằng bản Android.
- MP-15 vẫn **IN_PROGRESS**. iOS, điện thoại ARM64 vật lý, camera thật, OTP/upload/payment-return native trọn luồng, mất mạng/revoke, TalkBack/chữ200% toàn app và performance/UAT chưa nghiệm thu. SePay APIv2 sandbox thành công còn thiếu cấu hình; Stitch artifact download401 vẫn là giới hạn riêng.

## Bước tiếp theo

Đã thêm bằng chứng [offline/online retry](evidence/MOBILE_NATIVE_20261111_172348/offline.json). Sau phát hiện nhãn tab bị cắt ở200%, đang sửa nhãn tự xuống dòng và chiều cao thanh tab theo fontScale, typecheck/lint/unit và APK được chạy lại trước khi nghiệm thu thay đổi. Không giới hạn fontScale của nội dung để che lỗi.

**Kết quả sửa chữ lớn:** đã cho nhãn tab tự xuống dòng, tăng chiều cao thanh tab theo fontScale; không giảm hoặc tắt cỡ chữ hệ thống. Typecheck/lint và34unit PASS. APK build lại **SUCCESS3phút,797tasks (24chạy/773up-to-date)**, cài cập nhật và xem trực tiếp ở font_scale2.0: cả4nhãn đọc đủ, không ellipsis. [Ảnh200%](evidence/MOBILE_NATIVE_20261111_172348/home-font200-fixed.png), [bằng chứng](evidence/MOBILE_NATIVE_20261111_172348/font-scale.json). Đã đưa font_scale về1.0 sau kiểm tra. Đây là PASS cho4nhãn navigation tại viewport Pixel8, không phải chứng nhận accessibility toàn ứng dụng.

**APK cuối hiện đang cài:** cùng đường dẫn `.local/mobile-migration/EventHub-server-preview-x86_64.apk`,52.806.505bytes, SHA256 `EB8ACBBFA7CB2ABDC4B1A4DD8F412AA2F8BA4B8A723EF90E7570E917B23EB7B2`. Hash49C377 phía trên là bản trước sửa font, giữ lại để truy vết. Bản cuối tiếp tục dùng HTTPS server thật và mở không cần Metro.

1. Nhãn tab200% đã sửa và kiểm; tiếp tục mở rộng accessibility trên form/management sheets và TalkBack.
2. Kiểm OTP/upload/native payment-return và offline/revoke bằng DB local/sandbox, không dùng thanh toán thật thay sandbox.
3. Build ARM64 cho máy thật và kiểm camera; iOS cần thiết bị/môi trường phù hợp.
4. Chỉ đóng M5/MP-15 khi các tiêu chí còn lại có bằng chứng, không lấy số route làm tỷ lệ hoàn thành.
