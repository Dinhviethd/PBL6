# Feature B7 — Chi tiết đơn hàng

- Cập nhật: 2026-10-31 14:59:25 UTC+7 (Asia/Ho_Chi_Minh).
- Loại: kế hoạch và nhật ký triển khai; **đã triển khai frontend/API và kiểm thử trên DB cô lập**.
- Nguồn: [Master Plan](../PROJECT_MASTER_PLAN.md), skill `eventhub-stitch-review`, yêu cầu người dùng và source hiện tại.
- Báo cáo mới nhất: [Triển khai liên hệ/timeline/thụ hưởng](../reports/stitch/B7_20261031_145925_contact_timeline_bank_implementation.md); [kế hoạch bổ sung](../reports/stitch/B7_20261031_145003_contact_timeline_bank_plan.md); [triển khai B7 trước](../reports/stitch/B7_20261031_143306_implementation.md).
- Kết quả hiện tại: **ĐẠT CÓ ĐIỀU KIỆN** trên DB test cô lập: B6 → B7, detail/QR/in, trạng thái và quyền đã kiểm thử. Lượt triển khai đầu nạp4 JS, lượt bổ sung nạp5 JS vào API8000; health200/detail401 không token trực tiếp và quaVite5173. Chưa xác minh authenticated Live, audit accessibility đầy đủ hoặc browser khác Chrome. KYC/rủi ro/QR động/POS chỉ UI + toast; timeline đơn hàng hiện lấy dữ liệu thật theo9.6, chưa phải audit toàn bộ thao tác.
- Phạm vi bổ sung mục9 **ĐÃ TRIỂN KHAI VÀ KIỂM THỬ**, xem9.6: phone liên hệ hiện tại, timeline từ timestamp thật với cửa sổ VietQR tối đa15 phút, mốc cấp QR thay email, tài khoản thụ hưởng theo payment snapshot. KYC/risk/QR động/POS vẫn chỉ UI + toast. Đã nạp5 JS vào API8000, health200 và detail401 không token cả trực tiếp/qua5173; chưa xác minh authenticated Live.

## 1. Phạm vi và nguyên tắc

Các phiên lập kế hoạch trước chỉ sửa tài liệu. Phiên triển khai hiện tại được người dùng cho phép tạo B7, nối B6, bổ sung API và kiểm thử; sau đó người dùng xác nhận nạp API vào container local8000. Không sửa Stitch, không gọi `edit_screens`, không tạo bản sao B7; không chạy migration hay thay dữ liệu Live.

Khi triển khai ở phiên sau:

- Sao lại bố cục B7 đã có trên Stitch; không tự thiết kế lại.
- Dùng lại `OrganizerSidebar`, active `Đơn hàng`; giữ CSS/sidebar chung hiện có. Chọn `hideLiveSync` giống B6 để tránh trình bày trạng thái máy chủ tĩnh là dữ liệu vận hành thật; đây là cách tái sử dụng sidebar theo yêu cầu, cần ghi trong báo cáo triển khai.
- Thêm **cột riêng “Chi tiết”** vào `OrderManagerPage`, liên kết đến B7 theo `order.id`. Giữ thao tác preview/in B6 hiện tại, không dùng nút Eye preview thay cho cột mới.
- JSX/TypeScript và CSS của trang B7 nằm trong một file `.tsx`; CSS trong template string và `<style>{styles}</style>` như B6, mỗi selector/thuộc tính và JSX xuống dòng dễ đọc, không nén một dòng. Không gộp hoặc sao chép lại CSS sidebar dùng chung.
- Mọi chỉnh sửa tiếp theo phải bổ sung nhật ký ở cuối **file kế hoạch này**, tạo report riêng mới và cập nhật B7 trong Master Plan.

## 2. Nguồn Stitch đã xác minh

| Thuộc tính | Giá trị |
|---|---|
| Project | `10374042969343935993` — EventHub |
| Screen chính | `0e7d1d0aa45f47e7be30f44864b09272` |
| Title nội bộ | B7. Chi tiết đơn hàng - Cosmic Ticket Ban Tổ Chức |
| Metadata màn hình | DESKTOP, 2560×3364 |
| HTML | `projects/10374042969343935993/files/12761929990177829747` |
| Screenshot | `projects/10374042969343935993/files/3010392199641701271` |
| Truy cập | `get_project`, `list_screens`, `get_screen`, `download_file` thành công; HTML đã đọc, ảnh đã xem |

Master Plan còn ghi biến thể `0a2708e17325456990198cec0f0d162a`; project metadata hiện ghi instance này bị ẩn và label “Generating Screen...”. Không dùng biến thể để thay screen chính, không review hoặc chỉnh sửa biến thể.

Khung tham chiếu: sidebar cố định 256px, topbar 64px; nút quay về danh sách; dải mã đơn/trạng thái/mã giao dịch/ngày tạo/nút in; lưới nội dung 8/4 cột ở `lg`, một cột ở kích thước nhỏ theo HTML. Cột trái: hồ sơ khách hàng, vé có đường cắt/khuyết và QR, dòng tiền. Cột phải: rủi ro, lịch sử thao tác, hỗ trợ cổng. Không suy ra responsive đã đạt từ các class này.

## 3. Đối chiếu Cosmic Graffiti

Project dùng Syne cho heading, Be Vietnam Pro cho nội dung, Space Grotesk cho nhãn/dữ liệu; có tím, cyan, hồng, badge và thẻ vé khuyết phù hợp ngôn ngữ Cosmic Graffiti.

| Token | Quy chuẩn mô tả | HTML B7 thực tế |
|---|---|---|
| Canvas | `#080B1A` | `background #0F1222` |
| Card | `#10162B` | `surface-container-low #181B2A`, khối con `#1C1F2F` |
| Tím | `#7C3AED` | `primary-container #7C3AED`, primary `#D2BBFF` |
| Cyan | `#22D3EE` | secondary `#5DE6FF` |
| Hồng | `#F472B6` | tertiary `#FFAFD3` |
| Chữ | `#F8FAFC` / `#94A3B8` | on-surface `#E0E1F7` / outline `#958DA1` |

Theme tự sinh của project và phần mô tả designMd có khác biệt. Khi sao B7, giữ màu thực tế của artifact đã xem, ghi sai lệch trong báo cáo; không tự đổi toàn bộ sang token mô tả. Sidebar EventHub có sẵn là ngoại lệ tái sử dụng được người dùng yêu cầu so với thương hiệu COSMICOPS trong ảnh. Chưa đo contrast; sidebar trong ảnh có badge BTC bị xuống dòng, không sao lỗi này vào sidebar chung.

## 4. Các điểm chưa đạt so với project đã code

**Bảng G01–G11 là snapshot trước triển khai**, được giữ để truy vết. Trạng thái đã giải quyết và giới hạn hiện tại xem mục 5.6 cùng report triển khai; không dùng bảng lịch sử này để kết luận API/page hiện vẫn chưa có.

