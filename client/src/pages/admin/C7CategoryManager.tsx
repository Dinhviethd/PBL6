import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Tags,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { AdminShell } from "./AdminShell";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  event_count: number;
};

type CategoryResult = {
  data: CategoryRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    archived: number;
    total_events: number;
  };
};

type StatusFilter = "" | "active" | "archived";

type Drawer = { mode: "create" } | { mode: "edit"; row: CategoryRow };

const slugPreview = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "danh-muc";

export function C7CategoryManager() {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CategoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [hideTarget, setHideTarget] = useState<CategoryRow | null>(null);
  const [hiding, setHiding] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      q: query,
    });
    if (status) value.set("archived", status === "archived" ? "true" : "false");
    return value.toString();
  }, [page, limit, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get<{ data: CategoryResult }>(`/admin/categories?${params}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;
        const next = response.data.data;
        setResult(next);
        if (next.pagination.totalPages > 0 && page >= next.pagination.totalPages)
          setPage(next.pagination.totalPages - 1);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params, page, refresh]);

  useEffect(() => {
    if (!drawer) return;
    const timer = window.setTimeout(() => nameRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [drawer]);

  useEffect(() => {
    if (!drawer && !hideTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawer(null);
      setHideTarget(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawer, hideTarget]);

  const rows = result?.data ?? [];
  const pagination = result?.pagination;
  const stats = result?.stats;

  const openCreate = () => {
    setName("");
    setDescription("");
    setDrawer({ mode: "create" });
  };

  const openEdit = (row: CategoryRow) => {
    setName(row.name);
    setDescription(row.description ?? "");
    setDrawer({ mode: "edit", row });
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drawer || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (drawer.mode === "create") {
        await api.post("/admin/categories", {
          name: name.trim(),
          description: description.trim(),
        });
        setNotice("Đã thêm danh mục mới.");
        if (status === "archived") setStatus("");
        setPage(0);
      } else {
        await api.patch(`/admin/categories/${drawer.row.id}`, {
          name: name.trim(),
          slug: drawer.row.slug,
          description: description.trim(),
        });
        setNotice("Đã cập nhật danh mục.");
      }
      setDrawer(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }

  async function hideCategory() {
    if (!hideTarget) return;
    setHiding(true);
    setError("");
    try {
      await api.delete(`/admin/categories/${hideTarget.id}`);
      setNotice(`Đã ẩn danh mục "${hideTarget.name}".`);
      setHideTarget(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setHiding(false);
    }
  }

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    {
      key: "",
      label: "Tất cả",
      count: stats ? stats.total + stats.archived : undefined,
    },
    { key: "active", label: "Đang hiển thị", count: stats?.total },
    { key: "archived", label: "Tạm ẩn", count: stats?.archived },
  ];

  return (
    <AdminShell title="Danh mục sự kiện">
      <div className="c7-page">
        <style>{styles}</style>
        <div className="c7-crumb">
          <span>QUẢN TRỊ</span>
          <span>/</span>
          <b>DANH MỤC SỰ KIỆN</b>
        </div>
        <header className="c7-hero">
          <div>
            <span className="c7-eyebrow">
              <Tags size={14} /> PHÂN HỆ C7 · DANH MỤC
            </span>
            <h1>Quản lý danh mục sự kiện</h1>
            <p>
              Tổ chức thể loại sự kiện, mô tả SEO và theo dõi số sự kiện trực
              thuộc.
            </p>
          </div>
          <button className="c7-btn primary" type="button" onClick={openCreate}>
            <Plus size={16} /> Thêm danh mục mới
          </button>
        </header>
        <section className="c7-kpis" aria-label="Tổng quan danh mục">
          <article className="c7-kpi purple">
            <span className="c7-kpi-icon">
              <Tags size={18} />
            </span>
            <span className="c7-kpi-label">Tổng danh mục chính</span>
            <strong>{stats?.total?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
          <article className="c7-kpi cyan">
            <span className="c7-kpi-icon">
              <CalendarDays size={18} />
            </span>
            <span className="c7-kpi-label">Tổng sự kiện liên kết</span>
            <strong>{stats?.total_events?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
        </section>
        <section className="c7-toolbar">
          <div className="c7-status-tabs" aria-label="Lọc trạng thái danh mục">
            {statusTabs.map((item) => (
              <button
                key={item.key || "all"}
                type="button"
                className={status === item.key ? "active" : ""}
                onClick={() => {
                  setStatus(item.key);
                  setPage(0);
                }}
              >
                {item.label}
                <span>{item.count?.toLocaleString("vi-VN") ?? "—"}</span>
              </button>
            ))}
          </div>
          <button
            className="c7-refresh"
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Làm mới
          </button>
        </section>
        <section className="c7-filters">
          <label className="c7-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo tên hoặc slug danh mục"
              aria-label="Tìm danh mục"
            />
          </label>
        </section>
        {error && (
          <div className="c7-alert" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Thử lại
            </button>
          </div>
        )}
        {notice && (
          <div className="c7-notice" role="status">
            {notice}
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <section className="c7-table-card">
          <div className="c7-table-head">
            <div>
              <h2>Danh sách danh mục</h2>
              <p>
                {pagination
                  ? `${pagination.total.toLocaleString("vi-VN")} danh mục phù hợp`
                  : "Đang tải dữ liệu"}
              </p>
            </div>
            <span className="c7-page-meta">
              {pagination && pagination.total
                ? `${page * limit + 1}–${Math.min(
                    (page + 1) * limit,
                    pagination.total,
                  )} / ${pagination.total.toLocaleString("vi-VN")}`
                : "0 danh mục"}
            </span>
          </div>
          <div className="c7-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>DANH MỤC</th>
                  <th>SLUG</th>
                  <th>SỰ KIỆN TRỰC THUỘC</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading && !result ? (
                  <tr>
                    <td colSpan={6} className="c7-state">
                      Đang tải danh mục…
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="c7-index">{page * limit + index + 1}</td>
                      <td>
                        <div className="c7-category">
                          <span className="c7-avatar">
                            <Tags size={16} />
                          </span>
                          <span>
                            <b>{row.name}</b>
                            <small>{row.description || "Chưa có mô tả SEO"}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className="c7-slug">/{row.slug}</code>
                      </td>
                      <td>
                        <span className="c7-count">
                          {row.event_count.toLocaleString("vi-VN")}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`c7-status ${
                            row.archived_at ? "archived" : "active"
                          }`}
                        >
                          {row.archived_at ? "Tạm ẩn" : "Đang hiển thị"}
                        </span>
                      </td>
                      <td>
                        <div className="c7-actions">
                          <button
                            className="c7-icon-button"
                            type="button"
                            aria-label={`Sửa ${row.name}`}
                            title="Sửa danh mục"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="c7-icon-button danger"
                            type="button"
                            aria-label={`Ẩn ${row.name}`}
                            title="Ẩn danh mục"
                            disabled={Boolean(row.archived_at)}
                            onClick={() => setHideTarget(row)}
                          >
                            <EyeOff size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !rows.length && (
                  <tr>
                    <td colSpan={6} className="c7-state">
                      {query || status
                        ? "Không tìm thấy danh mục phù hợp."
                        : "Chưa có danh mục."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="c7-pagination">
            <label>
              Số dòng{" "}
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(0);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>{" "}
              / trang
            </label>
            <div>
              <button
                type="button"
                aria-label="Trang trước"
                disabled={page <= 0 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                Trang <b>{pagination?.totalPages ? page + 1 : 0}</b> /{" "}
                {pagination?.totalPages ?? 0}
              </span>
              <button
                type="button"
                aria-label="Trang sau"
                disabled={
                  !pagination ||
                  page + 1 >= pagination.totalPages ||
                  loading
                }
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        </section>
        {drawer && (
          <div
            className="c7-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDrawer(null);
            }}
          >
            <section
              className="c7-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="c7-drawer-title"
            >
              <header className="c7-drawer-head">
                <div>
                  <span className="c7-eyebrow">
                    {drawer.mode === "create"
                      ? "DANH MỤC MỚI"
                      : "CHỈNH SỬA DANH MỤC"}
                  </span>
                  <h2 id="c7-drawer-title">
                    {drawer.mode === "create"
                      ? "Thêm danh mục mới"
                      : drawer.row.name}
                  </h2>
                  <p>Slug được tự sinh từ tên danh mục và không thể chỉnh sửa.</p>
                </div>
                <button
                  className="c7-close"
                  type="button"
                  onClick={() => setDrawer(null)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </header>
              <form className="c7-form" onSubmit={submit}>
                <label className="c7-field">
                  <span>
                    Tên danh mục <b>*</b>
                  </span>
                  <input
                    ref={nameRef}
                    value={name}
                    maxLength={100}
                    required
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ví dụ: Âm nhạc"
                  />
                </label>
                <label className="c7-field">
                  <span>Slug SEO</span>
                  <input
                    className="c7-readonly"
                    value={
                      drawer.mode === "create"
                        ? slugPreview(name)
                        : drawer.row.slug
                    }
                    readOnly
                    aria-readonly="true"
                  />
                  <small>
                    {drawer.mode === "create"
                      ? "Tự sinh khi lưu; nếu trùng sẽ thêm hậu tố -2, -3."
                      : "Giữ nguyên slug hiện tại khi đổi tên."}
                  </small>
                </label>
                <label className="c7-field">
                  <span>Mô tả ngắn SEO</span>
                  <textarea
                    value={description}
                    maxLength={500}
                    rows={4}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Mô tả ngắn gọn thể loại sự kiện…"
                  />
                  <small>{description.length}/500 ký tự</small>
                </label>
                <div className="c7-drawer-actions">
                  <button
                    className="c7-btn secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => setDrawer(null)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    className="c7-btn primary"
                    type="submit"
                    disabled={saving || !name.trim()}
                  >
                    {saving
                      ? "Đang lưu…"
                      : drawer.mode === "create"
                        ? "Thêm danh mục"
                        : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        {hideTarget && (
          <div className="c7-overlay center">
            <section
              className="c7-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="c7-hide-title"
            >
              <button
                className="c7-close"
                type="button"
                onClick={() => setHideTarget(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
              <span className="c7-eyebrow">XÁC NHẬN THAO TÁC</span>
              <h2 id="c7-hide-title">Ẩn danh mục “{hideTarget.name}”?</h2>
              <p>
                Danh mục sẽ không còn hiển thị trong danh sách đang hoạt động.
                Các sự kiện đã gán danh mục này vẫn được giữ nguyên.
              </p>
              <div className="c7-drawer-actions">
                <button
                  className="c7-btn secondary"
                  type="button"
                  disabled={hiding}
                  onClick={() => setHideTarget(null)}
                >
                  Hủy
                </button>
                <button
                  className="c7-btn danger"
                  type="button"
                  disabled={hiding}
                  onClick={() => void hideCategory()}
                >
                  {hiding ? "Đang xử lý…" : "Ẩn danh mục"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

const styles = `
.c7-page{--bg:#0f1222;--surface:#181b2a;--surface2:#1c1f2f;--line:#302f43;--ink:#e0e1f7;--muted:#aaa6bc;--dim:#858197;--purple:#a78bfa;--cyan:#5de6ff;min-height:calc(100vh - 80px);padding:32px clamp(16px,3vw,48px) 48px;background:var(--bg);color:var(--ink);font:14px/1.5 'Be Vietnam Pro',Inter,sans-serif}
.c7-crumb{display:flex;gap:10px;color:var(--dim);font:600 11px 'Space Grotesk',sans-serif;letter-spacing:.1em}
.c7-crumb b{color:#c4b5fd}
.c7-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:22px 0 28px}
.c7-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#c4b5fd;font:700 11px 'Space Grotesk',sans-serif;letter-spacing:.08em}
.c7-hero h1{margin:10px 0 5px;font:700 clamp(26px,3vw,36px)/1.15 'Be Vietnam Pro',sans-serif;letter-spacing:-.035em}
.c7-hero p,.c7-table-head p{margin:0;color:var(--muted)}
.c7-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:20px}
.c7-kpi{position:relative;display:grid;grid-template-columns:36px 1fr;align-items:center;column-gap:10px;padding:16px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(135deg,var(--surface),#151829)}
.c7-kpi-icon{grid-row:span 2;display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#7c3aed25;color:var(--purple)}
.c7-kpi.cyan .c7-kpi-icon{background:#22d3ee18;color:var(--cyan)}
.c7-kpi-label{color:var(--muted);font-size:12px}
.c7-kpi strong{font:700 25px/1.2 'Be Vietnam Pro',sans-serif}
.c7-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 13px}
.c7-status-tabs{display:flex;gap:4px;overflow:auto}
.c7-status-tabs button{display:flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 11px;border:1px solid transparent;border-radius:7px;background:none;color:var(--muted);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c7-status-tabs button span{padding:1px 6px;border-radius:10px;background:#ffffff0b;color:#aaa6bc;font:600 10px 'Space Grotesk',sans-serif}
.c7-status-tabs button.active{border-color:#7c3aed70;background:#7c3aed20;color:#e7ddff}
.c7-status-tabs button.active span{background:#7c3aed;color:white}
.c7-refresh{border:0;background:none;color:var(--cyan);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c7-filters{display:flex;align-items:center;gap:12px;margin-bottom:13px}
.c7-search{display:flex;align-items:center;gap:9px;flex:1;max-width:620px;padding:0 12px;height:42px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--dim)}
.c7-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif}
.c7-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--ink);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer;text-decoration:none}
.c7-btn.primary{border-color:#7c3aed;background:#7c3aed;color:white}
.c7-btn.secondary{background:var(--surface)}
.c7-btn.danger{border-color:#fb7185;background:#be123c;color:white}
.c7-btn:disabled{opacity:.45;cursor:not-allowed}
.c7-alert,.c7-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 13px;border:1px solid #fb718566;border-radius:7px;background:#7f1d1d22;color:#fecaca}
.c7-alert button,.c7-notice button{border:0;background:none;color:inherit;cursor:pointer}
.c7-notice{border-color:#22d3ee55;background:#08334455;color:#a5f3fc}
.c7-table-card{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.c7-table-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid var(--line)}
.c7-table-head h2{margin:0 0 3px;font:700 16px 'Be Vietnam Pro',sans-serif}
.c7-table-head p{font-size:11px}
.c7-page-meta{color:var(--muted);font:11px 'Space Grotesk',sans-serif}
.c7-table-scroll{overflow:auto}
.c7-table-scroll table{width:100%;border-collapse:collapse;min-width:900px}
.c7-table-scroll th{padding:11px 12px;text-align:left;color:var(--dim);background:#141727;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.05em;white-space:nowrap}
.c7-table-scroll td{padding:12px;border-top:1px solid #ffffff0a;color:#d4d2e2;font-size:12px;vertical-align:middle}
.c7-table-scroll tr:hover td{background:#ffffff04}
.c7-index{color:var(--dim);font:600 11px 'Space Grotesk',sans-serif}
.c7-category{display:flex;align-items:center;gap:10px;min-width:220px}
.c7-avatar{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:9px;background:#7c3aed30;color:#ddd1ff}
.c7-category b{display:block;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-size:12px}
.c7-category small{display:block;max-width:280px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dim);font-size:10px}
.c7-slug{display:inline-block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 7px;border:1px solid #34354a;border-radius:5px;background:#101322;color:#c4b5fd;font:11px 'Space Grotesk',sans-serif}
.c7-count{display:inline-flex;min-width:32px;justify-content:center;padding:3px 8px;border-radius:20px;background:#22d3ee14;color:#a5f3fc;font:600 11px 'Space Grotesk',sans-serif}
.c7-status{display:inline-flex;white-space:nowrap;padding:4px 8px;border-radius:20px;font-size:10px}
.c7-status.active{background:#10b98118;color:#6ee7b7}
.c7-status.archived{background:#f59e0b18;color:#fcd34d}
.c7-actions{display:flex;gap:6px}
.c7-icon-button{display:grid;place-items:center;width:31px;height:31px;border:1px solid var(--line);border-radius:7px;background:#ffffff04;color:#bdb8d0;cursor:pointer}
.c7-icon-button:hover:not(:disabled){border-color:#7c3aed;color:white}
.c7-icon-button.danger:hover:not(:disabled){border-color:#fb7185;color:#fda4af}
.c7-icon-button:disabled{opacity:.3;cursor:not-allowed}
.c7-state{padding:45px!important;text-align:center!important;color:var(--muted)!important}
.c7-pagination{display:flex;justify-content:space-between;align-items:center;padding:13px 17px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}
.c7-pagination label,.c7-pagination div{display:flex;align-items:center;gap:8px}
.c7-pagination select{padding:5px 7px;border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--ink)}
.c7-pagination button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);color:var(--ink);cursor:pointer}
.c7-pagination button:disabled{opacity:.35;cursor:not-allowed}
.c7-pagination b{color:var(--ink)}
.c7-overlay{position:fixed;inset:0;z-index:100;display:flex;justify-content:flex-end;background:#050610bd;backdrop-filter:blur(4px)}
.c7-overlay.center{align-items:center;justify-content:center;padding:18px}
.c7-drawer{display:flex;flex-direction:column;width:min(100%,460px);height:100%;overflow:auto;padding:24px;border-left:1px solid #4b4267;background:#181b2a;box-shadow:-24px 0 70px #0007}
.c7-drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--line)}
.c7-drawer-head h2{margin:12px 0 5px;font:700 23px 'Be Vietnam Pro',sans-serif}
.c7-drawer-head p{margin:0;color:var(--muted);font-size:12px}
.c7-close{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border:1px solid var(--line);border-radius:7px;background:none;color:var(--muted);cursor:pointer}
.c7-form{display:flex;flex-direction:column;gap:18px;margin-top:20px}
.c7-field{display:flex;flex-direction:column;gap:7px;color:var(--ink);font-size:12px}
.c7-field>span b{color:#fda4af}
.c7-field input,.c7-field textarea{width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:7px;outline:0;background:#101322;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif}
.c7-field input:focus,.c7-field textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px #7c3aed26}
.c7-field textarea{resize:vertical;min-height:96px}
.c7-field small{color:var(--dim);font-size:10px}
.c7-field .c7-readonly{border-style:dashed;background:#141727;color:#c4b5fd;font-family:'Space Grotesk',sans-serif;cursor:default}
.c7-drawer-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px}
.c7-dialog{position:relative;width:min(calc(100% - 36px),480px);padding:25px;border:1px solid #4b4267;border-radius:12px;background:#181b2a;box-shadow:0 24px 90px #0008}
.c7-dialog h2{margin:12px 0 6px;font:700 21px 'Be Vietnam Pro',sans-serif}
.c7-dialog p{margin:0;color:var(--muted);font-size:13px}
.c7-dialog .c7-close{position:absolute;top:15px;right:15px}
@media(max-width:1000px){.c7-toolbar{align-items:flex-start;flex-direction:column}.c7-status-tabs{width:100%}}
@media(max-width:640px){.c7-page{padding:22px 12px 32px}.c7-hero{align-items:flex-start;flex-direction:column}.c7-hero .c7-btn{width:100%}.c7-kpis{gap:8px}.c7-kpi{padding:12px}.c7-search{max-width:none}.c7-table-head{padding:14px 12px}.c7-pagination{padding:11px 9px}.c7-drawer{width:100%;padding:20px 16px}}
`;
