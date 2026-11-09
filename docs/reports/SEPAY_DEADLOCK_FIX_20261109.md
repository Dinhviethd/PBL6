# Sửa deadlock SePay inbox / expiry — 09/11/2026

Branch `fix-security`, tiếp nối `d7d278b`. Người dùng mở rộng phạm vi để sửa F3 audit local. Không deploy, không thao tác ngân hàng hoặc dữ liệu live. Các ghi chú audit có sẵn trong Master Plan, file Word và báo cáo TXT có sẵn được giữ nguyên ngoài commit.

## Nguyên nhân và thay đổi

`sepay-webhook.ts` trước đây khóa payment rồi order/inventory; `booking.expire()` giữ order/inventory rồi cập nhật payment. Hai transaction có thể chờ khóa của nhau, PostgreSQL hủy một bên với `40P01`. Inbox bắt lỗi và hẹn retry nên giá trị trả về của processBatch không đủ chứng minh xử lý thành công.

Bản sửa đọc payment ban đầu không khóa để xác định order, sau đó khóa **order → inventory → payment**. Payment được đọc lại dưới khóa và kiểm tra provider/order trước khi dùng trạng thái, số tiền và deadline. Giữ nguyên kiểm tra transfer/account, thời hạn giữ chỗ, review, retry, transaction và API. Không tăng timeout, bỏ kiểm tra expiry hay sửa schema.

Phạm vi kết luận là chu kỳ khóa đã tái hiện giữa inbox và expiry; không khẳng định loại bỏ mọi deadlock có thể có trong toàn hệ thống.

## Regression PostgreSQL thật

`server/test/sepay-concurrency.test.cjs` tạo database ngẫu nhiên `eventhub_sepay_<12 hex>_test` trên loopback, áp migrations/fixture tổng hợp và xóa đúng database đã tạo khi kết thúc. Không migrate/truncate database được cung cấp làm kết nối quản trị. Quyền CREATEDB và quyền xóa database do test tạo là cần thiết.

Barrier tạm dừng ở ranh giới workflow sau khi đã giữ khóa thật. Test quan sát `pg_stat_activity`/`pg_blocking_pids` để xác nhận transaction thứ hai đang chờ khóa order, không chỉ dựa vào sleep. Các barrier có timeout và được giải phóng khi lỗi.

Bốn tình huống:

1. Expiry giữ order trước: inbox chờ mà không giữ payment; expiry hoàn tất, inbox REVIEW / RESERVATION_NOT_HELD; không vé, reservation RELEASED.
2. Inbox giữ order trước với reservation đã hết hạn: expiry chờ, rồi giải phóng đúng một lần; inbox REVIEW, không vé.
3. Hai inbox cùng payment còn hạn: chỉ một PROCESSED, bên sau đọc lại SUCCEEDED và REVIEW / PAYMENT_ALREADY_SETTLED; đúng một vé và một reservation CONSUMED.
4. Tiêm lỗi transaction 40001 sau bước tạo vé nhưng trước ghi kết quả payment: toàn transaction rollback, inbox ERROR có lịch retry; chưa đến lịch không claim. Sau expiry và cho lịch retry đến hạn, inbox REVIEW thay vì cấp vé; attempt_count=2. Đây là mô phỏng lỗi transient để kiểm rollback/retry, không phải tuyên bố PostgreSQL tự sinh 40001 trong lượt này.

Cuối suite xác minh inventory tổng: reserved_quantity=0, sold_quantity=1.

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| Build backend | PASS |
| Module boundaries | PASS |
| 8 file SePay, gồm regression mới | 61 pass, 0 fail, 0 skip |
| 2 file VNPay | 11 pass, 0 fail, 0 skip |
| Regression mới chạy riêng sau hoàn thiện cleanup | 5 pass, gồm test cha và 4 case; không cộng lặp vào 61 |
| Đối chứng code cũ `d7d278b` | Case expiry-first FAIL, ghi nhận inbox `40P01` |

Đối chứng nạp workflow cũ trong tiến trình riêng qua preload; không thay source/dist của bản sửa. Các case tiếp theo của lượt đối chứng cũng fail/timeout; bằng chứng xác nhận bug là case expiry-first có 40P01. Fixture lần chạy đầu dùng mã thanh toán quá dài (19 thay vì tối đa 13), đã sửa fixture; không thay contract sản phẩm.

Log local: `.local/audit-20261109/sepay*.test.cjs.log`, `vnpay*.test.cjs.log`; đối chứng `.local/security-fix/sepay-negative.log`. Không commit artifacts/credential. Harness audit tạo DB riêng từng file, chuẩn bị migrations cho hai suite SePay integration cũ. Test mới tự cấp DB nên không cần chuẩn bị trước.

## Chạy lại và CI

Sau `npm ci --prefix server` và build backend, đặt `SEPAY_CONCURRENCY_ADMIN_URL` từ môi trường kiểm thử của bạn, trỏ PostgreSQL loopback với quyền tạo DB. Không sử dụng URL production.

```powershell
npm run build --prefix server
npm run check:boundaries --prefix server
node --test server/test/sepay-concurrency.test.cjs
```

Test cũng nhận `TEST_DATABASE_URL` nếu không có biến riêng. Nếu cả hai biến đều thiếu, Node ghi SKIP: không được gọi lượt đó là PASS. Khi URL có mặt nhưng không phải loopback, test thất bại rõ ràng.

CI hiện chạy `npm test` với `TEST_DATABASE_URL` trên PostgreSQL service loopback và quyền postgres. Glob `test/*.test.cjs` tự bao gồm suite mới; test tự tạo DB trống riêng nên không phụ thuộc tên/schema của `eventhub_test`. Không sửa điều kiện skip của các suite cũ trong phạm vi này; CI remote chưa được chạy/xác minh.

## Triển khai và giới hạn

Rebuild backend và cập nhật đồng bộ **API lẫn worker** đang dùng workflow inbox; tránh để worker/image cũ tiếp tục giữ thứ tự khóa cũ. Không có migration. Sau rollout, theo dõi inbox ERROR/PROCESSING_ERROR, SQLSTATE 40P01, retry và REVIEW cho reservation hết hạn. Không tự chuyển các giao dịch REVIEW thành PAID hoặc bỏ điều kiện giữ vé. Inbox ERROR sẵn có tiếp tục theo lịch retry hiện tại; đây không phải thao tác sửa dữ liệu cũ.

Rollback backend/worker về code cũ sẽ khôi phục nguy cơ deadlock. Finding F3 đã sửa và xác minh local; live vẫn chờ rollout/nghiệm thu. Không kiểm tải production hoặc giao dịch ngân hàng thật. UI không đổi nên không chạy lại browser/UI suites trong phiên này. Các finding CI skip, dependency, Docker DB auth và baseline Stitch cũ vẫn ngoài phạm vi.
