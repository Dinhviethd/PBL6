# L0: ghi nhận xác nhận của người dùng

Thời điểm ghi nhận: 29/10/2026 23:22 UTC+7. Bổ sung cho [báo cáo L0](20261029_231241_l0_verification.md); các kết quả cũ là ảnh chụp tại thời điểm báo cáo đó.

## Quyết định và thông tin đã nhận

- Chưa có staging cô lập cho demo, VNPAY sandbox và SePay Test. Tích hợp SePay Live trên source hiện tại; không cần làm việc với các branch khác.
- Chưa có domain production; người dùng dự kiến sử dụng ngrok cho SePay. Chưa rõ ngrok là giải pháp thử tạm thời hay vận hành dài hạn. Chưa có bằng chứng HTTPS, độ ổn định, xác thực và chuỗi proxy thực tế; plan hiện không chấp nhận quick tunnel làm production endpoint. Cần đánh giá phương án ngrok cụ thể trước khi kết luận sẵn sàng.
- Người dùng chịu trách nhiệm toàn bộ nhiệm vụ vận hành và quản lý thông tin/secret. Người dùng xác nhận SePay Live đã liên kết MBBank và có quyền tạo webhook, token API v2 chỉ đọc. Đây là xác nhận của người dùng, chưa phải kiểm chứng Dashboard hoặc API.
- Được dùng role cần thiết để kiểm tra backend; chưa xác định role runtime thực tế hoặc cấp quyền cụ thể để ghi/DDL vào database thật. Nếu cần tài khoản sẽ hỏi người dùng; không lưu thông tin đăng nhập trong repo/chat.
- Source hiện tại là ứng viên L0; người dùng yêu cầu **chưa commit**, sẽ commit sau khi tích hợp thanh toán tự động thành công. Không tự commit. Vì workspace chưa cố định bằng commit, cần ghi fingerprint an toàn của source tại các lần nghiệm thu; fingerprint không thay thế commit hay review.

## Đánh giá tiêu chí

| Điều kiện | Trạng thái | Giải thích |
|---|---|---|
| Phạm vi source | PASS theo quyết định | Dùng workspace hiện tại, không cần branch khác. Chốt commit theo tiêu chí ban đầu vẫn **BLOCKED/hoãn theo yêu cầu**, không tuyên bố đạt. |
| Staging/coexistence | BLOCKED | Chưa có staging; chưa có bằng chứng ba phương thức hoạt động cùng cấu hình và tránh phát vé trùng. Guard production vẫn giữ. |
| Deployment/HTTPS | BLOCKED | Dự kiến ngrok nhưng chưa rõ nền tảng, loại tunnel, độ bền URL hay cách bảo vệ webhook. Chưa test endpoint. |
| Quyền Live/MBBank | PASS theo xác nhận người dùng | Chưa kiểm chứng độc lập và chưa cấu hình hoặc sử dụng Live credential. |
| Chủ sở hữu vận hành/secret | PASS theo xác nhận người dùng | Người dùng chịu trách nhiệm; chưa xác minh secret manager hoặc quy trình vận hành. |
| Project/role runtime | BLOCKED | Project/branch và role thực tế chưa được xác định; quyền chọn role kiểm tra không chứng minh role vận hành. |
| Backup/PITR và mục tiêu phục hồi | BLOCKED | Đã có người phụ trách; retention, RPO/RTO, phạm vi và khả năng restore chưa xác nhận. Backup `public` cũ không chứng minh full restore. |
| API contract, secret scan và build | Không đổi so với báo cáo trước | Build/boundaries local PASS; contract Live và quét nội dung secrets chưa được nghiệm thu. |

**Kết luận:** L0 chưa đạt đầy đủ tiêu chí. Tiếp tục được các công việc source/local an toàn trong khi bổ sung bằng chứng; chưa dùng nhận định này để xác nhận sẵn sàng Live, áp dụng DDL hoặc chuyển tiền.

## Câu hỏi tiếp theo

Đã hỏi tên/project ref Supabase và liệu chứa dữ liệu thật, nền tảng chạy backend/worker, mục đích sử dụng ngrok, và tình trạng backup/PITR/retention/RPO/RTO. Không yêu cầu secret hoặc connection string.

Không chạy lệnh hay test mới, không truy cập DB, Dashboard hoặc dịch vụ ngoài trong bước ghi nhận này; không sửa API hay dữ liệu. Cần cập nhật đánh giá khi nhận câu trả lời và kiểm chứng tương ứng.
