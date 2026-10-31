# B7 — kế hoạch bổ sung liên hệ, timeline thời gian và thụ hưởng

- Thời điểm: **2026-10-31 14:50:03 UTC+7**, Asia/Ho_Chi_Minh; loại: lập kế hoạch, chỉ tài liệu.
- Màn hình: **B7 — Chi tiết đơn hàng**, project `10374042969343935993`, screen `0e7d1d0aa45f47e7be30f44864b09272`.
- Tham chiếu thiết kế từ phiên trước: DESKTOP2560×3364, HTML12761929990177829747, ảnh3010392199641701271; không gọi Stitch/mở lại/chỉnh artifact phiên này.
- [Kế hoạch bổ sung mục9](../../ui/Feature_B7_OrderDetails.md); [triển khai trước](B7_20261031_143306_implementation.md).

## 1. Yêu cầu và trạng thái ban đầu

Đọc lại Master Plan trước khi làm việc. B7 hiện được ghi đã triển khai, ĐẠT CÓ ĐIỀU KIỆN trên DB test; API8000 nạp tại chỗ, chưa authenticated Live. Phone và bankAccount đang null, audit minh họa/UI-only.

Người dùng yêu cầu **lên kế hoạch** bổ sung số điện thoại, lịch sử có thời gian; mục quét VietQR đổi sang khoảng15 phút kể từ tạo mã thanh toán; bỏ thời gian xác nhận gửi email, thay mốc cấp QR; bổ sung tài khoản thụ hưởng. Phạm vi này là ngoại lệ mới cho card timeline trước đây UI-only. Không suy ra yêu cầu đổi TTL thanh toán hoặc triển khai QR động.

Tiêu chí: nguồn dữ liệu thật, chọn đúng buyer/payment/ticket, public modules và ownership; phân biệt giờ thật/cửa sổ hướng dẫn, số điện thoại hiện tại/snapshot lịch sử, tài khoản giao dịch/tài khoản riêng BTC; có contract, thứ tự và test cases. Không sửa source/runtime ở lượt kế hoạch.

## 2. Thao tác thực tế và căn cứ

- Đọc lại `Feature_B7_OrderDetails.md`, B7 Master Plan, source `order-manager.ts` và `sepay-booking.ts`; đối chiếu các dữ kiện Auth phone/audit/payment snapshot đã đọc ở lượt hỏi trước.
- Detail hiện trả buyer.phone=null, bankAccount=null; tickets có issuedAt/checkedInAt, payment DTO có createdAt/succeededAt và provider reference. SePay tạo payment rồi ghi `sepay.payment.created`, giữ lại payment snapshot/deadline khi retry.
- Auth lưu users.phone; order chỉ snapshot name/email trong source đã kiểm tra. SePay store lưu bank_code/account_number/account_name theo payment_id. Audit có created_at nhưng chưa có public GET đọc timeline đơn; không có căn cứ quan sát người mua quét mã trong app ngân hàng.
- Bổ sung mục9 kế hoạch, cập nhật metadata và nhật ký; tạo report này và cập nhật riêng B7 Master Plan5.2/5.4. Không sửa source, không HTTP test mới, không tạo/nạp API, không gọi Stitch.

## 3. Quyết định thiết kế dữ liệu trong kế hoạch

