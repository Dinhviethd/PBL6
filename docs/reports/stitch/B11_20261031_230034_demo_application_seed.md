# B11 — Tạo application DEMO cho organizer@example.test

- **Thời điểm:** 2026-10-31 23:00:34 UTC+7
- **Màn hình:** B11 — Hồ sơ Ban Tổ Chức
- **Stitch:** project `10374042969343935993`, screen `f3ad3d9d0cf94e96b1a8a5e7bdc616ff` (không chỉnh sửa Stitch)
- **Loại phiên:** seed một bản ghi application để kiểm tra B11 hiển thị hồ sơ
- **Báo cáo trước:** [B11 runtime rollout](B11_20261031_170011_runtime_rollout.md)

## Yêu cầu và cách diễn giải dữ liệu

Người dùng yêu cầu seed `organizer_applications`, chọn trạng thái `APPROVED`, sau đó yêu cầu tự điền nội dung phù hợp. Người dùng trước đó chọn “dữ liệu thật” nhưng không cung cấp tên pháp nhân, mã số thuế/giấy phép hoặc địa chỉ. Vì vậy, các giá trị do phiên này tự tạo đều được đánh dấu **DEMO**, dùng domain dành cho thử nghiệm và ghi rõ không phải thông tin pháp lý đã xác minh. Email và điện thoại được lấy từ tài khoản hiện có.

Đây là dữ liệu minh họa để B11 có hồ sơ hiển thị; không dùng cho giao dịch hoặc xác minh pháp nhân. Trạng thái `APPROVED` được seed theo yêu cầu để mở B11, **không phải kết quả xét duyệt hồ sơ thật qua Admin UI/API**. `reviewed_by` và `reviewed_at` được điền để đáp ứng constraint DB yêu cầu cho trạng thái APPROVED; không có thao tác Admin review nào được thực hiện trong phiên này.

## Thao tác và dữ liệu

- Đọc `docs/PROJECT_MASTER_PLAN.md`, skill EventHub Stitch Review, kế hoạch B11 và schema trước thao tác.
- Kiểm tra chỉ đọc cho thấy `organizer@example.test` chưa có application; không thay application nào của người dùng khác.
- Thêm đúng một hàng vào bảng đã có `organizer_applications`; không chạy migration, không sửa schema, source, application khác, sự kiện hoặc nhân sự check-in.
- ID mới: `90f0819e-6ea6-4cf4-b329-3c92cf9a5c59`.

| Trường | Giá trị đã lưu | Nguồn / ghi chú |
|---|---|---|
| `organization_name` | `DEMO - EventHub Community` | Tự tạo, DEMO |
| `contact_name` | `Organizer DEMO` | Tự tạo, DEMO |
| `contact_email` | `organizer@example.test` | Email tài khoản |
| `contact_phone` | `0378531013` | Điện thoại tài khoản |
| `description` | `DEMO sample data requested for B11 UI; not legally verified.` | Ghi rõ dữ liệu minh họa |
| `business_name` | `DEMO - EventHub Community (fictional entity)` | Pháp nhân hư cấu, không dùng thực tế |
| `tax_id_or_business_license` | `DEMO-NOT-A-VALID-TAX-ID` | Không phải mã số thuế/giấy phép thật |
| `website_or_social` | `https://example.test` | Domain dành cho ví dụ |
| `head_office_address` | `DEMO address: Da Nang; not a real legal address` | Không phải địa chỉ pháp lý |
| `main_event_category` | `Technology and community events (DEMO)` | Tự tạo |
| `expected_event_scale` | `100-500 attendees per event (DEMO)` | Tự tạo |
| `status` | `APPROVED` | Seed theo yêu cầu mở B11; không phải xét duyệt thật |
| `logo_url`, `pending_legal_changes` | `NULL` | Để mặc định |

## Kiểm thử

- Đăng nhập tài khoản organizer: HTTP 200.
- `GET /api/organizer/profile` trên API đang chạy: HTTP 200, `initialized=true`, trả đúng `sourceApplicationId` và các giá trị DEMO đã seed.
- Browser Chrome trên `http://localhost:5173/organizer/profile`: đăng nhập thành công, route B11 hiển thị đúng tên tổ chức, tên pháp nhân DEMO và mã `DEMO-NOT-A-VALID-TAX-ID`; không có lỗi trang trong lượt kiểm tra.
- Không thay mật khẩu. Không upload ảnh, tạo audit mutation, thay đổi grants hoặc ghi thêm dữ liệu ngoài application nêu trên.

## Giới hạn và việc cần làm trước khi dùng thật

- Hồ sơ hiện là dữ liệu minh họa. Không coi `APPROVED` trong hàng này là chứng nhận pháp lý hoặc kết quả admin review.
- Trước khi dùng nghiệp vụ thật, thay toàn bộ trường DEMO bằng thông tin pháp nhân/contact đã được chủ tài khoản xác nhận và thực hiện quy trình duyệt thật; hoặc xóa riêng application DEMO này.
- Mật khẩu đăng nhập không được ghi vào báo cáo. Không có thay đổi mã nguồn hay thiết kế.

## Master Plan

Đã cập nhật ngày cập nhật gần nhất, dòng B11 trong ma trận tích hợp, bảng trạng thái màn hình B11 và mục theo dõi review B11 để ghi rõ application DEMO đã seed, kết quả GET/UI, trạng thái APPROVED chỉ để mở giao diện và giới hạn chưa phải admin review thật. Cập nhật thêm nhật ký hiện tại trong [Feature B11](../../ui/Feature_B11_OrganizerProfile.md) và [kế hoạch dùng bảng hiện có](../../ui/B11_ExistingTablesPlan.md). Không đổi trạng thái hay nội dung của màn hình khác.
