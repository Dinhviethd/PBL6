import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Menu, Plus, X } from "lucide-react";
import { useAuth } from "@/features/auth/stores/authStore";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { CheckinStation } from "@/components/ticketing/checkin-station";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";

export function QRScanPage() {
  const { id = "" } = useParams();
  const user = useAuth((state) => state.user);
  const revision = useAuth((state) => state.revision);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`qs-page${menuOpen ? " qs-menu-open" : ""}`}>
      <div className="qs-sidebar" id="qr-navigation">
        <OrganizerSidebar active="Quét mã QR" hideLiveSync />
      </div>
      {menuOpen && (
        <button
          className="qs-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="qs-body">
        <header className="qs-header">
          <button
            className="qs-menu-button qs-icon-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="qr-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav aria-label="Đường dẫn">
            <Link to="/organizer">EventHub Ops</Link>
            <span>/</span>
            <span>Ban Tổ Chức</span>
          </nav>
          <div className="qs-account">
            <Link className="qs-button qs-create" to="/organizer/new">
              <Plus size={16} />
              Tạo sự kiện
            </Link>
            <NotificationLink />
            <Link to="/profile" className="qs-user">
              <span>{user?.name.slice(0, 1)}</span>
              <strong>{user?.name}</strong>
            </Link>
          </div>
        </header>
        <CheckinStation
          key={`${revision}:${id}`}
          eventId={id}
          backTo="/organizer"
          backLabel="Chọn sự kiện khác"
        />
      </div>
    </div>
  );
}
