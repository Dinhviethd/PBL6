# B7 — kiểm tra lại API, tính khả thi và cập nhật phạm vi hiển thị

- Thời điểm: **2026-10-31 14:12:22 UTC+7**, Asia/Ho_Chi_Minh; loại: API review và bổ sung kế hoạch, chỉ tài liệu.
- Màn hình: **B7 — Chi tiết đơn hàng**, project Stitch `10374042969343935993`, screen `0e7d1d0aa45f47e7be30f44864b09272`.
- Nguồn thiết kế phiên trước: DESKTOP 2560×3364, HTML `12761929990177829747`, ảnh `3010392199641701271`, đã xem qua MCP trong [report trước](B7_20261031_132532_review_plan.md). Phiên này không gọi Stitch, không tuyên bố xác minh lại artifact mới.
- Kế hoạch cập nhật: [Feature_B7_OrderDetails.md](../../ui/Feature_B7_OrderDetails.md).

## 1. Yêu cầu, ban đầu và tiêu chí

Đọc lại Master Plan trước khi làm việc. B7 đã có kế hoạch nhưng chưa có page/route detail, API detail chưa có; review KHÔNG ĐẠT. Người dùng yêu cầu kiểm tra lại API, liệt kê chức năng UI chưa hỗ trợ, đánh giá khả thi bổ sung; xác nhận KYC/rủi ro/QR động/audit/POS chỉ để hiển thị và nhấn báo “Chức năng đang được phát triển”.

Tiêu chí phiên: phân biệt route có trong source với HTTP thực tế và dữ liệu có quyền; đánh giá khả thi dựa cấu trúc code; cập nhật xác nhận mới, bỏ blocker API cho năm nhóm UI-only; giữ dữ liệu đơn/thanh toán/vé thật và ownership; tạo report mới, cập nhật nhật ký kế hoạch và đúng B7 trong Master Plan. Không sửa source hoặc thiết kế.

## 2. Thao tác thực tế

- Đọc lại kế hoạch/Master Plan, app routes, order public/store, payment store, audit public/store, auth phone, Axios client và Vite config. Không đọc secret `.env`.
- Xác nhận chỉ có list/preview Organizer, chưa có route detail tổng hợp. `managerPayments` không chọn `provider_transaction_id` dù store thanh toán có ghi trường này. Preview chỉ trả metadata vé/QR giới hạn, không có giá vé/checkedInAt; order INSERT chỉ snapshot name/email, không có phone snapshot.
- Audit có public `append` và bảng ghi log, chưa có GET đọc audit B7 theo đơn. API check-in hiện hữu không đồng nghĩa POS sync hay chống chụp QR đã được triển khai.
- Dùng Python urllib gọi tám GET read-only không token/cookie tới localhost 8000 và 8011, timeout 5 giây/request. Không đăng nhập, không seed, không gọi thanh toán/check-in/mutation hoặc restart dịch vụ.
- Bổ sung mục 5.1–5.3 kế hoạch: bằng chứng HTTP, quy tắc UI-only và 15 nhóm chức năng với đánh giá khả thi/phạm vi. Cập nhật các dòng cũ về G05–G07, contract, bước triển khai và nghiệm thu để tránh yêu cầu xin lại xác nhận cho UI-only. Thêm nhật ký vào chính kế hoạch.
- Tạo report này, không ghi đè report cũ; cập nhật riêng hai dòng B7 ở Master Plan 5.2/5.4.

## 3. Bằng chứng API runtime

Event ID thử: `00000000-0000-4000-8000-000000000001`; order ID thử: `00000000-0000-4000-8000-000000000002`. Không giả định hai UUID này là dữ liệu tồn tại.

| Base URL | Method/path sau `/api` | Kết quả |
|---|---|---|
| http://localhost:8000 | GET `/health` | HTTP 200 |
| http://localhost:8000 | GET `/organizer/events/{eventId}/order-manager` | HTTP 401 |
| http://localhost:8000 | GET `/organizer/events/{eventId}/orders/{orderId}/tickets` | HTTP 401 |
| http://localhost:8000 | GET `/organizer/events/{eventId}/orders/{orderId}` | HTTP 404 |
| http://localhost:8011 | Cùng bốn GET trên | Cả bốn không kết nối được, urllib `URLError` |

401 kết hợp source xác nhận hai route B6 có bảo vệ, không chứng minh dữ liệu trả 200 hoặc phân quyền event hoạt động đúng. Detail chưa có trong source và request thử trả 404; không dùng 404 này để kết luận order tồn tại/không tồn tại. Chưa gọi GET event metadata trong lượt HTTP này. Không có response dữ liệu người mua/QR được đọc hoặc lưu.

