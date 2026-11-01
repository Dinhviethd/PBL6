# A13 — Sự kiện được phân công

## 1. Phạm vi và kết luận

Kế hoạch và nhật ký tái hiện `/checkin` theo skill `eventhub-stitch-review`, ngày 2026-11-01. Hai phiên đầu chỉ lập tài liệu; người dùng sau đó yêu cầu thực hiện plan. Phiên triển khai đã sửa frontend/backend đúng phạm vi, kiểm thử trên database riêng; không sửa Stitch hoặc database Live.

- Nguồn chính thức: project `10374042969343935993`, screen `267ab81578954891860a442f38b8319c`, tên “A13. Sự kiện được phân công - EventHub”.
- Metadata: DESKTOP 2560×6438; HTML khai báo 1280×3219. Đã đọc HTML và xem ảnh bằng MCP `download_file`.
- Route hiện hữu: `/checkin` → `client/src/pages/staff/StaffAssignments.tsx`; đích quét `/checkin/events/:id` → `StaffCheckin.tsx`.
- Kết quả hiện tại: **ĐẠT CÓ ĐIỀU KIỆN trên source và DB test riêng**, frontend/API đã triển khai; runtime local8000 chưa nạp bản mới. Phạm vi chốt16:09:05: chỉ bổ sung API **ảnh sự kiện và tổng số trang**, loại khỏi UI các nội dung khác chưa có backend.
- [Báo cáo triển khai và kiểm thử](../reports/stitch/A13_20261101_162123_implementation.md).
- [Báo cáo chốt phạm vi mới](../reports/stitch/A13_20261101_160905_api_scope_plan.md).
- [Báo cáo phiên và bằng chứng HTTP](../reports/stitch/A13_20261101_155717_review_plan.md).

Master Plan trước phiên review đầu chưa có dòng A13; đã bổ sung và cập nhật theo từng report. Mục4 dòng15 ghi luồng check-in/nhân viên, mục7 yêu cầu quyền đúng sự kiện và chống quét trùng. Kết quả hiện tại dựa test A13 và regression staff thực tế.

## 2. Các ràng buộc triển khai sau này

1. Giữ nguyên artifact Stitch. Không gọi edit-screen, không tạo bản sao thiết kế. Tái hiện bố cục đã xem, với ngoại lệ người dùng đã duyệt: bỏ các thành phần chưa có backend ngoài ảnh và tổng trang; thu gọn khoảng trống của phần bị bỏ.
2. Tái sử dụng `AuthHeader`/`AuthFooter` trong `pages/auth/AuthShell.tsx` qua shell có sẵn của `App.tsx`. Không chép header/footer mẫu ENVENTHUB/Cosmic Ticket hoặc tài khoản giả từ HTML.
3. JSX và CSS đặc thù A13 đặt chung trong `StaffAssignments.tsx`, trình bày nhiều dòng dễ đọc; CSS giới hạn trong `.a13-assignments`. Không tạo CSS riêng, không đưa CSS A13 vào stylesheet chung. Hook/API client/component dùng chung tiếp tục tái sử dụng.
4. Chỉ hiển thị một trạng thái trang: loading, error, empty hoặc danh sách thật. Không đưa thanh “Mô phỏng” vào sản phẩm. Danh sách có thể chứa nhiều phân công với các trạng thái khác nhau; không ép toàn bộ danh sách thành một loại trạng thái.
5. Nhãn tĩnh có thể giữ từ thiết kế; tên sự kiện, thời gian, địa điểm, quyền và thông báo nghiệp vụ phải theo backend. Không hard-code 5 thẻ, 2 lời mời, 1 ca hoặc Trang 1/2.
6. Không sửa scanner, B9/B11/B12, chức năng tổ chức hay database trong phạm vi A13 hiện tại. Mọi chỉnh sửa ở phiên sau phải có report mới và nhật ký bổ sung vào tài liệu này, đồng thời cập nhật Master Plan.

## 3. Bố cục và Cosmic Graffiti

