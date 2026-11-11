# Xác minh Android native EventHub trên Pixel_8

Thời điểm tổng hợp: **2026-11-10 23:50:08 UTC+07**. Loại hành động: kiểm thử runtime native và xử lý kết nối môi trường. Kết luận: **ĐẠT CÓ ĐIỀU KIỆN trong phạm vi đã chạy; MP-15 tiếp tục IN_PROGRESS**.

## Yêu cầu, phạm vi và trạng thái ban đầu

Người dùng đã chạy Metro development client cổng 8084 với `EXPO_PUBLIC_API_URL=http://10.0.2.2:8016/api`, `APP_VARIANT=development`, rồi yêu cầu tiếp tục. Đây là bước tiếp theo của [kế hoạch chuyển mobile](../../ui/MOBILE_FULL_MIGRATION_PLAN.md), [báo cáo triển khai trước](A1-A13_B1-B12_C1-C12_20261110_232823_mobile_implementation.md) và [tiến độ từng màn](../../ui/MOBILE_MIGRATION_IMPLEMENTATION.md).

Phạm vi thực tế: A4 đăng nhập; A6/A7 đọc kết quả thanh toán từ đơn PAID có sẵn; A8 ví vé; A10 đọc/lưu hồ sơ; B1 tổng quan, B2 danh sách, B3 chi tiết, B4 mở date picker trong form sửa; B9 scanner/camera/check-in; B10 thống kê; C1 tổng quan, C7 danh mục, C12 cấu hình. Không thực hiện lại review thiết kế Stitch hoặc nghiệm thu toàn bộ hành động của các màn này.

Stitch project chuẩn `10374042969343935993`; không gọi/sửa/tạo artifact Stitch trong phiên kiểm thử runtime này. Thiết kế desktop giữ nguyên. Nguồn yêu cầu, mapping và tên màn theo Master Plan; kết quả native được tách khỏi trạng thái thiết kế/web.

## Môi trường và xử lý kết nối

- APK development đã build/cài từ phiên trước: `com.pbl6.eventhub`, version `1.0.0`, x86_64; SHA-256 `6F157238A7029D49F082F9EE037D99815EBB1CF96422E7450764FCB9E5408C99`. Không rebuild hoặc đổi module app trong phiên này.
- Thiết bị: Android Studio **Pixel_8 emulator**, serial `emulator-5554`, Android 17, 1080×2400. Không phải điện thoại vật lý.
- Metro do người dùng chạy: `localhost:8084`. Kiểm tra cho thấy server chỉ bind **IPv6 `::1`**; IPv4 `127.0.0.1:8084` ban đầu không kết nối được. ADB reverse dùng đường IPv4 nên development client hiện `unexpected end of stream`.
- Thêm `scripts/mobile-metro-relay.cjs`: TCP relay chỉ bind `127.0.0.1:8084` và nối tới `[::1]:8084`; truyền nguyên byte/WebSocket, không thay nội dung bundle. Sau relay, `/status` và Android manifest trả HTTP 200.
- `adb reverse tcp:8084 tcp:8084`, mở deep link development client vào `http://127.0.0.1:8084`; runtime khai báo `exposdk:57.0.0`. App đã tải được Trang chủ native.
- API thật dùng `http://10.0.2.2:8016/api` từ emulator; host `/api/health` trả 200/ok. Chỉ dùng PostgreSQL test riêng `127.0.0.1:55433/eventhub_mobile_test`; tài khoản/vé/đơn đều dữ liệu tổng hợp đã tạo trong phiên trước.
- Tắt Element Inspector bằng menu development để nó không chặn thao tác UI. Inspector đã làm lượt tự động đầu tiên không bấm được form; đó là trạng thái công cụ, không phải login API thất bại.

Không thay `mobile/.env.local`, không dùng API/DB Live, không gửi email hay giao dịch ngân hàng thật. Trở ngại cần người dùng khởi động Metro đã được gỡ; không tiếp tục ghi “đang chờ Metro” là trạng thái hiện tại.

## Tiêu chí và kết quả kiểm thử

Các check dưới đây là assertion qua ADB/UIAutomator trên bản native và API local thật. Tổng cộng **17/17 check PASS** trong ba nhóm, không cộng kết quả UI web trước đó để tăng số bài native.

| Nhóm/màn | Tiêu chí thực tế | Kết quả |
|---|---|---|
| A4/A10 | Đăng nhập Customer qua UI native; hồ sơ hiển thị đúng email test | PASS; login assertion riêng, profile identity là check 1 nhóm Customer |
| A10 | Nhập số điện thoại, bấm Lưu, nhận xác nhận server | PASS |
| Quyền C2 | Customer mở deep link `/admin/users` không được xem quản lý | PASS |
| A7 | `/payment-status/:id` đọc đơn PAID thật và hiển thị thành công/1 vé phát hành | PASS; không tạo giao dịch thanh toán mới trong check này |
| A8 | Ví vé native tải danh sách và có nút mở vé | PASS; chưa xác minh camera đọc QR hiển thị từ màn vé |
| Phiên native | Đưa app ra nền, `am kill`, mở lại development client; SecureStore refresh khôi phục đúng Customer | PASS sau chờ restore bất đồng bộ |
| B1 | Mở tổng quan BTC, số liệu doanh thu/vé/đơn từ API | PASS |
| B2 | Mở danh sách sự kiện đúng vai trò | PASS |
| B3 | Mở chi tiết sự kiện đúng fixture | PASS |
| B10 | Mở thống kê và breakdown loại vé | PASS |
| C1 | Mở tổng quan Admin | PASS |
| C7 | Mở danh sách danh mục Admin | PASS; chưa CRUD qua UI native trong phiên |
| C12 | Mở cấu hình thanh toán từ API | PASS; không sửa secret/config backend |
| B9 lifecycle | Sau khi camera đã mở, chuyển nền → resume dừng camera, hiện nút Bật camera | PASS |
| B9 check-in | Nhập mã một vé `VALID` thật từ DB test, nhận Check-in thành công | PASS |
| B9 duplicate | Nhập lại cùng mã, UI hiển thị thời gian đã check-in | PASS |
| B9 trạng thái server | Đọc lại API vé, trạng thái là `CHECKED_IN` | PASS |

