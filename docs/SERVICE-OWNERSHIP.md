# Ranh giới service và quyền sở hữu dữ liệu MVP

Ngày cập nhật: 01/10/2026. Quyết định của người dùng: dùng chung một PostgreSQL theo thiết kế MVP, nhưng enforce quyền sở hữu dữ liệu trong code; mọi truy cập chéo miền đi qua interface công khai.

**Cách triển khai đã chốt: modular monolith trước, tách process sau.** MVP có một Express process và một database; Auth, Event, Order, Payment và Audit là các module có ranh giới rõ ràng. Interface gọi nội bộ qua dependency injection; chưa thêm HTTP giữa module hoặc message broker. Đây là bước chuẩn bị cho microservices, chưa gọi bản MVP là các microservice triển khai độc lập.

## 1. Ma trận sở hữu 20 bảng nghiệp vụ

| Miền sở hữu | Bảng được trực tiếp SELECT/INSERT/UPDATE/DELETE | Public interface chính |
| --- | --- | --- |
| Auth | users, roles, permissions, users_roles, roles_permissions, auth_sessions, password_reset_challenges, organizer_applications | Xác thực/session, principal và permission, hồ sơ công khai, snapshot người mua, xét duyệt Organizer |
| Event | categories, events, event_reviews | Nội dung/phê duyệt sự kiện, quyền sở hữu event, chính sách bán/check-in, tìm kiếm public |
| Order | ticket_types, orders, order_items, reservations, tickets, checkins | Cấu hình loại vé, báo giá, giữ/nhả kho, checkout, xác nhận kết quả thanh toán, phát hành vé và check-in |
| Payment | payments, payment_notifications | Tạo attempt, giao tiếp provider, xác minh webhook, đối chiếu và trả kết quả thanh toán đã xác minh |
| Audit | audit_logs | Append bản ghi đã lọc và đọc audit theo quyền; không export repository |

`ticket_types` thuộc Order vì capacity/reserved/sold và reservation cần một bên chịu trách nhiệm. Event không được cập nhật riêng name/price hoặc counter của cùng bảng. API quản lý loại vé có thể đặt trong màn hình Organizer, nhưng handler chuyển tới Order; vị trí trên UI/URL không quyết định owner của dữ liệu.

Ticket và Check-in là module riêng bên trong miền Order. Chúng không được query repository Order tùy ý; dùng interface nội bộ. Chúng nằm cùng đơn vị transaction với đặt vé để có thể giữ cam kết PAID + trừ tồn kho + phát hành vé nguyên tử. Nếu tách process riêng trong tương lai phải thiết kế lại bằng cơ chế thông điệp và xử lý bù.

Auth sở hữu cả Organizer application để duyệt hồ sơ và gán role trong một transaction nội bộ. Event lấy organizer_id và quyền từ Auth interface, không join bảng users hoặc đọc roles_permissions.

## 2. Quy tắc code bắt buộc

1. Entity, repository, DataSource và query builder là chi tiết private của owner. Chỉ export DTO, schema validation, error code và interface use case.
2. Cấm import entity/repository/internal service của miền khác, kể cả qua relative path, alias hoặc barrel export. Cấm `getRepository('users')`, raw SQL hoặc query builder join sang bảng của owner khác để lách import rule.
3. Chỉ persistence adapter được import TypeORM. Controller/application/domain không có DB handle và không gọi `dataSource.query()` trực tiếp.
4. Cross-owner FK vẫn được giữ trong database như thiết kế hiện tại. FK là ràng buộc toàn vẹn, không cấp quyền query; entity giữ foreign ID scalar, không khai báo eager/lazy relation hoặc cascade save xuyên owner.
5. Không chia sẻ TypeORM entity qua package contracts. DTO chỉ có dữ liệu cần thiết; không có password hash, token hash/ciphertext, OTP hoặc thông tin thanh toán nhạy cảm.
6. Interface mang nghĩa nghiệp vụ: `getPublicOrganizer`, `quoteOrder`, `applyVerifiedPayment`. Không export `findAnyUser`, `runSql`, `getRepository` hoặc endpoint generic truy cập bảng.
7. Principal và service identity là hai thứ riêng: caller service phải được xác thực, thao tác thay người dùng cần principal đáng tin và owner vẫn kiểm RBAC/ownership. Header userId/role do browser gửi không phải bằng chứng quyền.
8. Reporting/Admin dùng interface tổng hợp của từng owner; không được tạo “report repository” join tùy ý cả database. Nếu cần read model riêng thì khai báo owner, dữ liệu nguồn và độ trễ đồng bộ trước.
9. Migration thuộc owner của bảng. Một release runner có quyền DDL chạy theo manifest chung để xử lý FK chéo; runtime service không tự migrate toàn bộ DB khi startup.
10. Cùng DB không đồng nghĩa dùng chung transaction qua HTTP. EntityManager/QueryRunner không được truyền qua mạng hoặc đưa vào package contracts.

