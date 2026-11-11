# Rà soát và hiệu chỉnh UI mobile EventHub

Thời điểm: 2026-11-11 18:28:47 UTC+07. Kết luận: SOURCE ĐÃ HIỆU CHỈNH; kiểm chứng web/API local đạt theo bằng chứng dưới; native sau sửa CHƯA XÁC MINH. Không đóng nghiệm thu toàn bộ MP-15.

## Phạm vi và trạng thái ban đầu

Theo yêu cầu người dùng: rà soát mobile, giữ luồng chức năng, nghiệp vụ, API và điều hướng; tuân thủ Stitch. Đã đọc Master Plan, mobile/AGENTS.md, appllama-app-design-skill, eventhub-stitch-review và checklist simulator. Kiểm kê55tệp route/layout .tsx; rà soát các thành phần dùng chung và code gọi chúng. Đây không phải chứng nhận pixel-perfect37màn hoặc native E2E toàn bộ.

Kế hoạch/vấn đề được ghi trước khi sửa: [plan](MOBILE_20261111_181932_ui_review_plan.md). Working tree đã có nhiều thay đổi chưa commit từ trước; không hoàn tác phần việc có sẵn.

## Stitch — nguồn và mức tuân thủ

Project chính thức10374042969343935993 đã truy cập thành công. Chỉ dùng get_project/get_screen/download_file, không thay đổi artifact.

| Màn | Screen ID | File ảnh / HTML đã tải và xem/đọc | Kết quả phiên |
|---|---|---|---|
| A1 — Trang chủ | f9b7d6b096af4e598718c3f855ffe1e6 | 3630964027280437565 / 6901868965624864515 | Giữ section/màu/font/route; sửa khoảng bù keyboard; web regression PASS, native NEEDS_REVIEW |
| A2 — Khám phá & bộ lọc | 108b533834414d3a826cd32cfae54fe6 | 7335647946545489671 / 18425746987370547040 | Giữ tìm kiếm/filter/calendar/apply/reset, gia cố vùng cuộn sheet; web regression PASS, native NEEDS_REVIEW |
| A4 — Đăng nhập / Đăng ký | 2d3d2187e79b4a3683caf7aa148bdbf3 | 6313009675931005984 / 6748196296944310261 | Nút mắt trong ô theo pattern Stitch; web PASS ở320/390/768, native NEEDS_REVIEW |

Đã xem trực tiếp ảnh A1/A2/A4 và đọc HTML. Pattern giữ lại: dark surfaces, hệ tím/cyan/hồng, body Be Vietnam Pro, hierarchy tiêu đề/biểu mẫu, card sự kiện và nhóm bộ lọc. Giữ brand/chuỗi EventHub và scope mobile đang có; không khôi phục nội dung mẫu hoặc tính năng ngoài phạm vi từ artifact desktop. Không tự thêm theme light: app hiện cấu hình dark theo Stitch. Không có Appllama MCP trong công cụ phiên này, nên dùng nguồn Stitch được chỉ định.

Khả năng tải3artifact này hiện hoạt động; các ghi nhận401 trong báo cáo cũ là bằng chứng lịch sử, không dùng để kết luận kết nối hiện tại vẫn lỗi. Chưa xác minh quyền tải các artifact khác.

## Các thay đổi thực tế

| ID | Vấn đề / mức bằng chứng | Thay đổi | Source |
|---|---|---|---|
| U1 | Source cố định offset90 dù chiều cao header có thể khác; chưa tái hiện lỗi trên iOS | useHeaderHeight từ Expo Router thay offset cố định; kéo cuộn đóng bàn phím | components/ui.tsx, components/home/home-screen.tsx |
| U2 | Nguy cơ style truyền vào Field ghi đè toàn bộ nền/padding/font; phát hiện qua code | Tách style và ghép style array; giữ chiều cao tối thiểu52, chừa chỗ cho nút mắt | components/ui.tsx |
| U3 | Ảnh/source mobile có nút hiện mật khẩu toàn dòng, trong khi A4 Stitch có mắt trong input | Nút mắt tối thiểu48×48 nằm trong ô; giữ nhãn trợ năng/secureTextEntry/value/onChangeText/autocomplete; tôn trọng editable=false | components/password-field.tsx |
| U4 | Gia cố vùng cuộn trước viewport thấp/nội dung dài; không khẳng định đã tái hiện lỗi trước sửa | flexShrink cho sheet và vùng cuộn; keyboardDismissMode=on-drag | components/home/primitives.tsx |

U3 áp dụng tại auth, change-password và reset-password (A4/A11 và trang bảo mật tài khoản liên quan A10). Không sửa component profile hoặc artifact A10/A11; không đánh dấu đã review hình ảnh hai artifact đó.

Screen áp dụng gián tiếp tới account/staff/tickets/auth/checkin/event/notification/order/payment-status/profile/register-organizer/reset-password và các feature BTC/Admin. HomeSheet áp dụng gián tiếp tới picker/bộ lọc/báo cáo/BTC/Admin/team/đối soát. Các consumer không bị viết lại.

