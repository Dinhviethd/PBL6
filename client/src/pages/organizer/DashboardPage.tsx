import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, MapPin, Menu, RefreshCw, ShoppingBag, Ticket, Wallet, X } from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { OrganizerHeader } from "./OrganizerHeader";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";

type Range = { fromDate: string; toDate: string };
type Day = { date: string; revenue: string; sold: string };
type Upcoming = {
  id: string; title: string; coverImageUrl: string | null; venueName: string;
  startsAt: string; endsAt: string; temporalStatus: "ONGOING" | "UPCOMING";
  capacity: string; sold: string; checkedIn: string; eligibleTickets: string;
};
type Dashboard = {
  asOf: string; timezone: string; range: Range; scope: { eventId: string | null };
  totals: { revenue: string; sold: string; paidOrders: number };
  currentEventCounts: { onSale: number }; dailySeries: Day[]; upcomingEvents: Upcoming[];
};
type Option = { id: string; title: string; total_results?: string | number };
const integer = (value: string | number) => BigInt(value).toLocaleString("vi-VN");
const money = (value: string) => `${integer(value)} ₫`;
const localDay = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
const dateTime = (date: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(date));
function recent(days: number): Range {
  const toDate = localDay(new Date());
  return { fromDate: localDay(new Date(Date.parse(`${toDate}T00:00:00+07:00`) - (days - 1) * 86400000)), toDate };
}
function percentage(part: string, whole: string) {
  return BigInt(whole) > 0n ? Number(BigInt(part) * 1000n / BigInt(whole)) / 10 : 0;
}

export function DashboardPage() {
  const revision = useAuth(state => state.revision);
  return <DashboardContent key={revision} />;
}

function DashboardContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState<Range>(() => recent(30));
  const [draft, setDraft] = useState(range);
  const [preset, setPreset] = useState("30");
  const [eventId, setEventId] = useState("");
  const [version, setVersion] = useState(0);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<{ key: string; data?: Dashboard; error?: string } | null>(null);
  const query = new URLSearchParams({ ...range, ...(eventId ? { eventId } : {}) }).toString();
  const key = `${query}:${version}`;
  const current = result?.key === key ? result : null;
  const data = current?.data;
  const busy = current === null;

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      const all: Option[] = [];
      let total = 0;
      for (let page = 0; page === 0 || all.length < total; page++) {
        const response = await api.get<{ data: Option[] }>(`/organizer/events?page=${page}&limit=50`, { signal: controller.signal });
        const rows = response.data.data;
        if (!Array.isArray(rows)) throw new Error("Không đọc được danh sách sự kiện.");
        if (page === 0) total = Number(rows[0]?.total_results ?? rows.length);
        if (!rows.length && all.length < total) throw new Error("Danh sách sự kiện đã thay đổi. Vui lòng làm mới.");
        all.push(...rows);
      }
      if (!controller.signal.aborted) { setOptions([...new Map(all.map(event => [event.id, event])).values()]); setOptionsError(""); }
    }
    loadOptions().catch(error => { if (!controller.signal.aborted) setOptionsError(message(error)); });
    return () => controller.abort();
  }, [version]);

  useEffect(() => {
    const controller = new AbortController();
    api.get<{ data: Dashboard }>(`/organizer/dashboard?${query}`, { signal: controller.signal })
      .then(response => {
        const payload = response.data.data;
        if (!payload?.totals || !payload.currentEventCounts || !Array.isArray(payload.dailySeries) || !Array.isArray(payload.upcomingEvents)) {
          throw new Error("Máy chủ chưa hỗ trợ dữ liệu tổng quan. Vui lòng thử lại sau.");
        }
        if (!controller.signal.aborted) setResult({ key, data: payload });
      }).catch(error => { if (!controller.signal.aborted) setResult({ key, error: message(error) }); });
    return () => controller.abort();
  }, [key, query]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); document.getElementById("b1-menu")?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  function quick(value: string) {
    setPreset(value); setFormError("");
    if (value === "custom") return;
    const next = recent(value === "7" ? 7 : 30);
    if (value === "month") next.fromDate = `${next.toDate.slice(0, 7)}-01`;
    setDraft(next); setRange(next);
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    const days = (Date.parse(draft.toDate) - Date.parse(draft.fromDate)) / 86400000 + 1;
    if (!draft.fromDate || !draft.toDate || !Number.isFinite(days) || days < 1 || days > 366) {
      setFormError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày."); return;
    }
    setFormError(""); setRange({ ...draft });
  }

  return <div className={`b1-dashboard qs-page${menuOpen ? " qs-menu-open" : ""}`}>
    <style>{styles}</style>
    <div className="qs-sidebar" id="b1-navigation"><OrganizerSidebar active="Tổng quan (Dashboard)" hideLiveSync /></div>
    {menuOpen && <button className="qs-backdrop" aria-label="Đóng điều hướng" onClick={() => setMenuOpen(false)} />}
    <div className="qs-body qs-shared-header">
      <OrganizerHeader title="Tổng quan" searchSlot={<span className="b1-context">Ban tổ chức / Dashboard</span>}
        notificationSlot={<NotificationLink />}
        menuButton={<button className="qs-menu-button qs-icon-button" id="b1-menu" aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen} aria-controls="b1-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>} />
      <main className="b1-content">
        <div className="b1-heading"><span className="b1-eyebrow"><i /> BAN TỔ CHỨC / DASHBOARD</span>
          <h1>Tổng quan</h1><p>Theo dõi doanh thu, kết quả bán vé và tiến độ check-in của các sự kiện.</p>
        </div>
        <section className="b1-panel b1-filters" aria-label="Bộ lọc tổng quan">
          <div className="b1-filter-controls">
            <label className="b1-select"><CalendarDays aria-hidden="true" /><span className="b1-sr">Sự kiện</span>
              <select aria-label="Sự kiện" value={eventId} disabled={options === null} onChange={event => setEventId(event.target.value)}>
                <option value="">Tất cả sự kiện{options ? ` (${options.length})` : ""}</option>
                {options?.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </label>
            <div className="b1-chips" role="group" aria-label="Khoảng ngày nhanh">
              {[["7", "7 ngày qua"], ["30", "30 ngày qua"], ["month", "Tháng này"], ["custom", "Tùy chọn"]].map(([value, label]) =>
                <button key={value} aria-pressed={preset === value} onClick={() => quick(value)}>{label}</button>)}
            </div>
            {preset === "custom" && <form className="b1-dates" onSubmit={apply}>
              <label>Từ ngày<input type="date" required value={draft.fromDate} onChange={event => setDraft({ ...draft, fromDate: event.target.value })} /></label>
              <label>Đến ngày<input type="date" required value={draft.toDate} onChange={event => setDraft({ ...draft, toDate: event.target.value })} /></label>
              <button type="submit">Áp dụng</button>
            </form>}
          </div>
          <div className="b1-filter-note"><p>Khoảng ngày áp dụng cho doanh thu, vé bán và đơn đã thanh toán.<br />Múi giờ UTC+7.</p>
            <button className="b1-refresh" aria-label="Làm mới" onClick={() => setVersion(value => value + 1)} disabled={busy}><RefreshCw size={20} aria-hidden="true" /></button>
          </div>
          {formError && <p className="b1-error-text" role="alert">{formError}</p>}
          {optionsError && <div className="b1-error-text" role="alert">Không tải được bộ chọn sự kiện: {optionsError}
            <button onClick={() => setVersion(value => value + 1)}>Thử tải lại danh sách</button></div>}
        </section>
        {busy ? <section className="b1-loading" aria-label="Đang tải tổng quan" role="status">
          <span>Đang tải dữ liệu tổng quan…</span><div className="b1-kpis">{[0, 1, 2, 3].map(value => <div className="b1-skeleton" key={value} />)}</div>
          <div className="b1-skeleton b1-chart-skeleton" />
        </section> : current?.error ? <section className="b1-panel b1-state" role="alert"><h2>Không thể tải tổng quan</h2><p>{current.error}</p>
          <button onClick={() => setVersion(value => value + 1)}>Thử lại</button></section> : data && <>
          <div className="b1-updated" role="status">Cập nhật: {dateTime(data.asOf)} · UTC+7</div>
          {options?.length === 0 && <div className="b1-panel b1-state"><h2>Chưa có sự kiện nào</h2><p>Dữ liệu tổng quan sẽ xuất hiện khi bạn có sự kiện và giao dịch.</p></div>}
          <section className="b1-kpis" aria-label="Các chỉ số tổng quan">
            <Kpi label="Doanh thu đã thanh toán" value={money(data.totals.revenue)} note="Trong khoảng ngày đã chọn" tone="cyan" icon={<Wallet />} />
            <Kpi label="Vé đã bán" value={`${integer(data.totals.sold)} vé`} note="Từ các đơn đã thanh toán trong kỳ" tone="purple" icon={<Ticket />} />
            <Kpi label="Đơn đã thanh toán" value={`${integer(data.totals.paidOrders)} đơn`} note="Trong khoảng ngày đã chọn" tone="pink" icon={<ShoppingBag />} />
            <Kpi label="Sự kiện đang mở bán" value={`${integer(data.currentEventCounts.onSale)} sự kiện`} note="Hiện tại · Không phụ thuộc khoảng ngày" tone="cyan" icon={<CalendarDays />} />
          </section>
          <SalesChart key={query} days={data.dailySeries} />
          <section className="b1-panel b1-events" aria-labelledby="b1-events-title">
            <div className="b1-section-heading"><div><h2 id="b1-events-title">Sự kiện sắp &amp; đang diễn ra</h2>
              <p>Tối đa 5 sự kiện · Vé bán và check-in toàn sự kiện tại thời điểm cập nhật.</p></div><CalendarDays aria-hidden="true" /></div>
            {!data.upcomingEvents.length ? <div className="b1-state"><h3>Chưa có sự kiện sắp hoặc đang diễn ra</h3><p>Chỉ hiển thị sự kiện đã xuất bản và chưa kết thúc trong phạm vi đã chọn.</p></div>
              : <div className="b1-event-list">{data.upcomingEvents.map(event => <UpcomingCard key={event.id} event={event} />)}</div>}
          </section>
        </>}
      </main>
    </div>
  </div>;
}

