import { useState, type ReactNode } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="admin-shell">
    <AdminSidebar open={menuOpen} onNavigate={() => setMenuOpen(false)}/>
    {menuOpen && <button className="admin-scrim" aria-label="Đóng điều hướng quản trị" onClick={() => setMenuOpen(false)}/>}
    <AdminHeader title={title} onMenu={() => setMenuOpen(value => !value)}/>
    <main className="admin-shell-main">{children}</main>
    <style>{styles}</style>
  </div>;
}

const styles = `
.admin-shell{min-height:100vh;background:#0f1222}.admin-shell-main{min-height:100vh;margin-left:288px;padding-top:80px}.admin-scrim{display:none}
@media(max-width:800px){.admin-shell-main{margin-left:0}.admin-scrim{display:block;position:fixed;z-index:55;inset:0;border:0;background:#03040bbd}}
`;
