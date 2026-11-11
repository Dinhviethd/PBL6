# Kế hoạch chuyển toàn bộ giao diện web EventHub sang ứng dụng mobile

Ngày lập: 10/11/2026 (UTC+07). Trạng thái: **IN_PROGRESS — đã triển khai đợt đầu; còn gap chức năng và nghiệm thu native**. Xem [tiến độ triển khai từng màn](MOBILE_MIGRATION_IMPLEMENTATION.md) và [inventory source](MOBILE_ROUTE_INVENTORY.md).

## 1. Mục tiêu và phạm vi

Chuyển toàn bộ chức năng giao diện web sang ứng dụng Android/iOS trong `mobile/`, tổ chức lại bố cục và điều hướng theo thao tác trên điện thoại. Bao phủ Customer, Organizer, Admin và nhân viên check-in; giữ quy tắc nghiệp vụ và quyền backend. Dùng React Native/Expo Router hiện có, không chuyển cả website vào WebView.

Phạm vi gồm **37 mã màn hình A1–A13, B1–B12, C1–C12** trong danh mục hiện tại và các route phụ: chi tiết vé, chi tiết hồ sơ duyệt, chọn sự kiện trước khi quản lý, lời mời đội ngũ, scanner staff. Một màn web có thể tách thành nhiều màn native; không lấy số route mobile bằng số màn Stitch làm tiêu chí hoàn thành.

Kế hoạch này thay thế giới hạn “Organizer/Admin chỉ dùng web” trong `docs/STITCH-MOBILE-INTEGRATION-PLAN.md` và `mobile/README.md` **cho công việc sắp tới**. Các tài liệu đó vẫn mô tả phạm vi đã triển khai trước đây. Không mở rộng các chức năng đã bị loại khỏi nghiệp vụ web, như escrow hoặc AI/eKYC chỉ xuất hiện trong prototype. Với chức năng web đang có placeholder, ghi rõ giới hạn và phụ thuộc backend, không đánh dấu hoàn thành nghiệp vụ.

Nguồn chuẩn: [Master Plan](../PROJECT_MASTER_PLAN.md), source `client/src/App.tsx`, `client/src/pages/`, `mobile/src/app/` và Stitch project `10374042969343935993`. Metadata/list screens đã truy cập được trong phiên; chưa đánh giá trực quan từng artifact. Mã B3/B4 và C9/C10/C11 có alias lệch metadata: dùng mapping canvas/plan hiện hành, không đổi mã chỉ theo title API. A12/A13 đã có trong repo và Stitch; con số 35 ở phần tổng quan Master Plan là thông tin lịch sử.

Yêu cầu hiện tại cho phép lập phương án bố cục mobile mới. Các phương án dưới đây là thiết kế đề xuất; phiên này không sửa source ứng dụng hay artifact desktop Stitch. Khi triển khai, ghi mapping phiên bản mobile với thiết kế chuẩn, không ghi đè thiết kế desktop.

## 2. Hiện trạng và khoảng thiếu

| Nhóm | Căn cứ hiện có | Việc phải làm |
|---|---|---|
| Nền tảng | Expo ~57.0.26, RN 0.86.3, Expo Router; theme, SecureStore, camera | Dùng tiếp; chuẩn hóa component, lifecycle và navigation theo vai trò |
| A1/A2 | A1 vừa được chuyển; có `/explore`, search/filter và component home | Giữ phần đã làm; thống nhất token giữa home và màn khác; nghiệm thu native |
| Khách hàng | Auth, event detail, orders, tickets, notifications có route | Hoàn thiện tương đương web và trạng thái lỗi/empty/loading |
| A6 | Mobile có demo/VNPay, chưa có SePay/MB Bank theo audit và source khảo sát | Bổ sung phương thức đúng config backend, vòng đời thanh toán và quay lại app |
| A5/A10/A11 | Chưa có đầy đủ đăng ký BTC, sửa hồ sơ/avatar/đổi mật khẩu, reset | Xây luồng native tương ứng API thật |
| Organizer/Admin | Chưa thấy phân hệ quản trị native trong route inventory | Xây mới các màn B/C, dùng lại component và contract backend |
| Staff | Có assignments và scanner | Đồng bộ A13, lời mời, quản lý phân công và kiểm thử camera thật |
| Phát hành | Có export, chưa có bằng chứng APK/IPA nghiệm thu; audit ghi chưa cấu hình OTA | Chuẩn bị development/preview/release build và quy trình kiểm thử cập nhật |

