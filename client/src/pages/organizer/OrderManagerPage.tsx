import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Copy, Eye, Menu, Plus, Printer, RefreshCw, Search, ShoppingCart, Ticket, Wallet, X } from "lucide-react";
import { get, message, useLoad } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import type { Event } from "@/features/ticketing/types";
import { OrganizerSidebar } from "./OrganizerSidebar";

type Group = "all" | "paid" | "processing" | "closed";
type Payment = { id: string; provider: string; status: string; amount: string; createdAt: string; succeededAt: string | null };
type Order = {
  id: string; orderCode: string; createdAt: string;
  buyer: { name: string; email: string; phone: string | null };
  event: { id: string; title: string };
  totalQuantity: number; totalAmount: string; currency: string;
  status: string; group: Exclude<Group, "all">;
  items: { typeName: string; quantity: number; unitPrice: string; lineTotal: string }[];
  payment: { paid: Payment | null; active: Payment | null; latest: Payment | null; display: Payment | null; unresolvedReview: boolean };
  tickets: { expected: number; issued: number; valid: number; checkedIn: number; void: number };
  actions: { canPreviewTickets: boolean; canPrintTickets: boolean };
};
type ListData = {
  asOf: string; items: Order[];
  counts: Record<Group, number>;
  summary: { totalOrders: number; revenuePaid: string; paidOrders: number; paidRatePercent: number; processingOrders: number; closedOrders: number };
  pagination: { page: number; pageSize: 50; total: number; totalPages: number };
};
type Preview = {
  orderId: string; orderCode: string; asOf: string;
  event: { id: string; title: string; startsAt: string; venueName: string };
  tickets: { id: string; code: string; typeName: string; buyerName: string; status: string; issuedAt: string; qrImage: string | null; printable: boolean }[];
};

const groups: { id: Group; title: string }[] = [
  { id: "all", title: "Tất cả" }, { id: "paid", title: "Đã thanh toán" },
  { id: "processing", title: "Đang xử lý" }, { id: "closed", title: "Đã đóng" },
];
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDate = (value: string) => dateTime.format(new Date(value));
const fmtMoney = (value: string) => { try { return `${BigInt(value).toLocaleString("vi-VN")} đ`; } catch { return "—"; } };
const providerLabel = (provider?: string) => ({ sepay: "VietQR / SePay", vnpay: "VNPay", demo: "Demo" }[provider?.toLowerCase() ?? ""] ?? provider ?? "Chưa có giao dịch");
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
const htmlDate = /^\d{4}-\d{2}-\d{2}$/;

function paymentLabel(order: Order) {
  if (order.payment.unresolvedReview) return "Cần tra soát";
  if (order.status === "PAID") return "Đã thanh toán";
  if (order.group === "processing") return "Đang xử lý";
  return order.status === "CANCELLED" ? "Đã hủy" : "Đã hết hạn";
}
function ticketLabel(order: Order) {
  if (order.tickets.void && order.tickets.valid + order.tickets.checkedIn === 0) return "Vé đã thu hồi";
  if (order.tickets.issued === 0) return order.status === "PAID" ? "Chờ phát hành" : "Chưa có vé";
  if (order.tickets.issued < order.tickets.expected) return `Đã phát hành ${order.tickets.issued}/${order.tickets.expected}`;
  if (order.tickets.checkedIn) return `Đã dùng ${order.tickets.checkedIn}/${order.tickets.issued}`;
  return `Đã xuất ${order.tickets.issued} vé`;
}

export function OrderManagerPage() {
  const { id = "" } = useParams();
  const userId = useAuth((state) => state.user?.idUser);
  return <OrderManager key={`${userId}:${id}`} eventId={id} />;
}

