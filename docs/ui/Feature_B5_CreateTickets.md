# B5 — Kế hoạch thêm và quản lý loại vé

> Cập nhật 2026-10-28 18:11 (UTC+07) · Đã triển khai B5, **ĐẠT CÓ ĐIỀU KIỆN** trên API source/DB test cô lập. [Báo cáo mới](../reports/stitch/B5_20261028_175629_implementation.md). Các mục khảo sát/kế hoạch bên dưới giữ lịch sử trước triển khai; trạng thái hiện tại xem nhật ký cuối file.

## Phạm vi và nguồn

- Master Plan gọi B5 là **Quản lý loại vé**. Yêu cầu phiên này: sau khi tạo thành công bản nháp ở B4, người dùng chọn tiếp tục tới trang B5 gắn với sự kiện vừa tạo; thêm loại vé và xem bảng trực quan. Tái sử dụng `OrganizerSidebar` đã có. Không sửa mã trong phiên lập kế hoạch này.
- Stitch project `10374042969343935993`, canvas B5, screen `a9084c52e88a4b46932f2bb330cb2d15`, title “B5. Quản lý loại vé - Cosmic Ticket Ban Tổ Chức”; DESKTOP 2560×3758, ảnh 1920×2494; HTML `10465278454534937034`, ảnh `5830095464257483379`. Đã xem HTML và ảnh; không sửa Stitch.
- Bố cục gốc: sidebar/header; tiêu đề và chọn sự kiện, nút thêm; form ở cột trái (tên, giá, số lượng, thời gian bán), bên phải chính sách và thẻ xem trước; bảng bên dưới (tên, giá, đã bán/sức chứa, thời gian, trạng thái, thao tác); cuối trang gửi duyệt. Nền `#0f1222`, mặt `#181b2a`/`#1c1f2f`, tím `#7c3aed`, cyan `#5de6ff`, font Syne/Be Vietnam Pro/Space Grotesk. Bảng màu artifact có khác token tổng quát; giữ artifact làm cơ sở, đồng bộ sidebar thực tế.

## Khoảng cách và quyết định cần xác nhận

1. B4 thành công hiện chỉ có liên kết về danh sách; chưa có nút tiếp tục và route B5 riêng. `EditorPage` đang gộp thông tin event, loại vé và gửi duyệt, chưa có bố cục/bảng B5. Phiên triển khai cần bổ sung liên kết B4 bằng ID thực; không tự động tạo thêm event khi chuyển trang. Giữ editor hiện hữu và tránh xung đột route `/organizer/events/:id/:tab`.
2. `GET /organizer/events/:id` trả `ticketTypes`, kể cả loại đã lưu trữ; dùng dữ liệu thực, phân biệt `archived_at`. Chưa có endpoint danh sách loại vé riêng được xác minh. Dự kiến route `/organizer/events/:id/tickets` cần đặt trước route `:tab` và dùng Guard hiện có; tên route là đề xuất, chưa tồn tại.
3. Người dùng yêu cầu **bỏ QR động và khóa/bật lại từng hạng vé** khỏi B5; không chỉnh sửa Stitch trong phiên này. Stitch còn giả định chọn event, xuất báo cáo, chống phe vé, hoàn tiền, phản ánh sau 5 giây, mã/tên vùng/đặc quyền và giá đã gồm phí: chưa có bằng chứng contract tương ứng, cần xác nhận cách thể hiện.
4. Form Stitch thiếu mô tả tùy chọn và không đánh dấu bắt buộc cho thời gian bán; backend yêu cầu cả hai thời điểm. API nhận giá nguyên dương tối đa 15 chữ số nhưng schema `mvp-schema.sql` giới hạn `price_amount` ≤ 900719925474099; giới hạn DB thực tế cần kiểm tra trước triển khai, không mặc định toàn bộ giá hợp regex hợp lệ. Capacity nguyên 1–1.000.000; kết thúc bán sau bắt đầu và không muộn hơn kết thúc event. Dùng chuỗi cho giá. Không giả định cơ chế vé miễn phí.
5. `DRAFT`/`REJECTED` mới được thêm/sửa/ngừng dùng; submit cần ít nhất một loại chưa lưu trữ và chỉ trong hai trạng thái đó. Sau gửi duyệt là `PENDING_REVIEW`, không phải mở bán. DELETE là lưu trữ, bị từ chối nếu có vé bán/giữ. PATCH cần payload đầy đủ và capacity không thấp hơn sold + reserved. Không gọi thao tác là xóa vĩnh viễn.
6. Bảng Stitch dùng dữ liệu mẫu 2025. Hiển thị tên, giá, capacity, sold, reserved và thời gian từ API; tính còn có thể bán `capacity - sold - reserved`, hiển thị rõ số giữ; trạng thái mở bán phải tính cả trạng thái event, thời gian, archive và trạng thái tạm ngừng bán. Ngưỡng “sắp hết” chưa có quy tắc được xác nhận: cần quyết định trước khi áp dụng. Không sinh QR/mã vé giả trong preview.
7. Sidebar hiện có menu tĩnh; giữ nguyên hành vi đã có, không nói đã nối đầy đủ. Responsive/accessibility và tương tác của thiết kế chưa được chứng minh từ ảnh desktop.

