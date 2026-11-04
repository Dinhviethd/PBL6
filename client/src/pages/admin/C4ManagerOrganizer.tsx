import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { message, money } from "@/features/ticketing/data";
import { AdminShell } from "./AdminShell";

type OrganizerStatus = "PENDING" | "APPROVED" | "REJECTED";

type Organizer = {
  id: string;
  user_id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  business_name: string | null;
  tax_id_or_business_license: string | null;
  website_or_social: string | null;
  head_office_address: string | null;
  main_event_category: string | null;
  expected_event_scale: string | null;
  status: OrganizerStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  gmv: string;
};

type OrganizerPage = {
  items: Organizer[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: { total: number; active: number; pending: number };
};

type StatusFilter = "" | OrganizerStatus;

const statusLabel: Record<OrganizerStatus, string> = {
  PENDING: "Chờ thẩm định",
  APPROVED: "Đang hoạt động",
  REJECTED: "Từ chối",
};

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "—";

const initial = (value: string) => value.trim().slice(0, 1).toUpperCase() || "?";

export function C4ManagerOrganizer() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") || 0);
    return Number.isInteger(value) && value >= 0 && value <= 10000 ? value : 0;
  });
  const [limit, setLimit] = useState(() => {
    const value = Number(searchParams.get("limit"));
    return [10, 20, 50].includes(value) ? value : 10;
  });
  const [status, setStatus] = useState<StatusFilter>(() => {
    const value = searchParams.get("status");
    return value === "PENDING" || value === "APPROVED" || value === "REJECTED" ? value : "";
  });
  const [search, setSearch] = useState(() => (searchParams.get("q") || "").slice(0, 200));
  const [query, setQuery] = useState(search);
  const [result, setResult] = useState<OrganizerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<Organizer | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      q: query,
    });
    if (status) value.set("status", status);
    return value.toString();
  }, [page, limit, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) next.set("status", status);
    if (query) next.set("q", query);
    if (searchParams.toString() !== next.toString()) {
      setSearchParams(next, { replace: true, preventScrollReset: true });
    }
  }, [page, limit, status, query, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get<{ data: OrganizerPage }>(`/admin/organizer-applications?${params}`, {
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
    if (!detail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(
      () => document.querySelector<HTMLElement>(".c4-dialog .c4-close")?.focus(),
      30,
    );
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [detail]);

  const items = result?.items ?? [];
  const pagination = result?.pagination;
  const stats = result?.stats;
  const rejected = stats
    ? Math.max(0, stats.total - stats.active - stats.pending)
    : undefined;

  const openDetail = (row: Organizer) => {
    setReason("");
    setError("");
    setDetail(row);
  };

  async function review(approve: boolean) {
    if (!detail) return;
    if (!approve && !reason.trim()) {
      setError("Cần nhập lý do khi từ chối hồ sơ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/admin/organizer-applications/${detail.id}/review`, {
        approve,
        reason: reason.trim(),
      });
      setNotice(
        approve
          ? `Đã phê duyệt hồ sơ "${detail.organization_name}".`
          : `Đã từ chối hồ sơ "${detail.organization_name}".`,
      );
      setDetail(null);
      setReason("");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "", label: "Tất cả", count: stats?.total },
    { key: "APPROVED", label: "Đang hoạt động", count: stats?.active },
    { key: "PENDING", label: "Chờ thẩm định", count: stats?.pending },
    { key: "REJECTED", label: "Từ chối", count: rejected },
  ];

  return (
    <AdminShell title="Ban tổ chức">
      <div className="c4-page">
        <style>{styles}</style>
        <div className="c4-crumb">
          <span>QUẢN TRỊ</span>
          <span>/</span>
          <b>BAN TỔ CHỨC</b>
        </div>
        <header className="c4-hero">
          <div>
            <span className="c4-eyebrow">
              <ShieldCheck size={14} />BAN TỔ CHỨC
            </span>
            <h1>Quản lý Ban Tổ Chức</h1>
            <p>
              Hồ sơ đối tác, trạng thái phê duyệt và tổng doanh thu trên hệ
              thống EventHub.
            </p>
          </div>
          <button
            className="c4-quick"
            type="button"
            onClick={() => {
              setStatus("PENDING");
              setPage(0);
            }}
          >
            <Inbox size={16} /> Xét duyệt hồ sơ mới
            <span>{stats?.pending?.toLocaleString("vi-VN") ?? "—"}</span>
          </button>
        </header>
        <section className="c4-kpis" aria-label="Tổng quan ban tổ chức">
          <article className="c4-kpi purple">
            <span className="c4-kpi-icon">
              <Building2 size={18} />
            </span>
            <span className="c4-kpi-label">Tổng đối tác</span>
            <strong>{stats?.total?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
          <article className="c4-kpi cyan">
            <span className="c4-kpi-icon">
              <UserCheck size={18} />
            </span>
            <span className="c4-kpi-label">Đang hoạt động</span>
            <strong>{stats?.active?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
          <article className="c4-kpi amber">
            <span className="c4-kpi-icon">
              <Clock size={18} />
            </span>
            <span className="c4-kpi-label">Chờ thẩm định</span>
            <strong>{stats?.pending?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
        </section>
        <section className="c4-toolbar">
          <div className="c4-status-tabs" aria-label="Lọc trạng thái hồ sơ">
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
            className="c4-refresh"
            type="button"
            aria-label="Làm mới danh sách ban tổ chức"
            title="Làm mới"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={17} className={loading ? "is-spinning" : ""}/>
          </button>
        </section>
        <section className="c4-filters">
          <label className="c4-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo tên công ty, người đại diện hoặc MST"
              aria-label="Tìm ban tổ chức"
            />
          </label>
        </section>
        {error && (
          <div className="c4-alert" role="alert">
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
          <div className="c4-notice" role="status">
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
        <section className="c4-table-card">
          <div className="c4-table-head">
            <div>
              <h2>Danh sách ban tổ chức</h2>
              <p>
                {pagination
                  ? `${pagination.total.toLocaleString("vi-VN")} hồ sơ phù hợp`
                  : "Đang tải dữ liệu"}
              </p>
            </div>
            <span className="c4-page-meta">
              {pagination && pagination.total
                ? `${page * limit + 1}–${Math.min(
                    (page + 1) * limit,
                    pagination.total,
                  )} / ${pagination.total.toLocaleString("vi-VN")}`
                : "0 hồ sơ"}
            </span>
          </div>
          <div className="c4-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ĐƠN VỊ</th>
                  <th>NGƯỜI ĐẠI DIỆN &amp; LIÊN HỆ</th>
                  <th>MÃ SỐ THUẾ / PHÁP NHÂN</th>
                  <th>TỔNG DOANH THU GMV</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading && !result ? (
                  <tr>
                    <td colSpan={6} className="c4-state">
                      Đang tải danh sách ban tổ chức…
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="c4-org">
                          <span className="c4-avatar">
                            {initial(row.organization_name)}
                          </span>
                          <span>
                            <b>{row.organization_name}</b>
                            <small>
                              {row.business_name || "Chưa cập nhật pháp nhân"}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <b className="c4-contact">{row.contact_name}</b>
                        <small>{row.contact_email}</small>
                        <small>{row.contact_phone}</small>
                      </td>
                      <td>
                        <code className="c4-tax">
                          {row.tax_id_or_business_license || "—"}
                        </code>
                        <small>{row.business_name || "—"}</small>
                      </td>
                      <td className="c4-gmv">{money(row.gmv)}</td>
                      <td>
                        <span className={`c4-status ${row.status.toLowerCase()}`}>
                          {statusLabel[row.status]}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="c4-action"
                          aria-label={`Xem hồ sơ ${row.organization_name}`}
                          to={`/admin/applications/${row.id}`}
                          state={{ returnTo: `${location.pathname}${location.search}` }}
                        >
                          <Eye size={15} /> Xem
                        </Link>
                        {row.status === "PENDING" && (
                        <button
                          className="c4-action"
                          type="button"
                          aria-label={`Xét duyệt hồ sơ ${row.organization_name}`}
                          onClick={() => openDetail(row)}
                        >
                          <ShieldCheck size={15} /> Xét duyệt
                        </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={6} className="c4-state">
                      {query || status
                        ? "Không tìm thấy hồ sơ phù hợp."
                        : "Chưa có hồ sơ ban tổ chức."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="c4-pagination">
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
                  !pagination || page + 1 >= pagination.totalPages || loading
                }
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        </section>
        {detail && (
          <div
            className="c4-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDetail(null);
            }}
          >
            <section
              className="c4-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="c4-detail-title"
            >
              <button
                className="c4-close"
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
              <span className="c4-eyebrow">HỒ SƠ BAN TỔ CHỨC</span>
              <h2 id="c4-detail-title">{detail.organization_name}</h2>
              <span className={`c4-status ${detail.status.toLowerCase()}`}>
                {statusLabel[detail.status]}
              </span>
              <p className="c4-detail-desc">
                {detail.description || "Hồ sơ chưa có mô tả."}
              </p>
              <dl className="c4-detail-grid">
                {[
                  ["Người đại diện", detail.contact_name],
                  ["Email", detail.contact_email],
                  ["Điện thoại", detail.contact_phone],
                  ["Mã số thuế", detail.tax_id_or_business_license || "—"],
                  ["Tên pháp nhân", detail.business_name || "—"],
                  ["Website", detail.website_or_social || "—"],
                  ["Danh mục chính", detail.main_event_category || "—"],
                  ["Quy mô dự kiến", detail.expected_event_scale || "—"],
                  ["Địa chỉ", detail.head_office_address || "—"],
                  ["Tổng doanh thu GMV", money(detail.gmv)],
                  ["Ngày nộp", date(detail.created_at)],
                  ["Ngày xét duyệt", date(detail.reviewed_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {detail.rejection_reason && (
                <div className="c4-reject-reason">
                  <span>Lý do từ chối</span>
                  <p>{detail.rejection_reason}</p>
                </div>
              )}
              {detail.status === "PENDING" ? (
                <div className="c4-review">
                  <label className="c4-reason">
                    Lý do từ chối (bắt buộc khi từ chối)
                    <textarea
                      value={reason}
                      rows={3}
                      maxLength={2000}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Nhập lý do để ghi nhận cho hồ sơ…"
                    />
                  </label>
                  {error && (
                    <div className="c4-alert" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="c4-dialog-actions">
                    <button
                      className="c4-btn danger"
                      type="button"
                      disabled={busy || !reason.trim()}
                      onClick={() => void review(false)}
                    >
                      <XCircle size={16} />
                      {busy ? "Đang xử lý…" : "Từ chối"}
                    </button>
                    <button
                      className="c4-btn primary"
                      type="button"
                      disabled={busy}
                      onClick={() => void review(true)}
                    >
                      <CheckCircle2 size={16} />
                      {busy ? "Đang xử lý…" : "Phê duyệt"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="c4-reviewed">
                  Hồ sơ đã được xử lý. Chỉ hồ sơ đang chờ thẩm định mới có thể
                  phê duyệt hoặc từ chối.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

const styles = `
.c4-page{--bg:#0f1222;--surface:#181b2a;--surface2:#1c1f2f;--line:#302f43;--ink:#e0e1f7;--muted:#aaa6bc;--dim:#858197;--purple:#a78bfa;--cyan:#5de6ff;--amber:#fcd34d;box-sizing:border-box;width:100%;min-width:0;min-height:calc(100vh - 80px);padding:24px clamp(16px,2.5vw,40px) 26px;background:var(--bg);color:var(--ink);font:14px/1.5 'Be Vietnam Pro',Inter,sans-serif}
.c4-crumb{display:flex;gap:10px;color:var(--dim);font:600 11px 'Space Grotesk',sans-serif;letter-spacing:.1em}
.c4-crumb b{color:#c4b5fd}
.c4-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:16px 0 20px}
.c4-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#c4b5fd;font:700 11px 'Space Grotesk',sans-serif;letter-spacing:.08em}
.c4-hero h1{margin:10px 0 5px;font:700 clamp(26px,3vw,36px)/1.15 'Be Vietnam Pro',sans-serif;letter-spacing:-.035em}
.c4-hero p,.c4-table-head p{margin:0;color:var(--muted)}
.c4-quick{display:inline-flex;align-items:center;gap:9px;min-height:42px;padding:0 15px;border:1px solid #7c3aed;border-radius:8px;background:#7c3aed;color:white;font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c4-quick span{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#ffffff2b;font:600 10px 'Space Grotesk',sans-serif}
.c4-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
.c4-kpi{position:relative;display:grid;grid-template-columns:36px 1fr;align-items:center;column-gap:10px;padding:16px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(135deg,var(--surface),#151829)}
.c4-kpi-icon{grid-row:span 2;display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#7c3aed25;color:var(--purple)}
.c4-kpi.cyan .c4-kpi-icon{background:#22d3ee18;color:var(--cyan)}
.c4-kpi.amber .c4-kpi-icon{background:#f59e0b1c;color:var(--amber)}
.c4-kpi-label{color:var(--muted);font-size:12px}
.c4-kpi strong{font:700 25px/1.2 'Be Vietnam Pro',sans-serif}
.c4-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0;margin:0 0 10px}
.c4-status-tabs{display:flex;flex:1;min-width:0;gap:4px;overflow:auto}
.c4-status-tabs button{display:flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 11px;border:1px solid transparent;border-radius:7px;background:none;color:var(--muted);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c4-status-tabs button span{padding:1px 6px;border-radius:10px;background:#ffffff0b;color:#aaa6bc;font:600 10px 'Space Grotesk',sans-serif}
.c4-status-tabs button.active{border-color:#7c3aed70;background:#7c3aed20;color:#e7ddff}
.c4-status-tabs button.active span{background:#7c3aed;color:white}
.c4-refresh{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border:1px solid var(--line);border-radius:7px;background:#ffffff04;color:var(--cyan);cursor:pointer}.c4-refresh:hover{border-color:#22d3ee66;background:#22d3ee0b}.c4-refresh svg.is-spinning{animation:c4-refresh-spin .8s linear infinite}@keyframes c4-refresh-spin{to{transform:rotate(360deg)}}
.c4-filters{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.c4-search{display:flex;align-items:center;gap:9px;flex:1;max-width:620px;padding:0 12px;height:42px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--dim)}
.c4-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif}
.c4-alert,.c4-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 13px;border:1px solid #fb718566;border-radius:7px;background:#7f1d1d22;color:#fecaca}
.c4-alert button,.c4-notice button{border:0;background:none;color:inherit;cursor:pointer}
.c4-notice{border-color:#22d3ee55;background:#08334455;color:#a5f3fc}
.c4-table-card{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.c4-table-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line)}
.c4-table-head h2{margin:0 0 3px;font:700 16px 'Be Vietnam Pro',sans-serif}
.c4-table-head p{font-size:11px}
.c4-page-meta{color:var(--muted);font:11px 'Space Grotesk',sans-serif}
.c4-table-scroll{overflow:auto}
.c4-table-scroll table{width:100%;border-collapse:collapse;min-width:960px}
.c4-table-scroll th{padding:11px 12px;text-align:left;color:var(--dim);background:#141727;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.05em;white-space:nowrap}
.c4-table-scroll td{padding:12px;border-top:1px solid #ffffff0a;color:#d4d2e2;font-size:12px;vertical-align:middle}
.c4-table-scroll tr:hover td{background:#ffffff04}
.c4-org{display:flex;align-items:center;gap:10px;min-width:200px}
.c4-avatar{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:9px;background:#7c3aed30;color:#ddd1ff;font:700 14px 'Be Vietnam Pro',sans-serif}
.c4-org b,.c4-contact{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-size:12px}
.c4-table-scroll td small{display:block;margin-top:3px;color:var(--dim);font:10px 'Space Grotesk',sans-serif;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c4-tax{display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 7px;border:1px solid #34354a;border-radius:5px;background:#101322;color:#c4b5fd;font:11px 'Space Grotesk',sans-serif}
.c4-gmv{white-space:nowrap;font-weight:600;color:#a5f3fc}
.c4-status{display:inline-flex;white-space:nowrap;padding:4px 8px;border-radius:20px;font-size:10px}
.c4-status.approved{background:#10b98118;color:#6ee7b7}
.c4-status.pending{background:#f59e0b18;color:#fcd34d}
.c4-status.rejected{background:#fb718518;color:#fda4af}
.c4-action{text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:6px 10px;border:1px solid var(--line);border-radius:7px;background:#ffffff04;color:#c4b5fd;font:600 11px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c4-action:hover{border-color:#7c3aed;color:white}
.c4-state{padding:45px!important;text-align:center!important;color:var(--muted)!important}
.c4-pagination{display:flex;justify-content:space-between;align-items:center;flex:none;gap:10px;padding:12px 17px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}
.c4-pagination label,.c4-pagination div{display:flex;align-items:center;gap:8px}
.c4-pagination select{padding:5px 7px;border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--ink)}
.c4-pagination button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);color:var(--ink);cursor:pointer}
.c4-pagination button:disabled{opacity:.35;cursor:not-allowed}
.c4-pagination b{color:var(--ink)}
.c4-overlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:#050610bd;backdrop-filter:blur(5px)}
.c4-dialog{position:relative;width:min(100%,660px);max-height:90vh;overflow:auto;padding:25px;border:1px solid #4b4267;border-radius:12px;background:#181b2a;box-shadow:0 24px 90px #0008}
.c4-dialog h2{margin:8px 0 10px;font:700 23px 'Be Vietnam Pro',sans-serif;padding-right:36px}
.c4-close{position:absolute;top:15px;right:15px;display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--line);border-radius:7px;background:none;color:var(--muted);cursor:pointer}
.c4-detail-desc{margin:14px 0 0;color:var(--muted);font-size:13px}
.c4-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 22px;margin:18px 0 0}
.c4-detail-grid div{padding:10px 0;border-top:1px solid var(--line)}
.c4-detail-grid dt{color:var(--dim);font-size:11px}
.c4-detail-grid dd{margin:4px 0 0;color:var(--ink);font-size:13px;overflow-wrap:anywhere}
.c4-reject-reason{margin-top:14px;padding:12px;border:1px solid #fb718544;border-radius:8px;background:#7f1d1d1f}
.c4-reject-reason span{color:#fda4af;font-size:11px}
.c4-reject-reason p{margin:5px 0 0;color:#fecaca;font-size:13px}
.c4-review{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
.c4-reason{display:block;color:var(--ink);font-size:12px}
.c4-reason textarea{display:block;width:100%;margin-top:7px;padding:10px;border:1px solid var(--line);border-radius:7px;background:#101322;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif;resize:vertical}
.c4-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}
.c4-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:0 14px;border:1px solid var(--line);border-radius:7px;color:var(--ink);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c4-btn.primary{border-color:#7c3aed;background:#7c3aed;color:white}
.c4-btn.danger{border-color:#fb7185;background:#be123c;color:white}
.c4-btn:disabled{opacity:.45;cursor:not-allowed}
.c4-reviewed{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
@media(max-width:1000px){.c4-hero{align-items:flex-start;flex-direction:column}.c4-quick{width:100%;justify-content:center}.c4-toolbar{align-items:flex-start;flex-direction:column}.c4-status-tabs{width:100%}}
@media(max-width:720px){.c4-page{padding:20px 12px 26px}.c4-kpis{grid-template-columns:1fr;gap:8px}.c4-kpi{padding:12px}.c4-table-head{padding:13px 12px}.c4-pagination{padding:11px 9px;flex-wrap:wrap}.c4-dialog{padding:21px 16px}.c4-detail-grid{grid-template-columns:1fr}.c4-dialog-actions{flex-direction:column-reverse}.c4-btn{width:100%}}
`;
