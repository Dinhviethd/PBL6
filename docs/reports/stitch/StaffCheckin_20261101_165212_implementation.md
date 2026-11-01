# StaffCheckin — Triển khai giao diện dùng chung với B9

Thời điểm ghi nhận: 2026-11-01 16:52:12 UTC+07. Kết quả: **ĐẠT CÓ ĐIỀU KIỆN trên source, PostgreSQL test riêng và Chrome**.

## Màn hình, yêu cầu và nguồn thiết kế

Đích `/checkin/events/:id` là trang con luồng A13, chưa có mã Stitch riêng được xác minh. Mẫu `/organizer/events/:id/checkin` đã được người dùng yêu cầu tái sử dụng; xác nhận hiển thị tên khách/hạng vé/mã vé/thời điểm, chỉ camera/nhập mã/kết quả. Master Plan yêu cầu quyền đúng sự kiện và chống quét trùng.

Project chính thức `10374042969343935993`. `get_screen` xác minh B9 hiện tại `fe0cb469487e4ae0ac3be48de65c375b`, tên “B9. Quét mã QR Check-in - Cosmic Ticket Ban Tổ Chức”, DESKTOP2560×3238. Đã đọc HTML file `2827451453672412032` (khai báo1280×1609) và xem ảnh file `9740001862705473115` qua download_file. Tài liệu cũ dùng ID khác; không tự ghi đè mapping hoặc lịch sử B9. Không tạo/sửa artifact Stitch.

Ban đầu StaffCheckin chỉ dùng Scanner cũ, thông báo text, chưa có user shell. Trang organizer đã có camera/form trái và kết quả chi tiết phải. Ngoại lệ được duyệt: shell user thay organizer, quay về phân công; phạm vi nội dung theo trang organizer đã triển khai và xác nhận mới của user, không thêm các điều khiển cổng/thiết bị/offline/debug/in thẻ mẫu trong artifact.

## Thay đổi thực tế

| Tệp | Thay đổi trong phiên |
|---|---|
| `client/src/App.tsx` | Thêm match chính xác `/checkin/events/:id` vào shared home shell; giữ Guard |
| `client/src/components/ticketing/checkin-station.tsx` | Tách trạm quét B9 thành component dùng chung; metadata type riêng, API hiện hữu; camera/manual/result và đường quay lại qua props |
| `client/src/components/ticketing/checkin-station.css` | CSS nội dung quét dùng chung, responsive; staff căn giữa và sửa header tablet bằng scope trang staff |
| `client/src/pages/staff/StaffCheckin.tsx` | Dùng trạm quét chung, link về `/checkin`, reset theo revision/event |
| `client/src/pages/organizer/QRScanPage.tsx` | Giữ shell/sidebar/header organizer và dùng trạm quét chung, reset theo revision/event |
| `client/src/pages/organizer/qr-scan.css` | Giữ CSS shell organizer; nội dung quét chuyển sang CSS chung |
| `server/test/qr-scan.integration.test.cjs` | Mở rộng kiểm staff metadata/kết quả/quyền/thu hồi, chạy helper UI theo CHECKIN_UI |
| `server/test/helpers/checkin-station-browser.cjs` | Chrome/API test cho hai consumer, responsive, lỗi/camera/session |

Backend sản phẩm không thay đổi trong phiên. Các thay đổi A12/A13/B11 có sẵn đầu phiên được giữ nguyên. Scanner cũ giữ cho các consumer ngoài phạm vi nếu có; không xóa ngoài yêu cầu.

## API đã xác minh và môi trường

PostgreSQL17 test local container `eventhub-a13-postgres-test`, loopback55433, database `eventhub_a13_test`; API mới build chạy cổng ngẫu nhiên, Vite5185 proxy đúng API test. Không dùng DATABASE_URL Supabase hoặc tạo check-in Live. Tài khoản/sự kiện/vé đều fixture trong database test riêng.

| HTTP | Bằng chứng |
|---|---|
| GET `/api/checkin/events/:id` | Staff ACTIVE200 + metadata đúng; sự kiện ngoài phân công403, sau thu hồi403, thiếu auth401; browser404 cho UUID không tồn tại |
| POST `/api/checkin/events/:id/checkins` | Body code; QR/manual200, duplicate200 cùng thời điểm cũ, thông tin khách/hạng vé/mã vé đúng; invalid400,VOID409,paused409, quyền403/401; concurrency chỉ ghi một lần |