function Kpi({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: string; icon: React.ReactNode }) {
  return <article className={`b1-kpi b1-${tone}`}><div className="b1-kpi-title"><h2>{label}</h2><span aria-hidden="true">{icon}</span></div>
    <strong>{value}</strong><small>{note}</small></article>;
}

function UpcomingCard({ event }: { event: Upcoming }) {
  const [failedImage, setFailedImage] = useState(false);
  return <article className="b1-event-card">
    <div className="b1-event-info"><div className="b1-event-image">{event.coverImageUrl && !failedImage
      ? <img src={event.coverImageUrl} alt="" loading="lazy" onError={() => setFailedImage(true)} /> : <Ticket size={32} aria-hidden="true" />}</div>
      <div><span className={`b1-badge${event.temporalStatus === "ONGOING" ? " b1-ongoing" : ""}`}>
        {event.temporalStatus === "ONGOING" ? "Đang diễn ra" : "Sắp diễn ra"}</span>
        <h3>{event.title}</h3><p><MapPin size={14} aria-hidden="true" />{event.venueName}</p>
        <p><CalendarDays size={14} aria-hidden="true" />{dateTime(event.startsAt)} – {dateTime(event.endsAt)} (UTC+7)</p></div>
    </div>
    <div className="b1-progress-grid">
      <Progress label="Vé đã bán" part={event.sold} whole={event.capacity} note="công suất" />
      <Progress label="Check-in" part={event.checkedIn} whole={event.eligibleTickets} note="vé hợp lệ đã vào cổng" purple />
    </div>
  </article>;
}

function Progress({ label, part, whole, note, purple = false }: { label: string; part: string; whole: string; note: string; purple?: boolean }) {
  const percent = percentage(part, whole);
  return <div className={`b1-progress${purple ? " b1-purple" : ""}`}>
    <div><span>{label}</span><strong>{integer(part)} / {integer(whole)}</strong></div>
    <div className="b1-track" role="progressbar" aria-label={label} aria-valuenow={Math.min(100, percent)} aria-valuemin={0} aria-valuemax={100}
      aria-valuetext={`${integer(part)} trên ${integer(whole)}`}><span style={{ width: `${Math.min(100, percent)}%` }} /></div>
    <small>{BigInt(whole) > 0n ? `${percent.toLocaleString("vi-VN")}% ${note}` : "Chưa có vé"}</small>
  </div>;
}

