import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import axios from "axios";
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
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { AdminShell } from "./AdminShell";

type Overview = {
  revenue: string;
  provider_received: string;
  needs_review: string;
};
type Revenue = {
  fromDate: string;
  toDate: string;
  totalRevenue: string;
  series: { date: string; revenue: string }[];
};
type Payment = {
  id: string;
  merchant_reference: string;
  provider: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  requires_review: boolean;
  review_reason: string | null;
  review_resolved_at: string | null;
};
type Transaction = {
  id: string;
  reference_code: string | null;
  webhook_transaction_id: string | null;
  api_transaction_id?: string | null;
  payment_id: string | null;
  payment_code: string | null;
  environment: string;
  bank_code: string;
  account_masked: string;
  amount: string;
  currency: string;
  transfer_type: string;
  status: string;
  reason: string | null;
  attempt_count: number;
  transaction_at?: string | null;
  received_at: string;
  processed_at: string | null;
};
type TransactionDetail = Transaction & {
  history: {
    id: string;
    action: string;
    reason: string;
    evidence_reference: string | null;
    created_at: string;
  }[];
};
type ReconcileResult = {
  scanned: number;
  imported: number;
  reviewed: number;
  matchedWebhook: number;
  duplicates: number;
  ignored: number;
};
type Action = "reconcile" | "reprocess" | "resolve";
type View = "payments" | "sepay";
const paymentStatuses = {
  PENDING: "Chờ thanh toán",
  SUCCEEDED: "Thành công",
  FAILED: "Thất bại",
  UNKNOWN: "Chưa xác định",
};
const sepayStatuses = {
  RECEIVED: "Đã tiếp nhận",
  PROCESSING: "Đang xử lý",
  PROCESSED: "Đã xử lý",
  REVIEW: "Cần kiểm tra",
  ERROR: "Lỗi xử lý",
};
const actionLabels = {
  reconcile: "Đối soát một lần",
  reprocess: "Xử lý lại",
  resolve: "Ghi nhận kết quả",
};
const integer = (value: string | number) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value));
const money = (value: string) => `${integer(value)} ₫`;
const dateTime = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "—";
const dayLabel = (value: string) => value.split("-").reverse().join("/");
const localDay = (time: number) =>
  new Date(time + 7 * 3600000).toISOString().slice(0, 10);
const initialRange = () => ({
  fromDate: localDay(Date.now() - 6 * 86400000),
  toDate: localDay(Date.now()),
});

function useResource<T>(path: string | null, refresh: number) {
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const key = `${path}:${refresh}`;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api
      .get<{ data: T }>(path, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ key, data: response.data.data, error: "" });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error: message(cause) });
      });
    return () => controller.abort();
  }, [path, key]);
  if (!path) return { data: null, error: "", loading: false };
  return state.key === key
    ? { ...state, loading: false }
    : { data: null, error: "", loading: true };
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
      <p className="c10-state" role="status">
        Đang tải dữ liệu…
      </p>
    );
  if (error)
    return (
      <div className="c10-error" role="alert">
        <CircleAlert size={18} aria-hidden="true" />
        <span>{error}</span>
        <button type="button" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  return null;
}

