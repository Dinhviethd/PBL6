# Kế hoạch A9 — Lịch sử đơn hàng và giao dịch

Cập nhật: **2026-10-28 13:51**, Asia/Ho_Chi_Minh. Trạng thái: **đã triển khai frontend/API A9, ĐẠT CÓ ĐIỀU KIỆN**. Mục 1–13 giữ nội dung khảo sát/đề xuất trước triển khai; quyết định và kết quả hiện hành tại mục 14.

## 1. Phạm vi và nguồn thiết kế

- Mã/tên trong Master Plan: **A9 — Lịch sử đơn hàng**, route `/orders`, page `client/src/pages/account/MyOrders.tsx`.
- Stitch chính thức: project `10374042969343935993` — EventHub; screen `4c62fed99aea4822ab345033e5d95dba`, tên thực tế “A9. Lịch sử đơn hàng - Cosmic Ticket”.
- `get_screen`: DESKTOP **2560×3722**; ảnh tải về **1920×2706**. Screen instance trên canvas: **1280×1803**. Các kích thước thuộc các nguồn khác nhau, không đồng nhất chúng thành viewport trình duyệt.
- HTML: `projects/10374042969343935993/files/16066183640442567768`; ảnh: `projects/10374042969343935993/files/12724823235326917199`.
- [Báo cáo phiên review](../reports/stitch/A9_20261028_103258_review.md).
- [Báo cáo kiểm tra API và bổ sung kế hoạch](../reports/stitch/A9_20261028_104925_api_review_plan_update.md).
- Hai phiên lập kế hoạch chỉ tạo/cập nhật tài liệu. Phiên thực hiện sau đó đã được người dùng giao triển khai code và duyệt ba nhóm quyết định; xem mục 14. Không gọi `edit_screens`, không tạo bản sao màn hình.
- Dòng yêu cầu cập nhật A6 mâu thuẫn với phạm vi A9 và chỉ dẫn trước đó rằng A6 là màn hình riêng. Vì không review A6, chỉ cập nhật A9 trong Master Plan và ghi nhận mâu thuẫn trong report.

## 2. Mục tiêu giao diện theo Stitch

Tái hiện phần nội dung A9 bằng dữ liệu thật, giữ bố cục, phân cấp và diện mạo của artifact đã xác minh:

1. Breadcrumb Trang chủ → Tài khoản của tôi → Lịch sử đơn hàng.
2. Tiêu đề “Lịch sử đơn hàng & giao dịch”, mô tả, nút xuất báo cáo VAT.
3. Bốn thẻ tổng quan: tổng chi tiêu, đơn thành công, đang xử lý, đã hủy/thất bại.
4. Thanh tab Tất cả/Đã thanh toán/Đang xử lý/Thất bại–Hủy; ô tìm theo mã đơn hoặc tên sự kiện; bộ chọn thời gian.
5. Bảng sáu cột: mã đơn–ngày đặt, sự kiện–hạng vé, số tiền–phương thức, trạng thái thanh toán, trạng thái vé, thao tác.
6. Hành động theo trạng thái: xem vé/QR, chi tiết, VAT, kiểm tra thanh toán, hủy đơn, thanh toán lại, chi tiết lỗi.
7. Phân trang, tổng số bản ghi và dải hỗ trợ tra soát/hóa đơn.
8. **Dùng lại `AuthHeader`/`AuthFooter` EventHub chung**; không sao chép header/footer mẫu ENVENTHUB trong HTML. Hiện `/orders` chưa nằm trong `usesSharedHomeShell`.

Đây là danh mục thiết kế tham chiếu, chưa phải xác nhận các chức năng đều có API. Các điểm thiếu hợp đồng phải được giải quyết trước khi tích hợp.

## 3. Đối chiếu code và các điểm chưa đạt

