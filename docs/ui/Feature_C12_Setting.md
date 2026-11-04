# Feature C12 — Cấu hình hệ thống & cổng thanh toán

## 1. Phạm vi và trạng thái

- Cập nhật triển khai: **2026-11-05 00:26:04 UTC+07** (Asia/Ho_Chi_Minh).
- Báo cáo mới nhất: [C12 implementation](../reports/stitch/C12_20261105_001401_implementation.md). Lịch sử: [scope update](../reports/stitch/C12_20261105_000358_scope_update.md), [review gốc](../reports/stitch/C12_20261104_234658_review_plan.md).
- Đã triển khai frontend/backend và kiểm thử trên DB cô lập; Stitch giữ nguyên. Chưa rollout API8000/DB ứng dụng hiện hữu.
- **Phạm vi đã được người dùng chốt:** thông tin **VietQR qua SePay**, **VNPay Sandbox**, và **quản trị viên/phân quyền**. Loại bỏ chức năng còn lại. Người dùng đã xác nhận dùng quyền hiện có + quản lý admin riêng trong phiên triển khai.
- Trạng thái: **ĐÃ TRIỂN KHAI SOURCE — ĐẠT CÓ ĐIỀU KIỆN**. API/UI scope mới đã hoạt động trên DB cô lập; còn rollout và full a11y/browser khác. Kết luận KHÔNG ĐẠT ở report gốc là đánh giá theo scope cũ.
- Master Plan ban đầu ghi C12 “Cấu hình hệ thống & cổng thanh toán”, screen `34aa55a7c6a14d4489815e436cbfe34b`, “Chưa có route rõ ràng”, “Chưa xác minh; cần kiểm tra backend và phân loại màn hình”. Không có đặc tả chi tiết từng trường C12; inventory dưới đây lấy từ artifact thực tế, không suy diễn thành yêu cầu đã duyệt.
- Yêu cầu triển khai sau này: dùng lại header/sidebar qua `AdminShell`; TSX và CSS trong **một file**, JSX/thuộc tính/CSS khai báo theo **multi-line formatting**. Không tạo CSS riêng, không sửa component chung để phục vụ riêng C12.

## 2. Nguồn Stitch đã xác minh và thiết kế cần sao chép

Project chính thức `10374042969343935993` — EventHub; screen `34aa55a7c6a14d4489815e436cbfe34b`. Trong phiên review 04/11, `get_project`, `get_screen`, hai lần `download_file` đều thành công. Đã đọc HTML và xem trực tiếp ảnh; không thiếu quyền truy cập ở phiên đó. Phiên cập nhật scope 05/11 không gọi lại Stitch hoặc API, không edit/generate/apply design system.

- Metadata: “C12. Cấu hình hệ thống & Cổng thanh toán - Cosmic Ticket Quản Trị Viên”, DESKTOP, **2560 × 6296** theo get_screen (không suy ra đây là CSS viewport).
- HTML resource: `projects/10374042969343935993/files/13980447167328155463`.
- Screenshot resource: `projects/10374042969343935993/files/10180019950971446207`.
- Tham chiếu dự án: https://stitch.withgoogle.com/projects/10374042969343935993
- Không lưu bản sao HTML/ảnh vào repo trong phiên chỉ tạo tài liệu; có thể tải lại bằng resource trên qua Stitch MCP.

### 2.1. Inventory thiết kế gốc — chỉ tham chiếu lịch sử

Danh sách dưới đây mô tả artifact đã review, **không phải danh sách chức năng sẽ triển khai**. Scope hiện hành ở mục5–7 thay thế yêu cầu triển khai đầy đủ trước đây.

1. Shell sidebar 288px, header 80px; vùng nội dung có breadcrumb và tiêu đề “Cấu Hình Hệ Thống, Cổng Thanh Toán & Bảo Mật Toàn Sàn”. Khi triển khai chỉ sao chép vùng nội dung, shell dùng component hiện có theo yêu cầu người dùng.
2. Nhóm hành động: Sao lưu dữ liệu, Bảo trì hệ thống, Lưu tất cả cấu hình.
3. Bốn KPI mẫu: gateway latency 12ms; escrow 14.82 tỷ đồng/42 chiến dịch; chặn bot 128,490/24h; 03 super admins và thông tin 2FA.
4. Ba tab: Cổng thanh toán & Webhook; Phí sàn & Chính sách Escrow; Bảo mật & Chống phe vé (Anti-Bot).
5. Lưới cổng thanh toán hai cột ở breakpoint xl: VietQR PRO/MBBank, MoMo, Visa/Mastercard/Cybersource, Vietcombank dự phòng. Có thông tin tài khoản, webhook, trạng thái, latency/phí, partner, hạn mức, currency, 3DS/tokenization và các nút thao tác.
6. Bảng “4. Phân Quyền Quản Trị Viên”: danh tính, vai trò, quyền hạn, 2FA, khóa root/chỉnh sửa; nút Audit Logs và Thêm quản trị viên.

