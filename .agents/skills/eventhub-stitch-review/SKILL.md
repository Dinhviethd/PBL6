---
name: eventhub-stitch-review
description: Tạo mới, tái tạo, rà soát và chỉnh sửa từng màn hình giao diện EventHub bằng Google Stitch MCP. Luôn đọc docs/PROJECT_MASTER_PLAN.md trước, tuân thủ thiết kế đã có trên Stitch và không tự ý thay đổi màn hình đã thiết kế, xác minh API backend tồn tại và đang hoạt động trước khi tích hợp, bắt buộc lập báo cáo phiên làm việc mới và cập nhật Master Plan. Sử dụng khi làm việc với các màn hình A1-A11, B1-B12 hoặc C1-C12.
---

# Quy trình làm việc với màn hình Stitch của EventHub

## 1. Phạm vi dự án

- **ID dự án Stitch chính thức:** `10374042969343935993`.
- **Tên dự án:** EventHub.
- **Hệ thống thiết kế:** Cosmic Graffiti.
- **Các mã màn hình chính:** A1-A11, B1-B12, C1-C12.
- **Tài liệu yêu cầu và tiến độ chính:** `docs/PROJECT_MASTER_PLAN.md`.
- **Thư mục lưu báo cáo:** `docs/reports/stitch/`.

Chỉ sử dụng dự án Stitch có ID `10374042969343935993` làm nguồn tham chiếu chính thức cho quy trình này.

Không sử dụng các dự án Stitch khác để thay thế hoặc làm nguồn xác thực cho dự án hiện tại.

Khi yêu cầu chỉ giới hạn ở thiết kế trên Stitch và tài liệu, không chỉnh sửa mã nguồn frontend, backend, cơ sở dữ liệu, API, cấu hình hoặc các tệp không liên quan.

### Nguyên tắc bắt buộc

Các nguyên tắc sau áp dụng cho cả phiên thiết kế trên Stitch và phiên triển khai giao diện theo thiết kế:

1. **Stitch là nguồn thiết kế chuẩn.** Màn hình đã có trên Stitch phải được giữ nguyên khi triển khai; không tự ý thay đổi bố cục, màu sắc, kiểu chữ, nội dung hoặc thành phần. Chỉ chỉnh sửa thiết kế Stitch khi có yêu cầu rõ ràng, được ghi nhận và xác nhận.
2. **Xác minh API trước khi gọi hoặc tích hợp.** Phải bảo đảm API backend tồn tại, đúng method/đường dẫn/hợp đồng dữ liệu và đang hoạt động thực tế. Nếu API chưa có hoặc không hoạt động, không được giả lập hoặc hard-code để che giấu; phải ghi nhận trở ngại trong báo cáo và Master Plan.
3. **Báo cáo và cập nhật Master Plan là bắt buộc.** Mỗi phiên làm việc phải tạo báo cáo mới trong `docs/reports/stitch/` và cập nhật tiến độ vào `docs/PROJECT_MASTER_PLAN.md`, kể cả khi phiên bị chặn hoặc không có thay đổi.

## 2. Xác định màn hình cần thực hiện

Đọc yêu cầu của người dùng và xác định mã màn hình cần xử lý.

Ví dụ:

- Tái tạo màn hình A1.
- Chỉnh sửa A2 theo yêu cầu hiện có.
- Rà soát và cải thiện B3.
- Tái tạo C10 nhưng vẫn giữ nguyên hệ thống thiết kế dành cho quản trị viên.

Nếu người dùng chưa cung cấp mã màn hình, hãy hỏi rõ cần xử lý màn hình nào trước khi thực hiện.

Nếu người dùng yêu cầu nhiều màn hình, hãy xử lý từng màn hình riêng biệt. Mỗi màn hình phải có kết quả rà soát, vấn đề tồn đọng và trạng thái được ghi nhận độc lập.

Không tự ý mở rộng phạm vi sang các màn hình khác.

