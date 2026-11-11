# Mobile native polish — kế hoạch trước sửa

Yêu cầu: thêm icon phù hợp và điều chỉnh UI mobile giống ứng dụng thực sự; đây là cho phép điều chỉnh presentation mobile, không thay API/luồng/quyền và không sửa artifact desktop Stitch.

Nguồn: Master Plan, appllama-app-design-skill, eventhub-stitch-review, mobile/AGENTS.md; Expo57. Pattern tham khảo từ Eventbrite app (https://www.eventbrite.com/consumer/eventbrite-app/) và Ticketmaster Mobile Tickets (https://www.ticketmaster.com/mobile-tickets). Đã tải screenshot discovery/tickets/transfer từ nguồn chính thức vào .local/mobile-native-polish. DICE403, không coi là đã nghiên cứu. Không có Appllama MCP.

Phát hiện/phạm vi:
1. Tài khoản hiện là chuỗi nút cùng trọng số. Chuyển thành header nhận diện và nhóm hàng icon+nhãn+chevron, giữ thứ tự/hành động/quyền; đăng xuất riêng.
2. Nút/form/notice thiếu dấu hiệu thị giác nhất quán. Mở rộng Button/Field bằng icon tùy chọn, dùng Feather đang có, giữ nhãn trợ năng và vùng chạm48. Không cài font/dependency mới.
3. Ví vé/đơn hàng/thông báo dùng card văn bản khá đồng dạng. Thêm icon trạng thái/metadata, empty state có hướng dẫn, mã vé selectable/tabular; giữ dữ liệu và cách truy cập QR.
4. Trang chủ có hero chiếm nhiều chiều cao điện thoại. Thu gọn spacing/type, trái hóa hierarchy và nhóm CTA theo chiều rộng/chữ lớn, giữ đủ section/nhãn và route. Loại ký tự trang trí khỏi chrome khi thay bằng icon thật.
5. Thêm icon rõ nghĩa cho xác thực/hồ sơ, phân trang, bước booking và bộ lọc quản lý dùng chung. Không thay transaction/state/router.

Stitch đã xác minh metadata A8/A9/A10, tải/xem ảnh A8. A1/A2/A4 ảnh/HTML đã xem ở phiên trước. Giữ palette/font/token hiện có theo Cosmic Graffiti; điều chỉnh layout mobile theo yêu cầu mới. Tạo report sau và cập nhật Master Plan; không ghi đè report cũ.

Kiểm chứng: typecheck/lint/unit, export và UI regression; kiểm tra riêng account/menu/ticket/empty/state ở320/390/768 và native khi công cụ cho phép. Native full-motion/font lớn/iOS chưa được coi PASS nếu chỉ có web/export.
