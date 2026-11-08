# Kế hoạch mã giảm giá — EventHub

Ngày lập: 23/10/2026. Trạng thái: đề xuất, chưa triển khai hoặc chạy migration.

## 1. Phạm vi bản đầu

- Organizer tạo và quản lý mã cho sự kiện mình sở hữu; Admin có quyền xem và tắt mã.
- Hai kiểu giảm: phần trăm nguyên 1–99% hoặc số tiền VND cố định. Mã phần trăm có thể đặt mức giảm tối đa.
- Điều kiện: thời gian hiệu lực, giá trị đơn tối thiểu, tổng lượt sử dụng và số lượt mỗi tài khoản. Giới hạn tính cả lượt đang giữ và đã sử dụng.
- Một mã trên mỗi đơn, áp dụng trên toàn bộ tiền vé của một sự kiện. Không cộng dồn mã, không áp dụng theo từng loại vé ở bản đầu.
- Nhập/áp dụng/gỡ mã tại checkout trên web và mobile, hỗ trợ cả đơn được tạo từ hàng chờ.
- Không hỗ trợ đơn miễn phí/giảm 100%, hoàn tiền hay khôi phục lượt cho đơn đã thanh toán trong bản đầu. Nếu mức giảm làm số phải trả không còn hợp lệ, từ chối kèm thông báo, không tự sửa mức giảm.
- Không công khai danh sách mã cho khách. Người dùng nhập mã được Organizer cung cấp; endpoint kiểm tra có giới hạn tần suất.

## 2. Quy tắc nghiệp vụ

### Mã và hiệu lực

- Chuẩn hóa trim + uppercase; định dạng đề xuất `[A-Z0-9_-]{3,32}`. Mã unique trong từng sự kiện, không tái sử dụng mã cũ cho một chương trình khác.
- Thời gian lưu UTC; UI hiển thị giờ địa phương. Kiểm tra lại thời gian và điều kiện tại transaction áp dụng mã, không tin kết quả xem trước.
- Sau khi tạo, khóa mã, kiểu giảm, giá trị và điều kiện để giữ lịch sử đơn dễ đối chiếu. Organizer có thể tắt/bật nhận mới; muốn đổi chương trình thì tạo mã khác. Không xóa cứng.
- Tắt mã hoặc hết thời gian áp dụng chỉ chặn lượt giữ mới. Đơn đã áp dụng hợp lệ tiếp tục hưởng mức giảm cho tới khi reservation được giải phóng hoặc thanh toán thành công.

### Tính tiền

- `subtotal_amount` = tổng `order_items.line_total` theo giá snapshot của đơn.
- `discount_amount` = giảm cố định hoặc `floor(subtotal × percent / 100)`, có xét trần giảm; số tiền tính bằng BigInt, đơn vị VND.
- `total_amount = subtotal_amount - discount_amount`, phải dương và đáp ứng kiểm tra của provider đang dùng.
- Order giữ snapshot mã/kiểu/giá trị/trần giảm tại lúc áp dụng. Giá vé trong item không đổi khi gỡ/đổi mã.
- Payment chỉ nhận `order.total_amount` đã tính tại backend. Không nhận subtotal, mức giảm hoặc tổng phải trả do client tự khai.

### Giữ lượt và thanh toán

- Xem trước không giữ lượt. Áp dụng thành công tạo redemption `HELD`, tăng lượt đang giữ trong cùng transaction cập nhật giá đơn.
- `HELD → CONSUMED` khi đơn PAID; `HELD → RELEASED` khi gỡ/đổi mã, hủy đơn hoặc reservation hết hạn.
- Thời hạn giữ lượt đi cùng reservation vé, kể cả phần gia hạn cho thanh toán/đối soát hiện có; không dùng một timer coupon độc lập nhả lượt sớm.
- Chỉ được sửa mã khi đơn còn hạn, đang PENDING_PAYMENT và **chưa từng tạo payment attempt**. Payment thất bại cũng không mở lại quyền sửa giá trên đơn đó vì callback cũ có thể đến muộn.
- Mã không làm gia hạn đơn hoặc thay vị trí hàng chờ. Từ chối/hết hạn lời mời trả cả vé và lượt mã. Đơn hàng chờ đã có payment attempt tuân theo cùng quy tắc khóa giá; không tạo ưu tiên hàng chờ mới để đổi mã.
- Nếu đổi sang mã khác bị lỗi, giữ nguyên mã cũ và giá cũ. Retry áp dụng cùng mã/gỡ mã đã gỡ không tiêu hao thêm lượt.
- Callback lặp không tiêu hao lượt hai lần; callback sau khi vé/lượt mã đã được giải phóng đi theo nhánh đối soát hiện có, không tự tái giữ lượt hoặc phát hành vé.