## 3. Contract dự kiến

| Caller → owner | Interface | Dữ liệu/hiệu ứng cho phép |
| --- | --- | --- |
| Event/Order/Payment → Auth | `resolvePrincipal(credential)` | userId, sessionId, active, permissions; Auth tự kiểm session và trạng thái tài khoản |
| Event → Auth | `getPublicOrganizer(userId)` | Tên/ảnh/tên tổ chức công khai, không trả credentials hoặc hồ sơ riêng |
| Order → Auth | `getBuyerSnapshot(principal)` | Tên/email của chính buyer được phép lưu vào đơn |
| Order → Event | `getEventPolicy(eventId)` / `acquireEventGuard(ctx, eventId)` | DTO owner/nội dung/thời gian; khi thay đổi nghiệp vụ dùng guard giữ khóa event trong transaction, không chỉ đọc snapshot ngoài transaction |
| Event/public API → Order | `getTicketOfferings(eventIds)` | Tên loại vé, giá, thời gian bán, lượng khả dụng; hỗ trợ batch để tránh N+1 |
| Organizer API → Order | `configureTicketType(command, principal)` | Tạo/sửa/archive loại vé; Order kiểm quyền qua Event interface |
| Payment → Order | `preparePayment(ctx, command)` | Xác minh buyer/order/giữ chỗ; trả giá trị thanh toán do Order quyết định, deadline và tham chiếu dùng retry |
| Payment → Order | `applyVerifiedPayment(ctx, result)` | Kết quả provider đã được Payment xác minh; Order tự quyết định PAID, phát hành vé hoặc từ chối vì hết hạn/trùng |
| Order → Payment | `getPaymentOutcome(reference)` | Trạng thái payment có chứng thực và thời điểm đối chiếu; không trả entity hoặc provider secret |
| Dashboard → từng owner | `getSummary(scope, filters)` | Số liệu do owner tính, có quyền truy cập và thời điểm dữ liệu |
| Các owner → Audit | `appendAudit(ctx, record)` | Chỉ sự kiện đã lọc, có actor/requestId; cùng transaction với thay đổi được ghi nhận, không truy cập audit repository trực tiếp |

Payment không được UPDATE orders, INSERT tickets hoặc đọc order_items trực tiếp. `applyVerifiedPayment` phải idempotent và trả kết quả phân biệt `APPLIED`, `ALREADY_APPLIED`, `LATE_PAYMENT`, `DIFFERENT_PAYMENT_ALREADY_APPLIED`, `REJECTED_MISMATCH`. Order không được tự tuyên bố provider đã thanh toán; chỉ Payment xác minh dữ kiện đó.

Interface xác thực kết quả payment chỉ được cung cấp cho Payment adapter/workflow nội bộ đáng tin qua composition root, không expose cho browser. Kiểm lại orderId, amount, currency và payment reference ở Order. Client không được gọi API chung `markPaid`. Khi tách process, thay bảo vệ caller nội bộ bằng service authentication. Timeout không đồng nghĩa command thất bại; caller retry cùng command/reference, không tạo giao dịch mới.

Các DTO hướng nghiệp vụ là contract có thể dùng qua mạng sau này. Tham số `ctx` và guard là **local transactional port** chỉ tồn tại trong bản cùng process, không serialize hoặc đưa vào remote API. Khi tách process phải thay giao thức transaction, không chỉ thay implementation interface bằng HTTP.

## 4. Enforce trong quá trình triển khai

- Mỗi owner có persistence folder riêng và public entrypoint. Build/CI kiểm dependency graph, cấm import ngoài entrypoint, gồm import type và re-export.
- Cấu hình lint/dependency check chặn TypeORM ngoài persistence và chặn import internal chéo owner. Thêm fixture vi phạm để chứng minh checker thật sự bắt được, không chỉ viết quy ước.
- Persistence registry theo owner chỉ cấp repository của các entity được khai báo. Không export DataSource chung từ `configs/database.config.ts` cho mọi module như hiện tại.
- Kiểm tra câu query thực tế trong integration test với allowlist bảng theo owner, gồm SELECT/JOIN/UPDATE/DELETE và raw query; không chỉ dựa vào regex trên source. Đây là guardrail/test, không tự coi là hàng rào bảo mật tuyệt đối khi cùng DB credential.
- Không cho runtime load migrations hoặc entity glob toàn repository. Migration runner là công cụ riêng, được phép đọc metadata của nhiều owner để quản lý schema.
- Contract tests kiểm DTO/error/idempotency; access tests kiểm Event không chạm bảng Auth và Payment không chạm bảng Order kể cả nhánh retry/report.
- DB credentials riêng và GRANT theo bảng có thể bổ sung sau. Giai đoạn hiện tại ownership được enforce bằng code/CI theo yêu cầu, không tuyên bố đã được DB cô lập quyền.