## Kế hoạch phiên triển khai sau

1. Đọc lại Master Plan, báo cáo, HTML/ảnh Stitch và code đang chạy; xác nhận các sai lệch UI nghiệp vụ ở trên trước khi thay đổi thiết kế hoặc bỏ/đổi nội dung Stitch. Không gọi edit-screen theo yêu cầu.
2. Xác minh API runtime trong DB test cô lập, kiểm tra quyền sở hữu và trạng thái; nếu endpoint lỗi/thiếu thì dừng tích hợp phần liên quan và báo BLOCKED. Không thay API thật bằng mock.
3. Dựng trang riêng dựa trên bố cục B5, sidebar hiện có, nhận event ID từ URL, tải event thực và xử lý reload/truy cập trực tiếp/không có quyền; thêm nút “Tiếp tục thêm loại vé” tại màn thành công B4. Giữ đường đi editor cũ hoạt động và điều chỉnh shell cho route mới.
4. Thêm form, validation, trạng thái đang gửi và chống nhấn lặp; gửi POST đầy đủ, reload dữ liệu từ server; sửa qua PATCH đầy đủ; ngừng dùng qua DELETE với xác nhận và lỗi backend. Có loading/empty/error/retry/success, focus, label và định dạng thời gian GMT+7 nhất quán với B4.
5. Dựng bảng dữ liệu thật với các cột, thanh tiến độ và trạng thái có căn cứ, có cuộn ngang hoặc bố cục phù hợp trên màn nhỏ; không trộn dữ liệu từ event khác. Chỉ gửi duyệt khi có ít nhất một loại chưa lưu trữ và trạng thái hợp lệ; kiểm tra lại sau submit, phản ánh lỗi server và điều hướng theo trạng thái thực.
6. Build/lint, kiểm thử API và trình duyệt theo ma trận dưới; so sánh ảnh Stitch ở desktop và thử 1440/768/390, bàn phím và lỗi mạng. Báo cáo mới từng phiên, cập nhật Master Plan và nhật ký file này.

## Luồng B4 và bảng dữ liệu

- Sau POST tạo event thành công, thêm nút **“Tiếp tục thêm loại vé”** trong trạng thái thành công B4; dùng `response.data.data.id` điều hướng B5, không gửi lại POST. Nếu thiếu ID thì không điều hướng và báo lỗi. Reload B5 lấy đúng event theo ID từ URL và kiểm tra quyền server; nút về danh sách hiện có vẫn dùng được.
- B5 gọi `GET /api/organizer/events/:id` lấy `ticketTypes` của đúng event. Khi thêm qua `POST /api/organizer/events/:id/ticket-types`, chờ thành công rồi tải lại event và cập nhật bảng từ server; nếu tải lại thất bại phải báo lỗi và cho thử lại, tránh báo đã đồng bộ. Kiểm tra reload, nhiều loại, event khác, archive và dữ liệu bán/giữ; không dùng hàng mẫu.
- **Phạm vi đã chốt:** không có nút khóa hoặc bật lại từng hạng, không xây dựng API/cờ/migration cho tính năng đó. `DELETE` là ngừng dùng bằng archive theo điều kiện backend; không coi đó là toggle. API pause toàn sự kiện không thuộc chức năng B5 này.
- Bỏ panel/tuyên bố QR động và mọi QR/mã vé mẫu khỏi giao diện dự kiến B5; giữ bố cục Stitch trong phạm vi khả thi và ghi đây là sai lệch nội dung đã được người dùng yêu cầu. Không làm thay đổi chức năng QR của các trang khác.

