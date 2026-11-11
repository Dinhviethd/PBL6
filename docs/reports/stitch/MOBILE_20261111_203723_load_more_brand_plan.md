# Kế hoạch mobile — tải thêm và logo ứng dụng

Yêu cầu đã duyệt: thực hiện ý tưởng phân trang mobile và dùng logo web làm hình ảnh ứng dụng. Giữ nghiệp vụ/API/quyền/route. Không chỉnh artifact Stitch.

Phạm vi trước sửa:
- A2 khám phá: nối kết quả và tự tải khi gần cuối, có Tải thêm dự phòng; đổi bộ lọc/reset/pull-refresh quay trang0.
- A8 ví vé, A12 thông báo: Tải thêm; giữ dữ liệu đã xem khi trang sau lỗi, không trùng ID, retry đúng trang. Thông báo polling/mark-read tải lại các trang đã nạp để không giật mất danh sách.
- A9 đơn hàng: giữ phân trang gọn vì là danh sách tra cứu. Staff và BTC/Admin giữ pager gọn, ẩn khi page0 không có trang sau. Ẩn khi loading/lỗi để không hiểu nhầm hết dữ liệu.
- Hook tích lũy page dùng API cũ; khóa request trùng, bỏ response cũ khi đổi filter/account/focus; không thay API client hoặc backend. Refresh tải trang0, polling refreshLoaded không bỏ các trang đã nạp.
- Logo nguồn client/public/logo.png (AuthHeader/AuthFooter web),959x426,RGBA, hiện trùng mobile/assets/logo.png. Giữ logo nguyên vẹn, xuất icon1024opaque và adaptive foreground1024 trong safe zone; cấu hình Expo icon/android adaptive/favicon. Không tạo thương hiệu mới.
- Kiểm tra typecheck/lint/unit; test UI tải tiếp/duplicate/failure/retry/reset/short-page/session; export, build/cài native và xác minh launcher khi khả dụng. Ghi report mới và cập nhật Master Plan.

Nguồn: Master Plan, mobile/AGENTS.md, appllama-app-design-skill/eventhub-stitch-review; Expo57 app icon docs, React Native FlatList docs. API hiện có và metadata/ảnh Stitch A2/A8/A9/A12 từ các phiên trước là nền tham chiếu; thay đổi presentation được yêu cầu mới chấp thuận.
