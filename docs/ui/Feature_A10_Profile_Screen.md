# Feature Plan — A10 Hồ sơ cá nhân

## 1. Phạm vi

- **Màn hình:** A10 — Hồ sơ cá nhân
- **Stitch project chính thức:** `10374042969343935993` (EventHub)
- **Stitch screen hiện tại:** `2ffc6d2afffe4e98928685030e86b1c8`
- **Route frontend tham chiếu:** `/profile`
- **API sử dụng:** `GET /api/auth/me`, `GET /api/me/tickets`, `PATCH /api/me`, `POST /api/media`, `POST /api/me/password`
- **Phạm vi phiên này:** cập nhật bản tái tạo A10 trong frontend theo artifact Stitch và ảnh tham chiếu được cung cấp; không gọi `edit_screens`, không chỉnh sửa artifact Stitch, backend, cơ sở dữ liệu, API hoặc màn hình khác.

## 2. Bằng chứng hiện có

Đã đọc [PROJECT_MASTER_PLAN.md](../PROJECT_MASTER_PLAN.md) trước khi lập kế hoạch. Master Plan xác định:

- A10 có code tại `/profile` nhưng cần đồng bộ với Stitch.
- Design system là Cosmic Graffiti: nền tối, primary `#7C3AED`, secondary `#22D3EE`, tertiary `#F472B6`, headline Syne, body Be Vietnam Pro, roundness ROUND_EIGHT.
- Hồ sơ cá nhân thuộc nhóm Customer/Organizer; các API hồ sơ được ghi nhận là `PATCH /me` và `POST /me/password`.

Đã gọi Stitch `get_screen` và `download_file` cho:

`projects/10374042969343935993/screens/2ffc6d2afffe4e98928685030e86b1c8`

Kết quả xác nhận artifact có tiêu đề **A10. Hồ sơ cá nhân - Cosmic Ticket**, loại thiết bị DESKTOP, kích thước `2560 × 4002`, có screenshot và HTML artifact. Artifact được dùng làm tham chiếu; không ghi đè hoặc chỉnh sửa trên Stitch.

## 3. Điểm cần kiểm tra trước khi cập nhật

Các điểm dưới đây là hạng mục cần đối chiếu trong phiên hiệu chỉnh tiếp theo, không phải kết luận đã vi phạm khi chưa có bằng chứng chi tiết:

1. Cấu trúc nội dung hồ sơ: thông tin cá nhân, chỉnh sửa thông tin và đổi mật khẩu có đầy đủ và phân cấp rõ ràng không.
2. Trạng thái dữ liệu: loading, dữ liệu trống, lỗi tải/lưu, lưu thành công và nút vô hiệu hóa.
3. Tính nhất quán Cosmic Graffiti: màu nền/bề mặt, màu nhấn, typography, radius, icon, border và focus state.
4. Khả năng đọc tiếng Việt, tương phản, label/form semantics và thông báo lỗi theo trường.
5. Điều hướng `/profile`, chuyển đổi khu vực hồ sơ Customer/Organizer và hành vi sau khi cập nhật.
6. Responsive ngoài desktop và khả năng sử dụng bàn phím.
7. Hợp đồng thực tế của các API profile/ticket/upload, bao gồm quyền truy cập, request/response, lỗi validation và bằng chứng runtime.

Trước triển khai, các hạng mục UI runtime/responsive/accessibility là **NOT_VERIFIED**; không được đánh dấu đạt chỉ dựa trên artifact desktop.

## 4. API và dữ liệu sử dụng

| API | Mục đích | Bằng chứng contract | Trạng thái phiên |
|---|---|---|---|
| `GET /api/auth/me` | Lấy hồ sơ hiện tại và `createdAt` | `server/src/app.ts`, route `GET /auth/me`, có `protect` | Đã xác minh route; runtime browser trả `401` do chưa đăng nhập |
| `GET /api/me/tickets` | Danh sách sự kiện user có vé | `server/src/app.ts`, route `GET /me/tickets`, có `protect`, hỗ trợ `page` | Đã xác minh route; runtime browser chưa có phiên |
| `PATCH /api/me` | Cập nhật tên, số điện thoại, avatar URL | `server/src/app.ts`, route `PATCH /me`, `profileSchema` | Đã xác minh route; chưa gửi request thay đổi |
| `POST /api/media` | Upload avatar với field `image` | `server/src/app.ts`, `protect`, giới hạn 5 MB | Đã xác minh route; chưa upload runtime |
| `POST /api/me/password` | Đổi mật khẩu | `server/src/app.ts`, yêu cầu `currentPassword`/`newPassword` | Đã xác minh route; chưa gửi request thay đổi |