Phân nhóm evidence: [Customer: 6 checks](evidence/MOBILE_NATIVE_20261110_235008/native-customer-evidence.json), [Management: 7 checks](evidence/MOBILE_NATIVE_20261110_235008/native-management-evidence.json), [Scanner: 4 checks](evidence/MOBILE_NATIVE_20261110_235008/native-scanner-evidence.json).

Hai kiểm tra bổ sung trực quan, không tính vào 17 assertions: mở/đóng date picker Android trong B4 và hộp thoại cấp quyền camera → camera preview thực tế của emulator. Không lưu thay đổi ngày giờ sự kiện, không tự coi tạo/sửa sự kiện native trọn luồng đã đạt.

## Bằng chứng trực quan

- [Hồ sơ lưu thành công](evidence/MOBILE_NATIVE_20261110_235008/native-profile-saved.png).
- [Customer bị chặn khu Admin](evidence/MOBILE_NATIVE_20261110_235008/native-customer-admin-denied.png).
- [Kết quả thanh toán PAID native](evidence/MOBILE_NATIVE_20261110_235008/native-paid-result.png).
- [Khôi phục phiên](evidence/MOBILE_NATIVE_20261110_235008/native-session-restored.png).
- [Tổng quan BTC](evidence/MOBILE_NATIVE_20261110_235008/native-organizer-dashboard.png), [chi tiết sự kiện](evidence/MOBILE_NATIVE_20261110_235008/native-organizer-event-detail.png).
- [Admin dashboard](evidence/MOBILE_NATIVE_20261110_235008/native-admin-dashboard.png), [cấu hình](evidence/MOBILE_NATIVE_20261110_235008/native-admin-settings.png).
- [Date picker Android](evidence/MOBILE_NATIVE_20261110_235008/native-date-picker.png).
- [Camera emulator đang chạy](evidence/MOBILE_NATIVE_20261110_235008/native-camera-active.png), [camera dừng sau resume](evidence/MOBILE_NATIVE_20261110_235008/native-camera-resumed-stopped.png).
- [Check-in thành công](evidence/MOBILE_NATIVE_20261110_235008/native-checkin-success.png), [mã trùng](evidence/MOBILE_NATIVE_20261110_235008/native-checkin-duplicate.png).

Một số ảnh debug có nút Tools hoặc banner Refreshing của development client. Không dùng các ảnh đó làm ảnh phát hành hoặc bằng chứng release build/performance. Ảnh chỉ chứa dữ liệu tổng hợp.

## Kiểm tra source và giới hạn

- `npm run check:mobile`: **PASS typecheck/lint, 31/31 unit tests** trong phiên này.
- `node --check scripts/mobile-native-qa.cjs`, `node --check scripts/mobile-metro-relay.cjs`: PASS.
- `git diff --check`: PASS (cảnh báo LF/CRLF của tệp có sẵn vẫn còn).
- Thêm helper `scripts/mobile-native-qa.cjs` để lưu UI snapshot/chạy check trên đúng emulator và fixture test. Mật khẩu chỉ đọc từ `.local` để nhập vào form, không in vào báo cáo. Login helper được thêm chờ điều hướng/restore; thời gian cố định ban đầu quá ngắn không đủ để kết luận mất phiên.
- Không sửa mã ứng dụng hoặc backend trong phiên này. Chỉ thêm tooling QA/relay, tài liệu và bằng chứng.

**Chưa xác minh:** thanh toán mới trọn luồng trên native/chuyển app ngân hàng/VNPay return; native OTP/avatar picker/upload; quét QR thật qua camera vật lý; check-in đồng thời hai máy; offline/revoke giữa phiên; iOS; TalkBack/VoiceOver/font 200%; hiệu năng/UAT; APK release/Store/OTA. API v2 SePay vẫn thiếu token sandbox. Các gap chức năng trong tài liệu triển khai vẫn mở.

## Bước tiếp theo và cập nhật Master Plan

MP-15 giữ **IN_PROGRESS**; thay trở ngại Metro cũ bằng “Metro connected; 17 native emulator checks PASS”, liên kết báo cáo này. Ghi nhận native Customer/BTC/Admin và camera lifecycle đã có bằng chứng một phần; không nâng toàn bộ M5 lên hoàn tất.

Tiếp tục các gap theo từng màn (lọc nâng cao/biểu đồ/export/team/nháp) và bổ sung bài native cho mutation BTC/Admin, upload/OTP/checkout, sau đó nghiệm thu thiết bị vật lý và iOS. Relay cần chạy cùng Metro khi Windows chỉ bind IPv6:

```powershell
node scripts/mobile-metro-relay.cjs
```

Không cần relay nếu Metro đã lắng nghe IPv4; `EADDRINUSE` có nghĩa cổng IPv4 đã được dùng, cần kiểm tra process thay vì tạo relay khác. Các tiến trình Metro/API test hiện được giữ để người dùng tiếp tục xem app; không đổi API công khai sang môi trường test.