## 3. Đọc Master Plan trước khi sử dụng Stitch

Trước khi gọi bất kỳ công cụ Stitch nào:

1. Đọc `docs/PROJECT_MASTER_PLAN.md`.
2. Tìm màn hình mục tiêu trong danh sách quản lý màn hình.
3. Trích xuất tên chính thức, yêu cầu chức năng, trạng thái thiết kế hiện tại, kết quả rà soát gần nhất, các vấn đề chưa giải quyết và đường dẫn báo cáo gần nhất.
4. Đọc các yêu cầu liên quan đến hệ thống thiết kế, điều hướng và quy trình nghiệp vụ.
5. Xác định tiêu chí nghiệm thu trước khi thay đổi thiết kế.

Coi Master Plan là nguồn ghi nhận trạng thái dự án mới nhất đã được xác minh, không phải bằng chứng cho thấy màn hình chắc chắn đang tồn tại trên Stitch.

Không tự tạo ra hoặc suy đoán mã màn hình, URL, kết quả công cụ, kết luận rà soát hay thời điểm thực hiện.

Nếu thông tin trong Master Plan không đầy đủ hoặc mâu thuẫn, hãy ghi nhận rõ điểm chưa xác định và chỉ tiếp tục trong phạm vi có đủ căn cứ.

## 4. Kiểm tra khả năng truy cập Stitch

Kiểm tra các công cụ MCP Stitch thực sự được cung cấp bởi máy chủ đã kết nối. Chỉ sử dụng những công cụ có thật và phù hợp với thao tác cần thực hiện.

Thực hiện lần lượt:

1. Xác minh khả năng truy cập dự án `10374042969343935993`.
2. Tìm màn hình mục tiêu bằng mã, tên hoặc dữ liệu dự án thực tế mà công cụ cung cấp.
3. Kiểm tra thiết kế hiện tại và ngữ cảnh liên quan.
4. Xác định công cụ nào thực sự hỗ trợ xem, tạo mới, chỉnh sửa hoặc cập nhật màn hình.

Không mặc định rằng một công cụ tồn tại chỉ vì tên công cụ nghe có vẻ phù hợp.

Nếu Stitch chưa kết nối, dự án không thể truy cập hoặc công cụ hiện có không đáp ứng được thao tác cần thiết:

- Không tuyên bố đã tạo hoặc chỉnh sửa thành công.
- Ghi lại trở ngại và những bước kiểm tra đã thực sự thực hiện.
- **Bắt buộc** tạo báo cáo mới trong `docs/reports/stitch/`, kể cả khi phiên bị chặn hoặc không có thay đổi.
- **Bắt buộc** cập nhật Master Plan với trạng thái `BLOCKED`, trở ngại và đường dẫn báo cáo mới.
- Chỉ ghi vào báo cáo và Master Plan những thông tin đã được xác minh.
- Giải thích rõ đang thiếu quyền truy cập, dữ liệu hay khả năng thao tác nào.

## 5. Kiểm tra thiết kế hiện tại

Trước khi tái tạo hoặc chỉnh sửa, hãy đối chiếu thiết kế hiện tại với:

- Yêu cầu của màn hình trong Master Plan.
- Hệ thống thiết kế Cosmic Graffiti.
- Các màn hình lân cận và thành phần giao diện dùng chung.
- Điều hướng và quy trình nghiệp vụ dự kiến.
- Nội dung, trường dữ liệu, hành động và các trạng thái giao diện bắt buộc.

### Quy chuẩn thiết kế Cosmic Graffiti

