# Kế hoạch thiết kế lại trang check-in nhân viên

Ngày lập: 2026-11-01 16:35:58 UTC+07. Cập nhật: 2026-11-01 16:52:12 UTC+07. Trạng thái: ĐÃ TRIỂN KHAI SOURCE, ĐẠT CÓ ĐIỀU KIỆN trên PostgreSQL test riêng và Chrome.

[Báo cáo triển khai](../reports/stitch/StaffCheckin_20261101_165212_implementation.md). Các mục kế hoạch bên dưới giữ bối cảnh trước triển khai; kết quả thực tế tại nhật ký cuối tệp.

## Phạm vi đã chốt

- Đích: `/checkin/events/:id`, `client/src/pages/staff/StaffCheckin.tsx`.
- Mẫu: `/organizer/events/:id/checkin`, `QRScanPage.tsx` và `qr-scan.css`.
- Dùng header/footer người dùng hiện hữu qua `App.tsx`: `AuthHeader` variant home và `AuthFooter`.
- Người dùng xác nhận hiển thị đầy đủ tên khách, hạng vé, mã vé, thời điểm check-in như organizer; chỉ camera, nhập mã và kết quả, không thêm thống kê/lịch sử.
- Giữ backend, phân quyền, API và nghiệp vụ hiện tại. Phiên này chỉ lập tài liệu.
- Đây là trang con của luồng A13, chưa được gán mã màn hình Stitch riêng; không tự đặt A14 hoặc gán artifact A13 danh sách cho scanner.

## Đối chiếu hiện trạng

| Thành phần | Organizer hiện tại | Nhân viên hiện tại / kế hoạch |
|---|---|---|
| Khung trang | Sidebar và header organizer | Hiện shell cũ; chuyển sang header/footer user, không có sidebar organizer |
| Ngữ cảnh | Tiêu đề trạm quét, card sự kiện | Hiện tiêu đề đơn giản; dùng hero/card như mẫu, giữ tên, địa điểm, giờ thật |
| Điều hướng | Liên kết chọn sự kiện về organizer | Quay lại “Sự kiện được phân công” tại `/checkin` |
| Camera / nhập mã | Cùng cột trái | Scanner cũ chia camera và nhập mã hai cột; chuyển theo mẫu |
| Kết quả | Thẻ chi tiết cột phải | Hiện thông báo text; nâng thành thẻ chi tiết đầy đủ |
| API | GET metadata và POST check-in chung | Giữ nguyên hai API này |
| Quyền | Chủ sự kiện organizer hoặc admin; API cũng chấp nhận staff ACTIVE | Nhân viên phải có phân công ACTIVE; backend tiếp tục quyết định |

## Bố cục đề xuất

```text
AuthHeader hiện hữu
  ← Sự kiện được phân công
  Tiêu đề trạm check-in       Card sự kiện / địa điểm / giờ GMT+7
  ┌────────────────────────┬──────────────────────────┐
  │ Camera QR              │ Kết quả xác thực         │
  │ Bật / dừng camera      │ Tên khách, hạng vé       │
  │ Nhập mã + xác thực     │ Mã vé, thời điểm         │
  │                        │ Kiểm tra vé tiếp theo    │
  └────────────────────────┴──────────────────────────┘
AuthFooter hiện hữu
```

