import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { BarChart3, CalendarDays, Download, Menu, RefreshCw, ScanLine, Ticket, Wallet, X } from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import type { Event } from "@/features/ticketing/types";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { OrganizerHeader } from "./OrganizerHeader";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";

type DateRange = { fromDate: string; toDate: string };
type Day = { date: string; revenue: string; sold: string };
type Analytics = {
  eventId: string;
  eventTitle: string;
  asOf: string;
  timezone: string;
  range: DateRange;
  totals: { revenue: string; sold: string; paidOrders: number };
  dailySeries: Day[];
  ticketTypes: { id: string; name: string; capacity: number; archived: boolean; sold: string; revenue: string }[];
};
type Summary = { revenue: string; sold: string; checkins: string; orders: string };
const integer = (value: string | number) => BigInt(value).toLocaleString("vi-VN");
const vnd = (value: string) => `${integer(value)} ₫`;
const localDate = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
const updated = (date: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(date));
function recentRange(days: number): DateRange {
  const toDate = localDate(new Date());
  const from = new Date(`${toDate}T00:00:00+07:00`);
  from.setTime(from.getTime() - (days - 1) * 86400000);
  return { fromDate: localDate(from), toDate };
}
function percent(top: string, bottom: string) {
  return BigInt(bottom) > 0n ? Number(BigInt(top) * 10000n / BigInt(bottom)) / 100 : null;
}

export function ReportPage() {
  const { id } = useParams();
  const revision = useAuth(state => state.revision);
  return <ReportContent key={`${id}:${revision}`} eventId={id!} />;
}

