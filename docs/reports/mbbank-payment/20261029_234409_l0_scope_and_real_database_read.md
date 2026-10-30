# L0: chốt phạm vi hiện tại và đọc dữ liệu Supabase thực tế

**Ngày:** 29/10/2026, 23:44 UTC+7. **Kết luận:** đã truy vấn được dữ liệu bảng nghiệp vụ Supabase thực tế bằng kết nối PostgreSQL xác thực TLS, trong transaction chỉ đọc. Các quyết định của người dùng dưới đây thay thế yêu cầu kế hoạch cũ tương ứng; đủ để chuyển sang triển khai L1 local theo phạm vi đã chọn, không phải nghiệm thu Live.

## 1. Quyết định có hiệu lực

| Nội dung | Quyết định đã ghi nhận |
|---|---|
| Source | Dùng source workspace hiện tại, không cần làm việc với branch khác. Chưa commit; sẽ commit sau khi tích hợp thanh toán tự động thành công theo chỉ đạo trước. |
| Phạm vi | Chỉ backend/API, database, worker và kiểm thử; không làm UI. |
| SePay Test | Người dùng xác nhận đã mô phỏng toàn bộ thành công. Các report P4/P5 là bằng chứng lịch sử trong phạm vi từng report; không chạy lại Dashboard Test hoặc đòi Test/Live hoạt động cùng lúc để mở L1. |
| SePay Live | Ưu tiên tích hợp Live. Nếu không hỗ trợ chạy Test và Live cùng lúc thì ngắt sử dụng runtime Test khi chuyển sang Live. Không cần xóa source/test suite hay dữ liệu lịch sử để ngừng sử dụng Test. |
| Ngrok/deployment | API/worker trên máy hiện tại, ngrok là phương án phục vụ Live ở giai đoạn này. Không yêu cầu domain production hoặc nền tảng triển khai lâu dài; người dùng sẽ cung cấp yêu cầu phát triển sau. TLS/HMAC/delivery qua tunnel vẫn phải được kiểm thử khi runtime Live sẵn sàng. |
| Database | Người dùng xác nhận `pbl6-eventhub` trên Supabase Free, chứa dữ liệu thật, sử dụng kết nối hiện có. Được kiểm tra đọc dữ liệu; phiên này chỉ xuất số lượng tổng hợp. |
| Backup/PITR | Người dùng đã lưu backup và yêu cầu không tiếp tục quan tâm vấn đề này. **Loại yêu cầu xác minh backup/PITR/retention/RPO/RTO khỏi phạm vi hiện tại**, không tiếp tục dùng chúng làm điều kiện chặn L0/L1. Đây là thay đổi phạm vi theo người dùng, không phải PASS kỹ thuật về phục hồi. Không tự restore hoặc tạo backup mới. |
| Quyền và secrets | Người dùng quản lý SePay Live/MBBank, webhook và API v2 read-only, chịu trách nhiệm vận hành. Cloudinary đã xoay vòng/cập nhật theo xác nhận trước; DEMO_PASSWORD chỉ dùng demo/test. Không yêu cầu giá trị secret trong chat/report. |
| Kiểm thử | Đã cho phép PostgreSQL local cô lập và dữ liệu giả. Không bắt buộc có staging để bắt đầu L1. Kiểm thử trên local không đại diện kết quả Live. |
| Demo/VNPAY | Giữ source/API/lịch sử theo quyết định trước; không cần chạy cùng runtime SePay Live. Guard production chặn provider thử vẫn giữ. |

## 2. Kiểm tra dữ liệu Supabase

Script: `server/scripts/sepay-supabase-readonly-check.cjs`. Đọc cấu hình từ `server/.env`, CA từ `server/.local/certs/supabase-ca.crt`; không in URL hoặc credential. Allowlist hostname Supabase, TLS `rejectUnauthorized=true`, connect timeout 10 giây, statement timeout 10 giây và lock timeout 2 giây.

Lệnh: `node scripts/sepay-supabase-readonly-check.cjs` trong thư mục `server`; **exit 0**.

Truy vấn nghiệp vụ trong `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`:

```sql
SELECT
  (SELECT count(*)::text FROM public.users) AS users,
  (SELECT count(*)::text FROM public.orders) AS orders,
  (SELECT count(*)::text FROM public.payments) AS payments,
  (SELECT count(*)::text FROM public.tickets) AS tickets;
```

| Tiêu chí | Expected | Actual | Trạng thái |
|---|---|---|---|
| TLS | Xác thực CA/hostname | Kết nối thành công với verify bật | PASS |
| Database/version | Kết nối Supabase từ cấu hình ứng dụng | `postgres`, PostgreSQL `17.11` | PASS |
| Chỉ đọc | `transaction_read_only=on` | `on` | PASS |
| Quyền đọc bảng nghiệp vụ | SELECT thực thi được | 4 subquery thành công | PASS |
| Dữ liệu users | Đọc số lượng hàng | 12 | PASS |
| Dữ liệu orders | Đọc số lượng hàng | 24 | PASS |
| Dữ liệu payments | Đọc số lượng hàng | 14 | PASS |
| Dữ liệu tickets | Đọc số lượng hàng | 4 | PASS |
| Kết thúc transaction | ROLLBACK | Hoàn thành | PASS |
| Role kết nối | Nhận diện role URL | `postgres` | PASS nhận diện; không chứng minh least privilege |
| Project name Dashboard | Không tự suy ra từ PostgreSQL | Tên `pbl6-eventhub` dựa trên xác nhận người dùng; chưa có đối chiếu Management API độc lập | Chưa kiểm chứng độc lập |

Các số đếm là snapshot tại lần chạy, không phải dữ liệu cố định. Không chọn tên/email, số tài khoản, token, payload, ID khách hàng hoặc chi tiết thanh toán. Đây là truy vấn từ bảng nghiệp vụ thật, vượt phạm vi metadata của lần kiểm tra trước; không kiểm tra quyền ghi hoặc hành vi của API/worker đang chạy.

## 3. Test → Live và điều kiện triển khai L1

Source hiện chỉ hỗ trợ `environment: test`; chưa thể chuyển runtime thành Live bằng thay secret. `SEPAY_LEGACY_MODE` hiện kiểm soát việc dùng SePay cùng provider demo/VNPAY, không phải bằng chứng SePay Test và Live đã có cấu hình song song. L1 sẽ bổ sung loader Live, endpoint v2 theo môi trường, worker và kiểm tra cấu hình an toàn.

Đã ghi nhận yêu cầu ngắt sử dụng Test khi chuyển Live. **Phiên này chưa dừng process Test, chưa đổi webhook Dashboard và chưa khởi động Live**, vì runtime Live chưa được triển khai; không tuyên bố cutover đã xảy ra. Trước chuyển: định danh đúng process/port Test, hoàn tất fixture đang chờ nếu có, dừng đúng API/worker Test hoặc chuyển tunnel sang listener Live đã kiểm tra; không dừng nhầm API/worker khác. Không cần bật hai môi trường thanh toán cùng lúc.

L0 đóng phần quyết định phạm vi theo các ngoại lệ đã được người dùng chỉ đạo: hoãn commit, dùng ngrok hiện tại, không yêu cầu coexistence Test/Live hoặc tiếp tục backup/PITR. Các kiểm thử loader, regression, isolation, webhook, worker và migration thuộc L1–L5 vẫn cần thực hiện; không được ghi PASS chỉ dựa trên quyết định này.

## 4. Thay đổi, ảnh hưởng và công việc tiếp theo

- Thêm script kiểm tra chỉ đọc có thể chạy lại; cập nhật hai plan và báo cáo này. Không thay đổi code thanh toán hay dữ liệu/schema Supabase.
- Không cấu hình Dashboard, đổi secret, dừng process, chạy migration/seed hoặc chuyển tiền. Script không gọi startup ứng dụng nên không kích hoạt worker/migration ngầm.
- L1 tiếp theo: config loader opt-in Test/Live, URL v2 allowlist, startup API/worker, khóa đối soát nhiều process và test local; giữ endpoint cũ. Backup/PITR, domain dài hạn và yêu cầu chạy Test/Live cùng lúc không còn là chặn phạm vi này.