| ID | Phát hiện đã kiểm tra | Ảnh hưởng và hướng xử lý dự kiến |
|---|---|---|
| A9-01 | `MyOrders.tsx` có PageHead, MyWaitQueue, form tìm kiếm/ngày, bảng năm cột, loading/error/empty và Pager; thiếu breadcrumb, bốn KPI, tab trạng thái, thanh thời gian mẫu, dải hỗ trợ | Tái hiện các khối A9 từ artifact khi được giao triển khai; giữ hành vi có ích đang có. |
| A9-02 | Bảng hiện không có hạng vé/số lượng trong cột sự kiện, phương thức thanh toán, trạng thái vé, nhóm nút hành động theo từng dòng | Cần hợp đồng dữ liệu phục vụ bảng, không tự suy diễn hoặc điền dữ liệu mẫu. |
| A9-03 | API danh sách trả các cột `orders`, 50 bản ghi/trang; không có tổng bản ghi/KPI hoặc dữ liệu thanh toán, items và vé trong cùng response | Chốt nguồn dữ liệu tổng hợp và chiến lược phân trang. Không tính KPI/toàn bộ tổng số từ một trang 50 đơn; tránh gọi chi tiết từng đơn không kiểm soát. |
| A9-04 | SQL `q` tìm `order_code` hoặc `buyer_name_snapshot`; placeholder Stitch hứa tìm tên sự kiện | Cần mở rộng hợp đồng tìm kiếm hoặc xin duyệt điều chỉnh nội dung/hành vi; không lọc cục bộ một trang rồi gọi là kết quả toàn bộ. |
| A9-05 | Schema đơn hàng: PENDING_PAYMENT/PAID/EXPIRED/CANCELLED; thanh toán: PENDING/UNKNOWN/SUCCEEDED/FAILED | Lập bảng ánh xạ riêng cho order/payment/ticket. “Đang xử lý/chờ đối soát” không tự đồng nghĩa PENDING_PAYMENT; thanh toán FAILED không chứng minh vé đã bị hủy. |
| A9-06 | API chi tiết có `items`, `event`, `payment`, `latest_payment`; API vé hiện không trả liên kết order ID trong dữ liệu đã khảo sát | Xác định quan hệ vé–order item–order trước khi nối “Xem vé & QR”; không ghép chỉ theo event ID vì một sự kiện có thể có nhiều đơn. |
| A9-07 | Code chuyển ngày `from`/`to` trực tiếp bằng `new Date(v).toISOString()`; SQL so sánh `created_at <= to` | Mốc “Đến ngày” hiện là đầu ngày UTC, có nguy cơ loại đơn trong phần còn lại của ngày. Chốt ngày lọc theo UTC+7 và biên đầu/cuối kỳ rõ ràng. |
| A9-08 | Hiện mã đơn dẫn tới `/checkout/:id`; chưa có nhóm hành động A9 hoặc trang chi tiết đơn riêng trong routing đã đọc | Giữ route thực tế; chốt cách mở chi tiết và điều kiện thanh toán lại/hủy. Không sửa màn hình checkout trong phạm vi A9. |
| A9-09 | Chưa tìm thấy route customer xuất VAT, báo cáo VAT, Cosmic Points, tổng KPI hoặc API riêng để người dùng chủ động đối soát trong `server/src/app.ts` | Đây là phụ thuộc chưa giải quyết. Không tự áp dụng quyết định “thông báo đang phát triển” của A8 sang A9; cần xác nhận cách xử lý từng chức năng. |
| A9-10 | `MyWaitQueue` đang hiển thị trong trang hiện tại nhưng không có trong artifact A9 | Cần xác nhận vị trí/giữ chức năng trước khi thay đổi; không tự xóa tính năng đang có. |
| A9-11 | `/orders` dùng shell cũ, chưa thuộc điều kiện header/footer chung | Tích hợp shell chung trong lần triển khai, tránh hai header/footer và kiểm tra route guard. |
| A9-12 | Chưa có kiểm thử browser A9 của phiên này, chỉ ảnh desktop Stitch và đọc code | Chưa kết luận responsive, tương tác, accessibility hoặc pixel fidelity của app hiện tại đạt. |

## 4. Cosmic Graffiti và các điểm của artifact cần xác nhận

- HTML tải đúng Syne, Be Vietnam Pro và Space Grotesk; dùng nền tối, gradient tím/cyan/hồng, panel bo góc và CTA phát sáng. Bảng có `scope="col"`; bộ chọn thời gian có `aria-label`.
- Palette xuất thực tế: background `#0f1222`, panel thấp `#181b2a`, surface container `#1c1f2f`, primary container `#7c3aed`, secondary `#5de6ff`, primary `#d2bbff`, tertiary `#ffafd3`, chữ `#e0e1f7`/`#ccc3d8`. Chúng khác palette mô tả chung `#080B1A`/`#10162B`/`#22D3EE`/`#F472B6`; ưu tiên tái hiện artifact, ghi ánh xạ token, không tự recolor toàn trang.
- Header/footer có brand **ENVENTHUB**, menu lặp brand và ảnh avatar xuất hiện cùng đăng nhập/đăng ký; dùng shell EventHub chung theo yêu cầu đã xác định.
- Năm 2025, số tiền, KPI, Cosmic Points, phương thức MoMo/ZaloPay/VietQR/thẻ, tỷ lệ phát hành và cam kết hỗ trợ sau 5 phút là nội dung mẫu/chưa được xác minh cho project hiện tại. Không đưa thành dữ liệu hoặc cam kết thật; cần xác nhận nội dung thay thế trước triển khai khi không đủ dữ liệu.
- HTML chỉ có script tìm kiếm trong các dòng mẫu hiện có. Chưa có bằng chứng tab, thời gian, phân trang hoặc nút nghiệp vụ hoạt động thực tế. Ảnh có nhãn bảng/nút xuống dòng; `h1` có `whitespace-nowrap`, bảng dùng overflow ngang: cần kiểm thử mobile trước khi kết luận phù hợp.

