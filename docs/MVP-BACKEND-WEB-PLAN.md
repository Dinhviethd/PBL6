# Kế hoạch triển khai MVP backend và web

Ngày lập: 01/10/2026. Trạng thái: kế hoạch đề xuất, chưa triển khai chức năng.

Mục tiêu là hoàn thành một luồng sử dụng thực tế: Customer đăng ký làm Organizer → Admin duyệt → Organizer tạo sự kiện và loại vé → Admin duyệt sự kiện → Customer tìm sự kiện, đặt vé và thanh toán sandbox → nhận vé QR → Organizer quét QR trên web → xem thống kê.

## 1. Quyết định nền tảng và hiện trạng

Theo lựa chọn của người dùng, tiếp tục phát triển tại repository hiện tại với Express + TypeORM. Phần định hướng chuyển sang project Hono trong `README-TECH-STACK.md` không áp dụng cho kế hoạch này.

| Hạng mục | Hiện trạng đã đọc từ mã nguồn | Hướng triển khai MVP |
| --- | --- | --- |
| Backend | Express 5, TypeScript, TypeORM, Zod; hiện chỉ mount module auth | Modular monolith có ownership/interface chặt; cùng process trước, tách process sau |
| Database | TypeORM cấu hình PostgreSQL qua `DATABASE_URL`, có nhắc Supabase | Giữ PostgreSQL; Supabase nếu dùng chỉ là nơi đặt DB, không chuyển sang Supabase Auth |
| Auth | JWT, bcrypt, refresh cookie, quên mật khẩu qua OTP | Hoàn thiện session, trạng thái tài khoản và quyền sở hữu tài nguyên |
| RBAC | Có USER, ADMIN và bảng role/permission | USER tương ứng Customer; bổ sung ORGANIZER, không đổi tên USER để tránh migration không cần thiết |
| Web | React 19, Vite, React Router, Axios, Zustand, Tailwind/Radix | Tái sử dụng auth và UI components, xây các feature sự kiện mới |
| Trang chính | Nội dung post/matching; trang gốc yêu cầu đăng nhập | Thay bằng trang sự kiện công khai, thêm khu Customer/Organizer/Admin |
| Media | Có cấu hình Cloudinary | Dùng lại cho ảnh sự kiện và avatar sau khi kiểm tra upload |
| Vận hành | Có Dockerfile và Cloud Build dùng tên PBL4 | Điều chỉnh môi trường PBL6, không chạy deploy vào project cũ |
| Chất lượng | Backend test script là placeholder; chưa thấy migration trong danh sách file | Bổ sung migration, seed và kiểm thử nghiệp vụ trọng yếu |

Đây là khảo sát mã nguồn, chưa xác nhận build, database hay dịch vụ ngoài đang chạy được. Không dùng nội dung README bàn giao làm bằng chứng về chức năng đã có.

## 2. Phạm vi MVP

| Nhóm | Bắt buộc cho MVP | Sau MVP |
| --- | --- | --- |
| Public/Customer | Xem và lọc sự kiện theo từ khóa, danh mục, địa điểm, thời gian, giá; chi tiết sự kiện; auth; hồ sơ cơ bản; xin làm Organizer; đặt vé; một cổng thanh toán sandbox; lịch sử đơn và QR | OAuth, chuyển nhượng vé, voucher, wishlist, đánh giá |
| Organizer | Xem trạng thái xét duyệt; tạo/sửa/gửi duyệt sự kiện; upload ảnh; loại vé và thời gian bán; xem đơn và người tham dự; quét QR; thống kê số liệu cơ bản | Nhân viên check-in riêng, nhiều đồng tổ chức, sơ đồ ghế, sự kiện lặp, thống kê nâng cao |
| Admin | Duyệt Organizer/sự kiện có lý do từ chối; tìm tài khoản, active/inactive, khóa/mở khóa; danh mục; xem sự kiện, giao dịch; thống kê cơ bản | Trình chỉnh sửa quyền tùy ý, báo cáo tài chính, tự động đối soát và hoàn tiền |
| Nền tảng | Transaction tồn kho, webhook idempotent, check-in nguyên tử, log thao tác quan trọng, phân trang, HTTPS staging | Mobile native, check-in offline, microservices, realtime dashboard |

