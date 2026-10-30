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
  ScanLine,
  Ticket,
  X,
} from "lucide-react";
import { useLoad } from "@/features/ticketing/data";
import type { Event } from "@/features/ticketing/types";
import { useAuth } from "@/features/auth/stores/authStore";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";
import "./qr-scan-events.css";

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

function ScanEventCard({ event }: { event: Event }) {
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
            <QrCode size={42} />
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
          to={`/organizer/events/${encodeURIComponent(event.id)}/checkin`}
          aria-label={`Quét mã QR cho sự kiện ${event.title}`}
        >
          <ScanLine size={17} aria-hidden="true" />
          Quét mã QR
        </Link>
      </div>
    </article>
  );
}

export function QRScanEventListPage() {
  const user = useAuth((state) => state.user);
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
    <div className={`qs-page${menuOpen ? " qs-menu-open" : ""}`}>
      <div className="qs-sidebar" id="qr-navigation">
        <OrganizerSidebar active="Quét mã QR" hideLiveSync />
      </div>
      {menuOpen && (
        <button
          className="qs-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="qs-body">
        <header className="qs-header">
          <button
            className="qs-menu-button qs-icon-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="qr-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav aria-label="Đường dẫn">
            <Link to="/organizer">EventHub Ops</Link>
            <span>/</span>
            <span>Quét mã QR</span>
          </nav>
          <div className="qs-account">
            <Link className="qs-button qs-create" to="/organizer/new">
              <Plus size={16} />
              Tạo sự kiện
            </Link>
            <NotificationLink />
            <Link to="/profile" className="qs-user">
              <span>{user?.name.slice(0, 1)}</span>
              <strong>{user?.name}</strong>
            </Link>
          </div>
        </header>

        <main className="qs-content qse-content">
          <section className="qs-hero qse-hero">
            <div>
              <span className="qs-eyebrow">
                <Ticket size={15} aria-hidden="true" /> QUẢN LÝ CHECK-IN
              </span>
              <h1>Chọn sự kiện để quét mã QR</h1>
              <p>Chọn đúng sự kiện trước khi bắt đầu xác nhận vé tham dự.</p>
            </div>
            <div className="qse-event-count" aria-live="polite">
              <QrCode size={22} aria-hidden="true" />
              <div>
                <strong>{events.loading ? "…" : total}</strong>
                <span>sự kiện của bạn</span>
              </div>
            </div>
          </section>

          <div className="qse-list-heading">
            <div>
              <h2>Sự kiện của bạn</h2>
              <p>Mỗi nút quét sẽ mở trạm check-in riêng của sự kiện đó.</p>
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
                  <ScanEventCard key={event.id} event={event} />
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
