import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Headset,
  Info,
  Link2,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRound,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import "./register-organizer.css";

const HERO_IMAGE =
  "https://res.cloudinary.com/qncrpmrb/image/upload/v1793090528/795256f4-8bf1-4556-8e61-23bc211b2600.png";
const DRAFT_KEY = "eventhub.register-organizer.draft.v1";
const HOTLINE = "0378531013";

const CATEGORY_OPTIONS = [
  "Âm nhạc Underground & Indie Livehouse",
  "Lễ hội Âm nhạc Điện tử EDM Festival",
  "Triển lãm & Trải nghiệm Nghệ thuật Số (Digital Art)",
  "Hội nghị Công nghệ & Hackathon",
  "Thời trang & Văn hóa Đường phố Streetwear",
];

const SCALE_OPTIONS = [
  "Quy mô nhỏ: Dưới 1.000 khách",
  "Quy mô vừa: 1.000 - 10.000 khách",
  "Đại nhạc hội Arena: 10.000 - 30.000 khách",
  "Mega Festival: Trên 30.000 khách",
];

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type OrganizerApplication = {
  id: string;
  user_id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  business_name: string;
  tax_id_or_business_license: string;
  website_or_social: string;
  head_office_address: string;
  main_event_category: string;
  expected_event_scale: string;
};

type FormState = {
  organizationName: string;
  contactEmail: string;
  contactPhone: string;
  businessName: string;
  taxIdOrBusinessLicense: string;
  websiteOrSocial: string;
  headOfficeAddress: string;
  mainEventCategory: string;
  expectedEventScale: string;
  description: string;
};

type Draft = {
  savedAt: string;
  form: Partial<FormState>;
};

type TabKey = "form" | "tracking";

const FORM_KEYS = [
  "organizationName",
  "contactEmail",
  "contactPhone",
  "businessName",
  "taxIdOrBusinessLicense",
  "websiteOrSocial",
  "headOfficeAddress",
  "mainEventCategory",
  "expectedEventScale",
  "description",
] as const satisfies readonly (keyof FormState)[];