Các giới hạn đề xuất để giữ phạm vi nhỏ:

- Một đơn chỉ thuộc một sự kiện; có thể gồm nhiều loại vé, mỗi đơn tối đa 10 vé, số lượng này cấu hình được.
- Một đơn vị tiền tệ VND, lưu số nguyên; backend quyết định giá và tổng tiền. MVP chỉ bán vé có giá dương.
- Mỗi sự kiện có một Organizer sở hữu và một thời gian/địa điểm tổ chức; không chọn ghế.
- Mỗi vé có một QR riêng. Người mua được mua nhiều vé; chưa thu thập hồ sơ riêng của từng khách đi cùng. Danh sách người tham dự là từng vé gắn với người mua.
- Một phương thức thanh toán sandbox đủ để nghiệm thu. Mock chỉ dùng phát triển, không được coi là đã hoàn thành tích hợp thanh toán.
- Đơn giữ chỗ mặc định 15 phút, dùng thời gian server; cần điều chỉnh theo hợp đồng cổng thanh toán ở M0.
- Chỉ hủy sự kiện khi chưa có đơn đã thanh toán và không còn thanh toán đang xử lý. Sự kiện đã bán vé được ngừng bán, giữ dữ liệu; quy trình hủy có hoàn tiền để sau MVP.
- Không xóa cứng sự kiện, loại vé hoặc danh mục đã có dữ liệu liên quan; dùng archive/ngừng bán. Sửa nội dung quan trọng sau khi public cần duyệt lại; nếu đã bán vé thì khóa ngày, địa điểm và không cho giảm sức chứa dưới số đã bán + đang giữ.

MVP là một phần của đề tài, không đồng nghĩa đã hoàn tất toàn bộ 24 nhóm yêu cầu. Hủy sự kiện có vé đã thanh toán, hoàn tiền và xử lý ngoại lệ vận hành đầy đủ cần được bổ sung trước khi mở bán thật.

## 3. Kiến trúc triển khai

Giữ hai thư mục `server/` và `client/`. Theo quyết định bổ sung của người dùng: **một Express backend, một PostgreSQL, module có ownership chặt; tách process sau**. Áp dụng [Service ownership](SERVICE-OWNERSHIP.md): Auth, Event, Order, Payment và Audit chỉ truy cập bảng mình sở hữu; module khác gọi public interface qua dependency injection. Cấm import entity/repository, join hoặc raw SQL xuyên owner.

Workflow phối hợp các interface trong UnitOfWork chung khi cần transaction nguyên tử. Truyền WorkContext opaque, không đưa EntityManager/DataSource cho module khác. Payment chỉ yêu cầu Order xử lý kết quả đã xác minh; Order quyết định PAID, tồn kho và phát hành vé. Event gọi Order để quản lý loại vé, vì ticket_types và tồn kho thuộc Order.

```text
server/src/
  bootstrap/                # Composition root và dependency injection
  contracts/                # DTO/schema/interface, không có TypeORM entity
  platform/transaction/     # UnitOfWork và WorkContext opaque
  workflows/                # Phối hợp use case; không trực tiếp query DB
  modules/
    auth/                   # User/RBAC/session/profile/Organizer application
    event/                  # Category/event/review
    order/                  # Loại vé/kho/order/reservation/ticket/check-in
    payment/                # Adapter provider/payment/notification
    audit/                  # audit_logs, chỉ qua append/query interface
  migrations/               # Một runner, mỗi migration ghi rõ owner
  jobs/                     # Nhả giữ chỗ, kiểm tra thanh toán bị treo
  tests/
client/src/features/
  auth/
  events/ checkout/ orders/ tickets/ profile/
  organizer/ admin/
docs/
  MVP-BACKEND-WEB-PLAN.md
  api/                      # Hợp đồng API/OpenAPI sẽ viết ở M0
```

