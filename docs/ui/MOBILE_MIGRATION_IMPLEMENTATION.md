# Triển khai chuyển web sang mobile — 10/11/2026

> Nghiệm thu 2026-11-11 17:44:02: **NO-GO nghiệm thu toàn bộ**, các bài đã chạy đạt theo phạm vi. [Kết quả cuối và37màn/17kịch bản](../reports/stitch/A1-A13_B1-B12_C1-C12_20261111_174402_final_acceptance.md).

> Cập nhật 11/11/2026: đã nối và kiểm tra đăng nhập ba vai trò với `https://eventhubqrmarketing.tech/api` bằng tài khoản demo người dùng cung cấp; 37 HTTP requests gồm 36 HTTP 200 và một HTTP 403 đúng quyền. Bổ sung filter/chart/export/team/nháp và chi tiết hồ sơ BTC; xem [báo cáo đợt hoàn thiện](../reports/stitch/A1-A13_B1-B12_C1-C12_20261111_164652_server_completion.md). Kết quả native 10/11 không tự áp dụng cho các chức năng mới.

Trạng thái tổng: **IN_PROGRESS**. Đã triển khai đợt đầu của các không gian khách hàng, Ban tổ chức và Admin; chưa nghiệm thu toàn bộ kế hoạch M0–M5. “Có màn hình” không đồng nghĩa mọi hành động của web đã được chuyển hoặc đã kiểm thử native.

Nguồn yêu cầu: [kế hoạch đầy đủ](MOBILE_FULL_MIGRATION_PLAN.md). [Inventory sinh từ source](MOBILE_ROUTE_INVENTORY.md): 37 mã màn, 42 route JSX web, 117 đăng ký endpoint và 54 file route mobile tại thời điểm kiểm kê. File route có cả layout và chi tiết phụ; các con số không phải tỷ lệ hoàn thành.

## Đã thực hiện

- Khách hàng dùng 4 tab Trang chủ/Khám phá/Vé của tôi/Tài khoản. Đơn hàng và phân công còn route cũ, truy cập từ Tài khoản. CTA đăng ký BTC trên home dẫn tới luồng thật.
- Thêm sửa tên/điện thoại/avatar, đổi mật khẩu, reset 3 bước qua email/OTP; giới hạn UTF-8 bcrypt; xóa phiên sau đổi/reset; trả người dùng về ý định đăng nhập hợp lệ.
- Chuẩn hóa nền/bề mặt Cosmic Graffiti, nút tím có chữ trắng, badge có tương phản; email dài đọc được, ngày giờ hiển thị theo Việt Nam, QR giữ nền trắng.
- SePay/MB Bank theo config thật: tạo/lấy thông tin, sao chép số tài khoản/số tiền/nội dung, QR từ server, hạn thanh toán, polling có giới hạn và foreground refresh. Trang kết quả đọc lại server, chỉ báo thành công khi PAID. Hủy đơn có xác nhận.
- Không gian BTC/Admin có guard theo quyền server và thanh điều hướng riêng. Danh sách thẻ dùng FlatList, tìm kiếm/phân trang và sheet trạng thái khi API hỗ trợ. Không hiển thị ô tìm kiếm cho lịch sử check-in vì API chưa lọc từ khóa.
- BTC có tạo/sửa sự kiện 3 bước, upload cover, chọn ngày giờ native; CRUD loại vé, gửi duyệt, pause/resume, hủy; đơn/chi tiết đơn, người tham dự, staff theo sự kiện, thống kê và lịch sử check-in; sửa hồ sơ/logo và gửi thay đổi pháp nhân có version chống ghi đè.
- Admin có dashboard, khách hàng/khóa–mở, BTC/hồ sơ/duyệt–từ chối, danh mục, sự kiện/duyệt, giao dịch SePay/detail/reprocess/ghi kết quả, cấu hình thanh toán read-only, quản trị viên theo quyền `administrators.manage`, duyệt thay đổi pháp nhân.
- Bảo toàn các màn đã có: event detail/booking, ví vé/QR, thông báo, danh sách chờ, phân công và scanner. Backend vẫn là nguồn kiểm tra quyền sở hữu, trạng thái và phát hành vé.

## Mapping và giới hạn theo từng màn

`Có nền` = tái sử dụng code có sẵn; `Đã thêm` = source mới trong phiên. Mọi dòng dưới đây còn cần nghiệm thu Android/iOS và đối chiếu thiết kế chi tiết theo tiêu chí kế hoạch.

