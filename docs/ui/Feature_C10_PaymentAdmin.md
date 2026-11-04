# Feature C10 — Quản lý giao dịch EventHub

Ngày review ban đầu: **2026-11-04 23:04:17 UTC+07 (Asia/Ho_Chi_Minh)**. Phiên review ban đầu chỉ tài liệu; phiên triển khai được người dùng yêu cầu sau đó, kết quả mới nhất ở mục 8.

Trạng thái mới nhất, **2026-11-04 23:37:50 UTC+07**: **ĐÃ TRIỂN KHAI — ĐẠT CÓ ĐIỀU KIỆN theo phạm vi thu gọn** tại `/admin/payments`. Chỉ dùng API hiện có, không bổ sung API hoặc mở rộng backend. Các chức năng thiếu API đã bị loại khỏi UI; giữ header/sidebar dùng chung, TSX+CSS cùng file multiline. Mutation SePay đã kiểm trên PostgreSQL riêng trước tích hợp; chưa chạy mutation trên API8000/ngân hàng thật. [Report triển khai](../reports/stitch/C10_20261104_233750_implementation.md).

Report cập nhật: [Chốt phạm vi API hiện có](../reports/stitch/C10_20261104_231409_scope_update.md). Quyết định này thay thế các yêu cầu chờ phát triển API còn thiếu; các bảng đối chiếu bên dưới giữ làm bằng chứng review lịch sử.

Report: [C10 review và kế hoạch](../reports/stitch/C10_20261104_230417_review_plan.md). Nguồn yêu cầu: [Master Plan](../PROJECT_MASTER_PLAN.md), mục 2.3, 4, 5.3, 5.4, 6.F; skill `.agents/skills/eventhub-stitch-review/SKILL.md`.

## 1. Phạm vi và định danh đã xác minh

- Project chính thức: `10374042969343935993`, EventHub.
- Canvas label **C10** → screen `ede3a107c9da4722827c2fede190646a`; canvas 1280×2288; artifact DESKTOP 2560×4614.
- Metadata title còn **C11. Quản lý giao dịch & Dòng tiền ký quỹ Escrow - Cosmic Ticket Quản Trị Viên**. Dùng canvas và nội dung để xác định C10 theo yêu cầu hiện tại, không dùng metadata cũ để đổi C11.
- HTML: `projects/10374042969343935993/files/885486565943517250`; ảnh: `projects/10374042969343935993/files/15166368865014485194`. Đã tải bằng Stitch MCP, đọc HTML và xem ảnh trực tiếp.
- Dòng C10 cũ trong Master Plan trỏ `4450a0d934414f53aefdd786247d53da` / Chi tiết thẩm định & phê duyệt mở bán; đây là alias lịch sử, canvas hiện là C9. Chỉ sửa định danh dòng C10, giữ nguyên các mục C9/C11.
- Route hiện có: `/admin/payments`, ADMIN; sidebar đã có liên kết. Nội dung hiện do nhánh `payments` của `client/src/pages/admin/Admin.tsx` render.
- Không gọi edit_screens, generate, apply_design_system; không tạo màn trùng. Giới hạn chỉ tài liệu thuộc phiên review/plan ban đầu. Theo yêu cầu triển khai tiếp theo, chỉ thêm C10 frontend và nối route/shell của C10; không sửa backend, cấu hình hay màn hình khác. Kiểm mutation dùng database test riêng, không sửa dữ liệu nghiệp vụ môi trường chung.

## 2. Kiểm kê giao diện Stitch và khoảng thiếu

