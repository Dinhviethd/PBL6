# Kế hoạch B4 — Tạo sự kiện

Cập nhật **2026-10-28 17:08**, Asia/Ho_Chi_Minh. **Đã triển khai B4 — ĐẠT CÓ ĐIỀU KIỆN**; API source đã test cô lập, Docker 8000 chưa rebuild. [Báo cáo triển khai](../reports/stitch/B4_20261028_170233_implementation.md). Các mục khảo sát dưới đây giữ bối cảnh trước triển khai; kết quả mới nhất xem mục 8. [Báo cáo kiểm tra mới](../reports/stitch/B4_20261028_164205_review_plan.md); [báo cáo phiên trước](../reports/stitch/B4_20261028_162855_review_plan.md) được giữ để đối chiếu lịch sử.

## 1. Màn hình và phạm vi

**B4 trên canvas Stitch là màn hình tạo sự kiện**, theo xác nhận của người dùng và `get_project`: project `10374042969343935993`, instance label `B4`, `sourceScreen` `projects/10374042969343935993/screens/d2adc0966946438da408cd7fe644c439`. `get_screen` vẫn đặt title nội bộ “B3. Tạo sự kiện mới - Cosmic Ticket Ban Tổ Chức”; đây là sự không nhất quán giữa nhãn canvas và title, không phải bằng chứng màn tạo là B3. Canvas `B3` lại trỏ `c508b9714484450b8be80d733faf8e0b`, title nội bộ “B4. Chi tiết sự kiện & Phê duyệt”. Lấy **nhãn canvas và xác nhận người dùng** làm căn cứ mã, giữ nguyên title của Stitch trong tài liệu bằng chứng.

Kết luận phiên trước cho rằng B3 mới là màn tạo là sai do dựa trên title nội bộ. Đã sửa kế hoạch và đối chiếu danh mục Master Plan; không sửa hay tạo màn trên Stitch. Trước triển khai, `/organizer/new` dùng `EditorPage`; hiện đã chuyển sang `CreateEventPage`. Route `/organizer/events/:id` tiếp tục dùng editor cũ, không chứng minh rằng UI B3 hoàn tất.

Yêu cầu đã chốt:
- Copy bố cục B4 hiện tại, tái sử dụng `OrganizerSidebar` và style có sẵn; phần nội dung chỉ nhập thông tin event.
- Tách phần tạo/chỉnh sửa loại vé khỏi trang này, chuyển sang trang riêng ở **phiên khác**. Phiên triển khai đã tạo form event riêng; trang loại vé mới và editor sửa sự kiện không thay đổi trong phiên này.
- Loại bỏ poster dọc; chỉ dùng ảnh bìa/banner. Nhãn giới hạn hiển thị **5 MB** và kiểm tra thực tế 5 MiB = 5.242.880 bytes theo multer.
- Kiểm tra khả thi autosave và bản đồ dựa trên API/source thực tế; không ghi chức năng giả hay dữ liệu mẫu.

## 2. Thiết kế B4 và Cosmic Graffiti

Đã truy cập project, đọc screen và tải HTML `3126640626866283910`, ảnh `5144337055934097385` qua Stitch MCP; metadata screen DESKTOP 2560×4550, ảnh tải về 1920×3021. Ảnh và HTML hiện tại có sidebar và header, thanh bước, tiêu đề, 2 cột form/preview; form gồm thông tin cơ bản, mô tả, thời gian–địa điểm có bản đồ mẫu và banner. HTML hiện ghi “Tối đa 5MB” và **không có khối poster dọc**; phần tiêu đề vẫn nhắc “Poster” và có chữ gợi ý poster trong khối mẹo. Không nhận nhầm phiên trước với trạng thái artifact hiện tại: file/ảnh đã thay đổi từ lần trước; phiên này chỉ đọc.

Artifact vẫn có bước “Cấu hình vé & Giá”, CTA cấu hình vé và giá/sức chứa/đặt vé mẫu trong preview. Kế hoạch phải bỏ phần nhập/giá trị vé của trang tạo theo yêu cầu, không sửa artifact Stitch. Dùng dữ liệu form thật cho preview, không đưa nội dung mẫu thành dữ liệu hệ thống.

