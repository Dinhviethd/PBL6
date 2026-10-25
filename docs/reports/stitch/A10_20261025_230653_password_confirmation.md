# Báo cáo phiên A10 — Xác nhận mật khẩu mới

## 1. Định danh

- **Màn hình:** A10 — Hồ sơ cá nhân
- **Stitch project:** `10374042969343935993`
- **Stitch screen:** `2ffc6d2afffe4e98928685030e86b1c8`
- **Route:** `/profile`
- **Thời điểm:** 2026-10-25 23:06:53 (UTC+07:00)
- **Loại hành động:** Bổ sung xác nhận mật khẩu và icon cho form bảo mật

## 2. Yêu cầu

- Thêm ô “Nhập lại mật khẩu mới”.
- Kiểm tra mật khẩu mới và mật khẩu nhập lại khớp nhau.
- Thêm icon trước các trường nhập mật khẩu.

## 3. Thao tác đã thực hiện

- Thêm `Field` `confirmPassword` với kiểu `password`.
- Gắn icon `KeyRound` cho:
  - Mật khẩu hiện tại.
  - Mật khẩu mới.
  - Nhập lại mật khẩu mới.
- Kiểm tra ở client trước khi gọi API; nếu không khớp, `ActionForm` hiển thị lỗi
  và không gửi request.
- Loại `confirmPassword` khỏi payload trước khi gọi `POST /api/me/password`.
- Giữ nguyên hành vi đăng xuất sau khi đổi mật khẩu thành công.
- Không chỉnh sửa Stitch hoặc màn hình khác.

## 4. Tiêu chí rà soát

| Tiêu chí | Kết quả |
|---|---|
| Có ô nhập lại mật khẩu mới | PASS |
| Kiểm tra hai mật khẩu khớp | PASS |
| Không gửi trường xác nhận lên API | PASS |
| Có icon trước cả ba trường mật khẩu | PASS |
| API đổi mật khẩu giữ đúng contract | PASS — gửi `currentPassword`, `newPassword` |
| Stitch artifact không thay đổi | PASS — không gọi `edit_screens` |
| Runtime authenticated | NOT_VERIFIED — browser chưa có phiên đăng nhập |

## 5. Kiểm thử

- `npm --prefix client run build` — chạy sau cập nhật.
- `npm --prefix client run lint` — chạy sau cập nhật.
- `git diff --check` — chạy sau cập nhật.
- Chưa kiểm tra request thực tế trên browser authenticated.

## 6. Kết luận

- **Frontend:** đã bổ sung xác nhận mật khẩu và validation trước API.
- **Kết quả:** `ĐẠT CÓ ĐIỀU KIỆN`; runtime authenticated chưa đủ bằng chứng.
