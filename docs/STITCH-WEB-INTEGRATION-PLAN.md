# Kế hoạch áp dụng Stitch cho web EventHub

Ngày khảo sát: 21/10/2026. Trạng thái: kế hoạch, chưa triển khai giao diện.

## 1. Phạm vi và nguồn tham chiếu

- Chỉ web React trong `client/`, gồm desktop và responsive trên trình duyệt điện thoại/tablet. Không sửa ứng dụng Expo trong `mobile/`.
- Project: https://stitch.withgoogle.com/projects/1181052013590326889
- Prototype được người dùng chỉ định: https://stitch.withgoogle.com/preview/1181052013590326889?node-id=e4ae547fccf949b1b0e1f4b1e5ee5bf5&pli=1
- Đã đăng nhập và xem được project, đọc trực tiếp prototype trang khám phá, chi tiết/chọn vé/thanh toán, vé điện tử/check-in; đã xem ảnh màn hình trang khám phá.
- Canvas có màn hình `04 - Bảng Quản Trị & Thống Kê Sự Kiện`, nhưng chưa đọc được nội dung chi tiết màn hình này. Dashboard cần đối chiếu thêm trước khi chốt biểu đồ, KPI và bố cục. Đây chưa phải bản đặc tả pixel-perfect cho toàn bộ project.
- Canvas chứa hai bộ style: Modern Vietnamese Dark Minimalist (primary #6366F1, secondary #7C3AED, Be Vietnam Pro) và Atelier Nocturne (primary #8B6DF6, secondary #10B981, Newsreader/Be Vietnam Pro). Ưu tiên hình thức của prototype đã gửi; không trộn hai bộ token tùy ý. Màu CSS thực tế cần chốt khi lấy source hoặc đo từ bản thiết kế.
- Tên project Stitch là Eventix Ticketing Platform, prototype hiển thị NOVA EVENTS, code hiện tại dùng EventHub. Mặc định giữ tên EventHub khi tích hợp; thay thương hiệu là quyết định riêng.

## 2. Cơ sở kỹ thuật đã kiểm tra

Web hiện dùng React 19, Vite 7, TypeScript, React Router 7, Axios, Zustand, Tailwind 3 và bộ component Radix; có Lucide, Recharts và ZXing. Manifest cũng có plugin Tailwind Vite 4 nhưng Vite hiện chỉ bật React; không nâng/chuyển Tailwind trong đợt đổi UI.

`App.tsx` giữ routing, header/footer, kiểm tra phiên và Guard theo vai trò. `customer.tsx` tập trung các trang khách; `management.tsx` chứa Organizer/Admin. Giao diện chủ yếu nằm trong `ticketing.css`, hiện có màu sáng hard-code; `index.css` cũng định nghĩa token. Cần thống nhất hai lớp này để tránh trang tối nhưng card/form vẫn trắng.

Tái sử dụng `lib/api.ts`, auth store/service, `data.ts`, `types.ts`, `payment.ts` và hợp đồng API. Đặc biệt giữ cơ chế refresh token và chống request của phiên cũ chạy dưới tài khoản mới.

## 3. Mapping thiết kế vào route hiện có

| Thiết kế Stitch | Route web | Điểm sửa chính | Tiêu chí |
| --- | --- | --- | --- |
| 01 Khám phá | `/` | `Explore`, header/footer, EventCard, bộ lọc | Hero ảnh lớn và thông tin bên cạnh; tìm kiếm/danh mục/địa điểm dùng API, tổng kết quả thật |
| 02 Chi tiết/chọn vé | `/events/:slug` | `EventDetail`, TicketTypeSelector, BookingSummary | Banner, metadata, tăng/giảm vé, tổng dự kiến; tồn kho và thời gian bán được kiểm tra |
| 02 Thanh toán | `/checkout/:id` | `Checkout`, payment summary | Giữ route đơn hàng riêng, số tiền và hạn giữ vé từ server; phương thức theo `/config` |
| 03 Vé điện tử | `/tickets`, `/tickets/:id` | `MyTickets`, `TicketPage`, TicketCard | QR từ API, trạng thái thật, dễ đọc/quét trên nền trắng trong trang tối |
| 03 Trạm check-in | `/checkin`, `/checkin/events/:id`, khu vận hành Organizer | `staff.tsx`, `scanner.tsx`, `Operations` | Chỉ người có quyền, camera/nhập mã, kết quả server, lỗi và vé quét trùng |
| 04 Quản trị/thống kê | `/organizer`, `/organizer/events/:id/:tab`, `/admin/:tab` | `management.tsx`, layout quản lý | Giữ phân biệt Organizer theo sự kiện và Admin toàn hệ thống; chi tiết hình thức chờ đọc màn 04 |
| Các trang bổ trợ | `/auth/*`, `/profile`, `/orders`, `/notifications`, tạo/sửa sự kiện | Các component hiện hữu | Đồng bộ token và form; giữ các chức năng hiện có dù chưa thấy mẫu tương ứng |

## 4. Khác biệt nghiệp vụ phải xử lý

| Chi tiết trong prototype | Hiện trạng/đề xuất đợt đầu |
| --- | --- |
| 128 sự kiện, ngày năm 2025, giá và tên người mẫu | Dùng dữ liệu API; không sao chép con số, danh tính và trạng thái mẫu |
| Hero sự kiện nổi bật | Chưa thấy trường featured trong kiểu Event đã đọc. Đợt đầu chọn từ kết quả công khai theo quy tắc rõ ràng; nếu cần biên tập hero riêng, tách yêu cầu API |
| Nhãn sắp hết vé/Early Bird | Chỉ hiển thị khi có dữ liệu/quy tắc tương ứng; không suy đoán từ ảnh thiết kế |
| Sơ đồ sân khấu, ghế A1-24, cổng vào | Kiểu Event/Ticket hiện chưa có mô hình ghế/cổng/sơ đồ. Để ngoài đợt UI đầu; sơ đồ tương tác cần thiết kế dữ liệu và tồn kho riêng |
| Coupon -150.000đ, phí 30.000đ, VAT 8% | Chưa thấy hợp đồng tương ứng trong luồng đã khảo sát. Không thêm vào phép tính client; tổng đơn lấy từ backend |
| VNPAY, MoMo, thẻ quốc tế | Code hiện có demo và VNPay sandbox. Chỉ hiển thị phương thức backend bật; MoMo/thẻ là tích hợp riêng |
| Đồng hồ giữ vé 10:00 | Tính từ `expires_at` của đơn; hết hạn/refresh trang không được tự gia hạn |
| Vé gửi tức thì SMS/email | Có SMTP cho auth nhưng chưa thấy luồng phát hành vé qua SMS/email. Dùng vé trong tài khoản và thông báo hiện có |
| QR động cập nhật sau 20 giây | Backend đang trả QR từ token vé lưu trữ. Không thêm đếm ngược giả; QR luân phiên cần giao thức server riêng |
| Vé khách và trạm quét chung trang | Tách trang theo quyền hiện có, cùng chia sẻ phong cách UI |
| Độ trễ 12ms, cổng đang hoạt động | Không có dữ liệu đo thì bỏ chỉ báo này |
| Đổi camera/flash | Chỉ bật theo khả năng thiết bị; có nhập mã dự phòng và xử lý từ chối camera |
| Lưu/chia sẻ vé | Có thể bổ sung tải ảnh QR/vé khi triển khai; chức năng chia sẻ/chuyển quyền vé không mặc định nằm trong đợt đầu |
| Hotline, hoàn vé, điều khoản | Chỉ đưa nội dung/liên kết được xác nhận; không hứa hoàn tiền tự động từ mẫu |

## 5. Các bước triển khai

### P0 — Chốt baseline và tài nguyên

1. Đọc chi tiết màn 04; lấy ảnh/source export nếu quyền xem hiện tại không cung cấp được. Không cần quyền sửa project Stitch để khảo sát.
2. Chụp các trạng thái thiết kế ở viewport tương ứng; lập danh sách ảnh, font, icon và nguồn được phép dùng. Nếu không có export, dựng lại React từ mẫu đã xem.
3. Ghi nhận baseline `npm run build --prefix client`, `npm run lint --prefix client` và các test web liên quan. Kiểm thử có tạo đơn/tài khoản dùng môi trường test riêng.
4. Chốt từng trường UI vào dữ liệu API; tách rõ phần UI áp dụng ngay và phần cần nghiệp vụ mới ở mục 4.

### P1 — Token, layout và component dùng chung

- Tạo bộ token semantic cho nền/surface/border/text/accent/success/error, font Be Vietnam Pro, khoảng cách, radius, shadow và focus.
- Cập nhật `index.css`, `ticketing.css`, `tailwind.config.js` theo một nguồn token; thay các màu hard-code theo từng nhóm trang.
- Tách header/footer và layout khách/quản lý từ `App.tsx` khi cần, giữ Guard và khởi tạo session.
- Dùng lại component có sẵn; bổ sung EventCard, TicketTypeSelector, BookingSummary, TicketCard và StatCard ở mức cần thiết. Không import nguyên trang HTML có script/mock của Stitch vào ứng dụng.
- Hoàn thành khi layout và control dùng chung nhất quán, bàn phím dùng được, chữ tiếng Việt đầy đủ, không vỡ responsive.

### P2 — Khám phá và chi tiết sự kiện

- Dựng hero, search/filter bar, lưới card, metadata và chọn hạng vé theo mẫu.
- Giữ query/filter/pagination, điều hướng slug và tạo đơn bằng API hiện có.
- Bổ sung empty/loading/error, ảnh lỗi, tên dài, hết vé, chưa/mất thời gian bán, sự kiện dừng bán.
- Hoàn thành khi từ trang chủ lọc được sự kiện thật, chọn vé và chuyển sang đúng đơn hàng.

### P3 — Checkout, vé và tài khoản

- Restyle checkout theo summary của Stitch; giữ flow demo/VNPay, kiểm tra URL thanh toán, polling và trạng thái cần đối soát.
- Restyle vé điện tử với vùng QR trắng đủ khoảng trống; giữ API lấy QR và phân quyền người sở hữu.
- Đồng bộ đăng nhập/đăng ký/reset, đơn hàng, hồ sơ, thông báo theo cùng design system.
- Hoàn thành khi thanh toán thất bại/chờ xác nhận không hiển thị vé thành công; refresh/quay lại checkout vẫn đúng trạng thái.

### P4 — Organizer, Admin và check-in

- Áp dụng dashboard sau khi đối chiếu màn 04; chỉ vẽ biểu đồ khi API cung cấp đúng series, không dựng số liệu giả từ tổng KPI.
- Đồng bộ tạo/sửa sự kiện, loại vé, gửi duyệt, duyệt sự kiện/Organizer, tài khoản, danh mục, giao dịch và thống kê.
- Restyle scanner và kết quả, quản lý lời mời nhân viên, nhật ký; giữ giới hạn quyền theo sự kiện.
- Hoàn thành khi thao tác quản lý vẫn hoạt động, quyền khách/nhân viên/Organizer/Admin không bị lẫn bởi layout mới.

### P5 — Nghiệm thu và bàn giao

- Kiểm tra 1440, 1024, 768 và 390px; không tràn ngang, form có label/focus, modal sử dụng được bằng bàn phím, lỗi có nội dung rõ ràng.
- So sánh ảnh chụp với mẫu ở cùng viewport: bố cục, màu, font, spacing, tỷ lệ ảnh, CTA.
- Build/lint client; chạy các suite phù hợp: `mvp.spec.ts`, `vnpay-ui.spec.ts`, `session-isolation.spec.ts`, `checkin-staff.spec.ts`, `notifications*.spec.ts`.
- Cập nhật selector test khi nhãn/bố cục đổi nhưng giữ assertion nghiệp vụ; thêm kiểm tra responsive/visual cho các trang thực sự đổi.
- Test backend/integration chỉ cần mở rộng khi phải đổi API; không chạy test ghi dữ liệu lên DB dùng chung của ứng dụng.
- Kiểm tra camera trên trình duyệt/thiết bị thật với HTTPS hoặc localhost, và nhập mã khi camera không dùng được.
- Bàn giao theo từng nhóm thay đổi P1–P4 để review/revert; cập nhật tài liệu bằng kết quả thực chạy. Trong lần khảo sát này chưa chạy build/test và chưa sửa mã ứng dụng.

## 6. Thứ tự ưu tiên đề xuất

P0 → P1 → P2 → P3 → P4 → P5. Mốc review đầu tiên là trang khám phá và chi tiết nối API thật; mốc thứ hai là mua vé đến QR; cuối cùng là quản lý/check-in và regression toàn web.

Đợt đầu ưu tiên thay UI trên nghiệp vụ sẵn có. Coupon, nhiều cổng thanh toán, ghế/cổng vào, QR động, SMS/email vé và chỉ số realtime là backlog riêng có yêu cầu API/DB nếu muốn triển khai đầy đủ như nội dung mẫu.