Frontend dùng `api` với base URL `/api`, nên source gọi các path tương ứng không lặp tiền tố `/api`.

## 5. Kế hoạch/thực hiện cập nhật frontend

### Bước 1 — Chụp hiện trạng

- Mở đúng screen ID hiện có bằng Stitch MCP.
- Lưu lại tiêu đề, screen ID, loại thiết bị, kích thước và screenshot/HTML artifact trong report phiên.
- Không tạo screen mới, không gọi `edit_screens` và không dùng project Stitch khác.

### Bước 2 — Chốt sai lệch và phạm vi được yêu cầu

- Đối chiếu từng thành phần với yêu cầu A10 và Cosmic Graffiti.
- Giữ bố cục/thẩm mỹ của artifact làm tham chiếu để tái tạo frontend.
- Theo yêu cầu phiên, loại bỏ khối **“Trở thành Organizer”** khỏi A10; luồng Organizer sẽ thuộc một màn hình khác.

### Bước 3 — Cập nhật trong frontend

- Cập nhật `client/src/pages/account/Profile.tsx` và stylesheet riêng `profile.css`.
- Giữ hero, thẻ tóm tắt hồ sơ, thông tin cá nhân và bảo mật theo phong cách Cosmic Graffiti; bỏ khu vực `03 / TICKET WALLET`.
- Bổ sung logo EventHub và nội dung “Hồ sơ cá nhân & bảo mật Cyber” theo ảnh tham chiếu.
- Ẩn trường nhập URL ảnh đại diện; chỉ hiển thị thao tác chọn file và upload qua `POST /media`.
- Dùng `GET /me/tickets` để hiển thị số sự kiện đã tham dự cạnh ngày tham gia.
- Bổ sung header/hero và footer A10 với logo, liên kết tài khoản, chính sách, hỗ trợ 24/7 và thông tin bản quyền.
- Bổ sung icon Lucide và animation nhẹ cho hero/avatar, tăng avatar lên 126px.
- Cho phép chọn avatar trực tiếp bằng nút camera nhỏ trên avatar.
- Dùng trực tiếp `AuthHeader` và `AuthFooter` dùng chung của trang Login; không render
  header/footer shell riêng của `App.tsx` trên `/profile`.
- Thêm icon `UserRound` và `Phone` trước vùng nhập dữ liệu của hai trường hồ sơ,
  thông qua prop icon dùng chung của component `Field`.
- Thêm icon `Mail` cho trường Email; trường này chỉ hiển thị và bị disabled để
  người dùng không thể nhập/chỉnh sửa hoặc gửi email khi lưu hồ sơ.
- Dùng API thật; không thêm mock hoặc dữ liệu hard-code.
- Giữ route `/profile`; không thay đổi màn hình khác.

### Bước 4 — Xác minh sau cập nhật

- Gọi lại `get_screen` đúng screen ID để xác nhận Stitch không bị thay đổi.
- Chạy build và lint frontend.
- Mở `/profile` trên browser; ghi nhận trạng thái auth thực tế.
- Kiểm tra các tiêu chí: nội dung, bố cục, Cosmic Graffiti, khả năng đọc, điều hướng/nghiệp vụ, trạng thái UI, responsive/accessibility và nhất quán.
- Phân biệt rõ thao tác đã gửi với thao tác được xác nhận thành công.

### Bước 5 — Ghi nhận

- Tạo report mới, không ghi đè report cũ, theo tên:
  `A10_<YYYYMMDD_HHMMSS>_<action>.md`
- Cập nhật mục A10 trong Master Plan với trạng thái thiết kế, review, vấn đề, report mới nhất và thời điểm thực tế.
- Không cập nhật trạng thái các màn hình khác.

## 6. Tiêu chí nghiệm thu