- **Nền chính:** màu tối vũ trụ `#080B1A`.
- **Bề mặt nội dung:** `#10162B`.
- **Màu nhấn chính:** tím `#7C3AED`.
- **Màu nhấn phụ:** xanh cyan `#22D3EE`.
- **Màu nhấn bổ sung:** hồng `#F472B6`.
- **Màu chữ chính:** `#F8FAFC`.
- **Màu chữ phụ:** `#94A3B8`.
- **Kiểu chữ:** sử dụng kiểu chữ hiển thị nổi bật cho tiêu đề sự kiện; ưu tiên kiểu chữ sans-serif dễ đọc cho biểu mẫu, bảng dữ liệu và trang quản trị.
- **Bố cục:** bảo đảm khoảng cách, căn chỉnh, phân cấp thị giác và tính nhất quán.
- **Thành phần:** ưu tiên các thành phần có thể tái sử dụng.
- **Khả năng thích ứng:** xem xét bố cục trên các kích thước màn hình khác nhau.

Nếu Master Plan có yêu cầu cụ thể hoặc cập nhật hơn, ưu tiên yêu cầu đó thay cho quy chuẩn chung.

Không áp dụng hiệu ứng graffiti, phát sáng hoặc hình ảnh tiêu đề quá lớn một cách máy móc vào các màn hình quản trị nếu chúng làm giảm khả năng đọc và sử dụng.

## 6. Tạo mới hoặc chỉnh sửa màn hình

Chuyển các tiêu chí nghiệm thu thành những thay đổi thiết kế cụ thể.

### Trước khi chỉnh sửa

1. Xác định chính xác màn hình mục tiêu.
2. Giữ lại nội dung và thành phần hiện có nếu chúng đã đáp ứng yêu cầu.
3. Xác định rõ thành phần cần thêm, loại bỏ hoặc điều chỉnh.
4. Không thay đổi các màn hình không thuộc phạm vi yêu cầu.
5. Bảo đảm sự nhất quán về điều hướng, kiểu chữ, màu sắc, khoảng cách và hành vi thành phần.

### Tuân thủ thiết kế Stitch

- Màn hình đã có trên Stitch là nguồn tham chiếu bắt buộc cho thiết kế và triển khai.
- Không tự ý thiết kế lại, thay đổi bố cục, màu sắc, kiểu chữ, nội dung hoặc thành phần của màn hình đã có.
- Nếu thiếu thành phần hoặc thiết kế không khả thi khi triển khai, phải dừng lại, ghi rõ sai lệch và xin xác nhận trước khi sửa thiết kế.
- Không tạo màn hình trùng lặp để né việc chỉnh sửa đúng màn hình mục tiêu.

Chỉ sử dụng MCP Stitch để thực hiện thao tác khi các công cụ hiện có thực sự hỗ trợ.

### Sau khi chỉnh sửa

1. Mở lại hoặc kiểm tra màn hình sau khi thay đổi.
2. Xác minh kết quả thực tế thay vì mặc định rằng thao tác đã thành công.
3. Đối chiếu kết quả với các tiêu chí nghiệm thu đã xác định.
4. Ghi nhận vấn đề còn tồn tại và các tiêu chí chưa thể xác minh.

Nếu công cụ chỉ hỗ trợ tạo màn hình mới mà không thể chỉnh sửa màn hình hiện tại:

- Không tự ý tạo một màn hình trùng lặp mà không thông báo.
- Kiểm tra xem có cách cập nhật đúng màn hình mục tiêu hay không.
- Nếu không thể, nêu rõ giới hạn của công cụ và chờ hướng xử lý phù hợp khi cần thiết.

### Xác minh API backend trước khi tích hợp

Trước khi gọi hoặc tích hợp một API backend vào màn hình, thực hiện lần lượt:

1. Tìm route, controller và service tương ứng trong backend.
2. Xác nhận method, đường dẫn, quyền truy cập và cấu trúc request/response thực tế.
3. Gọi thử bằng môi trường phát triển hoặc kiểm tra health check; ghi lại bằng chứng như status code và response mẫu.
4. Chỉ tích hợp giao diện sau khi API đáp ứng các bước trên.
5. Nếu API chưa tồn tại, sai hợp đồng dữ liệu hoặc không hoạt động, dừng tích hợp, ghi trạng thái `BLOCKED` và không tuyên bố đã hoàn thành.
6. Không dùng mock hoặc dữ liệu hard-code thay thế API thật, trừ khi người dùng yêu cầu rõ ràng; khi đó phải ghi chú rõ đây là dữ liệu mô phỏng.