Giữ container 960px, padding ngang 16/24px, khoảng cách khối 24px; nhãn nhân viên, H1 và mô tả; nút làm mới; danh sách card; phân trang. Bỏ thống kê tổng lời mời/ca trực vì chưa có API hỗ trợ. Card padding 20/24px, radius 12px, khoảng cách 16px; desktop có vùng thumbnail 128px bên trái và nội dung bên phải, mobile xếp dọc. H1 Syne 32/40px, tiêu đề card Syne 20/28px; body Be Vietnam Pro 16/24 hoặc 14/20px; nhãn Space Grotesk 12/16px. CTA chấp nhận gradient tím–cyan, mở quét cyan, từ chối nền trung tính; trạng thái đóng/từ chối giảm nhấn.

| Token | Artifact A13/project theme | Quy chuẩn chung trong skill |
|---|---|---|
| Nền | `#0f1222` | `#080B1A` |
| Card | `#1c1f2f` | `#10162B` |
| Tím CTA | `#7c3aed` | `#7C3AED` |
| Cyan | `#5de6ff`, container `#00cbe6` | `#22D3EE` |
| Chữ chính/phụ | `#e0e1f7` / `#ccc3d8` | `#F8FAFC` / `#94A3B8` |

HTML khớp namedColors/designMd của project đang truy cập; khác palette chung nên ghi nhận, không tự recolor artifact. Dùng token theo A13 cho vùng nội dung, giữ shell chung. Rounded card 12px khác mô tả ROUND_EIGHT tổng quát; ưu tiên hình/HTML nguồn cụ thể. Không chép kích thước trang cố định, overflow hidden, CDN Tailwind hay script mô phỏng sang React. Chưa có bằng chứng kiểm thử responsive/contrast/keyboard.

## 4. Điểm chưa đạt và dữ liệu còn thiếu

Bảng dưới ghi nhận gaps tại thời điểm review ban đầu và hướng xử lý. Shell/card/state/ảnh/phân trang/DTO/thời gian đã được triển khai, kiểm thử theo report16:21:23; phần ngoài phạm vi đã bỏ khỏi UI. Đây không phải danh sách lỗi chưa xử lý hiện tại. Còn runtime8000 chưa cập nhật, native/camera vật lý/contrast/screen-reader đầy đủ và benchmark chưa nghiệm thu.

| Mức | Phát hiện có căn cứ | Hướng xử lý trong kế hoạch |
|---|---|---|
| P1 | `/checkin` chưa thuộc `usesSharedHomeShell`; đang dùng shell cũ | Khi được triển khai, chỉ bổ sung route A13 vào shell chung, giữ Guard |
| P1 | Source chỉ có panel text và nút; thiếu thumbnail, badge, icon, bố cục/CTA theo Stitch | Tái hiện card/state panel và typography trong phạm vi đã chốt; không lấy ảnh sự kiện mẫu |
| P1 | GET assignments chưa trả ảnh | Bổ sung ảnh sự kiện vào API danh sách; chỉ dùng nguồn ảnh thật hiện hữu |
| Ngoài phạm vi | Chưa có danh mục, vị trí cổng/bàn trong DTO | Bỏ badge danh mục và cổng/bàn khỏi UI; không bổ sung API cho chúng |
| Ngoài phạm vi | Chưa có ngày phản hồi, ghi chú đến sớm30phút và thống kê toàn bộ lời mời/ca trực | Bỏ ngày từ chối, hướng dẫn ca và thống kê; chỉ giữ nhãn trạng thái đã có. Không bổ sung responded_at hoặc API thống kê |
| P1 | Lỗi tải lần đầu hiện Notice rồi vẫn có thể hiện Empty vì nhánh kiểm tra chỉ dựa loading/data | Tách error trước empty; lỗi phản hồi lời mời giữ danh sách nhưng hiển thị lỗi thao tác, không gán trạng thái thành công |
| P2 | `Assignment` khai báo `staff_name/staff_email` nhưng SELECT không trả; bỏ sót `invited_at` được trả thật | Chỉnh type theo contract khi được phép triển khai; không đọc field không tồn tại |
| P1 | Phân trang chỉ có lô50, hasNext suy từ length=50; chưa có tổng | Bổ sung metadata tổng trang từ backend theo mục5.1; giữ50/lô, không áp dụng mặc định10 của A12; kiểm thử0,1,50,51 và trang vượt phạm vi |
| P2 | `busy` toàn trang, chưa có phản hồi thành công rõ ràng; hạn lời mời tính lúc render | Nút đang gửi có trạng thái, ngăn gửi trùng; sau POST thành công reload GET; revalidate khi focus/làm mới, xử lý409 từ server |
| P2 | Hàm `when` dùng timezone trình duyệt | Dự kiến format rõ Asia/Ho_Chi_Minh và ngày đầy đủ, kể cả ca qua nửa đêm |
| P2 | Artifact chỉ minh họa pending/active/expired/declined, thiếu thẻ REVOKED cụ thể | Dùng nhãn “Đã thu hồi” đã có, không cho CTA; cần nghiệm thu cách áp dụng style đóng hiện hữu |
| P2 | HTML có brand lỗi ENVENTHUB, năm2025, mẫu ngày/ảnh, header vừa login/register vừa avatar | Dùng shell và dữ liệu thật theo yêu cầu; không sửa Stitch |

