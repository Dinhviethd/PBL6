# A3 — Triển khai chi tiết sự kiện và đặt vé

## Phạm vi, nguồn và yêu cầu

- Thời điểm ghi nhận: 2026-10-27 19:34:58, Asia/Ho_Chi_Minh.
- Project: `10374042969343935993`; màn `fc8d79b4b6f14de19b6aa2f81e3380e6`, “Chi tiết sự kiện & Đặt vé - Cosmic Sound Festival”; metadata DESKTOP 2560×6086.
- Đã đọc Master Plan trước khi gọi Stitch; dùng skill `.agents/skills/eventhub-stitch-review/SKILL.md` và kế hoạch A3. Ban đầu code có luồng đặt vé nhưng chưa đồng bộ; artifact Stitch review KHÔNG ĐẠT, correction BLOCKED.
- Yêu cầu: tái hiện bố cục A3 tại `/events/:slug`, dùng thương hiệu EventHub, bỏ coupon, lấy dữ liệu thật và tổng đơn do backend tính; chỉ cập nhật A3 và tài liệu liên quan.
- Xác nhận thêm của người dùng: bỏ đánh giá sao; yêu thích chỉ bật/tắt frontend, không lưu database; dùng ảnh bìa thay bộ ảnh; giữ quy định đồ uống/vật cấm và từ 16 tuổi thành nội dung chung frontend.

## Thao tác thực tế và tuân thủ thiết kế

Gọi Stitch `get_project`, `get_screen`, `download_file`; đọc HTML `projects/10374042969343935993/files/10757340559202179948` và xem ảnh `projects/10374042969343935993/files/15635788347050740884`. Không gọi edit/generate, không tạo bản trùng, không thay đổi artifact Stitch.

Giữ hero ảnh nền, thông tin, hai cột desktop, khối giới thiệu/địa điểm/lưu ý, bảng vé và CTA cyan, gradient tím/cyan/hồng; dùng màu và font từ artifact, tên sự kiện Be Vietnam Pro theo HTML thực tế. Header/footer dùng chung với A1/A2, brand EventHub. Các thay đổi nội dung đã được người dùng xác nhận ở trên. Ảnh và dữ liệu sự kiện lấy từ backend; không chép nội dung sự kiện mẫu. Khối vị trí dùng địa chỉ thật và link Google Maps theo truy vấn, không hiển thị ảnh bản đồ tĩnh sai địa điểm; chưa nhúng bản đồ tương tác.

Các tệp triển khai:

- `client/src/pages/public/EventDetail.tsx`: dữ liệu chi tiết, category, hero, ảnh bìa, thông tin, chia sẻ liên kết, yêu thích cục bộ, trạng thái tải/lỗi và thử lại; ngày giờ GMT+7.
- `client/src/pages/public/EventTicketSelector.tsx`: chọn vé, trạng thái bán, giới hạn tổng 10, tạm tính, tạo đơn có Idempotency-Key, chặn gửi lặp khi đang xử lý, giữ khóa khi lỗi mạng chưa rõ kết quả, xử lý lỗi tồn kho/bán vé. Giữ component hàng chờ đã có.
- `client/src/pages/public/event-detail.css`: style có phạm vi A3, desktop/tablet/mobile, focus và nhãn điều khiển.
- `client/src/App.tsx`: chỉ bổ sung nhận diện route chi tiết sự kiện vào shared shell; giữ các thay đổi A2/A5 có sẵn.
- `client/tests/a3-event-detail.spec.ts`: kiểm thử dữ liệu thật, lỗi mạng, vé đóng bán, yêu thích không lưu sau reload, giới hạn tổng vé, login/đặt vé/checkout/hủy, responsive.

Không sửa backend, schema hoặc các page A2/A5/auth/checkout. Những thay đổi backend và các màn khác đã có trong workspace trước phiên được giữ nguyên.

## API đã xác minh

Môi trường: API `http://localhost:8000/api`; frontend/proxy `http://localhost:5173`.

| API | Bằng chứng | Tích hợp |
|---|---|---|
| GET /api/health | 200, status ok, kiểm tra DB qua categories | Xác nhận môi trường. |
| GET /api/events, GET /api/events/:slug | 200, sự kiện và ticketTypes thật | A3 dùng chi tiết; danh sách phục vụ lựa chọn dữ liệu kiểm thử. |
| GET /api/categories | 200 | Nhãn danh mục/link về explore. |
| POST /api/auth/login, GET /api/auth/me | 200 với tài khoản seed development | Cơ chế auth chung, thông tin email và luồng guest → login → trở lại A3. |
| POST /api/orders | 200; 1 vé 150.000đ trả total_amount 150000, PENDING_PAYMENT | A3 chỉ gửi eventId/items, không gửi giá/tổng client; checkout dùng tổng backend. |
| POST /api/orders, lặp cùng khóa | 200, cùng order ID trong kiểm tra trực tiếp | Đã xác minh idempotency, không tạo đơn trùng. |
| GET /api/me/orders/:id | 200, total_amount và line_total 150000 | Checkout sẵn có đọc lại tổng backend. |
| POST /api/orders/:id/cancel | 200 | Hủy đơn kiểm tra và trả chỗ; UI checkout hiện có đã thử thành công. |
| POST /api/events/:id/wait-queue | 409 TICKETS_AVAILABLE với vé còn chỗ | Route/service kiểm tra đúng điều kiện; không tạo hàng chờ; giữ UI hàng chờ hiện có. Chưa thử thành công khi hết vé. |
| POST /api/auth/refresh-token | 403 ORIGIN cho localhost:5173 và 127.0.0.1:5173 trên backend đang chạy | Hạn chế môi trường chưa sửa; full reload có thể mất trạng thái đăng nhập. |
| POST /api/orders/:id/payments | Route và workflow đã đọc; không gọi trong phiên | A6 giữ nguyên; chưa kiểm thử giao dịch/VNPay hay phát hành QR. |