Nguồn kết quả: [audit 10/11](../AUDIT-PROJECT-MOBILE-2026-11-10.md), [báo cáo A1 mới hơn](../reports/stitch/A1_20261110_180523_mobile_home_implementation.md). Không dùng các kết quả này để xác nhận toàn bộ bản app hiện tại đã chạy trên điện thoại.

## 3. Kiến trúc thông tin và điều hướng

Một tài khoản có thể có nhiều quyền. Tại Tài khoản, cho chuyển không gian làm việc trong các quyền server trả về; không cho chọn vai trò để tự cấp quyền. API vẫn kiểm tra quyền và quyền sở hữu với mọi request. Chuyển không gian giữ phiên, nhưng tách cache dữ liệu; logout/đổi tài khoản phải xóa dữ liệu riêng và lịch sử route nhạy cảm.

| Không gian | Thanh tab đề xuất | Màn nằm trong stack |
|---|---|---|
| Khách hàng | Trang chủ · Khám phá · Vé của tôi · Tài khoản | Chi tiết sự kiện, chọn vé, checkout, kết quả; Đơn hàng từ Tài khoản và ví vé; thông báo từ chuông |
| Ban tổ chức | Tổng quan · Sự kiện · Check-in · Tài khoản | Đơn hàng/người tham dự/loại vé/thống kê theo sự kiện; tạo sự kiện; hồ sơ BTC, lời mời đội ngũ |
| Quản trị | Tổng quan · Phê duyệt · Quản lý · Tài khoản | Phê duyệt gồm hồ sơ BTC/sự kiện; Quản lý gồm tài khoản/BTC/danh mục/sự kiện/giao dịch; cấu hình từ Tài khoản |
| Nhân viên | Phân công · Quét vé · Tài khoản | Lời mời, chọn sự kiện, scanner, kết quả; chỉ hiển thị chức năng đúng quyền |

Guest được duyệt sự kiện, thao tác cần tài khoản dẫn tới auth rồi quay về ý định ban đầu. Giữ route cũ `/events/[slug]`, `/orders/[id]`, `/tickets/[id]` và `/checkin/[id]`; các nhóm route Organizer/Admin là đề xuất, cần lập bảng chuyển hướng trước khi đổi navigation. Không để deep link vượt auth hoặc mở dữ liệu của tài khoản trước.

Luồng chính: Trang chủ → Khám phá → Chi tiết → Chọn vé → Xác nhận đơn → Thanh toán → Kết quả server → Vé QR. BTC: Sự kiện → Tạo/sửa → Loại vé → Xem lại → Gửi duyệt → Theo dõi. Admin: Hàng đợi → Chi tiết → Duyệt/từ chối → Làm mới trạng thái. Staff: Phân công → Chọn sự kiện → Quét → Kết quả → Quét tiếp.

## 4. Ma trận chuyển đổi từng màn hình

Trạng thái dưới đây là backlog đề xuất, không phải nghiệm thu. `CÓ NỀN` = đã có route/component nhưng còn phải hoàn thiện; `MỚI` = chưa thấy luồng đầy đủ trong inventory mobile; `RÀ SOÁT` = có phần đã triển khai gần đây.

### 4.1. Khách hàng và staff

