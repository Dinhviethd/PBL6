import { useState } from "react";
import { ArrowUpRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { money, when } from "./data";
import type { Event } from "./types";

/** Decorative cover: the event title is rendered separately as accessible text. */
export function EventCover({ src }: { src?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return src && failedSrc !== src ? (
    <img
      className="event-cover"
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
    />
  ) : (
    <div className="cover-fallback" aria-hidden="true">
      <Ticket size={64} strokeWidth={1} />
      <span>LIVE THE MOMENT</span>
    </div>
  );
}

export function FeaturedEvent({ event }: { event?: Event }) {
  return (
    <section className="featured-event" aria-label="Khám phá sự kiện">
      <div className="featured-image">
        <EventCover src={event?.cover_image_url} />
        <span className="featured-tag">
          {event ? "KHÁM PHÁ SỰ KIỆN" : "EVENTHUB · LIVE EXPERIENCES"}
        </span>
      </div>
      <div className="featured-copy">
        <span className="eyebrow">
          <span className="live-dot" />{" "}
          {event ? when(event.starts_at) : "TRẢI NGHIỆM BẮT ĐẦU TỪ ĐÂY"}
        </span>
        <h1>{event?.title ?? "Chạm vào những khoảnh khắc đáng nhớ."}</h1>
        <p>
          {event ? (
            <>
              <MapPin size={16} /> {event.venue_name} · {event.city_code}
            </>
          ) : (
            "Âm nhạc, ý tưởng và những cuộc gặp. Tìm sự kiện tiếp theo dành cho bạn."
          )}
        </p>
        {event && (
          <div className="featured-price">
            <span>Giá vé từ</span>
            <strong>
              {event.priceFrom == null
                ? "Xem chi tiết"
                : money(event.priceFrom)}
            </strong>
          </div>
        )}
        {event ? (
          <Link className="btn primary full" to={`/events/${event.slug}`}>
            Mua vé <ArrowUpRight size={18} />
          </Link>
        ) : (
          <a className="btn primary" href="#discover">
            Khám phá sự kiện <ArrowUpRight size={18} />
          </a>
        )}
      </div>
    </section>
  );
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link to={`/events/${event.slug}`} className="event-card">
      <div className="event-art">
        <EventCover src={event.cover_image_url} />
        <span className="date-chip">
          {new Date(event.starts_at).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      </div>
      <div className="event-body">
        <h3>{event.title}</h3>
        <p>
          <CalendarDays size={14} />
          {when(event.starts_at)}
        </p>
        <p>
          <MapPin size={14} />
          {event.venue_name} · {event.city_code}
        </p>
        <div className="card-bottom">
          <div>
            <span className="price-label">GIÁ TỪ</span>
            <strong>
              {event.priceFrom == null
                ? "Xem chi tiết"
                : money(event.priceFrom)}
            </strong>
          </div>
          <span className="card-cta">
            Mua vé <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BookingSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="booking-steps" aria-label="Tiến trình đặt vé">
      {["Chọn vé", "Thanh toán", "Vé điện tử"].map((label, index) => (
        <li
          key={label}
          className={index + 1 <= step ? "is-current" : ""}
          aria-current={index + 1 === step ? "step" : undefined}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
