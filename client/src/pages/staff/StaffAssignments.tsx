import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlarmClock, ArrowLeft, ArrowRight, BadgeCheck, Ban, CalendarDays, Check,
  CircleAlert, Clock3, CloudOff, IdCard, ImageOff, Inbox, Info, LoaderCircle,
  MapPin, QrCode, RefreshCw, ShieldCheck, TimerOff, X,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import {
  type AssignedEvent as Assignment, type AssignmentPage, labels, status,
} from "@/features/ticketing/staff-data";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function useAssignments(page: number, onPage: (page: number) => void) {
  const revision = useAuth((state) => state.revision);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string; data?: AssignmentPage; loading: boolean; error?: string;
  }>({ key: "", loading: true });
  const key = revision + ":" + page;
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setResult({ key, loading: true });
    api.get<AssignmentPage>("/me/checkin-assignments?page=" + page, {
      signal: controller.signal,
    }).then(({ data }) => {
      if (!active) return;
      if (!Array.isArray(data.data) || !data.pagination || data.pagination.pageSize !== 50)
        throw new Error("Không thể tải phân công. Vui lòng thử lại sau.");
      const lastPage = Math.max(0, data.pagination.totalPages - 1);
      if (page > lastPage) {
        onPage(lastPage);
        return;
      }
      setResult({ key, data, loading: false });
    }).catch((error: unknown) => {
      if (active) setResult({ key, loading: false, error: message(error) });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, page, version, onPage]);
  return { ...(result.key === key ? result : { data: undefined, error: undefined, loading: true }), reload };
}

function EventImage({ source, title }: { source: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="a13-image">
      {source && !failed ? (
        <img src={source} alt={"Ảnh sự kiện " + title} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span><ImageOff size={26} aria-hidden="true" />Chưa có ảnh</span>
      )}
    </div>
  );
}