## 5. Hợp đồng API cần kiểm chứng trước triển khai

Phiên lập kế hoạch đầu chỉ kiểm tra tĩnh. Phiên bổ sung đã gọi các API đọc trên backend local và xác minh các kết quả tại mục 9. Chưa tích hợp hoặc sửa API; các thao tác tạo thanh toán/hủy đơn chỉ phân tích code, không thực hiện với dữ liệu người dùng.

| Nguồn hiện có | Đã đọc trong code | Cần xác minh thực tế |
|---|---|---|
| `GET /api/me/orders` | `protect`; scope buyer hiện tại; query `page`, `status`, `q`, `from`, `to`; trả mảng, trang 50; sort created_at DESC/id | HTTP 200/401, nội dung response, dữ liệu nhiều trang, lọc và ngày biên; tổng/KPI và trường bổ sung cho bảng |
| `GET /api/me/orders/:id` | `protect`; workflow detail kiểm tra người mua hoặc quyền quản lý sự kiện; trả order/event/items/payment/latest_payment | Owner, người không có quyền, đơn không tồn tại; nhiều payment attempt; dữ liệu hạng vé/phương thức/chi tiết lỗi |
| `POST /api/orders/:id/cancel` | `protect`; workflow cancel và các điều kiện nghiệp vụ backend | Chỉ gọi sau xác minh contract và bằng tài khoản/dữ liệu thử nghiệm được phép; không hủy đơn thật trong phiên lập kế hoạch |
| `POST /api/orders/:id/payments` | `protect`; workflow startPayment | Điều kiện cho phép bắt đầu/thanh toán lại; không gọi như một thao tác kiểm tra trạng thái chỉ đọc |
| Vé thuộc đơn, thống kê, VAT/Points/đối soát | Chưa xác nhận đủ hợp đồng cho A9 | Nếu thiếu API/dữ liệu, ghi BLOCKED cho phần phụ thuộc; không dùng API admin thay API customer hoặc hard-code |

## 6. Các bước triển khai khi được giao thực hiện

1. Đọc lại Master Plan, report này, HTML và ảnh A9; xác nhận các điểm về KPI, VAT/Points, tên trạng thái, ngày lọc, vị trí MyWaitQueue và nội dung mẫu. Giữ nguyên Stitch, không tạo bản trùng.
2. Kiểm chứng API theo mục 5, ghi method/path/quyền/query/response và status thực tế; chốt dữ liệu bảng/KPI/tổng phân trang và liên kết vé theo đơn. Phần chưa có hợp đồng dừng tích hợp và ghi rõ trở ngại.
3. Trong phạm vi A9, tái sử dụng shell chung, route guard, Axios và auth state hiện có. Ánh xạ HTML thành các khối React có kiểu dữ liệu rõ ràng và CSS có phạm vi, dùng font/asset sẵn có thay CDN/script Stitch.
4. Dựng breadcrumb, tiêu đề, KPI, toolbar, bảng sáu cột, phân trang và hỗ trợ theo nguồn thiết kế. Không tự thay đổi bố cục/màu/nội dung ngoài quyết định đã được xác nhận.
5. Nối tab/tìm kiếm/thời gian với nguồn dữ liệu toàn bộ tập phù hợp; reset trang khi đổi bộ lọc, phân biệt rỗng toàn bộ và không có kết quả. Giữ trạng thái loading/error/retry, disabled cho hành động chưa hợp lệ, xử lý thiếu metadata.
6. Nối từng hành động bằng contract đã xác minh. Kiểm tra trạng thái mới nhất và xác nhận hủy khi cần; ngăn nhấn lặp. “Kiểm tra thanh toán” chỉ đọc trạng thái, không vô tình tạo payment. Không hiển thị QR/vé thành công nếu chưa có bằng chứng phát hành.
7. Kiểm thử desktop/tablet/mobile, bàn phím/focus/screen reader cơ bản, tương phản, route và quyền, lỗi API, nhiều trang và ngày biên. Chạy build và các kiểm thử phù hợp sau khi có thay đổi source.
8. Tạo report mới cho mọi phiên chỉnh sửa và cập nhật mục A9 trong Master Plan với bằng chứng; không ghi đè report cũ.

## 7. Tiêu chí nghiệm thu

- Diện mạo nội dung A9 đối chiếu ảnh/HTML, shell chung một lần, ngoại lệ được xác nhận và ghi report.
- KPI/tổng số/nhãn năm có cơ sở và phạm vi thống kê rõ; không hard-code hoặc tính sai từ trang dữ liệu đang xem.
- Tìm mã/tên sự kiện, tab trạng thái, thời gian UTC+7 và phân trang hoạt động đúng với hợp đồng đã chốt.
- Phân biệt trạng thái order/payment/ticket; hành động hợp lệ theo trạng thái; vé/QR thuộc đúng đơn và đúng tài khoản.
- Các chức năng chưa có API được xử lý theo quyết định đã duyệt, không mô phỏng là chức năng thật.
- Loading/empty/no-results/error/retry/disabled, responsive và khả năng thao tác được kiểm chứng; build và test liên quan đạt.

