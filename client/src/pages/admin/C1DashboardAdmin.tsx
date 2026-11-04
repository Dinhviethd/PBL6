import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImageOff,
  RefreshCw,
  ScanLine,
  Ticket,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { AdminShell } from "./AdminShell";

type Overview = {
  users: string;
  organizers: string;
  events: string;
  sold: string;
  revenue: string;
  checkins: string;
};
type EventItem = {
  id: string;
  title: string;
  organizer_id: string | null;
  cover_image_url: string | null;
  venue_name: string;
  starts_at: string;
  status: string;
};
type EventDetail = EventItem & {
  ticketTypes: { name: string; capacity: number; archived_at: string | null }[];
};
type Application = {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  created_at: string;
  status: string;
};
type Page<T> = { items: T[]; pagination: { total: number } };
type Organizer = {
  id: string;
  organization_name: string | null;
  account_name: string | null;
};
type DailyRevenue = {
  fromDate: string;
  toDate: string;
  timezone: string;
  totalRevenue: string;
  series: { date: string; revenue: string }[];
};
type Selection =
  | { kind: "event"; item: EventItem }
  | { kind: "application"; item: Application };

const number = (value: string | number) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value));
const money = (value: string) => `${number(value)} ₫`;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
const dayLabel = (value: string) => value.split("-").reverse().join("/");
const localDay = (time: number) =>
  new Date(time + 7 * 3600000).toISOString().slice(0, 10);
const initialRange = () => ({
  fromDate: localDay(Date.now() - 29 * 86400000),
  toDate: localDay(Date.now()),
});

function useResource<T>(path: string, refresh: number) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string;
  }>({
    data: null,
    loading: true,
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: "" });
    api
      .get<{ data: T }>(path, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ data: response.data.data, loading: false, error: "" });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setState({ data: null, loading: false, error: message(cause) });
      });
    return () => controller.abort();
  }, [path, refresh]);
  return state;
}

function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <p className="c1-state" role="status">
        Đang tải dữ liệu…
      </p>
    );
  if (error)
    return (
      <div className="c1-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  return null;
}

