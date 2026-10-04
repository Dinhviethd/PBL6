# EventHub Mobile

Expo SDK 57 + React Native + Expo Router, dùng chung API Express và tài khoản với web. Phạm vi: khách hàng mua/xem vé và nhân viên check-in. Organizer/Admin quản lý trên web.

## Đã triển khai

- Đăng ký/đăng nhập, khôi phục phiên, refresh token xoay vòng và đăng xuất. App native lưu refresh token trong Expo SecureStore; access token chỉ ở bộ nhớ. Bản web dùng cookie HttpOnly của backend.
- Khám phá, tìm theo từ khóa/thành phố/danh mục, chi tiết sự kiện, chọn nhiều loại vé (tối đa 10 vé/đơn).
- Đặt đơn với idempotency key giữ nguyên khi retry, theo dõi thời hạn giữ chỗ, hủy đơn chưa thanh toán, thanh toán demo thành công/thất bại theo cấu hình server.
- Lịch sử đơn, ví vé, QR do server cấp; không tự tạo vé khi mất mạng hoặc thanh toán chưa xác nhận.
- Nhận/từ chối lời mời nhân viên, xem phân công, quét QR bằng camera hoặc nhập mã. Chống gửi lặp từ camera, dừng camera khi rời màn hình/đưa app xuống nền; quyền thu hồi được server kiểm tra mỗi lần quét.
- Các danh sách có phân trang, tải lại khi vào màn hình và kéo để làm mới; có trạng thái tải/lỗi/rỗng.

## Chạy trên điện thoại

Tại thư mục gốc repository:

```powershell
npm ci --prefix server
npm ci --prefix mobile
docker compose up -d db
npm run db:migrate --prefix server
# Chỉ khi cần dữ liệu demo và server/.env đã có DEMO_PASSWORD:
npm run db:seed --prefix server
npm run dev:mobile
```

`dev:mobile` khởi động API cổng 8000, worker nhả giữ chỗ và Expo cổng 8081. API được bind `0.0.0.0` để điện thoại truy cập; chỉ dùng trong mạng phát triển tin cậy. Script ưu tiên địa chỉ Wi-Fi, tránh chọn VPN/VMware. Có thể đặt `REACT_NATIVE_PACKAGER_HOSTNAME` trước khi chạy để chọn địa chỉ khác. Không chạy đồng thời với `npm run dev` vì cùng cổng API.

Cài Expo Go hỗ trợ SDK 57, nối điện thoại cùng Wi-Fi với máy tính, mở URL `exp://<IP-máy-tính>:8081` mà script in ra hoặc quét mã trong terminal Expo. App tự suy ra địa chỉ API `http://<máy-chạy-Metro>:8000/api`. Nếu cần chỉ định, copy `.env.example` thành `.env.local` và đặt `EXPO_PUBLIC_API_URL`, rồi khởi động lại Expo. `localhost` trên điện thoại là chính điện thoại, không phải máy tính. Không đặt JWT secret, database URL hoặc mật khẩu vào biến `EXPO_PUBLIC_*`.

Nếu Windows Firewall chặn, cho phép Node trong mạng Private theo chính sách của máy. Không mở PostgreSQL ra LAN. Có thể kiểm tra `http://<IP-máy-tính>:8000/api/health` từ trình duyệt điện thoại trước khi đăng nhập.

Với Android emulator, đặt API `http://10.0.2.2:8000/api`. Khi API đã chạy riêng: `npm run android --prefix mobile` hoặc `npm run mobile` tại thư mục gốc. Trên Windows dùng thiết bị iOS thật với Expo Go; iOS Simulator cần macOS.

## Xem thử trên máy tính

```powershell
npm run build --prefix server
npm run export --prefix mobile
npm run mobile:preview
```

Mở http://127.0.0.1:8082. Bản xem thử dùng cùng mã nguồn React Native Web và phục vụ `/api` cùng origin, không cần mở CORS. Chạy `npm run web --prefix mobile` cũng mở server preview này. Đây là bản kiểm tra UI, không thay thế kiểm thử camera và SecureStore trên thiết bị thật.

## Kiểm thử và đóng gói

```powershell
npm run check:mobile
npm run export --prefix mobile
cd mobile
npx expo-doctor
cd ../client
# Cần mobile preview đang chạy trên database demo riêng:
npx playwright test --config playwright.mobile.config.ts
```

`mobile/tests/api-client.test.mjs` kiểm tra refresh đồng thời, lưu token mới, giữ idempotency key khi retry, xử lý mất mạng và tách auth web/native. Backend integration kiểm tra native login/register/refresh, token replay, logout và chặn Origin trình duyệt ở endpoint native. E2E mobile kiểm tra mua vé → QR → chấp nhận phân công → check-in → thu hồi → đăng xuất ở viewport 390px.

`expo export` tạo JS/Hermes bundles trong `mobile/dist`; **không tạo APK/IPA**. Để build cài đặt qua EAS, đăng nhập tài khoản Expo và liên kết project của bạn trước:

```powershell
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
# Cấu hình EXPO_PUBLIC_API_URL trỏ API HTTPS có thể truy cập từ thiết bị
npx eas-cli@latest build --platform android --profile preview
# iOS cần thông tin ký và provisioning phù hợp
npx eas-cli@latest build --platform ios --profile preview
```

`eas.json` có profile development, preview (Android APK) và production. Native release yêu cầu `EXPO_PUBLIC_API_URL` HTTPS; development build dùng `APP_VARIANT=development`. Chưa build/ký APK/IPA, chưa upload store. Camera vật lý, SecureStore trên thiết bị và mạng Wi-Fi từ điện thoại cần nghiệm thu riêng.

## API auth mobile

- `POST /api/auth/mobile/register`: cùng payload đăng ký web, trả user/accessToken/refreshToken.
- `POST /api/auth/mobile/login`: `{ email, password }`, trả user/accessToken/refreshToken.
- `POST /api/auth/mobile/refresh-token`: `{ refreshToken }`, trả cặp token mới, vô hiệu hóa token cũ.
- `POST /api/auth/logout`: Bearer access token, thu hồi phiên hiện hành.

Các endpoint native không đặt cookie và từ chối request có Origin trình duyệt. Các API nghiệp vụ giữ nguyên chính sách kiểm quyền/ownership hiện có.

Tài liệu chính thức: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Router](https://docs.expo.dev/router/installation/), [Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/), [SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/).