- Desktop dùng hai cột theo B9, nội dung căn giữa trong shell user; bỏ margin dành cho sidebar. Mobile một cột: camera → nhập mã → kết quả; kết quả mới cần được thông báo bằng aria-live, dễ tiếp cận mà không gây cuộn bất ngờ khi nhập.
- Bám màu, font, card, nút và hiệu ứng camera của `qr-scan.css`: nền tối, cyan/tím, Syne/Be Vietnam Pro/Space Grotesk. Không chép chiều cao canvas cố định; giữ shell chung.
- Chỉ một kết quả tại mỗi thời điểm: chờ, đang xử lý, thành công, đã dùng, lỗi. Trùng vé hiển thị thời điểm cũ và thông báo không ghi nhận lại.
- Lỗi tải sự kiện có thử lại; 403/404 giải thích đúng và có đường về danh sách. Không mở scanner trước khi metadata/quyền hợp lệ. Không suy ra quyền từ role frontend.
- Camera tắt/đang mở/đang quét/lỗi được phân biệt; không tự bật khi vào trang. Dừng sau một lần đọc, khi rời trang, đổi tài khoản/sự kiện hoặc ẩn tab. Nhập mã luôn là phương án thay thế khi thiếu camera.

## Các bước triển khai

1. Xác minh lại GET/POST bằng tài khoản staff ACTIVE trên DB test riêng, gồm các trường kết quả; kiểm tra trạng thái thu hồi, cửa sổ check-in và sai sự kiện. Source tồn tại không thay thế bằng chứng runtime.
2. Bổ sung match chính xác `/checkin/events/:id` vào `usesSharedHomeShell` trong `App.tsx`; giữ Guard và key phiên/sự kiện, bảo đảm header/footer chỉ render một lần.
3. Tách phần trạm quét khỏi khung organizer thành component/hook dùng chung trong `components/ticketing` và/hoặc `features/ticketing`. Dữ liệu sự kiện và điều hướng truyền rõ qua props. `QRScanPage` giữ shell organizer, `StaffCheckin` dùng shell user. Giữ hành vi B9 khi tách; không sao chép nguyên page kèm sidebar.
4. Tách CSS nội dung quét khỏi quy tắc shell `.qs-body`/sidebar; scope rõ để không ảnh hưởng header/footer và các trang khác. Dùng type metadata check-in riêng thay `Assignment` vì GET chi tiết không trả toàn bộ phân công.
5. Áp dụng hero/card sự kiện, camera + form trái, kết quả phải; render các trường server trả, không tạo thông tin khách hoặc trạng thái thành công giả. Chống request đồng thời bằng lock; không tự retry POST sau mất phản hồi. Cho phép người dùng chủ động kiểm tra lại, server quyết định duplicate.
6. Kiểm thử hai route sau khi dùng chung component; cập nhật báo cáo và Master Plan bằng bằng chứng thực tế.

## API và dữ liệu

| Method / đường dẫn HTTP | Hợp đồng / kiểm tra |
|---|---|
| GET `/api/checkin/events/:id` | Auth + checkinGuard; trả id,title,venue_name,starts_at,ends_at,checkin_opens_at,checkin_closes_at |
| POST `/api/checkin/events/:id/checkins` | Auth + booking.scan; body `{code}`, tối đa 256 ký tự; frontend B9 hiện đọc duplicate,ticket_id,checked_in_at,ticket_code,buyer_name,ticket_type_name |

Nguồn đã đọc: `server/src/app.ts`, `server/src/modules/event/public.ts`, `QRScanPage.tsx`, scanner cũ và App. Không thay route backend, không gọi API organizer để lấy dữ liệu cho staff. Runtime authenticated và contract phản hồi cần kiểm lại trước tích hợp; phiên plan không gửi check-in hoặc sửa dữ liệu.

## Nghiệm thu

- Một header/footer user; không sidebar/CTA quản trị; quay về `/checkin` đúng.
- Layout gần trang organizer ở 1440/1024/768/390px, không tràn ngang, thao tác bằng bàn phím và focus rõ.
- Camera và nhập mã dùng cùng luồng; nút khóa khi gửi; reset đúng khi đổi sự kiện/tài khoản; track camera được giải phóng.
- Thành công, duplicate, mã sai/sai sự kiện, vé hủy/chưa thanh toán, CHECKIN_CLOSED, 401/403/404 và lỗi mạng có thông báo đúng; không báo thành công khi chưa có server xác nhận.
- Tên khách/hạng vé/mã vé/thời điểm đúng response, giờ Asia/Ho_Chi_Minh; thiếu field không bịa dữ liệu.
- Thu hồi phân công sau khi mở trang vẫn bị backend từ chối lần quét tiếp; không còn kết quả khách cũ khi đổi tài khoản.
- Build, lint liên quan và regression staff/organizer đạt; kiểm camera thật trên HTTPS/localhost được ghi riêng nếu chưa thực hiện.

