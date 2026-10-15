import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import api from "../../lib/api";
import { get, message, useLoad, when } from "./data";
import { Empty, Loading, Notice, PageHead, Pager } from "./shared";
import {
  notificationLabels,
  type InboxNotification,
  type NotificationInbox,
} from "./notifications-data";

export function NotificationLink() {
  const [count, setCount] = useState<number | null>(null);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void get<{ unreadCount: number }>("/me/notifications/count")
        .then((r) => {
          if (active) setCount(r.unreadCount);
        })
        .catch(() => {
          if (active) setCount(null);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("notifications:changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("notifications:changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [location.pathname]);
  return (
    <Link
      to="/notifications"
      className="notification-bell"
      aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ""}`}
      title="Thông báo"
    >
      <Bell size={21} />
      {!!count && (
        <span className="notification-count">{count > 99 ? "99+" : count}</span>
      )}
    </Link>
  );
}

export function Notifications() {
  const [page, setPage] = useState(0),
    [unread, setUnread] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = useLoad<NotificationInbox>(
    `/me/notifications?page=${page}&unread=${unread}`,
  );
  const reload = r.reload;
  const navigate = useNavigate();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden") reload();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);
  async function read(n?: InboxNotification, open = false) {
    setBusy(true);
    setError("");
    try {
      if (!n?.read_at)
        await api.post(
          n ? `/me/notifications/${n.id}/read` : "/me/notifications/read-all",
        );
      window.dispatchEvent(new Event("notifications:changed"));
      if (open && n)
        navigate(
          n.target === "ORDER"
            ? `/checkout/${n.target_id}`
            : n.target === "STAFF"
              ? "/checkin"
              : "/tickets",
        );
      else {
        if (!n) setPage(0);
        r.reload();
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="notifications-page">
      <PageHead
        eyebrow="LUÔN CẬP NHẬT"
        title="Thông báo của bạn"
        actions={
          <button
            className="btn ghost"
            disabled={busy || !r.data?.unreadCount}
            onClick={() => void read()}
          >
            <CheckCheck size={18} /> Đánh dấu tất cả đã đọc
          </button>
        }
      >
        Vé, lời mời và lịch hẹn cho những trải nghiệm sắp tới.
      </PageHead>
      <div className="notification-toolbar">
        <div className="notification-filters" aria-label="Lọc thông báo">
          <button
            className={`btn ${!unread ? "primary" : "ghost"}`}
            aria-pressed={!unread}
            onClick={() => {
              setUnread(false);
              setPage(0);
            }}
          >
            Tất cả
          </button>
          <button
            className={`btn ${unread ? "primary" : "ghost"}`}
            aria-pressed={unread}
            onClick={() => {
              setUnread(true);
              setPage(0);
            }}
          >
            Chưa đọc{r.data ? ` (${r.data.unreadCount})` : ""}
          </button>
        </div>
        <button className="text-btn" disabled={r.loading} onClick={r.reload}>
          Làm mới
        </button>
      </div>
      <p className="muted">
        Nhắc lịch xuất hiện trong 24 giờ trước khi sự kiện bắt đầu.
      </p>
      <Notice error={error || r.error} />
      {r.loading ? (
        <Loading />
      ) : r.error ? null : !r.data?.items.length ? (
        <Empty>
          {unread
            ? "Bạn đã đọc hết thông báo trên trang này."
            : "Chưa có thông báo. Những cập nhật mới sẽ xuất hiện tại đây."}
        </Empty>
      ) : (
        <div className="notification-list">
          {r.data.items.map((n) => (
            <article
              key={n.id}
              className={`notification-card ${!n.read_at ? "is-unread" : ""}`}
            >
              <div className="notification-icon">
                <Bell size={20} />
              </div>
              <div className="notification-content">
                <div className="notification-meta">
                  <span>{notificationLabels[n.kind]}</span>
                  {!n.read_at && <strong>Chưa đọc</strong>}
                  <time dateTime={n.created_at}>{when(n.created_at)}</time>
                </div>
                <h2>{n.title}</h2>
                <p>{n.message}</p>
                <div className="notification-actions">
                  <button
                    className="text-btn"
                    disabled={busy}
                    onClick={() => void read(n, true)}
                  >
                    {n.target === "ORDER"
                      ? "Xem đơn hàng"
                      : n.target === "STAFF"
                        ? "Xem phân công"
                        : "Xem vé của tôi"}{" "}
                    →
                  </button>
                  {!n.read_at && (
                    <button
                      className="text-btn"
                      disabled={busy}
                      onClick={() => void read(n)}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.hasNext ?? false} />
    </div>
  );
}
