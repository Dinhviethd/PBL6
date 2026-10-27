# A6 — Thanh toán & xác nhận đơn hàng: Kế hoạch tái hiện theo Stitch

## Phạm vi và nguồn xác minh
- Stitch project: `10374042969343935993` (EventHub)
- Màn hình: `A6` — `Thanh toán & xác nhận đơn hàng`
- Screen ID: `682d24a1b87b410dbbbcc01baa983b21`
- Kích thước: 1280 × 1934 px (DESKTOP)
- Design system: Cosmic Graffiti (dark `#080B1A`, surface `#10162B`, primary `#7C3AED`, secondary `#22D3EE`, tertiary `#F472B6`, text `#F8FAFC`/`#94A3B8`, Syne/Be Vietnam Pro/Space Grotesk, ROUND_EIGHT)
- Route hiện tại: `/checkout/:id` (Guarded)
- Code hiện tại: `client/src/pages/booking/Checkout.tsx`
- Tài liệu tham chiếu: `docs/PROJECT_MASTER_PLAN.md`, `docs/reports/stitch/A6_20261027_224542_review.md`

## Mục tiêu
Tái hiện màn hình A6 theo đúng thiết kế đã có trên Stitch, giữ nguyên bố cục, màu sắc, kiểu chữ, thành phần. Chỉ tạo tài liệu kế hoạch, **không chỉnh sửa code frontend/backend** và **không chỉnh sửa màn hình trên Stitch**.

## Yêu cầu đặc thù
- **Phương thức thanh toán chính**: VNPay phải hiển thị lớn nhất làm phương thức chính.
- **Các phương thức khác**: vẫn hiển thị trên giao diện (theo thiết kế Stitch), nhưng khi người dùng chọn vào bất kỳ phương thức thanh toán nào khác ngoài VNPay, hệ thống phải hiển thị thông báo **"Chức năng sẽ sớm được cập nhật"** phía dưới màn hình.
- Không thêm hay chỉnh sửa source code.
- Không cố gọi `edit_screens` để chỉnh sửa màn hình trên Stitch.
- Chỉ copy lại giao diện đã có trên Stitch.

## Đối chiếu hiện trạng vs Stitch
| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| Thông tin đơn hàng (sự kiện, hạng vé, số lượng, giá, tổng tiền) | Cần đồng bộ | So sánh với bố cục A6 |
| Thời gian giữ chỗ đếm ngược | Cần đồng bộ | Giữ logic hiện tại nhưng đồng bộ style |
| Phương thức thanh toán (VNPay + các phương thức khác) | **Cần điều chỉnh theo yêu cầu** | VNPay lớn nhất; phương thức khác click → thông báo "Chức năng sẽ sớm được cập nhật" |
| Nút hành động (Thanh toán/Hủy) | Cần đồng bộ | Theo thiết kế Stitch |
| Trạng thái PAID/EXPIRED/PENDING_PAYMENT | Cần đồng bộ | Giữ logic, đồng bộ UI |
| Header/Footer | Cần kiểm tra | Theo shell hiện tại của trang checkout |

## Tiêu chí nghiệm thu
- [ ] Bố cục, khoảng cách, màu sắc, kiểu chữ khớp với thiết kế A6 trên Stitch (Cosmic Graffiti)
- [ ] VNPay hiển thị lớn nhất làm phương thức thanh toán chính
- [ ] Các phương thức thanh toán khác vẫn hiển thị nhưng khi chọn hiện thông báo "Chức năng sẽ sớm được cập nhật" phía dưới màn hình
- [ ] Thông tin đơn hàng, tổng tiền, thời gian giữ chỗ hiển thị đầy đủ và chính xác
- [ ] Các trạng thái (PENDING_PAYMENT, PAID, EXPIRED) hiển thị đúng
- [ ] Responsive cơ bản (desktop/mobile) theo thiết kế
- [ ] Không thay đổi logic API hiện tại, chỉ điều chỉnh giao diện theo kế hoạch
- [ ] Không sửa code, chỉ tạo tài liệu

## Kế hoạch thực hiện (chỉ tài liệu)
1. **Xác minh thiết kế**: Đối chiếu kỹ bố cục A6 trên Stitch (project 10374042969343935993, screen 682d24a1b87b410dbbbcc01baa983b21) - lấy ảnh/screenshot và cấu trúc các khối.
2. **Lập danh sách thành phần**: Liệt kê các block (Thông tin đơn hàng, Thông tin thanh toán, Phương thức thanh toán, Nút hành động, Thông báo).
3. **Ánh xạ sang CSS hiện tại**: Xác định class cần điều chỉnh trong `client/src/pages/booking/Checkout.tsx` và `ticketing.css` (chỉ ghi nhận, không sửa).
4. **Thiết kế UI cho phương thức thanh toán**: 
   - VNPay: button/card lớn nhất, nổi bật (primary/cyan)
   - Các phương thức khác: hiển thị dưới dạng list/card, khi click (không phải VNPay) → set state `paymentNotice = "Chức năng sẽ sớm được cập nhật"` và hiển thị notice phía dưới màn hình
5. **Tạo báo cáo**: Đã tạo `docs/reports/stitch/A6_20261027_224542_review.md`
6. **Cập nhật Master Plan**: Đã cập nhật mục 5.1 A6 với review, vấn đề, báo cáo và thời điểm

## Vấn đề cần lưu ý
- Checkout.tsx hiện tại không có UI cho nhiều phương thức thanh toán - chỉ có logic VNPay/demo. Cần thêm UI hiển thị danh sách phương thức theo thiết kế Stitch nhưng xử lý theo yêu cầu.
- Không được hardcode giả mạo API.
- Chỉ tạo file tài liệu, không chạy lệnh build/test liên quan đến sửa code.

## Kết luận
Kế hoạch này chỉ dành cho việc **lên kế hoạch thực hiện lại** màn hình A6 theo thiết kế Stitch. Toàn bộ thay đổi code sẽ tuân thủ nghiêm ngặt các yêu cầu trên.