Đề xuất deploy web build và API cùng origin qua Express theo Dockerfile hiện có để đơn giản hóa cookie và CORS. Backend business API dùng `/api`; SPA fallback không được trả HTML cho API không tồn tại. PostgreSQL là nguồn dữ liệu chính cho tồn kho, payment và check-in. Redis/Socket.IO hiện có chỉ giữ khi thực sự cần; không dùng chúng làm điều kiện để luồng mua vé hoạt động.

MVP chưa dùng HTTP/broker giữa module. Khi tách process, thay local adapter bằng transport adapter **và thiết kế lại transaction xuyên owner** bằng retry/idempotency/outbox hoặc workflow bù; không truyền transaction qua HTTP. Reports lấy summary/batch DTO từ từng owner, không sở hữu repository join toàn DB. Media adapter được inject cho Auth/Event theo use case, không trở thành lối truy cập bảng chéo.

## 4. Dữ liệu và quy tắc nhất quán

Thiết kế chi tiết đã được tách tại [MVP database design](database/MVP-DATABASE-DESIGN.md), kèm ERD, DDL tham chiếu và kiểm tra ràng buộc. Dùng tài liệu đó khi viết entity/migration; bảng dưới đây là tóm tắt phạm vi ban đầu.

| Nhóm bảng | Dữ liệu chính và ràng buộc |
| --- | --- |
| users, roles, permissions, bảng liên kết | Tái sử dụng; thêm active/inactive, locked_at, lý do khóa; role không do client tự gán |
| auth_sessions | Hash refresh token, user, expiry, revoked_at; rotation và thu hồi session |
| organizer_applications | Người gửi, thông tin tổ chức/liên hệ, trạng thái, reviewer, lý do, thời gian; tối đa một yêu cầu pending/user |
| categories | Tên, slug unique, trạng thái archive |
| events | Owner, category, slug, tên/mô tả/ảnh, địa điểm, thời gian, trạng thái duyệt, lý do từ chối, sales_paused |
| ticket_types | Event, giá, capacity, reserved_quantity, sold_quantity, thời gian bán; số lượng không âm và reserved + sold ≤ capacity |
| orders, order_items | Buyer, event, trạng thái, expires_at, tổng tiền; item lưu snapshot tên/giá/số lượng; idempotency key theo buyer |
| reservations | Order, ticket type, số lượng, expires_at, trạng thái held/consumed/released; unique theo order + ticket type |
| payments, payment_notifications | Payment attempt, provider reference unique, số tiền, currency, trạng thái; dedupe notification theo ID ổn định của provider |
| tickets | Một hàng/một vé, order item + số thứ tự unique, mã vé, QR token hash unique, trạng thái |
| checkins | Ticket unique, event, người quét, thời gian server; một vé có tối đa một check-in thành công |
| audit_logs | Actor, action, resource, thời gian, thay đổi cần truy vết; không log token/QR đầy đủ |

Các quan hệ chính: User → Event; Event → TicketType; User → Order → OrderItem → Ticket; Order → Payment; Ticket → Checkin. Tất cả FK và index tra cứu được tạo bằng migration. Thời gian lưu UTC dạng timestamptz, hiển thị theo Asia/Ho_Chi_Minh. Tiền dùng kiểu số nguyên phù hợp và kiểm tra miền giá trị khi chuyển sang JavaScript.

### Trạng thái nghiệp vụ

