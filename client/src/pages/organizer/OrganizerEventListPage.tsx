import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Menu,
  Plus,
  QrCode,
  Pencil,
  ScanLine,
  Ticket,
  Users,
  BarChart3,
  X,
} from "lucide-react";
import { useLoad } from "@/features/ticketing/data";
import type { Event } from "@/features/ticketing/types";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { OrganizerHeader } from "./OrganizerHeader";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";
import "./qr-scan-events.css";

type EventPurpose = "scan" | "edit" | "tickets" | "attendees" | "stats";
const purposes = {
  stats: { title: "Thống kê doanh thu", heading: "Chọn sự kiện để xem báo cáo", eyebrow: "BÁO CÁO PHÂN TÍCH", description: "Chọn sự kiện để theo dõi doanh thu, vé bán và check-in.", hint: "Mỗi sự kiện có bộ lọc ngày, biểu đồ và báo cáo CSV riêng.", action: "Xem báo cáo", suffix: "/stats", Icon: BarChart3 },
  attendees: { title: "Người tham dự", heading: "Chọn sự kiện để xem người tham dự", eyebrow: "DANH SÁCH NGƯỜI THAM DỰ", description: "Chọn sự kiện để xem danh sách vé và trạng thái check-in.", hint: "Mỗi sự kiện có danh sách người tham dự và bộ lọc riêng.", action: "Xem người tham dự", suffix: "/attendees", Icon: Users },
  scan: { title: "Quét mã QR", heading: "Chọn sự kiện để quét mã QR", eyebrow: "QUẢN LÝ CHECK-IN", description: "Chọn đúng sự kiện trước khi bắt đầu xác nhận vé tham dự.", hint: "Mỗi nút quét sẽ mở trạm check-in riêng của sự kiện đó.", action: "Quét mã QR", suffix: "/checkin", Icon: ScanLine },
  edit: { title: "Chỉnh sửa sự kiện", heading: "Chọn sự kiện để chỉnh sửa", eyebrow: "QUẢN LÝ SỰ KIỆN", description: "Chọn một sự kiện để chỉnh sửa thông tin và theo dõi xét duyệt.", hint: "Mỗi thẻ mở trang chỉnh sửa và trạng thái xét duyệt của sự kiện đó.", action: "Chỉnh sửa sự kiện", suffix: "", Icon: Pencil },
  tickets: { title: "Quản lý loại vé", heading: "Chọn sự kiện để quản lý loại vé", eyebrow: "QUẢN LÝ LOẠI VÉ", description: "Chọn một sự kiện để xem và cấu hình các loại vé.", hint: "Mỗi sự kiện có danh sách loại vé và sức chứa riêng.", action: "Quản lý loại vé", suffix: "/tickets", Icon: Ticket },
} as const;

const PAGE_SIZE = 6;

function eventDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function eventStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING_REVIEW: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    PUBLISHED: "Đang mở bán",
    REJECTED: "Bị từ chối",
    CANCELLED: "Đã hủy",
    ARCHIVED: "Đã lưu trữ",
  };
  return labels[status] ?? status;
}

function EventCard({ event, purpose }: { event: Event; purpose: EventPurpose }) {
  const { action, suffix, Icon } = purposes[purpose];
  const ArtIcon = purpose === "scan" ? QrCode : Icon;
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = event.cover_image_url;

  return (
    <article className="qse-card">
      <div className="qse-card-art">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="qse-card-fallback" aria-hidden="true">
            <ArtIcon size={42} />
            <span>EventHub</span>
          </div>
        )}
        <span className="qse-status">{eventStatus(event.status)}</span>
      </div>
      <div className="qse-card-body">
        <h2 title={event.title}>{event.title}</h2>
        <p className="qse-meta">
          <CalendarDays size={15} aria-hidden="true" />
          <time dateTime={event.starts_at}>{eventDate(event.starts_at)}</time>
        </p>
        <p className="qse-meta" title={`${event.venue_name}, ${event.city_code}`}>
          <MapPin size={15} aria-hidden="true" />
          <span>{event.venue_name}{event.city_code ? ` · ${event.city_code}` : ""}</span>
        </p>
        <Link
          className="qse-scan-button"
          to={`/organizer/events/${encodeURIComponent(event.id)}${suffix}`}
          aria-label={`${action} cho sự kiện ${event.title}`}
        >
          <Icon size={17} aria-hidden="true" />
          {action}
        </Link>
      </div>
    </article>
  );
}

