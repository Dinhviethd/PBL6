# Báo cáo L2 — migration SePay và rehearsal PostgreSQL 17

**Phiên:** 30/10/2026 00:13–00:20 UTC+7. **Kết luận:** hoàn thành gói migration ứng viên, rehearsal local PostgreSQL 17 và runbook trong phạm vi L2. **10/10 nhóm kiểm tra PASS; 62/62 test hồi quy PASS, 0 skipped.** Chưa apply Supabase, chưa xác minh Data API hoặc tải/locks thực tế Supabase; các điều kiện đó giữ ở L4.

## 1. Phạm vi và thay đổi

- Dùng source workspace hiện tại, chưa commit theo chỉ đạo. Tham chiếu [Live Plan](../../MBBank_SePay_Live_Plan.md), [MBBank Payment](../../MBBank_Payment.md) và [báo cáo L1](20261030_000240_l1_runtime_live_config.md).
- Thêm migration `server/src/migrations/SepayLiveFoundation1793319300000.ts`, phát triển từ SQL draft review P7. Không sửa migration local cũ và không đăng ký migration mới vào runner chung. Không thay runtime thanh toán trong L2.
- Thêm `server/scripts/sepay-l2-rehearsal.cjs`: tạo PG17 riêng, baseline, grants giả lập, kiểm tra migration và chạy các suite API hiện có. Không load `.env`, không kết nối Supabase, không sao chép dữ liệu thật.
- Thêm [runbook review/apply/rollback](20261030_001340_l2_migration_runbook.md). Backup/PITR không được kiểm tra hoặc yêu cầu thêm; đúng phạm vi mới của người dùng. Không đổi ngrok/Dashboard, không dừng Test, không chuyển tiền.

## 2. Migration ứng viên

SHA-256 file TS: `AD0CC5DE900912E8B25C614BCDCF207864F647867011D04CBA9F44DAAFF486D9`.

Migration yêu cầu enclosing transaction, đúng bốn baseline trong history và role là owner hai bảng cha `payments/users`; API roles phải tồn tại. Thêm ba bảng, FK/index/check/unique theo cấu trúc SePay đã thử; bật RLS và REVOKE ALL khỏi PUBLIC/anon/authenticated/service_role cùng transaction. Không thay dữ liệu, ACL hoặc default privileges của bảng cũ. Lock timeout 2s, statement timeout 30s. Không dùng IF NOT EXISTS; `down()` từ chối xóa dữ liệu.

Runtime model được kiểm thử là **owner không superuser, không BYPASSRLS**, phù hợp phương án direct owner đã quan sát trong phiên L0 nhưng chưa phải chứng minh least privilege production. Owner truy cập được bảng RLS vì không FORCE RLS. Nếu đổi role runtime trong tương lai cần thiết kế grant/policy riêng, không tự mở quyền API để chữa lỗi.

## 3. Môi trường kiểm thử

Container cuối: `eventhub-sepay-l2-1dfe9317c1b1`, image `postgres:17-alpine`, server `17.11`, binding `127.0.0.1:55434`, label `eventhub.purpose=sepay-l2-synthetic`. Password tạo ngẫu nhiên, không in trong báo cáo. Không dùng container restore P7 đang có dữ liệu sao chép.

DB hồi quy cuối: `eventhub_sepay_e4603ba16330_test`. Bốn baseline thật từ source được chạy trước, role owner `l2_owner` NOSUPERUSER/NOBYPASSRLS. Các role mô phỏng `anon`, `authenticated`, `service_role`; `service_role` có BYPASSRLS để chứng minh ACL deny vẫn có hiệu lực. Default ACL grant ALL trên bảng mới cho ba API roles trước migration, bao gồm MAINTAIN PostgreSQL 17. Các database khác cùng container dành cho collision/lock/failure; tất cả dữ liệu synthetic.

Evidence local (Git ignored): `.local/sepay-l2/1dfe9317c1b1-result.json`, `.local/sepay-l2/1dfe9317c1b1-tests.log`. Container cuối giữ lại, chưa xóa dữ liệu. Các container thử trước đã được dừng, không xóa; không dừng container ứng dụng hay restore cũ.

## 4. Ma trận kiểm thử