- Yêu cầu Organizer: `PENDING → APPROVED | REJECTED`. Sau từ chối có thể gửi yêu cầu mới, giữ lịch sử cũ.
- Event: `DRAFT → PENDING_REVIEW → PUBLISHED | REJECTED`; sửa bản bị từ chối rồi gửi lại. `CANCELLED` chỉ khi thỏa điều kiện hủy; `ARCHIVED` giữ lịch sử. Hết thời gian sự kiện không đồng nghĩa bị xóa.
- Order: `PENDING_PAYMENT → PAID | EXPIRED | CANCELLED`. Một payment thất bại chưa làm đơn hết hạn nếu vẫn còn thời gian retry.
- Payment attempt: `PENDING → SUCCEEDED | FAILED`; kết quả chưa rõ là `UNKNOWN`, cần đối chiếu. Cờ `requires_review` riêng cho đã nhận tiền nhưng không thể hoàn tất đơn tự động.
- Ticket: `VALID → CHECKED_IN | VOID`. Chỉ đơn PAID mới có vé VALID; MVP không chuyển vé sang người khác.

### Đặt vé và tồn kho

1. Backend đọc giá hiện tại, kiểm tra event public/đang bán, thời gian bán và số lượng. Không tin giá hay trạng thái do client gửi.
2. Trong một transaction, khóa các ticket type theo thứ tự ID cố định; kiểm tra capacity − sold − reserved, tạo order/items/reservations và tăng reserved.
3. Idempotency key cho tạo đơn gắn user + payload: gửi lại cùng key trả đơn cũ, khác payload trả lỗi xung đột.
4. Job nhả giữ chỗ phải khóa cùng order/reservation, chỉ xử lý trạng thái HELD một lần. Dùng lịch chạy bên ngoài hoặc worker được vận hành rõ ràng, không phụ thuộc một setInterval trong web server.
5. Đơn đã bắt đầu thanh toán mà kết quả chưa rõ cần đối chiếu trạng thái với provider trước khi nhả, có thời hạn xử lý hữu hạn. Không giữ kho vô thời hạn khi provider lỗi.
6. Webhook và job hết hạn dùng cùng quy tắc khóa. Nếu giữ chỗ đã nhả rồi mới nhận xác nhận thu tiền, không tự tạo vé vượt kho: đánh dấu payment cần xử lý, đưa vào danh sách Admin và thông báo đơn đang được hỗ trợ.

### Thanh toán và phát hành vé

1. Tạo payment attempt có tham chiếu duy nhất trước khi gọi cổng thanh toán; không giữ transaction DB trong lúc gọi mạng. Khi timeout, đối chiếu attempt cũ trước khi tạo mới.
2. Webhook/callback server phải xác thực theo tài liệu provider, kiểm tra reference, số tiền, currency và merchant. Thiết kế parser theo yêu cầu chữ ký/raw body của provider.
3. Trong cùng transaction: khóa order, ghi nhận kết quả hợp lệ, chuyển giữ chỗ sang sold, đánh dấu PAID, phát hành đúng số lượng ticket. Callback lặp hoặc đến sai thứ tự không phát hành thêm vé, không ghi nhận doanh thu hai lần.
4. Trang return URL chỉ hỏi backend về trạng thái. Tham số URL hoặc nút bấm client không được chuyển đơn sang PAID.
5. Gửi email sau commit, thất bại email không làm mất vé; trang “Vé của tôi” là nơi truy xuất chính. Có quy trình đối chiếu đơn bị treo khi mất webhook.
6. MVP chỉ cho một attempt chưa rõ kết quả tại một thời điểm/order; nếu có thu tiền trùng vẫn lưu đủ giao dịch và đưa Admin xử lý, không tạo thêm vé.

### QR và check-in