| ID | Phát hiện có bằng chứng | Hướng giải quyết trong kế hoạch |
|---|---|---|
| G01 | `App.tsx` chỉ có route danh sách orders, chưa có route B7 theo orderId; mapping B7 trong Master Plan đang dùng route B6 | Bổ sung route chi tiết có Guard và organizer shell ở phiên triển khai |
| G02 | B6 có 7 cột và Eye gọi `selectOrder` để mở preview tại trang; chưa có cột/link Chi tiết | Thêm cột riêng, link dùng eventId + UUID orderId |
| G03 | Chưa có page chi tiết với dải mã đơn, hồ sơ, vé, thanh toán và cột phải như B7 | Tạo `OrderDetailsPage.tsx` dự kiến, dùng sidebar hiện có |
| G04 | Backend có list và preview vé, chưa có GET chi tiết Organizer tổng hợp theo orderId trong `app.ts` | Định nghĩa rồi triển khai/kiểm chứng API chi tiết trước tích hợp; không quét list để giả lập detail |
| G05 | List DTO trả `buyer.phone=null`; không cung cấp KYC Level 2, VIP member, nhà mạng/SMS và trạng thái xác minh email | Phone thiếu hiển thị “Chưa có thông tin”; KYC và thông tin xác minh minh họa theo mục 5.2, có nhãn đang phát triển |
| G06 | Preview QR sinh từ token bằng `QRCode.toDataURL`, không có contract xoay mã 42s hoặc Dynamic QR v3.2 chống chụp | QR vé cơ bản dùng API thật; phần QR động chỉ trình bày và nhấn hiện thông báo, không thực sự xoay token/đếm ngược |
| G07 | Chưa có contract đọc rủi ro/audit đơn/POS; audit đã có bộ ghi log nội bộ | Các khu vực KYC/rủi ro/QR động/audit/POS là UI-only được duyệt, không yêu cầu thêm API trong phạm vi B7; nhấn báo đang phát triển |
| G08 | Artifact có tạm tính 1.299.000đ + phí 0đ nhưng tổng 1.169.100đ, thiếu dòng giải thích 129.900đ; mã giao dịch VNP nhưng gateway hiển thị MBBank | Tổng/line items/provider từ API phải nhất quán; không sao số liệu ví dụ hoặc tự thêm giảm giá 10% |
| G09 | Nút “In hóa đơn / Vé” trong Stitch chưa có hành vi; B6 chỉ có in vé trình duyệt | Tách rõ khả năng in vé và hóa đơn; chưa xác minh API hóa đơn, không gọi bản in vé là hóa đơn tài chính |
| G10 | Preview backend chặn đơn không PAID hoặc đang tra soát bằng 409; B7 cần vẫn xem được thông tin những đơn này | Detail metadata độc lập preview; không biến 409 preview thành mất toàn bộ trang |
| G11 | Chưa có trạng thái B7 loading/404/403/empty/error, kiểm thử deep-link/reload/back hoặc responsive/a11y | Thực hiện checklist nghiệm thu sau khi triển khai |

`Operations.tsx` cũ có link checkout cho đơn, nhưng route orders hiện tại đã được `OrderManagerPage` bắt riêng. Checkout không phải trang chi tiết Organizer và API lịch sử khách hàng kiểm tra buyer ownership, không dùng để thay B7.

## 5. API và ánh xạ dữ liệu

Các đường dẫn dưới đây tương đối với Axios base mặc định `/api` (có thể override bằng `VITE_API_BASE_URL`); kiểm tra source **không đồng nghĩa** dữ liệu nghiệp vụ hoạt động runtime. Phiên bổ sung đã gọi GET read-only không token tại localhost, không đăng nhập, không dùng nội dung `.env`, không tạo đơn/thanh toán. Bằng chứng HTTP và giới hạn tại mục 5.1.

| Method/route hiện có trong source | Khả năng và giới hạn |
|---|---|
| `GET /organizer/events/:id` | Metadata event; cần kiểm chứng quyền và HTTP ở môi trường triển khai |
| `GET /organizer/events/:eventId/order-manager` | List phân trang 50, buyer name/email, items, tổng tiền, paid/active/latest payment, counts vé; không phải detail endpoint |
| `GET /organizer/events/:eventId/orders/:orderId/tickets` | Guard event owner hoặc ADMIN, kiểm tra đơn thuộc event; chỉ PAID và không tra soát; trả QR và trạng thái vé |
| `GET /organizer/events/:id/orders` | List legacy, không có contract chi tiết tổng hợp |
| `GET /me/order-history/:id` | Buyer-only; không thay thế API Organizer |

**Đề xuất, chưa tồn tại:** `GET /organizer/events/:id/orders/:orderId` cho chi tiết. Route dùng `id` để sidebar hiện tại đọc được event context. Request không có body; xác thực theo cơ chế hiện có. Response cần được thống nhất trước triển khai:

- Order UUID/code, event snapshot + metadata được phép xem, createdAt/expiresAt/status, currency/quantity/totalAmount dạng chuỗi tiền nguyên, asOf.
- Buyer snapshot name/email và phone nullable có nguồn; không tự điền dữ liệu người đang đăng nhập.
- Items gồm tên hạng/đơn giá/số lượng/thành tiền; payment phân biệt paid/active/latest và cờ tra soát, provider/reference nullable có nghĩa rõ ràng.
- Tickets và trạng thái phát hành/check-in theo khả năng backend; quyền preview/in trả từ backend. Dữ liệu QR nhạy cảm chỉ cấp khi đủ điều kiện.
- KYC/risk/QR động/audit/POS không thuộc contract API B7 hiện tại: chỉ hiển thị theo xác nhận người dùng tại mục 5.2. Invoice vẫn là khả năng riêng chưa có API được xác minh; không dựng timeline vận hành thật từ mốc thanh toán.

Điều kiện mở tích hợp: xác minh route → workflow/public module theo ownership hiện có → schema request/response → HTTP với Organizer đúng chủ/khác chủ, ADMIN và guest; kiểm tra order khác event, UUID lỗi, không tồn tại, PAID/PENDING_PAYMENT/CANCELLED/EXPIRED và payment review. Ghi base URL, thời điểm, status và response mẫu đã che thông tin cá nhân trong report mới. Nếu API chưa có/không hoạt động, ghi `BLOCKED` cho tích hợp, không mock để che thiếu hụt.

### 5.1. Kiểm tra lại API thực tế ngày 2026-10-31

GET không token, không cookie, không mutation; eventId thử `00000000-0000-4000-8000-000000000001`, orderId thử `00000000-0000-4000-8000-000000000002`, không giả định đây là bản ghi tồn tại.

| URL tại `http://localhost:8000` | HTTP | Kết luận được phép |
|---|---|---|
| `/api/health` | 200 | API process phản hồi; không chứng minh quyền hoặc dữ liệu B7 |
| `/api/organizer/events/{eventId}/order-manager` | 401 | Khớp route bảo vệ có trong source; chưa kiểm chứng response có dữ liệu |
| `/api/organizer/events/{eventId}/orders/{orderId}/tickets` | 401 | Khớp preview bảo vệ trong source; chưa kiểm chứng QR/quyền owner thực tế |
| `/api/organizer/events/{eventId}/orders/{orderId}` | 404 | Không có route detail trong source và runtime thử; đây không phải bằng chứng order thử tồn tại hay không |

