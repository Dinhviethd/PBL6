import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { message, useLoad, when } from "@/features/ticketing/data";
import { Notice, Pager } from "./shared";
import { waitLabels, type WaitEntry } from "@/features/ticketing/wait-queue-data";

export function JoinWaitQueue({
  eventId,
  typeId,
  name,
}: {
  eventId: string;
  typeId: string;
  name: string;
}) {
  const user = useAuth((s) => s.user),
    verified = useAuth((s) => s.isAuthVerified),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function join() {
    if (!verified) return;
    if (!user) {
      navigate("/auth/login", { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/events/${eventId}/wait-queue`, { ticketTypeId: typeId });
      navigate("/orders#wait-queue");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="btn"
        disabled={busy || !verified}
        onClick={() => void join()}
      >
        {busy ? "Đang đăng ký…" : `Chờ vé ${name}`}
      </button>
      <small className="muted">
        Chờ 1 vé; thông báo trong ứng dụng khi đến lượt.
      </small>
      <Notice error={error} />
    </div>
  );
}

export function MyWaitQueue() {
  const [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = useLoad<WaitEntry[]>(`/me/wait-queue?page=${page}`);
  const reload = r.reload;
  useEffect(() => {
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);
  async function leave(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/me/wait-queue/${id}`);
      reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" id="wait-queue" aria-label="Danh sách chờ vé">
      <h2>Danh sách chờ vé</h2>
      <p>
        Mỗi lượt chờ 1 vé. Khi đến lượt, vé được giữ tối đa 15 phút. Kiểm tra
        thông báo để mở đơn; không bảo đảm sẽ có vé.
      </p>
      <Notice error={error || r.error} />
      <button className="btn" onClick={reload}>
        Cập nhật hàng chờ
      </button>
      {!r.loading && !r.error && !r.data?.length && (
        <p>Bạn chưa đăng ký chờ vé.</p>
      )}
      {r.data?.map((w) => (
        <article className="panel" key={w.id}>
          <h3>
            {w.event_title} — {w.type_name}
          </h3>
          <p>
            {waitLabels[w.status]}
            {w.status === "WAITING" ? ` · Vị trí ${w.position}` : ""}
          </p>
          {w.status === "OFFERED" && w.expires_at && (
            <p>Bắt đầu thanh toán trước {when(w.expires_at)}.</p>
          )}
          {w.order_id && (
            <Link className="btn primary" to={`/checkout/${w.order_id}`}>
              Xem đơn giữ vé
            </Link>
          )}
          {["WAITING", "OFFERED"].includes(w.status) && (
            <button
              className="btn"
              disabled={busy}
              onClick={() => void leave(w.id)}
            >
              {w.status === "OFFERED" ? "Từ chối vé" : "Rời hàng chờ"}
            </button>
          )}
        </article>
      ))}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </section>
  );
}