- QR chứa token ngẫu nhiên đủ mạnh; không chứa thông tin cá nhân hoặc ID tuần tự dễ đoán. DB lưu hash dùng xác minh, bản token cần hiển thị lại phải được lưu mã hóa hoặc có thiết kế tương đương.
- Chỉ người mua xem QR của mình; chỉ Organizer sở hữu event được check-in, tài khoản phải đang hoạt động. Không cấp quyền quét toàn bộ sự kiện chỉ vì có role Organizer.
- Backend kiểm tra event, khung giờ check-in, ticket VALID và điều kiện cho phép; cập nhật có điều kiện hoặc khóa hàng, tạo checkin trong cùng transaction.
- Hai request đồng thời chỉ một request được thành công. UI phân biệt rõ sai mã, sai sự kiện, đã dùng, đã hủy và mất kết nối; mất mạng không hiển thị thành công.
- Quét camera trên HTTPS và thử thiết bị thật. Có nhập mã vé dự phòng nhưng vẫn đi qua toàn bộ xác thực/quyền/check-in phía server.

## 5. Hợp đồng API và màn hình

Các đường dẫn dưới đây là đề xuất, đều có prefix `/api`. Chốt request/response, mã lỗi, phân trang và enum trước khi web tích hợp. Giữ envelope hiện tại `success/message/data`, bổ sung error code ổn định; lỗi validation gắn được với field.

| Nhóm | API chủ đạo | Màn hình web |
| --- | --- | --- |
| Auth/profile | Giữ `/auth/*`; `GET/PATCH /me`, đổi mật khẩu, upload avatar | Login, Register, Reset password, hồ sơ |
| Public events | `GET /categories`, `GET /events`, `GET /events/:slug` | Trang sự kiện công khai, bộ lọc, chi tiết |
| Organizer applications | `POST/GET /me/organizer-applications`; Admin list/review | Form yêu cầu, trạng thái, hàng chờ duyệt |
| Organizer events | CRUD `/organizer/events`, submit, pause-sales, cancel; ticket-types theo event | Danh sách sự kiện, editor, loại vé, trạng thái duyệt |
| Orders/payment | `POST /orders`, `GET /me/orders`, `GET /me/orders/:id`, cancel đơn chưa trả; `POST /orders/:id/payments`; payment notification | Chọn vé, xác nhận đơn, đếm ngược, kết quả thanh toán, lịch sử |
| Tickets/check-in | `GET /me/tickets`, chi tiết; `POST /organizer/events/:id/checkins` | Vé QR, scanner, kết quả check-in |
| Organizer operations | GET orders/attendees/stats theo event của mình | Đơn hàng, người tham dự, dashboard |
| Admin | Users/status/lock; categories; event review/update/archive; payments; stats | Quản lý tài khoản, danh mục, duyệt sự kiện, giao dịch, tổng quan |

Web dùng public layout, customer layout, organizer layout và admin layout. Route guard hỗ trợ UX, backend vẫn kiểm quyền đầy đủ. Mỗi trang có loading/empty/error, validation, thao tác thử lại và responsive. Dashboard MVP ưu tiên thẻ số liệu + bảng; biểu đồ mở rộng sau khi dữ liệu đúng.

## 6. Các mốc triển khai

Ước lượng dưới đây là dự kiến cho một người backend và một người web làm khoảng 25–30 giờ/người/tuần, có môi trường và credential sandbox đúng hạn. Tổng khoảng 6–8 tuần, cần đo lại sau M0. Nếu một người làm cả hai, dự trù khoảng 10–12 tuần và điều chỉnh theo thời gian thực tế. Đây không phải cam kết lịch khi chưa biết nhân sự/deadline.

Backend đi trước về dữ liệu, API và quy tắc; web làm cùng từng module sau khi chốt hợp đồng. Mỗi mốc phải demo được trước khi sang mốc phụ thuộc tiếp theo.

