import { useEffect, useMemo, useState } from "react";
import { Download, Eye, LockKeyhole, Search, ShieldCheck, Users, UserCheck, UserX, ChevronLeft, ChevronRight, X } from "lucide-react";
import api from "@/lib/api";
import { message, money } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { AdminShell } from "./AdminShell";

type Customer = {
  idUser: string; name: string; email: string; phone: string | null;
  emailVerified: boolean; roles: string[]; status: "ACTIVE" | "INACTIVE";
  locked_at: string | null; lock_reason: string | null; createdAt: string;
  orderCount: number; totalSpend: string;
};
type CustomerPage = { data: Customer[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
type Counts = { total: number; active: number; inactive: number; locked: number };

const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
const shortId = (value: string) => value.slice(0, 8).toUpperCase();

export function C2ManagerAccount() {
  const revision = useAuth(state => state.revision);
  const [page, setPage] = useState(0), [limit, setLimit] = useState(10), [status, setStatus] = useState("");
  const [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [result, setResult] = useState<CustomerPage | null>(null), [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]), [detail, setDetail] = useState<Customer | null>(null);
  const [lockOpen, setLockOpen] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const params = useMemo(() => {
    const value = new URLSearchParams({ role: "USER", page: String(page), limit: String(limit), q: query });
    if (status) value.set("status", status);
    return value.toString();
  }, [page, limit, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { setSelected([]); }, [page, limit, query, status]);
  const modalOpen = Boolean(detail) || lockOpen;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = document.querySelector<HTMLElement>(".c2-dialog");
    const focusable = () => panel?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])') ?? [];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDetail(null); setLockOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [modalOpen]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setResult(null); setCounts(null);
    Promise.all([
      api.get<{ data: CustomerPage }>(`/admin/users?${params}`, { signal: controller.signal }),
      api.get<{ data: Counts }>(`/admin/users/stats?${new URLSearchParams({ role: "USER", q: query })}`, { signal: controller.signal }),
    ]).then(([list, stats]) => {
      if (controller.signal.aborted) return;
      setResult(list.data.data); setCounts(stats.data.data);
      if (list.data.data.pagination.totalPages > 0 && page >= list.data.data.pagination.totalPages) setPage(list.data.data.pagination.totalPages - 1);
    }).catch(e => { if (!controller.signal.aborted) setError(message(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params, query, revision, refresh, page]);

  const customers = result?.data ?? [];
  const pagination = result?.pagination;
  const allSelected = customers.length > 0 && customers.every(user => selected.includes(user.idUser));
  const toggleAll = () => setSelected(allSelected ? [] : customers.map(user => user.idUser));
  const toggleOne = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  async function openDetails(user: Customer) {
    setBusy(true); setError("");
    try {
      const response = await api.get<{ data: Customer }>(`/admin/users/${user.idUser}`);
      setDetail(response.data.data);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  async function exportCsv() {
    setBusy(true); setError("");
    try {
      const exportParams = new URLSearchParams({ role: "USER", q: query });
      if (status) exportParams.set("status", status);
      const response = await api.get<Blob>(`/admin/users/export?${exportParams}`, { responseType: "blob" });
      const href = URL.createObjectURL(response.data), anchor = document.createElement("a");
      anchor.href = href; anchor.download = `eventhub-customers-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(href);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  async function lockSelected() {
    setBusy(true); setError("");
    try {
      const response = await api.patch<{ data: { updated: number; skipped: number } }>("/admin/users/bulk-status", { ids: selected, status: "INACTIVE", locked: true, reason: reason.trim() });
      setNotice(`Đã khóa ${response.data.data.updated} tài khoản${response.data.data.skipped ? `; bỏ qua ${response.data.data.skipped} đã khóa` : ""}.`);
      setLockOpen(false); setReason(""); setSelected([]); setRefresh(value => value + 1);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  return <AdminShell title="Khách hàng"><div className="c2-page">
    <style>{styles}</style>
    <div className="c2-crumb"><span>QUẢN TRỊ</span><span>/</span><b>KHÁCH HÀNG</b></div>
    <header className="c2-hero"><div><span className="c2-eyebrow"><ShieldCheck size={14}/> PHÂN HỆ C2 · KHÁCH HÀNG</span><h1>Quản lý khách hàng</h1><p>Thông tin tài khoản khách hàng, trạng thái và hoạt động mua vé.</p></div><span className="c2-customer-mark"><Users size={18}/> CUSTOMER ACCOUNTS</span></header>
    <section className="c2-kpis" aria-label="Tổng quan khách hàng">
      {[
        { label: "Tổng khách hàng", value: counts?.total, icon: Users, tone: "purple" },
        { label: "Đang hoạt động", value: counts?.active, icon: UserCheck, tone: "cyan" },
        { label: "Không hoạt động", value: counts?.inactive, icon: UserX, tone: "pink" },
        { label: "Đang bị khóa", value: counts?.locked, icon: LockKeyhole, tone: "red" },
      ].map(card => <article className={`c2-kpi ${card.tone}`} key={card.label}><span className="c2-kpi-icon"><card.icon size={18}/></span><span className="c2-kpi-label">{card.label}</span><strong>{card.value == null ? "—" : card.value.toLocaleString("vi-VN")}</strong></article>)}
    </section>
    <section className="c2-toolbar">
      <div className="c2-status-tabs" aria-label="Lọc trạng thái">{[{ key: "", label: "Tất cả", count: counts?.total }, { key: "ACTIVE", label: "Hoạt động", count: counts?.active }, { key: "INACTIVE", label: "Không hoạt động", count: counts?.inactive }, { key: "LOCKED", label: "Đã khóa", count: counts?.locked }].map(item => <button className={status === item.key ? "active" : ""} key={item.key || "all"} onClick={() => { setStatus(item.key); setPage(0); }}>{item.label}<span>{item.count?.toLocaleString("vi-VN") ?? "—"}</span></button>)}</div>
      <div className="c2-actions"><button className="c2-btn secondary" disabled={busy} onClick={() => void exportCsv()}><Download size={16}/> Xuất CSV</button><button className="c2-btn primary" disabled={!selected.length || busy} onClick={() => setLockOpen(true)}><LockKeyhole size={16}/> Khóa đã chọn {selected.length ? `(${selected.length})` : ""}</button></div>
    </section>
    <section className="c2-filters"><label className="c2-search"><Search size={17}/><input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm theo tên, email hoặc số điện thoại" aria-label="Tìm khách hàng"/><kbd>⌘ K</kbd></label><label className="c2-role">Vai trò <span>Khách hàng · USER</span></label><button className="c2-refresh" onClick={() => setRefresh(value => value + 1)}>Làm mới</button></section>
    {error && <div className="c2-alert" role="alert">{error}<button onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>}
    {notice && <div className="c2-notice" role="status">{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice("")}><X size={16}/></button></div>}
    <section className="c2-table-card"><div className="c2-table-head"><div><h2>Danh sách khách hàng</h2><p>{pagination ? `${pagination.total.toLocaleString("vi-VN")} tài khoản phù hợp` : "Đang tải dữ liệu"}</p></div><span className="c2-page-meta">{pagination && pagination.total ? `${page * limit + 1}–${Math.min((page + 1) * limit, pagination.total)} / ${pagination.total.toLocaleString("vi-VN")}` : "0 khách hàng"}</span></div>
      <div className="c2-table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Chọn khách hàng trên trang này" checked={allSelected} onChange={toggleAll}/></th><th>KHÁCH HÀNG</th><th>LIÊN HỆ</th><th>NGÀY THAM GIA</th><th>XÁC MINH</th><th>ĐƠN HÀNG</th><th>TỔNG CHI TIÊU</th><th>TRẠNG THÁI</th><th/></tr></thead><tbody>
        {loading && !result ? <tr><td colSpan={9} className="c2-state">Đang tải danh sách khách hàng…</td></tr> : customers.map(user => <tr key={user.idUser}><td><input type="checkbox" aria-label={`Chọn ${user.name}`} checked={selected.includes(user.idUser)} onChange={() => toggleOne(user.idUser)}/></td><td><div className="c2-person"><span className="c2-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><b>{user.name}</b><small>#{shortId(user.idUser)} · USER</small></span></div></td><td><b className="c2-email">{user.email}</b><small>{user.phone || "Chưa có số điện thoại"}</small></td><td>{date(user.createdAt)}</td><td><span className={`c2-verified ${user.emailVerified ? "yes" : "no"}`}>{user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</span></td><td>{user.orderCount.toLocaleString("vi-VN")}</td><td className="c2-spend">{money(user.totalSpend)}</td><td><span className={`c2-status ${user.locked_at ? "locked" : user.status.toLowerCase()}`}>{user.locked_at ? "Đã khóa" : user.status === "ACTIVE" ? "Hoạt động" : "Không hoạt động"}</span>{user.lock_reason && <small className="c2-lock-reason">{user.lock_reason}</small>}</td><td><button className="c2-icon-button" aria-label={`Xem chi tiết ${user.name}`} title="Xem chi tiết" onClick={() => void openDetails(user)}><Eye size={17}/></button></td></tr>)}
        {!loading && !customers.length && <tr><td colSpan={9} className="c2-state">{query || status ? "Không tìm thấy khách hàng phù hợp." : "Chưa có khách hàng."}</td></tr>}
      </tbody></table></div>
      <footer className="c2-pagination"><label>Số dòng <select value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(0); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select> / trang</label><div><button aria-label="Trang trước" disabled={page <= 0 || loading} onClick={() => setPage(value => value - 1)}><ChevronLeft size={17}/></button><span>Trang <b>{pagination?.totalPages ? page + 1 : 0}</b> / {pagination?.totalPages ?? 0}</span><button aria-label="Trang sau" disabled={!pagination || page + 1 >= pagination.totalPages || loading} onClick={() => setPage(value => value + 1)}><ChevronRight size={17}/></button></div></footer>
    </section>
    {detail && <div className="c2-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null); }}><section className="c2-dialog" role="dialog" aria-modal="true" aria-labelledby="c2-detail-title"><button className="c2-close" onClick={() => setDetail(null)} aria-label="Đóng"><X size={18}/></button><span className="c2-eyebrow">HỒ SƠ KHÁCH HÀNG</span><h2 id="c2-detail-title">{detail.name}</h2><p className="c2-detail-id">{detail.idUser}</p><dl>{[["Email", detail.email], ["Điện thoại", detail.phone || "Chưa cập nhật"], ["Vai trò", detail.roles.join(", ")], ["Email", detail.emailVerified ? "Đã xác minh" : "Chưa xác minh"], ["Trạng thái", detail.locked_at ? "Đã khóa" : detail.status === "ACTIVE" ? "Hoạt động" : "Không hoạt động"], ["Lý do khóa", detail.lock_reason || "—"], ["Ngày tham gia", date(detail.createdAt)], ["Tổng đơn", detail.orderCount.toLocaleString("vi-VN")], ["Tổng chi tiêu", money(detail.totalSpend)]].map(([label, value], index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section></div>}
    {lockOpen && <div className="c2-overlay"><section className="c2-dialog" role="dialog" aria-modal="true" aria-labelledby="c2-lock-title"><button className="c2-close" onClick={() => setLockOpen(false)} aria-label="Đóng"><X size={18}/></button><span className="c2-eyebrow">XÁC NHẬN THAO TÁC</span><h2 id="c2-lock-title">Khóa {selected.length} tài khoản?</h2><p>Các khách hàng đã khóa sẽ được bỏ qua. Tài khoản bị khóa sẽ không thể đăng nhập.</p><label className="c2-reason-label">Lý do khóa<textarea value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} rows={4} placeholder="Nhập lý do để ghi nhận cho tài khoản…"/></label>{error && <div className="c2-alert" role="alert">{error}</div>}<div className="c2-dialog-actions"><button className="c2-btn secondary" disabled={busy} onClick={() => setLockOpen(false)}>Hủy</button><button className="c2-btn primary" disabled={busy || !reason.trim()} onClick={() => void lockSelected()}>{busy ? "Đang xử lý…" : "Xác nhận khóa"}</button></div></section></div>}
  </div></AdminShell>;
}

const styles = `
.admin-c2-main{max-width:none!important;margin:0!important;padding:0!important;min-height:100vh!important}
.c2-page{--bg:#0f1222;--surface:#181b2a;--surface2:#1c1f2f;--high:#262939;--line:#302f43;--ink:#e0e1f7;--muted:#aaa6bc;--dim:#858197;--purple:#a78bfa;--cyan:#5de6ff;--pink:#ffafd3;min-height:calc(100vh - 72px);padding:32px clamp(16px,3vw,48px) 48px;background:var(--bg);color:var(--ink);font:14px/1.5 'Be Vietnam Pro',Inter,sans-serif}
.c2-crumb{display:flex;gap:10px;color:var(--dim);font:600 11px 'Space Grotesk',sans-serif;letter-spacing:.1em}.c2-crumb b{color:#c4b5fd}.c2-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:22px 0 28px}.c2-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#c4b5fd;font:700 11px 'Space Grotesk',sans-serif;letter-spacing:.08em}.c2-hero h1{margin:10px 0 5px;font:700 clamp(26px,3vw,36px)/1.15 Be Vietnam Pro,'Be Vietnam Pro',sans-serif;letter-spacing:-.035em}.c2-hero p,.c2-table-head p{margin:0;color:var(--muted)}.c2-customer-mark{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid var(--line);border-radius:8px;color:var(--cyan);background:#101729;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.06em}.c2-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:20px}.c2-kpi{position:relative;display:grid;grid-template-columns:36px 1fr;align-items:center;column-gap:10px;padding:16px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(135deg,var(--surface),#151829)}.c2-kpi-icon{grid-row:span 2;display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#7c3aed25;color:var(--purple)}.c2-kpi.cyan .c2-kpi-icon{background:#22d3ee18;color:var(--cyan)}.c2-kpi.pink .c2-kpi-icon{background:#f472b618;color:var(--pink)}.c2-kpi.red .c2-kpi-icon{background:#fb71851b;color:#fb7185}.c2-kpi-label{color:var(--muted);font-size:12px}.c2-kpi strong{font:700 25px/1.2 Be Vietnam Pro,'Be Vietnam Pro',sans-serif}.c2-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 13px}.c2-status-tabs{display:flex;gap:4px;overflow:auto}.c2-status-tabs button{display:flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 11px;border:1px solid transparent;border-radius:7px;background:none;color:var(--muted);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}.c2-status-tabs button span{padding:1px 6px;border-radius:10px;background:#ffffff0b;color:#aaa6bc;font:600 10px 'Space Grotesk',sans-serif}.c2-status-tabs button.active{border-color:#7c3aed70;background:#7c3aed20;color:#e7ddff}.c2-status-tabs button.active span{background:#7c3aed;color:white}.c2-actions{display:flex;gap:8px}.c2-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--ink);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}.c2-btn.primary{border-color:#7c3aed;background:#7c3aed;color:white}.c2-btn.secondary{background:var(--surface)}.c2-btn:disabled{opacity:.45;cursor:not-allowed}.c2-filters{display:flex;align-items:center;gap:12px;margin-bottom:13px}.c2-search{display:flex;align-items:center;gap:9px;flex:1;max-width:620px;padding:0 12px;height:42px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--dim)}.c2-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif}.c2-search kbd{color:var(--dim);font:11px 'Space Grotesk',sans-serif}.c2-role{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:11px}.c2-role span{padding:7px 9px;border:1px solid var(--line);border-radius:6px;color:#c4b5fd;background:#7c3aed14}.c2-refresh{border:0;background:none;color:var(--cyan);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}.c2-alert,.c2-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 13px;border:1px solid #fb718566;border-radius:7px;background:#7f1d1d22;color:#fecaca}.c2-alert button,.c2-notice button{border:0;background:none;color:inherit;cursor:pointer}.c2-notice{border-color:#22d3ee55;background:#08334455;color:#a5f3fc}.c2-table-card{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)}.c2-table-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid var(--line)}.c2-table-head h2{margin:0 0 3px;font:700 16px Be Vietnam Pro,'Be Vietnam Pro',sans-serif}.c2-table-head p{font-size:11px}.c2-page-meta{color:var(--muted);font:11px 'Space Grotesk',sans-serif}.c2-table-scroll{overflow:auto} .c2-table-scroll table{width:100%;border-collapse:collapse;min-width:1000px}.c2-table-scroll th{padding:11px 12px;text-align:left;color:var(--dim);background:#141727;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.05em;white-space:nowrap}.c2-table-scroll td{padding:12px;border-top:1px solid #ffffff0a;color:#d4d2e2;font-size:12px;vertical-align:middle}.c2-table-scroll tr:hover td{background:#ffffff04}.c2-table-scroll input[type=checkbox]{accent-color:#8b5cf6;width:15px;height:15px}.c2-person{display:flex;align-items:center;gap:10px;min-width:190px}.c2-avatar{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:9px;background:#7c3aed30;color:#ddd1ff;font:700 14px Be Vietnam Pro,sans-serif}.c2-person b,.c2-email{display:block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-size:12px}.c2-person small,.c2-table-scroll td small{display:block;margin-top:3px;color:var(--dim);font:10px 'Space Grotesk',sans-serif}.c2-verified,.c2-status{display:inline-flex;white-space:nowrap;padding:4px 7px;border-radius:20px;font-size:10px}.c2-verified.yes,.c2-status.active{background:#10b98118;color:#6ee7b7}.c2-verified.no,.c2-status.inactive{background:#f59e0b18;color:#fcd34d}.c2-status.locked{background:#fb718518;color:#fda4af}.c2-spend{white-space:nowrap;font-weight:600}.c2-lock-reason{max-width:160px;color:#fda4af!important}.c2-icon-button{display:grid;place-items:center;width:31px;height:31px;border:1px solid var(--line);border-radius:7px;background:#ffffff04;color:#bdb8d0;cursor:pointer}.c2-icon-button:hover{border-color:#7c3aed;color:white}.c2-state{padding:45px!important;text-align:center!important;color:var(--muted)!important}.c2-pagination{display:flex;justify-content:space-between;align-items:center;padding:13px 17px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.c2-pagination label,.c2-pagination div{display:flex;align-items:center;gap:8px}.c2-pagination select{padding:5px 7px;border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--ink)}.c2-pagination button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);color:var(--ink);cursor:pointer}.c2-pagination button:disabled{opacity:.35;cursor:not-allowed}.c2-pagination b{color:var(--ink)}.c2-overlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:#050610bd;backdrop-filter:blur(5px)}.c2-dialog{position:relative;width:min(100%,530px);max-height:90vh;overflow:auto;padding:25px;border:1px solid #4b4267;border-radius:12px;background:#181b2a;box-shadow:0 24px 90px #0008}.c2-dialog h2{margin:12px 0 4px;font:700 23px Be Vietnam Pro,'Be Vietnam Pro',sans-serif}.c2-dialog p{color:var(--muted);font-size:13px}.c2-detail-id{font:11px 'Space Grotesk',sans-serif;overflow-wrap:anywhere}.c2-dialog dl{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;margin:20px 0 0}.c2-dialog dl div{padding:11px 0;border-top:1px solid var(--line)}.c2-dialog dt{color:var(--dim);font-size:11px}.c2-dialog dd{margin:4px 0 0;color:var(--ink);font-size:13px;overflow-wrap:anywhere}.c2-close{position:absolute;top:15px;right:15px;display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--line);border-radius:7px;background:none;color:var(--muted);cursor:pointer}.c2-reason-label{display:block;margin-top:18px;color:var(--ink);font-size:12px}.c2-reason-label textarea{display:block;width:100%;margin-top:7px;padding:10px;border:1px solid var(--line);border-radius:7px;background:#101322;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif;resize:vertical}.c2-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
@media(max-width:1000px){.c2-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.c2-toolbar{align-items:flex-start;flex-direction:column}.c2-actions{width:100%}.c2-actions .c2-btn{flex:1}}
@media(max-width:640px){.c2-page{padding:22px 12px 32px}.c2-hero{align-items:flex-start;margin:18px 0 20px}.c2-customer-mark{display:none}.c2-kpis{gap:8px}.c2-kpi{padding:11px;grid-template-columns:30px 1fr;gap:5px 8px}.c2-kpi-icon{width:30px;height:30px}.c2-kpi strong{font-size:20px}.c2-status-tabs{width:100%;padding-bottom:2px}.c2-filters{flex-wrap:wrap}.c2-search{flex-basis:100%;max-width:none}.c2-role{flex:1}.c2-table-head{padding:14px 12px}.c2-table-scroll table{min-width:920px}.c2-pagination{padding:11px 9px}.c2-dialog{padding:21px 17px}.c2-dialog dl{grid-template-columns:1fr}}
`;
