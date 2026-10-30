import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  Building2,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  QrCode,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Smartphone,
  Ticket,
  Timer,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { EventCover } from "@/components/ticketing/event-visuals";
import { Loading, Notice } from "@/components/ticketing/shared";
import { useAuth } from "@/features/auth/stores/authStore";
import api from "@/lib/api";
import { message, money, useLoad } from "@/features/ticketing/data";
import { checkoutUrl, paymentMessage } from "@/features/ticketing/payment";
import type { Order, Payment } from "@/features/ticketing/types";
import "./checkout.css";

type Method = "vnpay" | "mbbank" | "vietqr" | "ewallet" | "card" | "wallet";
type Toast = { id: number; text: string };
type SepayPayment = {
  paymentId: string; orderId: string; orderStatus: string; status: string;
  environment: "test" | "live"; amount: string; currency: string; bank: string;
  accountNumber: string; accountName: string; transferContent: string;
  qrUrl: string | null; canTransfer: boolean; expiresAt: string; holdUntil: string;
  requiresReview: boolean; updatedAt: string; lastVerifiedAt: string | null;
};
const COMING_SOON = "Chức năng sẽ sớm được cập nhật";
const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

function dateText(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
function timeText(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
function scheduleText(startsAt?: string, endsAt?: string) {
  const day = dateText(startsAt);
  if (!day) return "Thông tin thời gian đang cập nhật";
  const start = timeText(startsAt),
    end = timeText(endsAt);
  return `${end && end !== start ? `${start} – ${end}` : start} - ${day}`;
}
function statusInfo(status: string) {
  if (status === "PAID")
    return { label: "Đã thanh toán", tone: "success" };
  if (status === "EXPIRED")
    return { label: "Đã hết hạn", tone: "danger" };
  if (status === "CANCELLED")
    return { label: "Đã hủy", tone: "danger" };
  if (status === "PENDING_PAYMENT")
    return { label: "Đang giữ chỗ", tone: "" };
  return { label: status, tone: "" };
}

export function Checkout() {
  const { id = "" } = useParams(),
    resource = useLoad<Order>(`/me/orders/${id}`),
    config = useLoad<{ paymentMode: string; sepayEnabled?: boolean }>("/config"),
    user = useAuth((state) => state.user),
    o = resource.data,
    [method, setMethod] = useState<Method>("vnpay"),
    [payment, setPayment] = useState<Payment | null>(null),
    [sepayInfo, setSepayInfo] = useState<SepayPayment | null>(null),
    [sepayLoading, setSepayLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<Toast | null>(null),
    [confirmCancel, setConfirmCancel] = useState(false),
    [now, setNow] = useState(Date.now());
  const mode = config.data?.paymentMode ?? "";
  const paymentReady = mode === "vnpay_sandbox" || mode === "demo";
  const sepayReady = config.data?.sepayEnabled === true;
  useEffect(() => {
    if (sepayReady && !paymentReady) setMethod("mbbank");
  }, [sepayReady, paymentReady]);
  const remaining = o
    ? Math.max(0, Math.floor((Date.parse(o.expires_at) - now) / 1000))
    : 0;
  const countdown = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;
  const reloadOrder = resource.reload;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingVnpay =
    o?.status === "PENDING_PAYMENT" && o.payment?.provider === "vnpay_sandbox";
  useEffect(() => {
    if (!pendingVnpay) return;
    const until = Date.now() + 60000;
    const poll = setInterval(() => {
      if (Date.now() < until) reloadOrder();
      else clearInterval(poll);
    }, 3000);
    const refresh = () => reloadOrder();
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", refresh);
    };
  }, [pendingVnpay, reloadOrder]);

  const hasSepayPayment = o?.payment?.provider === "sepay" || o?.latest_payment?.provider === "sepay";
  useEffect(() => {
    if (hasSepayPayment) setMethod("mbbank");
  }, [hasSepayPayment]);
  useEffect(() => {
    if (!hasSepayPayment || o?.status !== "PENDING_PAYMENT") return;
    let alive = true;
    let inFlight = false;
    const refreshSepay = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      try {
        const response = await api.get(`/sepay/orders/${id}/payment`);
        if (!alive) return;
        const data = response.data.data as SepayPayment;
        setSepayInfo(data);
        if (data.orderStatus === "PAID") reloadOrder();
      } catch {
        // Keep the last known server state; the user can retry manually.
      } finally {
        inFlight = false;
      }
    };
    void refreshSepay();
    const timer = window.setInterval(() => void refreshSepay(), 8000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [hasSepayPayment, o?.status, id, reloadOrder]);

  const pendingExpired =
    o?.status === "PENDING_PAYMENT" &&
    Boolean(o.expires_at) &&
    Date.parse(o.expires_at) <= now;
  useEffect(() => {
    if (!pendingExpired) return;
    const timer = setTimeout(() => reloadOrder(), 1500);
    return () => clearTimeout(timer);
  }, [pendingExpired, reloadOrder]);

  function notify(text: string) {
    setToast({ id: Date.now(), text });
  }
  function chooseMethod(next: Method) {
    setMethod(next);
    if (!["vnpay", "mbbank"].includes(next)) notify(COMING_SOON);
  }
  function requestVnpay() {
    if (!canStartPayment) return;
    if (!paymentReady) {
      notify(COMING_SOON);
      return;
    }
    chooseMethod("vnpay");
  }
  async function copyPaymentValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label} đã được sao chép.`);
    } catch {
      notify("Không thể sao chép tự động. Vui lòng chọn và sao chép thủ công.");
    }
  }
  async function refreshSepay() {
    if (!o) return;
    setSepayLoading(true);
    try {
      const response = await api.get(`/sepay/orders/${o.id}/payment`);
      const data = response.data.data as SepayPayment;
      setSepayInfo(data);
      if (data.orderStatus === "PAID") reloadOrder();
    } catch (e) {
      setError(message(e));
    } finally {
      setSepayLoading(false);
    }
  }
  async function pay() {
    if (method === "mbbank") {
      if (!o || !remaining || !sepayReady || !canStartPayment) return;
      setBusy(true);
      setError("");
      try {
        const response = await api.post(`/sepay/orders/${o.id}/payment`, {});
        setSepayInfo(response.data.data as SepayPayment);
        reloadOrder();
      } catch (e) {
        setError(message(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (method !== "vnpay") {
      notify(COMING_SOON);
      return;
    }
    if (!o || !remaining || !paymentReady || !canStartPayment) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post(`/orders/${o.id}/payments`);
      const created = response.data.data as Payment;
      setPayment(created);
      if (created.provider === "vnpay_sandbox") {
        window.location.assign(checkoutUrl(created.checkout_url));
        return;
      }
      if (created.provider === "demo") {
        reloadOrder();
        return;
      }
      setError("Cổng thanh toán chưa được cấu hình.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function simulate(success: boolean) {
    const target = payment ?? o?.payment ?? o?.latest_payment;
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post(`/payments/${target.id}/demo`, { success });
      if (
        ["LATE_PAYMENT", "DIFFERENT_PAYMENT_ALREADY_APPLIED"].includes(
          response.data.data.outcome,
        )
      )
        setError(
          "Đã nhận kết quả nhưng cần hỗ trợ xử lý. Chưa có vé mới được phát hành.",
        );
      setPayment(null);
      reloadOrder();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function cancelOrder() {
    if (!o) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/orders/${o.id}/cancel`);
      setConfirmCancel(false);
      reloadOrder();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  if (resource.loading && !o)
    return (
      <div className="checkout-page">
        <div className="ck-container ck-loading">
          <Loading />
        </div>
      </div>
    );
  if (!o)
    return (
      <div className="checkout-page">
        <div className="ck-container ck-loading">
          <Notice error={resource.error || "Không tải được đơn hàng."} />
        </div>
      </div>
    );

  const event = o.event,
    buyerName = o.buyer_name_snapshot || user?.name || "—",
    buyerEmail = o.buyer_email_snapshot || user?.email || "—",
    buyerPhone = user?.phone?.trim() ?? "",
    eventTitle = event?.title || o.event_title_snapshot,
    venue = [event?.venue_name, event?.address, event?.city_code]
      .filter(Boolean)
      .join(", "),
    status = statusInfo(o.status),
    isPending = o.status === "PENDING_PAYMENT",
    isPaid = o.status === "PAID",
    isClosed = o.status === "EXPIRED" || o.status === "CANCELLED",
    orderPayment = o.payment ?? o.latest_payment,
    activeOrderPayment = orderPayment && (["PENDING", "UNKNOWN"].includes(orderPayment.status) || orderPayment.requires_review) ? orderPayment : null,
    providerExpired = Boolean(
      o.payment?.provider_expires_at &&
        Date.parse(o.payment.provider_expires_at) <= now,
    ),
    canStartPayment = isPending && remaining > 0 && !providerExpired && !busy,
    canPay = canStartPayment && (method === "mbbank"
      ? sepayReady && (!activeOrderPayment || activeOrderPayment.provider === "sepay")
      : method === "vnpay" && paymentReady && (!activeOrderPayment || activeOrderPayment.provider === "vnpay_sandbox" || activeOrderPayment.provider === "demo")),
    activePayment = payment ?? o.payment ?? o.latest_payment,
    fallbackPath = event?.slug ? `/events/${event.slug}` : "/explore",
    paymentHint =
      !isPending
        ? "Đơn hàng đã kết thúc nên không thể khởi tạo giao dịch mới."
        : remaining === 0
          ? "Thời gian giữ vé đã hết. Vui lòng quay lại sự kiện để đặt đơn mới."
          : providerExpired
            ? "Phiên thanh toán trước đã hết hạn. Hãy cập nhật trạng thái đơn trước khi thử lại."
              : method === "mbbank"
                ? "Sau khi tạo hướng dẫn, hãy chuyển đúng số tiền và nội dung để hệ thống tự xác nhận qua SePay."
                : mode === "vnpay_sandbox"
              ? "Bạn sẽ được chuyển đến cổng VNPay Sandbox để xác thực. Sau khi hoàn tất, trạng thái đơn hàng được cập nhật tự động."
              : mode === "demo"
                ? "Chế độ demo local tạo giao dịch mô phỏng, không thu tiền thật. Kết quả được chọn ở khung mô phỏng bên dưới."
                : config.loading
                  ? "Đang kiểm tra cấu hình cổng thanh toán."
                  : "Cổng thanh toán chưa được cấu hình nên chưa thể khởi tạo giao dịch.";
  const liveLabel = method === "mbbank"
    ? sepayReady ? "Chuyển khoản MB Bank qua SePay" : "SePay chưa được cấu hình"
    : !isPending
    ? status.label
    : remaining === 0
      ? "Đã hết thời gian giữ vé"
      : providerExpired
        ? "Phiên thanh toán đã hết hạn"
        : mode === "vnpay_sandbox"
          ? "Cổng VNPay Sandbox sẵn sàng"
          : mode === "demo"
            ? "Chế độ thanh toán demo"
            : "Cổng thanh toán chưa sẵn sàng";

  return (
    <div className="checkout-page">
      <section className="ck-stepper-band" aria-label="Tiến trình đặt vé">
        <div className="ck-container">
          <div className="ck-steps">
            <Link
              className="ck-step is-done"
              to={fallbackPath}
              aria-label="Quay lại bước chọn vé"
            >
              <span className="ck-step-num">
                <Check size={15} aria-hidden="true" />
              </span>
              <span className="ck-step-copy">
                <span className="ck-step-kicker">Bước 01</span>
                <span className="ck-step-title">Chọn vé &amp; Số lượng</span>
              </span>
            </Link>
            <span className="ck-step-line" aria-hidden="true" />
            <div
              className={`ck-step ${isPaid ? "is-done" : isClosed ? "is-failed" : "is-active"}`}
              aria-current={!isPaid && !isClosed ? "step" : undefined}
            >
              <span className="ck-step-num">
                {isPaid ? <Check size={15} aria-hidden="true" /> : "02"}
              </span>
              <span className="ck-step-copy">
                <span className="ck-step-kicker">Bước 02</span>
                <span className="ck-step-title">Thanh toán &amp; Xác nhận</span>
              </span>
            </div>
            <span
              className={`ck-step-line${isPaid ? "" : " is-muted"}`}
              aria-hidden="true"
            />
            <div
              className={`ck-step ${isPaid ? "is-active" : ""}`}
              aria-current={isPaid ? "step" : undefined}
            >
              <span className="ck-step-num">03</span>
              <span className="ck-step-copy">
                <span className="ck-step-kicker">Bước 03</span>
                <span className="ck-step-title">Nhận vé QR</span>
              </span>
            </div>
          </div>
          <div
            className={`ck-countdown${isPaid ? " is-done" : isClosed ? " is-over" : remaining === 0 ? " is-over" : ""}`}
          >
            <span className="ck-countdown-label">
              <i className="ck-countdown-dot" aria-hidden="true" />
              {isPending ? "Thời gian giữ vé:" : "Trạng thái đơn:"}
            </span>
            <time>
              {isPending ? (
                <>
                  <Timer size={16} aria-hidden="true" />
                  {remaining > 0 ? countdown : "HẾT GIỜ"}
                </>
              ) : (
                status.label.toUpperCase()
              )}
            </time>
          </div>
        </div>
      </section>

      <div className="ck-main">
        <div className="ck-left">
          <header>
            <span className="ck-intro-pill">
              <Rocket size={12} aria-hidden="true" />
              Giao thức thanh toán đa tầng Nebula
            </span>
            <h1 className="ck-title">
              Xác nhận <em>&amp;</em> đặt vé
            </h1>
            <p className="ck-lead">
              Hoàn tất xác thực thông tin người nhận và chọn phương thức thanh
              toán để phát hành vé QR điện tử cho đơn hàng của bạn.
            </p>
          </header>

          {error && (
            <div className="ck-alert" role="alert">
              <Info size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {isPaid && (
            <div className="ck-alert success">
              <Check size={16} aria-hidden="true" />
              <span>
                <strong>Thanh toán đã được xác nhận.</strong> Vé QR đã sẵn sàng
                trong mục “Vé của tôi”.
              </span>
            </div>
          )}
          {isClosed && (
            <div className="ck-alert">
              <Info size={16} aria-hidden="true" />
              <span>
                {o.status === "EXPIRED"
                  ? "Đơn hàng đã hết hạn giữ chỗ. Vé chưa được phát hành."
                  : "Đơn hàng đã được hủy. Vé chưa được phát hành."}
              </span>
            </div>
          )}
          {!isPaid && o.latest_payment && (
            <div className="ck-alert info">
              <Info size={16} aria-hidden="true" />
              <span>{paymentMessage(o.latest_payment)}</span>
            </div>
          )}

          <section
            className="ck-panel ck-panel-attendee"
            aria-labelledby="ck-attendee-title"
          >
            <div className="ck-panel-head">
              <div className="ck-panel-title">
                <span className="ck-accent" aria-hidden="true" />
                <h2 id="ck-attendee-title">1. Thông tin người nhận vé</h2>
              </div>
              <span className="ck-sync-badge">Đã đồng bộ tài khoản</span>
            </div>
            <div className="ck-fields">
              <div className="ck-field">
                <label
                  className="ck-field-label"
                  htmlFor="ck-recipient-name"
                >
                  Họ và tên người nhận vé (Khắc lên QR)
                </label>
                <div className="ck-input-wrap">
                  <UserRound
                    className="ck-input-icon"
                    size={17}
                    aria-hidden="true"
                  />
                  <input
                    id="ck-recipient-name"
                    className="ck-input"
                    value={buyerName}
                    readOnly
                    aria-readonly="true"
                  />
                  <Lock
                    className="ck-input-lock"
                    size={13}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="ck-field">
                <label className="ck-field-label" htmlFor="ck-recipient-email">
                  Email nhận thông tin vé và đơn hàng
                </label>
                <div className="ck-input-wrap">
                  <Mail
                    className="ck-input-icon"
                    size={17}
                    aria-hidden="true"
                  />
                  <input
                    id="ck-recipient-email"
                    className="ck-input"
                    type="email"
                    value={buyerEmail}
                    readOnly
                    aria-readonly="true"
                  />
                  <Lock
                    className="ck-input-lock"
                    size={13}
                    aria-hidden="true"
                  />
                </div>
                <div className="ck-field-note">
                  <Mail size={13} aria-hidden="true" />
                  <span>
                    Vé QR điện tử hiển thị trong mục “Vé của tôi” sau khi thanh
                    toán thành công.
                  </span>
                </div>
              </div>
              <div className="ck-field">
                <label className="ck-field-label" htmlFor="ck-recipient-phone">
                  Số điện thoại liên lạc &amp; khẩn cấp
                </label>
                <div className="ck-input-wrap">
                  <Phone
                    className="ck-input-icon"
                    size={17}
                    aria-hidden="true"
                  />
                  <input
                    id="ck-recipient-phone"
                    className="ck-input"
                    type="tel"
                    value={buyerPhone}
                    placeholder="Chưa cập nhật số điện thoại"
                    readOnly
                    aria-readonly="true"
                  />
                  <Lock
                    className="ck-input-lock"
                    size={13}
                    aria-hidden="true"
                  />
                </div>
                {!buyerPhone && (
                  <div className="ck-field-note">
                    <Phone size={13} aria-hidden="true" />
                    <span>
                      Bạn có thể{" "}
                      <Link to="/profile">cập nhật số điện thoại trong hồ sơ</Link>{" "}
                      để ban tổ chức liên hệ khi cần.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className="ck-panel ck-panel-payment"
            aria-labelledby="ck-payment-title"
          >
            <div className="ck-panel-head">
              <div className="ck-panel-title">
                <span className="ck-accent purple" aria-hidden="true" />
                <h2 id="ck-payment-title">
                  2. Phương thức thanh toán linh hoạt
                </h2>
              </div>
              <span className="ck-lock-note">
                <Lock size={12} aria-hidden="true" />
                Mã hóa 256-bit
              </span>
            </div>
            {!paymentReady && !sepayReady && (
              <div className="ck-method-note">
                {config.loading
                  ? "Đang kiểm tra cấu hình cổng thanh toán."
                  : "Chưa cấu hình phương thức thanh toán. Bạn vẫn có thể xem đơn và hủy giữ chỗ."}
              </div>
            )}
            <div
              className="ck-methods"
              role="radiogroup"
              aria-label="Phương thức thanh toán"
            >
              <div
                className={`ck-method${method === "mbbank" ? " is-selected" : ""}${canStartPayment && sepayReady ? "" : " is-locked"}`}
                onClick={() => canStartPayment && sepayReady && chooseMethod("mbbank")}
              >
                <div className="ck-method-top">
                  <div className="ck-method-main">
                    <input
                      className="ck-radio"
                      id="ck-method-mbbank"
                      name="ck-payment-method"
                      type="radio"
                      checked={method === "mbbank"}
                      onChange={() => chooseMethod("mbbank")}
                      disabled={!canStartPayment || !sepayReady}
                    />
                    <label className="ck-method-copy" htmlFor="ck-method-mbbank">
                      <span className="ck-method-title">
                        Chuyển khoản MB Bank
                        <span className="ck-badge purple">Tự động xác nhận</span>
                      </span>
                      <span className="ck-method-desc">
                        Quét VietQR hoặc chuyển khoản đúng nội dung. SePay sẽ cập nhật đơn sau khi ngân hàng xác nhận.
                      </span>
                    </label>
                  </div>
                  <div className="ck-badges">
                    <span className="ck-badge">MB BANK</span>
                    <span className="ck-badge vietqr">SEPAY</span>
                  </div>
                </div>
                {method === "mbbank" && (
                  sepayInfo ? (
                    <div className="ck-sepay-box" aria-live="polite">
                      <div className="ck-sepay-head">
                        <div>
                          <strong>{sepayInfo.requiresReview ? "Giao dịch cần được tra soát" : sepayInfo.orderStatus === "PAID" ? "Đã nhận thanh toán" : sepayInfo.canTransfer ? "Đang chờ chuyển khoản" : "Phiên thanh toán đã kết thúc"}</strong>
                          <p>{sepayInfo.requiresReview ? "Chưa phát hành vé. Bộ phận hỗ trợ sẽ kiểm tra giao dịch." : "Chỉ chuyển đúng số tiền và nội dung bên dưới để hệ thống tự nhận diện."}</p>
                        </div>
                        <button className="ck-sepay-refresh" type="button" onClick={() => void refreshSepay()} disabled={sepayLoading} aria-label="Kiểm tra trạng thái thanh toán">
                          <RefreshCw size={15} className={sepayLoading ? "is-spinning" : ""} />
                          Kiểm tra
                        </button>
                      </div>
                      <div className="ck-sepay-instructions">
                        {sepayInfo.qrUrl && sepayInfo.canTransfer && (
                          <img className="ck-sepay-qr" src={sepayInfo.qrUrl} alt="Mã QR chuyển khoản MB Bank cho đơn hàng" />
                        )}
                        <div className="ck-sepay-fields">
                          <div><span>Ngân hàng</span><strong><Building2 size={14} /> MB Bank</strong></div>
                          <div><span>Chủ tài khoản</span><strong>{sepayInfo.accountName}</strong></div>
                          <div><span>Số tài khoản</span><strong>{sepayInfo.accountNumber}<button type="button" onClick={() => void copyPaymentValue(sepayInfo.accountNumber, "Số tài khoản")} aria-label="Sao chép số tài khoản"><Copy size={13} /></button></strong></div>
                          <div><span>Số tiền</span><strong>{money(sepayInfo.amount)}<button type="button" onClick={() => void copyPaymentValue(sepayInfo.amount, "Số tiền")} aria-label="Sao chép số tiền"><Copy size={13} /></button></strong></div>
                          <div><span>Nội dung chuyển khoản</span><strong>{sepayInfo.transferContent}<button type="button" onClick={() => void copyPaymentValue(sepayInfo.transferContent, "Nội dung chuyển khoản")} aria-label="Sao chép nội dung chuyển khoản"><Copy size={13} /></button></strong></div>
                          <div><span>Hạn thanh toán</span><strong>{timeText(sepayInfo.expiresAt)} · {dateText(sepayInfo.expiresAt)}</strong></div>
                        </div>
                      </div>
                      <p className="ck-sepay-footnote">Không ghi thêm nội dung khác. Trạng thái chỉ đổi sau khi SePay xác nhận giao dịch từ MB Bank.</p>
                    </div>
                  ) : (
                    <p className="ck-method-soon"><QrCode size={14} aria-hidden="true" /><span>{sepayReady ? "Nhấn nút thanh toán để tạo QR và nội dung chuyển khoản riêng cho đơn này." : "SePay đang tạm thời chưa sẵn sàng. Vui lòng chọn VNPay hoặc thử lại sau."}</span></p>
                  )
                )}
              </div>

              <div
                className={`ck-method ck-method-primary${method === "vnpay" ? " is-selected" : ""}${canStartPayment && paymentReady ? "" : " is-locked"}`}
                onClick={requestVnpay}
              >
                <div className="ck-method-top">
                  <div className="ck-method-main">
                    <input
                      className="ck-radio"
                      id="ck-method-vnpay"
                      name="ck-payment-method"
                      type="radio"
                      checked={method === "vnpay"}
                      onClick={(event) => event.stopPropagation()}
                      onChange={requestVnpay}
                      disabled={!canStartPayment}
                    />
                    <label
                      className="ck-method-copy"
                      htmlFor="ck-method-vnpay"
                    >
                      <span className="ck-method-title">
                        VNPay - Cổng thanh toán quốc gia
                        <span className="ck-badge cyan">Khuyên dùng</span>
                      </span>
                      <span className="ck-method-desc">
                        Thanh toán bằng thẻ ATM, tài khoản ngân hàng hoặc QR
                        qua cổng VNPay.
                      </span>
                    </label>
                  </div>
                  <div className="ck-badges">
                    <span className="ck-badge vnpay">VNPAY</span>
                    <span className="ck-badge">ATM</span>
                    <span className="ck-badge">QR</span>
                  </div>
                </div>
                {method === "vnpay" && (
                  <div className="ck-method-detail">
                    <span className="ck-vnpay-orb">
                      <ShieldCheck size={24} aria-hidden="true" />
                    </span>
                    <div className="ck-method-detail-copy">
                      <div className="ck-live">
                        <i className="ck-live-dot" aria-hidden="true" />
                        {liveLabel}
                      </div>
                      <p>{paymentHint}</p>
                      <div className="ck-method-detail-meta">
                        <span>
                          Mã đơn <strong>{o.order_code}</strong>
                        </span>
                        <span className="ck-method-meta-dot" aria-hidden="true">
                          •
                        </span>
                        <span>
                          Số tiền <strong>{money(o.total_amount)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`ck-method${method === "vietqr" ? " is-selected" : ""}${canPay ? "" : " is-locked"}`}
                onClick={() => canStartPayment && chooseMethod("vietqr")}
              >
                <div className="ck-method-top">
                  <div className="ck-method-main">
                    <input
                      className="ck-radio"
                      id="ck-method-vietqr"
                      name="ck-payment-method"
                      type="radio"
                      checked={method === "vietqr"}
                      onChange={() => chooseMethod("vietqr")}
                      disabled={!canStartPayment}
                    />
                    <label
                      className="ck-method-copy"
                      htmlFor="ck-method-vietqr"
                    >
                      <span className="ck-method-title">
                        VietQR - Chuyển khoản ngân hàng
                      </span>
                      <span className="ck-method-desc">
                        Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản
                        nhanh.
                      </span>
                    </label>
                  </div>
                  <div className="ck-badges">
                    <span className="ck-badge vietqr">VietQR</span>
                    <span className="ck-badge">NAPAS 247</span>
                  </div>
                </div>
                {method === "vietqr" && (
                  <p className="ck-method-soon">
                    <QrCode size={14} aria-hidden="true" />
                    <span>{COMING_SOON}.</span>
                  </p>
                )}
              </div>

              <div
                className={`ck-method${method === "ewallet" ? " is-selected" : ""}${canStartPayment ? "" : " is-locked"}`}
                onClick={() => canStartPayment && chooseMethod("ewallet")}
              >
                <div className="ck-method-top">
                  <div className="ck-method-main">
                    <input
                      className="ck-radio"
                      id="ck-method-ewallet"
                      name="ck-payment-method"
                      type="radio"
                      checked={method === "ewallet"}
                      onChange={() => chooseMethod("ewallet")}
                      disabled={!canStartPayment}
                    />
                    <label
                      className="ck-method-copy"
                      htmlFor="ck-method-ewallet"
                    >
                      <span className="ck-method-title">
                        Ví điện tử MoMo / ZaloPay / ShopeePay
                      </span>
                      <span className="ck-method-desc">
                        Liên kết tài khoản ví, hoàn tiền và tích điểm thành viên
                        EventHub.
                      </span>
                    </label>
                  </div>
                  <div className="ck-badges">
                    <span className="ck-badge momo">MoMo</span>
                    <span className="ck-badge zalo">ZaloPay</span>
                    <span className="ck-badge shopee">ShopeePay</span>
                  </div>
                </div>
                {method === "ewallet" && (
                  <p className="ck-method-soon">
                    <Info size={14} aria-hidden="true" />
                    <span>{COMING_SOON}.</span>
                  </p>
                )}
              </div>

              <div
                className={`ck-method${method === "card" ? " is-selected" : ""}${canStartPayment ? "" : " is-locked"}`}
                onClick={() => canStartPayment && chooseMethod("card")}
              >
                <div className="ck-method-top">
                  <div className="ck-method-main">
                    <input
                      className="ck-radio"
                      id="ck-method-card"
                      name="ck-payment-method"
                      type="radio"
                      checked={method === "card"}
                      onChange={() => chooseMethod("card")}
                      disabled={!canStartPayment}
                    />
                    <label
                      className="ck-method-copy"
                      htmlFor="ck-method-card"
                    >
                      <span className="ck-method-title">
                        Thẻ quốc tế (Visa / MasterCard / JCB)
                      </span>
                      <span className="ck-method-desc">
                        Hỗ trợ thẻ thanh toán quốc tế phát hành bởi mọi ngân
                        hàng.
                      </span>
                    </label>
                  </div>
                  <div className="ck-badges">
                    <span className="ck-badge">VISA</span>
                    <span className="ck-badge">MC</span>
                    <span className="ck-badge">JCB</span>
                  </div>
                </div>
                {method === "card" && (
                  <p className="ck-method-soon">
                    <CreditCard size={14} aria-hidden="true" />
                    <span>{COMING_SOON}.</span>
                  </p>
                )}
              </div>

              <div
                className={`ck-method${method === "wallet" ? " is-selected" : ""}${canStartPayment ? "" : " is-locked"}`}
                onClick={() => canStartPayment && chooseMethod("wallet")}
              >
                <div className="ck-method-top">
                  <div className="ck-method-main">
                    <input
                      className="ck-radio"
                      id="ck-method-wallet"
                      name="ck-payment-method"
                      type="radio"
                      checked={method === "wallet"}
                      onChange={() => chooseMethod("wallet")}
                      disabled={!canStartPayment}
                    />
                    <label
                      className="ck-method-copy"
                      htmlFor="ck-method-wallet"
                    >
                      <span className="ck-method-title">
                        Apple Pay / Google Pay
                      </span>
                      <span className="ck-method-desc">
                        Xác thực sinh trắc học TouchID / FaceID một chạm cực
                        nhanh.
                      </span>
                    </label>
                  </div>
                  <div className="ck-badges">
                    <span className="ck-badge">
                      <Smartphone size={11} aria-hidden="true" />
                    </span>
                  </div>
                </div>
                {method === "wallet" && (
                  <p className="ck-method-soon">
                    <Wallet size={14} aria-hidden="true" />
                    <span>{COMING_SOON}.</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="ck-trust">
            <div className="ck-trust-item">
              <ShieldCheck size={22} aria-hidden="true" />
              <div>
                <h3>Bảo mật thanh toán PCI-DSS</h3>
                <p>
                  Thông tin thanh toán được xử lý trên cổng VNPay; EventHub
                  không lưu dữ liệu thẻ.
                </p>
              </div>
            </div>
            <div className="ck-trust-item">
              <Ticket size={22} aria-hidden="true" />
              <div>
                <h3>Vé QR cấp đúng tài khoản</h3>
                <p>
                  Vé điện tử được phát hành ngay khi thanh toán thành công và
                  tra cứu tại mục “Vé của tôi”.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="ck-aside" aria-label="Tóm tắt đơn hàng">
          <article className="ck-ticket">
            <div className="ck-ticket-cover">
              <EventCover src={event?.cover_image_url ?? undefined} />
              <span className="ck-ticket-badge">
                <Ticket size={11} aria-hidden="true" />
                Vé điện tử
              </span>
              <span className={`ck-ticket-status ${status.tone}`.trim()}>
                <i aria-hidden="true" />
                {status.label}
              </span>
            </div>
            <div className="ck-ticket-body">
              <span className="ck-ticket-kicker">Sự kiện đang đặt vé</span>
              <h2 className="ck-ticket-title">{eventTitle}</h2>
              <div className="ck-ticket-code">
                Mã đơn {o.order_code} • {o.total_quantity} vé
              </div>
              <div className="ck-ticket-meta">
                <div>
                  <CalendarDays size={16} aria-hidden="true" />
                  <span>
                    <strong>
                      {scheduleText(event?.starts_at, event?.ends_at)}
                    </strong>
                  </span>
                </div>
                <div>
                  <MapPin size={16} aria-hidden="true" />
                  <span>{venue || "Địa điểm đang cập nhật"}</span>
                </div>
              </div>
              <div className="ck-perf" aria-hidden="true" />
              <div className="ck-ticket-items">
                {(o.items ?? []).map((item, index) => (
                  <div
                    className="ck-ticket-item"
                    key={`${item.ticket_type_name_snapshot}-${index}`}
                  >
                    <div className="ck-ticket-item-copy">
                      <div className="ck-ticket-item-name">
                        {String(item.quantity).padStart(2, "0")} x{" "}
                        {item.ticket_type_name_snapshot}
                      </div>
                      <div className="ck-ticket-item-note">
                        {item.unit_price
                          ? `${money(item.unit_price)} / vé`
                          : "Hạng vé đã chọn"}
                      </div>
                    </div>
                    <div className="ck-ticket-item-price">
                      {money(item.line_total)}
                    </div>
                  </div>
                ))}
                <div className="ck-ticket-fee">
                  <span>Phí dịch vụ &amp; mã hóa QR</span>
                  <em>Miễn phí</em>
                </div>
              </div>
              <div className="ck-ticket-divider" />
              <div className="ck-ticket-total">
                <span>Tổng thanh toán:</span>
                <strong>{money(o.total_amount)}</strong>
              </div>

              {isPaid ? (
                <Link className="ck-cta" to="/tickets">
                  Xem vé QR của bạn
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ) : isClosed ? (
                <Link className="ck-cta is-muted" to={fallbackPath}>
                  {o.status === "EXPIRED" ? "Đặt lại vé" : "Tìm sự kiện khác"}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ) : remaining === 0 ? (
                <Link className="ck-cta is-muted" to={fallbackPath}>
                  Quay lại sự kiện
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="ck-cta"
                  onClick={() => void (method === "mbbank" && sepayInfo ? refreshSepay() : pay())}
                  disabled={!canPay}
                >
                  {busy || (method === "mbbank" && sepayLoading)
                    ? "Đang xử lý..."
                    : method === "mbbank" && sepayInfo
                      ? "Kiểm tra trạng thái thanh toán"
                      : "Xác nhận và tiến hành thanh toán"}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              )}

              {isPending && !paymentReady && !sepayReady && (
                <p className="ck-cta-note">
                  {config.loading
                    ? "Đang kiểm tra cấu hình thanh toán..."
                    : "Chưa cấu hình phương thức thanh toán."}
                </p>
              )}
              {isPending && activeOrderPayment && method === "mbbank" && activeOrderPayment.provider !== "sepay" && (
                <p className="ck-cta-note">Đơn này đang có giao dịch {activeOrderPayment.provider === "vnpay_sandbox" ? "VNPay" : "khác"} chưa kết thúc. Cập nhật trạng thái giao dịch đó trước khi đổi phương thức.</p>
              )}
              {isPending && activeOrderPayment && method === "vnpay" && !["vnpay_sandbox", "demo"].includes(activeOrderPayment.provider ?? "") && (
                <p className="ck-cta-note">Đơn này đã có giao dịch SePay. Vui lòng tiếp tục thanh toán bằng MB Bank hoặc cập nhật trạng thái.</p>
              )}
              {isPending && remaining === 0 && (
                <p className="ck-cta-note">
                  Thời gian giữ vé đã hết. Vui lòng quay lại sự kiện để đặt đơn
                  mới.
                </p>
              )}
              {isPending && providerExpired && remaining > 0 && (
                <p className="ck-cta-note">
                  Phiên thanh toán trước đã hết hạn. Hãy cập nhật trạng thái
                  trước khi thử lại.
                </p>
              )}

              {mode === "demo" && isPending && activePayment && (
                <div className="ck-demo-box">
                  <strong>Mô phỏng thanh toán demo</strong>
                  <div className="ck-demo-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void simulate(true)}
                    >
                      Thành công
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void simulate(false)}
                    >
                      Thất bại
                    </button>
                  </div>
                </div>
              )}

              <p className="ck-ticket-legal">
                Bằng việc bấm xác nhận, bạn đồng ý với Điều khoản dịch vụ và
                Quy chế tham gia của EventHub.
              </p>
              <div className="ck-ticket-links">
                {isPending && remaining > 0 && (
                  <>
                    {confirmCancel ? (
                      <span className="ck-cancel-confirm">
                        <span>Hủy đơn giữ chỗ này?</span>
                        <button
                          type="button"
                          className="ck-cancel-yes"
                          disabled={busy}
                          onClick={() => void cancelOrder()}
                        >
                          Xác nhận hủy
                        </button>
                        <button
                          type="button"
                          className="ck-cancel-no"
                          onClick={() => setConfirmCancel(false)}
                        >
                          Giữ đơn
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(true)}
                      >
                        Hủy đơn chưa thanh toán
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  disabled={resource.loading}
                  onClick={reloadOrder}
                >
                  Cập nhật trạng thái
                </button>
                <Link to="/orders">Lịch sử đơn hàng</Link>
              </div>
            </div>
            <div className="ck-ticket-stripe" aria-hidden="true" />
          </article>
        </aside>
      </div>

      {toast && (
        <div className="ck-toast" role="status" aria-live="polite" key={toast.id}>
          <Info size={18} aria-hidden="true" />
          <span>{toast.text}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