## 8. Nhật ký tài liệu

| Thời điểm | Thay đổi | Báo cáo |
|---|---|---|
| 2026-10-28 10:32:58 | Tạo kế hoạch từ A9 Stitch và code hiện tại; ghi các khoảng trống dữ liệu/chức năng; cập nhật trạng thái review A9 trong Master Plan | [A9 review](../reports/stitch/A9_20261028_103258_review.md) |
| 2026-10-28 10:49:25 | Kiểm tra API đọc thật; làm rõ trạng thái, điều kiện hành động, ngày lọc, contract cần bổ sung và thứ tự công việc | [API review/plan update](../reports/stitch/A9_20261028_104925_api_review_plan_update.md) |

## 9. Kết quả kiểm tra API backend thực tế

Môi trường: `http://localhost:8000/api`, đăng nhập bằng tài khoản kiểm thử người dùng đã cung cấp và tài khoản demo hiện có. Không ghi credential/token/QR hoặc định danh đơn vào tài liệu. Số bản ghi dưới đây là dữ liệu tại thời điểm kiểm tra, không phải số liệu sẽ đưa vào UI.

| Kiểm tra | Kết quả thực tế | Kết luận cho kế hoạch |
|---|---|---|
| GET `/health`; POST `/auth/login` | 200; hai tài khoản đăng nhập 200 | Backend và cơ chế xác thực hoạt động |
| GET `/me/orders` chưa đăng nhập | 401 | Giữ guard/auth và luồng đăng nhập |
| GET `/me/orders` tài khoản được chỉ định | 200; `{success,data}` với `data` là mảng 8 đơn: 3 PAID, 5 EXPIRED | API hiện tại hoạt động nhưng không trả total/KPI/items/payment/tickets trong danh sách |
| GET `/me/orders?page=1` | 200, mảng rỗng | Page bắt đầu từ 0, backend cố định 50 bản ghi; chưa có bộ dữ liệu >50 để nghiệm thu nhiều trang |
| GET `/me/orders?q=<mã đơn có thật>` | 200, 1 đơn | Tìm theo mã dùng được |
| GET `/me/orders?q=<tên sự kiện của đơn đó>` | 200, 0 đơn | Chênh lệch tìm tên sự kiện đã xác nhận runtime, phải bổ sung backend hoặc xin duyệt thay đổi yêu cầu |
| GET `/me/orders?q=<tên người mua>` | 200, 8 đơn | Khớp SQL đang tìm buyer_name_snapshot, không khớp lời hứa tìm tên sự kiện |
| GET `/me/orders?status=PAID` | 200, 3 đơn | Đây là trạng thái order |
| GET `/me/orders?status=FAILED` | 200, 0 đơn | Không báo validation lỗi nhưng FAILED không phải trạng thái order trong schema; không dùng trực tiếp nhãn tab làm status query |
| GET `/me/orders?from=not-a-date` | 400, VALIDATION | Cần thông báo lỗi ngày và kiểm tra from ≤ to phía UI/API |
| GET `/me/orders/:id` đơn PAID của chủ sở hữu | 200; có event/items/latest_payment; `payment` không xuất hiện khi không có active attempt | Trường optional có thể bị bỏ khỏi JSON, không mặc định luôn có/null. Latest payment mẫu SUCCEEDED, provider vnpay_sandbox và trùng paid_payment_id |
| GET chi tiết cùng đơn bằng tài khoản customer khác | 403, FORBIDDEN | UI xử lý lỗi không có quyền, không render dữ liệu cũ; không mặc định mọi lỗi quyền là 404 |
| GET chi tiết UUID không tồn tại | 404, NOT_FOUND | UI phân biệt lỗi tài nguyên không tồn tại |
| Bộ lọc cùng ngày với `to=00:00Z` so với `to=23:59:59.999Z` | Đơn mẫu bị loại ở đầu ngày, xuất hiện khi nới đến cuối ngày UTC | Chứng minh rủi ro biên ngày; cần thiết kế UTC+7, không dùng mốc đầu ngày làm mốc kết thúc |
| GET `/me/orders` tài khoản demo | 200; 9 đơn: 4 CANCELLED, 5 EXPIRED | Có dữ liệu đọc để kiểm thử các nhóm kết thúc; chưa có PENDING/UNKNOWN/FAILED trong các mẫu đã kiểm tra |
| GET `/me/tickets` | 200; có id/event_id/status/check-in/event, không có order_id/order_item_id trong DTO danh sách | Không thể xác định vé thuộc đơn chỉ bằng contract vé hiện tại |