Tổng trước tạo đơn là tạm tính từ giá API và số lượng; không tự thêm phí, VAT hoặc giảm giá. Tổng thanh toán chính thức chỉ từ backend. Không có endpoint báo giá riêng trong route đã kiểm tra.

Đã tạo đơn kiểm tra bằng tài khoản seed và hủy qua API/checkout sau kiểm tra; không thực hiện thanh toán thật, không tạo dữ liệu giả để hiển thị A3.

## Kiểm thử và review

- `npm run build` trong client: PASS sau thay đổi cuối frontend. Còn cảnh báo bundle >500 kB, Browserslist và baseline-browser-mapping cũ.
- ESLint riêng các tệp A3 và test: PASS.
- Playwright Edge, dữ liệu/API thật: 7 trường hợp đã đạt. Lượt đầu lỗi tên nút login trong test, đã sửa. Lượt tiếp theo đạt 6/7, bài đăng nhập bị ảnh hưởng bởi full reload → refresh 403 ORIGIN. Đã đổi bài đó sang luồng điều hướng người dùng A3 → đăng nhập → quay lại A3 → checkout → hủy, chạy lại riêng 1/1 PASS. Không coi lỗi refresh đã được sửa.
- Fault injection chỉ ngắt request để thử lỗi mạng; không mock dữ liệu nghiệp vụ.
- Đã xem ảnh frontend [1440px](evidence/A3_20261027_implementation/1440.png), [768px](evidence/A3_20261027_implementation/768.png), [390px](evidence/A3_20261027_implementation/390.png). Không tràn ngang ở các viewport này.

| Tiêu chí | Kết quả | Giới hạn |
|---|---|---|
| Nội dung / yêu cầu | PASS | EventHub, bỏ coupon, dữ liệu thật và các điều chỉnh đã duyệt. |
| Bố cục | PASS | So sánh ảnh desktop/mobile với cấu trúc Stitch; nội dung dài/ngắn theo sự kiện thật. |
| Cosmic Graffiti | PARTIAL | Bám màu/font artifact; token artifact và mô tả designMd còn khác nhau như review trước. |
| Ngôn ngữ / đọc | PARTIAL | Ngày giờ và nội dung Việt đúng dữ liệu; chưa audit contrast đầy đủ. |
| Điều hướng / nghiệp vụ | PARTIAL | A3 → login → đặt vé → checkout/hủy đạt; reload auth ORIGIN còn lỗi, thanh toán chưa thử. |
| Trạng thái | PARTIAL | Loading, lỗi/try again, thiếu sự kiện, đóng bán, zero/max quantity đã kiểm tra; empty ticket list, sold-out/hàng chờ thành công chưa có dữ liệu kiểm thử phù hợp. |
| Responsive / accessibility | PARTIAL | 1440/768/390 không tràn ngang; dùng bàn phím chọn vé, nút có nhãn, aria-pressed/live; chưa audit screen reader đầy đủ. |
| Nhất quán | PASS | Dùng header/footer chung, CSS A3 có phạm vi riêng; không đổi page khác. |

Kết quả frontend: **ĐẠT CÓ ĐIỀU KIỆN** trong luồng điều hướng đã thử. Thiết kế Stitch cuối cùng giữ nguyên; review artifact trước vẫn **KHÔNG ĐẠT**, correction vẫn **BLOCKED** theo yêu cầu không edit. Không đánh dấu toàn bộ luồng thanh toán hoặc auth đã hoàn thành.

## Còn lại và cập nhật tài liệu

1. Xác minh cấu hình Origin của backend đang chạy để refresh phiên trên localhost hoạt động; không tự mở rộng phiên A3 sang sửa bảo mật/auth.
2. Kiểm thử hàng chờ khi hết vé, dữ liệu rỗng, biến động tồn kho/giá và giao dịch thanh toán đầy đủ; audit contrast/screen reader.
3. Khối bản đồ hiện là link chỉ đường theo địa chỉ thật; yêu thích và quy định là frontend theo xác nhận người dùng.
4. Đã cập nhật kế hoạch A3, Master Plan mục thông tin tài liệu, ma trận API (chi tiết sự kiện/đặt vé), hàng A3 ở 5.1/5.4 và mục 6.F; giữ thông tin A2/A5 và các màn khác.
