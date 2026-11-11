# Rà soát dự án và trạng thái mobile — 10/11/2026

## Phạm vi và kết luận

Rà soát cấu trúc, mã nguồn, lịch sử Git, cấu hình triển khai; chạy build, lint, unit tests và bộ UI tests sẵn có. Đây không phải nghiệm thu toàn bộ nghiệp vụ, bảo mật hay bản đang cài trên điện thoại. Không thay đổi mã ứng dụng, không triển khai production, không chạy migration hoặc ghi dữ liệu nghiệp vụ.

Mobile có mã nguồn hoạt động ở mức typecheck, lint, unit tests, xuất bundle Android/iOS/web và UI preview với API mock. Chưa đồng bộ các thay đổi mới nhất của web. Chưa đủ bằng chứng xác nhận app native hoạt động trọn luồng trên thiết bị thật hoặc đã được cập nhật tới người dùng.

## Công nghệ và phạm vi

| Thành phần | Công nghệ trong repository |
|---|---|
| Backend | TypeScript, Express 5, TypeORM, PostgreSQL |
| Web | TypeScript/TSX, React 19, Vite, React Router |
| Mobile | TypeScript/TSX, React Native 0.86.3, Expo ~57.0.26, React 19.2.3, Expo Router ~57.0.24 |
| Nền tảng mobile | Android và iOS; React Native Web dùng cho bản preview |

Nguồn: `package.json`, `server/package.json`, `client/package.json`, `mobile/package.json`, `mobile/app.config.ts`. Mobile có mã UI riêng trong `mobile/src/app/`, dùng chung backend/tài khoản với web. Phạm vi hiện tại là khách hàng và nhân viên check-in; khu quản trị Organizer/Admin nằm ở web theo `mobile/README.md`.

## Các phát hiện

1. **Mobile chưa theo kịp web.** Git gần nhất của mobile: `169849a`, 23/10/2026 (danh sách chờ); đợt giao diện: `bb2955e`, 22/10/2026. Web có commit `cd8372a` ngày 05/11/2026. Không suy ra chênh lệch chỉ từ ngày: đã đối chiếu thanh toán và hồ sơ bên dưới.
2. **Thiếu SePay/MB Bank trên mobile.** `mobile/src/app/orders/[id].tsx` chỉ đọc `paymentMode`, xử lý demo/VNPay sandbox và gọi `/orders/:id/payments`. Không có luồng `/sepay/orders/:orderId/payment` như `client/src/pages/booking/Checkout.tsx`. Khi backend trả `paymentMode=disabled, sepayEnabled=true`, mobile hiện báo chưa bật thanh toán, không hiện hướng dẫn chuyển khoản SePay. Đây là kết luận từ code, chưa tái hiện với API thật trong phiên này.
3. **Tài khoản mobile đơn giản hơn web.** `mobile/src/app/(tabs)/account.tsx` chỉ hiện tên/email và đăng xuất; chưa có sửa hồ sơ/avatar/đổi mật khẩu như web. `mobile/src/app/auth.tsx` có đăng ký/đăng nhập nhưng chưa có khôi phục mật khẩu.
4. **Chưa có cấu hình OTA trong repo.** Không có dependency `expo-updates`, cấu hình `updates`, `runtimeVersion` hay EAS project ID trong cấu hình app đã kiểm tra. Có `eas.json` cho development/preview/production, nhưng không chứng minh đã build/ký/phát hành APK/IPA. README cũng ghi chưa build/ký APK/IPA. Không truy cập tài khoản Expo/store để kiểm chứng lịch sử phát hành bên ngoài repo.
5. **Deploy web không cập nhật app.** Root `build` và Dockerfile chỉ build/copy server + client. Mobile cần quy trình phát hành riêng; export hiện tại tạo JS/Hermes bundle, không tạo APK/IPA. Native release kiểm tra API HTTPS tại `mobile/src/lib/api.ts`.
6. **Môi trường local ban đầu chưa sẵn sàng chạy mobile.** Không thấy listener ở các cổng 8000, 8011, 8081, 8082, 5173 lúc kiểm tra. `check:mobile` ban đầu lỗi thiếu `tsc`; đã cài 818 package theo lockfile bằng `npm ci --prefix mobile --no-audit --no-fund`, sau đó các kiểm tra mobile đạt. Không có `adb` trong PATH; chưa kiểm tra thiết bị thật.
7. **Tài liệu tổng có nội dung cũ.** Master Plan còn ghi Sharp 0.34.5/open, trong khi package đang dùng 0.35.5 và test decoder đạt. Các mục E1/E3 cần đối chiếu lại báo cáo sửa lỗi 22/10 và test hiện tại trước khi kết luận vẫn mở hoặc đã nghiệm thu đầy đủ.
8. **Web bundle lớn.** Build báo JS khoảng 1,968 kB, gzip 532 kB và dữ liệu Browserslist cũ; đây là cảnh báo, không làm build thất bại.
9. **Bộ UI web không đạt: 5 PASS, 9 FAIL.** Cả 9 lỗi thuộc `client/tests/stitch-web.spec.ts`. Bốn bài discovery tìm `.event-card` trong khi trang chủ hiện dùng `.home-event-card`. Fixture sự kiện thiếu `checkin_opens_at`/`checkin_closes_at`; trang chi tiết gọi formatter trực tiếp, tạo lỗi runtime `RangeError: Invalid time value` trong ba bài đặt vé/render chi tiết. Hai bài vé/quyền truy cập và scanner không tìm thấy phần tử mong đợi, cần đối chiếu thêm contract/selector hiện tại. Không được coi tất cả là lỗi giả hoặc suy ra production bị lỗi tương tự. Hai bài thông báo, một bài SePay và hai bài VNPay đạt với API mock. Bằng chứng lỗi và trace ở `client/test-results/`.

