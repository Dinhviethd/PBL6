import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, MapPin, Search, Ticket, Users } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { AdminShell } from "./AdminShell";

type EventItem = { id: string; slug: string; title: string; category_id: string | null; organizer_id: string | null; cover_image_url: string | null; venue_name: string; address: string; city_code: string; starts_at: string; ends_at: string; status: string; sales_paused: boolean };
type Filters = { q: string; status: string; categoryId: string; cityCode: string; startsFrom: string; startsTo: string; ticketScale: string };
type Options = { categories: { id: string; name: string }[]; cities: string[]; ticketScales: { value: string; label: string }[] };
type Metric = { eventId: string; ticketCapacity: string; ticketsIssued: string; ticketsSold: string; gmv: string; revenue: string; checkins: string; checkinRate: number };
type Organizer = { id: string; organization_name: string | null; contact_name: string | null; account_name: string | null };
type Kpis = { total: string; selling: string; pending_review: string; paused_or_cancelled: string };
const initial: Filters = { q: "", status: "", categoryId: "", cityCode: "", startsFrom: "", startsTo: "", ticketScale: "" };
const statusNames: Record<string, string> = { DRAFT: "Bản nháp", PENDING_REVIEW: "Chờ duyệt", REJECTED: "Bị từ chối", PUBLISHED: "Đã phát hành", CANCELLED: "Đã hủy", ARCHIVED: "Đã lưu trữ" };
const money = (value: string | number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(typeof value === "number" ? BigInt(Math.trunc(value)) : BigInt(value || "0"));
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const paramsFor = (f: Filters, page?: number, limit?: number) => {
  const query = { ...f, startsFrom: f.startsFrom ? `${f.startsFrom}T00:00:00+07:00` : "", startsTo: f.startsTo ? `${f.startsTo}T23:59:59+07:00` : "", ...(page == null ? {} : { page, limit }) };
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "" && value != null));
};

