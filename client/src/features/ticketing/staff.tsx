import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";
import { ActionForm } from "./customer";
import { useLoad, message, when } from "./data";
import { Empty, Field, Loading, Notice, PageHead, Pager } from "./shared";
import { Scanner } from "./scanner";

type Assignment = {
  id: string;
  event_id: string;
  status: string;
  expires_at: string;
  staff_name: string;
  staff_email: string;
  title: string;
  venue_name: string;
  starts_at: string;
  ends_at: string;
  checkin_opens_at: string;
  checkin_closes_at: string;
  event_status: string;
};
const status = (s: Assignment) =>
  s.status === "PENDING" && new Date(s.expires_at) <= new Date()
    ? "EXPIRED"
    : s.status;
const labels: Record<string, string> = {
  PENDING: "Chờ chấp nhận",
  ACTIVE: "Đã nhận việc",
  DECLINED: "Đã từ chối",
  REVOKED: "Đã thu hồi",
  EXPIRED: "Lời mời hết hạn",
};

export function StaffManagement({ eventId }: { eventId: string }) {
  const [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    r = useLoad<Assignment[]>(
      `/organizer/events/${eventId}/staff?page=${page}`,
    );
  async function revoke(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/organizer/events/${eventId}/staff/${id}`);
      r.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel">
        <h2>Mời nhân viên check-in</h2>
        <p className="muted">
          Nhập email tài khoản EventHub đã đăng ký. Lời mời xuất hiện tại mục
          “Nhân viên check-in” của người nhận và có hiệu lực 7 ngày.
        </p>
        <ActionForm
          label="Gửi lời mời"
          onSubmit={async (d) => {
            await api.post(`/organizer/events/${eventId}/staff`, {
              email: d.email,
            });
            setPage(0);
            r.reload();
          }}
        >
          <Field label="Email nhân viên" name="email" type="email" />
        </ActionForm>
      </section>
      <Notice error={error || r.error} />
      {r.loading ? (
        <Loading />
      ) : !r.data?.length ? (
        <Empty>Chưa có nhân viên được mời.</Empty>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.staff_name}
                    <small>{s.staff_email}</small>
                  </td>
                  <td>
                    {labels[status(s)]}
                    {status(s) === "PENDING" && (
                      <small>Hết hạn: {when(s.expires_at)}</small>
                    )}
                  </td>
                  <td>
                    {["PENDING", "ACTIVE"].includes(s.status) && (
                      <button
                        className="btn small"
                        disabled={busy}
                        onClick={() => void revoke(s.id)}
                      >
                        Thu hồi quyền / lời mời
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}

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

export function StaffCheckin() {
  const { id } = useParams(),
    r = useLoad<Assignment>(`/checkin/events/${id}`);
  return (
    <>
      <Link className="back" to="/checkin">
        ← Sự kiện được phân công
      </Link>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <Notice error={r.error} />
      ) : (
        r.data && (
          <>
            <PageHead eyebrow="CHECK-IN SỰ KIỆN" title={r.data.title} />
            <p>
              {r.data.venue_name} · Check-in: {when(r.data.checkin_opens_at)} –{" "}
              {when(r.data.checkin_closes_at)}
            </p>
            <Scanner key={id} eventId={id!} />
          </>
        )
      )}
    </>
  );
}

type Checkin = {
  ticket_id: string;
  ticket_code: string;
  ticket_type_name_snapshot: string;
  checked_in_by: string;
  checked_in_by_name: string;
  checked_in_at: string;
  method: string;
};
export function CheckinHistory({ eventId }: { eventId: string }) {
  const [page, setPage] = useState(0),
    r = useLoad<Checkin[]>(
      `/organizer/events/${eventId}/checkins?page=${page}`,
    );
  return (
    <>
      <button className="btn small" onClick={r.reload} disabled={r.loading}>
        Làm mới nhật ký
      </button>
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : !r.data?.length ? (
        <Empty>Chưa có lượt check-in.</Empty>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã vé</th>
                <th>Loại vé</th>
                <th>Người check-in</th>
                <th>Thời gian</th>
                <th>Cách quét</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((c) => (
                <tr key={c.ticket_id}>
                  <td>{c.ticket_code}</td>
                  <td>{c.ticket_type_name_snapshot}</td>
                  <td>
                    {c.checked_in_by_name}
                    <small>{c.checked_in_by}</small>
                  </td>
                  <td>{when(c.checked_in_at)}</td>
                  <td>{c.method === "QR" ? "QR" : "Nhập mã"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