## 3. Dữ liệu và ownership

Đặt trong **Order**, vì giá đơn, reservation vé và lượt mã phải cập nhật nguyên tử. Event cung cấp guard quyền Organizer; Payment không truy vấn bảng mã.

| Bảng | Thay đổi đề xuất |
| --- | --- |
| `discount_codes` | id, event_id, code chuẩn hóa, kiểu/giá trị/trần giảm, min_subtotal, starts_at/ends_at, enabled, max_uses, max_uses_per_user, held_count, consumed_count, người tạo và thời điểm |
| `discount_redemptions` | id, code_id, order_id, buyer_id, HELD/CONSUMED/RELEASED, thời điểm giữ/tiêu thụ/giải phóng; giữ lịch sử khi đổi mã |
| `orders` | subtotal_amount, discount_amount, snapshot mã giảm và pricing_version; giữ total_amount là số thực trả |

- Unique `(event_id, code)`; partial unique tối đa một redemption HELD/CONSUMED trên mỗi đơn.
- Constraint kiểm tra tiền không âm, tổng thực trả đúng công thức, giới hạn counters và cấu hình kiểu giảm.
- Backfill đơn cũ: subtotal = total_amount, discount = 0, không có mã, pricing_version khởi tạo. Giữ nguyên giá/payment/vé cũ.
- Mở rộng ownership registry, migration runner, test setup, tài liệu database và quyền API.
- Audit ghi tạo/tắt/bật mã và thay đổi mã của đơn; không thay audit lịch sử bằng dữ liệu hiện tại.

## 4. API đề xuất

| API | Mục đích |
| --- | --- |
| `GET /organizer/events/:id/discount-codes?page=0` | Danh sách cấu hình và số lượt giữ/đã dùng/còn lại |
| `POST /organizer/events/:id/discount-codes` | Tạo mã có kiểm tra quyền và dữ liệu |
| `PATCH /organizer/events/:id/discount-codes/:codeId` | Bật/tắt nhận lượt mới, kiểm tra mã thuộc đúng sự kiện |
| `POST /orders/:id/discount-preview` | Body `{code}`; xem số tiền dự kiến, không giữ lượt |
| `PUT /orders/:id/discount` | Body `{code, expectedPricingVersion}`; áp dụng/đổi mã, trả order pricing từ backend |
| `DELETE /orders/:id/discount` | Truyền expectedPricingVersion; gỡ mã và trả giá mới |

Đường dẫn trên chưa bao gồm prefix `/api`. Các endpoint khách chỉ cho chủ đơn. Admin sử dụng cùng workflow kiểm tra quyền để xem/tắt mã, không cần nhân đôi logic định giá.

`POST /orders/:id/payments` bổ sung expectedPricingVersion. Nếu màn hình đang hiển thị giá cũ, trả `PRICING_CHANGED` và giá mới để khách xem lại trước khi bấm thanh toán. Cập nhật đồng bộ web/mobile và các client/test gọi payment; không âm thầm tạo payment với giá khác giá khách vừa thấy.

Lỗi phân biệt: mã không hợp lệ/sai sự kiện, chưa hiệu lực/hết hiệu lực, đơn dưới mức tối thiểu, hết lượt, vượt lượt mỗi tài khoản, giá không hợp lệ, đơn hết hạn, giá đã khóa và phiên bản giá cũ.

## 5. Đồng thời và idempotency

