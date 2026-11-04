# C8 metrics — nguyên nhân lỗi và sửa ownership guard

| Mục | Giá trị |
|---|---|
| Thời điểm | 2026-11-03 22:15 UTC+07 |
| API | `GET /api/admin/events/metrics?eventIds=<UUID>` |
| Phạm vi | Truy tìm lỗi `INTERNAL` trên metrics, sửa source và kiểm tra ownership guard. Không rebuild/restart container. |

## Nguyên nhân đã xác định

`server/src/modules/order/infrastructure/store.ts` chạy truy vấn CTE bắt đầu bằng `WITH selected AS (...)`. `server/src/platform/database.ts` gọi `assertOwned()` với `pgsql-ast-parser`; runtime guard chỉ chấp nhận câu lệnh AST có type `select`, `insert`, `update` hoặc `delete`. Parser trả `with` cho CTE nên guard ném `Unsupported runtime SQL for order` trước khi PostgreSQL chạy truy vấn. Error handler biến lỗi không bắt này thành HTTP 500, `{success:false, code:"INTERNAL", message:"Có lỗi hệ thống."}`.

Bằng chứng: log `pbl6-api-1` ghi `Request failed Error Unsupported runtime SQL for order`; kiểm tra artifact container cho thấy `dist/modules/order/infrastructure/store.js` còn truy vấn `WITH selected ...`. Container không mount source tree (chỉ mounts uploads và certificate), do đó source hiện tại không tự cập nhật container.

## Sửa source

Đổi CTE sang một `SELECT` có derived table `VALUES` làm danh sách event ID, sau đó LEFT JOIN các aggregate subqueries trên `ticket_types`, `tickets`, `orders`, `checkins`. Các ID và danh sách ID truyền bằng bind parameters; không nới guard hoặc ownership rules. Thêm test hồi quy `C8 event metrics use an ownership-guard-compatible SELECT without a CTE` tại `server/test/ownership.test.cjs`, xác nhận dạng CTE bị chặn và dạng SELECT mới được chấp nhận.

## Kiểm tra

- `server npm run build`: PASS.
- `node --test test/ownership.test.cjs`: 3 PASS, 0 FAIL.
- `server npm run check:boundaries`: PASS.
- Runtime container chưa rebuild/restart; chưa thực hiện request metrics có token ADMIN sau khi sửa. Vì vậy sửa source đã xác minh qua build/guard test, nhưng runtime chưa xác nhận khắc phục.

## Trạng thái

Nguyên nhân đã xác định và sửa ở source. **Bản container đang chạy vẫn có mã CTE cũ**, nên lỗi trên runtime có thể còn tiếp diễn cho đến khi container nhận build mới. Report C8 triển khai trước đó được giữ nguyên; report này bổ sung kết quả phân tích.
