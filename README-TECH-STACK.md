# PBL6 — Tech stack cho project quản lý sự kiện và bán vé

> Tài liệu tham khảo lịch sử, ghi nhận stack của dự án nguồn ngày 01/10/2026. Các mô tả “hiện tại” bên dưới thuộc bối cảnh bàn giao lúc đó, không mô tả mã nguồn PBL6 hiện nay. Xem `README.md` và các manifest `client/package.json`, `server/package.json`, `mobile/package.json` để biết stack và cách vận hành dự án hiện tại.

Tài liệu bàn giao để khởi tạo **project mới ở thư mục riêng**, chuyển từ dự án học tiếng Anh sang đề tài **“Xây dựng hệ thống quản lý sự kiện, bán vé online và check-in QR Code”** trong file `PBL 6_ Dự án CN Công nghệ phần mềm (1).docx`.

Giữ nền tảng công nghệ của dự án hiện tại. Thiết kế lại nghiệp vụ, database, API và giao diện theo đề tài mới. Thư mục PBL6 hiện tại chỉ dùng làm nguồn tham khảo; không tiếp tục triển khai đề tài mới tại đây.

## 1. Phạm vi đề tài mới

| Vai trò | Nghiệp vụ chính |
| --- | --- |
| Customer | Đăng ký/đăng nhập, tìm và lọc sự kiện, đặt vé, thanh toán, xem vé QR và lịch sử mua vé, quản lý hồ sơ, gửi yêu cầu làm Organizer |
| Organizer | Quản lý sự kiện và loại vé, gửi duyệt sự kiện, xem đơn hàng/người tham dự, quét QR bằng camera trên web, check-in và xem thống kê |
| Administrator | Quản lý tài khoản, duyệt Organizer và sự kiện, quản lý danh mục, giao dịch và thống kê hệ thống |

Đề tài yêu cầu quét QR trên trình duyệt web. Stack mobile được ghi lại để giữ khả năng mở rộng; ứng dụng mobile không phải yêu cầu bắt buộc thể hiện trong tài liệu đề tài.

## 2. Stack hiện tại cần giữ

Các phiên bản dưới đây lấy từ manifest và cấu hình trong repository ngày 01/10/2026, không phải danh sách phiên bản mới nhất. Khi dựng project mới, dùng chúng làm mốc và kiểm tra lại tính tương thích trước khi cài đặt; không tự nâng đồng loạt lên `latest`.

### Nền tảng và frontend web

| Thành phần | Công nghệ / phiên bản khai báo | Vai trò |
| --- | --- | --- |
| Runtime | Node.js; root yêu cầu >=22, mobile >=22.13.0 | Chọn một bản Node đáp ứng toàn bộ dependency; tài liệu hiện tại ghi nhận Node 22.18 |
| Package manager | npm + npm workspaces + package-lock.json | Quản lý monorepo và khóa dependency; repository không ghim phiên bản npm |
| Ngôn ngữ | TypeScript 7.0.2 ở root | Web, backend và package dùng chung |
| Web UI | React 19.2.3 + React DOM 19.2.3 | Giao diện Customer, Organizer, Administrator |
| Build/dev server | Vite 8.3.0 + @vitejs/plugin-react 6.1.1 | Chạy web và build static assets |
| Giao diện | CSS thuần, responsive | Giữ cách xây dựng UI hiện tại; chưa dùng Tailwind hay thư viện UI tổng hợp |
| Icon | lucide-react 1.47.0 | Icon giao diện |
| Routing hiện tại | Hash routing tự triển khai | Không có dependency React Router trong manifest hiện tại |
| HTTP client | Fetch API + package TypeScript dùng chung | Web/mobile gọi backend |

### Backend, database và xác thực

| Thành phần | Công nghệ / phiên bản khai báo | Vai trò |
| --- | --- | --- |
| HTTP framework | Hono 4.13.8 | REST API TypeScript |
| Node adapter | @hono/node-server 2.1.1 | Chạy Hono trên Node.js |
| Validation | Zod 4.6.5 | Kiểm tra dữ liệu đầu vào |
| Database | PostgreSQL 17 | Lưu dữ liệu nghiệp vụ, transaction, ràng buộc và phân quyền |
| SQL client | postgres 3.4.9 (postgres.js) | Truy vấn SQL trực tiếp; stack hiện tại không dùng Prisma/TypeORM |
| Backend platform | Supabase | PostgreSQL, Auth, Storage và Studio |
| SDK | @supabase/supabase-js 2.116.0 | Kết nối Auth/Storage và các API Supabase |
| CLI | supabase 2.117.0 | Quản lý môi trường local và SQL migrations |
| Authentication | Supabase Auth | Email/password, xác minh email, khôi phục mật khẩu và session |
| OAuth | Google qua Supabase Auth | Có cấu hình mẫu ở dự án cũ nhưng chưa bật; cần credential riêng |
| File storage | Supabase Storage | Ảnh sự kiện, avatar và tài nguyên phù hợp |
| Local infrastructure | Docker Desktop, Linux containers | Supabase CLI quản lý container local |

