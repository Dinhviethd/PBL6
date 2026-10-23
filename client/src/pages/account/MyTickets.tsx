import { useState } from "react";
import { Link } from "react-router-dom";
import { Ticket as TicketIcon } from "lucide-react";
import { Empty, Loading, Notice, PageHead, Pager, Status } from "@/components/ticketing/shared";
import { useLoad } from "@/features/ticketing/data";
import type { Ticket } from "@/features/ticketing/types";

export function MyTickets() {
  const [page, setPage] = useState(0),
    r = useLoad<Ticket[]>(`/me/tickets?page=${page}`);
  return (
    <>
      <PageHead eyebrow="SẴN SÀNG CHO TRẢI NGHIỆM MỚI" title="Vé của tôi" />
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.length ? (
        <div className="event-grid">
          {r.data.map((t) => (
            <Link
              className="panel wallet-card"
              to={`/tickets/${t.id}`}
              key={t.id}
            >
              <TicketIcon size={30} />
              <Status value={t.status} />
              <h3>{t.event_title_snapshot}</h3>
              <p>{t.ticket_type_name_snapshot}</p>
              <span className="mono">{t.ticket_code}</span>
              <strong>Xem mã QR →</strong>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>Vé đã thanh toán sẽ xuất hiện tại đây.</Empty>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
