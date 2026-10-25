# A11 — Báo cáo triển khai luồng Reset Password

## 1. Thông tin phiên

| Trường | Giá trị |
|---|---|
| Mã màn hình | A11 |
| Tên màn hình | Quên mật khẩu & đặt lại mật khẩu |
| Stitch project ID | `10374042969343935993` |
| Stitch screen ID | `5d922b967e394167982a27a2dc35f31c` |
| Route | `/auth/reset-password` |
| Thời gian | 2026-10-25 17:27:53 (Asia/Ho_Chi_Minh) |
| Loại hành động | Triển khai logic frontend và xác minh build/lint |
| Kết quả | ĐẠT CÓ ĐIỀU KIỆN |

## 2. Phạm vi và nguồn thiết kế

Triển khai theo kế hoạch tại [`A11_20261025_172527_reset_flow_plan.md`](./A11_20261025_172527_reset_flow_plan.md).

Artifact Stitch A11 được giữ nguyên. Phiên này chỉ cập nhật logic React, trạng thái hiển thị, thông báo lỗi và CSS trạng thái cho frontend; không chỉnh sửa thiết kế Stitch, backend route hoặc database.

## 3. Thay đổi đã thực hiện

### 3.1. State machine ba bước

Trong `client/src/pages/auth/AuthPage.tsx`, state `sent` được thay bằng:

```ts
type ResetStep = "request" | "verify-otp" | "reset-password";
```

Mapping thực tế:

| State | Form hiển thị | Aside |
|---|---|---|
| `request` | Email | Ẩn |
| `verify-otp` | Email disabled + OTP 6 chữ số | Hiện, LUỒNG 01 active |
| `reset-password` | Mật khẩu mới + xác nhận | Hiện, LUỒNG 02 active |

### 3.2. API sequencing

Đã chuyển logic submit reset thành:

1. `request` gọi `authService.forgotPassword({ email })`.
2. `verify-otp` gọi `authService.verifyOTP({ email, otp })`.
3. `reset-password` gọi `authService.resetPassword({ email, otp, newPassword, confirmPassword })`.

Do đó `resetPassword()` không còn được gọi ngay sau khi người dùng nhập OTP; chỉ được gọi sau khi API xác minh OTP thành công.

### 3.3. Hiển thị panel theo trạng thái

- `auth-recovery-aside` chỉ được render khi `resetStep !== "request"`.
- LUỒNG 01 nhận class `is-active` khi đang chờ OTP và `is-complete` sau khi OTP hợp lệ.
- LUỒNG 02 nhận class `is-locked` trước khi OTP hợp lệ và `is-active` sau đó.
- Nút “Đổi Email” đưa state về `request`, xóa OTP/mật khẩu/xác nhận và xóa lỗi hiện tại.

### 3.4. Thông báo lỗi

Đã bổ sung:

- Lỗi email rỗng/sai định dạng.
- Lỗi OTP rỗng hoặc không đúng 6 chữ số.
- Fallback lỗi riêng cho gửi OTP, xác minh OTP và cập nhật mật khẩu.
- `auth-alert` có `role="alert"` và `aria-live="assertive"`.
- Lỗi API không làm chuyển bước; `finally` luôn mở lại form sau khi request kết thúc.

Thông báo lỗi backend hiện vẫn ưu tiên `message(error)` theo helper chung của repository; fallback cụ thể chỉ dùng khi error không cung cấp message.

### 3.5. CSS

Trong `client/src/pages/auth/auth.css` đã thêm:

- `.auth-recovery-panel.is-complete`
- `.auth-recovery-panel.is-active`
- `.auth-recovery-panel.is-locked`

Các token màu, bố cục và breakpoint A11 hiện có được giữ nguyên.

## 4. API đã xác minh

Đã đối chiếu source backend:

| Method | Route | Mục đích | Source |
|---|---|---|---|
| POST | `/auth/forgot-password` | Gửi mã OTP | `server/src/app.ts` |
| POST | `/auth/verify-otp` | Xác minh OTP | `server/src/app.ts` |
| POST | `/auth/reset-password` | Đổi mật khẩu và consume OTP | `server/src/app.ts` |

