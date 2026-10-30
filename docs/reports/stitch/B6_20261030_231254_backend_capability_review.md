# B6 — Xác minh khả năng backend so với chức năng Stitch

- Thời điểm: 2026-10-30 23:12:54 Asia/Ho_Chi_Minh (UTC+07:00).
- Loại hành động: backend logic/capability review, chỉ đọc source và HTTP GET; cập nhật tài liệu.
- Màn hình chính thức: **B6 — Quản lý đơn hàng**, project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`.
- Metadata Stitch: “B6. Quản lý đơn hàng - Cosmic Ticket Ban Tổ Chức”, DESKTOP 2560×3158; HTML `7004176431460157052`, ảnh `8369068700193780000`.
- [Kế hoạch cập nhật, ma trận chức năng mục 10](../../ui/Feature_B6_OrderManager.md); [report trước](B6_20261030_230524_review_plan.md).

## 1. Yêu cầu, trạng thái ban đầu, tiêu chí

Đọc Master Plan trước Stitch; B6 bảng 5.2/5.4 đang NEEDS_REVIEW, source review KHÔNG ĐẠT, artifact giữ nguyên, inventory API sơ bộ chưa kiểm chứng authenticated runtime. Mục 4 dòng13 có GET orders Organizer; chức năng dữ liệu thật, quyền đúng event, thanh toán/phát hành vé theo nghiệp vụ ở mục7. User xác nhận B6 Organizer trong phiên trước và yêu cầu phiên này kiểm tra sâu chức năng nào backend chưa đáp ứng.

Tiêu chí: duyệt từng chức năng hiển thị trên Stitch; truy đến route → workflow → module → SQL/schema; phân biệt backend nội bộ với API có quyền Organizer, chức năng frontend với endpoint backend, source capability với vận hành thật. Không triển khai, không sửa Stitch/source hoặc màn khác.

## 2. Thao tác thực tế

1. Đọc Master Plan, kế hoạch B6 và git status; giữ nguyên các thay đổi có sẵn của user.
2. `get_screen` thành công, đúng ID/title/dimension/file nguồn như phiên trước. `download_file` HTML thành công; đọc lại các nhãn/tab/filter/action, không gọi edit/generate/update. Ảnh đã xem ở phiên trước; phiên này không có ảnh mới hay browser review mới.
3. Đọc toàn bộ order public/store/history, event guard, payment factory/store/SePay reconcile store, workflow booking/order-history/SePay-booking, schema/migrations liên quan và routes `app.ts`. Tìm các từ khóa resend/refund/escrow/invoice/VAT/CSV/XLSX/MoMo/Cybersource/phone/gate; truy dấu email/notification và socket.
4. Chạy trực tiếp module TypeScript source qua `node -r ts-node/register/transpile-only -` (stdin) trong server, dùng dependency bộ nhớ; không tạo file test hay sửa source, không dùng dist cũ.
5. Gọi HTTP GET local health và route orders không token; không đọc env/secrets, không đăng nhập/tạo đơn/thanh toán/refund/reconcile.
6. Tạo report mới này, đính chính inventory và thêm ma trận chi tiết/nhật ký trong file kế hoạch; cập nhật B6 ở Master Plan mục4/5.4 bằng kết quả kiểm tra sâu, không nâng trạng thái triển khai.

## 3. Phát hiện quan trọng và đính chính

### 3.1. Chi tiết đơn Organizer đã có khả năng đọc

`server/src/app.ts:854` → `booking.detail` tại `server/src/workflows/booking.ts:158`: buyer xem được; người khác đi qua `events.guard(eventId,p)` (`event/public.ts:97`), cho ADMIN hoặc ORGANIZER sở hữu event. Trả order, event, items, active payment và latest_payment. Do đó tên `/me/orders/:id` không có nghĩa chỉ buyer. Đính chính inventory cũ vốn gộp route này với history buyer.

`/me/order-history/:id` khác hẳn: `workflows/order-history.ts:134` bắt buyer_id=userId. `/me/tickets/:id` → `order/public.ts:244` cũng buyer-only (404 nếu khác); `/sepay/orders/:orderId/payment` detail buyer-only ở `workflows/sepay-booking.ts`. Không thể dùng history/QR/SePay poll của buyer thay cho quyền owner event.

Detail hiện tại vẫn thiếu ticket summary và payment canonical đầy đủ. `payments.active` chỉ PENDING/UNKNOWN; latest là lần tạo mới nhất, không bảo đảm trùng `paid_payment_id`. Không hiển thị đơn PAID thành thất bại chỉ vì latest attempt FAILED. List cần contract batch để tránh gọi một request detail mỗi dòng khi dựng bảng.

### 3.2. List/filter/pagination/KPI thiếu hợp đồng B6

`app.ts:924` → `orders.list` (`order/infrastructure/store.ts:195`) nhận event, page×50, status, q. Query search mã đơn hoặc tên; trả SELECT orders (đã có buyer email/name/event title snapshots, created_at, total_quantity/amount), không join item/payment/ticket, không có phone snapshot. Route không truyền from/to dù store có; không provider/page-size/total.

`app.ts:946` → booking.overview → store.summary (`:226`) đếm/sum **chỉ PAID**, thêm checkins. Doanh thu PAID và số đơn PAID có thể dùng, nhưng không phải tổng đơn toàn trạng thái, không có breakdown/trend/kỳ vé. Store obligations có paid/pending nội bộ phục vụ hủy event, không phải endpoint KPI B6.

### 3.3. Vé có logic phát hành, thiếu dữ liệu/QR dành cho B6

`order/public.ts:202` complete kiểm payment/order/tiền/tồn giữ chỗ; paid rồi tạo ticket theo từng reservation trong workflow transaction. Có VALID/CHECKED_IN/VOID. Tuy nhiên orders list/detail không trả ticket summary. Attendees trả metadata loại vé/khách/trạng thái nhưng không có order_id trong projection, không có QR token/image; không đủ nối từng đơn bằng tên khách. History nội bộ có thể enrich theo order nhưng API buyer-scoped. Preview/in vé ở B6 cần contract quyền Organizer trước; in trên browser không tự cần API tạo PDF.

### 3.4. Đối soát/log có backend, nhưng chỉ ADMIN

SePay `/admin/sepay/reconcile`, `/admin/sepay/transactions`, `/:id`, `/:id/reprocess`, `/:id/resolve` tại app.ts304–340 kiểm ADMIN và đăng ký có điều kiện cấu hình. Dữ liệu query theo môi trường/integration account, chưa là contract event-scoped cho Organizer. Không nối B6 tới API toàn cục này chỉ vì user có role Organizer. VNPay IPN/return là callback được ký/xác minh; không phải endpoint cho nút kiểm tra trạng thái tùy ý.

### 3.5. Hoàn tiền, email vé, hóa đơn, Escrow chưa có nghiệp vụ tương ứng

- Order schema chỉ PENDING_PAYMENT/PAID/EXPIRED/CANCELLED; payment PENDING/UNKNOWN/SUCCEEDED/FAILED. Không có refunded amount/refund ledger hoặc route trả tiền cho B6 trong source/schema/migrations đã rà.
- `refund_external` là outcome của admin resolve: `payment/sepay-reconciliation.ts:9` ghi review và gọi store.resolve; `sepay-store.ts:59` cập nhật review flags/timestamp. Không chuyển tiền, không đổi order sang REFUNDED, không tự thu hồi vé. Câu “Đã hoàn100%” không thể suy từ action này.
- ORDER_PAID gọi notifications.send → insert inbox DB; không gửi email vé. SMTP/email reset mật khẩu tồn tại nhưng không có ticket resend endpoint/service tương ứng trong route/workflow đã rà.
- History trả capabilities.vat=false; không có phát hành hóa đơn VAT. CSV/Excel có thể tạo frontend, nhưng list chưa đủ cột/filter/tổng cho export đầy đủ. Không kết luận mọi export cần API sinh file riêng.
- Factory legacy demo/VNPay sandbox + SePay độc lập; chưa có MoMo/Cybersource/card last4 và gate trong contract B6. Chưa có payout/settlement/escrow ledger để bảo đảm thông báo đã chuyển tiền vào Escrow.
- Có socket config nền, nhưng tìm source chưa thấy emit order/payment/event stream phục vụ B6. Refetch/polling list khả thi ở frontend; nhãn REAL-TIME/LIVE GATE SYNC không phải bằng chứng hệ thống đang đồng bộ.

## 4. Ma trận chức năng và mức hỗ trợ

Ma trận đầy đủ được ghi tại **mục10 của file kế hoạch**, phân loại 20 nhóm gồm phần có, thiếu và hỗ trợ một phần; không tạo backend/route giả. Chức năng sẵn có theo source: event selector, list fields cơ bản, q mã/tên, exact order status, refetch, detail owner event, revenue PAID, thông báo inbox và tạo event. Checkbox/copy/sidebar là frontend, không cần endpoint mới nếu chưa có nghiệp vụ hàng loạt cụ thể.

Các nhóm chưa thể đáp ứng nguyên trạng Stitch: KPI/tab count đầy đủ; date/provider/search phone-email; pagination total/page-size; list payment/items/ticket summary; QR/in/resend cho Organizer; VAT; export đầy đủ; đối soát/IPN/log/sổ phụ có quyền Organizer; refund; provider/thông tin thẻ/gate mẫu; cam kết realtime/Escrow.

## 5. Kiểm tra đã thực thi

7 kiểm tra logic source PASS với dữ liệu/dependency bộ nhớ, Node assert:

1. Organizer chủ event đọc detail có items; ví dụ latest FAILED khác paid_payment_id chứng minh không chọn canonical theo latest.
2. Organizer event khác đọc detail bị lỗi status403.
3. Chủ event không phải buyer đọc history detail bị lỗi status403.
4. Chủ event không phải buyer đọc QR bị lỗi status404.
5. Chủ event không phải buyer đọc SePay detail bị lỗi status404.
6. Query list dùng LIMIT50; args `[null,event,50,PAID,%name%,null,null]`, không search email.
7. Query summary có `WHERE status='PAID'`.

Đây là kiểm tra service/SQL được tạo bằng dependency giả trong bộ nhớ; không thực thi SQL trên PostgreSQL, không chứng minh authenticated HTTP hay giao dịch thật. Không thêm test file/source. Không chạy toàn suite hoặc build vì không thay implementation.

HTTP smoke chỉ đọc:

| Môi trường / method / path | Kết quả thực tế | Ý nghĩa |
|---|---|---|
| localhost8000 GET `/api/health` | 200 | Có backend phản hồi |
| localhost8000 GET `/api/organizer/events/00000000-0000-4000-8000-000000000001/orders` không token | 401 | Route yêu cầu xác thực; chưa kiểm chứng event tồn tại hoặc response owner |
| localhost8011 GET hai path tương tự | ECONNREFUSED | Không có dịch vụ nghe ở cổng đó lúc kiểm tra; không suy runtime8011 vẫn chạy từ báo cáo cũ |

Không có response200 orders/detail authenticated mới. Không sử dụng tài khoản cũ khi chưa xác định test subject/environment; không tạo mutation chỉ để kiểm tra inventory.

## 6. Checklist review, kết luận và cập nhật

| Tiêu chí | Kết quả phiên này |
|---|---|
| Yêu cầu/nội dung | PARTIAL: backend phục vụ subset, thiếu contract cho nhiều chức năng Stitch |
| Bố cục | NOT_VERIFIED mới; giữ kết quả review trước, không đổi UI |
| Design system | NOT_VERIFIED mới; artifact giữ nguyên, sai lệch đã ở report trước |
| Ngôn ngữ/khả năng đọc | NOT_VERIFIED mới; không sửa nội dung Stitch |
| Điều hướng/nghiệp vụ | FAIL theo phạm vi B6 đầy đủ: quyền QR/log/refund/VAT chưa đáp ứng; đã đính chính detail owner có hỗ trợ |
| Trạng thái UI | PARTIAL: có trạng thái domain nhưng chưa có projection và mapping đầy đủ cho B6 |
| Responsive/accessibility | NOT_VERIFIED |
| Tính nhất quán | PARTIAL: API owner và buyer khác quyền, phải áp dụng đúng ở B6 |

Kết luận tổng thể: **KHÔNG ĐẠT cho đầy đủ chức năng B6 Stitch với API hiện có**; không kết luận backend hỏng. Review source đã hoàn tất trong phạm vi kiểm tra, vận hành B6 authenticated còn NOT_VERIFIED. Thiết kế đầu/cuối vẫn giữ nguyên; frontend chưa triển khai, NEEDS_REVIEW. Không bị chặn truy cập Stitch.

Đã giải quyết: làm rõ khả năng detail owner và phân loại logic phát hành/refund/admin đối soát. Còn mở: contract B6 thiếu như ma trận; HTTP authenticated/ownership trên DB thật; quyết định phạm vi tính năng và các sai lệch thiết kế từ report trước.

Tệp thay đổi: tạo report này, sửa inventory/mục10/nhật ký tại kế hoạch B6, cập nhật đúng B6 bảng4 dòng13 và bảng5.4 (review, vấn đề, report mới, thời điểm). Không cập nhật 6.F là đã tích hợp vì không có tích hợp mới; không đổi màn hình khác. Không ghi đè report cũ, không sửa source hoặc dữ liệu/backend đang chạy. Git diff/check và kiểm tra liên kết tài liệu được thực hiện trước kết thúc.
