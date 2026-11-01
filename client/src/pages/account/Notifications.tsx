import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, IdCard, Bell, BellOff, BellRing, CalendarSync,
  Check, CheckCheck, CircleCheck, Clock3, CloudOff, LoaderCircle, RefreshCw, Ticket,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import {
  notificationLabels, type InboxNotification, type NotificationInbox,
} from "@/features/ticketing/notifications-data";

const appearances = {
  WAIT_QUEUE_OFFER: { Icon: BellRing, tone: "cyan" },
  ORDER_PAID: { Icon: Ticket, tone: "purple" },
  STAFF_INVITED: { Icon: IdCard, tone: "pink" },
  EVENT_UPDATED: { Icon: CalendarSync, tone: "muted" },
  EVENT_REMINDER: { Icon: Clock3, tone: "muted" },
};

function destination(n: InboxNotification) {
  if (n.target === "ORDER" && n.target_id)
    return { label: "Xem đơn hàng", path: `/payment-status/${n.target_id}` };
  if (n.target === "STAFF") return { label: "Xem phân công", path: "/checkin" };
  if (n.target === "TICKETS") return { label: "Xem vé của tôi", path: "/tickets" };
  return null;
}

function notificationTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

// Discard responses from an earlier filter, page or authenticated session.
function useInbox(page: number, unread: boolean, onPage: (page: number) => void) {
  const revision = useAuth((s) => s.revision);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string; data?: NotificationInbox; error?: string; loading: boolean;
  }>({ key: "", loading: true });
  const key = `${revision}:${page}:${unread}`;
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setResult((old) => ({ key, data: old.key === key ? old.data : undefined, loading: true }));
    api.get<{ data: NotificationInbox }>(`/me/notifications?page=${page}&unread=${unread}`, {
      signal: controller.signal,
    }).then(({ data: { data } }) => {
      if (!active) return;
      if (!data.pagination || data.pagination.pageSize !== 10)
        throw new Error("Không thể tải thông báo. Vui lòng thử lại sau.");
      const lastPage = Math.max(0, data.pagination.totalPages - 1);
      if (page > lastPage) {
        onPage(lastPage);
        return;
      }
      setResult({ key, data, loading: false });
    }).catch((error: unknown) => {
      if (active) setResult({ key, error: message(error), loading: false });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, page, unread, version, onPage]);
  return { ...(result.key === key ? result : { data: undefined, error: undefined, loading: true }), reload };
}

