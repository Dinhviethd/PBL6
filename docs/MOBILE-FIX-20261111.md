# Mobile fix — 2026-11-11

## Phạm vi và kết luận

Nhánh: `fix-mobile`; base commit `e9ff42c4761990f22463edc6435922fded1f1b8d`. Triển khai sửa lỗi từ [QA Android trước](MOBILE-EXPO-QA-20261110-1925.md), không thay public API/schema, không nâng SDK 58, không deploy/merge/APK.

**Đã hoàn tất thay đổi source và kiểm thử tự động; chưa nghiệm thu lại Android thật.** ADB không có thiết bị ở đầu và cuối phiên; đã yêu cầu kết nối lại nhưng chưa nhận được thiết bị. Không tính UI mock hoặc API PASS thành Android PASS.

## Thay đổi

| Mã | Vấn đề | Kết quả source |
|---|---|---|
| F1 | Lỗi mạng đồng thời hiện danh sách rỗng; thông báo chưa tải bị hiểu là 0 | Danh sách khám phá, đơn, vé, phân công có nhánh lỗi và Thử lại; badge chỉ có số khi có dữ liệu, accessibility nêu chưa tải được số thông báo. Không thay cơ chế cô lập tài khoản. |
| G1 | Mobile không hỗ trợ SePay dù backend bật | Thêm lựa chọn ngân hàng khi `sepayEnabled`, giữ demo/VNPay và tránh chọn chéo provider đang có. Controller/component riêng, DTO typed, GET khôi phục trước POST rõ ràng từ người dùng. |
| G1a | Rủi ro tạo lặp, mất phản hồi, polling | Single-flight, GET đối chiếu sau POST mất phản hồi mạng; polling 8 giây, thao tác tay tối thiểu 3 giây; dừng nền/mất focus/unmount/terminal/review/hết hold; 429 theo Retry-After hoặc 60 giây. |
| G1b | Hạn QR khác hạn giữ chỗ | Hiện `expiresAt` và `holdUntil` riêng; ẩn thông tin chuyển khoản khi hết hạn, không được chuyển, cần review hoặc lỗi truy vấn. Chỉ đơn PAID từ backend mở ví vé. |
| F2 | Sai lệch bản vá SDK 57 | Expo 57.0.32 và các module theo `expo install --fix`; thêm Clipboard 57.0.2 có sẵn trong Expo Go. Doctor 21/21. |

Không tự tạo QR thanh toán, không tự đánh dấu đã trả tiền, không mở app ngân hàng tự động, không thêm quyền thư viện ảnh. Sao chép tài khoản/số tiền/nội dung theo thao tác người dùng.

## Bằng chứng kiểm thử

Bằng chứng local: `.local/mobile-expo-qa/20261111-fix/` (ignored, không commit credentials).

| Bộ kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| TypeScript + ESLint | PASS | `check-mobile.log`; không lỗi lint/type |
| Unit mobile | 31 PASS, 0 FAIL | `check-mobile.log`; 23 ca cũ + 8 ca mới, gồm Retry-After, lifecycle controller, hạn QR/hold, terminal/review, nhấn trùng, lost POST, lỗi 401/403/404/409/503 và session isolation cũ |
| Expo Doctor | 21/21 PASS | Kết quả CLI trong phiên; vẫn SDK57 |
| Export Android + web | PASS | `export.log`, `export/`; Hermes Android + web bundle, không phải APK |
| Backend integration/unit | 75 PASS, 0 FAIL, 1 SKIP | `backend-tests.log`; runner SePay/VNPay/integration hiện có, PostgreSQL cô lập; HMAC webhook giả lập chỉ local, đối soát/issue vé/idempotency/ownership |
| UI mobile web với API fixture | 4 PASS, 0 FAIL | `ui-tests.log`; mất mạng + retry/count, SePay start/lost state/PAID, thông báo, hàng chờ join/leave/offer/error |
| Ảnh UI fixture 390px | Đã xem | `sepay-ui.png`; dữ liệu TESTONLY, không có thông tin chuyển khoản thật |
| Live read-only | PASS | GET health success=true; config paymentMode=disabled, sepayEnabled=true; không POST/auth/payment/webhook live |
| Git whitespace | PASS | `git diff --check` |

