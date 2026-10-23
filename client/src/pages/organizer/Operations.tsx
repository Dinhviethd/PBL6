import { useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { Scanner } from "@/components/ticketing/scanner";
import { StaffManagement } from "@/components/ticketing/staff-management";
import { CheckinHistory } from "@/components/ticketing/checkin-history";
import { StatCards } from "@/components/ticketing/stat-cards";
import { Loading, Notice, PageHead, Pager, Status } from "@/components/ticketing/shared";
import { useLoad, money, when } from "@/features/ticketing/data";
import type { Event, Order, Stats, Ticket } from "@/features/ticketing/types";

export function Operations() {
  const { id, tab = "stats" } = useParams(),
    event = useLoad<Event>(`/organizer/events/${id}`);
  return (
    <>
      <Link className="back" to="/organizer">
        ← Sự kiện của bạn
      </Link>
      <PageHead
        eyebrow="VẬN HÀNH SỰ KIỆN"
        title={event.data?.title ?? "Quản lý sự kiện"}
      />
      <nav className="tabs">
        {[
          ["stats", "Tổng quan"],
          ["orders", "Đơn hàng"],
          ["attendees", "Người tham dự"],
          ["checkin", "Quét QR"],
          ["staff", "Nhân viên"],
          ["checkins", "Nhật ký check-in"],
        ].map(([key, label]) => (
          <NavLink key={key} to={`/organizer/events/${id}/${key}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Notice error={event.error} />
      {tab === "checkin" ? (
        <Scanner key={id} eventId={id!} />
      ) : tab === "staff" ? (
        <StaffManagement key={id} eventId={id!} />
      ) : tab === "checkins" ? (
        <CheckinHistory key={id} eventId={id!} />
      ) : (
        <OperationData key={tab} eventId={id!} tab={tab} />
      )}
    </>
  );
}
function OperationData({ eventId, tab }: { eventId: string; tab: string }) {
  const [page, setPage] = useState(0),
    [q, setQ] = useState(""),
    r = useLoad<Stats | Order[] | Ticket[]>(
      `/organizer/events/${eventId}/${tab}?page=${page}&q=${encodeURIComponent(q)}`,
    );
  if (r.loading && !r.data) return <Loading />;
  return (
    <>
      <Notice error={r.error} />
      {tab === "stats" ? (
        r.data && <StatCards data={r.data as Stats} />
      ) : (
        <>
          <label className="field search-inline">
            <span>Tìm kiếm</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Mã vé, mã đơn hoặc tên"
            />
          </label>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tab === "orders" ? "Đơn hàng" : "Vé"}</th>
                  <th>Người mua</th>
                  <th>{tab === "orders" ? "Tổng tiền" : "Loại vé"}</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {((r.data as (Order & Ticket)[]) ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      {tab === "orders" ? (
                        <Link to={`/checkout/${row.id}`}>{row.order_code}</Link>
                      ) : (
                        row.ticket_code
                      )}
                    </td>
                    <td>{row.buyer_name_snapshot}</td>
                    <td>
                      {tab === "orders"
                        ? money(row.total_amount)
                        : row.ticket_type_name_snapshot}
                    </td>
                    <td>
                      <Status value={row.status} />
                      {row.checked_in_at && (
                        <small>{when(row.checked_in_at)}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            setPage={setPage}
            hasNext={Array.isArray(r.data) && r.data.length === 50}
          />
        </>
      )}
    </>
  );
}