Cùng bốn GET tại `http://localhost:8011` đều không kết nối được (`URLError`, timeout đặt 5 giây/request). Không suy ra cổng 8011 đang chạy, không khởi động/restart dịch vụ. Chưa có token Organizer cho lần kiểm tra này; chưa xác minh 200 authenticated, cross-tenant, ADMIN, QR và DB thật. Không cần người dùng cung cấp secret để hoàn thành phần tài liệu.

### 5.2. Phạm vi UI-only đã được người dùng xác nhận

Giữ card, bố cục và phong cách các khu vực **KYC, đánh giá rủi ro, QR động, lịch sử audit và POS/Gate Support** theo Stitch. Những khu vực này chỉ nhằm trình bày giao diện; không cần xây API thật trong đợt B7 hiện tại. Đây là xác nhận mới thay cho yêu cầu chờ quyết định ở report ban đầu.

- Nhãn/card/badge hoặc control của từng khu vực có vùng kích hoạt rõ ràng; dùng button hoặc control có tên truy cập được, hỗ trợ Enter/Space. Không gắn click vào toàn card làm cản thao tác nút con/chọn văn bản.
- Mọi thao tác trong các phần này, gồm “Tải lại QR” và đồng bộ POS, chỉ hiện toast **“Chức năng đang được phát triển”**. Không gửi API, xoay QR, chạy audit, xác minh danh tính hoặc giả báo đồng bộ thành công.
- Đánh dấu “Đang phát triển” hoặc “Dữ liệu minh họa” ngay tại khu vực để KYC Level 2/LOW RISK/100%/mốc audit không bị hiểu là kết quả thật của đơn. Không dùng thông tin cá nhân mẫu trong Stitch để thay buyer thật. Giữ nhãn và hình thức tham chiếu trong phạm vi minh họa đã được duyệt.
- Phân biệt **QR vé cơ bản** với **tính năng QR động**: QR cơ bản lấy từ API preview thật để xem/in, chỉ khi backend cho phép; không thay bằng SVG trang trí để dùng check-in. Nhãn dynamic/rotate chỉ thuộc phần minh họa, không có timer 42s chạy như chức năng thật.
- Lịch sử audit minh họa không được trình bày như bằng chứng thanh toán/gửi email của đơn; giữ mẫu trong khu vực có nhãn minh họa hoặc trạng thái chưa phát triển.
- Các phần trên không còn là blocker API cho B7. API detail, thông tin đơn/thanh toán/vé cơ bản và phân quyền vẫn là yêu cầu thật. Nút in vé không thuộc nhóm UI-only này.

### 5.3. Ma trận chức năng thiếu hỗ trợ và tính khả thi bổ sung API

Đánh giá dưới đây dựa vào source repo, là ước lượng kỹ thuật tương đối, không phải tính năng đã triển khai hoặc kiểm thử.

| Chức năng trên UI | Backend hiện có / thiếu gì | Khả thi nếu bổ sung | Quyết định B7 hiện tại |
|---|---|---|---|
| Trang detail theo UUID, reload/deep-link | Có `orders.one`, items/tickets/payment read, event guard; thiếu endpoint tổng hợp | **Cao, độ phức tạp vừa**: thêm GET detail và workflow; gọi public interface từng module, snapshot nhất quán, no-store, owner/ADMIN + order thuộc event; không cần thay schema cho dữ liệu lõi | Ưu tiên P0, phải có và xác minh trước tích hợp |
| Họ tên/email/phone khách | Đã snapshot name/email; phone trong DTO null, users có phone hiện tại nhưng không có snapshot phone trong câu INSERT order đã kiểm tra | **Cao** nếu trả null đúng nghĩa; **vừa** nếu thêm snapshot: migration nullable + lưu khi tạo đơn mới; đơn cũ không tự có phone lịch sử. Không đọc bảng auth trực tiếp từ order | Name/email thật; phone thiếu ghi “Chưa có thông tin”; bổ sung snapshot tùy phạm vi sau |
| Tiền vé/tổng/currency/provider | Đã có order items/total và payments; chưa có breakdown giải thích chênh lệch như ảnh | **Cao** cho ánh xạ dữ liệu lõi; **vừa/cao** nếu thêm chính sách phí/giảm giá thật: cần schema và tính nhất quán booking/payment, không chỉ thêm field response | Không xây giảm giá để khớp mẫu; total khớp dữ liệu thật |
| Mã giao dịch và thời điểm thanh toán | `payments.provider_transaction_id`, `succeeded_at` có trong store, nhưng SELECT `managerPayments` và DTO chưa trả provider transaction reference | **Cao, nhỏ/vừa**: bổ sung public read projection và DTO safe; reference nullable, liên kết đúng paid/active/latest; không lộ raw webhook/secret hoặc mã ngân hàng giả | Ưu tiên P0/P1 trong contract detail |
| Bank account thụ hưởng/TraceID | Có SePay store/admin transaction flow, chưa có projection Organizer detail được xác minh | **Vừa**: định nghĩa rõ dữ liệu được phép xem, che tài khoản và reference, phân quyền; không tái sử dụng endpoint admin cho Organizer | Không sao tài khoản/TraceID mẫu; nullable hoặc “Chưa có thông tin” |
| Danh sách vé/QR cơ bản/check-in | Preview có QR/status/issuedAt, query LIMIT 10; chưa có unitPrice/lineTotal/checkedInAt trong preview DTO | **Cao, vừa**: bổ sung projection item/check-in qua order public; metadata cho mọi trạng thái đơn, QR riêng theo quyền. Kiểm tra giới hạn 10 phù hợp booking hiện tại | Ưu tiên P0; không mở QR cho đơn chưa thanh toán/đang tra soát |
| In vé | B6 dùng QR thật + `window.print`; không cần endpoint in riêng | **Cao, nhỏ**: tái sử dụng dữ liệu preview và print CSS, refetch/revalidate trước in | Chức năng thật; kiểm tra browser/PDF sau triển khai |
| In hóa đơn | Chưa thấy API hóa đơn riêng; bản in vé không là hóa đơn | **Cao** cho phiếu thông tin đơn/PDF trình duyệt; **lớn** cho hóa đơn tài chính thật vì cần nguồn số hóa đơn, lưu trữ và hệ thống phát hành | Chưa cam kết hóa đơn thật; giữ phạm vi in vé, xử lý nhãn invoice rõ ràng trong báo cáo triển khai |
| Tìm kiếm toàn cục topbar | List B6 có q theo đơn/người mua/email; chưa có unified search vé/đơn/khách | **Vừa**: có thể điều hướng về B6 với query nếu thống nhất semantics; unified search cần endpoint riêng, scope theo event/tenant | Không coi input mẫu là API toàn cục đã có; không mở rộng API nếu chưa cần |
| KYC/email verified/member/SMS | Chưa có contract xác minh KYC và dữ liệu định danh của B7 | **Lớn** nếu làm thật: nguồn xác minh, quy trình/trạng thái, provider, dữ liệu nhạy cảm; không thể đạt bằng GET tĩnh | UI-only + toast; không thêm API hiện tại |
| Rủi ro/bot/IP/CCCD | Không có risk score API B7 | **Lớn**, thiếu dữ liệu đầu vào và mô hình/quy tắc/định nghĩa độ tin cậy; endpoint trả 100% không tạo ra đánh giá thật | UI-only + toast |
| QR động/chống chụp | Token QR hiện tại không chứng minh có rotate/expiry theo chu kỳ | **Lớn**, cần đồng bộ issuer/verifier/scanner, TTL, nonce, replay/concurrency và hành vi khi in/offline; thêm GET đơn thuần không đủ | UI-only + toast; giữ QR cơ bản thật |
| Audit theo đơn | Có `audit_logs` và public `append`, chưa có read endpoint theo order; nhật ký check-in không thay toàn bộ audit thanh toán | **Vừa** cho timeline chỉ gồm sự kiện đã ghi: thêm public read, liên kết resource/payment/order, phân trang và quyền; **lớn/không suy ra được** cho “khách quét VietQR” nếu không từng thu thập event đó | UI-only + toast, không bổ sung API audit ở B7 hiện tại |
| POS/Gate sync | Có API check-in, chưa có device registry/sync/ACK/status contract POS | **Lớn**, cần danh tính thiết bị, hàng đợi, ACK, retry/idempotency và vận hành realtime; POST thông báo thành công không phải sync thật | UI-only + toast |

