import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import axios from "axios";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileArchive,
  ImageOff,
  Info,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Ticket,
  UserRound,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { AdminShell } from "./AdminShell";

type TicketType = {
  id: string;
  name: string;
  price_amount: string;
  capacity: number;
  archived_at: string | null;
  sale_starts_at: string;
  sale_ends_at: string;
};

type EventDetail = {
  id: string;
  title: string;
  description: string;
  organizer_id: string;
  cover_image_url: string | null;
  venue_name: string;
  address: string;
  city_code: string;
  starts_at: string;
  ends_at: string;
  submitted_at: string | null;
  status: string;
  sales_paused: boolean;
  ticketTypes: TicketType[];
  reviews: {
    decision: string;
    reason: string | null;
    review_version: number;
    created_at: string;
  }[];
};

type Organizer = {
  id: string;
  organization_name: string | null;
  account_name: string | null;
  contact_name: string | null;
};

type Application = {
  user_id: string;
  contact_email: string | null;
  contact_phone: string | null;
};

type ApplicationPage = {
  items: Application[];
  pagination: { totalPages: number };
};

const developmentMessage = "Chức năng đang được phát triển";
const queuePath = "/admin/events/review";
const statuses: Record<string, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  PUBLISHED: "Đã phê duyệt · Công khai",
  REJECTED: "Đã từ chối",
  DRAFT: "Bản nháp",
  CANCELLED: "Đã hủy",
  ARCHIVED: "Đã lưu trữ",
};

function dateTime(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Chưa có thông tin";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function money(value: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(BigInt(value));
}

function message(cause: unknown) {
  if (axios.isAxiosError(cause)) {
    if (cause.response?.status === 404) return "Không tìm thấy sự kiện.";
    if (cause.response?.status === 403)
      return "Bạn không có quyền xem hoặc duyệt sự kiện này.";
    return String(
      cause.response?.data?.message ?? "Không kết nối được máy chủ. Hãy thử lại.",
    );
  }
  return cause instanceof Error ? cause.message : "Không tải được dữ liệu.";
}

function Cover({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt={`Ảnh bìa ${title}`} onError={() => setFailed(true)} />
  ) : (
    <div className="c9-image-empty">
      <ImageOff size={30} />
      <span>Chưa có ảnh bìa</span>
    </div>
  );
}

