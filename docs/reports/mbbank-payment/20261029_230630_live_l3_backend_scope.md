# Báo cáo điều chỉnh phạm vi L3 — SePay Live backend

**Thời điểm:** 29/10/2026, 23:06 UTC+7.  
**Mục tiêu:** Theo yêu cầu mới, đưa UI ra khỏi giai đoạn hiện tại; tập trung API, worker và migration Supabase để kiểm tra backend thực tế.

## Đã cập nhật

- [Plan Live](../../MBBank_SePay_Live_Plan.md): L3 chỉ triển khai backend/API/worker, chuẩn bị migration và kiểm thử bằng API client; checkout/admin UI để sau khi có yêu cầu riêng. L4 mô tả kiểm tra API với Supabase sau các cổng phê duyệt và triển khai tương ứng.
- Phân loại tám route đã có source: ba route buyer/webhook bắt buộc, một route reconcile cho khôi phục, bốn route admin phục vụ tra soát; tất cả cần hoàn thiện Live, chưa tự xem là đã chạy Live. Không thêm endpoint config chỉ để phục vụ UI trong phạm vi này.
- Bổ sung vai trò ba bảng `sepay_payment_details`, `sepay_transactions`, `sepay_transaction_reviews`; FK/index/RLS/ACL và khả năng cần migration additive khác nếu thiết kế concurrency yêu cầu. Dẫn sang inventory chi tiết trong plan gốc.
- Phân biệt Supabase staging/branch cô lập với database hiện tại có dữ liệu thật; không tự seed, tạo giao dịch Test hoặc chạy runtime trên DB Live khi chưa có phương án và cho phép cụ thể. DDL, runtime, seed/test ghi và chuyển khoản thật là các bước cần xác định riêng.
- [Plan gốc](../../MBBank_Payment.md) đã cập nhật liên kết và bảng tiến độ. Yêu cầu giữ demo/VNPAY sandbox trong môi trường phù hợp vẫn được giữ.

## Kiểm tra và giới hạn

| Mục | Kết quả |
|---|---|
| L3 không có UI | PASS theo nội dung tài liệu; UI là phạm vi tương lai. |
| API cần thiết và Supabase | PASS ở mức kế hoạch; source/backend Live và migration chưa được triển khai theo kế hoạch này. |
| Kiểm thử thực tế Supabase | NOT RUN trong phiên điều chỉnh; chỉ mô tả điều kiện và tiêu chí thực hiện ở L4. |
| Migration/ghi dữ liệu Supabase, cấu hình Live, chuyển tiền | NOT RUN. Không có code/runtime/DB thay đổi. |

Không thể bảo đảm migration không ảnh hưởng dữ liệu hiện hữu chỉ bằng plan; phải đối chiếu schema hiện hành, backup/restore và rehearsal trước thao tác DDL. Các report lịch sử vẫn mô tả trạng thái tại thời điểm của chúng.