Design system project: DARK; Syne tiêu đề, Be Vietnam Pro nội dung, Space Grotesk nhãn; purple `#7c3aed`, cyan/hồng. Artifact dùng nền `#0f1222`, surface `#181b2a`/`#1c1f2f`, cyan `#5de6ff`, chữ `#e0e1f7`, khác một số giá trị brand trong designMd (`#080B1A`, `#10162B`, `#22D3EE`); sao chép palette và tỷ lệ artifact, dùng lại sidebar hiện có. Không đánh giá responsive/contrast/keyboard đạt chỉ từ ảnh desktop.

## 3. Đối chiếu code hiện tại và việc cần làm phiên sau

| Mục | Hiện trạng đã đọc | Hướng triển khai |
|---|---|---|
| Shell/sidebar | `EditorPage` không import sidebar; App chỉ áp shell organizer ở `/organizer`; sidebar `OrganizerSidebar` có menu tĩnh và ẩn tại ≤900px | Dùng lại component + `organizer-sidebar.css`, active “Tạo sự kiện mới”; xây shell phù hợp route tạo, kiểm tra đường quay lại và mobile; không làm thay đổi sidebar chung tùy tiện |
| Bố cục | Form hiện một panel và panel trạng thái, chưa có các section và preview theo B4 | Tái hiện header, card, khoảng cách, 2 cột form/preview, action bar; chỉ dữ liệu event |
| Vé | Chế độ tạo chưa hiện form vé, nhưng sau POST điều hướng `/organizer/events/:id` có CRUD loại vé | Kế hoạch tách CRUD sang trang khác trong phiên riêng; không đưa giá, số lượng, ngày bán, cấu hình vé vào B4; đích trang vé chưa xác minh, không tự đặt route |
| Banner | `ImageField` + `coverImageUrl`; server nhận một ảnh, 5 MiB, Sharp resize trong khung 1600×1600 | Chỉ banner, nhãn 5 MB, validate theo bytes server; kiểm tra upload thật và lỗi; không hứa lưu nguyên ảnh 1920×1080; không dựng poster dọc |
| Trường form | Source có categoryId, title, description, venueName, address, cityCode, startsAt, endsAt, checkinOpensAt, checkinClosesAt; slug được sinh tự động trong source | Ánh xạ đầy đủ trường, giữ check-in vì server bắt buộc, không thêm input slug khi tạo; giữ validation và giờ hợp lệ |
| Dữ liệu mẫu | Artifact chứa mã event, trạng thái bán, giá vé, số lượng, tên nghệ sĩ, QR và trạng thái autosave mẫu | Preview dùng state event đã nhập; bỏ thông tin vé mẫu/nhãn thành công không có thật |
| Text/editor | Backend lưu description string; artifact có toolbar | Chỉ hỗ trợ định dạng khi xác minh contract và render an toàn; không thêm toolbar giả |
| Bản đồ | Artifact có tọa độ, ảnh bản đồ và nút ghim mẫu; schema/code hiện chỉ lưu chuỗi địa điểm | Xem phương án khả thi mục 5; không dùng ghim mẫu hoặc tuyên bố vị trí đã lưu |

## 4. Xác minh API và khả thi autosave

Môi trường `http://localhost:8000/api`, 2026-10-28 16:41–16:42 UTC+7, dùng tài khoản organizer do người dùng cung cấp; không ghi mật khẩu, cookie hay token vào tài liệu. Không tạo/sửa event hợp lệ và không upload trong phiên.

| API | Kết quả thực tế | Kết luận |
|---|---|---|
| `POST /auth/login` | 200, access token được cấp | Có thể xác thực |
| `GET /auth/me` | 200, roles USER và ORGANIZER | Xác nhận quyền tài khoản |
| `GET /categories` | 200, 6 mục | Danh mục hoạt động |
| `GET /organizer/events?limit=10` | 200, 10 event | Danh sách có quyền hoạt động |
| `GET /organizer/events/:id` | 200 với một event thuộc tài khoản; có `venue_name`, `address`, `city_code`, `ticketTypes` | Đọc event hoạt động; không có field tọa độ trong response đã kiểm tra |
| `POST /organizer/events` với body chỉ có title | 400 `VALIDATION` | Không tạo nháp chưa đủ trường bằng API hiện tại |
| `PATCH /organizer/events/:id` với body chỉ có title | 400 `VALIDATION` | PATCH không phải cập nhật từng phần; không ghi event trong phép thử |
| `POST /media` | Source có multer 5×1024×1024 bytes, field multipart `image`; runtime upload **chưa thử** | Xác minh upload/auth/giới hạn bằng ảnh test khi triển khai |