| Khu vực | Thiết kế hiện có | Hiện trạng code / chênh lệch |
|---|---|---|
| Khung trang | Sidebar 288px, header 80px, breadcrumb tài chính, tiêu đề/mô tả | Nhánh payments còn PageHead “Trung tâm quản trị” và tabs cũ; chưa dùng AdminShell như các trang admin mới |
| Hành động đầu trang | Xuất Excel Đối Soát; Khóa Giải Ngân Khẩn Cấp; Kích Hoạt Đối Soát 24/7 | Chưa có trong trang; reconcile SePay chỉ là một lần gọi, không phải nút bật scheduler 24/7 |
| Năm KPI | GMV + tăng trưởng tháng; Escrow + số sự kiện; doanh thu phí sàn 5%; đã giải ngân; tranh chấp/chờ hoàn + số đơn | Chưa có UI; stats chỉ hỗ trợ một phần số tổng, không đủ nghĩa nghiệp vụ |
| Biểu đồ | Dòng tiền nạp vào vs payout 7 ngày; cơ cấu VietQR/MoMo/Visa-Master, tỷ lệ thành công, ping | Chưa có UI; revenue-daily chỉ là doanh thu đơn đã trả, không có payout hoặc tỷ trọng cổng |
| Tabs | Tất cả, mua vé thành công, tạm giữ Escrow, payout, refund, nghi vấn gian lận | Code chỉ lọc payment status PENDING/SUCCEEDED/FAILED/UNKNOWN; không tương đương tabs nghiệp vụ |
| Lọc/tìm kiếm | Ngày, bộ lọc nâng cao; mã GD, mã đơn, người mua, BTC, tài khoản thụ hưởng | `q` hiện chỉ tìm merchant_reference; thiếu tìm đa thực thể, schema bộ lọc nâng cao chưa được thiết kế chi tiết |
| Bảng 7 cột | Mã/thời gian, đối tượng/thụ hưởng, sự kiện, giá trị, phân bổ Escrow, trạng thái, thao tác | Code có 5 cột: mã, số tiền, trạng thái, thời gian, đối soát; thiếu enrich buyer/event/BTC, phân bổ và hành động |
| Chi tiết/thao tác | Trace đối soát, VAT PDF, sao kê payout, ủy nhiệm chi, lịch sử refund, điều tra IP, chặn thẻ | Chỉ trace SePay có API chi tiết một phần; các chức năng còn lại chưa có API phù hợp |
| Phân trang | Tổng giao dịch, trang số, trang cuối | Backend trả mảng tối đa 50; không total/totalPages; code suy đoán hasNext bằng length===50 |
| Cuối trang | Smart Escrow đa tầng, 85% T+1 giờ/15% giữ 72h; khóa khẩn; hotline | Chưa có nghiệp vụ/chính sách thực thi tương ứng. Không coi các con số/chứng nhận mẫu là dữ liệu thật |

### Đối chiếu Cosmic Graffiti

Project designMd chứa cả semantic palette và mô tả brand; không tự đổi màu artifact để ép khớp một bộ token.

| Tiêu chí | Bằng chứng | Đánh giá |
|---|---|---|
| Màu | HTML dùng surface `#0f1222`, container `#1c1f2f`, text `#e0e1f7`, primary-container `#7c3aed`, secondary `#5de6ff`; mô tả brand dùng `#080B1A`, `#10162B`, `#F8FAFC`, `#22D3EE` | PARTIAL: hợp semantic theme thực tế, khác palette mô tả; giữ artifact và ghi nhận khác biệt |
| Font | HTML khai báo Syne/Space Grotesk nhưng chỉ import Be Vietnam Pro và Material Symbols; ảnh heading/label hiện serif | FAIL so với kiểu chữ đã quy định; cần xác nhận cách khắc phục khi triển khai, không âm thầm mô phỏng fallback hoặc sửa Stitch |
| Bố cục | Có phân cấp rõ KPI → charts → ledger → hỗ trợ; ảnh cho thấy cột thao tác và tabs phải cuộn ngang, số tiền/badge xuống dòng nhiều | PARTIAL; không khẳng định mất dữ liệu vì HTML có overflow-x-auto |
| Responsive | Có grid breakpoint nhưng aside fixed w-72 và pl-72 không có biến thể mobile; ẩn scrollbar toàn cục | NOT_VERIFIED runtime; cần kiểm thử bàn phím/mobile, không đánh PASS từ ảnh desktop |
| Nội dung | Tiếng Việt đầy đủ nhưng ngày 28/03/2025, số liệu tỷ đồng, 5%, ISO/PCI, 99.85%, ping 24ms là dữ liệu/khẳng định mẫu | PARTIAL; không đưa thành trạng thái hệ thống thật |

