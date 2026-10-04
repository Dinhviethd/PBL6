# Nhân viên check-in theo sự kiện

Triển khai ngày 04/10/2026. Quyền nhân viên nằm trong từng sự kiện, không thêm role toàn hệ thống.

## Cách sử dụng

1. Organizer mở khu vận hành sự kiện → **Nhân viên**, nhập email tài khoản EventHub đang hoạt động.
2. Người nhận đăng nhập → **Nhân viên check-in** → chấp nhận hoặc từ chối lời mời.
3. Sau khi chấp nhận, chọn **Mở quét vé** để dùng camera hoặc nhập mã. Khung giờ và các quy tắc vé hiện có vẫn được áp dụng.
4. Organizer xem **Nhật ký check-in** để biết mã vé, loại vé, người quét, thời gian và phương thức.
5. Organizer có thể thu hồi lời mời hoặc quyền đang hoạt động ngay trong tab Nhân viên.

Lời mời hiển thị trong ứng dụng, chưa gửi email. Người nhận phải có tài khoản trước khi được mời. Lời mời chưa trả lời hết hạn sau 7 ngày; sau khi chấp nhận, quyền tồn tại đến khi bị thu hồi, còn việc quét vé luôn phụ thuộc khung giờ/trạng thái sự kiện. Có thể mời lại sau khi hết hạn, từ chối hoặc thu hồi. Lần mời lại có ID mới; lời mời cũ không thể được dùng để chấp nhận lần mới.

Nhân viên chỉ xem thông tin cơ bản và check-in sự kiện được cấp quyền. Không được sửa sự kiện, quản lý nhân viên, đọc đơn hàng, danh sách người tham dự, doanh thu hoặc nhật ký toàn sự kiện. Organizer sở hữu sự kiện và Admin giữ quyền quản lý hiện có.

## Nâng cấp database

Chạy từ thư mục gốc với `server/.env` trỏ đến database cần nâng cấp:

```powershell
npm run db:migrate --prefix server
```

Migration `EventCheckinStaff1791072000000` chỉ thêm bảng `event_checkin_staff` và index, không reset dữ liệu. Migration đầu tiên vẫn chỉ dành cho database trống; database đã chạy baseline MVP sẽ chỉ nhận migration còn thiếu. Cả runner release và TypeORM CLI đã đăng ký migration mới. Không dùng SQL baseline một mình để tạo schema mới nhất.

## API

Các đường dẫn có tiền tố `/api`, đều yêu cầu đăng nhập.

| API | Quyền / hành vi |
| --- | --- |
| GET/POST `/organizer/events/:id/staff` | Chủ sự kiện hoặc Admin: danh sách / mời bằng `{ email }` |
| DELETE `/organizer/events/:id/staff/:staffId` | Chủ sự kiện hoặc Admin: thu hồi |
| GET `/organizer/events/:id/checkins` | Chủ sự kiện hoặc Admin: nhật ký |
| GET `/me/checkin-assignments` | Lời mời và phân công của chính người đăng nhập |
| POST `/me/checkin-invitations/:id/respond` | Đúng người nhận: `{ accept: true/false }` |
| GET `/checkin/events/:id` | Nhân viên đã chấp nhận, chủ sự kiện hoặc Admin: thông tin cơ bản |
| POST `/checkin/events/:id/checkins` | Cùng quyền trên: `{ code }` |

Các danh sách phân trang 50 dòng, `page` bắt đầu từ 0. API POST check-in cũ dưới `/organizer/events/:id/checkins` dùng cùng kiểm tra quyền để tương thích.

## Dữ liệu và tính nhất quán

- Event sở hữu bảng phân công; Auth cung cấp thông tin người được mời và tên người quét qua public interface. Không join chéo owner.
- Check-in vẫn do Order xử lý, lưu `checked_in_by` theo principal đã xác thực. Nhật ký không trả token QR hay dữ liệu thanh toán.
- Mời, chấp nhận/từ chối, thu hồi đều ghi Audit trong cùng transaction.
- Scan giữ shared lock trên event; thay đổi phân công lấy exclusive lock. Scan đang thực hiện có thể hoàn tất trước khi thu hồi commit, nhưng sau khi thu hồi hoàn tất mọi scan tiếp theo bị từ chối, kể cả từ trang đang mở và access token cũ.
- Khóa tài khoản được kiểm tra bởi middleware Auth. Hai lần quét đồng thời vẫn chỉ ghi nhận một check-in.

## Kiểm thử

`server/test/integration.test.cjs` kiểm tra migration lặp, người mời/người nhận sai quyền, lời mời trùng/hết hạn/từ chối, mời lại, chấp nhận đồng thời, quyền giới hạn theo sự kiện, quét QR/mã đồng thời, tên người quét trong nhật ký, thu hồi khi đang quét và khóa tài khoản.

`client/tests/checkin-staff.spec.ts` kiểm tra luồng mời → chấp nhận → quét mã → xem nhật ký → thu hồi trên giao diện desktop/mobile. Camera thiết bị thật vẫn cần nghiệm thu riêng trên HTTPS.
