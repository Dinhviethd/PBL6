import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  BadgeCheck,
  RefreshCw,
  CircleX,
  Search,
  ReceiptText,
  Headset,
  Phone,
  Mail,
  Ticket,
  ChevronRight,
  Eye,
} from "lucide-react";
import { MyWaitQueue } from "@/components/ticketing/wait-queue";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { message } from "@/features/ticketing/data";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import {
  useOrderHistory,
  periodQuery,
  orderMoney,
  orderDate,
  paymentLabel,
  ticketLabel,
  type HistoryData,
  type HistoryOrder,
} from "./order-history";
import "./my-orders.css";

const pending = (data: HistoryData) => data.summary.processing > 0;
const tabs = [
  { id: "all", label: "Tất cả" },
  { id: "paid", label: "Đã thanh toán" },
  { id: "processing", label: "Đang xử lý" },
  { id: "closed", label: "Thất bại / Hủy" },
] as const;
const development = "Chức năng đang trong quá trình phát triển";
function OrderDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const r = useOrderHistory<HistoryOrder>(`/me/order-history/${id}`);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/orders/${id}/cancel`);
      setConfirm(false);
      onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      r.reload();
    }
  };
  const o = r.data;
  return (
    <>
      <DialogTitle>Chi tiết đơn hàng</DialogTitle>
      <DialogDescription>
        Thông tin thanh toán và vé thuộc đơn hàng này.
      </DialogDescription>
      {r.loading ? (
        <p role="status">Đang tải đơn hàng…</p>
      ) : r.error ? (
        <div role="alert">
          {r.error}
          <button onClick={r.reload}>Thử lại</button>
        </div>
      ) : (
        o && (
          <>
            <strong className="oh-code">{o.order_code}</strong>
            <h3>{o.event_title_snapshot}</h3>
            <p>
              {orderDate(o.created_at)} (UTC+7) · {paymentLabel(o)}
            </p>
            <ul className="oh-detail-list">
              {o.items.map((i, n) => (
                <li key={n}>
                  <span>
                    {i.ticket_type_name_snapshot} × {i.quantity}
                  </span>
                  <strong>{orderMoney(i.line_total)}</strong>
                </li>
              ))}
            </ul>
            <p>
              Tổng tiền: <strong>{orderMoney(o.total_amount)}</strong>
            </p>
            {o.payment.unresolvedReview && (
              <p role="status">
                Giao dịch cần được tra soát. Vui lòng liên hệ hỗ trợ trước khi
                thanh toán thêm.
              </p>
            )}
            {o.payment.latest?.status === "FAILED" && (
              <p>
                Lần thanh toán gần nhất không thành công. Trạng thái đơn và vé
                được hiển thị riêng ở trên.
              </p>
            )}
            <h3>Vé trong đơn · {ticketLabel(o)}</h3>
            {o.ticketList?.length ? (
              <ul className="oh-detail-list">
                {o.ticketList.map((t, n) => (
                  <li key={t.id}>
                    <span>
                      Vé {n + 1} · {t.ticket_type_name_snapshot}
                      <small>
                        {t.status === "VALID"
                          ? "Hợp lệ"
                          : t.status === "CHECKED_IN"
                            ? `Đã sử dụng${t.checked_in_at ? ` · ${orderDate(t.checked_in_at)}` : ""}`
                            : "Đã hủy"}
                      </small>
                    </span>
                    <Link to={`/tickets/${t.id}`}>Xem vé & QR</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Đơn hàng chưa có vé được phát hành.</p>
            )}
            <div className="oh-actions">
              <button onClick={r.reload} disabled={busy}>
                <RefreshCw size={15} />
                Kiểm tra trạng thái
              </button>
              {o.actions.canContinueCheckout && (
                <Link className="oh-primary" to={`/checkout/${id}`}>
                  Tiếp tục thanh toán
                </Link>
              )}
              {o.actions.canCancel && !confirm && (
                <button onClick={() => setConfirm(true)} disabled={busy}>
                  Hủy đơn
                </button>
              )}
            </div>
            {confirm && (
              <div className="oh-confirm">
                <p>Hủy đơn và giải phóng các vé đang giữ chỗ?</p>
                <button disabled={busy} onClick={() => void cancel()}>
                  {busy ? "Đang hủy…" : "Xác nhận hủy đơn"}
                </button>
                <button disabled={busy} onClick={() => setConfirm(false)}>
                  Giữ đơn
                </button>
              </div>
            )}
            {error && <p role="alert">{error}</p>}
            <small>
              Kiểm tra trạng thái tải lại dữ liệu EventHub, không khởi tạo giao
              dịch mới.
            </small>
          </>
        )
      )}
    </>
  );
}
export function MyOrders() {
  const revision = useAuth((s) => s.revision);
  const [page, setPage] = useState(0),
    [group, setGroup] = useState("all"),
    [period, setPeriod] = useState("year"),
    [q, setQ] = useState(""),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
      id: string;
      revision: number;
    } | null>(null),
    [notice, setNotice] = useState("");
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "5",
    group,
    q,
    ...periodQuery(period),
  });
  const r = useOrderHistory<HistoryData>(
      `/me/order-history?${params}`,
      pending,
    ),
    d = r.data;
  const open = (id: string) => setSelected({ id, revision });
  const year = new Date(Date.now() + 7 * 3600000).getUTCFullYear();
  const periodLabel =
    period === "year"
      ? `Năm ${year}`
      : period === "month"
        ? "Tháng này"
        : period === "three"
          ? "3 tháng gần nhất"
          : "Toàn thời gian";
  return (
    <div className="oh-page">
      <nav className="oh-breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <Link to="/profile">Tài khoản của tôi</Link>
        <ChevronRight size={12} />
        <span>Lịch sử đơn hàng</span>
      </nav>
      <header className="oh-heading">
        <div>
          <span className="oh-eyebrow">● Quản lý đơn hàng EventHub</span>
          <h1>
            Lịch sử đơn hàng <span>& giao dịch</span>
          </h1>
          <p>Theo dõi đơn hàng, trạng thái thanh toán và vé điện tử của bạn.</p>
        </div>
        <button onClick={() => setNotice(development)}>
          <ReceiptText size={17} />
          Xuất báo cáo VAT
        </button>
      </header>
      {notice && (
        <div className="oh-notice" role="status">
          {notice}
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <section
        className="oh-kpis"
        aria-label="Tổng quan đơn hàng"
        aria-busy={r.loading}
      >
        {[
          {
            label: `Tổng chi tiêu · ${periodLabel}`,
            value: d ? orderMoney(d.summary.totalAmount) : "—",
            note: "Đơn đã thanh toán, theo ngày tạo đơn",
            icon: Wallet,
            tone: "purple",
          },
          {
            label: "Đơn thành công",
            value: d?.summary.paid ?? "—",
            note: "Đã thanh toán, không cần tra soát",
            icon: BadgeCheck,
            tone: "cyan",
          },
          {
            label: "Đang xử lý",
            value: d?.summary.processing ?? "—",
            note: "Chờ thanh toán, xác minh hoặc tra soát",
            icon: RefreshCw,
            tone: "pink",
          },
          {
            label: "Đã hủy / Hết hạn",
            value: d?.summary.closed ?? "—",
            note: "Các đơn đã đóng trong kỳ",
            icon: CircleX,
            tone: "red",
          },
        ].map((k) => (
          <article key={k.tone} className={`oh-kpi ${k.tone}`}>
            <div>
              <h2>{k.label}</h2>
              <k.icon size={20} />
            </div>
            <strong>{k.value}</strong>
            <p>{k.note}</p>
          </article>
        ))}
      </section>
      <div className="oh-toolbar">
        <div className="oh-tabs" aria-label="Lọc trạng thái">
          {tabs.map((t) => (
            <button
              key={t.id}
              aria-pressed={group === t.id}
              onClick={() => {
                setGroup(t.id);
                setPage(0);
              }}
            >
              {t.label} ({d?.counts[t.id] ?? "—"})
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
            setPage(0);
          }}
        >
          <label>
            <Search size={17} />
            <input
              aria-label="Tìm mã đơn hoặc tên sự kiện"
              placeholder="Mã đơn hoặc tên sự kiện"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" aria-label="Tìm kiếm">
            <Search size={17} />
          </button>
        </form>
        <select
          aria-label="Bộ lọc thời gian đơn hàng"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setPage(0);
          }}
        >
          <option value="year">Năm {year}</option>
          <option value="month">Tháng này</option>
          <option value="three">3 tháng gần nhất</option>
          <option value="all">Toàn thời gian</option>
        </select>
      </div>
      {r.loading ? (
        <div className="oh-state" role="status">
          Đang tải lịch sử đơn hàng…
        </div>
      ) : r.error ? (
        <div className="oh-state" role="alert">
          <p>{r.error}</p>
          <button onClick={r.reload}>Thử lại</button>
        </div>
      ) : (
        d && (
          <section className="oh-table-panel" aria-label="Danh sách đơn hàng">
            {!d.items.length ? (
              <div className="oh-state">
                <Ticket size={32} />
                <h2>
                  {q || group !== "all"
                    ? "Không tìm thấy đơn hàng phù hợp"
                    : "Chưa có đơn hàng trong khoảng thời gian này"}
                </h2>
                <button
                  onClick={() => {
                    setQ("");
                    setSearch("");
                    setGroup("all");
                    setPeriod("all");
                    setPage(0);
                  }}
                >
                  Xem toàn bộ đơn hàng
                </button>
                <Link to="/explore">Khám phá sự kiện</Link>
              </div>
            ) : (
              <div
                className="oh-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Bảng đơn hàng, cuộn ngang để xem thêm"
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        "Mã đơn & Ngày đặt",
                        "Sự kiện & Hạng vé",
                        "Số tiền & Thanh toán",
                        "Trạng thái thanh toán",
                        "Trạng thái vé",
                        "Thao tác",
                      ].map((h) => (
                        <th scope="col" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.items.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <button
                            className="oh-code"
                            onClick={() => open(o.id)}
                          >
                            {o.order_code}
                          </button>
                          <small>{orderDate(o.created_at)}</small>
                        </td>
                        <td>
                          <h3>{o.event_title_snapshot}</h3>
                          {o.items.map((i, n) => (
                            <small className="oh-type" key={n}>
                              {i.ticket_type_name_snapshot}{" "}
                              <span>× {i.quantity} vé</span>
                            </small>
                          ))}
                        </td>
                        <td>
                          <strong>{orderMoney(o.total_amount)}</strong>
                          <small>
                            {(
                              {
                                vnpay_sandbox: "VNPay Sandbox",
                                demo: "Thanh toán demo",
                              } as Record<string, string>
                            )[
                              (
                                o.payment.paid ??
                                o.payment.active ??
                                o.payment.latest
                              )?.provider ?? ""
                            ] ?? "Chưa có thông tin cổng"}
                          </small>
                        </td>
                        <td>
                          <span className={`oh-badge ${o.group}`}>
                            {paymentLabel(o)}
                          </span>
                          {o.payment.unresolvedReview &&
                            o.status === "PAID" && (
                              <small>Đơn đã thanh toán</small>
                            )}
                        </td>
                        <td>
                          <span className="oh-ticket-state">
                            {ticketLabel(o)}
                          </span>
                          {o.tickets.issued > 0 && (
                            <small>
                              {o.tickets.issued}/{o.tickets.expected} vé được
                              phát hành
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="oh-actions">
                            <button
                              className={
                                o.actions.canViewTickets ? "oh-cyan" : ""
                              }
                              onClick={() => open(o.id)}
                            >
                              {o.actions.canViewTickets ? (
                                <Ticket size={15} />
                              ) : (
                                <Eye size={15} />
                              )}{" "}
                              {o.actions.canViewTickets
                                ? "Xem vé & QR"
                                : "Xem chi tiết"}
                            </button>
                            {o.status === "PAID" && (
                              <button
                                aria-label={`Tải VAT đơn ${o.order_code}`}
                                onClick={() => setNotice(development)}
                              >
                                <ReceiptText size={16} />
                              </button>
                            )}
                            {o.actions.canContinueCheckout && (
                              <Link
                                className="oh-primary"
                                to={`/checkout/${o.id}`}
                              >
                                Tiếp tục thanh toán
                              </Link>
                            )}
                            {o.group === "processing" && (
                              <button
                                onClick={() => {
                                  r.reload();
                                  setNotice(
                                    "Đang tải lại trạng thái từ EventHub.",
                                  );
                                }}
                              >
                                <RefreshCw size={15} />
                                Kiểm tra thanh toán
                              </button>
                            )}
                            {o.actions.canCancel && (
                              <button onClick={() => open(o.id)}>
                                Hủy đơn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="oh-pagination">
              <span>
                Hiển thị {d.items.length ? page * 5 + 1 : 0}–
                {page * 5 + d.items.length} của{" "}
                <strong>{d.pagination.total}</strong> đơn hàng
              </span>
              <nav aria-label="Phân trang đơn hàng">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹ Trước
                </button>
                <span aria-current="page">
                  {page + 1} / {Math.max(1, d.pagination.totalPages)}
                </span>
                <button
                  disabled={page + 1 >= d.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau ›
                </button>
              </nav>
            </footer>
          </section>
        )
      )}
      <details className="oh-wait">
        <summary>Danh sách chờ vé của tôi</summary>
        <MyWaitQueue />
      </details>
      <aside className="oh-support">
        <Headset size={36} />
        <div>
          <h2>Cần hỗ trợ tra soát giao dịch?</h2>
          <p>
            Nếu đã bị trừ tiền nhưng chưa nhận được vé, hãy liên hệ EventHub và
            cung cấp mã đơn hàng.
          </p>
        </div>
        <div className="oh-actions">
          <a className="oh-cyan" href="tel:0378531013">
            <Phone size={16} />
            Hotline: 0378531013
          </a>
          <a href="mailto:trankhahao7@gmail.com">
            <Mail size={16} />
            Liên hệ hỗ trợ
          </a>
        </div>
      </aside>
      {d && (
        <p className="oh-updated">
          Cập nhật {orderDate(d.asOf)} (UTC+7). Thống kê theo ngày tạo đơn, độc
          lập với tìm kiếm và tab.
        </p>
      )}
      <Dialog
        open={selected?.revision === revision}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="oh-dialog">
          {selected?.revision === revision && (
            <OrderDetail
              key={selected.id}
              id={selected.id}
              onChanged={r.reload}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
