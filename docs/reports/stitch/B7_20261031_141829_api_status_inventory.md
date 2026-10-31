# B7 — danh mục trạng thái API cần sử dụng và bổ sung

- Màn hình: **B7 — Chi tiết đơn hàng**; project EventHub `10374042969343935993`.
- Screen tham chiếu: `0e7d1d0aa45f47e7be30f44864b09272`; DESKTOP 2560×3364; HTML `12761929990177829747`, ảnh `3010392199641701271` đã xem phiên đầu. Phiên này không mở lại hoặc sửa Stitch.
- Thời điểm: **2026-10-31 14:18:29 UTC+7**, Asia/Ho_Chi_Minh; hành động: bổ sung danh mục API trong tài liệu.
- Kế hoạch: [Feature_B7_OrderDetails.md](../../ui/Feature_B7_OrderDetails.md), mục **5.4–5.5** và nhật ký mục 8.
- Bằng chứng HTTP kế thừa: [phiên API 14:12](B7_20261031_141222_api_feasibility_plan_update.md), không gọi HTTP mới trong phiên này.

## Yêu cầu, ban đầu và thao tác

Đọc Master Plan trước: B7 có thiết kế nhưng chưa triển khai page/route/detail API; KHÔNG ĐẠT. KYC/risk/QR động/audit/POS được duyệt chỉ hiển thị và toast. Người dùng yêu cầu liệt kê rõ trạng thái hoạt động của API hiện tại cần sử dụng và API cần bổ sung.

Đã đọc lại kế hoạch, dòng B7 Master Plan, source GET event metadata/protect/events.guard; dùng source auth/client và bằng chứng HTTP phiên trước để tách mức xác minh. Tiêu chí: tên method/path đúng nguồn, mục đích và mức cần thiết rõ; phân biệt CÓ SOURCE/HTTP401/chưa thử/CHƯA CÓ; API mới tách phần mở rộng DTO, có ưu tiên và điều kiện nghiệm thu. Không giả lập 200 nghiệp vụ hoặc suy 401 thành dữ liệu hoạt động.

Đã bổ sung hai bảng ở kế hoạch, cập nhật ngày/link report và nhật ký. Tạo report mới này; cập nhật riêng hai dòng B7 trong Master Plan. Không sửa frontend/backend, không đọc `.env`, không tạo API, không thay artifact.

## Danh mục và kết quả

| API hiện tại (HTTP thêm `/api`) | Trạng thái có bằng chứng | Mục đích |
|---|---|---|
| GET `/health` | localhost8000 HTTP200, phiên trước | Dịch vụ phản hồi |
| GET `/auth/me` | CÓ SOURCE, chưa xác minh runtime lượt B7 | Shell/Guard/danh tính đăng nhập |
| POST `/auth/refresh-token` | CÓ SOURCE, chưa xác minh runtime lượt B7 | Axios session refresh sẵn có |
| GET `/organizer/events/:id` | CÓ SOURCE, chưa gọi HTTP lượt B7 | Event metadata nếu detail không cung cấp đủ |
| GET `/organizer/events/:eventId/order-manager` | localhost8000 HTTP401 không token, phiên trước | B6/link/quay lại danh sách |
| GET `/organizer/events/:eventId/orders/:orderId/tickets` | localhost8000 HTTP401 không token, phiên trước | QR vé cơ bản và in vé theo quyền |

Auth/metadata không được tuyên bố đã có HTTP200 trong phiên này. GET list legacy và detail buyer-only không dùng thay B7. Cổng8011 không kết nối được ở bốn GET đã thử phiên trước, không phải đã kiểm tra mọi API. Chưa có token để xác minh data/ownership/ADMIN; không mở rộng bằng chứng runtime.

**API bắt buộc bổ sung:** GET `/organizer/events/:id/orders/:orderId`, source chưa có, thử không token bằng UUID mẫu phiên trước trả404. Detail tổng hợp dữ liệu lõi qua public modules, không quét danh sách để giả detail; phải tồn tại và được kiểm chứng authenticated trước tích hợp. Đây là P0.

**Mở rộng dữ liệu:** payment provider reference và ticket/item/check-in metadata cho response detail là P0; ngân hàng/TraceID P1 nếu có nguồn được phép xem; phone snapshot tùy chọn cần migration/capture khi tạo đơn mới nếu thực hiện. Không bắt buộc tạo endpoint mới cho mỗi card. In vé dùng preview + browser print. API hóa đơn/unified search không thuộc tối thiểu. Năm nhóm UI-only không cần API thật, nhấn báo “Chức năng đang được phát triển”.

## Review và giới hạn

| Tiêu chí | Kết quả |
|---|---|
| Đầy đủ nội dung yêu cầu danh mục | PASS cho tài liệu: hai bảng, mục đích, trạng thái, ưu tiên, điều kiện |
| Bố cục/thiết kế/Cosmic Graffiti | NOT_VERIFIED lại; giữ review cũ, không sửa thiết kế |
| Ngôn ngữ và khả năng đọc | PARTIAL: bảng rõ trạng thái; chưa có UI chạy |
| Điều hướng/nghiệp vụ B7 | FAIL: chưa có page/route/detail endpoint |
| Loading/error/disabled/toast | PARTIAL: đã đặc tả, chưa triển khai |
| Responsive/a11y | NOT_VERIFIED |
| Nhất quán | PARTIAL: giữ quyết định sidebar/TSX+CSS/UI-only, chưa có triển khai |

Kết quả tổng thể B7 **KHÔNG ĐẠT**, không thay vì chỉ thêm danh mục. Thiết kế cuối **ĐÃ TẠO, giữ nguyên**. Đã giải quyết sự thiếu rõ ràng về API cần dùng/cần bổ sung ở mức tài liệu. Tồn đọng: API detail, code B7/cột Chi tiết, authenticated HTTP/tenant checks, tiền/provider và UI runtime/responsive/a11y.

Master Plan 5.2: ghi kế hoạch có danh mục trạng thái API. Bảng5.4: link report mới, thời điểm, giữ kết quả và giới hạn HTTP; giữ các report cũ. Không nâng trạng thái tích hợp mục4/6.F. Thay đổi được ghi lại ở nhật ký kế hoạch.

Kiểm tra cuối bằng Git diff/readback và kiểm tra whitespace/link tài liệu; không chạy build/test hoặc sửa API vì chỉ cập nhật Markdown. Giữ nguyên thay đổi source/B6 có sẵn, không ghi đè report trước.