Không đánh đồng ACTIVE với “đang trong ca trực”: chỉ hiện nhãn ca trực khi thời điểm hiện tại nằm trong cửa sổ check-in và sự kiện chưa đóng. Lời mời hết hạn chỉ là trạng thái hiển thị suy từ PENDING + expires_at; không khẳng định database tự chuyển EXPIRED hoặc phân công tự bị đóng như câu mẫu Stitch.

## 5. API và ánh xạ đã kiểm tra

Prefix HTTP thực tế `/api`; frontend Axios dùng đường dẫn dưới đây. Auth lấy từ Bearer/session hiện hữu; không gửi userId để chọn danh sách người khác. Envelope `{success:true,data:...}` hoặc `{success:false,code,message}`.

| Method/route | Input thật | Dữ liệu/quyền và sử dụng |
|---|---|---|
| GET `/me/checkin-assignments?page=0` | page integer0..10000, zero-based; không body | Data mảng tối đa50, sort invited_at DESC,id; lọc principal.userId. Trả id,event_id,status,invited_at,expires_at,title,venue_name,starts_at,ends_at,checkin_opens_at,checkin_closes_at,event_status,image_url; pagination ở envelope |
| POST `/me/checkin-invitations/:id/respond` | UUID **lời mời**, JSON `{ "accept": true }` hoặc false; không gửi string | Chỉ chủ lời mời; PENDING còn hạn, event chưa CANCELLED/ARCHIVED và ends_at còn tương lai; trả row đã ACTIVE/DECLINED; workflow transaction và audit |
| GET `/checkin/events/:id` | UUID **sự kiện**, không body | ACTIVE staff hoặc organizer sở hữu/admin; trả id,title,venue_name,starts_at,ends_at,checkin_opens_at,checkin_closes_at. Đây không phải DTO Assignment đầy đủ |
| POST `/checkin/events/:id/checkins` | UUID sự kiện, JSON `{ "code": "mã vé/QR thực" }`, chuỗi tối đa256 | Endpoint scanner có sẵn; A13 chỉ điều hướng, không gửi scan khi nhận lời mời |

Nguồn: `server/src/app.ts`, `modules/event/public.ts`, `modules/event/infrastructure/store.ts`, `workflows/booking.ts`; client `staff-data.ts`, `StaffAssignments.tsx`, `StaffCheckin.tsx`, `data.ts`.

Trạng thái card: PENDING còn hạn + event mở → nhận/từ chối; PENDING hết expires_at → EXPIRED; ACTIVE + event chưa đóng → link `/checkin/events/{event_id}`; DECLINED/REVOKED/EXPIRED → không CTA; CANCELLED/ARCHIVED hoặc ends_at đã qua → ghi event đóng và không CTA. Backend quyết định quyền cuối cùng, không coi nhãn client là phân quyền. Không tự thêm điều kiện PUBLISHED cho nhận lời mời vì backend hiện không quy định như vậy.

