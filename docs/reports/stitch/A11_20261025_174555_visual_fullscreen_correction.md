# A11 — Correction: logo, hourglass countdown và trạng thái nút

## 1. Thông tin phiên

| Trường | Giá trị |
|---|---|
| Mã màn hình | A11 |
| Tên màn hình | Quên mật khẩu & đặt lại mật khẩu |
| Stitch project ID | `10374042969343935993` |
| Stitch screen ID | `5d922b967e394167982a27a2dc35f31c` |
| Route | `/auth/reset-password` |
| Thời gian | 2026-10-25 17:45:55 (Asia/Ho_Chi_Minh) |
| Loại hành động | Correction giao diện theo ảnh tham chiếu |
| Trạng thái | ĐẠT CÓ ĐIỀU KIỆN |

## 2. Yêu cầu đã xử lý

1. Thêm logo/biểu tượng phía trên tiêu đề `QUÊN MẬT KHẨU?`.
2. Thêm biểu tượng đồng hồ cát trước dòng countdown `GỬI LẠI MÃ SAU`.
3. Cho đồng hồ cát xoay theo chiều kim đồng hồ trong thời gian countdown còn hiệu lực.
4. Làm vùng nội dung reset tận dụng chiều cao màn hình.
5. Đổi màu nút `Mở ứng dụng Email` và `Đổi Email` khi đang hoạt động.

## 3. Thay đổi đã thực hiện

### Logo tiêu đề

Trong `AuthPage.tsx`, reset page render `Ticket` icon trong `.auth-recovery-title-mark` ngay trước `h1.auth-title`.

CSS tạo:

- Ô logo 54x54.
- Viền cyan.
- Nền gradient cyan/tím.
- Glow đồng bộ token Cosmic Graffiti.

### Đồng hồ cát

Đã dùng `Hourglass` từ `lucide-react` trước text countdown.

Khi countdown còn lớn hơn 0, icon nhận class `is-counting` và animation:

```css
@keyframes auth-hourglass-spin {
  to {
    transform: rotate(360deg);
  }
}
```

Animation tuân theo rule `prefers-reduced-motion` hiện có của auth shell.

### Lấp đầy vùng màn hình

`.auth-shell-reset .auth-main-reset` được bổ sung:

```css
min-height: calc(100vh - 82px);
align-items: stretch;
```

Grid recovery tiếp tục dùng toàn bộ chiều rộng khả dụng trong giới hạn layout hiện tại và vẫn có breakpoint mobile.

### Màu button khi active

- `GỬI LẠI NGAY` khi countdown về `00:00`:
  - Gradient cyan/tím.
  - Chữ tối.
  - Glow cyan.
- `Mở ứng dụng Email` khi không busy:
  - Nền cyan trong suốt.
  - Viền cyan.
  - Chữ cyan.
- `Đổi Email` khi không busy:
  - Nền tím trong suốt.
  - Viền tím.
  - Chữ tím sáng.

Khi disabled, style disabled cũ vẫn được giữ để thể hiện trạng thái không thao tác.

## 4. Tiêu chí xác minh

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Logo nằm phía trên tiêu đề reset | PASS ở source | `.auth-recovery-title-mark` trước `h1` |
| Hourglass nằm trước countdown | PASS ở source | `Hourglass` trong `.auth-recovery-resend` |
| Hourglass xoay khi countdown chạy | PASS ở source | `.is-counting` + keyframes |
| Nút active có màu riêng | PASS ở source | `:not(:disabled)` selectors |
| Khu vực reset có min-height viewport | PASS ở source | `min-height: calc(100vh - 82px)` |
| Responsive rule hiện có vẫn giữ | PASS ở source | Breakpoints 960px/640px không bị xóa |
| TypeScript/build | PASS | `npm run build` |
| ESLint AuthPage | PASS | `npx eslint src/pages/auth/AuthPage.tsx` |
| Browser visual review | NOT_VERIFIED | Chưa chụp lại sau correction |
| Runtime countdown | NOT_VERIFIED | Chưa replay timer trong browser |

Build có các cảnh báo nền tảng sẵn có về Browserslist/caniuse-lite và bundle size; không có lỗi compile/lint.

## 5. Tuân thủ Stitch

- Không chỉnh sửa artifact Stitch.
- Ảnh người dùng cung cấp được dùng làm tham chiếu trực quan cho correction.
- Không thay đổi API, state machine hay hợp đồng backend trong phiên này.
- Giữ token Cosmic Graffiti và rule reduced-motion hiện có.

## 6. Giới hạn còn lại

- Chưa chạy browser review ở desktop/mobile sau correction.
- Chưa xác minh animation thực tế với timer chạy trong trình duyệt.
- Chưa xác minh layout trên mọi tỷ lệ màn hình.
- Runtime API/SMTP vẫn chưa được kiểm tra.

## 7. Kết luận

Các yêu cầu giao diện đã được triển khai ở source và build/lint đạt. Kết luận: **ĐẠT CÓ ĐIỀU KIỆN**, chờ browser visual review và runtime verification.