## 3. API hiện có và kiểm thử thực tế

Các kết quả dưới đây thuộc phiên review ban đầu. Kết quả xác minh bổ sung khi triển khai, gồm mutation đã chạy thành công trên DB riêng, ở mục 8 và report triển khai; không hiểu “chưa kiểm” bên dưới là trạng thái mới nhất của môi trường test.

Môi trường: `http://localhost:8000/api`, ngày 2026-11-04, khoảng 23:02–23:04 UTC+07. Login ADMIN và CUSTOMER bằng tài khoản seed hiện có; không ghi password/token/PII vào tài liệu. Chỉ POST login và GET nghiệp vụ, không tạo giao dịch/seed/hoàn tiền/đối soát ghi dữ liệu. Envelope thành công `{success:true,data:...}`.

Các đường dẫn dưới đây có prefix `/api`. Trang frontend dùng Axios hiện có với base API; không thêm `/api` hai lần.

| Method / route và input thực tế | HTTP / kết quả | Kết luận |
|---|---|---|
| GET `/health`, `/config` | 200, 200 | Runtime có phản hồi; không tự suy ra mọi provider đang vận hành |
| POST `/auth/login` ADMIN | 200; có user/accessToken | Đã lấy session phục vụ read-only review |
| GET `/admin/payments?page=0` | 200, 24 payments, trạng thái SUCCEEDED/PENDING/UNKNOWN | Danh sách hoạt động; không phải ledger Escrow |
| GET `/admin/payments?page=1` | 200, `[]` | page zero-based; mỗi trang cố định 50 |
| GET `/admin/payments?status=SUCCEEDED&page=0` | 200, 13, tất cả SUCCEEDED | Lọc đúng tập trạng thái quan sát |
| GET `/admin/payments?status=PENDING&page=0` | 200, 3, tất cả PENDING | Lọc hoạt động |
| GET `/admin/payments?q=<merchant_reference lấy từ GET thật>` | 200, 1; tất cả reference chứa chuỗi đã truyền | Tìm mã hoạt động, không công bố mã giao dịch cá nhân |
| GET `/admin/payments?q=C10_NO_MATCH_20261104` | 200, `[]` | Empty thực |
| GET `/admin/payments?from=2026-11-01T00:00:00+07:00&to=2026-11-04T23:59:59+07:00` | 200, 1 SUCCEEDED | Request URL encode dấu `+` thành `%2B`; lọc created_at, không phải succeeded_at |
| GET `/admin/payments?page=-1`; `?from=invalid` | 400; 400 | Validation có hoạt động |
| GET `/admin/payments?status=INVALID` | 200, `[]` | Khoảng thiếu: status không enum-validation, dễ che lỗi mapping |
| GET `/admin/sepay/transactions?page=0&limit=2` | 200, 2 PROCESSED | Runtime có route SePay, mảng đã mask tài khoản |
| GET `/admin/sepay/transactions/<id từ list thật>` | 200, có history, history.length=0 | Detail hoạt động; chưa chứng minh history có dữ liệu |
| GET `/admin/sepay/transactions?status=PROCESSED&page=0&limit=2` | 200, 2 PROCESSED | Trạng thái ingestion, không phải trạng thái Escrow |
| GET `/admin/sepay/transactions?from=2026-10-01T00:00:00+07:00&to=2026-11-04T23:59:59+07:00&limit=100` | 200, 9 | Lọc transaction_at; đúng ISO offset, đã encode URL |
| GET `/admin/sepay/transactions?reference=<reference_code lấy từ list thật>` | 200, 1; exact-match đúng | Không dùng q cho endpoint này |
| GET `/admin/sepay/transactions?reference=C10_NO_MATCH_20261104` | 200, `[]` | Empty thực |
| GET `/admin/sepay/transactions?status=INVALID` | 400 | Enum validation hoạt động |
| GET SePay list với from=2026-11-04T00:00:00+07:00, to=2026-11-01T00:00:00+07:00 | 400 | Chặn khoảng đảo ngược |
| GET `/admin/stats` | 200; orders,revenue,sold,checkins,provider_received,needs_review,events,users,organizers | Dùng lại được một phần; không phải KPI escrow/fees/payout |
| GET `/admin/stats/revenue-daily?fromDate=2026-10-29&toDate=2026-11-04` | 200, totalRevenue=`95000`, 7 ngày; 30/10=`80000`, 01/11=`15000`, các ngày còn lại=`0`; VND, Asia/Ho_Chi_Minh | Chuỗi doanh thu đơn đã trả; không phải tiền phí sàn hay payout |
| GET payments và SePay list không token | 401 cả hai | Có bảo vệ đăng nhập |
| GET payments và SePay list token CUSTOMER | 403 cả hai | Quyền ADMIN có hiệu lực |

