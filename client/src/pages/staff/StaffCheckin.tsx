import { Link, useParams } from "react-router-dom";
import { Scanner } from "@/components/ticketing/scanner";
import { Loading, Notice, PageHead } from "@/components/ticketing/shared";
import { useLoad, when } from "@/features/ticketing/data";
import type { Assignment } from "@/features/ticketing/staff-data";

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
