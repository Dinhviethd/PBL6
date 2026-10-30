# B6 — Phiên triển khai và xác minh API quản lý đơn hàng

- Thời điểm: 2026-10-30 23:52:10 UTC+7.
- Màn hình: **B6 — Quản lý đơn hàng** cho Organizer; Stitch project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`.
- Căn cứ: `docs/PROJECT_MASTER_PLAN.md`, `docs/ui/Feature_B6_OrderManager.md` mục 11–14 và các report B6 trước. Thiết kế Stitch đã được xem ở các phiên trước; phiên này **không gọi hoặc chỉnh Stitch**, không thay đổi giao diện, sidebar, Checkout/A7 hay source frontend.
- Phạm vi được giao: bổ sung và kiểm thử API cho KPI/count tabs, lọc ngày/tìm email, bảng đơn enriched, preview/in QR. Các chức năng khác ngoài phạm vi.

## Thay đổi đã thực hiện

1. `GET /api/organizer/events/:eventId/order-manager`: xác thực và guard event trước khi đọc; hỗ trợ `page`, `q`, `group`, `fromDate`, `toDate`; trả KPI và counts trên toàn scope, danh sách 50/trang, item/ticket summary và payment canonical theo `paid_payment_id`. Ngày dùng UTC+7, khoảng cuối exclusive; q tìm literal trên mã/tên/email snapshot. Response không chứa QR/token.
2. `GET /api/organizer/events/:eventId/orders/:orderId/tickets`: guard event và order cùng event; chỉ cấp ảnh QR thật cho đơn PAID không có payment review mở; VOID có `qrImage=null`, `printable=false`. Dùng ciphertext/token của vé đã phát hành, không tạo vé mới. Hai route có `Cache-Control: no-store`.
3. Thêm transaction đọc `REPEATABLE READ` cho các truy vấn nhiều bước; store Order chỉ đọc bảng thuộc Order, store Payment cung cấp projection payment theo batch 500; workflow ghép kết quả qua public ports. API orders cũ giữ response array.
4. Thêm test HTTP PostgreSQL cô lập, test giải mã QR bằng ZXing và kiểm tra snapshot khi transaction khác đổi review flag; thêm `@zxing/library` vào devDependencies của server cho test.

## Môi trường và bằng chứng kiểm thử

- Build source mới: `npm run build` **PASS**; `npm run check:boundaries` **PASS**.
- PostgreSQL 17 trong Docker chỉ bind `127.0.0.1:55439`, database `eventhub_b6_test`, secret/QR secret test; test gọi HTTP server khởi tạo từ build mới trên cổng động. Không ghi vào Live/Supabase. Container test được dọn sau kiểm thử.
- `TEST_DATABASE_URL=... B6_BENCH=1 npm test`: **72 tests; 70 pass, 0 fail, 2 skip**. Hai skip thuộc SePay L1 isolation và SePay buyer API, không thuộc B6. Bài B6 HTTP + benchmark pass.
- Sau khi bổ sung kiểm tra QR decode, literal search và snapshot concurrency, chạy riêng `node --test test/order-manager.integration.test.cjs`: **1 pass, 0 fail, 0 skip**; build và boundary checker vẫn pass. Lần chạy riêng không bật benchmark; benchmark đã pass trong suite trước đó với cùng implementation API.
- Benchmark fixture: 10.000 đơn, 5 payment attempts/đơn; 30 lần gọi list: p50 **412 ms**, p95 **445 ms**. Preview 10 QR, 30 lần: p50 **92 ms**, p95 **99 ms**. Cùng máy Docker local, chưa phải SLA production. Số truy vấn SQL thực tế chưa instrument.

## Đối chiếu tiêu chí kế hoạch

| ID | Kết quả xác minh |
|---|---|
| T01–T02 | Guest401, owner200, Organizer khác/buyer403, ADMIN200; preview order khác event404, order không có404, UUID/query validation theo route. Staff-only và toàn bộ biến thể UUID chưa có test riêng. |
| T03–T04 | Biên ngày UTC+7 16:59:59.999Z/17:00Z, ngày không tồn tại, from>to, email không phân biệt hoa thường/trim, tên, `%`/`_`/backslash literal, chuỗi injection, q>200 đã qua HTTP. Leap day và phần vi giây chưa có fixture riêng. |
| T05–T08 | PAID/pending/cancelled/expired, review ưu tiên processing, KPI paid vẫn theo order status, scope counts không phụ thuộc tab/page, 50/trang, trang vượt cuối, canonical paid pointer đã kiểm. Retry nhiều attempts và 120 đơn/tie-break cùng timestamp chưa có test riêng. |
| T09–T10 | Item type/quantity và ticket VALID/VOID/expected được kiểm; chưa có fixture nhiều loại vé, số tiền vượt giới hạn Number hoặc PAID thiếu vé. |
| T11–T12 | Preview owner/ADMIN, pending/review409, VOID không in, QR PNG giải mã đúng token của buyer API, lặp GET không tăng số vé, no-store; không ghi token vào report. Chưa kiểm CHECKED_IN/máy quét vật lý; diff toàn bộ bảng payment/check-in chưa instrument. |
| T13 | Test transaction đọc `REPEATABLE READ`: update review flag từ connection khác không đổi lần đọc thứ hai trong snapshot, request mới thấy giá trị mới. Chưa dựng race webhook/check-in đầy đủ qua HTTP. |
| T14 | Boundary checker pass; legacy organizer orders vẫn array; regression suite 70 pass, 2 skip SePay. |
| T15 | List và preview đạt ngưỡng p95 <2 giây trên fixture local; số query chưa instrument, chưa đo production. |
| T16–T17 | **NOT_RUN**: phiên này không triển khai frontend/browser/print PDF hoặc thử máy in. |

## Kết luận và vấn đề còn tồn tại

Hai API mới **đã hoạt động trên build mới với HTTP thật và DB test cô lập**, đủ hợp đồng cơ bản để bắt đầu tích hợp B6 frontend. **Chưa kết luận nghiệm thu đầy đủ T01–T15** vì các fixture biên và race nêu trên chưa được kiểm; benchmark chỉ phản ánh máy local. B6 UI và in thực tế chưa hoàn thành. Backend đang chạy ở các cổng khác (nếu có) không được restart/deploy trong phiên này, nên chưa khẳng định các cổng đó đã phục vụ hai route mới. Không dùng dữ liệu giả để che khoảng trống này.

Thiết kế Stitch giữ nguyên; frontend/sidebar giữ nguyên. Master Plan đã cập nhật dòng B6 ở mục 4, 5.2, 5.4 và ghi chú tích hợp mục 6.F; `Feature_B6_OrderManager.md` được cập nhật kết quả/journal phiên này. Không chỉnh màn hình khác.
