import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookingSteps } from "@/components/ticketing/event-visuals";
import { Loading, Notice, PageHead, Status } from "@/components/ticketing/shared";
import api from "@/lib/api";
import { checkoutUrl, paymentMessage } from "@/features/ticketing/payment";
import { useLoad, message, money } from "@/features/ticketing/data";
import type { Order, Payment } from "@/features/ticketing/types";

export function Checkout() {
  const { id } = useParams(),
    resource = useLoad<Order>(`/me/orders/${id}`),
    o = resource.data,
    [payment, setPayment] = useState<Payment | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const config = useLoad<{ paymentMode: string }>("/config");
  const pendingVnpay =
    o?.status === "PENDING_PAYMENT" && o.payment?.provider === "vnpay_sandbox";
  const reloadOrder = resource.reload;
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
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function pay(success?: boolean) {
    setBusy(true);
    setError("");
    try {
      if (success === undefined) {
        const r = await api.post(`/orders/${id}/payments`);
        setPayment(r.data.data);
        if (r.data.data.provider === "vnpay_sandbox")
          window.location.assign(checkoutUrl(r.data.data.checkout_url));
      } else {
        const p = payment ?? o?.payment;
        if (!p) return;
        const r = await api.post(`/payments/${p.id}/demo`, { success });
        if (
          ["LATE_PAYMENT", "DIFFERENT_PAYMENT_ALREADY_APPLIED"].includes(
            r.data.data.outcome,
          )
        )
          setError(
            "Đã nhận kết quả nhưng cần hỗ trợ xử lý. Chưa có vé mới được phát hành.",
          );
        setPayment(null);
        resource.reload();
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading && !o) return <Loading />;
  if (!o) return <Notice error={resource.error} />;
  const remaining = Math.max(
    0,
    Math.floor((Date.parse(o.expires_at) - now) / 1000),
  );
  return (
    <>
      <BookingSteps step={o.status === "PAID" ? 3 : 2} />
      <PageHead eyebrow="HOÀN TẤT ĐẶT VÉ" title={o.event_title_snapshot}>
        <span>{o.order_code}</span>
      </PageHead>
      <div className="detail-grid">
        <section className="panel">
          <div className="split">
            <h2>Thông tin đơn hàng</h2>
            <Status value={o.status} />
          </div>
          {o.items?.map((i, n) => (
            <div className="line-item" key={n}>
              <span>
                {i.ticket_type_name_snapshot} × {i.quantity}
              </span>
              <strong>{money(i.line_total)}</strong>
            </div>
          ))}
          <div className="total">
            <span>Tổng thanh toán</span>
            <strong>{money(o.total_amount)}</strong>
          </div>
          <p>Người mua: {o.buyer_name_snapshot}</p>
          {o.status === "PAID" && (
            <Link className="btn primary" to="/tickets">
              Xem vé QR của bạn →
            </Link>
          )}
        </section>
        <aside className="panel">
          <h2>{o.status === "PAID" ? "Đặt vé thành công" : "Thanh toán"}</h2>
          <Notice error={error} />
          <Notice>{paymentMessage(o.latest_payment)}</Notice>
          {o.status === "EXPIRED" && (
            <Notice>Đơn hàng đã hết hạn giữ chỗ.</Notice>
          )}
          <button
            className="btn ghost full"
            disabled={resource.loading || busy}
            onClick={resource.reload}
          >
            Cập nhật trạng thái
          </button>
          {o.status === "PENDING_PAYMENT" && (
            <>
              <p>
                Thời gian tạo thanh toán còn lại:{" "}
                <strong>
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </strong>
              </p>
              {config.data?.paymentMode === "demo" ? (
                <Notice>Chế độ demo local — không thu tiền thật.</Notice>
              ) : config.data?.paymentMode === "vnpay_sandbox" ? (
                <Notice>
                  VNPay Sandbox — chỉ dùng thông tin thanh toán thử.
                </Notice>
              ) : (
                <Notice>
                  Chưa cấu hình cổng thanh toán. Bạn có thể xem đơn và hủy giữ
                  chỗ.
                </Notice>
              )}
              {config.data?.paymentMode === "vnpay_sandbox" ? (
                <button
                  className="btn primary full"
                  disabled={
                    busy ||
                    !remaining ||
                    Boolean(
                      o.payment?.provider_expires_at &&
                      Date.parse(o.payment.provider_expires_at) <= now,
                    )
                  }
                  onClick={() => void pay()}
                >
                  Thanh toán qua VNPay
                </button>
              ) : (payment || o.payment) &&
                config.data?.paymentMode === "demo" ? (
                <>
                  <p>Chọn kết quả để thử luồng thanh toán demo.</p>
                  <button
                    disabled={busy}
                    className="btn primary full"
                    onClick={() => void pay(true)}
                  >
                    Mô phỏng thanh toán thành công
                  </button>
                  <button
                    disabled={busy}
                    className="btn ghost full"
                    onClick={() => void pay(false)}
                  >
                    Mô phỏng thất bại
                  </button>
                </>
              ) : (
                <button
                  className="btn primary full"
                  disabled={
                    busy || !remaining || config.data?.paymentMode !== "demo"
                  }
                  onClick={() => void pay()}
                >
                  Tiếp tục thanh toán
                </button>
              )}
              <button
                className="btn ghost full"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api.post(`/orders/${id}/cancel`);
                    resource.reload();
                  } catch (e) {
                    setError(message(e));
                  }
                }}
              >
                Hủy đơn chưa thanh toán
              </button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
