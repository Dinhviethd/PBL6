import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import { Empty, Loading, Notice, PageHead, Pager, Status } from "@/components/ticketing/shared";
import { useLoad, when } from "@/features/ticketing/data";
import type { Event } from "@/features/ticketing/types";

export function Organizer() {
  const [page, setPage] = useState(0),
    r = useLoad<Event[]>(`/organizer/events?page=${page}`);
  return (
    <>
      <PageHead
        eyebrow="KHÔNG GIAN ORGANIZER"
        title="Sự kiện của bạn"
        actions={
          <Link className="btn primary" to="/organizer/new">
            <Plus size={17} />
            Tạo sự kiện
          </Link>
        }
      >
        Từ một ý tưởng đến những trải nghiệm đáng nhớ.
      </PageHead>
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.length ? (
        <div className="management-list">
          {r.data.map((e) => (
            <div className="panel management-row" key={e.id}>
              <div className="event-icon">
                {new Date(e.starts_at).getDate()}
                <small>THÁNG {new Date(e.starts_at).getMonth() + 1}</small>
              </div>
              <div className="grow">
                <Status value={e.status} />
                <h3>{e.title}</h3>
                <p>
                  {e.venue_name} · {when(e.starts_at)}
                </p>
              </div>
              <Link className="btn ghost" to={`/organizer/events/${e.id}`}>
                Chỉnh sửa
              </Link>
              <Link className="btn dark" to={`/organizer/events/${e.id}/stats`}>
                Quản lý <ArrowUpRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Bắt đầu bằng việc tạo sự kiện đầu tiên.</Empty>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
