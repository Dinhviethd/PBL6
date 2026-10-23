# Kế hoạch thay giao diện Login theo Stitch

Ngày lập: 23/10/2026  
Trạng thái: **Plan — chưa triển khai**  
Phạm vi: giao diện đăng nhập tại `/auth/login` trong `client/`, dựa trên ảnh tham chiếu do người dùng cung cấp và màn hình Login của Stitch project **Eventix Ticketing Platform** (`projects/13564631082963909735`, screen `05 - Đăng Nhập & Phân Quyền Hệ Thống`).

> Tài liệu này là chỉ dẫn để AI thực hiện ở một lượt công việc sau. Trong lượt lập plan này chỉ tạo tài liệu Markdown; không sửa mã nguồn.

## 1. Báo cáo hiện trạng

### 1.0. Ảnh tham chiếu bắt buộc

Ảnh Login đính kèm trong yêu cầu người dùng là chuẩn trực quan chính để triển khai. AI thực hiện phải tái tạo gần sát ảnh ở các đặc điểm nhìn thấy được: khung nền xanh đen toàn màn hình có viền tím mảnh; thanh điều hướng trên cùng với nhãn NOVA EVENTS, đường quay lại khám phá sự kiện và chọn ngôn ngữ; bố cục hai cột cân đối; cột trái là nội dung quảng bá sự kiện dạng thẻ tối có ảnh nền, thông tin event và các số liệu nổi bật; cột phải là panel đăng nhập tối, nhãn xác thực, tiêu đề/chú thích, trường email và mật khẩu có icon, tùy chọn ghi nhớ 30 ngày và chỉ báo SSL, nút đăng nhập màu tím sáng, các nút tiếp tục với Google/Apple/Passkey và liên kết đăng ký ở cuối. Giữ đúng sắc độ, phân cấp chữ, khoảng cách, độ tương phản, bo góc và tỷ lệ trong ảnh; không thay bằng bố cục EVENTHUB hiện tại.

Nội dung quảng bá bên trái là nội dung trình bày theo ảnh; không được để nội dung đó thay đổi payload, quy trình xác thực hoặc dữ liệu gửi backend. Các nút OAuth/Passkey chỉ được hiển thị nếu ảnh yêu cầu; không giả lập chức năng. Nếu hệ thống hiện không có tích hợp tương ứng, AI phải giữ các nút này ở trạng thái không hoạt động/không hiển thị chức năng và ghi rõ trong report, không tự tạo backend hay endpoint.

### 1.1. Cấu trúc hiện tại

- Trang xác thực đã được tách riêng sau đợt refactor: `client/src/pages/auth/AuthPage.tsx`.
- `AuthPage` phục vụ chung ba luồng Login, đăng ký và đặt lại mật khẩu qua props `register` và `reset`; router khai báo cả ba tại `/auth/login`, `/auth/register`, `/auth/reset-password` trong `client/src/App.tsx`.
- Giao diện hiện tại gồm khối giới thiệu EVENTHUB bên trái và form trong panel bên phải. Các lớp đang dùng gồm `auth-wrap`, `auth-intro`, `auth-panel`, `auth-links`.
- Form dùng `ActionForm` và `Field` từ `client/src/components/ticketing/`; xử lý gọi `authService.login`, điều hướng `location.state?.from` về trang an toàn hoặc `/`, và hiển thị liên kết đăng ký/quên mật khẩu.
- Style trang auth đang nằm trong `client/src/features/ticketing/ticketing.css` (khu vực khoảng dòng 769 và responsive khoảng dòng 1317). CSS được nạp từ `App.tsx`.
- Login thành công là một phần luồng xác thực; không được làm thay đổi service/API hoặc điều hướng sau đăng nhập.
- Backend hiện có chỉ được gọi thông qua API xác thực đang được frontend sử dụng; tuyệt đối không sửa backend logic, endpoint, controller, middleware, validation, schema/database hoặc cấu hình backend nếu chưa có sự cho phép rõ ràng của người dùng.

### 1.2. Nguồn thiết kế Stitch

- Project: **Eventix Ticketing Platform**, ID `13564631082963909735`.
- Screen: **05 - Đăng Nhập & Phân Quyền Hệ Thống**, ID `f845013604ca4b93839c15509441d96e`.
- Kích thước metadata của screen: desktop 2560 × 2196.
- Có thể đọc project và liệt kê screen cùng metadata/thumbnail/HTML file reference qua Stitch. Lượt lập plan này chưa lấy được nội dung HTML chi tiết: `get_screen` và `download_file` trả `Request contains an invalid argument`. AI thực hiện phải thử truy cập lại bằng schema/định dạng ID chính xác và mở/xem screenshot hoặc HTML trước khi code; nếu vẫn lỗi, báo rõ hạn chế và dùng thumbnail đã có làm căn cứ hình ảnh, không tự bịa thành phần hoặc nội dung không nhìn thấy.

### 1.3. Điểm cần làm rõ khi triển khai