| Mã | Màn hình | Bố cục/hành vi mobile đề xuất | Backlog / đợt |
|---|---|---|---|
| A1 | Trang chủ | Header gọn, tìm kiếm dễ chạm, danh mục ngang, thẻ một cột, banner BTC thu gọn; chính sách trong accordion | RÀ SOÁT / M1 |
| A2 | Khám phá | Search trên đầu; chip lọc đang dùng; sheet danh mục/ngày/giá/địa điểm với Áp dụng/Xóa; danh sách giữ vị trí khi back | CÓ NỀN / M1 |
| A3 | Chi tiết & đặt vé | Ảnh cover vừa màn hình; thời gian/địa điểm ưu tiên; mô tả mở rộng; CTA dưới cùng; chọn loại/số lượng vé trong sheet hoặc màn riêng khi chữ lớn | CÓ NỀN / M2 |
| A4 | Đăng nhập/đăng ký | Form một cột, bàn phím đúng loại, autofill, hiện mật khẩu, lỗi cạnh trường; quay lại ý định đặt vé | CÓ NỀN / M1 |
| A5 | Đăng ký BTC | Form nhiều bước theo trường web thật; xem lại trước gửi; màn trạng thái và lý do từ chối/nộp lại | MỚI / M3 |
| A6 | Thanh toán | Tóm tắt thu gọn, tổng tiền/hạn server rõ; MB Bank/SePay và VNPay theo config; sao chép số TK/số tiền/nội dung để dùng ngân hàng trên cùng máy | CÓ NỀN, thiếu SePay / M2 |
| A7 | Kết quả | Chỉ hiện thành công khi server PAID; nút Xem vé/Đơn hàng; pending/expired/error xử lý ở checkout phù hợp luồng web | MỚI dạng màn riêng / M2 |
| A8 | Vé & QR | Ví vé theo trạng thái; chi tiết vé toàn màn, vùng QR trắng và quiet zone, mã chữ dự phòng; không đưa QR cá nhân vào analytics/log | CÓ NỀN / M2 |
| A9 | Đơn hàng | Thẻ thay bảng, chip trạng thái, chi tiết theo ID; tiếp tục thanh toán/hủy đúng trạng thái | CÓ NỀN / M2 |
| A10 | Hồ sơ | Menu nhóm Hồ sơ/Bảo mật/Không gian làm việc; sửa tên/điện thoại, picker avatar, đổi mật khẩu; giữ email theo quyền web | MỚI phần chỉnh sửa / M1 |
| A11 | Quên/reset mật khẩu | Tách yêu cầu mã → xác minh → mật khẩu mới theo contract; resend/countdown server, giữ dữ liệu khi bàn phím bật | MỚI / M1 |
| A12 | Thông báo | Danh sách đã/chưa đọc, badge; deep link có guard; trạng thái nội dung bị xóa hoặc không còn quyền | CÓ NỀN / M2 |
| A13 | Sự kiện phân công | Lời mời và phân công tách nhóm; sự kiện/ngày/địa điểm nổi bật; CTA check-in và trạng thái thu hồi quyền | CÓ NỀN / M3 |

### 4.2. Ban tổ chức

| Mã | Màn hình | Bố cục/hành vi mobile đề xuất | Backlog / đợt |
|---|---|---|---|
| B1 | Dashboard | KPI hai cột, một cột khi font lớn; biểu đồ gọn có giá trị dạng chữ; bộ chọn khoảng thời gian | MỚI / M3 |
| B2 | Quản lý sự kiện | Thẻ sự kiện có trạng thái/doanh thu/vé; filter sheet; nút Tạo sự kiện; menu thao tác phụ | MỚI / M3 |
| B3 | Chi tiết sự kiện | Tóm tắt + mục Nội dung/Loại vé/Đơn hàng/Người tham dự/Thống kê; trạng thái duyệt rõ; xác nhận hủy | MỚI / M3 |
| B4 | Tạo/sửa sự kiện | Wizard Thông tin → Thời gian/Địa điểm → Ảnh/Nội dung → Xem lại; picker native; lưu nháp nếu contract hỗ trợ; cảnh báo rời form chưa lưu | MỚI / M3 |
| B5 | Loại vé | Thẻ từng loại; form tạo/sửa riêng; validation số lượng/giá/thời gian; gửi duyệt sau xem lại | MỚI / M3 |
| B6 | Quản lý đơn hàng | Chọn sự kiện rồi danh sách thẻ; search ID/người mua, filter trạng thái; tổng số theo API | MỚI / M3 |
| B7 | Chi tiết đơn | Tổng tiền/trạng thái trên đầu; người mua, vé và giao dịch chia nhóm; chỉ hành động API cho phép | MỚI / M3 |
| B8 | Người tham dự | Tìm kiếm ưu tiên, lọc đã/chưa check-in, thẻ thông tin; quản lý staff/mời/thu hồi trong mục riêng nếu web có | MỚI / M3 |
| B9 | Scanner | Camera toàn vùng chính, tên sự kiện cố định; đèn pin nếu hỗ trợ, nhập mã thay thế, phản hồi chữ/icon/rung tùy chọn | CÓ NỀN scanner, cần quyền BTC / M3 |
| B10 | Thống kê | KPI → biểu đồ → số liệu chi tiết; filter thời gian; xuất/chia sẻ chỉ khi có API và dữ liệu tương ứng | MỚI / M3 |
| B11 | Hồ sơ BTC | Thông tin tổ chức chia nhóm, biểu mẫu một cột, trạng thái xác minh/đội ngũ theo phạm vi web | MỚI / M3 |
| B12 | Lịch sử check-in | Timeline/thẻ thời gian, người thao tác, kết quả; search/filter và phân trang; không hardcode lịch sử | MỚI / M3 |

### 4.3. Quản trị

