# B2 — Hiển thị ảnh đại diện tài khoản trên Organizer dashboard

- **Thời điểm:** 2026-10-31 23:20:12 UTC+7
- **Màn hình:** B2 — Quản lý sự kiện
- **Stitch:** project `10374042969343935993`, screen `b0bca491c8694c069de76d684bd55843`; không chỉnh sửa thiết kế.
- **Loại phiên:** nối avatar header với trường tài khoản hiện có.

## Thay đổi

`useAuth()` trả về `user` có `avatarUrl?: string` từ Auth store. Header trong `Organizer.tsx` nay hiển thị `<img>` từ URL này; nếu tài khoản chưa có URL thì giữ avatar chữ cái đầu tên và fallback `B`. Ảnh được crop bằng `object-fit: cover`, bo tròn và giới hạn trong khung avatar hiện tại.

Không thêm API, trường dữ liệu, component hay thay đổi layout. `alt=""` vì tên tài khoản đã hiển thị ngay cạnh avatar.

## Xác minh và giới hạn

- Đối chiếu kiểu `User.avatarUrl` trong `client/src/features/auth/stores/authStore.ts`; trang Profile/AuthHeader cũng đang dùng URL avatar tài khoản.
- Thay đổi chỉ gồm JSX và CSS ở B2. Chưa chạy build hoặc browser; trạng thái ảnh khi URL lỗi chưa kiểm tra.
- Không chỉnh sửa backend, DB, Stitch hoặc màn hình khác.

## Master Plan

Đã cập nhật ma trận tích hợp mục 4, trạng thái B2 ở mục 5.2 và review B2 ở mục 5.4 để ghi nhận avatar tài khoản và giới hạn chưa build/browser kiểm chứng; thêm thời điểm và report phiên này. Không thay đổi kết luận của màn hình khác.
