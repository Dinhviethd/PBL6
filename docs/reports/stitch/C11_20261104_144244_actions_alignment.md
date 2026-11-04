# C11 — Thu gọn và căn giữa nhóm thao tác trên thẻ sự kiện

- Thời điểm: 2026-11-04 14:42:44 UTC+07; loại phiên: chỉnh giao diện frontend.
- Màn hình: C11, Hàng đợi thẩm định và phê duyệt sự kiện, `/admin/events/review`.
- Stitch: project `10374042969343935993`, canvas C11, screen `5ed99a94ec5d44448ae0703061ef61ae`. Thiết kế Stitch đã có; phiên này không gọi công cụ Stitch và không thay đổi artifact. Đây là chỉnh căn lề theo yêu cầu trực tiếp của người dùng.
- Master Plan đầu phiên: C11 đã triển khai, `ĐẠT CÓ ĐIỀU KIỆN`, dùng AdminShell và API thật; phạm vi đã bỏ AI/SLA/hồ sơ pháp lý/Escrow/duyệt hàng loạt/PDF và các chi tiết ngoài scope khác. Báo cáo triển khai trước: [C11 implementation](C11_20261104_140907_implementation.md).

## Yêu cầu và tiêu chí nghiệm thu

Thu nhỏ `.c11-card-actions` và căn giữa trong component thẻ sự kiện. Tiêu chí: khung không kéo giãn theo chiều cao card, tối đa 224px; nằm giữa theo chiều dọc tại layout ba cột và giữa theo chiều ngang khi chiếm hàng riêng; nút không cắt chữ hoặc làm tràn trang ở bốn viewport.

## Thao tác và bằng chứng

1. Đọc `docs/PROJECT_MASTER_PLAN.md` trước khi sửa và đối chiếu quy trình skill. Kiểm tra CSS C11 cùng các breakpoint hiện có.
2. Sửa duy nhất `.c11-card-actions` trong `client/src/pages/admin/C11ApproveEvent.tsx`: thêm `align-self:center`, `justify-self:center`, `width:100%`, `max-width:224px`, `box-sizing:border-box`; bỏ `justify-content:flex-end`. Ở breakpoint ≤1100px, giữ grid span nhưng bỏ bố trí hàng ngang/dạt phải để khung ôm nội dung và nằm giữa. Nút, nội dung, luồng API và shell giữ như trước.
3. `npm run build` ở `client/`: PASS. `npx eslint src/pages/admin/C11ApproveEvent.tsx`: PASS. Cảnh báo Browserslist và kích thước chunk vẫn xuất hiện từ build hiện có.
4. Chrome headless trên Vite `localhost:5173`/API địa phương: đăng nhập ADMIN và đo DOM tại 1440, 1024, 768, 390px bằng script QA `.local/qa/c11-actions-check.cjs` (không thuộc source được theo dõi). Kết quả: khung rộng đúng 224px, cao 117.78px; desktop 1440 căn giữa dọc; 1024/768/390 căn giữa ngang; cả bốn đều nằm trong card, nút không bị cắt và trang không tràn ngang. Không gửi request duyệt/từ chối.
5. Lần kiểm tra đầu của script giả định dữ liệu local có đúng một card, nhưng runtime có hai card; script được sửa để chờ tải xong và kiểm tra ít nhất một card. Chạy lại PASS. Đây là sửa giả định của QA, không phải lỗi giao diện.

## Review theo tiêu chí skill

| Tiêu chí | Kết quả | Ghi chú |
|---|---|---|
| Bố cục và tính nhất quán | PASS | Nhóm thao tác gọn và căn giữa theo từng layout; không đổi thành phần khác. |
| Responsive | PASS trong phạm vi này | Đo DOM bốn viewport, không cắt nút/tràn trang. |
| Tương tác và API | PARTIAL | Build/lint qua; không chạy lại toàn bộ luồng duyệt vì chỉ sửa CSS. API đã kiểm ở báo cáo triển khai trước, không kiểm lại trong phiên này. |
| Nội dung, màu, typography | PASS | Không sửa. |
| Accessibility đầy đủ | NOT_VERIFIED | Chưa kiểm screen reader/contrast và các trình duyệt khác. |

Kết luận: **ĐẠT CÓ ĐIỀU KIỆN** cho C11 theo phạm vi đã chốt; chỉnh căn giữa/thu nhỏ đã được xác minh. Thiết kế Stitch cuối phiên không đổi. Không phát sinh vấn đề mới; các giới hạn a11y, trình duyệt khác, pixel diff, benchmark và static rollout của báo cáo triển khai vẫn còn. Master Plan được cập nhật tại hàng C11 của mục 5.3/5.4 với kết quả, report và thời điểm phiên này.