| Mốc | Thời lượng dự kiến | Backend | Web | Điều kiện hoàn thành |
| --- | --- | --- | --- | --- |
| M0 Nền tảng và hợp đồng | 3–4 ngày làm việc | Kiểm tra build/local; baseline migration; env mẫu; seed; chốt ERD/API; chọn sandbox; spike QR/camera | Kiểm tra build; layout, routes, UI cơ bản; tách public page khỏi auth | DB mới dựng được, hai app chạy local, smoke test pass, có API contract và bằng chứng sandbox/camera khả thi |
| M1 Tài khoản và quyền | 4–5 ngày | Session/logout, khóa tài khoản, profile, ORGANIZER, yêu cầu và duyệt Organizer | Hoàn thiện auth/profile; form Organizer; Admin duyệt và quản lý tài khoản | Customer không gọi API quản trị; tài khoản bị khóa không dùng token cũ; duyệt xong có đúng quyền |
| M2 Sự kiện và loại vé | 5–6 ngày | Categories, events, upload, ticket types, review, ownership, public search/filter | Public list/detail; event editor; ticket editor; Admin review/categories | Organizer tạo được sự kiện; chỉ sự kiện đã duyệt được public; không sửa sự kiện người khác |
| M3 Đặt vé và giữ chỗ | 4–5 ngày | Orders/items/reservations; transaction; idempotency; hết hạn và nhả kho | Chọn loại/số lượng, checkout, đếm ngược theo expires_at, lịch sử đơn | Không oversell khi cạnh tranh; reload/retry không sinh đơn trùng; hết hạn trả kho đúng |
| M4 Thanh toán và vé QR | 5–6 ngày | Tích hợp sandbox thật; notification; đối chiếu; phát hành ticket | Redirect thanh toán, trạng thái pending/success/failure, danh sách và chi tiết QR | Chạy được giao dịch sandbox; return giả không cấp vé; webhook lặp chỉ cấp một bộ vé; có nhánh thanh toán trễ |
| M5 Check-in và vận hành | 4–5 ngày | Atomic check-in, attendees, organizer orders/stats, admin transactions/stats | Camera scanner, nhập mã dự phòng, danh sách, dashboard | Quét trên thiết bị thật; quét lặp/đồng thời không nhận hai lần; số liệu khớp đơn và vé |
| M6 Kiểm thử và staging | 4–5 ngày | Kiểm thử cạnh tranh/quyền, migrations, logs, health, job, build/deploy staging | E2E ba vai trò, responsive, lỗi mạng, camera, sửa lỗi | Demo E2E đầy đủ qua HTTPS; có hướng dẫn chạy, tài khoản demo, backup/restore và checklist nghiệm thu |

Quan hệ phụ thuộc: M0 → M1 → M2 → M3 → M4 → M5 → M6. Phần thiết kế scanner và khung dashboard có thể làm sớm; dữ liệu thống kê và check-in chỉ nghiệm thu sau M4. Cộng thêm khoảng một tuần dự phòng cho tích hợp, lỗi môi trường và chỉnh sửa sau demo. Kiểm thử thực hiện tại từng mốc, M6 là hồi quy tổng thể.

## 7. Backlog ưu tiên cho M0 và M1

| ID | Công việc | Phụ thuộc | Tiêu chí nhận |
| --- | --- | --- | --- |
| ARCH-01 | Public contracts, ownership map, private persistence, UnitOfWork và CI boundary checks | BE-01 | Event import/query Auth bị chặn; Payment không query Order; fixture vi phạm làm checker fail; rollback xuyên module hoạt động |
| BE-01 | Kiểm tra manifest/lockfile/runtime, dựng local, env mẫu và health endpoint | Không | Cài/build tái lập; env thiếu báo lỗi rõ; health không lộ secrets |
| BE-02 | Baseline migration từ các entity hiện tại, RBAC seed idempotent | BE-01 | Dựng DB trống được; kiểm tra DB hiện có trước khi áp dụng, không reset dữ liệu |
| BE-03 | Chốt ERD, trạng thái và API contract | BE-01 | Có FK/unique/check/index và mẫu request/response cho luồng chính |
| BE-04 | Hoàn thiện refresh session, rotation, logout, password reset và account status | BE-02 | Thu hồi session có hiệu lực; OTP dùng một lần/giới hạn lần thử; token tài khoản khóa bị chặn |
| BE-05 | Thêm quyền ORGANIZER và kiểm tra ownership dùng lại được | BE-03, BE-04 | Customer không tự nâng quyền; lỗi 401/403/404 nhất quán |
| BE-06 | Organizer application và Admin review; user status/lock; audit | BE-05 | Một pending/user; duyệt lặp không cấp trùng; lưu reviewer/lý do |
| FE-01 | Kiểm tra build/lint, route public và ba layout nghiệp vụ | Không | Vào trang public không bị chuyển login; layout responsive |
| FE-02 | Đồng bộ API error/session và form auth/profile | BE-03, FE-01 | Refresh/reload/logout đúng; login sai không tạo vòng lặp refresh |
| FE-03 | Form yêu cầu Organizer, trạng thái; Admin danh sách/duyệt/users | BE-06, FE-02 | Hoàn thành luồng yêu cầu → duyệt → đổi quyền trên UI |
| QA-01 | Seed Customer, hai Organizer, Admin; test quyền và session | BE-02 trở đi | Có test truy cập chéo hai Organizer, khóa tài khoản và refresh sau logout |

