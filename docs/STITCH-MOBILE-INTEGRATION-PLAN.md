# Kế hoạch áp dụng Stitch cho mobile EventHub

Ngày lập: 21/10/2026. Cập nhật 22/10/2026: đã triển khai giao diện và kiểm tra bundle/test tự động trên branch `codex/stitch-mobile-integration`. Xem `docs/STITCH-MOBILE-IMPLEMENTATION.md` cho kết quả và phần kiểm thử thiết bị còn lại.

## 1. Phạm vi

Áp dụng nhận diện Stitch đã triển khai trên web vào ứng dụng Expo trong `mobile/`: nền tối, màu nhấn tím, font Be Vietnam Pro, ảnh sự kiện và card vé. Thiết kế lại bố cục cho thao tác cảm ứng trên Android/iOS; mobile web dùng hỗ trợ xem trước và kiểm thử.

Nguồn tham chiếu: [Stitch Eventix Ticketing Platform](https://stitch.withgoogle.com/projects/1181052013590326889), `docs/STITCH-WEB-INTEGRATION-PLAN.md`, `docs/STITCH-WEB-IMPLEMENTATION.md` và giao diện hiện tại trong `client/`. Chưa xác nhận có bộ thiết kế native riêng; kế hoạch này chuyển thể từ thiết kế web đã khảo sát. Giữ tên EventHub.

Phạm vi nghiệp vụ giữ như mobile hiện tại: khách hàng khám phá/mua/xem vé và nhân viên check-in. Organizer/Admin tiếp tục sử dụng web. Không bổ sung cổng thanh toán, push notification, vé offline, QR xoay, sơ đồ ghế, chỉnh sửa hồ sơ hoặc dashboard mobile trong đợt thay giao diện này.

## 2. Hiện trạng đã kiểm tra

- Expo `~57.0.26`, React Native `0.86.3`, React `19.2.3`, Expo Router; đã có camera, SecureStore, font và linking.
- Giao diện dùng `mobile/src/components/ui.tsx` với nền sáng/xanh lá; một số màn hình còn màu sáng viết trực tiếp. Root dùng status bar chữ tối; cấu hình app đặt `userInterfaceStyle: light`.
- Đã có đăng nhập/đăng ký, khôi phục phiên, danh sách/lọc sự kiện, chọn nhiều loại vé, tạo đơn, thanh toán demo/VNPay, lịch sử đơn, ví vé, QR, thông báo và staff check-in.
- Đã có cơ chế chống tạo đơn trùng, refresh token, giới hạn 10 vé/đơn, xử lý quyền camera và dừng camera khi rời màn hình/app.
- Baseline ngày 21/10: `npm run check:mobile` thành công — typecheck, lint và 9/9 unit test. Node có cảnh báo module type trong test; không làm test thất bại.
- Baseline trên không chứng minh giao diện native, camera thật hoặc thanh toán trên thiết bị đã được kiểm thử.

## 3. Nguyên tắc triển khai

1. Giữ router, hợp đồng API, quyền truy cập và logic nghiệp vụ hiện có; tách thay đổi UI khỏi thay đổi chức năng.
2. Định nghĩa token ngữ nghĩa cho background, surface, text, muted, border, primary và trạng thái. Không đổi mọi màu trắng thành màu tối: vùng QR phải giữ nền trắng và khoảng trống quanh mã.
3. Tái sử dụng font Be Vietnam Pro đang lưu trong `client/public/fonts`, mang theo giấy phép OFL; tải font cục bộ bằng cơ chế phù hợp SDK hiện tại, có trạng thái chờ/fallback.
4. Component native dùng StyleSheet và primitive React Native; không sao chép CSS/DOM từ web. Ưu tiên dependency đã có, không nâng Expo/RN trong đợt này.
5. Nội dung, giá, tồn kho, hạn thanh toán và trạng thái vé lấy từ API. Không thêm phí, VAT, giá miễn phí giả, số liệu hoặc phương thức thanh toán chỉ xuất hiện trong prototype.
6. Trước khi sửa API Expo/RN/EAS, đọc tài liệu đúng SDK 57 theo `mobile/AGENTS.md`; cấu hình native qua `app.config.ts` và config plugin.

## 4. Mapping màn hình

Các đường dẫn dưới đây tương đối với `mobile/src/`.

| Màn hình / file | Thay đổi dự kiến | Điều kiện nghiệm thu |
| --- | --- | --- |
| `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | Header và thanh tab tối, icon/text có trạng thái chọn rõ, status bar phù hợp | Giữ 5 tab và route hiện có; không che nội dung bởi tai thỏ/thanh điều hướng; badge thông báo còn hoạt động |
| `app/(tabs)/index.tsx` | Hero dọc từ sự kiện thật, ô tìm kiếm, danh mục cuộn ngang, bộ lọc địa điểm, card ảnh lớn | Giữ q/city/category, phân trang và kéo làm mới; có fallback ảnh và trạng thái không có kết quả |
| `app/events/[slug].tsx` | Banner, thông tin thời gian/địa điểm, mô tả, card từng loại vé và nút tăng/giảm; tổng tiền/CTA cuối màn hình | CTA nằm ngoài vùng che bởi safe area/keyboard; giữ giới hạn tổng 10 vé, tồn kho, thời gian bán và idempotency |
| `app/orders/[id].tsx` | Tóm tắt đơn, trạng thái các bước, hạn giữ vé, lựa chọn thanh toán và hành động hủy/thử lại | Số tiền/hạn từ server; không trả tiền hai lần do bấm lặp; giữ kiểm tra URL VNPay, polling có giới hạn và refresh khi quay lại app |
| `app/(tabs)/orders.tsx` | Card đơn với tổng tiền, thời gian, badge trạng thái và CTA theo trạng thái | Giữ phân trang, pull-to-refresh, điều hướng đúng đơn và quyền sở hữu |
| `app/(tabs)/tickets.tsx`, `app/tickets/[id].tsx` | Ví vé dạng card, thông tin sự kiện rõ, trang vé điện tử tối với vùng QR trắng | QR do server cấp, không bị cắt/giãn; mã vé vẫn có thể đọc/sao chép; trạng thái đã dùng/hủy thể hiện rõ |
| `app/(tabs)/staff.tsx` | Card lời mời và sự kiện được phân công, CTA vào scanner | Giữ chấp nhận/từ chối lời mời và kiểm tra quyền; không trộn ví vé khách với chức năng staff |
| `app/checkin/[id].tsx` | Khung camera, hướng dẫn, nhập mã dự phòng, kết quả thành công/trùng/không hợp lệ/không có quyền | Giữ khóa quét lặp, dừng camera khi blur/background, hướng dẫn cấp quyền và xử lý quyền bị thu hồi từ server |
| `app/auth.tsx`, `app/(tabs)/account.tsx` | Form, validation, loading, thẻ tài khoản và đăng xuất đồng bộ | Giữ khôi phục phiên, điều hướng tiếp tục đặt vé sau đăng nhập; không lộ dữ liệu người trước khi đổi tài khoản |
| `app/notifications.tsx` | Card đã đọc/chưa đọc, badge và hành động rõ trên nền tối | Giữ trạng thái đọc và điều hướng; không biến inbox hiện tại thành push notification |

## 5. Thứ tự thực hiện và đầu ra

### P0 — Chốt nền tảng và baseline

- Tạo branch riêng theo quy ước `codex/stitch-mobile-integration` khi bắt đầu triển khai; kiểm tra nhánh và thay đổi đang có trước khi tạo.
- Đọc tài liệu Expo 57 cho font, status bar, navigation/theme và các API native cần chạm tới.
- Chụp baseline các màn hình chính; xác định dữ liệu demo/test sẵn có, không sửa dữ liệu thật để lấy ảnh.
- Đối chiếu token web thực tế và lập bảng token mobile; xác định toàn bộ màu viết trực tiếp cần thay.

Đầu ra: phạm vi file rõ ràng và baseline có thể so sánh; không cần thay schema/API.

### P1 — Theme và component dùng chung

- Thêm `mobile/src/theme/tokens.ts` và typography; thêm font/giấy phép vào `mobile/assets/fonts/`.
- Sửa `components/ui.tsx`: Screen, Button, Field, Card, Notice, Badge, loading/empty/error; dùng token ngữ nghĩa.
- Đồng bộ root, tab bar, status bar và `app.config.ts` với nền tối.
- Chuẩn hóa vùng chạm tối thiểu 44–48, tương phản, trạng thái disabled/pressed, nhãn trợ năng; hỗ trợ chữ lớn và tiếng Việt.

Đầu ra: mọi màn hình dùng chung có nền/chữ đồng bộ, QR vẫn có nền trắng; không còn form sáng ngoài chủ ý thiết kế.

### P2 — Khám phá và chọn vé

- Hoàn thiện discovery, card sự kiện và detail trước để xác nhận ngôn ngữ thiết kế.
- Dùng bố cục một cột trên điện thoại; giới hạn chiều rộng hợp lý trên tablet.
- Giữ phân trang và trạng thái tìm kiếm hiện tại. Đánh giá FlatList khi danh sách gây vấn đề hiệu năng; tránh lồng hai vùng cuộn dọc.
- Bổ sung fallback ảnh/giá chưa có dữ liệu; tránh hiển thị giá 0 như vé miễn phí khi API không cung cấp giá.

Đầu ra: luồng khám phá → xem chi tiết → chọn vé → tạo đơn hoạt động với UI mới, kể cả mạng chậm và hết vé.

### P3 — Đơn hàng, thanh toán và ví vé

- Đồng bộ order list/detail, payment states, ticket list/detail.
- Giữ nguyên idempotency key khi retry cùng yêu cầu; chỉ đổi key khi nội dung đặt vé thay đổi theo logic hiện có.
- VNPay hiện mở trình duyệt ngoài và làm mới trạng thái khi app active/focus. Scheme `eventhub` không đồng nghĩa đã có callback thanh toán tự mở app hoàn chỉnh; không hứa luồng này nếu chưa bổ sung và kiểm thử riêng.
- Không suy luận thanh toán thành công từ việc người dùng quay lại app; luôn đọc trạng thái server.

Đầu ra: trạng thái pending/paid/expired/cancelled/review hiển thị phù hợp dữ liệu hiện có; vé QR đọc được bằng thiết bị quét khác.

### P4 — Staff và màn hình bổ trợ

- Đồng bộ staff assignments, scanner, auth, account và notifications.
- Giữ màn hình scanner tối giản khi camera chạy; kết quả dùng cả chữ/icon để không phụ thuộc màu.
- Rà soát loading/error/empty, bàn phím, Android Back và lifecycle khi chuyển tab/background.

Đầu ra: toàn bộ route trong phạm vi đồng bộ; không còn màn hình sáng cũ xen giữa luồng chính.

### P5 — Kiểm thử, bản chạy thử và bàn giao

- Chạy lại `npm run check:mobile` sau thay đổi; bổ sung test cho hành vi có rủi ro bị ảnh hưởng, không viết test chỉ kiểm tra tên màu/style.
- Thêm kiểm thử UI với API mock cho discovery, detail, checkout, QR và thông báo; tách khỏi bộ E2E cần backend/database thật trong `client/tests-mobile/`.
- Kiểm tra preview ở rộng 360/390/430 và tablet 768; lưu screenshot trước/sau. Browser preview không thay thế kiểm thử native.
- Chạy `npm run export --prefix mobile` để kiểm tra bundle các nền tảng. Export tạo bundle trong `mobile/dist`, không tạo APK.
- Chạy các luồng tích hợp và kiểm tra thiết bị ở bảng bên dưới. Tạo bản Android cài thử bằng profile EAS phù hợp khi có tài khoản/project/signing; kiểm tra iOS khi có thiết bị hoặc môi trường phù hợp.
- Bàn giao tài liệu chạy, cấu hình API, screenshot, kết quả kiểm thử và phần chưa kiểm chứng. Chỉ commit/push khi được yêu cầu cho đợt triển khai này.

## 6. Ma trận kiểm thử bắt buộc

| Nhóm | Tình huống cần kiểm tra |
| --- | --- |
| Layout | Safe area, bàn phím, chữ hệ thống lớn, tiếng Việt dài, ảnh lỗi, loading/empty/error, nút không bị che; VoiceOver/TalkBack cho điều khiển chính |
| Phiên | Khởi động lại app, token hết hạn, refresh lỗi mạng, logout/đổi tài khoản không còn dữ liệu riêng của phiên trước |
| Booking | Nhiều loại vé, tổng vượt 10, hết vé/hết thời gian bán, bấm liên tục, request timeout rồi retry không tạo đơn trùng |
| Payment | Demo và VNPay theo config; quay lại/hủy trình duyệt, app background, đơn hết hạn, pending kéo dài và trạng thái cần kiểm tra thủ công |
| Vé | QR đủ độ tương phản/khoảng trắng, quét bằng máy khác, mã dài, vé đã dùng/hủy, không truy cập vé người khác |
| Check-in | Cấp/từ chối/từ chối vĩnh viễn quyền camera, nhập tay, quét trùng liên tiếp, rời màn hình/app, quyền staff bị thu hồi, mạng lỗi không báo thành công giả |
| Tích hợp | Android thật trước; iOS thật cho lifecycle, quyền camera và mở trình duyệt thanh toán; ghi rõ nền tảng nào chưa kiểm chứng |

Điều kiện hoàn tất: check và export thành công; các màn hình trong phạm vi đồng bộ; các luồng nghiệp vụ chính không hồi quy; kết quả kiểm thử thiết bị được ghi nhận hoặc đánh dấu rõ phần bị chặn. Không tuyên bố hoàn tất kiểm thử Android/iOS chỉ dựa vào ảnh preview web.

## 7. Môi trường chạy và quyền cần thiết

| Cổng | Vai trò |
| --- | --- |
| 5173 | Vite frontend web hiện tại |
| 8000 | Backend/API; có thể đồng thời phục vụ bản web đã build |
| 8081 | Expo development server cho app mobile |
| 8082 | Mobile web preview theo script của project |

- `npm run dev:mobile` khởi động API/worker và Expo; không chạy đồng thời một bộ API khác trên cổng 8000. Kiểm tra tiến trình trước khi hướng dẫn khởi chạy, không tự dừng dịch vụ người dùng trong bước lập kế hoạch.
- Điện thoại cần truy cập được API qua IP LAN của máy tính hoặc backend HTTPS. `localhost` trên điện thoại là chính điện thoại. Docker hiện bind API vào `127.0.0.1:8000`, nên không mặc định truy cập được qua LAN.
- `npm run mobile:preview` dùng `scripts/mobile-preview.cjs`, chạy backend phục vụ static trên 8082 và cần cấu hình backend/database; không coi đây là static server thuần. Bộ mock UI nên có harness preview độc lập để tránh vô tình phụ thuộc database thật.
- Không cần quyền bổ sung để lập kế hoạch hoặc sửa source trong workspace. Kiểm thử camera cần cấp quyền trên thiết bị. EAS build cần quyền tài khoản Expo/project và signing; phát hành lên store là bước riêng, chưa thuộc phạm vi.
- Khi triển khai, nếu không truy cập được Stitch, backend thử nghiệm, thiết bị hoặc EAS thì thông báo ngay phần bị chặn và tiếp tục phần độc lập. Không yêu cầu người dùng gửi mật khẩu/token vào chat.