| Mã | Route mobile / nguồn | Trạng thái source / phần còn lại |
|---|---|---|
| A1 | `/`, components/home | Đã thu gọn hero trên điện thoại, danh mục vuốt ngang; CTA BTC thật; native a11y chưa nghiệm thu |
| A2 | `/explore`, `/discovery` | Có nền + tab khám phá; đã thêm min/max giá, giữ giá 0, kiểm tra khoảng và mốc ngày UTC+07 độc lập timezone điện thoại |
| A3 | `/events/[slug]` | Có nền; regression đặt vé; native trọn luồng còn kiểm tra |
| A4 | `/auth` | Thêm hiện/ẩn mật khẩu, validation và liên kết reset; còn khảo sát autofill trên máy thật |
| A5 | `/register-organizer` | Đã thêm wizard/nộp/theo dõi/nộp lại; dùng API thật |
| A6 | `/orders/[id]` | Đã thêm SePay, giữ demo/VNPay; callback ngân hàng native chưa nghiệm thu |
| A7 | `/payment-status/[id]` | Đã thêm xác nhận PAID/issued count; pending không báo thành công |
| A8 | `/tickets`, `/tickets/[id]` | Đã thêm PDF/chia sẻ/in native, đọc lại vé trước xuất; thông tin thời gian/địa điểm, cảnh báo vé hủy và đã dùng; hộp thoại chia sẻ native còn nghiệm thu |
| A9 | `/orders` | Đã chuyển sang order-history, nhóm canonical, tìm kiếm/ngày UTC+07, số vé đã phát hành và pagination từ server |
| A10 | `/profile`, `/change-password` | Đã thêm hồ sơ/avatar/bảo mật; upload native cần thử thiết bị |
| A11 | `/reset-password` | Đã thêm 3 bước, hết hạn/resend, email local thật |
| A12 | `/notifications` | Có nền; regression read/unread/điều hướng |
| A13 | `/staff`, `/checkin/[id]` | Có nền; API nhận/thu hồi quyền và check-in thật đã chạy local |
| B1 | `/organizer` | Đã thêm kỳ báo cáo, bộ chọn sự kiện có tìm kiếm/phân trang, KPI, biểu đồ ngày có chọn cột và sự kiện sắp tới |
| B2 | `/organizer/events` | Đã thêm danh sách/tìm kiếm/lọc/phân trang |
| B3 | `/organizer/events/[id]` | Đã thêm detail/edit/submit/pause/cancel, các mục thao tác theo sự kiện |
| B4 | `/organizer/events/new`, `.../[id]/edit` | Wizard/ảnh/date-time native; thêm cảnh báo rời biểu mẫu và lưu/khôi phục nháp tường minh trên máy theo API+tài khoản+sự kiện, hết hạn 30 ngày; chưa tự lưu nháp |
| B5 | `.../[id]/tickets` | Đã thêm CRUD loại vé, xác nhận ẩn; server validation |
| B6 | `.../[id]/orders` | Đã nối order-manager, nhóm thanh toán/đang xử lý/kết thúc, ngày, tìm kiếm và KPI từ server |
| B7 | `.../[id]/orders/[orderId]` | Đã có timeline server, bank snapshot, thanh toán, vé; sheet xem QR, in/chia sẻ PDF đọc lại quyền và trạng thái |
| B8 | `.../[id]/attendees`, `.../[id]/staff` | Đã thêm tìm kiếm/loại vé/check-in status kết hợp, giữ pagination envelope thật, mời/thu hồi staff |
| B9 | `/organizer/checkin` → `/checkin/[id]` | Chọn sự kiện cho BTC + scanner có nền; camera vật lý chưa nghiệm thu |
| B10 | `.../[id]/stats` | Tổng toàn sự kiện và KPI trong kỳ tách rõ; bộ lọc ngày, biểu đồ vuốt/chọn ngày, breakdown loại vé và CSV theo API |
| B11 | `/organizer/profile`, `/organizer/team` | Hồ sơ/logo/pháp nhân; thêm đội ngũ toàn BTC, mời theo sự kiện có tìm kiếm/phân trang, xem phân công và thu hồi từng/toàn bộ có xác nhận |
| B12 | `.../[id]/checkins` | Đã thêm lịch sử, người quét/thời gian/phương thức, phân trang |
| C1 | `/admin` | Đã thêm range/biểu đồ doanh thu ngày; ghi rõ KPI toàn hệ thống và doanh thu trong kỳ |
| C2 | `/admin/users` | Search/status/pagination; chọn tối đa 50 người, khóa với lý do và xác nhận, xuất CSV theo bộ lọc |
| C3 | `/admin/users/[id]` | Đã thêm hồ sơ/tổng chi tiêu và khóa/mở có lý do |
| C4 | `/admin/organizers` | Đã thêm list/filter/GMV từ API |
| C5 | `/admin/organizers/[id]` | Đã chuyển hồ sơ/pháp nhân/liên hệ/xét duyệt và bộ sưu tập sự kiện phân trang đúng organizerId; không bổ sung phân tích/lịch sử không có API |
| C6 | `/admin/applications`, `.../[id]` | Đã thêm hàng đợi/duyệt/từ chối, chặn thiếu lý do |
| C7 | `/admin/categories` | Đã thêm tạo/sửa/ẩn qua sheet và xác nhận |
| C8 | `/admin/events`, `.../[id]` | Đã thêm danh mục/thành phố/quy mô/ngày bắt đầu, trạng thái/search; metrics lấy một batch cho mỗi trang |
| C9 | `/admin/events/[id]` | Đã có nội dung/loại vé/duyệt/từ chối; tên BTC từ summaries API |
| C10 | `/admin/payments`, `/admin/transactions/[id]` | Thêm filter ngày và form đối soát có xác nhận/validation; local trả 503 thiếu token đúng thực tế. Đối soát thành công với API v2 còn BLOCKED thiếu cấu hình sandbox |
| C11 | `/admin/reviews` | Đã thêm hàng đợi PENDING_REVIEW và quyết định qua C9 |
| C12 | `/admin/settings`, `/admin/administrators`, `.../[id]` | Đã thêm config read-only, grant/update quyền có confirmation/version; backend bảo vệ admin cuối cùng |

