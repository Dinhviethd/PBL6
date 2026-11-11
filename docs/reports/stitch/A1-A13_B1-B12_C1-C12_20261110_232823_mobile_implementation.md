# Báo cáo triển khai web → mobile EventHub, đợt đầu

Mốc tổng hợp: **2026-11-10 23:28:23 UTC+07**. Phạm vi kế hoạch: A1–A13 (khách hàng, thông báo và phân công), B1–B12 (Ban tổ chức), C1–C12 (quản trị). Mã, tên chính thức và yêu cầu từng màn tại [kế hoạch mục 4](../../ui/MOBILE_FULL_MIGRATION_PLAN.md); trạng thái source và phần thiếu của **từng mã** tại [bảng triển khai](../../ui/MOBILE_MIGRATION_IMPLEMENTATION.md).

Kết luận tổng thể: **IN_PROGRESS / ĐẠT CÓ ĐIỀU KIỆN cho các luồng đã kiểm chứng; CHƯA ĐỦ BẰNG CHỨNG nghiệm thu toàn ứng dụng**. Đây là triển khai thực tế, không phải báo cáo hoàn thành toàn bộ M0–M5.

## Yêu cầu và căn cứ

Người dùng yêu cầu thực hiện kế hoạch đã lập, đồng ý tự dựng môi trường test local và cho biết có thiết bị đang bật trong Android Studio. Đã nhận diện thiết bị đó là Pixel_8 emulator, `emulator-5554`, Android 17, 1080×2400. Không coi đây là điện thoại vật lý.

Đã đọc skill, Master Plan, kế hoạch đầy đủ, audit/báo cáo A1 và `mobile/AGENTS.md`. Giữ các thay đổi A1 và tài liệu đã tồn tại trong working tree. Nguồn web là source hiện hành; native dùng React Native và Expo Router, tái bố trí theo kế hoạch đã được yêu cầu thực hiện.

## Stitch và thiết kế

- Project chuẩn: `10374042969343935993`, EventHub. `get_project` truy cập thành công.
- Đọc được metadata A4 `2d3d2187e79b4a3683caf7aa148bdbf3`, A10 `2ffc6d2afffe4e98928685030e86b1c8`, A11 `5d922b967e394167982a27a2dc35f31c`.
- Không chỉnh sửa hoặc tạo artifact Stitch; không lấy project khác thay nguồn chuẩn. Chưa tải/đối chiếu HTML/ảnh từng màn trong phiên, không khẳng định pixel-perfect hoặc review trực quan 37 artifact.
- Các bố cục native mới được triển khai từ source web/phương án trong plan: tab theo vai trò, thẻ thay bảng, wizard, sheet và form một cột. Đã xem ảnh runtime profile và Admin event, cải thiện email dài, tiền/ngày/trạng thái và tương phản badge/nút.

## Thao tác thực tế và kết quả source

1. Sinh inventory: 37 mã màn, 42 route web JSX, 117 đăng ký endpoint, 54 file route mobile (gồm layout/chi tiết phụ). Inventory không thay thế kiểm kê từng nút/action/export còn thiếu.
2. Dựng PostgreSQL riêng, Mailpit TLS local và API demo/SePay tổng hợp. Không nạp server `.env`, không thay mobile `.env.local`, không ghi DB Live. Migration Live từng từ chối lịch sử không phù hợp; runner đã được sửa chọn migration local đúng mục đích, không sửa guard/migration.
3. Khách hàng: 4 tab; hồ sơ/avatar, đổi/reset mật khẩu OTP; SePay/copy/QR/hạn và trang kết quả PAID; hủy đơn có xác nhận; home CTA dẫn A5 thật; bổ sung giá min/max và mốc ngày tìm kiếm UTC+07.
4. BTC: quản lý/tạo/sửa/submit/pause/cancel sự kiện; loại vé; đơn/chi tiết/người tham dự; staff theo sự kiện; thống kê/lịch sử; hồ sơ/logo/yêu cầu pháp nhân. Chọn ngày giờ dùng control native trên Android/iOS, input ISO chỉ là fallback cho preview web.
5. Admin: dashboard; khách hàng/khóa–mở; BTC/hồ sơ/phê duyệt; danh mục; sự kiện/phê duyệt; payment/SePay/detail/reprocess/resolve; cấu hình read-only; quản trị viên theo permission và version; duyệt thay đổi pháp nhân.
6. Thêm guard theo vai trò, danh sách FlatList có pagination/search/filter khi API hỗ trợ, trạng thái lỗi/rỗng/tải. Backend tiếp tục kiểm tra quyền/ownership và phát hành vé.
7. Thêm API-client multipart giữ boundary và kiểm tra UTF-8/return route; cài các module đúng SDK qua `expo install`, cấu hình native bằng config plugin. Không sửa tay thư mục native sinh tự động.