export function Notifications() {
  const [page, setPage] = useState(0);
  const [unread, setUnread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const inbox = useInbox(page, unread, setPage);
  const { data, loading, reload } = inbox;
  const navigate = useNavigate();

  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      if (document.visibilityState !== "hidden" && !busyRef.current) reload();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);

  function filter(value: boolean) {
    setUnread(value);
    setPage(0);
    setError("");
    setFeedback("");
  }

  async function read(n?: InboxNotification, open = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      if (!n || !n.read_at)
        await api.post(n ? `/me/notifications/${n.id}/read` : "/me/notifications/read-all");
      if (!mounted.current) return;
      window.dispatchEvent(new Event("notifications:changed"));
      const target = n ? destination(n) : null;
      if (open && target) navigate(target.path);
      else {
        setFeedback(n ? "Đã đánh dấu thông báo đã đọc." : "Đã đánh dấu tất cả thông báo đã đọc.");
        if (!n) setPage(0);
        reload();
      }
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const blockActions = busy || loading;
  return (
    <section className="a12-notifications" aria-labelledby="a12-heading">
      <style>{styles}</style>
      <div className="a12-content">
        <header className="a12-heading">
          <div>
            <span className="a12-eyebrow">LUÔN CẬP NHẬT</span>
            <h1 id="a12-heading">Thông báo của bạn</h1>
            <p>Vé, lời mời và lịch hẹn cho những trải nghiệm sắp tới.</p>
          </div>
          <button className="a12-button a12-mark-all" disabled={blockActions || !data?.unreadCount}
            onClick={() => void read()}>
            <CheckCheck size={18} aria-hidden="true" /> Đánh dấu tất cả đã đọc
          </button>
        </header>
        <div className="a12-tools">
          <div className="a12-toolbar">
            <div className="a12-filters" role="group" aria-label="Lọc thông báo">
              <button className="a12-button" aria-pressed={!unread} disabled={busy}
                onClick={() => filter(false)}>Tất cả</button>
              <button className="a12-button" aria-pressed={unread} disabled={busy}
                aria-label={data ? `Chưa đọc (${data.unreadCount})` : "Chưa đọc"}
                onClick={() => filter(true)}>
                Chưa đọc {data && <span className="a12-count">{data.unreadCount}</span>}
              </button>
            </div>
            <button className="a12-button a12-ghost a12-refresh" disabled={blockActions}
              onClick={reload} aria-label="Làm mới">
              <RefreshCw size={18} className={loading ? "a12-spin" : ""} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
          </div>
          <p className="a12-hint"><Clock3 size={16} aria-hidden="true" />
            Nhắc lịch xuất hiện trong 24 giờ trước khi sự kiện bắt đầu.</p>
        </div>
        {error && <p className="a12-mutation-error" role="alert">{error}</p>}
        <span className="a12-sr" role="status" aria-live="polite">{feedback}</span>
        <div aria-busy={loading}>
          {loading && !data ? (
            <div className="a12-state" role="status">
              <LoaderCircle size={48} className="a12-spin" aria-hidden="true" />
              <h2>Đang tải dữ liệu thông báo mới nhất…</h2>
              <p>Hệ thống EventHub đang đồng bộ các thông báo vé và ca trực từ máy chủ.</p>
            </div>
          ) : inbox.error ? (
            <div className="a12-state a12-state-error" role="alert">
              <span className="a12-state-icon"><CloudOff size={30} aria-hidden="true" /></span>
              <h2>Không thể đồng bộ thông báo</h2>
              <p>{inbox.error}</p>
              <button className="a12-button" onClick={reload}><RefreshCw size={16} aria-hidden="true" /> Thử lại</button>
            </div>
          ) : !data?.items.length ? (
            <div className="a12-state" role="status">
              <span className={`a12-state-icon ${unread ? "a12-cyan" : ""}`}>
                {unread ? <CircleCheck size={30} aria-hidden="true" /> : <BellOff size={30} aria-hidden="true" />}
              </span>
              <h2>{unread ? "Bạn đã đọc hết thông báo trên trang này." : "Chưa có thông báo"}</h2>
              <p>{unread ? "Không còn lời nhắc hoặc thay đổi chưa xác nhận nào trong danh sách."
                : "Những cập nhật mới về vé, hàng đợi và sự kiện bạn quan tâm sẽ xuất hiện tại đây."}</p>
              {unread ? <button className="a12-button" onClick={() => filter(false)}>Xem tất cả thông báo</button>
                : <Link className="a12-button a12-brand" to="/explore">Khám phá sự kiện ngay</Link>}
            </div>
          ) : (
            <div className="a12-list">
              {data.items.map((n) => {
                const { Icon, tone } = appearances[n.kind] ?? { Icon: Bell, tone: "muted" };
                const target = destination(n);
                return (
                  <article key={n.id} className={`a12-card a12-tone-${tone}${n.read_at ? " a12-read" : ""}`}>
                    <span className="a12-card-icon"><Icon size={22} aria-hidden="true" /></span>
                    <div className="a12-card-content">
                      <div className="a12-meta">
                        <div className="a12-tags">
                          <span className="a12-kind">{notificationLabels[n.kind] ?? "Thông báo"}</span>
                          {!n.read_at && <span className="a12-unread"><i aria-hidden="true" /> Chưa đọc</span>}
                        </div>
                        <time dateTime={n.created_at}>{notificationTime(n.created_at)}</time>
                      </div>
                      <h2>{n.title}</h2>
                      <p>{n.message}</p>
                      <div className="a12-actions">
                        {target && <button className={`a12-button a12-open${n.target === "STAFF" ? " a12-brand" : ""}`}
                          disabled={blockActions} onClick={() => void read(n, true)}>{target.label}</button>}
                        {!n.read_at && <button className="a12-button a12-ghost" disabled={blockActions}
                          onClick={() => void read(n)}><Check size={17} aria-hidden="true" /> Đánh dấu đã đọc</button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        {data && data.pagination.totalPages > 0 && !inbox.error && (
          <nav className="a12-pager" aria-label="Phân trang thông báo">
            <button className="a12-button" disabled={blockActions || page === 0} onClick={() => setPage(page - 1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Trước
            </button>
            <span aria-live="polite">Trang {page + 1} / {data.pagination.totalPages}</span>
            <button className="a12-button" disabled={blockActions || !data.hasNext} onClick={() => setPage(page + 1)}>
              Sau <ArrowRight size={16} aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}

const styles = `
.eventhub:has(.a12-notifications) {
  background: #0f1222;
}
.site-main:has(.a12-notifications) {
  max-width: none;
  padding: 0;
}
.a12-notifications {
  color: #e0e1f7;
  background: radial-gradient(ellipse at 35% 0, #7c3aed20, transparent 52%),
    radial-gradient(ellipse at 100% 60%, #00cbe612, transparent 50%);
  font-family: 'Be Vietnam Pro', sans-serif;
  min-height: 75vh;
}
.a12-notifications .a12-content {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.a12-notifications .a12-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.a12-notifications .a12-eyebrow {
  color: #d2bbff;
  font: 600 11px/14px 'Space Grotesk', sans-serif;
  letter-spacing: .1em;
}
.a12-notifications h1 {
  margin: 4px 0;
  font: 700 40px/48px 'Be Vietnam Pro', sans-serif;
  letter-spacing: -.01em;
}
.a12-notifications p {
  margin: 0;
  color: #ccc3d8;
  font-size: 16px;
  line-height: 24px;
}
.a12-notifications .a12-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 0;
  border-radius: 8px;
  background: #1c1f2f;
  color: #e0e1f7;
  cursor: pointer;
  font: 600 12px/16px 'Space Grotesk', sans-serif;
  letter-spacing: .02em;
  transition: background .2s, color .2s;
}
.a12-notifications .a12-button:hover:not(:disabled) {
  background: #262939;
}
.a12-notifications .a12-button:focus-visible,
.a12-notifications a:focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 4px;
}
.a12-notifications .a12-button:disabled {
  opacity: .4;
  cursor: not-allowed;
}
.a12-notifications .a12-mark-all {
  flex-shrink: 0;
  padding: 10px 16px;
}
.a12-notifications .a12-mark-all svg,
.a12-notifications .a12-hint svg {
  color: #d2bbff;
  flex-shrink: 0;
}
.a12-notifications .a12-toolbar,
.a12-notifications .a12-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}
.a12-notifications .a12-toolbar {
  justify-content: space-between;
  gap: 16px;
}
.a12-notifications .a12-button[aria-pressed='true'],
.a12-notifications .a12-brand {
  background: #7c3aed;
  color: #ede0ff;
}
.a12-notifications .a12-brand:hover:not(:disabled) {
  background: #6826d7;
}
.a12-notifications .a12-count {
  padding: 1px 6px;
  border-radius: 999px;
  background: #d2bbff;
  color: #3f008e;
}
.a12-notifications .a12-ghost {
  background: transparent;
  color: #ccc3d8;
}
.a12-notifications .a12-refresh:hover:not(:disabled) {
  color: #5de6ff;
}
.a12-notifications .a12-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 20px;
}
.a12-notifications .a12-list {
  display: grid;
  gap: 12px;
}
.a12-notifications .a12-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  background: #1c1f2f;
  box-shadow: 0 4px 6px #00000015;
  transition: background .2s;
}
.a12-notifications .a12-card:hover {
  background: #262939;
}
.a12-notifications .a12-card-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: #d2bbff;
  background: #7c3aed33;
}
.a12-notifications .a12-card-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-wrap: anywhere;
}
.a12-notifications .a12-meta,
.a12-notifications .a12-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.a12-notifications .a12-meta {
  justify-content: space-between;
}
.a12-notifications .a12-kind,
.a12-notifications .a12-unread {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #d2bbff33;
  color: #d2bbff;
  font: 600 11px/14px 'Space Grotesk', sans-serif;
}
.a12-notifications .a12-kind {
  text-transform: uppercase;
  letter-spacing: .05em;
}
.a12-notifications .a12-unread {
  background: #d2bbff;
  color: #3f008e;
  padding: 2px 8px;
}
.a12-notifications .a12-unread i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
}
.a12-notifications time {
  color: #958da1;
  font: 500 11px/14px 'Space Grotesk', sans-serif;
}
.a12-notifications .a12-card h2,
.a12-notifications .a12-state h2 {
  margin: 0;
  font: 600 20px/28px 'Be Vietnam Pro', sans-serif;
  letter-spacing: -.01em;
}
.a12-notifications .a12-card p {
  line-height: 26px;
  white-space: pre-line;
}
.a12-notifications .a12-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 8px;
}
.a12-notifications .a12-open {
  background: #5de6ff;
  color: #00515d;
}
.a12-notifications .a12-open:hover:not(:disabled) {
  background: #a2eeff;
}
.a12-notifications .a12-open.a12-brand {
  background: #7c3aed;
  color: #ede0ff;
}
.a12-notifications .a12-tone-cyan .a12-kind {
  background: #5de6ff26;
  color: #5de6ff;
}
.a12-notifications .a12-tone-cyan .a12-card-icon {
  background: #7c3aed4d;
  color: #5de6ff;
}
.a12-notifications .a12-tone-pink .a12-card-icon,
.a12-notifications .a12-tone-pink .a12-kind {
  background: #ae397b4d;
  color: #ffafd3;
}
.a12-notifications .a12-tone-muted .a12-card-icon,
.a12-notifications .a12-read .a12-card-icon {
  background: #262939;
  color: #958da1;
}
.a12-notifications .a12-tone-muted .a12-kind,
.a12-notifications .a12-read .a12-kind {
  background: #313445;
  color: #ccc3d8;
}
.a12-notifications .a12-read {
  background: #181b2a;
  opacity: .9;
  box-shadow: none;
}
.a12-notifications .a12-read:hover {
  background: #1c1f2f;
  opacity: 1;
}
.a12-notifications .a12-read .a12-open {
  background: #262939;
  color: #e0e1f7;
}
.a12-notifications .a12-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 360px;
  padding: 48px;
  border-radius: 12px;
  background: #1c1f2f;
  text-align: center;
}
.a12-notifications .a12-state > svg {
  color: #d2bbff;
}
.a12-notifications .a12-state p {
  max-width: 384px;
  font-size: 14px;
  line-height: 20px;
}
.a12-notifications .a12-state-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #262939;
  color: #958da1;
}
.a12-notifications .a12-cyan {
  color: #5de6ff;
}
.a12-notifications .a12-state-error {
  background: #93000a33;
}
.a12-notifications .a12-state-error .a12-state-icon {
  background: #93000a66;
  color: #ffb4ab;
}
.a12-notifications .a12-state-error .a12-button {
  background: #ffb4ab;
  color: #690005;
}
.a12-notifications .a12-mutation-error {
  color: #ffb4ab;
}
.a12-notifications .a12-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 0 16px;
}
.a12-notifications .a12-pager > span {
  padding: 6px 12px;
  border-radius: 8px;
  background: #0a0d1c;
  font: 500 11px/16px 'Space Grotesk', sans-serif;
  white-space: nowrap;
}
.a12-notifications .a12-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.a12-notifications .a12-spin {
  animation: a12-spin 1s linear infinite;
}
@keyframes a12-spin {
  to { transform: rotate(360deg); }
}
@media (min-width: 901px) and (max-width: 1100px) {
  .eventhub:has(.a12-notifications) .auth-nav {
    min-width: 0;
    flex-shrink: 1;
    overflow-x: auto;
  }
}
@media (max-width: 767px) {
  .a12-notifications .a12-content { padding: 32px 24px; }
  .a12-notifications .a12-heading { flex-direction: column; align-items: flex-start; }
  .a12-notifications h1 { font-size: 28px; line-height: 36px; }
}
@media (max-width: 639px) {
  .a12-notifications .a12-content { padding: 24px 16px; }
  .a12-notifications .a12-card { flex-direction: column; }
  .a12-notifications .a12-meta { align-items: flex-start; }
  .a12-notifications .a12-state { padding: 32px 20px; }
  .a12-notifications .a12-refresh span { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .a12-notifications *, .a12-notifications *::before, .a12-notifications *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;
