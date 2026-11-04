# C8 — chỉ giữ một thanh tiến độ vé phát hành

| Mục | Giá trị |
|---|---|
| Thời điểm | 2026-11-03 22:32 UTC+07 |
| Phạm vi | Theo yêu cầu: chỉ giữ một progress bar cho số vé phát hành; check-in vẫn là số + tỷ lệ, không có thanh riêng. |

## Thay đổi

- Cột “Vé · check-in” hiển thị `vé phát hành / sức chứa` cùng một progress bar tính theo `ticketsIssued / ticketCapacity`.
- Check-in giữ dạng chữ: số check-in và tỷ lệ; bỏ check-in progress bar.
- Không đổi endpoint, dữ liệu, API, route hoặc Stitch.

## Xác minh

- Client build và lint PASS.
- Rebuild/recreate `api` bằng `docker compose up -d --build api` để cập nhật bundle frontend.
- Chrome runtime local 1440×900: 10 dòng có đúng 10 progress bars; check-in bars = 0; số vé phát hành/check-in và doanh thu còn hiển thị.
- Mobile 390×844: document không tràn ngang (390px); bảng tiếp tục cuộn ngang riêng.

Kết quả mẫu hiển thị: `1 / 35 vé phát hành`, `1 check-in · 100%`; doanh thu hàng đầu 15.000 VND. Không ghi dữ liệu nghiệp vụ.

## Kết luận

Đã đơn giản hóa đúng yêu cầu. Report kiểm tra dữ liệu và hai thanh trước khi tinh giản: [`C8_20261103_222600_metrics_ui_fix.md`](C8_20261103_222600_metrics_ui_fix.md).