1. **Phone liên hệ:** lấy profile hiện tại của buyer_id qua Auth public use case sau guard, nullable + phoneSource; UI ghi rõ nguồn hiện tại. Không giả phone snapshot của đơn cũ, không migration ở phương án tối thiểu.
2. **Timeline:** order.createdAt; cửa sổ quét VietQR từ payment.createdAt với giới hạn tham chiếu15 phút; succeededAt của payment PAID chuẩn; issuedAt của từng vé cho mốc **Cấp mã QR vé**. Không có email thành công hoặc fake timestamp quét.
3. **Cửa sổ15 phút:** là khoảng hướng dẫn, không bằng chứng khách đã quét; nếu providerExpiresAt sớm hơn thì hiển thị giới hạn thực tế sớm hơn. Không gia hạn hoặc sửa provider/order/reconcile deadlines/worker. Qua nửa đêm hiển thị đủ ngày/UTC+7; reload/in không đổi mốc.
4. **Thụ hưởng:** lấy snapshot đúng paymentId từ Payment; ưu tiên payment PAID, rồi active/latest cùng logic detail. Trả ngân hàng/số tài khoản/tên chủ, nullable; không dùng config mới ghi đè snapshot cũ, không tự nhận là tài khoản riêng BTC, không gọi endpoint admin hay đọc `.env` vào UI.
5. **API:** mở rộng GET detail hiện có với contact, bank snapshot và typed timeline; không bắt buộc thêm endpoint mới/audit tổng quát. KYC/risk/QR động/POS tiếp tục chỉ UI+toast. Chi tiết contract và tiêu chí ở kế hoạch9.1–9.5.

## 4. Checklist và kết quả

| Tiêu chí | Trạng thái phiên kế hoạch |
|---|---|
| Nội dung yêu cầu | PASS cho tài liệu: đầy đủ phone, cửa sổ VietQR15 phút, mốc cấp QR thay email và tài khoản thụ hưởng |
| Bố cục | NOT_VERIFIED lại; dự kiến giữ card/khung B7 |
| Cosmic Graffiti | NOT_VERIFIED lại; không đổi token/theme |
| Ngôn ngữ/khả năng đọc | PARTIAL: chốt nhãn và ý nghĩa thời gian, chưa render |
| Điều hướng/nghiệp vụ | PARTIAL: ownership/payment selection được đặc tả, chưa triển khai phần mới |
| Trạng thái UI | PARTIAL: có nullable/không payment/chưa phát hành/hết hạn, chưa test |
| Responsive/a11y | NOT_VERIFIED cho nội dung mới |
| Nhất quán | PARTIAL: yêu cầu giữ sidebar/TSX+CSS/route và hồi quy, chưa code |

Kết quả phạm vi bổ sung **CHƯA ĐỦ BẰNG CHỨNG để nghiệm thu triển khai**, trạng thái **ĐÃ LẬP KẾ HOẠCH / CHƯA TRIỂN KHAI**. Giữ kết quả triển khai B7 trước **ĐẠT CÓ ĐIỀU KIỆN**, không nâng hoặc hạ dựa việc mới thêm tài liệu. Thiết kế cuối ĐÃ TẠO, artifact giữ nguyên.

API: source GET detail/preview đã có và đã kiểm thử ở phiên trước; lượt này không xác minh HTTP, dữ liệu buyer phone/SePay bank snapshot hoặc timeline trên Live. Không tuyên bố các field mới đã được tích hợp. Các lỗi/tồn đọng cũ authenticated Live/a11y và image chưa rebuild vẫn còn.

## 5. Tài liệu và giới hạn

Đã giải quyết ở mức kế hoạch: nguồn phone hiện tại, phân biệt scan window với observed scan, mốc phát hành QR thay email, snapshot bank theo payment, contract/test cases. Chưa giải quyết bằng code hoặc dữ liệu runtime.

Master Plan5.2/5.4 bổ sung trạng thái kế hoạch mới, thay đổi phạm vi audit theo yêu cầu, link report và thời điểm; giữ lịch sử triển khai, không thay trạng thái tích hợp4/6.F vì chưa có tích hợp mới. Mọi chỉnh sửa kế hoạch ghi trong nhật ký mục8. Không ghi đè report cũ.

Git status lúc bắt đầu đã có thay đổi source/B6 từ trước và nhiều ảnh evidence/assets bị xóa ngoài lượt này; giữ nguyên, không hoàn tác hoặc tạo lại ảnh. Các liên kết ảnh trong report cũ là lịch sử, không dùng làm bằng chứng ảnh hiện còn trên filesystem. Lượt này chỉ ghi kế hoạch, report mới và hai dòng B7 Master Plan; kiểm tra diff/readback và liên kết tài liệu mới, không chạy build/test source.
