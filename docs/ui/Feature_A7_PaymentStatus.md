# Feature A7 — Trạng thái thanh toán

> Kế hoạch và nhật ký tái hiện frontend theo artifact A7 trong Stitch. Artifact Stitch được giữ nguyên.

## 1. Mục tiêu và phạm vi

- Màn hình: **A7 — Kết quả thanh toán** (customer), thuộc dự án EventHub.
- Nguồn thiết kế chính thức: Stitch project `10374042969343935993`, screen `4330e7e4069e49bcb54e47dbc8f3851b`.
- Kế hoạch: tái hiện trang xác nhận **thanh toán thành công duy nhất** sau khi Checkout ghi nhận đơn đã thanh toán; điều hướng tới A7 ngay khi order chuyển sang `PAID`.
- Giữ header và footer dùng chung đã được tạo trước đó. Không nhân bản shell/header/footer từ ảnh A7.
- Chỉ lập kế hoạch cho A7; không chỉnh A6, A8, màn hình khác, backend hoặc Stitch artifact.

## 2. Trạng thái đã xác minh

- Artifact Stitch tồn tại, DESKTOP 2560×3916; ảnh tham chiếu 1920×2937 và HTML đã đọc qua Stitch MCP. Artifact không bị chỉnh sửa.
- Design system dự án là Cosmic Graffiti: dark, nền chuẩn `#080B1A`, surface `#10162B`, tím `#7C3AED`, cyan `#22D3EE`, hồng `#F472B6`, chữ `#F8FAFC`/`#94A3B8`; Syne, Be Vietnam Pro, Space Grotesk; ROUND_EIGHT.
- Checkout ở `client/src/pages/booking/Checkout.tsx`, route `/checkout/:id`. A7 đã được nối tại `/payment-status/:orderId`; Checkout chuyển trang khi order đã tải xong, ID khớp route và server trả `status === "PAID"`.
- Backend source có các route trong bảng API. Runtime local trả `GET /api/health` 200 và `GET /api/config` 200 (`paymentMode=disabled`, `sepayEnabled=true`). `GET /api/me/order-history/{uuid}` không có phiên đăng nhập trả 401 `UNAUTHORIZED`, xác nhận auth gate; chưa có phiên authenticated/test order để đọc response detail thành công.
- `npm run build` trong `client/` đạt; còn cảnh báo dữ liệu Browserslist/Baseline cũ và bundle JS >500 kB. Chưa kiểm tra browser, thanh toán end-to-end, responsive thực tế hoặc accessibility bằng công cụ.

### Xác minh luồng Checkout → A7 (2026-10-30)

- Playwright + Chrome máy: 2 browser tests PASS với API mock, SePay và VNPay đều tự chuyển đến `/payment-status/order` khi server fixture báo `PAID`, và A7 hiển thị xác nhận thành công. Đây là xác minh frontend transition, không phải giao dịch thật.
- Backend payment/order tests: 11 PASS, 0 FAIL (`order-history`, `sepay`, `vnpay`).
- Runtime health/config: HTTP 200; config `paymentMode=disabled`, `sepayEnabled=true`. Protected order-history không có auth trả 401 đúng dự kiến.
- Chưa thể xác minh giao dịch thực: không có authenticated test order; worker đang chạy không chứng minh webhook của một đơn cụ thể đã cập nhật `PAID`. Do đó trạng thái redirect là **đạt có điều kiện**, luồng provider-to-database còn cần kiểm tra runtime.
- Báo cáo phiên: [`../reports/stitch/A7_20261030_214341_payment_flow_verification.md`](../reports/stitch/A7_20261030_214341_payment_flow_verification.md).
- Runtime recheck 21:47: API health/config 200, `paymentMode=disabled`, `sepayEnabled=true`; API healthy và worker chạy, heartbeat failures=0. Không có authenticated order/giao dịch để kiểm tra webhook và response `PAID`, nên kết luận end-to-end vẫn **chưa xác minh**. [Báo cáo runtime](../reports/stitch/A7_20261030_214747_runtime_recheck.md).

## 2.1. API dự kiến sử dụng

Các path dưới đây là path công khai có tiền tố `/api` theo router backend. Đã xác minh route trong source; chưa gọi runtime nên chưa xác nhận status/response của môi trường đang chạy.

