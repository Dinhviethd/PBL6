import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  IdCard,
  Inbox,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
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

type StatusFilter = "PENDING_OR_REJECTED" | OrganizerStatus;

const statusLabel: Record<OrganizerStatus, string> = {
  PENDING: "Chờ thẩm định",
  APPROVED: "Đã phê duyệt",
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

const legalChecks = [
  { key: "ai", label: "AI Score", icon: Sparkles },
  { key: "tax", label: "Đối soát MST", icon: BadgeCheck },
  { key: "ekyc", label: "eKYC / CCCD", icon: IdCard },
  { key: "docs", label: "Tài liệu đính kèm", icon: FileText },
  { key: "blacklist", label: "Danh sách đen", icon: ShieldAlert },
  { key: "sla", label: "SLA xử lý", icon: Timer },
];

export function C6Approve() {
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
    return value === "PENDING" || value === "REJECTED" ? value : "PENDING_OR_REJECTED";
  });
  const [search, setSearch] = useState(() => (searchParams.get("q") || "").slice(0, 200));
  const [query, setQuery] = useState(search);
  const [result, setResult] = useState<OrganizerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");

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
    const next = new URLSearchParams({ page: String(page), limit: String(limit), status });
    if (query) next.set("q", query);
    if (next.toString() !== searchParams.toString()) {
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
        if (page > 0 && page >= next.pagination.totalPages)
          setPage(Math.max(0, next.pagination.totalPages - 1));
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const items = result?.items ?? [];
  const pagination = result?.pagination;
  const stats = result?.stats;
  const rejected = stats
    ? Math.max(0, stats.total - stats.active - stats.pending)
    : undefined;

  const showComingSoon = () => setToast("Chức năng đang phát triển");

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "PENDING_OR_REJECTED", label: "Chờ xử lý", count: (stats?.pending ?? 0) + (rejected ?? 0) },
    { key: "PENDING", label: "Chờ thẩm định", count: stats?.pending },
    { key: "REJECTED", label: "Từ chối", count: rejected },
  ];

  return (
    <AdminShell title="Hồ sơ đăng ký BTC">
      <div className="c6-page">
        <style>{styles}</style>
        <div className="c6-crumb">
          <span>QUẢN TRỊ</span>
          <span>/</span>
          <b>HỒ SƠ ĐĂNG KÝ BTC</b>
        </div>
        <header className="c6-hero">
          <div>
            <span className="c6-eyebrow">
              <ShieldCheck size={14} /> HỆ THỐNG THẨM TRA PHÁP LÝ
            </span>
            <h1>Thẩm Định &amp; Xét Duyệt Hồ Sơ Ban Tổ Chức</h1>
            <p>
              Kiểm tra hồ sơ, xác minh pháp lý và cấp quyền phát hành vé cho ban
              tổ chức trên hệ thống EventHub.
            </p>
          </div>
          <div className="c6-hero-actions">
            <button className="c6-ai" type="button" onClick={showComingSoon}>
              <Sparkles size={16} /> Tự động rà soát AI
            </button>
            <button
              className="c6-quick"
              type="button"
              onClick={() => {
                setStatus("PENDING");
                setPage(0);
              }}
            >
              <Inbox size={16} /> Xét duyệt hồ sơ mới
              <span>{stats?.pending?.toLocaleString("vi-VN") ?? "—"}</span>
            </button>
          </div>
        </header>
        <section className="c6-kpis" aria-label="Tổng quan hồ sơ ban tổ chức">
          <article className="c6-kpi amber">
            <span className="c6-kpi-icon">
              <Clock size={18} />
            </span>
            <span className="c6-kpi-label">Chờ thẩm định</span>
            <strong>{stats?.pending?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
          <article className="c6-kpi cyan">
            <span className="c6-kpi-icon">
              <UserCheck size={18} />
            </span>
            <span className="c6-kpi-label">Đã phê duyệt</span>
            <strong>{stats?.active?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
          <article className="c6-kpi pink">
            <span className="c6-kpi-icon">
              <Building2 size={18} />
            </span>
            <span className="c6-kpi-label">Từ chối</span>
            <strong>{rejected?.toLocaleString("vi-VN") ?? "—"}</strong>
          </article>
        </section>
        <section className="c6-toolbar">
          <div className="c6-status-tabs" aria-label="Lọc trạng thái hồ sơ">
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
            className="c6-refresh"
            type="button"
            aria-label="Làm mới danh sách hồ sơ"
            title="Làm mới"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={17} className={loading ? "is-spinning" : ""}/>
          </button>
        </section>
        <section className="c6-filters">
          <label className="c6-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo tên công ty, người đại diện hoặc MST"
              aria-label="Tìm hồ sơ ban tổ chức"
            />
          </label>
        </section>
        <section className="c6-legal-strip" aria-label="Thẩm tra pháp lý tự động">
          <span className="c6-legal-title">
            <ShieldCheck size={14} /> Thẩm tra pháp lý
          </span>
          {legalChecks.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={showComingSoon}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </section>
        {error && (
          <div className="c6-alert" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Thử lại
            </button>
          </div>
        )}
        <section className="c6-table-card">
          <div className="c6-table-head">
            <div>
              <h2>Danh sách hồ sơ đăng ký</h2>
              <p>
                {pagination
                  ? `${pagination.total.toLocaleString("vi-VN")} hồ sơ phù hợp`
                  : "Đang tải dữ liệu"}
              </p>
            </div>
            <span className="c6-page-meta">
              {pagination && pagination.total
                ? `${page * limit + 1}–${Math.min(
                    (page + 1) * limit,
                    pagination.total,
                  )} / ${pagination.total.toLocaleString("vi-VN")}`
                : "0 hồ sơ"}
            </span>
          </div>
          <div className="c6-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Đơn vị</th>
                  <th>Người đại diện &amp; liên hệ</th>
                  <th>Mã số thuế / pháp nhân</th>
                  <th>Ngày nộp</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && !result ? (
                  <tr>
                    <td colSpan={6} className="c6-state">
                      Đang tải danh sách hồ sơ…
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="c6-org">
                          <span className="c6-avatar">
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
                        <b className="c6-contact">{row.contact_name}</b>
                        <small>{row.contact_email}</small>
                        <small>{row.contact_phone}</small>
                      </td>
                      <td>
                        <code className="c6-tax">
                          {row.tax_id_or_business_license || "—"}
                        </code>
                        <small>{row.business_name || "—"}</small>
                      </td>
                      <td className="c6-date">{date(row.created_at)}</td>
                      <td>
                        <span
                          className={`c6-status ${row.status.toLowerCase()}`}
                        >
                          {statusLabel[row.status]}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="c6-action"
                          aria-label={`${row.status === "PENDING" ? "Xét duyệt" : "Xem"} hồ sơ ${row.organization_name}`}
                          to={`/admin/applications/review/${row.id}`}
                          state={{ returnTo: `${location.pathname}${location.search}` }}
                        >
                          <Eye size={15} />
                          {row.status === "PENDING" ? "Xét duyệt" : "Xem"}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={6} className="c6-state">
                      {query || status
                        ? "Không tìm thấy hồ sơ phù hợp."
                        : "Chưa có hồ sơ ban tổ chức."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="c6-pagination">
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
        {toast && (
          <div className="c6-toast" role="status">
            <span className="c6-toast-icon">
              <Timer size={18} />
            </span>
            {toast}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

const styles = `
.c6-page{--bg:#0f1222;--surface:#181b2a;--surface2:#1c1f2f;--line:#302f43;--ink:#e0e1f7;--muted:#aaa6bc;--dim:#858197;--purple:#a78bfa;--cyan:#5de6ff;--amber:#fcd34d;--pink:#f9a8d4;box-sizing:border-box;width:100%;min-width:0;min-height:calc(100vh - 80px);padding:24px clamp(16px,2.5vw,40px) 26px;background:var(--bg);color:var(--ink);font:14px/1.5 'Be Vietnam Pro',Inter,sans-serif}
.c6-crumb{display:flex;gap:10px;color:var(--dim);font:600 11px 'Space Grotesk',sans-serif;letter-spacing:.1em}
.c6-crumb b{color:#c4b5fd}
.c6-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:16px 0 20px}
.c6-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#c4b5fd;font:700 11px 'Space Grotesk',sans-serif;letter-spacing:.08em}
.c6-hero h1{margin:10px 0 5px;font:700 clamp(26px,3vw,36px)/1.15 'Be Vietnam Pro',sans-serif;letter-spacing:-.035em}
.c6-hero p,.c6-table-head p{margin:0;color:var(--muted)}
.c6-hero-actions{display:flex;flex-wrap:wrap;gap:9px}
.c6-ai,.c6-quick{display:inline-flex;align-items:center;gap:9px;min-height:42px;padding:0 15px;border-radius:8px;font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c6-ai{border:1px solid #5de6ff66;background:#08334455;color:#a5f3fc}
.c6-ai:hover{border-color:#5de6ff;color:#e0fbff}
.c6-quick{border:1px solid #7c3aed;background:#7c3aed;color:white}
.c6-quick span{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#ffffff2b;font:600 10px 'Space Grotesk',sans-serif}
.c6-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
.c6-kpi{position:relative;display:grid;grid-template-columns:36px 1fr;align-items:center;column-gap:10px;padding:16px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(135deg,var(--surface),#151829)}
.c6-kpi-icon{grid-row:span 2;display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#f59e0b1c;color:var(--amber)}
.c6-kpi.cyan .c6-kpi-icon{background:#22d3ee18;color:var(--cyan)}
.c6-kpi.pink .c6-kpi-icon{background:#f472b61c;color:var(--pink)}
.c6-kpi-label{color:var(--muted);font-size:12px}
.c6-kpi strong{font:700 25px/1.2 'Be Vietnam Pro',sans-serif}
.c6-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0;margin:0 0 10px}
.c6-status-tabs{display:flex;flex:1;min-width:0;gap:4px;overflow:auto}
.c6-status-tabs button{display:flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 11px;border:1px solid transparent;border-radius:7px;background:none;color:var(--muted);font:600 12px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c6-status-tabs button span{padding:1px 6px;border-radius:10px;background:#ffffff0b;color:#aaa6bc;font:600 10px 'Space Grotesk',sans-serif}
.c6-status-tabs button.active{border-color:#7c3aed70;background:#7c3aed20;color:#e7ddff}
.c6-status-tabs button.active span{background:#7c3aed;color:white}
.c6-refresh{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border:1px solid var(--line);border-radius:7px;background:#ffffff04;color:var(--cyan);cursor:pointer}.c6-refresh:hover{border-color:#22d3ee66;background:#22d3ee0b}.c6-refresh svg.is-spinning{animation:c6-refresh-spin .8s linear infinite}@keyframes c6-refresh-spin{to{transform:rotate(360deg)}}
.c6-filters{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.c6-search{display:flex;align-items:center;gap:9px;flex:1;max-width:620px;padding:0 12px;height:42px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--dim)}
.c6-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:13px 'Be Vietnam Pro',sans-serif}
.c6-legal-strip{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 12px;padding:10px 12px;border:1px dashed #5de6ff44;border-radius:9px;background:#0b233088}
.c6-legal-title{display:inline-flex;align-items:center;gap:7px;margin-right:4px;color:#a5f3fc;font:600 11px 'Space Grotesk',sans-serif;letter-spacing:.04em}
.c6-legal-strip button,.c6-legal-grid button{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #34405a;border-radius:7px;background:#101322;color:#c4b5fd;font:600 11px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c6-legal-strip button:hover,.c6-legal-grid button:hover{border-color:#5de6ff;color:#e0fbff}
.c6-alert,.c6-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 13px;border:1px solid #fb718566;border-radius:7px;background:#7f1d1d22;color:#fecaca}
.c6-alert button,.c6-notice button{border:0;background:none;color:inherit;cursor:pointer}
.c6-notice{border-color:#22d3ee55;background:#08334455;color:#a5f3fc}
.c6-table-card{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.c6-table-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line)}
.c6-table-head h2{margin:0 0 3px;font:700 16px 'Be Vietnam Pro',sans-serif}
.c6-table-head p{font-size:11px}
.c6-page-meta{color:var(--muted);font:11px 'Space Grotesk',sans-serif}
.c6-table-scroll{overflow:auto}
.c6-table-scroll table{width:100%;border-collapse:collapse;min-width:900px}
.c6-table-scroll th{padding:11px 12px;text-align:left;color:var(--dim);background:#141727;font:600 10px 'Space Grotesk',sans-serif;letter-spacing:.05em;white-space:nowrap}
.c6-table-scroll td{padding:12px;border-top:1px solid #ffffff0a;color:#d4d2e2;font-size:12px;vertical-align:middle}
.c6-table-scroll tr:hover td{background:#ffffff04}
.c6-org{display:flex;align-items:center;gap:10px;min-width:200px}
.c6-avatar{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:9px;background:#7c3aed30;color:#ddd1ff;font:700 14px 'Be Vietnam Pro',sans-serif}
.c6-org b,.c6-contact{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-size:12px}
.c6-table-scroll td small{display:block;margin-top:3px;color:var(--dim);font:10px 'Space Grotesk',sans-serif;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c6-tax{display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 7px;border:1px solid #34354a;border-radius:5px;background:#101322;color:#c4b5fd;font:11px 'Space Grotesk',sans-serif}
.c6-date{white-space:nowrap;color:var(--muted);font:11px 'Space Grotesk',sans-serif}
.c6-status{display:inline-flex;white-space:nowrap;padding:4px 8px;border-radius:20px;font-size:10px}
.c6-status.approved{background:#10b98118;color:#6ee7b7}
.c6-status.pending{background:#f59e0b18;color:#fcd34d}
.c6-status.rejected{background:#fb718518;color:#fda4af}
.c6-action{text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:6px 10px;border:1px solid var(--line);border-radius:7px;background:#ffffff04;color:#c4b5fd;font:600 11px 'Be Vietnam Pro',sans-serif;cursor:pointer}
.c6-action:hover{border-color:#7c3aed;color:white}
.c6-state{padding:45px!important;text-align:center!important;color:var(--muted)!important}
.c6-pagination{display:flex;justify-content:space-between;align-items:center;flex:none;gap:10px;padding:12px 17px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}
.c6-pagination label,.c6-pagination div{display:flex;align-items:center;gap:8px}
.c6-pagination select{padding:5px 7px;border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--ink)}
.c6-pagination button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);color:var(--ink);cursor:pointer}
.c6-pagination button:disabled{opacity:.35;cursor:not-allowed}
.c6-pagination b{color:var(--ink)}
.c6-legal-grid button{justify-content:flex-start}
.c6-toast{position:fixed;left:50%;bottom:26px;z-index:300;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:12px 18px;border:1px solid #5de6ff66;border-radius:10px;background:#0b2330f2;color:#e0fbff;font:600 13px 'Be Vietnam Pro',sans-serif;box-shadow:0 16px 40px #00000066;transform:translateX(-50%);animation:c6-toast-in .18s ease-out}
.c6-toast-icon{display:grid;place-items:center;color:#5de6ff}
@keyframes c6-toast-in{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
@media(max-width:1000px){.c6-hero{align-items:flex-start;flex-direction:column}.c6-hero-actions{width:100%}.c6-ai,.c6-quick{flex:1;justify-content:center}.c6-toolbar{align-items:flex-start;flex-direction:column}.c6-status-tabs{width:100%}}
@media(max-width:720px){.c6-page{padding:20px 12px 26px}.c6-kpis{grid-template-columns:1fr;gap:8px}.c6-kpi{padding:12px}.c6-table-head{padding:13px 12px}.c6-pagination{padding:11px 9px;flex-wrap:wrap}.c6-dialog{padding:21px 16px}.c6-detail-grid,.c6-legal-grid{grid-template-columns:1fr}.c6-dialog-actions{flex-direction:column-reverse}.c6-btn{width:100%}.c6-toast{left:16px;right:16px;max-width:none;transform:none}.c6-toast{justify-content:center}}
`;
