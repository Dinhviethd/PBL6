# Báo cáo B2 — Quản lý sự kiện (triển khai + kiểm thử API backend)

- **Mã màn hình:** B2 — Quản lý sự kiện.
- **Loại hành động:** triển khai API backend theo kế hoạch + kiểm thử runtime + đánh giá tiêu chí (chưa tạo giao diện).
- **Thời điểm:** 2026-10-28 12:57 (Asia/Ho_Chi_Minh).

## 1. Tham chiếu Stitch

- **Project ID:** `10374042969343935993` (EventHub).
- **Screen:** `b0bca491c8694c069de76d684bd55843` — “B2. Quản lý sự kiện - Cosmic Ticket Ban Tổ Chức”.
- Phiên này **không** thao tác trên Stitch (artifact giữ nguyên), không tạo/sửa giao diện.

## 2. Yêu cầu liên quan (trích kế hoạch B2)

Theo `docs/ui/Feature_B2_ManagerEvent.md`, phạm vi API đã chốt: chỉ thực hiện B2 — Quản lý sự kiện; bổ sung **2 API read-only, không ảnh hưởng database**:

1. Bổ sung **doanh thu + tỷ lệ lấp đầy** vào `GET /organizer/events`.
2. **Số đếm theo trạng thái** của organizer đang đăng nhập (khối “Quick Stats”).

Đã loại khỏi phạm vi: bộ lọc, sort whitelist, sắp xếp theo doanh thu/fill-rate, mã sự kiện `#EVT-xxxx`, tổng quan organizer (Dashboard/KPI — thuộc B1).

## 3. Trạng thái ban đầu

- Backend chưa có `revenue`/`fill_rate` trong list `GET /organizer/events`; chưa có endpoint số đếm trạng thái.
- `GET /organizer/events` chỉ truyền `owner` + `offset` (`server/src/app.ts:558`).

## 4. Tiêu chí nghiệm thu (trích kế hoạch)

1. Chỉ trả event thuộc `organizer_id` của người gọi (không rò dữ liệu chéo).
2. `revenue` của mỗi event = tổng `total_amount` các đơn `PAID` của event đó.
3. `capacity` = tổng `capacity` các `ticket_types`; `sold_quantity` = tổng `sold_quantity`; `fill_rate = sold/capacity`, bằng 0 khi `capacity=0`, luôn trong `[0,1]`.
4. Tổng số đếm theo trạng thái = tổng số event của organizer.
5. Đơn không phải `PAID` không cộng vào `revenue`/`sold`.
6. Phân trang và `total_results` hoạt động đúng.
7. Không có migration/DDL mới.

## 5. Thao tác đã thực hiện

1. Đọc `server/src/modules/event/infrastructure/store.ts`, `server/src/modules/order/infrastructure/store.ts`, `server/src/app.ts`, `server/src/platform/database.ts` (kiểm tra `assertOwned`), `server/src/modules/event/public.ts`, `server/src/modules/order/public.ts`.
2. Phát hiện ràng buộc `assertOwned` (ownership) trong `platform/database.ts`: module `event` chỉ sở hữu `categories/events/event_reviews/event_checkin_staff`; **không** sở hữu `orders`/`ticket_types` (thuộc module `order`). Do đó không thể viết subquery `orders`/`ticket_types` bên trong `events.list` như kế hoạch mô tả — phải tách aggregate về module `order` và nối ở route.
3. Thêm `statusCounts(owner)` vào `event/infrastructure/store.ts`.
4. Thêm `revenueByEvent(ids)` và `capacityByEvent(ids)` vào `order/infrastructure/store.ts`.
5. Sửa route `GET /organizer/events` (nối kết quả aggregate theo `event_id`, tính `fill_rate`) và thêm `GET /organizer/events/status-counts` trong `app.ts` (đặt trước route `:id`).
6. Build (`npm run build`) — exit 0.
7. Kiểm thử runtime bằng script tạm (đã xóa sau khi chạy): khởi tạo app in-process, listen cổng ephemeral, đăng nhập `organizer@example.test`/`organizer2@example.test` (demo), gọi 2 endpoint, đối chiếu với `orders.summary`.

## 6. Danh sách rà soát theo tiêu chí

| Tiêu chí | Kết quả | Ghi chú |
|---|---|---|
| 1. Yêu cầu & nội dung | PASS | 2 API đã thêm đúng hợp đồng đã chốt |
| 2. Bố cục | N/A | Không tạo giao diện phiên này |
| 3. Design system | N/A | Không tạo giao diện phiên này |
| 4. Ngôn ngữ & khả năng đọc | N/A | Backend only |
| 5. Điều hướng & nghiệp vụ | PASS | Route/guard `ORGANIZER`/`ADMIN` giữ nguyên; 401 khi chưa đăng nhập |
| 6. Trạng thái giao diện | N/A | Backend only |
| 7. Responsive & accessibility | N/A | Backend only |
| 8. Tính nhất quán | PASS | Không đổi schema; đọc dữ liệu sẵn có; không đổi hợp đồng route cũ |

## 7. Bằng chứng (kiểm thử runtime)

Môi trường: dev DB Supabase (dữ liệu thật của `organizer@example.test`), build từ `dist`, app in-process.

