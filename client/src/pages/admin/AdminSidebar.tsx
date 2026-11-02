import { NavLink } from "react-router-dom";
import { CreditCard, FileCheck2, LayoutDashboard, Tags, Users, CalendarDays, Building, ClipboardList} from "lucide-react";

const sections = [
  { label: "TỔNG QUAN", links: [{ label: "Dashboard Quản trị", to: "/admin/stats", icon: LayoutDashboard }] },
  { label: "QUẢN LÝ TÀI KHOẢN", links: [
    { label: "Khách hàng", to: "/admin/users", icon: Users },
    { label: "Ban tổ chức", to: "/admin/applications", icon: Building },
    { label: "Hồ sơ đăng ký BTC", to: "/admin/applications/review", icon: FileCheck2 },
  ] },
  { label: "SỰ KIỆN & KIỂM DUYỆT", links: [
    { label: "Danh mục", to: "/admin/categories", icon: Tags },
    { label: "Toàn bộ sự kiện", to: "/admin/events", icon: CalendarDays },
    { label: "Hàng đợi duyệt sự kiện", to: "/admin/events", icon: ClipboardList },   
  ] },
  { label: "TÀI CHÍNH & VẬN HÀNH", links:
    [{ label: "Quản lý giao dịch", to: "/admin/payments", icon: CreditCard }] },
];

export function AdminSidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  return <aside className={`admin-sidebar${open ? " is-open" : ""}`} aria-label="Điều hướng quản trị">
    <NavLink className="admin-brand" to="/admin/stats" onClick={onNavigate}>
      <span className="admin-brand-mark">E</span><span className="admin-brand-copy">EVENT<span>HUB</span><small>SUPER CONTROL</small></span>
    </NavLink>
    <nav className="admin-nav">{sections.map(section => <section className="admin-nav-section" key={section.label}>
      <h2>{section.label}</h2>
      {section.links.map(({ label, to, icon: Icon }) => <NavLink key={`${section.label}-${label}`} to={to} end className={({ isActive }) => `admin-nav-link${isActive ? " is-active" : ""}`} onClick={onNavigate}><Icon size={17}/><span>{label}</span></NavLink>)}
    </section>)}</nav>
    <div className="admin-sidebar-foot"><span>EventHub</span><span>CONTROL CENTER</span></div>
    <style>{styles}</style>
  </aside>;
}

const styles = `
.admin-sidebar{position:fixed;z-index:60;inset:0 auto 0 0;display:flex;flex-direction:column;width:288px;padding:0 14px 14px;border-right:1px solid #292a3b;background:#181b2a;color:#e0e1f7}
.admin-brand{display:flex;align-items:center;gap:10px;height:80px;margin:0 -14px 12px;padding:0 20px;border-bottom:1px solid #292a3b;color:inherit;text-decoration:none}
.admin-brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:#7c3aed;color:white;font:700 19px Syne,'Be Vietnam Pro',sans-serif}
.admin-brand-copy{display:grid;grid-template-columns:auto auto;align-items:center;font:700 16px Syne,'Be Vietnam Pro',sans-serif;letter-spacing:.04em}.admin-brand-copy>span{color:#5de6ff}.admin-brand-copy small{grid-column:1/3;margin-top:2px;color:#a78bfa;font:600 9px 'Space Grotesk',sans-serif;letter-spacing:.12em}
.admin-nav{display:flex;flex:1;flex-direction:column;gap:4px;overflow:auto}.admin-nav-section h2{margin:17px 9px 6px;color:#858197;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.1em}.admin-nav-link{display:flex;align-items:center;gap:10px;padding:10px;border-radius:7px;color:#b8b4c8;text-decoration:none;font:500 12px 'Be Vietnam Pro',sans-serif}.admin-nav-link:hover{background:#ffffff0a;color:white}.admin-nav-link.is-active{background:#7c3aed2d;color:#ddd1ff}.admin-sidebar-foot{display:flex;justify-content:space-between;gap:6px;margin-top:12px;padding:12px 9px;border:1px solid #302f43;border-radius:7px;color:#aaa6bc;font:9px 'Space Grotesk',sans-serif}.admin-sidebar-foot span:last-child{color:#5de6ff}
@media(max-width:800px){.admin-sidebar{transform:translateX(-100%);transition:transform .2s ease}.admin-sidebar.is-open{transform:translateX(0)}}
`;
