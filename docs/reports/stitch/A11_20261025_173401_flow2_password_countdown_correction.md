# A11 — Correction: chuyển mật khẩu sang LUỒNG 02 và kích hoạt countdown

## 1. Thông tin phiên

| Trường | Giá trị |
|---|---|
| Mã màn hình | A11 |
| Tên màn hình | Quên mật khẩu & đặt lại mật khẩu |
| Stitch project ID | `10374042969343935993` |
| Stitch screen ID | `5d922b967e394167982a27a2dc35f31c` |
| Route | `/auth/reset-password` |
| Thời gian | 2026-10-25 17:34:01 (Asia/Ho_Chi_Minh) |
| Loại hành động | Correction frontend theo yêu cầu bổ sung |
| Trạng thái | ĐẠT CÓ ĐIỀU KIỆN |

## 2. Yêu cầu đã xử lý

1. Chuyển trường `Mật khẩu mới` và `Xác nhận lại mật khẩu` khỏi form chính sang panel `LUỒNG 02 · ĐẶT LẠI MẬT KHẨU MỚI (STEP 2)`.
2. Sau khi OTP đúng, giữ nguyên form chính với trường OTP và nút `auth-submit auth-submit-reset`; không thay form chính thành form password.
3. Kích hoạt countdown mã xác nhận trong LUỒNG 01.
4. Kích hoạt nút `GỬI LẠI NGAY`, nút `Mở ứng dụng Email` và nút `Đổi Email`.
5. Giữ API reset password chạy từ nút submit chính sau khi người dùng nhập password ở LUỒNG 02.

## 3. Thay đổi thực tế

### 3.1. Mật khẩu ở LUỒNG 02

- Form chính chỉ còn email và OTP khi `resetStep !== "request"`.
- Khi `resetStep === "reset-password"`, panel LUỒNG 02 render trực tiếp hai `AuthField`:
  - `password`
  - `confirmPassword`
- `PasswordStrength` cũng được chuyển vào LUỒNG 02.
- Các field vẫn dùng chung state và validation hiện có, nên nút submit chính vẫn có thể gọi `resetPassword()` với dữ liệu đã nhập ở panel bên phải.
- Trước khi OTP đúng, LUỒNG 02 hiển thị hướng dẫn mở khóa thay vì các field password.

### 3.2. Form chính sau OTP

Sau khi `verifyOTP()` thành công:

- `resetStep` chuyển thành `reset-password`.
- Form chính vẫn giữ field OTP.
- Nút `auth-submit auth-submit-reset` vẫn giữ vị trí và là hành động cập nhật mật khẩu.
- OTP được giữ trong state để truyền tiếp vào `resetPassword()`.

### 3.3. Countdown và resend

- Thêm `RESET_CODE_TTL_SECONDS = 300`.
- Sau `forgotPassword()` thành công, countdown bắt đầu từ `05:00`.
- Countdown giảm mỗi giây bằng `setInterval`, tự dừng ở `00:00`.
- `GỬI LẠI NGAY` bị khóa khi countdown còn thời gian hoặc đang request.
- Khi hết thời gian, nút resend hoạt động và gọi lại `forgotPassword()`.
- Resend thành công:
  - Reset countdown về 5 phút.
  - Xóa OTP đã nhập.
  - Xóa lỗi OTP.
  - Hiển thị notice mã mới đã được gửi.

### 3.4. Các nút LUỒNG 01

- `Mở ứng dụng Email` mở `mailto:` theo email hiện tại.
- `Đổi Email` đưa state về `request`, xóa OTP/password/confirm password và xóa lỗi.
- Các nút đều tôn trọng trạng thái `busy`.

## 4. API sequencing sau correction

| Trạng thái | Hành động | API |
|---|---|---|
| `request` | Gửi email | `POST /auth/forgot-password` |
| `verify-otp` | Xác nhận OTP | `POST /auth/verify-otp` |
| `reset-password` | Submit nút chính sau khi nhập password ở LUỒNG 02 | `POST /auth/reset-password` |
| Countdown hết | Gửi lại mã | `POST /auth/forgot-password` |

Không gọi `resetPassword()` từ nút resend hoặc khi OTP chưa được xác minh.

## 5. CSS đã cập nhật

Đã thêm style cho:

- `.auth-recovery-password-form`
- `.auth-recovery-locked-note`

Các trạng thái `.is-active`, `.is-complete`, `.is-locked` của panel vẫn được giữ để phân biệt tiến trình.

## 6. Kiểm tra đã thực hiện

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| TypeScript compile | PASS | `npm run build` |
| Vite production build | PASS | Bundle tạo thành công |
| ESLint AuthPage | PASS | `npx eslint src/pages/auth/AuthPage.tsx` |
| Countdown implementation | PASS ở source | State, interval cleanup và reset TTL đã có |
| Resend handler | PASS ở source | Gọi `forgotPassword`, reset OTP/countdown |
| Password fields ở LUỒNG 02 | PASS ở source | `AuthField` chỉ render trong panel step 2 |
| Nút chính giữ nguyên sau OTP | PASS ở source | Form chính vẫn có OTP và submit button |
| Runtime API | NOT_VERIFIED | Chưa chạy backend/SMTP |
| Browser interaction | NOT_VERIFIED | Chưa replay flow trên trình duyệt |
| Accessibility runtime | NOT_VERIFIED | Chưa kiểm tra focus/announcement thực tế |

Build vẫn có các cảnh báo có sẵn về Browserslist/caniuse-lite và bundle size; không có lỗi compile hoặc lint.

## 7. Tuân thủ Stitch và giới hạn

- Không chỉnh sửa artifact Stitch.
- Giữ nguyên bố cục Cosmic Graffiti và cấu trúc hai cột.
- Thay đổi chỉ phục vụ behavior được yêu cầu.
- Countdown hiện dùng TTL 5 phút, khớp thông báo backend trong source auth.
- Nút `Mở ứng dụng Email` phụ thuộc trình duyệt/hệ điều hành có handler `mailto:`.
- Chưa kiểm tra thực tế resend, OTP hết hạn, SMTP và database consume OTP.

## 8. Kết luận

Correction đã đáp ứng yêu cầu source-level: password/confirm password nằm trong LUỒNG 02, form chính vẫn giữ giao diện OTP và nút submit sau verify, countdown/resend và các nút LUỒNG 01 đã được kích hoạt.

Kết luận: **ĐẠT CÓ ĐIỀU KIỆN**; cần browser/API runtime verification trước khi đánh dấu A11 hoàn tất.

