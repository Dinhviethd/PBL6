# Báo cáo A9 — Kiểm tra API và bổ sung kế hoạch

## Thông tin và phạm vi

- Thời điểm: **2026-10-28 10:49:25**, Asia/Ho_Chi_Minh; hành động: API review/plan update.
- A9 — Lịch sử đơn hàng và giao dịch; Master Plan dùng tên “Lịch sử đơn hàng”. Stitch project `10374042969343935993`, screen `4c62fed99aea4822ab345033e5d95dba`.
- Nguồn Stitch được kiểm tra trong [phiên trước](A9_20261028_103258_review.md): metadata DESKTOP 2560×3722, ảnh 1920×2706, HTML file `16066183640442567768`, ảnh `12724823235326917199`. Phiên này không gọi lại hoặc sửa Stitch; không tuyên bố đã review lại artifact.
- Yêu cầu: bổ sung các điểm còn thiếu của [kế hoạch A9](../../ui/Feature_A9_Orders_Screen.md), kiểm tra backend để làm rõ contract; chỉ sửa tài liệu.
- Ban đầu: artifact đã tạo/giữ nguyên; thiết kế–code KHÔNG ĐẠT, nhiều contract chưa rõ. Tiêu chí phiên: phân biệt API đang có/đề xuất, xác minh đọc runtime, chốt các ràng buộc hiện hữu, ghi tồn tại và hướng bổ sung.

## Thao tác đã thực hiện

Đọc Master Plan trước; đọc payment store/public, order store/public, workflow detail/startPayment/cancelOrder/lockedOrder, event guard, route/query parsing, schema, worker, MyWaitQueue và quy định service ownership. Gọi health, auth login và các API đọc bằng tài khoản được người dùng chỉ định cùng customer demo. Không gọi tạo payment/hủy/check-in, không sửa dữ liệu đơn/vé, không seed, không sửa source/config hoặc màn hình khác.

Khi bắt đầu đã có thay đổi Profile/profile.css/AuthHeader và tài liệu A8/A9 từ các phiên trước; giữ nguyên. Phiên này chỉ sửa plan A9, Master Plan và tạo report này.

## Bằng chứng API runtime

Môi trường `http://localhost:8000/api`; mọi credential/token/định danh đơn và QR được giữ khỏi report. Các lần đăng nhập tạo phiên xác thực phục vụ kiểm tra, không phải thao tác đặt/thanh toán đơn.

| Kiểm tra | Kết quả |
|---|---|
| GET health, POST login hai tài khoản | 200 |
| GET me/orders chưa đăng nhập | 401 |
| GET me/orders tài khoản chỉ định | 200, mảng 8 đơn: PAID 3, EXPIRED 5; không có total/KPI |
| GET me/orders?page=1 | 200, mảng rỗng |
| q mã đơn / q tên sự kiện / q tên người mua | 200; lần lượt 1 / 0 / 8 bản ghi |
| status=PAID / status=FAILED | 200; lần lượt 3 / 0 bản ghi; FAILED không phải order status theo schema |
| from không hợp lệ | 400 VALIDATION |
| Detail đơn PAID thuộc tài khoản | 200; có items/event/latest_payment, không có payment active trong JSON; latest SUCCEEDED, provider vnpay_sandbox, trùng paid_payment_id ở mẫu này |
| Detail cùng đơn từ customer khác | 403 FORBIDDEN |
| Detail UUID không tồn tại | 404 NOT_FOUND |
| to đầu ngày UTC / cuối ngày UTC | Mẫu đơn bị loại / được trả về; xác nhận rủi ro biên ngày |
| GET me/orders tài khoản demo | 200, 9 đơn: CANCELLED 4, EXPIRED 5 |
| GET me/tickets | 200; DTO danh sách không có order_id/order_item_id |

Mutation cancel/startPayment chỉ kiểm tra code; không có status runtime cho các nhánh này. Nguồn mẫu không chứa pending/unknown/failed để kiểm chứng chuyển trạng thái. Không suy rộng kết quả page1 rỗng thành test >50 đơn.

## Kết luận contract quan trọng

