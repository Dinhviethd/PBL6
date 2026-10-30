# B6 — Kế hoạch bổ sung API theo phạm vi đã chọn

- Thời điểm: 2026-10-30 23:27:50 Asia/Ho_Chi_Minh (UTC+07:00).
- Màn hình: B6 — Quản lý đơn hàng; Stitch project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`.
- Tham chiếu đã xác minh ở phiên trước: DESKTOP2560×3158, HTML `7004176431460157052`, ảnh `8369068700193780000`. Phiên này không gọi Stitch mới, không sửa artifact.
- Loại hành động: chỉ lập/cập nhật tài liệu API, kiểm thử và tiêu chí nghiệm thu.
- [Kế hoạch hiện hành mục11–14](../../ui/Feature_B6_OrderManager.md); [review backend làm căn cứ](B6_20261030_231254_backend_capability_review.md).

## 1. Yêu cầu và trạng thái ban đầu

Đã đọc Master Plan trước, mục4 dòng13 và5.2/5.4 xác định B6 có bảng cơ bản, backend chưa đáp ứng đầy đủ Stitch, frontend NEEDS_REVIEW, authenticated runtime NOT_VERIFIED. Nghiệp vụ từ Master Plan: dữ liệu thật, phân quyền theo sự kiện, thanh toán thành công mới phát hành vé. User yêu cầu lập kế hoạch bổ sung API cho KPI/count tabs; lọc ngày/tìm email; bảng đầy đủ; preview/in QR, bỏ các chức năng khác, bổ sung kiểm thử/kết quả/tiêu chí thành công.

Không có yêu cầu triển khai code trong phiên này. Skill được áp dụng theo nội dung đã đọc ở phiên trước: báo cáo mới và Master Plan bắt buộc; không tự sửa thiết kế Stitch. Không mở rộng sang B7/A7 hay frontend/backend implementation.

## 2. Thao tác thực tế

1. Đọc Master Plan và kế hoạch B6, kiểm tra git status và giờ UTC+7.
2. Đọc SERVICE-OWNERSHIP, database platform/UoW/assertOwned, payment projection và package scripts để thiết kế contract/quy trình kiểm thử phù hợp repo.
3. Cập nhật kế hoạch B6: đặt phạm vi mới lên đầu, đánh dấu mục7–8 là kế hoạch rộng ban đầu, giữ review lịch sử, thêm mục11–14 và nhật ký phiên.
4. Tạo report mới này; cập nhật riêng B6 trong bảng4 dòng13/5.2/5.4 của Master Plan. Không ghi API đề xuất vào cột API đã xác minh như thể endpoint tồn tại.

## 3. Nội dung kế hoạch đã lập

Đề xuất, **chưa tồn tại**:

- GET `/api/organizer/events/:eventId/order-manager`: bảng enriched, KPI, counts, pagination50 cố định; q mã/tên/email snapshot, ngày tạo đơn UTC+7, group all/paid/processing/closed. Endpoint riêng để giữ legacy orders/stats envelope và semantics.
- GET `/api/organizer/events/:eventId/orders/:orderId/tickets`: owner event/ADMIN preview tối đa10 vé đúng order, QR thật theo trạng thái. In bằng browser, không thêm POST hoặc mutation in.

Contract quy định scope KPI/count không phụ thuộc page/tab, groups loại trừ nhau với ưu tiên review, PAID KPI khác counts.paid khi có review; payment.paid chọn theo paid_payment_id; tiền string/BigInt; items/ticket summary theo batch. Ngày dùng đầu ngày UTC+7 và toExclusive ngày sau, search wildcard literal và SQL có parameter.

Owner ports: Event guard, Order reads, Payment batch; workflow không query cross-owner. Snapshot dự kiến REPEATABLE READ riêng cho GET mới, không đổi checkout/webhook isolation; không đặt READ ONLY vì guard hiện dùng SELECT FOR SHARE. Chưa có port snapshot này: được ghi rõ là đầu việc triển khai, không phải khả năng đã có.

QR: giữ buyer endpoints cũ, kiểm event/order ownership, không trả ciphertext/hash/raw token, no-store; VOID metadata không QR, pending/review409, CHECKED_IN có nhãn đã dùng. In không phát hành/check-in/resend. Không đưa QR vào list/cache/log.

Ngoài phạm vi: export/resend/VAT/reconcile/IPN/log/sổ phụ/refund/provider-phone-advanced filter/MoMo/Visa/gate/Escrow/push realtime/trend/kỳ vé/chọn page size mới. Bảng dùng dữ liệu thật; phone chưa có snapshot là null/Chưa có dữ liệu. Tabs đổi theo trạng thái thật, bỏ refund và action ngoài phạm vi theo chỉ đạo user; không sửa artifact Stitch.

## 4. Kiểm thử, kết quả và tiêu chí thành công

Đã lập T01–T17, bao gồm HTTP quyền/IDOR/validation; UTC+7/ngày biên; email và SQL injection; group/KPI/canonical payment; scope/count/pagination; items/tiền lớn; trạng thái vé; QR decode/quyền/no mutation; concurrency snapshot; ownership/regression; benchmark; browser state và print/mobile/accessibility sau tích hợp.

Chỉ tiêu dự kiến: p95 list+summary≤2s trên10000 đơn/event×5 attempts/đơn, preview10 QR≤2s, đo30 lần sau warm-up trong DB cô lập; không N+1 enrich. Đây là ngưỡng cần thực đo, không có kết quả benchmark phiên này.

| Kết quả phiên này | Trạng thái |
|---|---|
| Contract/phạm vi/thứ tự triển khai/test matrix/tiêu chí | Đã lập tại mục11–14 |
| API mới | NOT_IMPLEMENTED |
| T01–T17, benchmark, HTTP mới | NOT_RUN |
| Bằng chứng từ phiên23:12 | 7 kiểm tra source cô lập PASS; HTTP health8000 200/protected401; authenticated NOT_VERIFIED — không chạy lại trong phiên này |
| Source/Stitch/database | Không sửa |

Nghiệm thu API yêu cầu T01–T14 PASS thực tế, benchmark đạt ngưỡng hoặc ngưỡng thay thế được duyệt, build/boundary/regression PASS, không rò quyền hoặc mutation GET. Nghiệm thu toàn màn B6 còn cần browser/print T16–T17; máy in vật lý chưa test ghi NOT_VERIFIED riêng. Không lấy test kỳ vọng làm kết quả thực, không coi SKIP là PASS; chức năng OUT_OF_SCOPE không chặn nghiệm thu đợt này.

## 5. Checklist review và kết luận

| Tiêu chí skill | Trạng thái |
|---|---|
| Yêu cầu/nội dung kế hoạch | PASS về tài liệu: đúng4 nhóm, có contract/tests/kết quả thực tế/acceptance |
| Bố cục/design system/ngôn ngữ giao diện | NOT_VERIFIED mới; không review/sửa artifact trong phiên này |
| Điều hướng/nghiệp vụ | PARTIAL: contract đã định nghĩa, implementation chưa có |
| Trạng thái UI | PARTIAL: đã có kế hoạch lỗi/empty/loading/disabled, chưa chạy |
| Responsive/accessibility | NOT_VERIFIED; ca kiểm thử đã được lập |
| Tính nhất quán | PARTIAL: giữ sidebar/JSX-CSS cùng file trong plan, legacy APIs không đổi; chưa triển khai |

Kết luận: **Đã hoàn tất lập kế hoạch tài liệu theo phạm vi đã chọn**. Review sản phẩm/API vẫn **CHƯA ĐỦ BẰNG CHỨNG cho phạm vi mới**, source review rộng trước đó KHÔNG ĐẠT giữ nguyên lịch sử; frontend NEEDS_REVIEW, API NOT_IMPLEMENTED. Không báo BLOCKED do Stitch vì không cần truy cập mới; chưa có xác minh API mới hoạt động và không tích hợp frontend.

Đã giải quyết ở mức kế hoạch: giảm phạm vi, xác định endpoint/DTO/quyền/snapshot/canonical/payment-group, quy trình in và kiểm thử. Còn tồn tại: triển khai API/snapshot port, HTTP authenticated/integration/benchmark/print, các lỗi artifact đã ghi report trước (không tự sửa). Không yêu cầu thực hiện chức năng bị loại bỏ.

Master Plan: cập nhật B6 scope/plan/report/time, bảng4 ghi kế hoạch trong việc còn lại, giữ cột API là các route đã đọc source; không đánh dấu tích hợp mới ở6.F. Report cũ không ghi đè. Thay đổi có sẵn App/Sidebar/B9 và Master Plan được giữ nguyên. Trước kết thúc kiểm tra diff whitespace/liên kết tài liệu/phạm vi file; không chạy build/test implementation vì chỉ sửa tài liệu.
