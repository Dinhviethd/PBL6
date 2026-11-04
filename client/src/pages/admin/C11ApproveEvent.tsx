import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import axios from "axios";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  ImageOff,
  Inbox,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
  X,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { AdminShell } from "./AdminShell";

type EventItem = {
  id: string;
  title: string;
  category_id: string | null;
  organizer_id: string | null;
  cover_image_url: string | null;
  venue_name: string;
  address: string;
  city_code: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

type TicketType = {
  id: string;
  name: string;
  price_amount: string;
  capacity: number;
  archived_at: string | null;
};

type EventDetail = EventItem & {
  description: string;
  submitted_at: string | null;
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
};

type EventPage = {
  items: EventItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type Category = { id: string; name: string };
type Mode = "detail" | "approve" | "reject";

const pageSize = 6;
const dateTime = (value: string | null) => {
  if (!value || Number.isNaN(Date.parse(value))) return "Chưa có thông tin";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
};
const money = (value: string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(BigInt(value));
const errorMessage = (cause: unknown) => {
  if (axios.isAxiosError(cause)) {
    return String(
      cause.response?.data?.message ??
        "Không kết nối được máy chủ. Hãy thử lại.",
    );
  }
  return cause instanceof Error ? cause.message : "Không tải được dữ liệu.";
};
const activeTypes = (event: EventDetail) =>
  event.ticketTypes.filter((type) => !type.archived_at);

export function C11ApproveEvent() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialQuery = new URLSearchParams(location.search);
  const [search, setSearch] = useState(initialQuery.get("q") ?? "");
  const [filters, setFilters] = useState({
    q: initialQuery.get("q") ?? "",
    categoryId: initialQuery.get("categoryId") ?? "",
  });
  const [categoryId, setCategoryId] = useState(initialQuery.get("categoryId") ?? "");
  const [page, setPage] = useState(() => {
    const value = Number(initialQuery.get("page") ?? 0);
    return Number.isInteger(value) && value >= 0 && value <= 10000 ? value : 0;
  });
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<EventPage | null>(null);
  const [details, setDetails] = useState<Record<string, EventDetail>>({});
  const [organizers, setOrganizers] = useState<Record<string, Organizer>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extraError, setExtraError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [dialogError, setDialogError] = useState("");
  const [mode, setMode] = useState<Mode>("detail");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const sending = useRef(false);
  const alive = useRef(true);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setOptionsError("");
    api
      .get<{ data: { categories: Category[] } }>(
        "/admin/events/filter-options",
        {
          signal: controller.signal,
        },
      )
      .then((response) => {
        if (!controller.signal.aborted)
          setCategories(response.data.data.categories);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setOptionsError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    async function load() {
      setLoading(true);
      setError("");
      setExtraError("");
      setDetails({});
      setOrganizers({});
      try {
        const response = await api.get<{ data: EventPage }>("/admin/events", {
          params: {
            status: "PENDING_REVIEW",
            page,
            limit: pageSize,
            ...(filters.q ? { q: filters.q } : {}),
            ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          },
          signal,
        });
        if (signal.aborted) return;
        const next = response.data.data;
        setResult(next);
        if (page > 0 && page >= next.pagination.totalPages) {
          setPage(Math.max(0, next.pagination.totalPages - 1));
          return;
        }
        const organizerIds = [
          ...new Set(
            next.items
              .map((item) => item.organizer_id)
              .filter((id): id is string => !!id),
          ),
        ];
        const [eventResults, organizerResult] = await Promise.all([
          Promise.allSettled(
            next.items.map(async (item) => {
              const response = await api.get<{ data: EventDetail }>(
                `/organizer/events/${item.id}`,
                { signal },
              );
              return response.data.data;
            }),
          ),
          organizerIds.length
            ? api
                .get<{ data: Organizer[] }>("/admin/organizers/summaries", {
                  params: { ids: organizerIds.join(",") },
                  signal,
                })
                .then((response) => response.data.data)
                .catch(() => null)
            : Promise.resolve([]),
        ]);
        if (signal.aborted) return;
        const loaded = eventResults.flatMap((entry) =>
          entry.status === "fulfilled" ? [entry.value] : [],
        );
        setDetails(
          Object.fromEntries(loaded.map((event) => [event.id, event])),
        );
        setOrganizers(
          Object.fromEntries(
            (organizerResult ?? []).map((org) => [org.id, org]),
          ),
        );
        if (loaded.length !== next.items.length || organizerResult === null) {
          setExtraError(
            "Một số chi tiết sự kiện hoặc thông tin ban tổ chức chưa tải được. Hãy tải lại danh sách.",
          );
        }
      } catch (cause) {
        if (!signal.aborted) {
          setError(errorMessage(cause));
          setResult(null);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filters, page, refresh]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setDetail(null);
    setDetailLoading(true);
    setDialogError("");
    api
      .get<{ data: EventDetail }>(`/organizer/events/${selected.id}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;
        setDetail(response.data.data);
        setNeedsRecheck(false);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setDialogError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selected, detailRefresh]);

  function openEvent(event: EventItem, nextMode: Mode, target: HTMLElement) {
    opener.current = target;
    setDetail(null);
    setDialogError("");
    setReason("");
    setMode(nextMode);
    setNeedsRecheck(false);
    setSelected(event);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setFilters({ q: search.trim(), categoryId });
    saveQueueQuery(0, search.trim(), categoryId);
  }

  function saveQueueQuery(nextPage: number, q = filters.q, category = filters.categoryId) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (category) query.set("categoryId", category);
    if (nextPage) query.set("page", String(nextPage));
    navigate({ pathname: "/admin/events/review", search: query.toString() }, { replace: true });
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      sending.current ||
      !detail ||
      detail.status !== "PENDING_REVIEW" ||
      needsRecheck
    )
      return;
    if (mode === "detail" || (mode === "reject" && !reason.trim())) return;
    sending.current = true;
    setBusy(true);
    setDialogError("");
    const approve = mode === "approve";
    try {
      await api.post(`/admin/events/${detail.id}/review`, {
        approve,
        reason: approve ? "" : reason.trim(),
      });
      if (!alive.current) return;
      setNotice(
        approve
          ? `Đã phê duyệt và mở bán sự kiện “${detail.title}”.`
          : `Đã từ chối sự kiện “${detail.title}”.`,
      );
      setSelected(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (!alive.current) return;
      setNeedsRecheck(true);
      setDialogError(
        `${errorMessage(cause)} Tải lại chi tiết để kiểm tra trạng thái trước khi thực hiện tiếp.`,
      );
      setRefresh((value) => value + 1);
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const pagination = result?.pagination;
  const selectedCategory = categories.find(
    (category) => category.id === detail?.category_id,
  )?.name;
  const selectedOrganizer = detail?.organizer_id
    ? organizers[detail.organizer_id]
    : null;

  return (
    <AdminShell title="Hàng đợi duyệt sự kiện">
      <div className="c11-page">
        <style>{styles}</style>
        <nav className="c11-crumb" aria-label="Vị trí trang">
          <span>SỰ KIỆN &amp; KIỂM DUYỆT</span>
          <span aria-hidden="true">/</span>
          <b>HÀNG ĐỢI DUYỆT SỰ KIỆN</b>
        </nav>
        <header className="c11-heading">
          <h1>Hàng Đợi Thẩm Định &amp; Phê Duyệt Sự Kiện</h1>
          <p>
            Xem thông tin, kiểm tra các hạng vé và xét duyệt từng sự kiện trước
            khi công khai phòng vé.
          </p>
        </header>
        <section className="c11-toolbar" aria-label="Lọc danh sách chờ duyệt">
          <div className="c11-queue-label">
            <Inbox size={18} />
            Tất cả hàng đợi
            <span>
              {loading
                ? "…"
                : (pagination?.total.toLocaleString("vi-VN") ?? "—")}
            </span>
          </div>
          <form className="c11-filters" onSubmit={applyFilters}>
            <label className="c11-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="Tìm sự kiện chờ duyệt"
                placeholder="Tên sự kiện hoặc ban tổ chức"
                maxLength={200}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Thể loại sự kiện"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={!!optionsError}
            >
              <option value="">Thể loại: Tất cả</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="c11-filter-submit" type="submit">
              Tìm kiếm
            </button>
            <button
              className="c11-refresh"
              type="button"
              title="Làm mới"
              aria-label="Làm mới hàng đợi"
              disabled={loading}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw size={18} className={loading ? "c11-spin" : ""} />
            </button>
          </form>
        </section>
        {(error || extraError || optionsError) && (
          <div className="c11-alert" role="alert">
            <span>
              {error || extraError || `Không tải được bộ lọc: ${optionsError}`}
            </span>
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Thử lại
            </button>
          </div>
        )}
        {notice && (
          <div className="c11-notice" role="status">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}
        <section
          className="c11-list"
          aria-label="Sự kiện chờ phê duyệt"
          aria-busy={loading}
        >
          {loading ? (
            <div className="c11-state" role="status">
              <RefreshCw size={24} className="c11-spin" />
              Đang tải hàng đợi…
            </div>
          ) : !error && result?.items.length === 0 ? (
            <div className="c11-state">
              <Inbox size={32} />
              <h2>
                {filters.q || filters.categoryId
                  ? "Không tìm thấy sự kiện phù hợp"
                  : "Không có sự kiện chờ duyệt"}
              </h2>
              <p>
                {filters.q || filters.categoryId
                  ? "Thử tìm với tên hoặc thể loại khác."
                  : "Các sự kiện gửi duyệt sẽ xuất hiện tại đây."}
              </p>
              {(filters.q || filters.categoryId) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryId("");
                    setFilters({ q: "", categoryId: "" });
                    setPage(0);
                    saveQueueQuery(0, "", "");
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            !error &&
            result?.items.map((item) => {
              const event = details[item.id];
              const types = event ? activeTypes(event) : null;
              const capacity = types?.reduce(
                (sum, type) => sum + type.capacity,
                0,
              );
              const organizer = item.organizer_id
                ? organizers[item.organizer_id]
                : null;
              const category = categories.find(
                (entry) => entry.id === item.category_id,
              );
              return (
                <article className="c11-card" key={item.id}>
                  <div className="c11-card-meta">
                    <span className="c11-status">Chờ duyệt</span>
                    {category && (
                      <span className="c11-category">{category.name}</span>
                    )}
                    <span className="c11-received">
                      <Clock3 size={13} />
                      Tiếp nhận:{" "}
                      {event ? dateTime(event.submitted_at) : "Chưa tải được"}
                    </span>
                  </div>
                  <div className="c11-card-body">
                    <Link className="c11-poster" to={`/admin/events/review/${item.id}`} state={{ queueSearch: location.search }} aria-label={`Chi tiết sự kiện ${item.title}`}>
                      <Poster src={item.cover_image_url} title={item.title} />
                      {types && (
                        <div className="c11-poster-labels">
                          <span>{capacity?.toLocaleString("vi-VN")} vé</span>
                          <span>{types.length} hạng vé</span>
                        </div>
                      )}
                    </Link>
                    <div className="c11-event-info">
                      <h2><Link to={`/admin/events/review/${item.id}`} state={{ queueSearch: location.search }} style={{ color: "inherit", textDecoration: "none" }}>{item.title}</Link></h2>
                      <div className="c11-event-facts">
                        <p>
                          <Building2 size={16} />
                          <span>
                            BTC:{" "}
                            <strong>
                              {organizer?.organization_name ||
                                organizer?.account_name ||
                                "Chưa có thông tin"}
                            </strong>
                          </span>
                        </p>
                        <p>
                          <MapPin size={16} />
                          <span>
                            {item.venue_name}
                            {item.city_code ? ` · ${item.city_code}` : ""}
                          </span>
                        </p>
                        <p>
                          <CalendarDays size={16} />
                          <span>{dateTime(item.starts_at)}</span>
                        </p>
                      </div>
                      <div className="c11-ticket-tags">
                        {types?.map((type) => (
                          <span key={type.id}>
                            {type.name}: {money(type.price_amount)} (
                            {type.capacity.toLocaleString("vi-VN")} vé)
                          </span>
                        ))}
                        {types?.length === 0 && (
                          <span>Chưa có hạng vé đang hoạt động</span>
                        )}
                        {!types && <span>Chưa tải được thông tin hạng vé</span>}
                      </div>
                    </div>
                    <div className="c11-card-actions">
                      <button
                        className="c11-approve"
                        type="button"
                        onClick={(event) =>
                          openEvent(item, "approve", event.currentTarget)
                        }
                      >
                        <CheckCircle2 size={17} />
                        Phê duyệt
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/events/review/${item.id}`, { state: { queueSearch: location.search } })}
                        >
                          <Eye size={16} />
                          Xem chi tiết
                        </button>
                        <button
                          className="c11-reject"
                          type="button"
                          onClick={(event) =>
                            openEvent(item, "reject", event.currentTarget)
                          }
                        >
                          <XCircle size={16} />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
        {pagination && !error && (
          <footer className="c11-pagination">
            <span>
              {pagination.total.toLocaleString("vi-VN")} sự kiện phù hợp ·{" "}
              {pageSize} sự kiện / trang
            </span>
            <div>
              <button
                type="button"
                aria-label="Trang trước"
                disabled={page === 0 || loading}
                onClick={() => { setPage((value) => value - 1); saveQueueQuery(page - 1); }}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                Trang {pagination.totalPages ? page + 1 : 0} /{" "}
                {pagination.totalPages}
              </span>
              <button
                type="button"
                aria-label="Trang sau"
                disabled={loading || page + 1 >= pagination.totalPages}
                onClick={() => { setPage((value) => value + 1); saveQueueQuery(page + 1); }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        )}
        <Dialog.Root
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open && !sending.current) {
              setSelected(null);
              if (detail && detail.status !== "PENDING_REVIEW") {
                setRefresh((value) => value + 1);
              }
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="c11-dialog-overlay" />
            <Dialog.Content
              className="c11-dialog"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (opener.current?.isConnected) opener.current.focus();
                else
                  document.querySelector<HTMLElement>(".c11-refresh")?.focus();
              }}
              onEscapeKeyDown={(event) => {
                if (sending.current) event.preventDefault();
              }}
              onPointerDownOutside={(event) => {
                if (sending.current) event.preventDefault();
              }}
            >
              <Dialog.Title>
                {mode === "approve"
                  ? "Xác nhận phê duyệt"
                  : mode === "reject"
                    ? "Từ chối sự kiện"
                    : "Chi tiết sự kiện"}
              </Dialog.Title>
              <Dialog.Description>{selected?.title}</Dialog.Description>
              <Dialog.Close
                className="c11-dialog-close"
                aria-label="Đóng chi tiết"
                disabled={busy}
              >
                <X size={20} />
              </Dialog.Close>
              {detailLoading && <p role="status">Đang tải chi tiết sự kiện…</p>}
              {dialogError && (
                <div className="c11-alert" role="alert">
                  {dialogError}
                </div>
              )}
              {!detailLoading && (!detail || needsRecheck) && (
                <button
                  type="button"
                  className="c11-secondary"
                  disabled={busy}
                  onClick={() => setDetailRefresh((value) => value + 1)}
                >
                  Tải lại chi tiết
                </button>
              )}
              {detail && !detailLoading && (
                <>
                  <dl className="c11-detail-facts">
                    <div>
                      <dt>Ban tổ chức</dt>
                      <dd>
                        {selectedOrganizer?.organization_name ||
                          selectedOrganizer?.account_name ||
                          "Chưa có thông tin"}
                      </dd>
                    </div>
                    <div>
                      <dt>Thể loại</dt>
                      <dd>{selectedCategory || "Chưa có thông tin"}</dd>
                    </div>
                    <div>
                      <dt>Địa điểm</dt>
                      <dd>
                        {detail.venue_name} · {detail.address}
                      </dd>
                    </div>
                    <div>
                      <dt>Tiếp nhận</dt>
                      <dd>{dateTime(detail.submitted_at)}</dd>
                    </div>
                    <div>
                      <dt>Bắt đầu</dt>
                      <dd>{dateTime(detail.starts_at)}</dd>
                    </div>
                    <div>
                      <dt>Kết thúc</dt>
                      <dd>{dateTime(detail.ends_at)}</dd>
                    </div>
                  </dl>
                  <section className="c11-detail-section">
                    <h3>Mô tả sự kiện</h3>
                    <p className="c11-description">
                      {detail.description || "Chưa có mô tả."}
                    </p>
                    <h3>
                      <Ticket size={16} /> Các hạng vé
                    </h3>
                    <ul className="c11-detail-tickets">
                      {activeTypes(detail).map((type) => (
                        <li key={type.id}>
                          <strong>{type.name}</strong>
                          <span>
                            {money(type.price_amount)} ·{" "}
                            {type.capacity.toLocaleString("vi-VN")} vé
                          </span>
                        </li>
                      ))}
                    </ul>
                    {activeTypes(detail).length === 0 && (
                      <p>Chưa có hạng vé đang hoạt động.</p>
                    )}
                    {detail.reviews.length > 0 && (
                      <>
                        <h3>Lịch sử xét duyệt</h3>
                        <ul className="c11-history">
                          {detail.reviews.map((entry) => (
                            <li key={entry.review_version}>
                              <strong>
                                {entry.decision === "APPROVED"
                                  ? "Phê duyệt"
                                  : "Từ chối"}
                              </strong>{" "}
                              · {dateTime(entry.created_at)}
                              {entry.reason && <p>{entry.reason}</p>}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </section>
                  {detail.status !== "PENDING_REVIEW" ? (
                    <div className="c11-alert" role="status">
                      Sự kiện không còn chờ duyệt. Danh sách sẽ được cập nhật
                      khi bạn đóng chi tiết.
                    </div>
                  ) : (
                    <form onSubmit={review} className="c11-decision-form">
                      {mode === "detail" ? (
                        <div className="c11-decision-actions">
                          <button
                            className="c11-reject c11-secondary"
                            type="button"
                            onClick={() => setMode("reject")}
                          >
                            Từ chối
                          </button>
                          <button
                            className="c11-approve"
                            type="button"
                            onClick={() => setMode("approve")}
                          >
                            Phê duyệt sự kiện
                          </button>
                        </div>
                      ) : (
                        <>
                          {mode === "approve" ? (
                            <p>
                              Phê duyệt sẽ công khai sự kiện và cho phép mở bán
                              vé. Xác nhận xét duyệt sự kiện này?
                            </p>
                          ) : (
                            <label className="c11-reason">
                              Lý do từ chối <span aria-hidden="true">*</span>
                              <textarea
                                required
                                maxLength={2000}
                                rows={4}
                                value={reason}
                                disabled={busy}
                                onChange={(event) =>
                                  setReason(event.target.value)
                                }
                              />
                              <small>{reason.length} / 2.000 ký tự</small>
                            </label>
                          )}
                          <div className="c11-decision-actions">
                            <button
                              className="c11-secondary"
                              type="button"
                              disabled={busy}
                              onClick={() => setMode("detail")}
                            >
                              Quay lại
                            </button>
                            <button
                              className={
                                mode === "approve"
                                  ? "c11-approve"
                                  : "c11-reject-submit"
                              }
                              type="submit"
                              disabled={
                                busy ||
                                needsRecheck ||
                                (mode === "reject" && !reason.trim())
                              }
                            >
                              {busy
                                ? "Đang lưu quyết định…"
                                : mode === "approve"
                                  ? "Xác nhận phê duyệt"
                                  : "Xác nhận từ chối"}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  )}
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AdminShell>
  );
}

function Poster({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt={title} loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <div className="c11-poster-fallback">
      <ImageOff size={28} />
      <span>Chưa có ảnh sự kiện</span>
    </div>
  );
}

const styles = `
.c11-page {
  min-height: calc(100vh - 80px);
  padding: 20px 24px 32px;
  color: #e0e1f7;
  font: 14px/1.5 'Be Vietnam Pro', sans-serif;
}
.c11-page *, .c11-dialog * {
  box-sizing: border-box;
}
.c11-page button, .c11-dialog button {
  cursor: pointer;
  font: 600 12px/1.4 'Be Vietnam Pro', sans-serif;
}
.c11-page button:disabled, .c11-dialog button:disabled {
  cursor: not-allowed;
  opacity: .5;
}
.c11-page :focus-visible, .c11-dialog :focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 3px;
}
.c11-crumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #aaa4b9;
  font: 600 10px/1.5 'Space Grotesk', sans-serif;
  letter-spacing: .06em;
}
.c11-crumb b {
  color: #5de6ff;
}
.c11-heading {
  margin: 24px 0;
}
.c11-heading h1 {
  margin: 0 0 10px;
  font: 700 28px/1.3 Be Vietnam Pro, 'Be Vietnam Pro', sans-serif;
  letter-spacing: -.025em;
}
.c11-heading p {
  margin: 0;
  max-width: 780px;
  color: #bcb7cc;
}
.c11-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #303244;
  border-radius: 12px;
  background: #181b2a;
}
.c11-queue-label {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #7c3aed;
  color: #fff;
  font-weight: 600;
}
.c11-queue-label span {
  padding: 2px 7px;
  border-radius: 12px;
  background: #301465;
  font: 600 12px/1.5 'Space Grotesk', sans-serif;
}
.c11-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.c11-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  min-width: 0;
  color: #aaa4b9;
  border-radius: 8px;
  background: #262939;
}
.c11-search input, .c11-filters select {
  min-width: 0;
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: #262939;
  color: #e0e1f7;
  font: 12px 'Be Vietnam Pro', sans-serif;
}
.c11-search input {
  width: 208px;
  outline-offset: 0;
}
.c11-search input::placeholder {
  color: #b1acc1;
}
.c11-filters select {
  max-width: 190px;
  padding: 0 10px;
}
.c11-filter-submit, .c11-refresh, .c11-secondary {
  border: 1px solid #424356;
  border-radius: 7px;
  background: #262939;
  color: #e0e1f7;
  padding: 9px 12px;
}
.c11-refresh {
  display: grid;
  place-items: center;
  padding: 9px;
}
.c11-list {
  display: grid;
  gap: 16px;
}
.c11-card {
  min-width: 0;
  border: 1px solid #303244;
  border-radius: 12px;
  padding: 16px;
  background: #181b2a;
}
.c11-card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid #303244;
  font: 500 11px/1.5 'Space Grotesk', sans-serif;
}
.c11-status, .c11-category {
  padding: 4px 8px;
  border-radius: 5px;
  background: #353045;
  color: #d2bbff;
}
.c11-status {
  background: #44341e;
  color: #ffd48b;
}
.c11-received {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #b1acc1;
}
.c11-card-body {
  display: grid;
  grid-template-columns: minmax(155px, 3fr) minmax(0, 6fr) minmax(160px, 3fr);
  gap: 16px;
}
.c11-poster {
  position: relative;
  min-width: 0;
  height: 170px;
  overflow: hidden;
  border-radius: 8px;
  background: #262939;
}
.c11-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.c11-poster-fallback {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding-bottom: 20px;
  color: #bcb7cc;
  font-size: 11px;
}
.c11-poster-labels {
  position: absolute;
  inset: auto 8px 8px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
}
.c11-poster-labels span {
  padding: 3px 6px;
  border-radius: 4px;
  background: #0a0d1ce8;
  color: #5de6ff;
  font: 600 10px/1.5 'Space Grotesk', sans-serif;
}
.c11-poster-labels span:last-child {
  background: #7c3aed;
  color: #fff;
}
.c11-event-info h2 {
  margin: 0 0 12px;
  overflow-wrap: anywhere;
  font: 700 20px/1.4 Be Vietnam Pro, 'Be Vietnam Pro', sans-serif;
  letter-spacing: -.02em;
}
.c11-event-facts {
  display: grid;
  gap: 8px;
}
.c11-event-facts p {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  color: #c1bcd0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.c11-event-facts svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #5de6ff;
}
.c11-event-facts strong {
  color: #e0e1f7;
}
.c11-ticket-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.c11-ticket-tags span {
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 4px 7px;
  border-radius: 5px;
  background: #262939;
  color: #d2bbff;
  font-size: 10px;
}
.c11-card-actions {
  display: flex;
  flex-direction: column;
  align-self: center;
  justify-self: center;
  width: 100%;
  max-width: 224px;
  box-sizing: border-box;
  gap: 8px;
  padding: 10px;
  border: 1px solid #303244;
  border-radius: 8px;
  background: #1c1f2f66;
}
.c11-card-actions > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.c11-card-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 6px;
  border: 0;
  border-radius: 7px;
  background: #262939;
  color: #e0e1f7;
  font-size: 11px;
}
.c11-card-actions button.c11-approve, .c11-approve {
  border: 0;
  border-radius: 7px;
  padding: 11px 14px;
  background: #5de6ff;
  color: #00363e;
  font-weight: 700;
}
.c11-card-actions .c11-reject, .c11-reject {
  color: #ffafd3;
}
.c11-reject-submit {
  padding: 11px 14px;
  border: 0;
  border-radius: 7px;
  background: #ffb4ab;
  color: #690005;
}
.c11-page button:hover:not(:disabled), .c11-dialog button:hover:not(:disabled) {
  filter: brightness(1.12);
}
.c11-alert, .c11-notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
  margin: 12px 0;
  border: 1px solid #ffb4ab40;
  border-radius: 8px;
  background: #93000a25;
  color: #ffdad6;
  font-size: 12px;
}
.c11-alert button, .c11-notice button, .c11-state button {
  padding: 6px 10px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: transparent;
  color: inherit;
}
.c11-notice {
  border-color: #5de6ff50;
  background: #00515d30;
  color: #a2eeff;
}
.c11-notice span {
  flex: 1;
}
.c11-notice button {
  display: grid;
  place-items: center;
  border: 0;
}
.c11-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  padding: 60px 20px;
  border: 1px solid #303244;
  border-radius: 12px;
  background: #181b2a;
  text-align: center;
  color: #c1bcd0;
}
.c11-state h2, .c11-state p {
  margin: 0;
}
.c11-state h2 {
  font-size: 18px;
  color: #e0e1f7;
}
.c11-pagination, .c11-pagination > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.c11-pagination {
  margin-top: 20px;
  color: #bcb7cc;
  font-size: 11px;
}
.c11-pagination button {
  display: grid;
  place-items: center;
  padding: 8px;
  border: 1px solid #424356;
  border-radius: 7px;
  background: #262939;
  color: #e0e1f7;
}
.c11-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: #03040bc9;
  backdrop-filter: blur(5px);
}
.c11-dialog {
  position: fixed;
  z-index: 91;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 26px;
  border: 1px solid #424356;
  border-radius: 12px;
  background: #181b2a;
  color: #e0e1f7;
  font: 13px/1.6 'Be Vietnam Pro', sans-serif;
  overflow-wrap: anywhere;
}
.c11-dialog h2 {
  margin: 0 40px 6px 0;
  font: 700 24px/1.4 Be Vietnam Pro, sans-serif;
}
.c11-dialog > p {
  margin: 0 28px 18px 0;
  color: #d2bbff;
}
.c11-dialog-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  padding: 6px;
  border: 0;
  border-radius: 5px;
  background: #262939;
  color: #e0e1f7;
}
.c11-detail-facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  margin: 20px 0;
}
.c11-detail-facts dt {
  color: #b1acc1;
  font-size: 11px;
}
.c11-detail-facts dd {
  margin: 4px 0 0;
}
.c11-detail-section {
  padding: 14px 0;
  border-block: 1px solid #303244;
}
.c11-detail-section h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  font-size: 13px;
}
.c11-description {
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  color: #c1bcd0;
  margin: 0 0 20px;
}
.c11-detail-tickets, .c11-history {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}
.c11-detail-tickets li {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0;
  color: #d2bbff;
  border-bottom: 1px solid #303244;
}
.c11-history li {
  margin-bottom: 10px;
  color: #c1bcd0;
}
.c11-history p {
  white-space: pre-wrap;
}
.c11-decision-form {
  margin-top: 18px;
}
.c11-decision-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.c11-reason {
  display: block;
}
.c11-reason > span {
  color: #ffafd3;
}
.c11-reason textarea {
  display: block;
  width: 100%;
  resize: vertical;
  margin-top: 8px;
  border: 1px solid #555369;
  border-radius: 8px;
  padding: 10px;
  background: #0f1222;
  color: #e0e1f7;
  font: inherit;
}
.c11-reason small {
  display: block;
  color: #b1acc1;
  text-align: right;
}
.c11-spin {
  animation: c11-spin 1s linear infinite;
}
@keyframes c11-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 1400px) {
  .c11-event-facts {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 1100px) {
  .c11-card-body {
    grid-template-columns: 190px minmax(0, 1fr);
  }
  .c11-card-actions {
    grid-column: 1 / -1;
  }
}
@media (max-width: 600px) {
  .c11-page {
    padding: 16px;
  }
  .c11-heading h1 {
    font-size: 24px;
  }
  .c11-heading p {
    font-size: 12px;
  }
  .c11-toolbar {
    padding: 12px;
  }
  .c11-filters {
    width: 100%;
  }
  .c11-search {
    width: 100%;
  }
  .c11-search input {
    width: 100%;
  }
  .c11-filters select {
    flex: 1;
    max-width: none;
    width: 100px;
  }
  .c11-card {
    padding: 12px;
  }
  .c11-card-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .c11-poster {
    height: 190px;
  }
  .c11-card-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .c11-event-info h2 {
    font-size: 19px;
  }
  .c11-dialog {
    padding: 20px;
  }
  .c11-dialog h2 {
    font-size: 20px;
  }
  .c11-detail-facts {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .c11-spin {
    animation: none;
  }
}
`;