`eventSchema` dùng chung cho POST/PATCH và bắt buộc category, title, description, venueName, address, cityCode, startsAt, endsAt, checkinOpensAt, checkinClosesAt; `coverImageUrl` và slug optional trong source hiện tại. `startsAt < endsAt`, `checkinOpensAt < checkinClosesAt`, `checkinClosesAt <= endsAt`. Hợp đồng source có thể khác server đang chạy: đã xác nhận body thiếu bị từ chối, chưa thử POST/PATCH đầy đủ hoặc slug runtime trong phiên này.

**Autosave:** có thể lưu tạm dữ liệu chưa hoàn chỉnh trong browser (ví dụ localStorage) mà không cần API, nhưng chỉ là lưu trên thiết bị; cần khóa theo người dùng + biểu mẫu, tránh lộ dữ liệu khi đổi tài khoản, bắt lỗi storage, hiển thị đúng “lưu trên thiết bị”, khôi phục/xóa khi lưu thành công và kiểm thử. Chưa triển khai. Autosave lên server chỉ khả thi **sau khi có event ID và toàn bộ payload hợp lệ** bằng PATCH đầy đủ; phải xác minh mutation thực tế, debounce, đồng bộ thứ tự request, chống POST trùng, phục hồi lỗi, thời gian lưu thực, guard theo trạng thái và các đơn liên quan. Không gọi liên tục trên event đang xét duyệt/đã bán: source chặn một số trạng thái/đơn và lệnh UPDATE đặt `status='DRAFT'`; không mặc định PATCH an toàn với event đã xuất bản. Chưa có API nháp từng phần/endpoint autosave riêng. Nếu muốn nháp server khi chưa đủ trường cần thiết kế API/schema mới và phiên triển khai riêng; không hứa đã khả thi chỉ dựa trên PATCH.

`booking.submit` source yêu cầu có ít nhất một loại vé chưa archive; do trang vé ở phiên sau, B4 tạo event không có vé có thể lưu nếu API create hợp lệ, nhưng chưa thể gửi duyệt cho đến khi thêm vé. Source chứng minh điều kiện, runtime submit chưa kiểm tra.

### 4.1. Kế hoạch kiểm thử API với dữ liệu hợp lệ

**Trạng thái mới nhất:** API-01 đến API-08 đã chạy trên DB/media test cô lập, PASS; API-09 thực hiện trong phạm vi local draft, chưa có server autosave. Bảng dưới giữ tiêu chí kế hoạch; kết quả thực tế và giới hạn nằm trong [report triển khai](../reports/stitch/B4_20261028_170233_implementation.md).

**Chuẩn bị:**

1. Chạy backend từ đúng revision cần kiểm thử với cơ sở dữ liệu và storage **test cô lập**, không dùng database/shared storage chứa dữ liệu thật. Xác nhận `/api/health` 200 và ghi môi trường/revision. Dùng organizer test đã được cấp; bảo mật credentials, access token, cookie. Chuẩn bị thêm một organizer test khác và một tài khoản không có quyền nếu môi trường có sẵn.
2. Gọi `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/categories`; xác nhận roles và chọn UUID danh mục đang hoạt động từ response. Nếu không có danh mục, quyền hoặc môi trường test cô lập, dừng case phụ thuộc và ghi `BLOCKED`, không thay ID bằng dữ liệu giả.
3. Chuẩn bị ảnh JPG/PNG/WebP thật hợp lệ dưới 5.242.880 bytes; dùng storage test. `POST /api/media` với Bearer token, multipart field `image`; mong đợi HTTP 200, `success: true`, `data.url` hợp lệ. Kiểm tra tải lại ảnh và định dạng/kích thước thực tế. Ghi lại URL trả về làm `coverImageUrl`; không đưa URL giả vào payload. Media là optional, có thể chạy create không ảnh nếu upload bị chặn, nhưng đánh dấu phần upload `BLOCKED`.
4. Đặt thời gian tương lai tính từ lúc chạy; ví dụ dưới đây dùng ngày **2027-11-25/26**, phải đổi nếu không còn ở tương lai. Prefix title `[TEST B4]` kèm mã phiên duy nhất để nhận diện, không coi tên event mẫu là dữ liệu sản phẩm.

