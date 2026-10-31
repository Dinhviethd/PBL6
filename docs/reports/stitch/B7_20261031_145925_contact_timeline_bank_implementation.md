# B7 — triển khai số điện thoại, timeline thời gian và tài khoản thụ hưởng

- Thời điểm: **2026-10-31 14:59:25 UTC+7**, Asia/Ho_Chi_Minh; hành động: implementation + API/browser verification + cập nhật API local.
- Màn hình **B7 — Chi tiết đơn hàng**, project EventHub **10374042969343935993**, screen **0e7d1d0aa45f47e7be30f44864b09272**, DESKTOP2560×3364.
- HTML **12761929990177829747**, ảnh **3010392199641701271** cùng namespace `projects/10374042969343935993/files/`.
- [Kế hoạch mục9 và nhật ký](../../ui/Feature_B7_OrderDetails.md); [kế hoạch trước](B7_20261031_145003_contact_timeline_bank_plan.md).

## 1. Yêu cầu, trạng thái ban đầu và nghiệm thu

Đọc Master Plan/skill/kế hoạch trước Stitch. B7 trước đã triển khai, ĐẠT CÓ ĐIỀU KIỆN trên DB cô lập; phone/bankAccount null, audit minh họa. Người dùng yêu cầu thực hiện kế hoạch bổ sung: số điện thoại buyer hiện tại, timeline có thời gian; quét VietQR là khoảng tối đa15 phút từ tạo payment; bỏ mốc email thành công thay bằng issuedAt của QR; bổ sung bank snapshot.

Tiêu chí: public modules/ownership giữ nguyên; phone đúng buyer và nguồn current; bank đúng payment canonical kể cả attempt khác/new config; không fake scan/email; window không vượt hạn thực tế hoặc làm đổi deadline nghiệp vụ; issuedAt không thay khi reload/in. Giữ khung/card Stitch, TSX+CSS cùng file và các chỉnh sửa UI có sẵn. API xác minh trước tích hợp, HTTP/quyền/browser/boundaries/build/lint và report/Master Plan bắt buộc.

## 2. Stitch và phạm vi thực tế

get_project/get_screen/download_file HTML và ảnh đều thành công với đúng project/screen. Đã đọc HTML timeline/bank/phone và xem ảnh trước chỉnh sửa. Không gọi edit/generate/apply, không đổi thiết kế Stitch hoặc màn khác.

Giữ Cosmic Graffiti theo artifact đang triển khai (Syne, Be Vietnam Pro, Space Grotesk; dark/purple/cyan; sidebar chung). Chỉ thay dữ liệu phone/bank và card timeline theo thay đổi nội dung đã được người dùng yêu cầu. Timeline thật là ngoại lệ được duyệt cho phần audit UI-only cũ. KYC/risk/QR động/POS vẫn giữ toast; không khôi phục các nhãn người dùng đã sửa trong TSX trước phiên. Không sửa B6/sidebar/picker ở lượt này.

## 3. Source thay đổi

- Auth infrastructure thêm SELECT phone theo buyer ID; public `orderBuyerContact(principal,buyerId)` role Organizer/ADMIN, trim/rỗng→null, chỉ trả contact và nguồn. Workflow gọi sau event guard và order.event_id; không tạo HTTP API tra số người bất kỳ hoặc query xuyên owner.
- Payment store thêm `managerBankAccount(orderId,paymentId)` join payments/sepay_payment_details cùng owner, filter đúng order/payment/provider; chọn bank_code/account_number/account_name từ snapshot lịch sử. managerPayments thêm provider_expires_at. Không lấy `.env`, raw webhook hoặc cấu hình mới làm ngân hàng lịch sử.
- OrderManager workflow nhận Auth port qua composition root `server/src/app.ts`; detail phone current, bank snapshot, timeline có type/source/id. Chọn PAID gắn paid_payment_id, rồi active/latest đồng bộ contact/payment/bank/window.
- Timeline lấy order.created_at, payment.created_at/succeeded_at, ticket.issued_at. VIETQR_WINDOW có occurredAt=null, paymentCreatedAt/referenceWindowEndsAt/effectiveWindowEndsAt/providerExpiresAt. End=min(start+15 phút, hạn provider). Khi cùng timestamp, ưu tiên tạo đơn→window→thanh toán→cấp QR; không sửa timestamp thật. Trả từng vé, không gom sai các giờ phát hành khác nhau.
- Frontend B7: hiển thị phone và nguồn hồ sơ hiện tại; ngân hàng/số/tên tài khoản nhận tiền, thiếu dữ liệu vẫn báo rõ. Timeline chuyển thành ol/li/time với UTC+7, không còn mục email hoặc button demo. In/refetch QR không tạo sự kiện mới. Capability timeline=true; audit tổng quát vẫn=false.
- Không sửa schema/migration source, payment deadline/worker hoặc luồng tiền. Test dùng migration SePayLocalFoundation đã có để tạo schema fixture riêng; không chạy migration trên Live.