function ReportContent({ eventId }: { eventId: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(() => recentRange(30));
  const [draft, setDraft] = useState(range);
  const [formError, setFormError] = useState("");
  const [version, setVersion] = useState(0);
  const [overview, setOverview] = useState<{ event: Event; stats: Summary } | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [result, setResult] = useState<{ key: string; data?: Analytics; error?: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const exportController = useRef<AbortController | null>(null);
  const base = `/organizer/events/${encodeURIComponent(eventId)}`;
  const query = new URLSearchParams(range).toString();
  const key = `${query}:${version}`;
  const current = result?.key === key ? result : null;
  const data = current?.data;
  const busy = overview !== null && current === null;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get<{ data: Event }>(base, { signal: controller.signal }),
      api.get<{ data: Summary }>(`${base}/stats`, { signal: controller.signal }),
    ]).then(([event, stats]) => {
      if (!controller.signal.aborted) {
        setOverview({ event: event.data.data, stats: stats.data.data });
        setOverviewError("");
      }
    }).catch(error => { if (!controller.signal.aborted) setOverviewError(message(error)); });
    return () => controller.abort();
  }, [base, version]);

  useEffect(() => {
    if (!overview) return;
    const controller = new AbortController();
    api.get<{ data: Analytics }>(`${base}/analytics?${query}`, { signal: controller.signal })
      .then(response => {
        const payload = response.data.data;
        if (!payload || !Array.isArray(payload.dailySeries) || !Array.isArray(payload.ticketTypes)) {
          throw new Error("Máy chủ chưa hỗ trợ báo cáo phân tích. Vui lòng thử lại sau.");
        }
        if (!controller.signal.aborted) setResult({ key, data: payload });
      })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: message(error) }); });
    return () => controller.abort();
  }, [base, key, overview, query]);

  useEffect(() => {
    return () => exportController.current?.abort();
  }, [key]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); document.getElementById("b10-menu")?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  function apply(event: FormEvent) {
    event.preventDefault();
    const days = (Date.parse(draft.toDate) - Date.parse(draft.fromDate)) / 86400000 + 1;
    if (!draft.fromDate || !draft.toDate || !Number.isFinite(days) || days < 1 || days > 366) {
      setFormError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
      return;
    }
    setFormError(""); setExportNotice(""); setRange({ ...draft });
  }

  async function download() {
    if (!data || exporting) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true); setExportNotice("");
    try {
      const response = await api.get<Blob>(`${base}/analytics/export.csv?${query}`, {
        responseType: "blob", signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!String(response.headers["content-type"]).startsWith("text/csv")) throw new Error("Máy chủ chưa hỗ trợ xuất CSV.");
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `event-${eventId}-${range.fromDate}-${range.toDate}.csv`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportNotice("Đã tải báo cáo CSV theo khoảng ngày đang xem.");
    } catch (error) {
      let detail = message(error);
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try { detail = JSON.parse(await error.response.data.text()).message ?? detail; } catch { /* Keep the request error. */ }
      }
      if (!controller.signal.aborted) setExportNotice(`Không thể xuất CSV. ${detail}`);
    } finally {
      setExporting(false);
    }
  }

  const stats = overview?.stats;
  const capacity = overview?.event.ticketTypes?.reduce((sum, type) => sum + type.capacity, 0) ?? 0;
  const fill = stats ? percent(stats.sold, String(capacity)) : null;
  const checkin = stats ? percent(stats.checkins, stats.sold) : null;

  return (
    <div className={`b10-page qs-page${menuOpen ? " qs-menu-open" : ""}`}>
      <style>{styles}</style>
      <div className="qs-sidebar" id="b10-navigation"><OrganizerSidebar active="Thống kê doanh thu" hideLiveSync /></div>
      {menuOpen && <button className="qs-backdrop" aria-label="Đóng điều hướng" onClick={() => setMenuOpen(false)} />}
      <div className="qs-body qs-shared-header">
        <OrganizerHeader title="Báo cáo phân tích" searchSlot={<span className="b10-header-context">Dữ liệu theo sự kiện</span>}
          notificationSlot={<NotificationLink />}
          menuButton={<button id="b10-menu" className="qs-menu-button qs-icon-button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen} aria-controls="b10-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>} />
        <main className="b10-content">
          <section className="b10-hero">
            <div>
              <span className="b10-eyebrow"><BarChart3 size={16} aria-hidden="true" /> EVENT ANALYTICS & INSIGHTS</span>
              <h1>Báo cáo Phân tích &amp; Thống kê Sự kiện</h1>
              <p>Theo dõi doanh thu, tiến độ bán vé và tình hình check-in của sự kiện.</p>
            </div>
            <Link className="b10-event" to="/organizer/events/stats"><CalendarDays aria-hidden="true" />
              <span><small>SỰ KIỆN ĐANG XEM</small><strong>{overview?.event.title ?? "Chọn sự kiện"}</strong><span>Đổi sự kiện →</span></span>
            </Link>
          </section>
          {overviewError ? <div className="b10-error" role="alert"><p>{overviewError}</p>
            <button onClick={() => { setOverviewError(""); setVersion(value => value + 1); }}>Thử tải lại</button>
            <Link to="/organizer/events/stats">Chọn sự kiện</Link></div> : !overview ? <p role="status">Đang tải sự kiện…</p> : <>
            <section aria-label="Tổng quan toàn sự kiện" className="b10-kpis">
              <article className="b10-kpi b10-purple"><Wallet aria-hidden="true" /><span>TỔNG DOANH THU VÉ</span>
                <strong>{vnd(stats!.revenue)}</strong><small>Toàn sự kiện · Chỉ đơn PAID</small></article>
              <article className="b10-kpi b10-cyan"><Ticket aria-hidden="true" /><span>VÉ ĐÃ BÁN / SỨC CHỨA</span>
                <strong>{integer(stats!.sold)} <em>/ {integer(capacity)} vé</em></strong>
                <small>Toàn sự kiện, gồm hạng đã lưu trữ · {fill === null ? "Chưa có sức chứa" : `${fill}% lấp đầy`}</small>
                <div className="b10-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, fill ?? 0)}%` }} /></div>
              </article>
              <article className="b10-kpi b10-pink"><ScanLine aria-hidden="true" /><span>VÉ ĐÃ CHECK-IN / ĐÃ BÁN</span>
                <strong>{integer(stats!.checkins)} <em>/ {integer(stats!.sold)} vé</em></strong>
                <small>Toàn sự kiện · {checkin === null ? "Chưa có vé bán" : `${checkin}% đã check-in`}</small>
                <div className="b10-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, checkin ?? 0)}%` }} /></div>
              </article>
            </section>
            <section className="b10-panel b10-filters" aria-labelledby="b10-filter-title">
              <div><h2 id="b10-filter-title">Khung thời gian báo cáo</h2><p>Lọc biểu đồ, bảng loại vé và CSV theo ngày thanh toán (UTC+7). KPI phía trên là toàn sự kiện.</p></div>
              <form onSubmit={apply}>
                <label>Từ ngày<input type="date" required value={draft.fromDate} onChange={event => setDraft({ ...draft, fromDate: event.target.value })} /></label>
                <label>Đến ngày<input type="date" required value={draft.toDate} onChange={event => setDraft({ ...draft, toDate: event.target.value })} /></label>
                <button className="b10-primary" type="submit">Áp dụng</button>
                <button type="button" onClick={() => { const next = recentRange(30); setDraft(next); setRange(next); setFormError(""); setExportNotice(""); }}>30 ngày gần nhất</button>
                <button type="button" onClick={() => setVersion(value => value + 1)} disabled={busy}><RefreshCw size={15} aria-hidden="true" /> Làm mới</button>
                <button type="button" className="b10-export" onClick={download} disabled={!data || exporting || busy}><Download size={16} aria-hidden="true" />{exporting ? "Đang xuất…" : "Xuất CSV"}</button>
              </form>
              {formError && <p role="alert" className="b10-form-error">{formError}</p>}
              <p className="b10-export-notice" role="status">{exportNotice}</p>
            </section>
            {busy && <div className="b10-state" role="status">Đang tải báo cáo…</div>}
            {current?.error && <div className="b10-error" role="alert"><p>{current.error}</p><button onClick={() => setVersion(value => value + 1)}>Thử tải lại báo cáo</button></div>}
            {data && <>
              <section className="b10-panel" aria-labelledby="b10-chart-title">
                <div className="b10-section-heading"><div><h2 id="b10-chart-title">Xu hướng Bán Vé &amp; Doanh Thu</h2>
                  <p>{range.fromDate} — {range.toDate} · Ngày thanh toán, UTC+7</p></div>
                  <div className="b10-period-total"><strong>{vnd(data.totals.revenue)}</strong><span>{integer(data.totals.sold)} vé trong kỳ · {data.totals.paidOrders} đơn PAID</span></div>
                </div>
                {data.totals.paidOrders === 0 ? <div className="b10-state"><BarChart3 aria-hidden="true" /><h3>Chưa có giao dịch trong khoảng ngày này</h3><p>Chọn khoảng ngày khác để xem doanh thu và số vé đã bán.</p></div> : <><p className="b10-scroll-hint">Cuộn ngang để xem toàn bộ biểu đồ.</p><SalesChart days={data.dailySeries} /></>}
                <details className="b10-daily"><summary>Xem dữ liệu theo ngày</summary>
                  <div className="b10-table-scroll" role="region" aria-label="Dữ liệu biểu đồ theo ngày" tabIndex={0}>
                    <table><caption className="b10-sr-only">Doanh thu và vé bán theo ngày thanh toán</caption><thead><tr><th scope="col">Ngày</th><th scope="col">Doanh thu</th><th scope="col">Vé bán</th></tr></thead>
                      <tbody>{data.dailySeries.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{vnd(day.revenue)}</td><td>{integer(day.sold)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </details>
              </section>
              <section className="b10-panel" aria-labelledby="b10-types-title">
                <div className="b10-section-heading"><div><h2 id="b10-types-title">Hiệu quả theo loại vé</h2><p>Số vé và doanh thu trong kỳ từ giá trị giao dịch đã ghi nhận.</p></div><span className="b10-chip">{data.ticketTypes.length} loại vé</span></div>
                <p className="b10-scroll-hint">Cuộn ngang bảng để xem số vé và doanh thu.</p>
                {data.ticketTypes.length === 0 ? <p className="b10-state">Sự kiện chưa có loại vé.</p> : <div className="b10-table-scroll" role="region" aria-label="Bảng loại vé" tabIndex={0}>
                  <table className="b10-types"><caption className="b10-sr-only">Loại vé trong khoảng {range.fromDate} đến {range.toDate}</caption>
                    <thead><tr><th scope="col">Loại vé</th><th scope="col">Sức chứa hiện tại<br /><small>Toàn sự kiện</small></th><th scope="col">Vé bán trong kỳ</th><th scope="col">Doanh thu trong kỳ</th></tr></thead>
                    <tbody>{data.ticketTypes.map(type => <tr key={type.id}><th scope="row"><span className="b10-type-name">{type.name}</span>{type.archived && <small className="b10-chip">Đã lưu trữ</small>}</th><td>{integer(type.capacity)}</td><td>{integer(type.sold)}</td><td className="b10-type-revenue">{vnd(type.revenue)}</td></tr>)}</tbody>
                    <tfoot><tr><th scope="row">Tổng trong kỳ</th><td>—</td><td>{integer(data.totals.sold)}</td><td>{vnd(data.totals.revenue)}</td></tr></tfoot>
                  </table>
                </div>}
              </section>
              <p className="b10-updated">Cập nhật: {updated(data.asOf)} (UTC+7). CSV dùng dữ liệu tại thời điểm xuất.</p>
            </>}
          </>}
        </main>
      </div>
    </div>
  );
}

function SalesChart({ days }: { days: Day[] }) {
  const width = 1000, height = 330, left = 90, right = 920, top = 25, bottom = 270;
  const maxRevenue = days.reduce((max, day) => BigInt(day.revenue) > max ? BigInt(day.revenue) : max, 1n);
  const maxSold = days.reduce((max, day) => BigInt(day.sold) > max ? BigInt(day.sold) : max, 1n);
  const x = (index: number) => days.length === 1 ? (left + right) / 2 : left + index * (right - left) / (days.length - 1);
  const y = (value: string, max: bigint) => bottom - Number(BigInt(value) * 10000n / max) / 10000 * (bottom - top);
  const revenuePoints = days.map((day, index) => `${x(index)},${y(day.revenue, maxRevenue)}`).join(" ");
  const soldPoints = days.map((day, index) => `${x(index)},${y(day.sold, maxSold)}`).join(" ");
  const labels = [...new Set([0, Math.floor((days.length - 1) / 4), Math.floor((days.length - 1) / 2), Math.floor((days.length - 1) * 3 / 4), days.length - 1])];
  return <div className="b10-chart" role="region" aria-label="Biểu đồ có thể cuộn ngang" tabIndex={0}>
    <div className="b10-legend"><span><i /> Doanh thu ngày (trục trái, VND)</span><span><i /> Vé bán (trục phải)</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="b10-svg-title" aria-describedby="b10-svg-description">
      <title id="b10-svg-title">Biểu đồ doanh thu và vé bán theo ngày</title>
      <desc id="b10-svg-description">Đường cyan là doanh thu, đường chấm hồng là vé bán. Hai trục có thang đo riêng. Số liệu chính xác nằm trong bảng dữ liệu theo ngày bên dưới.</desc>
      <defs><linearGradient id="b10-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5de6ff" stopOpacity=".3" /><stop offset="100%" stopColor="#5de6ff" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}>
        <line x1={left} x2={right} y1={top + tick * (bottom - top) / 4} y2={top + tick * (bottom - top) / 4} stroke="#313445" strokeDasharray="4 5" />
        <text x={left - 12} y={top + tick * (bottom - top) / 4 + 5} textAnchor="end">{integer((maxRevenue * BigInt(4 - tick) / 4n).toString())}</text>
        <text x={right + 12} y={top + tick * (bottom - top) / 4 + 5}>{integer((maxSold * BigInt(4 - tick) / 4n).toString())}</text>
      </g>)}
      <polygon points={`${x(0)},${bottom} ${revenuePoints} ${x(days.length - 1)},${bottom}`} fill="url(#b10-area)" />
      <polyline points={revenuePoints} fill="none" stroke="#5de6ff" strokeWidth="3" />
      <polyline points={soldPoints} fill="none" stroke="#ffafd3" strokeWidth="2.5" strokeDasharray="5 5" />
      {days.map((day, index) => <circle key={day.date} cx={x(index)} cy={y(day.revenue, maxRevenue)} r="4" fill="#5de6ff"><title>{day.date}: {vnd(day.revenue)}, {integer(day.sold)} vé</title></circle>)}
      {labels.map(index => <text key={index} x={x(index)} y={bottom + 30} textAnchor="middle">{days[index].date.slice(5).split("-").reverse().join("/")}</text>)}
    </svg>
  </div>;
}