### Hợp đồng dữ liệu cần giữ chính xác

- Payments: `id`, `order_id`, `provider`, `merchant_reference`, `provider_transaction_id`, `status`, `amount`, `currency`, `created_at`, `succeeded_at`, `requires_review`, `review_reason`, `review_resolved_at` và các trường provider/reconcile. Không có buyer/event/BTC hay escrow balance. Response là mảng, không có tổng. Store dùng ILIKE cho merchant_reference; from/to inclusive theo created_at. `limit` không được route này sử dụng.
- SePay list: `id`, `environment`, `integration_account`, `webhook_transaction_id`, `api_transaction_id`, `reference_code`, `bank_code`, `account_masked`, `transfer_type`, `amount`, `currency`, `payment_code`, `payment_id`, `status`, `reason`, `attempt_count`, `transaction_at`, `received_at`, `processed_at`. `page` 0..10000, `limit` 1..100 (mặc định 50), status RECEIVED/PROCESSING/PROCESSED/REVIEW/ERROR; reference exact-match, không ILIKE. Luôn giới hạn environment/integration hiện cấu hình.
- Detail SePay runtime thiếu `api_transaction_id` và `transaction_at` so với list; có `history`. Không giả định hai response đồng nhất. Không truyền payment.id thay cho sepay transaction.id; liên kết qua payment_id.
- Revenue-daily nhận fromDate/toDate dạng YYYY-MM-DD; xử lý ngày UTC+7 và canonical paid payment. Không lấy tổng SUCCEEDED tùy ý làm doanh thu đơn (có thể gồm retry/late/review). `provider_received` khác doanh thu đơn.
- Giữ số tiền chuỗi chính xác, format VND theo dự án; không dùng float tính 5% hoặc tự suy ra 95% escrow.

### API mutation có trong source nhưng chưa kiểm thử thành công

| API | Body đúng contract | Giới hạn |
|---|---|---|
| POST `/admin/sepay/reconcile` | `{ "lookbackMinutes": 60 }`, integer 5..1440, default 60, strict | Có thể ghi/link transaction và gọi provider; cần token API v2; chưa gọi trong phiên tài liệu. Không phải bật đối soát 24/7 |
| POST `/admin/sepay/transactions/:id/reprocess` | `{}` strict, ID SePay thật | Chỉ ERROR/REVIEW, trả queued; cần fixture DB riêng để kiểm thành công, race/idempotency |
| POST `/admin/sepay/transactions/:id/resolve` | `{ "outcome": "unmatched", "reason": "Lý do đã xác minh", "evidenceReference": null }` | outcome confirmed_external/refund_external/unmatched; reason 3..1000, evidence <=256; ghi kết quả review bên ngoài, KHÔNG thực hiện refund/payout ngân hàng |