function RevenueChart({ report }: { report: DailyRevenue }) {
  const maximum = report.series.reduce(
    (max, day) => (BigInt(day.revenue) > max ? BigInt(day.revenue) : max),
    0n,
  );
  // Scale only the drawing coordinates. Tooltip/table/total retain exact integer strings.
  const data = report.series.map((day) => ({
    ...day,
    value:
      maximum === 0n
        ? 0
        : Number((BigInt(day.revenue) * 1000000n) / maximum) / 10000,
  }));
  return (
    <>
      <div className="c1-chart-summary">
        <div>
          <span>TỔNG DOANH THU TRONG KỲ</span>
          <strong>{money(report.totalRevenue)}</strong>
        </div>
        <p>
          {dayLabel(report.fromDate)} — {dayLabel(report.toDate)}
          <br />
          Múi giờ Việt Nam (UTC+7)
        </p>
      </div>
      {maximum === 0n && (
        <p className="c1-state" role="status">
          Chưa có doanh thu trong khoảng ngày này.
        </p>
      )}
      <div
        className="c1-chart"
        role="img"
        aria-label={`Biểu đồ doanh thu từ ${dayLabel(report.fromDate)} đến ${dayLabel(report.toDate)}. Tổng ${money(report.totalRevenue)}. Dữ liệu chi tiết ở bảng bên dưới.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="c1-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5de6ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#5de6ff" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#313445"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => dayLabel(String(value)).slice(0, 5)}
              minTickGap={40}
              tick={{ fill: "#ccc3d8", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#4a4455" }}
            />
            <YAxis
              width={76}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) =>
                new Intl.NumberFormat("vi-VN", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format((maximum * BigInt(value)) / 100n)
              }
              tick={{ fill: "#ccc3d8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  { date: string; revenue: string } | undefined;
                return active && point ? (
                  <div className="c1-tooltip">
                    <span>{dayLabel(point.date)}</span>
                    <strong>{money(point.revenue)}</strong>
                  </div>
                ) : null;
              }}
            />
            <Area
              type="linear"
              dataKey="value"
              name="Doanh thu"
              stroke="#5de6ff"
              strokeWidth={3}
              fill="url(#c1-revenue-fill)"
              isAnimationActive={false}
              dot={data.length === 1 ? { r: 5, fill: "#5de6ff" } : false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="c1-daily-table">
        <summary>
          Xem dữ liệu doanh thu từng ngày ({report.series.length} ngày)
        </summary>
        <div className="c1-table-scroll">
          <table>
            <caption>
              Doanh thu vé đã thanh toán theo ngày, đơn vị VND, UTC+7
            </caption>
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                <th scope="col">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {report.series.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{dayLabel(day.date)}</th>
                  <td>{money(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export function C1DashboardAdmin() {
  const [refresh, setRefresh] = useState(0);
  const [chartRefresh, setChartRefresh] = useState(0);
  const [range, setRange] = useState(initialRange);
  const [draft, setDraft] = useState(initialRange);
  const [rangeError, setRangeError] = useState("");
  const stats = useResource<Overview>("/admin/stats", refresh);
  const kpis = useResource<{ selling: string }>("/admin/events/kpis", refresh);
  const events = useResource<Page<EventItem>>(
    "/admin/events?status=PENDING_REVIEW&page=0&limit=3",
    refresh,
  );
  const applications = useResource<Page<Application>>(
    "/admin/organizer-applications?status=PENDING&page=0&limit=2",
    refresh,
  );
  const chart = useResource<DailyRevenue>(
    `/admin/stats/revenue-daily?${new URLSearchParams(range)}`,
    chartRefresh,
  );
  const [details, setDetails] = useState<Record<string, EventDetail>>({});
  const [organizers, setOrganizers] = useState<Record<string, Organizer>>({});
  const [extraError, setExtraError] = useState("");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const sending = useRef(false);
  const alive = useRef(true);
  const opener = useRef<HTMLElement | null>(null);
  const reload = () => setRefresh((value) => value + 1);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setDetails({});
    setOrganizers({});
    setExtraError("");
    const items = events.data?.items ?? [];
    if (!items.length) return () => controller.abort();
    const ids = [
      ...new Set(
        items
          .map((item) => item.organizer_id)
          .filter((id): id is string => !!id),
      ),
    ];
    async function loadExtras() {
      const [detailResults, orgResult] = await Promise.all([
        Promise.allSettled(
          items.map(
            async (item) =>
              (
                await api.get<{ data: EventDetail }>(
                  `/organizer/events/${item.id}`,
                  { signal: controller.signal },
                )
              ).data.data,
          ),
        ),
        ids.length
          ? api
              .get<{ data: Organizer[] }>(
                `/admin/organizers/summaries?${new URLSearchParams({ ids: ids.join(",") })}`,
                { signal: controller.signal },
              )
              .then((response) => response.data.data)
              .catch(() => null)
          : Promise.resolve([]),
      ]);
      if (controller.signal.aborted) return;
      const loaded = detailResults.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      setDetails(Object.fromEntries(loaded.map((item) => [item.id, item])));
      setOrganizers(
        Object.fromEntries((orgResult ?? []).map((item) => [item.id, item])),
      );
      if (loaded.length !== items.length || orgResult === null)
        setExtraError(
          "Một số thông tin sự kiện hoặc ban tổ chức chưa tải được.",
        );
    }
    void loadExtras();
    return () => controller.abort();
  }, [events.data]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setVerified(false);
    setChecking(true);
    setDialogError("");
    async function checkCurrent() {
      try {
        let pending = false;
        if (!selected) return;
        if (selected.kind === "event") {
          const response = await api.get<{ data: EventDetail }>(
            `/organizer/events/${selected.item.id}`,
            { signal: controller.signal },
          );
          pending = response.data.data.status === "PENDING_REVIEW";
        } else {
          const query = new URLSearchParams({
            q: selected.item.organization_name,
            page: "0",
            limit: "100",
          });
          const response = await api.get<{ data: Page<Application> }>(
            `/admin/organizer-applications?${query}`,
            { signal: controller.signal },
          );
          pending = response.data.data.items.some(
            (item) => item.id === selected.item.id && item.status === "PENDING",
          );
        }
        if (!controller.signal.aborted) {
          setVerified(pending);
          if (!pending)
            setDialogError(
              "Yêu cầu này không còn chờ duyệt. Đóng hộp thoại và tải lại danh sách.",
            );
        }
      } catch (cause) {
        if (!controller.signal.aborted) setDialogError(message(cause));
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }
    void checkCurrent();
    return () => controller.abort();
  }, [selected, checkVersion]);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = Date.parse(`${draft.fromDate}T00:00:00+07:00`);
    const end = Date.parse(`${draft.toDate}T00:00:00+07:00`);
    const days = (end - start) / 86400000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 366) {
      setRangeError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
      return;
    }
    setRangeError("");
    setRange({ ...draft });
    setChartRefresh((value) => value + 1);
  }

  function openReview(selection: Selection, target: HTMLElement, view = false) {
    opener.current = target;
    setViewOnly(view);
    setVerified(false);
    setDialogError("");
    setSelected(selection);
  }

  async function approve() {
    if (!selected || !verified || checking || sending.current) return;
    sending.current = true;
    setBusy(true);
    setDialogError("");
    try {
      const path =
        selected.kind === "event"
          ? `/admin/events/${selected.item.id}/review`
          : `/admin/organizer-applications/${selected.item.id}/review`;
      await api.post(path, { approve: true, reason: "" });
      if (!alive.current) return;
      setNotice(
        selected.kind === "event"
          ? "Đã phê duyệt và mở bán sự kiện."
          : "Đã cấp quyền ban tổ chức.",
      );
      setSelected(null);
      reload();
    } catch (cause) {
      if (!alive.current) return;
      setVerified(false);
      setDialogError(
        `${message(cause)} Kiểm tra lại trạng thái trước khi gửi tiếp.`,
      );
      reload();
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const loading =
    stats.loading ||
    kpis.loading ||
    events.loading ||
    applications.loading ||
    chart.loading;
  const cards = [
    {
      label: "Người dùng",
      value: stats.data?.users,
      hint: "Tất cả tài khoản",
      icon: Users,
      tone: "purple",
    },
    {
      label: "Ban tổ chức",
      value: stats.data?.organizers,
      hint: "Tài khoản có quyền BTC",
      icon: Building2,
      tone: "cyan",
    },
    {
      label: "Sự kiện sàn",
      value: stats.data?.events,
      hint: kpis.data
        ? `${number(kpis.data.selling)} đang mở bán`
        : "Chưa tải số đang bán",
      icon: CalendarDays,
      tone: "purple",
    },
    {
      label: "Vé đã bán",
      value: stats.data?.sold,
      hint: stats.data
        ? `Doanh thu: ${money(stats.data.revenue)}`
        : "Doanh thu vé đã thanh toán",
      icon: Ticket,
      tone: "cyan",
    },
    {
      label: "Lượt check-in",
      value: stats.data?.checkins,
      hint: "Check-in thành công",
      icon: ScanLine,
      tone: "pink",
    },
  ];

  return (
    <AdminShell title="Dashboard Quản trị">
      <div className="c1-page">
        <style>{styles}</style>
        <header className="c1-banner">
          <div>
            <span className="c1-eyebrow">TỔNG QUAN HỆ THỐNG</span>
            <h1>Bảng Điều Khiển Quản Trị Hệ Thống</h1>
            <p>
              Theo dõi doanh thu, sự kiện và các yêu cầu đang chờ phê duyệt.
            </p>
          </div>
          <button
            className="c1-button"
            type="button"
            disabled={loading}
            onClick={() => {
              reload();
              setChartRefresh((value) => value + 1);
            }}
          >
            <RefreshCw size={16} className={loading ? "c1-spin" : ""} />
            {loading ? "Đang tải" : "Làm mới dữ liệu"}
          </button>
        </header>
        {notice && (
          <div className="c1-notice" role="status">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section aria-label="Thống kê toàn thời gian">
          <div className="c1-section-label">THỐNG KÊ TOÀN THỜI GIAN</div>
          <LoadState
            loading={stats.loading}
            error={stats.error || kpis.error}
            retry={reload}
          />
          <div className="c1-kpis" aria-busy={stats.loading}>
            {cards.map(({ label, value, hint, icon: Icon, tone }) => (
              <article className={`c1-kpi c1-${tone}`} key={label}>
                <div>
                  <h2>{label}</h2>
                  <span className="c1-icon">
                    <Icon size={21} />
                  </span>
                </div>
                <strong>{value === undefined ? "—" : number(value)}</strong>
                <p>{hint}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="c1-panel c1-revenue"
          aria-labelledby="c1-revenue-title"
          aria-busy={chart.loading}
        >
          <div className="c1-section-head">
            <div>
              <h2 id="c1-revenue-title">
                <TrendingUp size={21} />
                Doanh Thu Theo Ngày
              </h2>
              <p>Doanh thu vé đã thanh toán trên toàn hệ thống · VND</p>
            </div>
            <span className="c1-legend">
              <i />
              Doanh thu
            </span>
          </div>
          <form className="c1-date-filter" onSubmit={applyRange}>
            <label>
              Từ ngày
              <input
                type="date"
                required
                min="1970-01-01"
                max="9998-12-31"
                value={draft.fromDate}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    fromDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                required
                min="1970-01-01"
                max="9998-12-31"
                value={draft.toDate}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    toDate: event.target.value,
                  }))
                }
              />
            </label>
            <button className="c1-button c1-primary" type="submit">
              Áp dụng
            </button>
            <span>Tối đa 366 ngày. Bộ lọc chỉ áp dụng cho biểu đồ.</span>
          </form>
          {rangeError && (
            <p className="c1-error" role="alert">
              {rangeError}
            </p>
          )}
          <LoadState
            loading={chart.loading}
            error={chart.error}
            retry={() => setChartRefresh((value) => value + 1)}
          />
          {!chart.loading && chart.data && <RevenueChart report={chart.data} />}
        </section>

        <div className="c1-queues">
          <section
            className="c1-panel"
            aria-labelledby="c1-events-title"
            aria-busy={events.loading}
          >
            <div className="c1-section-head">
              <div>
                <h2 id="c1-events-title">
                  <Clock3 size={21} />
                  Hàng Đợi Duyệt Sự Kiện
                </h2>
                <p>Các sự kiện đang chờ mở cổng bán vé</p>
              </div>
              <span className="c1-badge">
                {events.data
                  ? `${number(events.data.pagination.total)} yêu cầu`
                  : "—"}
              </span>
            </div>
            <LoadState
              loading={events.loading}
              error={events.error || extraError}
              retry={reload}
            />
            {!events.loading && events.data?.items.length === 0 && (
              <p className="c1-state">Không có sự kiện chờ duyệt.</p>
            )}
            <div className="c1-list">
              {events.data?.items.map((item) => {
                const types = details[item.id]?.ticketTypes.filter(
                  (type) => !type.archived_at,
                );
                const org = item.organizer_id
                  ? organizers[item.organizer_id]
                  : null;
                return (
                  <article className="c1-event-card" key={item.id}>
                    <div className="c1-event-info">
                      <Link
                        className="c1-cover"
                        to={`/admin/events/review/${item.id}`}
                        aria-label={`Chi tiết ${item.title}`}
                      >
                        {item.cover_image_url ? (
                          <img
                            src={item.cover_image_url}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.hidden = true;
                            }}
                          />
                        ) : (
                          <ImageOff size={22} />
                        )}
                      </Link>
                      <div>
                        <Link
                          className="c1-item-title"
                          to={`/admin/events/review/${item.id}`}
                        >
                          {item.title}
                        </Link>
                        <p>
                          BTC:{" "}
                          {org?.organization_name ||
                            org?.account_name ||
                            "Chưa có thông tin"}
                        </p>
                        <p>
                          {dateTime(item.starts_at)} · {item.venue_name}
                        </p>
                        {types && (
                          <span className="c1-ticket-label">
                            {number(
                              types.reduce(
                                (sum, type) => sum + type.capacity,
                                0,
                              ),
                            )}{" "}
                            vé · {types.map((type) => type.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="c1-card-actions">
                      <Link
                        className="c1-button"
                        to={`/admin/events/review/${item.id}`}
                      >
                        Xem chi tiết
                      </Link>
                      <button
                        className="c1-button c1-primary"
                        type="button"
                        onClick={(event) =>
                          openReview(
                            { kind: "event", item },
                            event.currentTarget,
                          )
                        }
                      >
                        Duyệt nhanh
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <Link className="c1-more" to="/admin/events/review">
              Vào hàng đợi đầy đủ
              <ArrowRight size={16} />
            </Link>
          </section>
          <section
            className="c1-panel c1-applications"
            aria-labelledby="c1-applications-title"
            aria-busy={applications.loading}
          >
            <div className="c1-section-head">
              <div>
                <h2 id="c1-applications-title">
                  <Building2 size={21} />
                  Ban Tổ Chức Mới
                </h2>
                <p>Hồ sơ đăng ký đang chờ cấp quyền</p>
              </div>
              <span className="c1-badge">
                {applications.data
                  ? `${number(applications.data.pagination.total)} hồ sơ`
                  : "—"}
              </span>
            </div>
            <LoadState
              loading={applications.loading}
              error={applications.error}
              retry={reload}
            />
            {!applications.loading && applications.data?.items.length === 0 && (
              <p className="c1-state">Không có hồ sơ chờ duyệt.</p>
            )}
            <div className="c1-list">
              {applications.data?.items.map((item) => (
                <article className="c1-application-card" key={item.id}>
                  <div className="c1-app-title">
                    <span className="c1-avatar">
                      {item.organization_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{item.organization_name}</h3>
                      <p>Người liên hệ: {item.contact_name}</p>
                    </div>
                  </div>
                  <p>{item.description}</p>
                  <small>Đăng ký: {dateTime(item.created_at)}</small>
                  <div className="c1-card-actions">
                    <button
                      className="c1-button"
                      type="button"
                      onClick={(event) =>
                        openReview(
                          { kind: "application", item },
                          event.currentTarget,
                          true,
                        )
                      }
                    >
                      Xem hồ sơ
                    </button>
                    <button
                      className="c1-button c1-brand"
                      type="button"
                      onClick={(event) =>
                        openReview(
                          { kind: "application", item },
                          event.currentTarget,
                        )
                      }
                    >
                      Cấp quyền BTC
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <Link className="c1-more" to="/admin/applications/review">
              Xem tất cả hồ sơ
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>

        <Dialog.Root
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open && !sending.current) setSelected(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="c1-dialog-overlay" />
            <Dialog.Content
              className="c1-dialog"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (opener.current?.isConnected) opener.current.focus();
              }}
              onEscapeKeyDown={(event) => {
                if (sending.current) event.preventDefault();
              }}
              onPointerDownOutside={(event) => {
                if (sending.current) event.preventDefault();
              }}
            >
              <Dialog.Title>
                {selected?.kind === "event"
                  ? "Phê duyệt sự kiện"
                  : viewOnly
                    ? "Hồ sơ đăng ký ban tổ chức"
                    : "Cấp quyền ban tổ chức"}
              </Dialog.Title>
              <Dialog.Description>
                {selected?.kind === "event"
                  ? "Sự kiện sẽ được công khai và mở bán sau khi phê duyệt."
                  : viewOnly
                    ? "Thông tin do người dùng cung cấp trong hồ sơ đăng ký."
                    : "Tài khoản nộp hồ sơ sẽ được cấp quyền ban tổ chức."}
              </Dialog.Description>
              <p className="c1-dialog-name">
                {selected?.kind === "event"
                  ? selected.item.title
                  : selected?.item.organization_name}
              </p>
              {selected?.kind === "application" && (
                <div className="c1-profile-info">
                  <p>Người liên hệ: {selected.item.contact_name}</p>
                  <p>Email: {selected.item.contact_email}</p>
                  <p>Điện thoại: {selected.item.contact_phone}</p>
                  <p>{selected.item.description}</p>
                  <p>Đăng ký: {dateTime(selected.item.created_at)}</p>
                </div>
              )}
              {checking && (
                <p role="status">Đang kiểm tra trạng thái mới nhất…</p>
              )}
              {dialogError && (
                <div className="c1-error" role="alert">
                  {dialogError}
                  <button
                    type="button"
                    disabled={checking || busy}
                    onClick={() => setCheckVersion((value) => value + 1)}
                  >
                    Kiểm tra lại
                  </button>
                </div>
              )}
              <div className="c1-dialog-actions">
                <Dialog.Close asChild>
                  <button className="c1-button" type="button" disabled={busy}>
                    Hủy
                  </button>
                </Dialog.Close>
                <button
                  className="c1-button c1-primary"
                  type="button"
                  disabled={!verified || checking || busy}
                  onClick={() =>
                    viewOnly ? setViewOnly(false) : void approve()
                  }
                >
                  {busy
                    ? "Đang xử lý…"
                    : viewOnly
                      ? "Cấp quyền BTC"
                      : "Xác nhận phê duyệt"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AdminShell>
  );
}

const styles = `
.c1-page {
  padding: 24px;
  color: #e0e1f7;
  font-family: 'Be Vietnam Pro', sans-serif;
}
.c1-page *, .c1-dialog * {
  box-sizing: border-box;
}
.c1-page h1, .c1-page h2, .c1-page h3, .c1-page p, .c1-dialog p {
  margin: 0;
}
.c1-page button, .c1-dialog button {
  cursor: pointer;
  font: inherit;
}
.c1-page button:disabled, .c1-dialog button:disabled {
  cursor: wait;
  opacity: .55;
}
.c1-page a {
  text-decoration: none;
}
.c1-page :focus-visible, .c1-dialog :focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 4px;
}
.c1-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  margin-bottom: 28px;
  border-radius: 12px;
  background: radial-gradient(ellipse at right top, #7c3aed26, transparent 65%), radial-gradient(ellipse at 65% bottom, #00cbe61c, transparent 65%), #181b2a;
}
.c1-eyebrow, .c1-section-label {
  font: 600 11px/1.6 'Space Grotesk', sans-serif;
  letter-spacing: .09em;
  color: #5de6ff;
}
.c1-banner h1 {
  margin: 8px 0;
  font: 700 clamp(23px, 2.3vw, 32px)/1.3 'Be Vietnam Pro', sans-serif;
  letter-spacing: -.02em;
}
.c1-banner p, .c1-section-head p {
  font-size: 13px;
  line-height: 1.7;
  color: #ccc3d8;
}
.c1-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #313445;
  color: #e0e1f7;
  font: 600 12px/1.5 'Space Grotesk', sans-serif !important;
  white-space: nowrap;
}
.c1-button:hover {
  filter: brightness(1.12);
}
.c1-primary {
  color: #00363e;
  background: #5de6ff;
}
.c1-brand {
  color: #ede0ff;
  background: #7c3aed;
}
.c1-section-label {
  margin-bottom: 12px;
  color: #ccc3d8;
}
.c1-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.c1-kpi {
  min-width: 0;
  padding: 20px 16px;
  border-radius: 12px;
  background: #181b2a;
}
.c1-kpi > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 24px;
}
.c1-kpi h2 {
  font: 500 12px/1.5 'Space Grotesk', sans-serif;
  text-transform: uppercase;
  color: #ccc3d8;
}
.c1-icon {
  flex: 0 0 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #262939;
  color: #d2bbff;
}
.c1-cyan .c1-icon, .c1-cyan > strong {
  color: #5de6ff;
}
.c1-pink .c1-icon {
  color: #ffafd3;
}
.c1-kpi > strong {
  display: block;
  font: 700 clamp(23px, 2.3vw, 34px)/1.3 'Be Vietnam Pro', sans-serif;
  overflow-wrap: anywhere;
}
.c1-kpi p {
  margin-top: 10px;
  color: #ccc3d8;
  font: 500 12px/1.7 'Space Grotesk', sans-serif;
  overflow-wrap: anywhere;
}
.c1-panel {
  min-width: 0;
  padding: 24px;
  border-radius: 12px;
  background: #181b2a;
}
.c1-revenue {
  margin-bottom: 28px;
}
.c1-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.c1-section-head h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 600 21px/1.45 'Be Vietnam Pro', sans-serif;
}
.c1-section-head h2 svg {
  flex-shrink: 0;
  color: #5de6ff;
}
.c1-section-head p {
  margin-top: 6px;
}
.c1-legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  white-space: nowrap;
}
.c1-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #5de6ff;
  box-shadow: 0 0 12px #5de6ff55;
}
.c1-date-filter {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 24px;
  border-bottom: 1px solid #313445;
}
.c1-date-filter label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: #ccc3d8;
}
.c1-date-filter input {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  color: #e0e1f7;
  background: #0f1222;
  color-scheme: dark;
  font: 13px 'Space Grotesk', sans-serif;
}
.c1-date-filter > span {
  padding-bottom: 10px;
  color: #ccc3d8;
  font-size: 11px;
}
.c1-chart-summary {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 24px;
}
.c1-chart-summary span {
  font: 500 11px 'Space Grotesk', sans-serif;
  color: #ccc3d8;
  letter-spacing: .04em;
}
.c1-chart-summary strong {
  display: block;
  margin-top: 8px;
  color: #5de6ff;
  font: 700 clamp(22px, 2.5vw, 32px)/1.5 'Be Vietnam Pro', sans-serif;
  overflow-wrap: anywhere;
}
.c1-chart-summary p {
  font: 12px/1.8 'Space Grotesk', sans-serif;
  color: #ccc3d8;
}
.c1-chart {
  width: 100%;
  height: 300px;
  margin-top: 16px;
}
.c1-tooltip {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  background: #0f1222;
  font-size: 12px;
}
.c1-tooltip strong {
  color: #5de6ff;
}
.c1-daily-table {
  margin-top: 16px;
  font-size: 12px;
}
.c1-daily-table summary {
  cursor: pointer;
  color: #d2bbff;
  padding: 10px 0;
}
.c1-table-scroll {
  max-height: 340px;
  overflow: auto;
}
.c1-daily-table table {
  width: 100%;
  border-collapse: collapse;
}
.c1-daily-table th, .c1-daily-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #313445;
}
.c1-daily-table caption {
  padding: 12px 0;
  text-align: left;
  color: #ccc3d8;
}
.c1-queues {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 24px;
}
.c1-badge {
  padding: 6px 8px;
  border-radius: 4px;
  background: #00cbe61c;
  color: #5de6ff;
  font: 600 11px/1.6 'Space Grotesk', sans-serif;
  white-space: nowrap;
}
.c1-list {
  display: grid;
  gap: 14px;
}
.c1-event-card, .c1-application-card {
  min-width: 0;
  padding: 16px;
  border-radius: 12px;
  background: #1c1f2f;
}
.c1-event-info, .c1-app-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.c1-event-info > div, .c1-app-title > div {
  min-width: 0;
}
.c1-cover {
  display: grid;
  flex: 0 0 52px;
  width: 52px;
  height: 60px;
  overflow: hidden;
  place-items: center;
  border-radius: 8px;
  background: #313445;
  color: #958da1;
}
.c1-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.c1-item-title, .c1-app-title h3 {
  color: #e0e1f7;
  font: 700 16px/1.6 'Be Vietnam Pro', sans-serif;
  overflow-wrap: anywhere;
}
.c1-item-title:hover {
  color: #5de6ff;
}
.c1-event-card p, .c1-application-card p {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: #ccc3d8;
  overflow-wrap: anywhere;
}
.c1-ticket-label {
  display: inline-block;
  margin-top: 10px;
  font: 11px/1.7 'Space Grotesk', sans-serif;
  color: #d2bbff;
}
.c1-card-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.c1-avatar {
  display: grid;
  flex: 0 0 40px;
  height: 40px;
  border-radius: 8px;
  place-items: center;
  background: #7c3aed33;
  color: #d2bbff;
  font: 700 16px 'Be Vietnam Pro', sans-serif;
}
.c1-application-card small {
  display: block;
  margin-top: 12px;
  font: 11px/1.6 'Space Grotesk', sans-serif;
  color: #ccc3d8;
}
.c1-applications .c1-badge {
  color: #d2bbff;
  background: #7c3aed33;
}
.c1-more {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding-top: 22px;
  color: #5de6ff;
  font: 600 12px/1.6 'Space Grotesk', sans-serif;
}
.c1-state {
  padding: 20px 0;
  color: #ccc3d8;
  font-size: 13px;
}
.c1-error, .c1-notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #93000a33;
  color: #ffb4ab;
  font-size: 13px;
  line-height: 1.6;
}
.c1-error button, .c1-notice button {
  border: 0;
  background: transparent;
  color: inherit;
  text-decoration: underline;
  padding: 6px;
}
.c1-notice {
  background: #00cbe61c;
  color: #5de6ff;
}
.c1-notice span {
  flex: 1;
}
.c1-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #03040bd9;
  backdrop-filter: blur(5px);
}
.c1-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 101;
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 28px;
  border: 1px solid #4a4455;
  border-radius: 16px;
  background: #181b2a;
  color: #e0e1f7;
  font: 14px/1.7 'Be Vietnam Pro', sans-serif;
}
.c1-dialog h2 {
  margin: 0 0 12px;
  font: 700 24px/1.4 'Be Vietnam Pro', sans-serif;
}
.c1-dialog > p {
  margin: 12px 0;
  overflow-wrap: anywhere;
}
.c1-dialog-name {
  color: #5de6ff;
  font-weight: 600;
}
.c1-profile-info p {
  margin: 10px 0;
  overflow-wrap: anywhere;
}
.c1-dialog-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.c1-spin {
  animation: c1-spin 1s linear infinite;
}
@keyframes c1-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1200px) {
  .c1-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .c1-queues {
    grid-template-columns: 1fr;
  }
  .c1-banner {
    flex-wrap: wrap;
  }
}
@media (max-width: 600px) {
  .c1-page {
    padding: 16px;
  }
  .c1-panel, .c1-banner {
    padding: 18px;
  }
  .c1-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .c1-kpi {
    padding: 16px 12px;
  }
  .c1-kpi > div {
    gap: 4px;
    margin-bottom: 16px;
  }
  .c1-icon {
    flex-basis: 28px;
    height: 28px;
  }
  .c1-section-head {
    flex-wrap: wrap;
  }
  .c1-section-head h2 {
    font-size: 20px;
  }
  .c1-date-filter label {
    width: 100%;
  }
  .c1-date-filter input {
    width: 100%;
  }
  .c1-chart {
    height: 250px;
  }
  .c1-event-info {
    gap: 10px;
  }
  .c1-card-actions > * {
    flex: 1;
  }
  .c1-dialog {
    padding: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .c1-spin {
    animation: none;
  }
}
`;
