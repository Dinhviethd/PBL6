# L0: xác nhận phạm vi DEMO_PASSWORD

**Thời điểm:** 29/10/2026 23:34 UTC+7. Bổ sung [báo cáo rà soát credential](20261029_233321_l0_contract_secret_review.md).

Người dùng xác nhận giá trị `DEMO_PASSWORD` trùng các file tracked chỉ dùng cho tài khoản demo/test. Đây là xác nhận phạm vi sử dụng, chưa được kiểm chứng độc lập trên các môi trường hay tài khoản. Không ghi giá trị mật khẩu vào báo cáo.

| Tiêu chí | Kết quả |
|---|---|
| Phạm vi sử dụng DEMO_PASSWORD | Đã xác nhận theo người dùng: demo/test. Không xem đây là bằng chứng credential production bị lộ. |
| Cặp credential Cloudinary | Vẫn cần xử lý: người dùng đã xác nhận đang sử dụng; đã thay giá trị trong file mẫu workspace, chưa có xác nhận xoay vòng hay xử lý bản sao/lịch sử. |
| Secret scan toàn diện | Chưa đạt: phép so khớp trước chỉ bao phủ các giá trị và file cụ thể được mô tả trong báo cáo trước, không bao phủ lịch sử hay toàn bộ dạng secret. |
| L0 | Chưa hoàn thành: còn các điều kiện contract, coexistence, project/runtime role, backup/PITR và deployment. |

Không chạy kiểm thử nghiệp vụ, truy cập database hoặc thay đổi credential trong bước ghi nhận này. `git diff --check` trước khi ghi báo cáo trả exit 0, có cảnh báo LF/CRLF đã biết tại file UI.
