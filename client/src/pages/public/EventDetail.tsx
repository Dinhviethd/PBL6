import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, Heart, IdCard, MapPin, QrCode, Share2, Ticket, Users, UtensilsCrossed } from "lucide-react";
import { EventCover } from "@/components/ticketing/event-visuals";
import { useLoad } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";
import { EventTicketSelector } from "./EventTicketSelector";
import "./event-detail.css";

const date = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
}).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export function EventDetail() {
  const { slug = "" } = useParams();
  return <EventDetailContent key={slug} slug={slug} />;
}

function EventDetailContent({ slug }: { slug: string }) {
  const resource = useLoad<Event>(`/events/${encodeURIComponent(slug)}`);
  const categories = useLoad<Category[]>("/categories");
  const event = resource.data;
  const [shareNotice, setShareNotice] = useState("");
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    document.title = event ? `${event.title} | EventHub` : "Chi tiết sự kiện | EventHub";
  }, [event]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareNotice("Đã sao chép liên kết sự kiện.");
    } catch {
      setShareNotice("Không thể sao chép tự động. Bạn có thể sao chép địa chỉ trên thanh trình duyệt.");
    }
  }
  if (resource.loading && !event) return <div className="event-detail-page">
    <div className="event-detail-loading" role="status"><Ticket size={36} /><p>Đang tải sự kiện…</p></div>
  </div>;
  if (resource.error || !event) return <div className="event-detail-page">
    <div className="event-detail-empty" role="alert">
      <Ticket size={40} /><h1>Không tải được sự kiện</h1>
      <p>{resource.error || "Sự kiện không tồn tại hoặc không còn công khai."}</p>
      <button className="event-detail-primary" onClick={resource.reload}>Thử lại</button>
      <Link to="/explore">Quay lại khám phá sự kiện</Link>
    </div>
  </div>;

  const category = categories.data?.find((item) => item.id === event.category_id);
  const mapQuery = [event.venue_name, event.address, event.city_code].filter(Boolean).join(", ");
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const sameDay = date(event.starts_at) === date(event.ends_at);
  return (
    <div className="event-detail-page">
      <section className="event-detail-hero" aria-labelledby="event-title">
        <div className="event-detail-hero-art"><EventCover src={event.cover_image_url} /></div>
        <div className="event-detail-container event-detail-hero-content">
          <Link className="event-detail-back" to="/explore"><ArrowLeft size={16} />Khám phá sự kiện</Link>
          <div className="event-detail-tags">
            {category && <Link to={`/explore?category=${category.id}`}><Ticket size={14} />{category.name}</Link>}
            {event.organizer?.name && <span><Users size={14} />{event.organizer.name}</span>}
          </div>
          <h1 id="event-title">{event.title}</h1>
          <div className="event-detail-hero-bottom">
            <div className="event-detail-meta">
              <span><CalendarDays size={18} /><time dateTime={event.starts_at}>{date(event.starts_at)}</time></span>
              <span><Clock3 size={18} />{time(event.starts_at)} – {time(event.ends_at)}{!sameDay && ` · ${date(event.ends_at)}`} (GMT+7)</span>
              <a href="#event-location"><MapPin size={18} />{event.venue_name}, {event.city_code}</a>
            </div>
            <div className="event-detail-actions">
              <button className={`event-detail-share ${liked ? "is-liked" : ""}`} onClick={() => setLiked((value) => !value)}
                aria-label="Yêu thích sự kiện" aria-pressed={liked}><Heart size={22} fill={liked ? "currentColor" : "none"} /></button>
              <button className="event-detail-share" onClick={() => void share()} aria-label="Sao chép liên kết sự kiện"><Share2 size={22} /></button>
            </div>
          </div>
          {shareNotice && <p className="event-detail-share-notice" role="status">{shareNotice}</p>}
        </div>
      </section>
      <div className="event-detail-container event-detail-body">
        <div className="event-detail-information">
          <div className="event-detail-cover" aria-label="Ảnh bìa sự kiện"><EventCover src={event.cover_image_url} /></div>
          <section className="event-detail-panel">
            <h2>Giới thiệu sự kiện</h2>
            <p className="event-detail-description">{event.description || "Ban tổ chức chưa bổ sung mô tả sự kiện."}</p>
          </section>
          <section className="event-detail-panel" id="event-location">
            <h2>Địa điểm tổ chức</h2>
            <div className="event-detail-location-heading"><h3>{event.venue_name}</h3>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">Mở Google Maps <ArrowUpRight size={14} /></a>
            </div>
            <p>{event.address}</p>
            <a className="event-detail-map" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Xem bản đồ đến ${event.venue_name}`}>
              <MapPin size={44} aria-hidden="true" /><strong>{event.venue_name}</strong><span>{event.city_code}</span>
              <span className="event-detail-map-caption">Xem vị trí và chỉ đường <ArrowUpRight size={15} /></span>
            </a>
          </section>
          <section className="event-detail-panel event-detail-guidance">
            <h2>Lưu ý khi tham dự</h2>
            <div className="event-detail-guidance-grid">
              <div><QrCode size={24} /><h3>Xuất trình mã QR</h3><p>Vé được cấp sau khi thanh toán thành công. Mở vé trong mục Vé của tôi để check-in.</p></div>
              <div><UtensilsCrossed size={24} /><h3>Quy định đồ uống</h3><p>Không mang thức ăn, nước uống, chất cấm hay vật sắc nhọn vào khu vực sự kiện.</p></div>
              <div><IdCard size={24} /><h3>Độ tuổi quy định</h3><p>Dành cho khán giả từ 16 tuổi trở lên. Vui lòng mang CCCD hoặc VNeID.</p></div>
            </div>
            <p className="event-detail-checkin"><Clock3 size={16} />Check-in: {time(event.checkin_opens_at)} · {date(event.checkin_opens_at)} đến {time(event.checkin_closes_at)} · {date(event.checkin_closes_at)}.</p>
          </section>
        </div>
        <EventTicketSelector event={event} reload={resource.reload} />
      </div>
    </div>
  );
}
