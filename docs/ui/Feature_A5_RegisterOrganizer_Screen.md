# Feature_A5_RegisterOrganizer_Screen — Kế hoạch thực hiện lại màn hình A5

**Mục tiêu:** Tái hiện màn hình "Đăng ký Ban Tổ Chức & Xét duyệt hồ sơ" (A5, Stitch ID 5257666c32e1487687c8f44957e784e2) theo đúng thiết kế trên Stitch project 10374042969343935993 (EventHub, Cosmic Graffiti).
**Phạm vi:** Chỉ tạo/tài liệu hóa kế hoạch. KHÔNG chỉnh sửa code frontend/backend, không chỉnh sửa màn hình khác, không gọi edit-screen để sửa trên Stitch.

## Thông tin tham chiếu
- Stitch Project ID: 10374042969343935993`r
- Màn hình A5: 5257666c32e1487687c8f44957e784e2`r
- Kích thước: 2560 × 5256 px (DESKTOP)
- Design System: Cosmic Graffiti (DARK), Primary #7C3AED, Secondary #22D3EE, Tertiary #F472B6, Headline Syne, Body Be Vietnam Pro, Label Space Grotesk`r
- Master Plan: docs/PROJECT_MASTER_PLAN.md (5.1 A5)
- API: GET/POST /me/organizer-applications, GET/POST /admin/organizer-applications/:id/review`r
- Ảnh tham chiếu: https://res.cloudinary.com/qncrpmrb/image/upload/v1793090528/795256f4-8bf1-4556-8e61-23bc211b2600.png

## Trạng thái hiện tại
- client/src/pages/account/Profile.tsx: chưa có form đăng ký tổ chức trong trang Profile. Chức năng liên quan xử lý ở Admin.
- client/src/pages/account/profile.css: style cosmic nhưng layout khác với A5.
- Backend routes đã tồn tại.

## Đánh giá gaps
- Vị trí/luồng UI: cần đưa form vào đúng vị trí theo thiết kế Stitch A5
- Form đăng ký tổ chức với các trường cần thiết
- Hiển thị trạng thái đơn (chờ duyệt/đã duyệt/bị từ chối)
- Đồng bộ UI với Cosmic Graffiti theo đúng layout A5

## Kế hoạch thực hiện
1. Tải HTML và screenshot từ Stitch screen A5
2. Phân tích chi tiết so sánh với Profile.tsx hiện tại
3. Tạo báo cáo review mới trong docs/reports/stitch/ (không ghi đè)
4. Cập nhật docs/PROJECT_MASTER_PLAN.md (mục 5.1 A5 và mục 5.4)

**Lưu ý:** KHÔNG chỉnh sửa code, KHÔNG chỉnh sửa màn hình khác, KHÔNG gọi edit-screen. Chỉ tạo tài liệu. Sử dụng ảnh tham chiếu đã cung cấp.
