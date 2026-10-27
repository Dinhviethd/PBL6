import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock3, MailCheck, Minus, Plus, ShieldCheck, ShoppingCart, Ticket } from "lucide-react";
import axios from "axios";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { message, money } from "@/features/ticketing/data";
import type { Event, Order, TicketType } from "@/features/ticketing/types";
import { JoinWaitQueue } from "@/components/ticketing/wait-queue";

function availability(event: Event, type: TicketType, now: number) {
  const left = Math.max(0, type.capacity - type.reserved_quantity - type.sold_quantity);
  const ended = now >= Date.parse(event.ends_at);
  const open = now >= Date.parse(type.sale_starts_at) && now < Date.parse(type.sale_ends_at);
  const waiting = Number(type.waiting_count ?? 0) > 0;
  const closed = event.status !== "PUBLISHED" || event.sales_paused || ended;
  const label = ended ? "Sự kiện đã kết thúc" : closed ? "Tạm ngừng bán"
    : now < Date.parse(type.sale_starts_at) ? "Chưa mở bán"
    : !open ? "Đã đóng bán" : left === 0 ? "Hết vé"
    : waiting ? "Ưu tiên danh sách chờ" : `Còn ${left} vé`;
  return { left, label, available: !closed && open && left > 0 && !waiting,
    canWait: !closed && open && (left === 0 || waiting) };
}

export function EventTicketSelector({ event, reload }: { event: Event; reload: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const key = useRef(crypto.randomUUID());
  const user = useAuth((s) => s.user);
  const verified = useAuth((s) => s.isAuthVerified);
  const navigate = useNavigate();
  const types = event.ticketTypes ?? [];
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const total = types.reduce((sum, type) => sum + Number(type.price_amount) * (quantities[type.id] ?? 0), 0);
  const invalid = types.some((type) => {
    const state = availability(event, type, now);
    return (quantities[type.id] ?? 0) > 0 && (!state.available || quantities[type.id] > state.left);
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function change(type: TicketType, next: number) {
    if (pending.current) return;
    const state = availability(event, type, Date.now());
    const other = count - (quantities[type.id] ?? 0);
    if (next < 0 || next > Math.min(state.left, 10 - other) || (next > 0 && !state.available)) return;
    key.current = crypto.randomUUID();
    setFailure("");
    setQuantities((current) => ({ ...current, [type.id]: next }));
  }
  async function buy() {
    if (!verified || pending.current || count === 0 || count > 10 || invalid) return;
    if (!user) {
      navigate("/auth/login", { state: { from: `/events/${event.slug}` } });
      return;
    }
    pending.current = true;
    setBusy(true);
    setFailure("");
    try {
      const items = types.filter((type) => quantities[type.id] > 0)
        .map((type) => ({ ticketTypeId: type.id, quantity: quantities[type.id] }));
      const response = await api.post<{ data: Order }>("/orders",
        { eventId: event.id, items }, { headers: { "Idempotency-Key": key.current } });
      navigate(`/checkout/${response.data.data.id}`);
    } catch (error) {
      setFailure(message(error));
      // A transport failure may have committed: retain the same key for retry.
      if (axios.isAxiosError(error) && ["SOLD_OUT", "SALES_CLOSED", "WAIT_QUEUE_PRIORITY", "INVALID_TICKET_TYPE"].includes(error.response?.data?.code)) {
        setQuantities({});
        key.current = crypto.randomUUID();
        reload();
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <aside className="event-detail-booking" aria-label="Đặt vé sự kiện">
      <div className="event-detail-ticket-box">
        <div className="event-detail-booking-heading">
          <div><h2>Chọn hạng vé của bạn</h2><p>Vé điện tử • Check-in bằng mã QR</p></div>
          <Ticket size={28} aria-hidden="true" />
        </div>
        {!types.length && <p className="event-detail-notice">Sự kiện chưa có hạng vé mở bán.</p>}
        <div className="event-detail-tickets">
          {types.map((type, index) => {
            const state = availability(event, type, now);
            const quantity = quantities[type.id] ?? 0;
            return (
              <article className={`event-detail-ticket ${!state.available ? "is-unavailable" : ""}`}
                data-ticket-id={type.id} key={type.id}>
                <div className="event-detail-ticket-top">
                  <div><h3>{type.name}</h3>{type.description && <p>{type.description}</p>}</div>
                  <div className={`event-detail-price ${index % 2 ? "is-purple" : ""}`}>
                    <strong>{money(type.price_amount)}</strong>
                    <span className={state.available ? "is-available" : ""}>{state.label}</span>
                  </div>
                </div>
                {(state.available || quantity > 0) && <div className="event-detail-counter-row">
                  <span>Số lượng</span>
                  <div className="event-detail-counter">
                    <button type="button" aria-label={`Giảm vé: ${type.name}`} disabled={!quantity || busy}
                      onClick={() => change(type, quantity - 1)}><Minus size={16} /></button>
                    <output aria-label={`Số lượng ${type.name}`}>{quantity}</output>
                    <button type="button" aria-label={`Tăng vé: ${type.name}`}
                      disabled={!state.available || busy || count >= 10 || quantity >= state.left}
                      onClick={() => change(type, quantity + 1)}><Plus size={16} /></button>
                  </div>
                </div>}
                {state.canWait && <JoinWaitQueue eventId={event.id} typeId={type.id} name={type.name} />}
              </article>
            );
          })}
        </div>
        <p className="event-detail-limit">Tối đa 10 vé mỗi đơn.{count === 10 && " Bạn đã chọn đủ 10 vé."}</p>
        <div className="event-detail-summary" aria-live="polite" aria-atomic="true">
          <h3>Tóm tắt đơn hàng</h3>
          <div><span>Số vé đã chọn</span><strong>{count} vé</strong></div>
          <div className="event-detail-summary-total"><span>Tạm tính</span><strong>{money(total)}</strong></div>
          <p>Tổng thanh toán được xác nhận khi tạo đơn. Bạn có thể kiểm tra lại trước khi thanh toán.</p>
        </div>
        {(failure || invalid) && <div className="event-detail-error" role="alert">
          {failure || "Vé đã chọn không còn khả dụng. Vui lòng cập nhật và chọn lại."}
          <button type="button" disabled={busy} onClick={() => { setQuantities({}); key.current = crypto.randomUUID(); reload(); }}>Cập nhật hạng vé</button>
        </div>}
        <button type="button" className="event-detail-primary" disabled={busy || !verified || count === 0 || invalid}
          onClick={() => void buy()}>
          <ShoppingCart size={20} aria-hidden="true" />
          {busy ? "Đang giữ chỗ…" : "Tiến hành đặt vé"}
        </button>
        <div className="event-detail-delivery">
          <p><MailCheck size={16} aria-hidden="true" />{user ? <>Email nhận vé: <b>{user.email}</b></> : "Đăng nhập để tiếp tục đặt vé."}</p>
          <p>Vé QR hiển thị trong <Link to={user ? "/tickets" : "/auth/login"} state={user ? undefined : { from: "/tickets" }}>Vé của tôi</Link> sau khi thanh toán thành công.</p>
        </div>
      </div>
      <div className="event-detail-assurance"><ShieldCheck size={28} aria-hidden="true" /><div><strong>Đặt vé an tâm cùng EventHub</strong><p><Clock3 size={13} aria-hidden="true" />Giữ chỗ trong 15 phút sau khi tạo đơn.</p></div></div>
    </aside>
  );
}
