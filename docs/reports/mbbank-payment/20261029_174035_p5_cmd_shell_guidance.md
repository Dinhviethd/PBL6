# Hỗ trợ chạy runbook P5 trong Command Prompt

**Thời điểm:** 29/10/2026, 17:40 UTC+7  
**Mục tiêu:** Chẩn đoán lỗi người dùng chạy lệnh PowerShell `Invoke-WebRequest` trong Command Prompt và cung cấp lệnh tương đương.  
**Database:** Không truy vấn hay sửa DB trong phiên hỗ trợ này; user đã tự chạy `node server/scripts/sepay-local.cjs verify` thành công trước đó, xác nhận PostgreSQL local riêng. Không truy cập Supabase.

## Kiểm tra trạng thái

- User output xác nhận local DB guard PASS.
- Runtime API v2 Sandbox token field có giá trị cấu hình; không đọc/in token.
- Local API health kiểm tra từ phiên này trả HTTP 200 trên `127.0.0.1:8010`.
- `.local/sepay/simulation-order.json` vẫn tồn tại; trường status trong file là snapshot `PENDING` lúc tạo, nhưng DB kiểm tra trước đó cho thấy payment tương ứng đã `SUCCEEDED` và hết hạn. Không dùng lại cho P5.
- Tên backup `.local/sepay/simulation-order-p4.json` chưa tồn tại tại lần kiểm tra.

## Lệnh CMD tương đương

`Invoke-WebRequest` thuộc PowerShell; CMD không nhận lệnh đó. Dùng curl có sẵn trên Windows:

```cmd
curl.exe -sS -o NUL -w "HTTP %{http_code}\n" --max-time 10 http://127.0.0.1:8010/api/health
```

Hoặc dùng Node:

```cmd
node -e "fetch('http://127.0.0.1:8010/api/health').then(r=>{console.log('HTTP '+r.status);if(!r.ok)process.exitCode=1}).catch(()=>{console.error('API unavailable');process.exitCode=1})"
```

Sau khi HTTP 200, giữ fixture cũ rồi tạo payment mới:

```cmd
ren .local\sepay\simulation-order.json simulation-order-p4.json
node .local/sepay/prepare-simulation-order.cjs
```

Helper chỉ tạo payment PENDING qua local API đã guard và xuất amount/transferContent mới. Không nhập fixture cũ đã hết hạn vào SePay.

## Trạng thái

Chỉ cung cấp hướng dẫn; chưa chạy health bằng chính CMD của người dùng, chưa đổi tên fixture, chưa tạo payment P5 và chưa gửi mô phỏng SePay. Bước tiếp theo: người dùng chạy health bằng CMD, rename fixture, chạy helper, rồi dùng amount/transferContent mới theo [runbook API-only recovery](20261029_173150_p5_api_only_recovery_test_procedure.md).