| Method / endpoint | Vai trò trong A7 | Auth / dữ liệu cần | Trạng thái xác minh |
|---|---|---|---|
| `GET /api/me/order-history/:id` | API đọc chính được đề xuất cho A7: order summary, trạng thái, tổng tiền, payment summary, số lượng/trạng thái vé; dùng `:id = orderId`, chỉ hiển thị success khi `status === "PAID"` | Protected; backend kiểm tra buyer là người dùng hiện tại; response detail có `payment`, `tickets`, `ticketList` | Route/mapping source đã đọc; runtime health 200 và unauthenticated trả 401; chưa xác minh success response với order PAID |
| `GET /api/me/orders/:id` | API hiện Checkout dùng để nạp/xác nhận order; tiếp tục là nguồn trạng thái trước khi điều hướng, hoặc fallback nếu triển khai giữ chung query | Protected; `booking.detail` kiểm tra người mua; trả order/event/payment theo workflow hiện tại | Đã xác minh source và cách gọi tại `Checkout.tsx`; runtime chưa xác minh |
| `GET /api/me/tickets` | Không cần gọi riêng nếu CTA chỉ dẫn đến `/tickets`; page A8 hiện dùng API này để liệt kê vé | Protected; danh sách vé của user hiện tại, phân trang | Route source đã xác minh; runtime chưa xác minh |
| `GET /api/me/tickets/:id` | Chỉ dùng nếu A7 có link tới chi tiết một vé cụ thể và có ticket ID thật; không bắt buộc cho phương án CTA `/tickets` | Protected; backend kiểm tra ownership và trả chi tiết cùng `qrImage` | Route source đã xác minh; runtime chưa xác minh; chưa có contract chứng minh lấy ID vé trực tiếp từ order detail trong client |

### API thuộc luồng Checkout (không gọi trực tiếp từ A7)

| Method / endpoint | Công dụng ở A6/Checkout | Trạng thái xác minh |
|---|---|---|
| `POST /api/orders/:id/payments` | Tạo payment cho provider đang cấu hình (VNPay/demo) | Route/call source đã xác minh; không gọi runtime trong phiên |
| `POST /api/sepay/orders/:orderId/payment` | Tạo hướng dẫn thanh toán SePay | Route/call source đã xác minh; không gọi runtime trong phiên |
| `GET /api/sepay/orders/:orderId/payment` | Checkout polling trạng thái SePay; nếu `orderStatus === "PAID"` thì reload order | Route/call source đã xác minh; không gọi runtime trong phiên |
| `POST /api/payments/:id/demo` | Chỉ luồng demo local, không phải API success của A7 | Route/call source đã xác minh; không gọi runtime trong phiên |
| `POST /api/payments/sepay/webhook` | Webhook backend nhận kết quả SePay; A7 không gọi trực tiếp | Route/workflow source đã xác minh; không kiểm thử webhook trong phiên |
| `GET /api/payments/vnpay/return` | Callback return của VNPay xử lý ở backend; A7 không tự tin kết quả từ query string | Route source đã xác minh; không kiểm thử callback runtime trong phiên |

**Phạm vi API tối thiểu đề xuất cho A7:** một request `GET /api/me/order-history/:id` để nạp lại và xác thực order/payment/ticket summary. Chỉ gọi ticket detail nếu UI thực sự có ticket ID thật; CTA “Vé của tôi” có thể điều hướng tới `/tickets` để A8 tự tải danh sách. Không có căn cứ hiện tại cho invoice/PDF endpoint; không thêm API giả định.

## 3. Kết luận review artifact Stitch

Artifact có bố cục thành công dễ nhận biết: hero xác nhận, thông tin giao dịch/hóa đơn, vé và QR, CTA xem vé/tải hóa đơn/khám phá, hỗ trợ và footer. Cosmic Graffiti được thể hiện qua dark canvas, các điểm cyan/tím/hồng, độ nổi card, kiểu chữ tiêu đề và bố cục card.

Các điểm chưa đạt so với yêu cầu A7 và project hiện tại:

1. Phần “Mô phỏng trạng thái thanh toán” và selector Thành công/Đang xử lý/Thất bại biến một màn hình thành nhiều kịch bản. Nghiệp vụ thực tế của A7 chỉ cần một kết quả thành công; bỏ selector và các khối mẫu trạng thái khác khỏi luồng sản phẩm.
2. Nội dung thành công đang trộn dữ liệu demo cố định (tên, email, mã đơn/giao dịch, số tiền, ngân hàng, vé, sự kiện, thời gian, QR). Không thể đưa vào frontend như dữ liệu thật hoặc hard-code; cần map từ API đã xác minh.
3. Branding còn `ENVENT HUB`/`Cosmic Ticket`, hotline/email/văn bản pháp lý và copyright năm 2025; không đồng bộ EventHub và dữ liệu hiện hành của repo.
4. Các nội dung “8% VAT”, phí nền tảng, “SHA-256”, “Dynamic QR Live” tự làm mới 52 giây, “Cosmic Engine v4.8”, mã xác nhận ngân hàng/đối soát và cam kết phát hành tức thì chưa có bằng chứng contract/backend tương ứng. Không hiển thị nếu chưa xác minh.
5. Thẻ vé/QR mẫu đang được nhúng cùng màn thanh toán. Backend có route lấy danh sách/chi tiết vé thật nhưng response/runtime và liên kết vé theo order chưa được xác minh trong phiên. Ưu tiên CTA sang A8 `/tickets` hoặc vé chi tiết có ID thật; chỉ nhúng QR nếu dữ liệu vé thật sẵn có theo contract đã kiểm chứng.
6. UI A7 chưa có route độc lập; trạng thái `PAID` hiện chỉ đổi nội dung trong Checkout. Cần nối sự kiện order `PAID` sang A7 ngay sau khi Checkout nhận/đọc trạng thái thành công; bảo đảm refresh hoặc quay lại không tạo thông báo thành công giả khi order chưa `PAID`.
7. Header/footer trong ảnh là bản riêng có thương hiệu/nội dung cũ; phải dùng lại shared header/footer của ứng dụng như yêu cầu, tránh có hai bộ shell hoặc điều hướng trùng.
8. Artifact là desktop 2560px; chưa có bằng chứng responsive/mobile, bàn phím, screen reader hoặc tương phản. Kế hoạch frontend cần xác minh các tiêu chí này trên viewport phù hợp.

Kết quả review thiết kế: **KHÔNG ĐẠT** so với phạm vi A7 một trạng thái và tính đúng dữ liệu của project. Giữ nguyên artifact Stitch theo chỉ thị; không gọi `edit_screens`. Các điểm sai khác được xử lý trong bản tái hiện frontend theo kế hoạch này, không ngụ ý đã được phép sửa artifact nguồn.

## 4. Đề xuất hành vi và cấu trúc A7

- Route: `/payment-status/:orderId` (customer, `Guard` hiện có).
- Chỉ điều hướng khi dữ liệu từ server xác nhận `order.status === "PAID"`. Với SePay, điểm chuyển trạng thái là kết quả cập nhật sau webhook/đối soát; không lấy việc tạo QR/chuyển khoản làm thành công. Với VNPay/demo, dùng trạng thái order đã được backend cập nhật sau callback/kết quả đã xác minh.
- Khi Checkout biết order đã `PAID`, điều hướng ngay sang A7. A7 tự tải lại dữ liệu có quyền sở hữu theo `orderId`; nếu chưa xác nhận `PAID`, hiển thị trạng thái chờ/xử lý lỗi phù hợp hoặc quay về checkout theo quy tắc đã duyệt, không dựng màn hình thành công từ query param.
- Dùng shared header/footer hiện hành. Nội dung chính tập trung vào xác nhận thành công, mã đơn, số tiền/tiền tệ và thời điểm/phương thức thanh toán nếu API trả các trường đó; thông tin sự kiện/số lượng vé lấy từ dữ liệu order thật.
- CTA chính: “Xem vé của tôi” tới `/tickets`; có thể bổ sung link đơn hàng `/orders` và khám phá `/explore`. Không hứa tải hóa đơn PDF nếu chưa có API/chứng từ thật.
- Trên A7 không có selector demo hoặc panel mô phỏng các status khác. Thiết kế chỉ thể hiện trạng thái success; xử lý pending/error ngoài màn success theo luồng Checkout/API hiện có.
- Không tạo QR hay vé giả. Nếu API chưa cung cấp liên kết order-ticket hoặc dữ liệu QR cần thiết, CTA sang A8 và ghi rõ phụ thuộc cần xác minh.

## 5. Kế hoạch triển khai