## API đã xác minh thực tế

**126 lời gọi HTTP có expected/status khớp**, lưu 6 evidence file. Đây là số request/assertion, có các nhánh lỗi dự kiến; không đồng nghĩa 126 test case E2E độc lập hoặc mọi API đã được nghiệm thu.

| Nhóm | Số call ghi nhận | Bằng chứng |
|---|---:|---|
| Auth/me/media/profile/password/OTP và SMTP local | 15 | [account-api-evidence.json](evidence/MOBILE_20261110_232823/account-api-evidence.json) |
| Create/submit/review/order/idempotency/ownership/SePay→PAID→tickets | 23 | [booking-api-evidence.json](evidence/MOBILE_20261110_232823/booking-api-evidence.json) |
| Read contracts B/C, hồ sơ BTC/apply/review/profile/team | 30 | [management-api-evidence.json](evidence/MOBILE_20261110_232823/management-api-evidence.json) |
| Event/type CRUD, category CRUD, user lock/unlock, profile/legal, staff/check-in/revoke | 35 | [management-actions-evidence.json](evidence/MOBILE_20261110_232823/management-actions-evidence.json) |
| Administrator catalog/list/grant/detail/update và config guard | 11 | [administrators-api-evidence.json](evidence/MOBILE_20261110_232823/administrators-api-evidence.json) |
| Amount mismatch, SePay detail/reprocess/resolve, không phát hành vé sai | 12 | [sepay-review-evidence.json](evidence/MOBILE_20261110_232823/sepay-review-evidence.json) |

Ngoài ra đã gọi thật `GET /api/events?minPrice=100000&maxPrice=100000` và `...?minPrice=0&maxPrice=0`: đều 200, nhánh giá 0 trả danh sách rỗng trên bộ dữ liệu test. UI giá có bài riêng kiểm tra validation/ràng buộc 0.

OTP được gửi qua SMTP thật tới Mailpit local và đọc từ inbox test; không dùng transport giả trong runtime. Thanh toán dùng webhook HMAC và worker backend trên giao dịch tổng hợp; không chuyển tiền thật. Token/password/OTP/request body không đưa vào evidence được commit.

`POST /api/admin/sepay/reconcile` trả **503 dự kiến do thiếu token sandbox API v2**. Đây là PASS của nhánh fail-closed, còn chức năng đối soát API v2 là **BLOCKED**, không báo tích hợp hoàn tất.

## Kiểm thử đã thực hiện

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `npm run check:mobile` | PASS typecheck/lint, **31/31 unit tests** | Logic/transport/query/session; không thay native UI |
| `npm run lint --prefix client` | PASS | Test/config client; không chạy lại toàn web UI |
| Export Android/iOS/web | PASS | Hermes/JS bundle; native được export lại sau thay đổi giá/ngày |
| UI preview mock, lượt cuối | **18/18 PASS**, 0 skipped/flaky/fail | [Stats](evidence/MOBILE_20261110_232823/ui-mock-stats.json), 19.2s; 320/360/390/430/768 và landscape |
| UI API thật, bộ trước bổ sung giá | **10/10 PASS**, 1.1m | Profile/avatar/password/OTP, tạo→vé→submit→admin review, category, role guard, A5→admin reject, payment/cancel |
| UI API thật, bổ sung giá | **1/1 PASS**, 8.5s cả run | Giá đảo ngược bị chặn, min/max 0 gửi đúng API và nhận 200/empty |
| Smoke bố cục quản lý trong bộ API thật | PASS 22 route × 2 viewport 320/390 | Thuộc một test case; không phải 44 test độc lập; kiểm overflow/pageerror, không chứng nhận a11y |
| APK development Android x86_64 | **BUILD SUCCESSFUL**, 21m43s; 477 tasks | Đã cài lên Pixel_8; debug build chưa có nghiệp vụ native trọn luồng |
| Git whitespace | PASS `git diff --check` | Có cảnh báo chuyển LF/CRLF, không phải lỗi whitespace |