**Thiếu ngay trong artifact:** HTML chỉ có comment cho SECTION 2 & SECTION 3, không có form phí/Escrow/Anti-Bot. Script tìm `qrSlider` nhưng không có control tương ứng. Tab chưa có logic chuyển nội dung. Bảo trì chỉ `confirm` rồi `alert`, không gọi backend. Không được coi đó là nghiệp vụ đã hoạt động hoặc tự thiết kế các panel còn thiếu.

### 2.2. Đối chiếu Cosmic Graffiti

| Thành phần | Bằng chứng | Đánh giá và hướng giữ thiết kế |
|---|---|---|
| Màu | Artifact dùng surface `#0f1222`, card `#181b2a`, primary-container `#7c3aed`, secondary `#5de6ff`, tertiary `#ffafd3`, text `#e0e1f7` | Phù hợp semantic palette trả từ project. Khác palette mô tả brand `#080B1A/#10162B/#22D3EE/#F472B6/#F8FAFC`; ghi nhận mâu thuẫn nội bộ designMd, không tự đổi màu Stitch về palette chung |
| Font | Có import Syne, Be Vietnam Pro, Space Grotesk; token headline/body/label có cấu hình | `font-heading`, `font-body`, `font-code` được dùng nhưng không khai báo alias tương ứng trong tailwind-config; phải xác minh computed font trước ánh xạ, không đánh dấu typography hoàn toàn đạt |
| Radius/spacing | DEFAULT 4px, lg 8px, xl 12px; gutter24/margin32 | Khác mô tả roundness8/card16 của designMd; ưu tiên sao chép artifact, không âm thầm chuẩn hóa |
| Phân cấp | Header → KPI → tab → cards → RBAC rõ ràng | Tiêu đề/nút xuống nhiều dòng; tên VietQR truncate; bảng và nhãn dài cần kiểm tra viewport thực tế |
| Ngôn ngữ | Tiếng Việt xen thuật ngữ kỹ thuật | Metadata, webhook domain, partner và thông báo bảo trì còn Cosmic Ticket; danh tính/số liệu/tài khoản mẫu không phải dữ liệu vận hành |
| Responsive/a11y | Có grid responsive và table overflow; shell fixed/pl-72 | Không có bằng chứng mobile/keyboard/contrast/screen reader; switch ẩn input và label chưa chứng minh accessible name; không PASS từ ảnh desktop |

Không sửa Stitch. Người dùng đã cho phép rút gọn nội dung C12: bỏ các nhóm ngoài scope và thêm thông tin VNPay Sandbox vào vùng thẻ cổng theo style hiện có. Giữ màu, typography, bố cục thẻ và bảng của phần được giữ; dùng shared shell. Không cần bổ sung panel2/3 đã bị loại bỏ. Không suy diễn việc đổi scope thành quyền thiết kế lại toàn màn hình.

## 3. Những điểm chưa đạt theo review gốc 04/11

G04/G06 và phần credentials/ping/failover ở G05, 2FA ở G07, panel2/3 ở G09 đã bị loại khỏi phạm vi; không còn là blocker nghiệm thu scope mới. Các lỗi route/page/shell, thiếu API đọc thông tin cổng và quản trị viên/phân quyền, cùng kiểm thử runtime vẫn cần xử lý.

