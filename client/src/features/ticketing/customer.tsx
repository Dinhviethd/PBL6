import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  ArrowUpRight,
  Ticket as TicketIcon,
} from "lucide-react";
import api from "../../lib/api";
import authService from "../auth/services/authService";
import { useAuth } from "../auth/stores/authStore";
import {
  Notice,
  Loading,
  Empty,
  PageHead,
  Field,
  Status,
  Pager,
  ImageField,
} from "./shared";
import { useLoad, message, money, when, values } from "./data";
import type {
  Category,
  Event,
  Order,
  Ticket,
  TicketDetail,
  Application,
  Payment,
} from "./types";

export function ActionForm({
  onSubmit,
  children,
  label = "Lưu",
  className = "form",
  showSuccess = true,
}: {
  onSubmit: (d: Record<string, string>) => Promise<unknown>;
  children: ReactNode;
  label?: string;
  className?: string;
  showSuccess?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = values(e);
    setBusy(true);
    setError("");
    setDone(false);
    try {
      await onSubmit(d);
      setDone(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={className} onSubmit={submit}>
      {children}
      <Notice error={error}>
        {done && showSuccess ? "Đã lưu thành công." : null}
      </Notice>
      <button className="btn primary" disabled={busy}>
        {busy ? "Đang xử lý…" : label}
      </button>
    </form>
  );
}
export function Explore() {
  const [filter, setFilter] = useState(""),
    [page, setPage] = useState(0),
    { data, error, loading } = useLoad<{ items: Event[]; total: number }>(
      `/events?page=${page}&${filter}`,
    ),
    categories = useLoad<Category[]>("/categories");
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = values(e),
      params = new URLSearchParams();
    for (const [k, v] of Object.entries(d))
      if (v)
        params.set(
          k,
          k === "from" || k === "to" ? new Date(v).toISOString() : v,
        );
    setPage(0);
    setFilter(params.toString());
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> TRẢI NGHIỆM BẮT ĐẦU TỪ ĐÂY
          </span>
          <h1>
            Ra ngoài.
            <br />
            Gặp điều <em>mới.</em>
          </h1>
          <p>
            Âm nhạc, ý tưởng và những cuộc gặp đáng nhớ.
            <br />
            Tìm sự kiện tiếp theo dành cho bạn.
          </p>
          <a className="btn dark" href="#discover">
            Khám phá sự kiện <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-ticket">
            <span>YOUR NEXT MEMORY</span>
            <strong>
              MAKE
              <br />
              IT LIVE.
            </strong>
            <div className="ticket-bottom">
              <span>
                ONE MOMENT
                <br />
                ENDLESS POSSIBILITIES
              </span>
              <TicketIcon size={42} />
            </div>
          </div>
          <span className="art-tag">Gặp gỡ. Khám phá. Kết nối.</span>
        </div>
      </section>
      <section id="discover">
        <PageHead eyebrow="LỊCH HẸN CỦA BẠN" title="Đi đâu tiếp theo?">
          Một chiếc vé, một trải nghiệm mới.
        </PageHead>
        <form className="filters" onSubmit={search}>
          <Field
            label="Tìm sự kiện"
            name="q"
            placeholder="Tên sự kiện, điều bạn quan tâm…"
            required={false}
          />
          <Field
            label="Danh mục"
            name="category"
            required={false}
            options={[
              { value: "", label: "Tất cả danh mục" },
              ...(categories.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
          />
          <Field
            label="Thành phố"
            name="city"
            placeholder="Đà Nẵng"
            required={false}
          />
          <button className="btn primary">Tìm kiếm</button>
          <details>
            <summary>Bộ lọc nâng cao</summary>
            <div className="form-grid">
              <Field label="Từ ngày" name="from" type="date" required={false} />
              <Field label="Đến ngày" name="to" type="date" required={false} />
              <Field
                label="Giá từ (đ)"
                name="minPrice"
                type="number"
                required={false}
              />
              <Field
                label="Giá đến (đ)"
                name="maxPrice"
                type="number"
                required={false}
              />
            </div>
          </details>
        </form>
        <Notice error={error} />
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="event-grid">
            {data.items.map((e, i) => (
              <Link key={e.id} to={`/events/${e.slug}`} className="event-card">
                <div
                  className={`event-art art-${i % 3}`}
                  style={
                    e.cover_image_url
                      ? {
                          backgroundImage: `url(${e.cover_image_url})`,
                          backgroundSize: "cover",
                        }
                      : undefined
                  }
                >
                  {!e.cover_image_url && (
                    <>
                      <span className="art-circle" />
                      <span className="art-word">
                        {i % 3 === 0
                          ? "LIVE."
                          : i % 3 === 1
                            ? "CONNECT."
                            : "CREATE."}
                      </span>
                    </>
                  )}
                  <span className="date-chip">
                    {new Date(e.starts_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
                <div className="event-body">
                  <span className="tiny">
                    <MapPin size={13} />
                    {e.city_code}
                  </span>
                  <h3>{e.title}</h3>
                  <p>
                    <CalendarDays size={14} />
                    {when(e.starts_at)}
                  </p>
                  <div className="card-bottom">
                    <strong>{money(e.priceFrom)}</strong>
                    <span className="circle-arrow">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>Chưa có sự kiện phù hợp. Thử thay đổi bộ lọc.</Empty>
        )}
        <Pager
          page={page}
          setPage={setPage}
          hasNext={(page + 1) * 24 < (data?.total ?? 0)}
        />
      </section>
    </>
  );
}
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
      <Link className="back" to="/">
        ← Tất cả sự kiện
      </Link>
      <div className="detail-grid">
        <section>
          <div
            className="detail-art art-0"
            style={
              e.cover_image_url
                ? {
                    backgroundImage: `url(${e.cover_image_url})`,
                    backgroundSize: "cover",
                  }
                : undefined
            }
          >
            <span>{e.city_code.toUpperCase()}</span>
            <strong>{e.title}</strong>
            <TicketIcon size={54} />
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
                Date.now() < Date.parse(t.sale_ends_at);
            return (
              <div className="ticket-option" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <p>{money(t.price_amount)}</p>
                  <small>
                    {available ? `Còn ${left} vé` : "Chưa mở bán / hết vé"}
                  </small>
                </div>
                <label>
                  <span className="sr-only">Số lượng {t.name}</span>
                  <select
                    disabled={!available}
                    value={quantities[t.id] ?? 0}
                    onChange={(v) => {
                      key.current = crypto.randomUUID();
                      setQuantities({
                        ...quantities,
                        [t.id]: Number(v.target.value),
                      });
                    }}
                  >
                    {Array.from({ length: Math.min(10, left) + 1 }, (_, n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
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
export function AuthPage({
  register = false,
  reset = false,
}: {
  register?: boolean;
  reset?: boolean;
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    [sent, setSent] = useState(false);
  return (
    <div className="auth-wrap">
      <div className="auth-intro">
        <span className="eyebrow">EVENTHUB</span>
        <h1>
          Mỗi cuộc gặp
          <br />
          mở ra một
          <br />
          <em>điều mới.</em>
        </h1>
        <p>
          Một tài khoản để khám phá, đặt vé và lưu giữ những trải nghiệm của
          bạn.
        </p>
      </div>
      <section className="panel auth-panel">
        <h2>
          {reset
            ? "Đặt lại mật khẩu"
            : register
              ? "Tạo tài khoản"
              : "Chào mừng trở lại"}
        </h2>
        <p className="muted">
          {reset
            ? "Mã xác nhận sẽ được gửi đến email của bạn."
            : "Bắt đầu hành trình trải nghiệm của bạn."}
        </p>
        <ActionForm
          key={`${register}-${reset}-${sent}`}
          label={
            reset
              ? sent
                ? "Đổi mật khẩu"
                : "Gửi mã xác nhận"
              : register
                ? "Đăng ký"
                : "Đăng nhập"
          }
          onSubmit={async (d) => {
            if (reset) {
              if (!sent) {
                await authService.forgotPassword({ email: d.email });
                setSent(true);
              } else {
                await authService.resetPassword({
                  email: d.email,
                  otp: d.otp,
                  newPassword: d.password,
                  confirmPassword: d.confirmPassword,
                });
                navigate("/auth/login");
              }
              return;
            }
            if (register)
              await authService.register({
                name: d.name,
                email: d.email,
                password: d.password,
                confirmPassword: d.confirmPassword,
              });
            else
              await authService.login({ email: d.email, password: d.password });
            const from = location.state?.from;
            navigate(
              typeof from === "string" &&
                from.startsWith("/") &&
                !from.startsWith("//")
                ? from
                : "/",
            );
          }}
        >
          {register && <Field label="Họ và tên" name="name" />}
          <Field label="Email" name="email" type="email" />
          {(!reset || sent) && (
            <Field
              label="Mật khẩu (ít nhất 8 ký tự)"
              name="password"
              type="password"
            />
          )}
          {(register || sent) && (
            <Field
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              type="password"
            />
          )}
          {sent && <Field label="Mã xác nhận 6 số" name="otp" />}
        </ActionForm>
        <div className="auth-links">
          <Link to={register ? "/auth/login" : "/auth/register"}>
            {register
              ? "Đã có tài khoản? Đăng nhập"
              : "Chưa có tài khoản? Đăng ký"}
          </Link>
          <Link to="/auth/reset-password">Quên mật khẩu?</Link>
        </div>
      </section>
    </div>
  );
}
export function Checkout() {
  const { id } = useParams(),
    resource = useLoad<Order>(`/me/orders/${id}`),
    o = resource.data,
    [payment, setPayment] = useState<Payment | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const config = useLoad<{ paymentMode: string }>("/config");
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
  if (resource.loading) return <Loading />;
  if (!o) return <Notice error={resource.error} />;
  const remaining = Math.max(
    0,
    Math.floor((Date.parse(o.expires_at) - now) / 1000),
  );
  return (
    <>
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
              ) : (
                <Notice>
                  Chưa cấu hình cổng thanh toán. Bạn có thể xem đơn và hủy giữ
                  chỗ.
                </Notice>
              )}
              {payment || o.payment ? (
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
export function MyOrders() {
  const [page, setPage] = useState(0),
    [filter, setFilter] = useState(""),
    r = useLoad<Order[]>(`/me/orders?page=${page}&${filter}`);
  return (
    <>
      <PageHead eyebrow="TÀI KHOẢN" title="Lịch sử đặt vé" />
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const d = values(e),
            p = new URLSearchParams();
          for (const [k, v] of Object.entries(d))
            if (v)
              p.set(
                k,
                k === "from" || k === "to" ? new Date(v).toISOString() : v,
              );
          setFilter(p.toString());
          setPage(0);
        }}
      >
        <Field label="Mã đơn / tên" name="q" required={false} />
        <Field label="Từ ngày" name="from" type="date" required={false} />
        <Field label="Đến ngày" name="to" type="date" required={false} />
        <button className="btn primary">Lọc</button>
      </form>
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Sự kiện</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/checkout/${o.id}`}>{o.order_code}</Link>
                  </td>
                  <td>{o.event_title_snapshot}</td>
                  <td>{when(o.created_at)}</td>
                  <td>{money(o.total_amount)}</td>
                  <td>
                    <Status value={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Bạn chưa có đơn đặt vé nào.</Empty>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
export function MyTickets() {
  const [page, setPage] = useState(0),
    r = useLoad<Ticket[]>(`/me/tickets?page=${page}`);
  return (
    <>
      <PageHead eyebrow="SẴN SÀNG CHO TRẢI NGHIỆM MỚI" title="Vé của tôi" />
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.length ? (
        <div className="event-grid">
          {r.data.map((t) => (
            <Link
              className="panel wallet-card"
              to={`/tickets/${t.id}`}
              key={t.id}
            >
              <TicketIcon size={30} />
              <Status value={t.status} />
              <h3>{t.event_title_snapshot}</h3>
              <p>{t.ticket_type_name_snapshot}</p>
              <span className="mono">{t.ticket_code}</span>
              <strong>Xem mã QR →</strong>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>Vé đã thanh toán sẽ xuất hiện tại đây.</Empty>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
export function TicketPage() {
  const { id } = useParams(),
    r = useLoad<TicketDetail>(`/me/tickets/${id}`);
  if (r.loading) return <Loading />;
  if (!r.data) return <Notice error={r.error} />;
  const t = r.data;
  return (
    <>
      <PageHead eyebrow="VÉ ĐIỆN TỬ" title={t.eventTitle} />
      <div className="panel qr-card">
        <Status value={t.status} />
        <h2>{t.typeName}</h2>
        <img src={t.qrImage} width={320} height={320} alt="Mã QR của vé" />
        <strong className="mono">{t.code}</strong>
        <p>Xuất trình mã này tại cửa vào. Mỗi vé chỉ check-in một lần.</p>
        <Link to="/tickets">← Ví vé của bạn</Link>
      </div>
    </>
  );
}
export function Profile() {
  const user = useAuth((s) => s.user),
    r = useLoad<Application[]>("/me/organizer-applications");
  return (
    <>
      <PageHead eyebrow="TÀI KHOẢN" title="Thông tin của bạn" />
      <div className="two-cols">
        <section className="panel">
          <h2>Hồ sơ cá nhân</h2>
          <ActionForm
            onSubmit={async (d) => {
              await api.patch("/me", {
                ...d,
                avatarUrl: d.avatarUrl || undefined,
              });
              await authService.getCurrentUser();
            }}
          >
            <Field label="Họ tên" name="name" value={user?.name} />
            <Field
              label="Số điện thoại"
              name="phone"
              value={user?.phone}
              required={false}
            />
            <ImageField
              label="Ảnh đại diện"
              name="avatarUrl"
              value={user?.avatarUrl}
            />
          </ActionForm>
          <h2 className="section-gap">Đổi mật khẩu</h2>
          <ActionForm
            label="Đổi mật khẩu và đăng xuất"
            onSubmit={async (d) => {
              await api.post("/me/password", d);
              useAuth.getState().clearAuth();
            }}
          >
            <Field
              label="Mật khẩu hiện tại"
              name="currentPassword"
              type="password"
            />
            <Field label="Mật khẩu mới" name="newPassword" type="password" />
          </ActionForm>
        </section>
        <section className="panel">
          <h2>Trở thành Organizer</h2>
          <p className="muted">
            Chia sẻ ý tưởng của bạn và tạo nên những cuộc gặp ý nghĩa.
          </p>
          {r.data?.map((a) => (
            <div className="application" key={a.id}>
              <strong>{a.organization_name}</strong>
              <Status value={a.status} />
              {a.rejection_reason && <p>{a.rejection_reason}</p>}
            </div>
          ))}
          {!user?.roles.includes("ORGANIZER") &&
            !r.data?.some((a) => a.status === "PENDING") && (
              <ActionForm
                label="Gửi yêu cầu"
                onSubmit={async (d) => {
                  await api.post("/me/organizer-applications", d);
                  r.reload();
                }}
              >
                <Field label="Tên tổ chức" name="organizationName" />
                <Field
                  label="Người liên hệ"
                  name="contactName"
                  value={user?.name}
                />
                <Field
                  label="Email liên hệ"
                  name="contactEmail"
                  type="email"
                  value={user?.email}
                />
                <Field label="Số điện thoại" name="contactPhone" />
                <Field
                  label="Giới thiệu tổ chức"
                  name="description"
                  type="textarea"
                />
              </ActionForm>
            )}
          {user?.roles.includes("ORGANIZER") && (
            <Link className="btn primary" to="/organizer">
              Đến trang quản lý sự kiện →
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