`authService.verifyOTP()` đã có sẵn và được kết nối vào bước xác minh.

Chưa gọi API bằng môi trường runtime trong phiên này; vì vậy status code thực tế, email SMTP, lỗi OTP hết hạn và hành vi database thực tế chưa được đánh dấu PASS.

## 5. Tiêu chí đã kiểm chứng

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| State ba bước tồn tại | PASS | `AuthPage.tsx` dùng `ResetStep` |
| Ẩn aside trước khi gửi email | PASS ở source | JSX điều kiện `resetStep !== "request"` |
| Chỉ hiển thị OTP ở bước xác minh | PASS ở source | Nhánh `resetStep === "verify-otp"` |
| Chỉ hiển thị password sau OTP đúng | PASS ở source | Nhánh `resetStep === "reset-password"` |
| API đúng thứ tự | PASS ở source | `forgotPassword` → `verifyOTP` → `resetPassword` |
| Lỗi có vùng announcement | PASS ở source | `auth-alert` có `role` và `aria-live` |
| TypeScript compile | PASS | `npm run build` |
| Production bundle | PASS | Vite build hoàn tất |
| Lint AuthPage | PASS | `npx eslint src/pages/auth/AuthPage.tsx` |
| Runtime API | NOT_VERIFIED | Chưa khởi chạy backend/API smoke test |
| Browser interaction | NOT_VERIFIED | Chưa chạy browser automation cho ba bước |
| Accessibility thực tế | NOT_VERIFIED | Chưa kiểm tra bằng trình đọc màn hình/focus runtime |

## 6. Kết quả kiểm tra

### Build

Lệnh:

```text
cd client
npm run build
```

Kết quả: thành công, `tsc -b` và `vite build` đều hoàn tất.

Có cảnh báo nền tảng đã tồn tại:

- `baseline-browser-mapping` đã cũ.
- `caniuse-lite`/Browserslist đã cũ.
- Bundle JS lớn hơn ngưỡng 500 kB.

Các cảnh báo này không làm build thất bại và không thuộc phạm vi thay đổi A11.

### Lint

Lệnh:

```text
cd client
npx eslint src/pages/auth/AuthPage.tsx
```

Kết quả: thành công, không có lỗi.

## 7. Tuân thủ Stitch

- Không gọi công cụ chỉnh sửa Stitch.
- Không thay đổi artifact Stitch A11.
- Giữ nguyên bố cục, màu sắc, typography và các panel A11 hiện có ngoài class trạng thái cần cho logic.
- Thay đổi được giới hạn trong hành vi frontend mà người dùng yêu cầu.

## 8. Vấn đề còn tồn tại và giới hạn

1. Chưa có test tự động riêng cho AuthPage/reset flow trong thư mục `client/tests` hoặc `client/tests-mobile`.
2. Chưa xác minh runtime API bằng SMTP/backend đang chạy.
3. Countdown và resend OTP trong aside vẫn là UI có sẵn, chưa nằm trong phạm vi lần triển khai này.
4. Email A11 hiện khởi tạo bằng `A11_REFERENCE_EMAIL` theo code có sẵn; việc cho người dùng nhập email tùy ý chưa được thay đổi trong phiên này.
5. Browser review sau khi đổi state chưa được thực hiện; kết quả responsive trước đây vẫn là bằng chứng của phiên implementation cũ.
6. Thiết kế Stitch và các nhãn KYC/Token/hotline chưa được xác minh như cam kết nghiệp vụ thật.

## 9. Kết luận

Logic frontend đáp ứng yêu cầu chính: ẩn aside ở bước email, chỉ nhận OTP ở bước xác minh, chỉ hiển thị form đổi mật khẩu sau khi OTP hợp lệ, chuyển API reset password sang bước 2 và hiển thị lỗi cụ thể theo trạng thái.

Kết luận tổng thể: **ĐẠT CÓ ĐIỀU KIỆN**. Cần thực hiện runtime API smoke test, browser interaction test và accessibility verification trước khi đánh dấu A11 hoàn tất.