### Kỹ thuật chuyển thiết kế Stitch thành React component

Áp dụng tiểu mục này khi nhiệm vụ có yêu cầu triển khai hoặc cập nhật frontend theo Stitch. Với nhiệm vụ chỉ thiết kế hoặc rà soát trên Stitch, tiếp tục quy trình tương ứng ở các mục hiện có. Các yêu cầu về phạm vi, tuân thủ thiết kế và xác minh API ở trên vẫn là điều kiện bắt buộc.

Tham khảo kỹ thuật: [stitch::react-components](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-build/skills/react-components/SKILL.md). Hướng dẫn dưới đây đã được điều chỉnh cho cấu trúc và API hiện có của EventHub.

1. **Lấy nguồn thiết kế:** dùng công cụ Stitch MCP thực sự có sẵn để lấy metadata, HTML và ảnh chụp của màn hình mục tiêu. Tải tài nguyên bằng công cụ khả dụng, xem trực tiếp ảnh ở kích thước đủ để đối chiếu bố cục rồi đọc HTML tương ứng. Ghi project ID, screen ID, kích thước và nguồn tham chiếu thực tế vào báo cáo của phiên. Chỉ lấy và xử lý các màn hình trong phạm vi được giao; nếu thiếu nguồn thiết kế cần thiết, ghi rõ trở ngại theo quy trình hiện có.

2. **Ánh xạ style và chuyển HTML sang JSX:** trích xuất màu, font, khoảng cách, bo góc và bố cục từ HTML/CSS cùng ảnh tham chiếu; ánh xạ vào token, CSS hoặc Tailwind hiện có của dự án. Chuyển các thuộc tính như `class` thành `className`, `for` thành `htmlFor`, xử lý thẻ tự đóng và cú pháp style theo JSX. Sử dụng asset đúng nguồn và kiểm tra đường dẫn ảnh/font; cấu hình style trong hệ thống build hiện có thay vì chép script hoặc CDN của bản xuất Stitch vào ứng dụng. Giữ bố cục và diện mạo theo thiết kế đã được xác minh.

3. **Tổ chức component:** kiểm tra các page, layout và component dùng chung hiện có trước khi tạo mới. Tách các phần có thể tái sử dụng như thẻ sự kiện, bộ lọc hoặc phân trang thành component `.tsx` tại vị trí phù hợp với cấu trúc dự án. Khai báo kiểu props rõ ràng, ưu tiên kiểu dữ liệu API hiện có và truyền dữ liệu vào component qua props; không buộc mọi trang phải có interface props rỗng.

4. **Tổ chức hành vi và dữ liệu:** đưa xử lý có thể tái sử dụng vào hook hoặc lớp dữ liệu phù hợp, sử dụng Axios client và cơ chế xác thực hiện có. Dữ liệu nghiệp vụ động phải lấy từ API đã được xác minh theo tiểu mục phía trên; khi API thiếu, sai hợp đồng hoặc không hoạt động, dừng tích hợp và ghi `BLOCKED` theo quy định hiện có. Nhãn và nội dung giao diện tĩnh có thể nằm trong component hoặc cấu trúc nội dung sẵn có. Chỉ dùng dữ liệu mô phỏng khi người dùng yêu cầu rõ ràng và phải ghi chú theo quy định hiện tại.

5. **Nối điều hướng và tương tác:** thay các liên kết giả như `href="#"` bằng `Link`/`NavLink` đến route React Router thực tế; dùng nút cho hành động và giữ đúng quyền truy cập của route. Nối form, bộ lọc và các nút với hành vi tương ứng. Xử lý loading, empty, error, success và disabled theo chức năng; giữ label, focus và khả năng thao tác bàn phím phù hợp.