| Mã | Phát hiện | Bằng chứng / tác động |
|---|---|---|
| G01 — chặn | Chưa có page C12 riêng | `Admin.tsx` không có nhánh settings; sidebar đã trỏ `/admin/settings` |
| G02 — chặn | Route có thật nhưng rơi vào UI generic và API không tồn tại | `App.tsx` `/admin/:tab` có ADMIN guard; `AdminData` sinh `/admin/settings?page=0&`; HTTP ADMIN trả404 |
| G03 | Chưa dùng shared shell cho settings | `isAdminConsolePage` chưa bao gồm settings; cần đưa C12 vào nhận diện shell khi triển khai để tránh header public/generic tabs |
| G04 — chặn | Không có CRUD cấu hình tổng thể/lưu tất cả | `/config` chỉ GET hai trường; không có contract ghi, version, validation hoặc atomic save |
| G05 — chặn | Thiếu API registry/credentials/ping/failover cổng | SePay vận hành qua cấu hình runtime, không tương đương MBBank Open API trực tiếp hoặc UI quản lý đa cổng |
| G06 — chặn | Thiếu escrow/fee/anti-bot/telemetry | Không được suy ra quỹ ký quỹ từ doanh thu hoặc thời gian HTTP thành latency ngân hàng |
| G07 — chặn | Thiếu admin RBAC matrix và 2FA | `/admin/users` chỉ khách hàng, loại ADMIN/ORGANIZER; `/auth/me` chỉ người đang đăng nhập |
| G08 | Thiếu loading/error/empty/success/dirty/save states riêng C12 | Loading/Notice generic không chứng minh form cấu hình đã triển khai |
| G09 | Artifact thiếu panel tab2/3, liên kết giả và sample branding/data | Cần chốt phần thiết kế còn thiếu; không phát sinh thêm giao diện tự suy đoán |
| G10 | Chưa kiểm thử runtime UI/responsive/a11y | Phiên này review source, HTML/ảnh và HTTP; chưa browser/pixel diff |

Nguồn code: `client/src/App.tsx`, `client/src/pages/admin/{Admin,AdminShell,AdminHeader,AdminSidebar}.tsx`, `server/src/app.ts`, `server/src/modules/auth/{public.ts,infrastructure/store.ts}`, `server/src/modules/audit/public.ts`, `server/src/configs/sepay-runtime.ts`.

## 4. API đã kiểm thử bằng dữ liệu đúng — bằng chứng 04/11

Môi trường **http://localhost:8000**, prefix `/api`, ngày 04/11/2026 UTC+07. Chỉ login và GET; không seed, không gọi mutation cấu hình/thanh toán, không ping provider thật. Login tạo phiên xác thực; không tuyên bố hoàn toàn không ghi DB. Mật khẩu lấy từ biến DEMO_PASSWORD có sẵn, không ghi credential/token/PII vào tài liệu.

| Method/path và input thực tế | Quyền | Kết quả HTTP/response | Khả năng phục vụ C12 |
|---|---|---|---|
| GET `/api/health`, không body/query | Public | 200 `{success:true,data:{status:"ok"}}` | Health ứng dụng có truy vấn categories; không phải uptime/latency ngân hàng |
| GET `/api/config`, không body/query | Public | 200 `{success:true,data:{paymentMode:"disabled",sepayEnabled:true}}` | Chỉ hai cờ read-only; disabled là legacy provider, không có nghĩa SePay tắt |
| POST `/api/auth/login`, JSON `{email:"admin@example.test",password:<DEMO_PASSWORD>}` | Public | 200, data có user/accessToken | Chuẩn bị Bearer ADMIN; không có API super-root riêng |
| GET `/api/auth/me` | ADMIN | 200, roles `[USER,ADMIN]`, trường identity/permissions | Shared header; không trả danh sách admin hoặc 2FA |
| GET `/api/admin/settings?page=0&` | Không token / ADMIN | 401 UNAUTHORIZED / 404 NOT_FOUND “API không tồn tại.” | Xác nhận route gọi từ generic page đang thiếu; 401 riêng lẻ không chứng minh endpoint tồn tại |
| GET `/api/admin/users?page=0&limit=1` | ADMIN | 200, `{data,pagination}`, 1 dòng | Khách hàng, không dùng làm RBAC matrix |
| GET `/api/admin/users?q=admin%40example.test&page=0&limit=10` | ADMIN | 200, 0 dòng | Phù hợp SQL loại ADMIN/ORGANIZER; không phải danh sách quản trị viên rỗng |
| GET `/api/admin/sepay/transactions?page=0&limit=1` | ADMIN | 200, data array 1 dòng | Dữ liệu giao dịch liên quan C10, không cấu hình gateway |
| GET `/api/admin/sepay/transactions?page=0&limit=2&status=PROCESSED` | ADMIN | 200, 2 dòng, cả hai status PROCESSED | Filter hợp lệ đã kiểm; không chứng minh gateway đang khỏe |
| GET `/api/admin/sepay/transactions?page=0&status=INVALID` | ADMIN | 400 VALIDATION | Validation status hoạt động |
| POST `/api/auth/login`, account customer@example.test và mật khẩu fixture | Public | 200 | Chuẩn bị kiểm quyền USER |
| GET users `?page=0&limit=1` và SePay transactions `?page=0&limit=1` như trên | USER | Cả hai403 FORBIDDEN | Không cho khách hàng đọc API admin |