Thông báo lỗi dùng `message` trả về backend qua helper hiện hữu. Không phát minh API toast/thông báo thành công: chỉ hiện xác nhận thao tác sau HTTP200 và đồng bộ GET. Luồng mời/đổi lịch có notification target STAFF trong workflow; A13 không tự tạo hoặc sửa thông báo A12.

### Kết quả runtime phiên review đầu

`http://localhost:8000/api`: health200, login hai tài khoản seed customer/organizer200. Với cả hai: GET page0/page1 trả200 `data:[]`; page=-1 trả400; POST respond UUID không tồn tại với accept true/false trả404; accept chuỗi "true" trả400; GET event UUID không tồn tại và POST scan cùng UUID trả404. Guest GET list, POST respond và GET event trả401. Xem report để biết payload và giới hạn.

Phiên review đầu chưa xác minh nghiệp vụ nonempty. Phiên triển khai đã kiểm chứng các luồng này trên DB test riêng:30HTTP assertions, Chrome4viewport và regression staff/check-in/concurrency PASS; xem report triển khai. Chưa xác minh nonempty/metadata mới tại runtime8000/Supabase; bằng chứng môi trường test không thay thế nghiệm thu Live.

### 5.1. Phần API duy nhất được bổ sung trong kế hoạch

Contract dưới đây **đã triển khai trong source và kiểm thử HTTP thật trên DB riêng**. Runtime8000 chưa nạp source mới nên chưa được báo hỗ trợ contract này:

- Mở rộng GET `/me/checkin-assignments` để mỗi item có `image_url: string | null`, ánh xạ từ `events.cover_image_url`; không tạo API upload hoặc schema mới. Ảnh null/lỗi dùng vùng trung tính và nhãn “Chưa có ảnh”, không thay bằng ảnh mẫu sự kiện khác.
- Bổ sung metadata phân trang `pagination: { page, pageSize, total, totalPages }` ở cấp envelope, **giữ `data` là mảng** để không phá consumer hiện hữu. `page` zero-based, `pageSize=50`, `total` đếm đúng phân công của principal hiện tại, `totalPages=ceil(total/50)`. `total` chỉ phục vụ phân trang, không mở rộng thành thống kê theo trạng thái/ca trực.
- Items và count phải nhất quán trong cùng snapshot truy vấn; giữ quyền/sort hiện hữu. Không có dữ liệu: total0,totalPages0, ẩn phân trang. Trang vượt phạm vi: items[], metadata vẫn đúng, UI quay về trang hợp lệ và tải lại; không hiển thị “Trang 1/0”. Trước/Sau dựa page/totalPages thật, không dựa length=50.
- Không cần endpoint mới nếu mở rộng route hiện hữu đáp ứng được hai yêu cầu. Không thay method/payload respond hoặc API scanner. Phải kiểm thử consumer web/mobile đang dùng `data` mảng trước nghiệm thu.
- Loại khỏi kế hoạch: badge danh mục, cổng/bàn phân công, ngày phản hồi/từ chối, hướng dẫn đến sớm, số tổng lời mời cần xử lý/ca trực. Không thêm API, field hoặc tính toán giả để tái tạo các phần này. Thời gian check-in/trạng thái có thể suy từ field hiện hữu vẫn giữ, không bổ sung nghiệp vụ quản lý ca.

## 6. Thứ tự triển khai dự kiến

1. Phạm vi đã được người dùng chốt: chỉ mở rộng API ảnh và tổng trang theo mục5.1, kiểm thử trước tích hợp; bỏ các phần thiếu backend khác theo mục4. Các bước triển khai dưới đây đã thực hiện trong source, bằng chứng tại report16:21:23; chưa rollout runtime8000.
2. Khi được giao code, sửa tối thiểu shell cho `/checkin`, giữ Guard và route đích. JSX+CSS A13 chung một file, CSS có scope. Không làm thay đổi shell của scanner hoặc màn khác.
3. Tái hiện các vùng nội dung theo mục3, một state trang; mỗi card dùng trạng thái backend tương ứng. Không render switcher mô phỏng.
4. Tích hợp lại API đã có, đúng invitationId/eventId và boolean; ngăn double-submit, hiển thị message backend, reload sau thành công. Hủy/bỏ qua response cũ khi đổi session/trang.
5. Dùng ảnh thật và metadata phân trang đã kiểm thử; xử lý ảnh null/lỗi, trang cuối và refresh. Không hiển thị thống kê lời mời/ca trực đã loại khỏi phạm vi.
6. Kiểm thử, so ảnh, tạo report mới và cập nhật nhật ký/Master Plan; không nâng trạng thái hoàn thành trước khi giải quyết gap bắt buộc.