**Payload mẫu đầy đủ cho `POST /api/organizer/events`** (thay `<CATEGORY_UUID>` bằng UUID thật từ bước 2; không gửi placeholder tới server):

```json
{
  "categoryId": "<CATEGORY_UUID>",
  "title": "[TEST B4] Dem nhac mua thu 2027 - run 001",
  "description": "Su kien kiem thu luong tao va luu thong tin day du.",
  "venueName": "Trung tam su kien Da Nang",
  "address": "123 Duong Test, Hai Chau, Da Nang",
  "cityCode": "DA_NANG",
  "startsAt": "2027-11-25T18:00:00+07:00",
  "endsAt": "2027-11-25T22:00:00+07:00",
  "checkinOpensAt": "2027-11-25T17:00:00+07:00",
  "checkinClosesAt": "2027-11-25T21:00:00+07:00"
}
```

`coverImageUrl` được bổ sung **chỉ khi** có `data.url` thật từ upload; `slug` bỏ khỏi request để kiểm tra sinh tự động theo source hiện tại. Mọi trường text trên không rỗng, category là UUID thực, thời gian có offset và thỏa `startsAt < endsAt`, `checkinOpensAt < checkinClosesAt`, `checkinClosesAt <= endsAt`. Giá trị `cityCode` là chuỗi hợp lệ theo schema, không suy diễn đây là danh mục thành phố chuẩn. Với PATCH, gửi lại **toàn bộ** payload hợp lệ và thay title/description cần kiểm tra; không gửi riêng một trường.

| ID | Kiểm thử dự kiến | Kết quả mong đợi và bằng chứng phải ghi |
|---|---|---|
| API-01 | Login/me/categories, chọn category UUID thật | HTTP 200, role ORGANIZER, category active; ghi status và ID danh mục đã chọn |
| API-02 | POST payload đầy đủ, không gửi loại vé | HTTP 200, `success: true`, có `data.id`, `organizer_id`, `status=DRAFT`, slug không rỗng; ghi ID/slug/status, so sánh các trường request và mốc thời gian theo instant |
| API-03 | GET `/organizer/events/:id` với ID ở API-02 | 200; dữ liệu lưu trùng payload, đúng owner; `ticketTypes` rỗng; có `reviews`; nếu có cover thì URL khớp response upload |
| API-04 | PATCH event DRAFT do test tạo, gửi toàn bộ payload hợp lệ với description mới và title mới, bỏ slug | 200; GET lại xác nhận dữ liệu mới, ID/owner/slug giữ nguyên, status DRAFT; kiểm tra không tạo event thứ hai |
| API-05 | Organizer thứ hai thử GET/PATCH event test; guest thử GET | Organizer khác dự kiến 403, guest 401; xác nhận không có thay đổi bằng GET của owner; nếu không có tài khoản thứ hai ghi `NOT_VERIFIED` |
| API-06 | POST/PATCH thiếu trường; thời gian đảo ngược; danh mục UUID không tồn tại | Thiếu/giờ sai 400 `VALIDATION`; danh mục không tồn tại 400 `INVALID_CATEGORY` theo source. Đọc lại event bảo đảm request lỗi không ghi thay đổi |
| API-07 | POST media ảnh hợp lệ <5 MiB, sau đó ảnh thật vượt 5 MiB và file không phải ảnh | Ảnh hợp lệ 200 + URL truy cập được; file vượt giới hạn dự kiến 413, file sai định dạng dự kiến 400; ghi status/code thực tế, không khẳng định upload pass nếu chưa chạy |
| API-08 | POST `/organizer/events/:id/submit` với event test DRAFT không có loại vé | Dự kiến 400 `MISSING_TICKETS`; GET lại status DRAFT. Đây là kiểm tra điều kiện nghiệp vụ, không tạo loại vé hay triển khai trang vé |
| API-09 | Kiểm thử autosave khi được triển khai: payload đầy đủ trên DRAFT test, nhiều thay đổi liên tiếp, lỗi mạng/hết phiên | Đọc lại đúng nội dung mới nhất, không POST trùng, không báo đã lưu khi lỗi; test riêng localStorage theo user; không PATCH event khác trạng thái hay event có đơn thực |