const styles = `
.b10-page {
  background: #0f1222;
  color: #e0e1f7;
  font-family: "Be Vietnam Pro", sans-serif;
}
.b10-page .b10-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  max-width: 1580px;
  margin: auto;
}
.b10-page .b10-hero, .b10-page .b10-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.b10-page .b10-hero > div { max-width: 680px; }
.b10-page .b10-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #5de6ff;
  font: 600 12px "Space Grotesk", sans-serif;
  letter-spacing: .06em;
}
.b10-page h1 { font: 700 32px/1.25 "Be Vietnam Pro", sans-serif; margin: 12px 0; }
.b10-page h2 { font: 600 22px/1.4 "Be Vietnam Pro", sans-serif; margin: 0; }
.b10-page p { color: #ccc3d8; font-size: 13px; line-height: 1.7; margin: 8px 0; }
.b10-page .b10-event {
  min-width: 230px;
  max-width: 360px;
  padding: 16px;
  border-radius: 12px;
  background: #1c1f2f;
  display: flex;
  gap: 12px;
  color: #5de6ff;
  text-decoration: none;
}
.b10-page .b10-event > span { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.b10-page .b10-event small { color: #ccc3d8; font-size: 10px; }
.b10-page .b10-event strong { color: #e0e1f7; font-size: 14px; overflow-wrap: anywhere; }
.b10-page .b10-event span span { font-size: 11px; }
.b10-page .b10-header-context { color: #ccc3d8; font-size: 12px; }
.b10-page .b10-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.b10-page .b10-kpi {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: 16px;
  background: #181b2a;
  box-shadow: 0 8px 20px #0002;
  overflow: hidden;
}
.b10-page .b10-purple { background: linear-gradient(125deg, #181b2a 45%, #7c3aed25); }
.b10-page .b10-cyan { background: linear-gradient(125deg, #181b2a 45%, #00cbe61a); }
.b10-page .b10-pink { background: linear-gradient(125deg, #181b2a 45%, #ae397b25); }
.b10-page .b10-kpi > svg { position: absolute; right: 18px; top: 18px; color: #d2bbff; width: 22px; }
.b10-page .b10-cyan > svg { color: #5de6ff; }
.b10-page .b10-pink > svg { color: #ffafd3; }
.b10-page .b10-kpi > span { font: 500 11px "Space Grotesk", sans-serif; color: #ccc3d8; padding-right: 24px; }
.b10-page .b10-kpi strong { font: 700 clamp(20px, 2vw, 30px) "Be Vietnam Pro", sans-serif; overflow-wrap: anywhere; }
.b10-page .b10-kpi em { font: 400 13px "Be Vietnam Pro", sans-serif; color: #ccc3d8; }
.b10-page .b10-kpi small { color: #ccc3d8; font-size: 11px; }
.b10-page .b10-progress { height: 6px; background: #313445; border-radius: 12px; overflow: hidden; }
.b10-page .b10-progress i { display: block; height: 100%; background: #5de6ff; border-radius: inherit; }
.b10-page .b10-pink .b10-progress i { background: #ffafd3; }
.b10-page .b10-panel { padding: 24px; border-radius: 16px; background: #181b2a; box-shadow: 0 8px 20px #0002; min-width: 0; }
.b10-page .b10-filters form { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-top: 20px; }
.b10-page label { display: flex; flex-direction: column; gap: 8px; color: #ccc3d8; font-size: 12px; }
.b10-page input, .b10-page button { font: inherit; }
.b10-page input { color-scheme: dark; background: #0a0d1c; color: #e0e1f7; border: 1px solid #4a4455; border-radius: 8px; padding: 10px 12px; min-height: 42px; }
.b10-page .b10-content button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 10px 16px; background: #262939; color: #e0e1f7; border: 1px solid transparent; border-radius: 8px; font-size: 12px; cursor: pointer; }
.b10-page .b10-content button.b10-primary { background: #7c3aed; color: #fff; }
.b10-page .b10-content button.b10-export { background: #5de6ff; color: #00363e; margin-left: auto; font-weight: 600; }
.b10-page button:disabled { opacity: .5; cursor: wait; }
.b10-page :is(button, input, a, summary, [tabindex]):focus-visible { outline: 2px solid #5de6ff; outline-offset: 3px; }
.b10-page .b10-content button:not(:disabled):hover { border-color: #5de6ff; }
.b10-page .b10-form-error { color: #ffb4ab; }
.b10-page .b10-export-notice { min-height: 18px; color: #5de6ff; font-size: 12px; margin-bottom: 0; }
.b10-page .b10-period-total { display: flex; flex-direction: column; gap: 6px; text-align: right; }
.b10-page .b10-period-total strong { font: 700 24px "Be Vietnam Pro", sans-serif; color: #5de6ff; }
.b10-page .b10-period-total span { font-size: 11px; color: #ccc3d8; }
.b10-page .b10-chart { margin-top: 24px; overflow-x: auto; }
.b10-page .b10-chart svg { display: block; width: 100%; min-width: 900px; min-height: 200px; }
.b10-page .b10-chart text { font: 12px "Space Grotesk", sans-serif; fill: #ccc3d8; }
.b10-page .b10-legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 11px; }
.b10-page .b10-legend span { display: flex; align-items: center; gap: 8px; }
.b10-page .b10-legend i { height: 8px; width: 8px; border-radius: 50%; background: #5de6ff; }
.b10-page .b10-legend span + span i { background: #ffafd3; }
.b10-page .b10-daily summary { color: #5de6ff; cursor: pointer; font-size: 12px; padding: 12px 0; }
.b10-page .b10-table-scroll { overflow-x: auto; border-radius: 8px; }
.b10-page table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.b10-page .b10-types { min-width: 650px; margin-top: 20px; }
.b10-page :is(th, td) { padding: 18px 16px; border-bottom: 1px solid #313445; }
.b10-page thead th { font: 500 11px/1.6 "Space Grotesk", sans-serif; color: #ccc3d8; text-transform: uppercase; }
.b10-page tbody th { font-weight: 500; }
.b10-page :is(th, td):not(:first-child) { text-align: right; }
.b10-page tbody tr:hover { background: #1c1f2f; }
.b10-page .b10-type-name { white-space: pre-line; overflow-wrap: anywhere; display: block; max-width: 320px; }
.b10-page .b10-type-revenue { color: #5de6ff; font-weight: 600; }
.b10-page .b10-chip { display: inline-block; font: 11px "Space Grotesk", sans-serif; padding: 5px 8px; border-radius: 6px; background: #7c3aed25; color: #d2bbff; }
.b10-page tbody .b10-chip { margin-top: 6px; }
.b10-page tfoot { background: #0a0d1c; font-weight: 600; color: #5de6ff; }
.b10-page .b10-state { padding: 32px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; color: #ccc3d8; }
.b10-page .b10-error { background: #181b2a; padding: 24px; border: 1px solid #ffb4ab55; border-radius: 12px; }
.b10-page .b10-error p { color: #ffb4ab; }
.b10-page .b10-error a { margin-left: 16px; color: #5de6ff; }
.b10-page .b10-updated { text-align: right; font-size: 11px; }
.b10-page .b10-scroll-hint { display: none; }
.b10-page .b10-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 1100px) {
  .b10-page .b10-header-context { display: none; }
  .b10-page .b10-hero { align-items: flex-start; flex-direction: column; }
  .b10-page .b10-event { max-width: 100%; }
  .b10-page .b10-kpis { gap: 12px; }
  .b10-page .b10-kpi { padding: 18px; }
}
@media (max-width: 650px) {
  .b10-page .b10-content { padding: 16px; gap: 16px; }
  .b10-page h1 { font-size: 26px; }
  .b10-page h2 { font-size: 20px; }
  .b10-page .b10-kpis { grid-template-columns: minmax(0, 1fr); }
  .b10-page .b10-kpi strong { font-size: 26px; }
  .b10-page .b10-panel { padding: 18px 16px; }
  .b10-page .b10-section-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .b10-page .b10-period-total { text-align: left; }
  .b10-page .b10-filters label { flex: 1 1 120px; min-width: 0; }
  .b10-page .b10-filters input { width: 100%; min-width: 0; }
  .b10-page .b10-content button.b10-export { margin-left: 0; }
  .b10-page .b10-chart svg { min-height: 230px; }
  .b10-page .b10-scroll-hint { display: block; font-size: 11px; color: #d2bbff; }
  .b10-page .org-breadcrumb > a, .b10-page .org-crumb-sep { display: none; }
  .b10-page .org-breadcrumb { font-size: 10px; }
  .b10-page .org-create-btn { white-space: nowrap; font-size: 11px; padding: 8px; }
  .b10-page .org-header-left, .b10-page .org-header-right { gap: 8px; }
}
`;