## 4. API đã xác minh và tích hợp

GET **`/api/organizer/events/:id/orders/:orderId`** được mở rộng, không thêm endpoint mới. Kiểm tra contract/quyền source và HTTP trên DB test thành công **trước** khi nối field vào UI. Environment: PostgreSQL17 container riêng `eventhub-b7-test`,127.0.0.1:55437, DB eventhub_b7_test; backend server/dist cổng loopback động. Tests chặn DB ngoài localhost/không đuôi_test. Không tạo đơn/thanh toán thật trên Live.

| Kiểm tra | Kết quả |
|---|---|
| Detail owner/ADMIN | 200, no-store; buyer/Organizer khác403; guest401; missing/cross-event404; UUID/query sai400 |
| Phone | Owner có số0900000099 nhưng buyer0900000001, response đúng buyer; PATCH hồ sơ đổi số trả số mới; phone trắng trảnull/source null; ADMIN đúng quyền |
| Demo/missing bank | bankAccount=null, không tạo ngân hàng mẫu |
| SePay snapshot/canonical | Fixture snapshot account000000001234 được trả cùng payment PAID; attemptFAILED mới có account khác không thay snapshot PAID; config SePay runtime không được dùng để bịa tài khoản |
| Window | Payment tạo16:55Z → reference17:10Z; hạn17:05Z → effective17:05Z; hạn dài hơn → effective17:10Z. UTC+7 qua ngày. Không dùng order.createdAt, occurredAt của scan window=null |
| QR issuance | Hai vé issuedAt khác nhau giữ hai mốc; GET preview/reload không đổi issuedAt; không event EMAIL; chưa payment chỉ có ORDER_CREATED |
| Deadline | GET/detail/timeline không thay order.expires_at hoặc provider/reconcile deadlines; test chỉ thay dữ liệu synthetic để tạo case |
| QR/in/quyền hồi quy | Decode QR thật khớp token, review409; check-in timestamp, VOID không printable; canonical PAID thắng latestFAILED |

Fixtures tạo bank snapshot SePay tổng hợp trong DB test, không gọi ngân hàng hoặc giả rằng đã thử giao dịch SePay Live mới. GET preview/list/event và Auth login/profile hiện có tiếp tục được dùng trong test; không đổi API người mua hoặc API admin.

## 5. Kiểm thử và ảnh

PASS:

- server `npm run build`, `npm run check:boundaries`.
- client `npm run build`, `npx eslint src/pages/organizer/OrderDetailsPage.tsx`.
- `node --test --test-concurrency=1 test/order-manager.integration.test.cjs test/order-details.integration.test.cjs`:2 suites PASS,0 skip.
- `B7_UI=1 node --test test/order-details.integration.test.cjs`: API + Chrome1440/1024/768/390 PASS; phone/source, bank number, mốc timeline/time, bỏ email, thời gian không đổi sau in; B6→B7/back/page6/filter, deep-link/reload, bốn trạng thái, error/retry/404, QR/in/PDF, review trước in, keyboard toast/menu và no overflow vẫn PASS.

Ảnh bốn viewport ở `C:/Users/trank/AppData/Local/Temp/eventhub-b7-contact-20261031/{1440,1024,768,390}.png`; đã xem desktop/mobile, QR mask hồng, dữ liệu fixture. Không khôi phục các ảnh docs/evidence/assets bị xóa sẵn ngoài phiên. Helper browser mặc định lưu Temp theo thời gian, tránh ghi đè bằng chứng report trước.

Một lần test QR decoder sampling320 gặp NotFound ngẫu nhiên; đã áp dụng đọc320/640/960 nearest như B6, vẫn bắt buộc decode khớp token thật. Lần đầu chạy check:boundaries từ root không có script; đã chạy đúng server PASS. Các kết quả này không được tính là pass trước khi sửa và chạy lại. Build giữ warning bundle lớn/Browserslist/browser-mapping cũ, không đổi dependency ngoài phạm vi.

