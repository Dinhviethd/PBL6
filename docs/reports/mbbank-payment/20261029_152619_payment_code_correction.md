# Đính chính cấu trúc mã thanh toán

- Ngày: 29/10/2026, 15:26 UTC+7.
- Yêu cầu trực tiếp của người dùng: tiền tố `tkh` chữ thường; hậu tố 3–10 ký tự chữ/số; không mặc định 10 ký tự.
- Cập nhật [kế hoạch gốc](../../MBBank_Payment.md), mục P0-04; sửa bảng bàn giao P0 và bổ sung chú thích thay thế quyết định cũ trong báo cáo xác nhận trước đó.
- Quy tắc thiết kế: `^tkh[A-Za-z0-9]{3,10}$`. Ví dụ hợp lệ: `tkhA12`, `tkh7b9X2`, `tkhA1B2C3D4E5`. Không ép độ dài 10 khi validate hoặc sinh mã; thuật toán chọn độ dài khi sinh sẽ được ghi rõ lúc triển khai, không tự đặt mặc định trái yêu cầu. Duy trì unique DB và xử lý collision.
- Chưa xác minh hoa/thường của trường `code` do SePay trả về. Cần fixture để thiết kế đối chiếu; không tự chuyển tiền tố hiển thị thành chữ hoa hoặc ghép nhiều mã mơ hồ.
- Kiểm thử yêu cầu: chấp nhận mọi độ dài hậu tố 3–10; từ chối độ dài 2/11, ký tự đặc biệt; kiểm tra giữ tiền tố chữ thường trong QR; kiểm tra collision và payload SePay có thay đổi hoa/thường. Các ca runtime **NOT RUN**, chỉ cập nhật tài liệu.
- Không sửa code/API, cấu hình hay dữ liệu; không kết nối Supabase hoặc DB local. P0 vẫn hoàn thành ở mức xác nhận điều kiện; P1 chưa thực hiện.
