import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { BookingSteps, EventCover } from "@/components/ticketing/event-visuals";
import { JoinWaitQueue } from "@/components/ticketing/wait-queue";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { Loading, Notice, PageHead } from "@/components/ticketing/shared";
import { useLoad, message, money, when } from "@/features/ticketing/data";
import type { Event } from "@/features/ticketing/types";

export function EventDetail() {
  const { slug } = useParams(),
    { data: e, error, loading } = useLoad<Event>(`/events/${slug}`),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false),
    key = useRef(crypto.randomUUID()),
    navigate = useNavigate(),
    user = useAuth((s) => s.user),
    isAuthVerified = useAuth((s) => s.isAuthVerified);
  async function buy() {
    if (!isAuthVerified) return;
    if (!user) {
      navigate("/auth/login", { state: { from: `/events/${slug}` } });
      return;
    }
    if (!e) return;
    setBusy(true);
    setFailure("");
    try {
      const items = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
      if (!items.length) throw Error("Chọn ít nhất một vé.");
      const response = await api.post(
        "/orders",
        { eventId: e.id, items },
        { headers: { "Idempotency-Key": key.current } },
      );
      navigate(`/checkout/${response.data.data.id}`);
    } catch (err) {
      setFailure(message(err));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!e) return <Notice error={error} />;
  const total = (e.ticketTypes ?? []).reduce(
    (sum, t) => sum + Number(t.price_amount) * (quantities[t.id] ?? 0),
    0,
  );
  return (
    <>
      <BookingSteps step={1} />
      <Link className="back" to="/">
        ← Tất cả sự kiện
      </Link>
      <div className="detail-grid">
        <section>
          <div className="detail-art">
            <EventCover src={e.cover_image_url} />
            <span className="detail-city">{e.city_code}</span>
          </div>
          <PageHead eyebrow={e.organizer?.name} title={e.title} />
          <div className="meta">
            <span>
              <CalendarDays size={18} />
              {when(e.starts_at)}
            </span>
            <span>
              <MapPin size={18} />
              {e.venue_name} · {e.address}
            </span>
          </div>
          <div className="panel">
            <h2>Về sự kiện</h2>
            <p className="description">{e.description}</p>
          </div>
        </section>
        <aside className="panel booking-panel">
          <span className="eyebrow">HẸN BẠN TẠI ĐÓ</span>
          <h2>Chọn vé của bạn</h2>
          {e.sales_paused && <Notice>Sự kiện đang tạm ngừng bán vé.</Notice>}
          {e.ticketTypes?.map((t) => {
            const left = t.capacity - t.reserved_quantity - t.sold_quantity,
              available =
                !e.sales_paused &&
                left > 0 &&
                Date.now() >= Date.parse(t.sale_starts_at) &&
                Date.now() < Date.parse(t.sale_ends_at),
              quantity = quantities[t.id] ?? 0,
              limit = Math.max(0, Math.min(10, left));
            function changeQuantity(next: number) {
              key.current = crypto.randomUUID();
              setQuantities((current) => ({ ...current, [t.id]: next }));
            }
            return (
              <div className="ticket-option" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <p>{money(t.price_amount)}</p>
                  <small>
                    {available ? `Còn ${left} vé` : "Chưa mở bán / hết vé"}
                  </small>
                  {!e.sales_paused &&
                    (left === 0 || Number(t.waiting_count) > 0) &&
                    Date.now() >= Date.parse(t.sale_starts_at) &&
                    Date.now() < Date.parse(t.sale_ends_at) &&
                    Date.now() < Date.parse(e.ends_at) && (
                      <JoinWaitQueue
                        eventId={e.id}
                        typeId={t.id}
                        name={t.name}
                      />
                    )}
                </div>
                <div className="quantity-control">
                  <button
                    type="button"
                    aria-label={`Giảm vé: ${t.name}`}
                    disabled={!available || quantity === 0 || busy}
                    onClick={() => changeQuantity(quantity - 1)}
                  >
                    −
                  </button>
                  <label>
                    <span className="sr-only">Số lượng {t.name}</span>
                    <select
                      aria-label={`Số lượng ${t.name}`}
                      disabled={!available || busy}
                      value={quantity}
                      onChange={(v) => changeQuantity(Number(v.target.value))}
                    >
                      {Array.from({ length: limit + 1 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    aria-label={`Tăng vé: ${t.name}`}
                    disabled={!available || quantity >= limit || busy}
                    onClick={() => changeQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
          <div className="total">
            <span>Tổng cộng</span>
            <strong>{money(total)}</strong>
          </div>
          <Notice error={failure} />
          <button
            className="btn primary full"
            disabled={busy || !isAuthVerified || e.sales_paused}
            onClick={() => void buy()}
          >
            {busy ? "Đang giữ chỗ…" : "Đặt vé ngay"} <ArrowUpRight size={17} />
          </button>
          <small className="muted">
            Vé được giữ trong 15 phút. QR được cấp sau khi thanh toán được xác
            nhận.
          </small>
        </aside>
      </div>
    </>
  );
}
