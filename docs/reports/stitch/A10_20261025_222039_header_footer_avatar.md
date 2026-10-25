# Báo cáo phiên Stitch — A10 — Header, footer và avatar

## 1. Thông tin phiên

- **Mã/tên:** A10 — Hồ sơ cá nhân
- **Stitch Project ID:** `10374042969343935993`
- **Stitch Screen ID:** `2ffc6d2afffe4e98928685030e86b1c8`
- **Thời điểm:** 2026-10-25 22:20 (Asia/Ho_Chi_Minh)
- **Loại hành động:** cập nhật frontend theo artifact Stitch và ảnh tham chiếu

## 2. Yêu cầu đã xử lý

- Bổ sung header/hero và footer phù hợp nội dung A10.
- Copy/cập nhật nội dung theo bản thiết kế: EventHub, hồ sơ cá nhân, bảo mật Cyber, đồng bộ thời gian thực, hồ sơ công khai.
- Thêm icon và animation nhẹ.
- Đổi màu chữ/phân cấp cho ngày tham gia và số sự kiện đã dự.
- Tăng khung avatar.
- Cho phép chọn avatar ngay tại nút camera nhỏ trên avatar.
- Không gọi `edit_screens`, không thay đổi Stitch hoặc màn hình khác.

## 3. Xác minh Stitch

Đã đọc Master Plan trước khi gọi Stitch và gọi lại:

`projects/10374042969343935993/screens/2ffc6d2afffe4e98928685030e86b1c8`

Artifact vẫn trả về:

- Tên: `A10. Hồ sơ cá nhân - Cosmic Ticket`
- Thiết bị: `DESKTOP`
- Kích thước: `2560 × 4002`
- Screenshot/HTML artifact tồn tại.

Không gọi `edit_screens`; thiết kế Stitch được giữ nguyên.

## 4. API và tích hợp

| Method/path | Mục đích | Trạng thái |
|---|---|---|
| `GET /api/auth/me` | `createdAt`, thông tin profile | Contract đã xác minh; browser chưa authenticated |
| `GET /api/me/tickets` | Đếm số sự kiện đã dự cạnh ngày tham gia | Contract đã xác minh; dùng `tickets.data.length`; browser chưa authenticated |
| `PATCH /api/me` | Lưu profile và avatar URL sau upload | Giữ nguyên tích hợp |
| `POST /api/media` | Upload ảnh qua field `image` | Giữ nguyên, nút camera nhỏ và nút chọn file đều dùng chung callback |
| `POST /api/me/password` | Đổi mật khẩu | Giữ nguyên tích hợp |

Backend không bị chỉnh sửa.

## 5. Thay đổi thực tế

### [Profile.tsx](../../client/src/pages/account/Profile.tsx)

- Thêm logo EventHub ở hero và footer.
- Thêm footer A10 gồm:
  - Tài khoản & khách hàng.
  - Chính sách & pháp lý.
  - Hỗ trợ 24/7.
  - Hotline, email, trung tâm điều phối, bản quyền.
- Thêm icon `CalendarDays`, `Ticket`, `Camera`, `KeyRound`, `UserRound`, `Mail`, `Phone`, `MapPin`, `Sparkles`.
- Thêm animation trạng thái xuất hiện trang và nhịp sáng nhẹ cho avatar.
- Tăng avatar từ 92px lên 126px.
- Bổ sung nút camera nhỏ phủ trên avatar; chọn file trực tiếp tại đó.
- Đồng bộ avatar đã upload với form cập nhật profile bằng state dùng chung.
- Thêm class route riêng trong `App.tsx` để ẩn footer dùng chung chỉ trên `/profile`, tránh render hai footer; các route khác giữ nguyên.

### [profile.css](../../client/src/pages/account/profile.css)

- Thêm animation `profile-enter` và `profile-pulse`.
- Thêm style avatar picker compact, footer responsive và các nhóm liên kết.
- Màu metadata:
  - Label ngày tham gia/sự kiện: `#94A3B8`.
  - Giá trị: `#F8FAFC`, font-weight 800.
  - Icon nhấn: cyan/purple theo Cosmic Graffiti.
- Giữ responsive layout cho mobile.

## 6. Kiểm thử và bằng chứng

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| `npm --prefix client run build` | PASS | TypeScript/Vite build thành công |
| `npm --prefix client run lint` | PASS | ESLint exit code 0 |
| Stitch artifact không đổi | PASS | `get_screen` trả đúng screen ID/artifact; không gọi edit |
| Browser route | PARTIAL | Browser vẫn đang ở màn login do không có phiên A10 authenticated |
| API dữ liệu thật | NOT_VERIFIED | Phiên browser trước nhận `401 Unauthorized` |
| Upload/avatar interaction | NOT_VERIFIED | Chưa có phiên đăng nhập để chọn/upload file thật |
| Responsive/accessibility runtime | NOT_VERIFIED | Chưa kiểm tra authenticated đa viewport/keyboard |

## 7. Review theo tiêu chí

| Tiêu chí | Kết quả | Nhận xét |
|---|---|---|
| Đúng project/screen | PASS | Đúng project và screen A10. |
| Nội dung | PASS có điều kiện | Header/footer, profile, bảo mật, ngày tham gia và số sự kiện đã dự đã có. |
| Bố cục | PASS có điều kiện | Footer responsive, hero và avatar lớn đã bổ sung; chưa browser-review authenticated. |
| Cosmic Graffiti | PASS có điều kiện | Giữ đúng nhóm màu nền/surface/tím/cyan/hồng và typography hiện có. |
| Ngôn ngữ/khả năng đọc | PASS có điều kiện | Nội dung tiếng Việt và nhãn theo ảnh; chưa đo tương phản runtime. |
| Điều hướng/nghiệp vụ | PARTIAL | API mapping giữ nguyên; upload thật chưa chạy. |
| Trạng thái UI | PARTIAL | Có loading/error cho ticket/upload; success runtime chưa xác minh. |
| Responsive/accessibility | NOT_VERIFIED | Chưa có bằng chứng authenticated trên nhiều viewport. |
| Tính nhất quán | PASS có điều kiện | Không ảnh hưởng màn hình khác; dùng style riêng A10. |

## 8. Vấn đề còn tồn tại

1. Browser chưa đăng nhập, nên chưa xác minh dữ liệu `createdAt`, số lượng vé và upload/avatar thật.
2. `GET /me/tickets?page=0` đếm số bản ghi trang hiện tại; chưa có bằng chứng backend trả tổng số sự kiện trên nhiều trang.
3. Header toàn cục của App vẫn được dùng; footer A10 bổ sung trong page để không thay đổi các màn hình khác.
4. Chưa xác minh animation/keyboard/accessibility runtime bằng browser authenticated.

## 9. Kết luận

- **Kết quả tổng thể:** `ĐẠT CÓ ĐIỀU KIỆN` cho cập nhật frontend; `CHƯA ĐỦ BẰNG CHỨNG` cho runtime review.
- **Tuân thủ Stitch:** Không chỉnh sửa Stitch, không tạo màn hình trùng lặp.
- **Code:** Chỉ chỉnh A10 và stylesheet A10.

## 10. Master Plan

Đã cập nhật:

- Trạng thái triển khai A10.
- Review gần nhất, vấn đề tồn tại, report mới nhất.
- Thời điểm cập nhật `2026-10-25 22:20`.
- Ghi chú giữ nguyên Stitch và giới hạn xác minh runtime.
