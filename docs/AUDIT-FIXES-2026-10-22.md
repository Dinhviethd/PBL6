# Sửa audit PBL6 — 22/10/2026

Đã triển khai E1, E2, E3 trong working tree theo audit cùng ngày. Chưa commit, push hoặc deploy; không thay đổi schema hay quy tắc chống replay của backend.

## Thay đổi

- **E1 — cách ly phiên Expo web:** API client gắn request, refresh, restore và logout với thế hệ phiên. Phản hồi muộn không ghi đè phiên mới. Sau refresh bằng cookie, client kiểm tra `/auth/me` trước khi nhận token hoặc retry thao tác; khác tài khoản thì xóa phiên cũ. Request ẩn danh không tự nhận tài khoản từ cookie. Tín hiệu đổi phiên giữa các tab xóa state và remount màn hình để bỏ form/dữ liệu của tài khoản cũ. Native giữ cơ chế SecureStore và tuần tự hóa ghi/xóa token.
- **E2 — decoder ảnh:** pin Sharp `0.35.5`, cập nhật lockfile. Runtime Windows và image Linux đều xác nhận Sharp `0.35.5`, libvips `8.18.7`, libheif `1.23.5`. Kiểm thử đọc JPEG, PNG, WebP, GIF, TIFF, AVIF và xuất WebP; từ chối ảnh hỏng, quá giới hạn pixel và upload quá 5 MB. Không chạy payload khai thác.
- **E3 — refresh nhiều tab:** web và Expo web dùng Web Locks với cùng tên khóa. Request refresh chỉ được gửi sau khi lấy khóa, dùng cookie HttpOnly mới nhất. Trong mỗi tab vẫn gộp request refresh. Hàng đợi hết hạn sau 20 giây; đóng tab giữ khóa cho phép tab đang chờ tiếp tục. Không chia sẻ token qua localStorage; chỉ gửi tín hiệu hủy phiên.

## Kết quả kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| Backend với PostgreSQL test riêng | 31 pass, 0 fail, 0 skip |
| Unit mobile và browser-session | 23 pass |
| UI web / Expo web dùng mock | 13 / 8 pass |
| E2E web hiện có, API và PostgreSQL thật | 11 pass |
| E2E refresh nhiều tab mới, API và PostgreSQL thật | 3 pass |
| E2E Expo web gồm regression mới | 4 pass |
| Test xử lý ảnh trong image Linux | 1 pass |
| Build server/client, boundary check, lint, mobile typecheck | Pass |
| Expo export Android, iOS, web | Pass |

Các nhóm E2E web hiện có và refresh mới được kiểm tra ở các lượt riêng. Regression bao gồm đổi cookie A sang B mà không có storage event, đăng nhập từ tab khác, hai tab restore, hai access token hết hạn cùng lúc, đóng tab đang giữ khóa, và phản hồi request/refresh/logout muộn.

Log và harness nằm trong `.local/fixes-20261022/` (Git ignored): `backend-tests-final.log`, `mobile-unit-final.log`, `refresh-tabs.log`, `mobile-e2e.log`, `web-ui.log`, `mobile-ui.log`, `build.log`, `check-final.log`, `mobile-check-final.log`, `mobile-export-final.log`, `docker-build.log`, `linux-sharp.log`.

## Điều kiện và giới hạn

- Web Locks cần trình duyệt hỗ trợ và secure context: HTTPS hoặc localhost. Nếu thiếu API này, ứng dụng từ chối tự refresh và yêu cầu dùng môi trường phù hợp/đăng nhập lại; không gửi refresh không có khóa.
- Khóa chỉ phối hợp các tab cùng origin và cùng browser storage partition. Hai frontend ở origin khác nhau nhưng dùng chung cookie API, hoặc tab còn chạy bản cũ, chưa được cơ chế này phối hợp. Khi triển khai cần thống nhất origin sử dụng cookie và tải lại các tab cũ.
- Backend vẫn từ chối refresh-token replay và thu hồi phiên theo chính sách hiện có; không thêm grace period.
- Export native không thay thế kiểm thử trên thiết bị Android/iOS. Provider thanh toán, email thật và quét dependency toàn diện nằm ngoài lượt sửa này.
- Database dùng riêng cho kiểm thử; không migrate/seed Supabase hoặc database ứng dụng. Image `eventhub-audit-fixes:20261022` chỉ dùng kiểm tra, chưa deploy.

Tham chiếu bản vá Sharp: [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj).