Hợp đồng source: routes trong `app.ts` gọi Auth public→auth store hoặc SePay reconciliation; module boundary không có settings service. `/health` gọi Event categories; `/config` đọc provider/config tại runtime. `SEPAY_ACCEPT_NEW_PAYMENTS` là biến môi trường chỉ chặn tạo thanh toán SePay mới, không phải API bảo trì toàn sàn.

Các API **không phải API cấu hình**, chỉ xác minh source trong phiên này: POST `/api/admin/sepay/reconcile` body `{lookbackMinutes:60}` (5..1440); POST `/api/admin/sepay/transactions/:id/reprocess` body `{}`; POST resolve body `{outcome,reason,evidenceReference?}`. Đây là tác vụ đối soát/xử lý giao dịch, không được nối vào Ping/Lưu cấu hình. Không gọi lại mutation trên dữ liệu dùng chung. Webhook POST `/api/payments/sepay/webhook` yêu cầu chữ ký/timestamp; không phải endpoint sửa Webhook Secret. Không cần gửi callback thanh toán để nghiệm thu C12.

## 5. Phạm vi phát triển đã chốt ngày 05/11

### 5.1. Chỉ giữ ba nhóm

| Nhóm | Hiển thị/chức năng giữ lại | API cần phát triển trong nhiệm vụ triển khai sau |
|---|---|---|
| VietQR qua SePay | Tên provider, môi trường thực tế test/live, trạng thái bật hoặc chưa cấu hình, ngân hàng/tài khoản thu hộ được phép hiển thị, mẫu nội dung chuyển khoản và webhook URL nếu xác định được từ cấu hình server | API đọc thông tin an toàn từ cấu hình runtime hiện có; không suy ra live từ cờ enabled; trường thiếu trả null/trạng thái chưa cấu hình |
| VNPay Sandbox | Tên provider, nhãn Sandbox cố định theo môi trường đã xác minh, trạng thái cấu hình/kích hoạt, mã merchant hiển thị an toàn, URL thanh toán/return/IPN tương ứng sandbox nếu có | API đọc thông tin sandbox; phân biệt “đã cấu hình”, “đang kích hoạt” và “chưa cấu hình”. Không chuyển payment mode hoặc bật VNPay đồng thời với SePay trái ràng buộc runtime |
| Quản trị viên và phân quyền | Danh sách admin thật có tìm kiếm/phân trang, thông tin cơ bản/trạng thái, vai trò và quyền; thêm/cấp quyền admin, sửa quyền, khóa/mở khóa theo quyền được cấp | API danh sách/chi tiết admin, danh mục role/permission, cấp/thu hồi quyền và cập nhật trạng thái. Tái dùng Auth ownership và role/permission thực tế; không dùng API customer list |

Thông tin hai cổng là **read-only**. Không có form chỉnh credentials hoặc nút kiểm tra ngân hàng trong scope này. QR thanh toán gắn đơn hàng và lịch sử giao dịch vẫn thuộc luồng thanh toán/C10.

Phần quản trị viên/phân quyền có thao tác ghi trong đúng phạm vi bảng trên. Chốt hợp đồng với schema và quyền hiện có trước khi code; không hard-code các role mẫu SUPER ROOT ADMIN/FINANCIAL AUDITOR/EVENT REVIEWER như role đã tồn tại. Chỉ mở rộng role/permission thực sự cần cho quản trị admin; không phát triển trình tạo role tùy ý. Bảo vệ chống tự nâng quyền, khóa/thu hồi admin cuối cùng và thay đổi vượt quyền; cập nhật quyền phải có hiệu lực với phiên đang dùng theo cơ chế xác thực của dự án.

### 5.2. Loại bỏ khỏi giao diện và API C12