6. **Kiểm tra kết quả chuyển đổi:** đọc các script trong `client/package.json`, chạy build TypeScript/Vite bằng `npm run build` trong `client/` và những kiểm tra phù hợp đang có cho phần thay đổi. So sánh giao diện chạy thực tế với ảnh Stitch trên desktop và mobile, kiểm tra điều hướng, tương tác và trạng thái dữ liệu. Ghi kết quả, sai lệch và tiêu chí chưa xác minh vào báo cáo theo mục 8, rồi cập nhật Master Plan theo mục 9; chỉ kết luận đạt khi có bằng chứng tương ứng.

Sử dụng cấu trúc thư mục và công cụ thực sự có trong EventHub. Việc tham khảo skill nguồn không yêu cầu thêm script Bash, validator AST, `mockData.ts`, thay hệ thống style hoặc tạo một quy trình báo cáo khác.

## 7. Danh sách tiêu chí rà soát

Đánh giá màn hình theo các tiêu chí sau:

1. **Yêu cầu và nội dung:** các chức năng, nội dung và trường dữ liệu bắt buộc đã đầy đủ chưa?
2. **Bố cục:** căn chỉnh, khoảng cách và thứ bậc thị giác có hợp lý không?
3. **Hệ thống thiết kế:** màu sắc, kiểu chữ, biểu tượng và thành phần có nhất quán với Cosmic Graffiti không?
4. **Ngôn ngữ và khả năng đọc:** nội dung tiếng Việt có chính xác, dễ đọc và đủ tương phản không?
5. **Điều hướng và nghiệp vụ:** luồng thao tác có phù hợp với yêu cầu và các màn hình liên quan không?
6. **Trạng thái giao diện:** các trạng thái đang tải, trống dữ liệu, lỗi, thành công và vô hiệu hóa có được xử lý khi cần thiết không?
7. **Khả năng thích ứng và khả năng tiếp cận:** có bằng chứng phù hợp để đánh giá thiết kế trên nhiều kích thước màn hình và khả năng sử dụng hay không?
8. **Tính nhất quán:** màn hình có đồng bộ với các màn hình liên quan không?

### Trạng thái của từng tiêu chí

Ghi nhận một trong bốn trạng thái sau:

- `PASS` — Đã kiểm chứng và đáp ứng tiêu chí dựa trên bằng chứng hiện có.
- `PARTIAL` — Đáp ứng một phần nhưng vẫn còn vấn đề.
- `FAIL` — Có bằng chứng xác nhận tiêu chí bắt buộc chưa được đáp ứng.
- `NOT_VERIFIED` — Chưa đủ bằng chứng để đánh giá.

Không đánh dấu khả năng thích ứng, hành vi tương tác hoặc khả năng tiếp cận là `PASS` chỉ dựa trên một ảnh chụp màn hình tĩnh ở máy tính.

### Kết quả rà soát tổng thể

Sử dụng một trong các kết quả sau:

- `ĐẠT` — Tất cả tiêu chí quan trọng và bắt buộc đã được kiểm chứng và đáp ứng.
- `ĐẠT CÓ ĐIỀU KIỆN` — Các yêu cầu quan trọng đã đạt, chỉ còn những cải thiện không gây cản trở.
- `KHÔNG ĐẠT` — Có ít nhất một yêu cầu quan trọng chưa được đáp ứng.
- `CHƯA ĐỦ BẰNG CHỨNG` — Bằng chứng hiện có chưa đủ để đưa ra kết luận đáng tin cậy.
- `BLOCKED` — Không thể tiếp tục rà soát do trở ngại bên ngoài.

Không hạ thấp mức độ của một lỗi quan trọng chỉ để đưa màn hình vào trạng thái đạt.