## 5. Cấu trúc code đích

```text
server/src/
  bootstrap/                    # Composition root, wiring các interface
  platform/
    transaction/                # UnitOfWork, opaque WorkContext, registry private
    errors/ logging/
  contracts/                    # DTO/schema/interface thuần; không import TypeORM
    auth/ event/ order/ payment/ audit/
  workflows/                    # Use case phối hợp; không có repository/SQL
    checkout/ payment-result/ event-lifecycle/
  modules/
    auth/                       # Identity, RBAC, profile, Organizer application
      public.ts
      application/ domain/ infrastructure/ http/
    event/                      # Categories, events, review
      public.ts
      application/ domain/ infrastructure/ http/
    order/                      # Catalog vé, tồn kho, order, ticket, check-in
      public.ts
      application/ domain/ infrastructure/ http/
    payment/                    # Provider adapters, payments, notifications
      public.ts
      application/ domain/ infrastructure/ http/
    audit/
      public.ts
      application/ infrastructure/
  migrations/                   # Runner chung, migration có owner rõ ràng
```

Các module con của Order (inventory, checkout, ticket, checkin) vẫn dùng interface nội bộ thay vì import repository tùy ý. HTTP controller thuộc module sở hữu use case hoặc gọi workflow; routing `/organizer/*` và `/admin/*` không tạo một owner mới.

Chỉ composition root được import factory/private wiring cần thiết để dựng module. Module được inject implementation của interface, không `new OtherModuleService()` hoặc lấy từ service locator toàn cục. Shared kernel chỉ có kiểu ID, error, clock, pagination và transaction abstraction; không có User/Event/Order entity hoặc generic repository.

## 6. Transaction xuyên module trong cùng process

UnitOfWork ở platform mở một TypeORM transaction. Workflow nhận `WorkContext` opaque và truyền qua các **local public port**. Context không chứa `EntityManager`, QueryRunner, repository hoặc hàm SQL công khai; chỉ persistence adapter đã đăng ký với owner mới resolve được context thành repository có phạm vi cho owner đó. Platform quản lý connection không được chứa nghiệp vụ.

Không được mở transaction độc lập trong module con khi workflow đã cung cấp context. Nếu thiếu context ở thao tác bắt buộc tham gia workflow thì báo lỗi, không âm thầm dùng repository ngoài transaction.

Luồng payment thành công:

1. Payment xác minh chữ ký/provider reference/số tiền ngoài transaction ghi nghiệp vụ, xác lập DTO đáng tin; không gọi provider khi giữ DB lock.
2. Workflow mở UnitOfWork. Qua Event port, lấy event guard; qua Order port, khóa order/ticket_types/reservations theo thứ tự thống nhất.
3. Qua Payment port, khóa và ghi payment đã xác minh. Qua Order port, xác nhận PAID, chuyển reservation/counter và phát hành vé bằng Ticket port nội bộ. Payment không đọc hoặc ghi bảng Order.
4. Qua Payment port đánh dấu notification đã xử lý; qua Audit port append log. Commit toàn bộ; bất kỳ lỗi nào rollback toàn bộ các thay đổi này. Inbox có thể đã được lưu trước đó để retry.
5. Email hoặc thao tác mạng khác chỉ chạy sau commit. Callback lặp được các owner xử lý idempotent theo unique key và trạng thái hiện tại.

Order phải là nơi duy nhất quyết định chấp nhận payment vào một đơn. Workflow được phép phối hợp các public port nhưng không được tự tính lại quy tắc tồn kho hoặc sửa trạng thái thay Order. Trường hợp late/duplicate charge vẫn ghi sự thật tại Payment và nhận quyết định không phát hành vé từ Order.

Giữ thứ tự khóa của thiết kế DB: Event → Order → ticket_types → reservations → Payment → Ticket → notification. Guard được owner thực hiện trong persistence; module khác chỉ nhận kết quả/capability cần thiết, không nhận row/entity. Khi Payment là điểm nhận webhook, không khóa payment trước rồi gọi Order theo thứ tự ngược lại.

