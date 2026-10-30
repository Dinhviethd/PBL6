# Báo cáo P7-03 — thử migration draft trên database local disposable

**Thời điểm:** 29/10/2026 22:09 UTC+7  
**Kết quả:** PASS các kiểm tra được liệt kê; chưa đủ điều kiện áp dụng Supabase.  
**Đích:** `127.0.0.1:55432`, database mới `eventhub_sepay_p7_a249ee1a3383_test`, user `sepay_local`, container và volume riêng đã được `verifiedConfig()` xác minh. Database disposable được giữ để xem xét; không sao chép dữ liệu Supabase.

## Thực hiện

1. Guard xác nhận literal URL, identity DB/user, container/network/volume và cổng local. Tạo database có tên ngẫu nhiên với tiền tố `eventhub_sepay_p7_` trên container local đã xác minh.
2. Áp dụng bốn baseline migration và seed dữ liệu giả của dự án. Đây là database mới, không phải `eventhub_sepay_local` đang phục vụ Test mode.
3. Trong một transaction, tạo tạm ba role `anon`, `authenticated`, `service_role`; mô phỏng default grant rộng được quan sát trong P7-01. Chạy các câu SQL của [draft](20261029_220700_p7_sepay_additive_migration_review.sql) sau khi bỏ hai dòng BEGIN/COMMIT để transaction bên ngoài có thể rollback toàn bộ. SQL còn lại giữ nguyên.
4. Kiểm tra bảng, RLS, quyền, hành vi SELECT của ba role, INSERT của owner và fingerprint data giả của 24 bảng có sẵn. ROLLBACK và xác nhận cả bảng SePay và role tạm không còn.

## Kết quả

| Kiểm tra | Kết quả và bằng chứng |
|---|---|
| Guard local và database disposable | PASS; `eventhub_sepay_p7_a249ee1a3383_test`, port 55432, user `sepay_local`. |
| Baseline/seed giả | PASS; 4 migration và seed thực thi thành công. Không có dữ liệu Supabase. |
| DDL draft | PASS trong transaction rollback: 3 bảng, indexes/FK/constraints được tạo thành công trên PostgreSQL local. |
| RLS | PASS; `relrowsecurity=true` cho ba bảng SePay. |
| Privileges API roles | PASS; `has_table_privilege` không thấy SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER của `anon`, `authenticated`, `service_role` trên từng bảng sau revoke. PostgreSQL 16 local không kiểm tra privilege `MAINTAIN` của PostgreSQL 17 Supabase. |
| Thử thực tế role | PASS: `SET LOCAL ROLE` và SELECT `sepay_transactions` đều bị từ chối với SQLSTATE `42501` cho từng role. Chưa thử từng thao tác/từng bảng và chưa kiểm tra Data API. |
| Backend owner | PASS: owner local có privilege được kiểm tra và INSERT giả vào `sepay_transactions` thành công. Không chứng minh runtime role production hoặc toàn bộ workflow. |
| Bảo toàn dữ liệu bảng cũ | PASS: fingerprint các hàng trong 24 bảng hiện có không thay đổi trong transaction. Seed chưa tạo payment demo/VNPAY đã thanh toán; chưa kiểm tra mọi index/constraint trước và sau. |
| Rollback | PASS: sau rollback không còn bảng draft hay ba role tạm. Không thử COMMIT, migration history registration hoặc crash/lock trên Supabase. |
| Supabase | Không kết nối trong phiên thử này; không backup/clone/DDL. |

## Giới hạn và bước kế tiếp

Đây là thử SQL ở local, không chứng minh migration an toàn khi commit trên Supabase hoặc trên PostgreSQL 17. Cần thử full transaction commit và migration history trên môi trường cô lập tương thích, bổ sung kiểm tra `MAINTAIN`, deny theo từng role/bảng/thao tác và smoke test backend với runtime role production. Cần backup và chứng minh restore trên bản sao được cho phép, đo lock và review migration trước mọi DDL Supabase. Các bước backup/clone và DDL Supabase chưa được người dùng cho phép; inventory read-only trước đó không bao gồm các thao tác này.

Không sửa source/API, API demo/VNPAY hay dữ liệu Supabase. Một database local disposable và dữ liệu giả baseline được giữ lại để kiểm tra.