Route phụ: `/admin/legal-requests` đã thêm; đội ngũ toàn BTC dùng `/organizer/team`, nhân viên nhận lời mời tại `/staff`, vẫn có staff theo từng sự kiện. Inventory cập nhật55 file route; còn rà alias lịch sử trước khi đóng M0.

## Môi trường test local

Theo lựa chọn người dùng, dùng Docker riêng, không nạp `server/.env` hoặc thay `mobile/.env.local`:

| Thành phần | Đích |
|---|---|
| PostgreSQL | `127.0.0.1:55433/eventhub_mobile_test`, container `eventhub-mobile-migration-test` |
| Mailpit SMTP/Inbox | `127.0.0.1:1026` / `http://127.0.0.1:8026` |
| API demo | `http://127.0.0.1:8015/api` |
| API SePay tổng hợp | `http://127.0.0.1:8016/api`; tài khoản `MOBILEQA001`, không chuyển tiền thật |
| Preview UI test | `http://127.0.0.1:8083`; proxy cố định loopback, không dùng Live API |
| Android đang kết nối | `emulator-5554`, Pixel_8, Android 17, 1080×2400 |

`scripts/mobile-test-runtime.cjs` tạo DB với URL cố định và xác minh container/binding; chạy migrations thông thường + SePay **local**, loại migration Live có điều kiện riêng. Lần thử gom migrations ban đầu bị guard của Live từ chối; đã sửa runner loại đúng migration, không thay migration/backend. SMTP dùng chứng chỉ local, chỉ trust trong process QA; email không gửi ra ngoài. Password/JWT/QR secret/chứng chỉ/fixture nằm trong `.local/mobile-migration/` đã gitignore, không được commit.

Chạy API trong hai terminal ở repository root:

```powershell
npm run build --prefix server
node scripts/mobile-test-runtime.cjs
# Terminal khác:
node scripts/mobile-test-runtime.cjs --sepay
```

Chuẩn bị và xác minh dữ liệu theo thứ tự:

```powershell
node scripts/mobile-account-smoke.cjs
node scripts/mobile-booking-smoke.cjs
node scripts/mobile-management-smoke.cjs
node scripts/mobile-management-actions-smoke.cjs
node scripts/mobile-administrators-smoke.cjs
node scripts/mobile-sepay-review-smoke.cjs
node scripts/mobile-inventory.cjs
```

Các script tạo tài khoản/sự kiện/đơn/giao dịch **tổng hợp**, giữ dữ liệu để xem UI; không phải lệnh chạy trên production. Script booking lưu fixture dùng bởi các test UI sau; script management mở rộng fixture. Không xóa hoặc tái dùng DB Live cho các bài này.