| Mã | Màn hình | Bố cục/hành vi mobile đề xuất | Backlog / đợt |
|---|---|---|---|
| C1 | Dashboard | KPI và tác vụ chờ duyệt đầu màn; biểu đồ giản lược có mô tả số | MỚI / M4 |
| C2 | Khách hàng | Search + filter + thẻ tài khoản; badge vai trò/trạng thái; thao tác khóa/mở có xác nhận | MỚI / M4 |
| C3 | Chi tiết khách hàng | Hồ sơ, thống kê/lịch sử mà API cung cấp; hành động nhạy cảm đặt riêng, quyền kiểm tra server | MỚI / M4 |
| C4 | Ban tổ chức | Thẻ BTC, trạng thái hồ sơ, search/filter; mở chi tiết | MỚI / M4 |
| C5 | Chi tiết BTC | Thông tin tổ chức, sự kiện và số liệu chia mục; dữ liệu thật, không thêm KPI từ prototype | MỚI / M4 |
| C6 | Duyệt hồ sơ BTC | Danh sách chờ/từ chối → chi tiết hồ sơ; footer Duyệt/Từ chối, lý do bắt buộc theo contract; xử lý hồ sơ đã được duyệt nơi khác | MỚI / M4 |
| C7 | Danh mục | Thẻ/tên/số sự kiện; tạo/sửa trong form; xác nhận xóa và lỗi ràng buộc | MỚI / M4 |
| C8 | Toàn bộ sự kiện | Thẻ thay bảng; trạng thái/số vé/check-in; filter sheet; mở chi tiết đúng quyền | MỚI / M4 |
| C9 | Chi tiết duyệt sự kiện | Nội dung/loại vé/thông tin BTC theo nhóm; CTA duyệt/từ chối cố định, xử lý xung đột trạng thái | MỚI / M4 |
| C10 | Giao dịch | Thẻ số tiền/trạng thái/mã đơn, filter thời gian; chi tiết và đối soát đúng quyền; không thêm escrow chưa có backend | MỚI / M4 |
| C11 | Hàng đợi duyệt sự kiện | Chip trạng thái, thẻ ưu tiên theo dữ liệu thật, dẫn C9; refresh sau quyết định | MỚI / M4 |
| C12 | Cấu hình | Nhóm cấu hình theo chức năng; hiển thị read-only nếu API chỉ đọc; không gửi secret thanh toán về thiết bị | MỚI / M4 |

Các route chọn sự kiện trước B5/B6/B8/B9/B10 dùng chung màn chọn với search và trạng thái; chi tiết hồ sơ C6 dùng stack riêng. Lời mời đội ngũ `/organizer/team-invitations` phải có màn nhận/từ chối và kiểm tra quyền, không bỏ sót vì không có mã Stitch riêng. Mọi route web bổ sung được đưa vào inventory M0 trước khi đóng phạm vi.

## 5. Quy chuẩn tối ưu điện thoại