function AssignmentCard({ assignment: item, now, busyId, onRespond }: {
  assignment: Assignment;
  now: number;
  busyId: string | null;
  onRespond: (id: string, accept: boolean) => void;
}) {
  const current = status(item, now);
  const closed = ["CANCELLED", "ARCHIVED"].includes(item.event_status) ||
    new Date(item.ends_at).getTime() <= now;
  const pending = current === "PENDING" && !closed;
  const active = current === "ACTIVE" && !closed;
  const inWindow = active && new Date(item.checkin_opens_at).getTime() <= now &&
    now <= new Date(item.checkin_closes_at).getTime();
  const muted = closed || ["EXPIRED", "DECLINED", "REVOKED"].includes(current);
  const Icon = current === "EXPIRED" ? TimerOff : current === "DECLINED" ? X :
    current === "REVOKED" ? Ban : current === "ACTIVE" ? BadgeCheck : Clock3;
  return (
    <article className={"a13-card" + (muted ? " a13-muted" : "")} aria-labelledby={"assignment-" + item.id}>
      <EventImage key={item.event_id + ":" + item.image_url} source={item.image_url} title={item.title} />
      <div className="a13-card-content">
        <div className="a13-card-top">
          <div className="a13-title-group">
            <h2 id={"assignment-" + item.id}>{item.title}</h2>
            {closed && <span className="a13-closed">Sự kiện đã đóng</span>}
          </div>
          <span className={"a13-badge a13-status-" + current.toLowerCase()}>
            <Icon size={13} aria-hidden="true" />{labels[current] || "Chưa xác định"}
          </span>
        </div>
        <div className="a13-meta">
          <span><MapPin size={17} aria-hidden="true" />{item.venue_name}</span>
          <span><CalendarDays size={17} aria-hidden="true" />Bắt đầu: <time dateTime={item.starts_at}>{dateTime(item.starts_at)}</time></span>
        </div>
        <div className="a13-window">
          <Clock3 size={17} aria-hidden="true" />
          <span>Check-in: <time dateTime={item.checkin_opens_at}>{dateTime(item.checkin_opens_at)}</time>
            {" – "}<time dateTime={item.checkin_closes_at}>{dateTime(item.checkin_closes_at)}</time></span>
          {inWindow && <span className="a13-on-duty">Đang trong ca trực</span>}
        </div>
        {pending ? (
          <div className="a13-card-bottom">
            <span className="a13-deadline"><AlarmClock size={15} aria-hidden="true" />
              Chấp nhận trước: <time dateTime={item.expires_at}>{dateTime(item.expires_at)}</time>
            </span>
            <div className="a13-actions">
              <button className="a13-button a13-decline" disabled={busyId !== null} onClick={() => onRespond(item.id, false)}>Từ chối</button>
              <button className="a13-button a13-accept" disabled={busyId !== null} onClick={() => onRespond(item.id, true)}>
                {busyId === item.id ? <LoaderCircle className="a13-spin" size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                {busyId === item.id ? "Đang gửi…" : "Chấp nhận"}
              </button>
            </div>
          </div>
        ) : active ? (
          <div className="a13-card-bottom">
            <span className="a13-permission"><ShieldCheck size={16} aria-hidden="true" />Quyền hạn: Quét vé QR & nhập mã vé</span>
            <Link className="a13-button a13-scan" to={"/checkin/events/" + item.event_id}>
              <QrCode size={19} aria-hidden="true" />Mở quét vé
            </Link>
          </div>
        ) : (
          <p className="a13-inactive-note"><Info size={15} aria-hidden="true" />
            {current === "EXPIRED" ? "Lời mời đã quá hạn phản hồi." :
              current === "DECLINED" ? "Bạn đã từ chối nhận phân công cho sự kiện này." :
              current === "REVOKED" ? "Quyền check-in cho sự kiện này đã bị thu hồi." : "Sự kiện đã đóng."}
          </p>
        )}
      </div>
    </article>
  );
}

export function StaffAssignments() {
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [now, setNow] = useState(Date.now);
  const busy = useRef(false);
  const mounted = useRef(true);
  const { data, loading, error: loadError, reload } = useAssignments(page, setPage);
  useEffect(() => {
    mounted.current = true;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = () => {
      if (!busy.current && document.visibilityState !== "hidden") reload();
    };
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      window.clearInterval(tick);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);

  async function respond(id: string, accept: boolean) {
    if (busy.current) return;
    busy.current = true;
    setBusyId(id);
    setError("");
    setFeedback("");
    try {
      await api.post("/me/checkin-invitations/" + id + "/respond", { accept });
      if (!mounted.current) return;
      setFeedback(accept ? "Đã chấp nhận lời mời check-in." : "Đã từ chối lời mời check-in.");
      reload();
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      busy.current = false;
      if (mounted.current) setBusyId(null);
    }
  }

  return (
    <section className="a13-assignments" aria-labelledby="a13-heading">
      <style>{styles}</style>
      <div className="a13-content">
        <div className="a13-heading">
          <span className="a13-eyebrow"><IdCard size={14} aria-hidden="true" />NHÂN VIÊN CHECK-IN</span>
          <h1 id="a13-heading">Sự kiện được phân công</h1>
          <p>Chấp nhận lời mời để quét QR hoặc nhập mã vé cho sự kiện được phân công.</p>
        </div>
        <div className="a13-toolbar">
          <button className="a13-button a13-refresh" disabled={loading || busyId !== null}
            onClick={() => { setError(""); setFeedback(""); reload(); }}>
            <RefreshCw size={16} aria-hidden="true" />Làm mới danh sách
          </button>
        </div>
        <p className="a13-sr" role="status">{feedback}</p>
        {error && <div className="a13-action-error" role="alert"><CircleAlert size={18} aria-hidden="true" />{error}</div>}
        {loading ? (
          <div className="a13-loading" role="status">
            <div className="a13-state">
              <span className="a13-state-icon"><LoaderCircle size={28} className="a13-spin" aria-hidden="true" /></span>
              <h2>Đang tải dữ liệu…</h2>
              <p>Đang đồng bộ danh sách phân công check-in từ máy chủ.</p>
            </div>
            {[0, 1].map((id) => <div className="a13-skeleton" key={id} aria-hidden="true"><span /><div><i /><i /><i /></div></div>)}
          </div>
        ) : loadError ? (
          <div className="a13-state a13-error" role="alert">
            <span className="a13-state-icon"><CloudOff size={30} aria-hidden="true" /></span>
            <h2>Lỗi tải dữ liệu</h2>
            <p>{loadError}</p>
            <button className="a13-button" onClick={reload}>Thử lại</button>
          </div>
        ) : !data?.data.length ? (
          <div className="a13-state">
            <span className="a13-state-icon a13-cyan"><Inbox size={32} aria-hidden="true" /></span>
            <h2>Bạn chưa có lời mời check-in.</h2>
            <p>Hiện tại chưa có sự kiện nào phân công check-in cho tài khoản của bạn.</p>
            <div className="a13-empty-hint"><Info size={21} aria-hidden="true" /><div>
              <strong>Bạn là nhân viên tại điểm tổ chức?</strong>
              <p>Vui lòng cung cấp email tài khoản EventHub này cho Ban tổ chức sự kiện để được phân công check-in.</p>
            </div></div>
          </div>
        ) : (
          <>
            <div className="a13-list">
              {data.data.map((item) => <AssignmentCard key={item.id} assignment={item} now={now}
                busyId={busyId} onRespond={(id, accept) => void respond(id, accept)} />)}
            </div>
            <nav className="a13-pager" aria-label="Phân trang sự kiện được phân công">
              <button className="a13-button" disabled={page === 0 || busyId !== null} onClick={() => setPage(page - 1)}>
                <ArrowLeft size={16} aria-hidden="true" />Trước
              </button>
              <span aria-live="polite">Trang {page + 1} / {data.pagination.totalPages}</span>
              <button className="a13-button" disabled={page + 1 >= data.pagination.totalPages || busyId !== null} onClick={() => setPage(page + 1)}>
                Sau<ArrowRight size={16} aria-hidden="true" />
              </button>
            </nav>
          </>
        )}
      </div>
    </section>
  );
}

const styles = `
.eventhub:has(.a13-assignments) {
  background: #0f1222;
}
.site-main:has(.a13-assignments) {
  max-width: none;
  padding: 0;
}
.a13-assignments {
  color: #e0e1f7;
  background: radial-gradient(ellipse at 35% 0, #7c3aed20, transparent 52%),
    radial-gradient(ellipse at 100% 60%, #00cbe612, transparent 50%);
  font-family: 'Be Vietnam Pro', sans-serif;
  min-height: 75vh;
}
.a13-assignments .a13-content {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.a13-assignments .a13-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #7c3aed33;
  color: #d2bbff;
  font: 600 11px/14px 'Space Grotesk', sans-serif;
  letter-spacing: .1em;
}
.a13-assignments h1 {
  margin: 8px 0;
  font: 700 32px/40px 'Be Vietnam Pro', sans-serif;
  letter-spacing: -.02em;
}
.a13-assignments p {
  margin: 0;
  color: #ccc3d8;
  font-size: 14px;
  line-height: 22px;
}
.a13-assignments .a13-heading > p {
  font-size: 16px;
  line-height: 24px;
}
.a13-assignments .a13-toolbar {
  display: flex;
  justify-content: flex-end;
}
.a13-assignments .a13-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 16px;
  border: 0;
  border-radius: 8px;
  background: #313445;
  color: #e0e1f7;
  text-decoration: none;
  font: 600 12px/18px 'Space Grotesk', sans-serif;
  cursor: pointer;
  transition: background .18s, box-shadow .18s;
}
.a13-assignments .a13-button:hover:not(:disabled) {
  background: #353849;
}
.a13-assignments .a13-button:focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 4px;
}
.a13-assignments .a13-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.a13-assignments .a13-refresh {
  background: #1c1f2f;
  color: #ccc3d8;
}
.a13-assignments .a13-refresh:hover:not(:disabled) {
  color: #5de6ff;
}
.a13-assignments .a13-list,
.a13-assignments .a13-loading {
  display: grid;
  gap: 16px;
}
.a13-assignments .a13-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  border-radius: 12px;
  background: #1c1f2f;
  box-shadow: 0 4px 12px #00000020;
  transition: background .18s;
}
.a13-assignments .a13-card:hover {
  background: #262939;
}
.a13-assignments .a13-image {
  width: 128px;
  height: 128px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #0a0d1c;
}
.a13-assignments .a13-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.a13-assignments .a13-image > span {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #ccc3d8;
  font-size: 11px;
}
.a13-assignments .a13-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.a13-assignments .a13-card-top,
.a13-assignments .a13-title-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.a13-assignments .a13-card-top {
  justify-content: space-between;
  align-items: flex-start;
}
.a13-assignments h2 {
  margin: 0;
  font: 700 20px/28px 'Be Vietnam Pro', sans-serif;
  overflow-wrap: anywhere;
}
.a13-assignments .a13-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font: 600 11px/14px 'Space Grotesk', sans-serif;
  background: #313445;
  color: #ccc3d8;
  white-space: nowrap;
}
.a13-assignments .a13-status-pending {
  background: #7c3aed40;
  color: #eaddff;
}
.a13-assignments .a13-status-active {
  background: #00cbe633;
  color: #5de6ff;
}
.a13-assignments .a13-status-declined {
  background: #93000a33;
  color: #ffb4ab;
}
.a13-assignments .a13-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  color: #ccc3d8;
  font-size: 13px;
  line-height: 20px;
}
.a13-assignments .a13-meta > span {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  overflow-wrap: anywhere;
}
.a13-assignments svg {
  flex-shrink: 0;
}
.a13-assignments .a13-meta svg,
.a13-assignments .a13-deadline svg,
.a13-assignments .a13-permission svg {
  color: #5de6ff;
}
.a13-assignments .a13-window {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #181b2a;
  color: #5de6ff;
  font: 600 12px/20px 'Space Grotesk', sans-serif;
}
.a13-assignments .a13-window > span {
  min-width: 0;
}
.a13-assignments .a13-window > span:first-of-type {
  flex: 1;
}
.a13-assignments .a13-on-duty {
  padding: 1px 7px;
  border-radius: 4px;
  background: #5de6ff1a;
}
.a13-assignments .a13-card-bottom {
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.a13-assignments .a13-deadline,
.a13-assignments .a13-permission,
.a13-assignments .a13-inactive-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #ccc3d8;
  font-size: 11px;
  line-height: 18px;
}
.a13-assignments .a13-deadline time {
  color: #e0e1f7;
  font-weight: 600;
}
.a13-assignments .a13-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.a13-assignments .a13-accept {
  background: linear-gradient(100deg, #7c3aed, #5de6ff);
  color: #0a0d1c;
  box-shadow: 0 0 16px #7c3aed40;
}
.a13-assignments .a13-accept:hover:not(:disabled) {
  background: linear-gradient(100deg, #8950ed, #84ecff);
}
.a13-assignments .a13-scan {
  padding: 12px 20px;
  margin-left: auto;
  background: #5de6ff;
  color: #00515d;
  box-shadow: 0 0 18px #5de6ff35;
}
.a13-assignments .a13-scan:hover {
  background: #a2eeff;
}
.a13-assignments .a13-muted {
  background: #1c1f2f99;
}
.a13-assignments .a13-muted h2,
.a13-assignments .a13-muted .a13-meta,
.a13-assignments .a13-muted .a13-window,
.a13-assignments .a13-muted .a13-inactive-note {
  color: #aaa4b6;
}
.a13-assignments .a13-muted img {
  filter: grayscale(1);
  opacity: .6;
}
.a13-assignments .a13-closed {
  padding: 3px 7px;
  border-radius: 4px;
  background: #313445;
  color: #ccc3d8;
  font-size: 11px;
}
.a13-assignments .a13-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 32px;
  border-radius: 16px;
  background: #1c1f2f;
  text-align: center;
}
.a13-assignments .a13-state > p {
  max-width: 440px;
}
.a13-assignments .a13-state-icon {
  display: inline-flex;
  padding: 16px;
  border-radius: 16px;
  background: #7c3aed33;
  color: #d2bbff;
}
.a13-assignments .a13-cyan {
  background: #313445;
  color: #5de6ff;
}
.a13-assignments .a13-empty-hint {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 440px;
  padding: 16px;
  margin-top: 8px;
  border-radius: 12px;
  background: #181b2a;
  text-align: left;
  font-size: 12px;
}
.a13-assignments .a13-empty-hint > svg {
  color: #d2bbff;
}
.a13-assignments .a13-empty-hint p {
  margin-top: 4px;
  font-size: 12px;
  line-height: 20px;
}
.a13-assignments .a13-error h2,
.a13-assignments .a13-error .a13-state-icon {
  color: #ffb4ab;
}
.a13-assignments .a13-action-error {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-radius: 12px;
  background: #93000a33;
  color: #ffdad6;
  font-size: 14px;
}
.a13-assignments .a13-skeleton {
  display: flex;
  gap: 20px;
  padding: 24px;
  border-radius: 12px;
  background: #1c1f2f;
}
.a13-assignments .a13-skeleton > span {
  width: 128px;
  height: 128px;
  background: #313445;
  border-radius: 8px;
}
.a13-assignments .a13-skeleton > div {
  flex: 1;
}
.a13-assignments .a13-skeleton i {
  display: block;
  height: 20px;
  width: 70%;
  margin-bottom: 16px;
  background: #313445;
  border-radius: 4px;
}
.a13-assignments .a13-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding-top: 24px;
  border-top: 1px solid #4a44554d;
}
.a13-assignments .a13-pager > span {
  color: #ccc3d8;
  font: 600 12px/18px 'Space Grotesk', sans-serif;
}
.a13-assignments .a13-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.a13-assignments .a13-spin {
  animation: a13-spin 1s linear infinite;
}
@keyframes a13-spin {
  to { transform: rotate(360deg); }
}
@media (min-width: 901px) and (max-width: 1100px) {
  .eventhub:has(.a13-assignments) .auth-nav {
    min-width: 0;
    flex-shrink: 1;
    overflow-x: auto;
  }
}
@media (max-width: 767px) {
  .a13-assignments .a13-card { flex-direction: column; padding: 20px; }
  .a13-assignments .a13-image { width: 100%; height: 160px; }
  .a13-assignments .a13-card-content { width: 100%; }
  .a13-assignments .a13-meta { grid-template-columns: 1fr; }
}
@media (max-width: 479px) {
  .a13-assignments .a13-content { padding: 24px 16px; }
  .a13-assignments h1 { font-size: 28px; line-height: 36px; }
  .a13-assignments .a13-state { padding: 32px 20px; }
  .a13-assignments .a13-pager { gap: 12px; }
  .a13-assignments .a13-pager .a13-button { padding: 9px 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .a13-assignments *, .a13-assignments *::before, .a13-assignments *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;