export function OrganizerEventListPage({ purpose }: { purpose: EventPurpose }) {
  const config = purposes[purpose];
  const CountIcon = purpose === "scan" ? QrCode : config.Icon;
  const [page, setPage] = useState(0);
  const events = useLoad<Event[]>(
    `/organizer/events?page=${page}&limit=${PAGE_SIZE}`,
  );
  const items = events.data ?? [];
  const total = items.length
    ? Number(items[0].total_results ?? items.length)
    : 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`qs-page${purpose === "attendees" ? " qse-attendees" : ""}${menuOpen ? " qs-menu-open" : ""}`}>
      {purpose === "attendees" && <style>{`
        @media (max-width: 650px) {
          .qse-attendees .org-breadcrumb > a,
          .qse-attendees .org-breadcrumb .org-crumb-sep { display: none; }
          .qse-attendees .org-create-btn { white-space: nowrap; font-size: 11px; padding: 8px; }
          .qse-attendees .org-header-left,
          .qse-attendees .org-header-right { gap: 8px; }
          .qse-attendees .org-breadcrumb { font-size: 10px; }
        }
      `}</style>}
      <div className="qs-sidebar" id={`event-navigation-${purpose}`}>
        <OrganizerSidebar active={config.title} hideLiveSync />
      </div>
      {menuOpen && (
        <button
          className="qs-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="qs-body qs-shared-header">
        <OrganizerHeader
          title={config.title}
          menuButton={
            <button
              className="qs-menu-button qs-icon-button"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
              aria-controls={`event-navigation-${purpose}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          }
          notificationSlot={<NotificationLink />}
        />

        <main className="qs-content qse-content">
          <section className="qs-hero qse-hero">
            <div>
              <span className="qs-eyebrow">
                <Ticket size={15} aria-hidden="true" /> {config.eyebrow}
              </span>
              <h1>{config.heading}</h1>
              <p>{config.description}</p>
            </div>
            <div className="qse-event-count" aria-live="polite">
              <CountIcon size={22} aria-hidden="true" />
              <div>
                <strong>{events.loading ? "…" : total}</strong>
                <span>sự kiện của bạn</span>
              </div>
            </div>
          </section>

          <div className="qse-list-heading">
            <div>
              <h2>Sự kiện của bạn</h2>
              <p>{config.hint}</p>
            </div>
            {!events.loading && total > 0 && (
              <span>
                Trang {page + 1} / {pageCount}
              </span>
            )}
          </div>

          {events.error && (
            <div role="alert" className="qs-load-error">
              <span>{events.error}</span>
              <button className="qs-button" onClick={events.reload}>
                Thử tải lại
              </button>
            </div>
          )}

          {events.loading && (
            <p className="qse-state" role="status">
              <Clock3 size={18} aria-hidden="true" /> Đang tải danh sách sự kiện…
            </p>
          )}

          {!events.loading && !events.error && items.length === 0 && (
            <section className="qse-empty">
              <CalendarDays size={34} aria-hidden="true" />
              <h2>{page === 0 ? "Chưa có sự kiện nào" : "Không có sự kiện ở trang này"}</h2>
              <p>
                {page === 0
                  ? "Các sự kiện bạn quản lý sẽ xuất hiện tại đây."
                  : "Quay lại trang trước để xem các sự kiện."}
              </p>
              {page === 0 ? (
                <Link className="qse-scan-button" to="/organizer/new">
                  <Plus size={17} aria-hidden="true" /> Tạo sự kiện
                </Link>
              ) : (
                <button className="qse-page-button" onClick={() => setPage(0)}>
                  Quay về trang đầu
                </button>
              )}
            </section>
          )}

          {!events.loading && !events.error && items.length > 0 && (
            <>
              <section className="qse-grid" aria-label="Danh sách sự kiện">
                {items.map((event) => (
                  <EventCard key={event.id} event={event} purpose={purpose} />
                ))}
              </section>
              {pageCount > 1 && (
                <nav className="qse-pagination" aria-label="Phân trang sự kiện">
                  <button
                    className="qse-page-button"
                    disabled={page === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeft size={17} aria-hidden="true" /> Trước
                  </button>
                  <span>{page + 1} / {pageCount}</span>
                  <button
                    className="qse-page-button"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  >
                    Tiếp <ChevronRight size={17} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