Đề xuất phạm vi tối thiểu cho phiên code sau: **một GET detail Organizer**, mở rộng read projection cần thiết cho payment reference/item/check-in; tái sử dụng preview QR và print. Không thêm API KYC/risk/rotate/audit/POS chỉ để đáp ứng hình ảnh. Mọi endpoint mới vẫn phải qua kiểm thử hợp đồng/quyền/runtime như mục 5; đánh giá khả thi không phải cho phép sửa source trong phiên tài liệu này.

### 5.4. Trạng thái hoạt động của API hiện tại cần sử dụng

Cập nhật danh mục lúc **2026-10-31 14:18:29 UTC+7**. Kết quả HTTP bên dưới kế thừa lượt kiểm tra ghi nhận lúc **14:12:22** tại mục 5.1, không phải phép thử mới trong phiên cập nhật danh mục. Tất cả đường dẫn tương đối với `/api`. `CÓ SOURCE` xác nhận endpoint trong repo; `401 KHÔNG TOKEN` chỉ chứng minh request bị yêu cầu xác thực, **không** đồng nghĩa đã kiểm chứng dữ liệu hoặc chức năng nghiệp vụ hoạt động đầy đủ.

| API hiện có | Dùng cho / mức cần thiết | Trạng thái hoạt động có bằng chứng | Giới hạn và việc cần làm trước tích hợp B7 |
|---|---|---|---|
| `GET /health` | Kiểm tra dịch vụ, không lấy dữ liệu UI | **HTTP 200** tại localhost:8000 | Chỉ xác nhận process phản hồi; không xác nhận truy vấn dữ liệu B7 |
| `GET /auth/me` | Auth bootstrap/Guard/danh tính Organizer ở shell; dùng lại cơ chế App | **CÓ SOURCE; runtime chưa xác minh trong lượt B7 này** | Kiểm tra session đăng nhập thật, roles và account switching; không lấy người đang đăng nhập làm buyer của đơn |
| `POST /auth/refresh-token` | Phụ trợ session khi access token hết hạn; Axios hiện có tự xử lý | **CÓ SOURCE; runtime chưa xác minh trong lượt B7 này** | Dùng interceptor/refresh lock đã có; kiểm tra cookie/Origin và đổi tài khoản; không tạo refresh flow riêng cho B7 |
| `GET /organizer/events/:id` | Metadata event và xác minh event context; cần nếu detail chưa cung cấp đủ metadata | **CÓ SOURCE + protect/events.guard; chưa gọi HTTP trong lượt kiểm tra B7** | Kiểm tra 200 owner/ADMIN, 403 khác chủ, 404 event thiếu. Nếu detail trả đủ event metadata thì tránh gọi trùng chỉ để dựng card |
| `GET /organizer/events/:eventId/order-manager` | B6 → B7 và quay về danh sách/bộ lọc; không dùng thay detail | **HTTP 401 KHÔNG TOKEN** tại localhost:8000; source có DTO list | Cần 200 authenticated với dữ liệu thật, ownership và pagination. Thiếu provider transaction reference và phone snapshot; không tìm đơn bằng cách tải hết list |
| `GET /organizer/events/:eventId/orders/:orderId/tickets` | Vé/QR cơ bản thật và dữ liệu in; gọi khi backend cho phép | **HTTP 401 KHÔNG TOKEN** tại localhost:8000; source có preview | Chưa xác minh QR/runtime owner; source chặn không PAID hoặc payment review bằng 409, sai event/order 404 sau guard. Cần kiểm thử các trạng thái trước dùng; không dùng cho tính năng QR động |

`GET /organizer/events/:id/orders` (legacy list) và `GET /me/order-history/:id` (buyer-only) **không nằm trong tập API B7 cần tích hợp**. Chỉ lưu để tránh nhầm: chúng có source nhưng không cung cấp detail Organizer đúng quyền. Check-in, admin SePay, POST tạo/hủy/thanh toán đơn không cần gọi từ trang B7 chỉ xem/in theo phạm vi hiện tại. Các nút điều hướng thông báo/hồ sơ/tạo sự kiện sử dụng route sẵn có, không yêu cầu B7 tự gọi API màn đích.

Môi trường localhost:8011 không kết nối được với bốn GET đã thử ở mục 5.1; các endpoint auth/event chưa được thử tại cổng này. Không ghi mọi API ở cổng đó đã kiểm tra hoặc đã hoạt động. Chưa có API dữ liệu bảo vệ nào được nghiệm thu `HOẠT ĐỘNG ĐẦY ĐỦ` trong lượt B7 có token.

### 5.5. API cần bổ sung hoặc mở rộng