Supabase Realtime, Edge Runtime và Analytics đang tắt trong cấu hình local hiện tại. Không coi chúng là thành phần đã triển khai. Supabase Cloud là hướng triển khai được tài liệu cũ đề cập; chưa có nền tảng hosting web/backend được chốt cho project mới.

### Mobile được giữ để tham khảo và mở rộng

| Thành phần | Phiên bản khai báo |
| --- | --- |
| Expo | ~57.0.24 |
| React Native | 0.86.3 |
| React | 19.2.3 |
| Expo Router | ~57.0.22 |
| Expo Secure Store | ~57.0.4 |
| Expo Auth Session / Web Browser / Linking | ~57.0.12 / ~57.0.3 / ~57.0.10 |
| Expo Dev Client | ~57.0.19 |
| React Native Reanimated / Worklets | 4.5.1 / 0.10.1 |
| TypeScript trong workspace mobile | ~6.0.3 |

Các module Expo bổ trợ khác nằm trong `apps/mobile/package.json`, gồm constants, crypto, build-properties, status-bar, system-ui và audio. Audio phục vụ nghiệp vụ học tiếng Anh cũ; chỉ đưa sang nếu đề tài mới cần. Mobile dùng chung backend và Supabase Auth với web. Bản mobile cũ chưa được nghiệm thu APK/thiết bị thật theo tài liệu repository.

### Kiểm thử và công cụ phát triển

| Thành phần | Công nghệ / phiên bản khai báo |
| --- | --- |
| Web E2E | @playwright/test 1.63.0 |
| Backend/database/integration | Node.js built-in test runner (`node --test`) |
| Chạy kiểm thử TypeScript | tsx 4.23.13 |
| Mobile unit/UI | Jest ~29.7.0, jest-expo ~57.0.5, @testing-library/react-native ^13.3.3, react-test-renderer 19.2.3 |
| Format | Prettier 3.9.8 |
| Type checking | TypeScript (`tsc --noEmit`) |
| Database versioning | SQL migrations qua Supabase CLI |

## 3. Áp dụng stack vào project mới

Đề xuất tổ chức monorepo dưới đây giữ cách chia lớp hiện tại. Đây là thiết kế khởi đầu, chưa phải cấu trúc đã tạo hoặc chức năng đã triển khai.

```text
event-ticketing/
  apps/
    web/                  # React + Vite; Customer / Organizer / Administrator
    mobile/               # Expo, nếu triển khai mobile
  services/
    identity/             # Hồ sơ, vai trò, duyệt Organizer, trạng thái tài khoản
    events/               # Danh mục, sự kiện, phê duyệt, loại vé
    ticketing/            # Đơn hàng, thanh toán, vé QR, check-in, thống kê
  packages/
    api-client/           # HTTP client và kiểu dữ liệu dùng chung
  supabase/
    migrations/           # Database mới theo nghiệp vụ sự kiện
    seed.sql              # Dữ liệu demo mới
  scripts/                # Chạy local, build, provision và seed
  tests/                  # Unit, integration và E2E
  docs/                   # SRS, ERD, API và hướng dẫn vận hành
  package.json
  package-lock.json
  README.md
```

Dự án cũ có ba backend Identity/Content/Learning. Project mới có thể giữ mô hình ba service Hono, thay Content/Learning bằng Events/Ticketing. Web và mobile dùng chung API; backend kiểm tra quyền và quyền sở hữu tài nguyên. Supabase Auth quản lý đăng nhập, PostgreSQL lưu nghiệp vụ, Storage lưu ảnh.

## 4. Các phần cần bổ sung cho đề tài mới

Các mục này chưa có trong stack nghiệp vụ của dự án cũ; cần chọn giải pháp và triển khai tại project mới.

