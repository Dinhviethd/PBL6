# B6 — Kiểm tra backend Docker đang chạy

- **Màn hình:** B6 — Quản lý đơn hàng, Organizer.
- **Thời điểm:** 2026-10-31 00:27:21 UTC+7; hành động: kiểm tra Docker runtime và chuẩn bị image ứng viên.
- **Stitch:** project `10374042969343935993`, screen `391bc738f4ea4e25be5e43993616ca7f`; không gọi hoặc sửa Stitch trong phiên này. Thiết kế giữ nguyên theo report frontend trước.
- **Yêu cầu/tiêu chí từ Master Plan:** API B6 và frontend đã qua test cô lập nhưng cổng 8000 chưa chạy route mới. Cần xác định image/container thực tế, xác minh build Docker chứa hai GET B6 và giao diện, không coi build là rollout.

## Kết quả kiểm tra

| Hạng mục | Bằng chứng |
|---|---|
| Runtime hiện tại | `pbl6-api-1` dùng image `eventhub-local` ID `sha256:958a471e95f6f26460f18cb49dcb98c2b551f4d54e21a2e711954a7250b3d0fa`, tạo ngày 2026-10-30 15:35:03Z. Bind `127.0.0.1:8000→8080`; container healthy. |
| Route B6 trong container | Đọc `/app/dist/app.js` ngay trong `pbl6-api-1`: cả `order-manager` và `orders/:orderId/tickets` đều **không có**. HTTP `/api/health` 200; GET order-manager với UUID giả, không token, trả 404. |
| Cơ chế Docker | `compose.yaml` dùng `image: eventhub-local`, `build: .`; source không bind mount vào `/app`, chỉ mount chứng chỉ TLS và uploads. Vì vậy code workspace không tự cập nhật vào container. `client/.env.local` proxy tới `127.0.0.1:8000`. |
| Image ứng viên | `docker build -t eventhub-b6-candidate:20261031 .` **PASS**; image ID `sha256:2b75e08ef4a99f9fe7fd13c023eb818dabc1ed8ae93acbba9d2e4cb2bf014639`. Kiểm tra read-only bên trong image: hai route B6 và chuỗi giao diện B6 trong bundle đều có. `docker compose -f compose.yaml config -q` PASS. |
| Container sau build | `pbl6-api-1` vẫn chạy image `eventhub-local` cũ; chưa tag ứng viên thành image chính, chưa recreate/restart API hoặc worker. Không có request authenticated tới runtime mới vì runtime mới chưa được khởi chạy. |

## Rà soát theo skill

| Tiêu chí | Kết quả |
|---|---|
| Nguồn thiết kế/Stitch | `NOT_VERIFIED` mới trong phiên này; dùng screen B6 đã xác minh trước, không thay thiết kế. |
| API method/path trên image ứng viên | `PASS` kiểm source build trong image; HTTP authenticated trên image ứng viên `NOT_VERIFIED` vì chưa chạy container đó. HTTP/DB test cô lập của source đã PASS tại report trước. |
| Docker runtime 8000 có API B6 | `FAIL`: image cũ, route vắng mặt/404. |
| Frontend/API hiện dùng được tại 5173→8000 | `FAIL` cho B6 do proxy đang tới container cũ. |
| Phạm vi file và màn hình | Không sửa frontend/backend/Stitch; chỉ tạo report và cập nhật tài liệu B6/Master Plan. Các màn khác giữ nguyên. |

## Giới hạn và bước triển khai còn lại

`compose.yaml` nạp `server/.env`, chạy API và worker SePay với kết nối Supabase PostgreSQL qua TLS. Thay container API đang chạy là rollout lên stack có thanh toán đang hoạt động, có thể ngắt request ngắn hạn. Phiên này chỉ chuẩn bị image để kiểm tra được; **chưa triển khai**. Khi được phép rollout, cần dùng image ứng viên, recreate riêng service `api`, xác minh health/route và theo dõi worker/webhook; không cần sửa schema cho B6. Giữ image cũ để có đường rollback. Không ghi thông tin bí mật từ `.env` vào report.

**Kết luận:** câu trả lời cho yêu cầu kiểm tra là **chưa**: backend B6 chưa được đưa vào container Docker đang chạy. Image ứng viên đã build và được kiểm tra tĩnh, nhưng chưa chứng minh chạy thành công với cấu hình Live. Master Plan mục 4 dòng 13, 5.2 B6, 5.4 B6 và 6.F được cập nhật trạng thái runtime, image ứng viên, vấn đề và link report; `Feature_B6_OrderManager.md` được cập nhật nhật ký phiên.
