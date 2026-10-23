import { Link, useParams } from "react-router-dom";
import { BookingSteps } from "@/components/ticketing/event-visuals";
import { Loading, Notice, PageHead, Status } from "@/components/ticketing/shared";
import { useLoad } from "@/features/ticketing/data";
import type { TicketDetail } from "@/features/ticketing/types";

export function TicketPage() {
  const { id } = useParams(),
    r = useLoad<TicketDetail>(`/me/tickets/${id}`);
  if (r.loading) return <Loading />;
  if (!r.data) return <Notice error={r.error} />;
  const t = r.data;
  return (
    <>
      <BookingSteps step={3} />
      <PageHead eyebrow="VÉ ĐIỆN TỬ" title={t.eventTitle} />
      <div className="panel qr-card">
        <Status value={t.status} />
        <h2>{t.typeName}</h2>
        <div className="qr-image">
          <img src={t.qrImage} width={320} height={320} alt="Mã QR của vé" />
        </div>
        <strong className="mono">{t.code}</strong>
        <p>Xuất trình mã này tại cửa vào. Mỗi vé chỉ check-in một lần.</p>
        <Link to="/tickets">← Ví vé của bạn</Link>
      </div>
    </>
  );
}
