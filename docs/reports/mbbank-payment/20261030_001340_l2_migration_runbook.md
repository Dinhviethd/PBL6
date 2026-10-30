# L2 — runbook migration SePay để review

**Ngày:** 30/10/2026 UTC+7. Migration ứng viên: `server/src/migrations/SepayLiveFoundation1793319300000.ts`. Phạm vi hiện tại là rehearsal local; tài liệu này không phải xác nhận apply Supabase.

## Contract migration

- Không đăng ký vào `server/scripts/migrate.cjs` hay runner chung. Không sửa `SepayLocalFoundation1793289600000` đã chạy trước đó. Không gọi `npm run db:migrate` với kỳ vọng nó sẽ apply SePay mới.
- Migration phải chạy qua TypeORM trong transaction (`runMigrations({transaction:'all'})`), dưới role được review là owner của `public.payments` và `public.users`. Từ chối nếu không có transaction hoặc migration history không đúng bốn baseline. Role `anon`, `authenticated`, `service_role` phải tồn tại.
- Chỉ thêm `sepay_payment_details`, `sepay_transactions`, `sepay_transaction_reviews` và các indexes/constraints. Không dùng `IF NOT EXISTS`; collision phải fail, không che schema drift.
- RLS enabled và REVOKE ALL của `PUBLIC`, `anon`, `authenticated`, `service_role` thực hiện trong cùng transaction. Không đổi ACL/default privileges trên bảng cũ. Không tạo RLS policy cho API roles. Owner có quyền thao tác vì không FORCE RLS; mô hình này giả định backend dùng role owner đã được review, không tuyên bố least privilege.
- `lock_timeout=2s`, `statement_timeout=30s` theo transaction. Thời gian thực tế Supabase chưa được đo. TypeORM ghi history cùng transaction; runner gọi lại bỏ qua migration đã được ghi nhận. Gọi trực tiếp `up()` trên DB đã có history mới bị từ chối.

## Preflight trước L4

1. Ghi nhận hash của file migration và snapshot source được review; không tự commit theo yêu cầu người dùng.
2. Đối chiếu project ref/endpoint của database người dùng chỉ định, TLS/CA và role session. Không đưa connection string vào báo cáo. Cổng apply riêng vẫn áp dụng; quyền kiểm tra read-only trước đây không phải apply.
3. Inventory mới: bốn baseline migration đúng thứ tự, không có bảng/index SePay, khóa cha UUID, role migrations/runtime, inherited grants, default privileges, schema exposure. History/object đã có hoặc khác dự kiến phải dừng để review; không đánh dấu migration đã chạy bằng tay để vượt guard.
4. Ngừng tạo payment mới nếu cần khi thực hiện window đã thống nhất; kiểm tra worker/traffic hiện tại, lock budget và điểm dừng. Không dừng process Test/legacy khác theo tên đoán.
5. Chuẩn bị runner opt-in **chỉ** chứa baseline đã ghi history và migration SePay mới; không include migration SePay local. Runner live chưa được tạo hoặc chạy ở L2. Sau khi được cho phép apply, dùng đúng target và `transaction:'all'`, `synchronize:false`.

Backup/PITR không được kiểm tra hoặc yêu cầu thêm trong runbook này theo quyết định của người dùng.

## Kiểm tra sau apply

- History có đúng thêm migration mới; ba bảng, năm index tường minh và constraints đúng DDL; RLS enabled.
- API roles không có SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN trực tiếp hoặc gián tiếp trên bảng mới. Kiểm tra inherited role grants vì REVOKE trực tiếp không loại mọi quyền thừa kế.
- Schema, ACL, dữ liệu bảng cũ giữ nguyên, ngoại trừ lịch sử migration tăng đúng một dòng. Chụp số liệu tổng hợp hoặc fingerprint an toàn; không xuất hàng nghiệp vụ vào log.
- Kiểm thử API/worker bằng đúng môi trường được cho phép ở L3/L4, không seed fixture hay gửi webhook Test vào DB có dữ liệu thật. Kiểm tra Data API thực tế ở Supabase trước khi nghiệm thu quyền bên ngoài; local SQL role tests không thay thế PostgREST/Data API.

## Xử lý lỗi

- Trước commit: transaction rollback; xác minh không còn object/history dở dang. Chỉ retry sau khi giải quyết lock/collision và inventory lại. Lỗi collision và lock timeout đã được thử trên local.
- Sau commit: ngừng tạo payment SePay mới nếu lỗi ứng dụng, giữ dữ liệu inbox và bảng mới; rollback code/config tương thích rồi đối soát payment đang chờ. Không drop bảng SePay, không gọi `down()` tự động, không khôi phục đè database trong quy trình này.
- Migration `down()` cố ý từ chối xóa dữ liệu; nếu sau này cần kế hoạch khôi phục khác, đó là nhiệm vụ riêng do người dùng xác định.

## Chạy lại rehearsal local

Trong `server`, sau build: `node scripts/sepay-l2-rehearsal.cjs`. Runner không load `.env`, từ chối ambient `DATABASE_URL`/`TEST_DATABASE_URL`, tạo container PostgreSQL 17 mới với password ngẫu nhiên và binding `127.0.0.1:55434`. Port phải rảnh; không tự dừng container chiếm port. Không dùng container restore cũ có dữ liệu sao chép. Dữ liệu hoàn toàn synthetic, giữ lại container để kiểm tra; log/kết quả nằm trong `.local/sepay-l2` được Git ignore.

Sources: [PostgreSQL 17 RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [REVOKE và quyền MAINTAIN](https://www.postgresql.org/docs/17/sql-revoke.html). Đã đối chiếu cơ chế owner bypass RLS và quyền thừa kế; không thay cấu hình Supabase để kiểm thử các đặc tính này.