Tên screen bao hàm “Đăng Nhập & Phân Quyền Hệ Thống”, trong khi yêu cầu là màn hình Login. Trước khi triển khai, kiểm tra thiết kế thực tế và chỉ đưa các yếu tố xác thực thuộc màn hình này vào phạm vi. Không suy diễn UI quản trị/phân quyền nếu không hiện diện trong thiết kế Login.

## 2. Mục tiêu và phạm vi

### Mục tiêu

1. Chuyển phần nhìn thấy tại `/auth/login` gần với màn hình Login trong Stitch: bố cục, màu sắc, typography, kích thước, khoảng cách, nền, panel, trường nhập, nút và trạng thái responsive.
2. Giữ nguyên hành vi đăng nhập và cấu trúc điều hướng hiện có.
3. Giữ tương thích với trang đăng ký và đặt lại mật khẩu đang dùng chung `AuthPage`; thiết kế lại các trạng thái này có thể cần áp dụng tối thiểu để chúng không bị vỡ, nhưng không tự đổi nội dung/nghiệp vụ.

### Ngoài phạm vi

- Mọi chỉnh sửa backend: endpoint, controller, middleware, validation nghiệp vụ, schema/database, cấu hình và logic xác thực đều bị cấm khi chưa được người dùng cho phép rõ ràng. Chỉ gọi API xác thực hiện có từ frontend để kiểm tra tính xác thực.
- Thay đổi `authService`, store phiên đăng nhập/token hoặc hợp đồng/payload API.
- Thay đổi route, guard, role/permission, `location.state`, URL hoặc redirect.
- Thiết kế lại toàn bộ trang đăng ký/reset nếu Stitch không định nghĩa các màn đó.
- Các trang ticketing khác, header/footer dùng chung, mobile app, database.
- Thêm thư viện hoặc asset bên ngoài khi chưa chứng minh là cần thiết.

## 3. Hợp đồng hành vi phải giữ

AI triển khai phải giữ nguyên các điều sau:

- `AuthPage` vẫn nhận `register = false`, `reset = false`; ba route vẫn render đúng ba chế độ.
- Login gửi đúng `{ email, password }` đến `authService.login`.
- Sau login, nếu `location.state?.from` là chuỗi bắt đầu bằng `/` nhưng không bắt đầu `//` thì điều hướng về giá trị đó; nếu không thì về `/`.
- Các trường form giữ `name` hiện tại để `ActionForm` serialize đúng: `email`, `password` (và giữ nguyên các field cho register/reset).
- Giữ thông báo lỗi/thành công hiện có từ `ActionForm`, submit/loading/disabled behavior, semantics form và khả năng dùng bàn phím.
- Liên kết đăng ký và quên mật khẩu tiếp tục đi đến `/auth/register` và `/auth/reset-password` tương ứng.

## 4. Kế hoạch và thứ tự thực hiện

### P0 — Khảo sát và baseline

1. Đọc lại `docs/FRONTEND-PAGES-REFACTOR-PLAN.md`, `AuthPage.tsx`, CSS auth, `ActionForm`, `Field`, router và auth service.
2. Chụp/ghi nhận giao diện Login hiện tại ở desktop và mobile để so sánh.
3. Xác nhận working tree và ghi baseline commit; không ghi đè thay đổi sẵn có.
4. Mở Stitch project/screen bằng `get_project`, `list_screens`, `get_screen` và schema của `download_file` nếu cần. Lưu lại các thông số quan sát được: bố cục, màu, font, kích thước, nội dung, asset và breakpoint. Không dùng ảnh thumbnail làm tài sản sản phẩm nếu HTML/asset gốc có thể truy cập.

**Điều kiện qua P0:** đã xem screen đủ để mô tả chính xác những yếu tố sẽ chuyển; nếu Stitch vẫn không truy cập được nội dung, dừng triển khai giao diện và báo lỗi truy cập, không tự thiết kế thay thế.

### P1 — Đối chiếu thiết kế và mapping

1. Lập bảng mapping từng vùng Stitch → thành phần/classes tương ứng trong `AuthPage`.
2. Phân biệt thay đổi thuần trình bày với thay đổi cấu trúc JSX; ưu tiên giữ `ActionForm`, `Field`, các `name`, handlers và liên kết.
3. Xác định các token CSS có thể tái sử dụng; chỉ thêm/sửa CSS auth có phạm vi hẹp. Không đổi global token nếu thiết kế không bắt buộc.
4. Xác định cách xử lý register/reset để không bị lệch layout sau khi Login đổi giao diện.

**Điều kiện qua P1:** mỗi phần giao diện đích có nguồn tham chiếu rõ từ Stitch; không còn giả định chưa xác nhận về hành vi form.

### P2 — Triển khai giao diện

