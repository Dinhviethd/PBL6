import { useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { Scanner } from "./scanner";
import { StaffManagement, CheckinHistory } from "./staff";
import { Plus, ArrowUpRight } from "lucide-react";
import api from "../../lib/api";
import { ActionForm } from "./customer";
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
import { useLoad, message, money, when } from "./data";
import type {
  Event,
  Category,
  Order,
  Ticket,
  Stats,
  Application,
  Account,
  Payment,
} from "./types";
const local = (s?: string) => {
  const d = s ? new Date(s) : new Date(Date.now() + 86400000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const iso = (s: string) => new Date(s).toISOString();
function statLabel(k: string) {
  return (
    (
      {
        revenue: "Doanh thu vé",
        sold: "Vé đã bán",
        checkins: "Đã check-in",
        orders: "Đơn thanh toán",
        users: "Người dùng",
        organizers: "Organizer",
        events: "Sự kiện",
        provider_received: "Tiền ghi nhận",
        needs_review: "Cần đối soát",
      } as Record<string, string>
    )[k] ?? k
  );
}
export function StatCards({ data }: { data: Stats }) {
  return (
    <div className="stats-grid">
      {Object.entries(data).map(([k, v]) => (
        <div className="stat-card" key={k}>
          <span>{statLabel(k)}</span>
          <strong>
            {k === "revenue" || k === "provider_received" ? money(v) : v}
          </strong>
        </div>
      ))}
    </div>
  );
}
export function Organizer() {
  const [page, setPage] = useState(0),
    r = useLoad<Event[]>(`/organizer/events?page=${page}`);
  return (
    <>
      <PageHead
        eyebrow="KHÔNG GIAN ORGANIZER"
        title="Sự kiện của bạn"
        actions={
          <Link className="btn primary" to="/organizer/new">
            <Plus size={17} />
            Tạo sự kiện
          </Link>
        }
      >
        Từ một ý tưởng đến những trải nghiệm đáng nhớ.
      </PageHead>
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.length ? (
        <div className="management-list">
          {r.data.map((e) => (
            <div className="panel management-row" key={e.id}>
              <div className="event-icon">
                {new Date(e.starts_at).getDate()}
                <small>THÁNG {new Date(e.starts_at).getMonth() + 1}</small>
              </div>
              <div className="grow">
                <Status value={e.status} />
                <h3>{e.title}</h3>
                <p>
                  {e.venue_name} · {when(e.starts_at)}
                </p>
              </div>
              <Link className="btn ghost" to={`/organizer/events/${e.id}`}>
                Chỉnh sửa
              </Link>
              <Link className="btn dark" to={`/organizer/events/${e.id}/stats`}>
                Quản lý <ArrowUpRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Bắt đầu bằng việc tạo sự kiện đầu tiên.</Empty>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
export function EditorPage() {
  const { id } = useParams();
  return id ? <ExistingEditor id={id} /> : <EditorForm />;
}
function ExistingEditor({ id }: { id: string }) {
  const r = useLoad<Event>(`/organizer/events/${id}`);
  if (r.loading) return <Loading />;
  if (!r.data) return <Notice error={r.error} />;
  return <EditorForm event={r.data} reload={r.reload} />;
}
function EditorForm({
  event: e,
  reload = () => {},
}: {
  event?: Event;
  reload?: () => void;
}) {
  const categories = useLoad<Category[]>("/categories"),
    navigate = useNavigate(),
    [error, setError] = useState("");
  const command = async (path: string, body = {}) => {
    try {
      setError("");
      await api.post(`/organizer/events/${e?.id}/${path}`, body);
      reload();
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <>
      <Link className="back" to="/organizer">
        ← Sự kiện của bạn
      </Link>
      <PageHead
        eyebrow="THIẾT KẾ TRẢI NGHIỆM"
        title={e ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
        actions={e ? <Status value={e.status} /> : undefined}
      />
      <Notice error={error} />
      <div className="editor-grid">
        <section className="panel">
          <h2>Thông tin sự kiện</h2>
          <ActionForm
            label="Lưu bản nháp"
            onSubmit={async (d) => {
              const payload = {
                ...d,
                coverImageUrl: d.coverImageUrl || undefined,
                startsAt: iso(d.startsAt),
                endsAt: iso(d.endsAt),
                checkinOpensAt: iso(d.checkinOpensAt),
                checkinClosesAt: iso(d.checkinClosesAt),
              };
              const result = e
                ? await api.patch(`/organizer/events/${e.id}`, payload)
                : await api.post("/organizer/events", payload);
              if (!e) navigate(`/organizer/events/${result.data.data.id}`);
              else reload();
            }}
          >
            <Field label="Tên sự kiện" name="title" value={e?.title} />
            <div className="form-grid">
              <Field
                label="Đường dẫn (chữ thường, dấu gạch ngang)"
                name="slug"
                value={e?.slug}
              />
              <Field
                label="Danh mục"
                name="categoryId"
                value={e?.category_id}
                options={[
                  { value: "", label: "Chọn danh mục" },
                  ...(categories.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            </div>
            <Field
              label="Giới thiệu sự kiện"
              name="description"
              type="textarea"
              value={e?.description}
            />
            <ImageField
              label="Ảnh bìa"
              name="coverImageUrl"
              value={e?.cover_image_url}
            />
            <div className="form-grid">
              <Field label="Địa điểm" name="venueName" value={e?.venue_name} />
              <Field label="Thành phố" name="cityCode" value={e?.city_code} />
            </div>
            <Field label="Địa chỉ" name="address" value={e?.address} />
            <div className="form-grid">
              <Field
                label="Bắt đầu"
                name="startsAt"
                type="datetime-local"
                value={local(e?.starts_at)}
              />
              <Field
                label="Kết thúc"
                name="endsAt"
                type="datetime-local"
                value={local(e?.ends_at)}
              />
              <Field
                label="Mở check-in"
                name="checkinOpensAt"
                type="datetime-local"
                value={local(e?.checkin_opens_at)}
              />
              <Field
                label="Đóng check-in"
                name="checkinClosesAt"
                type="datetime-local"
                value={local(e?.checkin_closes_at)}
              />
            </div>
          </ActionForm>
        </section>
        <aside>
          <section className="panel">
            <h2>Trạng thái & xét duyệt</h2>
            {e ? (
              <>
                <Status value={e.status} />
                <p className="muted">
                  Hoàn tất thông tin và loại vé trước khi gửi duyệt.
                </p>
                {["DRAFT", "REJECTED"].includes(e.status) && (
                  <button
                    className="btn primary full"
                    onClick={() => void command("submit")}
                  >
                    Gửi Admin phê duyệt
                  </button>
                )}
                {e.status === "PUBLISHED" && (
                  <>
                    <Link className="btn ghost full" to={`/events/${e.slug}`}>
                      Xem trang công khai
                    </Link>
                    <button
                      className="btn ghost full"
                      onClick={() =>
                        void command("pause", { paused: !e.sales_paused })
                      }
                    >
                      {e.sales_paused ? "Mở bán trở lại" : "Tạm ngừng bán"}
                    </button>
                  </>
                )}
                {e.reviews?.map((r, n) => (
                  <div className="notice" key={n}>
                    <Status value={r.decision} />
                    <p>{r.reason || "Sự kiện đã được duyệt."}</p>
                  </div>
                ))}
                {!["CANCELLED", "ARCHIVED"].includes(e.status) && (
                  <details>
                    <summary>Hủy sự kiện</summary>
                    <ActionForm
                      label="Hủy sự kiện chưa bán vé"
                      onSubmit={async (d) => {
                        await api.post(`/organizer/events/${e.id}/cancel`, d);
                        reload();
                      }}
                    >
                      <Field label="Lý do" name="reason" />
                    </ActionForm>
                  </details>
                )}
              </>
            ) : (
              <p>Lưu thông tin trước, sau đó thêm loại vé.</p>
            )}
          </section>
          {e && (
            <section className="panel section-gap">
              <h2>Loại vé</h2>
              {e.ticketTypes?.map((t) => (
                <div className="ticket-option" key={t.id}>
                  <div>
                    <strong>{t.name}</strong>
                    <p>
                      {money(t.price_amount)} · {t.capacity} chỗ
                    </p>
                    <small>
                      Đã bán {t.sold_quantity} · Đang giữ {t.reserved_quantity}
                    </small>
                  </div>
                  {["DRAFT", "REJECTED"].includes(e.status) &&
                    !t.archived_at && (
                      <div>
                        <details>
                          <summary>Chỉnh sửa</summary>
                          <ActionForm
                            label="Lưu loại vé"
                            onSubmit={async (d) => {
                              await api.patch(
                                `/organizer/events/${e.id}/ticket-types/${t.id}`,
                                {
                                  ...d,
                                  capacity: Number(d.capacity),
                                  saleStartsAt: iso(d.saleStartsAt),
                                  saleEndsAt: iso(d.saleEndsAt),
                                },
                              );
                              reload();
                            }}
                          >
                            <Field
                              label="Tên loại vé"
                              name="name"
                              value={t.name}
                            />
                            <Field
                              label="Giá (đ)"
                              name="price"
                              type="number"
                              value={t.price_amount}
                            />
                            <Field
                              label="Sức chứa"
                              name="capacity"
                              type="number"
                              value={t.capacity}
                            />
                            <Field
                              label="Mở bán"
                              name="saleStartsAt"
                              type="datetime-local"
                              value={local(t.sale_starts_at)}
                            />
                            <Field
                              label="Kết thúc bán"
                              name="saleEndsAt"
                              type="datetime-local"
                              value={local(t.sale_ends_at)}
                            />
                          </ActionForm>
                        </details>
                        <button
                          className="btn ghost"
                          onClick={async () => {
                            try {
                              await api.delete(
                                `/organizer/events/${e.id}/ticket-types/${t.id}`,
                              );
                              reload();
                            } catch (e) {
                              setError(message(e));
                            }
                          }}
                        >
                          Ngừng dùng
                        </button>
                      </div>
                    )}
                </div>
              ))}
              {["DRAFT", "REJECTED"].includes(e.status) && (
                <ActionForm
                  label="Thêm loại vé"
                  onSubmit={async (d) => {
                    await api.post(`/organizer/events/${e.id}/ticket-types`, {
                      ...d,
                      capacity: Number(d.capacity),
                      saleStartsAt: iso(d.saleStartsAt),
                      saleEndsAt: iso(d.saleEndsAt),
                    });
                    reload();
                  }}
                >
                  <Field label="Tên loại vé" name="name" />
                  <div className="form-grid">
                    <Field label="Giá vé (đ)" name="price" type="number" />
                    <Field label="Số lượng" name="capacity" type="number" />
                  </div>
                  <Field
                    label="Mở bán"
                    name="saleStartsAt"
                    type="datetime-local"
                    value={local(new Date().toISOString())}
                  />
                  <Field
                    label="Kết thúc bán"
                    name="saleEndsAt"
                    type="datetime-local"
                    value={local(e.starts_at)}
                  />
                </ActionForm>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
export function Operations() {
  const { id, tab = "stats" } = useParams(),
    event = useLoad<Event>(`/organizer/events/${id}`);
  return (
    <>
      <Link className="back" to="/organizer">
        ← Sự kiện của bạn
      </Link>
      <PageHead
        eyebrow="VẬN HÀNH SỰ KIỆN"
        title={event.data?.title ?? "Quản lý sự kiện"}
      />
      <nav className="tabs">
        {[
          ["stats", "Tổng quan"],
          ["orders", "Đơn hàng"],
          ["attendees", "Người tham dự"],
          ["checkin", "Quét QR"],
          ["staff", "Nhân viên"],
          ["checkins", "Nhật ký check-in"],
        ].map(([key, label]) => (
          <NavLink key={key} to={`/organizer/events/${id}/${key}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Notice error={event.error} />
      {tab === "checkin" ? (
        <Scanner key={id} eventId={id!} />
      ) : tab === "staff" ? (
        <StaffManagement key={id} eventId={id!} />
      ) : tab === "checkins" ? (
        <CheckinHistory key={id} eventId={id!} />
      ) : (
        <OperationData key={tab} eventId={id!} tab={tab} />
      )}
    </>
  );
}
function OperationData({ eventId, tab }: { eventId: string; tab: string }) {
  const [page, setPage] = useState(0),
    [q, setQ] = useState(""),
    r = useLoad<Stats | Order[] | Ticket[]>(
      `/organizer/events/${eventId}/${tab}?page=${page}&q=${encodeURIComponent(q)}`,
    );
  if (r.loading && !r.data) return <Loading />;
  return (
    <>
      <Notice error={r.error} />
      {tab === "stats" ? (
        r.data && <StatCards data={r.data as Stats} />
      ) : (
        <>
          <label className="field search-inline">
            <span>Tìm kiếm</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Mã vé, mã đơn hoặc tên"
            />
          </label>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tab === "orders" ? "Đơn hàng" : "Vé"}</th>
                  <th>Người mua</th>
                  <th>{tab === "orders" ? "Tổng tiền" : "Loại vé"}</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {((r.data as (Order & Ticket)[]) ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      {tab === "orders" ? (
                        <Link to={`/checkout/${row.id}`}>{row.order_code}</Link>
                      ) : (
                        row.ticket_code
                      )}
                    </td>
                    <td>{row.buyer_name_snapshot}</td>
                    <td>
                      {tab === "orders"
                        ? money(row.total_amount)
                        : row.ticket_type_name_snapshot}
                    </td>
                    <td>
                      <Status value={row.status} />
                      {row.checked_in_at && (
                        <small>{when(row.checked_in_at)}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            setPage={setPage}
            hasNext={Array.isArray(r.data) && r.data.length === 50}
          />
        </>
      )}
    </>
  );
}
export function Admin() {
  const { tab = "stats" } = useParams();
  return (
    <>
      <PageHead eyebrow="QUẢN TRỊ HỆ THỐNG" title="Trung tâm quản trị" />
      <nav className="tabs">
        {[
          ["stats", "Tổng quan"],
          ["applications", "Organizer"],
          ["events", "Sự kiện"],
          ["categories", "Danh mục"],
          ["users", "Tài khoản"],
          ["payments", "Giao dịch"],
        ].map(([key, label]) => (
          <NavLink key={key} to={`/admin/${key}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <AdminData key={tab} tab={tab} />
    </>
  );
}
function AdminData({ tab }: { tab: string }) {
  const endpoint = tab === "applications" ? "organizer-applications" : tab,
    [page, setPage] = useState(0),
    [filter, setFilter] = useState(""),
    url =
      tab === "categories"
        ? "/categories"
        : `/admin/${endpoint}?page=${page}&${filter}`,
    r = useLoad<
      Stats | Application[] | Event[] | Category[] | Account[] | Payment[]
    >(url),
    [error, setError] = useState("");
  const act = async (path: string, body: unknown) => {
    await api.post(path, body);
    r.reload();
  };
  if (r.loading) return <Loading />;
  return (
    <>
      <Notice error={r.error || error} />
      {tab === "stats" ? (
        r.data && <StatCards data={r.data as Stats} />
      ) : (
        <>
          {["users", "payments"].includes(tab) && (
            <form
              className="filters"
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget),
                  p = new URLSearchParams();
                for (const [k, v] of d)
                  if (String(v))
                    p.set(
                      k,
                      k === "from" || k === "to" ? iso(String(v)) : String(v),
                    );
                setFilter(p.toString());
                setPage(0);
              }}
            >
              <Field label="Tìm kiếm" name="q" required={false} />
              {tab === "payments" && (
                <>
                  <Field
                    label="Trạng thái"
                    name="status"
                    required={false}
                    options={[
                      "",
                      "PENDING",
                      "SUCCEEDED",
                      "FAILED",
                      "UNKNOWN",
                    ].map((v) => ({ value: v, label: v || "Tất cả" }))}
                  />
                  <Field
                    label="Từ ngày"
                    name="from"
                    type="date"
                    required={false}
                  />
                  <Field
                    label="Đến ngày"
                    name="to"
                    type="date"
                    required={false}
                  />
                </>
              )}
              <button className="btn primary">Lọc</button>
            </form>
          )}
          {tab === "applications" &&
            ((r.data as Application[]) ?? []).map((a) => (
              <section className="panel review-card" key={a.id}>
                <div className="split">
                  <h2>{a.organization_name}</h2>
                  <Status value={a.status} />
                </div>
                <p>
                  {a.contact_name} · {a.contact_email} · {a.contact_phone}
                </p>
                <p>{a.description}</p>
                {a.status === "PENDING" && (
                  <ActionForm
                    label="Lưu quyết định"
                    onSubmit={(d) =>
                      act(`/admin/organizer-applications/${a.id}/review`, {
                        approve: d.decision === "approve",
                        reason: d.reason,
                      })
                    }
                  >
                    <Field
                      label="Quyết định"
                      name="decision"
                      options={[
                        { value: "approve", label: "Phê duyệt" },
                        { value: "reject", label: "Từ chối" },
                      ]}
                    />
                    <Field
                      label="Lý do (bắt buộc khi từ chối)"
                      name="reason"
                      required={false}
                    />
                  </ActionForm>
                )}
              </section>
            ))}
          {tab === "events" &&
            ((r.data as Event[]) ?? []).map((e) => (
              <section className="panel review-card" key={e.id}>
                <div className="split">
                  <h2>{e.title}</h2>
                  <Status value={e.status} />
                </div>
                <p>
                  {when(e.starts_at)} · {e.venue_name}
                </p>
                <Link to={`/organizer/events/${e.id}`}>
                  Xem chi tiết / chỉnh sửa →
                </Link>
                {e.status === "PENDING_REVIEW" && (
                  <ActionForm
                    label="Lưu quyết định"
                    onSubmit={(d) =>
                      act(`/admin/events/${e.id}/review`, {
                        approve: d.decision === "approve",
                        reason: d.reason,
                      })
                    }
                  >
                    <Field
                      label="Quyết định"
                      name="decision"
                      options={[
                        { value: "approve", label: "Phê duyệt" },
                        { value: "reject", label: "Từ chối" },
                      ]}
                    />
                    <Field
                      label="Lý do (bắt buộc khi từ chối)"
                      name="reason"
                      required={false}
                    />
                  </ActionForm>
                )}
              </section>
            ))}
          {tab === "categories" && (
            <div className="two-cols">
              <section className="panel">
                <h2>Danh mục sự kiện</h2>
                {((r.data as Category[]) ?? []).map((c) => (
                  <div key={c.id} className="line-item">
                    <span>
                      {c.name}
                      <small> /{c.slug}</small>
                    </span>
                    <details>
                      <summary>Sửa</summary>
                      <ActionForm
                        label="Lưu danh mục"
                        onSubmit={async (d) => {
                          await api.patch(`/admin/categories/${c.id}`, d);
                          r.reload();
                        }}
                      >
                        <Field
                          label="Tên danh mục"
                          name="name"
                          value={c.name}
                        />
                        <Field label="Slug" name="slug" value={c.slug} />
                      </ActionForm>
                    </details>
                    <button
                      className="btn ghost"
                      onClick={async () => {
                        try {
                          await api.delete(`/admin/categories/${c.id}`);
                          r.reload();
                        } catch (e) {
                          setError(message(e));
                        }
                      }}
                    >
                      Ẩn danh mục
                    </button>
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>Thêm danh mục</h2>
                <ActionForm
                  label="Thêm danh mục"
                  onSubmit={(d) => act("/admin/categories", d)}
                >
                  <Field label="Tên danh mục" name="name" />
                  <Field label="Slug" name="slug" />
                </ActionForm>
              </section>
            </div>
          )}
          {tab === "users" &&
            ((r.data as Account[]) ?? []).map((u) => (
              <section className="panel review-card" key={u.idUser}>
                <div className="split">
                  <div>
                    <h3>{u.name}</h3>
                    <p>{u.email}</p>
                  </div>
                  <Status value={u.locked_at ? "LOCKED" : u.status} />
                </div>
                <ActionForm
                  label="Cập nhật tài khoản"
                  onSubmit={async (d) => {
                    await api.patch(`/admin/users/${u.idUser}`, {
                      status: d.status,
                      locked: d.locked === "true",
                      reason: d.reason,
                    });
                    r.reload();
                  }}
                >
                  <div className="form-grid">
                    <Field
                      label="Trạng thái"
                      name="status"
                      value={u.status}
                      options={[
                        { value: "ACTIVE", label: "Hoạt động" },
                        { value: "INACTIVE", label: "Ngừng hoạt động" },
                      ]}
                    />
                    <Field
                      label="Quyền đăng nhập"
                      name="locked"
                      value={u.locked_at ? "true" : "false"}
                      options={[
                        { value: "false", label: "Mở khóa" },
                        { value: "true", label: "Khóa tài khoản" },
                      ]}
                    />
                  </div>
                  <Field label="Lý do cập nhật" name="reason" />
                </ActionForm>
              </section>
            ))}
          {tab === "payments" && (
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th>Đối soát</th>
                  </tr>
                </thead>
                <tbody>
                  {((r.data as Payment[]) ?? []).map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.merchant_reference}</td>
                      <td>{money(p.amount)}</td>
                      <td>
                        <Status value={p.status} />
                      </td>
                      <td>{when(p.created_at)}</td>
                      <td>{p.requires_review ? p.review_reason : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Array.isArray(r.data) && r.data.length === 0 && (
            <Empty>Chưa có dữ liệu trong mục này.</Empty>
          )}
          <Pager
            page={page}
            setPage={setPage}
            hasNext={Array.isArray(r.data) && r.data.length === 50}
          />
        </>
      )}
    </>
  );
}
