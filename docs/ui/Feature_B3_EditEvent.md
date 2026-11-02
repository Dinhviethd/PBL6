# B3 — Kế hoạch thiết kế lại trang chỉnh sửa sự kiện

Ngày: 2026-11-01 (UTC+7). Trạng thái: đã triển khai frontend; ĐẠT CÓ ĐIỀU KIỆN trên môi trường API/DB test cô lập; Docker/Live chưa rollout.

## 1. Phạm vi và nguồn tham chiếu

- `/organizer/events/:id`: giữ ngôn ngữ thiết kế, shell, bốn nhóm thông tin và xem trước của `/organizer/new`; bổ sung khung **Trạng thái & xét duyệt**.
- Bỏ toàn bộ form/danh sách CRUD loại vé khỏi trang chỉnh sửa. Đã chốt dùng lại chính `/organizer/events/:id/tickets` (`CreateTicketsPage`), không tạo route thứ ba.
- Backend hiện tại là nguồn quy tắc nghiệp vụ; không bổ sung API, migration hoặc thay đổi quy trình khi chưa hỏi và được người dùng xác nhận.
- Stitch project `10374042969343935993`: canvas B3 `c508b9714484450b8be80d733faf8e0b`, canvas B4 `d2adc0966946438da408cd7fe644c439`. Đã kiểm tra metadata; title nội bộ đảo B3/B4 so với label canvas. Phiên này chưa sửa Stitch, chưa kiểm tra trực quan artifact.
- Nguồn giao diện thực thi: `CreateEventPage.tsx`, `create-event.css`, `OrganizerHeader.tsx`, `OrganizerSidebar.tsx`; nguồn hành vi cũ: `EditorPage.tsx`.

## 2. Bố cục đề xuất

Giữ sidebar và header dùng chung; sidebar active “Chỉnh sửa sự kiện”, header “Chỉnh sửa sự kiện”. Giữ thanh điều hướng bốn phần của trang tạo, tiêu đề đổi thành “Chỉnh sửa sự kiện”, hiển thị tên sự kiện và trạng thái lưu thực tế.

| Khu vực | Nội dung |
|---|---|
| Cột chính — Thông tin chung | Tên, danh mục; slug hiện tại chỉ đọc, không gửi giá trị mới |
| Cột chính — Mô tả | Văn bản thuần, xuống dòng, bộ đếm như trang tạo |
| Cột chính — Lịch trình & địa điểm | Ngày/giờ bắt đầu, kết thúc, check-in, địa điểm, địa chỉ, thành phố, liên kết bản đồ; GMT+7 |
| Cột chính — Hình ảnh | Banner đang lưu, thay ảnh/bỏ ảnh theo API hiện tại |
| Thanh hành động | Quay lại danh sách, Lưu thay đổi, Quản lý loại vé |
| Cột phải — Xem trước | Giữ preview và gợi ý của trang tạo; badge dùng trạng thái sự kiện, không cố định BẢN NHÁP |
| Cột phải — Trạng thái & xét duyệt | Badge thật, hướng dẫn theo trạng thái, gửi duyệt, lịch sử kết quả/lý do, xem công khai, tạm dừng/mở bán, vùng hủy sự kiện |

Đã xác nhận: khung Trạng thái & xét duyệt nằm bên dưới phần xem trước ở cột phải. Mobile chuyển một cột theo breakpoint trang tạo, bảo đảm trạng thái/hành động dễ tìm, không tràn ngang và không che trường nhập.

Không sao chép các thao tác chỉ dành cho tạo: “Tạo sự kiện”, thông báo tạo thành công, xóa bản nháp tạo trên thiết bị. Chế độ sửa tải dữ liệu server; theo dõi thay đổi chưa lưu và cảnh báo khi rời trang. Không dùng chung khóa localStorage của trang tạo. Nếu cần tự lưu nháp sửa trên thiết bị, hỏi lại trước khi bổ sung.

## 3. Quy tắc backend phải giữ

Đã đối chiếu `server/src/app.ts`, `server/src/workflows/booking.ts`, `server/src/modules/event/infrastructure/store.ts`.

