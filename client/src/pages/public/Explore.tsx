import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Cpu,
  GraduationCap,
  MapPin,
  Music2,
  Palette,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Trophy,
  Wallet,
} from "lucide-react";
import { Empty, Loading, Notice } from "@/components/ticketing/shared";
import { money, useLoad, values } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";
import "./home.css";

const filterKeys = ["q", "category", "city", "from", "to", "minPrice", "maxPrice"] as const;

const categoryIcons: Record<string, typeof Music2> = {
  "am-nhac": Music2,
  "cong-nghe": Cpu,
  "the-thao": Trophy,
  "kinh-doanh": BriefcaseBusiness,
  "nghe-thuat": Palette,
  "giao-duc": GraduationCap,
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function HeroIconButton({ children }: { children: ReactNode }) {
  return <span className="home-icon">{children}</span>;
}

function EventTile({ event, index }: { event: Event; index: number }) {
  const tone = ["cyan", "violet", "pink", "blue"][index % 4];
  return (
    <article className={`home-event-card tone-${tone}`}>
      <Link
        className="home-event-poster"
        to={`/events/${event.slug}`}
        aria-label={`Xem sự kiện ${event.title}`}
      >
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt="" loading="lazy" />
        ) : (
          <span className="home-poster-fallback" aria-hidden="true">
            <Sparkles size={36} />
            <span>EVENTHUB</span>
          </span>
        )}
        <span className="home-event-badge">SỰ KIỆN</span>
        <span className="home-event-date">{dateLabel(event.starts_at)}</span>
      </Link>
      <div className="home-event-info">
        <p className="home-event-meta">
          <CalendarDays size={14} />
          {dateLabel(event.starts_at)}
        </p>
        <Link className="home-event-title" to={`/events/${event.slug}`}>
          {event.title}
        </Link>
        <p className="home-event-venue">
          <MapPin size={14} />
          <span>{event.venue_name}{event.city_code ? ` · ${event.city_code}` : ""}</span>
        </p>
        <div className="home-event-price">
          <span>
            <small>Giá vé từ</small>
            <strong>{event.priceFrom == null ? "Xem chi tiết" : money(event.priceFrom)}</strong>
          </span>
          <Link to={`/events/${event.slug}`} aria-label={`Đặt vé: ${event.title}`}>
            Xem vé <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.toString());
  const events = useLoad<{ items: Event[]; total: number }>(
    `/events?page=0&${filter}`,
  );
  const categories = useLoad<Category[]>("/categories");
  const filterParams = new URLSearchParams(filter);

  useEffect(() => {
    setFilter(searchParams.toString());
  }, [searchParams]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = values(event);
    const params = new URLSearchParams();
    for (const key of filterKeys) {
      const value = data[key]?.trim();
      if (!value) continue;
      if (key === "from") params.set(key, new Date(`${value}T00:00:00`).toISOString());
      else if (key === "to") params.set(key, new Date(`${value}T23:59:59`).toISOString());
      else params.set(key, value);
    }
    setFilter(params.toString());
    setSearchParams(params);
  }

  function categoryHref(categoryId: string) {
    const params = new URLSearchParams(filter);
    params.set("category", categoryId);
    return `/?${params.toString()}#discover`;
  }

  const eventItems = events.data?.items ?? [];
  const featuredEvents = eventItems;

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-glow" aria-hidden="true" />
        <div className="home-hero-content">
          <div className="home-kicker">
            <span className="home-live-dot" />
            NỀN TẢNG SỰ KIỆN &amp; VÉ ĐIỆN TỬ
            <Sparkles className="home-sparkle-ping" size={14} />
          </div>
          <h1 id="home-title">
            LỄ HỘI ÂM NHẠC <span>&amp; SỰ KIỆN VŨ TRỤ</span>
          </h1>
          <p className="home-hero-copy">
            Khám phá những sự kiện đáng nhớ, tìm trải nghiệm hợp gu và giữ chỗ
            cho cuộc hẹn tiếp theo cùng EventHub.
          </p>
          <div className="home-hero-actions">
            <a className="home-button home-button-primary" href="#discover">
              Khám phá sự kiện <ArrowRight size={17} />
            </a>
            <Link className="home-button home-button-secondary" to="/profile">
              <Sparkles size={16} /> Dành cho Ban tổ chức
            </Link>
          </div>

          <form className="home-search-panel" key={filter} onSubmit={search} role="search">
            <label className="home-search-field home-keyword-field">
              <Search size={19} />
              <span className="sr-only">Tên sự kiện hoặc nghệ sĩ</span>
              <input
                name="q"
                defaultValue={filterParams.get("q") ?? ""}
                placeholder="Tìm tên sự kiện, nghệ sĩ, chủ đề..."
              />
            </label>
            <label className="home-search-field">
              <MapPin size={18} />
              <span className="sr-only">Thành phố</span>
              <select name="city" defaultValue={filterParams.get("city") ?? ""}>
                <option value="">Toàn quốc</option>
                <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </label>
            <label className="home-search-field home-date-field">
              <CalendarDays size={18} />
              <span className="sr-only">Từ ngày</span>
              <input
                type="date"
                name="from"
                defaultValue={filterParams.get("from")?.slice(0, 10) ?? ""}
                aria-label="Từ ngày"
              />
            </label>
            <label className="home-search-field home-date-field">
              <CalendarDays size={18} />
              <span className="sr-only">Đến ngày</span>
              <input
                type="date"
                name="to"
                defaultValue={filterParams.get("to")?.slice(0, 10) ?? ""}
                aria-label="Đến ngày"
              />
            </label>
            <button className="home-search-submit" type="submit">
              <Search size={16} /> Tìm kiếm
            </button>
            <div className="home-trending" aria-label="Chủ đề nổi bật">
              <span>Chủ đề:</span>
              {[
                ["Âm nhạc", "am-nhac"],
                ["Công nghệ", "cong-nghe"],
                ["Nghệ thuật", "nghe-thuat"],
                ["Thể thao", "the-thao"],
              ].map(([label, slug]) => {
                const category = categories.data?.find((item) => item.slug === slug);
                return category ? (
                  <Link key={slug} to={categoryHref(category.id)}>
                    {label}
                  </Link>
                ) : null;
              })}
            </div>
          </form>
        </div>
      </section>

      <section className="home-categories home-section" aria-labelledby="category-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow"><Sparkles className="home-sparkle-ping" size={14} /> PHÂN LOẠI ĐA CHIỀU</span>
            <h2 id="category-title" className="home-category-title">
              Danh mục sự kiện nổi bật
            </h2>
          </div>
          <p>Chọn chủ đề bạn yêu thích và tìm cuộc hẹn tiếp theo.</p>
        </div>
        <Notice error={categories.error} />
        {categories.loading ? (
          <Loading />
        ) : categories.data?.length ? (
          <div className="home-category-grid">
            {categories.data.map((category, index) => {
              const Icon = categoryIcons[category.slug] ?? TicketCheck;
              return (
                <Link
                  className={`home-category-card tone-${["violet", "cyan", "pink", "blue"][index % 4]}`}
                  key={category.id}
                  to={categoryHref(category.id)}
                >
                  <HeroIconButton><Icon size={25} /></HeroIconButton>
                  <span>{category.name}</span>
                  <small>Khám phá sự kiện</small>
                </Link>
              );
            })}
          </div>
        ) : !categories.error ? (
          <Empty>Chưa có danh mục sự kiện.</Empty>
        ) : null}
      </section>

      <section className="home-events home-section" id="discover" aria-labelledby="events-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow"><TicketCheck size={14} /> SỰ KIỆN ĐANG MỞ BÁN</span>
            <h2 id="events-title" className ="home-events-title">Sự kiện nổi bật</h2>
          </div>
          <div className="home-events-total">
            {events.data ? `${events.data.total} sự kiện` : ""}
          </div>
        </div>
        <Notice error={events.error} />
        {events.loading ? (
          <Loading />
        ) : featuredEvents.length ? (
          <div className="home-event-grid">
            {featuredEvents.map((event, index) => (
              <EventTile key={event.id} event={event} index={index} />
            ))}
          </div>
        ) : !events.error ? (
          <Empty>Chưa có sự kiện phù hợp. Hãy thử điều chỉnh bộ lọc.</Empty>
        ) : null}
      </section>

      <section className="home-benefits home-section" aria-labelledby="benefits-title">
        <div className="home-benefits-heading">
          <span className="home-eyebrow"><ShieldCheck size={14} /> TRẢI NGHIỆM EVENTHUB</span>
          <h2 id="benefits-title">Sẵn sàng cho khoảnh khắc đáng nhớ?</h2>
          <p>Từ tìm sự kiện đến lưu vé, mọi bước được thiết kế gọn gàng để bạn tập trung tận hưởng.</p>
        </div>
        <div className="home-benefit-grid">
          <article className="home-benefit-card">
            <HeroIconButton><QrCode size={25} /></HeroIconButton>
            <span className="home-benefit-tag">VÉ ĐIỆN TỬ</span>
            <h3>Check-in bằng mã QR</h3>
            <p>Giữ vé điện tử thuận tiện và sẵn sàng xuất trình tại sự kiện.</p>
          </article>
          <article className="home-benefit-card">
            <HeroIconButton><ShieldCheck size={25} /></HeroIconButton>
            <span className="home-benefit-tag">THANH TOÁN</span>
            <h3>Quy trình rõ ràng</h3>
            <p>Theo dõi đơn hàng và trạng thái thanh toán trong tài khoản của bạn.</p>
          </article>
          <article className="home-benefit-card">
            <HeroIconButton><Wallet size={25} /></HeroIconButton>
            <span className="home-benefit-tag">TÀI KHOẢN</span>
            <h3>Quản lý vé tập trung</h3>
            <p>Xem vé và thông tin đơn hàng đã đặt tại cùng một nơi.</p>
          </article>
        </div>
      </section>

      <section className="home-organizer" aria-labelledby="organizer-title">
        <div className="home-organizer-copy">
          <span className="home-eyebrow"><Sparkles className="home-sparkle-ping" size={14} /> DÀNH CHO BAN TỔ CHỨC</span>
          <h2 id="organizer-title">Đưa sự kiện của bạn đến gần khán giả hơn.</h2>
          <p>Tạo sự kiện, quản lý vé và theo dõi hoạt động bán vé trên EventHub.</p>
          <ul>
            <li><TicketCheck size={15} /> Quản lý thông tin sự kiện</li>
            <li><Wallet size={15} /> Theo dõi đơn hàng và vé</li>
            <li><QrCode size={15} /> Hỗ trợ quy trình check-in</li>
          </ul>
        </div>
        <div className="home-organizer-actions">
          <Link className="home-button home-button-primary" to="/profile">
            Bắt đầu tổ chức <ArrowRight size={16} />
          </Link>
          <Link className="home-button home-button-secondary" to="/profile">
            Tìm hiểu thêm
          </Link>
        </div>
      </section>
      <div className="sr-only" aria-live="polite">
        {events.loading ? "Đang tải sự kiện" : events.error ? "Không tải được sự kiện" : ""}
      </div>
    </div>
  );
}
