import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  SquarePen,
} from "lucide-react";
import { useAuth } from "@/features/auth/stores/authStore";
import { money, useLoad } from "@/features/ticketing/data";
import type { Category, Event, StatusCount } from "@/features/ticketing/types";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./organizer-sidebar.css";
import "./organizer.css";

const PAGE_SIZE = 5;

const statusMeta: Record<
  string,
  { label: string; tone: "cyan" | "amber" | "muted" | "red" }
> = {
  PUBLISHED: { label: "Đang mở bán", tone: "cyan" },
  PENDING_REVIEW: { label: "Chờ phê duyệt", tone: "amber" },
  DRAFT: { label: "Bản nháp", tone: "muted" },
  REJECTED: { label: "Bị từ chối", tone: "red" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

function fmtDate(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} • ${pad(d.getDate())}/${pad(
    d.getMonth() + 1,
  )}/${d.getFullYear()}`;
}

export function Organizer() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const events = useLoad<Event[]>(
    `/organizer/events?page=${page}&limit=${PAGE_SIZE}`,
  );
  const counts = useLoad<StatusCount[]>("/organizer/events/status-counts");
  const categories = useLoad<Category[]>("/categories");

  const countOf = (status: string) =>
    counts.data?.find((c) => c.status === status)?.count ?? 0;
  const totalCount =
    counts.data?.reduce((sum, c) => sum + c.count, 0) ?? 0;
  const totalResults = events.data?.length
    ? Number(events.data[0].total_results ?? events.data.length)
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const categoryName = (id: string) =>
    categories.data?.find((c) => c.id === id)?.name;

  return (
    <>
      <OrganizerSidebar active="Quản lý sự kiện" />
      <div className="org-body">
        <header className="org-header">
          <div className="org-header-left">
            <nav className="org-breadcrumb" aria-label="Đường dẫn">
              <Link to="/">EventHub</Link>
              <span className="org-crumb-sep">/</span>
              <span className="org-crumb-current">Ban Tổ Chức</span>
            </nav>
            <label className="org-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="text"
                placeholder="Tìm vé, đơn hàng, khách..."
                aria-label="Tìm kiếm"
              />
            </label>
          </div>
          <div className="org-header-right">
            <Link className="org-create-btn" to="/organizer/new">
              <Plus size={16} aria-hidden="true" />
              Tạo sự kiện
            </Link>
            <Link className="org-bell" to="/notifications" aria-label="Thông báo">
              <Bell size={20} aria-hidden="true" />
              <span className="org-bell-dot" aria-hidden="true" />
            </Link>
            <Link className="org-identity" to="/profile">
              <span className="org-avatar">
                {user?.name.slice(0, 1).toUpperCase() ?? "B"}
              </span>
              <span className="org-identity-text">
                <span className="org-identity-name">
                  {user?.name ?? "Ban Tổ Chức"}
                </span>
                <span className="org-identity-role">
                  {user?.roles.includes("ADMIN") ? "Quản trị viên" : "BTC"}
                </span>
              </span>
            </Link>
          </div>
        </header>

        <div className="org-content">
          <section className="org-subheader" aria-label="Tổng quan sự kiện">
            <span className="org-glow purple" aria-hidden="true" />
            <span className="org-glow cyan" aria-hidden="true" />
            <div className="org-subheader-inner">
              <div>
                <span className="org-eyebrow">
                  <span className="org-eyebrow-dot" aria-hidden="true" />
                  Control Center • Event Matrix
                </span>
                <h1 className="org-title">Quản lý sự kiện</h1>
                <p className="org-subtitle">
                  Theo dõi lịch trình, trạng thái phát hành vé và hiệu suất
                  doanh thu thời gian thực.
                </p>
              </div>
              <div className="org-quick-stats" aria-busy={counts.loading}>
                <span className="org-qs-total-label">Tổng:</span>
                <span className="org-qs-total">
                  {counts.loading ? "—" : totalCount}
                </span>
                <span className="org-qs-sep">/</span>
                <span className="org-qs-chip cyan">
                  <span className="org-qs-dot" aria-hidden="true" />
                  {counts.loading ? "—" : countOf("PUBLISHED")} Mở bán
                </span>
                <span className="org-qs-sep">/</span>
                <span className="org-qs-chip amber">
                  <span className="org-qs-dot" aria-hidden="true" />
                  {counts.loading ? "—" : countOf("PENDING_REVIEW")} Chờ duyệt
                </span>
                <span className="org-qs-sep">/</span>
                <span className="org-qs-chip muted">
                  {counts.loading ? "—" : countOf("DRAFT")} Nháp
                </span>
              </div>
              <Link className="org-cta" to="/organizer/new">
                <Plus size={20} aria-hidden="true" />
                Tạo sự kiện mới
              </Link>
            </div>
          </section>

          <section className="org-table-card" aria-label="Danh sách sự kiện">
            {events.loading ? (
              <div className="org-state" role="status">
                Đang tải dữ liệu…
              </div>
            ) : events.error ? (
              <div className="org-state" role="alert">
                <p>{events.error}</p>
                <button className="org-action-btn" onClick={events.reload}>
                  Thử lại
                </button>
              </div>
            ) : !events.data?.length ? (
              <div className="org-state">
                Bắt đầu bằng việc tạo sự kiện đầu tiên.
              </div>
            ) : (
              <>
                <div
                  className="org-table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Bảng sự kiện, cuộn ngang để xem thêm"
                >
                  <table className="org-table">
                    <thead>
                      <tr>
                        <th scope="col">Thông tin sự kiện</th>
                        <th scope="col">Thời gian &amp; Địa điểm</th>
                        <th scope="col">Vé &amp; Tỷ lệ lấp đầy</th>
                        <th scope="col">Doanh thu tạm tính</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col" className="org-cell-actions">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.data.map((e: Event) => {
                        const meta = statusMeta[e.status] ?? {
                          label: e.status,
                          tone: "muted" as const,
                        };
                        const sold = e.sold_quantity ?? 0;
                        const capacity = e.capacity ?? 0;
                        const fillPct = Math.round((e.fill_rate ?? 0) * 100);
                        const cat = categoryName(e.category_id);
                        return (
                          <tr key={e.id}>
                            <td>
                              <div className="org-event-cell">
                                <span className="org-thumb">
                                  {e.cover_image_url ? (
                                    <img
                                      src={e.cover_image_url}
                                      alt=""
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="org-thumb-empty" />
                                  )}
                                </span>
                                <span className="org-event-info">
                                  <span className="org-event-meta">
                                    {cat && (
                                      <span className="org-category-chip">
                                        {cat}
                                      </span>
                                    )}
                                  </span>
                                  <Link
                                    className="org-event-title"
                                    to={`/organizer/events/${e.id}`}
                                  >
                                    {e.title}
                                  </Link>
                                  {e.description && (
                                    <span className="org-event-sub">
                                      {e.description}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="org-when">
                                <CalendarDays size={14} aria-hidden="true" />
                                {fmtDate(e.starts_at)}
                              </span>
                              <span className="org-where">
                                <MapPin size={14} aria-hidden="true" />
                                {e.venue_name}
                              </span>
                            </td>
                            <td>
                              <span className="org-fill">
                                <span className="org-fill-row">
                                  <span className="org-fill-count">
                                    {sold.toLocaleString("vi-VN")} /{" "}
                                    {capacity.toLocaleString("vi-VN")} vé
                                  </span>
                                  <span className="org-fill-pct">
                                    {fillPct}%
                                  </span>
                                </span>
                                <span className="org-fill-bar">
                                  <span
                                    className="org-fill-bar-fill"
                                    style={{ width: `${fillPct}%` }}
                                  />
                                </span>
                              </span>
                            </td>
                            <td>
                              <span className="org-revenue">
                                <strong>{money(e.revenue ?? 0)}</strong>
                                <small>Doanh thu tạm tính</small>
                              </span>
                            </td>
                            <td>
                              <span
                                className={`org-status-pill ${meta.tone}`}
                              >
                                <span
                                  className="org-status-dot"
                                  aria-hidden="true"
                                />
                                {meta.label}
                              </span>
                            </td>
                            <td className="org-cell-actions">
                              <div className="org-actions">
                                <Link
                                  className="org-action-btn"
                                  to={`/organizer/events/${e.id}/stats`}
                                >
                                  Vé &amp; Suất
                                </Link>
                                <Link
                                  className="org-action-icon"
                                  to={`/organizer/events/${e.id}`}
                                  title="Chỉnh sửa"
                                  aria-label={`Chỉnh sửa ${e.title}`}
                                >
                                  <SquarePen size={16} aria-hidden="true" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <footer className="org-pagination">
                  <span className="org-pagination-info">
                    Đang xem{" "}
                    <strong>
                      {events.data.length ? page * PAGE_SIZE + 1 : 0}–
                      {page * PAGE_SIZE + events.data.length}
                    </strong>{" "}
                    trên tổng số{" "}
                    <strong className="org-pg-total">{totalResults}</strong>{" "}
                    sự kiện
                  </span>
                  <nav
                    className="org-pagination-nav"
                    aria-label="Phân trang sự kiện"
                  >
                    <button
                      className="org-page-btn"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                      Trước
                    </button>
                    <span className="org-page-num is-current">{page + 1}</span>
                    <button
                      className="org-page-btn"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </nav>
                </footer>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
