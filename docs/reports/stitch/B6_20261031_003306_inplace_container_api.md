# B6 — Cập nhật API trong container Docker hiện có

- **Màn hình:** B6 — Quản lý đơn hàng (Organizer).
- **Thời điểm:** 2026-10-31 00:33:06 UTC+7; hành động: cập nhật runtime API tại chỗ và kiểm tra.
- **Stitch:** project `10374042969343935993`, screen B6 `391bc738f4ea4e25be5e43993616ca7f`. Không thao tác trên Stitch; thiết kế giữ nguyên, tham chiếu report frontend B6 trước đó.
- **Yêu cầu Master Plan:** B6 có KPI/tab count, lọc ngày, tìm email, bảng đơn và preview/in QR. Frontend và backend đã kiểm thử trên DB test; container API cổng 8000 còn thiếu route B6 trước phiên này.
- **Trạng thái ban đầu:** `pbl6-api-1` healthy nhưng hai route B6 trả 404. Image `eventhub-local` không có mã B6 mới.

## Thao tác và bằng chứng

| Tiêu chí | Kết quả |
|---|---|
| Build mã API hiện tại | `npm run build` tại `server/` PASS, tạo `server/dist`. |
| Có thể khôi phục | Sao lưu 5 file runtime cũ tại `server/.local/b6-api-rollback-20261031_003000/` trước khi ghi đè. Thư mục này chỉ là bản sao cục bộ, không nằm trong Git. |
| Cập nhật tại chỗ | Dùng `docker cp` chép 6 file JS đã build vào `/app/dist` của chính `pbl6-api-1`: `app.js`, `platform/database.js`, `modules/order/infrastructure/store.js`, `modules/order/public.js`, `modules/payment/infrastructure/store.js`, `workflows/order-manager.js`; sau đó `docker restart pbl6-api-1`. Không build image hoặc tạo container mới trong phiên này. |
| Kiểm tra nội dung | SHA-256 của cả 6 file trong container khớp file tương ứng trên máy host. |
| Danh tính container | Sau restart: ID `98d93c2933823350e090da25e80abcc93d4f5bd316f97072a1951812837d3c3e`, image `eventhub-local`, trạng thái `running healthy`, bind cổng 8000 như trước. Worker `pbl6-worker-1` vẫn chạy; không cập nhật worker. |
| Health | `GET http://127.0.0.1:8000/api/health` trả 200, `status=ok`. |
| Route B6 danh sách/KPI | `GET /api/organizer/events/:eventId/order-manager` với UUID giả, không token, trả **401**. Trước cập nhật route này trả 404; kết quả mới xác nhận route và middleware auth đã nạp. |
| Route B6 preview/in QR | `GET /api/organizer/events/:eventId/orders/:orderId/tickets` với UUID giả, không token, trả **401**. Trước cập nhật route này trả 404. |
| Các URL thử sai | `/api/organizer/orders` và `/api/organizer/orders/:id/qr-preview` trả 404 vì không phải hợp đồng API B6; đã đối chiếu lại đường dẫn từ `server/src/app.ts` và frontend. |

## Kết quả rà soát

- **Tuân thủ Stitch:** thiết kế và giao diện không đổi trong phiên này; không review lại hình ảnh trên Stitch.
- **API:** hai route B6 đã hiện diện và đang phản hồi qua container Docker hiện có. Test DB cô lập trước đây đã kiểm tra payload và logic; phiên này chỉ xác nhận runtime, auth middleware và health trên cổng 8000.
- **Vấn đề đã giải quyết:** runtime 8000 không còn 404 do thiếu route B6; Vite proxy đến cổng 8000 giờ có thể gọi route B6.
- **Còn tồn tại:** chưa gửi request có token Organizer tới Supabase Live, nên chưa xác nhận dữ liệu KPI, lọc, tìm email, phân trang và ticket preview trên dữ liệu Live. Không xác nhận in QR trong browser ở phiên này. Mã chép trực tiếp chỉ tồn tại trong filesystem của container; khi container bị recreate từ image `eventhub-local` cũ, các thay đổi sẽ mất. Image ứng viên build từ phiên trước vẫn chưa được dùng để tạo container.
- **Trạng thái cuối:** API B6 tại container đang chạy **đã cập nhật, đạt kiểm tra runtime cơ bản**; nghiệm thu end-to-end Live vẫn **có điều kiện**. Không sửa nguồn frontend/backend hoặc màn hình khác trong phiên này.
- **Master Plan cập nhật:** mục 4 dòng 13, 5.2 B6, 5.4 B6, 6.F: trạng thái container, route, giới hạn và đường dẫn report/thời điểm mới.

