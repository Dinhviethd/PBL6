# Báo cáo lập kế hoạch chuyển toàn bộ web sang mobile

Thời điểm: 2026-11-10 22:16:39 UTC+07. Phạm vi: A1–A13 (khách hàng/thông báo/phân công), B1–B12 (Ban tổ chức), C1–C12 (quản trị) và route phụ. Tên từng màn và phương án riêng tại [kế hoạch](../../ui/MOBILE_FULL_MIGRATION_PLAN.md), mục 4.

## Yêu cầu và trạng thái ban đầu

Người dùng yêu cầu lập plan chuyển toàn bộ giao diện web sang app, sắp xếp bố cục/màn hình cho điện thoại, bổ sung thiết kế tối ưu, tiêu chí đánh giá và kết quả kiểm thử. Master Plan yêu cầu giữ nguồn Stitch chuẩn, xác minh API trước tích hợp và tách trạng thái thiết kế/code/test.

Mobile có nền Customer/Staff, A1 đã triển khai trong working tree. Organizer/Admin chưa có phân hệ native; kế hoạch cũ giới hạn hai nhóm này ở web và tham chiếu project Stitch cũ. Phiên này lập kế hoạch mới bao phủ toàn bộ; không sửa các thay đổi source sẵn có.

## Thao tác thực tế

1. Đọc skill, Master Plan, kế hoạch mobile cũ, kế hoạch/báo cáo A1, audit 10/11; đối chiếu route web/mobile, package scripts và mobile AGENTS.
2. Stitch `get_project` và `list_screens` truy cập thành công project `10374042969343935993` (EventHub). List trả 38 entries, có biến thể B11; không đồng nhất số entries với mã màn chuẩn. A12 `34f73bfd827e4025b19d91f00e3b2b88`, A13 `267ab81578954891860a442f38b8319c` đã hiện diện. Screen IDs các màn khác tra bảng 5 Master Plan; alias B3/B4 và C9–C11 được giữ.
3. Không tải ảnh/HTML hoặc sửa/tạo screen Stitch trong phiên; metadata không đủ đánh giá trực quan. Download 401 là kết quả phiên A1 trước, không phải lỗi được thử lại phiên này.
4. Tạo kế hoạch 37 mã màn + route phụ, navigation theo vai trò, quy chuẩn mobile, backlog API, 6 đợt M0–M5, tiêu chí định lượng, kịch bản test và mẫu báo cáo kết quả.
5. Tham khảo tài liệu chính thức Apple/Android/W3C cho vùng chạm và contrast; liên kết nằm tại mục 5 của kế hoạch. Các ngưỡng hiệu năng/usability là mục tiêu dự án đề xuất.
6. Cập nhật Master Plan để điều hướng tới kế hoạch/báo cáo, không nâng trạng thái nghiệm thu từng màn.

## Tiêu chí và kết quả

| Tiêu chí | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| Kế hoạch bao phủ từng mã màn | PASS | 13 A + 12 B + 12 C, route phụ và bước kiểm kê hành động M0 |
| Phương án bố cục/điều hướng mobile | PASS ở mức tài liệu | Tab theo vai trò, stack, card, sheet, wizard, safe area, keyboard |
| Tiêu chí đánh giá và test plan | PASS ở mức tài liệu | Mục 8–10: đo được, gate release, kịch bản và mẫu evidence |
| Tính đầy đủ của inventory hành động/API | PARTIAL | Đã khảo sát route; M0 còn cần kiểm kê từng action/contract/runtime |
| Thiết kế trực quan từng màn native | NOT_VERIFIED | Chưa dựng/kiểm tra artifact mobile |
| API hoạt động thực tế | NOT_VERIFIED trong phiên | Chỉ đọc source/tài liệu, không gọi API nghiệp vụ; chưa tích hợp |
| Native UI/a11y/performance/UAT | NOT_VERIFIED | Chưa có lượt chạy trong phiên lập kế hoạch |
| Kết quả test lịch sử | Có nguồn, không phải test mới | A1: 26 unit và 18 UI mock PASS, export 3 platform PASS; audit web còn 9 FAIL |

Kết luận: **Hoàn thành tài liệu kế hoạch; CHƯA ĐỦ BẰNG CHỨNG nghiệm thu app toàn diện**. Các màn giữ nguyên trạng thái thiết kế/triển khai hiện hành. Không thực hiện build/test ứng dụng, thay config, triển khai hay ghi dữ liệu nghiệp vụ trong phiên.

## Tồn đọng và bước tiếp theo

- M0 kiểm kê đầy đủ action/contract, chốt wireframe mobile, thiết bị, owner và môi trường test riêng.
- Xác minh SePay/payment return, phân quyền tổ chức, camera, deep link, native persistence và build cài thực tế trước nghiệm thu.
- Xử lý baseline web UI failures; không coi tất cả là lỗi fixture nếu chưa điều tra.
- Ước lượng 40–60 ngày làm việc với nguồn lực nêu trong kế hoạch; chưa phải cam kết tiến độ.
- Kết quả kiểm thử mới phải có commit/build/device/evidence và phân biệt mock/API/native.

Tệp thay đổi trong phiên: `docs/ui/MOBILE_FULL_MIGRATION_PLAN.md`, báo cáo này và phần điều hướng/tiến độ của `docs/PROJECT_MASTER_PLAN.md`. Giữ nguyên các thay đổi đã có của người dùng.
