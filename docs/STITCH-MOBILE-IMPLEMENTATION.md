# Mobile Stitch — kết quả triển khai

Ngày: 22/10/2026. Branch: `codex/stitch-mobile-integration`.

## Thay đổi

- Theme tối và tím, token dùng chung trong `mobile/src/theme/tokens.ts`; font Be Vietnam Pro 400–800 tải cục bộ, kèm giấy phép OFL.
- Đồng bộ form, button, card, badge, notice, loading, navigation, status bar và tab bar. Các màn auth/account/orders/staff dùng chung component nên nhận theme mới.
- Discovery có hero từ kết quả API, danh mục cuộn ngang, ảnh dự phòng khi thiếu/lỗi, giá chưa có dữ liệu không bị hiển thị thành miễn phí.
- Detail có chỉ dẫn bước đặt vé, nút tăng/giảm với nhãn trợ năng và vùng chạm tối thiểu 48, thanh tổng tiền/đặt vé nằm ngoài vùng cuộn và có padding safe area.
- Checkout có chỉ dẫn bước theo trạng thái đơn. Ví vé có đường phân cách; QR nằm trong khung trắng riêng, mã vé vẫn selectable.
- Scanner có trạng thái chờ đồng bộ; inbox chưa đọc dùng nền tím, không còn nền xanh sáng cũ.
- Giữ logic phiên, API, idempotency, giới hạn số lượng, thanh toán và lifecycle camera. Không thêm dependency hoặc đổi schema/backend.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run check:mobile` | Typecheck, lint thành công; 9/9 unit test |
| `npm run export --prefix mobile` | Web, Android và iOS bundle thành công, gồm Hermes bytecode |
| `npm run test:mobile-ui --prefix client` | 8/8 test thành công với API mock |
| `git diff --check` | Thành công |

UI tests kiểm tra discovery/filter và ảnh lỗi ở 360/390/430/768 px; giới hạn 10 vé; retry giữ nguyên idempotency key; chuyển từ đơn sang thanh toán demo và ví vé; khung QR trắng; guest chuyển sang đăng nhập; nhập mã check-in thành công/trùng; thông báo đã đọc và điều hướng staff.

Đã xem screenshot trong `.local/qa/stitch-mobile-*.png`. Ảnh sự kiện lỗi và QR trong test là fixture minh họa; QR fixture không phải mã vé thật và không chứng minh quét camera thành công. Bundle export không phải APK/IPA và không chứng minh app chạy thành công trên thiết bị native.

Chưa kiểm thử lại E2E với database thật, camera thật, thay đổi quyền camera trên hệ điều hành, chữ hệ thống lớn/VoiceOver/TalkBack, hoặc VNPay mở trình duyệt rồi quay lại app trên Android/iOS. Chưa tạo bản EAS cài đặt; bước này cần tài khoản/project/signing và thiết bị thử nghiệm. Native release phải cấu hình API HTTPS truy cập được.

## Chạy bản mới

Tại thư mục gốc project, nếu chưa có backend đang chạy:

```powershell
npm run dev:mobile
```

Lệnh trên khởi động API/worker và Expo. Không chạy thêm một bộ API khác trên cổng 8000. Nếu backend đã chạy và điện thoại truy cập được, chỉ khởi động Expo:

```powershell
npm start --prefix mobile
```

Kiểm tra `mobile/.env` với `EXPO_PUBLIC_API_URL` trỏ tới backend có thể truy cập từ điện thoại, ví dụ `http://<IP-LAN-máy-tính>:8000/api` trong môi trường phát triển. Điện thoại và máy tính cần cùng mạng khi dùng LAN. Không dùng `localhost` cho điện thoại thật. Docker hiện bind 8000 vào loopback nên không mặc định truy cập được qua LAN. Cấu hình native release yêu cầu HTTPS; không đưa URL HTTP phát triển vào bản phát hành.

Sau khi sửa `.env`, khởi động lại Expo. Quét mã kết nối Expo bằng môi trường tương thích SDK 57; nếu dùng development build thì chạy `npm run start:dev-client --prefix mobile`. Thay đổi cấu hình native có thể cần build lại binary.

## Chạy lại kiểm thử UI độc lập

```powershell
npm run export --prefix mobile
npm run test:mobile-ui --prefix client
```

Config `client/playwright.mobile-ui.config.ts` chỉ chọn các suite có mock. Nó tự mở server tĩnh 127.0.0.1:8083 qua `scripts/mobile-ui-server.cjs` và dừng sau test; server không kết nối database. Cần Chromium của Playwright đã được cài. Không thay thế bộ E2E thật trong `client/playwright.mobile.config.ts`.

Trong sandbox Windows của phiên này, Hermes bị từ chối ghi thư mục tạm mặc định; đã build thành công bằng thư mục tạm trong workspace:

```powershell
New-Item -ItemType Directory -Force .local/mobile-temp | Out-Null
$env:TEMP = (Resolve-Path .local/mobile-temp).Path
$env:TMP = $env:TEMP
npm run export --prefix mobile
```

Đây là biến môi trường của terminal hiện tại, không thay đổi cấu hình hệ thống. Playwright trong phiên này dùng browser cache `C:/Users/phamt/AppData/Local/ms-playwright` và chạy ngoài sandbox để truy cập localhost.

Các cổng: web Vite 5173, backend 8000, Expo 8081, mobile preview hiện hữu 8082, mock UI test server mới 8083. `npm run mobile:preview` hiện hữu chạy backend phục vụ bundle và cần cấu hình backend/database; không giống mock server 8083.

## Tài liệu API đã đối chiếu

- [Expo Font SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/font/)
- [Expo StatusBar SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/status-bar/)
- [Safe area SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/)