Chạy preview/mock và API thật lần lượt vì cùng dùng cổng 8083:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL='/api'
npx expo export --platform web --clear
cd ../client
npx playwright test --config playwright.mobile-ui.config.ts
npx playwright test --config playwright.mobile-live.config.ts
```

`--clear` tránh dùng bundle còn chứa API origin của lượt export trước. Biến môi trường trên chỉ áp dụng terminal hiện tại; không đổi file `.env.local`. Bản export web dùng `/api` để chạy proxy test; không lấy bundle này làm cấu hình native release.

## Bằng chứng và trạng thái nghiệm thu

- 126 lời gọi HTTP có expected/status khớp trong 6 file evidence của các script smoke; gồm nhánh lỗi có chủ đích (400/401/403/503), không phải 126 kịch bản độc lập.
- Đã xác minh pipeline thật trên DB riêng: auth/profile/avatar/password/OTP-SMTP; create/edit/ticket/submit/review; idempotent order/payment; SePay HMAC/worker→PAID→ticket; amount mismatch giữ pending; check-in thành công/trùng; staff revoke; category CRUD; user lock/unlock; profile version/legal review; administrator grant/update.
- SePay v2 reconcile trả 503 khi chưa cấu hình token sandbox. Không thêm số liệu hoặc kết quả đối soát giả vào app.
- Lượt UI quản lý gần nhất trước kiểm tra cuối: 4/4 PASS; 22 route ở 320/390px không tràn ngang hoặc phát sinh pageerror, cộng luồng tạo→vé→gửi duyệt→phê duyệt, category CRUD và role guard. Bộ UI tài khoản/thanh toán riêng trước đó 5/5 PASS. Báo cáo phiên cuối ghi kết quả sau các thay đổi cuối cùng.
- Typecheck/lint và **31 unit tests** đã PASS. Export Android/iOS/web đã PASS; sau thay đổi giá/ngày đã export lại Android/iOS vào `.local/mobile-migration/native-export` và web vào `mobile/dist`.
- Đã xem screenshot profile và Admin event; sửa ngày giờ/tiền/trạng thái, email dài và CTA theo kết quả xem ảnh. Không tuyên bố pixel-perfect với Stitch; phiên này chỉ đọc metadata A4/A10/A11 và project chuẩn, giữ artifact desktop.
- Native Android: **BUILD SUCCESSFUL, 21m43s, 477 Gradle tasks**; APK development x86_64 đã cài lên Pixel_8 Android 17. Bản sao ở `.local/mobile-migration/EventHub-development-x86_64.apk` (94.187.727 bytes), SHA-256 `6F157238A7029D49F082F9EE037D99815EBB1CF96422E7450764FCB9E5408C99`. **Cập nhật 10/11 23:50: người dùng đã chạy Metro8084; đã xử lý IPv6 localhost bằng relay loopback, app chạy native.** 17/17 check PASS: hồ sơ/save, chặn quyền Customer→Admin, PAID/ví vé, SecureStore restore sau restart, 7 màn BTC/Admin, camera dừng sau background/resume, manual check-in/trùng và trạng thái server. Date picker và camera permission/preview đã xem trên emulator. [Báo cáo native và ảnh](../reports/stitch/A4_A6-A10_B1-B4_B9-B10_C1_C7_C12_20261110_235008_android_native_verification.md).
- iOS native, camera vật lý/QR từ máy khác, native payment return/OTP/upload, screen reader/chữ 200%, performance và UAT: **NOT_VERIFIED**. SecureStore đã kiểm tra restore cơ bản trên emulator, chưa nghiệm thu đầy đủ các trường hợp lifecycle/thay đổi tài khoản.

## Công việc tiếp theo

Đợt11/11 đã PASS34unit, typecheck/lint mobile, lint client,21UI API local và19UI mock; kiểm tra mục tiêu sau sửa filter/chart và gallery cũng PASS. [Bản xem bố cục320/390](MOBILE_PHONE_PREVIEW.html) dùng ảnh app với dữ liệu tổng hợp local, không phải Live UI. APK standalone52,8MB đã build/cài/mở không Metro; native Live ba vai trò, PDF/CSV chooser, BTC7ngày, Adminfilter và restore PASS smoke. Font200 đã sửa4nhãn tab hiển thị đủ; offline boot/online retry và giữ phiên PASS. Accessibility toàn app vẫn chưa nghiệm thu. [Báo cáo standalone](../reports/stitch/A4_A8_A9_B1_B10_C1_C8_20261111_172348_standalone_acceptance.md).

1. Đóng các gap chức năng được ghi riêng từng màn trong bảng trên; không coi 37 mapping là 37 màn hoàn tất.
2. Hoàn thiện test bản cài Android và thiết bị iOS; ghi app version/build ID/OS và bằng chứng thực tế.
3. Nghiệm thu quyền liên tổ chức, hết hạn/mất mạng/resume/đổi tài khoản, accessibility và hiệu năng theo kế hoạch.
4. Xác minh token sandbox/API v2 và callback VNPay trên môi trường riêng; không dùng giao dịch thật để thay bài sandbox.
5. Chỉ đóng MP-15 sau khi chức năng, API và nghiệm thu native có đủ bằng chứng. Chưa publish APK/IPA/store/OTA trong phiên này.