## Các API cần dùng và kết quả kiểm tra thực tế

Các đường dẫn đầy đủ dưới đây có tiền tố `/api`; frontend Axios dùng đường dẫn tương đối tương ứng. Thử trên API source build local `127.0.0.1:8014` và PostgreSQL test cô lập, đăng nhập thành công tài khoản organizer được cung cấp (tài khoản tạo riêng trong DB test, không chứng minh tài khoản trên DB dùng chung). Không ghi mật khẩu/token. Dữ liệu và chi tiết ở [report](../reports/stitch/B5_20261028_174846_api_plan.md).

| API | Mục đích | Kết quả phiên này |
|---|---|---|
| `POST /api/auth/login`, `GET /api/auth/me` | Đăng nhập và xác minh role | 200, có ORGANIZER |
| `GET /api/categories` | Danh mục cho B4 | 200 |
| `POST /api/organizer/events` | Tạo sự kiện B4 | 200, `DRAFT`, có event ID |
| `GET /api/organizer/events/:id` | Chi tiết event, nguồn `ticketTypes` cho bảng B5 | 200, ban đầu rỗng; sau thêm trả loại vé đúng ID; sau submit `PENDING_REVIEW` |
| `POST /api/organizer/events/:id/ticket-types` | Thêm loại vé | 200 với payload hợp lệ; sau submit 409 `EVENT_LOCKED` |
| `POST /api/organizer/events/:id/submit` | Gửi sự kiện duyệt | Chưa có vé: 400 `MISSING_TICKETS`; có vé: 200, `PENDING_REVIEW` |
| `PATCH /api/organizer/events/:id/ticket-types/:typeId` | Sửa loại vé | Có route trong code; chưa kiểm thử runtime phiên này |
| `DELETE /api/organizer/events/:id/ticket-types/:typeId` | Ngừng dùng/archive khi đủ điều kiện | Có route trong code; chưa kiểm thử runtime phiên này |
| `POST /api/media` | Upload banner B4, nếu dùng | Đã kiểm thử trong fixture B4 cùng phiên: 200 ảnh hợp lệ; không cần cho B5 |

## Kế hoạch kiểm thử API thật

Chạy backend source hiện tại với PostgreSQL test riêng và tài khoản organizer có quyền; tạo category hợp lệ, event DRAFT thuộc organizer với thời gian tương lai, thêm organizer khác và USER. Không ghi mật khẩu/token vào báo cáo. Ghi môi trường, method, status, response đã bỏ dữ liệu nhạy cảm, ID và dọn dữ liệu test; không dùng DB chung. Ví dụ event kết thúc `2027-12-01T16:00:00Z`; payload vé hợp lệ `{"name":"Vé phổ thông","description":"Khu tiêu chuẩn","price":"250000","capacity":100,"saleStartsAt":"2027-11-01T03:00:00Z","saleEndsAt":"2027-12-01T15:00:00Z"}` (UTC; 10:00 VN và 22:00 VN).

| Case | Thao tác và kết quả cần kiểm tra |
|---|---|
| 1 | `GET /organizer/events/:id` owner: 200, đúng event và `ticketTypes` rỗng; guest 401, organizer khác bị từ chối; event không tồn tại xử lý an toàn. |
| 2 | `POST /organizer/events/:id/ticket-types` payload hợp lệ: thành công, response có ID/event/giá/capacity/thời gian; GET xác nhận dữ liệu được lưu. |
| 3 | POST sai: tên rỗng/quá dài, giá 0/âm/thập phân/quá 15 chữ số, capacity 0/quá 1.000.000/không nguyên, thiếu/đảo thời gian hoặc kết thúc sau event; xác minh status/mã lỗi thực, không ghi thêm record. |
| 4 | `PATCH /organizer/events/:id/ticket-types/:typeId` payload đầy đủ hợp lệ, GET xác nhận; thiếu field hoặc capacity thấp hơn sold+reserved phải bị từ chối. Dùng fixture bán/giữ thật trong DB test và xác nhận con số trước thao tác. |
| 5 | `DELETE /organizer/events/:id/ticket-types/:typeId` khi chưa bán/giữ: GET xác nhận `archived_at`; loại đã bán hoặc giữ phải bị từ chối; thử type thuộc event khác. |
| 6 | `POST /organizer/events/:id/submit`: không có loại hoạt động bị `MISSING_TICKETS` 400; có ít nhất một loại chưa archive thành công, GET xác nhận `PENDING_REVIEW`; tạo/sửa/ngừng dùng sau submit bị `EVENT_LOCKED`. Thử REJECTED riêng và kiểm tra quyền guest/USER/organizer khác đối với mutation. |
| 7 | Kiểm thử điều kiện cạnh tranh: double click, lỗi mạng sau POST, reload, switch event và session hết hạn; không khẳng định idempotency server nếu chưa chứng minh. |

