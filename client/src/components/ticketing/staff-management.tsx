import { useState } from "react";
import api from "@/lib/api";
import { ActionForm } from "./action-form";
import { useLoad, message, when } from "@/features/ticketing/data";
import { Empty, Field, Loading, Notice, Pager } from "./shared";
import { type Assignment, status, labels } from "@/features/ticketing/staff-data";

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
