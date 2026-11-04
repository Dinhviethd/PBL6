import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import axios from "axios";
import { ArrowLeft, Building2, CheckCircle2, FileText, ShieldCheck, X, XCircle } from "lucide-react";
import api from "@/lib/api";
import { message } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { AdminShell } from "./AdminShell";

type Application = {
  id: string;
  user_id: string;
  organization_name: string;
  business_name: string | null;
  tax_id_or_business_license: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  head_office_address: string | null;
  website_or_social: string | null;
  logo_url: string | null;
  description: string | null;
  main_event_category: string | null;
  expected_event_scale: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

const labels = { PENDING: "Chờ duyệt", APPROVED: "Đã phê duyệt", REJECTED: "Đã từ chối" };
const legalChecks = ["AI Score", "Đối soát MST", "eKYC / CCCD", "Tài liệu đính kèm", "Danh sách đen", "SLA xử lý"];
const queuePath = "/admin/applications/review";

function dateTime(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Chưa có thông tin";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function websiteUrl(value: string | null) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function C6OrganizerApplicationDetail() {
  const { applicationId = "" } = useParams();
  return <ApplicationDetail key={applicationId} applicationId={applicationId} />;
}

function ApplicationDetail({ applicationId }: { applicationId: string }) {
  const location = useLocation();
  const from = location.state?.returnTo;
  const backPath = typeof from === "string" && /^\/admin\/applications\/review(?:\?[^#]*)?$/.test(from)
    ? from
    : queuePath;
  const [profile, setProfile] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [decision, setDecision] = useState<boolean | null>(null);
  const [retry, setRetry] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const [toast, setToast] = useState("");
  const locked = useRef(false);
  const lastAction = useRef<HTMLButtonElement | null>(null);
  const decisionHeading = useRef<HTMLHeadingElement | null>(null);
  const mounted = useRef(true);
  const sessionRevision = useRef(useAuth.getState().revision);
  const isCurrent = () => mounted.current && sessionRevision.current === useAuth.getState().revision;
  const endpoint = `/admin/organizer-applications/${encodeURIComponent(applicationId)}`;
  const read = async () => (await api.get<{ data: Application }>(endpoint)).data.data;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setProfile(null);
    api.get<{ data: Application }>(endpoint, { signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        setProfile(response.data.data);
        setUncertain(false);
        setNotice(value => value.startsWith("Đã gửi quyết định") ? "Đã tải trạng thái xét duyệt mới nhất." : value);
      })
      .catch(cause => {
        if (controller.signal.aborted) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setError(status === 404 ? "Không tìm thấy hồ sơ đăng ký BTC."
          : status === 400 ? "Đường dẫn hồ sơ không hợp lệ." : message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, retry]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function submit() {
    if (decision === null || locked.current || uncertain || !profile || profile.status !== "PENDING" || !isCurrent()) return;
    const approve = decision;
    const trimmed = reason.trim();
    if ((!approve && !trimmed) || trimmed.length > 2000) {
      setError("Lý do từ chối phải có từ 1 đến 2000 ký tự.");
      setDecision(null);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let sent = false;
    let committed = false;
    try {
      const latest = await read();
      if (!isCurrent()) return;
      setProfile(latest);
      if (latest.status !== "PENDING") {
        setNotice("Hồ sơ đã được xử lý. Đã tải trạng thái mới nhất.");
        return;
      }
      sent = true;
      await api.post(`${endpoint}/review`, { approve, reason: trimmed });
      committed = true;
      if (!isCurrent()) return;
      setUncertain(true);
      setReason("");
      setNotice("Đã gửi quyết định, đang tải trạng thái mới…");
      const refreshed = await read();
      if (!isCurrent()) return;
      setProfile(refreshed);
      setUncertain(false);
      setNotice(approve ? "Đã phê duyệt hồ sơ và cấp quyền BTC." : "Đã từ chối hồ sơ.");
    } catch (cause) {
      if (!isCurrent()) return;
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      if (committed) {
        setUncertain(true);
        setError("Đã gửi quyết định, chưa tải được trạng thái mới. Hãy tải lại trạng thái trước khi tiếp tục.");
      } else if (sent && (status === undefined || status >= 500 || status === 409)) {
        setUncertain(true);
        try {
          const latest = await read();
          if (!isCurrent()) return;
          setProfile(latest);
          setUncertain(false);
          setNotice(latest.status === "PENDING"
            ? "Hồ sơ vẫn chờ duyệt. Kiểm tra lại trước khi gửi quyết định mới."
            : "Hồ sơ đã được xử lý. Đã tải trạng thái mới nhất.");
          setError(latest.status === "PENDING" ? message(cause) : "");
        } catch {
          if (isCurrent()) setError("Chưa xác định được kết quả xét duyệt. Hãy tải lại trạng thái; quyết định sẽ không tự động gửi lại.");
        }
      } else {
        setError(message(cause));
      }
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        setDecision(null);
      }
    }
  }

  const website = websiteUrl(profile?.website_or_social ?? null);
  const canReview = profile?.status === "PENDING" && !busy && !loading && !uncertain && isCurrent();

  return (
    <AdminShell title="Chi tiết hồ sơ đăng ký BTC">
      <style>{styles}</style>
      <div className="c6-detail-page">
        <nav className="c6-detail-breadcrumb" aria-label="Đường dẫn trang">
          <Link to={backPath}>Hồ sơ đăng ký BTC</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Chi tiết hồ sơ</span>
        </nav>
        <header className="c6-detail-heading">
          <div>
            <span className="c6-detail-eyebrow"><ShieldCheck size={15} aria-hidden="true" /> XÉT DUYỆT BAN TỔ CHỨC</span>
            <h1>Chi tiết hồ sơ đăng ký Ban Tổ Chức</h1>
            <p>Xem thông tin đăng ký và quyết định xét duyệt hồ sơ.</p>
          </div>
          <Link className="c6-detail-button" to={backPath}>
            <ArrowLeft size={17} aria-hidden="true" /> Quay lại danh sách
          </Link>
        </header>
        {notice && <p className="c6-detail-notice" role="status">{notice}</p>}
        {error && (
          <div className="c6-detail-error" role="alert">
            <p>{error}</p>
            <button type="button" disabled={busy || loading} onClick={() => setRetry(value => value + 1)}>
              {uncertain ? "Tải lại trạng thái" : "Thử lại"}
            </button>
          </div>
        )}
        {loading ? <p className="c6-detail-state" role="status">Đang tải hồ sơ đăng ký BTC…</p> : profile ? (
          <div className="c6-detail-grid">
            <section className="c6-detail-card c6-detail-profile" aria-labelledby="c6-detail-name">
              <div className="c6-detail-identity">
                <span className="c6-detail-logo">
                  {profile.logo_url && !logoFailed ? (
                    <img src={profile.logo_url} alt="" onError={() => setLogoFailed(true)} />
                  ) : profile.organization_name.trim().slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <span className="c6-detail-eyebrow">THÔNG TIN TỔ CHỨC</span>
                  <h2 id="c6-detail-name">{profile.organization_name}</h2>
                  <span className={`c6-detail-badge ${profile.status.toLowerCase()}`}>{labels[profile.status]}</span>
                </div>
              </div>
              <dl className="c6-detail-fields">
                {[
                  ["Tên doanh nghiệp đăng ký", profile.business_name],
                  ["MST / giấy phép khai báo", profile.tax_id_or_business_license],
                  ["Địa chỉ trụ sở", profile.head_office_address],
                  ["Người liên hệ", profile.contact_name],
                  ["Email", profile.contact_email],
                  ["Điện thoại", profile.contact_phone],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "Chưa cập nhật"}</dd>
                  </div>
                ))}
                <div>
                  <dt>Website / mạng xã hội</dt>
                  <dd>{website ? <a href={website} target="_blank" rel="noopener noreferrer">{profile.website_or_social}</a>
                    : profile.website_or_social || "Chưa cập nhật"}</dd>
                </div>
              </dl>
            </section>
            <div className="c6-detail-content">
              <section className="c6-detail-card" aria-labelledby="c6-detail-registration">
                <h2 id="c6-detail-registration"><Building2 size={20} aria-hidden="true" /> Nội dung đăng ký</h2>
                <dl className="c6-detail-fields">
                  {[
                    ["Giới thiệu tổ chức", profile.description],
                    ["Danh mục sự kiện chính", profile.main_event_category],
                    ["Quy mô dự kiến", profile.expected_event_scale],
                    ["Ngày nộp", dateTime(profile.created_at)],
                    ["Ngày xét duyệt", dateTime(profile.reviewed_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Chưa cập nhật"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="c6-detail-card" aria-labelledby="c6-detail-legal">
                <h2 id="c6-detail-legal"><FileText size={20} aria-hidden="true" /> Thẩm tra pháp lý</h2>
                <p className="c6-detail-muted">Các công cụ thẩm tra đang phát triển, chưa cung cấp kết quả xác minh tự động.</p>
                <div className="c6-detail-checks">
                  {legalChecks.map(label => (
                    <button key={label} type="button" onClick={() => setToast("Chức năng đang phát triển")}>
                      {label}<small>Đang phát triển</small>
                    </button>
                  ))}
                </div>
              </section>
              <section className="c6-detail-card" aria-labelledby="c6-detail-decision">
                <h2 id="c6-detail-decision" ref={decisionHeading} tabIndex={-1}><ShieldCheck size={20} aria-hidden="true" /> Quyết định xét duyệt</h2>
                {profile.status === "PENDING" ? (
                  <>
                    <label className="c6-detail-reason" htmlFor="c6-detail-reason">Lý do (bắt buộc khi từ chối)</label>
                    <textarea
                      id="c6-detail-reason"
                      value={reason}
                      onChange={event => setReason(event.target.value)}
                      disabled={!canReview}
                      maxLength={2000}
                      rows={5}
                      aria-describedby="c6-detail-reason-help"
                    />
                    <p id="c6-detail-reason-help" className="c6-detail-muted">{reason.length}/2000 ký tự. Chỉ hồ sơ chờ duyệt mới có thể gửi quyết định.</p>
                    <div className="c6-detail-actions">
                      <button type="button" className="danger" disabled={!canReview || !reason.trim()} onClick={event => { lastAction.current = event.currentTarget; setDecision(false); }}>
                        <XCircle size={17} aria-hidden="true" /> Từ chối hồ sơ
                      </button>
                      <button type="button" className="primary" disabled={!canReview} onClick={event => { lastAction.current = event.currentTarget; setDecision(true); }}>
                        <CheckCircle2 size={17} aria-hidden="true" /> {busy ? "Đang xử lý…" : "Phê duyệt & cấp quyền BTC"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="c6-detail-result">
                    <p><strong>{labels[profile.status]}</strong> · {dateTime(profile.reviewed_at)}</p>
                    {profile.status === "REJECTED" && <p className="c6-detail-rejection">Lý do từ chối: {profile.rejection_reason || "Chưa có thông tin"}</p>}
                    <p>Hồ sơ đã được xử lý và chỉ có thể xem thông tin.</p>
                  </div>
                )}
                {uncertain && <button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>Tải lại trạng thái</button>}
              </section>
            </div>
          </div>
        ) : null}
        {toast && <p className="c6-detail-toast" role="status">{toast}</p>}
        <Dialog.Root open={decision !== null} onOpenChange={open => { if (!open && !busy) setDecision(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="c6-detail-overlay" />
            <Dialog.Content
              className="c6-detail-confirm"
              onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
              onPointerDownOutside={event => { if (busy) event.preventDefault(); }}
              onCloseAutoFocus={event => {
                event.preventDefault();
                if (lastAction.current?.isConnected && !lastAction.current.disabled) lastAction.current.focus();
                else decisionHeading.current?.focus();
              }}
            >
              <Dialog.Title>{decision ? "Xác nhận phê duyệt hồ sơ" : "Xác nhận từ chối hồ sơ"}</Dialog.Title>
              <Dialog.Description>
                {decision ? "Phê duyệt và cấp quyền ORGANIZER cho" : "Từ chối hồ sơ của"} {profile?.organization_name}?
              </Dialog.Description>
              {decision === false && <p className="c6-detail-confirm-reason">Lý do: {reason.trim()}</p>}
              <div className="c6-detail-actions">
                <Dialog.Close asChild><button type="button" disabled={busy}><X size={16} aria-hidden="true" /> Hủy</button></Dialog.Close>
                <button type="button" className={decision ? "primary" : "danger"} disabled={busy} onClick={() => void submit()}>
                  {busy ? "Đang xử lý…" : "Xác nhận"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AdminShell>
  );
}

const styles = `
.c6-detail-page {
  padding: 24px;
  min-height: calc(100vh - 80px);
  color: #e0e1f7;
  font-family: 'Be Vietnam Pro', sans-serif;
}
.c6-detail-page *, .c6-detail-confirm * {
  box-sizing: border-box;
}
.c6-detail-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  font: 500 12px 'Space Grotesk', sans-serif;
}
.c6-detail-page a {
  color: #5de6ff;
  overflow-wrap: anywhere;
}
.c6-detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}
.c6-detail-heading h1 {
  margin: 8px 0;
  font: 700 30px/1.3 Be Vietnam Pro, sans-serif;
}
.c6-detail-heading p, .c6-detail-muted {
  color: #ccc3d8;
  font-size: 12px;
  line-height: 1.8;
}
.c6-detail-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5de6ff;
  font: 600 11px 'Space Grotesk', sans-serif;
  letter-spacing: .04em;
}
.c6-detail-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr);
  align-items: start;
  gap: 32px;
}
.c6-detail-card {
  min-width: 0;
  padding: 24px;
  border-radius: 12px;
  background: #181b2a;
}
.c6-detail-profile {
  background: radial-gradient(ellipse at top right, #7c3aed18, transparent 55%), #181b2a;
}
.c6-detail-identity {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}
.c6-detail-identity > div {
  min-width: 0;
}
.c6-detail-logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border: 2px solid #7c3aed;
  border-radius: 12px;
  background: #0a0d1c;
  color: #5de6ff;
  font: 700 24px Be Vietnam Pro, sans-serif;
}
.c6-detail-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.c6-detail-card h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 24px;
  font: 700 20px/1.4 Be Vietnam Pro, sans-serif;
  overflow-wrap: anywhere;
}
.c6-detail-identity h2 {
  margin: 8px 0 12px;
}
.c6-detail-content {
  display: grid;
  gap: 24px;
  min-width: 0;
}
.c6-detail-fields {
  display: grid;
  gap: 24px;
  margin: 0;
}
.c6-detail-fields dt {
  margin-bottom: 8px;
  color: #ccc3d8;
  font: 500 11px/1.6 'Space Grotesk', sans-serif;
  text-transform: uppercase;
}
.c6-detail-fields dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.c6-detail-badge {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 999px;
  color: #fbbf24;
  background: #f59e0b18;
  font-size: 11px;
}
.c6-detail-badge.approved {
  color: #5de6ff;
  background: #5de6ff18;
}
.c6-detail-badge.rejected {
  color: #ffb4ab;
  background: #ffb4ab18;
}
.c6-detail-checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.c6-detail-page button, .c6-detail-button, .c6-detail-confirm button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 14px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  background: #262939;
  color: #e0e1f7;
  font: 500 12px/1.5 'Be Vietnam Pro', sans-serif;
  text-decoration: none;
  cursor: pointer;
}
.c6-detail-button {
  flex-shrink: 0;
}
.c6-detail-checks button {
  flex-direction: column;
  align-items: flex-start;
}
.c6-detail-checks small {
  color: #ccc3d8;
  font-weight: 400;
}
.c6-detail-page button:disabled, .c6-detail-confirm button:disabled {
  opacity: .45;
  cursor: default;
}
.c6-detail-page :is(a, button, textarea):focus-visible, .c6-detail-confirm button:focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 3px;
}
.c6-detail-reason {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}
.c6-detail-page textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  background: #101322;
  color: #e0e1f7;
  font: 13px/1.8 'Be Vietnam Pro', sans-serif;
  resize: vertical;
}
.c6-detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.c6-detail-actions .primary {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #fff;
}
.c6-detail-actions .danger {
  border-color: #fb7185;
  background: #9f1239;
  color: #fff;
}
.c6-detail-error, .c6-detail-notice, .c6-detail-state {
  padding: 20px;
  margin-bottom: 24px;
  border-radius: 12px;
  background: #181b2a;
  font-size: 13px;
  line-height: 1.8;
}
.c6-detail-error {
  border: 1px solid #ffb4ab66;
  color: #ffb4ab;
}
.c6-detail-notice {
  border: 1px solid #5de6ff44;
  color: #a2eeff;
}
.c6-detail-result {
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.c6-detail-rejection, .c6-detail-confirm-reason {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.c6-detail-toast {
  position: fixed;
  z-index: 100;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  padding: 14px 20px;
  border: 1px solid #5de6ff66;
  border-radius: 8px;
  background: #182240;
  color: #e0e1f7;
}
.c6-detail-overlay {
  position: fixed;
  z-index: 150;
  inset: 0;
  background: #050610bd;
}
.c6-detail-confirm {
  position: fixed;
  z-index: 151;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  overflow: auto;
  padding: 24px;
  border: 1px solid #4a4455;
  border-radius: 12px;
  background: #181b2a;
  color: #e0e1f7;
  font: 13px/1.8 'Be Vietnam Pro', sans-serif;
}
.c6-detail-confirm h2 {
  font: 700 22px/1.4 Be Vietnam Pro, sans-serif;
}
@media (max-width: 1100px) {
  .c6-detail-heading {
    flex-direction: column;
    align-items: flex-start;
  }
  .c6-detail-grid {
    gap: 20px;
    grid-template-columns: minmax(240px, 1fr) minmax(0, 1.5fr);
  }
}
@media (max-width: 950px) {
  .c6-detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .c6-detail-page {
    padding: 20px 16px;
  }
  .c6-detail-heading h1 {
    font-size: 26px;
  }
  .c6-detail-card {
    padding: 20px;
  }
  .c6-detail-actions {
    flex-direction: column;
  }
  .c6-detail-actions button {
    width: 100%;
  }
}
`;
