import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { money, useLoad } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";
import { useAuth } from "@/features/auth/stores/authStore";
import "./explore.css";

const UI_PAGE_SIZE = 6;
const API_PAGE_SIZE = 24;
const filterKeys = [
  "q",
  "category",
  "city",
  "from",
  "to",
  "minPrice",
  "maxPrice",
] as const;
type EventResults = { items: Event[]; total: number };

function localDay(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function dateRange(preset: string) {
  const today = localDay(new Date().toISOString());
  const start = new Date(today + "T00:00:00+07:00");
  const end = new Date(start);
  if (preset === "weekend") {
    const weekday = new Date(today + "T12:00:00Z").getUTCDay();
    start.setUTCDate(
      start.getUTCDate() + (weekday === 0 ? 0 : (6 - weekday + 7) % 7),
    );
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + (weekday === 0 ? 0 : 1));
  } else if (preset === "month") {
    const [year, month] = today.split("-").map(Number);
    end.setTime(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000 - 1);
  }
  return {
    from: localDay(start.toISOString()),
    to: localDay(end.toISOString()),
  };
}

function DiscoveryCard({
  event,
  category,
}: {
  event: Event;
  category?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const href = `/events/${encodeURIComponent(event.slug)}`;
  return (
    <article className="explore-card">
      <Link
        to={href}
        className="explore-poster"
        aria-label={`Xem sự kiện ${event.title}`}
      >
        {event.cover_image_url && !imageFailed ? (
          <img
            src={event.cover_image_url}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="explore-poster-fallback">
            <Sparkles size={36} />
            EventHub
          </span>
        )}
        {category && <span className="explore-badge">{category}</span>}
      </Link>
      <div className="explore-card-body">
        <p className="explore-date">
          <CalendarDays size={14} />
          <time dateTime={event.starts_at}>
            {new Date(event.starts_at).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              dateStyle: "short",
              timeStyle: "short",
            })}
          </time>
        </p>
        <h2>
          <Link to={href} title={event.title}>
            {event.title}
          </Link>
        </h2>
        <p
          className="explore-venue"
          title={`${event.venue_name}, ${event.city_code}`}
        >
          <MapPin size={15} />
          <span>
            {event.venue_name}, {event.city_code}
          </span>
        </p>
        <div className="explore-card-bottom">
          <div>
            <small>Giá từ</small>
            <strong>
              {event.priceFrom == null
                ? "Xem chi tiết"
                : Number(event.priceFrom) === 0
                  ? "Miễn phí"
                  : money(event.priceFrom)}
            </strong>
          </div>
          <Link to={href} aria-label={`Xem vé: ${event.title}`}>
            Xem vé <Ticket size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EventDiscovery() {
  const [params] = useSearchParams();
  useEffect(() => {
    const previous = document.title;
    document.title = "Khám phá sự kiện | EventHub";
    return () => {
      document.title = previous;
    };
  }, []);
  // Remount draft fields and request state on navigation, including Back/Forward.
  return <DiscoveryContent key={params.toString()} />;
}

function DiscoveryContent() {
  const [params, setParams] = useSearchParams();
  const user = useAuth((state) => state.user);
  const rawPage = Number(params.get("page") ?? 0);
  const page =
    Number.isInteger(rawPage) && rawPage >= 0 && rawPage <= 40000 ? rawPage : 0;
  const query = new URLSearchParams();
  for (const key of filterKeys) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  query.set("page", String(Math.floor((page * UI_PAGE_SIZE) / API_PAGE_SIZE)));
  const events = useLoad<EventResults>(`/events?${query}`);
  const categories = useLoad<Category[]>("/categories");
  const [validation, setValidation] = useState("");
  const [datePreset, setDatePreset] = useState(
    params.has("from") || params.has("to") ? "custom" : "all",
  );
  const [dates, setDates] = useState({
    from: localDay(params.get("from")),
    to: localDay(params.get("to")),
  });
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");
  const offset = (page * UI_PAGE_SIZE) % API_PAGE_SIZE;
  const items = events.data?.items.slice(offset, offset + UI_PAGE_SIZE) ?? [];
  const total = events.data?.total ?? 0;
  const pageCount = Math.ceil(total / UI_PAGE_SIZE);
  const canCreate = user?.roles.some(
    (role) => role === "ORGANIZER" || role === "ADMIN",
  );
  const hasFilters = filterKeys.some((key) => params.has(key));

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dates.from && dates.to && dates.from > dates.to) {
      setValidation("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
      return;
    }
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setValidation("Giá tối đa phải bằng hoặc lớn hơn giá tối thiểu.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ["q", "city", "category"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    if (dates.from)
      next.set("from", new Date(dates.from + "T00:00:00+07:00").toISOString());
    if (dates.to)
      next.set("to", new Date(dates.to + "T23:59:59.999+07:00").toISOString());
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    setValidation("");
    setParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage) next.set("page", String(nextPage));
    else next.delete("page");
    setParams(next);
    document
      .getElementById("explore-results")
      ?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="explore-page">
      <div className="explore-container">
        <nav className="explore-breadcrumb" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={13} />
          <span aria-current="page">Khám phá sự kiện</span>
        </nav>
        <div className="explore-intro">
          <div>
            <span className="explore-kicker">
              EventHub • Không gian trải nghiệm
            </span>
            <h1>
              Khám phá <em>Vũ Trụ</em>
              <br />
              <span>Sự Kiện</span>
            </h1>
            <p>
              Tìm kiếm và săn vé những lễ hội âm nhạc, triển lãm nghệ thuật và
              sự kiện bạn yêu thích cùng EventHub.
            </p>
          </div>
          <div className="explore-intro-badge">
            <Zap size={28} />
            <div>
              <strong>Khám phá</strong>
              <small>Trải nghiệm mới</small>
            </div>
          </div>
        </div>
        <form id="explore-filter-form" onSubmit={search}>
          <div className="explore-filter-deck">
            <div className="explore-quick-filters">
              <label className="explore-field">
                <span className="sr-only">Tên sự kiện</span>
                <Search size={18} />
                <input
                  name="q"
                  maxLength={200}
                  defaultValue={params.get("q") ?? ""}
                  placeholder="Tìm tên sự kiện..."
                />
              </label>
              <label className="explore-field">
                <span className="sr-only">Thành phố</span>
                <MapPin size={18} />
                <input
                  name="city"
                  list="explore-cities"
                  maxLength={200}
                  defaultValue={params.get("city") ?? ""}
                  placeholder="Toàn quốc (Tất cả)"
                />
              </label>
              <datalist id="explore-cities">
                {["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Huế"].map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              <label className="explore-field">
                <span className="sr-only">Thời gian</span>
                <CalendarDays size={18} />
                <select
                  value={datePreset}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDatePreset(value);
                    if (value === "all") setDates({ from: "", to: "" });
                    else if (value !== "custom") setDates(dateRange(value));
                  }}
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="weekend">Cuối tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="custom">Chọn khoảng ngày</option>
                </select>
              </label>
              <button type="submit" className="explore-button">
                <Radar size={18} />
                Quét sự kiện
              </button>
            </div>
            {datePreset === "custom" && (
              <div className="explore-custom-dates">
                <label>
                  Từ ngày
                  <input
                    aria-label="Từ ngày"
                    type="date"
                    value={dates.from}
                    onChange={(e) =>
                      setDates({ ...dates, from: e.target.value })
                    }
                  />
                </label>
                <label>
                  Đến ngày
                  <input
                    aria-label="Đến ngày"
                    type="date"
                    value={dates.to}
                    onChange={(e) => setDates({ ...dates, to: e.target.value })}
                  />
                </label>
              </div>
            )}
            <div className="explore-chips" aria-label="Danh mục nhanh">
              <span>Thể loại:</span>
              <button
                type="button"
                aria-pressed={!params.get("category")}
                onClick={() => update({ category: "" })}
              >
                Tất cả
              </button>
              {categories.data?.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={params.get("category") === category.id}
                  onClick={() => update({ category: category.id })}
                >
                  {category.name}
                </button>
              ))}
            </div>
            {categories.error && (
              <div role="alert" className="explore-error">
                Không tải được danh mục.{" "}
                <button type="button" onClick={categories.reload}>
                  Thử lại
                </button>
              </div>
            )}
            {validation && (
              <p className="explore-error" role="alert">
                {validation}
              </p>
            )}
          </div>
          <div id="explore-results" className="explore-result-bar">
            <p role="status" aria-live="polite">
              <Radar size={20} />
              {events.loading ? (
                "Đang tìm sự kiện…"
              ) : events.error ? (
                "Chưa tải được kết quả"
              ) : items.length || page === 0 ? (
                <span>
                  Tìm thấy <strong>{total} sự kiện</strong>
                  {params.get("city")
                    ? ` tại ${params.get("city")}`
                    : " phù hợp"}
                </span>
              ) : (
                "Trang này không có sự kiện"
              )}
            </p>
            <span className="explore-sort">
              Thứ tự: <strong>Ngày gần nhất</strong>
            </span>
          </div>
          <div className="explore-arena">
            <aside className="explore-sidebar" aria-label="Bộ lọc chi tiết">
              <div className="explore-sidebar-heading">
                <h2>
                  <SlidersHorizontal size={19} />
                  Bộ lọc chi tiết
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    setDates({ from: "", to: "" });
                    setDatePreset("all");
                    setValidation("");
                    document
                      .querySelector<HTMLFormElement>("#explore-filter-form")
                      ?.reset();
                    setParams(new URLSearchParams());
                  }}
                >
                  Đặt lại
                </button>
              </div>
              <fieldset>
                <legend>Khoảng giá</legend>
                <label className="explore-price-label">
                  Giá tối đa{" "}
                  <strong>
                    {maxPrice ? money(maxPrice) : "Không giới hạn"}
                  </strong>
                </label>
                <input
                  aria-label="Điều chỉnh giá tối đa"
                  type="range"
                  min="0"
                  max="5000000"
                  step="50000"
                  value={Math.min(Number(maxPrice || 5000000), 5000000)}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
                <div className="explore-price-inputs">
                  <label>
                    Từ (đ)
                    <input
                      aria-label="Giá tối thiểu"
                      type="number"
                      min="0"
                      max="9007199254740991"
                      step="1"
                      value={minPrice}
                      placeholder="0"
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                  </label>
                  <label>
                    Đến (đ)
                    <input
                      aria-label="Giá tối đa"
                      type="number"
                      min="0"
                      max="9007199254740991"
                      step="1"
                      value={maxPrice}
                      placeholder="Không giới hạn"
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </label>
                </div>
                <div className="explore-price-presets">
                  {[
                    ["Miễn phí", "0", "0"],
                    ["Dưới 500.000đ", "0", "499999"],
                    ["500k – 1.000k", "500000", "1000000"],
                    ["Mọi mức giá", "", ""],
                  ].map(([label, min, max]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={minPrice === min && maxPrice === max}
                      onClick={() => {
                        setMinPrice(min);
                        setMaxPrice(max);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="explore-category-list">
                <legend>Danh mục sự kiện</legend>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value=""
                    defaultChecked={!params.get("category")}
                  />
                  Tất cả danh mục
                </label>
                {categories.data?.map((category) => (
                  <label key={category.id}>
                    <input
                      type="radio"
                      name="category"
                      value={category.id}
                      defaultChecked={params.get("category") === category.id}
                    />
                    {category.name}
                  </label>
                ))}
                {categories.loading && <p>Đang tải danh mục…</p>}
              </fieldset>
              <button
                type="submit"
                className="explore-button explore-button-purple"
              >
                <SlidersHorizontal size={16} />
                Áp dụng bộ lọc
              </button>
              <p className="explore-filter-note">
                Khoảng giá áp dụng cho sự kiện có loại vé phù hợp. Giá từ là giá
                vé thấp nhất của sự kiện.
              </p>
            </aside>
            <section
              className="explore-results"
              aria-label="Kết quả sự kiện"
              aria-busy={events.loading}
            >
              {events.loading ? (
                <div className="explore-grid">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div
                      className="explore-skeleton"
                      key={index}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              ) : events.error ? (
                <div className="explore-empty" role="alert">
                  <h2>Không tải được sự kiện</h2>
                  <p>{events.error}</p>
                  <button
                    type="button"
                    className="explore-button"
                    onClick={events.reload}
                  >
                    Thử lại
                  </button>
                </div>
              ) : items.length ? (
                <div className="explore-grid">
                  {items.map((event) => (
                    <DiscoveryCard
                      key={event.id}
                      event={event}
                      category={
                        categories.data?.find(
                          (category) => category.id === event.category_id,
                        )?.name
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="explore-empty">
                  <Search size={36} />
                  <h2>
                    {page
                      ? "Trang này không có sự kiện"
                      : "Chưa tìm thấy sự kiện phù hợp"}
                  </h2>
                  <p>
                    {page
                      ? "Quay lại trang đầu để xem danh sách mới nhất."
                      : "Thử một từ khóa khác hoặc thay đổi bộ lọc của bạn."}
                  </p>
                  {(hasFilters || page > 0) && (
                    <button
                      type="button"
                      className="explore-button"
                      onClick={() =>
                        page ? changePage(0) : setParams(new URLSearchParams())
                      }
                    >
                      {page ? "Về trang đầu" : "Xóa bộ lọc"}
                    </button>
                  )}
                </div>
              )}
              {!events.loading && !events.error && items.length > 0 && (
                <div className="explore-pagination">
                  <p>
                    Hiển thị{" "}
                    <strong>
                      {page * 6 + 1} – {page * 6 + items.length}
                    </strong>{" "}
                    trên <strong>{total} sự kiện</strong>
                  </p>
                  <nav aria-label="Phân trang sự kiện">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => changePage(page - 1)}
                      aria-label="Trang trước"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    {Array.from(
                      { length: Math.min(pageCount, 5) },
                      (_, i) =>
                        Math.max(0, Math.min(page - 2, pageCount - 5)) + i,
                    ).map((index) => (
                      <button
                        type="button"
                        key={index}
                        aria-current={index === page ? "page" : undefined}
                        aria-label={`Trang ${index + 1}`}
                        onClick={() => changePage(index)}
                      >
                        {index + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={page + 1 >= pageCount}
                      onClick={() => changePage(page + 1)}
                      aria-label="Trang sau"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </nav>
                </div>
              )}
            </section>
          </div>
        </form>
        <section className="explore-organizer">
          <div>
            <span className="explore-kicker">Dành cho nhà tổ chức</span>
            <h2>Đưa sự kiện của bạn đến với cộng đồng EventHub</h2>
            <p>
              Quản lý sự kiện, phân phối vé và kiểm soát check-in bằng mã QR.
            </p>
          </div>
          {canCreate ? (
            <Link className="explore-button" to="/organizer/new">
              Tạo sự kiện ngay <ArrowRight size={18} />
            </Link>
          ) : (
            <Link className="explore-button" to="/register-organizer">
              Khu vực ban tổ chức <ArrowRight size={18} />
            </Link>
          )}
          <small className="explore-organizer-note">
            Gửi hồ sơ để được xét duyệt quyền tổ chức sự kiện trên EventHub.
          </small>
        </section>
      </div>
    </div>
  );
}