- Backup, bảo trì toàn sàn, Lưu tất cả cấu hình và CRUD settings tổng thể.
- Toàn bộ KPI telemetry, latency, uptime, escrow, bot và số super admin mẫu.
- MoMo, Cybersource/Visa/Mastercard, Vietcombank dự phòng và các cổng khác ngoài hai nhóm thanh toán được giữ.
- Thêm/sửa/bật/tắt gateway, chọn primary/standby, failover, Ping, sửa/rotate credentials hoặc Webhook Secret.
- Phí sàn, Escrow/giải ngân và hai tab/panel phí/Escrow, Anti-Bot; không cần thiết kế bổ sung các panel này.
- 2FA/YubiKey/OTP/Authenticator, reset auth/root đặc thù và trang/nút Audit Logs toàn sàn. Ghi nhận thay đổi quyền bằng cơ chế audit nội bộ sẵn có là yêu cầu kỹ thuật của mutation, không thêm module/trang audit mới.
- Các nút/field ngoài scope bị bỏ hẳn; không giữ nút toast “đang phát triển” hoặc dữ liệu mẫu thay chức năng thật.

## 6. Kế hoạch triển khai theo scope mới

1. Đối chiếu source cấu hình SePay, provider VNPay và schema Auth/roles/permissions mới nhất. Phân biệt dữ liệu runtime đang bật với cấu hình sandbox có sẵn; không sửa môi trường để hiển thị thẻ.
2. Lập hợp đồng API cho ba nhóm mục5.1: method/path, quyền đọc/quản lý, query tìm kiếm/phân trang, request/response, validation và lỗi. Route mới chỉ được chốt sau đối chiếu backend; các API này chưa được tạo/kiểm thử trong phiên tài liệu.
3. Tạo API đọc hai cổng với DTO allowlist; không trả token, hash secret, API key, mật khẩu hoặc toàn bộ environment. Dữ liệu không có nguồn xác minh phải thể hiện chưa cấu hình, không điền sample Stitch.
4. Tạo API admin/role/permission trong ownership Auth; triển khai quyền đọc và quyền quản lý riêng, mutation transaction, kiểm tra admin cuối cùng/self-lock/vượt quyền và cập nhật hoặc vô hiệu phiên theo cơ chế có sẵn. Giữ cơ chế audit nội bộ, không mở thêm API Audit Logs.
5. Kiểm thử trên fixture/DB cô lập: thông tin SePay và VNPay Sandbox đầy đủ/thiếu/disabled; không lộ secret; không gọi provider tiền thật; danh sách admin không lẫn customer; quyền401/403; pagination/search; cấp/thu hồi/sửa/khóa và hiệu lực phiên; self-escalation/last-admin/concurrency. Xác minh API hoạt động trước nối frontend.
6. Triển khai `C12Setting.tsx` khi được giao code: dùng `AdminShell`, namespace `.c12-*`, TSX+CSS cùng file và multi-line. Chỉ hai thẻ thông tin thanh toán cùng bảng/form admin/quyền; dùng style thẻ/bảng Cosmic Graffiti hiện có. VNPay Sandbox là nội dung bổ sung theo yêu cầu scope; các phần loại bỏ không render. Không sửa Stitch.
7. Nối `/admin/settings`, nhánh page và nhận diện admin console đúng ADMIN/permission guard. Hai thẻ chỉ load/retry; form admin có validation/dirty/pending/error/success/confirm/chống double-submit và reload dữ liệu sau mutation.
8. Kiểm browser desktop/mobile, keyboard/focus/labels, loading/empty/error/success/disabled; chạy build/lint và test phù hợp khi code thay đổi. Tạo report mới và cập nhật Master Plan với bằng chứng API/UI, giữ rõ giới hạn rollout.

## 7. Tiêu chí nghiệm thu scope mới

