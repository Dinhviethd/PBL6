# P0 bổ sung — xác nhận cấu hình từ người dùng

> Đính chính ngày 29/10/2026 15:26 UTC+7: quyết định chuẩn hóa TKH và sinh hậu tố cố định 10 ký tự trong báo cáo lịch sử này đã được thay thế bằng tiền tố `tkh` chữ thường, hậu tố 3–10 ký tự chữ/số, không mặc định 10. Xem [báo cáo đính chính](20261029_152619_payment_code_correction.md) và mục P0-04 trong kế hoạch gốc.

- Thời điểm: 29/10/2026, 15:16 UTC+7.
- Phạm vi: ghi nhận câu trả lời, chốt cấu hình dự kiến và cập nhật [kế hoạch gốc](../../MBBank_Payment.md). Không chạy API, app, worker, test, migration hay kết nối database.
- Nguồn: phản hồi người dùng cho ba câu hỏi P0, không phải quan sát trực tiếp Dashboard của assistant. Không nhận/lưu secret hoặc token.

## Thông tin nhận được và quyết định

| Hạng mục | Phản hồi người dùng | Kết luận |
|---|---|---|
| Ngân hàng | MBBank cá nhân đã thêm/Hoạt động, nhận thông báo khi tiền vào tài khoản chính. | Dùng tài khoản chính; không mặc định VA. Thông báo tiền vào chưa chứng minh webhook tới EventHub. |
| Test mode | Chuyển sang Test mode được, chưa mô phỏng thành công vì chưa điền webhook. | Có quyền truy cập. Chưa có bằng chứng tạo giao dịch thành công hay gửi webhook. Endpoint thuộc P3, thử mô phỏng thuộc P4; không đánh FAIL chức năng chưa xây. |
| Xác thực | Chọn được HMAC-SHA256, đã có secret riêng. | Giữ thiết kế HMAC. Việc gắn đúng secret Test/Live và kiểm chứng chữ ký còn ở P3/P4. |
| Mã thanh toán | Tiền tố tkh, hậu tố 3–10 ký tự số/chữ. | Chuẩn hóa mã sinh mới TKH + 10 chữ/số viết hoa; unique DB, retry khi collision. Không dùng EH+12 đã đề xuất trước đó. Cần thử ranh giới mã, nội dung có mã dài hơn 10 và multiple-code để tránh ghép nhầm. |
| API v2 | Có quyền API giao dịch v2. | Ghi nhận quyền theo người dùng; chưa xác nhận token Sandbox. Đã hỏi bổ sung chỉ về trạng thái token, không yêu cầu giá trị. |
| Thời gian | “cho phép chờ 15 phút webhook”. | Hiểu theo ngữ cảnh câu hỏi là cộng 15 phút sau hạn thanh toán gốc. Không reset hạn đơn khi tạo payment/refresh. Ví dụ 15:00 tạo đơn thường → 15:15 hết hạn trả tiền → 15:30 hết giữ chỗ chờ xác nhận. |

Khoảng chờ là thời gian nhận/xử lý thông báo cho giao dịch đã thực hiện đúng hạn. Nếu thời điểm giao dịch ngân hàng vượt hạn thanh toán, hoặc worker xử lý sau hạn giữ chỗ/chỗ đã nhả, đưa REVIEW thay vì tự cấp vé. Chính sách chỉ áp dụng SePay; API demo/VNPAY giữ nguyên. Khi triển khai phải test thời gian sát mốc và timezone.

## Kiểm tra và giới hạn

| Kiểm tra | Trạng thái | Bằng chứng |
|---|---|---|
| Đối chiếu phản hồi vào plan | PASS tài liệu | Mục 3 và 7.1 cập nhật đúng tài khoản chính/TKH/HMAC/v2/15 phút. |
| Tài khoản và quyền Dashboard | USER-CONFIRMED | Câu trả lời người dùng; assistant không đăng nhập. |
| Token Sandbox riêng | PENDING | Câu hỏi bổ sung đã gửi, chưa có phản hồi lúc ghi báo cáo. |
| Giao dịch mô phỏng, chữ ký, QR, ACK, DB | NOT RUN | Chức năng chưa triển khai; không đánh PASS runtime. |
| Tác động API cũ/Supabase | Không có thao tác | Chỉ chỉnh docs; không kết nối DB, không gọi health hoặc endpoint ngrok. |

Lệnh dùng trong phiên: đọc plan và thời gian local để đặt tên báo cáo; chỉnh tài liệu và kiểm tra diff. Không đọc `.env`, không thu thập số tài khoản đầy đủ.

## Bước tiếp theo

Xác nhận token Sandbox riêng để đóng điều kiện P0-05. Không đợi mô phỏng webhook thành công mới xây P1–P3 vì endpoint chưa tồn tại; khả năng mô phỏng thực thi là tiêu chí P4. P1–P7 chưa thực hiện trong phiên này. Khi nhận phản hồi tiếp theo phải lập báo cáo bổ sung và cập nhật plan, giữ lại báo cáo lịch sử.
