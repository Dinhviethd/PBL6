# L0: rà soát contract và credential cục bộ

**Thời điểm:** 29/10/2026 23:33 UTC+7. **Kết luận:** L0 chưa hoàn thành; phát hiện credential Cloudinary đang dùng xuất hiện trong file mẫu đã theo dõi Git. Đã thay bằng placeholder trong workspace; người dùng cần xoay vòng credential và kiểm tra lịch sử/bản sao theo quy trình riêng. Không ghi giá trị vào báo cáo.

## Contract và cấu hình

| Hạng mục | Đánh giá | Bằng chứng source |
|---|---|---|
| 8 route SePay | Có source; Live BLOCKED | Hai buyer route được Bearer bảo vệ, body tạo payment strict empty, GET polling 30/phút/user trong process; webhook raw JSON/HMAC, bốn route transaction và reconcile yêu cầu ADMIN. Chỉ tồn tại khi `config.sepay` được truyền vào app. |
| Runtime | BLOCKED | `main.ts` chưa truyền SePay config, `SepayConfig` chỉ nhận `test`, API v2 cố định Sandbox; worker chung chưa thực hiện inbox SePay theo plan. Chưa chạy Live. |
| Reconcile | BLOCKED cho Live | Range 5–1440 phút, timeout 10s, tối đa 10 trang; khóa và giới hạn request theo process, không có bằng chứng khóa giữa instance. |
| Provider cũ | PASS về guard; coexistence BLOCKED | Guard production chặn demo/provider thử; `SEPAY_LEGACY_MODE` không cho bật SePay và provider thử trong cùng process. Không chứng minh staging 3 phương thức hoặc race trong phiên này. |
| Xác minh runtime/DB | Chỉ metadata PASS | [Báo cáo TLS](20261029_233018_l0_supabase_tls_recheck.md); mapping tên project, runtime process, least privilege và backup/PITR vẫn chưa đủ bằng chứng. |

## Kiểm tra credential

- Kiểm tra chính xác 7 giá trị cấu hình nhạy cảm đủ dài đang có trong `server/.env` so với nội dung văn bản file Git tracked/untracked không bị ignore. Đây là so khớp hạn chế, không phải secret scanner toàn diện; không đọc lịch sử Git, file ignored, file binary hoặc các biến môi trường khác. Không in giá trị.
- Trước sửa: `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` trùng `server/.env.example`, là file tracked. Người dùng xác nhận là credential đang dùng. Đã thay hai giá trị ở file mẫu bằng placeholder; không thay `.env` đang chạy hoặc thu hồi credential từ nhà cung cấp. **Cần xoay vòng cả cặp và cập nhật nơi chạy bằng kênh an toàn; bản Git/history/bản sao vẫn có thể chứa giá trị cũ.**
- Sau sửa, đối chiếu lại không thấy hai giá trị Cloudinary đó trong phạm vi quét. `DEMO_PASSWORD` vẫn trùng README và một số test tracked; đã hỏi người dùng xác nhận có dùng ngoài demo/test hay không. Không kết luận an toàn khi chưa biết phạm vi sử dụng.
- `git check-ignore` xác nhận `server/.env` và CA trong `.local` được ignore. Không khẳng định toàn bộ repo hoặc lịch sử không có secret.

## Dấu vết source và kiểm thử

- Không commit theo yêu cầu người dùng. Dấu SHA-256 tổng hợp `40e268ceb851f3cec800b1f4d99a598d1cf9094f8d749c45f2f8ab9d719e73e0`: duyệt đường dẫn Git tracked/untracked nonignored theo thứ tự, hash tên đường dẫn + hash từng file; 454 file, bao gồm 58 file binary trong fingerprint; loại script audit tạm và hai plan/báo cáo MBBank đang cập nhật. Fingerprint là snapshot cục bộ, không thay thế commit; do không lưu manifest, chỉ hữu ích nếu tái lập cùng thuật toán và phạm vi.
- `node --test test/sepay.test.cjs test/sepay-v2.test.cjs test/sepay-local-guard.test.cjs`: **13/13 PASS**; unit/mock/local guard, không kiểm thử DB thật hoặc Live. Dùng output build trước đó, không thay code backend trong bước này.
- `git diff --check`: PASS, có cảnh báo LF/CRLF cho file UI đã thay đổi trước đó. Script audit tạm đã xóa.

## Việc tiếp theo

Xoay vòng credential Cloudinary bị lộ và kiểm tra nơi đã sao chép; xác nhận phạm vi DEMO_PASSWORD. Tiếp tục review/kiểm thử contract và tách biệt môi trường. Chưa có bằng chứng đủ để đóng L0, apply DDL, chạy payment Live hoặc kết luận secret sạch.