1. Xác nhận hợp đồng API runtime cho `GET /api/me/order-history/:id` (API chính đề xuất), quyền sở hữu, các trường thực sự trả về và môi trường/API đang hoạt động. Xác minh ticket ID/API cần thiết nếu muốn hiển thị vé/QR; không mock/hard-code.
2. Chốt route và điều kiện điều hướng từ Checkout: chỉ `PAID` do server xác nhận; không phát sinh điều hướng success từ callback URL chưa được backend xác minh.
3. Tạo page A7 riêng, dùng shared header/footer hiện tại, nạp lại order theo ID, ánh xạ dữ liệu thật và có loading/error/unauthorized/not-paid fallback an toàn.
4. Tái hiện phân cấp thị giác từ artifact A7 theo Cosmic Graffiti, thay nội dung/brand lỗi thời bằng dữ liệu EventHub; giữ một trạng thái success duy nhất. CSS và TSX xuống dòng rõ ràng, dễ đọc.
5. Nối CTA đến route hiện có `/tickets`, `/orders`, `/explore`; không tạo route giả cho hóa đơn hoặc vé.
6. Sau khi được giao triển khai: kiểm tra build và luồng thực tế từ Checkout cho SePay/VNPay/demo khả dụng, refresh route, quyền sở hữu, responsive desktop/tablet/mobile và khả năng truy cập; tạo report mới và cập nhật Master Plan bằng bằng chứng.

## 6. Tiêu chí nghiệm thu

- Checkout chỉ chuyển sang A7 sau khi API order trả trạng thái `PAID`; transition tức thời khi Checkout ghi nhận success.
- Tải lại A7 vẫn xác thực dữ liệu từ server và không thể xem order của người khác.
- Chỉ một trạng thái thành công trên A7; không có selector hoặc panel mô phỏng pending/failed.
- Mọi dữ liệu giao dịch/vé/QR hiển thị đều lấy từ response thật đã xác minh; không còn fixture cá nhân hoặc cam kết không có trong backend.
- Shared header/footer được tái sử dụng; màu sắc, chữ, bề mặt, bo góc và khoảng cách nhất quán Cosmic Graffiti.
- CTA hoạt động với route hiện có; trường hợp dữ liệu thiếu/lỗi/đơn chưa trả tiền không hiển thị success giả.
- Có xác minh responsive và accessibility tối thiểu; báo cáo ghi rõ viewport, kết quả và các mục chưa kiểm chứng.

## 7. Phụ thuộc và việc chưa xác minh

- Runtime `GET /api/health` và `/api/config` đã trả 200; API protected `/api/me/order-history/:id` được thử không phiên và trả 401 như yêu cầu auth. Response của một order PAID chưa xác minh do không có phiên/test order.
- Chưa xác minh backend có endpoint/invoice PDF hay API lấy danh sách vé theo order.
- Chưa xác minh điều hướng VNPay return/demo/SePay webhook end-to-end vào A7.
- Chưa có browser review, luồng thanh toán end-to-end, responsive runtime hoặc accessibility audit. Build đã đạt.

## 8. Kết quả triển khai A7

- Đã tạo `client/src/pages/booking/PaymentStatus.tsx` và `payment-status.css`; page gọi `GET /me/order-history/:id`, chỉ render success khi response `status === "PAID"`. Trạng thái chưa PAID có nút kiểm tra lại/quay về Checkout; lỗi API có retry. Trang không tự dựng QR/invoice giả; CTA dẫn sang `/tickets`, `/orders`, `/explore`.
- Đã thêm route có `Guard` trong `client/src/App.tsx`; route tái sử dụng shared header/footer của ứng dụng.
- Checkout điều hướng bằng replace khi dữ liệu đã tải, order ID khớp route và order đã PAID; hoạt động sau reload hoặc khi polling cập nhật order thành PAID.
- Build `npm run build`: PASS. Browser/responsive/accessibility/end-to-end chưa xác minh.
- API runtime trong phiên: health 200; config 200; authenticated order-history chưa kiểm tra được (unauthenticated 401).
- Báo cáo triển khai: [`../reports/stitch/A7_20261030_212912_implementation.md`](../reports/stitch/A7_20261030_212912_implementation.md).

## 9. Lịch sử phiên

