# EventHub — MVP backend & web

Express 5 + TypeORM + PostgreSQL 17, React + Vite. Một database, một backend với Auth/Event/Order/Payment/Audit tách ownership. Web có khu vực khách hàng, Organizer và Admin. Thanh toán hiện là **demo local, không thu tiền thật**.

## Chạy local

Yêu cầu Node.js 22.18+, npm và PostgreSQL 17 (hoặc Docker Desktop).

```powershell
npm ci --prefix server
npm ci --prefix client
docker compose up -d db
Copy-Item server/.env.example server/.env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Không ghi đè `.env` nếu đã có. Tạo hai secret riêng cho `JWT_ACCESS_SECRET` và `QR_SECRET`. Trong `server/.env`, đặt `PAYMENT_MODE=demo`, thêm `DEMO_PASSWORD` dài ít nhất 12 ký tự. DATABASE_URL mặc định trong ví dụ trỏ tới database `eventhub` của Compose. Không chạy Compose cùng container khác đang dùng port 55436.

```powershell
npm run db:migrate --prefix server
npm run db:seed --prefix server
npm run dev
```

Mở http://localhost:5173. API: http://127.0.0.1:8000/api/health. Lệnh dev chạy API, Vite và worker nhả giữ chỗ mỗi 30 giây. Sau khi sửa backend, build lại `npm run build --prefix server` rồi khởi động lại dev; Vite tự cập nhật frontend.

Tài khoản seed: `customer@example.test`, `organizer@example.test`, `organizer2@example.test`, `admin@example.test`; mật khẩu là `DEMO_PASSWORD`. Seed chạy lại không thay mật khẩu tài khoản đã tồn tại. Chỉ seed dữ liệu demo ở development.

Migration đầu tiên chỉ nhận **database trống**, không tự chuyển đổi các bảng Express/TypeORM cũ. Database đã chạy baseline MVP được nâng cấp bằng các migration tiếp theo qua cùng lệnh `db:migrate`; migration nhân viên check-in chỉ thêm bảng và index. Không bật synchronize. Database cũ chưa có baseline cần kế hoạch mapping và backup riêng. Migration không hỗ trợ down xóa dữ liệu.

## Luồng demo

1. Khách đăng ký/đăng nhập → tìm sự kiện → chọn loại vé → đặt đơn → mô phỏng thanh toán → nhận vé QR.
2. Organizer tạo sự kiện/loại vé → gửi duyệt; Admin phê duyệt → sự kiện xuất hiện công khai.
3. Organizer mở quản lý sự kiện → check-in bằng camera hoặc nhập mã vé → xem đơn, người tham dự, doanh thu.
4. Khách có thể gửi hồ sơ Organizer; Admin xét duyệt, quản lý tài khoản, danh mục và tra cứu giao dịch.
5. Organizer mở tab **Nhân viên** trong khu vận hành sự kiện để mời bằng email tài khoản đã đăng ký. Người nhận vào **Nhân viên check-in**, chấp nhận rồi quét vé. Organizer xem **Nhật ký check-in** và có thể thu hồi quyền. Lời mời trong ứng dụng có hạn 7 ngày, chưa gửi email. Xem [hướng dẫn nhân viên check-in](docs/CHECKIN-STAFF.md).

Demo có kết quả thành công/thất bại và idempotency. Trường hợp thanh toán tới sau khi nhả kho được đánh dấu cần đối soát, không cấp vé vượt tồn kho. Không có hoàn tiền tự động.

Ảnh local lưu ở `server/.local/uploads` và được chuyển sang WebP; cấu hình Cloudinary để lưu ngoài máy. Quên mật khẩu cần SMTP, không xuất OTP ra log/chat; cấu hình `SMTP_*` trong `.env`.

## Kiểm tra

```powershell
npm run build
npm run check
$env:TEST_DATABASE_URL='postgresql://postgres:localdev@127.0.0.1:55436/eventhub_test'
npm test
# Database test phải được tạo trước và có tên kết thúc bằng _test.
# Nếu không đặt TEST_DATABASE_URL, integration suite bị skip.
cd client
npx playwright install chromium
npx playwright test
```

E2E cần dev server đang chạy và seed demo; dùng `DEMO_PASSWORD` của seed (mặc định test là `LocalDemo2026!`). Test tạo tài khoản/đơn/sự kiện thử nghiệm; dùng database riêng khi cần dữ liệu demo sạch. CI chạy build, lint, kiểm tra ownership và integration PostgreSQL. Browser E2E chạy local riêng.

## Ownership và transaction

- Mỗi module chỉ gọi persistence adapter của mình; giao tiếp chéo qua `public.ts` và workflow.
- CI kiểm tra import/re-export/raw query. Runtime parse SQL AST và kiểm tra allowlist bảng, hàm cho từng owner.
- Platform giữ TypeORM EntityManager trong AsyncLocalStorage; workflow mở một UnitOfWork, mọi owner adapter tham gia cùng transaction. Không lộ EntityManager ra public port.
- Payment không truy vấn bảng Order. Workflow chuyển kết quả Payment sang Order để đổi trạng thái, cập nhật tồn và phát hành vé atomically.

Enforcement ở code phục vụ modular monolith; các module vẫn dùng chung credential PostgreSQL, không phải hàng rào quyền DB chống code độc hại. Khi tách process cần API, outbox/inbox/saga và cơ chế đối soát; không thể mang nguyên shared transaction qua mạng.

## Container và phần còn lại

`docker build -t eventhub-mvp .` đóng gói API và web cùng origin. Image mặc định production, chặn payment demo. Cấp DATABASE_URL/secrets/CLIENT_URL bằng môi trường; chạy `node scripts/migrate.cjs` một lần ở bước release. Worker dùng cùng image và cấu hình, command `node scripts/worker.cjs`, phải được giám sát riêng. Không có migration tự động khi app start. Cloud Build hiện chỉ build image cho project đang chạy, không deploy vào project cũ.

Dockerfile/Compose/CI đã được bổ sung nhưng chưa nghiệm thu cloud deployment. Trước staging cần provider sandbox thật, xác thực callback/đối soát nhà cung cấp, SMTP/Cloudinary, HTTPS, secret management và kiểm thử camera thiết bị thật. Rate limit hiện trong memory, phù hợp một API instance; cần storage chung khi scale.

Xem [trạng thái triển khai](docs/IMPLEMENTATION-STATUS.md), [kế hoạch](docs/MVP-BACKEND-WEB-PLAN.md), [thiết kế DB](docs/database/MVP-DATABASE-DESIGN.md), [ownership](docs/SERVICE-OWNERSHIP.md).
