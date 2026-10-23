import { useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { ActionForm } from "@/components/ticketing/action-form";
import { StatCards } from "@/components/ticketing/stat-cards";
import { Empty, Field, Loading, Notice, PageHead, Pager, Status } from "@/components/ticketing/shared";
import api from "@/lib/api";
import { iso } from "@/features/ticketing/dates";
import { useLoad, message, money, when } from "@/features/ticketing/data";
import type { Account, Application, Category, Event, Payment, Stats } from "@/features/ticketing/types";

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