**Đóng phiên kiểm thử:** không xóa hoặc sửa event có sẵn. Event/ảnh do test tạo phải chỉ nằm trong DB/storage test cô lập có thể hủy toàn bộ theo quy trình môi trường test; ghi ID và kết quả thu dọn. Source hiện không thấy API xóa cứng event, `cancel` chỉ đổi trạng thái, không coi là xóa; không tự dùng SQL xóa trên database dùng chung. Nếu không có cơ chế thu dọn an toàn, dừng các case tạo/upload và ghi trở ngại. Báo cáo thực thi ghi method/path, payload đã loại thông tin nhạy cảm, status/code, response tối thiểu, ID fixture, kiểm chứng GET lại, cleanup và trường hợp chưa chạy; không ghi token/mật khẩu.

## 5. Khả thi bản đồ

- Event schema, SQL store và bảng `events` trong `docs/database/mvp-schema.sql` lưu `venue_name`, `address`, `city_code`; tìm kiếm source không thấy endpoint geocoding, trường latitude/longitude hoặc API lưu ghim cho event. Ảnh Stitch thể hiện ghim/tọa độ mẫu, không phải chứng cứ API.
- Có sẵn cách mở tìm kiếm địa chỉ Google Maps bằng URL mã hóa từ venue/address/city trong `client/src/pages/public/EventDetail.tsx`. Có thể lên kế hoạch cho liên kết tìm trên bản đồ từ địa chỉ đã nhập, không cần lưu tọa độ; chất lượng kết quả, truy cập mạng và hành vi thực tế chưa kiểm thử. Không nói rằng liên kết này cung cấp map nhúng hay chọn ghim chính xác.
- Phạm vi được chốt: chỉ mở tìm kiếm theo địa chỉ đã nhập; **không có yêu cầu chọn tọa độ, chọn ghim, geocoding hay lưu vị trí**. Không đưa các chức năng này vào kế hoạch triển khai B4.

## 6. Kế hoạch thực hiện (đối chiếu kết quả mới nhất tại mục 8)

1. Kiểm tra lại canvas B4, HTML/ảnh, git baseline và bản report; giữ đúng ID `d2adc0966946438da408cd7fe644c439` dù title nội bộ ghi B3.
2. Xác minh POST tạo hợp lệ, đọc lại đúng owner, slug và trạng thái; kiểm thử PATCH đầy đủ trên event test được quản lý an toàn; kiểm tra upload đúng/sai kích cỡ. Nếu không có bằng chứng thật thì ghi BLOCKED phần tích hợp, không dùng mock để che.
3. Tái sử dụng sidebar; tạo shell theo B4 cho route tạo, kiểm tra desktop/tablet/mobile. Tái tạo các nhóm thông tin event, form validation và preview theo thiết kế; loại poster dọc và thành phần nhập vé, hiển thị banner 5 MB.
4. Đối với autosave, ưu tiên cơ chế local rõ phạm vi nếu được triển khai; xác minh riêng nếu cần đồng bộ server, xử lý trạng thái và xung đột. Không hiển thị mốc tự lưu khi chưa lưu thành công.
5. Với bản đồ, mở URL tìm kiếm theo địa chỉ thật đã nhập, áp dụng mã hóa URL và xử lý trường địa chỉ trống; không làm chức năng chọn/lưu ghim.
6. Khi tách trang vé ở phiên riêng, xác định route/guard/context event ID, giữ các thao tác đang có, xử lý trạng thái, cập nhật luồng sau tạo và B5; không làm trong phiên tài liệu này. Trước lúc đó giữ nguyên hoạt động code cũ.
7. Kiểm tra build và các luồng chính; lập report mới và ghi tất cả thay đổi tại mục nhật ký bên dưới, cập nhật Master Plan theo bằng chứng.