Suite HTTP ghi `httpAssertions:30`, PASS. Các HTTP tạo fixture/order/payment demo cũng nằm trong30assertions; đây không phải30lần scan. Thông tin kết quả staff được so khớp với kết quả organizer. Camera và manual gọi cùng endpoint hiện hữu.

Chrome cuối chạy helper trực tiếp trên API/database test: PASS,9POST scan từ trang staff, không lỗi JavaScript. Kiểm unpaid bằng thay trạng thái order fixture đúng check constraint rồi khôi phục; không sửa schema hoặc logic nghiệp vụ.

## Kiểm thử và tiêu chí nghiệm thu

| Tiêu chí | Kết quả |
|---|---|
| Header/footer user và điều hướng staff | PASS: đúng1AuthHeader/1AuthFooter, không sidebar/header organizer; back về `/checkin` |
| Layout và dữ liệu | PASS: camera+form trái, kết quả phải; tên khách/hạng vé/mã vé/thời điểm thật; UTC+7 khi browser timezone New York |
| Trạng thái quét | PASS: pending khóa nút,success,duplicate cùng thời điểm,invalid/VOID/unpaid/closed/FORBIDDEN; kết quả khách trước được xóa khi lỗi/reset |
| Quyền và lỗi tải | PASS: thu hồi sau mở trang bị từ chối; reload403 khóa camera/input; thử lại sau khôi phục quyền;404 có lỗi rõ |
| Transport và session | PASS: POST lỗi mạng không tự gửi lại; logout gỡ trạm và thông tin khách; đổi event không giữ kết quả cũ |
| Responsive | PASS: staff1440/1024/768/390; organizer1440/768/390; không tràn ngang, mobile xếp dọc; đã xem ảnh staff390 và organizer1440 |
| Camera | PARTIAL: getUserMedia denied, stream start/stop/reopen/ẩn tab/rời trang bằng media mô phỏng PASS; camera vật lý và QR quang học chưa kiểm |
| Accessibility | PARTIAL: label/live region/busy/focus input sau reset và reduced-motion hiện hữu; chưa screen reader/contrast đầy đủ |
| Build/lint | PASS: server build; client build; eslint App/hai page/component; diff check |

Lệnh tái chạy: build server/client; cung cấp TEST_DATABASE_URL local với tên DB kết thúc `_test`; chạy `CHECKIN_UI=1 node --test test/qr-scan.integration.test.cjs` trong server (trên PowerShell đặt env trước). Helper tự chạy Vite5185 và đóng browser/Vite; API được đóng trong finally của suite. TEST_DATABASE_URL không được in hoặc ghi bí mật vào report.

Các lần lỗi đã khắc phục: header user overflow1024 đã sửa bằng scope giống A13; fixture đầu truy vấn sai tickets.order_id và chưa đáp ứng orders_check1 đã sửa theo schema; selector logout sửa theo header thật. Chrome fake device từng trả NotFoundError khi mở lại sau dispose, nên kiểm vòng đời cuối dùng canvas captureStream mô phỏng. Không thay đổi phản hồi nghiệp vụ để làm test đạt. Lỗi SQL/selector ở fixture không là lỗi backend sản phẩm. Không tuyên bố kiểm camera vật lý từ test mô phỏng.

Client build còn cảnh báo bundle lớn và Browserslist/baseline cũ; build không có lỗi. Không nâng dependencies ngoài phạm vi.

## Bằng chứng, giới hạn và cập nhật tài liệu

Ảnh tại `.local/qa/staff-checkin/staff-{1440,1024,768,390}.png` và `organizer-{1440,768,390}.png`, dữ liệu fixture test. Thư mục local không là asset sản phẩm và có thể được dọn. Đã xem ảnh mobile staff và desktop organizer; không khẳng định pixel-perfect.

Đã giải quyết: mismatch layout staff, thiếu kết quả chi tiết, shell user, chia sẻ logic/style, overflow tablet. Thiết kế Stitch cuối giữ nguyên. Chưa rollout frontend vào container8000, chưa smoke authenticated Live, camera thật/QR quang học và accessibility toàn diện chưa nghiệm thu. Camera fake của Chrome/MediaStream canvas chỉ kiểm trạng thái và lifecycle.

Master Plan cập nhật ghi chú trang con StaffCheckin, liên kết báo cáo mới và ghi chú review5.4; B9 ghi nhận regression consumer dùng chung. Kết quả A13 danh sách không bị nâng thành hoàn tất do phiên này. Plan thêm nhật ký triển khai, giới hạn và bằng chứng. API/Vite/Chrome test đóng; container PostgreSQL test dừng sau kiểm tra; API/worker hiện hữu giữ nguyên.