- 2026-10-30 21:20 (Asia/Ho_Chi_Minh): đọc Master Plan; đọc HTML/ảnh và design system A7 từ Stitch; đối chiếu source Checkout, route và API; tạo kế hoạch và report review mới; không sửa Stitch hoặc source code.
- Báo cáo phiên: [`../reports/stitch/A7_20261030_212043_review.md`](../reports/stitch/A7_20261030_212043_review.md).
- 2026-10-30 21:24 (Asia/Ho_Chi_Minh): bổ sung bảng API A7 trực tiếp và API thuộc luồng Checkout, ghi rõ method/path/vai trò/auth và mức xác minh; [báo cáo phiên bổ sung](../reports/stitch/A7_20261030_212416_api_inventory.md).
- 2026-10-30 21:29 (Asia/Ho_Chi_Minh): triển khai A7, nối redirect từ Checkout, tái sử dụng shared shell và xác minh build/API health; [báo cáo triển khai](../reports/stitch/A7_20261030_212912_implementation.md).
- 2026-10-30 21:43 (Asia/Ho_Chi_Minh): điều tra transition Checkout → A7; 2 browser test SePay/VNPay với API mock và 11 backend payment/order tests đều PASS. Runtime health/config 200; config tắt legacy payment mode, endpoint protected yêu cầu auth; chưa xác minh giao dịch/webhook thật. [Báo cáo kiểm chứng luồng](../reports/stitch/A7_20261030_214341_payment_flow_verification.md).
- 2026-10-30 21:47 (Asia/Ho_Chi_Minh): kiểm tra lại runtime; API/worker đang chạy, config SePay-only nhưng không có order/session authenticated để xác minh một payment cụ thể; luồng end-to-end vẫn chưa được chứng minh. [Báo cáo runtime](../reports/stitch/A7_20261030_214747_runtime_recheck.md).
- 2026-10-30 21:59 (Asia/Ho_Chi_Minh): chuẩn bị tái hiện theo event ID user cung cấp; local API trả 404 cho event và danh sách chỉ có 13 event khác, nên chưa đăng nhập/tạo đơn trên runtime sai khả năng. Chờ URL môi trường có event và xác nhận bước thanh toán SePay Live. [Báo cáo phiên](../reports/stitch/A7_20261030_215937_event_test_blocked.md).
- 2026-10-30 22:01 (Asia/Ho_Chi_Minh): người dùng xác nhận website/runtime khác và Supabase nhưng URL frontend chưa cung cấp; repo không cấu hình remote API base URL, local vẫn không có event ID. Chưa dùng credential hoặc tạo order. [Báo cáo xác định môi trường](../reports/stitch/A7_20261030_220133_supabase_test_target.md).
- 2026-10-30 22:03 (Asia/Ho_Chi_Minh): kiểm tra URL ngrok và Supabase ở chế độ chỉ đọc; API có 13 event khác, event id không tồn tại trong `public.events`, loại vé cũng không có trong `ticket_types`. Không đăng nhập/tạo order/payment. Cần event/UUID đúng trên DB. [Báo cáo kiểm tra event](../reports/stitch/A7_20261030_220318_supabase_event_check.md).
- 2026-10-30 22:11 (Asia/Ho_Chi_Minh): user chọn event `d168e3d7-f960-49cb-8920-5f08309fc543`; qua UI đăng nhập SPA tạo order một vé Phổ Thông 10.000 VND (HTTP 200), tạo SePay Live instructions (HTTP 201). Checkout vẫn mở để polling; chưa có xác nhận chuyển khoản hoặc A7 redirect. [Báo cáo order pending](../reports/stitch/A7_20261030_221101_live_order_pending.md).
- 2026-10-30 22:14 (Asia/Ho_Chi_Minh): user xác nhận chuyển khoản; Supabase read-only xác nhận order `PAID`, SePay `SUCCEEDED`, không cần review và 1 vé đã phát hành. Browser Checkout vẫn không tự chuyển. Runtime JS bundle thiếu route `payment-status`/A7 markers trong khi source repo có A7; nguyên nhân là frontend runtime chưa deploy source mới. Cần redeploy và kiểm tra lại. [Báo cáo kết quả live](../reports/stitch/A7_20261030_221452_live_payment_result.md).
- 2026-10-30 22:23 (Asia/Ho_Chi_Minh): sau khi người dùng deploy bundle mới (hash `index-DYDEyZ0Q.js`, marker `payment-status` có mặt), browser smoke test không thu thêm tiền với order PAID cũ tự chuyển từ Checkout sang A7. H1 thành công hiển thị; `GET /me/orders/:id` và `GET /me/order-history/:id` đều 200/PAID. Nhánh đang mở pending rồi nhận payment sau deploy chưa được chạy lại. [Báo cáo smoke test](../reports/stitch/A7_20261030_222306_postdeploy_smoke.md).
