import { useState } from "react";
import { useLoad, when } from "@/features/ticketing/data";
import { Empty, Loading, Notice, Pager } from "./shared";

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
