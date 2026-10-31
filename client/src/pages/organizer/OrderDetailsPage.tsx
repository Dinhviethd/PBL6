import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CheckCircle2,
  CloudUpload as CloudSync,
  History,
  Menu,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import { get, message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { OrganizerSidebar } from "./OrganizerSidebar";

type Payment = {
  id: string;
  provider: string;
  status: string;
  amount: string;
  succeededAt: string | null;
  providerTransactionId: string | null;
};
type TimelineEvent = {
  id: string;
  type: "ORDER_CREATED" | "VIETQR_WINDOW" | "PAYMENT_SUCCEEDED" | "QR_ISSUED";
  occurredAt: string | null;
  paymentCreatedAt?: string;
  referenceWindowEndsAt?: string;
  effectiveWindowEndsAt?: string;
  providerExpiresAt?: string | null;
  ticketCode?: string;
};
type Detail = {
  id: string;
  orderCode: string;
  status: string;
  createdAt: string;
  totalAmount: string;
  totalQuantity: number;
  currency: string;
  buyer: {
    name: string;
    email: string;
    phone: string | null;
    phoneSource: "CURRENT_PROFILE" | null;
  };
  bankAccount: {
    paymentId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    source: "PAYMENT_SNAPSHOT";
  } | null;
  timeline: TimelineEvent[];
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    venueName: string;
  };
  items: {
    typeName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  tickets: {
    id: string;
    code: string;
    typeName: string;
    unitPrice: string;
    status: string;
    issuedAt: string;
    checkedInAt: string | null;
  }[];
  payment: {
    paid: Payment | null;
    display: Payment | null;
    unresolvedReview: boolean;
  };
  actions: { canPreviewTickets: boolean; canPrintTickets: boolean };
  asOf: string;
};
type Preview = {
  orderId: string;
  event: { id: string };
  tickets: {
    id: string;
    code: string;
    typeName: string;
    buyerName: string;
    printable: boolean;
    qrImage: string | null;
  }[];
};

const money = (value: string, currency = "VND") => {
  try {
    return `${BigInt(value).toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;
  } catch {
    return "Chưa có thông tin";
  }
};
const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
const provider = (value?: string) =>
  ({ sepay: "VietQR / SePay", vnpay: "VNPay", demo: "Demo" })[
    value?.toLowerCase() ?? ""
  ] ??
  value ??
  "Chưa có giao dịch";
const ticketStatus = (value: string) =>
  ({
    VALID: "Chưa check-in",
    CHECKED_IN: "Đã check-in",
    VOID: "Vé đã thu hồi",
  })[value] ?? value;

function CardHeading({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="b7-card-heading">
      <div className="b7-title-icon">{icon}</div>
      <div className="b7-heading-text">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function OrderDetailsPage() {
  const { id = "", orderId = "" } = useParams();
  const user = useAuth((state) => state.user);
  const revision = useAuth((state) => state.revision);
  return (
    <OrderDetails
      key={`${user?.idUser}:${revision}:${id}:${orderId}`}
      eventId={id}
      orderId={orderId}
    />
  );
}

function OrderDetails({
  eventId,
  orderId,
}: {
  eventId: string;
  orderId: string;
}) {
  const user = useAuth((state) => state.user);
  const location = useLocation();
  const listPath = `/organizer/events/${encodeURIComponent(eventId)}/orders`;
  const url = `${listPath}/${encodeURIComponent(orderId)}`;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [printing, setPrinting] = useState(false);
  const [printData, setPrintData] = useState<Preview | null>(null);
  const live = useRef(false);
  const printLock = useRef(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLDivElement>(null);
  const printRoot = useRef<HTMLDivElement>(null);
  const printButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setDetail(null);
    setPreview(null);
    setPrintData(null);
    setError("");
    get<Detail>(url)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch((failure) => {
        if (active) setError(message(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, refresh]);
  useEffect(() => {
    let active = true;
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(false);
    if (!detail?.actions.canPreviewTickets)
      return () => {
        active = false;
      };
    setPreviewLoading(true);
    get<Preview>(`${url}/tickets`)
      .then((value) => {
        if (active) setPreview(value);
      })
      .catch((failure) => {
        if (active) setPreviewError(message(failure));
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, detail]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!menuOpen) return;
    const links = () => [
      ...(navigation.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ??
        []),
    ];
    links()[0]?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab") {
        const items = [menuButton.current!, ...links()];
        const index = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          items.at(-1)?.focus();
        }
        if (!event.shiftKey && index === items.length - 1) {
          event.preventDefault();
          items[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  const developing = () => setToast("Chức năng đang được phát triển");
  const print = async () => {
    if (!detail?.actions.canPrintTickets || printLock.current) return;
    printLock.current = true;
    setPrinting(true);
    setPreviewError("");
    setPrintData(null);
    try {
      const fresh = await get<Preview>(`${url}/tickets`);
      if (
        !live.current ||
        fresh.orderId !== orderId ||
        fresh.event.id !== eventId
      )
        return;
      if (!fresh.tickets.some((ticket) => ticket.printable && ticket.qrImage))
        throw new Error("Đơn hiện không có vé hợp lệ để in.");
      setPreview(fresh);
      setPrintData(fresh);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await Promise.all(
        [...printRoot.current!.querySelectorAll("img")].map((img) =>
          img.decode(),
        ),
      );
      if (live.current) window.print();
    } catch (failure) {
      if (live.current) {
        setPreviewError(message(failure));
        setPrintData(null);
        setPreview(null);
      }
    } finally {
      printLock.current = false;
      if (live.current) {
        setPrinting(false);
        printButton.current?.focus();
      }
    }
  };
  const statusLabel = detail?.payment.unresolvedReview
    ? "Cần tra soát thanh toán"
    : ({
        PAID: "Đã thanh toán thành công",
        PENDING_PAYMENT: "Chờ thanh toán",
        CANCELLED: "Đã hủy",
        EXPIRED: "Đã hết hạn",
      }[detail?.status ?? ""] ?? detail?.status);
  const payment = detail?.payment.display;

  return (
    <div className="b7-page">
      <style>{styles}</style>
      <div
        ref={navigation}
        id="b7-navigation"
        className={`b7-navigation${menuOpen ? " is-open" : ""}`}
      >
        <OrganizerSidebar active="Đơn hàng" hideLiveSync />
      </div>
      {menuOpen && (
        <button
          className="b7-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => {
            setMenuOpen(false);
            menuButton.current?.focus();
          }}
        />
      )}
      <div className="b7-body">
        <header className="b7-topbar">
          <button
            ref={menuButton}
            className="b7-menu"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="b7-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav aria-label="Đường dẫn" className="b7-breadcrumb">
            <Link to="/organizer">EventHub</Link>
            <span>/</span>
            <span>Ban Tổ Chức</span>
          </nav>
          <form
            className="b7-search"
            onSubmit={(event) => {
              event.preventDefault();
              developing();
            }}
          >
            <input
              aria-label="Tìm vé, đơn hàng, khách"
              placeholder="Tìm vé, đơn hàng, khách..."
              onClick={developing}
            />
          </form>
          <div className="b7-top-actions">
            <Link className="b7-create" to="/organizer/new">
              <Plus size={16} />
              Tạo sự kiện
            </Link>
            <Link to="/notifications" aria-label="Thông báo">
              <Bell size={20} />
            </Link>
            <Link to="/profile" className="b7-user">
              <span>{user?.name.slice(0, 1).toUpperCase()}</span>
              <strong>{user?.name}</strong>
            </Link>
          </div>
        </header>
        <main className="b7-content" aria-busy={loading}>
          <div className="b7-back-row">
            <Link to={listPath} state={location.state}>
              <ArrowLeft size={16} />
              Quay lại danh sách đơn hàng
            </Link>
            <button className="b7-text-button" onClick={developing}>
              Audit Session
            </button>
          </div>
          {loading && (
            <div className="b7-card b7-state" role="status">
              Đang tải chi tiết đơn hàng…
            </div>
          )}
          {error && (
            <div className="b7-alert" role="alert">
              <span>{error}</span>
              <button onClick={() => setRefresh((value) => value + 1)}>
                Thử tải lại
              </button>
            </div>
          )}
          {!loading && detail && (
            <>
              <section
                className="b7-status-strip"
                aria-label="Thông tin đơn hàng"
              >
                <div>
                  <div className="b7-order-title">
                    <h1>Đơn hàng #{detail.orderCode}</h1>
                    <span
                      className={`b7-badge ${detail.status === "PAID" && !detail.payment.unresolvedReview ? "b7-success" : "b7-warning"}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p>
                    Mã giao dịch:{" "}
                    <strong>
                      {payment?.providerTransactionId ?? "Chưa có thông tin"}
                    </strong>
                    <span> · Khởi tạo: {date(detail.createdAt)}</span>
                  </p>
                </div>
                <button
                  ref={printButton}
                  className="b7-print"
                  disabled={
                    printing ||
                    !detail.actions.canPrintTickets ||
                    previewLoading ||
                    !preview
                  }
                  onClick={() => void print()}
                >
                  <Printer size={18} />
                  {printing ? "Đang chuẩn bị…" : "In vé"}
                </button>
              </section>
              <div className="b7-columns">
                <div className="b7-left">
                  <section className="b7-card">
                    <CardHeading
                      icon={<BadgeCheck size={22} />}
                      title="Hồ sơ khách hàng & Thụ hưởng"
                      description="Thông tin khách hàng tại thời điểm đặt đơn"
                      action={
                        <button className="b7-feature" onClick={developing}>
                          KYC Level 2
                        </button>
                      }
                    />
                    <div className="b7-customer-grid">
                      <div>
                        <small>HỌ VÀ TÊN KHÁCH HÀNG</small>
                        <strong>{detail.buyer.name}</strong>
                        <button className="b7-text-button" onClick={developing}>
                          Thành viên
                        </button>
                      </div>
                      <div>
                        <small>ĐỊA CHỈ EMAIL</small>
                        <strong className="b7-cyan">
                          {detail.buyer.email}
                        </strong>
                        <button className="b7-text-button" onClick={developing}>
                          Xác minh email
                        </button>
                      </div>
                      <div>
                        <small>SỐ ĐIỆN THOẠI LIÊN HỆ</small>
                        <strong>
                          {detail.buyer.phone ?? "Chưa có thông tin"}
                        </strong>
                        {detail.buyer.phoneSource === "CURRENT_PROFILE" && (
                          <small>Số điện thoại trong hồ sơ hiện tại</small>
                        )}
                        <button className="b7-text-button" onClick={developing}>
                          SMS BrandName
                        </button>
                      </div>
                    </div>
                  </section>
                  <section className="b7-card">
                    <CardHeading
                      icon={<Ticket size={22} />}
                      title={`Danh sách vé điện tử (${detail.tickets.length} vé)`}
                      description="Vé số hóa tích hợp mã QR check-in"
                      action={
                        <button
                          className="b7-text-button b7-cyan"
                          onClick={developing}
                        >
                          <RefreshCw size={14} />
                          Tải lại QR
                        </button>
                      }
                    />
                    {previewLoading && detail.actions.canPreviewTickets && (
                      <p role="status">Đang tải mã QR…</p>
                    )}
                    {previewError && (
                      <div className="b7-alert" role="alert">
                        <span>{previewError}</span>
                        <button
                          onClick={() => setRefresh((value) => value + 1)}
                        >
                          Thử tải lại
                        </button>
                      </div>
                    )}
                    {!detail.tickets.length && (
                      <p className="b7-state">
                        {detail.status === "PAID"
                          ? "Chờ phát hành vé."
                          : "Đơn hàng chưa có vé được phát hành."}
                      </p>
                    )}
                    {detail.payment.unresolvedReview && (
                      <p className="b7-warning" role="status">
                        Đơn cần tra soát thanh toán. Chưa thể xem hoặc in QR.
                      </p>
                    )}
                    <div className="b7-tickets">
                      {detail.tickets.map((ticket) => {
                        const qr = preview?.tickets.find(
                          (entry) => entry.id === ticket.id,
                        )?.qrImage;
                        return (
                          <article className="b7-ticket" key={ticket.id}>
                            <div className="b7-ticket-info">
                              <span className="b7-type">{ticket.typeName}</span>
                              <h3>{detail.event.title}</h3>
                              <p>
                                {detail.event.venueName} ·{" "}
                                {date(detail.event.startsAt)}
                              </p>
                              <div className="b7-ticket-code">
                                <small>Mã định danh vé</small>
                                <strong>#{ticket.code}</strong>
                              </div>
                              <div className="b7-ticket-price">
                                {money(ticket.unitPrice, detail.currency)}
                              </div>
                            </div>
                            <div
                              className="b7-perforation"
                              aria-hidden="true"
                            />
                            <div className="b7-qr-stub">
                              <button
                                className="b7-text-button"
                                onClick={developing}
                              >
                                DYNAMIC QR
                              </button>
                              {qr ? (
                                <div className="b7-qr-frame">
                                  <img
                                    src={qr}
                                    alt={`Mã QR vé ${ticket.code}`}
                                  />
                                </div>
                              ) : (
                                <p>
                                  {ticket.status === "VOID"
                                    ? "QR đã thu hồi"
                                    : previewError
                                      ? "Chưa tải được QR"
                                      : "QR chưa khả dụng"}
                                </p>
                              )}
                              <span
                                className={`b7-badge ${ticket.status === "CHECKED_IN" ? "b7-success" : "b7-warning"}`}
                              >
                                {ticketStatus(ticket.status)}
                              </span>
                              {ticket.checkedInAt && (
                                <small>{date(ticket.checkedInAt)}</small>
                              )}
                              <button
                                className="b7-text-button"
                                onClick={developing}
                              >
                                Xoay mã
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                  <section className="b7-card">
                    <CardHeading
                      icon={<ReceiptText size={22} />}
                      title="Nhật ký giao dịch & Dòng tiền"
                      description="Bảng kê thanh toán của đơn hàng"
                      action={
                        <span className="b7-muted">
                          TraceID: Chưa có thông tin
                        </span>
                      }
                    />
                    <div className="b7-breakdown">
                      {detail.items.map((item, index) => (
                        <div className="b7-amount-row" key={index}>
                          <span>
                            {item.quantity} × {item.typeName}
                            <small>
                              Đơn giá {money(item.unitPrice, detail.currency)}
                            </small>
                          </span>
                          <strong>
                            {money(item.lineTotal, detail.currency)}
                          </strong>
                        </div>
                      ))}
                      <div className="b7-total">
                        <div>
                          <h3>Tổng tiền đơn hàng</h3>
                          <small>
                            {detail.status === "PAID"
                              ? "Đơn đã thanh toán"
                              : "Theo thông tin đơn hàng"}
                          </small>
                        </div>
                        <strong>
                          {money(detail.totalAmount, detail.currency)}
                        </strong>
                      </div>
                    </div>
                    <div className="b7-settlement">
                      <div>
                        <strong>{provider(payment?.provider)}</strong>
                        <div className="b7-beneficiary">
                          <p>Tài khoản thụ hưởng giao dịch</p>
                          {detail.bankAccount ? (
                            <>
                              <strong>{detail.bankAccount.bankCode}</strong>
                              <span className="b7-bank-number">
                                {detail.bankAccount.accountNumber}
                              </span>
                              <span>{detail.bankAccount.accountName}</span>
                            </>
                          ) : (
                            <span>Chưa có thông tin</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="b7-badge">
                          {payment?.status ?? "Chưa có giao dịch"}
                        </span>
                        <p>
                          {detail.payment.paid?.succeededAt
                            ? date(detail.payment.paid.succeededAt)
                            : "Chưa ghi nhận thanh toán thành công"}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
                <aside className="b7-right" aria-label="Thông tin bổ sung">
                  <section className="b7-card b7-risk">
                    <CardHeading
                      icon={<ShieldCheck size={22} />}
                      title="Đánh giá rủi ro"
                      action={
                        <button className="b7-feature" onClick={developing}>
                          LOW RISK
                        </button>
                      }
                    />
                    <p className="b7-demo-label">Dữ liệu minh họa</p>
                    <button
                      className="b7-demo-panel"
                      onClick={developing}
                      aria-label="Đánh giá rủi ro "
                    >
                      <span className="b7-risk-score">
                        Chỉ số an toàn đơn hàng: <strong>100% An toàn</strong>
                      </span>
                      <span className="b7-gauge" />
                      {[
                        "Không phát hiện hành vi bot / quét vé số lượng lớn.",
                        "CCCD/SĐT người mua chưa từng gắn cờ phe vé.",
                        "Dải IP sạch, không dùng proxy hoặc mạng ẩn danh Tor/VPN.",
                      ].map((text) => (
                        <span className="b7-risk-line" key={text}>
                          <CheckCircle2 size={15} />
                          {text}
                        </span>
                      ))}
                    </button>
                  </section>
                  <section className="b7-card">
                    <CardHeading
                      icon={<History size={22} />}
                      title="Lịch sử thao tác (Audit)"
                    />
                    <p className="b7-timeline-note">
                      Mốc đơn hàng · Thời gian Việt Nam (UTC+7)
                    </p>
                    <ol className="b7-timeline" aria-label="Lịch sử đơn hàng">
                      {(detail.timeline ?? []).map((entry) => (
                        <li className="b7-timeline-item" key={entry.id}>
                          <strong>
                            {
                              {
                                ORDER_CREATED: "Tạo phiên đặt vé",
                                VIETQR_WINDOW: "Quét VietQR — tối đa 15 phút",
                                PAYMENT_SUCCEEDED: "Xác nhận thanh toán",
                                QR_ISSUED: "Cấp mã QR vé",
                              }[entry.type]
                            }
                          </strong>
                          {entry.type === "VIETQR_WINDOW" &&
                          entry.paymentCreatedAt &&
                          entry.effectiveWindowEndsAt ? (
                            <>
                              <small>
                                Từ{" "}
                                <time dateTime={entry.paymentCreatedAt}>
                                  {date(entry.paymentCreatedAt)}
                                </time>{" "}
                                đến{" "}
                                <time dateTime={entry.effectiveWindowEndsAt}>
                                  {date(entry.effectiveWindowEndsAt)}
                                </time>
                              </small>
                              <small>
                                Khoảng hướng dẫn tính từ lúc tạo mã thanh toán;
                                không ghi nhận thời điểm khách đã quét.
                              </small>
                              {entry.providerExpiresAt &&
                                entry.providerExpiresAt !==
                                  entry.referenceWindowEndsAt && (
                                  <small>
                                    Mã hết hạn thực tế:{" "}
                                    <time dateTime={entry.providerExpiresAt}>
                                      {date(entry.providerExpiresAt)}
                                    </time>
                                  </small>
                                )}
                            </>
                          ) : (
                            entry.occurredAt && (
                              <small>
                                <time dateTime={entry.occurredAt}>
                                  {date(entry.occurredAt)}
                                </time>
                              </small>
                            )
                          )}
                          {entry.type === "PAYMENT_SUCCEEDED" && (
                            <small>
                              {provider(detail.payment.paid?.provider)}
                            </small>
                          )}
                          {entry.type === "QR_ISSUED" && (
                            <small>Vé #{entry.ticketCode}</small>
                          )}
                        </li>
                      ))}
                    </ol>
                    {!detail.payment.paid?.succeededAt && (
                      <p className="b7-timeline-note">
                        Chưa xác nhận thanh toán.
                      </p>
                    )}
                    {!detail.tickets.length && (
                      <p className="b7-timeline-note">Chưa cấp mã QR.</p>
                    )}
                  </section>
                  <button className="b7-gate" onClick={developing}>
                    <span>
                      <strong>Hỗ trợ cổng sự kiện (Gate Support)</strong>
                      <small>Đồng bộ POS máy quét</small>
                    </span>
                    <CloudSync size={24} />
                  </button>
                </aside>
              </div>
              <p className="b7-asof">
                Cập nhật dữ liệu: {date(detail.asOf)} (UTC+7)
              </p>
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="b7-toast" role="status">
          <span>{toast}</span>
          <button aria-label="Đóng thông báo" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div ref={printRoot} className="b7-print-root" aria-hidden={!printData}>
        {printData?.tickets
          .filter((ticket) => ticket.printable && ticket.qrImage)
          .map((ticket) => (
            <article key={ticket.id}>
              <h1>{detail?.event.title}</h1>
              <h2>{ticket.typeName}</h2>
              <p>
                Đơn #{detail?.orderCode} · {ticket.code}
              </p>
              <p>{ticket.buyerName}</p>
              <p>
                {detail && date(detail.event.startsAt)} ·{" "}
                {detail?.event.venueName}
              </p>
              <img src={ticket.qrImage!} alt={`QR in vé ${ticket.code}`} />
            </article>
          ))}
      </div>
    </div>
  );
}

const styles = `
.b7-page {
  --b7-bg: #0f1222;
  --b7-card: #181b2a;
  --b7-inner: #1c1f2f;
  --b7-deep: #0a0d1c;
  --b7-text: #e0e1f7;
  --b7-muted: #b4acc1;
  --b7-cyan: #5de6ff;
  min-height: 100vh;
  background: var(--b7-bg);
  color: var(--b7-text);
  font:
    14px/1.6 "Be Vietnam Pro",
    sans-serif;
}
.b7-page * {
  box-sizing: border-box;
}
.b7-page button,
.b7-page input {
  font: inherit;
}
.b7-page button {
  cursor: pointer;
}
.b7-page button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.b7-page a {
  color: inherit;
  text-decoration: none;
}
.b7-page :is(a, button, input):focus-visible {
  outline: 2px solid var(--b7-cyan);
  outline-offset: 4px;
}
.b7-page h1,
.b7-page h2,
.b7-page h3,
.b7-page p {
  margin: 0;
}
.b7-page h1,
.b7-page h2,
.b7-page h3 {
  font-family: "Be Vietnam Pro", sans-serif;
}
.b7-body {
  margin-left: 256px;
  min-width: 0;
}
.b7-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 24px;
  background: #0a0d1cf2;
  border-bottom: 1px solid #262939;
  backdrop-filter: blur(16px);
}
.b7-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  font:
    600 12px "Space Grotesk",
    sans-serif;
}
.b7-breadcrumb span:last-child {
  color: var(--b7-cyan);
}
.b7-search {
  flex: 1;
  max-width: 290px;
}
.b7-search input {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  background: var(--b7-card);
  color: var(--b7-text);
}
.b7-search input::placeholder {
  color: var(--b7-muted);
}
.b7-top-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
}
.b7-create {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--b7-cyan);
  color: #00363e !important;
  padding: 8px 12px;
  border-radius: 8px;
  white-space: nowrap;
}
.b7-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.b7-user > span {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: #482a73;
  border: 2px solid #7c3aed;
  border-radius: 50%;
}
.b7-user strong {
  font:
    600 12px "Space Grotesk",
    sans-serif;
}
.b7-content {
  padding: 16px 24px 32px;
  max-width: 1760px;
  margin: auto;
}
.b7-back-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  font:
    500 12px "Space Grotesk",
    sans-serif;
}
.b7-back-row > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.b7-text-button {
  background: transparent;
  border: 0;
  color: var(--b7-muted);
  padding: 4px 0;
  font:
    500 11px/1.5 "Space Grotesk",
    sans-serif !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-align: left;
}
.b7-text-button:hover {
  color: var(--b7-cyan);
}
.b7-status-strip {
  padding: 24px;
  border-radius: 12px;
  background:
    radial-gradient(ellipse at 0 0, #7c3aed22, transparent 60%),
    radial-gradient(ellipse at 100% 100%, #5de6ff11, transparent 60%),
    var(--b7-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px #05071344;
}
.b7-order-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.b7-order-title h1 {
  font-size: clamp(24px, 2.2vw, 32px);
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.b7-status-strip p {
  font:
    500 11px/1.8 "Space Grotesk",
    sans-serif;
  color: var(--b7-muted);
  margin-top: 8px;
  overflow-wrap: anywhere;
}
.b7-status-strip p strong {
  color: var(--b7-cyan);
}
.b7-print {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--b7-inner);
  border: 0;
  padding: 12px 16px;
  border-radius: 8px;
  color: var(--b7-text);
  white-space: nowrap;
}
.b7-print svg {
  color: var(--b7-cyan);
}
.b7-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 99px;
  background: #262939;
  padding: 4px 10px;
  font:
    600 11px/1.5 "Space Grotesk",
    sans-serif;
}
.b7-success {
  background: #10b98118;
  color: #6ee7b7;
}
.b7-warning {
  color: #fcd34d;
}
.b7-badge.b7-warning {
  background: #f59e0b20;
}
.b7-columns {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 24px;
  align-items: start;
}
.b7-left,
.b7-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.b7-card {
  background: var(--b7-card);
  border-radius: 12px;
  padding: 24px;
  min-width: 0;
  box-shadow: 0 8px 24px #05071344;
}
.b7-card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.b7-heading-text {
  min-width: 0;
  flex: 1;
}
.b7-heading-text h2 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}
.b7-heading-text p {
  font-size: 12px;
  color: var(--b7-muted);
  margin-top: 3px;
}
.b7-title-icon {
  color: #d2bbff;
  background: #7c3aed25;
  padding: 9px;
  border-radius: 8px;
  display: flex;
}
.b7-feature {
  color: var(--b7-cyan);
  background: #5de6ff12;
  border: 0;
  border-radius: 4px;
  padding: 5px 8px;
  font:
    600 10px/1.5 "Space Grotesk",
    sans-serif !important;
}
.b7-customer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.b7-customer-grid > div {
  background: var(--b7-inner);
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow-wrap: anywhere;
  gap: 4px;
}
.b7-customer-grid small {
  color: var(--b7-muted);
  font:
    500 11px/1.6 "Space Grotesk",
    sans-serif;
}
.b7-customer-grid strong {
  font-size: 15px;
  max-width: 100%;
}
.b7-cyan {
  color: var(--b7-cyan) !important;
}
.b7-muted {
  color: var(--b7-muted);
  font-size: 11px;
}
.b7-tickets {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.b7-ticket {
  display: flex;
  background: var(--b7-inner);
  border-radius: 12px;
  overflow: hidden;
  min-width: 0;
}
.b7-ticket-info {
  padding: 24px;
  flex: 1;
  min-width: 0;
  background: radial-gradient(ellipse at 100% 0, #7c3aed20, transparent 70%);
}
.b7-type {
  display: inline-block;
  background: #7c3aed;
  color: #ede0ff;
  border-radius: 4px;
  padding: 4px 8px;
  font:
    600 11px/1.5 "Space Grotesk",
    sans-serif;
}
.b7-ticket h3 {
  font-size: 24px;
  line-height: 1.4;
  margin: 12px 0 4px;
  overflow-wrap: anywhere;
}
.b7-ticket-info p {
  color: var(--b7-muted);
  font:
    500 11px/1.6 "Space Grotesk",
    sans-serif;
}
.b7-ticket-code {
  margin-top: 16px;
}
.b7-ticket-code small {
  color: var(--b7-muted);
  display: block;
}
.b7-ticket-code strong {
  color: var(--b7-cyan);
  font-family: "Space Grotesk", sans-serif;
  overflow-wrap: anywhere;
}
.b7-ticket-price {
  font:
    700 20px "Be Vietnam Pro",
    sans-serif;
  border-top: 1px solid #313445;
  padding-top: 16px;
  margin-top: 24px;
  text-align: right;
}
.b7-perforation {
  width: 20px;
  flex-shrink: 0;
  border-left: 1px dashed #4a4455;
  margin-left: 10px;
  position: relative;
  background: #26293966;
}
.b7-perforation::before,
.b7-perforation::after {
  content: "";
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--b7-card);
  left: -12px;
}
.b7-perforation::before {
  top: -12px;
}
.b7-perforation::after {
  bottom: -12px;
}
.b7-qr-stub {
  width: 184px;
  flex-shrink: 0;
  background: #0a0d1ccc;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}
.b7-qr-stub small {
  color: var(--b7-muted);
  font-size: 10px;
}
.b7-qr-frame {
  padding: 6px;
  border: 2px solid var(--b7-cyan);
  border-radius: 6px;
  box-shadow: 0 0 20px #5de6ff22;
}
.b7-qr-frame img {
  display: block;
  width: 120px;
  height: 120px;
  background: white;
}
.b7-breakdown {
  background: var(--b7-inner);
  border-radius: 8px;
  padding: 16px;
}
.b7-amount-row {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
}
.b7-amount-row > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.b7-amount-row strong {
  white-space: nowrap;
  font-family: "Space Grotesk", sans-serif;
}
.b7-amount-row small {
  display: block;
  color: var(--b7-muted);
  font-size: 11px;
}
.b7-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-top: 1px solid #313445;
  padding-top: 16px;
}
.b7-total h3 {
  font-size: 20px;
}
.b7-total small {
  color: var(--b7-muted);
}
.b7-total > strong {
  color: var(--b7-cyan);
  font:
    800 clamp(23px, 2.5vw, 32px) "Be Vietnam Pro",
    sans-serif;
  overflow-wrap: anywhere;
}
.b7-settlement {
  background: var(--b7-deep);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  font:
    500 11px/1.7 "Space Grotesk",
    sans-serif;
}
.b7-settlement > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.b7-settlement p {
  color: var(--b7-muted);
  margin-top: 4px;
}
.b7-right .b7-card {
  padding: 20px;
}
.b7-right .b7-title-icon {
  padding: 0;
  background: none;
}
.b7-right .b7-heading-text h2 {
  font-size: 20px;
}
.b7-risk .b7-title-icon {
  color: #6ee7b7;
}
.b7-demo-label {
  color: var(--b7-muted);
  font:
    500 10px "Space Grotesk",
    sans-serif;
  margin: -8px 0 12px !important;
}
.b7-demo-panel {
  display: block;
  width: 100%;
  padding: 16px;
  text-align: left;
  border: 0;
  border-radius: 8px;
  background: var(--b7-inner);
  color: var(--b7-text);
}
.b7-risk-score {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  font:
    500 11px "Space Grotesk",
    sans-serif;
}
.b7-risk-score strong {
  color: #6ee7b7;
}
.b7-gauge {
  display: block;
  background: #34d399;
  height: 6px;
  border-radius: 20px;
  margin: 16px 0;
  box-shadow: 0 0 10px #34d39933;
}
.b7-risk-line {
  display: flex;
  align-items: start;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
}
.b7-risk-line svg {
  color: #6ee7b7;
  flex-shrink: 0;
  margin-top: 3px;
}
.b7-timeline {
  list-style: none;
  margin: 0;
  display: block;
  width: 100%;
  padding: 0 0 0 20px;
  background: none;
  color: var(--b7-text);
  text-align: left;
  border: 0;
}
.b7-timeline-note {
  color: var(--b7-muted);
  font-size: 11px;
  margin-bottom: 12px !important;
}
.b7-beneficiary > span {
  display: block;
  overflow-wrap: anywhere;
}
.b7-bank-number {
  color: var(--b7-cyan);
  font: 600 14px/1.6 "Space Grotesk", sans-serif;
}
.b7-timeline-item {
  display: block;
  position: relative;
  padding: 0 0 24px 14px;
  border-left: 2px solid #313445;
}
.b7-timeline-item:last-child {
  padding-bottom: 0;
}
.b7-timeline-item::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d2bbff;
}
.b7-timeline-item:nth-child(2)::before {
  background: var(--b7-cyan);
}
.b7-timeline-item:nth-child(3)::before {
  background: #6ee7b7;
}
.b7-timeline-item strong {
  display: block;
  font:
    600 12px/1.6 "Space Grotesk",
    sans-serif;
}
.b7-timeline-item small {
  display: block;
  color: var(--b7-muted);
  margin-top: 4px;
  font-size: 11px;
}
.b7-gate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  border-radius: 12px;
  border: 0;
  background: linear-gradient(110deg, #7c3aed33, #00cbe61a);
  color: var(--b7-text);
  text-align: left;
}
.b7-gate strong,
.b7-gate small {
  display: block;
  font-size: 12px;
}
.b7-gate small {
  color: var(--b7-muted);
  margin-top: 4px;
}
.b7-gate svg {
  color: var(--b7-cyan);
  flex-shrink: 0;
}
.b7-asof {
  margin-top: 20px !important;
  color: var(--b7-muted);
  font-size: 11px;
}
.b7-state {
  text-align: center;
  color: var(--b7-muted);
  padding: 24px !important;
}
.b7-alert {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: #482126;
  color: #ffdad6;
  margin: 12px 0;
}
.b7-alert button {
  background: #262939;
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 8px 12px;
  flex-shrink: 0;
}
.b7-toast {
  position: fixed;
  z-index: 100;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  display: flex;
  align-items: center;
  gap: 16px;
  background: #182240;
  border: 1px solid #5de6ff;
  border-radius: 10px;
  padding: 14px 18px;
  box-shadow: 0 8px 30px #0008;
}
.b7-toast button {
  background: none;
  border: 0;
  color: var(--b7-text);
  display: flex;
}
.b7-menu,
.b7-print-root {
  display: none;
}
@media (max-width: 1250px) {
  .b7-search {
    display: none;
  }
  .b7-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .b7-right {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
  .b7-status-strip {
    flex-wrap: wrap;
  }
}
@media (max-width: 900px) {
  .b7-body {
    margin-left: 0;
  }
  .b7-navigation {
    display: none;
  }
  .b7-navigation.is-open {
    display: block;
  }
  .b7-navigation.is-open .osb-sidebar {
    display: flex !important;
    z-index: 80;
  }
  .b7-menu {
    display: grid;
    place-items: center;
    background: none;
    color: var(--b7-text);
    border: 0;
    padding: 6px;
    position: relative;
    z-index: 90;
  }
  .b7-topbar:has(.b7-menu[aria-expanded="true"]) {
    z-index: 90;
  }
  .b7-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: #000a;
    z-index: 70;
  }
}
@media (max-width: 650px) {
  .b7-content {
    padding: 16px;
  }
  .b7-topbar {
    padding: 12px 16px;
    gap: 12px;
  }
  .b7-top-actions {
    gap: 12px;
  }
  .b7-create,
  .b7-user strong,
  .b7-breadcrumb span {
    display: none;
  }
  .b7-back-row {
    align-items: start;
    flex-direction: column;
    gap: 8px;
  }
  .b7-card,
  .b7-status-strip {
    padding: 16px;
  }
  .b7-customer-grid,
  .b7-right {
    grid-template-columns: minmax(0, 1fr);
  }
  .b7-card-heading {
    align-items: flex-start;
  }
  .b7-heading-text {
    flex-basis: calc(100% - 60px);
  }
  .b7-card-heading > .b7-feature {
    margin-left: 0;
  }
  .b7-ticket {
    flex-direction: column;
  }
  .b7-ticket-info {
    padding: 20px;
  }
  .b7-perforation {
    width: auto;
    height: 16px;
    margin: 0;
    border-left: 0;
    border-top: 1px dashed #4a4455;
  }
  .b7-perforation::before {
    left: -12px;
    top: -12px;
  }
  .b7-perforation::after {
    right: -12px;
    left: auto;
    top: -12px;
  }
  .b7-qr-stub {
    width: 100%;
  }
  .b7-settlement {
    flex-direction: column;
  }
}
@media (prefers-reduced-motion: reduce) {
  .b7-page * {
    animation: none !important;
    scroll-behavior: auto !important;
  }
}
@media print {
  @page {
    size: A4;
    margin: 16mm;
  }
  .b7-page {
    background: #fff !important;
    color: #000;
    min-height: 0;
  }
  .b7-page > :not(.b7-print-root) {
    display: none !important;
  }
  .b7-print-root {
    display: block;
    color: #000;
  }
  .b7-print-root article {
    border: 1px solid #bbb;
    padding: 12mm;
    margin-bottom: 8mm;
    break-inside: avoid;
  }
  .b7-print-root h1 {
    font-size: 20pt;
  }
  .b7-print-root h2 {
    font-size: 16pt;
  }
  .b7-print-root p {
    margin-top: 4mm;
  }
  .b7-print-root img {
    width: 52mm;
    height: 52mm;
    display: block;
    margin: 6mm auto;
  }
}
`;
