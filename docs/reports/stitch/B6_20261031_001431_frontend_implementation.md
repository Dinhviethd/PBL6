# B6 — Triển khai giao diện quản lý đơn hàng

- **Thời điểm:** bắt đầu ghi report 2026-10-31 00:14:31 UTC+7, cập nhật kết quả kiểm thử cuối 00:18:18 UTC+7; hành động: triển khai frontend và kiểm thử tích hợp.
- **Màn hình:** B6 — Quản lý đơn hàng, Organizer; route `/organizer/events/:id/orders`.
- **Stitch:** project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`, DESKTOP 2560×3158; HTML file `7004176431460157052`, screenshot file `8369068700193780000` (ảnh tải 1920×2368). Phiên này gọi `get_project`, `get_screen`, `download_file` và xem HTML/ảnh. Không gọi `edit_screens`, không sửa thiết kế Stitch.
- **Nguồn yêu cầu:** Master Plan mục 2.3, 4 dòng 13, 5.2 B6, 5.4 B6; `docs/ui/Feature_B6_OrderManager.md` mục 11–14. Scope đã được người dùng chốt: KPI/count tabs, ngày/email, bảng đầy đủ, preview/in QR; sidebar Organizer dùng chung; JSX và CSS riêng trong một TSX. Các action export, resend, VAT, refund, reconcile, webhook log, provider/phone filter và Escrow nằm ngoài phạm vi.
- **Trạng thái trước phiên:** backend hai GET mới đã qua HTTP trên DB test; route frontend vẫn dùng `Operations.tsx`, không có B6 riêng, mã đơn dẫn tới buyer Checkout; UI `NEEDS_REVIEW`. Backend cổng local 8000 chưa deploy API mới.

## Tiêu chí nghiệm thu áp dụng

Giao diện bám bố cục và palette Stitch cho header, event switcher, 5 KPI, tabs, filter, bảng, pager, preview vé. Dữ liệu phải từ API thật; quyền Organizer/ADMIN; không gắn Checkout vào đơn Organizer. Tìm email/ngày, đổi tab, pagination, empty/loading/error, preview QR và in phải dùng contract đã xác minh. Bảng mobile xem hết cột bằng cuộn ngang. Không thêm CSS file riêng hoặc sidebar mới.

## Thao tác đã thực hiện

1. Thêm `client/src/pages/organizer/OrderManagerPage.tsx`. JSX và toàn bộ CSS riêng B6 ở một file, selector `.b6-*`; tái sử dụng `OrganizerSidebar active="Đơn hàng"` và shell hiện có. Trang có header, selector sự kiện, năm KPI, bốn tab có counts, tìm mã/tên/email, lọc ngày UTC+7, bảng đơn enriched, 50/trang, preview vé QR thật và in A4 bằng CSS print.
2. Sửa đúng route B6 trong `client/src/App.tsx`: route `/organizer/events/:id/orders` đứng trước `:tab`, dùng Guard Organizer/ADMIN, nhận shell Organizer. Không sửa `Operations` hoặc các màn hình khác.
3. Bỏ các nội dung mẫu không có nguồn thật trong Stitch: số KPI 2025, xu hướng/kỳ thanh toán mẫu, MoMo/Visa giả, refund/reconcile/webhook log, resend/VAT/export/advanced filter. Không đưa nội dung giả vào trang để lấp chỗ. Nhãn “Đã đóng” thể hiện CANCELLED/EXPIRED theo contract, không diễn giải là lỗi payment/hoàn tiền.
4. Mở rộng bài test B6 hiện có với nhánh `B6_UI=1`: chạy Vite 5177 qua proxy tới API build mới trên cổng động, đăng nhập Organizer bằng UI thật và kiểm tra 1440/1024/768/390 px; thêm đổi qua lại giữa hai event, xác minh lệnh in, CSS print và PDF buffer. Ảnh runtime đã xem ở 1440/768/390, ảnh 1024 được sinh trong bài test; ảnh nằm ở thư mục Temp trong lúc review và được xóa sau phiên; không lưu QR/token vào report.

## API đã xác minh và kết quả tích hợp

| API | Bằng chứng |
|---|---|
| `GET /api/organizer/events/:eventId/order-manager` | Source route `server/src/app.ts`, bảo vệ bằng auth/event guard; test HTTP PostgreSQL cô lập trả 200 owner, 401 guest, 403 Organizer khác/buyer; frontend lấy summary/counts/items/pagination thật. Browser test đạt KPI, tab, email search, ngày và empty. |
| `GET /api/organizer/events/:eventId/orders/:orderId/tickets` | Test HTTP trả QR PNG thật, giải mã đúng token vé đã phát hành; browser tải khi chọn đơn, in gọi lại API trước khi `window.print`; pending/review409, VOID không có QR trong API test. |
| `GET /api/organizer/events/:id`, `GET /api/organizer/events?page=&limit=` | Đã có route; browser tải event và selector qua API test, đổi qua event thứ hai không có đơn rồi về event đầu PASS. |

Test frontend chạy với PostgreSQL 17 Docker riêng `eventhub_b6_test`, backend test khởi tạo từ `server/dist`, Vite 5177 proxy tới backend đó. Không dùng DB Live/Supabase. `client/.env.local` và runtime Vite 5173 của người dùng giữ nguyên. Kiểm tra không xác thực ở `127.0.0.1:8000/api/organizer/events/<uuid>/order-manager` trả **404**: cổng 8000 hiện chưa phục vụ API mới. Do đó chưa ghi tích hợp đã deploy tại cổng thường dùng.

## Kiểm thử và rà soát

| Tiêu chí | Kết quả |
|---|---|
| Nội dung/chức năng được chọn | **PASS trên môi trường cô lập**: KPI/counts, q/email, ngày, bảng, tab, đổi event, preview/in; không có dữ liệu mẫu. Scope API biên còn theo report backend trước. |
| Bố cục và Cosmic Graffiti | **PARTIAL**: vùng sidebar/header/5 KPI/filter/bảng/preview, nền và màu theo HTML/ảnh B6; các vùng ngoài scope đã bỏ theo quyết định. Ảnh runtime 1440/768/390 đã xem, 1024 có test layout; chưa đo pixel. |
| Ngôn ngữ/trạng thái nghiệp vụ | **PASS trong luồng đã thử**: số tiền VND, giờ GMT+7, PAID/processing/closed, issued/VOID; không diễn giải CANCELLED thành payment failed hoặc refund. |
| Điều hướng và quyền | **PASS trong luồng đã thử**: route riêng/Guard, sidebar dùng chung, không link sang Checkout. Browser login Organizer; HTTP kiểm quyền owner/khác owner/buyer/ADMIN. |
| Loading/empty/error/refresh | **PARTIAL**: có code và browser kiểm empty, loading theo API; chưa gây 403/404/409 ở browser hoặc thử nút retry cho mọi trạng thái. |
| Responsive/keyboard/print | **PARTIAL**: browser 1440/1024/768/390 không tràn toàn trang; bảng mobile cuộn ngang được; menu mobile mở; nút in gọi lại API, vùng print hiển thị và PDF A4 sinh được. Chưa thử bàn phím/screen reader đầy đủ, decode QR từ PDF hoặc máy in vật lý. |
| Tính nhất quán | **PASS trong phạm vi**: dùng sidebar sẵn có, route/chrome Organizer; các route khác giữ nguyên. |

Lệnh đã chạy: `client/npm run build` **PASS**; `npx eslint src/pages/organizer/OrderManagerPage.tsx src/App.tsx` **PASS**. Test `B6_UI=1 node --test test/order-manager.integration.test.cjs` với `TEST_DATABASE_URL` local cô lập: **1 pass, 0 fail, 0 skip**, gồm HTTP và Chrome ở bốn viewport. PDF A4 được tạo trong bộ nhớ, không xuất bản. `git diff --check` không báo lỗi whitespace; chỉ có cảnh báo CRLF ở file người dùng đã chỉnh trước đó.

## Kết quả, giới hạn và Master Plan

**ĐẠT CÓ ĐIỀU KIỆN trong môi trường test cô lập** cho phạm vi giao diện B6 đã chọn. Giao diện và API đã hoạt động cùng nhau trên DB test; chưa kết luận production/local 8000 đã dùng được cho tới khi backend mới được chạy ở cổng phục vụ frontend. B6 artifact Stitch vẫn nguyên, không có chỉnh sửa Stitch. Các vấn đề còn lại: API chưa deploy ở 8000; response lỗi/retry browser, keyboard/a11y và QR decode từ PDF/máy in chưa xác minh; các fixture/race/query count backend còn theo report API trước. Chức năng ngoài scope không chặn nghiệm thu đợt này.

Đã cập nhật Master Plan mục 4 dòng 13, 5.2 B6, 5.4 B6 và 6.F bằng trạng thái frontend/API, giới hạn runtime, report và thời điểm; cập nhật nhật ký và kết quả tại `docs/ui/Feature_B6_OrderManager.md`. Các chỉnh sửa file ở phiên này được ghi ở các mục trên. Không sửa source backend nghiệp vụ hoặc các màn hình khác.