Không dùng kết quả đọc source hoặc 401 để khẳng định mutation hoạt động. Cần kiểm trên môi trường riêng trước tích hợp; phiên này không sửa DB chung.

## 4. Chức năng loại bỏ khỏi phạm vi triển khai vì chưa có API hỗ trợ

1. Ledger hợp nhất mua vé/Escrow/payout/refund/fraud, tổng số và phân trang chuẩn; join người mua, BTC, sự kiện, loại vé, người thụ hưởng.
2. Tìm theo mã đơn/tên người mua/tên BTC/tài khoản; filter nâng cao theo nghĩa giao diện, counts từng tab.
3. Quỹ Escrow thật, số sự kiện được bảo chứng; phí sàn theo chính sách, số đã giải ngân, tiền tranh chấp/chờ hoàn; tăng trưởng GMV cùng kỳ cần định nghĩa.
4. Đường payout trong biểu đồ, phân bổ doanh thu theo cổng, tỷ lệ thành công/latency thật. Chưa có tích hợp MoMo/Visa-Master tương ứng hình mẫu.
5. Khóa/mở giải ngân khẩn, payout 85%/15%, T+1 giờ/72h, tài khoản ủy thác và trạng thái phong tỏa.
6. Refund thật và lịch sử refund, phí hoàn; outcome `refund_external` chỉ ghi nhận, không đủ cho nút hoàn tiền.
7. Fraud/chargeback, điều tra IP/proxy, chặn thẻ, hạn giải trình 24h.
8. Xuất Excel toàn bộ ledger theo filter; hóa đơn VAT PDF, sao kê payout, ủy nhiệm chi. Xuất riêng một trang 50 bản ghi không tương đương xuất toàn bộ.
9. Bật/tắt đối soát 24/7 và trạng thái lịch chạy; POST reconcile chỉ thực thi một lượt.
10. Nguồn cấu hình hỗ trợ tài chính và chứng cứ các nhãn PCI-DSS/ISO/uptime. Liên kết tel bản thân không cần API, nhưng nội dung người phụ trách phải được xác nhận, không dùng danh tính mẫu như dữ liệu tài khoản.

Toàn bộ nhóm chức năng trên bị loại khỏi C10 theo yêu cầu người dùng ngày 2026-11-04 23:14:09 UTC+07. Không phát triển API mới để đáp ứng chúng, không giả lập dữ liệu, không để control không hoạt động. Bỏ cả tiêu đề/mô tả cam kết Escrow, phí 5%, chứng nhận và panel hỗ trợ mẫu không có nguồn xác thực. Đây là sai lệch so với bản Stitch đầy đủ đã được người dùng cho phép; artifact Stitch vẫn giữ nguyên.

### Phạm vi giữ lại, chỉ dùng API hiện có

| Chức năng giữ lại | API hiện có / cách triển khai |
|---|---|
| Danh sách thanh toán | GET `/admin/payments`; chỉ hiển thị trường response thực: mã, provider, số tiền, trạng thái, thời gian, thông tin cần đối soát. Bỏ cột người mua/BTC/sự kiện/phân bổ Escrow không có dữ liệu |
| Tìm kiếm/lọc thanh toán | `q` tìm merchant_reference; status PENDING/SUCCEEDED/FAILED/UNKNOWN; from/to theo created_at; placeholder ghi đúng “Tìm mã giao dịch”. Bỏ tìm tên/mã đơn/tài khoản và filter nâng cao không được hỗ trợ |
| Phân trang | page zero-based, 50 bản ghi/lô; chỉ Trước/Sau và trang hiện tại. Có thể kiểm lô tiếp theo bằng cùng endpoint để xác định hasNext; bỏ totalCount, tổng trang và trang cuối; không tải cả tập dữ liệu để giả lập total |
| KPI có nguồn thật | GET `/admin/stats`: revenue (doanh thu đơn), provider_received (tiền provider đã nhận), needs_review (số thanh toán cần đối soát). Giữ đúng nghĩa và phạm vi số tổng; không gán theo filter bảng khi API không nhận filter |
| Biểu đồ doanh thu | GET `/admin/stats/revenue-daily?fromDate&toDate`: một chuỗi doanh thu theo ngày, UTC+7. Bỏ đường payout, donut cơ cấu cổng, tăng trưởng mẫu và telemetry |
| Giao dịch/trace SePay | GET `/admin/sepay/transactions` và `/:id`; bộ lọc status/from/to/reference đúng contract riêng; chỉ hiển thị dữ liệu/history thực, không suy ra trạng thái Escrow |
| Thao tác SePay có API sẵn | POST reconcile (đối soát một lần), reprocess (xử lý lại ERROR/REVIEW), resolve (ghi nhận kết quả xử lý bên ngoài). Giữ trong kế hoạch với điều kiện kiểm thử runtime trước nối UI; không đổi tên thành bật lịch 24/7 hay hoàn tiền thật |