| Hạng mục | Yêu cầu triển khai |
| --- | --- |
| Thanh toán online | Chọn nhà cung cấp và môi trường sandbox; backend tạo giao dịch, xác minh callback/webhook và xử lý thông báo lặp an toàn |
| Phát hành vé QR | Chọn thư viện tạo QR tương thích TypeScript; chỉ phát hành vé sau khi backend xác nhận thanh toán thành công |
| Quét QR trên web | Chọn thư viện quét camera; kiểm thử quyền camera và trình duyệt mục tiêu; chuẩn bị HTTPS khi triển khai |
| Check-in | Backend xác minh vé, sự kiện, quyền Organizer và trạng thái; cập nhật nguyên tử để hai lần quét đồng thời không cùng thành công |
| Tồn kho vé | Transaction và cơ chế giữ/nhả vé có hạn để tránh bán vượt số lượng khi nhiều khách đặt cùng lúc |
| Thống kê | Truy vấn PostgreSQL cho số vé, doanh thu, người tham dự; chọn thư viện biểu đồ nếu giao diện cần |

Cần chốt quy tắc hủy sự kiện, hủy đơn, hết hạn giữ vé và hoàn tiền trước khi thiết kế trạng thái dữ liệu. Tài liệu đề tài chưa xác định nhà cung cấp thanh toán hoặc thư viện QR.

## 5. Hướng dẫn chuyển sang thư mục mới

1. Tạo thư mục/repository riêng, ví dụ `event-ticketing`, và dùng tài liệu này làm README khởi đầu.
2. Đưa tài liệu đề tài vào project mới; viết SRS, phân quyền và ERD cho ba actor mới.
3. Tạo manifest mới theo các phiên bản tham chiếu bên trên; đổi tên package và workspace theo project mới. Cấu trúc cũ quản lý dependency web ở root, không có `apps/web/package.json` riêng.
4. Tạo lockfile mới đồng bộ với manifest đã chọn. Sau khi có lockfile hợp lệ, dùng `npm ci` để cài lại nhất quán.
5. Khởi tạo Supabase cho project mới, đặt `project_id` riêng và chọn bộ cổng khác nếu chạy đồng thời dự án cũ. Tạo migration và seed riêng cho hệ thống sự kiện.
6. Tạo `.env.example` bằng các giá trị mẫu; cấu hình URL public, API, callback Auth và credential riêng. Chỉ URL/key public được đưa vào frontend; credential đặc quyền nằm ở backend.
7. Tạo script chạy local/build/test tương ứng với cấu trúc mới. Các lệnh `db:*`, `backend:start`, `web:dev`, `mobile:*` trong dự án cũ phụ thuộc script riêng, không tự tồn tại khi chỉ cài dependency.
8. Triển khai và kiểm thử lần lượt: Auth/phân quyền → sự kiện/duyệt → loại vé/đặt vé → thanh toán/phát hành vé → QR/check-in → thống kê.

Không sao chép `.env`, `.local`, tài khoản thử, credential, `node_modules`, output build hoặc volume database sang project mới. Migration, seed, nội dung học tiếng Anh, quiz, dictation và `typing-core` thuộc nghiệp vụ cũ; chỉ tham khảo cách tổ chức, không áp dụng nguyên trạng cho hệ thống sự kiện.

## 6. Tiêu chí kiểm thử ưu tiên

- Customer không truy cập được API quản trị; Organizer chỉ quản lý sự kiện và đơn hàng thuộc phạm vi của mình.
- Đặt vé đồng thời không làm số lượng vé khả dụng âm.
- Callback thanh toán bị gửi lặp không tạo thêm vé hoặc ghi nhận doanh thu hai lần.
- Thanh toán thất bại/chưa xác minh không phát hành vé hợp lệ.
- QR sai, sai sự kiện, vé bị hủy hoặc đã check-in đều bị từ chối.
- Hai yêu cầu check-in đồng thời cho một vé chỉ có một yêu cầu thành công.
- Luồng E2E: duyệt Organizer → tạo và duyệt sự kiện → mua vé → thanh toán sandbox → nhận QR → check-in → cập nhật thống kê.

## 7. Nguồn đối chiếu trong dự án cũ

- `package.json`, `package-lock.json`: dependency gốc và phiên bản khóa.
- `apps/mobile/package.json`: stack và dependency mobile.
- `packages/api-client/package.json`, `packages/typing-core/package.json`: cách tổ chức package dùng chung.
- `supabase/config.toml`: PostgreSQL 17 và cấu hình dịch vụ local.
- `README.md`, `docs/frontend.md`, `docs/mobile-development.md`: cách vận hành và giới hạn hiện tại. Khi tài liệu cũ khác manifest về phiên bản, bảng trên ưu tiên manifest.
- `PBL 6_ Dự án CN Công nghệ phần mềm (1).docx`: phạm vi nghiệp vụ mới.

Tài liệu này chỉ ghi nhận và bàn giao stack. Chưa tạo project mới, cài dependency, chuyển database hay triển khai chức năng mới trong thư mục hiện tại.
