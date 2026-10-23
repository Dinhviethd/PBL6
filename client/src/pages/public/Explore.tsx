import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { EventCard, FeaturedEvent } from "@/components/ticketing/event-visuals";
import { useAuth } from "@/features/auth/stores/authStore";
import { Empty, Field, Loading, Notice, PageHead, Pager } from "@/components/ticketing/shared";
import { useLoad, values } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";

export function Explore() {
  const user = useAuth((state) => state.user);
  const [filter, setFilter] = useState(""),
    [page, setPage] = useState(0),
    { data, error, loading } = useLoad<{ items: Event[]; total: number }>(
      `/events?page=${page}&${filter}`,
    ),
    categories = useLoad<Category[]>("/categories");
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = values(e),
      params = new URLSearchParams();
    for (const [k, v] of Object.entries(d))
      if (v)
        params.set(
          k,
          k === "from" || k === "to" ? new Date(v).toISOString() : v,
        );
    setPage(0);
    setFilter(params.toString());
  }
  return (
    <>
      <FeaturedEvent event={!loading && !error ? data?.items[0] : undefined} />
      <section id="discover">
        <PageHead eyebrow="LỊCH HẸN CỦA BẠN" title="Đi đâu tiếp theo?">
          {data && !loading && !error
            ? `${data.total} sự kiện đang chờ bạn khám phá.`
            : "Một chiếc vé, một trải nghiệm mới."}
        </PageHead>
        <form className="filters" onSubmit={search}>
          <Field
            label="Tìm sự kiện"
            name="q"
            placeholder="Tên sự kiện, điều bạn quan tâm…"
            required={false}
          />
          <Field
            label="Danh mục"
            name="category"
            required={false}
            options={[
              { value: "", label: "Tất cả danh mục" },
              ...(categories.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
          />
          <Field
            label="Thành phố"
            name="city"
            placeholder="Đà Nẵng"
            required={false}
          />
          <button className="btn primary">Tìm kiếm</button>
          <details>
            <summary>Bộ lọc nâng cao</summary>
            <div className="form-grid">
              <Field label="Từ ngày" name="from" type="date" required={false} />
              <Field label="Đến ngày" name="to" type="date" required={false} />
              <Field
                label="Giá từ (đ)"
                name="minPrice"
                type="number"
                required={false}
              />
              <Field
                label="Giá đến (đ)"
                name="maxPrice"
                type="number"
                required={false}
              />
            </div>
          </details>
        </form>
        <Notice error={error} />
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="event-grid">
            {data.items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty>Chưa có sự kiện phù hợp. Thử thay đổi bộ lọc.</Empty>
        )}
        <Pager
          page={page}
          setPage={setPage}
          hasNext={(page + 1) * 24 < (data?.total ?? 0)}
        />
      </section>
      <section className="organizer-promo">
        <div>
          <span className="eyebrow">DÀNH CHO BAN TỔ CHỨC</span>
          <h2>Đưa sự kiện của bạn đến gần khán giả hơn.</h2>
          <p>Quản lý sự kiện, phát hành vé điện tử và check-in tại một nơi.</p>
        </div>
        <Link
          className="btn ghost"
          to={
            user?.roles.some((role) => ["ORGANIZER", "ADMIN"].includes(role))
              ? "/organizer"
              : "/profile"
          }
        >
          Không gian tổ chức <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