## 6. Runtime local sau kiểm thử

Theo lựa chọn người dùng đã xác nhận nạp API B7 vào container local8000, tiếp tục cập nhật đúng container sau test:

- Sao lưu5 JS cũ tại `C:/Users/trank/AppData/Local/Temp/eventhub-b7-contact-backup-20261031_145919`.
- Nạp app.js, workflows/order-manager.js, modules/auth/public.js, modules/auth/infrastructure/store.js, modules/payment/infrastructure/store.js vào `/app/dist` của `pbl6-api-1`.
- SHA256 của5 file host/container khớp; restart riêng API thành công. Container API ID vẫn `7d874713987e6070a34a139682c57f7a2061130fe5289c91a094697c443f5585`, image eventhub-local.
- GET health200, detail401 không token trực tiếp8000 và quaVite5173 lúc14:59. Không giả response data200 authenticated Live; chưa kiểm chứng phone/bank/timeline của đơn thật bằng Organizer token.
- Worker ID `6056c94dc8d013d042ceb2c7e952bf8f083f848d9f93c2919767e0f192f6b326` và StartedAt2026-10-31T06:01:17.260623912Z giữ nguyên. Không mutation nghiệp vụ hoặc migration Live.
- Image chưa rebuild; recreate từ image cũ có thể mất bản nạp tại chỗ. Cần rebuild image khi đóng gói phát hành.

## 7. Đánh giá theo tiêu chí

| Tiêu chí | Kết quả | Giới hạn |
|---|---|---|
| Nội dung | PASS trong phạm vi bổ sung | Phone current/source, bank snapshot, timeline thực, window15 phút và issuedAt thay email |
| Bố cục | PASS các viewport đã xem/test | Giữ card Stitch, danh sách timeline dài theo số vé; không tuyên bố pixel-perfect |
| Design system | PARTIAL | Giữ artifact/theme hiện có, khác palette mô tả đã ghi trước |
| Ngôn ngữ/khả năng đọc | PARTIAL | Mốc/time/nguồn rõ, không tràn; chưa audit mọi contrast |
| Điều hướng/nghiệp vụ | PASS trên DB test | Ownership/quyền/canonical payment, không thay deadline; B6 back/in hồi quy |
| Trạng thái UI | PASS các case đã thử | Null phone/bank, pending/cancel/expired/review, thiếu issued/confirmed, retry |
| Responsive/a11y | PARTIAL |4 viewport + keyboard/menu/time semantic; chưa screen reader/audit đầy đủ |
| Nhất quán | PASS trong scope | Sidebar/route/B6 giữ nguyên; TSX/CSS cùng file; phần UI-only còn lại giữ toast |

Tổng thể **ĐẠT CÓ ĐIỀU KIỆN**. Thiết kế cuối **ĐÃ TẠO, không sửa Stitch**; bổ sung source/API/UI **đã triển khai**, container local đã nạp. Đã giải quyết phone/bank null khi có dữ liệu và timeline demo cho các mốc có nguồn. Không bổ sung số điện thoại snapshot lịch sử, telemetry khách quét QR ngân hàng, email delivery log hoặc audit toàn bộ thao tác.

Còn chưa xác minh: authenticated Live, browser khác Chrome, accessibility đầy đủ, ảnh Temp bền vững lâu dài và image deployment hoàn chỉnh. TraceID/invoice vẫn ngoài phạm vi.

## 8. Tài liệu và kiểm tra phạm vi

Kế hoạch cập nhật thời điểm/report, trạng thái phạm vi bổ sung, nhật ký và9.6 kết quả. Master Plan5.2/5.4 cập nhật B7 triển khai mới, giới hạn/link/thời điểm; mục4 dòng13 và6.F bổ sung kết quả tích hợp phần mới. Giữ report cũ và các mục màn hình khác.

Git diff-check/readback dùng kiểm tra phạm vi; source B6, sidebar/picker và các ảnh bị xóa sẵn không được sửa/hoàn tác. Không thay .env/schema/migration source; chỉ thêm helper test dữ liệu tổng hợp. Container fixture được dừng sau kiểm thử, DB giữ lại để tái kiểm tra khi cần.