- Một cột trên điện thoại; không cuộn ngang toàn trang. Bảng quản trị đổi thành thẻ tóm tắt và màn chi tiết; chỉ biểu đồ/dữ liệu thực sự cần so sánh mới có vùng cuộn ngang được gắn nhãn.
- Giữ Cosmic Graffiti và font tiếng Việt; dùng token ngữ nghĩa chung, rà soát khác biệt `theme/home.ts` và `theme/tokens.ts`. Giảm hero/hiệu ứng phát sáng ở tác vụ quản trị. Khoảng cách đề xuất 4/8/12/16/24/32, lề 16, nội dung chính 16 đơn vị logic và co giãn theo thiết lập chữ.
- Nút chính gần đáy, chừa safe area; không che phần tử cuối danh sách hoặc trường nhập khi bàn phím bật. Một CTA chính/màn; hành động nguy hiểm có nhãn cụ thể và bước xác nhận.
- Mục tiêu vùng chạm dự án: tối thiểu 48×48 đơn vị logic, kiểm tra thực tế tương ứng Android 48dp và iOS ít nhất 44pt; khoảng cách đủ tránh chạm nhầm. Tham chiếu [Android](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) và [Apple](https://developer.apple.com/design/human-interface-guidelines/accessibility).
- Tương phản chữ thường ≥4.5:1, chữ lớn ≥3:1; không dùng màu đơn lẻ biểu đạt trạng thái. Kiểm tra focus, nhãn icon, thứ tự đọc và chữ phóng 200%. Đây là tiêu chí dự án dựa trên [WCAG](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum), không phải tuyên bố đã đạt chứng nhận toàn bộ WCAG.
- Sheet bộ lọc có tiêu đề, nút đóng, Apply/Reset; chỉ đóng sau hành động rõ ràng. Screen reader chuyển focus vào sheet và trả về trigger khi đóng. Khi chữ lớn/landscape, dùng màn đầy đủ nếu sheet thiếu không gian.
- Keyboard-aware form, Next/Done, autofill và password manager; date/time picker, camera/gallery permission giải thích tại thời điểm dùng. Dữ liệu nháp không chứa mật khẩu/token; xóa nháp riêng khi đổi tài khoản.
- Loading skeleton, empty có hướng dẫn, lỗi có Retry, offline có trạng thái rõ; giữ input/filter khi request lỗi. Pull-to-refresh và phân trang không nhân đôi bản ghi; không load toàn bộ danh sách quản trị.
- Android Back/iOS back gesture đóng sheet trước, sau đó quay lại đúng stack; cảnh báo form chưa lưu. Giữ vị trí cuộn khi quay lại; foreground làm mới thông tin nhạy thời gian.
- Scanner dừng khi background/blur, chống quét liên tục; thành công chỉ sau server xác nhận. Mất mạng không báo check-in thành công và không xếp hàng ghi offline khi chưa có cơ chế chống trùng.
- Thanh toán cùng thiết bị cần thao tác sao chép và quay lại kiểm tra; không buộc người dùng dùng camera của chính máy để quét QR đang hiển thị. Poll có giới hạn/backoff, dừng khi background và truy vấn lại khi resume. QR/thông báo deep link không được thay thế trạng thái server.
- Native share, haptic và tăng sáng QR là cải tiến có điều kiện sau khi xác minh module/permission; khôi phục độ sáng khi rời màn. Push notification, vé offline, biometric và OTA là backlog mở rộng, không tự coi đã có hoặc bắt buộc cho tính tương đương web.

## 6. Kế hoạch kỹ thuật và API

1. M0 lập inventory `web route → mã màn → hành động → mobile route → API → quyền → test ID`; một dòng cho từng hành động, gồm export/upload/filter và route phụ. Các bảng mục 4 là khởi điểm cho inventory, chưa thay cho rà soát contract chi tiết.
2. Tái sử dụng `mobile/src/lib/api-client.ts`, `api.ts`, `session.tsx`, `data.ts`; kiểm tra contract với `server/src/app.ts` và module thực tế. Tách UI dùng chung (Screen/Header/Field/Card/FilterSheet/StickyAction/Status/PermissionState) khỏi route.
3. Chỉ chia sẻ kiểu dữ liệu/validation thuần khi phù hợp; không mang React DOM/Radix/CSS desktop vào native. Route nằm trong `src/app`; component và hooks nằm ngoài. Dependency native cài theo Expo SDK hiện có và `mobile/AGENTS.md`, chưa cần nâng SDK cho kế hoạch này.
4. Theo mỗi nhóm màn, xác minh method/path/payload/response/401/403/404 và mutation thật trên DB test riêng trước khi tích hợp. Source tồn tại chưa đủ để kết luận API hoạt động. API thiếu ghi `BLOCKED` cho chức năng liên quan, tạo backend task cụ thể; không giả số liệu để bù.
5. A6 ưu tiên kiểm tra config payment, order, SePay create/status, VNPay return và trạng thái hết hạn; dùng backend để phát hành vé, giữ idempotency khi retry cùng thao tác. Không tái dùng idempotency của thao tác đã thay nội dung.
6. B/C cần kiểm tra pagination/filter/stats, quyền theo tổ chức và cập nhật trạng thái đồng thời. Cấu hình bí mật chỉ xử lý backend. Lỗi 409 khi hai người cùng duyệt phải hiển thị trạng thái mới, không báo thành công giả.
7. Kiểm thử tách môi trường API/DB/thanh toán; không dùng DB Live để seed. Mock chỉ là fixture test, tách rõ khỏi runtime app. Không đọc hoặc chép secret từ `.env.local` vào báo cáo.
8. Build mobile riêng với web: export không tạo APK/IPA. Lập cấu hình build ký, version, API HTTPS và callback/deep link; nghiệm thu bản cài trước phát hành. Việc xuất bản store/production là bước riêng sau nghiệm thu.

## 7. Các đợt triển khai và đầu ra

Ước lượng để lập nguồn lực, không phải lịch cam kết: một lập trình viên mobile toàn thời gian, backend hỗ trợ, người review thiết kế và QA bán thời gian. Đơn vị là ngày làm việc; cập nhật sau M0. Tổng khoảng **40–60 ngày**, chưa tính chờ API, tài khoản build, thiết bị hoặc store review.

| Đợt | Ước lượng | Đầu ra / điều kiện ra khỏi đợt | Phụ thuộc |
|---|---|---|---|
| M0 — Kiểm kê & thiết kế | 3–5 | Inventory đầy đủ route/hành động; wireframe theo vai trò; token/component spec; API gap list; thiết bị và môi trường test chốt | Repo/Stitch/API test |
| M1 — Nền tảng & tài khoản | 6–8 | Navigation/guard và component chung; A1/A2/A4/A10/A11; auth/deep link/đổi tài khoản được kiểm thử | M0 + auth/profile APIs |
| M2 — Mua vé & ví vé | 7–10 | A3/A6–A9/A12; SePay/VNPay theo config; luồng pending→PAID→vé, hết hạn/hủy và trở lại từ ngân hàng | M1 + sandbox thanh toán |
| M3 — BTC & staff | 10–15 | A5/A13/B1–B12, route chọn sự kiện và lời mời; tạo→duyệt→bán→check-in; quyền liên tổ chức | M1/M2 + APIs organizer |
| M4 — Admin | 8–12 | C1–C12 và chi tiết phụ; phê duyệt, giao dịch, quản lý, cấu hình theo chức năng web thật | M0/M1 + APIs admin |
| M5 — Nghiệm thu & release candidate | 6–10 | Regression toàn bộ, native E2E, a11y/performance/UAT; APK/IPA kiểm thử; báo cáo và danh sách lỗi | M1–M4 |

Mỗi màn cần checklist riêng: thiết kế → API verified → code → test tự động → Android → iOS → review. Không đánh dấu cả nhóm xong nếu chỉ build thành công. Owner triển khai/QA/reviewer ghi tên khi bắt đầu M0; hiện chưa phân công cá nhân.

## 8. Tiêu chí đánh giá và điều kiện nghiệm thu

Các ngưỡng hiệu năng/usability dưới đây là **mục tiêu đề xuất của dự án**, chưa phải số đo hiện tại.

| Nhóm | Tiêu chí đo được | Cách xác minh |
|---|---|---|
| Bao phủ | 100% route/hành động web trong inventory có mapping mobile hoặc gap ghi rõ; không thiếu vai trò | Review inventory với source tại commit nghiệm thu |
| Nghiệp vụ | 100% kịch bản P0/P1 bắt buộc PASS; không còn lỗi blocker/critical/high | API thật + native E2E, đối chiếu DB test và trạng thái server |
| Bố cục | Không cắt nội dung/CTA, không tràn ngang trang ở 320/360/390/430 và 768 logical px; portrait/landscape, keyboard/safe area đúng | Screenshot + thao tác thật, font scale 100/150/200% |
| Accessibility | Vùng chạm/contrast đạt mục 5, mọi CTA có nhãn; hoàn thành mua vé và mở QR bằng TalkBack/VoiceOver | Đo màu/bounds và kiểm tra screen reader trên thiết bị |
| Quyền & phiên | Không xem/sửa đơn/vé/sự kiện khác quyền; logout/đổi tài khoản không hiện dữ liệu cũ | Test ma trận Guest/User/Staff/Organizer/Admin, deep link và revoke |
| Độ tin cậy | Không nhân đôi order/payment/check-in khi double tap/retry/mất mạng/resume; trạng thái không suy đoán | Fault injection trên test API; kiểm tra số bản ghi server |
| Hiệu năng | Cold start đến shell tương tác p95 ≤3s; phản hồi nhấn ≤100ms; danh sách có dữ liệu p95 ≤2s ở điều kiện đo đã chốt | Release build, ≥30 mẫu trên máy Android tầm trung và iPhone được ghi model/OS; Wi-Fi test RTT≤100ms; tách thời gian API |
| Cuộn & lifecycle | Mục tiêu 60fps, tỷ lệ frame >16.7ms <5% trong bài cuộn 60s với 1.000 bản ghi phân trang; không crash khi 20 vòng background/resume | Profiler trên thiết bị thật, ghi dataset/môi trường |
| Usability | ≥90% người thử hoàn thành tác vụ chính không cần hướng dẫn; SUS mục tiêu ≥80 | 5 người/nhóm Customer, BTC/Staff, Admin; ghi số người và tỷ lệ thực, không suy rộng mẫu nhỏ |
| Phát hành | Preview/release candidate cài được Android/iOS; auth/payment/camera/upload/deep link đạt trên bản cài; cập nhật không mất phiên sai cách | Ghi build ID/version/commit, thiết bị, video/log và kết quả nâng cấp |

Điều kiện phát hành: toàn bộ tiêu chí bắt buộc đạt, không còn `NOT_VERIFIED` ở thanh toán, phân quyền, QR, camera và luồng P0/P1. Lỗi nhỏ phải có owner và hạn xử lý. Màn chỉ có API mock PASS hoặc chưa có thiết bị không được kết luận nghiệm thu native.

## 9. Kế hoạch kiểm thử

### 9.1. Các lớp kiểm thử

- Tĩnh/unit: typecheck, lint, validation ngày/giá/số lượng, query/filter, state machine thanh toán, idempotency/session isolation.
- Component/UI preview: các trạng thái loading/empty/error/success/disabled, layout, filter, form, keyboard mô phỏng; Playwright Expo web dùng kiểm tra sớm, không thay native E2E.
- API integration: DB test cô lập, data seed có phiên bản, hợp đồng thật và quyền, xung đột duyệt, tồn kho, timeout; mock chỉ dùng khi kiểm tra riêng lớp UI và ghi rõ.
- Native E2E: chọn công cụ ở M0 phù hợp development build; chạy Android emulator/iOS simulator khi có môi trường và thiết bị thật cho camera, ngân hàng, upload, SecureStore, deep link. Không giả định Windows chạy được iOS simulator.
- UAT: người dùng theo vai trò thực hiện tác vụ; đo hoàn thành, thời gian, số lỗi, chạm nhầm và nhận xét. Mỗi lỗi có severity, bước tái hiện và evidence.

### 9.2. Bộ kịch bản bắt buộc

| ID | Ưu tiên | Kịch bản và kết quả mong đợi |
|---|---|---|
| AUTH-01 | P0 | Guest đặt vé → auth → quay về lựa chọn; logout/login người khác không lộ dữ liệu cũ |
| AUTH-02 | P0 | Refresh hết hạn/đồng thời, reset password, quyền bị thu hồi → trạng thái và redirect đúng |
| DISC-01 | P1 | Search/filter kết hợp, clear, không có kết quả, lỗi API, phân trang/back giữ vị trí |
| BOOK-01 | P0 | Giới hạn 10 vé, hết vé/đổi tồn kho, double tap, retry timeout → không tạo trùng |
| PAY-01 | P0 | Config SePay-only/VNPay/disabled → chỉ hiện phương thức khả dụng; số tiền/nội dung đúng |
| PAY-02 | P0 | Pending→PAID→vé; hủy/hết hạn/thất bại/webhook trễ/return giả → không cấp vé sai; resume/kill-relaunch đọc server |
| TICKET-01 | P0 | QR thật quét được, đúng chủ sở hữu; vé đã dùng/hủy không check-in lại |
| PROFILE-01 | P1 | Lưu hồ sơ/avatar, hủy picker, upload lỗi, quyền ảnh từ chối, đổi mật khẩu validation |
| ORG-01 | P0 | Tạo nháp→loại vé→gửi duyệt→admin duyệt/từ chối→BTC nhận trạng thái; không mất form khi lỗi |
| ORG-02 | P0 | BTC A không đọc/sửa sự kiện/đơn/staff BTC B; các bộ lọc/KPI khớp API |
| STAFF-01 | P0 | Nhận/từ chối lời mời, thu hồi quyền giữa phiên; scanner dừng khi background |
| SCAN-01 | P0 | Camera thật, nhập mã, quét trùng đồng thời trên hai máy, sai sự kiện, hết giờ/mất mạng → chỉ một check-in hợp lệ |
| ADMIN-01 | P0 | Hai admin cùng duyệt, từ chối thiếu lý do, khóa tài khoản, xóa danh mục có ràng buộc → xử lý conflict đúng |
| ADMIN-02 | P1 | Search/filter/phân trang/danh sách rỗng/KPI/giao dịch/cấu hình → dữ liệu đúng, không lộ secret |
| NAV-01 | P1 | Deep link cold/warm/guest, notification vào đối tượng đã xóa, Android Back/iOS gesture, đổi vai trò |
| UX-01 | P1 | Các viewport, chữ 200%, tiếng Việt dài, keyboard, safe area, landscape và screen reader |
| REL-01 | P0 | Cài mới/cập nhật preview build, camera/HTTPS/payment return/SecureStore trên Android và iOS thật |

Mỗi kịch bản phải triển khai các biến thể success, dữ liệu trống, lỗi server và mất mạng nếu áp dụng. Lệnh có sẵn: `npm run check:mobile`, `npm run export --prefix mobile`, `npm run test:mobile-ui --prefix client`. Khi chạm backend/web, chạy bộ kiểm tra tương ứng phần thay đổi; không dùng kết quả mobile để thay kiểm thử regression web.

### 9.3. Ma trận môi trường

Chốt ở M0 phiên bản OS tối thiểu theo native build thực tế; hiện chưa xác minh min OS nên không tự điền số. Tối thiểu: Android cấu hình thấp ở min OS, Android tầm trung trên OS mục tiêu, iPhone nhỏ ở min OS và iPhone có notch trên OS mục tiêu. Ghi model/OS/build cụ thể trong mỗi run. Kiểm tra Wi-Fi, mạng di động, mạng chậm mô phỏng (1Mbps/RTT300ms), mất mạng rồi nối lại; tài khoản từng vai trò và nhiều tổ chức; ít/nhiều dữ liệu, tên dài, ngày lỗi, event hết vé/đã hủy, order mọi trạng thái.

## 10. Kết quả kiểm thử hiện có và mẫu báo cáo

**Phiên lập kế hoạch này không chạy lại test ứng dụng.** Bảng dưới trích báo cáo đã lưu, giữ riêng ngày/phạm vi và không cộng số bài của các lượt khác nhau.

| Nguồn | Kiểm tra | Kết quả ghi nhận | Giới hạn |
|---|---|---|---|
| Audit 10/11, trước A1 | Backend tests | 45 PASS, 21 SKIP / 66 bài | Các suite DB thiếu kết nối test riêng |
| Audit 10/11, trước A1 | Web UI | 5 PASS, 9 FAIL | Selector/fixture và case khác cần xử lý; không coi web baseline hoàn toàn đạt |
| Báo cáo A1 10/11 18:05 | Mobile typecheck/lint | PASS | Kết quả phiên trước, chưa chạy lại tại snapshot lập plan |
| Báo cáo A1 10/11 18:05 | Mobile unit | 26/26 PASS | Logic unit; không chứng minh API/native |
| Báo cáo A1 10/11 18:05 | Expo export | Android/iOS/web PASS | Bundle, không phải APK/IPA cài trên thiết bị |
| Báo cáo A1 10/11 18:05 | UI preview | 18/18 PASS, 27.1s; viewport 320/360/390/430/768 và ngang thấp | Expo web/API mock |
| Báo cáo A1 10/11 18:05 | Đối chiếu artifact Stitch | Chưa hoàn tất; download từng trả 401 | Phiên này chỉ truy cập metadata/list, không thử lại download |
| Toàn bộ kế hoạch mới | B/C native, API E2E, native payment/camera, a11y/performance/UAT | NOT_VERIFIED | Chưa có bằng chứng nghiệm thu cho phạm vi mới |

Kết luận hiện tại: **CHƯA ĐỦ BẰNG CHỨNG nghiệm thu ứng dụng mobile toàn diện**. Có nền mobile và baseline kiểm thử sớm; các đợt M0–M5 vẫn là công việc sắp tới.

Mẫu báo cáo cho mỗi lượt kiểm thử:

| Trường | Nội dung phải ghi |
|---|---|
| Định danh | Run ID, ngày giờ UTC+07, tester, commit + trạng thái working tree, app version/build ID |
| Môi trường | Android/iOS/Expo web, model/OS, API/DB test, config thanh toán, điều kiện mạng; không chứa secrets |
| Test case | ID, màn/route, vai trò, precondition, dữ liệu test đã ẩn thông tin nhạy cảm |
| Thực hiện | Các bước, expected, actual, PASS/FAIL/BLOCKED/NOT_RUN; tiêu chí chưa kiểm chứng ghi NOT_VERIFIED |
| Bằng chứng | Screenshot/video/log đã che token/QR cá nhân, response status, link issue/trace |
| Tổng hợp | Tổng bài = PASS + FAIL + BLOCKED + NOT_RUN; tỷ lệ PASS ghi cả tử/mẫu; không tính BLOCKED/SKIP là PASS |
| Theo dõi | Severity/owner/hạn sửa, build retest, kết luận riêng theo thiết kế/API/native/release |

Đầu ra bàn giao cuối: inventory hoàn chỉnh, thiết kế mobile có mapping, source, preview/release build, bộ test, báo cáo kết quả thực tế, danh sách lỗi còn lại và hướng dẫn chạy/phát hành. Báo cáo tương lai phải thay mục tiêu bằng số đo thực tế, không điền sẵn PASS.
