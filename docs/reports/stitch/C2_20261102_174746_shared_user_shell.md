# Báo cáo dùng shared user shell cho trang chủ admin

## Thông tin phiên

- Màn hình liên quan: C2 — Quản lý khách hàng
- Project Stitch: `10374042969343935993` — EventHub
- Screen C2: `c1ed0c8be6404a3aa9193a0e9365cc85`
- Thời điểm: 2026-11-02 17:47:46 UTC+07
- Hành động: shared_user_shell

## Yêu cầu

- Trang chủ admin `/admin/stats` dùng lại `AuthHeader` và `AuthFooter` của user.
- Bổ sung mục `Quản trị` trong điều hướng header cho tài khoản ADMIN.
- Giữ C2 `/admin/users` với `AdminShell` theo thiết kế C2.

## Thay đổi đã thực hiện

- `App.tsx` nhận diện `/admin/stats` là admin home và dùng shared header/footer khi user đã xác thực.
- `AuthHeader.tsx` hiển thị link `Quản trị` khi user có role `ADMIN`.
- Không thay đổi API, route backend hoặc thiết kế Stitch.
- Không chuyển các route admin khác sang shared shell ngoài `/admin/stats`.

## Kết quả kiểm tra

| Tiêu chí | Trạng thái | Bằng chứng |
|---|---|---|
| Admin home dùng shared `AuthHeader` | PASS | `/admin/stats` được đưa vào nhánh shared shell |
| Admin home dùng shared `AuthFooter` | PASS | `/admin/stats` được đưa vào nhánh shared footer |
| Link `Quản trị` chỉ hiển thị cho ADMIN | PASS | Kiểm tra role `ADMIN` trong `AuthHeader` |
| C2 giữ `AdminShell` | PASS | `/admin/users` vẫn là `isC2Page` riêng |
| TypeScript/Vite build | PASS | `npm --prefix client run build` |
| ESLint client | PASS | `npm --prefix client run lint` |
| Browser runtime/responsive | NOT_VERIFIED | Chưa có browser page authenticated được chia sẻ |

## API và giới hạn

- Không có API mới hoặc API thay đổi trong phiên.
- Header/footer dùng dữ liệu user session hiện có.
- Chưa xác minh trực tiếp bằng browser ở desktop/mobile.

## Kết luận

`ĐẠT CÓ ĐIỀU KIỆN`: đã triển khai đúng phạm vi và build/lint đạt; browser runtime chưa xác minh.