Tổng ca tự động: **110 PASS, 0 FAIL, 1 SKIP**, không cộng Doctor/export vào số ca. Ca bỏ qua: `L1 database isolation and cross-process reconciliation` theo điều kiện riêng của suite. Không tuyên bố đã kiểm chứng đối soát ngân hàng thật.

Các lỗi môi trường đã xử lý: lệnh install kèm --fix ban đầu chưa cài Clipboard, sau đó cài riêng và đồng bộ thành công; chạy typecheck lúc npm đang thay dependencies gây thiếu module tạm thời, đã chạy lại đạt; sandbox chặn Hermes ghi file tạm và browser không tới QA server, đã chạy trên host và kiểm lại đạt. Các lỗi này không còn là lỗi source ở kết quả cuối.

## Các ca chưa nghiệm thu

| Mã | Trạng thái | Điều kiện còn thiếu |
|---|---|---|
| AND-01 | BLOCKED | Android/Expo Go SDK57: khởi động bản mới, layout/back/bàn phím, clipboard thật |
| AND-02 | BLOCKED | Luồng UI trên điện thoại → webhook giả lập local → ví vé QR → camera check-in → quét trùng; ADB không thấy điện thoại |
| AND-03 | BLOCKED | Foreground/background, tắt Wi-Fi dùng 4G/mất mạng/phục hồi trên thiết bị thật; unit controller không thay thế nghiệm thu này |
| UI-EXTRA | NOT RUN | Pagination fixture nhiều trang trên bản mới; suite hàng chờ offer là mock, không chứng nhận worker thực chạy qua UI |
| LIVE-PAY | NOT RUN | Thanh toán ngân hàng thật không thuộc scope; không tạo mới giao dịch live |

Không ghi nhận lỗi source còn mở qua các bộ kiểm tra đã chạy. Rủi ro còn lại là thiếu kiểm chứng native/lifecycle/camera thực tế và các ca chưa chạy phía trên. npm audit sau patch báo 15 vulnerabilities (11 moderate, 4 high); chưa xử lý ngoài phạm vi patch, không dùng audit fix --force; Doctor PASS không có nghĩa security audit sạch.

## Môi trường, dữ liệu và dọn dẹp

- Cổng 55432 đang do `pbl6-audit-20261108-pg` chiếm. Giữ nguyên container đó và `pbl6-api-1`.
- Tạo container SePay test riêng bằng compose tạm trên loopback **55433**, cùng kiểm tra tên/image/volume/network label/credentials. Chỉ adapter test local đổi cổng; không sửa guard production/repository.
- Database tạm `eventhub_sepay_8c93bd91484e_test` tạo trong phiên đã được xóa sau khi lưu kết quả. Container `eventhub-sepay-local` đã dừng; container/volume cấu hình rỗng vẫn còn local để dùng lại, cấu hình chuẩn 55432 cần được xử lý khi tái sử dụng vì cổng đó đang bận.
- Không tạo dữ liệu TEST live, không cần hủy đơn/thanh toán/thu hồi phân công live trong phiên này.
- QA static server 8084 do phiên này tạo được dừng khi bàn giao. Không dừng Metro của người dùng; không thêm adb reverse khi chưa có thiết bị.
- Giữ nguyên tài liệu và file chưa commit đã tồn tại trước phiên; không tự commit hoặc merge.

## Việc tiếp theo

1. Kết nối Android USB và xác minh `adb devices -l` hiện `device`; dùng Metro riêng với EXPO_PUBLIC_API_URL chỉ tới API local test qua reverse khi mô phỏng webhook.
2. Chạy AND-01/02/03, thêm bằng chứng native và kiểm pagination/worker offer thực; chỉ đóng nghiệm thu Android sau khi các ca này đạt.
3. Xử lý dependency security audit trong phạm vi riêng có đánh giá tương thích, trước release nếu phù hợp. APK release/iOS vẫn cần nghiệm thu độc lập.