- `GET /organizer/events` (organizer1) → HTTP **200**, 15 event, mỗi event có `revenue`, `capacity`, `sold_quantity`, `fill_rate`, `total_results`.
  - Ví dụ thật: “Sắc màu cuối tuần” `revenue=150000, capacity=100, sold_quantity=1, fill_rate=0.01` (= 1/100).
  - “Giải Chạy Bình Minh Ven Biển 2027” `revenue=450000, capacity=500, sold_quantity=3, fill_rate=0.006` (= 3/500).
  - Event không có đơn → `revenue=0, sold_quantity=0, fill_rate=0`.
- Đối chiếu `revenue`/`sold_quantity` với `orders.summary(eventId)` cho **toàn bộ 15 event** → **0 mismatch**.
- `GET /organizer/events/status-counts` (organizer1) → HTTP **200**, `[{"PENDING_REVIEW":1},{"PUBLISHED":10},{"REJECTED":4}]`, tổng = 15 = số event trong list.
- Cross-tenant: `organizer2@example.test` → list **0 event**, status-counts `[]`.
- Auth: chưa đăng nhập → HTTP **401** cho cả hai endpoint.
- Empty-ids edge: `revenueByEvent([uuid ngẫu nhiên])` và `capacityByEvent([...])` → `[]` (không crash, không chia 0).

## 8. Mức độ tuân thủ thiết kế Stitch

- Không áp dụng (backend only); artifact Stitch giữ nguyên.

## 9. API đã xác minh

| Method & đường dẫn | Vai trò | Bằng chứng |
|---|---|---|
| `GET /api/organizer/events` | List event + `revenue`/`capacity`/`sold_quantity`/`fill_rate` | 200, 15 event, giá trị đúng, 0 mismatch vs `orders.summary` |
| `GET /api/organizer/events/status-counts` | Số đếm trạng thái của organizer đăng nhập | 200, tổng 15 khớp list; cross-tenant rỗng |
| `GET /api/organizer/events` (không session) | Phân quyền | 401 |
| `GET /api/organizer/events/status-counts` (không session) | Phân quyền | 401 |

## 10. Vấn đề đã giải quyết

- Kế hoạch mô tả “subquery trong `events.list`” nhưng module `event` không sở hữu `orders`/`ticket_types` (`assertOwned` sẽ từ chối). Đã triển khai tương đương bằng aggregate ở module `order` + nối ở route — cùng kết quả, không vi phạm ranh giới module, không đổi database.

## 11. Vấn đề còn tồn tại và trở ngại

1. Không có `TEST_DATABASE_URL` (DB `_test`) trong môi trường; không chạy được bộ test tích hợp `npm test` (yêu cầu DB tên `*_test`). Kiểm thử dùng dev DB thật ở chế độ đọc (đăng nhập tạo session, không tạo event/order).
2. Chưa có event thật với `capacity=0` (không có `ticket_types`) để kiểm thử trực tiếp case `fill_rate=0` khi không có loại vé — chỉ kiểm chứng qua code path `cap === 0 ? 0 : ...` và edge `capacityByEvent([])`.
3. Chưa seed riêng một đơn `PENDING_PAYMENT`/`EXPIRED` để chứng minh loại trừ khỏi `revenue` — thay vào đó đối chiếu `revenue` khớp `orders.summary` (cùng lọc `status='PAID'`) trên toàn bộ event.
4. Kiểu trả về: `revenue`/`capacity`/`sold_quantity` trả số (`Number()` từ numeric/bigint); endpoint cũ `/organizer/events/:id/stats` vẫn trả `revenue` dạng chuỗi — lệch nhẹ kiểu dữ liệu, cần lưu ý khi frontend đọc.

## 12. Kết quả rà soát tổng thể

**ĐẠT CÓ ĐIỀU KIỆN** cho phần API backend B2: 2 API hoạt động đúng trên dữ liệu thật, đáp ứng các tiêu chí 1–7 (ngoại trừ các trường hợp biên chưa thể seed trực tiếp ở mục 11). Giao diện B2 chưa triển khai (thuộc phiên khác).

## 13. Trạng thái cuối cùng

- Backend: đã bổ sung 2 API read-only, build đạt, kiểm thử runtime đạt trên dev DB.
- Giao diện B2: chưa thay đổi.

## 14. Các trường đã cập nhật trong Master Plan

- Bảng 5.2, dòng B2: cột “Triển khai” → ghi nhận API backend đã triển khai + kiểm thử.
- Bảng 5.4, dòng B2: cập nhật vấn đề tồn tại, thêm báo cáo này và thời điểm.

## 15. Giới hạn và tiêu chí chưa thể xác minh

- Chưa chạy bộ test tích hợp `npm test` (thiếu DB `_test`).
- Case `capacity=0` và đơn không `PAID` chưa seed trực tiếp (xem mục 11).
- Chưa kiểm thử phân trang `page>0` (dữ liệu hiện chỉ 15 event < limit 50).
- Giao diện B2 (bảng, Quick Stats, sidebar) chưa triển khai — ngoài phạm vi phiên này.

## 16. Các tệp mã nguồn đã thay đổi

- `server/src/app.ts` — mở rộng `GET /organizer/events`, thêm `GET /organizer/events/status-counts`.
- `server/src/modules/event/infrastructure/store.ts` — thêm `statusCounts`.
- `server/src/modules/order/infrastructure/store.ts` — thêm `revenueByEvent`, `capacityByEvent`.

Không có migration/DDL/thay đổi schema. Không sửa giao diện, không sửa Stitch.