Các luồng tương tự:

- Tạo đơn: Event cung cấp sale guard, Auth cung cấp buyer snapshot, Order tạo order/items/reservations và cập nhật kho của mình.
- Sửa/hủy Event: workflow lấy Event guard, hỏi Order về order/reservation và Payment về attempt trong cùng WorkContext; mỗi owner kiểm tra/cập nhật bảng mình. Không dùng `.leftJoin('orders', ...)` từ Event.
- Check-in: Event cung cấp ownership/time guard; Order kiểm paid/ticket và thực hiện cập nhật Ticket/Checkin nguyên tử.
- Duyệt Organizer: hoàn toàn trong Auth, gán role và duyệt application cùng transaction, gọi Audit append cùng context.

Auth introspection/RBAC chỉ là interface đọc dữ liệu được cho phép; những workflow cần khóa user để đảm bảo thao tác không đua với khóa tài khoản phải dùng Auth guard trước Event, thống nhất thứ tự **Auth user/session → các khóa nghiệp vụ ở trên**. Không giữ Event rồi mới xin khóa Auth.

## 7. Lộ trình tách process

Chỉ tách process sau khi boundary checks và contract tests đã chạy ổn định. Database dùng chung vẫn được giữ ở bước đầu tách; mỗi service chỉ có entity/repository của owner mình, cấm join chéo như bản cùng process.

1. Tách Auth trước qua adapter API; giữ toàn bộ kiểm tra session/account tại Auth. Định nghĩa fail-closed cho thao tác bảo vệ khi Auth không truy cập được; không thay kiểm tra khóa tài khoản bằng JWT offline mà chưa chấp nhận độ trễ thu hồi quyền.
2. Trước khi tách Payment, bổ sung outbox/inbox hoặc command log bền vững, command ID, retry/backoff và reconciliation. Payment commit kết quả của provider, Order commit việc hoàn tất đơn trong transaction riêng; không còn hứa payment/order/ticket cùng rollback. UI cần trạng thái xử lý trong khoảng đồng bộ.
3. Trước khi tách Event khỏi Order, thiết kế protocol version/lease hoặc workflow ngừng bán có xác nhận để đóng khoảng đua giữa thay đổi event và giữ vé. Một lần GET event rồi đặt vé không tương đương Event guard trong transaction.
4. Ticket/Checkin vẫn nằm trong Order cho MVP. Nếu tách tiếp thì phải thiết kế giao nhận idempotent và tình trạng phát hành vé đang xử lý; không giữ giả định một transaction giữa process.
5. Audit chuyển thành consumer/API riêng chỉ sau khi có cơ chế ghi bền vững để không mất log sau commit. Schema/FK chéo vẫn tạo coupling migration khi dùng chung DB; tách database là một bước khác, không tự đạt được bằng tách process.

Outbox/inbox liên service và distributed saga **chưa được thêm vào 20 bảng hiện tại**, vì bản MVP vẫn cùng process. Việc chọn thư viện giao tiếp/broker sẽ được quyết định ở giai đoạn tách, không đưa thêm hạ tầng vào MVP ngay.

## 8. Tiêu chí hoàn thành phần nền tảng ownership

- Import Auth repository từ Event hoặc Order entity từ Payment làm CI fail, kể cả qua alias/re-export.
- Runtime integration test phát hiện query bảng ngoài allowlist owner; TypeORM relation không tạo join chéo ngoài ý muốn.
- Payment webhook không có quyền gọi repository Order; chỉ chuyển kết quả qua public port/checkout workflow.
- Inject lỗi sau khi Payment ghi SUCCEEDED nhưng trước khi phát hành vé: cả payment/order/kho/ticket trong workflow rollback, inbox vẫn retry được nếu đã ghi trước transaction.
- Callback lặp và hai check-in cạnh tranh không tạo dữ liệu trùng; counter khớp lịch sử.
- Mock Auth/Event bằng public interface cho unit test được, không cần import entity của hai module.
- Admin/report không bypass ownership vì cần dashboard; dùng batch DTO và owner-scoped summary.

Đã triển khai modular monolith, owner store/query guard, boundary checker, migration và kiểm thử rollback. Implementation dùng AsyncLocalStorage riêng trong platform để truyền transaction nội bộ thay cho WorkContext tường minh mô tả ở trên; public port không lộ EntityManager. Chi tiết nghiệm thu và phần chưa triển khai nằm tại [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md).