function OrderManager({ eventId }: { eventId: string }) {
  const user = useAuth((state) => state.user);
  const revision = useAuth((state) => state.revision);
  const [menuOpen, setMenuOpen] = useState(false);
  const event = useLoad<Event>(`/organizer/events/${eventId}`);
  const [queryInput, setQueryInput] = useState(""), [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState(""), [toDate, setToDate] = useState("");
  const [group, setGroup] = useState<Group>("all"), [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<ListData | null>(null), [loading, setLoading] = useState(true), [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null), [previewLoading, setPreviewLoading] = useState(false), [previewError, setPreviewError] = useState("");
  const [printData, setPrintData] = useState<Preview | null>(null), [printing, setPrinting] = useState(false);
  const printLock = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(queryInput.trim()); setPage(0); }, 300);
    return () => window.clearTimeout(timer);
  }, [queryInput]);
  const validDates = (!fromDate || htmlDate.test(fromDate)) && (!toDate || htmlDate.test(toDate)) && (!fromDate || !toDate || fromDate <= toDate);
  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), group });
    if (query) params.set("q", query);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    return `/organizer/events/${encodeURIComponent(eventId)}/order-manager?${params}`;
  }, [eventId, page, group, query, fromDate, toDate]);
  useEffect(() => {
    if (!validDates) { setList(null); setLoading(false); setListError("Ngày bắt đầu không được sau ngày kết thúc."); return; }
    let active = true;
    setList(null); setLoading(true); setListError("");
    get<ListData>(url).then((value) => { if (active) setList(value); })
      .catch((failure) => { if (active) setListError(message(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url, refresh, revision, validDates]);
  const previewUrl = selectedId ? `/organizer/events/${encodeURIComponent(eventId)}/orders/${encodeURIComponent(selectedId)}/tickets` : null;
  useEffect(() => {
    if (!previewUrl) { setPreview(null); setPreviewError(""); setPrintData(null); return; }
    let active = true;
    setPreview(null); setPreviewLoading(true); setPreviewError(""); setPrintData(null);
    get<Preview>(previewUrl).then((value) => { if (active) setPreview(value); })
      .catch((failure) => { if (active) setPreviewError(message(failure)); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [previewUrl, refresh, revision]);

  const reload = useCallback(() => { setRefresh((n) => n + 1); event.reload(); }, [event]);
  const selectOrder = (order: Order) => {
    setSelectedId(order.id); setPrintData(null);
    window.setTimeout(() => document.getElementById("b6-preview")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const printTickets = async () => {
    if (!previewUrl || printLock.current) return;
    printLock.current = true; setPrinting(true); setPreviewError("");
    try {
      const fresh = await get<Preview>(previewUrl);
      if (fresh.orderId !== selectedId || fresh.event.id !== eventId) return;
      setPreview(fresh);
      if (!fresh.tickets.some((ticket) => ticket.printable && ticket.qrImage)) {
        setPreviewError("Đơn hiện không có vé hợp lệ để in."); return;
      }
      setPrintData(fresh);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      window.print();
    } catch (failure) { setPreviewError(message(failure)); setPrintData(null); }
    finally { printLock.current = false; setPrinting(false); }
  };
  const currentEvent = event.data;
  const counts = list?.counts;
  const summary = list?.summary;
  const pagination = list?.pagination;
  const hasPrintable = preview?.tickets.some((ticket) => ticket.printable && ticket.qrImage) ?? false;

  return <div className="b6-page">
    <style>{styles}</style>
    <div className={`b6-navigation${menuOpen ? " is-open" : ""}`} id="b6-navigation"><OrganizerSidebar active="Đơn hàng" hideLiveSync /></div>
    {menuOpen && <button className="b6-backdrop" aria-label="Đóng điều hướng" onClick={() => setMenuOpen(false)} />}
    <div className="b6-body">
      <header className="b6-topbar">
        <button className="b6-menu-button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} aria-controls="b6-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav className="b6-breadcrumb" aria-label="Đường dẫn"><Link to="/organizer">EventHub</Link><span>/</span><span>Ban Tổ Chức</span><span>/</span><strong>Đơn hàng</strong></nav>
        <div className="b6-top-actions"><Link className="b6-create" to="/organizer/new"><Plus size={16} />Tạo sự kiện</Link><Link className="b6-icon-link" to="/notifications" aria-label="Thông báo"><Bell size={20} /></Link><Link className="b6-user" to="/profile"><span>{initials(user?.name ?? "")}</span><strong>{user?.name}</strong></Link></div>
      </header>
      <main className="b6-content">
        <div className="b6-heading"><div><span className="b6-eyebrow">GIAO DỊCH VÉ</span><h1>Quản lý đơn hàng &amp; Giao dịch vé</h1></div><div className="b6-event-control"><span>SỰ KIỆN ĐANG XEM</span><strong>{currentEvent?.title ?? "Đang tải sự kiện…"}</strong><Link to="/organizer/order-events">Đổi sự kiện</Link></div></div>
        {event.error && <div className="b6-alert" role="alert">{event.error}<button onClick={event.reload}>Thử tải lại</button></div>}
        {!event.error && <>
          <section className="b6-kpis" aria-label="Chỉ số đơn hàng">
            <div className="b6-kpi"><span>TỔNG ĐƠN HÀNG <ShoppingCart size={19} /></span><strong>{loading ? "…" : summary?.totalOrders.toLocaleString("vi-VN") ?? "—"}</strong><small>Theo sự kiện và bộ lọc hiện tại</small></div>
            <div className="b6-kpi"><span>DOANH THU GHI NHẬN <Wallet size={19} /></span><strong className="b6-money" title={summary ? fmtMoney(summary.revenuePaid) : undefined}>{loading ? "…" : summary ? fmtMoney(summary.revenuePaid) : "—"}</strong><small>Từ đơn có trạng thái đã thanh toán</small></div>
            <div className="b6-kpi"><span>THÀNH CÔNG <Ticket size={19} /></span><strong className="b6-cyan">{loading ? "…" : summary?.paidOrders.toLocaleString("vi-VN") ?? "—"}<em>{!loading && summary ? `${summary.paidRatePercent}%` : ""}</em></strong><div className="b6-meter"><i style={{ width: `${summary?.paidRatePercent ?? 0}%` }} /></div></div>
            <div className="b6-kpi"><span>ĐANG XỬ LÝ <RefreshCw size={19} /></span><strong className="b6-pink">{loading ? "…" : summary?.processingOrders.toLocaleString("vi-VN") ?? "—"}</strong><small>Bao gồm giao dịch cần tra soát</small></div>
            <div className="b6-kpi"><span>ĐÃ ĐÓNG <X size={19} /></span><strong className="b6-red">{loading ? "…" : summary?.closedOrders.toLocaleString("vi-VN") ?? "—"}</strong><small>Đơn hủy hoặc hết hạn</small></div>
          </section>
          <section className="b6-filters" aria-label="Lọc đơn hàng">
            <div className="b6-tabs" role="group" aria-label="Trạng thái đơn">{groups.map((item) => <button key={item.id} type="button" className={group === item.id ? "is-active" : ""} aria-pressed={group === item.id} onClick={() => { setGroup(item.id); setPage(0); setSelectedId(null); }}>{item.title} ({loading ? "…" : counts?.[item.id].toLocaleString("vi-VN") ?? "0"})</button>)}</div>
            <div className="b6-filter-row"><label className="b6-search"><Search size={18} /><span className="b6-sr-only">Tìm mã đơn, tên hoặc email</span><input value={queryInput} maxLength={200} onChange={(e) => { setQueryInput(e.target.value); setSelectedId(null); setPrintData(null); }} placeholder="Tìm mã đơn, tên hoặc email…" /></label><label className="b6-date"><CalendarDays size={17} /><span>Từ ngày</span><input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setPage(0); setSelectedId(null); }} /></label><label className="b6-date"><span>Đến ngày</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setPage(0); setSelectedId(null); }} /></label><button className="b6-refresh" type="button" onClick={reload} aria-label="Làm mới dữ liệu" title="Làm mới dữ liệu"><RefreshCw size={18} /></button></div>
            {!validDates && <p className="b6-inline-error" role="alert">Ngày bắt đầu không được sau ngày kết thúc.</p>}
          </section>
          {listError && <div className="b6-alert" role="alert"><span>{listError}</span><button onClick={reload}>Thử tải lại</button></div>}
          <section className="b6-table-card" aria-label="Bảng đơn hàng" aria-busy={loading}>
            <p className="b6-scroll-hint">Vuốt ngang bảng để xem thanh toán, trạng thái vé và thao tác.</p>
            <div className="b6-table-scroll"><table><thead><tr><th>Mã đơn &amp; thời gian</th><th>Khách hàng</th><th>Sự kiện &amp; hạng vé</th><th>Số tiền &amp; cổng TT</th><th>Thanh toán</th><th>Trạng thái vé</th><th>Thao tác</th></tr></thead><tbody>{!loading && list?.items.map((order) => <tr key={order.id}><td><div className="b6-code"><strong>#{order.orderCode}</strong><button type="button" aria-label={`Sao chép mã đơn ${order.orderCode}`} title="Sao chép mã đơn" onClick={() => void navigator.clipboard.writeText(order.orderCode)}><Copy size={14} /></button></div><small>{fmtDate(order.createdAt)}</small></td><td><div className="b6-buyer"><span className="b6-avatar">{initials(order.buyer.name)}</span><span><strong>{order.buyer.name}</strong><small>{order.buyer.email}</small><small>{order.buyer.phone ?? "Chưa có số điện thoại"}</small></span></div></td><td><strong className="b6-event-title">{order.event.title}</strong><div className="b6-types">{order.items.length ? order.items.map((item, index) => <span key={`${item.typeName}-${index}`}>{item.quantity} × {item.typeName}</span>) : <small>Chưa có hạng vé</small>}</div></td><td><strong>{fmtMoney(order.totalAmount)}</strong><small>{providerLabel(order.payment.display?.provider)}</small></td><td><span className={`b6-badge b6-${order.group}`}>{paymentLabel(order)}</span>{order.payment.display && <small>{order.payment.display.status === "FAILED" ? "Giao dịch không thành công" : order.payment.display.status === "UNKNOWN" ? "Chờ xác minh" : ""}</small>}</td><td><span className={`b6-badge b6-ticket-${order.tickets.issued ? "issued" : "empty"}`}>{ticketLabel(order)}</span></td><td><button className="b6-view" type="button" disabled={!order.actions.canPreviewTickets} title={order.actions.canPreviewTickets ? "Xem và in vé QR" : "Chưa có vé QR hợp lệ để xem"} aria-label={`Xem vé đơn ${order.orderCode}`} onClick={() => selectOrder(order)}><Eye size={17} /></button></td></tr>)}</tbody></table></div>
            {loading && <p className="b6-table-state" role="status">Đang tải đơn hàng…</p>}
            {!loading && !listError && list?.items.length === 0 && <p className="b6-table-state">Không có đơn hàng phù hợp với bộ lọc.</p>}
            <div className="b6-table-footer"><span>Hiển thị tối đa <strong>50</strong> trên tổng số <strong>{pagination?.total.toLocaleString("vi-VN") ?? 0}</strong> đơn hàng</span><div className="b6-pages"><button type="button" disabled={loading || page === 0} onClick={() => { setPage((value) => Math.max(0, value - 1)); setSelectedId(null); }}><ChevronLeft size={16} />Trang trước</button><span>Trang {page + 1} / {Math.max(1, pagination?.totalPages ?? 1)}</span><button type="button" disabled={loading || !pagination || page + 1 >= pagination.totalPages} onClick={() => { setPage((value) => value + 1); setSelectedId(null); }}>Trang sau<ChevronRight size={16} /></button></div></div>
          </section>
          <section id="b6-preview" className="b6-preview" aria-label="Xem trước vé điện tử"><div className="b6-preview-heading"><div><Ticket size={22} /><h2>Vé điện tử &amp; mã QR</h2></div>{selectedId && <button type="button" aria-label="Đóng xem trước" onClick={() => { setSelectedId(null); setPrintData(null); }}><X size={18} /></button>}</div>{!selectedId ? <p className="b6-muted">Chọn biểu tượng xem ở đơn đã phát hành vé để xem trước và in QR.</p> : previewLoading ? <p role="status">Đang tải vé…</p> : previewError ? <div className="b6-alert" role="alert">{previewError}<button onClick={() => setRefresh((n) => n + 1)}>Thử lại</button></div> : preview ? <><p className="b6-preview-order">Đơn #{preview.orderCode} · {preview.tickets.length} vé</p>{preview.tickets.length === 0 && <p className="b6-muted">Đơn đã thanh toán nhưng chưa phát hành vé.</p>}<div className="b6-ticket-grid">{preview.tickets.map((ticket) => <article className="b6-ticket" key={ticket.id}><div><small>{preview.event.title}</small><h3>{ticket.typeName}</h3><p>Khách: {ticket.buyerName}</p><p>Mã vé: {ticket.code}</p><span>{ticket.status === "CHECKED_IN" ? "Đã sử dụng" : ticket.status === "VOID" ? "Đã thu hồi" : "Sẵn sàng quét"}</span></div>{ticket.printable && ticket.qrImage ? <img src={ticket.qrImage} alt={`Mã QR vé ${ticket.code}`} /> : <div className="b6-no-qr">Không có QR hợp lệ</div>}</article>)}</div><button className="b6-print-button" type="button" disabled={!hasPrintable || printing} onClick={() => void printTickets()}><Printer size={17} />{printing ? "Đang chuẩn bị…" : "In vé"}</button></> : null}</section>
          <p className="b6-asof">{list && !loading ? `Dữ liệu đơn tại ${fmtDate(list.asOf)} (GMT+7). Làm mới để xem trạng thái mới nhất.` : ""}</p>
        </>}
      </main>
    </div>
    <div className="b6-print-root" aria-hidden="true">{printData?.tickets.filter((ticket) => ticket.printable && ticket.qrImage).map((ticket) => <article key={ticket.id}><h1>{printData.event.title}</h1><h2>{ticket.typeName}</h2><p>{printData.event.venueName} · {dateOnly.format(new Date(printData.event.startsAt))}</p><p>Khách: {ticket.buyerName}</p><p>Đơn #{printData.orderCode} · Vé {ticket.code}</p>{ticket.status === "CHECKED_IN" && <strong>ĐÃ SỬ DỤNG</strong>}<img src={ticket.qrImage!} alt={`QR vé ${ticket.code}`} /></article>)}</div>
  </div>;
}

const styles = `
.b6-page{--b6-bg:#0f1222;--b6-card:#181b2a;--b6-deep:#0a0d1c;--b6-high:#262939;--b6-text:#e0e1f7;--b6-muted:#a9a6b8;--b6-cyan:#5de6ff;--b6-purple:#d2bbff;--b6-pink:#ffafd3;color:var(--b6-text);background:var(--b6-bg);min-height:100vh;font-family:"Be Vietnam Pro",sans-serif}.b6-scroll-hint{display:none}
.b6-page *{box-sizing:border-box}.b6-page button,.b6-page select,.b6-page input{font:inherit}.b6-page button{cursor:pointer}.b6-page button:disabled{opacity:.48;cursor:not-allowed}.b6-page a{color:inherit;text-decoration:none}.b6-page :focus-visible{outline:2px solid var(--b6-cyan);outline-offset:2px}.b6-body{margin-left:16rem;min-width:0}.b6-topbar{height:64px;background:rgba(10,13,28,.94);border-bottom:1px solid #313445;display:flex;align-items:center;justify-content:space-between;padding:0 24px;gap:16px}.b6-breadcrumb{display:flex;align-items:center;gap:10px;font:500 12px "Space Grotesk",sans-serif;color:#a9a6b8}.b6-breadcrumb strong{color:var(--b6-cyan)}.b6-top-actions{display:flex;align-items:center;gap:18px}.b6-create{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;background:var(--b6-cyan);color:#00363e!important;font:700 12px "Space Grotesk",sans-serif}.b6-icon-link{display:flex}.b6-user{display:flex;align-items:center;gap:8px;font:600 12px "Space Grotesk",sans-serif}.b6-user span{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#482185;border:2px solid #7c3aed}.b6-menu-button{display:none}.b6-content{padding:24px;max-width:1800px;margin:0 auto}.b6-heading{display:flex;justify-content:space-between;align-items:end;gap:22px;margin-bottom:24px}.b6-eyebrow{color:var(--b6-cyan);font:700 11px "Space Grotesk",sans-serif;letter-spacing:.12em}.b6-heading h1{font:700 clamp(25px,3vw,34px) "Be VietNam Pro",sans-serif;margin:8px 0 0;letter-spacing:-.025em}.b6-event-control{background:var(--b6-card);border:1px solid #313445;border-radius:10px;min-width:270px;max-width:360px;padding:8px 12px;display:grid;gap:2px}.b6-event-control span{font:600 10px "Space Grotesk",sans-serif;color:var(--b6-muted);letter-spacing:.08em}.b6-event-control strong{color:var(--b6-text);font:600 13px "Space Grotesk",sans-serif;overflow-wrap:anywhere}.b6-event-control a{color:var(--b6-cyan);font:600 11px "Space Grotesk",sans-serif;justify-self:start;text-decoration:underline}.b6-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-bottom:24px}.b6-kpi{min-height:150px;background:var(--b6-card);border-radius:12px;padding:18px;min-width:0;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 20px #05071342}.b6-kpi>span{font:600 11px "Space Grotesk",sans-serif;color:var(--b6-muted);letter-spacing:.05em;display:flex;justify-content:space-between;gap:6px}.b6-kpi>span svg{color:var(--b6-purple);flex:none}.b6-kpi strong{font:700 24px "Be Vietnam Pro",sans-serif;overflow-wrap:anywhere}.b6-kpi strong.b6-money{font-size:clamp(17px,1.5vw,23px)}.b6-kpi small{font:500 11px "Space Grotesk",sans-serif;color:#aaa6b9}.b6-kpi .b6-cyan{color:var(--b6-cyan);display:flex;align-items:center;gap:8px;flex-wrap:wrap}.b6-kpi em{font:600 11px "Space Grotesk",sans-serif;background:#0b5862;padding:3px 5px;border-radius:4px;font-style:normal}.b6-kpi .b6-pink{color:var(--b6-pink)}.b6-kpi .b6-red{color:#ffb4ab}.b6-meter{height:6px;background:#313445;border-radius:20px;overflow:hidden}.b6-meter i{display:block;height:100%;background:var(--b6-cyan);border-radius:20px}.b6-filters{background:var(--b6-card);border-radius:12px;padding:16px;margin-bottom:24px;box-shadow:0 8px 20px #05071342}.b6-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.b6-tabs button{background:transparent;border:0;border-radius:8px;color:#c7c0d2;padding:9px 12px;font:600 12px "Space Grotesk",sans-serif}.b6-tabs button.is-active{background:#7c3aed;color:#fff;box-shadow:0 0 16px #7c3aed66}.b6-tabs button:hover:not(.is-active){background:#262939}.b6-filter-row{display:grid;grid-template-columns:minmax(230px,1fr) minmax(160px,220px) minmax(160px,220px) 42px;gap:10px}.b6-search,.b6-date{min-width:0;display:flex;align-items:center;gap:8px;background:var(--b6-deep);border:1px solid #313445;border-radius:8px;padding:0 12px;color:#a9a6b8}.b6-search input,.b6-date input{background:transparent;border:0;color:var(--b6-text);min-width:0;width:100%;height:42px;outline:0;font-size:12px}.b6-date span{white-space:nowrap;font:500 11px "Space Grotesk",sans-serif}.b6-date input{color-scheme:dark}.b6-refresh{display:grid;place-items:center;border:0;border-radius:8px;background:#262939;color:var(--b6-cyan)}.b6-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.b6-alert{background:#482126;border:1px solid #a24b52;border-radius:9px;padding:14px;display:flex;justify-content:space-between;gap:12px;align-items:center;margin:12px 0}.b6-alert button{background:#262939;color:#fff;border:0;border-radius:7px;padding:8px 10px}.b6-inline-error{color:#ffb4ab;font-size:12px;margin:9px 0 0}.b6-muted{color:var(--b6-muted);font-size:13px}.b6-table-card{background:var(--b6-card);border-radius:12px;overflow:hidden;box-shadow:0 12px 30px #05071355}.b6-table-scroll{overflow-x:auto;scrollbar-color:#4a4455 #0a0d1c}.b6-table-card table{border-collapse:collapse;width:100%;min-width:1060px;text-align:left}.b6-table-card thead{background:var(--b6-deep)}.b6-table-card th{padding:14px 13px;color:#a9a6b8;text-transform:uppercase;font:600 11px "Space Grotesk",sans-serif;letter-spacing:.04em}.b6-table-card td{padding:16px 13px;vertical-align:middle;font-size:12px}.b6-table-card tbody tr:nth-child(even){background:#0f122255}.b6-table-card tbody tr:hover{background:#262939}.b6-table-card td strong{display:block;font-weight:600}.b6-table-card td small{display:block;color:#a9a6b8;font:500 11px "Space Grotesk",sans-serif;margin-top:4px}.b6-code{display:flex;align-items:center;gap:6px;color:var(--b6-cyan)}.b6-code button{color:#a9a6b8;background:none;border:0;padding:2px;display:grid;place-items:center}.b6-buyer{display:flex;align-items:center;gap:8px;max-width:210px}.b6-buyer>span:last-child{min-width:0}.b6-buyer small{overflow-wrap:anywhere}.b6-avatar{width:32px;height:32px;display:grid;place-items:center;flex:none;border-radius:50%;background:#482a73;color:#eaddff;font:700 11px "Be Vietnam Pro",sans-serif}.b6-event-title{max-width:200px;overflow-wrap:anywhere}.b6-types{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.b6-types span{background:#ae397b44;color:#ffafd3;font:600 10px "Space Grotesk",sans-serif;padding:3px 5px;border-radius:4px}.b6-badge{display:inline-flex;align-items:center;border-radius:99px;padding:6px 9px;font:600 11px "Space Grotesk",sans-serif;text-align:center}.b6-paid{background:#00cbe622;color:#5de6ff}.b6-processing{background:#ae397b33;color:#ffafd3}.b6-closed{background:#93000a33;color:#ffb4ab}.b6-ticket-issued{background:#7c3aed33;color:#d2bbff}.b6-ticket-empty{background:#313445;color:#c7c0d2}.b6-view{border:0;border-radius:7px;background:#262939;color:var(--b6-cyan);width:34px;height:34px;display:grid;place-items:center}.b6-table-state{padding:28px;text-align:center;color:#a9a6b8;font-size:13px}.b6-table-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:var(--b6-deep);font:500 11px "Space Grotesk",sans-serif;color:#a9a6b8}.b6-table-footer strong{color:var(--b6-text)}.b6-pages{display:flex;align-items:center;gap:7px}.b6-pages button{display:flex;align-items:center;gap:4px;border:0;background:#262939;color:#e0e1f7;border-radius:7px;padding:7px 9px}.b6-pages>span{padding:0 8px;color:#e0e1f7}.b6-preview{margin-top:24px;background:var(--b6-card);border-radius:12px;padding:18px;max-width:700px;min-height:150px}.b6-preview-heading,.b6-preview-heading>div{display:flex;align-items:center;gap:9px}.b6-preview-heading{justify-content:space-between}.b6-preview-heading svg{color:var(--b6-cyan)}.b6-preview-heading h2{font:700 20px "Be Vietnam Pro",sans-serif;margin:0}.b6-preview-heading button{border:0;background:none;color:#a9a6b8}.b6-preview-order{font:600 12px "Space Grotesk",sans-serif;color:var(--b6-cyan)}.b6-ticket-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.b6-ticket{background:var(--b6-deep);border:1px solid #313445;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:145px}.b6-ticket h3{font:700 16px "Be Vietnam Pro",sans-serif;margin:10px 0}.b6-ticket small{color:var(--b6-cyan);font:600 10px "Space Grotesk",sans-serif}.b6-ticket p{font-size:11px;color:#c7c0d2;margin:4px 0}.b6-ticket span{font:600 10px "Space Grotesk",sans-serif;color:var(--b6-cyan)}.b6-ticket img{width:92px;height:92px;object-fit:contain;background:#fff;border-radius:5px;padding:3px;flex:none}.b6-no-qr{font-size:11px;color:#ffb4ab}.b6-print-button{display:inline-flex;align-items:center;gap:7px;background:#262939;border:0;border-radius:8px;color:#fff;font:600 12px "Space Grotesk",sans-serif;padding:10px 14px;margin-top:15px}.b6-asof{font-size:11px;color:#a9a6b8;margin:16px 0}.b6-print-root{display:none}
@media(max-width:1250px){.b6-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.b6-filter-row{grid-template-columns:1fr 1fr}.b6-search{grid-column:1/-1}.b6-refresh{width:42px}}
@media(max-width:900px){.b6-body{margin-left:0}.b6-navigation{display:none}.b6-navigation.is-open{display:block}.b6-navigation.is-open .osb-sidebar{display:flex!important;z-index:80}.b6-backdrop{position:fixed;inset:0;background:#0009;border:0;z-index:70}.b6-menu-button{display:grid;place-items:center;border:0;background:none;color:#e0e1f7;padding:5px}.b6-topbar{gap:9px}.b6-breadcrumb{margin-right:auto}.b6-scroll-hint{display:block;margin:0;padding:10px 14px;background:#0a0d1c;color:#a9a6b8;font:500 11px "Space Grotesk",sans-serif}}
@media(max-width:650px){.b6-content{padding:16px}.b6-topbar{padding:0 16px}.b6-breadcrumb span:nth-of-type(1),.b6-breadcrumb span:nth-of-type(2),.b6-breadcrumb strong,.b6-user strong,.b6-create{display:none}.b6-heading{align-items:stretch;flex-direction:column}.b6-event-control{max-width:none}.b6-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.b6-kpi{padding:13px;min-height:130px}.b6-kpi strong{font-size:20px}.b6-filter-row{grid-template-columns:1fr}.b6-search{grid-column:auto}.b6-date{width:100%}.b6-table-footer{flex-direction:column;align-items:stretch}.b6-pages{justify-content:space-between}.b6-preview{max-width:none}}
@media(max-width:390px){.b6-kpis{grid-template-columns:1fr}.b6-kpi{min-height:100px}.b6-tabs button{font-size:11px;padding:8px}}
@media print{@page{size:A4;margin:16mm}body{background:#fff!important}.b6-page{background:#fff!important;color:#000!important;min-height:0}.b6-page>.b6-navigation,.b6-page>.b6-backdrop,.b6-page>.b6-body{display:none!important}.b6-print-root{display:block!important}.b6-print-root article{font-family:Arial,sans-serif;color:#000;background:#fff;border:1px solid #bbb;padding:16mm;margin:0 0 10mm;break-inside:avoid;page-break-inside:avoid;min-height:110mm}.b6-print-root h1{font-size:20pt;margin:0 0 8mm}.b6-print-root h2{font-size:16pt;margin:0 0 6mm}.b6-print-root p{font-size:11pt}.b6-print-root img{display:block;width:52mm;height:52mm;object-fit:contain;margin:8mm auto 0}.b6-print-root strong{display:block;color:#a00}}
`;
