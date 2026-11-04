# Admin C2/C4/C6 — chuyển nút làm mới thành icon xoay

| Mục | Giá trị |
|---|---|
| Thời điểm | 2026-11-03 23:10 UTC+07 |
| Màn hình | C2 khách hàng, C4 ban tổ chức, C6 hồ sơ BTC |
| Phạm vi | Đổi nút `.c2-refresh`, `.c4-refresh`, `.c6-refresh` từ chữ sang icon refresh; giữ hành vi tải lại. |

## Thay đổi

- Thay text “Làm mới” bằng icon `RefreshCw` trong cả ba màn hình.
- Bổ sung `aria-label` và `title` rõ ràng; icon xoay khi request của danh sách đang tải.
- Giữ nguyên handler tăng refresh counter và API đang được gọi.

## Xác minh

- `client npm run build`: PASS.
- `client npm run lint`: PASS.
- Chrome runtime local: cả ba selector refresh tồn tại, có accessible label và icon SVG; thao tác refresh C4/C6 vẫn phát request `GET /api/admin/organizer-applications` trả 200. Không thực hiện mutation.

## Kết luận

Ba nút refresh đã đồng nhất thành icon vòng mũi tên; loading được biểu diễn bằng animation xoay. Không sửa backend hoặc Stitch.