Các endpoint mutation chỉ xác minh tĩnh: `POST /orders/:id/cancel` và `POST /orders/:id/payments`. Không gọi IPN/return/demo để tạo kết quả thanh toán trong phiên này.

## 10. Ánh xạ trạng thái và điều kiện hành động đã làm rõ

### 10.1. Tách ba lớp trạng thái

| Dữ kiện | Nhãn/hành vi có căn cứ | Điều không được suy diễn |
|---|---|---|
| order PAID | Đơn đã thanh toán; dùng paid_payment_id làm tham chiếu giao dịch xác nhận đơn | Latest payment luôn là giao dịch xác nhận; mọi vé còn hợp lệ; không còn khoản cần tra soát |
| order PENDING_PAYMENT, không active payment | Đơn chờ thanh toán | Đã trừ tiền hoặc đang đối soát |
| active payment PENDING/UNKNOWN | Thanh toán đang chờ xác nhận/chưa rõ kết quả | Thanh toán thất bại hoặc được phép hủy ngay |
| payment requires_review và review_resolved_at chưa có | Cần tra soát; có thể tồn tại kể cả payment SUCCEEDED và order chưa PAID | Chỉ lọc UNKNOWN là đủ phát hiện mọi giao dịch cần tra soát |
| latest payment FAILED, order vẫn PENDING_PAYMENT | Attempt gần nhất thất bại; xét lại khả năng thanh toán với điều kiện backend | Toàn bộ đơn đã bị hủy hoặc được phép retry vô điều kiện |
| order EXPIRED/CANCELLED | Đơn hết hạn/đã hủy | Vé đã từng được phát hành; mọi khoản tiền được hoàn; backend cho thanh toán lại đơn này |
| total_amount = 0 | Đơn giá trị 0 | Đã PAID/đã phát hành miễn phí khi chưa có bằng chứng |
| tickets VALID/CHECKED_IN/VOID | Hiển thị tổng số từng trạng thái, trạng thái hỗn hợp nếu cần | PAID tương đương mọi vé VALID, hoặc không có vé tương đương đã hủy vé |

`payments.latest` chọn created_at DESC, id DESC; `payments.active` chọn PENDING/UNKNOWN. Detail hiện có hai nguồn này nhưng chưa trả riêng giao dịch theo `paid_payment_id`, toàn bộ lịch sử attempt hoặc tổng hợp unresolved review. Vì vậy cần bổ sung DTO để UI không chọn sai nguồn.

### 10.2. Ma trận hành động

| Hành động | Hợp đồng hiện tại và bổ sung cần thiết |
|---|---|
| Xem chi tiết | GET detail hiện dùng được. Đề xuất mở panel chi tiết trong A9 từ API đó; phương án giao diện cần xác nhận vì Stitch chưa có panel tham chiếu. Không bắt buộc thêm route chi tiết mới hoặc sửa A6. |
| Kiểm tra thanh toán | GET detail chỉ đọc DB; worker `booking.reconcile()` mới gọi provider. Dùng refresh dữ liệu và ghi nhận thời điểm cập nhật, không gọi POST tạo payment hoặc giả vờ đã tra soát trực tiếp ngân hàng. Nếu cần manual reconcile thật thì phải có use case/API mới, quyền và giới hạn tần suất riêng. |
| Hủy đơn | Code chỉ chấp nhận order PENDING_PAYMENT và không có active PENDING/UNKNOWN; có payment active trả PAYMENT_IN_PROGRESS, đơn đóng trả ORDER_CLOSED. Backend kiểm tra chủ sở hữu trong transaction; UI phải lấy trạng thái mới nhất, xác nhận hủy, chặn nhấn lặp và refresh sau phản hồi. Các nhánh mutation này chưa kiểm thử runtime trong phiên. |
| Thanh toán/Thanh toán lại | Backend yêu cầu provider hoạt động, event PUBLISHED và không dừng bán, order PENDING_PAYMENT chưa quá expires_at, inventory/reservations còn HELD. Active attempt cùng provider được tái sử dụng; khác provider bị chặn. Không cho retry EXPIRED/CANCELLED/PAID. Lỗi/điều kiện cuối cùng luôn do backend quyết định. |
| Xem vé & QR | Cần lấy danh sách vé theo đúng order/order item với kiểm tra ownership; mở route `/tickets/:id` nếu một vé hoặc danh sách vé thuộc đơn nếu nhiều vé. Trạng thái vé phải lấy thật, không gộp mọi vé cùng event. |
| Chi tiết lỗi | Có failure_code, review_reason và close_reason trong các nguồn đã đọc; chỉ trình thông điệp đã ánh xạ cho khách hàng, fallback rõ ràng, không dump toàn bộ object payment. |
| VAT/Points/báo cáo VAT | Chưa có API customer/use case tương ứng trong code đã kiểm tra. Đề xuất giữ nút với thông báo đang phát triển hoặc bỏ/ẩn phần chưa hỗ trợ; **chưa được người dùng duyệt**, chưa đưa thành quyết định triển khai. |
| Liên hệ hỗ trợ | Có thể dùng tel/mailto hiện hữu sau khi xác nhận nội dung liên hệ; không đồng nghĩa có ticket tra soát backend hoặc SLA xử lý năm phút. |