| Tiêu chí | Kết quả cần đạt |
|---|---|
| Định danh | Artifact vẫn thuộc project `10374042969343935993` và screen A10 hiện tại. |
| Nội dung | Có hồ sơ, ngày tạo tài khoản, số sự kiện đã tham dự, cập nhật thông tin và bảo mật; không có khối “Trở thành Organizer” hoặc `03 / TICKET WALLET`. |
| Cosmic Graffiti | Dùng đúng token màu, typography, bề mặt, radius và phân cấp thị giác đã ghi trong Master Plan. |
| Form/accessibility | Có label/accessible name, focus rõ, lỗi theo trường và tương phản phù hợp. |
| Trạng thái UI | Có bằng chứng cho loading, empty, error, success và disabled khi cần. |
| Nghiệp vụ | Hành động cập nhật hồ sơ, upload avatar, đổi mật khẩu và tải vé dùng đúng API đã xác minh. |
| Responsive | Không kết luận PASS nếu chỉ có artifact desktop; cần bằng chứng kích thước phù hợp. |
| Xác minh | Artifact sau chỉnh sửa được đọc lại và đối chiếu, không chỉ dựa trên phản hồi thao tác. |

## 7. Trạng thái phiên triển khai

- Đã xác minh quyền truy cập Stitch và đúng screen A10.
- Không gọi `edit_screens`; Stitch artifact được giữ nguyên.
- Đã chỉnh frontend A10, không chỉnh backend/API hoặc màn hình khác.
- Đã ẩn URL avatar, đưa số sự kiện đã tham dự cạnh ngày tham gia, bỏ khu vực ví vé 03 và bổ sung logo/nội dung Cyber.
- A10 hiện dùng `AuthHeader`/`AuthFooter` chung của Login; shell toàn cục của App,
  gồm header, demo banner và footer, được tắt riêng trên route `/profile` để tránh trùng.
- Trường “Họ và tên” có icon UserRound và trường “Số điện thoại” có icon Phone
  trước vùng nhập dữ liệu.
- Trường Email có icon Mail và ở trạng thái disabled/read-only; email không được
  đưa vào payload cập nhật hồ sơ.
- Upload avatar tự gọi `PATCH /me` sau khi `POST /media` thành công, đồng bộ lại
  auth store và render ảnh từ state để avatar cập nhật ngay mà không cần nhấn
  “Lưu thay đổi”.
- Phần thông tin cá nhân không còn nút hoặc luồng submit “Lưu thay đổi”; avatar
  vẫn được lưu tự động qua luồng upload riêng.
- Phần thông tin cá nhân không còn button “Chọn ảnh đại diện” hoặc dòng “Ảnh
  đại diện”; chỉ giữ button camera nhỏ cạnh avatar để chọn và tự lưu ảnh.
- Form bảo mật có thêm trường “Nhập lại mật khẩu mới”, icon `KeyRound` cho cả
  ba trường và chặn request nếu hai mật khẩu mới không khớp.
- Phần thông tin cá nhân có button “Lưu thay đổi” riêng, chỉ gửi họ tên và số
  điện thoại; Email vẫn disabled/read-only và avatar vẫn tự lưu qua picker riêng.
- Khi lưu thông tin cá nhân, frontend gửi lại `avatarUrl` hiện tại để không làm
  mất ảnh đại diện nếu backend xử lý các trường PATCH không được gửi thành
  `null`.
- Đã chạy build và lint thành công.
- Browser `/profile` chưa có phiên đăng nhập và nhận `401`; chưa thể xác minh dữ liệu thật, upload, submit form, responsive và accessibility runtime.
- **Trạng thái:** ĐÃ CẬP NHẬT CÓ ĐIỀU KIỆN / review `CHƯA ĐỦ BẰNG CHỨNG`.
- Report phiên: [`A10_20261025_224224_email_readonly.md`](../reports/stitch/A10_20261025_224224_email_readonly.md)
- Report phiên mới nhất: [`A10_20261025_224908_avatar_autosave.md`](../reports/stitch/A10_20261025_224908_avatar_autosave.md)
- Report phiên loại bỏ nút lưu: [`A10_20261025_225708_remove_profile_save.md`](../reports/stitch/A10_20261025_225708_remove_profile_save.md)
- Report phiên compact avatar picker: [`A10_20261025_230140_compact_avatar_picker.md`](../reports/stitch/A10_20261025_230140_compact_avatar_picker.md)
- Report phiên xác nhận mật khẩu: [`A10_20261025_230653_password_confirmation.md`](../reports/stitch/A10_20261025_230653_password_confirmation.md)
- Report phiên nút lưu thông tin cá nhân: [`A10_20261025_231310_profile_save_button.md`](../reports/stitch/A10_20261025_231310_profile_save_button.md)
- Report phiên giữ avatar khi lưu hồ sơ: [`A10_20261025_231720_preserve_avatar_on_profile_save.md`](../reports/stitch/A10_20261025_231720_preserve_avatar_on_profile_save.md)
