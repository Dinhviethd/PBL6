import "./organizer-sidebar.css";

const menuItems = [
  "Tổng quan (Dashboard)",
  "Quản lý sự kiện",
  "Tạo sự kiện mới",
  "Chi tiết & Phê duyệt",
  "Quản lý loại vé",
  "Đơn hàng",
  "Người tham dự",
  "Quét mã QR",
  "Thống kê doanh thu",
  "Hồ sơ BTC",
] as const;

export function OrganizerSidebar({
  active = "Quản lý sự kiện",
}: {
  active?: string;
}) {
  return (
    <aside className="osb-sidebar" aria-label="Điều hướng Ban Tổ Chức">
      <div className="osb-brand">
        <span className="osb-logo">
          EVENT<span>HUB</span>
        </span>
        <span className="osb-badge">BTC</span>
      </div>
      <div className="osb-section">Hệ thống Điều phối</div>
      <nav className="osb-nav">
        {menuItems.map((item) => (
          <span
            key={item}
            className={`osb-item${item === active ? " is-active" : ""}`}
            aria-current={item === active ? "page" : undefined}
          >
            {item}
          </span>
        ))}
      </nav>
      <div className="osb-live">
        <div className="osb-live-head">
          <span className="osb-live-dot" aria-hidden="true" />
          <span className="osb-live-label">Live Gate Sync</span>
        </div>
        <p>Trực tuyến: Cụm máy chủ VN-S1</p>
      </div>
    </aside>
  );
}