Không ghi nhãn MoMo/ZaloPay/Visa chỉ từ provider `vnpay_sandbox`; field provider cho biết cổng, chưa có field phương thức ngân hàng/ví cụ thể trong DTO đã xác minh.

## 11. Contract cần bổ sung — đề xuất, chưa tồn tại

### 11.1. Nguồn danh sách tổng hợp cho A9

Đề xuất **GET `/api/me/order-history`** riêng để giữ nguyên contract mảng của `/api/me/orders` cho các caller hiện có. Đây là phương án thiết kế API, không phải endpoint đã tạo hoặc đã gọi. Tên/path cuối cùng có thể thay đổi khi thống nhất triển khai.

- Scope cố định theo principal.userId; không nhận buyerId tùy ý từ browser.
- Query dự kiến: `page` zero-based, `pageSize` có giới hạn (ví dụ 5/10/20/50), `q`, `group`, `from`, `toExclusive`; sort ổn định created_at DESC/id.
- Search hỗ trợ order_code và event_title_snapshot trên toàn tập. Quyết định giữ tìm buyer name là lựa chọn bổ sung, không thay thế tìm tên sự kiện.
- `group` là nhóm nghiệp vụ có định nghĩa riêng, không truyền FAILED vào trường order status. Cần backend tổng hợp payment review để phân biệt chờ thanh toán, đang xác nhận và cần tra soát.
- Response dự kiến: `items`, `pagination:{page,pageSize,total,totalPages}`, `summary`, `counts`, `asOf`, `capabilities`. Không thay mảng hiện tại thành object trên endpoint cũ.
- Mỗi item cần tối thiểu: id/orderCode/createdAt/orderStatus/currency/totalAmount, event title, danh sách hạng vé và số lượng, payment summary, ticket summary, các quyền hành động tính từ nghiệp vụ (`canCancel`, `canStartPayment`, `canViewTickets`). Không gửi QR/token của mọi vé trong response bảng.
- Payment summary cần tách `paidPayment`, `activePayment`, `latestPayment`, `unresolvedReview`; chỉ whitelist trường hiển thị, không gửi SQL row chứa metadata nội bộ hoặc credential.
- Ticket summary: expected/issued/valid/checkedIn/void counts; trạng thái hỗn hợp và dữ liệu thiếu phải biểu diễn được.
- Dữ liệu Order/OrderItems/Tickets được tổng hợp trong owner Order; Payment qua public batch interface của Payment; workflow phối hợp. Không join trực tiếp bảng Payment từ Order và không gọi chi tiết từng dòng theo N+1. Nếu cần read model riêng, phải chốt owner/cách đồng bộ riêng trước khi làm, không mặc định thêm bảng/migration.

### 11.2. Vé theo đơn và chi tiết

Đề xuất **GET `/api/me/orders/:id/tickets`** (chưa tồn tại) hoặc mở rộng detail bằng danh sách `tickets` tối thiểu có id/orderItemId/typeName/status/checkedInAt. Thực hiện ownership trước trả dữ liệu. Một đơn nhiều hạng/nhiều vé hoặc nhiều đơn cùng event phải ánh xạ chính xác. QR chỉ tải từ endpoint chi tiết từng vé khi cần.

Detail dự kiến bổ sung `paidPayment`, `unresolvedReview`, `actions` và optional lịch sử attempt dạng an toàn; client xử lý trường thiếu/null. Nếu yêu cầu chỉ lịch sử đơn kèm trạng thái thanh toán thì không mặc định mở rộng thành sổ toàn bộ giao dịch; phạm vi timeline cần xác nhận.

### 11.3. Tổng hợp, ngày lọc và phạm vi thống kê