Giới hạn: chưa xác minh authenticated Organizer/ADMIN, cross-tenant, dữ liệu DB, đơn từng trạng thái hoặc QR scanner. Cổng 8011 không truy cập được không ngăn hoàn thành tài liệu vì đã có source và API8000; không khẳng định API8011 vận hành.

## 4. Kết quả và khả thi

GET detail Organizer là bổ sung **khả thi cao, độ phức tạp vừa**, có thể tập hợp order/items/payment/event qua public interface và ownership hiện có; cần snapshot/no-store và kiểm tra order thuộc event. Mã giao dịch có nguồn trong payment nhưng thiếu projection/DTO; có thể bổ sung nhỏ/vừa. Phone snapshot cần migration nếu muốn lịch sử đúng; có thể giữ null cho đơn cũ. Preview/in vé có thể tái sử dụng, metadata chi tiết vẫn phải xem được khi đơn chưa PAID hoặc có tra soát. Bank account/reference phải có nguồn và được giới hạn quyền. Chưa có API hóa đơn; in vé trình duyệt không chứng minh hóa đơn tài chính thật.

KYC/risk/QR động/audit/POS thật có độ phức tạp từ vừa đến lớn và nhiều phụ thuộc; **không yêu cầu thêm API cho các nhóm này trong phạm vi B7 hiện tại** theo xác nhận mới. Ma trận chi tiết, bằng chứng từng nhóm và thứ tự ưu tiên nằm tại mục 5.3 kế hoạch; không ước lượng ngày công thiếu căn cứ.

Giữ card/giao diện năm nhóm, bổ sung nhãn “Đang phát triển”/“Dữ liệu minh họa”; thao tác bằng chuột/bàn phím hiện toast chính xác **“Chức năng đang được phát triển”**, không gửi API nghiệp vụ hoặc báo thành công. Nút Tải lại QR của phần QR động chỉ toast; QR vé cơ bản vẫn từ preview thật và không bị thay bằng hình mẫu để check-in. Không giả timeline minh họa là hoạt động thật của đơn.

Đây là xác nhận cho hành vi hiển thị khi triển khai sau, **chưa triển khai toast/source** và không thay đổi artifact Stitch.

## 5. Checklist và trạng thái cuối

| Tiêu chí | Kết quả | Căn cứ/giới hạn |
|---|---|---|
| Nội dung/phạm vi | PASS (tài liệu) | Có ma trận thiếu API, tính khả thi và quyết định UI-only rõ ràng |
| Bố cục/ảnh | NOT_VERIFIED (phiên này) | Dùng kết quả xem ảnh phiên trước, không mở lại Stitch |
| Cosmic Graffiti | NOT_VERIFIED (phiên này) | Giữ tham chiếu/token trước, không thay theme |
| Ngôn ngữ/đọc | PARTIAL | Định nghĩa toast/nhãn; chưa có runtime/contrast |
| Điều hướng/nghiệp vụ | FAIL (triển khai) | Chưa có trang/cột Chi tiết và API detail |
| Trạng thái UI | PARTIAL (kế hoạch) | Có đặc tả toast/loading/error; chưa thực thi |
| Responsive/a11y | NOT_VERIFIED | Chưa chạy browser/bàn phím |
| Nhất quán | PARTIAL | Giữ sidebar/TSX+CSS; chưa có page B7 |

Tổng thể **KHÔNG ĐẠT** cho B7 đã triển khai; phần tài liệu đã bổ sung. Thiết kế cuối giữ trạng thái **ĐÃ TẠO**, artifact không sửa. Blocker tích hợp lõi còn API detail; năm nhóm UI-only không còn là blocker API. Các sai lệch tài chính/provider từ report đầu vẫn cần xử lý bằng dữ liệu thật.

Đã giải quyết: xác nhận phạm vi hiển thị; bổ sung bằng chứng runtime không token, phân biệt audit logging với read API, QR cơ bản với QR động; danh sách gap và phương án bổ sung. Chưa giải quyết: source/detail authenticated, dữ liệu thật, test UI và API đầy đủ, invoice/phone lịch sử nếu muốn mở rộng.

Master Plan: cập nhật trạng thái triển khai B7 ở 5.2; 5.4 ghi kết quả, HTTP mới, UI-only được duyệt, vấn đề còn lại, link report/kế hoạch và thời điểm. Giữ link report cũ; không nâng kết quả API integration ở mục 4/6.F vì chưa có tích hợp.

Kiểm tra cuối: đối chiếu Git diff, link report/kế hoạch và các thay đổi chỉ trong tài liệu B7 + hai dòng B7 Master Plan; không chạy build/test source cho phiên Markdown. Các thay đổi source/B6 đã tồn tại trước phiên được giữ nguyên.