## 8. Tạo báo cáo mới cho từng phiên làm việc

Mỗi phiên làm việc liên quan đến thiết kế, triển khai, rà soát hoặc xác minh màn hình **bắt buộc** phải có một báo cáo riêng, kể cả khi phiên bị chặn, không có thay đổi hoặc chỉ xác minh. Không được kết thúc phiên nếu chưa có báo cáo.

**Thư mục báo cáo:**

`docs/reports/stitch/`

**Quy tắc đặt tên:**

`<MA_MAN_HINH>_<YYYYMMDD_HHMMSS>_<HANH_DONG>.md`

Ví dụ:

- `A1_20261025_090000_review.md`
- `A1_20261025_103000_correction.md`
- `B3_20261025_110000_creation.md`

Sử dụng thời điểm thực tế của phiên làm việc theo múi giờ `Asia/Ho_Chi_Minh` (UTC+07:00).

Không ghi đè hoặc xóa báo cáo cũ. Nếu tên tệp đã tồn tại, tạo tên mới duy nhất.

### Nội dung bắt buộc của báo cáo

Mỗi báo cáo cần có:

1. Mã và tên chính thức của màn hình.
2. ID dự án Stitch và tham chiếu màn hình thực tế nếu có.
3. Ngày, giờ và loại hành động của phiên làm việc.
4. Các yêu cầu liên quan được trích từ Master Plan.
5. Trạng thái thiết kế ban đầu.
6. Các tiêu chí nghiệm thu.
7. Những thao tác đã thực sự thực hiện.
8. Danh sách rà soát và kết quả từng tiêu chí.
9. Bằng chứng về kết quả, chẳng hạn tham chiếu màn hình đã xác minh, ảnh chụp hoặc kết quả công cụ nếu có.
10. Mức độ tuân thủ thiết kế Stitch và các sai lệch đã được duyệt, nếu có.
11. Danh sách API đã xác minh: method/đường dẫn, môi trường, bằng chứng hoạt động và kết quả tích hợp.
12. Các vấn đề đã giải quyết.
13. Vấn đề còn tồn tại và trở ngại.
14. Kết quả rà soát tổng thể.
15. Trạng thái thiết kế cuối cùng.
16. Các trường đã cập nhật trong Master Plan.
17. Giới hạn và các tiêu chí chưa thể xác minh.

Phải phân biệt rõ thao tác đã thử thực hiện với thao tác đã được xác nhận thành công.

Không tự tạo bằng chứng, ảnh chụp, đường dẫn hoặc kết quả công cụ chưa tồn tại.

## 9. Cập nhật Master Plan

Sau khi lưu báo cáo, **bắt buộc** cập nhật đúng mục của màn hình mục tiêu trong:

`docs/PROJECT_MASTER_PLAN.md`

Không được kết thúc phiên nếu Master Plan chưa được cập nhật.

Chỉ cập nhật những trường có đủ bằng chứng hỗ trợ:

- Trạng thái thiết kế.
- Kết quả rà soát gần nhất.
- Trạng thái triển khai giao diện theo Stitch, nếu có.
- API đã xác minh và trạng thái tích hợp, nếu có.
- Các vấn đề còn tồn tại.
- Đường dẫn báo cáo mới nhất.
- Thời điểm cập nhật hoặc xác minh gần nhất.
- Bằng chứng hoặc ghi chú xác minh ngắn gọn.

Giữ nguyên các mục màn hình khác và thông tin dự án không liên quan.

Master Plan cần ngắn gọn, phản ánh trạng thái mới nhất đã xác minh, không thay thế báo cáo chi tiết của phiên làm việc.

### Vị trí cập nhật trong Master Plan hiện tại

