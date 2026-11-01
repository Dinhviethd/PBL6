# A12 — Bổ sung phạm vi API phân trang

- Thời điểm: 2026-11-01 15:26:57 UTC+07 (Asia/Ho_Chi_Minh).
- Màn hình: A12 — Thông báo của bạn; project `10374042969343935993`, screen `34f73bfd827e4025b19d91f00e3b2b88`.
- Hành động: chỉ cập nhật kế hoạch theo yêu cầu người dùng; không triển khai.
- [Kế hoạch và nhật ký](../../ui/Feature_A12_Notifications.md); [bằng chứng review/API trước](A12_20261101_151949_review_plan.md).

## Căn cứ và thao tác

Đọc lại các mục A12 trong Master Plan và kế hoạch hiện có trước chỉnh sửa. Master Plan ghi source đã tích hợp bốn route, API runtime PARTIAL, frontend chưa đồng bộ. Người dùng yêu cầu chỉ thêm chức năng API phân trang; chức năng khác backend chưa hỗ trợ phải loại bỏ. Không gọi Stitch hoặc thử lại API trong phiên này; giữ bằng chứng và giới hạn của report trước, không tuyên bố đã xác minh mới.

## Thay đổi được ghi nhận

1. Kế hoạch mục1/3/5.1/5.2/6/7: chỉ mở rộng GET inbox hiện có, giữ page zero-based và50 items, thêm pagination.page/pageSize/total/totalPages; total theo principal + filter, unreadCount toàn hộp thư. Giữ envelope/items/hasNext để tương thích client/mobile cũ.
2. Quy định snapshot count/items, sort ổn định, empty totalPages0, trang vượt dữ liệu, refetch sau read/read-all; UI dùng tổng trang thật sau khi API được kiểm chứng.
3. Loại chức năng chưa có backend khỏi phạm vi/UI: tìm kiếm/lọc nâng cao, tạo/gửi/xóa/lưu trữ/đánh dấu chưa đọc, push/settings mới và nghiệp vụ mẫu chưa hỗ trợ. Không giữ placeholder/toast giả. Giữ chức năng đã có nhưng còn thiếu bằng chứng runtime, các trạng thái UI và shell chung.
4. Giữ JSX+CSS trong cùng Notifications.tsx, header/footer dùng chung và artifact Stitch bất biến. Bổ sung nhật ký vào plan, tạo report mới này, cập nhật các dòng A12 mục4/5.1/5.4/6.F trong Master Plan cùng liên kết/timestamp.

## Tiêu chí và trạng thái

| Tiêu chí | Kết quả |
|---|---|
| Kế hoạch chỉ mở rộng backend cho phân trang | PASS — phạm vi và contract đề xuất được ghi rõ |
| Chức năng backend chưa hỗ trợ loại khỏi kế hoạch sản phẩm | PASS — có danh mục giữ/loại và điều kiện nghiệm thu |
| API phân trang mới chạy thực tế | NOT_VERIFIED — chưa viết code hoặc gọi thử contract mới |
| UI/điều hướng/trạng thái/responsive/accessibility | NOT_VERIFIED trong phiên này; kết quả review gốc giữ nguyên |
| Stitch | Giữ nguyên; không thao tác công cụ trong phiên tài liệu |

## API và giới hạn

Bốn route hiện có: GET `/api/me/notifications`, GET `/api/me/notifications/count`, POST `/api/me/notifications/:id/read`, POST `/api/me/notifications/read-all`. Report trước ghi GET200 hộp thư rỗng, read-all no-op200, negative400/401/404. Metadata total/totalPages chưa tồn tại theo lần đối chiếu trước và chỉ mới được đưa vào kế hoạch; không mô tả như API đã hoạt động. Không chạy build/test vì không sửa source. Chưa kiểm chứng item thật, mutation có dữ liệu, cross-user và nhiều trang.

## Kết quả cuối

Đã bổ sung kế hoạch theo yêu cầu; trạng thái triển khai vẫn NEEDS_REVIEW, frontend giữ kết luận KHÔNG ĐẠT của review trước, API PARTIAL. Đã giải quyết quyết định phạm vi; các lỗi source/runtime chưa được sửa. Chỉ chỉnh ba file Markdown: plan, report mới, Master Plan; không sửa report cũ hoặc màn khác. Mọi thay đổi phiên này đã có dòng nhật ký trong plan.