Không thay API client, endpoint, body dữ liệu, token/session, validation, điều kiện quyền, payment polling, business state hoặc lệnh router. Không thêm dependency, không thay cấu hình app, không deploy/OTA hoặc chuyển tiền.

## Kiểm tra sau sửa

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| npm run typecheck, npm run lint trong mobile | PASS | Kiểm tra source cuối cùng; log trong evidence |
| npm test trong mobile |34/34PASS | Unit auth/session/payment/date/filter/document; không thay native E2E |
| Web export với API=/api | PASS | Bundle mới phục vụ các bài UI |
| Export Android và iOS | PASS | Hermes bundle; không phải APK/IPA hoặc runtime native |
| playwright.mobile-ui.config.ts |19/19PASS | Bộ test hiện có dùng fixture/mock; chỉ chứng minh UI |
| playwright.mobile-live.config.ts | 22/22PASS,0FAIL/0SKIP | API/SMTP thật trên local8016/DB QA55433 riêng; không server sản xuất |
| Kiểm tra riêng biểu mẫu bằng Playwright |3/3profilesPASS,24assertion-groups | 320×568,390×844,768×844; không giả làm fontScale native |
| Xem ảnh sau sửa | PASS ở ảnh đã xem | auth320,register390,home390,BTCstats390,Adminevents320; không tất cả trạng thái/màn |
| git diff --check cho file tracked đã sửa | PASS | Không chứng nhận clean working tree vốn đã dirty |

Các nhóm biểu mẫu: mắt48×48, nằm trong input, hiện/ẩn giữ giá trị, toggle xác nhận độc lập, nút tạo tài khoản còn truy cập được, không tràn ngang, quên mật khẩu giữ next, không pageerror. Các giá trị nhập chỉ là chuỗi QA và được xóa trước khi chụp.

Bộ19UI gồm home320/360/390/430/768, bộ lọc/calendar/viewport thấp, discovery, lỗi/retry/empty, guest→auth giữ đích, giới hạn vé/idempotency retry, demo payment→QR, VOID ticket, thông báo và check-in trùng.

Bộ22local kiểm tra lịch sử lọc/ngày, báo cáo/CSV/analytics, phân trang người tham dự, timeline đơn/QR, nháp sự kiện, khóa tài khoản có lý do, bộ lọc Admin, đội ngũ/revoke, hồ sơ BTC, đối soát thiếu token, profile/avatar, đổi mật khẩu, reset OTP qua SMTP và quay về tickets, tạo sự kiện/loại vé→gửi duyệt→admin duyệt, CRUD danh mục trong sheet, role guards, hồ sơ BTC và thanh toán SePay signed webhook tổng hợp→PAID→tickets/hủy đơn. Webhook tổng hợp trên QA không chứng minh chuyển khoản ngân hàng thật.

## API và môi trường

Không có API mới hoặc tích hợp mới trong phiên. GET /api/health, /api/config, /api/events?page=0, /api/categories trên127.0.0.1:8016 đều200 lúc2026-11-11 18:23:59 UTC+07. API auth/profile/management/payment hiện hữu được gọi qua bộ test local; xem JSON kết quả chi tiết. Không gửi dữ liệu test tới server thật. Không ghi mật khẩu/token vào báo cáo.

## Trở ngại và tiêu chí chưa xác minh

- Automatic approval review từ chối lệnh khởi động Metro dev và lệnh nối cổng ADB/mở dev client; công cụ chỉ trả lý do chung `blocked by policy`, không nêu chi tiết. Không có bằng chứng render native source mới sau sửa.
- Đã xem ảnh native trước sửa trên emulator-5554,font_scale1.0. Có thử cài APK dev sẵn có; sau khi bước kết nối bị từ chối, đã cài lại APK standalone ban đầu thành công. APK này chứa source cũ, không dùng để chứng nhận giao diện mới. Không đổi font scale hoặc dữ liệu ứng dụng chủ động.
- Chưa full-motion recording native, chưa đo FPS60/release trên máy chậm; chưa kiểm keyboard/focus khi toggle native, font150/200 native, safe area/notch, iOS gesture/TalkBack/VoiceOver hoặc thiết bị vật lý. Kiểm tra iOS keyboard offset chỉ ở mức source và bundle.
- Chưa đối chiếu pixel từng màn A3/A5–A13/B1–B12/C1–C12 hoặc mọi trường hợp dài/loading/empty/error. Các tiêu chí nghiệm thu/UAT/camera/bank-return tồn tại từ MP-15 vẫn mở.
- Không tuyên bố đã đạt nghiệm thu toàn bộ hoặc không còn lỗi; trạng thái NEEDS_REVIEW cho phần native.

## Bàn giao

Evidence: [thư mục bằng chứng](evidence/MOBILE_UI_20261111_182847/). Ảnh biểu mẫu và JSON không chứa tài khoản thật. Source sửa bốn file trong mobile/src/components. Master Plan bổ sung ghi chú review mobile tại5.4 và link report trong MP-15; giữ IN_PROGRESS, không nâng trạng thái37màn/không thay trạng thái thiết kế desktop.