Các điểm sửa nền tảng đã thấy trong code: `logout()` hiện chưa thu hồi token; user chưa có trạng thái khóa/active; `checkAccountStatus` chưa thực sự chặn tài khoản; route gốc hiện bị bảo vệ; backend test chưa triển khai. Cần xử lý refresh token trong JSON response, CORS có credentials, reset OTP về NULL trong DB và cấu hình TLS DB như một phần M0/M1, xác minh bằng test trước khi coi là hoàn tất.

## 8. Kiểm thử và tiêu chí nghiệm thu

Thiết lập integration test trên PostgreSQL riêng cho test; không mock database cho các bài kiểm tra khóa/transaction. Dùng bộ kiểm thử E2E trình duyệt được bổ sung trong M0. Chốt công cụ và phiên bản tương thích khi triển khai, không sao chép phiên bản từ README stack khác.

| Tình huống bắt buộc | Kết quả mong đợi |
| --- | --- |
| Customer gọi API Admin; Organizer A xem/sửa order/event của B | Bị từ chối kể cả gọi trực tiếp API |
| Khóa tài khoản đang có session; refresh sau logout/reset password | Quyền truy cập bị thu hồi đúng chính sách, refresh cũ không dùng lại được |
| 20 yêu cầu đồng thời mua mỗi yêu cầu 1 vé khi chỉ còn 5 | Tối đa 5 vé được giữ/bán, không có counter âm hoặc vượt capacity |
| Double click checkout, retry do timeout | Cùng idempotency key không tạo thêm đơn |
| Job hết hạn chạy lặp hoặc cạnh tranh với webhook | Chỉ một chuyển trạng thái hợp lệ; không nhả/tiêu thụ tồn kho hai lần |
| Chữ ký sai, số tiền sai, merchant sai, giả return URL | Không PAID, không có vé hợp lệ |
| Webhook thành công gửi lặp, gửi muộn, gửi sai thứ tự | Một lần ghi nhận doanh thu, một bộ vé; ngoại lệ sau nhả kho vào review |
| Provider đã thu tiền nhưng ứng dụng timeout/mất webhook | Đối chiếu phục hồi hoặc đưa vào hàng chờ xử lý, có dấu vết truy vết |
| QR giả, sai event, đã check-in, ticket VOID | Từ chối với thông báo phù hợp |
| Hai thiết bị check-in cùng vé đồng thời | Một check-in thành công, một kết quả đã sử dụng |
| Mất quyền camera hoặc mất mạng | Có hướng dẫn/nhập mã dự phòng; không báo thành công giả |
| Thống kê đối chiếu dữ liệu demo | Vé bán/phát hành bằng tổng lượng vé của đơn PAID; check-in theo unique ticket; doanh thu chỉ tính PAID một lần |