| Trạng thái/tình huống | Hành vi kế hoạch |
|---|---|
| DRAFT / REJECTED | Cho sửa thông tin và loại vé; gửi duyệt khi có ít nhất một loại vé chưa ngừng dùng |
| PENDING_REVIEW | Khóa sửa thông tin, khóa CRUD vé và gửi lại; hiển thị đang chờ duyệt |
| PUBLISHED | Cho sửa theo ràng buộc backend; xem công khai và tạm dừng/mở bán; loại vé chỉ xem |
| CANCELLED / ARCHIVED | Chỉ xem, không lưu/gửi duyệt/hủy tiếp |
| Có đơn giữ vé | Backend chặn lưu bằng ACTIVE_ORDERS; giữ nội dung nhập và hiển thị lỗi thật |
| Có đơn đã thanh toán | Backend chặn đổi startsAt/endsAt/venueName/address/cityCode bằng SOLD_EVENT; không suy diễn khóa thêm check-in |
| Lưu thành công | Backend luôn đặt status=DRAFT; tải lại dữ liệu, hiển thị trạng thái mới và cần gửi duyệt lại |
| Admin duyệt | Event chuyển thẳng sang PUBLISHED; APPROVED là quyết định trong lịch sử, không thêm bước “Xuất bản” |
| Hủy | Cần lý do và xác nhận; backend chặn nếu có vé thanh toán/giao dịch cần đối soát/đang xử lý; không suy ra đủ điều kiện chỉ từ tổng vé |

Trước khi lưu sự kiện đang PUBLISHED, thông báo rõ việc trở về bản nháp và ngừng xuất hiện công khai cho tới khi duyệt lại. Không tự thay đổi backend để giữ PUBLISHED.

Gửi duyệt sử dụng dữ liệu đã lưu: nếu form còn thay đổi, yêu cầu lưu trước; không âm thầm gửi bản cũ. Khóa thao tác lặp khi request chạy. Nếu lưu thành công nhưng tải lại thất bại, phân biệt thông báo đã lưu và chưa đồng bộ; không gửi lại mutation tự động.

## 4. API tái sử dụng

Tất cả đường dẫn bên dưới có prefix `/api`. Mới xác minh mã nguồn, **chưa gọi runtime trong phiên lập kế hoạch**.

| Method | Route | Mục đích |
|---|---|---|
| GET | `/organizer/events/:id` | Event + ticketTypes + reviews, kiểm tra quyền sở hữu |
| GET | `/categories` | Danh mục |
| PATCH | `/organizer/events/:id` | Lưu toàn bộ trường theo eventSchema, không phải sparse patch |
| POST | `/media` | Upload banner qua FormData như trang tạo |
| POST | `/organizer/events/:id/submit` | Gửi duyệt |
| POST | `/organizer/events/:id/pause` | `{ paused: boolean }` |
| POST | `/organizer/events/:id/cancel` | `{ reason: string }` |
| POST | `/organizer/events/:id/ticket-types` | Thêm vé, tại trang tickets |
| PATCH / DELETE | `/organizer/events/:id/ticket-types/:typeId` | Sửa/ngừng dùng vé, tại trang tickets |

Chú ý mapping: server trả snake_case; form/request dùng camelCase. Giữ nguyên timestamp gốc khi người dùng không đổi trường thời gian, tránh mất giây/millisecond gây SOLD_EVENT giả. Chuyển hiển thị GMT+7 độc lập timezone trình duyệt. Luôn giữ URL banner cũ trong payload khi không thay ảnh; store hiện chuyển coverImageUrl bị bỏ qua thành NULL, có thể dùng hành vi này khi chủ động bỏ ảnh.

GET detail chưa cung cấp đầy đủ obligations hoặc canEdit/canCancel: UI không đoán quyền thao tác chắc chắn từ số vé. Dùng thông báo hạn chế và lỗi backend hiện có. Nếu cần khóa chính xác mọi nút từ trước, trình bày đề xuất bổ sung capabilities rồi xin xác nhận trước khi làm.

## 5. Thứ tự triển khai sau khi chốt