Kết quả runtime hiện tại giới hạn ở các case nêu trên; các case 3–5, REJECTED, quyền mutation và cạnh tranh vẫn cần kiểm thử trong phiên triển khai, không coi là đã đạt.

## Nghiệm thu và nhật ký

- B4 → B5 giữ đúng ID; refresh/truy cập trực tiếp đúng event, không tạo trùng; sidebar dùng lại. Bảng và form lấy/lưu dữ liệu thật và phản ánh đúng archive/số lượng; submit tuân thủ trạng thái backend.
- Các tính năng/tuyên bố thiếu contract phải được xử lý theo quyết định được duyệt; không dùng dữ liệu giả. Desktop/mobile, trạng thái lỗi và keyboard có bằng chứng kiểm thử thực.
- 2026-10-28 17:33: tạo tài liệu kế hoạch và report B5 mới; cập nhật mục B5, ghi chú B2 và thời gian tài liệu trong Master Plan. Không thay đổi code hay Stitch; chi tiết và hạn chế tại report.
- 2026-10-28 17:44: bổ sung nút B4 → B5, bảng tải lại sau thêm, loại QR động theo yêu cầu, phân tích khả thi toggle và kế hoạch API/backend; cập nhật Master Plan và [report mới](../reports/stitch/B5_20261028_174435_plan_update.md). Chỉ tài liệu.
- 2026-10-28 17:49: bỏ toggle từng hạng khỏi phạm vi; liệt kê API và kiểm thử luồng tạo event, thêm vé, gửi duyệt trên DB cô lập; [report](../reports/stitch/B5_20261028_174846_api_plan.md). Không sửa src hoặc Stitch.

### 2026-10-28 18:11 — Triển khai và quyết định mới nhất

- Đã tạo `CreateTicketsPage.tsx`, helper dữ liệu và CSS scoped; route `/organizer/events/:id/tickets`, Guard ORGANIZER/ADMIN, sidebar cũ. B4 có nút tiếp tục bằng ID server, giữ link danh sách; không sửa editor/sidebar hiện hữu.
- Form thêm/sửa, archive có xác nhận, bảng GET thật và refetch sau mutation, validation theo API/DB, GMT+7, lỗi/retry/disabled/success. Submit có vé hoạt động và form sạch, sau thành công PENDING_REVIEW/read-only.
- Người dùng đã xác nhận giữ vị trí/giao diện tính năng chưa hỗ trợ; khi nhấn hiện “Chức năng đang được phát triển” dưới màn hình. Áp dụng cho tìm kiếm, chọn event, export, chính sách, vùng vé, sync 5 giây, lọc mở bán/sắp hết. Bỏ QR động/mã QR giả và khóa/bật lại từng hạng; không cần phát triển API toggle.
- Server/client build và eslint PASS; 41 HTTP assertions PASS (CRUD, owner, validation, submit); 2 Chrome tests PASS (B4 → B5, CRUD, reload, offline/retry, timezone, toast, cross-owner, 1440/768/390 không tràn ngang). Giá DB test có constraint 1..900719925474099, đã kiểm tra.
- Giới hạn: DB/API cô lập, Docker8000 chưa rebuild; REJECTED runtime, mất response POST/concurrency, refetch lỗi sau commit, refresh giữa mutation, browser khác và accessibility toàn diện chưa nghiệm thu. Chi tiết/ảnh tại [report](../reports/stitch/B5_20261028_175629_implementation.md).