const EMPTY_FORM: FormState = {
  organizationName: "",
  contactEmail: "",
  contactPhone: "",
  businessName: "",
  taxIdOrBusinessLicense: "",
  websiteOrSocial: "",
  headOfficeAddress: "",
  mainEventCategory: "",
  expectedEventScale: "",
  description: "",
};

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: string }
> = {
  PENDING: { label: "Chờ duyệt", tone: "warn" },
  APPROVED: { label: "Đã phê duyệt", tone: "ok" },
  REJECTED: { label: "Bị từ chối", tone: "danger" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnauthorized(error: unknown) {
  return (
    isRecord(error) &&
    isRecord(error.response) &&
    error.response.status === 401
  );
}

function extractMessage(error: unknown) {
  if (isRecord(error)) {
    if (isRecord(error.response) && isRecord(error.response.data)) {
      const message = error.response.data.message;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại.";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function shortCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      !isRecord(parsed.form) ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }
    const form: Partial<FormState> = {};
    for (const key of FORM_KEYS) {
      const value = parsed.form[key];
      if (typeof value === "string") form[key] = value;
    }
    const hasValue = FORM_KEYS.some((key) => (form[key] ?? "").trim().length > 0);
    if (!hasValue) return null;
    return { savedAt: parsed.savedAt, form };
  } catch {
    return null;
  }
}

function Field({
  label,
  icon,
  required = false,
  className = "",
  multiline = false,
  children,
}: {
  label: string;
  icon: ReactNode;
  required?: boolean;
  className?: string;
  multiline?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`reg-field${className ? ` ${className}` : ""}`}>
      <span className="reg-field-label">
        {label}
        {required && <em aria-hidden="true">*</em>}
      </span>
      <span className={`reg-control${multiline ? " is-textarea" : ""}`}>
        {icon}
        {children}
      </span>
    </label>
  );
}

function StatusIcon({ status }: { status: ApplicationStatus }) {
  if (status === "APPROVED") return <CheckCircle2 size={13} />;
  if (status === "REJECTED") return <XCircle size={13} />;
  return <Clock3 size={13} />;
}

function ApplicationSteps({ status }: { status: ApplicationStatus }) {
  const reviewed = status !== "PENDING";
  return (
    <ol className={`reg-steps status-${status.toLowerCase()}`}>
      <li className="is-done">
        <span>1</span>
        <b>Đã nộp</b>
      </li>
      <li className={reviewed ? "is-done" : "is-active"}>
        <span>2</span>
        <b>Xét duyệt</b>
      </li>
      <li
        className={
          !reviewed
            ? ""
            : status === "APPROVED"
              ? "is-done"
              : "is-rejected"
        }
      >
        <span>3</span>
        <b>Kết quả</b>
      </li>
    </ol>
  );
}

function ApplicationCard({
  application,
  onReapply,
}: {
  application: OrganizerApplication;
  onReapply: (application: OrganizerApplication) => void;
}) {
  const meta = STATUS_META[application.status];
  return (
    <article
      className={`reg-app-card status-${application.status.toLowerCase()}`}
    >
      <div className="reg-app-head">
        <div>
          <span className="reg-app-code" title={application.id}>
            Mã hồ sơ: {shortCode(application.id)}
          </span>
          <h3>{application.business_name || application.organization_name}</h3>
        </div>
        <span
          className={`reg-status reg-status-${application.status.toLowerCase()}`}
        >
          <StatusIcon status={application.status} />
          {meta.label}
        </span>
      </div>

      <div className="reg-app-meta">
        <span>
          <Mail size={12} aria-hidden="true" />
          {application.contact_email}
        </span>
        <span>
          <Clock3 size={12} aria-hidden="true" />
          Nộp lúc {formatDate(application.created_at) || "—"}
        </span>
        {application.reviewed_at && (
          <span>
            <CheckCircle2 size={12} aria-hidden="true" />
            Xét duyệt lúc {formatDate(application.reviewed_at)}
          </span>
        )}
      </div>

      <ApplicationSteps status={application.status} />

      {application.status === "PENDING" && (
        <div className="reg-app-message is-pending">
          <Clock3 size={16} aria-hidden="true" />
          <div>
            <strong>Hồ sơ đang chờ xét duyệt</strong>
            <p>
              Hồ sơ đã được ghi nhận. Quản trị viên EventHub sẽ xem xét và cập
              nhật kết quả tại đây.
            </p>
          </div>
        </div>
      )}

      {application.status === "APPROVED" && (
        <div className="reg-app-message is-approved">
          <CheckCircle2 size={16} aria-hidden="true" />
          <div>
            <strong>Hồ sơ đã được phê duyệt</strong>
            <p>
              Tài khoản đã được cấp quyền Ban tổ chức. Nếu khu vực Organizer
              chưa mở, hãy tải lại trang hoặc đăng nhập lại.
            </p>
            <Link to="/organizer">
              Vào khu vực Organizer <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {application.status === "REJECTED" && (
        <div className="reg-app-message is-rejected">
          <XCircle size={16} aria-hidden="true" />
          <div>
            <strong>Hồ sơ chưa được phê duyệt</strong>
            <p>Bạn có thể bổ sung thông tin và gửi lại một hồ sơ mới.</p>
            {application.rejection_reason && (
              <div className="reg-reason">
                <b>Lý do từ chối:</b> {application.rejection_reason}
              </div>
            )}
            <button
              type="button"
              className="register-btn register-btn-ghost reg-reapply"
              onClick={() => onReapply(application)}
            >
              <RefreshCw size={13} aria-hidden="true" />
              Nộp lại hồ sơ
            </button>
          </div>
        </div>
      )}

      <details className="reg-app-details">
        <summary>Chi tiết hồ sơ</summary>
        <dl>
          <div>
            <dt>Người đại diện</dt>
            <dd>{application.organization_name}</dd>
          </div>
          <div>
            <dt>Doanh nghiệp / nhóm nghệ thuật</dt>
            <dd>{application.business_name}</dd>
          </div>
          <div>
            <dt>Email liên hệ</dt>
            <dd>{application.contact_email}</dd>
          </div>
          <div>
            <dt>Điện thoại</dt>
            <dd>{application.contact_phone}</dd>
          </div>
          <div>
            <dt>Mã số thuế / giấy phép</dt>
            <dd>{application.tax_id_or_business_license}</dd>
          </div>
          <div>
            <dt>Website / mạng xã hội</dt>
            <dd>{application.website_or_social}</dd>
          </div>
          <div>
            <dt>Thể loại chủ đạo</dt>
            <dd>{application.main_event_category}</dd>
          </div>
          <div>
            <dt>Quy mô dự kiến</dt>
            <dd>{application.expected_event_scale}</dd>
          </div>
          <div className="is-wide">
            <dt>Trụ sở / địa bàn vận hành</dt>
            <dd>{application.head_office_address}</dd>
          </div>
          <div className="is-wide">
            <dt>Mô tả hồ sơ</dt>
            <dd>{application.description}</dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

export function RegisterOrganizer() {
  const user = useAuth((state) => state.user);
  const isAuthVerified = useAuth((state) => state.isAuthVerified);
  const revision = useAuth((state) => state.revision);
  const navigate = useNavigate();
  const userId = user?.idUser ?? null;

  const [tab, setTab] = useState<TabKey>("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [applications, setApplications] = useState<OrganizerApplication[] | null>(
    null,
  );
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");
  const [appsUnauthorized, setAppsUnauthorized] = useState(false);
  const [query, setQuery] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);

  const prefilledForm = useCallback(
    (source?: Partial<FormState>): FormState => ({
      ...EMPTY_FORM,
      organizationName: user?.name ?? "",
      contactEmail: user?.email ?? "",
      contactPhone: user?.phone ?? "",
      ...source,
    }),
    [user],
  );

  useEffect(() => {
    const saved = readDraft();
    if (!saved) return;
    setForm((current) => ({ ...current, ...saved.form }));
    setDraftNotice(
      `Đã khôi phục bản nháp lưu lúc ${formatDate(saved.savedAt) || "trước đó"}.`,
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      organizationName: current.organizationName || user.name || "",
      contactEmail: current.contactEmail || user.email || "",
      contactPhone: current.contactPhone || user.phone || "",
    }));
  }, [user]);

  const loadApplications = useCallback(async () => {
    if (!userId) {
      setApplications(null);
      setAppsError("");
      setAppsUnauthorized(false);
      setAppsLoading(false);
      return;
    }
    setAppsLoading(true);
    setAppsError("");
    setAppsUnauthorized(false);
    try {
      const response = await api.get<{
        success: boolean;
        data: OrganizerApplication[];
      }>("/me/organizer-applications");
      setApplications(
        Array.isArray(response.data.data) ? response.data.data : [],
      );
    } catch (error) {
      setApplications(null);
      if (isUnauthorized(error)) {
        setAppsUnauthorized(true);
        setAppsError(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để theo dõi hồ sơ.",
        );
      } else {
        setAppsError(extractMessage(error));
      }
    } finally {
      setAppsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setQuery("");
    void loadApplications();
  }, [loadApplications, revision]);

  useEffect(() => {
    if (!success) return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [success]);

  const latest = applications?.[0] ?? null;
  const pendingApplication =
    applications?.find((application) => application.status === "PENDING") ??
    null;
  const hasApprovedApplication =
    applications?.some((application) => application.status === "APPROVED") ??
    false;
  const isOrganizer = Boolean(
    user?.roles.some((role) => role === "ORGANIZER" || role === "ADMIN"),
  );
  const approvedView = isOrganizer || hasApprovedApplication;

  const heroLabel = !user
    ? "Đăng nhập để theo dõi"
    : appsLoading && !applications
      ? "Đang tải hồ sơ"
      : latest
        ? STATUS_META[latest.status].label
        : approvedView
          ? "Đã có quyền Ban tổ chức"
          : "Sẵn sàng nộp hồ sơ";
  const heroTone = latest
    ? STATUS_META[latest.status].tone
    : approvedView
      ? "ok"
      : "";
  const heroNote = latest
    ? `${latest.business_name || latest.organization_name} • ${
        formatDate(latest.created_at) || "Vừa cập nhật"
      }`
    : user
      ? approvedView
        ? "Truy cập khu vực Organizer để quản lý sự kiện."
        : "Hồ sơ được xem xét bởi quản trị viên EventHub."
      : "Theo dõi trạng thái ngay trên EventHub.";

  const filteredApplications = useMemo(() => {
    const list = applications ?? [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter((application) =>
      [
        application.id,
        application.business_name,
        application.organization_name,
        application.contact_email,
        shortCode(application.id),
      ].some((value) => value?.toLowerCase().includes(keyword)),
    );
  }, [applications, query]);

  const hasDraftContent = FORM_KEYS.some(
    (key) => form[key].trim().length > 0,
  );

  function changeTab(next: TabKey) {
    setTab(next);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: TabKey = tab === "form" ? "tracking" : "form";
    setTab(next);
    document.getElementById(`reg-tab-${next}`)?.focus();
  }

  function saveDraft() {
    if (!hasDraftContent) {
      setDraftNotice("Chưa có thông tin để lưu nháp.");
      return;
    }
    const savedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ savedAt, form }),
      );
      setDraftNotice(`Đã lưu bản nháp lúc ${formatDate(savedAt)}.`);
    } catch {
      setDraftNotice("Không thể lưu bản nháp trên trình duyệt này.");
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // The browser may block storage; the form still works without a draft.
    }
    setDraftNotice("Đã xóa bản nháp đã lưu.");
  }

  function goToLogin() {
    if (hasDraftContent) saveDraft();
    navigate("/auth/login", { state: { from: "/register-organizer" } });
  }

  function reapply(application: OrganizerApplication) {
    setForm({
      organizationName: application.organization_name,
      contactEmail: application.contact_email,
      contactPhone: application.contact_phone,
      businessName: application.business_name,
      taxIdOrBusinessLicense: application.tax_id_or_business_license,
      websiteOrSocial: application.website_or_social,
      headOfficeAddress: application.head_office_address,
      mainEventCategory: application.main_event_category,
      expectedEventScale: application.expected_event_scale,
      description: application.description,
    });
    setConfirmed(false);
    setFormError("");
    setSuccess("");
    setTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (!isAuthVerified) {
      setFormError(
        "Đang kiểm tra phiên đăng nhập. Vui lòng thử lại sau giây lát.",
      );
      return;
    }

    if (!user) {
      goToLogin();
      return;
    }

    if (pendingApplication) {
      setTab("tracking");
      setFormError(
        "Bạn đã có hồ sơ đang chờ duyệt. Vui lòng theo dõi kết quả trước khi gửi hồ sơ mới.",
      );
      return;
    }

    if (!confirmed) {
      setFormError(
        "Vui lòng xác nhận thông tin cung cấp là chính xác trước khi gửi hồ sơ.",
      );
      return;
    }

    if (form.description.trim().length < 100) {
      setFormError("Mô tả hồ sơ cần tối thiểu 100 ký tự.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        organizationName: form.organizationName.trim(),
        contactName: form.organizationName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        businessName: form.businessName.trim(),
        taxIdOrBusinessLicense: form.taxIdOrBusinessLicense.trim(),
        websiteOrSocial: form.websiteOrSocial.trim(),
        headOfficeAddress: form.headOfficeAddress.trim(),
        mainEventCategory: form.mainEventCategory.trim(),
        expectedEventScale: form.expectedEventScale.trim(),
        description: form.description.trim(),
      };
      const response = await api.post<{
        success: boolean;
        data: OrganizerApplication;
      }>("/me/organizer-applications", payload);
      const created = response.data.data;
      setApplications((current) => [
        created,
        ...(current ?? []).filter((item) => item.id !== created.id),
      ]);
      setConfirmed(false);
      setForm(prefilledForm());
      setSuccess(
        `Hồ sơ ${shortCode(created.id)} đã được gửi thành công. Bạn có thể theo dõi trạng thái tại tab “Theo dõi trạng thái hồ sơ”.`,
      );
      setDraftNotice("");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore storage failures; the draft is only a local convenience.
      }
      setTab("tracking");
    } catch (error) {
      setFormError(extractMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-shell">
        <section className="register-hero" aria-labelledby="register-title">
          <div className="register-hero-copy">
            <div className="register-breadcrumb">
              <div className="eventhub-network--register">
                <span>EventHub Network</span>
                </div>
              <span aria-hidden="true">/</span>
              <b>Hồ sơ Ban tổ chức</b>
            </div>
            <h1 id="register-title">
              Trở thành <span>Ban tổ chức</span>
              <br />
              cùng EventHub
            </h1>
            <p>
              Phát hành vé số hóa, phân phối sự kiện âm nhạc, công nghệ và nghệ
              thuật tới đông đảo khán giả với hệ thống check-in QR bảo mật. Tiếp
              lửa năng lượng văn hóa đường phố và đại tiệc âm thanh vũ trụ.
            </p>
            <ul className="register-hero-features">
              <li>
                <Zap size={16} aria-hidden="true" />
                Kích hoạt nhanh trong 48H
              </li>
              <li>
                <QrCode size={16} aria-hidden="true" />
                POS QR chống gian lận
              </li>
              <li>
                <Wallet size={16} aria-hidden="true" />
                Đối soát doanh thu tức thì
              </li>
            </ul>
          </div>

          <div className="register-hero-visual">
            <img
              src={HERO_IMAGE}
              alt="Đăng ký Ban tổ chức và xét duyệt hồ sơ cùng EventHub"
            />
            <span className="register-hero-visual-shade" aria-hidden="true" />
            <div className="register-hero-badges">
              <span className="register-partner-badge">
                <Sparkles size={11} aria-hidden="true" />
                Cấp phép Partner
              </span>
              <span className="register-version">VER. 2026</span>
            </div>
            <div className="register-hero-status" aria-live="polite">
              <span>
                {latest ? "Hồ sơ gần nhất" : "Hồ sơ Ban tổ chức"}
              </span>
              <strong className={heroTone ? `tone-${heroTone}` : undefined}>
                {heroLabel}
              </strong>
              <small title={heroNote}>{heroNote}</small>
            </div>
          </div>
        </section>

        <div className="register-tabs-row">
          <div className="register-tabs" role="tablist" aria-label="Hồ sơ Ban tổ chức">
            <button
              id="reg-tab-form"
              type="button"
              role="tab"
              className={`register-tab${tab === "form" ? " is-active" : ""}`}
              aria-selected={tab === "form"}
              aria-controls="reg-panel-form"
              tabIndex={tab === "form" ? 0 : -1}
              onClick={() => changeTab("form")}
              onKeyDown={handleTabKeyDown}
            >
              <FileText size={15} aria-hidden="true" />
              Nộp hồ sơ đăng ký mới
            </button>
            <button
              id="reg-tab-tracking"
              type="button"
              role="tab"
              className={`register-tab${tab === "tracking" ? " is-active" : ""}`}
              aria-selected={tab === "tracking"}
              aria-controls="reg-panel-tracking"
              tabIndex={tab === "tracking" ? 0 : -1}
              onClick={() => changeTab("tracking")}
              onKeyDown={handleTabKeyDown}
            >
              <Clock3 size={15} aria-hidden="true" />
              Theo dõi trạng thái hồ sơ
              {pendingApplication && (
                <span className="register-tab-dot" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="register-hotline">
            <Headset size={15} aria-hidden="true" />
            Cần trợ giúp đăng ký? Liên hệ:
            <a href={`tel:${HOTLINE}`}>{HOTLINE}</a>
          </p>
        </div>

        <div className="register-layout">
          <div className="register-panel" ref={panelRef}>
            {tab === "form" ? (
              approvedView ? (
                <section
                  id="reg-panel-form"
                  role="tabpanel"
                  aria-labelledby="reg-tab-form"
                  className="register-main-card reg-approved"
                >
                  <div className="reg-approved-icon">
                    <BadgeCheck size={36} aria-hidden="true" />
                  </div>
                  <h2>Bạn đã có quyền Ban tổ chức</h2>
                  <p>
                    Tài khoản của bạn đã được cấp quyền tổ chức sự kiện trên
                    EventHub. Hãy vào khu vực Organizer để tạo sự kiện, cấu hình
                    vé và theo dõi hoạt động bán vé.
                  </p>
                  <div className="reg-approved-actions">
                    <Link className="register-btn register-btn-submit" to="/organizer">
                      Vào khu vực Organizer <ArrowRight size={15} />
                    </Link>
                    <Link className="register-btn register-btn-ghost" to="/organizer/new">
                      Tạo sự kiện mới
                    </Link>
                  </div>
                </section>
              ) : (
                <form
                  id="reg-panel-form"
                  role="tabpanel"
                  aria-labelledby="reg-tab-form"
                  className="register-main-card"
                  noValidate={!user}
                  onSubmit={handleSubmit}
                >
                  {success && (
                    <div className="reg-alert reg-alert-success" role="status">
                      <CheckCircle2 size={17} aria-hidden="true" />
                      <div>
                        <strong>Gửi hồ sơ thành công</strong>
                        <p>{success}</p>
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="reg-alert reg-alert-error" role="alert">
                      <AlertTriangle size={17} aria-hidden="true" />
                      <div>
                        <strong>Chưa thể gửi hồ sơ</strong>
                        <p>{formError}</p>
                      </div>
                    </div>
                  )}

                  {pendingApplication && (
                    <div className="reg-alert reg-alert-warn">
                      <Clock3 size={17} aria-hidden="true" />
                      <div>
                        <strong>Bạn đã có hồ sơ đang chờ duyệt</strong>
                        <p>
                          Không thể gửi thêm hồ sơ mới cho đến khi hồ sơ hiện
                          tại được xử lý. Bạn vẫn có thể lưu bản nháp cho lần
                          nộp sau.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="register-btn register-btn-ghost"
                        onClick={() => setTab("tracking")}
                      >
                        Theo dõi
                      </button>
                    </div>
                  )}

                  {latest?.status === "REJECTED" && !pendingApplication && (
                    <div className="reg-alert reg-alert-error">
                      <AlertTriangle size={17} aria-hidden="true" />
                      <div>
                        <strong>Hồ sơ gần nhất chưa được phê duyệt</strong>
                        <p>
                          {latest.rejection_reason ||
                            "Bạn có thể bổ sung thông tin và gửi lại hồ sơ mới."}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="register-btn register-btn-ghost"
                        onClick={() => setTab("tracking")}
                      >
                        Xem hồ sơ
                      </button>
                    </div>
                  )}

                  {!user && isAuthVerified && (
                    <div className="reg-alert reg-alert-info">
                      <Info size={17} aria-hidden="true" />
                      <div>
                        <strong>Bạn chưa đăng nhập</strong>
                        <p>
                          Bạn có thể điền trước và lưu bản nháp. Khi gửi hồ sơ,
                          hệ thống sẽ yêu cầu đăng nhập rồi quay lại trang này.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="register-btn register-btn-ghost"
                        onClick={goToLogin}
                      >
                        Đăng nhập
                      </button>
                    </div>
                  )}

                  <section className="register-section">
                    <div className="register-section-head">
                      <span className="register-section-number">01</span>
                      <div>
                        <h2>Thông tin người đại diện</h2>
                        <p>
                          Đầu mối chịu trách nhiệm pháp lý và điều phối hoạt
                          động trực tiếp với EventHub.
                        </p>
                      </div>
                    </div>
                    <div className="register-grid">
                      <Field
                        className="span-2"
                        label="Họ và tên người đại diện"
                        required
                        icon={<UserRound size={16} aria-hidden="true" />}
                      >
                        <input
                          name="organizationName"
                          value={form.organizationName}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              organizationName: event.target.value,
                            }))
                          }
                          placeholder="Nhập họ và tên người đại diện"
                          maxLength={150}
                          autoComplete="name"
                          required
                        />
                      </Field>
                      <Field
                        label="Email liên hệ chính thức"
                        required
                        icon={<Mail size={16} aria-hidden="true" />}
                      >
                        <input
                          name="contactEmail"
                          type="email"
                          value={form.contactEmail}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              contactEmail: event.target.value,
                            }))
                          }
                          placeholder="email@doanhnghiep.vn"
                          maxLength={254}
                          autoComplete="email"
                          required
                        />
                      </Field>
                      <Field
                        label="Số điện thoại tiếp nhận OTP"
                        required
                        icon={<Phone size={16} aria-hidden="true" />}
                      >
                        <input
                          name="contactPhone"
                          type="tel"
                          value={form.contactPhone}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              contactPhone: event.target.value,
                            }))
                          }
                          placeholder="Số điện thoại liên hệ"
                          maxLength={30}
                          autoComplete="tel"
                          required
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="register-section">
                    <div className="register-section-head">
                      <span className="register-section-number">02</span>
                      <div>
                        <h2>Thông tin tổ chức / Doanh nghiệp</h2>
                        <p>
                          Thông tin pháp nhân dùng cho việc xác minh hồ sơ và
                          vận hành sự kiện.
                        </p>
                      </div>
                    </div>
                    <div className="register-grid">
                      <Field
                        className="span-2"
                        label="Tên doanh nghiệp / Nhóm nghệ thuật"
                        required
                        icon={<ReceiptText size={16} aria-hidden="true" />}
                      >
                        <input
                          name="businessName"
                          value={form.businessName}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              businessName: event.target.value,
                            }))
                          }
                          placeholder="Tên doanh nghiệp hoặc nhóm nghệ thuật"
                          maxLength={200}
                          autoComplete="organization"
                          required
                        />
                      </Field>
                      <Field
                        label="Mã số thuế / Giấy phép ĐKKD"
                        required
                        icon={<ReceiptText size={16} aria-hidden="true" />}
                      >
                        <input
                          name="taxIdOrBusinessLicense"
                          value={form.taxIdOrBusinessLicense}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              taxIdOrBusinessLicense: event.target.value,
                            }))
                          }
                          placeholder="Mã số thuế hoặc số giấy phép"
                          maxLength={100}
                          required
                        />
                      </Field>
                      <Field
                        label="Website / Kênh mạng xã hội chính"
                        required
                        icon={<Link2 size={16} aria-hidden="true" />}
                      >
                        <input
                          name="websiteOrSocial"
                          type="text"
                          value={form.websiteOrSocial}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              websiteOrSocial: event.target.value,
                            }))
                          }
                          placeholder="https://facebook.com/..."
                          maxLength={500}
                          autoComplete="url"
                          required
                        />
                      </Field>
                      <Field
                        className="span-2"
                        label="Địa chỉ trụ sở / Địa bàn vận hành chính"
                        required
                        icon={<MapPin size={16} aria-hidden="true" />}
                      >
                        <input
                          name="headOfficeAddress"
                          value={form.headOfficeAddress}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              headOfficeAddress: event.target.value,
                            }))
                          }
                          placeholder="Địa chỉ đầy đủ của trụ sở hoặc địa bàn vận hành"
                          maxLength={500}
                          autoComplete="street-address"
                          required
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="register-section">
                    <div className="register-section-head">
                      <span className="register-section-number">03</span>
                      <div>
                        <h2>Năng lực &amp; Kinh nghiệm tổ chức sự kiện</h2>
                        <p>
                          Giúp EventHub hiểu rõ kinh nghiệm, quy mô và nhu cầu
                          vận hành sự kiện của bạn.
                        </p>
                      </div>
                    </div>
                    <div className="register-grid">
                      <Field
                        label="Thể loại sự kiện chủ đạo"
                        required
                        icon={<Tags size={16} aria-hidden="true" />}
                      >
                        <select
                          name="mainEventCategory"
                          value={form.mainEventCategory}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              mainEventCategory: event.target.value,
                            }))
                          }
                          required
                        >
                          <option value="" disabled>
                            Chọn thể loại sự kiện
                          </option>
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label="Quy mô sự kiện dự kiến"
                        required
                        icon={<Users size={16} aria-hidden="true" />}
                      >
                        <select
                          name="expectedEventScale"
                          value={form.expectedEventScale}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              expectedEventScale: event.target.value,
                            }))
                          }
                          required
                        >
                          <option value="" disabled>
                            Chọn quy mô sự kiện
                          </option>
                          {SCALE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        className="span-2"
                        label="Mô tả về tổ chức / Lý do muốn trở thành Ban tổ chức / Kinh nghiệm tổ chức sự kiện"
                        required
                        multiline
                        icon={<FileText size={16} aria-hidden="true" />}
                      >
                        <textarea
                          id="reg-description"
                          name="description"
                          value={form.description}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Mô tả chi tiết về tổ chức, các sự kiện âm nhạc/văn hóa đã thực hiện, kinh nghiệm vận hành, quy mô khán giả tối đa và định hướng hợp tác cùng EventHub..."
                          minLength={100}
                          maxLength={2000}
                          aria-describedby="reg-description-hint"
                          required
                        />
                      </Field>
                    </div>
                    <div
                      className="register-description-meta"
                      id="reg-description-hint"
                    >
                      <span>
                        <Info size={12} aria-hidden="true" />
                        Tối thiểu 100 ký tự. Càng chi tiết hồ sơ càng thuận lợi
                        cho quá trình xét duyệt.
                      </span>
                      <span
                        className={`register-counter${
                          form.description.length > 0 &&
                          form.description.length < 100
                            ? " is-under"
                            : ""
                        }`}
                      >
                        {form.description.length} / 2000 ký tự
                      </span>
                    </div>
                  </section>

                  <label className="register-confirm">
                    <input
                      type="checkbox"
                      name="confirmation"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      required
                    />
                    <span>
                      Tôi xác nhận thông tin cung cấp đại diện cho{" "}
                      <strong>
                        {form.businessName.trim() || "tổ chức của tôi"}
                      </strong>{" "}
                      là hoàn toàn chính xác và chấp thuận tuân thủ các quy tắc
                      vận hành sự kiện, kiểm soát vé của EventHub.
                    </span>
                  </label>

                  <div className="register-actions">
                    <button
                      type="button"
                      className="register-btn register-btn-draft"
                      onClick={saveDraft}
                      disabled={busy}
                    >
                      <Save size={15} aria-hidden="true" />
                      Lưu bản nháp hồ sơ
                    </button>
                    <button
                      type="submit"
                      className="register-btn register-btn-submit"
                      disabled={busy || Boolean(pendingApplication)}
                    >
                      {busy ? (
                        <Loader2
                          className="is-spinning"
                          size={15}
                          aria-hidden="true"
                        />
                      ) : (
                        <Send size={15} aria-hidden="true" />
                      )}
                      {pendingApplication
                        ? "Đang chờ duyệt hồ sơ"
                        : !user
                          ? "Đăng nhập để gửi hồ sơ"
                          : "Gửi hồ sơ phê duyệt"}
                    </button>
                  </div>

                  {draftNotice && (
                    <p className="reg-draft-note" role="status">
                      {draftNotice}
                      <button type="button" onClick={clearDraft}>
                        Xóa bản nháp
                      </button>
                    </p>
                  )}
                </form>
              )
            ) : (
              <section
                id="reg-panel-tracking"
                role="tabpanel"
                aria-labelledby="reg-tab-tracking"
                className="register-main-card reg-tracking"
              >
                {success && (
                  <div className="reg-alert reg-alert-success" role="status">
                    <CheckCircle2 size={17} aria-hidden="true" />
                    <div>
                      <strong>Gửi hồ sơ thành công</strong>
                      <p>{success}</p>
                    </div>
                  </div>
                )}

                <div className="reg-tracking-head">
                  <span className="reg-eyebrow">
                    <Clock3 size={12} aria-hidden="true" />
                    Hệ thống tra cứu thời gian thực
                  </span>
                  <h2>Theo dõi trạng thái hồ sơ</h2>
                  <p>
                    Mỗi hồ sơ nộp lên được cấp một mã định danh duy nhất để theo
                    dõi trạng thái xét duyệt. Kết quả hiển thị bên dưới là dữ
                    liệu thực tế từ tài khoản của bạn.
                  </p>
                </div>

                {!user ? (
                  <div className="reg-empty">
                    <div className="reg-empty-icon">
                      <LogIn size={26} aria-hidden="true" />
                    </div>
                    <h3>Đăng nhập để theo dõi hồ sơ</h3>
                    <p>
                      Trạng thái hồ sơ được gắn với tài khoản đã nộp. Hãy đăng
                      nhập để xem tiến trình xét duyệt của bạn.
                    </p>
                    <Link
                      className="register-btn register-btn-submit"
                      to="/auth/login"
                      state={{ from: "/register-organizer" }}
                    >
                      <LogIn size={14} aria-hidden="true" />
                      Đăng nhập
                    </Link>
                  </div>
                ) : appsLoading ? (
                  <div className="reg-loading" role="status">
                    <Loader2 size={18} aria-hidden="true" />
                    Đang tải danh sách hồ sơ...
                  </div>
                ) : appsError ? (
                  <div className="reg-alert reg-alert-error" role="alert">
                    <AlertTriangle size={17} aria-hidden="true" />
                    <div>
                      <strong>Không tải được danh sách hồ sơ</strong>
                      <p>{appsError}</p>
                    </div>
                    {appsUnauthorized ? (
                      <Link
                        className="register-btn register-btn-ghost"
                        to="/auth/login"
                        state={{ from: "/register-organizer" }}
                      >
                        Đăng nhập
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="register-btn register-btn-ghost"
                        onClick={() => void loadApplications()}
                      >
                        <RefreshCw size={13} aria-hidden="true" />
                        Thử lại
                      </button>
                    )}
                  </div>
                ) : !applications?.length ? (
                  <div className="reg-empty">
                    <div className="reg-empty-icon">
                      <FileText size={26} aria-hidden="true" />
                    </div>
                    <h3>Chưa có hồ sơ nào</h3>
                    <p>
                      Bạn chưa nộp hồ sơ Ban tổ chức. Hãy hoàn thành biểu mẫu để
                      bắt đầu quá trình xét duyệt.
                    </p>
                    <button
                      type="button"
                      className="register-btn register-btn-submit"
                      onClick={() => setTab("form")}
                    >
                      Nộp hồ sơ ngay <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    {applications.length > 1 && (
                      <label className="reg-search">
                        <Search size={15} aria-hidden="true" />
                        <span className="sr-only">Tra cứu hồ sơ</span>
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Tra cứu theo mã hồ sơ, tên doanh nghiệp hoặc người đại diện..."
                          aria-label="Tra cứu hồ sơ"
                        />
                      </label>
                    )}

                    {filteredApplications.length ? (
                      <div className="reg-app-list">
                        {filteredApplications.map((application) => (
                          <ApplicationCard
                            key={application.id}
                            application={application}
                            onReapply={reapply}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="reg-empty">
                        <div className="reg-empty-icon">
                          <Search size={25} aria-hidden="true" />
                        </div>
                        <h3>Không tìm thấy hồ sơ phù hợp</h3>
                        <p>
                          Thử tra cứu bằng mã hồ sơ, tên doanh nghiệp hoặc email
                          liên hệ khác.
                        </p>
                        <button
                          type="button"
                          className="register-btn register-btn-ghost"
                          onClick={() => setQuery("")}
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </div>

          <aside className="register-sidebar" aria-label="Thông tin hỗ trợ">
            <section className="reg-side-card">
              <div className="reg-side-head">
                <h2>Cam kết thẩm định EventHub</h2>
                <span className="reg-side-badge">3 bước</span>
              </div>
              <p className="reg-side-lead">
                Mỗi hồ sơ Ban tổ chức được quản trị viên EventHub xem xét trước
                khi cấp quyền tổ chức sự kiện.
              </p>
              <ul className="reg-side-list">
                <li className="reg-side-item">
                  <span className="reg-side-icon">
                    <ShieldCheck size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Quy trình xét duyệt minh bạch</h3>
                    <p>
                      Theo dõi hồ sơ với ba trạng thái: Chờ duyệt, Đã phê duyệt
                      và Bị từ chối.
                    </p>
                  </div>
                </li>
                <li className="reg-side-item">
                  <span className="reg-side-icon">
                    <QrCode size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Quản lý sự kiện &amp; vé QR</h3>
                    <p>
                      Sau khi được duyệt, tạo sự kiện, cấu hình loại vé và
                      check-in QR trong khu vực Organizer.
                    </p>
                  </div>
                </li>
                <li className="reg-side-item">
                  <span className="reg-side-icon">
                    <Wallet size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Đối soát đơn hàng</h3>
                    <p>
                      Theo dõi đơn hàng, thanh toán và vé đã bán trong khu vực
                      quản lý.
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            <section className="reg-side-card reg-creative">
              <div className="reg-creative-head">
                <span>Creative Hub</span>
                <Sparkles size={14} aria-hidden="true" />
              </div>
              <div className="reg-creative-media">
                <img
                  src={HERO_IMAGE}
                  alt=""
                  loading="lazy"
                  aria-hidden="true"
                />
              </div>
              <h3>Nghệ thuật không biên giới</h3>
              <p>
                Đồng hành cùng các đơn vị tổ chức, nhóm nghệ sĩ độc lập và nhà
                sản xuất chương trình trên toàn quốc.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