## Nguồn thiết kế và giới hạn

Đã truy cập list_screens project chính thức `10374042969343935993`. B9 hiện được trả về với ID `fe0cb469487e4ae0ac3be48de65c375b`; tài liệu cũ ghi `d5ec1ed78e9d49e9922c75a3d768991f`. Chưa kiểm ảnh/HTML của ID mới; không tự sửa mapping B9 hoặc tuyên bố đối chiếu pixel. Theo yêu cầu hiện tại, lấy trang organizer trong source làm mẫu cụ thể. Nếu triển khai cần đối chiếu artifact Stitch, xác minh ID/ảnh/HTML trước. Không tạo hoặc sửa Stitch trong phiên này.

Báo cáo: [Phiên lập kế hoạch](../reports/stitch/StaffCheckin_20261101_163558_plan.md).

## Nhật ký triển khai 2026-11-01 16:52:12 UTC+07

- Đã thêm route chi tiết staff vào shared home shell trong App; tái sử dụng AuthHeader/AuthFooter.
- Đã tách `CheckinStation` và CSS nội dung dùng chung cho staff/organizer. Hai page giữ shell/điều hướng riêng; component được reset theo session revision và event ID. Không sửa backend sản phẩm hoặc artifact Stitch.
- Trang staff có link về `/checkin`, hero/card metadata, camera/nhập mã cùng cột trái, thẻ kết quả đầy đủ cột phải; mobile xếp dọc. Đã xử lý overflow header ở tablet bằng quy tắc scoped giống A13.
- Đã xem metadata/HTML/ảnh B9 hiện tại `fe0cb469487e4ae0ac3be48de65c375b`, DESKTOP2560×3238, HTML khai báo1280×1609; HTML file `2827451453672412032`, screenshot `9740001862705473115`. Cấu trúc phù hợp tham chiếu, giữ các phần đã giảm phạm vi trong B9; không tự chép dữ liệu mẫu/cổng/offline/debug/in thẻ.
- API thật trên DB test:30HTTP assertions PASS; metadata staff ACTIVE, kết quả đầy đủ, từ chối sự kiện khác/thu hồi/không đăng nhập; QR/manual/duplicate/invalid/VOID/closed/concurrency giữ đúng nghiệp vụ.
- Chrome API thật PASS: bốn viewport staff1440/1024/768/390; organizer1440/768/390; không tràn ngang; một user header/footer ở staff; không có sidebar organizer; kết quả/reset/focus/UTC+7 đúng. Kiểm thêm unpaid, thu hồi sau mở trang,403/retry,404, lỗi POST không tự retry, logout xóa kết quả khách.
- Camera: Chrome fake device đã mở được ở phiên kiểm đầu; bộ kiểm cuối dùng canvas MediaStream mô phỏng để kiểm start/stop/reopen/visibilitychange/unmount, có mô phỏng getUserMedia bị từ chối. Không coi đây là nghiệm thu camera vật lý hoặc nhận diện QR quang học.
- Client build/lint liên quan PASS; server build PASS; git diff --check PASS. Chưa rollout vào container8000 hoặc kiểm dữ liệu Live; chưa kiểm screen reader/contrast đầy đủ/camera thật.
- Ảnh bằng chứng `.local/qa/staff-checkin/`; API/Vite/Chrome test đóng trong finally; PostgreSQL test được dừng sau phiên. Plan đã hoàn tất triển khai trong source, các giới hạn nghiệm thu được giữ rõ ở report.