## 7. Nghiệm thu

- Form chỉ có dữ liệu event; không có trường/CRUD loại vé; tách vé sang trang riêng chỉ khi trang đó thực sự được thực hiện và kiểm thử.
- Sidebar tái sử dụng; bố cục/typography/màu theo B4 canvas; không giả lập dữ liệu preview.
- Không có poster dọc; nhãn 5 MB và validate chính xác giới hạn 5 MiB; lỗi upload hiển thị rõ.
- Form gửi đúng đầy đủ contract, ngày/giờ/check-in hợp lệ, quyền owner đúng, không tạo trùng, không mất dữ liệu khi lỗi.
- Nếu có local autosave: phục hồi đúng chủ thể, ghi nhãn local, xử lý bị từ chối storage và xóa nháp đúng lúc; không nhầm thành server autosave. Nếu có server autosave: có bằng chứng test mutation thật, thứ tự request và bảo toàn trạng thái.
- Liên kết bản đồ dùng tên địa điểm, địa chỉ, thành phố đã nhập; mã hóa ký tự tiếng Việt/ký tự đặc biệt, không mở tìm kiếm rỗng; chỉ mở kết quả tìm kiếm, không chọn hoặc lưu tọa độ/ghim.
- Browser 1440/768/390, focus/bàn phím/contrast và trạng thái loading/error/success được kiểm thử; build phù hợp đạt. Không coi kết quả đọc HTML hay test API âm tính là nghiệm thu UI.

## 8. Nhật ký và báo cáo

- **2026-10-28 16:28:55:** tạo kế hoạch và report [B4_20261028_162855_review_plan.md](../reports/stitch/B4_20261028_162855_review_plan.md). Kết luận B3 là nguồn tạo dựa trên title nội bộ là sai, được đính chính ở phiên sau; report cũ giữ nguyên lịch sử.
- **2026-10-28 16:42:05:** viết lại kế hoạch theo canvas B4 và xác nhận người dùng; đọc lại ảnh/HTML hiện hành, chốt sidebar/loại vé phiên sau/bỏ poster dọc/5 MB; xác minh organizer/authenticated GET và kiểm thử body thiếu cho POST/PATCH; đánh giá autosave và bản đồ; cập nhật Master Plan. [Báo cáo phiên](../reports/stitch/B4_20261028_164205_review_plan.md). Chưa sửa source hoặc Stitch.
- **2026-10-28 16:46:47:** bổ sung mục 4.1 gồm payload hợp lệ đầy đủ, fixture danh mục/ảnh thực, các case create/read/update/quyền/upload/validation/autosave và quy trình thu dọn ở môi trường test cô lập; chốt bản đồ chỉ mở tìm kiếm theo địa chỉ. Không chạy mutation/API test hợp lệ trong phiên lập kế hoạch. [Báo cáo phiên](../reports/stitch/B4_20261028_164647_review_plan.md).

Mỗi lần chỉnh sửa tiếp theo phải bổ sung thời điểm, thay đổi, bằng chứng, vấn đề còn lại và link report mới vào mục này; không ghi đè báo cáo cũ.

### Phiên triển khai 2026-10-28 17:08