export function C8TotalEvent() {
  const [draft, setDraft] = useState(initial), [filters, setFilters] = useState(initial), [page, setPage] = useState(0);
  const [options, setOptions] = useState<Options>({ categories: [], cities: [], ticketScales: [] });
  const [items, setItems] = useState<EventItem[]>([]), [metrics, setMetrics] = useState<Record<string, Metric>>({}), [organizers, setOrganizers] = useState<Record<string, Organizer>>({});
  const [kpis, setKpis] = useState<Kpis>({ total: "0", selling: "0", pending_review: "0", paused_or_cancelled: "0" });
  const [pagination, setPagination] = useState({ page: 0, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { api.get("/admin/events/filter-options").then(r => setOptions(r.data.data)).catch(() => setError("Không tải được danh mục bộ lọc.")); }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = paramsFor(filters, page);
      const [list, stats] = await Promise.all([api.get("/admin/events", { params: query }), api.get("/admin/events/kpis", { params: paramsFor(filters) })]);
      const result = list.data.data as { items: EventItem[]; pagination: typeof pagination };
      setItems(result.items); setPagination(result.pagination); setKpis(stats.data.data);
      if (result.items.length) {
        const ids = [...new Set(result.items.map(e => e.id))];
        const organizerIds = [...new Set(result.items.map(e => e.organizer_id).filter((id): id is string => Boolean(id)))];
        const [metricResponse, organizerResponse] = await Promise.all([
          api.get("/admin/events/metrics", { params: { eventIds: ids.join(",") } }),
          organizerIds.length ? api.get("/admin/organizers/summaries", { params: { ids: organizerIds.join(",") } }) : Promise.resolve({ data: { data: [] } }),
        ]);
        setMetrics(Object.fromEntries((metricResponse.data.data as Metric[]).map(row => [row.eventId, row])));
        setOrganizers(Object.fromEntries((organizerResponse.data.data as Organizer[]).map(row => [row.id, row])));
      } else { setMetrics({}); setOrganizers({}); }
    } catch { setError("Không thể tải dữ liệu sự kiện. Hãy thử tải lại."); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { void load(); }, [load]);
  const currentPageIssued = useMemo(() => items.reduce((sum, e) => sum + Number(metrics[e.id]?.ticketsIssued || 0), 0), [items, metrics]);
  const currentPageCheckins = useMemo(() => items.reduce((sum, e) => sum + Number(metrics[e.id]?.checkins || 0), 0), [items, metrics]);
  const apply = (event: React.FormEvent) => { event.preventDefault(); setPage(0); setFilters({ ...draft }); };
  const update = (key: keyof Filters, value: string) => setDraft(old => ({ ...old, [key]: value }));
  return <AdminShell title="Quản lý sự kiện"><div className="c8">
    <header className="c8-heading"><div><div className="c8-eyebrow">EVENTHUB · QUẢN TRỊ HỆ THỐNG</div><h1>Quản lý toàn bộ sự kiện</h1><p>Theo dõi tình trạng, doanh thu, vé và check-in trên toàn nền tảng.</p></div><span className="c8-live"><i/> DỮ LIỆU HỆ THỐNG</span></header>
    <section className="c8-kpis" aria-label="Chỉ số sự kiện">
      <Kpi icon={<CalendarDays/>} label="Tổng sự kiện" value={kpis.total} accent="violet"/>
      <Kpi icon={<Ticket/>} label="Đang mở bán" value={kpis.selling} accent="cyan"/>
      <Kpi icon={<Users/>} label="Chờ duyệt" value={kpis.pending_review} accent="pink"/>
      <Kpi icon={<CircleDollarSign/>} label="Tạm ngưng / đóng" value={kpis.paused_or_cancelled} accent="amber"/>
      <Kpi icon={<ClipboardCheck/>} label="Vé / check-in · trang này" value={`${currentPageIssued.toLocaleString("vi-VN")} / ${currentPageCheckins.toLocaleString("vi-VN")}`} accent="cyan"/>
    </section>
    <form className="c8-filters" onSubmit={apply}>
      <label className="c8-search"><Search size={18}/><input value={draft.q} onChange={e => update("q", e.target.value)} placeholder="Tìm tên, mã sự kiện hoặc ban tổ chức" aria-label="Tìm kiếm sự kiện"/><button type="submit">Tìm kiếm</button></label>
      <div className="c8-filter-grid">
        <select aria-label="Trạng thái" value={draft.status} onChange={e => update("status", e.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(statusNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>
        <select aria-label="Danh mục" value={draft.categoryId} onChange={e => update("categoryId", e.target.value)}><option value="">Mọi danh mục</option>{options.categories.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <select aria-label="Tỉnh / thành" value={draft.cityCode} onChange={e => update("cityCode", e.target.value)}><option value="">Mọi tỉnh / thành</option>{options.cities.map(city => <option key={city} value={city}>{city}</option>)}</select>
        <select aria-label="Quy mô vé" value={draft.ticketScale} onChange={e => update("ticketScale", e.target.value)}><option value="">Mọi quy mô vé</option>{options.ticketScales.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <label className="c8-date">Từ ngày<input type="date" value={draft.startsFrom} onChange={e => update("startsFrom", e.target.value)}/></label>
        <label className="c8-date">Đến ngày<input type="date" value={draft.startsTo} onChange={e => update("startsTo", e.target.value)}/></label>
        <button className="c8-apply" type="submit">Áp dụng bộ lọc</button><button className="c8-reset" type="button" onClick={() => { setDraft(initial); setFilters(initial); setPage(0); }}>Xóa lọc</button>
      </div>
    </form>
    {error && <div className="c8-error" role="alert">{error}<button onClick={() => void load()}>Thử lại</button></div>}
    <section className="c8-table-card"><div className="c8-table-head"><div><h2>Danh sách sự kiện</h2><p>{pagination.total.toLocaleString("vi-VN")} sự kiện phù hợp</p></div><span>Trang {pagination.totalPages ? page + 1 : 0} / {pagination.totalPages}</span></div>
      <div className="c8-table-wrap"><table><thead><tr><th>SỰ KIỆN</th><th>BAN TỔ CHỨC</th><th>THỜI GIAN · ĐỊA ĐIỂM</th><th>VÉ · CHECK-IN</th><th>GMV / DOANH THU</th><th>TRẠNG THÁI</th><th>CHI TIẾT</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="c8-state">Đang tải dữ liệu…</td></tr> : items.length === 0 ? <tr><td colSpan={7} className="c8-state">Không tìm thấy sự kiện phù hợp với bộ lọc.</td></tr> : items.map(event => {
          const metric = metrics[event.id], org = event.organizer_id ? organizers[event.organizer_id] : undefined;
          const capacity = Number(metric?.ticketCapacity || 0);
          const issued = Number(metric?.ticketsIssued || 0);
          const checkedIn = Number(metric?.checkins || 0);
          const issuedProgress = capacity > 0 ? Math.min(100, Math.round(issued * 100 / capacity)) : 0;
          return <tr key={event.id}>
            <td><div className="c8-event"><div className="c8-thumb">{event.cover_image_url ? <img src={event.cover_image_url} alt=""/> : <CalendarDays/>}</div><div><strong>{event.title}</strong><small>{event.id}</small></div></div></td>
            <td><strong>{org?.organization_name || org?.account_name || "Chưa có thông tin"}</strong><small>{org?.contact_name || (event.organizer_id ? "Ban tổ chức" : "Chưa liên kết")}</small></td>
            <td><span><CalendarDays size={14}/> {date(event.starts_at)}</span><small><MapPin size={13}/> {event.venue_name}{event.city_code ? ` · ${event.city_code}` : ""}</small></td>
            <td><div className="c8-metrics"><strong>{issued.toLocaleString("vi-VN")} / {capacity.toLocaleString("vi-VN")} vé phát hành</strong><div className="c8-progress" role="progressbar" aria-label={`Vé phát hành ${event.title}`} aria-valuemin={0} aria-valuemax={capacity || 1} aria-valuenow={Math.min(issued, capacity || 0)}><i style={{ width: `${issuedProgress}%` }}/></div><small>{checkedIn.toLocaleString("vi-VN")} check-in · {metric?.checkinRate || 0}%</small></div></td>
            <td><strong>{money(metric?.gmv || 0)}</strong><small>Doanh thu {money(metric?.revenue || 0)}</small></td>
            <td><span className={`c8-status s-${event.status.toLowerCase()}`}>{event.sales_paused ? "Tạm ngưng bán" : statusNames[event.status] || event.status}</span></td>
            <td><Link className="c8-detail" to={`/organizer/events/${event.id}`}>Xem / sửa</Link></td>
          </tr>;
        })}
      </tbody></table></div>
      <footer className="c8-pager"><span>Hiển thị {items.length ? page * pagination.limit + 1 : 0}–{Math.min((page + 1) * pagination.limit, pagination.total)} trên {pagination.total}</span><div><button aria-label="Trang trước" disabled={page <= 0 || loading} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button><button aria-label="Trang sau" disabled={page + 1 >= pagination.totalPages || loading} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button></div></footer>
    </section>
  </div><style>{styles}</style></AdminShell>;
}
function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) { return <article className={`c8-kpi ${accent}`}><span className="c8-kpi-icon">{icon}</span><span className="c8-kpi-label">{label}</span><strong>{value}</strong></article>; }

const styles = `
.c8{--bg:#0f1222;--surface:#181b2a;--line:#2b3045;--text:#f4f3ff;--muted:#9ca3bd;min-height:calc(100vh - 80px);padding:32px clamp(18px,3vw,48px) 48px;color:var(--text);font-family:'Be Vietnam Pro',Inter,sans-serif;background:radial-gradient(ellipse at 85% 0%,#33216d42,transparent 38%),var(--bg)}
.c8-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin:0 0 25px}.c8-eyebrow{font-size:11px;letter-spacing:.16em;color:#5de6ff;font-weight:800}.c8-heading h1{font-family:Be Vietnam Pro,sans-serif;font-size:clamp(25px,3vw,36px);margin:8px 0;color:#fff}.c8-heading p{color:var(--muted);margin:0;font-size:14px}.c8-live{display:inline-flex;align-items:center;gap:8px;color:#9da5c0;font-size:10px;letter-spacing:.12em;border:1px solid var(--line);padding:10px 12px;border-radius:8px}.c8-live i{width:7px;height:7px;background:#5de6ff;border-radius:50%;box-shadow:0 0 10px #5de6ff}
.c8-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px;margin-bottom:20px}.c8-kpi{position:relative;min-height:116px;padding:17px 18px;background:linear-gradient(145deg,#1d2032,#151827);border:1px solid var(--line);border-radius:11px;overflow:hidden}.c8-kpi:after{content:'';position:absolute;inset:auto -20px -39px auto;width:110px;height:80px;border-radius:50%;filter:blur(28px);opacity:.23;background:#7c3aed}.c8-kpi.cyan:after{background:#22d3ee}.c8-kpi.pink:after{background:#ffafd3}.c8-kpi.amber:after{background:#f6ad55}.c8-kpi-icon{display:inline-grid;place-items:center;width:32px;height:32px;color:#b49aff;background:#7c3aed24;border-radius:8px;margin-right:9px;vertical-align:middle}.c8-kpi-icon svg{width:17px;height:17px}.c8-kpi.cyan .c8-kpi-icon{color:#5de6ff;background:#22d3ee18}.c8-kpi.pink .c8-kpi-icon{color:#ffafd3;background:#ffafd318}.c8-kpi.amber .c8-kpi-icon{color:#ffc46b;background:#ffc46b18}.c8-kpi-label{font-size:12px;color:#b5bad0;vertical-align:middle}.c8-kpi strong{display:block;font-family:Be Vietnam Pro,sans-serif;font-size:25px;margin-top:13px;color:#fff;position:relative;z-index:1}
.c8-filters,.c8-table-card{background:var(--surface);border:1px solid var(--line);border-radius:11px}.c8-filters{padding:15px;margin-bottom:18px}.c8-search{height:44px;display:flex;align-items:center;gap:10px;padding:0 12px;border:1px solid #373c53;background:#111422;border-radius:7px;color:#8991ab}.c8-search input{flex:1;min-width:0;color:#fff;background:none;border:0;outline:0;font:inherit;font-size:13px}.c8-search button,.c8-apply{border:0;border-radius:6px;background:#7c3aed;color:white;font-weight:700;padding:10px 15px;cursor:pointer}.c8-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(135px,1fr)) auto auto;gap:10px;margin-top:12px}.c8-filter-grid select,.c8-date{height:40px;border:1px solid #34394e;background:#111422;border-radius:6px;padding:0 10px;color:#d7d9e8;font:inherit;font-size:12px}.c8-date{display:flex;align-items:center;gap:8px;color:#929ab4;white-space:nowrap}.c8-date input{width:126px;border:0;outline:0;background:transparent;color:#d7d9e8;font:inherit}.c8-reset{border:1px solid #41465b;background:transparent;color:#c3c6d6;border-radius:6px;padding:0 12px;cursor:pointer}.c8-error{display:flex;justify-content:space-between;align-items:center;color:#ffc0cb;background:#451b2a;border:1px solid #8c324e;padding:12px 14px;margin-bottom:16px;border-radius:8px}.c8-error button{background:none;color:#fff;text-decoration:underline;border:0;cursor:pointer}
.c8-table-card{overflow:hidden}.c8-table-head{min-height:68px;display:flex;align-items:center;justify-content:space-between;padding:13px 17px;border-bottom:1px solid var(--line)}.c8-table-head h2{font-size:15px;margin:0 0 5px}.c8-table-head p,.c8-table-head>span{color:var(--muted);font-size:11px;margin:0}.c8-table-wrap{overflow-x:auto} .c8 table{width:100%;min-width:1080px;border-collapse:collapse;text-align:left}.c8 th{height:41px;padding:0 13px;color:#868da9;font-size:9px;letter-spacing:.1em;font-weight:700;background:#151827}.c8 td{padding:13px;border-top:1px solid #262b3d;font-size:11px;vertical-align:middle}.c8 tbody tr:hover{background:#ffffff05}.c8 td strong,.c8 td small{display:block}.c8 td strong{font-size:11px;color:#eeeff8;font-weight:650;max-width:225px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.c8 td small{font-size:10px;color:#8e95ad;margin-top:5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.c8 td>span:not(.c8-status){display:flex;align-items:center;gap:5px;white-space:nowrap;color:#d5d7e4}.c8-event{display:flex;align-items:center;gap:10px;min-width:200px}.c8-thumb{width:42px;height:42px;flex:0 0 42px;background:#26203c;border-radius:6px;display:grid;place-items:center;color:#a88aff;overflow:hidden}.c8-thumb img{width:100%;height:100%;object-fit:cover}.c8-status{display:inline-block;padding:6px 8px;border-radius:5px;background:#3d315b;color:#d5c4ff;font-size:9px;white-space:nowrap}.c8-status.s-published{background:#123b3a;color:#75e8d5}.c8-status.s-pending_review{background:#4a3517;color:#ffd274}.c8-status.s-rejected,.c8-status.s-cancelled{background:#482536;color:#ff9fbb}.c8-metrics{min-width:145px;display:grid;gap:9px}.c8-progress{height:5px;margin-top:5px;border-radius:99px;background:#303449;overflow:hidden}.c8-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#7c3aed,#5de6ff);transition:width .25s ease}.c8-detail{color:#a991ff;text-decoration:none;font-weight:700;white-space:nowrap}.c8-detail:hover{text-decoration:underline}.c8-state{text-align:center!important;color:var(--muted)!important;padding:42px!important}.c8-pager{display:flex;justify-content:space-between;align-items:center;min-height:54px;padding:0 15px;color:#9aa1b9;font-size:11px}.c8-pager div{display:flex;gap:7px}.c8-pager button{display:grid;place-items:center;width:31px;height:31px;background:#202337;color:#d9dbee;border:1px solid #353a51;border-radius:6px;cursor:pointer}.c8-pager button:disabled{opacity:.35;cursor:not-allowed}
@media(max-width:1200px){.c8-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.c8-filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.c8-date input{width:100px}}
@media(max-width:800px){.c8{padding:23px 16px 32px}.c8-heading{gap:10px}.c8-live{display:none}.c8-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.c8-kpi{min-height:105px;padding:13px}.c8-kpi strong{font-size:22px}.c8-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.c8-filter-grid select{min-width:0}.c8-date{justify-content:space-between}.c8-date input{width:105px}.c8-apply,.c8-reset{min-height:40px}}
@media(max-width:420px){.c8{padding-inline:12px}.c8-kpi-label{font-size:10px}.c8-kpi-icon{width:27px;height:27px;margin-right:5px}.c8-kpi strong{font-size:19px}.c8-filter-grid{grid-template-columns:1fr 1fr;gap:8px}.c8-date{font-size:10px;padding-inline:6px}.c8-date input{width:88px;font-size:10px}.c8-search{padding-inline:8px}.c8-search button{font-size:11px;padding:9px}}
`;
