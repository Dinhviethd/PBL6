import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Ticket,
  UserRound,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { AdminShell } from "./AdminShell";

type OrganizerDetail = {
  id: string;
  user_id: string;
  organization_name: string;
  business_name: string | null;
  tax_id_or_business_license: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  head_office_address: string | null;
  description: string | null;
  website_or_social: string | null;
  logo_url: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type OrganizerEvent = {
  id: string;
  organizer_id: string;
  title: string;
  cover_image_url: string | null;
  venue_name: string;
  city_code: string;
  starts_at: string;
  ends_at: string;
  status: string;
  sales_paused: boolean;
};

type EventPage = {
  items: OrganizerEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const profileStatuses = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Đã từ chối",
};

const eventStatuses: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Đã từ chối",
  PUBLISHED: "Đã công khai",
  CANCELLED: "Đã hủy",
  ARCHIVED: "Đã lưu trữ",
};

function dateTime(value: string) {
  if (Number.isNaN(Date.parse(value))) return "Chưa có thông tin";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function webUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function RemoteImage({ src, alt, logo = false }: {
  src: string | null;
  alt: string;
  logo?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={logo ? "c5-logo" : "c5-event-image"}>
      {src && !failed ? (
        <img src={src} alt={alt} onError={() => setFailed(true)} />
      ) : logo ? (
        <span aria-hidden="true">{alt.trim().slice(0, 2).toUpperCase() || "?"}</span>
      ) : (
        <ImageOff aria-hidden="true" size={26} />
      )}
    </span>
  );
}

export function C5OrganizerDetail() {
  const { applicationId = "" } = useParams();
  // A new route ID starts with no previous profile, events or requests.
  return <OrganizerProfile key={applicationId} applicationId={applicationId} />;
}

function OrganizerProfile({ applicationId }: { applicationId: string }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageValue = searchParams.get("page") ?? "0";
  const page = /^\d+$/.test(pageValue) && Number(pageValue) <= 10000
    ? Number(pageValue)
    : 0;
  const returnTo = location.state?.returnTo;
  const backPath = typeof returnTo === "string" && /^\/admin\/applications(?:\?[^#]*)?$/.test(returnTo)
    ? returnTo
    : "/admin/applications";
  const [profile, setProfile] = useState<OrganizerDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileRetry, setProfileRetry] = useState(0);
  const [events, setEvents] = useState<EventPage | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventsRetry, setEventsRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setProfileLoading(true);
    setProfileError("");
    setProfile(null);
    api.get<{ data: OrganizerDetail }>(
      `/admin/organizer-applications/${encodeURIComponent(applicationId)}`,
      { signal: controller.signal },
    )
      .then(response => {
        if (!controller.signal.aborted) setProfile(response.data.data);
      })
      .catch(cause => {
        if (controller.signal.aborted) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setProfileError(status === 404
          ? "Không tìm thấy hồ sơ ban tổ chức."
          : status === 400
            ? "Đường dẫn hồ sơ không hợp lệ."
            : message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfileLoading(false);
      });
    return () => controller.abort();
  }, [applicationId, profileRetry]);

  const ownerId = profile?.user_id;
  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    setEventsLoading(true);
    setEventsError("");
    setEvents(null);
    const params = new URLSearchParams({ organizerId: ownerId, page: String(page), limit: "10" });
    api.get<{ data: EventPage }>(`/admin/events?${params}`, { signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        const result = response.data.data;
        if (result.pagination.totalPages > 0 && page >= result.pagination.totalPages) {
          setSearchParams({ page: String(result.pagination.totalPages - 1) }, { replace: true });
          return;
        }
        if (result.pagination.total === 0 && page !== 0) {
          setSearchParams({}, { replace: true });
          return;
        }
        setEvents(result);
      })
      .catch(cause => {
        if (!controller.signal.aborted) setEventsError(message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsLoading(false);
      });
    return () => controller.abort();
  }, [ownerId, page, eventsRetry, setSearchParams]);

  const changePage = (next: number) => setSearchParams(
    next ? { page: String(next) } : {},
    { preventScrollReset: true },
  );
  const pagination = events?.pagination;
  const website = webUrl(profile?.website_or_social ?? null);

  return (
    <AdminShell title="Hồ sơ ban tổ chức">
      <style>{styles}</style>
      <div className="c5-page">
        <nav className="c5-breadcrumb" aria-label="Đường dẫn trang">
          <Link to={backPath}>Ban tổ chức</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{profile?.organization_name || "Chi tiết hồ sơ"}</span>
        </nav>
        <header className="c5-heading">
          <div>
            <span className="c5-eyebrow"><Building2 size={15} aria-hidden="true" /> BAN TỔ CHỨC</span>
            <h1>Hồ sơ Ban Tổ Chức</h1>
            <p>Thông tin đơn vị và danh sách sự kiện trên EventHub.</p>
          </div>
          <Link className="c5-back" to={backPath}>
            <ArrowLeft size={17} aria-hidden="true" /> Quay lại danh sách
          </Link>
        </header>
        {profileLoading ? (
          <p className="c5-state" role="status">Đang tải hồ sơ ban tổ chức…</p>
        ) : profileError ? (
          <div className="c5-error" role="alert">
            <p>{profileError}</p>
            <button type="button" onClick={() => setProfileRetry(value => value + 1)}>Thử lại</button>
          </div>
        ) : profile ? (
          <div className="c5-grid">
            <section className="c5-profile" aria-labelledby="c5-profile-name">
              <div className="c5-identity">
                <RemoteImage key={profile.logo_url} src={profile.logo_url} alt={profile.organization_name} logo />
                <div>
                  <span className="c5-eyebrow">THÔNG TIN TỔ CHỨC</span>
                  <h2 id="c5-profile-name">{profile.organization_name}</h2>
                  <span className={`c5-badge ${profile.status.toLowerCase()}`}>
                    {profileStatuses[profile.status]}
                  </span>
                </div>
              </div>
              <dl className="c5-fields">
                <div>
                  <dt>TÊN DOANH NGHIỆP ĐĂNG KÝ</dt>
                  <dd>{profile.business_name || "Chưa cập nhật"}</dd>
                </div>
                <div className="c5-tax">
                  <dt>MÃ SỐ THUẾ / GIẤY PHÉP KHAI BÁO</dt>
                  <dd>{profile.tax_id_or_business_license || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>ĐỊA CHỈ TRỤ SỞ</dt>
                  <dd className="c5-icon-line"><MapPin size={18} aria-hidden="true" />{profile.head_office_address || "Chưa cập nhật"}</dd>
                </div>
              </dl>
              <div className="c5-contact">
                <h3><UserRound size={17} aria-hidden="true" /> Người liên hệ</h3>
                <p className="c5-contact-name">{profile.contact_name || "Chưa cập nhật"}</p>
                <p className="c5-icon-line"><Phone size={16} aria-hidden="true" />{profile.contact_phone || "Chưa cập nhật"}</p>
                <p className="c5-icon-line"><Mail size={16} aria-hidden="true" />{profile.contact_email || "Chưa cập nhật"}</p>
              </div>
              <dl className="c5-fields">
                <div>
                  <dt>WEBSITE / MẠNG XÃ HỘI</dt>
                  <dd>{website ? (
                    <a href={website} target="_blank" rel="noopener noreferrer">{profile.website_or_social}</a>
                  ) : profile.website_or_social || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>GIỚI THIỆU</dt>
                  <dd className="c5-description">{profile.description || "Chưa có giới thiệu."}</dd>
                </div>
              </dl>
            </section>
            <section className="c5-events" aria-labelledby="c5-events-title" aria-busy={eventsLoading}>
              <div className="c5-events-heading">
                <div>
                  <h2 id="c5-events-title"><Ticket size={21} aria-hidden="true" /> Sự kiện của ban tổ chức</h2>
                  <p>{pagination ? `${pagination.total.toLocaleString("vi-VN")} sự kiện` : "Danh sách sự kiện"}</p>
                </div>
                <button
                  type="button"
                  className="c5-refresh"
                  aria-label="Làm mới danh sách sự kiện"
                  disabled={eventsLoading}
                  onClick={() => setEventsRetry(value => value + 1)}
                >
                  <RefreshCw size={17} aria-hidden="true" />
                </button>
              </div>
              {eventsLoading ? (
                <p className="c5-state" role="status">Đang tải danh sách sự kiện…</p>
              ) : eventsError ? (
                <div className="c5-error" role="alert">
                  <p>{eventsError}</p>
                  <button type="button" onClick={() => setEventsRetry(value => value + 1)}>Thử lại</button>
                </div>
              ) : events && events.items.length ? (
                <>
                  <ul className="c5-event-list">
                    {events.items.map(event => (
                      <li key={event.id} className="c5-event-card">
                        <RemoteImage src={event.cover_image_url} alt="" />
                        <div className="c5-event-copy">
                          <div className="c5-event-title">
                            <h3>{event.title}</h3>
                            <span className={`c5-badge ${event.status.toLowerCase()}`}>
                              {eventStatuses[event.status] || event.status}
                            </span>
                            {event.status === "PUBLISHED" && event.sales_paused && (
                              <span className="c5-badge pending">Tạm dừng bán vé</span>
                            )}
                          </div>
                          <p className="c5-icon-line"><MapPin size={16} aria-hidden="true" />{[event.venue_name, event.city_code].filter(Boolean).join(" · ") || "Chưa cập nhật địa điểm"}</p>
                          <p className="c5-icon-line"><CalendarDays size={16} aria-hidden="true" /><span>{dateTime(event.starts_at)}<br />đến {dateTime(event.ends_at)}</span></p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <nav className="c5-pagination" aria-label="Phân trang sự kiện">
                    <span>{page * 10 + 1}–{Math.min((page + 1) * 10, pagination!.total)} / {pagination!.total.toLocaleString("vi-VN")} sự kiện</span>
                    <div>
                      <button type="button" aria-label="Trang trước" disabled={page === 0} onClick={() => changePage(page - 1)}>
                        <ChevronLeft size={18} aria-hidden="true" />
                      </button>
                      <span aria-live="polite">Trang {page + 1} / {pagination!.totalPages}</span>
                      <button type="button" aria-label="Trang sau" disabled={page + 1 >= pagination!.totalPages} onClick={() => changePage(page + 1)}>
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </nav>
                </>
              ) : (
                <p className="c5-state" role="status">Ban tổ chức chưa có sự kiện nào.</p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

const styles = `
.c5-page {
  min-height: calc(100vh - 80px);
  padding: 24px;
  color: #e0e1f7;
  font-family: 'Be Vietnam Pro', sans-serif;
}
.c5-page * {
  box-sizing: border-box;
}
.c5-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  color: #ccc3d8;
  font: 500 12px 'Space Grotesk', sans-serif;
  overflow-wrap: anywhere;
}
.c5-breadcrumb a,
.c5-fields a {
  color: #5de6ff;
}
.c5-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}
.c5-heading h1 {
  margin: 8px 0;
  font: 700 32px/1.25 Be Vietnam Pro, sans-serif;
  letter-spacing: -.02em;
}
.c5-heading p {
  margin: 0;
  color: #ccc3d8;
  font-size: 14px;
  line-height: 1.7;
}
.c5-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5de6ff;
  font: 600 11px 'Space Grotesk', sans-serif;
  letter-spacing: .05em;
}
.c5-back,
.c5-page button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  padding: 8px 12px;
  background: #262939;
  color: #e0e1f7;
  font: 500 12px 'Be Vietnam Pro', sans-serif;
  text-decoration: none;
  cursor: pointer;
}
.c5-back {
  flex-shrink: 0;
}
.c5-page button:disabled {
  opacity: .45;
  cursor: default;
}
.c5-page :is(a, button):focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 3px;
}
.c5-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr);
  align-items: start;
  gap: 32px;
}
.c5-profile {
  position: relative;
  min-width: 0;
  padding: 24px;
  border-radius: 12px;
  background: radial-gradient(ellipse at top right, #7c3aed17, transparent 55%), #181b2a;
}
.c5-identity {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}
.c5-identity > div {
  min-width: 0;
}
.c5-identity h2 {
  margin: 7px 0 12px;
  font: 700 20px/1.4 Be Vietnam Pro, sans-serif;
  overflow-wrap: anywhere;
}
.c5-logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border: 2px solid #7c3aed;
  border-radius: 12px;
  background: #0a0d1c;
  color: #5de6ff;
  box-shadow: 0 0 20px #7c3aed30;
  font: 700 24px Be Vietnam Pro, sans-serif;
}
.c5-logo img,
.c5-event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.c5-fields {
  display: grid;
  gap: 24px;
  margin: 0;
}
.c5-fields dt {
  margin-bottom: 8px;
  color: #ccc3d8;
  font: 500 11px/1.6 'Space Grotesk', sans-serif;
  letter-spacing: .04em;
}
.c5-fields dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.c5-tax {
  padding: 16px;
  border-radius: 8px;
  background: #262939;
}
.c5-tax dd {
  font: 600 20px/1.5 'Space Grotesk', sans-serif;
}
.c5-contact {
  margin: 24px 0;
  padding: 20px 0;
  border-top: 1px solid #313445;
  border-bottom: 1px solid #313445;
}
.c5-contact h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  color: #d2bbff;
  font-size: 13px;
}
.c5-contact p {
  margin: 10px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.c5-contact .c5-contact-name {
  font: 600 18px/1.4 Be Vietnam Pro, sans-serif;
}
.c5-icon-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.c5-icon-line svg {
  flex-shrink: 0;
  margin-top: 3px;
  color: #b5aec4;
}
.c5-description {
  white-space: pre-wrap;
}
.c5-events {
  min-width: 0;
}
.c5-events-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 16px;
  margin-bottom: 24px;
  border-bottom: 2px solid #5de6ff;
}
.c5-events-heading h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #5de6ff;
  font: 600 18px/1.4 Be Vietnam Pro, sans-serif;
}
.c5-events-heading p {
  margin: 8px 0 0;
  color: #ccc3d8;
  font: 500 12px 'Space Grotesk', sans-serif;
}
.c5-page .c5-refresh {
  width: 40px;
  flex-shrink: 0;
  padding: 0;
}
.c5-event-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.c5-event-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border-radius: 12px;
  background: #181b2a;
}
.c5-event-image {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 8px;
  background: #313445;
  color: #ccc3d8;
}
.c5-event-copy {
  min-width: 0;
}
.c5-event-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.c5-event-title h3 {
  margin: 0;
  font: 700 20px/1.4 Be Vietnam Pro, sans-serif;
  overflow-wrap: anywhere;
}
.c5-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 9px;
  background: #313445;
  color: #e0e1f7;
  font: 500 11px/1.4 'Space Grotesk', sans-serif;
}
.c5-badge.approved,
.c5-badge.published {
  background: #5de6ff18;
  color: #5de6ff;
}
.c5-badge.pending,
.c5-badge.pending_review {
  background: #f59e0b18;
  color: #fbbf24;
}
.c5-badge.rejected,
.c5-badge.cancelled {
  background: #ffb4ab15;
  color: #ffb4ab;
}
.c5-event-copy p {
  margin: 12px 0 0;
  color: #ccc3d8;
  font: 400 12px/1.7 'Be Vietnam Pro', sans-serif;
  overflow-wrap: anywhere;
}
.c5-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  color: #ccc3d8;
  font-size: 12px;
}
.c5-pagination > div {
  display: flex;
  align-items: center;
  gap: 12px;
}
.c5-pagination button {
  width: 40px;
  padding: 0;
}
.c5-state,
.c5-error {
  padding: 32px 24px;
  border-radius: 12px;
  background: #181b2a;
  color: #ccc3d8;
  font-size: 14px;
  line-height: 1.8;
}
.c5-error {
  border: 1px solid #ffb4ab50;
  color: #ffb4ab;
}
@media (max-width: 1100px) {
  .c5-grid {
    grid-template-columns: minmax(240px, 1fr) minmax(0, 1.5fr);
    gap: 20px;
  }
  .c5-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  .c5-profile,
  .c5-event-card {
    padding: 20px;
  }
}
@media (max-width: 950px) {
  .c5-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .c5-page {
    padding: 20px 16px;
  }
  .c5-heading h1 {
    font-size: 27px;
  }
  .c5-event-card {
    padding: 16px;
    gap: 12px;
  }
  .c5-event-image {
    width: 56px;
    height: 70px;
  }
  .c5-event-title h3 {
    font-size: 17px;
  }
  .c5-events-heading h2 {
    font-size: 17px;
  }
}
`;
