import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Empty, Loading, Notice, PageHead, Pager } from "@/components/ticketing/shared";
import { useLoad, message, when } from "@/features/ticketing/data";
import { type Assignment, status, labels } from "@/features/ticketing/staff-data";

export function StaffAssignments() {
  const [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    r = useLoad<Assignment[]>(`/me/checkin-assignments?page=${page}`);
  async function respond(id: string, accept: boolean) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/me/checkin-invitations/${id}/respond`, { accept });
      r.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead eyebrow="NHÂN VIÊN CHECK-IN" title="Sự kiện được phân công" />
      <p className="muted">
        Chấp nhận lời mời để quét QR hoặc nhập mã vé cho sự kiện được phân công.
      </p>
      <Notice error={error || r.error} />
      <button className="btn small" disabled={r.loading} onClick={r.reload}>
        Làm mới danh sách
      </button>
      {r.loading ? (
        <Loading />
      ) : !r.data?.length ? (
        <Empty>Bạn chưa có lời mời check-in.</Empty>
      ) : (
        <div className="staff-cards">
          {r.data.map((s) => {
            const available =
              !["CANCELLED", "ARCHIVED"].includes(s.event_status) &&
              new Date(s.ends_at) > new Date();
            return (
              <section className="panel" key={s.id}>
                <h2>{s.title}</h2>
                <p>
                  {s.venue_name} · {when(s.starts_at)}
                </p>
                <p className="muted">
                  Check-in: {when(s.checkin_opens_at)} –{" "}
                  {when(s.checkin_closes_at)}
                </p>
                <p>
                  {labels[status(s)]}
                  {!available && " · Sự kiện đã đóng"}
                </p>
                {status(s) === "PENDING" && available && (
                  <>
                    <p className="muted">
                      Chấp nhận trước {when(s.expires_at)}
                    </p>
                    <div className="staff-actions">
                      <button
                        className="btn primary"
                        disabled={busy}
                        onClick={() => void respond(s.id, true)}
                      >
                        Chấp nhận
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => void respond(s.id, false)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </>
                )}
                {s.status === "ACTIVE" && available && (
                  <Link
                    className="btn primary"
                    to={`/checkin/events/${s.event_id}`}
                  >
                    Mở quét vé
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