API có trong source nhưng chưa kiểm chứng không được mặc định là đang hoạt động. Nếu không xác minh được mutation khi triển khai, ghi blocker riêng cho thao tác đó và chưa đưa control lên UI; không tạo API thay thế. Không ảnh hưởng triển khai phần đọc đã được xác minh.

## 5. Kế hoạch thực hiện lại (đã thực thi theo phạm vi thu gọn)

### Bước 1 — Áp dụng phạm vi đã chốt

- Giữ ảnh/HTML C10 làm chuẩn hình thức của các phần còn lại; loại các phần ở mục 4. Không bổ sung route, field, migration, service hay mở rộng contract/backend để phục vụ C10.
- Thu gọn nội dung về “Quản lý giao dịch”, bỏ cam kết/sample claims thuộc chức năng bị loại. Giữ ghi nhận font/scrollbar để kiểm khi triển khai.
- Ánh xạ revenue/provider_received/needs_review theo đúng nghĩa API; không suy ra phí/Escrow/payout/refund. Kiểm quyền và chống lặp của mutation hiện có trước tích hợp.

### Bước 2 — Khung React theo code hiện có

- File dự kiến `client/src/pages/admin/C10PaymentAdmin.tsx`; tái sử dụng `AdminShell`, tức `AdminHeader` và `AdminSidebar` hiện có. Không copy header/sidebar HTML Stitch hoặc tạo bản thứ hai.
- Giữ route `/admin/payments` và ADMIN guard; khi triển khai sau này, nhánh payments trong Admin.tsx điều hướng render C10PaymentAdmin. Không thay đổi màn admin khác.
- **TSX và CSS cùng một file**, CSS scoped `.c10-*` trong chuỗi template literal và `<style>{styles}</style>`; không tạo `.css` riêng. JSX mỗi block/nút/prop phức tạp nhiều dòng; CSS mỗi selector/declaration trên dòng riêng (multi-line formatting), không minify.
- Tái dùng Axios/auth/loading/format tiền-ngày; không chép Tailwind CDN/script của export vào ứng dụng. Chuỗi UI tĩnh được phép; số liệu động luôn từ API đã kiểm chứng.

### Bước 3 — Dựng nội dung theo Stitch

- Giữ thứ tự phần còn lại: breadcrumb/heading → KPI có dữ liệu thật → biểu đồ doanh thu một chuỗi → filter/search → bảng thanh toán/phân trang → khu vực SePay/trace tương ứng. Thu gọn grid theo số khối còn lại, không giữ khoảng trống của 5 KPI/chart đôi/7 cột/hai panel cuối đã bị loại.
- Theo semantic palette và spacing đã đọc; shared shell và loại bỏ các phần không có API là sai lệch được người dùng duyệt. Không tự mở rộng các thay đổi ngoài phạm vi đó.
- Không đánh đồng payment status với escrow. Chưa có API không render badge “đã khóa an toàn”, “giải ngân thành công” hoặc KPI mẫu.
- Responsive dựa shell mobile hiện có; table cuộn trong vùng có nhãn, không làm cả trang tràn. Đây là mục cần kiểm, không phải đã được xác minh từ artifact.