- Cột `Triển khai` trong các bảng 5.1, 5.2, 5.3: trạng thái code theo thiết kế Stitch.
- Bảng 5.4 `Theo dõi review Stitch đã xác minh`: kết quả review, vấn đề, báo cáo và thời điểm.
- Mục 4 `Ma trận tích hợp Frontend–Backend`: API đã xác minh và trạng thái tích hợp.
- Mục 6.F `Tích hợp API & nghiệp vụ`: tiến độ tích hợp API thực tế.
- Không tạo bảng hoặc mục trùng lặp; nếu cấu trúc Master Plan thay đổi, ưu tiên cấu trúc hiện có.

### Quy tắc cập nhật

- Có báo cáo mới không đồng nghĩa màn hình đã đạt.
- Tạo được màn hình không đồng nghĩa đã rà soát xong.
- Rà soát thiết kế không chứng minh rằng frontend, tích hợp API hoặc kiểm thử toàn hệ thống đã hoàn tất.
- Nếu chưa phát hiện lỗi nhưng vẫn có tiêu chí chưa thể xác minh, không kết luận đạt hoàn toàn.
- Nếu phiên bị chặn hoặc không có thay đổi, vẫn phải ghi nhận trạng thái, trở ngại và báo cáo mới vào Master Plan.
- Nếu cấu trúc Master Plan hiện tại khác với quy ước trong Skill, ưu tiên giữ nguyên cấu trúc đang có và chỉ bổ sung những trường cần thiết.
- Không tự tạo đường dẫn báo cáo hoặc thời điểm cập nhật.
- Không xóa lịch sử hay ghi đè thông tin hợp lệ của các màn hình khác.

## 10. Xác minh trước khi kết thúc

Trước khi kết thúc phiên làm việc, kiểm tra:

1. Màn hình mục tiêu đã thực sự được kiểm tra và chỉnh sửa hay chưa; nếu chưa, đã nêu rõ lý do chưa?
2. Thiết kế Stitch có bị thay đổi ngoài yêu cầu không?
3. API được gọi đã tồn tại, đúng hợp đồng dữ liệu và có bằng chứng đang hoạt động chưa?
4. Báo cáo mới đã tồn tại và phản ánh đúng các thao tác thực tế chưa?
5. Master Plan đã trỏ đến đúng báo cáo mới và cập nhật tiến độ chưa?
6. Chỉ trạng thái của màn hình mục tiêu được thay đổi, trừ khi có thay đổi khác thực sự cần thiết?
7. Có tệp mã nguồn hoặc màn hình ngoài phạm vi nào bị chỉnh sửa không?
8. Kết quả cuối cùng, các vấn đề còn tồn tại và những tiêu chí chưa xác minh đã được ghi nhận đầy đủ chưa?

Nếu có thể sử dụng Git, kiểm tra các thay đổi để phát hiện chỉnh sửa ngoài phạm vi. Không tự ý hoàn tác các thay đổi có sẵn của người dùng.

Nếu không thể xác minh một bước, phải ghi rõ bước đó chưa được xác minh thay vì báo đã hoàn tất.

## 11. Định dạng phản hồi cuối cùng

Luôn phản hồi bằng tiếng Việt, trình bày rõ ràng và ngắn gọn, bao gồm:

- **Màn hình:** mã và tên chính thức.
- **Thao tác trên Stitch:** những gì đã thực sự hoàn thành.
- **Tuân thủ Stitch:** giữ nguyên thiết kế hay có thay đổi đã được duyệt.
- **API đã xác minh:** route/method và bằng chứng đang hoạt động, hoặc lý do chưa xác minh.
- **Kết quả rà soát:** kết luận tổng thể và các phát hiện quan trọng.
- **Vấn đề còn tồn tại:** lỗi, giới hạn hoặc trở ngại chưa giải quyết.
- **Báo cáo:** đường dẫn tệp báo cáo đã tạo.
- **Master Plan:** các trường đã cập nhật.
- **Tiêu chí chưa xác minh:** những nội dung chưa đủ bằng chứng.

Tuyệt đối không tuyên bố thành công nếu chưa có bằng chứng xác nhận.
