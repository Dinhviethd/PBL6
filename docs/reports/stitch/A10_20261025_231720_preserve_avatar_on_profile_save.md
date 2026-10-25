# Báo cáo phiên A10 — Giữ nguyên avatar khi lưu hồ sơ

## 1. Định danh

- **Màn hình:** A10 — Hồ sơ cá nhân
- **Stitch project:** `10374042969343935993`
- **Stitch screen:** `2ffc6d2afffe4e98928685030e86b1c8`
- **Route:** `/profile`
- **Thời điểm:** 2026-10-25 23:17:20 (UTC+07:00)
- **Loại hành động:** Sửa payload lưu thông tin cá nhân

## 2. Vấn đề

Khi nhấn “Lưu thay đổi”, request cập nhật thông tin cá nhân có thể làm
`avatarUrl` bị trả về `null`, dù người dùng không thay đổi avatar.

## 3. Thao tác đã thực hiện

- Giữ nguyên việc chỉ cho phép form này cập nhật họ tên và số điện thoại.
- Bổ sung `avatarUrl` hiện tại vào payload để backend giữ nguyên ảnh đại diện:
  - ưu tiên `avatarUrl` local state;
  - fallback về `user.avatarUrl`;
  - chỉ dùng `null` khi tài khoản thực sự chưa có avatar.
- Không sửa backend.
- Không thay đổi luồng upload avatar: `POST /api/media` → `PATCH /api/me` →
  `GET /api/auth/me`.
- Không gửi email lên API vì trường Email vẫn disabled/read-only.
- Không chỉnh sửa Stitch hoặc màn hình khác.

## 4. Tiêu chí rà soát

| Tiêu chí | Kết quả |
|---|---|
| Lưu họ tên/số điện thoại vẫn hoạt động | PASS — giữ `PATCH /api/me` |
| Avatar hiện tại không bị xóa khi lưu hồ sơ | PASS — gửi lại URL hiện tại |
| Không sửa backend | PASS |
| Email không được cập nhật | PASS |
| Avatar upload vẫn tự lưu riêng | PASS |
| Stitch artifact không thay đổi | PASS — không gọi `edit_screens` |
| Runtime authenticated | NOT_VERIFIED — browser chưa có phiên đăng nhập |

## 5. Kiểm thử

- `npm --prefix client run build` — chạy sau cập nhật.
- `npm --prefix client run lint` — chạy sau cập nhật.
- `git diff --check` — chạy sau cập nhật.
- Chưa thể kiểm tra request thực tế trên browser authenticated.

## 6. Kết luận

- **Frontend:** đã bảo toàn `avatarUrl` khi lưu thông tin cá nhân.
- **Kết quả:** `ĐẠT CÓ ĐIỀU KIỆN`; runtime authenticated chưa đủ bằng chứng.