Definition of Done cho mỗi module: migration/API/UI đi cùng nhau, validation và kiểm quyền phía server, test nhánh lỗi quan trọng pass, build/typecheck pass, web lint pass, không có secrets trong source/log và demo từ dữ liệu seed thành công.

Boundary checks và test rollback transaction xuyên module là điều kiện nền tảng M0. Các module M1 trở đi phải tuân thủ ARCH-01; cùng DB không miễn trừ ownership. Không coi việc chỉ tạo folder là đã enforce kiến trúc.

Definition of Done cho MVP: hoàn thành luồng ba vai trò trên staging HTTPS bằng thanh toán sandbox thật và camera thiết bị thật; migration chạy trên DB trống; có hướng dẫn local/deploy, seed demo, log tra theo order/payment ID, job được giám sát và không còn lỗi chặn luồng chính.

## 9. Triển khai staging và các quyết định còn mở

Ở M0 cần ghi lại lựa chọn cổng thanh toán, quyền truy cập sandbox, SMTP, Cloudinary, database riêng, domain/HTTPS, nơi chạy container và lịch chạy job. Chưa có thông tin để khẳng định các dịch vụ này đã được cấp. Nếu thiếu sandbox thì vẫn làm adapter và mock cho development nhưng mốc M4 chưa được nghiệm thu.

Tái sử dụng hướng container hiện có sau khi kiểm tra lại runtime/dependency. Đổi mọi project/image/service cũ sang môi trường PBL6 đã chọn; tách secrets khỏi image; sửa API URL build của web; cấu hình cookie/CORS theo domain thực tế. Chạy migration như một bước release có kiểm soát thay vì để mọi instance tự migration khi khởi động. Backup DB trước migration, ưu tiên thay đổi tương thích ngược và có hướng dẫn rollback ứng dụng; không tự rollback migration mất dữ liệu.

Điểm cần chốt khi bắt đầu: số thành viên và thời gian rảnh, deadline bảo vệ, cổng thanh toán có sandbox khả dụng, thiết bị/trình duyệt nghiệm thu, chính sách giữ vé/check-in và yêu cầu hủy/hoàn tiền của giảng viên. Những điểm này điều chỉnh lịch hoặc phạm vi, không ngăn việc bắt đầu M0.

## 10. Đối chiếu tài liệu đề tài

Nguồn: `PBL 6_ Dự án CN Công nghệ phần mềm (1).docx`, đối chiếu nội dung các nhóm yêu cầu; không đánh giá hình thức trình bày tài liệu Word.

| Nhóm yêu cầu đề tài | Mốc thực hiện | Giới hạn MVP |
| --- | --- | --- |
| 1–6, 21: tài khoản, Organizer, hồ sơ | M1 | Giữ email/password; không thêm OAuth |
| 7–13: danh mục, sự kiện, phê duyệt, tìm kiếm, loại vé | M2 | Xóa theo ràng buộc; hủy sự kiện chỉ khi chưa có thanh toán thành công/đang xử lý |
| 14: đặt vé | M3 | Một event/order; không sơ đồ ghế |
| 15–17: thanh toán, vé điện tử, lịch sử | M4 | Một cổng sandbox; không hoàn tiền tự động/chuyển nhượng |
| 18–20: đơn, người tham dự, QR/check-in | M5 | Organizer sở hữu event; check-in online; người tham dự biểu diễn theo vé/người mua |
| 22–24: thống kê và giao dịch | M5 | Số liệu và bảng cơ bản; giao dịch chỉ tra cứu/đánh dấu cần xử lý, không chỉnh trạng thái thành công tùy ý |

Thứ tự bắt đầu cụ thể: BE-01 + FE-01 → ARCH-01 + BE-02/BE-03 → BE-04/FE-02 → BE-05/BE-06/FE-03. Chưa mở rộng mobile hoặc tách process trước khi ranh giới module và luồng MVP backend + web được nghiệm thu. Ước lượng ban đầu cần cập nhật sau M0 theo công sức thiết lập enforcement.