function Badge({ status, sepay = false }: { status: string; sepay?: boolean }) {
  const labels: Record<string, string> = sepay
    ? sepayStatuses
    : paymentStatuses;
  return (
    <span className={`c10-badge c10-status-${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}

function RevenuePanel({
  refresh,
  retry,
}: {
  refresh: number;
  retry: () => void;
}) {
  const [range, setRange] = useState(initialRange);
  const [error, setError] = useState("");
  const report = useResource<Revenue>(
    `/admin/stats/revenue-daily?${new URLSearchParams(range)}`,
    refresh,
  );
  const maximum =
    report.data?.series.reduce(
      (max, row) => (BigInt(row.revenue) > max ? BigInt(row.revenue) : max),
      0n,
    ) ?? 0n;
  const chart = report.data?.series.map((row) => ({
    ...row,
    value: maximum
      ? Number((BigInt(row.revenue) * 1000000n) / maximum) / 10000
      : 0,
  }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      fromDate: String(form.get("fromDate")),
      toDate: String(form.get("toDate")),
    };
    const days =
      (Date.parse(next.toDate) - Date.parse(next.fromDate)) / 86400000;
    if (!Number.isFinite(days) || days < 0 || days > 365) {
      setError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
      return;
    }
    setError("");
    setRange(next);
  }
  return (
    <section
      className="c10-panel c10-revenue"
      aria-labelledby="c10-revenue-title"
    >
      <div className="c10-section-head">
        <div>
          <h2 id="c10-revenue-title">Doanh thu theo ngày</h2>
          <p>Doanh thu đơn đã thanh toán · Múi giờ Việt Nam (UTC+7)</p>
        </div>
        <form className="c10-range" onSubmit={submit}>
          <label>
            Từ ngày
            <input
              type="date"
              name="fromDate"
              defaultValue={range.fromDate}
              required
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              name="toDate"
              defaultValue={range.toDate}
              required
            />
          </label>
          <button className="c10-button" type="submit">
            Áp dụng kỳ
          </button>
        </form>
      </div>
      {error && (
        <p className="c10-error" role="alert">
          {error}
        </p>
      )}
      <LoadState loading={report.loading} error={report.error} retry={retry} />
      {report.data && (
        <>
          <div className="c10-chart-summary">
            <div>
              <span>TỔNG DOANH THU TRONG KỲ</span>
              <strong>{money(report.data.totalRevenue)}</strong>
            </div>
            <p>
              {dayLabel(report.data.fromDate)} — {dayLabel(report.data.toDate)}
            </p>
          </div>
          {maximum === 0n && (
            <p className="c10-state" role="status">
              Chưa có doanh thu trong khoảng ngày này.
            </p>
          )}
          <div
            className="c10-chart"
            role="img"
            aria-label={`Biểu đồ doanh thu. Tổng ${money(report.data.totalRevenue)}. Có bảng dữ liệu chi tiết bên dưới.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chart}
                margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="c10-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5de6ff" stopOpacity={0.32} />
                    <stop
                      offset="100%"
                      stopColor="#5de6ff"
                      stopOpacity={0.01}
                    />
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
                  minTickGap={35}
                  tick={{ fill: "#ccc3d8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={70}
                  domain={[0, 100]}
                  ticks={maximum === 0n ? [0] : [0, 25, 50, 75, 100]}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("vi-VN", {
                      notation: "compact",
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
                      <div className="c10-tooltip">
                        <span>{dayLabel(point.date)}</span>
                        <strong>{money(point.revenue)}</strong>
                      </div>
                    ) : null;
                  }}
                />
                <Area
                  type="linear"
                  dataKey="value"
                  stroke="#5de6ff"
                  strokeWidth={3}
                  fill="url(#c10-fill)"
                  isAnimationActive={false}
                  dot={chart?.length === 1 ? { r: 5 } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="c10-daily">
            <summary>Xem dữ liệu doanh thu từng ngày</summary>
            <div
              className="c10-scroll"
              tabIndex={0}
              role="region"
              aria-label="Bảng doanh thu theo ngày"
            >
              <table>
                <caption className="c10-sr-only">
                  Doanh thu theo ngày, VND
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Ngày</th>
                    <th scope="col">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.series.map((row) => (
                    <tr key={row.date}>
                      <td>{dayLabel(row.date)}</td>
                      <td>{money(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function Ledger({
  view,
  refresh,
  retry,
  onSelect,
}: {
  view: View;
  refresh: number;
  retry: () => void;
  onSelect: (transaction: Transaction) => void;
}) {
  const [search, setSearch] = useSearchParams();
  const prefix = view === "payments" ? "p_" : "s_";
  const statuses: Record<string, string> =
    view === "payments" ? paymentStatuses : sepayStatuses;
  const status = search.get(prefix + "status") ?? "";
  const q = search.get(prefix + "q") ?? "";
  const from = search.get(prefix + "from") ?? "";
  const to = search.get(prefix + "to") ?? "";
  const pageValue = Number(search.get(prefix + "page") ?? 0);
  const page =
    Number.isInteger(pageValue) && pageValue >= 0 && pageValue <= 10000
      ? pageValue
      : 0;
  const [validation, setValidation] = useState("");
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  if (q) params.set(view === "payments" ? "q" : "reference", q);
  if (from) params.set("from", `${from}T00:00:00.000+07:00`);
  if (to) params.set("to", `${to}T23:59:59.999+07:00`);
  const endpoint =
    view === "payments" ? "/admin/payments" : "/admin/sepay/transactions";
  const path = `${endpoint}?${params}`;
  const rows = useResource<(Payment | Transaction)[]>(path, refresh);
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", String(page + 1));
  // Probe only the next batch; never enumerate the ledger to manufacture a total.
  const next = useResource<(Payment | Transaction)[]>(
    rows.data?.length === 50 && page < 10000
      ? `${endpoint}?${nextParams}`
      : null,
    refresh,
  );
  function changePage(value: number) {
    const updated = new URLSearchParams(search);
    updated.set(prefix + "page", String(value));
    setSearch(updated);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const begin = String(form.get("from") ?? ""),
      end = String(form.get("to") ?? "");
    if (begin && end && begin > end) {
      setValidation("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    const updated = new URLSearchParams(search);
    for (const key of ["q", "status", "from", "to"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) updated.set(prefix + key, value);
      else updated.delete(prefix + key);
    }
    updated.delete(prefix + "page");
    setValidation("");
    setSearch(updated);
  }
  const isSepay = view === "sepay";
  return (
    <section
      className="c10-ledger"
      aria-label={
        isSepay ? "Giao dịch ngân hàng SePay" : "Danh sách thanh toán"
      }
    >
      <form
        key={`${view}:${q}:${status}:${from}:${to}`}
        className="c10-filters"
        onSubmit={submit}
      >
        <label className="c10-search">
          <span>{isSepay ? "Mã tham chiếu ngân hàng" : "Mã giao dịch"}</span>
          <div>
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              maxLength={isSepay ? 256 : 200}
              defaultValue={q}
              placeholder={
                isSepay ? "Nhập chính xác mã tham chiếu" : "Tìm mã giao dịch…"
              }
            />
          </div>
        </label>
        <label>
          Trạng thái
          <select name="status" defaultValue={status}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Từ ngày
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label>
          Đến ngày
          <input type="date" name="to" defaultValue={to} />
        </label>
        <button className="c10-button" type="submit">
          Lọc giao dịch
        </button>
        <button
          className="c10-button c10-ghost"
          type="button"
          onClick={() => {
            const updated = new URLSearchParams(search);
            for (const key of ["q", "status", "from", "to", "page"])
              updated.delete(prefix + key);
            setSearch(updated);
            setValidation("");
          }}
        >
          Xóa lọc
        </button>
      </form>
      <p className="c10-help">
        {isSepay
          ? "Lọc theo thời gian giao dịch ngân hàng. Mã tham chiếu cần khớp chính xác."
          : "Lọc theo thời gian tạo thanh toán. Tìm kiếm theo mã giao dịch."}{" "}
        Múi giờ UTC+7.
      </p>
      {validation && (
        <p className="c10-error" role="alert">
          {validation}
        </p>
      )}
      <div className="c10-panel c10-table-card" aria-busy={rows.loading}>
        <LoadState loading={rows.loading} error={rows.error} retry={retry} />
        {rows.data && (
          <>
            {rows.data.length === 0 ? (
              <div className="c10-empty" role="status">
                <ReceiptText size={32} aria-hidden="true" />
                <strong>Không có giao dịch phù hợp</strong>
                <p>Thử đổi mã tìm kiếm, trạng thái hoặc khoảng ngày.</p>
              </div>
            ) : (
              <div
                className="c10-scroll"
                tabIndex={0}
                role="region"
                aria-label={
                  isSepay
                    ? "Bảng SePay, có thể cuộn ngang"
                    : "Bảng thanh toán, có thể cuộn ngang"
                }
              >
                <table className="c10-ledger-table">
                  <caption className="c10-sr-only">
                    {isSepay
                      ? "Giao dịch ngân hàng SePay"
                      : "Thanh toán mua vé"}
                    , trang {page + 1}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Mã giao dịch & thời gian</th>
                      <th scope="col">
                        {isSepay ? "Ngân hàng / Chiều tiền" : "Cổng thanh toán"}
                      </th>
                      <th scope="col" className="c10-right">
                        Giá trị giao dịch
                      </th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Đối soát</th>
                      {isSepay && <th scope="col">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.data.map((row) => {
                      if (isSepay) {
                        const tx = row as Transaction;
                        return (
                          <tr key={tx.id}>
                            <td>
                              <strong className="c10-code">
                                {tx.reference_code ??
                                  tx.webhook_transaction_id ??
                                  tx.api_transaction_id ??
                                  tx.id}
                              </strong>
                              <small>
                                {dateTime(tx.transaction_at ?? tx.received_at)}
                              </small>
                              <small>
                                Mã thanh toán: {tx.payment_code ?? "—"}
                              </small>
                            </td>
                            <td>
                              <strong>
                                {tx.bank_code} · {tx.account_masked}
                              </strong>
                              <small className="c10-direction">
                                {tx.transfer_type === "in" ? (
                                  <ArrowDownLeft size={14} aria-hidden="true" />
                                ) : (
                                  <ArrowUpRight size={14} aria-hidden="true" />
                                )}
                                {tx.transfer_type === "in"
                                  ? "Tiền vào"
                                  : "Tiền ra"}{" "}
                                · {tx.environment === "live" ? "Live" : "Test"}
                              </small>
                            </td>
                            <td className="c10-right c10-amount">
                              {money(tx.amount)}
                            </td>
                            <td>
                              <Badge status={tx.status} sepay />
                            </td>
                            <td>
                              <span className="c10-reason">
                                {tx.reason ?? "—"}
                              </span>
                              <small>Số lần xử lý: {tx.attempt_count}</small>
                            </td>
                            <td>
                              <button
                                className="c10-icon-button"
                                type="button"
                                aria-label={`Xem trace ${tx.reference_code ?? tx.id}`}
                                title="Xem trace đối soát"
                                data-c10-transaction={tx.id}
                                onClick={() => onSelect(tx)}
                              >
                                <ReceiptText size={19} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        );
                      }
                      const payment = row as Payment;
                      return (
                        <tr key={payment.id}>
                          <td>
                            <strong className="c10-code">
                              {payment.merchant_reference}
                            </strong>
                            <small>{dateTime(payment.created_at)}</small>
                          </td>
                          <td>
                            <strong>
                              {payment.provider === "sepay"
                                ? "MB Bank / SePay"
                                : payment.provider === "vnpay"
                                  ? "VNPay"
                                  : payment.provider}
                            </strong>
                          </td>
                          <td className="c10-right c10-amount">
                            {money(payment.amount)}
                          </td>
                          <td>
                            <Badge status={payment.status} />
                          </td>
                          <td>
                            <span className="c10-reason">
                              {payment.requires_review
                                ? payment.review_resolved_at
                                  ? "Đã ghi nhận kết quả"
                                  : "Cần đối soát"
                                : "—"}
                            </span>
                            {payment.requires_review && (
                              <small>{payment.review_reason}</small>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="c10-pagination">
              <p>
                {rows.data.length} giao dịch trên trang này{" "}
                <span>· Tối đa 50 / trang</span>
              </p>
              <nav
                aria-label={`Phân trang ${isSepay ? "SePay" : "thanh toán"}`}
              >
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => changePage(page - 1)}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Trước
                </button>
                <span aria-current="page">Trang {page + 1}</span>
                <button
                  type="button"
                  disabled={
                    rows.data.length !== 50 ||
                    page === 10000 ||
                    next.loading ||
                    !!next.error ||
                    !next.data?.length
                  }
                  onClick={() => changePage(page + 1)}
                >
                  Sau
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            </div>
            {rows.data.length === 50 && next.error && (
              <div className="c10-error" role="alert">
                Chưa kiểm tra được trang kế tiếp.{" "}
                <button type="button" onClick={retry}>
                  Thử lại
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ActionForm({
  action,
  transaction,
  done,
  reload,
}: {
  action: Action;
  transaction?: TransactionDetail;
  done: () => void;
  reload: () => void;
}) {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [success, setSuccess] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || success || uncertain) return;
    const data = new FormData(event.currentTarget);
    let path = "/admin/sepay/reconcile";
    let body: object = { lookbackMinutes: Number(data.get("lookbackMinutes")) };
    if (action === "reprocess") {
      path = `/admin/sepay/transactions/${transaction!.id}/reprocess`;
      body = {};
    }
    if (action === "resolve") {
      const reason = String(data.get("reason") ?? "").trim();
      if (reason.length < 3) {
        setError("Nhập lý do từ 3 đến 1000 ký tự.");
        return;
      }
      path = `/admin/sepay/transactions/${transaction!.id}/resolve`;
      body = {
        outcome: String(data.get("outcome")),
        reason,
        evidenceReference:
          String(data.get("evidenceReference") ?? "").trim() || null,
      };
    }
    locked.current = true;
    setPending(true);
    setError("");
    try {
      const response = await api.post<{ data: ReconcileResult }>(path, body, {
        timeout: action === "reconcile" ? 125000 : 15000,
      });
      if (action === "reconcile") {
        const result = response.data.data;
        setSuccess(
          `Đã đối soát ${result.scanned} giao dịch: nhập mới ${result.imported}, cần kiểm tra ${result.reviewed}, ghép webhook ${result.matchedWebhook}, trùng ${result.duplicates}, bỏ qua ${result.ignored}.`,
        );
      } else
        setSuccess(
          action === "reprocess"
            ? "Đã đưa giao dịch vào hàng đợi xử lý lại."
            : "Đã lưu kết quả xử lý và lịch sử đối soát.",
        );
      reload();
    } catch (cause: unknown) {
      const ambiguous =
        !axios.isAxiosError(cause) ||
        !cause.response ||
        cause.response.status >= 500;
      setUncertain(ambiguous);
      setError(
        ambiguous
          ? `${message(cause)} Chưa xác định thao tác đã hoàn tất hay chưa. Đóng hộp thoại và kiểm tra lại dữ liệu/lịch sử trước khi thực hiện tiếp.`
          : message(cause),
      );
      reload();
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return (
    <form className="c10-action-form" onSubmit={submit} aria-busy={pending}>
      <h3>{actionLabels[action]}</h3>
      {action === "reconcile" && (
        <>
          <p>Đọc dữ liệu ngân hàng trong khoảng gần đây để đối soát một lần.</p>
          <label>
            Khoảng đối soát (phút)
            <input
              type="number"
              name="lookbackMinutes"
              min={5}
              max={1440}
              step={1}
              defaultValue={60}
              required
              disabled={pending || !!success || uncertain}
            />
          </label>
        </>
      )}
      {action === "reprocess" && (
        <p>
          Đưa giao dịch về hàng đợi để hệ thống xử lý lại. Chỉ áp dụng cho giao
          dịch lỗi hoặc cần kiểm tra.
        </p>
      )}
      {action === "resolve" && (
        <>
          <p>
            Ghi nhận kết quả đã xử lý bên ngoài. Thao tác này không chuyển hoặc
            hoàn tiền qua ngân hàng.
          </p>
          <label>
            Kết quả
            <select
              name="outcome"
              aria-label="Kết quả"
              disabled={pending || !!success || uncertain}
            >
              <option value="confirmed_external">Đã xác nhận bên ngoài</option>
              <option value="refund_external">Đã hoàn tiền bên ngoài</option>
              <option value="unmatched">Chưa khớp giao dịch</option>
            </select>
          </label>
          <label>
            Lý do
            <textarea
              name="reason"
              minLength={3}
              maxLength={1000}
              rows={3}
              required
              disabled={pending || !!success || uncertain}
            />
          </label>
          <label>
            Tham chiếu bằng chứng (không bắt buộc)
            <input
              name="evidenceReference"
              maxLength={256}
              disabled={pending || !!success || uncertain}
            />
          </label>
        </>
      )}
      {error && (
        <p className="c10-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="c10-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          {success}
        </p>
      )}
      <div className="c10-actions">
        <button
          className="c10-button c10-ghost"
          type="button"
          disabled={pending}
          onClick={done}
        >
          {success || uncertain ? "Đóng và kiểm tra lại" : "Hủy"}
        </button>
        {!success && !uncertain && (
          <button className="c10-button" type="submit" disabled={pending}>
            {pending ? "Đang xử lý…" : "Xác nhận"}
          </button>
        )}
      </div>
    </form>
  );
}

function TransactionDialog({
  selected,
  close,
  refresh,
  reload,
}: {
  selected: Transaction;
  close: () => void;
  refresh: number;
  reload: () => void;
}) {
  const detail = useResource<TransactionDetail>(
    `/admin/sepay/transactions/${selected.id}`,
    refresh,
  );
  const [action, setAction] = useState<Action | null>(null);
  // Keep the action form mounted while refresh reloads the detail after a write.
  const [actionTransaction, setActionTransaction] = useState<
    TransactionDetail | undefined
  >();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !action) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="c10-overlay" />
        <Dialog.Content
          className="c10-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger =
              document.querySelector<HTMLButtonElement>(
                `[data-c10-transaction="${selected.id}"]`,
              ) ??
              document.querySelector<HTMLButtonElement>(
                '.c10-tabs button[aria-pressed="true"]',
              );
            trigger?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (action) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (action) event.preventDefault();
          }}
        >
          <div className="c10-dialog-head">
            <div>
              <Dialog.Title>Trace đối soát SePay</Dialog.Title>
              <Dialog.Description>
                {selected.reference_code ?? selected.id}
              </Dialog.Description>
            </div>
            {!action && (
              <Dialog.Close asChild>
                <button
                  className="c10-icon-button"
                  aria-label="Đóng chi tiết"
                  type="button"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </Dialog.Close>
            )}
          </div>
          {action ? (
            <ActionForm
              action={action}
              transaction={actionTransaction}
              reload={reload}
              done={() => {
                setAction(null);
                reload();
              }}
            />
          ) : (
            <>
              <LoadState
                loading={detail.loading}
                error={detail.error}
                retry={reload}
              />
              {detail.data && (
                <>
                  <Badge status={detail.data.status} sepay />
                  <dl className="c10-detail-grid">
                    {[
                      ["Giá trị giao dịch", money(detail.data.amount)],
                      [
                        "Ngân hàng",
                        `${detail.data.bank_code} · ${detail.data.account_masked}`,
                      ],
                      [
                        "Môi trường",
                        detail.data.environment === "live" ? "Live" : "Test",
                      ],
                      [
                        "Chiều tiền",
                        detail.data.transfer_type === "in"
                          ? "Tiền vào"
                          : "Tiền ra",
                      ],
                      ["Mã thanh toán", detail.data.payment_code ?? "—"],
                      ["ID thanh toán liên kết", detail.data.payment_id ?? "—"],
                      ["Tiếp nhận lúc", dateTime(detail.data.received_at)],
                      ["Xử lý lúc", dateTime(detail.data.processed_at)],
                      ["Số lần xử lý", String(detail.data.attempt_count)],
                      ["Lý do", detail.data.reason ?? "—"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3>Lịch sử đối soát</h3>
                  {!detail.data.history.length ? (
                    <p className="c10-state">Chưa có lịch sử ghi nhận.</p>
                  ) : (
                    <ol className="c10-history">
                      {detail.data.history.map((item) => (
                        <li key={item.id}>
                          <strong>
                            {(
                              {
                                confirmed_external: "Đã xác nhận bên ngoài",
                                refund_external: "Đã hoàn tiền bên ngoài",
                                unmatched: "Chưa khớp giao dịch",
                                REPROCESS: "Yêu cầu xử lý lại",
                              } as Record<string, string>
                            )[item.action] ?? item.action}
                          </strong>
                          <time>{dateTime(item.created_at)}</time>
                          <p>{item.reason}</p>
                          {item.evidence_reference && (
                            <small>Bằng chứng: {item.evidence_reference}</small>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="c10-actions">
                    {["ERROR", "REVIEW"].includes(detail.data.status) && (
                      <button
                        className="c10-button c10-ghost"
                        type="button"
                        onClick={() => {
                          setActionTransaction(detail.data!);
                          setAction("reprocess");
                        }}
                      >
                        Xử lý lại
                      </button>
                    )}
                    {detail.data.status !== "PROCESSING" && (
                      <button
                        className="c10-button"
                        type="button"
                        onClick={() => {
                          setActionTransaction(detail.data!);
                          setAction("resolve");
                        }}
                      >
                        Ghi nhận kết quả
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function C10PaymentAdmin() {
  const [search, setSearch] = useSearchParams();
  const view: View = search.get("view") === "sepay" ? "sepay" : "payments";
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [reconcile, setReconcile] = useState(false);
  const overview = useResource<Overview>("/admin/stats", refresh);
  const reload = () => setRefresh((value) => value + 1);
  return (
    <AdminShell title="Quản lý giao dịch">
      <div className="c10-page">
        <div className="c10-breadcrumb">
          TÀI CHÍNH & VẬN HÀNH <span>/</span>
          <strong>QUẢN LÝ GIAO DỊCH</strong>
        </div>
        <div className="c10-heading">
          <div>
            <h1>Quản lý giao dịch & đối soát thanh toán</h1>
            <p>
              Theo dõi thanh toán mua vé và kiểm tra giao dịch ngân hàng trên
              EventHub.
            </p>
          </div>
          <button
            className="c10-button c10-ghost"
            type="button"
            onClick={reload}
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Làm mới
          </button>
        </div>
        <LoadState
          loading={overview.loading}
          error={overview.error}
          retry={reload}
        />
        {overview.data && (
          <section
            className="c10-kpis"
            aria-label="Thống kê thanh toán toàn thời gian"
          >
            {[
              {
                label: "Doanh thu đơn đã thanh toán",
                value: money(overview.data.revenue),
                note: "Tổng doanh thu toàn thời gian",
                icon: CreditCard,
                color: "cyan",
              },
              {
                label: "Tiền provider đã nhận",
                value: money(overview.data.provider_received),
                note: "Tổng giá trị giao dịch thành công",
                icon: Wallet,
                color: "purple",
              },
              {
                label: "Thanh toán cần đối soát",
                value: integer(overview.data.needs_review),
                note: "Chưa ghi nhận kết quả xử lý",
                icon: ShieldCheck,
                color: "pink",
              },
            ].map((card) => (
              <article className={`c10-kpi c10-${card.color}`} key={card.label}>
                <div>
                  <span>{card.label}</span>
                  <card.icon size={21} aria-hidden="true" />
                </div>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </article>
            ))}
          </section>
        )}
        <RevenuePanel refresh={refresh} retry={reload} />
        <div className="c10-ledger-heading">
          <div
            role="group"
            aria-label="Loại danh sách giao dịch"
            className="c10-tabs"
          >
            {(
              [
                ["payments", "Thanh toán mua vé"],
                ["sepay", "Giao dịch ngân hàng SePay"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => {
                  const updated = new URLSearchParams(search);
                  updated.set("view", key);
                  setSearch(updated);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {view === "sepay" && (
            <button
              className="c10-button"
              type="button"
              onClick={() => setReconcile(true)}
              data-c10-reconcile
            >
              <RefreshCw size={17} aria-hidden="true" />
              Đối soát một lần
            </button>
          )}
        </div>
        <Ledger
          key={view}
          view={view}
          refresh={refresh}
          retry={reload}
          onSelect={setSelected}
        />
        {selected && (
          <TransactionDialog
            selected={selected}
            refresh={refresh}
            reload={reload}
            close={() => setSelected(null)}
          />
        )}
        <Dialog.Root
          open={reconcile}
          onOpenChange={(open) => {
            if (open) setReconcile(true);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="c10-overlay" />
            <Dialog.Content
              className="c10-dialog c10-small-dialog"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                document
                  .querySelector<HTMLButtonElement>("[data-c10-reconcile]")
                  ?.focus();
              }}
              onEscapeKeyDown={(event) => event.preventDefault()}
              onPointerDownOutside={(event) => event.preventDefault()}
            >
              <Dialog.Title>Đối soát ngân hàng SePay</Dialog.Title>
              <Dialog.Description>
                Kiểm tra và nhập giao dịch ngân hàng trong khoảng thời gian được
                chọn.
              </Dialog.Description>
              <ActionForm
                action="reconcile"
                reload={reload}
                done={() => setReconcile(false)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <style>{styles}</style>
    </AdminShell>
  );
}

const styles = `
.c10-page {
  padding: 26px 24px 48px;
  color: #e0e1f7;
  font-family: 'Be Vietnam Pro', sans-serif;
  min-width: 0;
}
.c10-page *, .c10-dialog * {
  box-sizing: border-box;
}
.c10-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 10px;
  letter-spacing: .07em;
  color: #ccc3d8;
  margin-bottom: 20px;
}
.c10-breadcrumb strong {
  color: #5de6ff;
}
.c10-heading, .c10-section-head, .c10-ledger-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}
.c10-heading h1 {
  font-family: 'Syne', 'Be Vietnam Pro', sans-serif;
  font-size: clamp(24px, 2.2vw, 34px);
  font-weight: 700;
  line-height: 1.35;
  margin: 0 0 10px;
  letter-spacing: -.03em;
}
.c10-heading p, .c10-section-head p, .c10-dialog p, .c10-help {
  font-size: 13px;
  line-height: 1.7;
  color: #ccc3d8;
  margin: 0;
}
.c10-button, .c10-pagination button, .c10-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #7c3aed;
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  min-height: 42px;
  padding: 10px 16px;
  cursor: pointer;
  flex-shrink: 0;
}
.c10-ghost, .c10-pagination button, .c10-icon-button {
  background: #262939;
  color: #e0e1f7;
}
.c10-button:hover, .c10-pagination button:hover, .c10-icon-button:hover {
  filter: brightness(1.15);
}
.c10-page button:disabled, .c10-dialog button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.c10-page :focus-visible, .c10-dialog :focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 3px;
}
.c10-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.c10-kpi {
  padding: 22px;
  border-radius: 12px;
  background: #1c1f2f;
  overflow-wrap: anywhere;
}
.c10-kpi > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.c10-kpi > div span {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: .035em;
  color: #ccc3d8;
}
.c10-kpi svg {
  box-sizing: content-box;
  padding: 9px;
  border-radius: 8px;
  background: #5de6ff12;
  color: #5de6ff;
  flex-shrink: 0;
}
.c10-purple svg {
  color: #d2bbff;
  background: #7c3aed20;
}
.c10-pink svg {
  color: #ffafd3;
  background: #ffafd312;
}
.c10-kpi > strong {
  display: block;
  font-family: 'Space Grotesk', 'Be Vietnam Pro', sans-serif;
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 700;
  line-height: 1.4;
}
.c10-kpi p {
  font-size: 11px;
  color: #ccc3d8;
  margin: 8px 0 0;
}
.c10-panel {
  background: #1c1f2f;
  border-radius: 12px;
  min-width: 0;
}
.c10-revenue {
  padding: 24px;
  margin-bottom: 32px;
}
.c10-page h2, .c10-dialog h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 7px;
  line-height: 1.4;
}
.c10-section-head {
  flex-wrap: wrap;
}
.c10-range, .c10-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.c10-page label, .c10-dialog label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 11px;
  color: #ccc3d8;
  min-width: 0;
}
.c10-page input, .c10-page select, .c10-dialog input, .c10-dialog select, .c10-dialog textarea {
  background: #101322;
  border: 1px solid #4a4455;
  color: #e0e1f7;
  border-radius: 8px;
  padding: 10px 12px;
  min-height: 42px;
  max-width: 100%;
  font: inherit;
  font-size: 12px;
  color-scheme: dark;
}
.c10-page input::placeholder {
  color: #aaa5ba;
}
.c10-chart-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 22px 0 12px;
}
.c10-chart-summary span {
  font-size: 10px;
  color: #ccc3d8;
  letter-spacing: .05em;
}
.c10-chart-summary strong {
  display: block;
  font-size: 24px;
  color: #5de6ff;
  margin-top: 6px;
  overflow-wrap: anywhere;
}
.c10-chart-summary p {
  font-size: 12px;
  color: #ccc3d8;
}
.c10-chart {
  width: 100%;
  height: 260px;
}
.c10-tooltip {
  display: grid;
  gap: 8px;
  background: #101322;
  border: 1px solid #4a4455;
  padding: 12px;
  border-radius: 8px;
  color: #e0e1f7;
  font-size: 12px;
}
.c10-daily {
  font-size: 12px;
  color: #ccc3d8;
  margin-top: 16px;
}
.c10-daily summary {
  cursor: pointer;
  padding: 10px 0;
}
.c10-tabs {
  display: flex;
  gap: 4px;
  padding: 5px;
  border-radius: 12px;
  background: #181b2a;
  flex-wrap: wrap;
}
.c10-tabs button {
  padding: 11px 15px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #ccc3d8;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.c10-tabs button[aria-pressed=true] {
  background: #7c3aed;
  color: #fff;
  box-shadow: 0 0 16px #7c3aed22;
}
.c10-filters {
  margin-bottom: 12px;
}
.c10-search {
  flex: 1 1 220px;
}
.c10-search > div {
  position: relative;
}
.c10-search svg {
  position: absolute;
  left: 12px;
  top: 12px;
  color: #aaa5ba;
}
.c10-search input {
  padding-left: 38px;
  width: 100%;
}
.c10-help {
  margin-bottom: 18px;
  font-size: 11px;
}
.c10-table-card {
  overflow: hidden;
}
.c10-scroll {
  overflow-x: auto;
  max-width: 100%;
}
.c10-page table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.c10-ledger-table {
  min-width: 800px;
}
.c10-page th {
  background: #262939;
  color: #ccc3d8;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .04em;
  font-weight: 500;
  text-align: left;
  padding: 16px;
}
.c10-page td {
  padding: 18px 16px;
  border-bottom: 1px solid #31344580;
  vertical-align: middle;
}
.c10-page td small {
  display: block;
  font-size: 10px;
  color: #ccc3d8;
  margin-top: 6px;
  overflow-wrap: anywhere;
}
.c10-page tbody tr:hover {
  background: #26293980;
}
.c10-code {
  color: #5de6ff;
  font-size: 12px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.c10-page .c10-right {
  text-align: right;
}
.c10-amount {
  font-weight: 700;
  white-space: nowrap;
}
.c10-reason {
  display: block;
  overflow-wrap: anywhere;
  max-width: 260px;
  font-size: 11px;
}
.c10-page .c10-direction {
  display: flex;
  align-items: center;
  gap: 4px;
}
.c10-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  background: #d2bbff18;
  color: #d2bbff;
  white-space: nowrap;
}
.c10-badge i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.c10-status-succeeded, .c10-status-processed {
  color: #5de6ff;
  background: #5de6ff18;
}
.c10-status-failed, .c10-status-error {
  color: #ffb4ab;
  background: #ffb4ab15;
}
.c10-status-pending, .c10-status-review {
  color: #fcd58b;
  background: #fcd58b15;
}
.c10-icon-button {
  padding: 9px;
  min-width: 40px;
  min-height: 40px;
  color: #5de6ff;
}
.c10-pagination, .c10-pagination nav {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.c10-pagination {
  justify-content: space-between;
  padding: 16px;
  background: #262939;
  font-size: 11px;
}
.c10-pagination p {
  margin: 0;
}
.c10-pagination p span {
  color: #ccc3d8;
}
.c10-pagination nav > span {
  background: #7c3aed;
  padding: 8px 10px;
  border-radius: 6px;
  color: #fff;
}
.c10-pagination button {
  padding: 8px 10px;
  background: #1c1f2f;
  min-height: 36px;
  font-size: 11px;
}
.c10-state, .c10-empty {
  color: #ccc3d8;
  font-size: 12px;
  padding: 22px;
}
.c10-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 48px 20px;
  text-align: center;
}
.c10-empty svg {
  color: #5de6ff;
}
.c10-empty p {
  margin: 0;
}
.c10-error, .c10-success {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: #ffb4ab12;
  border: 1px solid #ffb4ab30;
  color: #ffb4ab;
  padding: 14px;
  border-radius: 8px;
  font-size: 12px;
  margin: 12px 0;
  overflow-wrap: anywhere;
}
.c10-error button {
  background: transparent;
  border: 0;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.c10-success {
  background: #5de6ff12;
  border-color: #5de6ff30;
  color: #5de6ff;
}
.c10-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  background: #030510b8;
  backdrop-filter: blur(5px);
}
.c10-dialog {
  position: fixed;
  z-index: 101;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(720px, calc(100vw - 32px));
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  background: #1c1f2f;
  border: 1px solid #4a4455;
  border-radius: 16px;
  padding: 26px;
  color: #e0e1f7;
  font-family: 'Be Vietnam Pro', sans-serif;
}
.c10-small-dialog {
  width: min(520px, calc(100vw - 32px));
}
.c10-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.c10-dialog-head p {
  overflow-wrap: anywhere;
}
.c10-dialog h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 24px 0 12px;
}
.c10-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 24px 0;
}
.c10-detail-grid dt {
  font-size: 11px;
  color: #ccc3d8;
  margin-bottom: 6px;
}
.c10-detail-grid dd {
  margin: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.c10-history {
  display: grid;
  gap: 12px;
  padding: 0;
  list-style: none;
}
.c10-history li {
  padding: 16px;
  border-left: 2px solid #7c3aed;
  background: #262939;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.c10-history time {
  display: block;
  font-size: 10px;
  color: #ccc3d8;
  margin: 6px 0;
}
.c10-action-form {
  display: grid;
  gap: 16px;
}
.c10-dialog .c10-error {
  color: #ffb4ab;
}
.c10-dialog .c10-success {
  color: #5de6ff;
}
.c10-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}
.c10-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 1200px) {
  .c10-kpi {
    padding: 18px;
  }
  .c10-heading, .c10-ledger-heading {
    flex-wrap: wrap;
  }
}
@media (max-width: 900px) {
  .c10-kpis {
    grid-template-columns: 1fr;
  }
  .c10-kpi > div {
    margin-bottom: 12px;
  }
}
@media (max-width: 600px) {
  .c10-page {
    padding: 22px 16px 36px;
  }
  .c10-revenue {
    padding: 20px 14px;
  }
  .c10-range, .c10-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }
  .c10-search, .c10-filters > label:nth-child(2) {
    grid-column: 1 / -1;
  }
  .c10-range .c10-button {
    grid-column: 1 / -1;
  }
  .c10-page input, .c10-page select {
    width: 100%;
    min-width: 0;
  }
  .c10-tabs {
    width: 100%;
  }
  .c10-tabs button {
    flex: 1 1 140px;
  }
  .c10-pagination {
    justify-content: center;
  }
  .c10-pagination p span {
    display: none;
  }
  .c10-dialog {
    padding: 20px;
  }
  .c10-detail-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
`;