| Hạng mục | Trạng thái hiện tại | Cần bổ sung | Ưu tiên và điều kiện hoàn thành |
|---|---|---|---|
| **API mới:** `GET /organizer/events/:id/orders/:orderId` | **CHƯA CÓ SOURCE; HTTP thử 404** tại localhost:8000 | GET tổng hợp order/buyer snapshot/items/totals/payment/event/ticket metadata/actions/asOf theo mục 5; metadata xem được với mọi trạng thái đơn. Auth + event owner/ADMIN + order.event_id; Cache-Control no-store | **P0 — chặn tích hợp detail.** Chỉ coi hoạt động khi route thật, contract xác nhận và HTTP có quyền/quyền sai/đơn thiếu/từng trạng thái đã kiểm chứng |
| Mở rộng payment read projection + DTO cho detail mới | Có provider_transaction_id trong payment store, chưa có trong managerPayments/DTO | Trả `providerTransactionId` hoặc tên contract thống nhất, nullable và đúng payment; phân biệt UUID payment nội bộ với reference cổng | **P0 trong API detail**, không cần tạo thêm endpoint thanh toán hoặc đổi DTO B6 nếu không cần |
| Metadata vé và chi tiết dòng tiền trong detail | Có items và trạng thái vé ở module order; preview thiếu unitPrice/lineTotal/checkedInAt | Expose qua public interface cho detail, liên kết đúng order_item/ticket; giá từ snapshot, không lấy ví dụ Stitch; vẫn giữ kiểm soát QR riêng | **P0 trong API detail**, không thêm một API riêng cho từng card |
| Thông tin ngân hàng/TraceID được phép xem | Chưa có contract Organizer detail được xác minh | Nếu có nguồn hợp lệ, bổ sung projection đã che dữ liệu vào detail; nếu thiếu trả null/trạng thái chưa có thông tin | **P1 có điều kiện**, không chặn detail lõi; không dùng endpoint admin hoặc `.env` làm dữ liệu UI |
| Phone snapshot lịch sử | Order chưa lưu snapshot phone trong INSERT đã đọc; DTO hiện null | Chỉ khi mở rộng phạm vi: migration nullable + capture khi tạo đơn mới, API trả nguồn rõ ràng; không backfill lịch sử từ phone hiện tại như dữ liệu gốc | **Tùy chọn**, không cần API mới; đơn cũ có thể null |

**Không cần bổ sung API trong phạm vi hiện tại:** KYC/risk/QR động/audit/POS chỉ UI + toast theo mục 5.2; in vé dùng preview + `window.print`; chưa đưa API hóa đơn tài chính hoặc unified search vào danh sách bắt buộc. Chỉ một endpoint mới là bắt buộc cho B7, các trường còn thiếu ưu tiên gộp vào response detail qua public modules để tránh nhiều request và không phá ownership.

### 5.6. Trạng thái sau triển khai ngày 2026-10-31

Mục này thay thế kết luận trước triển khai ở 5.1/5.4/5.5; giữ nguyên bằng chứng cũ để truy vết.

| API/chức năng | Trạng thái đã xác minh mới nhất |
|---|---|
| GET `/organizer/events/:id/orders/:orderId` | **ĐÃ BỔ SUNG + TÍCH HỢP.** Source route → orderManager.detail → public Order/Payment/Event trong snapshot. HTTP200 owner/ADMIN, 401 guest, 403 buyer/Organizer khác, 404 đơn thiếu/khác event, 400 UUID/query lỗi trên DB test. Không trả QR/token/ciphertext trong detail. |
| Payment reference/item/check-in metadata | **ĐÃ MỞ RỘNG.** providerTransactionId nullable, giá từ item snapshot, checkedInAt thật. Kiểm tra ưu tiên payment PAID dù có attempt FAILED mới hơn, check-in timestamp và VOID không còn QR/in. |
| GET preview `/organizer/events/:eventId/orders/:orderId/tickets` | **TÁI SỬ DỤNG API THẬT.** HTTP200/QR giải mã khớp token vé; PAID có tra soát trả409; frontend refetch quyền trước in. Không dùng cho QR động. |
| GET list order-manager | **HỒI QUY API B6 PASS** và browser qua 55 đơn/6 trang; 10 đơn/trang, trang6 qua API page1; quay từ B7 khôi phục trang/bộ lọc đúng tài khoản + event. |
| GET event metadata, auth/login, auth/me | **ĐÃ CHẠY QUA CHROME TEST** với API thật để vào B6/B7, tải metadata/session. Refresh-token vẫn dùng Axios hiện có; chưa chủ động ép hết hạn token để nghiệm thu riêng. |
| KYC/risk/QR động/audit/POS | **ĐÃ TRIỂN KHAI UI + TOAST**, nhãn minh họa/đang phát triển; nhấn chuột/Enter hiện “Chức năng đang được phát triển”, không request mutation. |
| Phone snapshot, bankAccount, traceId, invoice | Phone/bank/trace chưa có nguồn đúng contract nên trả null/hiển thị chưa có thông tin. Chưa thêm migration/snapshot phone, API hóa đơn hoặc tài khoản ngân hàng mẫu. Nút thực tế là “In vé”. |
| API8000 và Vite5173 sau nạp runtime | **Health200; detail/list/preview401 không token**. Bốn JS backend đã sao lưu và nạp tại chỗ, hash khớp host, restart riêng API. Chưa chứng minh response200 authenticated Live. Recreate từ image cũ có thể mất bản nạp; cần rebuild image khi đóng gói phát hành. |

Files triển khai: `client/src/pages/organizer/OrderDetailsPage.tsx` (TSX + CSS cùng file, xuống dòng), `OrderManagerPage.tsx`, `client/src/App.tsx`; backend `server/src/app.ts`, `workflows/order-manager.ts`, order/payment `infrastructure/store.ts`. Không sửa sidebar hoặc picker và giữ nguyên thay đổi B6 có sẵn trước phiên.

Kiểm thử: server build + boundary checker PASS; client build + eslint ba file PASS; hai integration tests B6/B7 PASS, B7 Chrome trên1440/1024/768/390 PASS gồm navigation, reload, toast, state, QR/print/PDF, lỗi/retry và review trước in. Ảnh có che QR: [1440](../reports/stitch/evidence/B7_20261031_implementation/1440.png), [1024](../reports/stitch/evidence/B7_20261031_implementation/1024.png), [768](../reports/stitch/evidence/B7_20261031_implementation/768.png), [390](../reports/stitch/evidence/B7_20261031_implementation/390.png). Ma trận tám tiêu chí và giới hạn ở report mới.

## 6. Trình tự triển khai đã áp dụng