- Người dùng yêu cầu thực hiện plan và xác nhận mô tả văn bản thuần, đếm từ/ký tự, xuống dòng. Đọc lại Master Plan/skill, xác minh đúng B4 canvas và HTML/ảnh; không sửa Stitch.
- Thêm `CreateEventPage.tsx`, `create-event-data.ts`, `create-event.css`; nối route/shell B4 trong App; dùng lại sidebar, preview thật, đầy đủ thông tin event/check-in GMT+7, category thật, banner 5 MiB, local draft khóa user, map search địa chỉ; không nhập vé/poster/slug, không gửi duyệt. Sửa thông báo validation để xóa lỗi cũ khi người dùng nhập lại.
- Thêm `server/test/create-event.integration.test.cjs` và `client/tests/create-event-live.spec.ts`; chạy API thật với DB/media riêng, không mock: 23 HTTP assertions và hai bài Chrome PASS, gồm create/read/PATCH/quyền/upload, local draft/reload/storage lỗi/đổi account/confirm clear, offline, GMT+7 độc lập timezone, 1440/768/390. Build server/client và lint các file frontend thay đổi PASS.
- Report mới: [B4_20261028_170233_implementation.md](../reports/stitch/B4_20261028_170233_implementation.md), có payload, ID fixture, status/code, ảnh UI và checklist. Cập nhật Master Plan mục 4, 5.2, 5.4, 6.F và liên kết tài liệu; giữ thay đổi source/report đã có từ phiên trước.
- Còn lại: trang loại vé phiên sau; server không lưu nháp thiếu trường, chỉ local autosave; Docker 8000 chưa rebuild; chưa audit accessibility đầy đủ/category empty/refresh giữa request/Google Maps thực tế. API POST chưa có idempotency để chống trùng nếu server commit nhưng mất response; upload bỏ dở có thể mồ côi theo API hiện có.
- Đã dừng API/Vite và hủy container DB test; bộ kiểm duyệt tự động chặn lệnh xóa media với lý do `blocked by policy`, còn 3 WebP trong `server/.local/b4-media-test-LjUPSC`; không sửa/xóa dữ liệu môi trường dùng chung.

## 9. Bổ sung điều hướng B5 — 2026-10-28 18:11

Đã thêm nút “Tiếp tục thêm loại vé” sau tạo thành công, dùng ID server sang `/organizer/events/:id/tickets`, giữ nút danh sách. Kiểm tra ID trước xóa nháp local. Browser B4 → B5 API thật và build/lint PASS; các phần B4 khác giữ kết quả trước. [Báo cáo điều hướng](../reports/stitch/B4_20261028_180743_navigation.md), [triển khai B5](../reports/stitch/B5_20261028_175629_implementation.md).

## 10. Kế hoạch thành công ngay tại nút tạo — 2026-10-28 20:56

**Đã triển khai và kiểm thử lúc 21:07 ngày 2026-10-28.** Thay thế cách hiển thị thành công ở mục 9; nội dung bên dưới giữ lại kế hoạch đã duyệt. [Báo cáo](../reports/stitch/B4_20261028_205643_inline_success_plan.md).

### Luồng được yêu cầu

1. Người dùng hoàn tất form B4 và nhấn **Tạo sự kiện**. Đang gửi giữ trạng thái “Đang tạo…”, chặn nhấn lặp.
2. Chỉ khi `POST /api/organizer/events` trả thành công với ID hợp lệ và trạng thái DRAFT, hiện **“Tạo bản nháp thành công”** ngay bên dưới nút đó; bên dưới thông báo là nút **“Tạo loại vé”**.
3. Giữ URL `/organizer/new`, form đã nhập, preview, sidebar và vị trí cụm hành động; không thay toàn bộ form bằng `ce-success`, không tự chuyển trang hoặc bắt người dùng về danh sách chọn lại event.
4. Chỉ khi nhấn **Tạo loại vé**, đi trực tiếp `/organizer/events/{created.id}/tickets`. B5 nhận ID server để tải dữ liệu. Đây là điều hướng đến trang nhập vé hiện có; không nhúng form vé vào B4.

### Thay đổi dự kiến