1. Chỉnh `client/src/pages/auth/AuthPage.tsx` chỉ ở phần JSX trình bày cần thiết; giữ nguyên handler, state và điều kiện mode.
2. Chỉnh khu vực CSS auth trong `client/src/features/ticketing/ticketing.css`; tránh thay đổi selector dùng chung ngoài trang auth.
3. Dùng asset/font đã có trong project hoặc asset được Stitch cung cấp; không thêm dependency nếu không cần.
4. Bổ sung responsive cho desktop/tablet/mobile theo thiết kế và bảo đảm form không tràn, không bị che.
5. Giữ đủ label, focus-visible, autocomplete phù hợp (`email`, `current-password` nếu cấu trúc component cho phép), tương phản và thao tác bàn phím.

**Điều kiện qua P2:** Login khớp trực quan với Stitch ở viewport mục tiêu, không làm hỏng register/reset, không có thay đổi nghiệp vụ.

### P3 — Kiểm tra và báo cáo

1. So sánh screenshot trước/sau ở cùng kích thước với screen Stitch; ghi rõ điểm khớp và sai khác còn lại.
2. Kiểm tra thủ công ba URL `/auth/login`, `/auth/register`, `/auth/reset-password` ở desktop và mobile.
3. Kiểm tra tương tác: nhập email/password, hiện lỗi từ submit, trạng thái đang gửi, submit bằng Enter, link đăng ký/reset, redirect mặc định và redirect `from` an toàn.
4. Chạy các lệnh lint/build và test UI có sẵn theo script trong `client/package.json`; báo chính xác lệnh/kết quả, không ghi “pass” nếu chưa chạy.
5. Review diff để xác nhận thay đổi chỉ gồm UI auth dự kiến; kiểm tra không sửa auth service/store, router, API hoặc trang khác.
6. Điền report theo mẫu mục 7.

## 5. Tiêu chí bắt buộc cho AI thực hiện

### Được phép

- Sửa `client/src/pages/auth/AuthPage.tsx` và phần CSS auth liên quan trong `client/src/features/ticketing/ticketing.css`.
- Tạo/chỉnh asset cục bộ chỉ khi Stitch có asset tương ứng và cần thiết; ghi rõ nguồn.
- Điều chỉnh markup trình bày tối thiểu để đạt layout/accessibility, với điều kiện giữ nguyên hợp đồng hành vi tại mục 3.

### Không được phép

- Sửa `authService.ts`, `authStore.ts`, API/backend, `App.tsx`/router/guard hoặc route.
- Đổi tên field, action, component API, props, URL hoặc điều kiện redirect.
- Bỏ `ActionForm`/`Field` hoặc thay cơ chế submit nếu không có lý do kỹ thuật được ghi nhận và phê duyệt riêng.
- Thay đổi các trang khác/global CSS không liên quan; thêm package; nhúng credential hoặc gọi dịch vụ ngoài.
- Xóa/sửa các thay đổi chưa commit của người dùng.

## 6. Tiêu chí đánh giá hoàn thành

### Thiết kế

- Bố cục, màu, typography, hình ảnh/decoration, panel, control và CTA tương đồng với screen Login Stitch; sai khác có giải thích.
- Không tràn ngang ở viewport mobile; nội dung và nút thao tác được ở màn hình nhỏ.
- Có focus nhìn thấy được, label gắn với input, tương phản và kích thước vùng bấm hợp lý.

### Chức năng

- Ba route login/register/reset vẫn hoạt động đúng chế độ.
- Login vẫn gửi email/password đúng API; lỗi và trạng thái submit vẫn hiển thị qua cơ chế hiện hữu.
- Redirect `from` an toàn và fallback `/` giữ nguyên.
- Các liên kết đăng ký/quên mật khẩu hoạt động; không phát sinh lỗi console/runtime.

### Phạm vi và chất lượng

- Diff chỉ chứa file UI auth/asset thực sự cần thiết.
- Không đổi backend/API/store/router hoặc hành vi xác thực.
- Lint/build/test được báo cáo bằng kết quả thực tế; mọi lỗi có sẵn hoặc môi trường được phân biệt với lỗi do thay đổi.
- Có ảnh đối chiếu hoặc mô tả kiểm tra rõ ràng và report hoàn thành đầy đủ.

## 7. Mẫu report sau khi triển khai

### Thông tin chung

- Ngày thực hiện:
- Commit baseline / branch:
- File thay đổi:

### Nguồn Stitch

- Project/screen đã mở:
- Những đặc điểm thiết kế đã áp dụng:
- Asset/font sử dụng và nguồn:
- Sai khác do giới hạn Stitch (nếu có):

### Kết quả

- Login desktop/mobile:
- Register/reset regression check:
- Redirect và form behavior:
- Accessibility/keyboard:

### Kiểm tra

| Lệnh/kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| Lint | Chưa chạy | Điền sau triển khai |
| Build | Chưa chạy | Điền sau triển khai |
| UI test/manual flow | Chưa chạy | Điền sau triển khai |
| Diff scope review | Chưa kiểm tra | Điền sau triển khai |

### Kết luận

- Tiêu chí hoàn thành đạt/chưa đạt:
- Vấn đề còn lại:
- Xác nhận không đổi logic auth/API/route: Có/Không (nêu cách kiểm chứng)