1. Lấy lại HTML/ảnh B7 qua MCP để kiểm tra nguồn trước khi code; chốt contract detail. Áp dụng xác nhận ngày 2026-10-31: KYC/risk/QR động/audit/POS là UI-only theo mục 5.2, không cần xin lại xác nhận cho toast đang phát triển; không sửa Stitch.
2. Bổ sung backend và xác minh API theo mục 5. Endpoint detail đã được kiểm chứng HTTP trên DB cô lập trước khi nối frontend; sau đó nạp runtime local8000 theo xác nhận người dùng.
3. Tạo page dự kiến `client/src/pages/organizer/OrderDetailsPage.tsx`, CSS scoped `.b7-*` cùng file, xuống dòng; dùng font/icon/build hiện có, không chép Tailwind CDN/script export Stitch.
4. Đăng ký route đề xuất `/organizer/events/:id/orders/:orderId` với Guard ORGANIZER/ADMIN. Mở rộng nhận diện organizer shell trong `App.tsx` để route sâu không hiện header/footer khách hàng. Sidebar đọc `id`, active Đơn hàng; không sửa sidebar chung.
5. Trong B6 thêm `<th>Chi tiết</th>` và Link tương ứng từng hàng, cập nhật colspan/min-width/scroll hint nếu cần. Không thay 10 đơn/trang, bộ lọc, preview/in hoặc picker đang có. URL lấy UUID, mã đơn chỉ để hiển thị.
6. B7 có link quay về B6 đúng event; lưu/khôi phục bộ lọc và trang khi xuất phát từ B6, deep-link không có state vẫn dùng URL tải được. Không chỉ dựa navigation state để hiển thị dữ liệu. Reload, đổi tài khoản hoặc orderId phải xóa dữ liệu cũ và chặn response đến muộn.
7. Dựng lại dải trạng thái, 8/4 cột, các card và thẻ vé theo nguồn. Tiền theo backend; thời gian Asia/Ho_Chi_Minh; nhiều vé hiển thị theo dữ liệu thật. Phần QR động/nút “Tải lại QR” trong bản Stitch chỉ báo đang phát triển; không gọi rotate/refetch từ nút này. Luồng lấy QR cơ bản thật tách biệt, tải theo quyền preview. Nút in revalidate quyền/trạng thái trước in.
8. Kiểm tra, lập report mới, bổ sung nhật ký file này, cập nhật B7 trong Master Plan bằng bằng chứng. Không đánh dấu hoàn tất vì build pass.

## 7. Tiêu chí nghiệm thu sau triển khai

- Link Chi tiết dùng được với mọi trạng thái đơn và điều hướng tới đúng order/event; preview B6 vẫn hoạt động. Kiểm tra các trang 1, 5, 6 qua ranh giới lô 50 và giữ 10 đơn/trang.
- Sidebar chung giữ menu, active đúng và event context; back, refresh, deep-link, guest login, đổi tài khoản không rò dữ liệu.
- Loading, lỗi/retry, 403, 404, không có vé, chờ phát hành, đã dùng/thu hồi, chưa thanh toán/tra soát có trạng thái riêng; không hiện mẫu PAID khi API lỗi.
- Tiền từng dòng/tổng, provider/reference, QR vé cơ bản và bank account phải có nguồn dữ liệu thật. KYC/risk/QR động/audit/POS được trình bày minh họa có nhãn “Đang phát triển”, nhấn bằng chuột hoặc bàn phím đều hiện đúng toast; không phát sinh request nghiệp vụ hoặc thể hiện đã xác minh thật.
- So ảnh thực tế desktop 1440/1024 và tablet/mobile 768/390 với Stitch; nội dung không tràn, sidebar mobile dùng được, vé/QR đủ đọc. Không coi class responsive là bằng chứng pass.
- Kiểm tra bàn phím, focus, label, tên link Chi tiết theo mã đơn, tương phản, thông báo loading/lỗi và reduced-motion khi có animation.
- Xem `client/package.json`, chạy build và lint phù hợp, kiểm thử API/quyền và browser cho luồng trên. Ghi giới hạn chưa kiểm thay vì đánh dấu PASS.

## 8. Nhật ký tài liệu và quy tắc cập nhật

| Thời điểm UTC+7 | Thao tác thực tế | Kết quả/report |
|---|---|---|
| 2026-10-31 13:25:32 | Tạo kế hoạch B7, review HTML/ảnh Stitch và source; tạo report mới; cập nhật riêng B7 ở Master Plan 5.2/5.4 | [B7_20261031_132532_review_plan.md](../reports/stitch/B7_20261031_132532_review_plan.md); chưa triển khai source |
| 2026-10-31 14:12:22 | Kiểm tra lại route/DTO/module; GET read-only localhost 8000/8011; bổ sung ma trận thiếu API, tính khả thi và xác nhận UI-only KYC/risk/QR động/audit/POS | [B7_20261031_141222_api_feasibility_plan_update.md](../reports/stitch/B7_20261031_141222_api_feasibility_plan_update.md); chỉ cập nhật kế hoạch và B7 Master Plan, không sửa source/Stitch |
| 2026-10-31 14:18:29 | Bổ sung mục 5.4 API hiện có cần dùng và trạng thái hoạt động; mục 5.5 API mới/mở rộng, ưu tiên và điều kiện nghiệm thu; kế thừa HTTP phiên 14:12, không thử lại | [B7_20261031_141829_api_status_inventory.md](../reports/stitch/B7_20261031_141829_api_status_inventory.md); cập nhật riêng B7 Master Plan, không sửa source/Stitch |
| 2026-10-31 14:33:06 | Triển khai API detail/projection, B7 TSX+CSS, cột Chi tiết B6 và khôi phục state; build/lint/boundary/API/Chrome/PDF/QR tests; nạp 4 JS vào API8000 theo xác nhận, kiểm tra health/route qua5173; cập nhật Master Plan4/5.2/5.4/6.F | [B7_20261031_143306_implementation.md](../reports/stitch/B7_20261031_143306_implementation.md); ĐẠT CÓ ĐIỀU KIỆN, Live authenticated/a11y đầy đủ chưa kiểm |
| 2026-10-31 14:50:03 | Lập kế hoạch bổ sung phone hiện tại, timeline đơn hàng có thời gian/cửa sổ VietQR15 phút, mốc cấp QR thay email và tài khoản thụ hưởng SePay; cập nhật riêng B7 Master Plan | [B7_20261031_145003_contact_timeline_bank_plan.md](../reports/stitch/B7_20261031_145003_contact_timeline_bank_plan.md); chưa sửa source/API/runtime, chưa kiểm thử tính năng bổ sung |
| 2026-10-31 14:59:25 | Triển khai Auth contact/Payment bank projection, timeline API và UI thật; test phone/null/update, bank/canonical payment, VietQR15 phút/hạn ngắn/qua ngày, issuedAt; build/lint/boundaries/B6+B7 HTTP/Chrome4 viewport PASS; nạp5 JS vào API8000, backup/hash/restart/health kiểm tra | [B7_20261031_145925_contact_timeline_bank_implementation.md](../reports/stitch/B7_20261031_145925_contact_timeline_bank_implementation.md); ĐẠT CÓ ĐIỀU KIỆN, authenticated Live/a11y đầy đủ chưa kiểm |

Mỗi lần chỉnh sửa sau phải thêm một dòng mới tại đây với nội dung thay đổi, kiểm chứng và liên kết report mới; không ghi đè report/lịch sử cũ. Mọi phát sinh khác với Stitch phải có căn cứ và xác nhận trước khi triển khai.

## 9. Kế hoạch bổ sung số điện thoại, timeline có thời gian và tài khoản thụ hưởng

Yêu cầu ngày **2026-10-31 14:50:03 UTC+7**; đã triển khai lúc14:59, kết quả tại9.6. Các mục9.1–9.5 giữ đặc tả đã áp dụng. Mục này được ưu tiên khi mâu thuẫn với phạm vi audit UI-only và các giá trị null trong snapshot14:33; giữ report cũ làm lịch sử. Không chỉnh sửa Stitch, sidebar, B6 hoặc deadline thanh toán khi triển khai phần bổ sung.

