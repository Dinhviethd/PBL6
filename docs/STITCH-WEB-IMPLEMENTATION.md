# Áp dụng giao diện Stitch cho web

Ngày: 21/10/2026. Branch: `codex/stitch-web-integration`, tạo từ `Huy`.

## Phần đã triển khai

- Theme nền tối, nhấn tím, màu trạng thái, border và focus thống nhất cho toàn bộ web. Token semantic dùng chung với lớp Tailwind/Radix.
- Font Be Vietnam Pro tự lưu trong `client/public/fonts`, gồm giấy phép OFL; không gọi Google Fonts khi chạy.
- Component `EventCover`, `FeaturedEvent`, `EventCard`, `BookingSteps` trong `event-visuals.tsx`.
- Hero lấy sự kiện đầu tiên từ kết quả API hiện tại. Không coi đây là tính năng biên tập sự kiện nổi bật. Dữ liệu trống/lỗi dùng nội dung giới thiệu chung; ảnh thiếu/lỗi dùng nền dự phòng.
- Grid sự kiện responsive, tổng kết quả thật, CTA Organizer điều hướng vào khu quản lý hoặc hồ sơ xin quyền Organizer.
- Chi tiết sự kiện dùng ảnh cover riêng với metadata dễ đọc; nút tăng/giảm và ô chọn số lượng có tên truy cập riêng, giữ giới hạn tồn kho và idempotency tạo đơn.
- Checkout có tiến trình đặt vé; giữ hạn giữ chỗ, trạng thái demo/VNPay, polling và kiểm tra URL của luồng hiện hữu.
- Vé điện tử có vùng QR trắng; trang nhân viên check-in độc lập, camera/nhập mã và phản hồi từ server. Form, bảng, KPI, tab quản lý, auth, thông báo và hồ sơ cùng theme.
- API, schema database, quyền truy cập và app Expo giữ hợp đồng hiện có.

## Kiểm thử

Build client, lint và `git diff --check` đã qua. Lệnh kiểm tra code:

```powershell
npm run build --prefix client
npm run lint --prefix client
```

Bộ UI tự khởi động Vite cổng 5174 và mock API, không cần DB:

```powershell
# Lần đầu nếu chưa cài Chromium:
npx --prefix client playwright install chromium
npm run test:ui --prefix client
```

Nếu chạy trong môi trường Windows sandbox dùng sai cache trình duyệt, đặt `PLAYWRIGHT_BROWSERS_PATH` vào thư mục Chromium đã cài trên máy. Sandbox có thể chặn localhost; khi đó chạy kiểm thử trong terminal thường.

Bộ UI gồm `stitch-web.spec.ts`, `notifications-ui.spec.ts`, `vnpay-ui.spec.ts`: **13/13 test đã qua** (29,2 giây, Chromium). Bao phủ filter thật ở lớp request, ảnh lỗi, layout 1440/1024/768/390px, giới hạn số lượng, payload đơn và idempotency, checkout, QR, phân quyền Admin, nhập mã check-in thành công/trùng/sai, VNPay thất bại/đối soát/URL không tin cậy và thông báo. Ảnh QA lưu trong `.local/qa/stitch-*.png`; đây là dữ liệu giả lập, QR trong fixture chỉ kiểm tra hiển thị. Đã xem trực tiếp ảnh trang khám phá desktop/mobile, chi tiết mobile, QR mobile và Admin desktop.

`mvp.spec.ts`, `checkin-staff.spec.ts` và `session-isolation.spec.ts` cần API/database thật, không thuộc `test:ui`. Chưa nghiệm thu lại các suite đó trên DB test riêng; chưa nghiệm thu camera trên thiết bị thật. Bộ UI không thay thế kiểm thử tích hợp thanh toán hoặc phân quyền backend.

## Giới hạn so với prototype

Đây là áp dụng thiết kế lên nghiệp vụ EventHub hiện có. Không thêm các chức năng chỉ có nội dung mẫu: coupon, phụ phí/VAT, MoMo/thẻ, ghế/cổng vào, QR đổi theo chu kỳ, SMS/email phát hành vé, chuyển quyền vé hoặc số liệu thời gian thực.

Dashboard đã đồng bộ theme, KPI, bảng và tab theo dữ liệu hiện có; chưa xác nhận khớp từng chi tiết màn 04 trong Stitch và không thêm biểu đồ thiếu dữ liệu. Tên sản phẩm giữ EventHub. Kế hoạch khảo sát gốc ở `STITCH-WEB-INTEGRATION-PLAN.md`.

Build có cảnh báo dữ liệu Browserslist/baseline cũ và bundle JS lớn hơn 500 kB; đây cũng là cảnh báo của baseline trước thay đổi. Chưa thay dependency hoặc tách bundle trong đợt giao diện.
