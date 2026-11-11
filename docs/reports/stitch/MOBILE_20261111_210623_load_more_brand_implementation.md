# EventHub — hoàn thiện tải thêm và logo ứng dụng

Thời điểm: 2026-11-11 21:06:23 UTC+07. Kết luận: ĐÃ TRIỂN KHAI; source và kiểm tra UI đạt, icon logo web đã thấy trên launcher Android. Phần nghiệm thu đa thiết bị/native dữ liệu nhiều trang còn có giới hạn bên dưới.

## Yêu cầu và phạm vi

Người dùng duyệt ý tưởng đã đề xuất: khám phá tải tiếp khi cuộn; ví vé/thông báo dùng Tải thêm; các danh sách tra cứu/quản lý dùng phân trang gọn và ẩn nếu chỉ có một trang. Đồng thời dùng logo web làm hình ảnh ứng dụng. Kế hoạch trước sửa: [plan](MOBILE_20261111_203723_load_more_brand_plan.md).

Áp dụng appllama-app-design-skill và eventhub-stitch-review, đọc Master Plan và mobile/AGENTS.md. Nguồn Stitch chính thức10374042969343935993; A2/A8/A9/A12 và nguồn thiết kế đã xác minh ở các phiên trước. Phiên này không sửa artifact Stitch hoặc thay bố cục desktop. Đây là thay đổi presentation mobile được người dùng yêu cầu; không đổi nghiệp vụ, API, route hoặc quyền. Working tree chứa nhiều thay đổi trước phiên, đã giữ nguyên phần việc có sẵn.

## Thay đổi thực tế

| Màn/khu vực | Hành vi mới | Giữ nguyên |
|---|---|---|
| A2 Khám phá /explore và tab discovery |FlatList tự tải khi gần cuối, nút Tải thêm dự phòng; nối trang, không giật về đầu; filter/pull-refresh nạp lại từ0|GET /events, params,24bản/trang, card/route chi tiết|
| A8 Ví vé /tickets |FlatList ảo hóa; Tải thêm; lỗi trang sau giữ vé đã có, retry đúng trang, khử trùngID|GET /me/tickets?page,50bản/trang, trạng thái/QR và ownership|
| A12 Thông báo /notifications |FlatList ảo hóa; Tải thêm; polling30s và mark-read cập nhật lại các trang đã nạp thay vì bỏ trang sau|GET inbox/filter, POST read/read-all, unread count, target routes|
| A9 Đơn hàng; A13 phân công; BTC/Admin |Pager mũi tên48px có nhãn trợ năng Trang trước/Trang sau, số trang ở giữa; ẩn khi page0 không có trang sau và trong lúc tải/lỗi|Phân trang API hiện có và chức năng tra cứu/quyền|
| Các picker/hàng chờ/team/staff quản lý |Dùng cùng Pager gọn và truyền loading/error để không hiển thị trạng thái hết dữ liệu sai|Hành động và bộ lọc hiện có|

Shared hook usePagedResource:
- Chặn request tải tiếp trùng, nối dữ liệu theoID, cập nhật bản ghi trùng bằng dữ liệu mới.
- Identity gắn userID và URL filter; đổi tài khoản/filter/focus invalidates generation, response cũ không ghi sang danh sách mới.
- Retry giữ target page, lỗi không xóa dữ liệu đang xem; không tự lặp lỗi khi onEndReached được gọi lại.
- Pull-refresh nạp trang0. Focus/poll/mark-read có thể nạp lại toàn bộ phạm vi đã tải; chỉ commit sau khi chuỗi request thành công, tránh trộn nửa dữ liệu cũ/mới.
- Không thay API client/token/backend, không thêm dependency.

## Logo web và cấu hình native

Nguồn chính xác: client/public/logo.png, được AuthHeader/AuthFooter web sử dụng;959×426RGBA. Hash nguồn trùng mobile/assets/logo.png trước phiên. Giữ toàn bộ logo DUT TICKET nguyên vẹn, không tạo thương hiệu mới.

Script mới scripts/mobile-brand-assets.cjs dùng Sharp hiện có trong server/node_modules:
- logo.png: bản sao nguồn nguyên gốc.
- app-icon.png:1024×1024opaque, logo căn giữa trên#F8FAFC; nền sáng để chữ xanh đậm từ logo gốc vẫn đọc được.
- adaptive-icon.png:1024×1024transparent, logo thu vào vùng an toàn Android (600px ngang), nền sáng do config cung cấp.
- app.config.ts khai báo icon, android.adaptiveIcon và web.favicon.

Đã xem icon xuất và crop từ launcher Android: logo đầy đủ trong mask tròn, nhãn ứng dụng EventHub. Không dùng image generation vì đây là đóng gói asset thương hiệu có sẵn. CLI Expo prebuild đã tạo lại thư mục Android sinh tự động từ config; không chỉnh native resources bằng tay. Prebuild báo package.json không thay đổi. Bản iOS config có icon chung, chưa build IPA.

## Kiểm tra