### Bước 4 — Tích hợp API hiện có

- Danh sách payments: status/q/from/to/page đúng contract; reset page khi đổi filter; tránh response cũ ghi đè kết quả mới.
- SePay list/detail dùng đúng ID và bộ filter riêng; trace chưa có history hiển thị rỗng trung thực. Không dựng trace cho VNPay/demo từ API SePay.
- Stats/revenue chỉ map khi nhãn và kỳ thống kê đúng nghĩa; loại chart payout/tổng tiền ký quỹ khỏi giao diện.
- Dùng Trước/Sau theo API mảng hiện có; bỏ trang cuối/totalCount. Không lấy length của trang làm tổng toàn sàn, không chờ hoặc thêm API total.
- Mutation chỉ nối sau test fixture riêng; có pending/disabled, error, kết quả thành công được kiểm lại; không tự retry thao tác tài chính khi chưa có idempotency contract.

### Bước 5 — Nghiệm thu và báo cáo

- API: nonempty/empty, status tất cả, Unicode/search đặc biệt, ranh giới UTC+7, pagination >50, quyền 401/403, timeout, contract list/detail; kiểm mutation trên DB riêng. Snapshot hiện có chỉ 24 payments nên chưa đủ chứng minh vượt 50.
- UI: loading/empty/error/retry/success/disabled; search/filter/back giữ state; desktop 1440/1024, tablet 768, mobile 390; keyboard, focus, nhãn icon, dialog, contrast và nội dung dài.
- Chạy `npm run build` tại client và lint phù hợp khi có code; không chạy build chỉ để tạo tài liệu. So sánh ảnh runtime với C10 Stitch; ghi rõ mọi sai lệch.
- Mỗi lần chỉnh sửa tạo report mới, cập nhật liên kết và nhật ký trong file kế hoạch này cùng Master Plan; không ghi đè report lịch sử.

## 6. Tiêu chí chấp nhận

- Đúng canvas C10 và route payments, shared shell, TSX+CSS một file multiline.
- Không thay đổi Stitch hoặc màn khác; chỉ dùng sai lệch được người dùng duyệt.
- Dữ liệu/nhãn nghiệp vụ đúng contract và có HTTP evidence; không mock để che API thiếu.
- Không bổ sung hoặc mở rộng API/backend; mọi chức năng chưa có API hỗ trợ đã bị loại khỏi UI, không placeholder/toast thay thế.
- Tất cả thao tác có trạng thái UI và quyền hợp lệ; tiền/ngày chính xác; không hiển thị tổng giao dịch/tổng trang khi API không trả.
- Build/lint và browser/responsive/a11y phù hợp có bằng chứng; chưa đủ thì không kết luận ĐẠT.

## 7. Nhật ký thay đổi tài liệu

| Thời điểm | Thao tác | Report |
|---|---|---|
| 2026-11-04 23:04:17 UTC+07 | Tạo kế hoạch C10; kiểm Stitch/HTML/ảnh; đối chiếu source và HTTP read-only; cập nhật mục C10 tại Master Plan. Không sửa source/Stitch/DB | [Review plan](../reports/stitch/C10_20261104_230417_review_plan.md) |
| 2026-11-04 23:14:09 UTC+07 | Chốt chỉ dùng API hiện có; loại chức năng không được hỗ trợ; cập nhật kế hoạch thực hiện/nghiệm thu và Master Plan, không thêm API/source hoặc sửa Stitch | [Scope update](../reports/stitch/C10_20261104_231409_scope_update.md) |
| 2026-11-04 23:37:50 UTC+07 | Triển khai C10 TSX+CSS multiline/shared AdminShell, nối payments và nhận diện console tại App; kiểm API/SePay mutation trên DB riêng, browser 4viewport, local read-only; sửa label kết quả, focus và trục biểu đồ0 sau kiểm; cập nhật evidence/Master Plan | [Implementation](../reports/stitch/C10_20261104_233750_implementation.md) |