function SalesChart({ days }: { days: Day[] }) {
  const [metric, setMetric] = useState<"revenue" | "sold">("revenue");
  const [index, setIndex] = useState(Math.max(0, days.length - 1));
  const selected = days[index];
  const max = days.reduce((highest, day) => BigInt(day[metric]) > highest ? BigInt(day[metric]) : highest, 1n);
  const x = (i: number) => days.length <= 1 ? 510 : 110 + i * 800 / (days.length - 1);
  const y = (value: string) => 300 - Number(BigInt(value) * 10000n / max) / 10000 * 245;
  const points = days.map((day, i) => `${x(i)},${y(day[metric])}`).join(" ");
  const labels = [...new Set([0, Math.floor((days.length - 1) / 4), Math.floor((days.length - 1) / 2), Math.floor((days.length - 1) * 3 / 4), days.length - 1])].filter(i => i >= 0);
  const hasSales = days.some(day => BigInt(day.sold) > 0n);
  const compact = (value: bigint) => {
    const divisor = value >= 1000000000n ? 1000000000n : value >= 1000000n ? 1000000n : 1n;
    const suffix = divisor === 1000000000n ? " tỷ" : divisor === 1000000n ? " tr" : "";
    const fraction = ((value % divisor) * 100n / divisor).toString().padStart(2, "0").replace(/0+$/, "");
    return `${integer((value / divisor).toString())}${fraction ? `,${fraction}` : ""}${suffix}`;
  };
  return <section className="b1-panel b1-chart-panel" aria-labelledby="b1-chart-heading">
    <div className="b1-section-heading"><div><h2 id="b1-chart-heading">Hiệu quả bán vé</h2><p>Doanh thu và vé bán theo ngày thanh toán · UTC+7</p></div>
      <div className="b1-chips" role="group" aria-label="Chỉ số biểu đồ">
        <button aria-pressed={metric === "revenue"} onClick={() => setMetric("revenue")}>Doanh thu (₫)</button>
        <button aria-pressed={metric === "sold"} onClick={() => setMetric("sold")}>Vé đã bán</button>
      </div>
    </div>
    {!hasSales && <p className="b1-no-sales">Chưa có giao dịch trong khoảng ngày này.</p>}
    <div className="b1-chart-scroll" tabIndex={0} role="region" aria-label="Biểu đồ có thể cuộn ngang">
      <svg viewBox="0 0 960 355" role="img" aria-labelledby="b1-chart-title" aria-describedby="b1-chart-desc">
        <title id="b1-chart-title">{metric === "revenue" ? "Doanh thu theo ngày" : "Vé bán theo ngày"}</title>
        <desc id="b1-chart-desc">Số liệu chính xác có trong bảng theo ngày bên dưới. Dùng thanh chọn ngày để đọc từng điểm bằng bàn phím.</desc>
        <defs><linearGradient id="b1-stroke"><stop stopColor="#7c3aed" /><stop offset="65%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#f472b6" /></linearGradient>
          <linearGradient id="b1-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#22d3ee" stopOpacity=".22" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map(tick => <g key={tick}>
          <line x1="110" x2="910" y1={55 + tick * 245 / 4} y2={55 + tick * 245 / 4} stroke="#222a4a" strokeDasharray="4 5" />
          <text x="94" y={60 + tick * 245 / 4} textAnchor="end">{compact(max * BigInt(4 - tick) / 4n)}{metric === "revenue" ? " ₫" : ""}</text>
        </g>)}
        {days.length > 1 && <polygon points={`110,300 ${points} 910,300`} fill="url(#b1-fill)" />}
        <polyline points={points} stroke="url(#b1-stroke)" strokeWidth="3" fill="none" />
        {days.map((day, i) => <circle key={day.date} cx={x(i)} cy={y(day[metric])} r={index === i ? 6 : 4} fill={index === i ? "#22d3ee" : "#080b1a"}
          stroke="#22d3ee" strokeWidth="2" onMouseEnter={() => setIndex(i)}><title>{day.date}: {money(day.revenue)} · {integer(day.sold)} vé</title></circle>)}
        {labels.map(i => <text key={i} x={x(i)} y="335" textAnchor="middle">{days[i].date.slice(5).split("-").reverse().join("/")}</text>)}
      </svg>
    </div>
    {selected && <div className="b1-chart-reading"><label>Chọn ngày trên biểu đồ
      <input type="range" min="0" max={Math.max(0, days.length - 1)} value={index} onChange={event => setIndex(Number(event.target.value))} aria-valuetext={selected.date} /></label>
      <output aria-live="polite"><span>{selected.date}</span><strong>{money(selected.revenue)}</strong><span>{integer(selected.sold)} vé đã bán</span></output></div>}
    <details className="b1-daily"><summary>Xem dữ liệu theo ngày</summary><div className="b1-table-scroll" tabIndex={0} role="region" aria-label="Bảng dữ liệu biểu đồ">
      <table><caption className="b1-sr">Doanh thu và vé bán theo ngày thanh toán</caption><thead><tr><th scope="col">Ngày (UTC+7)</th><th scope="col">Doanh thu</th><th scope="col">Vé bán</th></tr></thead>
        <tbody>{days.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{money(day.revenue)}</td><td>{integer(day.sold)}</td></tr>)}</tbody></table>
    </div></details>
  </section>;
}