- `CreateEventPage.tsx`: bỏ nhánh render thay toàn bộ form `created ? success : form`; giữ form và thêm khối thông báo/nút liên kết dưới nút submit trong `ce-actions`. Đổi nhãn CTA từ “Tiếp tục thêm loại vé” thành **Tạo loại vé** ở vị trí mới.
- Sau thành công giữ dữ liệu ở chế độ chỉ xem; khóa trường nhập, upload/drop, lưu/xóa nháp local và nút submit (có thể đổi thành “Đã tạo bản nháp”). Thêm guard `created` vào các đường thay đổi/upload và `canSubmit`, giữ guard submit hiện có. Không tạo lại event khi nhấn Enter hay nút liên kết.
- Phân biệt `aria-busy` với trạng thái đã lưu: chỉ busy khi đang gửi/upload; không báo bận vĩnh viễn khi khóa form sau thành công. Nút **Tạo loại vé** đặt ngoài fieldset bị disabled để vẫn thao tác được.
- Thông báo `role="status"`/`aria-live="polite"`; chuyển focus tới khối thành công tại chỗ nếu cần, không nhảy lên khối success đầu trang. Nút/link có tên rõ, hỗ trợ bàn phím; bố cục xếp dọc ngay dưới nút tạo trên desktop và mobile.
- Chỉ xóa nháp local sau khi có bằng chứng server lưu thành công; lỗi storage không che thông báo thành công hoặc CTA. Không ghi lại local draft từ form chỉ xem. Lỗi validation/API hoặc thiếu ID: giữ form để sửa, báo lỗi, không hiện nút tạo vé hay thông báo thành công; không tự retry POST khi phản hồi không chắc chắn.
- `create-event.css`: style scoped cho cụm thành công bên dưới submit; giữ màu Cosmic Graffiti và phần còn lại của layout. Không sửa backend, B5 hay sidebar.
- Reload sau thành công: phiên này không bổ sung cơ chế lưu ID server vào storage để tự phục hồi; nếu cần quay lại sự kiện sau reload dùng danh sách sự kiện hiện có. Không cam kết chống trùng qua reload hoặc khi server commit nhưng client mất phản hồi.

### API và nghiệm thu dự kiến

Không cần API mới: B4 dùng POST event hiện có; B5 dùng GET event theo ID. Contract và luồng tạo DRAFT đã có bằng chứng trong report B4/B5 trước; chưa gọi lại API trong phiên lập kế hoạch này.

- Cập nhật tests B4/B5 đang tìm heading success/nhãn CTA cũ; dùng API thật, xác minh đúng một POST tạo, DRAFT và ID đúng.
- Sau tạo thành công: URL không đổi, form/preview còn hiển thị, thông báo và CTA đúng thứ tự ngay dưới submit, submit/inputs bị khóa, nút Tạo loại vé vẫn dùng được; không hiện `ce-success` thay trang.
- Click Tạo loại vé: đúng URL B5 với ID vừa trả về, không POST tạo event lần nữa; B5 tải đúng event và bảng vé.
- Test validation/mạng lỗi/thiếu ID không báo thành công; lỗi localStorage không mất CTA; chống double click/Enter; upload/drop và ghi local draft sau thành công bị chặn.
- Kiểm tra bàn phím, focus, thông báo screen reader cơ bản; screenshot 1440/768/390; build/lint. Chỉ đánh dấu triển khai đạt khi có kết quả thật.

Nhật ký: phiên này chỉ bổ sung kế hoạch, report mới và ghi chú B4 trong Master Plan; chưa chỉnh sửa source, chưa chạy build/test hoặc chỉnh sửa Stitch.

### Kết quả thực hiện — 2026-10-28 21:07

Đã giữ form/preview tại B4 sau tạo DRAFT; hiện thông báo thành công và **Tạo loại vé** ngay dưới submit, liên kết dùng đúng ID server. Khóa trường nhập/upload/drop/lưu-xóa nháp và gửi lặp; CTA vẫn thao tác được bằng bàn phím. Lỗi storage không che thành công. Mobile xếp nút một cột.

Build/lint PASS; 41 HTTP assertions trên DB cô lập và 3 Chrome tests PASS, gồm B4 → B5 → gửi duyệt, responsive 1440/768/390, mất mạng, fault injection phản hồi thiếu ID, storage lỗi, chặn upload/gửi lại sau thành công. Bộ B4 upload cũ chưa chạy lại; chưa phục hồi ID sau reload/idempotency backend/audit accessibility đầy đủ. Không sửa backend, source B5, sidebar hoặc Stitch; đã dừng môi trường test.

Nhật ký chỉnh sửa và bằng chứng: [B4_20261028_205941_inline_success_implementation.md](../reports/stitch/B4_20261028_205941_inline_success_implementation.md). Master Plan đã cập nhật trạng thái, kết quả và giới hạn B4.