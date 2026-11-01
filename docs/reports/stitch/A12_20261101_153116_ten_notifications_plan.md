# A12 — Kế hoạch 10 thông báo mỗi trang

- Màn hình: A12 — Thông báo của bạn.
- Thời điểm: 2026-11-01 15:31:16 UTC+07 (Asia/Ho_Chi_Minh).
- Project Stitch `10374042969343935993`, screen `34f73bfd827e4025b19d91f00e3b2b88` theo [review gốc](A12_20261101_151949_review_plan.md); không truy cập hoặc chỉnh Stitch trong phiên này.
- [Kế hoạch và nhật ký](../../ui/Feature_A12_Notifications.md).

Đã đọc các mục A12 trong Master Plan và đối chiếu kế hoạch trước chỉnh sửa. Theo yêu cầu mới, thay đề xuất50 bằng10 thông báo/trang trong contract dự kiến: pageSize10, OFFSET page×10, tối đa10 items, LIMIT11 nếu truy vấn dư một hàng, totalPages=ceil(total/10). Frontend dùng trang API trực tiếp, không cắt10 từ lô50. Cập nhật kiểm thử biên0/1/10/11/20/21 thông báo, lưu ý kiểm tra consumer web/mobile không giả định kích thước50 trước rollout.

Chỉ mở rộng backend cho phân trang; chức năng khác chưa hỗ trợ vẫn loại khỏi kế hoạch/UI. Header/footer chung, JSX+CSS cùng file và nguyên tắc chỉ hiển thị trạng thái thực giữ nguyên. Số50 trong bằng chứng API và nhật ký cũ được giữ làm lịch sử, không còn là yêu cầu triển khai hiện hành.

Đã sửa plan (ngày cập nhật, report mới nhất, mục5.1, checklist7, nhật ký8), tạo report mới này, cập nhật riêng các mục A12 tại Master Plan4/5.1/5.4/6.F gồm yêu cầu10/trang, liên kết và thời điểm. Không ghi đè report cũ; không sửa source hoặc màn khác.

Kết quả tài liệu: PASS về ghi nhận yêu cầu10/trang. Trạng thái triển khai vẫn NEEDS_REVIEW; review frontend KHÔNG ĐẠT/API PARTIAL từ phiên trước giữ nguyên. Bốn API inbox/count/read/read-all không được gọi lại; contract mới chưa triển khai, chưa có bằng chứng runtime pageSize10. Các tiêu chí API có dữ liệu, mutation, quyền, responsive/accessibility vẫn NOT_VERIFIED trong phiên này. Không chạy build/test vì chỉ sửa Markdown. Chưa giải quyết lỗi UI/API bằng code.