- Hủy chỉ cho order PENDING_PAYMENT không active payment; PAYMENT_IN_PROGRESS/ORDER_CLOSED do backend quyết định. Bắt đầu/thanh toán lại còn phụ thuộc provider/event/expiry/giữ chỗ, không áp dụng cho EXPIRED/CANCELLED/PAID.
- GET detail là thao tác đọc DB. Worker gọi provider reconcile; không có API customer manual reconcile được xác minh. POST payments có thể tạo attempt, không dùng làm nút kiểm tra trạng thái.
- active payment là PENDING/UNKNOWN; latest payment là bản ghi mới nhất. Giao dịch xác nhận đơn là paid_payment_id; cần DTO riêng khi latest khác paid. Unresolved review phải xét requires_review cùng review_resolved_at, kể cả payment SUCCEEDED.
- Danh sách thiếu tổng/pagination metadata, items/payment/ticket summaries. Contract vé thiếu order linkage. Provider không chứng minh kênh ngân hàng/ví cụ thể. Chưa có VAT/Points customer API.
- Đã bổ sung đề xuất GET `/api/me/order-history` và order tickets/detail mở rộng, đánh dấu rõ **chưa tồn tại**; không đổi contract mảng endpoint cũ. Đề xuất phải tuân thủ owner/batch interface, không join chéo module hoặc N+1 không kiểm soát.
- Chốt đề xuất UTC+7 half-open range, định nghĩa KPI/facet/total, bảng hành động, xử lý optional fields và lỗi, polling giới hạn, MyWaitQueue và bộ test còn thiếu. Các lựa chọn sản phẩm/API mới chưa được coi là đã phê duyệt.

## Checklist và kết quả

| Tiêu chí | Trạng thái | Ghi nhận |
|---|---|---|
| Yêu cầu/nội dung | PARTIAL | Plan đã chi tiết hơn; contract tổng hợp và quyết định sản phẩm còn thiếu |
| Bố cục | NOT_VERIFIED | Không review browser hoặc thay đổi bố cục trong phiên |
| Cosmic Graffiti | NOT_VERIFIED | Giữ kết quả thiết kế phiên trước, không kiểm chứng lại |
| Ngôn ngữ/khả năng đọc | PARTIAL | Nhãn trạng thái và nguồn dữ liệu đã làm rõ trong plan; UI chưa triển khai |
| Điều hướng/nghiệp vụ | PARTIAL | Đọc API thật xác nhận; mutation, payment refresh ngân hàng và link vé theo đơn còn thiếu |
| Trạng thái giao diện | NOT_VERIFIED | Kế hoạch thêm các ca kiểm thử, chưa chạy giao diện |
| Responsive/accessibility | NOT_VERIFIED | Không có test mới |
| Nhất quán | PARTIAL | Kế hoạch giữ shell/shared auth và backward compatibility; chưa triển khai |

**Kết quả: chưa đủ điều kiện triển khai trọn A9; review thiết kế–code vẫn KHÔNG ĐẠT.** API đọc hiện có hoạt động; phần tích hợp cần contract tổng hợp/liên kết vé còn `BLOCKED` cho đến khi có API thật và xác nhận lựa chọn liên quan. Nhiệm vụ kiểm tra API và cập nhật tài liệu của phiên đã hoàn thành.

Đã giải quyết sự chưa rõ về response list/detail, search, quyền, biên ngày, nguồn trạng thái và điều kiện mutation trong code. Tồn tại: API đề xuất chưa xây dựng; VAT/Points/chi tiết/MyWaitQueue/KPI cần quyết định; chưa test >50 đơn, payment pending/unknown/failed, mutation, giao diện hoặc accessibility. Không chạy build/lint vì chỉ sửa tài liệu.

Thiết kế cuối giữ nguyên artifact theo bằng chứng phiên trước; không có sai lệch mới được duyệt. Master Plan cập nhật dòng API lịch sử (mục 4/12) và review A9 (5.4) với kết quả runtime, phụ thuộc, report mới và thời điểm; không nâng trạng thái frontend hoặc cập nhật A6. Mọi sửa tài liệu được ghi nhận trong report này và nhật ký plan; report cũ giữ nguyên.
