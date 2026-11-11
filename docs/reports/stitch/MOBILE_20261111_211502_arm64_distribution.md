# EventHub — APK ARM64 và link cài đặt công khai

Thời điểm: 2026-11-11 21:15:02 UTC+07. Người dùng yêu cầu link để gửi người khác cài trên điện thoại thật; đã build và công bố GitHub prerelease, không gửi tin nhắn cho người khác.

- Release: https://github.com/Dinhviethd/PBL6/releases/tag/mobile-preview-20261111-211350
- APK trực tiếp: https://github.com/Dinhviethd/PBL6/releases/download/mobile-preview-20261111-211350/EventHub-1.0.0-android-arm64.apk
- APK 1.0.0/versionCode1, com.pbl6.eventhub; chỉ arm64-v8a; minSdk24/Android7.0;51.479.505bytes.
- SHA256:85efc097ee77b9ffdd27c745175f3e9edb341bb6a4ec40af9ba89d2cf842f2be.
- Gradle assembleRelease -PreactNativeArchitectures=arm64-v8a, BUILD SUCCESSFUL3m57s. Không chỉnh source hoặc config để đổi ABI; đây là tham số build.
- aapt xác minh package/version/ABI/minSdk; apksigner verify PASS, v2signature1signer. Ký debug keystore cho bản thử nghiệm nội bộ, chưa Google Play signing.
- GitHub repo công khai Dinhviethd/PBL6, viewerPermission WRITE. Đã tạo draft, tải APK+SHA256SUMS.txt, kiểm tra asset uploaded/digest, sau đó publish prerelease theo yêu cầu link chia sẻ. Không commit/push source.
- Đã tải APK qua URL công khai không Authorization và đối chiếu SHA256 khớp tệp local. Link không phụ thuộc máy phát triển hoặc tunnel.
- GET https://eventhubqrmarketing.tech/api/health trả200. Native dùng API HTTPS cấu hình hiện hữu, không cần Metro. Không sửa .env.local.
- Artifact local: .local/mobile-distribution/EventHub-1.0.0-android-arm64.apk. Metadata/build log/release notes trong cùng thư mục.

Giới hạn: chưa có điện thoại ARM64 vật lý để kiểm runtime; emulator hiện có làx86_64 nên không cài sai kiến trúc để giả kiểm. Camera/ngân hàng/hiệu năng trên máy thật và iOS còn chưa nghiệm thu. APK không cài trên iPhone. Bản thử nghiệm không phải production đã nghiệm thu.

APK build từ working tree local có thay đổi mobile chưa commit. Tag release trỏ commit remote main5837bb08290818a8957a7184e2b2e0258ddc0073; source archive của tag không đại diện source đầy đủ APK. Điều này đã ghi trong release notes. Không upload mã nguồn/server env/token/keystore riêng; asset chỉ APK và SHA256SUMS.

Master Plan cập nhật link phân phối tại MP-15 và ghi chú5.4; giữ IN_PROGRESS, không đóng các gate nghiệm thu. Không thay artifact Stitch hoặc chức năng.
