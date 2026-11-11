# Rà soát mobile — kế hoạch trước khi sửa

Thời điểm: 2026-11-11 18:19:32 UTC+07. Phạm vi: source trong mobile; giữ toàn bộ route, API, quyền và nghiệp vụ. Không đổi artifact Stitch hoặc theme Cosmic Graffiti dark-only đã cấu hình.

## Nguồn
- Master Plan, mobile/AGENTS.md, hai skill appllama-app-design-skill và eventhub-stitch-review.
- Stitch project 10374042969343935993; đã đọc metadata A1 f9b7d6b096af4e598718c3f855ffe1e6, A2 108b533834414d3a826cd32cfae54fe6, A4 2d3d2187e79b4a3683caf7aa148bdbf3.
- Đã tải và xem ảnh A4 file6313009675931005984, đọc HTML file6748196296944310261 bằng download_file; kết nối này hiện hoạt động. Chưa đối chiếu pixel tất cả màn.
- Android emulator-5554, font_scale=1.0; ảnh trước sửa .local/mobile-review-before.png.

## Phát hiện và phạm vi thay đổi
| ID | Phát hiện từ source/ảnh | Xử lý dự kiến | Ảnh hưởng |
|---|---|---|---|
| U1 | Screen và HomeScreen bù bàn phím cố định90; header thay đổi theo thiết bị/cỡ chữ | Đọc chiều cao header từ Expo Router | A1 và mọi route dùng Screen; giữ navigator |
| U2 | Field trải props sau style; style riêng ghi đè nền/padding/font mặc định | Ghép style mặc định với style truyền vào, bảo toàn multiline | Biểu mẫu khách hàng/BTC/Admin |
| U3 | PasswordField thêm một nút toàn dòng dưới mỗi ô; khác nút mắt trong ô của Stitch A4, tăng cuộn đăng ký/đổi mật khẩu | Nút mắt tối thiểu48 trong ô, nhãn hiện/ẩn cũ, giữ giá trị/focus | A4, A10 đổi mật khẩu, A11 |
| U4 | HomeSheet chưa chỉ rõ giới hạn co cho vùng cuộn và cơ chế kéo để đóng bàn phím | Cho khung/nội dung co và cuộn khi màn thấp/chữ lớn; giữ close/back/apply/cancel | Bộ lọc A1/A2, lịch sử/báo cáo, danh sách BTC/Admin |

## Tiêu chí nghiệm thu
- Typecheck/lint và unit mobile đạt; export bundle mới.
- Chạy regression UI hiện có và real API local riêng: auth, password/reset, booking/payment/tickets, filter và quản trị.
- Kiểm tra native auth, hiện/ẩn mật khẩu, keyboard mở/đóng, đăng ký và sheet lọc; font100/200. Ghi rõ giới hạn iOS và FPS; không dùng web screenshot để khẳng định native hoàn tất.
- Giữ nguyên các thay đổi có sẵn; lưu báo cáo sau sửa mới, cập nhật Master Plan. Không tích hợp hoặc sửa API.