Ảnh thực tế từ UI dùng dữ liệu test: [profile](evidence/MOBILE_20261110_232823/profile-390.png), [thanh toán thành công](evidence/MOBILE_20261110_232823/payment-success-390.png), [Admin sau phê duyệt](evidence/MOBILE_20261110_232823/admin-event-approved-390.png). [Native loader](evidence/MOBILE_20261110_232823/native-initial.png) chỉ chứng minh app đã mở và đang chờ Metro, không phải màn nghiệp vụ native đã đạt.

Những lần lỗi đã điều tra/sửa: cache Expo giữ origin của export trước (xuất lại `--clear` cho test `/api`); fixture thời gian đóng check-in lệch vài ms sau giờ kết thúc (cố định baseline của test); chờ sheet đóng trước nhập bộ lọc; selector ảnh React Native Web; test home phải mong đợi auth guard khi guest mở A5 thay vì form authenticated. Không che lỗi bằng mock trong các suite API thật.

## Android artifact và trở ngại native

- App ID `com.pbl6.eventhub`, version `1.0.0`, debug x86_64; build native qua Expo prebuild/config plugins, Gradle 9.3.1, Java 21. SDK/NDK thiếu đã được Gradle cài theo build.
- APK: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`; bản sao ổn định: `.local/mobile-migration/EventHub-development-x86_64.apk`, 94.187.727 bytes.
- SHA-256: `6F157238A7029D49F082F9EE037D99815EBB1CF96422E7450764FCB9E5408C99`.
- CLI đã cài APK và mở development client vào Metro đang có cổng 8081. Ảnh chụp cho thấy loader; chưa xác nhận app nghiệp vụ chạy được.
- Lệnh khởi động Metro test/Expo Go cổng **8084** bị automatic approval review từ chối: **“blocked by policy”**, không nêu chi tiết hơn. Không coi việc cài APK thành nghiệm thu native.
- Đã hỏi người dùng chạy Metro test với API `http://10.0.2.2:8016/api` và `APP_VARIANT=development`. Tại lần kiểm tra tiếp theo, cổng 8084 chưa sẵn sàng; đang chờ thông tin/trạng thái bên ngoài. Không đổi môi trường/API user đang mở để né lệnh bị chặn.

## Checklist và kết luận

| Tiêu chí | Trạng thái |
|---|---|
| Có mapping và source cho các không gian theo kế hoạch | PASS ở mức đợt triển khai; inventory action còn PARTIAL |
| Nội dung/hành vi tương đương toàn web | PARTIAL — gap từng màn ghi rõ trong tài liệu tiến độ |
| API hoạt động cho chức năng đã nối | PASS trong phạm vi evidence; v2 reconcile BLOCKED |
| Bố cục/tương tác preview được kiểm chứng | PASS trong phạm vi các bài chạy; visual từng màn còn PARTIAL |
| Đồng nhất Cosmic Graffiti / đối chiếu Stitch | PARTIAL; không review đầy đủ artifact native |
| Native Android/iOS, camera, SecureStore/payment return | NOT_VERIFIED |
| Accessibility/font 200%/hiệu năng/UAT | NOT_VERIFIED |
| Production/Store/OTA | NOT_VERIFIED; không publish trong phiên |

Master Plan cập nhật MP-15 **IN_PROGRESS**, trỏ inventory/tiến độ/báo cáo này; không nâng các trạng thái nghiệm thu web hoặc native chưa có bằng chứng. Cần tiếp tục đóng các gap filter/chart/export/team/nháp theo từng màn và hoàn tất native sau khi Metro test sẵn sàng. Không kết luận kế hoạch đã hoàn thành toàn bộ.
