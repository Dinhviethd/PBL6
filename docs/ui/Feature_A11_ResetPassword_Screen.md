# Feature Plan: A11 — Quên mật khẩu & đặt lại mật khẩu

## Mục tiêu

Triển khai giao diện frontend A11 theo bố cục và phong cách Cosmic Graffiti của screen ID `5d922b967e394167982a27a2dc35f31c` trong Stitch project `10374042969343935993`. Theo yêu cầu cập nhật của người dùng, phiên triển khai không chỉnh sửa thiết kế trên Stitch.

## Căn cứ và trạng thái hiện tại

- Master Plan ghi A11 là **Quên mật khẩu & đặt lại mật khẩu**, route `/auth/reset-password`; ghi chú luồng khôi phục/đặt lại hiện là biến thể phụ và chưa xác minh tách riêng.
- Stitch xác nhận project EventHub có thiết kế A11 hiện tại với title `A11. Quên mật khẩu & Đặt lại mật khẩu - Cosmic Ticket`, desktop 2560×2884.
- Cosmic Graffiti hiện có: nền tối, surface tối, tím `#7C3AED`, cyan `#22D3EE`, hồng `#F472B6`, Syne / Be Vietnam Pro / Space Grotesk, nhịp khoảng cách 8px.
- Phiên 2026-10-25 đã gửi một lần yêu cầu sửa in-place. Khi tải lại HTML từ cùng screen ID, nội dung vẫn là artifact cũ. Trạng thái thao tác Stitch: **BLOCKED — chưa xác minh thay đổi được lưu**.
- Phiên tiếp theo 2026-10-25 16:08 gửi lại yêu cầu hiệu chỉnh tại chỗ theo kế hoạch. Stitch trả DOM operations nhưng HTML và screenshot tải lại vẫn cũ; trạng thái vẫn **BLOCKED**. Báo cáo mới nhất: `docs/reports/stitch/A11_20261025_160846_correction.md`.
- Phiên triển khai frontend 2026-10-25 16:26 đã cập nhật A11 trong `AuthPage.tsx`, `AuthShell.tsx`, `auth.css`; chưa chạy build/test hoặc kiểm tra browser. API local health check timeout nên chưa xác nhận hoạt động. Báo cáo: `docs/reports/stitch/A11_20261025_162629_implementation.md`.

## Vấn đề phát hiện ở artifact ban đầu

- Thương hiệu viết sai `ENVENT` / `ENVENT HUB` và title còn `Cosmic Ticket`.
- Một trang đồng thời trình bày form yêu cầu email, trạng thái gửi thành công và form đặt mật khẩu mới, khiến các giai đoạn không phân biệt được.
- Email và mật khẩu mẫu bị điền sẵn; có thông tin cá nhân, KYC, số điện thoại, liên hệ và dữ liệu hỗ trợ cụ thể không có căn cứ.
- Tuyên bố OTP, hạn token, 256-bit SSL, xác minh hai lớp, chống brute-force, countdown và mô phỏng thành công chưa được xác minh với yêu cầu/API.
- Thiếu cấu trúc trạng thái rõ ràng; các điều khiển trình bày như đang hoạt động dù chỉ là demo tĩnh.

## Giao diện đích và cách triển khai frontend

1. Tái tạo đầy đủ bố cục reference A11 trong React: header/nav/search, card recovery bên trái, hai panel luồng bên phải, dải thông tin phía dưới và footer nhiều cột. Dùng lại `AuthHeader`/`AuthFooter` trong dự án.
2. Trên route `/auth/reset-password`, dùng một form hoạt động theo từng trạng thái: email; sau phản hồi API, OTP 6 số + mật khẩu mới + xác nhận.
3. Phản ánh đúng backend đang có: `POST /auth/forgot-password` và `POST /auth/reset-password`; không dựng luồng link nếu backend đang yêu cầu OTP.
4. Theo xác nhận rõ ràng của người dùng ngày 2026-10-25, giữ nguyên nội dung và dữ liệu hiển thị trong ảnh tham chiếu, gồm `ENVENT HUB`, email `trankhahao7@gmail.com`, hotline `0378531013`, copy KYC/OTP/15 phút/2 lớp/Brute-force và các panel preview. Đây là nội dung mô phỏng theo ảnh; không xem đó là bằng chứng API hoặc cam kết bảo mật đã xác minh.
5. Dùng màu và font Cosmic Graffiti; đáp ứng desktop/mobile, focus và lỗi form.
6. Chỉ chỉnh sửa route/component dành cho Auth reset; giữ nguyên login/register và các màn khác. Không ghi vào Stitch; Stitch source hiện tại giữ nguyên vì thao tác MCP trước đó không lưu được.
7. Trước khi nghiệm thu, mở app tại route A11, kiểm tra desktop/mobile và trạng thái form. Phần API đang dùng service hiện hữu; health/runtime của backend chưa được xác minh, cần ghi rõ trong report.

## Xác nhận nội dung và phạm vi

- Người dùng chọn giữ toàn bộ nội dung trong ảnh và dùng lại header/footer sẵn có trong dự án; không thay email, hotline, copy hoặc nhãn trong mockup.
- Thẻ trạng thái gửi email và thẻ đặt mật khẩu bên phải là bản tái tạo theo preview trong ảnh. Trạng thái thao tác thực tế vẫn do form bên trái và API quyết định; các nút preview không gọi API.
- Phiên tái tạo frontend 2026-10-25 đã giữ Stitch không đổi, tái sử dụng header/footer chung, build thành công và kiểm tra browser ở desktop 1440px cùng mobile 390px. Báo cáo: `docs/reports/stitch/A11_20261025_165155_implementation.md`.

## Tiêu chí nghiệm thu

- Chỉnh sửa đúng screen ID A11 hiện hữu, không phát sinh screen trùng lặp.
- Nội dung và thông tin trong ảnh được giữ theo xác nhận người dùng; trạng thái tĩnh bên phải được coi là preview, không phải bằng chứng gửi thành công.
- Luồng thực tế trong biểu mẫu trái vẫn tuần tự: yêu cầu email, OTP, mật khẩu mới; các thao tác preview bên phải không gọi API.
- Nội dung bảo mật/thời hạn trong ảnh là copy mô phỏng, chưa được xác minh với backend.
- Bảng màu, kiểu chữ và hình khối phù hợp Cosmic Graffiti.
- Có bằng chứng trang React thực tế sau triển khai; desktop/mobile kiểm tra riêng, không suy ra PASS chỉ từ ảnh desktop.
- Source service dùng routes/payload đã có; hoạt động runtime của API chưa được xác minh. Cần health/API verification trước khi nghiệm thu luồng hoàn chỉnh.

## Ranh giới phạm vi

Phạm vi hiện tại gồm giao diện frontend A11 và tài liệu liên quan; không chỉnh backend/API, project-wide design system, thiết kế Stitch, hoặc màn hình khác. Báo cáo triển khai mới nhất: [`../reports/stitch/A11_20261025_162629_implementation.md`](../reports/stitch/A11_20261025_162629_implementation.md). Báo cáo correction Stitch trước đó được giữ nguyên.