### 9.1. Số điện thoại liên hệ

- Điền trường **SỐ ĐIỆN THOẠI LIÊN HỆ** bằng số điện thoại **hiện tại của người mua đơn hàng**, tra theo `order.buyer_id`; không dùng số của Organizer đang đăng nhập hoặc hồ sơ Organizer application.
- `users.phone` đã có trong Auth; Order hiện chỉ snapshot name/email. Bổ sung public use case Auth phục vụ liên hệ người mua theo đơn, gọi từ workflow **sau** event guard và kiểm tra đơn thuộc event. Không join trực tiếp bảng Auth trong repository Order/Payment, không expose endpoint truy vấn tùy ý số điện thoại người khác.
- Mở rộng detail với `buyer.phone: string | null`, `buyer.phoneSource: "CURRENT_PROFILE" | null`. UI ghi chú ngắn “Số điện thoại trong hồ sơ hiện tại” để phân biệt tên/email snapshot. Không tuyên bố đây là số tại thời điểm đặt đơn.
- Phone null/rỗng hoặc không có dữ liệu trả “Chưa có thông tin”; không điền mẫu. Không yêu cầu migration trong phương án này. Snapshot số điện thoại cho đơn mới là việc mở rộng riêng, không backfill lịch sử bằng số hiện tại.

### 9.2. Timeline đơn hàng có thời gian

Thay timeline minh họa cố định bằng dữ liệu có nguồn, giữ khung/bố cục card **Lịch sử thao tác (Audit)** hiện tại. Các mục timeline thật không còn chỉ báo toast; KYC/risk/QR động/POS và chức năng audit mở rộng chưa có dữ liệu vẫn giữ thông báo đang phát triển. Không tuyên bố đã có audit toàn bộ thao tác người dùng chỉ vì dựng được các mốc đơn hàng.

| Mục hiển thị dự kiến | Nguồn và cách xác định thời gian | Khi thiếu dữ liệu |
|---|---|---|
| Tạo đơn/phiên đặt vé | `orders.created_at` | Không dựng mốc giả |
| Quét VietQR — trong khoảng15 phút kể từ lúc tạo mã thanh toán | Lấy `created_at` của **payment SePay được chọn**, không dùng giờ tạo đơn. Đây là **khoảng hướng dẫn quét/thanh toán**, không phải bằng chứng khách đã quét | Không có payment SePay: không dựng mục VietQR; không ghi khách đã quét |
| Xác nhận thanh toán | `succeeded_at` của payment thành công gắn với `order.paid_payment_id`; dùng nhãn phù hợp provider | Chưa SUCCEEDED/PAID: hiện chưa xác nhận hoặc bỏ mốc, không lấy updatedAt/asOf thay thế |
| Cấp mã QR vé | `tickets.issued_at` từng vé; có thể nhóm vé cùng timestamp. Nhiều thời điểm khác nhau thì hiển thị riêng hoặc khoảng đầu–cuối có ghi rõ số vé | Chưa phát hành vé: “Chưa cấp mã QR”; không lấy giờ load trang hoặc lúc tạo PNG preview |

**Quy tắc cửa sổ15 phút:**

- Nội dung gợi ý: **“Quét VietQR: trong vòng 15 phút kể từ lúc tạo mã thanh toán”**, kèm giờ tạo và khoảng thời gian cụ thể UTC+7, ví dụ tạo14:00 → cửa sổ tham chiếu14:00–14:15. Không hiển thị một timestamp giả làm thời điểm khách quét.
- Tính trên backend từ `payment.created_at + 15 phút`, không hard-code đồng hồ frontend, không lưu thêm sự kiện `QR_SCANNED` vì chưa có telemetry chứng minh.
- Phân biệt cửa sổ tham chiếu15 phút với hạn mã thực tế `provider_expires_at`. Nếu mã hết hạn sớm hơn, hiển thị thời hạn thực tế sớm hơn và ghi rõ **tối đa15 phút**; không gợi ý khách vẫn thanh toán được sau khi mã hết hạn. Nếu mã có hạn dài hơn, cửa sổ hướng dẫn vẫn là15 phút theo yêu cầu, không tự rút ngắn hoặc gia hạn deadline nghiệp vụ.
- Không thay `orders.expires_at`, provider_expires_at, reconcile_until, worker hoặc cơ chế giữ vé. Đề xuất DTO trả `paymentCreatedAt`, `referenceWindowEndsAt`, `effectiveWindowEndsAt`, `providerExpiresAt` để UI không nhầm cửa sổ với TTL thật.
- Khi đã thanh toán/hết hạn, hiển thị đây là khoảng thời gian của mã đã tạo, không hiện lời mời chuyển khoản hoặc đếm ngược còn hiệu lực.

**Bỏ mốc “Cấp vé số hóa & Gửi Email”/“Gửi email thành công”** và mọi giờ xác nhận gửi thư không có nguồn. Thay bằng **“Cấp mã QR vé”**. `issued_at` là thời điểm phát hành vé/token ban đầu; mở trang, tải lại ảnh QR hoặc in lại không tạo một mốc cấp QR mới. QR cơ bản vẫn là token hiện hữu, không gán nghĩa QR động đã triển khai.

Khi có nhiều payment attempts, chọn cùng payment chuẩn dùng ở phần thanh toán/thụ hưởng: ưu tiên payment PAID gắn `paid_payment_id`, nếu chưa có thì active, sau cùng latest. Không ghép giờ tạo của attempt A với tài khoản/reference hoặc xác nhận của attempt B. Nếu cần hiển thị tất cả attempts ở tương lai phải nhóm theo paymentId rõ ràng.

### 9.3. Tài khoản thụ hưởng

- SePay đã lưu snapshot tại `sepay_payment_details`: bank_code/account_number/account_name theo payment_id. Lấy qua public projection **Payment**, nối theo đúng payment chuẩn ở9.2 và kiểm tra thuộc order; không dùng số tài khoản mẫu Stitch hoặc đọc `.env` vào giao diện.
- Mở rộng `bankAccount` từ null thành object nullable, đề xuất `{ paymentId, bankCode, accountNumber, accountName, source: "PAYMENT_SNAPSHOT" }`. Chỉ trả trường phục vụ hiển thị, không đưa merchant secret/webhook key/raw payload ra client.
- Hiển thị ngân hàng, số tài khoản và tên chủ tài khoản dưới nhãn **“Tài khoản thụ hưởng giao dịch”**. Không tự ghi đó là tài khoản riêng của BTC nếu snapshot thực tế là tài khoản nhận tiền của nền tảng.
- Dữ liệu đúng giao dịch trong DB vẫn có thể dùng cho đơn cũ, kể cả cấu hình tài khoản hiện tại đã đổi; không lấy cấu hình mới để ghi đè snapshot cũ. Nếu projection hiện hành bị scope tài khoản môi trường hiện tại, bổ sung public read theo paymentId với ownership đã xác minh, không bỏ kiểm tra tenant/order để né scope.
- Payment không dùng SePay hoặc thiếu snapshot: bankAccount=null và “Chưa có thông tin”; không tự tạo tài khoản cho demo/VNPay. Việc công khai số tài khoản trong B7 chỉ qua API detail owner/ADMIN hiện tại.