## 8. Kết quả triển khai và nghiệm thu mới nhất

- `client/src/pages/admin/C10PaymentAdmin.tsx`: ba KPI toàn thời gian revenue/provider_received/needs_review; doanh thu theo ngày một chuỗi và bảng số chính xác; danh sách payments/SePay, tìm mã/lọc trạng thái/ngày, Trước/Sau và dò lô kế tiếp bằng API hiện có; query trên URL giữ lọc/trang khi đổi danh sách hoặc back.
- Chi tiết SePay có dữ liệu thực và history; đối soát một lần, xử lý lại ERROR/REVIEW, ghi nhận kết quả xử lý ngoài. Form xác nhận, khóa khi gửi, không tự gửi lại khi lỗi mơ hồ; tải lại dữ liệu/lịch sử sau thao tác. Resolve không chuyển/hoàn tiền ngân hàng. Loading/empty/error/retry/success và focus dialog đã kiểm.
- `Admin.tsx`: thêm import/nhánh payments render C10. `App.tsx`: nhận diện `/admin/payments` là console để chỉ dùng AdminShell, không lặp header/footer user. Shared header/sidebar và màn khác giữ nguyên.
- Không thêm/sửa API, service, migration hoặc dependency. Không đưa Escrow/phí/payout/refund/fraud/Excel/VAT/total giả, nút giả hoặc toast “đang phát triển” lên UI.
- SourceAPI8032/PostgreSQL55472 riêng: **30 checkpoints API PASS**. Fixture 55 payments, 53 SePay transactions; kiểm quyền/GET thật/mutation thật với ngân hàng adapter giả lập. Suite có sẵn SePay integration/v2: **33 PASS, 0 SKIP, 0 FAIL** sau hoàn tất thiết lập DB.
- Chrome5182/API8032: **14 nhóm PASS**, gồm 1440/1024/768/390, số tiền lớn vượt Number safe integer, ngày0/UTC+7, filter/pagination/trace/history/mutations, double-click một POST, mất mạng sau backend nhận thao tác, lỗi GET/retry/cancel response cũ, dialog/focus/mobile menu. Screenshot synthetic đã xem và lưu evidence.
- Local5173/API8000: GET payments200/24, SePay list200/9, detail200, stats200 và revenue-daily200. Browser bốn viewport, một shell, **0 page errors/0 admin writes**. Không restart/copy backend hoặc rollout static container.
- Client build/lint PASS; server build PASS để kiểm source hiện tại. Cảnh báo bundle lớn/Browserslist đã có vẫn tồn tại. `git diff --check` PASS cho phần liên quan.
- Còn chưa xác minh: giao dịch ngân hàng thật/mutation môi trường chung, kiểm accessibility/contrast đầy đủ, trình duyệt khác, pixel diff và hiệu năng tập dữ liệu lớn. Frontend static8000/public chưa rollout. Kết luận **ĐẠT CÓ ĐIỀU KIỆN**, không coi phần bị loại là blocker và không tuyên bố đạt toàn bộ thiết kế gốc.
- Đã kiểm liên kết/UTF-8/evidence không chứa credential; dừng API/Vite/PostgreSQL test riêng sau khi lưu bằng chứng, giữ fixture trong `.local`. Không dừng frontend5173/API8000 hiện có.

Bằng chứng và chi tiết: [Report triển khai](../reports/stitch/C10_20261104_233750_implementation.md), [API checkpoints](../reports/stitch/evidence/C10_20261104_233750/api-results.json), [Browser checkpoints](../reports/stitch/evidence/C10_20261104_233750/browser-results.json), [Local read-only](../reports/stitch/evidence/C10_20261104_233750/local-results.json).