- [ ] Chỉ hiển thị VietQR/SePay, VNPay Sandbox và quản trị viên/phân quyền; mọi chức năng ngoài scope đã loại bỏ.
- [ ] Hai cổng lấy thông tin thật từ API đọc đã kiểm chứng, phân biệt môi trường/configured/enabled; không chỉnh môi trường hoặc tạo giao dịch khi tải trang.
- [ ] Không lộ secrets; dữ liệu thiếu thể hiện chưa cấu hình; không có telemetry/số liệu/admin mẫu.
- [ ] Danh sách admin, tìm kiếm/phân trang, cấp/thu hồi/sửa quyền và khóa/mở khóa có API thật; quyền được kiểm ở server và có hiệu lực với phiên.
- [ ] Chống vượt quyền, tự nâng quyền và mất admin cuối cùng có test transaction/concurrency phù hợp; ghi audit nội bộ theo cơ chế dự án.
- [ ] Shared header/sidebar, route/guard đúng; TSX+CSS cùng file, multi-line; phần giữ lại theo style Stitch và sai lệch scope được ghi report.
- [ ] Responsive1440/1280/768/390, keyboard/accessibility và trạng thái dữ liệu/form được kiểm runtime.
- [ ] Build/lint/test cần thiết đạt; không chỉnh chức năng các màn khác hoặc triển khai API ngoài ba nhóm đã chốt.

### 7.1. Kết quả triển khai đã xác minh

Các tiêu chí chức năng, dữ liệu thật, secret allowlist, quyền/phiên/transaction, shared shell, TSX+CSS multi-line và build/lint/test đã đạt trên source + PostgreSQL cô lập. Responsive bốn viewport và keyboard/modal focus trap đã kiểm; full accessibility/browser khác và rollout8000 còn chưa xác minh. Checklist mục7 không đánh dấu toàn bộ để tránh đồng nhất bằng chứng môi trường test với nghiệm thu runtime đích.

**API thực tế**, prefix `/api`: GET `/admin/settings/payment-information`; GET `/admin/administrators`, `/catalog`, `/:id`; POST `/admin/administrators` body `{email,manager}`; PATCH `/admin/administrators/:id` body `{version,admin,manager,locked,reason}`. Query list `q,page,limit`, pagination10 mặc định; strict validation. Có53HTTP checkpoints và16nhóm Chrome test, chi tiết tại report triển khai.

**Quyền thực tế:** ADMIN được đọc C12; ADMIN_MANAGER + permission `administrators.manage` được quản lý admin. Grant qua email tài khoản đã đăng ký; thu hồi giữ USER/ORGANIZER. Không sửa chính mình, serialization/recheck actor/version409, revoke phiên đích, audit cùng transaction; API customer không thể đổi trạng thái admin để bypass. Hai thẻ thanh toán chỉ đọc, configured/enabled tách riêng; không đổi mode hoặc gọi ngân hàng.

**Migration/rollout:** `AdminManagement1793812800000` thêm role/permission và cấp ADMIN_MANAGER cho ADMIN đang active/chưa khóa tại lần migrate đầu; seed development cũng có role này sau migrate. Đã kiểm migration runner trên DB mới, lần2 không áp lại. Chưa migrate DB ứng dụng/redeploy8000; cần rollout backend+migration+frontend và đăng nhập lại trước khi sử dụng với dữ liệu hiện hữu. Không chạy seed development trên DB hiện hữu.

## 8. Nhật ký chỉnh sửa tài liệu

2026-11-04 23:46:58 UTC+07 — Tạo file này; tạo report mới `C12_20261104_234658_review_plan.md`; cập nhật C12 trong Master Plan mục4,5.3,5.4,ghi chú6.F. Các sửa đổi đều được ghi ở report liên kết đầu tài liệu. Không sửa source hoặc Stitch. Các lần thay đổi sau phải có report mới và bổ sung nhật ký, không ghi đè lịch sử report.

2026-11-05 00:03:58 UTC+07 — Người dùng chốt chỉ phát triển API thông tin VietQR/SePay, VNPay Sandbox và quản trị viên/phân quyền; bỏ chức năng còn lại. Cập nhật mục1–3, tiêu đề mục4 và thay mục5–7 bằng scope/API plan/nghiệm thu mới; tạo [report scope update](../reports/stitch/C12_20261105_000358_scope_update.md), cập nhật đúng C12 trong Master Plan. Không sửa source/Stitch hoặc ghi đè report gốc; không chạy lại API.

2026-11-05 00:26:04 UTC+07 — Thực hiện scope sau xác nhận mô hình quyền: tạo page C12/API/migration và tests; source/backend build, eslint/boundaries PASS, C12 HTTP53calls/Chrome16nhóm và migration idempotence PASS trên DB cô lập. Cập nhật plan và Master Plan, tạo [report triển khai](../reports/stitch/C12_20261105_001401_implementation.md) chứa toàn bộ file đã chỉnh và bằng chứng; Stitch/DB ứng dụng/API8000 chưa thay đổi.