- Phương án đề xuất: kỳ thống kê theo **created_at của đơn**, UTC+7, KPI độc lập search/tab; cần ghi rõ đây là “chi tiêu của các đơn tạo trong kỳ”, không gọi là sổ thu tiền theo ngày giao dịch. Nếu yêu cầu theo paid_at phải đổi định nghĩa có chủ đích.
- Tổng chi tiêu = SUM total_amount của order PAID trong kỳ, không cộng tất cả attempt SUCCEEDED vì có thể có thanh toán trùng/đến muộn cần tra soát; không tự trừ hoàn tiền vì chưa có nghiệp vụ refund được xác minh. Giữ amount dạng chuỗi số nguyên/decimal từ backend, không cộng tiền bằng số thực ở frontend.
- Facet counts: cùng kỳ và q nhưng bỏ group đang chọn; total/pagination: cùng kỳ, q và group đang chọn. Chiều thống kê này là đề xuất cần chốt trước test để KPI/tab không thay đổi khó hiểu.
- Khoảng ngày khuyến nghị half-open `[from,toExclusive)`: ngày D từ `D 00:00:00+07:00` đến đầu ngày D+1. Ví dụ ngày 28/10/2026 tương ứng `2026-10-27T17:00:00Z` đến `<2026-10-28T17:00:00Z`.
- API hiện có dùng `<= to`; nếu dùng tạm phải gửi mốc cuối ngày UTC+7 phù hợp và ghi giới hạn độ chính xác. Phương án chính là bổ sung toExclusive, không âm thầm đổi ý nghĩa tham số cũ.
- Năm/tháng hiển thị lấy theo lựa chọn và lịch Việt Nam hiện tại, không cố định 2025; “3 tháng gần nhất” cần chốt là rolling period hay ba tháng lịch. Kiểm tra from ≤ to, pageSize/page/status hợp lệ.

## 12. Các bước còn thiếu và thứ tự thực hiện

| Ưu tiên | Công việc bổ sung | Điều kiện hoàn thành |
|---|---|---|
| P0 | Chốt nhóm trạng thái, phạm vi KPI/ngày, VAT/Points, panel chi tiết, MyWaitQueue và nội dung hỗ trợ | Ghi quyết định người dùng; không coi các đề xuất trong plan là đã được duyệt |
| P0 | Thiết kế nguồn history tổng hợp và mapping vé–đơn theo mục 11; giữ backward compatibility | Contract, ownership và batch strategy rõ; triển khai API chỉ ở phiên được giao code |
| P0 | Xác minh dữ liệu read API mới và capabilities, errors | API thật trả đủ trường và quyền đúng; phần phụ thuộc còn thiếu phải ghi BLOCKED trước nối UI |
| P1 | Triển khai A9 với shell chung, bảng/KPI/filter/pagination/actions theo contract | Không tính tổng từ một trang hoặc suy trạng thái QR; không sửa A6 |
| P1 | Refresh khi pending/review, quản lý trạng thái request | Poll có giới hạn khi cần; dừng khi tab ẩn/unmount/đổi phiên, hủy request cũ, backoff khi lỗi; refresh không tạo payment; không tuyên bố realtime ngân hàng |
| P1 | Giữ MyWaitQueue có chức năng thật | Component hiện poll 30 giây, có thao tác rời hàng chờ; vị trí thu gọn/dời cần xác nhận, không xóa tính năng do không có trên ảnh |
| P1 | Mở rộng bộ kiểm thử trước nghiệm thu | Đủ các tình huống ở mục 13; không dùng đơn của người dùng cho mutation thử nghiệm nếu chưa được phép |

## 13. Bộ tình huống nghiệm thu bổ sung

1. Hơn 50 đơn, nhiều trang, page rỗng cuối, q theo tên sự kiện/mã, đổi tab reset page; count/KPI không chỉ đếm trang hiện tại; phát sinh thay đổi dữ liệu giữa hai lần tải có cách refresh rõ ràng.
2. Cùng ngày đầu/cuối kỳ theo UTC+7, giao năm/tháng, giá trị ngày không hợp lệ, from > to; không lọc bằng đồng hồ UTC của máy khách một cách vô ý.
3. PENDING_PAYMENT chưa có attempt, active PENDING/UNKNOWN, FAILED còn được retry, PAID nhưng latest attempt khác paidPayment, SUCCEEDED cần review, EXPIRED/CANCELLED, order 0 đồng.
4. Một đơn nhiều hạng/nhiều vé; cùng event có nhiều đơn; vé chưa phát hành, phát hành một phần, hỗn hợp VALID/CHECKED_IN/VOID; không cho truy cập vé/đơn của khách hàng khác.
5. Xung đột lúc hủy/khởi tạo payment, nhấn lặp, timeout, provider đổi/không hoạt động, event dừng bán, reservation hết hạn; server error được hiển thị và dữ liệu được tải lại, không biến timeout thành thất bại thanh toán.
6. API lỗi/401/403/404/400; trường optional bị thiếu; reset dữ liệu nhạy cảm khi đổi tài khoản; không hiển thị response cũ cho đơn khác.
7. Desktop/tablet/mobile, keyboard/focus, bảng scope/label, menu hành động, loading/empty/no-results/retry; giữ shell một lần; contrast và screen reader cơ bản.

Các trường hợp payment pending/unknown/failed, mutation và >50 đơn chưa có bằng chứng runtime của phiên kiểm tra hiện tại. Chúng là điều kiện nghiệm thu cho lần triển khai, không được đánh dấu đã đạt.

## 14. Quyết định và kết quả triển khai ngày 2026-10-28