| Kiểm tra | Kết quả | Phạm vi/giới hạn |
|---|---|---|
| Mobile typecheck/lint |PASS|Source cuối, log evidence|
| Unit mobile |34/34PASS|Không dùng để thay E2E tải thêm|
| UI fixture/mock |24/24PASS|19case trước và5case mới; không chứng minh backend|
| UI mới — lỗi/retry/concurrency |PASS|50vé trang0, trang1lỗi503, giữ vé0, double-click chỉ1request, retry trang1, dedupeID49, thêm vé50, ẩn Tải thêm khi hết|
| UI mới — một trang |PASS|Không hiện Tải thêm hoặc Trang trước/Trang sau|
| UI mới — discovery |PASS|Cuộn FlatList tới cuối, API page1được gọi, nối dữ liệu; test cuộn lặp vì virtualization thay đổi estimated height|
| UI mới — response cũ/filter |PASS|Giữ response trang1chưa trả, đổi unread, trả response cũ; không rò bản ghi trang/filter trước|
| UI mới — mark read |PASS|Đã tải0/1, mark-read gọi lại0/1, giữ bản ghi trang1 và cập nhật read status|
| UI API local thật |3/3PASS,0SKIP/0FAIL|History filter, price filter,22managementroutes ở320/390; không mọi nghiệp vụ đã chạy lại|
| Read-only API local |6×200|/me/tickets và /me/notifications và /events, mỗi endpoint page0/page1; data thực QA có10vé/10notices/11events, page1trống|
| Ảnh web sau sửa |PASS đã xem|Ví vé390/320, thông báo390, đơn hàng390 và pager cuối danh sách; không tràn ngang/lỗi pageerror|
| Expo web export |PASS|Bundle cuối và favicon đã xuất|
| Android prebuild/build/cài |PASS|APK standalone x86_64; không cần Metro|
| Native launcher |PASS|Đã tìm entry EventHub, chụp/crop và nhìn logo web trên icon tròn|
| Native discovery |PASS giới hạn|Mở route thật,10lượt vuốt, không còn thanh Trang trước/Trang sau; không phải kiểm native nhiều trang có đăng nhập|

Hai bài UI đầu từng timeout vì tool cố bấm nút Tải thêm đang bị auto-load xóa khỏi DOM và cố tìm row chưa mount trong FlatList. Đã sửa harness dùng click không cuộn cho bài fallback, và cuộn container tới cuối nhiều nhịp như người dùng; chạy lại24/24PASS. Không che failure hoặc coi đó là24PASS ngay từ lần đầu.

API contract đã đối chiếu source public/order/notification hiện có; GET /api/health localhost8016 trả200 trong phiên. Chỉ đọc dữ liệu test local cho6request/ảnh; không ghi nghiệp vụ hoặc chuyển tiền thật. Những test dùng mock đã phân biệt rõ với backend thật.

APK cuối: .local/mobile-load-more/EventHub-load-more-x86_64.apk;52.907.614bytes;SHA25686708791FF584C56A19E3A2A27801686580EBDD361D095B609EA29CE06369DBE. Đã cài emulator-5554 thành công. Ký nội bộ/debug keystore; không ARM64/store build/OTA/IPA. API native dùng HTTPS có sẵn trong .env.local; file env không sửa.

## Tiêu chí chưa xác minh

- Nhiều trang authenticated/native vé/thông báo, đổi tài khoản trong lúc native request đang chạy, mất mạng và phục hồi native chưa chạy trọn luồng. Session isolation unit hiện có và filter-race UI không thay kiểm native.
- Chưa iOS/máy vật lý/TalkBack/VoiceOver/full-motion/FPS60; không tuyên bố hoàn tất nghiệm thu37màn hay phát hành.
- API vé không trả total/hasNext, nên dùng50bản/trang theo hợp đồng hiện hữu: nếu đúng50bản và không còn trang sau, người dùng có thể cần bấm Tải thêm một lần nhận trang trống rồi nút ẩn. Không suy đoán total hoặc sửa backend để che giới hạn này.
- Reload các trang đã nạp của thông báo dùng nhiều GET nối tiếp khi danh sách dài; không tạo endpoint/batch mới.
- Icon là wordmark ngang đặt vào nền vuông, giữ đúng logo theo yêu cầu; không có symbol riêng hoặc icon monochrome Android.

## Bàn giao và tiến độ

Evidence: [thư mục bằng chứng](evidence/MOBILE_PAGING_20261111_210623/). Gallery docs/ui/MOBILE_PHONE_PREVIEW.html bổ sung ảnh phiên này với nhãn mới: ví vé, thông báo, pager gọn, logo launcher. Ảnh cũ còn giữ ở các entry khác và báo cáo bất biến.

Master Plan bổ sung ghi chú5.4 và link MP-15; giữ IN_PROGRESS/NEEDS_REVIEW cho nghiệm thu toàn bộ. Không thay trạng thái artifact desktop hoặc nâng toàn bộ màn lên hoàn tất. mobile/README.md có hướng dẫn hành vi và tái tạo asset logo.


Kiểm tra cuối gallery:16mục, ảnh chế độ hẹp tải được, không pageerror. Lượt UI API local đầu có1timeout do chạy export đồng thời làm tạm mất index.html (snapshot: Export mobile before running UI tests); đã dừng export rồi chạy lại3/3PASS trên bundle ổn định. Đây là lỗi orchestration trong phiên, không gán thành lỗi bộ lọc sản phẩm. Bản APK cuối đã cài và ứng dụng có PID17213; font_scale giữ1.0.

