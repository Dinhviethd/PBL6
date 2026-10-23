import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import api from "@/lib/api";
import { Empty, Loading, Notice, PageHead, Pager } from "@/components/ticketing/shared";
import { message, useLoad, when } from "@/features/ticketing/data";
import { notificationLabels, type InboxNotification, type NotificationInbox } from "@/features/ticketing/notifications-data";

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