### 9.4. Hợp đồng API và trình tự thực hiện

Ưu tiên **mở rộng GET `/organizer/events/:id/orders/:orderId` hiện có**, không tạo endpoint frontend riêng cho mỗi trường:

1. Giữ protect/UUID validation/events.guard/order.event_id/no-store. Bổ sung Auth public contact projection, Payment public bank snapshot/deadline projection; Order dùng public metadata vé hiện có.
2. Mở rộng detail: buyer.phone/phoneSource, bankAccount nullable, timeline typed events (id/type/paymentId hoặc ticketId, occurredAt hoặc windowStart/windowEnd, source). Với event khoảng thời gian, không gán occurredAt là thời điểm quét đã quan sát được.
3. Dựng timeline từ nguồn order/payment/ticket và chỉ đưa audit log có thật nếu cần; `audit_logs.created_at` đã có nhưng hiện chưa có read API. Phương án tối thiểu không cần xây API audit tổng quát hoặc thu thập hoạt động quét của app ngân hàng.
4. Kiểm tra API HTTP có quyền với response mẫu đã che số/email; chỉ sau khi xác minh mới nối các field mới trong `OrderDetailsPage.tsx`. Giữ TSX/CSS cùng file, sidebar và route/link B6 hiện có.
5. Chạy test/build/lint/boundaries, ghi report phiên mới và cập nhật nhật ký/Master Plan. Nếu cần nạp lại container8000, làm sau khi test và ghi rõ runtime/source/image; phiên kế hoạch này không thực hiện bước đó.

### 9.5. Tiêu chí nghiệm thu bổ sung

- Phone lấy đúng buyer, không phải owner; sửa phone hồ sơ thì field hiện tại đổi đúng và có nhãn nguồn; null/đơn cũ không lỗi. Guest401, khác chủ/buyer403, ADMIN/owner đúng quyền; không rò liên hệ ở đơn khác event.
- Bank snapshot của payment PAID vẫn đúng khi có attempt mới FAILED hoặc config ngân hàng thay đổi. Kiểm tra SePay có snapshot, thiếu snapshot, demo/VNPay và nhiều attempts; không lộ secrets/raw webhook.
- Mã tạo lúc14:00 có cửa sổ tham chiếu14:00–14:15; hạn thực tế14:10 thì effectiveWindowEnd14:10; mã tạo qua nửa đêm hiển thị đúng ngày và UTC+7. Dùng giờ tạo **payment**, không order.createdAt; refresh không reset mốc.
- Timeline không khẳng định khách đã quét, không có mốc email thành công. Khi chưa payment/PAID/tickets phải phản ánh thiếu dữ liệu thật; `issued_at` không bị thay bằng thời điểm tải/in QR. Nhiều vé phát hành nhiều thời điểm không bị gom sai thành một timestamp.
- Không thay deadline/giữ vé/thanh toán hoặc QR rotation vì thay text15 phút. Các nhãn KYC/risk/QR động/POS vẫn toast. Các mốc timeline thật được đọc bình thường trong card, không còn toast giả thay dữ liệu.
- API integration tests trên DB cô lập, browser desktop/mobile và kiểm tra route/back/in hồi quy; server/client build, lint và boundary checker PASS. Sau đó mới đánh giá phạm vi mới đạt, không kế thừa PASS từ phiên triển khai trước.

### 9.6. Kết quả triển khai và kiểm chứng

| Hạng mục | Đã thực hiện / bằng chứng |
|---|---|
| Phone | Auth public `orderBuyerContact` chỉ trả phone nullable, role Organizer/ADMIN; workflow gọi sau event/order guard. Detail trả CURRENT_PROFILE; UI có ghi chú nguồn. HTTP test số buyer khác owner, cập nhật hồ sơ và chuỗi trắng/null PASS. |
| Thụ hưởng | Payment public projection qua store chỉ đọc snapshot SePay đúng paymentId+orderId, không phụ thuộc config tài khoản hiện tại; detail trả bankCode/accountNumber/accountName/source. UI hiển thị tài khoản thụ hưởng giao dịch; demo/missing snapshot null. Test thêm attempt FAILED với tài khoản khác vẫn giữ bank của PAID PASS. |
| Timeline | ORDER_CREATED, VIETQR_WINDOW, PAYMENT_SUCCEEDED, QR_ISSUED; ISO UTC từ backend, UI UTC+7 với time datetime. Khoảng VietQR từ payment.createdAt, reference+15 phút, effective=min(reference,provider expiry); occurredAt=null cho window. Mỗi vé có issuedAt riêng. Không có mốc email/khẳng định đã quét; refresh/in không đổi thời gian. |
| Trình bày | Giữ card/khung timeline Stitch, thay button demo bằng danh sách mốc có thời gian, không toast thay dữ liệu. Giữ các sửa nhãn UI hiện có của người dùng; KYC/risk/QR động/POS vẫn toast. TSX/CSS cùng file. |
| API/HTTP | GET detail owner/ADMIN200, guest401, buyer/khác chủ403, missing/cross-event404, invalid400; no-store và QR token không có trong metadata. API bổ sung đã PASS trước khi nối UI. Không thêm endpoint hay migration source. |
| Tests | Server build/boundaries và client build/eslint B7 PASS; B6+B7 integration2 suites PASS không skip; Chrome1440/1024/768/390 PASS với phone/bank/timeline mới và navigation/back/page6/print/PDF/review/failed request/retry. QR decoder test đã dùng nhiều mức sampling để tránh lỗi đọc ngẫu nhiên. |
| Runtime local | Theo lựa chọn nạp API8000 đã được xác nhận trong phiên B7 trước: backup rồi nạp5 JS, hash host/container khớp, restart riêng API; health200/detail401 không token tại8000 và qua5173. Worker giữ nguyên, không thay dữ liệu/migrate Live. Chưa rebuild image. |

Ảnh test đã xem tại thư mục Temp `C:/Users/trank/AppData/Local/Temp/eventhub-b7-contact-20261031` (1440/1024/768/390.png), QR đã che, dữ liệu liên hệ/ngân hàng là fixture. Không tạo lại các ảnh docs đã bị xóa sẵn trước phiên. Helpers mặc định tạo evidence trong Temp để lần test sau không ghi đè ảnh report cũ.

Kết quả **ĐẠT CÓ ĐIỀU KIỆN**: phần mới hoạt động trên API/DB test và browser thật, runtime local đã nạp nhưng chưa kiểm chứng contact/bank/timeline bằng token Organizer Live; không tuyên bố toàn bộ audit hoặc telemetry quét ngân hàng đã tồn tại. Còn accessibility đầy đủ, browser khác Chrome, image đóng gói và snapshot phone lịch sử (không thuộc phương án hiện tại). TraceID/invoice vẫn chưa bổ sung.