## Kiểm tra đã thực hiện

| Lệnh/kiểm tra | Kết quả |
|---|---|
| `npm run build` | PASS backend + web |
| `npm run check` | PASS boundaries + web lint khi chạy lại độc lập; lượt trước bị race với Playwright tạo/xóa `client/test-results` |
| `npm test --prefix server` | 66 bài: 45 PASS, 21 SKIP, 0 FAIL; các suite DB chưa có biến kết nối kiểm thử riêng |
| `npm run check:mobile` | PASS typecheck, lint, 23/23 unit tests |
| `npm run export --prefix mobile` | PASS web, Android, iOS; output `mobile/dist` |
| `npm run test:mobile-ui --prefix client` | 8/8 PASS, API mock, viewport 360/390/430/768 px |
| `npm run test:ui --prefix client` | 5 PASS, 9 FAIL; xem phát hiện 9 |

UI mobile kiểm tra bộ lọc, giới hạn số vé, retry/idempotency, thanh toán demo, QR, chuyển khách sang đăng nhập, nhập mã check-in thành công/trùng và thông báo. Đã xem ảnh `.local/qa/stitch-mobile-detail.png`; ảnh dùng dữ liệu fixture, không phải bằng chứng giao dịch hay QR thật. Các ảnh khác do suite tạo nằm trong `.local/qa/stitch-mobile-*.png` và `.local/qa/notifications-expo.png`.

Playwright ban đầu thiếu Chromium, đã cài browser bằng `npx playwright install chromium` rồi chạy lại. Không đổi lockfile hoặc mã nguồn ứng dụng. Kiểm tra trong Node v24.19.0 trên Windows.

## Giới hạn và việc cần làm

- Chưa xác minh API thật, database integration, thanh toán thật, camera, SecureStore, mạng LAN, deep link quay lại từ VNPay, APK/IPA đã cài hoặc OTA trên thiết bị.
- Không truy cập Stitch trong phiên này; không kết luận pixel-perfect với thiết kế và không thay đổi thiết kế.
- Ưu tiên đồng bộ checkout SePay và các màn khách hàng mobile với thiết kế web đã duyệt; xác định rõ chức năng nào chỉ dành cho web.
- Cần chạy E2E với database kiểm thử cô lập, sau đó nghiệm thu Android/iOS thật và thiết lập quy trình build/phát hành mobile.
- Không dùng kết quả export hoặc API mock để tuyên bố bản production hay app trên điện thoại đã hoạt động đầy đủ.
