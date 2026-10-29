# B4 — Thành công ngay dưới nút tạo sự kiện

- Phiên: 2026-10-28 20:59–21:07 (Asia/Saigon).
- Phạm vi: thực hiện mục 10 của `docs/ui/Feature_B4_CreateEvent.md` theo yêu cầu người dùng; áp dụng skill `eventhub-stitch-review`.
- Kết quả: **ĐẠT** cho thay đổi inline success; các giới hạn hệ thống bên dưới vẫn còn.

## Nguồn và xác minh

Đã đọc Master Plan và skill. Xác minh lại bằng `get_project` và `get_screen`: project `10374042969343935993`, canvas B4 `d2adc0966946438da408cd7fe644c439`, title nội bộ vẫn ghi B3. HTML `3126640626866283910`, screenshot `5144337055934097385` giữ nguyên tham chiếu trước. Không gọi edit-screen hoặc thay đổi Stitch. Phiên này kiểm tra lại metadata/theme; không thực hiện lại toàn bộ visual audit thiết kế gốc. Thay đổi vị trí success/CTA được người dùng yêu cầu rõ; màu tím, cyan, kiểu chữ và sidebar kế thừa B4 hiện có.

## Thay đổi

- `client/src/pages/organizer/CreateEventPage.tsx`: bỏ success-only render, giữ form/preview và URL `/organizer/new`. Sau POST thành công có ID và status DRAFT, báo **Tạo bản nháp thành công** ngay dưới submit, tiếp theo là link **Tạo loại vé** đến `/organizer/events/{id}/tickets`.
- Khóa nhập liệu, upload/drop, lưu/xóa nháp và submit sau thành công; submit hiển thị **Đã tạo bản nháp**. Guard bảo vệ cả submit chương trình và drop. CTA nằm ngoài fieldset bị khóa. `aria-busy` chỉ phản ánh request/upload, focus vào vùng success bằng `preventScroll`, có live status.
- Xóa local draft chỉ sau xác nhận server; nếu xóa storage lỗi vẫn giữ thông báo thành công và CTA. Không tự chuyển trang, không tự retry POST khi phản hồi thiếu ID.
- `client/src/pages/organizer/create-event.css`: cụm success xếp dọc dưới submit; mobile các nút chiếm chiều rộng phù hợp, bỏ style success cũ.
- Cập nhật assertion cũ trong `client/tests/create-event-live.spec.ts`; mở rộng `client/tests/create-tickets-live.spec.ts` để kiểm tra inline, responsive, lỗi và bàn phím.
- Cập nhật plan B4 và Master Plan, tạo report này cùng ảnh mới; không ghi đè report cũ. Không thay đổi backend, source B5, sidebar hoặc màn hình khác trong phiên. Giữ nguyên thay đổi đã tồn tại trong workspace trước phiên.

## Kiểm thử thực tế

Môi trường: PostgreSQL 16 container riêng `eventhub-b4-inline-test`, DB `eventhub_inline_test`, API fixture source cổng 8015, Vite cổng 5176. Đăng nhập organizer@example.test với mật khẩu người dùng cung cấp trong DB test cô lập; không ghi mật khẩu/token vào báo cáo, không dùng dữ liệu production.

| Kiểm tra | Kết quả |
|---|---|
| `server/test/create-tickets.integration.test.cjs --serve` | 41 HTTP assertions PASS: tạo DRAFT, chưa vé submit 400 MISSING_TICKETS, ticket CRUD, quyền sở hữu, submit PENDING_REVIEW và khóa sửa sau gửi |
| `npx playwright test tests/create-tickets-live.spec.ts` | 3 tests PASS (14,0 giây), dùng Chrome/API thật; riêng phản hồi thiếu ID được chủ động fault injection |
| Giữ URL/form/preview, inputs và submit disabled, focus success, aria-busy=false | PASS |
| Link nằm dưới submit, đúng ID, không tràn ngang ở 1440/768/390 | PASS; ảnh trong liên kết bên dưới |
| Submit lại qua requestSubmit không tạo trùng; Enter trên link sang B5 | PASS; test lỗi ghi nhận đúng 1 POST thật |
| Mất mạng giữ form, không success; phản hồi thiếu ID không CTA | PASS; thiếu ID là kiểm thử giả lập lỗi contract, không dùng làm bằng chứng API thật |
| localStorage.removeItem ném lỗi vẫn giữ success/CTA; drop sau thành công không upload hoặc ghi lại nháp | PASS |
| B4 → B5 thêm/sửa/ngừng dùng vé, tải lại, gửi duyệt; truy cập khác owner bị chặn | PASS |
| ESLint các file TSX/test đã thay đổi | PASS |
| `npm run build` client | PASS; còn cảnh báo chunk lớn và dữ liệu Browserslist/baseline cũ |

Hai lượt test ban đầu lỗi locator quá rộng (`role=status` có hai phần tử; `name=description` khớp meta). Đã sửa scope selector và chạy lại toàn bộ 3 tests thành công. Bộ B4 upload đầy đủ cũ chỉ được cập nhật assertion, không chạy lại trong phiên này.

Ảnh cụm hành động: [1440](assets/B4_20261028_205941_inline/b4-inline-1440.png), [768](assets/B4_20261028_205941_inline/b4-inline-768.png), [390](assets/B4_20261028_205941_inline/b4-inline-390.png). Thư mục cũng có ảnh B5 trong lượt kiểm thử luồng tiếp nối. Đã kiểm tra trực quan ảnh mobile và cải thiện thành một cột.

## Giới hạn và bước tiếp theo

- ID server chưa được lưu để phục hồi success sau reload; quay lại sự kiện bằng danh sách hiện có.
- API chưa có idempotency: không cam kết chống trùng khi server commit nhưng mất phản hồi hoặc qua reload. Guard chỉ bảo vệ phiên UI hiện tại.
- Không triển khai autosave server; không audit accessibility đầy đủ hoặc chạy lại upload trong phiên này.
- Không rebuild/deploy Docker ứng dụng cổng 8000. Xác minh dùng API source trên DB riêng.
- Đã dừng API/Vite test và hủy container DB riêng; phiên này không upload media mới.
