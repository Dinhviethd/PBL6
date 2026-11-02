import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Copy, MapPin,
  Menu, RefreshCw, Search, Ticket, Users, X,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import type { Event, Ticket as Attendee } from "@/features/ticketing/types";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { OrganizerHeader } from "./OrganizerHeader";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";

type Filter = { status: string; ticketTypeId: string; q: string; page: number };
type AttendeePage = {
  success: boolean;
  data: Attendee[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
type Failure = { error: string; code?: string };
const emptyFilter: Filter = { status: "", ticketTypeId: "", q: "", page: 0 };
const statuses = [
  { value: "", label: "Tất cả" },
  { value: "CHECKED_IN", label: "Đã check-in" },
  { value: "VALID", label: "Chưa check-in" },
];

function failure(error: unknown): Failure {
  return { error: message(error), code: axios.isAxiosError(error) ? error.response?.data?.code : undefined };
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function initials(value = "") {
  return value.trim().split(/\s+/).slice(-2).map(word => word[0] ?? "").join("").toUpperCase() || "?";
}

export function AttendeeManagerPage() {
  const { id } = useParams();
  const revision = useAuth(state => state.revision);
  return <AttendeeContent key={`${id}:${revision}`} eventId={id!} />;
}

function AttendeeContent({ eventId }: { eventId: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventFailure, setEventFailure] = useState<Failure | null>(null);
  const [eventVersion, setEventVersion] = useState(0);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: AttendeePage; failure?: Failure } | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const query = new URLSearchParams({ paginated: "true", page: String(filter.page), limit: "5", q: filter.q });
  if (filter.status) query.set("status", filter.status);
  if (filter.ticketTypeId) query.set("ticketTypeId", filter.ticketTypeId);
  const url = `/organizer/events/${encodeURIComponent(eventId)}/attendees?${query}`;
  const requestKey = `${url}:${version}`;
  const current = result?.key === requestKey ? result : null;
  const loading = event !== null && !current;
  const data = current?.data;
  const page = data?.pagination;

  useEffect(() => {
    const controller = new AbortController();
    api.get<{ data: Event }>(`/organizer/events/${encodeURIComponent(eventId)}`, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) { setEvent(response.data.data); setEventFailure(null); } })
      .catch(error => { if (!controller.signal.aborted) setEventFailure(failure(error)); });
    return () => controller.abort();
  }, [eventId, eventVersion]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilter(current => current.q === search.trim() ? current : { ...current, q: search.trim(), page: 0 });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!event) return;
    const controller = new AbortController();
    api.get<AttendeePage>(url, { signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        // A legacy runtime has no pagination; fail visibly instead of inventing totals.
        const payload = response.data;
        if (!payload.pagination || !Array.isArray(payload.data)) {
          throw new Error("Máy chủ chưa hỗ trợ bộ lọc và phân trang người tham dự. Vui lòng thử lại sau.");
        }
        const { page: index, totalPages } = payload.pagination;
        if (index > 0 && (totalPages === 0 || index >= totalPages)) {
          setFilter(current => ({ ...current, page: Math.max(0, totalPages - 1) }));
          return;
        }
        setResult({ key: requestKey, data: payload });
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ key: requestKey, failure: failure(error) });
      });
    return () => controller.abort();
  }, [event, requestKey, url]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); document.getElementById("b8-menu")?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  function reset() {
    setSearch("");
    setFilter(emptyFilter);
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopyNotice(`Đã sao chép mã vé ${code}.`);
    } catch {
      setCopyNotice("Không thể sao chép tự động. Bạn có thể chọn và sao chép mã vé trong bảng.");
    }
  }

  const problem = eventFailure ?? current?.failure;
  const denied = problem?.code === "FORBIDDEN" || problem?.code === "NOT_FOUND";
  const hasFilter = Boolean(filter.q || filter.status || filter.ticketTypeId);
  const pageNumbers = page ? Array.from(new Set([
    0, ...Array.from({ length: 5 }, (_, index) => page.page + index - 2), page.totalPages - 1,
  ].filter(index => index >= 0 && index < page.totalPages))).sort((a, b) => a - b) : [];

  return (
    <div className={`b8-page qs-page${menuOpen ? " qs-menu-open" : ""}`}>
      <style>{styles}</style>
      <div className="qs-sidebar" id="b8-navigation">
        <OrganizerSidebar active="Người tham dự" hideLiveSync />
      </div>
      {menuOpen && <button className="qs-backdrop" aria-label="Đóng điều hướng" onClick={() => setMenuOpen(false)} />}
      <div className="qs-body qs-shared-header">
        <OrganizerHeader
          title="Người tham dự"
          searchSlot={<span className="b8-header-context">Danh sách theo sự kiện</span>}
          menuButton={
            <button id="b8-menu" className="qs-menu-button qs-icon-button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen} aria-controls="b8-navigation" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
            </button>
          }
          notificationSlot={<NotificationLink />}
        />
        <main className="b8-content">
          <section className="b8-hero" aria-labelledby="b8-title">
            <div className="b8-eyebrow"><span /> OPERATIONS CONTROL // ATTENDEE MANIFEST</div>
            <div className="b8-title-row">
              <h1 id="b8-title">Danh sách người tham dự &amp; Roster Check-in</h1>
              <Link className="b8-change-event" to="/organizer/events/attendees"><Users size={16} aria-hidden="true" /> Chọn sự kiện</Link>
            </div>
            {event && <div className="b8-event-context">
              <strong><Ticket size={17} aria-hidden="true" />{event.title}</strong>
              <span><CalendarDays size={15} aria-hidden="true" /><time dateTime={event.starts_at}>{dateTime(event.starts_at)}</time></span>
              <span><MapPin size={15} aria-hidden="true" />{event.venue_name}{event.city_code ? ` (${event.city_code})` : ""}</span>
            </div>}
            {!event && !eventFailure && <p role="status">Đang tải thông tin sự kiện…</p>}
          </section>

          {event && <section className="b8-filters" aria-label="Bộ lọc người tham dự">
            <div className="b8-status-filters" role="group" aria-label="Trạng thái check-in">
              {statuses.map(status => <button key={status.value} type="button"
                className={`b8-filter-button${filter.status === status.value ? " is-active" : ""}`}
                aria-pressed={filter.status === status.value}
                onClick={() => setFilter(current => ({ ...current, status: status.value, page: 0 }))}>
                {status.value && <span className={status.value === "CHECKED_IN" ? "b8-dot checked" : "b8-dot"} />}
                {status.label}
              </button>)}
            </div>
            <div className="b8-filter-row">
              <label className="b8-search">
                <Search size={19} aria-hidden="true" />
                <span className="b8-sr-only">Tìm tên, email hoặc mã vé</span>
                <input value={search} maxLength={200} placeholder="Nhập tên, email hoặc mã vé…"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                  onKeyDown={event => { if (event.key === "Escape") { setSearch(""); setFilter(current => ({ ...current, q: "", page: 0 })); } }} />
                {search && <button type="button" onClick={() => { setSearch(""); setFilter(current => ({ ...current, q: "", page: 0 })); }} aria-label="Xóa tìm kiếm"><X size={16} /></button>}
                <kbd>ESC xóa</kbd>
              </label>
              <label className="b8-type-filter">
                <span className="b8-sr-only">Hạng vé</span>
                <select aria-label="Hạng vé" value={filter.ticketTypeId}
                  onChange={event => setFilter(current => ({ ...current, ticketTypeId: event.target.value, page: 0 }))}>
                  <option value="">Tất cả hạng vé</option>
                  {event.ticketTypes?.map(type => <option key={type.id} value={type.id}>{type.name}{type.archived_at ? " (đã lưu trữ)" : ""}</option>)}
                </select>
              </label>
            </div>
          </section>}

          {problem && <section className="b8-state b8-error" role="alert">
            <h2>{denied ? "Không thể mở danh sách" : "Không tải được dữ liệu"}</h2>
            <p>{problem.error}</p>
            {!denied && <button className="b8-secondary" onClick={() => {
              if (eventFailure) setEventVersion(current => current + 1);
              else setVersion(current => current + 1);
            }}><RefreshCw size={16} /> Thử tải lại</button>}
            {denied && <Link className="b8-secondary" to="/organizer/events/attendees">Chọn sự kiện khác</Link>}
          </section>}

          {loading && <div className="b8-state" role="status"><RefreshCw size={20} className="b8-loading" /> Đang tải danh sách người tham dự…</div>}
          {data && page && <section className="b8-roster" aria-label="Danh sách vé tham dự">
            {data.data.length === 0 ? <div className="b8-state">
              <Users size={36} aria-hidden="true" />
              <h2>{hasFilter ? "Không có kết quả phù hợp" : "Chưa có người tham dự"}</h2>
              <p>{hasFilter ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." : "Vé được phát hành cho sự kiện sẽ xuất hiện tại đây."}</p>
              {hasFilter && <button className="b8-secondary" onClick={reset}>Xóa bộ lọc</button>}
            </div> : <div className="b8-table-scroll" role="region" aria-label="Bảng người tham dự" tabIndex={0}>
              <table>
                <caption className="b8-sr-only">Mỗi dòng là một vé với thông tin người mua tại thời điểm đặt vé.</caption>
                <thead><tr><th scope="col">Người tham dự</th><th scope="col">Mã vé &amp; Hạng vé</th><th scope="col">Trạng thái check-in</th></tr></thead>
                <tbody>{data.data.map(row => <tr key={row.id}>
                  <td><div className="b8-person">
                    <span className="b8-avatar" aria-hidden="true">{initials(row.buyer_name_snapshot)}</span>
                    <div><strong>{row.buyer_name_snapshot || "Chưa có tên người mua"}</strong><span>{row.buyer_email_snapshot || "Chưa có email"}</span></div>
                  </div></td>
                  <td><div className="b8-ticket-code"><code>{row.ticket_code}</code><button type="button" aria-label={`Sao chép mã vé ${row.ticket_code}`} onClick={() => copy(row.ticket_code)}><Copy size={15} /></button></div>
                    <span className="b8-ticket-type">{row.ticket_type_name_snapshot}</span>
                  </td>
                  <td><span className={`b8-badge ${row.status === "CHECKED_IN" ? "checked" : row.status === "VOID" ? "void" : "waiting"}`}>
                    {row.status === "CHECKED_IN" ? <Check size={13} /> : <span className="b8-dot" />}
                    {row.status === "CHECKED_IN" ? "Đã check-in" : row.status === "VALID" ? "Chưa check-in" : row.status === "VOID" ? "Vé đã hủy" : row.status}
                  </span>
                    {row.checked_in_at && <time className="b8-checkin-time" dateTime={row.checked_in_at}>{dateTime(row.checked_in_at)}</time>}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>}
            <footer className="b8-pagination">
              <p aria-live="polite">Hiển thị <strong>{page.total ? page.page * page.pageSize + 1 : 0} – {page.total ? page.page * page.pageSize + data.data.length : 0}</strong> trên <strong>{page.total.toLocaleString("vi-VN")}</strong> vé tham dự</p>
              {page.totalPages > 0 && <nav aria-label="Phân trang người tham dự">
                <button aria-label="Trang trước" disabled={page.page === 0} onClick={() => setFilter(current => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={17} /></button>
                {pageNumbers.map((index, position) => <span className="b8-page-number" key={index}>
                  {position > 0 && index > pageNumbers[position - 1] + 1 && <span aria-hidden="true">…</span>}
                  <button aria-label={`Trang ${index + 1}`} aria-current={index === page.page ? "page" : undefined}
                    onClick={() => setFilter(current => ({ ...current, page: index }))}>{index + 1}</button>
                </span>)}
                <button aria-label="Trang sau" disabled={page.page + 1 >= page.totalPages} onClick={() => setFilter(current => ({ ...current, page: current.page + 1 }))}><ChevronRight size={17} /></button>
              </nav>}
              <span className="b8-total-pages">{page.totalPages ? `Trang ${page.page + 1} / ${page.totalPages}` : "0 kết quả"}</span>
            </footer>
          </section>}
          <p className="b8-copy-notice" role="status" aria-live="polite">{copyNotice}</p>
        </main>
      </div>
    </div>
  );
}

const styles = `
.b8-page {
  min-height: 100vh;
  background: #0f1222;
  color: #e0e1f7;
}
.b8-page .b8-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.b8-page .b8-header-context {
  color: #ccc3d8;
  font-size: 12px;
}
.b8-page .b8-hero {
  padding: 24px;
  border-radius: 12px;
  background: radial-gradient(ellipse at top right, #7c3aed26, transparent 65%), #181b2a;
  box-shadow: 0 8px 24px #0002;
}
.b8-page .b8-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5de6ff;
  font: 600 11px/18px "Space Grotesk", sans-serif;
  letter-spacing: .08em;
}
.b8-page .b8-eyebrow > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5de6ff;
  box-shadow: 0 0 10px #5de6ff88;
  flex-shrink: 0;
}
.b8-page .b8-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 12px 0 20px;
}
.b8-page h1 {
  margin: 0;
  max-width: 760px;
  color: #e0e1f7;
  font: 700 32px/1.25 "Be Vietnam Pro", sans-serif;
  letter-spacing: -.02em;
}
.b8-page .b8-change-event, .b8-page .b8-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  border: 1px solid #4a4455;
  border-radius: 8px;
  padding: 10px 14px;
  color: #e0e1f7;
  background: #262939;
  font: 500 12px/20px "Space Grotesk", sans-serif;
}
.b8-page .b8-change-event:hover, .b8-page .b8-secondary:hover { border-color: #5de6ff; }
.b8-page .b8-event-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding: 12px 16px;
  width: fit-content;
  max-width: 100%;
  border-radius: 8px;
  background: #1c1f2f;
  font-size: 12px;
}
.b8-page .b8-event-context > * { display: flex; gap: 8px; align-items: center; min-width: 0; overflow-wrap: anywhere; }
.b8-page .b8-event-context svg { flex-shrink: 0; color: #5de6ff; }
.b8-page .b8-event-context strong { font-family: "Space Grotesk", sans-serif; }
.b8-page .b8-filters { padding: 16px; border-radius: 12px; background: #181b2a; }
.b8-page .b8-status-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.b8-page .b8-filter-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px 16px;
  background: #262939;
  color: #ccc3d8;
  font: 600 12px/18px "Space Grotesk", sans-serif;
}
.b8-page .b8-filter-button.is-active { background: #7c3aed; color: #fff; box-shadow: 0 0 16px #7c3aed40; }
.b8-page .b8-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #aaa2b7; flex-shrink: 0; }
.b8-page .b8-dot.checked { background: #5de6ff; box-shadow: 0 0 8px #5de6ff80; }
.b8-page .b8-filter-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 280px); gap: 16px; }
.b8-page .b8-search { display: flex; gap: 10px; align-items: center; min-width: 0; background: #0a0d1c; padding: 10px 12px; border-radius: 8px; color: #aaa2b7; }
.b8-page .b8-search:focus-within { outline: 1px solid #5de6ff; }
.b8-page .b8-search > svg { flex-shrink: 0; }
.b8-page .b8-search input { min-width: 0; width: 100%; border: 0; outline: 0; box-shadow: none; padding: 0; background: transparent; color: #e0e1f7; }
.b8-page .b8-search input::placeholder { color: #aaa2b7; }
.b8-page .b8-search button { background: transparent; color: #ccc3d8; border: 0; padding: 4px; display: flex; }
.b8-page kbd { white-space: nowrap; padding: 4px; border-radius: 4px; background: #262939; color: #ccc3d8; font: 10px "Space Grotesk", sans-serif; }
.b8-page .b8-type-filter select { width: 100%; min-width: 0; height: 100%; min-height: 44px; border: 1px solid transparent; border-radius: 8px; padding: 10px 12px; background: #0a0d1c; color: #e0e1f7; font: inherit; text-overflow: ellipsis; }
.b8-page .b8-roster { border-radius: 12px; overflow: hidden; background: #181b2a; }
.b8-page .b8-table-scroll { overflow-x: auto; }
.b8-page table { width: 100%; border-collapse: collapse; min-width: 680px; text-align: left; }
.b8-page th { background: #0a0d1c; padding: 16px; color: #aaa2b7; font: 600 11px/18px "Space Grotesk", sans-serif; text-transform: uppercase; letter-spacing: .04em; }
.b8-page td { padding: 18px 16px; border-bottom: 1px solid #262939; vertical-align: middle; }
.b8-page tbody tr:hover { background: #26293980; }
.b8-page .b8-person { display: flex; align-items: center; gap: 12px; }
.b8-page .b8-avatar { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #5de6ff); color: #0a0d1c; font: 700 18px "Be Vietnam Pro", sans-serif; }
.b8-page .b8-person strong { display: block; color: #e0e1f7; font: 600 16px/24px "Be Vietnam Pro", sans-serif; overflow-wrap: anywhere; }
.b8-page .b8-person div > span { display: block; color: #ccc3d8; font-size: 12px; overflow-wrap: anywhere; }
.b8-page .b8-ticket-code { display: flex; align-items: center; gap: 8px; }
.b8-page .b8-ticket-code code { color: #5de6ff; font: 600 12px/20px "Space Grotesk", sans-serif; white-space: nowrap; }
.b8-page .b8-ticket-code button { border: 0; background: transparent; color: #aaa2b7; padding: 6px; display: flex; }
.b8-page .b8-ticket-code button:hover { color: #5de6ff; }
.b8-page .b8-ticket-type { display: block; margin-top: 4px; font-weight: 600; font-size: 12px; }
.b8-page .b8-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; white-space: nowrap; font: 600 11px/18px "Space Grotesk", sans-serif; }
.b8-page .b8-badge.checked { color: #5de6ff; background: #00cbe620; }
.b8-page .b8-badge.waiting { color: #ccc3d8; background: #262939; }
.b8-page .b8-badge.void { color: #ffb4ab; background: #93000a33; }
.b8-page .b8-checkin-time { display: block; margin-top: 6px; color: #aaa2b7; font: 11px/18px "Space Grotesk", sans-serif; }
.b8-page .b8-pagination { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 16px; background: #0a0d1c; color: #ccc3d8; font-size: 12px; }
.b8-page .b8-pagination p { margin: 0; }
.b8-page .b8-pagination nav, .b8-page .b8-page-number { display: flex; align-items: center; gap: 4px; }
.b8-page .b8-pagination button { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 34px; padding: 4px; background: #1c1f2f; color: #ccc3d8; border-radius: 8px; border: 0; font-family: "Space Grotesk", sans-serif; }
.b8-page .b8-pagination button[aria-current="page"] { background: #7c3aed; color: #fff; box-shadow: 0 0 10px #7c3aed40; }
.b8-page .b8-total-pages { font: 12px "Space Grotesk", sans-serif; }
.b8-page .b8-state { padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; color: #ccc3d8; border-radius: 12px; background: #181b2a; }
.b8-page .b8-state h2 { margin: 0; font: 600 22px/30px "Be Vietnam Pro", sans-serif; color: #e0e1f7; }
.b8-page .b8-state p { margin: 0; max-width: 560px; }
.b8-page .b8-error { border: 1px solid #ffb4ab55; }
.b8-page .b8-copy-notice { margin: 0; min-height: 20px; color: #5de6ff; font-size: 12px; }
.b8-page .b8-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (max-width: 1100px) {
  .b8-page .b8-header-context { display: none; }
  .b8-page .b8-title-row { align-items: flex-start; flex-direction: column; gap: 16px; }
  .b8-page .org-breadcrumb { font-size: 11px; }
}
@media (max-width: 650px) {
  .b8-page .b8-content { padding: 16px; gap: 16px; }
  .b8-page .b8-hero { padding: 20px 16px; }
  .b8-page h1 { font-size: 25px; }
  .b8-page .b8-eyebrow { font-size: 9px; letter-spacing: .03em; }
  .b8-page .b8-filter-row { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .b8-page .b8-filter-button { padding: 10px; font-size: 11px; }
  .b8-page .b8-status-filters { gap: 6px; }
  .b8-page kbd { display: none; }
  .b8-page .b8-pagination { align-items: flex-start; flex-direction: column; }
  .b8-page .b8-pagination nav { flex-wrap: wrap; }
  .b8-page .org-breadcrumb { gap: 4px; font-size: 10px; }
  .b8-page .org-breadcrumb > a, .b8-page .org-breadcrumb .org-crumb-sep { display: none; }
  .b8-page .org-create-btn { white-space: nowrap; font-size: 11px; padding: 8px; }
  .b8-page .org-header-left { gap: 8px; }
  .b8-page .org-header-right { gap: 8px; }
}
`;