- Dùng UnitOfWork hiện có cho toàn bộ thay đổi đơn/coupon/redemption.
- Quy định thứ tự khóa thống nhất với workflow booking: event → order → inventory theo id → discount codes theo id → redemption → payment khi cần. Kiểm tra mọi nhánh apply/remove/startPayment/complete/release/admin để tránh đảo thứ tự khóa.
- Khi đổi mã, khóa cả mã cũ và mới theo thứ tự cố định. Không giải phóng lượt cũ trước khi biết mã mới hợp lệ.
- Dưới khóa mã, kiểm tra `held + consumed < max_uses` và đếm HELD/CONSUMED của tài khoản. Một lượt cuối chỉ một request được nhận.
- pricing_version tăng chỉ khi giá/mã thực sự đổi. Retry với trạng thái đích đã đạt phải được xử lý idempotent trước khi xem là xung đột phiên bản; mọi trường hợp khác trả conflict, không ghi đè thay đổi mới hơn.
- Kiểm tra payment history và khóa giá trong cùng transaction với apply/remove/startPayment. Không chỉ dựa vào payment đang ACTIVE.

## 6. Giao diện

- Organizer web: tab Mã giảm giá trong quản lý sự kiện; tạo mã, copy mã, trạng thái, khoảng hiệu lực, lượt đang giữ/đã dùng và bật/tắt.
- Khách web/mobile: ô nhập mã ở checkout, nút Áp dụng/Gỡ, lỗi cạnh ô nhập và ba dòng Tạm tính/Giảm giá/Thanh toán.
- Trong khi request áp dụng/gỡ đang chạy, khóa thao tác thanh toán. Khi backend báo giá cũ, tải lại giá và yêu cầu khách bấm thanh toán lại.
- Sau payment attempt đầu tiên, chỉ hiển thị mã và mức giảm, không còn nút chỉnh sửa.
- Chi tiết/lịch sử đơn và khu quản lý hiển thị snapshot mức giảm. Doanh thu tính theo số thực thu; bổ sung tổng giảm giá và giá trị vé trước giảm để không gây nhầm với tổng item.

## 7. Trình tự triển khai

1. Migration additive/backfill, ownership và DTO tiền/phiên bản giá.
2. CRUD mã theo quyền Organizer/Admin và audit.
3. Bộ tính giảm giá, preview/apply/remove, khóa và giới hạn lượt.
4. Nối payment/release/expiry/wait-queue, đóng băng giá và doanh thu.
5. UI Organizer, checkout web/mobile, thông báo lỗi và khôi phục khi request thất bại.
6. Test, tài liệu sử dụng và hướng dẫn nâng cấp đồng bộ client/API/worker. Chỉ migrate Supabase/khởi động dịch vụ khi có yêu cầu triển khai.

Nhánh đề xuất khi bắt đầu code: `feature/discount-codes` từ `Huy`. Lượt lập kế hoạch này không tạo nhánh, thay code hay migrate database.

## 8. Kiểm thử và tiêu chí nghiệm thu

- Unit: %/cố định/trần giảm, làm tròn, BigInt, đơn tối thiểu, thời gian biên, từ chối tổng 0/âm, chuẩn hóa mã.
- PostgreSQL thật: quyền sự kiện/chủ đơn, unique mã, giới hạn toàn cục/tài khoản, hai request tranh lượt cuối, apply/payment chạy đua, đổi mã rollback, retry và pricing_version.
- Lifecycle: đơn cũ không mã, thanh toán thành công/thất bại/callback lặp/callback muộn; cancel/expiry/worker lặp trả lượt đúng một lần; payment grace vẫn giữ lượt.
- Hàng chờ: apply trên đơn OFFERED, hết hạn/từ chối trả cả vé và mã, chuyển người tiếp theo không mang coupon của người trước.
- Organizer tắt mã sau khi khách đã giữ: đơn đang giữ vẫn giữ giá, khách mới bị từ chối.
- E2E web và Expo web: tạo mã → mua thường hoặc nhận lượt hàng chờ → áp dụng → thấy giá mới → thanh toán → đúng tiền, một vé và một lượt CONSUMED.
- Regression toàn bộ mua vé/check-in/notification/session isolation/wait queue; build, lint, mobile typecheck/export. Test dùng database riêng, không seed hoặc tạo đơn thử trên Supabase chung.
- Hoàn tất khi không vượt số lượt mã, không thay giá sau payment attempt, không lệch tổng thanh toán/backend/provider và không ảnh hưởng lịch sử đơn cũ.