## 7. Tiêu chí nghiệm thu cho phiên triển khai

- [x] Data từ backend/PostgreSQL thật trên DB test, fixture không đưa vào sản phẩm.
- [x] Header/footer dùng chung; một H1; card/layout/token đúng nguồn A13 trong phạm vi dữ liệu đã chốt.
- [x] Chỉ một state trang; error không đi kèm empty giả; retry hoạt động; loading/empty không hiện phân trang không có căn cứ.
- [x] Nhận/từ chối200 cập nhật đúng lời mời; true/false đúng boolean; test403/404/409 và race/thu hồi; lỗi transport không tự gửi lại mutation.
- [x] ACTIVE mở đúng event; REVOKED/DECLINED/EXPIRED/event đóng không cho CTA; quét vé không xảy ra chỉ vì nhấn Chấp nhận.
- [x] Hạn lời mời/cửa sổ ca/ngày giờ qua nửa đêm và timezone đúng; hết hạn sau khi trang đã mở được đồng bộ.
- [x] API ảnh và metadata phân trang hoạt động với auth đúng; ảnh null/lỗi được xử lý; data mảng tương thích consumer cũ về contract, native UI chưa chạy.
- [x] Pagination0,1,50,51,nhiều trang và vượt trang; items/count cùng SELECT snapshot, totalPages chính xác, không có Trang1/0.
- [x] UI không còn danh mục/cổng/bàn, ngày phản hồi, ghi chú đến sớm hoặc thống kê lời mời/ca trực thiếu backend; không thêm API ngoài ảnh/phân trang.
- [ ] Browser1440/1024/768/390 không tràn; keyboard/focus/aria-live/contrast/reduced-motion được kiểm; không kết luận từ ảnh desktop.
- [x] Build client/server, lint client, boundaries,30HTTP và Chrome DB test PASS; inject transport delay/error để test recovery, không mock response nghiệp vụ.
- [x] Có report mới và cập nhật Master Plan; không chỉnh màn khác ngoài phụ thuộc App/route/type đã duyệt.
- [ ] Cập nhật runtime8000 bằng backend/frontend cùng phiên bản, xác minh authenticated nonempty; camera vật lý/native/contrast/screen-reader và benchmark còn lại.

## 8. Nhật ký tài liệu

| Thời điểm UTC+07 | Thao tác | Report |
|---|---|---|
| 2026-11-01 16:21:23 | Triển khai frontend A13/API ảnh và tổng trang; build/lint/boundaries,30HTTP/Chrome4viewport và regression staff PASS trên DB riêng. Stitch giữ nguyên, runtime8000 chưa cập nhật | [Triển khai](../reports/stitch/A13_20261101_162123_implementation.md) |
| 2026-11-01 16:09:05 | Chốt chỉ bổ sung API ảnh/tổng trang; loại bỏ các phần thiếu backend khác; cập nhật contract dự kiến, acceptance và Master Plan. Chỉ sửa tài liệu | [Chốt phạm vi API](../reports/stitch/A13_20261101_160905_api_scope_plan.md) |
| 2026-11-01 15:57:17 | Tạo kế hoạch A13; kiểm tra project/screen/HTML/ảnh, đọc source, thử HTTP; bổ sung A13 vào Master Plan. Không sửa code/Stitch/database | [Review và kế hoạch](../reports/stitch/A13_20261101_155717_review_plan.md) |

Mỗi lần chỉnh tài liệu hoặc triển khai tiếp phải bổ sung nhật ký tại đây và tạo report mới; không ghi đè report cũ.