const styles = `
@font-face {
  font-family: "B1 Plus Jakarta Sans";
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url("/fonts/b1/plus-jakarta-sans.ttf") format("truetype");
}
.b1-dashboard {
  background: #080b1a;
  color: #f1f5f9;
  font-family: "Be Vietnam Pro", sans-serif;
}
.b1-dashboard .b1-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1560px;
  margin: auto;
  padding: 32px;
  background: radial-gradient(ellipse at 25% 0%, #7c3aed10, transparent 38%);
}
.b1-dashboard .b1-context { color: #94a3b8; font-size: 12px; }
.b1-dashboard h1, .b1-dashboard h2, .b1-dashboard h3 {
  font-family: "B1 Plus Jakarta Sans", "Be Vietnam Pro", sans-serif;
}
.b1-dashboard h1 { font-size: 30px; line-height: 1.3; margin: 12px 0 8px; }
.b1-dashboard h2 { font-size: 20px; line-height: 1.4; margin: 0; }
.b1-dashboard h3 { font-size: 16px; line-height: 1.5; margin: 8px 0; overflow-wrap: anywhere; }
.b1-dashboard p { font-size: 13px; color: #94a3b8; line-height: 1.7; margin: 6px 0; }
.b1-dashboard .b1-eyebrow {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font: 600 12px "Space Grotesk", sans-serif;
  color: #22d3ee;
  letter-spacing: .05em;
}
.b1-dashboard .b1-eyebrow i { width: 6px; height: 6px; background: #22d3ee; border-radius: 50%; }
.b1-dashboard .b1-panel { background: #10162b; border: 1px solid #222a4a80; border-radius: 16px; padding: 24px; min-width: 0; }
.b1-dashboard .b1-filters { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; align-items: center; }
.b1-dashboard .b1-filter-controls { display: flex; flex-direction: column; gap: 12px; min-width: 0; max-width: 100%; }
.b1-dashboard .b1-select { display: flex; align-items: center; gap: 12px; color: #22d3ee; background: #080b1a; border-radius: 12px; padding: 12px; }
.b1-dashboard .b1-select select { width: 100%; min-width: 0; max-width: 440px; background: #080b1a; color: #f1f5f9; border: 0; font: 600 14px "Be Vietnam Pro", sans-serif; }
.b1-dashboard .b1-chips { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; background: #080b1a; border-radius: 12px; }
.b1-dashboard .b1-chips button { background: transparent; color: #94a3b8; border: 0; border-radius: 8px; padding: 9px 12px; font-weight: 500; font-size: 13px; }
.b1-dashboard .b1-chips button[aria-pressed="true"] { background: #7c3aed; color: #fff; box-shadow: 0 3px 12px #7c3aed30; }
.b1-dashboard .b1-chips button:hover { color: #f1f5f9; }
.b1-dashboard .b1-filter-note { display: flex; align-items: center; gap: 16px; }
.b1-dashboard .b1-filter-note p { font-size: 11px; }
.b1-dashboard .b1-refresh { display: grid; place-items: center; padding: 12px; border: 1px solid #222a4a; border-radius: 12px; color: #94a3b8; background: #080b1a; }
.b1-dashboard .b1-dates { display: flex; align-items: end; flex-wrap: wrap; gap: 12px; }
.b1-dashboard .b1-dates label { display: grid; gap: 8px; font-size: 12px; color: #94a3b8; }
.b1-dashboard .b1-dates input { background: #080b1a; color: #f1f5f9; color-scheme: dark; border: 1px solid #334155; border-radius: 8px; padding: 9px; min-width: 0; }
.b1-dashboard .b1-dates button, .b1-dashboard .b1-state button, .b1-dashboard .b1-error-text button { background: #7c3aed; color: white; border: 0; border-radius: 8px; padding: 10px 16px; }
.b1-dashboard .b1-error-text { color: #fda4af; width: 100%; }
.b1-dashboard .b1-error-text button { margin-left: 8px; }
.b1-dashboard .b1-updated { font-size: 11px; text-align: right; color: #94a3b8; margin-bottom: -8px; }
.b1-dashboard .b1-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.b1-dashboard .b1-kpi { display: flex; flex-direction: column; gap: 24px; padding: 20px; border-radius: 16px; background: #10162b; border: 1px solid #222a4a80; min-width: 0; }
.b1-dashboard .b1-kpi.b1-cyan { background: radial-gradient(ellipse at 100% 0%, #22d3ee12, transparent 65%), #10162b; }
.b1-dashboard .b1-kpi.b1-purple { background: radial-gradient(ellipse at 100% 0%, #7c3aed22, transparent 65%), #10162b; }
.b1-dashboard .b1-kpi.b1-pink { background: radial-gradient(ellipse at 100% 0%, #f472b614, transparent 65%), #10162b; }
.b1-dashboard .b1-kpi-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.b1-dashboard .b1-kpi-title h2 { font: 500 11px/1.7 "Space Grotesk", sans-serif; color: #94a3b8; text-transform: uppercase; }
.b1-dashboard .b1-kpi-title > span { display: grid; place-items: center; padding: 10px; border-radius: 12px; background: #22d3ee15; color: #22d3ee; flex-shrink: 0; }
.b1-dashboard .b1-purple .b1-kpi-title > span { color: #d2bbff; background: #7c3aed22; }
.b1-dashboard .b1-pink .b1-kpi-title > span { color: #f472b6; background: #f472b618; }
.b1-dashboard .b1-kpi strong { font: 700 clamp(21px, 2vw, 32px)/1.4 "Space Grotesk", sans-serif; overflow-wrap: anywhere; }
.b1-dashboard .b1-kpi small { padding-top: 14px; border-top: 1px solid #222a4a80; color: #94a3b8; font-size: 10px; line-height: 1.6; margin-top: auto; }
.b1-dashboard .b1-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.b1-dashboard .b1-section-heading > svg { color: #22d3ee; }
.b1-dashboard .b1-chart-scroll { overflow-x: auto; }
.b1-dashboard .b1-chart-scroll svg { width: 100%; min-width: 650px; display: block; }
.b1-dashboard .b1-chart-scroll text { fill: #94a3b8; font: 12px "Space Grotesk", sans-serif; }
.b1-dashboard .b1-chart-reading { display: flex; justify-content: space-between; gap: 20px; align-items: center; border-top: 1px solid #222a4a; padding: 20px 0; }
.b1-dashboard .b1-chart-reading label { display: grid; gap: 12px; color: #94a3b8; font-size: 12px; flex: 1; max-width: 320px; }
.b1-dashboard .b1-chart-reading input { width: 100%; accent-color: #22d3ee; }
.b1-dashboard .b1-chart-reading output { display: flex; align-items: center; gap: 16px; color: #94a3b8; font-size: 12px; flex-wrap: wrap; }
.b1-dashboard .b1-chart-reading strong { color: #22d3ee; font-size: 16px; }
.b1-dashboard .b1-daily summary { cursor: pointer; color: #22d3ee; font-size: 12px; padding: 8px 0; }
.b1-dashboard .b1-table-scroll { overflow: auto; max-height: 360px; }
.b1-dashboard table { width: 100%; border-collapse: collapse; font-size: 12px; }
.b1-dashboard th, .b1-dashboard td { padding: 12px; border-bottom: 1px solid #222a4a; text-align: left; white-space: nowrap; }
.b1-dashboard th { color: #94a3b8; font-weight: 500; }
.b1-dashboard .b1-no-sales { color: #22d3ee; }
.b1-dashboard .b1-event-list { display: grid; gap: 12px; }
.b1-dashboard .b1-event-card { display: flex; justify-content: space-between; gap: 24px; align-items: center; border-radius: 12px; border: 1px solid #222a4a; background: #181f38; padding: 20px; }
.b1-dashboard .b1-event-info { display: flex; gap: 16px; align-items: center; flex: 1; min-width: 0; }
.b1-dashboard .b1-event-image { width: 80px; height: 80px; background: #2d375e; border-radius: 12px; flex-shrink: 0; display: grid; place-items: center; color: #d2bbff; overflow: hidden; }
.b1-dashboard .b1-event-image img { width: 100%; height: 100%; object-fit: cover; }
.b1-dashboard .b1-event-info p { display: flex; align-items: baseline; gap: 6px; font-size: 11px; overflow-wrap: anywhere; }
.b1-dashboard .b1-event-info p svg { flex-shrink: 0; align-self: center; }
.b1-dashboard .b1-badge { display: inline-flex; background: #7c3aed22; color: #d2bbff; border: 1px solid #7c3aed55; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
.b1-dashboard .b1-badge.b1-ongoing { background: #22d3ee15; color: #22d3ee; border-color: #22d3ee40; }
.b1-dashboard .b1-progress-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; width: 42%; }
.b1-dashboard .b1-progress > div:first-child { display: flex; justify-content: space-between; gap: 8px; align-items: center; color: #94a3b8; font-size: 11px; }
.b1-dashboard .b1-progress strong { color: #22d3ee; font: 600 12px "Space Grotesk", sans-serif; white-space: nowrap; }
.b1-dashboard .b1-progress.b1-purple strong { color: #d2bbff; }
.b1-dashboard .b1-track { height: 8px; background: #080b1a; border-radius: 99px; overflow: hidden; margin: 9px 0 6px; }
.b1-dashboard .b1-track span { display: block; height: 100%; background: #22d3ee; border-radius: inherit; }
.b1-dashboard .b1-purple .b1-track span { background: #7c3aed; }
.b1-dashboard .b1-progress small { display: block; text-align: right; font-size: 10px; color: #94a3b8; }
.b1-dashboard .b1-state { text-align: center; padding: 32px 20px; }
.b1-dashboard .b1-state button { margin-top: 16px; }
.b1-dashboard .b1-loading > span { display: block; color: #94a3b8; margin-bottom: 16px; }
.b1-dashboard .b1-skeleton { height: 190px; background: linear-gradient(110deg, #10162b, #181f38, #10162b); border-radius: 16px; animation: b1-pulse 1.5s ease-in-out infinite alternate; }
.b1-dashboard .b1-chart-skeleton { height: 360px; margin-top: 24px; }
.b1-dashboard .b1-sr { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
@keyframes b1-pulse { to { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .b1-dashboard .b1-skeleton { animation: none; } }
@media (max-width: 1200px) {
  .b1-dashboard .b1-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .b1-dashboard .b1-event-card { flex-direction: column; align-items: stretch; }
  .b1-dashboard .b1-progress-grid { width: 100%; }
  .b1-dashboard .org-header { padding-inline: 16px; }
  .b1-dashboard .org-header-left, .b1-dashboard .org-header-right { gap: 10px; }
  .b1-dashboard .b1-context { display: none; }
}
@media (max-width: 650px) {
  .b1-dashboard .b1-content { padding: 24px 16px; gap: 20px; }
  .b1-dashboard .b1-panel { padding: 16px; }
  .b1-dashboard .b1-kpi { padding: 16px; gap: 18px; }
  .b1-dashboard .b1-kpi-title { align-items: start; }
  .b1-dashboard .b1-kpi-title > span { padding: 6px; }
  .b1-dashboard .b1-kpi-title svg { width: 16px; height: 16px; }
  .b1-dashboard .b1-kpi-title h2 { font-size: 10px; }
  .b1-dashboard h1 { font-size: 26px; }
  .b1-dashboard h2 { font-size: 18px; }
  .b1-dashboard .b1-kpis { gap: 12px; }
  .b1-dashboard .b1-chart-reading { align-items: stretch; flex-direction: column; }
  .b1-dashboard .b1-chart-reading label { max-width: none; }
  .b1-dashboard .b1-event-card { padding: 14px; gap: 18px; }
  .b1-dashboard .b1-event-info { align-items: start; gap: 12px; }
  .b1-dashboard .b1-event-image { width: 52px; height: 64px; }
  .b1-dashboard .b1-progress-grid { gap: 14px; }
  .b1-dashboard .b1-progress > div:first-child { flex-direction: column; align-items: start; }
  .b1-dashboard .org-breadcrumb a, .b1-dashboard .org-crumb-sep { display: none; }
  .b1-dashboard .org-create-btn { white-space: nowrap; }
}
@media (max-width: 360px) {
  .b1-dashboard .b1-kpis { grid-template-columns: 1fr; }
}
`;