Người dùng đã duyệt cả ba câu hỏi trong phiên triển khai:

1. Giữ nút VAT với thông báo **“Chức năng đang trong quá trình phát triển”**; bỏ số Points mẫu và cam kết hỗ trợ năm phút; dùng dữ liệu/trạng thái thật.
2. Chi tiết đơn và danh sách vé trong hộp thoại; MyWaitQueue thu gọn dưới bảng; bảng cuộn ngang trên mobile.
3. Triển khai API tổng hợp; KPI theo created_at UTC+7 độc lập q/tab; tổng tiền cộng đơn PAID; ba tháng gần nhất gồm tháng hiện tại và hai tháng trước.

### Contract thực tế đã triển khai

- `GET /api/me/order-history`: page zero-based, pageSize 1–50 (UI dùng 5), q theo mã/tên sự kiện, group all/paid/processing/closed, from inclusive và toExclusive. Trả items/pagination/summary/counts/asOf/capabilities. Giữ nguyên `/api/me/orders` trả mảng để tương thích.
- `GET /api/me/order-history/:id`: chi tiết an toàn, items/payment summary/ticket summary và ticketList thuộc đúng đơn, chỉ buyer được phép. Đây là lựa chọn thay cho đề xuất endpoint `/me/orders/:id/tickets`; endpoint đề xuất đó **không được tạo**.
- Payment summary tách paid/active/latest/unresolvedReview. Nhóm processing ưu tiên unresolved review; còn lại PAID vào paid; PENDING_PAYMENT hoặc active PENDING/UNKNOWN vào processing; các đơn còn lại vào closed. Tổng chi tiêu vẫn tính mọi order PAID đúng một lần, kể cả khi có giao dịch bổ sung cần tra soát; ghi rõ nhãn để không đồng nhất KPI đếm nhóm với số giao dịch thành công.
- `canContinueCheckout` chỉ cho mở checkout khi PENDING_PAYMENT chưa hết hạn và không có review chưa giải quyết; không gọi nó là quyền thanh toán chắc chắn. Event/reservation/provider do checkout và command backend kiểm tra cuối cùng. A9 không tự tạo payment khi refresh.
- Hủy dùng POST hiện có, xác nhận trong hộp thoại; server kiểm tra lại transaction. Thanh toán tiếp dẫn tới `/checkout/:id`, không sửa A6.
- Order owner đọc orders/items/tickets/checkins; Payment owner đọc payment whitelist qua batch 500 ID; workflow kết hợp. Không join chéo owner, không thêm migration, không trả QR/token trong history. API tổng hợp hiện đọc metadata của các đơn trong kỳ và payment attempts về server; cần đo/tối ưu với tài khoản có lịch sử rất lớn, chưa có benchmark tải lớn.

### Kết quả và bằng chứng

- Frontend tái hiện breadcrumb/heading, bốn KPI, tab, tìm kiếm, thời gian, bảng sáu cột, phân trang, hỗ trợ; dùng shared AuthHeader/AuthFooter. Điều chỉnh wrap header chỉ scope A9 tại 901–1200px để không tràn ngang.
- Loading/empty/no-results/error/retry, notice VAT, hộp thoại Radix và vé theo đơn đã nối API thật. Poll 30 giây khi còn processing, dừng request khi unmount/đổi phiên, không gọi lúc tab ẩn; lỗi backoff tối đa ba lần.
- Server/client build, lint A9 và boundary check đạt. Hai unit tests, một PostgreSQL integration và hai ownership tests đạt 5/5. Integration dùng database riêng với 63 đơn, biên UTC+7, buyer isolation, hủy, failed/retry, duplicate/late success và không phát hành trùng vé.
- Browser live đạt tại 1440/1024/768/390, phân trang/tìm theo tên sự kiện/KPI độc lập/no-results/error-retry/VAT/hộp thoại và Escape. QR không chép vào tài liệu; ảnh bảng che mã đơn.
- Chưa nghiệm thu VNPay ngân hàng end-to-end, toàn bộ nhánh timeout/race/event ngừng bán, mutation qua browser, screen reader/contrast audit đầy đủ hoặc tải lớn. Schema hiện cấm total_amount=0 nên không hiển thị “vé miễn phí” suy diễn từ mẫu; chưa mở rộng nghiệp vụ vé miễn phí.

[Báo cáo hoàn tất/xác minh mới nhất](../reports/stitch/A9_20261028_134852_completion.md); [báo cáo chuẩn bị triển khai](../reports/stitch/A9_20261028_105834_implementation.md). Phiên tiếp tục đã chạy lại build server/client, lint A9, boundary và 5 backend tests đều đạt; browser live 1/1 đạt trong 18.2 giây. Các mục “chưa tồn tại/chưa kiểm thử” ở phần khảo sát phía trên phải đọc cùng cập nhật này; không dùng chúng thay trạng thái hiện hành.
