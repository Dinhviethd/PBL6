import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/authStore";
import { NotificationLink } from "@/components/ticketing/notification-link";
import authService from "@/features/auth/services/authService";

export function AdminHeader({ title, onMenu }: { title: string; onMenu?: () => void }) {
  const user = useAuth(state => state.user);
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0])
    .join("")
    .toUpperCase() || "A";

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await authService.logout();
      navigate("/auth/login", { replace: true });
    } catch {
      setLogoutError("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  return <header className="admin-header">
    <button className="admin-menu-toggle" type="button" aria-label="Mở điều hướng quản trị" onClick={onMenu}><Menu size={19}/></button>
    <div className="admin-breadcrumb"><span>SYSTEM ROOT</span><span>/</span><b>{title.toUpperCase()}</b></div>
    <div className="admin-header-account" ref={accountRef}>
      <span className="admin-online"><i/>Online</span>
      <NotificationLink key={user?.idUser ?? "guest"}/>
      <button
        className="admin-account-trigger"
        type="button"
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        onClick={() => setAccountOpen(value => !value)}
      >
        {user?.avatarUrl ? <img className="admin-avatar" src={user.avatarUrl} alt="" /> : <span className="admin-avatar">{initials}</span>}
        <span className="admin-identity"><b>{user?.name ?? "Quản trị viên"}</b><small>{user?.email}</small></span>
        <ChevronDown className={`admin-account-chevron${accountOpen ? " is-open" : ""}`} size={15} aria-hidden="true"/>
      </button>
      {accountOpen && <div className="admin-account-menu" role="menu">
        <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); navigate("/profile"); }}>Hồ sơ cá nhân</button>
        <button type="button" role="menuitem" onClick={() => void handleLogout()}>Đăng xuất</button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </div>}
    </div>
    <style>{styles}</style>
  </header>;
}

const styles = `
.admin-header{position:fixed;z-index:50;top:0;right:0;left:288px;display:flex;align-items:center;justify-content:space-between;height:80px;padding:0 28px;border-bottom:1px solid #292a3b;background:#0f1222e8;color:#e0e1f7;backdrop-filter:blur(14px)}
.admin-breadcrumb{display:flex;gap:9px;color:#858197;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.1em}.admin-breadcrumb b{color:#c4b5fd}
.admin-header-account{position:relative;display:flex;align-items:center;gap:12px;font:12px 'Be Vietnam Pro',sans-serif}.admin-identity{display:grid;gap:2px;text-align:right}.admin-identity small{color:#a78bfa;font-size:10px}.admin-avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#d2bbff;color:#3f008e;font-weight:700;object-fit:cover}.admin-account-trigger{display:flex;align-items:center;gap:8px;padding:4px;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}.admin-account-trigger:hover .admin-avatar,.admin-account-trigger:focus-visible .admin-avatar{box-shadow:0 0 0 3px #7c3aed55}.admin-account-chevron{color:#a78bfa;transition:transform .15s ease}.admin-account-chevron.is-open{transform:rotate(180deg)}.admin-account-menu{position:absolute;top:calc(100% + 10px);right:0;min-width:176px;padding:6px;border:1px solid #34354a;border-radius:9px;background:#181b2a;box-shadow:0 14px 32px #00000055}.admin-account-menu button{display:block;width:100%;padding:10px 12px;border:0;border-radius:6px;background:transparent;color:#e0e1f7;text-align:left;cursor:pointer;font:500 12px 'Be Vietnam Pro',sans-serif}.admin-account-menu button:hover,.admin-account-menu button:focus-visible{background:#7c3aed2d;color:#fff}.admin-account-menu p{margin:6px 8px;color:#fda4af;font-size:11px}.admin-online{display:flex;align-items:center;gap:6px;color:#5de6ff;font:600 10px 'Space Grotesk',sans-serif}.admin-online i{width:7px;height:7px;border-radius:50%;background:#5de6ff}.admin-menu-toggle{display:none}
@media(max-width:800px){.admin-header{left:0;padding:0 16px}.admin-menu-toggle{display:grid;place-items:center;width:34px;height:34px;margin-right:12px;border:1px solid #302f43;border-radius:7px;background:#181b2a;color:#e0e1f7}.admin-breadcrumb{margin-right:auto}.admin-online{display:none}}
@media(max-width:520px){.admin-header-account{gap:8px}.admin-identity{display:none}.admin-account-menu{right:-4px}}
`;