function Developing({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={`c9-developing ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function C9ApproveEventDetail() {
  const { id = "" } = useParams();
  return <EventReview key={id} id={id} />;
}

function EventReview({ id }: { id: string }) {
  const location = useLocation();
  const user = useAuth((state) => state.user);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [contact, setContact] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extraError, setExtraError] = useState("");
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState<{ text: string; serial: number } | null>(null);
  const sending = useRef(false);
  const alive = useRef(true);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const state = location.state as { queueSearch?: unknown } | null;
  const queueSearch =
    typeof state?.queueSearch === "string" && state.queueSearch.startsWith("?")
      ? state.queueSearch
      : "";
  const back = queuePath + queueSearch;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDetail(null);
    api
      .get<{ data: EventDetail }>(`/organizer/events/${encodeURIComponent(id)}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;
        setDetail(response.data.data);
        setNeedsRecheck(false);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, revision]);

  useEffect(() => {
    const owner = detail?.organizer_id;
    if (!owner) return;
    const controller = new AbortController();
    const signal = controller.signal;
    setOrganizer(null);
    setContact(null);
    setExtraError("");
    async function applications() {
      let page = 0;
      // The existing API has no owner filter. Read pages newest-first and match
      // the approved application to this event's owner, never to its display name.
      while (!signal.aborted) {
        const response = await api.get<{ data: ApplicationPage }>(
          "/admin/organizer-applications",
          {
            params: { status: "APPROVED", page, limit: 50 },
            signal,
          },
        );
        const data = response.data.data;
        const match = data.items.find((item) => item.user_id === owner);
        if (match) return match;
        page += 1;
        if (page >= data.pagination.totalPages) return null;
      }
      return null;
    }
    void Promise.allSettled([
      api.get<{ data: Organizer[] }>("/admin/organizers/summaries", {
        params: { ids: owner },
        signal,
      }),
      applications(),
    ]).then(([summary, application]) => {
      if (signal.aborted) return;
      if (summary.status === "fulfilled") {
        setOrganizer(summary.value.data.data.find((item) => item.id === owner) ?? null);
      }
      if (application.status === "fulfilled") setContact(application.value);
      if (summary.status === "rejected" || application.status === "rejected") {
        setExtraError(
          "Một số thông tin ban tổ chức chưa tải được. Bạn có thể tải lại trang dữ liệu.",
        );
      }
    });
    return () => controller.abort();
  }, [detail?.organizer_id, revision]);

  function developing() {
    setToast((previous) => ({
      text: developmentMessage,
      serial: (previous?.serial ?? 0) + 1,
    }));
  }

  function openDecision(next: "approve" | "reject", button: HTMLButtonElement) {
    if (sending.current || needsRecheck || detail?.status !== "PENDING_REVIEW") return;
    trigger.current = button;
    setDecisionError("");
    setMode(next);
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      sending.current ||
      !detail ||
      !mode ||
      needsRecheck ||
      detail.status !== "PENDING_REVIEW"
    )
      return;
    const trimmed = reason.trim();
    if (trimmed.length > 2000 || (mode === "reject" && !trimmed)) return;
    sending.current = true;
    setBusy(true);
    setDecisionError("");
    setSuccess("");
    const approve = mode === "approve";
    try {
      const response = await api.post<{ data: Partial<EventDetail> }>(
        `/admin/events/${detail.id}/review`,
        {
          approve,
          reason: trimmed,
        },
      );
      if (!alive.current) return;
      setDetail((current) => (current ? { ...current, ...response.data.data } : current));
      setSuccess(
        approve
          ? "Đã phê duyệt sự kiện. Thời gian mở bán theo cấu hình từng hạng vé."
          : "Đã từ chối sự kiện.",
      );
      setMode(null);
      setReason("");
      setRevision((value) => value + 1);
    } catch (cause) {
      if (!alive.current) return;
      setNeedsRecheck(true);
      const text = `${message(cause)} Đang kiểm tra lại trạng thái sự kiện trước khi cho phép gửi tiếp.`;
      setDecisionError(text);
      // A timeout may happen after the transaction committed. Re-read instead
      // of blindly retrying the mutation; remain locked if this GET also fails.
      try {
        const fresh = await api.get<{ data: EventDetail }>(
          `/organizer/events/${detail.id}`,
        );
        if (!alive.current) return;
        setDetail(fresh.data.data);
        setNeedsRecheck(false);
        setDecisionError(
          `${message(cause)} Đã tải lại trạng thái. Hãy kiểm tra thông tin trước khi quyết định tiếp.`,
        );
        setMode(null);
      } catch {
        if (alive.current)
          setDecisionError(
            `${message(cause)} Chưa kiểm tra lại được trạng thái. Hãy đóng hộp thoại và tải lại dữ liệu.`,
          );
      }
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const types = detail?.ticketTypes.filter((type) => !type.archived_at) ?? [];
  const capacity = types.reduce((total, type) => total + type.capacity, 0);
  const canDecide =
    detail?.status === "PENDING_REVIEW" && !busy && !loading && !needsRecheck;
  const organizationName =
    organizer?.organization_name || organizer?.account_name || "Chưa có thông tin";
  const lastReview = detail?.reviews[0];

  return (
    <AdminShell title="Phê duyệt chi tiết sự kiện">
      <div className="c9-page">
        <style>{styles}</style>
        <div className="c9-meta">
          <nav aria-label="Vị trí trang" className="c9-breadcrumb">
            <span>SỰ KIỆN &amp; KIỂM DUYỆT</span>
            <span aria-hidden="true">/</span>
            <Link to={back}>HÀNG ĐỢI DUYỆT</Link>
            <span aria-hidden="true">/</span>
            <span className="c9-id">{id}</span>
          </nav>
          <Developing onClick={developing} className="c9-sla">
            <Clock3 size={14} /> SLA THẨM ĐỊNH:{" "}
            {/* <span>PRIORITY: — · Đang phát triển</span> */}
          </Developing>
        </div>
        <div className="c9-navigation">
          <Link to={back}>
            <ArrowLeft size={16} /> Trở lại hàng đợi
          </Link>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading || busy}
          >
            <RefreshCw size={15} className={loading ? "c9-spinning" : ""} /> Tải lại dữ
            liệu
          </button>
        </div>
        {success && (
          <div role="status" className="c9-notice c9-success">
            <CheckCircle2 size={19} />
            {success}
          </div>
        )}
        {decisionError && !mode && (
          <div role="alert" className="c9-notice">
            {decisionError}
          </div>
        )}
        {extraError && (
          <div role="alert" className="c9-notice">
            {extraError}
          </div>
        )}
        {loading && (
          <div className="c9-loading" role="status" aria-busy="true">
            <RefreshCw className="c9-spinning" />
            Đang tải hồ sơ sự kiện…
          </div>
        )}
        {!loading && error && (
          <section className="c9-error" role="alert">
            <Info size={27} />
            <h1>Không tải được chi tiết sự kiện</h1>
            <p>{error}</p>
            <button type="button" onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </button>
          </section>
        )}
        {!loading && detail && (
          <>
            <section className="c9-hero">
              <div className="c9-banner">
                <Cover
                  key={detail.cover_image_url}
                  src={detail.cover_image_url}
                  title={detail.title}
                />
                <div className="c9-badges">
                  <span className={`c9-badge c9-status-${detail.status.toLowerCase()}`}>
                    {statuses[detail.status] ?? detail.status}
                  </span>
                  <Developing onClick={developing}>
                    TIER 1 VERIFIED BTC 
                  </Developing>
                  <span className="c9-badge">
                    QUY MÔ: {capacity.toLocaleString("vi-VN")} VÉ
                  </span>
                  <Developing onClick={developing} className="c9-pink">
                    ESCROW SECURE 
                  </Developing>
                </div>
                <span className="c9-banner-label">EVENT BANNER</span>
              </div>
              <div className="c9-command">
                <div className="c9-title">
                  <h1>{detail.title}</h1>
                  <p>
                    <CalendarDays size={16} />
                    <span>
                      {dateTime(detail.starts_at)} – {dateTime(detail.ends_at)} (UTC+7)
                    </span>
                  </p>
                  <p>
                    <MapPin size={16} />
                    <span>
                      {[detail.venue_name, detail.address, detail.city_code]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                </div>
                <div className="c9-actions">
                  <Developing onClick={developing}>
                    <FileArchive size={17} />
                    Tải ZIP Hồ Sơ
                  </Developing>
                  <button
                    type="button"
                    className="c9-reject"
                    disabled={!canDecide}
                    onClick={(event) => openDecision("reject", event.currentTarget)}
                  >
                    <XCircle size={17} />
                    Từ Chối
                  </button>
                  <Developing onClick={developing}>
                    <Zap size={17} />
                    Yêu Cầu Bổ Sung
                  </Developing>
                  <button
                    type="button"
                    className="c9-approve"
                    disabled={!canDecide}
                    onClick={(event) => openDecision("approve", event.currentTarget)}
                  >
                    <CheckCircle2 size={18} />
                    Phê Duyệt &amp; Mở Bán
                  </button>
                </div>
              </div>
            </section>
            {detail.status !== "PENDING_REVIEW" && (
              <p className="c9-state-note" role="status">
                Sự kiện {statuses[detail.status]?.toLowerCase() ?? detail.status}; chỉ hồ
                sơ đang chờ duyệt mới được ra quyết định.
              </p>
            )}
            <div className="c9-workspace">
              <div className="c9-left">
                <section className="c9-panel c9-organizer">
                  <div className="c9-panel-heading">
                    <div className="c9-module">
                      <span className="c9-module-icon">
                        <Building2 size={21} />
                      </span>
                      <div>
                        <small>MODULE A</small>
                        <h2>Tổng quan &amp; Pháp nhân Ban Tổ Chức</h2>
                      </div>
                    </div>
                    <Developing onClick={developing} className="c9-kyc">
                      KYC CẤP CAO
                    </Developing>
                  </div>
                  <div className="c9-overview">
                    <div className="c9-poster">
                      <Cover
                        key={detail.cover_image_url}
                        src={detail.cover_image_url}
                        title={detail.title}
                      />
                      <Developing onClick={developing}>
                        KEY VISUAL APPROVED
                      </Developing>
                    </div>
                    <div className="c9-organizer-info">
                      <dl className="c9-credentials">
                        <div>
                          <dt>ĐƠN VỊ TỔ CHỨC</dt>
                          <dd>{organizationName}</dd>
                          <small>UID: {detail.organizer_id}</small>
                        </div>
                        <div>
                          <dt>ĐẠI DIỆN PHÁP LUẬT</dt>
                          <dd>Chưa có dữ liệu xác minh</dd>
                          <small>
                            Người liên hệ:{" "}
                            {organizer?.contact_name || "Chưa có thông tin"}
                          </small>
                        </div>
                        <div>
                          <dt>LIÊN HỆ KHẨN CẤP</dt>
                          <dd>{contact?.contact_phone || "Chưa có thông tin"}</dd>
                          <small>Liên hệ trong hồ sơ BTC</small>
                        </div>
                        <div>
                          <dt>HỘP THƯ CHÍNH THỨC</dt>
                          <dd>{contact?.contact_email || "Chưa có thông tin"}</dd>
                          <Developing onClick={developing} className="c9-text-control">
                            PGP
                          </Developing>
                        </div>
                      </dl>
                      <div className="c9-financial">
                        <div>
                          <span>TỔNG PHÁT HÀNH</span>
                          <strong>—</strong>
                          <small>Quy mô {capacity.toLocaleString("vi-VN")} vé</small>
                        </div>
                        <Developing onClick={developing}>
                          <span>DỰ KIẾN GMV TỐI ĐA</span>
                          <strong>—</strong>
                              </Developing>
                        <Developing onClick={developing} className="c9-pink">
                          <span>PHÍ SÀN 5% (EST.)</span>
                          <strong>—</strong>
                          
                        </Developing>
                      </div>
                    </div>
                  </div>
                  <div className="c9-description">
                    <h3>Nội dung sự kiện</h3>
                    <p>{detail.description || "Chưa có mô tả sự kiện."}</p>
                    <small>Tiếp nhận: {dateTime(detail.submitted_at)}</small>
                  </div>
                </section>
                <section className="c9-panel c9-tickets">
                  <div className="c9-panel-heading">
                    <div className="c9-module">
                      <span className="c9-module-icon c9-pink">
                        <Ticket size={21} />
                      </span>
                      <div>
                        <small>MODULE C</small>
                        <h2>Cơ cấu hạng vé &amp; Cấu hình Chống Bot / Phe vé</h2>
                      </div>
                    </div>
                    <Developing onClick={developing} className="c9-kyc">
                      DYNAMIC QR
                    </Developing>
                  </div>
                  <div
                    className="c9-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Bảng hạng vé, có thể cuộn ngang"
                  >
                    <table>
                      <caption className="c9-sr-only">
                        Các hạng vé đang hoạt động của sự kiện
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Hạng Vé</th>
                          <th scope="col">Số Lượng</th>
                          <th scope="col">Đơn Giá (VNĐ)</th>
                          <th scope="col">Tổng Doanh Thu</th>
                          <th scope="col">Trạng Thái Kho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {types.map((type) => (
                          <tr key={type.id}>
                            <th scope="row">
                              <span className="c9-ticket-name">{type.name}</span>
                              <small>{type.id}</small>
                            </th>
                            <td>{type.capacity.toLocaleString("vi-VN")} vé</td>
                            <td className="c9-price">{money(type.price_amount)}</td>
                            <td>—</td>
                            <td>
                              <span className="c9-stock">
                                {detail.status === "PENDING_REVIEW"
                                  ? "Chờ phê duyệt"
                                  : detail.status === "PUBLISHED"
                                    ? detail.sales_paused
                                      ? "Tạm dừng bán"
                                      : "Theo lịch mở bán"
                                    : "Chưa mở bán"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!types.length && (
                          <tr>
                            <td colSpan={5} className="c9-empty">
                              Chưa có hạng vé đang hoạt động.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="c9-guard-specs">
                    <Developing onClick={developing}>
                      <BadgeCheck size={21} />
                      <span>
                        <b>Định Danh Nghiêm Ngặt</b>
                        <small>Giới hạn vé theo CCCD / SĐT </small>
                      </span>
                    </Developing>
                    <Developing onClick={developing}>
                      <QrCode size={21} />
                      <span>
                        <b>Dynamic QR 45 giây</b>
                        <small>Mã QR động</small>
                      </span>
                    </Developing>
                    <Developing onClick={developing} className="c9-pink">
                      <ShieldCheck size={21} />
                      <span>
                        <b>Escrow Anti-Dump</b>
                        <small>Khóa chuyển nhượng 72h</small>
                      </span>
                    </Developing>
                  </div>
                </section>
              </div>
              <div className="c9-right">
                <section className="c9-panel c9-ai">
                  <div className="c9-panel-heading">
                    <h2>
                      <Bot size={22} />
                      Cosmic AI Validator
                    </h2>
                    {/* <Developing onClick={developing} className="c9-kyc">
                      Đang phát triển
                    </Developing> */}
                  </div>
                  <Developing onClick={developing} className="c9-risk">
                    <span className="c9-gauge">
                      <b>—</b>
                      <small>/ 100</small>
                    </span>
                    <span>
                      <b>CHƯA CÓ ĐÁNH GIÁ</b>
                      <small>Rủi ro &amp; điều kiện mở bán</small>
                      <small>Độ tin cậy mô hình: —</small>
                    </span>
                  </Developing>
                  <div className="c9-insights">
                    {[
                      "Đối chiếu mã số thuế & pháp nhân",
                      "Lịch sử tổ chức & tỷ lệ check-in",
                      "Kiểm duyệt nội dung & hình ảnh",
                    ].map((label) => (
                      <Developing key={label} onClick={developing}>
                        <Info size={15} />
                        <span>
                          {label}
                          
                        </span>
                      </Developing>
                    ))}
                  </div>
                </section>
                <section
                  className="c9-panel c9-signoff"
                  aria-label="Ý kiến và quyết định kiểm duyệt"
                >
                  <label htmlFor="c9-review-note">Ý KIẾN KIỂM DUYỆT CỦA ADMIN</label>
                  <textarea
                    id="c9-review-note"
                    rows={4}
                    maxLength={2000}
                    value={reason}
                    disabled={!canDecide}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Nhập ý kiến kiểm duyệt hoặc lý do từ chối…"
                  />
                  <small>
                    Lưu cùng quyết định duyệt / từ chối · {reason.length}/2000
                  </small>
                  <div className="c9-signer">
                    <span className="c9-avatar">
                      <UserRound size={20} />
                    </span>
                    <div>
                      <b>{user?.name || "Quản trị viên"}</b>
                      <span>{user?.email}</span>
                      <small>{user?.phone || "ADMIN"}</small>
                    </div>
                    <Developing onClick={developing}>
                      ROOT SIGN
                    </Developing>
                  </div>
                  {lastReview && (
                    <div className="c9-last-review">
                      <b>
                        {lastReview.decision === "APPROVED"
                          ? "Đã phê duyệt"
                          : "Đã từ chối"}
                      </b>
                      <small>{dateTime(lastReview.created_at)}</small>
                      {lastReview.reason && <p>{lastReview.reason}</p>}
                    </div>
                  )}
                  <button
                    type="button"
                    className="c9-sign-button"
                    disabled={!canDecide}
                    onClick={(event) => openDecision("approve", event.currentTarget)}
                  >
                    <BadgeCheck size={20} />
                    KÝ DUYỆT SỰ KIỆN NÀY
                  </button>
                </section>
              </div>
            </div>
          </>
        )}
        <div
          className="c9-toast-live"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {toast && (
            <div className="c9-toast" key={toast.serial}>
              <Info size={19} />
              <span>{toast.text}</span>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => setToast(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}
        </div>
        <Dialog.Root
          open={mode !== null}
          onOpenChange={(open) => {
            if (!open && !sending.current) setMode(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="c9-dialog-overlay" />
            <Dialog.Content
              className="c9-dialog"
              onEscapeKeyDown={(event) => {
                if (sending.current) event.preventDefault();
              }}
              onInteractOutside={(event) => {
                if (sending.current) event.preventDefault();
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus();
              }}
            >
              <Dialog.Title>
                {mode === "reject" ? "Từ chối sự kiện" : "Phê duyệt sự kiện"}
              </Dialog.Title>
              <Dialog.Description>
                {detail?.title}.{" "}
                {mode === "reject"
                  ? "Vui lòng ghi rõ lý do để ban tổ chức điều chỉnh."
                  : "Sự kiện sẽ được công khai. Việc bán vé tuân theo lịch và cấu hình hiện tại."}
              </Dialog.Description>
              <form onSubmit={(event) => void submitDecision(event)}>
                <label htmlFor="c9-confirm-reason">
                  {mode === "reject"
                    ? "Lý do từ chối (bắt buộc)"
                    : "Ý kiến kiểm duyệt (không bắt buộc)"}
                </label>
                <textarea
                  id="c9-confirm-reason"
                  rows={4}
                  value={reason}
                  maxLength={2000}
                  required={mode === "reject"}
                  disabled={busy}
                  onChange={(event) => setReason(event.target.value)}
                />
                <small>{reason.length}/2000 ký tự</small>
                {decisionError && (
                  <p role="alert" className="c9-dialog-error">
                    {decisionError}
                  </p>
                )}
                <div className="c9-dialog-actions">
                  <Dialog.Close asChild>
                    <button type="button" disabled={busy}>
                      Hủy
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    className={mode === "reject" ? "c9-reject" : "c9-approve"}
                    disabled={
                      !canDecide ||
                      reason.trim().length > 2000 ||
                      (mode === "reject" && !reason.trim())
                    }
                  >
                    {busy
                      ? "Đang gửi…"
                      : mode === "reject"
                        ? "Xác nhận từ chối"
                        : "Xác nhận phê duyệt"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AdminShell>
  );
}

const styles = `
.c9-page {
  --c9-surface: #181b2a;
  --c9-card: #1c1f2f;
  --c9-cyan: #5de6ff;
  --c9-purple: #d2bbff;
  --c9-muted: #a39bae;
  min-width: 0;
  padding: 24px 24px 48px;
  color: #e0e1f7;
  font:
    13px/1.6 "Be Vietnam Pro",
    sans-serif;
}
.c9-page *,
.c9-dialog * {
  box-sizing: border-box;
}
.c9-page h1,
.c9-page h2,
.c9-page h3 {
  margin: 0;
  color: #e0e1f7;
  font-family: Be Vietnam Pro, "Be Vietnam Pro", sans-serif;
}
.c9-page h1 {
  font-size: clamp(23px, 2.1vw, 34px);
  line-height: 1.35;
}
.c9-page h2 {
  font-size: 19px;
  line-height: 1.4;
}
.c9-page h3 {
  font-size: 14px;
}
.c9-page p {
  margin: 0;
}
.c9-page small {
  display: block;
  font-size: 10px;
  line-height: 1.6;
  color: var(--c9-muted);
}
.c9-page button,
.c9-dialog button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 9px 12px;
  background: #262939;
  color: #e0e1f7;
  font:
    600 12px/1.5 "Be Vietnam Pro",
    sans-serif;
  cursor: pointer;
}
.c9-page button:hover,
.c9-dialog button:hover {
  filter: brightness(1.13);
}
.c9-page button:disabled,
.c9-dialog button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.c9-page a {
  color: var(--c9-cyan);
  text-decoration: none;
}
.c9-page :is(button, a, textarea, [tabindex]):focus-visible,
.c9-dialog :is(button, textarea):focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 3px;
}
.c9-page svg,
.c9-dialog svg {
  flex-shrink: 0;
}
.c9-meta,
.c9-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.c9-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font:
    10px/1.7 "Space Grotesk",
    sans-serif;
  letter-spacing: 0.04em;
  color: var(--c9-muted);
}
.c9-id {
  color: var(--c9-cyan);
  overflow-wrap: anywhere;
}
.c9-page .c9-sla {
  border-radius: 30px;
  padding: 7px 13px;
  font-size: 10px;
  color: var(--c9-cyan);
  flex-wrap: wrap;
}
.c9-sla span {
  color: var(--c9-muted);
}
.c9-navigation a {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  font-size: 12px;
}
.c9-navigation button {
  padding: 6px 10px;
  font-size: 11px;
}
.c9-hero {
  overflow: hidden;
  border: 1px solid #31344566;
  border-radius: 12px;
  background: var(--c9-surface);
  margin-bottom: 24px;
}
.c9-banner {
  position: relative;
  height: 224px;
  background: #0a0d1c;
}
.c9-banner > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.c9-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #181b2a, #181b2a66 55%, #080b1a33);
  pointer-events: none;
}
.c9-badges {
  position: absolute;
  z-index: 1;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}
.c9-badge,
.c9-page .c9-badges button {
  padding: 5px 9px;
  font:
    600 10px/1.6 "Space Grotesk",
    sans-serif;
  border-radius: 5px;
  background: #181b2ad9;
  border: 1px solid #5de6ff33;
  color: var(--c9-cyan);
  backdrop-filter: blur(12px);
}
.c9-page .c9-badges button {
  display: block;
  text-align: left;
  color: var(--c9-purple);
}
.c9-badges small {
  font-size: 9px;
}
.c9-banner-label {
  position: absolute;
  z-index: 1;
  right: 16px;
  bottom: 16px;
  color: var(--c9-cyan);
  font:
    10px "Space Grotesk",
    sans-serif;
  background: #0a0d1ccc;
  padding: 7px 12px;
  border: 1px solid #5de6ff33;
  border-radius: 20px;
}
.c9-image-empty {
  display: flex;
  flex-direction: column;
  gap: 9px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 180px;
  color: #958da1;
  background: linear-gradient(135deg, #1c1f2f, #262939);
}
.c9-command {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 16px 24px 24px;
}
.c9-title {
  min-width: 0;
}
.c9-title h1 {
  overflow-wrap: anywhere;
  margin-bottom: 12px;
}
.c9-title p {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #ccc3d8;
  margin-top: 5px;
  font-size: 12px;
}
.c9-title p svg {
  color: var(--c9-cyan);
  margin-top: 3px;
}
.c9-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.c9-page .c9-reject,
.c9-dialog .c9-reject {
  background: #93000a;
  color: #ffdad6;
}
.c9-page .c9-approve,
.c9-dialog .c9-approve {
  background: #5de6ff;
  color: #00363e;
}
.c9-page .c9-approve {
  box-shadow: 0 0 24px #5de6ff30;
}
.c9-workspace {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(275px, 1fr);
  gap: 24px;
  align-items: start;
}
.c9-left,
.c9-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.c9-panel {
  min-width: 0;
  padding: 24px;
  background: var(--c9-surface);
  border-radius: 12px;
}
.c9-panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.c9-module {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.c9-module small {
  font:
    10px/1.6 "Space Grotesk",
    sans-serif;
  letter-spacing: 0.1em;
}
.c9-module-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: #d2bbff22;
  color: var(--c9-purple);
  border-radius: 8px;
}
.c9-page .c9-kyc {
  display: block;
  background: #5de6ff15;
  color: var(--c9-cyan);
  font-size: 9px;
  padding: 5px 8px;
  text-align: left;
}
.c9-overview {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) minmax(0, 2fr);
  gap: 16px;
}
.c9-poster {
  position: relative;
  min-height: 280px;
  overflow: hidden;
  border-radius: 8px;
  background: #0a0d1c;
}
.c9-poster > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.c9-poster .c9-image-empty {
  height: 100%;
}
.c9-page .c9-poster button {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0;
  display: block;
  text-align: left;
  font-size: 10px;
  padding: 32px 12px 12px;
  background: linear-gradient(transparent, #0a0d1c);
  color: var(--c9-cyan);
}
.c9-organizer-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}
.c9-credentials {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 16px;
  margin: 0;
  border-radius: 8px;
  background: var(--c9-card);
}
.c9-credentials dt {
  font:
    10px/1.6 "Space Grotesk",
    sans-serif;
  color: var(--c9-muted);
  margin-bottom: 5px;
}
.c9-credentials dd {
  font-size: 12px;
  font-weight: 600;
  margin: 0;
  overflow-wrap: anywhere;
}
.c9-credentials small {
  overflow-wrap: anywhere;
}
.c9-page .c9-text-control {
  padding: 0;
  background: none;
  color: var(--c9-purple);
  font-size: 10px;
  text-align: left;
}
.c9-financial {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}
.c9-financial > div,
.c9-page .c9-financial > button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
  padding: 12px;
  border-radius: 8px;
  background: #262939;
}
.c9-financial span {
  color: var(--c9-muted);
  font:
    10px/1.5 "Space Grotesk",
    sans-serif;
}
.c9-financial strong {
  font:
    700 24px/1.5 Be Vietnam Pro,
    sans-serif;
  color: var(--c9-cyan);
}
.c9-financial small {
  font-size: 9px;
}
.c9-description {
  margin-top: 18px;
  border-top: 1px solid #313445;
  padding-top: 16px;
}
.c9-description p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #ccc3d8;
  margin: 8px 0;
}
.c9-table-scroll {
  max-width: 100%;
  overflow-x: auto;
  border-radius: 8px;
}
.c9-table-scroll table {
  width: 100%;
  min-width: 540px;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}
.c9-table-scroll thead {
  background: #1c1f2f;
  color: var(--c9-muted);
  font:
    10px/1.5 "Space Grotesk",
    sans-serif;
  text-transform: uppercase;
}
.c9-table-scroll th,
.c9-table-scroll td {
  padding: 13px 12px;
}
.c9-table-scroll tbody tr {
  border-bottom: 1px solid #31344566;
}
.c9-table-scroll tbody th {
  width: 30%;
  font-weight: 600;
}
.c9-table-scroll th small {
  font-size: 9px;
  overflow-wrap: anywhere;
  max-width: 160px;
}
.c9-price {
  color: var(--c9-cyan);
  white-space: nowrap;
}
.c9-stock {
  color: var(--c9-cyan);
  font-size: 10px;
  background: #262939;
  padding: 4px 6px;
  border-radius: 4px;
  display: inline-block;
}
.c9-guard-specs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  padding: 14px;
  margin-top: 18px;
  background: var(--c9-card);
  border-radius: 8px;
}
.c9-page .c9-guard-specs button {
  padding: 0;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
  background: none;
  color: var(--c9-cyan);
}
.c9-guard-specs b {
  display: block;
  color: #e0e1f7;
  font-size: 11px;
}
.c9-guard-specs small {
  margin-top: 5px;
  font-weight: 400;
}
.c9-ai h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.c9-ai h2 svg {
  color: var(--c9-cyan);
}
.c9-page .c9-risk {
  display: flex;
  width: 100%;
  padding: 16px;
  gap: 16px;
  text-align: left;
  justify-content: flex-start;
  background: var(--c9-card);
}
.c9-gauge {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border: 7px solid #313445;
  border-top-color: #5de6ff;
  border-radius: 50%;
}
.c9-gauge b {
  font:
    800 30px Be Vietnam Pro,
    sans-serif;
}
.c9-risk > span:last-child b {
  color: var(--c9-cyan);
  font-size: 10px;
}
.c9-risk small {
  font-weight: 400;
  margin-top: 4px;
}
.c9-insights {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}
.c9-page .c9-insights button {
  text-align: left;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 7px;
  background: #1c1f2f66;
  font-size: 11px;
  font-weight: 400;
}
.c9-insights svg {
  color: var(--c9-cyan);
  margin-top: 2px;
}
.c9-signoff {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.c9-signoff label {
  font:
    10px/1.6 "Space Grotesk",
    sans-serif;
  color: var(--c9-muted);
  letter-spacing: 0.05em;
}
.c9-page textarea,
.c9-dialog textarea {
  display: block;
  width: 100%;
  min-height: 110px;
  resize: vertical;
  padding: 12px;
  border: 1px solid #313445;
  border-radius: 8px;
  background: #1c1f2f;
  color: #e0e1f7;
  font:
    12px/1.7 "Be Vietnam Pro",
    sans-serif;
}
.c9-page textarea:disabled {
  opacity: 0.65;
}
.c9-signer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: var(--c9-card);
  flex-wrap: wrap;
}
.c9-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  background: var(--c9-purple);
  color: #3f008e;
  border-radius: 50%;
  flex-shrink: 0;
}
.c9-signer > div {
  flex: 1;
  min-width: 0;
}
.c9-signer b {
  display: block;
  font-size: 12px;
}
.c9-signer > div span {
  display: block;
  color: var(--c9-purple);
  font-size: 10px;
  overflow-wrap: anywhere;
}
.c9-page .c9-signer button {
  display: block;
  background: #5de6ff15;
  color: var(--c9-cyan);
  padding: 5px;
  font-size: 9px;
}
.c9-signer button small {
  font-size: 8px;
}
.c9-page .c9-sign-button {
  margin-top: 8px;
  padding: 12px;
  background: #7c3aed;
  color: #ede0ff;
  box-shadow: 0 0 20px #7c3aed33;
  width: 100%;
}
.c9-page .c9-pink {
  color: #ffafd3;
}
.c9-last-review {
  padding: 12px;
  border: 1px solid #313445;
  border-radius: 8px;
}
.c9-last-review p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin-top: 6px;
}
.c9-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid #ffb4ab44;
  border-radius: 8px;
  background: #93000a22;
  color: #ffdad6;
  margin-bottom: 18px;
}
.c9-success {
  border-color: #5de6ff44;
  background: #5de6ff0d;
  color: var(--c9-cyan);
}
.c9-state-note {
  color: var(--c9-purple);
  padding-bottom: 18px;
}
.c9-loading,
.c9-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 330px;
  background: var(--c9-surface);
  border-radius: 12px;
}
.c9-error {
  flex-direction: column;
  text-align: center;
  padding: 24px;
}
.c9-error h1 {
  font-size: 22px;
}
.c9-toast-live {
  position: fixed;
  z-index: 85;
  right: 20px;
  bottom: 20px;
  max-width: min(430px, calc(100vw - 32px));
  pointer-events: none;
}
.c9-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #182240;
  color: #f8fafc;
  border: 1px solid #5de6ff66;
  border-radius: 10px;
  box-shadow: 0 8px 32px #0005;
  pointer-events: auto;
  font-size: 12px;
}
.c9-toast > svg {
  color: var(--c9-cyan);
}
.c9-page .c9-toast button {
  padding: 3px;
  background: none;
}
.c9-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #050715b8;
  backdrop-filter: blur(5px);
}
.c9-dialog {
  position: fixed;
  z-index: 101;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  border: 1px solid #4a4455;
  border-radius: 14px;
  padding: 24px;
  background: #181b2a;
  color: #e0e1f7;
  box-shadow: 0 16px 60px #0008;
  font:
    13px/1.7 "Be Vietnam Pro",
    sans-serif;
}
.c9-dialog h2 {
  margin: 0;
  font:
    700 22px/1.4 Be Vietnam Pro,
    "Be Vietnam Pro",
    sans-serif;
}
.c9-dialog p {
  color: #ccc3d8;
  margin: 12px 0 18px;
  overflow-wrap: anywhere;
}
.c9-dialog label {
  display: block;
  margin-bottom: 8px;
}
.c9-dialog small {
  color: #a39bae;
}
.c9-dialog-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}
.c9-dialog .c9-dialog-error {
  color: #ffb4ab;
}
.c9-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.c9-spinning {
  animation: c9-spin 1s linear infinite;
}
@keyframes c9-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 1280px) {
  .c9-command {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .c9-title {
    flex: 1;
  }
  .c9-actions {
    flex: 0 1 410px;
    justify-content: flex-end;
  }
}
@media (max-width: 1200px) {
  .c9-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .c9-right {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
@media (max-width: 800px) {
  .c9-page {
    padding: 18px 16px 86px;
  }
  .c9-overview {
    grid-template-columns: minmax(120px, 1fr) minmax(0, 2fr);
  }
  .c9-right {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 560px) {
  .c9-panel,
  .c9-command {
    padding: 18px;
  }
  .c9-banner {
    height: 215px;
  }
  .c9-badges {
    top: 12px;
    left: 12px;
    right: 12px;
    gap: 6px;
  }
  .c9-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .c9-actions button {
    width: 100%;
    font-size: 10px;
    padding: 10px 8px;
  }
  .c9-overview {
    grid-template-columns: minmax(0, 1fr);
  }
  .c9-poster {
    min-height: 220px;
  }
  .c9-guard-specs {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .c9-workspace,
  .c9-left,
  .c9-right {
    gap: 18px;
  }
  .c9-credentials {
    gap: 12px;
    padding: 12px;
  }
  .c9-credentials dd {
    font-size: 11px;
  }
  .c9-financial > div,
  .c9-page .c9-financial > button {
    padding: 9px;
  }
  .c9-financial span {
    font-size: 9px;
  }
  .c9-meta {
    margin-bottom: 12px;
  }
  .c9-toast-live {
    bottom: 16px;
    right: 16px;
  }
  .c9-dialog {
    padding: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .c9-spinning {
    animation: none;
  }
}
`;
