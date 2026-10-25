# A11 — Correction: chuyển nút cập nhật mật khẩu vào LUỒNG 02

## 1. Thông tin phiên

| Trường | Giá trị |
|---|---|
| Mã màn hình | A11 |
| Tên màn hình | Quên mật khẩu & đặt lại mật khẩu |
| Stitch project ID | `10374042969343935993` |
| Stitch screen ID | `5d922b967e394167982a27a2dc35f31c` |
| Route | `/auth/reset-password` |
| Thời gian | 2026-10-25 17:39:21 (Asia/Ho_Chi_Minh) |
| Loại hành động | Correction vị trí nút submit LUỒNG 02 |
| Trạng thái | ĐẠT CÓ ĐIỀU KIỆN |

## 2. Yêu cầu

Chuyển nút `CẬP NHẬT MẬT KHẨU & ĐĂNG NHẬP` khỏi form chính sang panel:

```text
LUỒNG 02 · ĐẶT LẠI MẬT KHẨU MỚI (STEP 2)
```

Nút xác nhận OTP ở form chính vẫn giữ nguyên khi `resetStep === "verify-otp"`.

## 3. Thay đổi đã thực hiện

### Form chính

- Đặt `id="auth-form"` cho form xác thực chung.
- Nút submit chính vẫn hiển thị ở:
  - Login.
  - Register.
  - Reset bước nhập email.
  - Reset bước xác nhận OTP.
- Nút submit chính bị ẩn ở `resetStep === "reset-password"` để tránh hiển thị trùng.

### LUỒNG 02

Khi `resetStep === "reset-password"`, panel LUỒNG 02 render:

- Mật khẩu mới.
- Xác nhận lại mật khẩu.
- Password strength.
- Nút `CẬP NHẬT MẬT KHẨU & ĐĂNG NHẬP`.

Nút dùng:

```html
type="submit"
form="auth-form"
```

Vì vậy nút nằm trong panel LUỒNG 02 về mặt giao diện nhưng vẫn submit đúng form React chính và tiếp tục gọi `authService.resetPassword()` qua logic hiện có.

### CSS

Thêm class:

```css
.auth-recovery-password-submit
```

Nút được đặt full width và giữ style `auth-submit-reset` hiện tại.

## 4. Tiêu chí xác minh

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Nút cập nhật nằm trong LUỒNG 02 | PASS ở source | JSX button nằm trong `auth-recovery-password-form` |
| Nút OTP vẫn ở form chính | PASS ở source | Nút chính chỉ ẩn ở bước `reset-password` |
| Không có hai nút update cùng lúc | PASS ở source | Điều kiện render theo `resetStep` |
| Nút LUỒNG 02 submit đúng form | PASS ở source | `form="auth-form"` |
| Giữ API reset password | PASS ở source | `submit()` vẫn xử lý `resetStep === "reset-password"` |
| TypeScript/build | PASS | `npm run build` |
| ESLint AuthPage | PASS | `npx eslint src/pages/auth/AuthPage.tsx` |
| Browser interaction | NOT_VERIFIED | Chưa replay click thực tế trên trình duyệt |
| Runtime API | NOT_VERIFIED | Chưa chạy backend/API smoke test |

## 5. Tuân thủ Stitch

- Không chỉnh sửa artifact Stitch.
- Không thay đổi bố cục ngoài việc chuyển nút theo yêu cầu nghiệp vụ/UI.
- Giữ nguyên token, typography và style nút reset hiện có.

## 6. Giới hạn

- Chưa kiểm tra browser runtime để xác minh submit button ngoài form hoạt động trên các trình duyệt mục tiêu.
- Chưa xác minh API reset password thực tế sau khi click nút trong LUỒNG 02.
- Build vẫn có cảnh báo cũ về Browserslist/caniuse-lite và bundle size; không có lỗi build/lint.

## 7. Kết luận

Nút cập nhật mật khẩu đã được chuyển vào đúng LUỒNG 02, trong khi nút xác nhận OTP vẫn giữ ở form chính. Kết luận source/build: **ĐẠT CÓ ĐIỀU KIỆN**.