| Nhóm | Expected / Actual | Kết quả |
|---|---|---|
| 1. Owner/default ACL | Owner không superuser/BYPASSRLS; probe bảng mới ban đầu cho service_role MAINTAIN=true. Quan sát đúng, probe rollback. | PASS |
| 2. Commit/preservation/history | Apply mới trả đúng tên migration; history 4→5, bốn dòng cũ nguyên vẹn. Fingerprint old-table rows, columns, constraints, indexes, ACL, RLS, owner và default ACL trước/sau giống nhau. | PASS |
| 3. RLS/ACL/runtime owner | Ba bảng RLS=true; 3 API roles × 3 bảng × 8 privileges đều false, gồm MAINTAIN. SELECT thật bằng SET ROLE của từng API role bị 42501. Owner insert inbox thành công. | PASS |
| 4. Chạy lại/history drift | TypeORM rerun không apply thêm, history giữ 5. Gọi `up()` trực tiếp khi history đã khác baseline bị từ chối. | PASS |
| 5. RLS độc lập ACL | Trong transaction test, tạm grant SELECT cho authenticated; bảng có dữ liệu owner nhưng role chỉ thấy 0 hàng do RLS default deny. Rollback grant sau kiểm tra. | PASS |
| 6. Index/transaction | Năm index tường minh tồn tại; gọi migration không có transaction bị từ chối trước DDL. | PASS |
| 7. Object collision | Precreate `sepay_transactions`; migration lỗi 42P07; `sepay_payment_details` tạo trước collision được rollback, history vẫn 4. | PASS |
| 8. Lock contention | Connection khác giữ ACCESS EXCLUSIVE trên payments; migration lỗi 55P03 theo lock timeout, hoàn tất dưới 10s; không để bảng SePay/history dở dang. | PASS |
| 9. Lỗi sau DDL | Sau chạy `up()` ném lỗi SQL 22012; rollback xóa mọi DDL chưa commit; history giữ 4; retry migration sạch thành công. | PASS |
| 10. API/runtime regression | Chạy suite trên schema đã harden với owner không superuser: 62 tests, 62 pass, 0 fail, 0 skipped. | PASS |

Fingerprint preservation cuối: `57acb925409c69686ad09d67acaad6fbcaa5aa426ba3b40f9ead330191bc9e1a`. Bao phủ baseline tables ngoài bảng migration và SePay; fixture sentinel trong roles, các bảng khác có thể rỗng ở thời điểm chụp. Đây là bằng chứng preservation trên baseline synthetic, **không phải chứng minh dữ liệu Supabase thật không bị ảnh hưởng**. Suite nghiệp vụ tạo dữ liệu đầy đủ sau migration để kiểm tra khả năng vận hành.

62 test gồm demo flow, auth/order/inventory/notification, SePay buyer/auth/HMAC/worker/REVIEW/duplicate/lease/API v2, synthetic Live phát đúng một vé, config Live/mock v2, VNPAY IPN/reconcile/race/late payment. Không chạy lại cross-process L1 suite trên port 55434 vì suite đó có guard riêng port 55432; kết quả L1 69/69 được giữ nguyên theo báo cáo trước, không cộng dồn vào 62.

## 5. Lệnh, sự cố và kiểm tra chất lượng

| Lệnh (trong server trừ khi ghi khác) | Kết quả cuối |
|---|---|
| `npm.cmd run build` | exit 0 |
| `node scripts/sepay-l2-rehearsal.cjs` | exit 0; 10 nhóm PASS + 62/62 suite |
| `npm.cmd run check:boundaries` | exit 0 |
| `node --check server/scripts/sepay-l2-rehearsal.cjs` (repo root) | exit 0 |
| `git diff --check` (repo root) | exit 0; cảnh báo LF/CRLF đã biết |

Hai lượt đầu bị lỗi 23502 do fixture insert thiếu `transaction_at`, sau đó thiếu `content`; migration đã ràng buộc NOT NULL đúng. Đã sửa fixture, dừng riêng các container lượt thử và chạy lại trên container mới. Lượt kế tiếp đạt 8 nhóm + 62 test; sau bổ sung history preflight, kiểm tra RLS độc lập và transaction guard, lượt cuối đạt 10 nhóm + 62 test. Các lỗi 42P07/55P03 hiển thị ở lượt cuối là fault injection có chủ đích, không phải lỗi nghiệm thu.

## 6. Runbook đã review và giới hạn

Runbook kiểm tra đích/history/roles/grants trước apply; dùng migration opt-in và transaction, kiểm tra schema/data/ACL sau apply. Trước commit lỗi thì rollback; sau commit lỗi ứng dụng thì giữ bảng/inbox, dừng tạo SePay mới và rollback code/config tương thích; không tự DROP hoặc restore. Runbook được rà soát trong phiên và đối chiếu với rehearsal; **chưa có review độc lập hoặc chấp thuận apply từ người dùng**.

- Chưa chạy Data API/PostgREST của Supabase; kiểm tra SQL role local không thay thế kiểm tra exposed schema và inherited grants thực tế.
- Chưa đo lock/traffic/timeout thật trên Supabase; fingerprint không bao phủ Auth/Storage/extensions hay toàn bộ topology Supabase.
- Migration yêu cầu owner của hai bảng cha và history đúng baseline; drift trên target sẽ dừng, không tự sửa baseline/ACL cũ.
- L2 hoàn thành gói chuẩn bị local theo phạm vi; trước L4 vẫn cần inventory mới, kiểm tra target và phạm vi apply cụ thể. L3 tiếp tục hoàn thiện/kiểm tra backend API theo plan. Không cần quay lại hỏi backup/PITR.

Nguồn kiểm chứng: [PostgreSQL 17 RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [PostgreSQL 17 REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html). Tham chiếu chúng để kiểm tra owner bypass, quyền thừa kế và MAINTAIN; không dùng kết quả tài liệu thay thế kết quả thực thi ở trên.
