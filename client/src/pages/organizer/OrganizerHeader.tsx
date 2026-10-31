import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, Plus, Search } from "lucide-react";
import authService from "@/features/auth/services/authService";
import { useAuth } from "@/features/auth/stores/authStore";
import "./organizer.css";

interface OrganizerHeaderProps {
  title: string;
  menuButton?: ReactNode;
  searchSlot?: ReactNode;
  notificationSlot?: ReactNode;
}

export function OrganizerHeader({
  title,
  menuButton,
  searchSlot,
  notificationSlot,
}: OrganizerHeaderProps) {
  const { user } = useAuth();
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false);
  const identityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (
        identityMenuRef.current &&
        !identityMenuRef.current.contains(event.target as Node)
      ) {
        setIdentityMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIdentityMenuOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function handleLogout() {
    try {
      await authService.logout();
    } catch {
      // authService clears the local session even when the request fails.
    } finally {
      setIdentityMenuOpen(false);
    }
  }

  return (
    <header className="org-header">
      <div className="org-header-left">
        {menuButton}
        <nav className="org-breadcrumb" aria-label="Đường dẫn">
          <Link to="/organizer">EventHub Ops</Link>
          <span className="org-crumb-sep">/</span>
          <span className="org-crumb-current">{title}</span>
        </nav>
        {searchSlot ?? (
          <label className="org-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm vé, đơn hàng, khách..."
              aria-label="Tìm kiếm"
            />
          </label>
        )}
      </div>
      <div className="org-header-right">
        <Link className="org-create-btn" to="/organizer/new">
          <Plus size={16} aria-hidden="true" />
          Tạo sự kiện
        </Link>
        {notificationSlot ?? (
          <Link className="org-bell" to="/notifications" aria-label="Thông báo">
            <Bell size={20} aria-hidden="true" />
            <span className="org-bell-dot" aria-hidden="true" />
          </Link>
        )}
        <div className="org-identity-menu" ref={identityMenuRef}>
          <button
            type="button"
            className="org-identity"
            aria-label="Menu tài khoản"
            aria-haspopup="menu"
            aria-expanded={identityMenuOpen}
            onClick={() => setIdentityMenuOpen((open) => !open)}
          >
            <span className="org-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" />
              ) : (
                user?.name.slice(0, 1).toUpperCase() ?? "B"
              )}
            </span>
            <span className="org-identity-text">
              <span className="org-identity-name">
                {user?.name ?? "Ban Tổ Chức"}
              </span>
              <span className="org-identity-role">
                {user?.roles.includes("ADMIN") ? "Quản trị viên" : "BTC"}
              </span>
            </span>
          </button>
          {identityMenuOpen && (
            <div className="org-identity-dropdown" role="menu">
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setIdentityMenuOpen(false)}
              >
                Hồ sơ cá nhân
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