1. Theo quyết định đã chốt: trạng thái dưới xem trước, dùng lại trang tickets. Xem HTML/ảnh B3/B4, đối chiếu với giao diện `/organizer/new`; điều chỉnh thiết kế B3 trong phạm vi yêu cầu, giữ B4.
2. Xác minh runtime API trên môi trường phát triển với event/tài khoản test đúng quyền trước khi tích hợp; kiểm tra contract và trạng thái thực tế.
3. Tách các phần trình bày form và preview dùng chung từ trang tạo với phạm vi nhỏ; giữ luồng tạo hiện tại. Tạo adapter tải/lưu cho B3, thay EditorPage cũ.
4. Tách khung trạng thái thành component riêng; ánh xạ điều kiện từ backend, xử lý loading/error/not-found/forbidden và trạng thái chưa lưu.
5. Xóa CRUD vé trong B3; nối nút “Quản lý loại vé” đến B5 và liên kết trở lại B3 với cùng ID. Giữ nguyên CRUD/submit tại B5. Sidebar hiện có menu “Chỉnh sửa sự kiện” nhưng map route còn key “Chi tiết & Phê duyệt”; sửa đúng key khi triển khai, giữ thay đổi đang có của người dùng.
6. Kiểm tra frontend build/typecheck và test các hành vi quan trọng bên dưới; cập nhật báo cáo/Master Plan bằng kết quả thực tế.

## 6. Tiêu chí nghiệm thu

- B3 cùng bố cục/form/preview với trang tạo, chỉ thêm khung trạng thái và điều chỉnh nội dung/thao tác theo chế độ sửa; không còn CRUD vé nhúng.
- Route sửa và tickets chuyển qua lại đúng ID; tải lại URL trực tiếp hoạt động; không mất thay đổi âm thầm khi điều hướng.
- Load → đổi tên/mô tả/banner → save → reload đúng dữ liệu, slug giữ nguyên; bỏ banner có chủ đích hoạt động.
- Timestamp không đổi được giữ chính xác; hiển thị GMT+7, không lệch khi browser timezone khác.
- Kiểm thử DRAFT, REJECTED, PENDING_REVIEW, PUBLISHED, CANCELLED, ARCHIVED; gửi thiếu vé/đủ vé; lỗi ACTIVE_ORDERS và SOLD_EVENT; save PUBLISHED về DRAFT.
- Kiểm thử tạm dừng/mở bán, lịch sử từ chối không có reason, hủy bị backend từ chối; không tự thao tác lên sự kiện thật để thử.
- Kiểm tra quyền sở hữu, lỗi mạng, hết phiên, chống submit lặp; giữ form khi lỗi.
- Kiểm tra desktop/tablet/mobile, keyboard/focus, nhãn và thông báo trạng thái; regression tạo sự kiện và CRUD vé hiện tại.

## 7. Quyết định đã xác nhận

Người dùng xác nhận ngày 2026-11-01: đặt Trạng thái & xét duyệt bên dưới phần xem trước; dùng lại chính trang B5 `/organizer/events/:id/tickets`, thêm nút qua lại với trang chỉnh sửa. Chưa thấy cần bổ sung backend cho phạm vi này. Mọi thay đổi nghiệp vụ/API sẽ được hỏi riêng kèm lý do và phương án cụ thể.


## 8. Kết quả triển khai 2026-11-01

- Đã dùng chung `EventFormFields`/`EventPreview` cho trang tạo và sửa; khung trạng thái dưới preview đúng xác nhận; dùng lại B5 và điều hướng hai chiều.
- Giữ quy tắc backend, slug và thời gian chính xác; tải/lưu/banner/xét duyệt/pause/cancel có loading/error và chống thao tác lặp; cảnh báo rời trang và lưu sự kiện công khai.
- Sidebar đã khớp key “Chỉnh sửa sự kiện”, giữ thay đổi tên có sẵn của người dùng. Không thêm API/schema/migration.
- 32 HTTP checkpoints B3, 4 tests B3 (3 browser scenarios + 1 timestamp), 2 browser regression B4, 41 HTTP checkpoints B5 PASS; build/lint frontend PASS. Chrome kiểm tra 1440/1024/768/390; keyboard/focus cơ bản.
- Stitch artifact giữ nguyên; frontend thay đổi theo B4 và phạm vi người dùng đã chốt. Chưa rollout Docker/Live hoặc audit accessibility đầy đủ/browser khác.
- [Báo cáo triển khai và bằng chứng](../reports/stitch/B3_20261101_201449_implementation.md).

## 9. Chọn sự kiện khi chưa có ID (2026-11-01)

Theo yêu cầu bổ sung: `/organizer/events` mở picker chỉnh sửa; `/organizer/events/tickets` mở picker quản lý vé. Hai trang dùng chung component và qse-grid với trang QR, sidebar không có ID mở đúng picker. Chọn thẻ mới vào trang sự kiện cụ thể; selector B5 cho phép đổi sự kiện. [Báo cáo và kiểm thử](../reports/stitch/B3_B5_20261101_214409_event_pickers.md).
