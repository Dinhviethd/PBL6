import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Apple,
  ArrowLeft,
  ArrowRight,
  //Drama,
  Eye,
  EyeOff,
  Fingerprint,
  Hourglass,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  Orbit,
  Phone,
  ShieldCheck,
  Ticket,
  UserPlus,
  UserRound,
  Zap,
} from "lucide-react";
import authService from "@/features/auth/services/authService";
import { useAuth } from "@/features/auth/stores/authStore";
import { message } from "@/features/ticketing/data";
import {
  AuthBackground,
  AuthFooter,
  AuthHeader,
  AuthSupport,
  AuthToast,
  type AuthMode,
  type AuthRole,
} from "./AuthShell";
import "./auth.css";

const STORAGE_KEY = "eventhub.auth.email";
const A11_REFERENCE_EMAIL = "";
const RESET_CODE_TTL_SECONDS = 5 * 60;

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  otp: string;
};

type FieldErrors = Partial<Record<keyof FormState | "terms", string>>;
type ResetStep = "request" | "verify-otp" | "reset-password";

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  otp: "",
};

function AuthField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  hint,
  icon,
  autoComplete,
  inputMode,
  placeholder,
  topRight,
  rightAction,
  disabled = false,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  icon: ReactNode;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  topRight?: ReactNode;
  rightAction?: ReactNode;
  disabled?: boolean;
}) {
  const generatedId = useId();
  const inputId = `auth-${name}-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <div className="auth-field-head">
        <label htmlFor={inputId}>{label}</label>
        {topRight}
      </div>
      <div className="auth-input">
        <span className="auth-input-icon" aria-hidden="true">
          {icon}
        </span>
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {rightAction}
      </div>
      {error ? (
        <p className="auth-field-error" id={errorId}>
          <AlertCircle size={12} aria-hidden="true" /> {error}
        </p>
      ) : hint ? (
        <p className="auth-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PasswordToggle({
  shown,
  onToggle,
  disabled,
}: {
  shown: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="auth-input-action"
      type="button"
      aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      aria-pressed={shown}
      onClick={onToggle}
      disabled={disabled}
    >
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score =
    value.length === 0
      ? 0
      : (value.length >= 8 ? 1 : 0) +
        (/[0-9]/.test(value) && /[a-zA-Z]/.test(value) ? 1 : 0) +
        (/[^a-zA-Z0-9]/.test(value) ? 1 : 0);
  const labels = ["Chưa nhập", "Yếu", "Trung bình", "Tuyệt đối"];
  return (
    <div className={`auth-strength auth-strength-${score}`}>
      <div className="auth-strength-bars" aria-hidden="true">
        <span className={score >= 1 ? "is-on" : ""} />
        <span className={score >= 2 ? "is-on" : ""} />
        <span className={score >= 3 ? "is-on" : ""} />
      </div>
      <span className="auth-strength-label" aria-live="polite">
        {labels[score]}
      </span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="auth-google" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
        fill="#EA4335"
      />
      <path
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
        fill="#4285F4"
      />
      <path
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
        fill="#FBBC05"
      />
      <path
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
        fill="#34A853"
      />
    </svg>
  );
}

function RoleSelector({
  role,
  onChange,
}: {
  role: AuthRole;
  onChange: (role: AuthRole) => void;
}) {
  return (
    <div
      className="auth-role"
      role="radiogroup"
      aria-label="Bạn tham gia với tư cách"
    >
      <button
        type="button"
        role="radio"
        aria-checked={role === "attendee"}
        className={`auth-role-option${role === "attendee" ? " is-active" : ""}`}
        onClick={() => onChange("attendee")}
      >
        <Ticket size={16} aria-hidden="true" />
        Khán Giả Mua Vé
      </button>
      {/* <button
        type="button"
        role="radio"
        aria-checked={role === "organizer"}
        className={`auth-role-option${role === "organizer" ? " is-active" : ""}`}
        onClick={() => onChange("organizer")}
      >
        <Drama size={16} aria-hidden="true" />
        Ban Tổ Chức / Đối Tác
      </button> */}
    </div>
  );
}

const tabs = [
  {
    mode: "login" as const,
    to: "/auth/login",
    label: "Đăng Nhập",
    icon: <LogIn size={18} />,
  },
  {
    mode: "register" as const,
    to: "/auth/register",
    label: "Đăng Ký Mới",
    icon: <UserPlus size={18} />,
  },
];

function AuthTabs({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = mode === "login" ? "/auth/register" : "/auth/login";
    navigate(next);
  }

  return (
    <div
      className="auth-tabs"
      role="tablist"
      aria-label="Đăng nhập hoặc đăng ký"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const active = mode === tab.mode;
        return (
          <Link
            key={tab.mode}
            to={tab.to}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`auth-tab${active ? " is-active" : ""}`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function SocialButtons({ onNotice }: { onNotice: (message: string) => void }) {
  return (
    <div className="auth-social" aria-label="Phương thức đăng nhập khác">
      <button
        type="button"
        onClick={() => onNotice("Đăng nhập bằng Google đang được phát triển.")}
      >
        <GoogleIcon /> Google
      </button>
      <button
        type="button"
        onClick={() => onNotice("Đăng nhập bằng Apple đang được phát triển.")}
      >
        <Apple size={16} fill="currentColor" /> Apple
      </button>
      <button
        type="button"
        onClick={() => onNotice("Đăng nhập bằng Passkey đang được phát triển.")}
      >
        <Fingerprint size={18} /> Passkey
      </button>
    </div>
  );
}

export function AuthPage({
  register = false,
  reset = false,
}: {
  register?: boolean;
  reset?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuth((state) => state.user);
  const mode: AuthMode = reset ? "reset" : register ? "register" : "login";

  const [role, setRole] = useState<AuthRole>("attendee");
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm,
    email: reset ? A11_REFERENCE_EMAIL : "",
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("request");
  const [resetSeconds, setResetSeconds] = useState(0);
  const [serverError, setServerError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (mode === "reset") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved)
      setForm((current) =>
        current.email ? current : { ...current, email: saved },
      );
  }, [mode]);

  useEffect(() => {
    setErrors({});
    setServerError("");
    setResetStep("request");
    setResetSeconds(0);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForm((current) => ({
      ...current,
      email: mode === "reset" ? A11_REFERENCE_EMAIL : current.email,
      password: "",
      confirmPassword: "",
      otp: "",
    }));
  }, [mode]);

  useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (state?.notice) setNotice(state.notice);
  }, [location.state]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (mode !== "reset" || resetSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResetSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, resetSeconds]);

  function updateField(key: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
      setServerError("");
    };
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const email = form.email.trim();
    const phone = form.phone.replace(/[\s.-]/g, "");

    if (!email) next.email = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Email chưa đúng định dạng.";

    if (mode === "login") {
      if (!form.password) next.password = "Vui lòng nhập mật khẩu.";
      return next;
    }

    if (mode === "register") {
      if (!form.name.trim()) next.name = "Vui lòng nhập họ và tên.";
      if (!phone) next.phone = "Vui lòng nhập số điện thoại.";
      else if (!/^(0|\+84)\d{9,10}$/.test(phone))
        next.phone = "Số điện thoại chưa hợp lệ.";
      if (!form.password) next.password = "Vui lòng nhập mật khẩu.";
      else if (form.password.length < 8)
        next.password = "Mật khẩu phải có ít nhất 8 ký tự.";
      if (!form.confirmPassword)
        next.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
      else if (form.confirmPassword !== form.password)
        next.confirmPassword = "Mật khẩu xác nhận không khớp.";
      if (!terms)
        next.terms = "Bạn cần đồng ý với điều khoản để tạo tài khoản.";
      return next;
    }

    if (resetStep === "verify-otp") {
      if (!form.otp.trim()) next.otp = "Vui lòng nhập mã xác nhận.";
      else if (!/^\d{6}$/.test(form.otp.trim()))
        next.otp = "Mã xác nhận phải gồm đúng 6 chữ số.";
      return next;
    }

    if (resetStep === "reset-password") {
      if (!form.password) next.password = "Vui lòng nhập mật khẩu mới.";
      else if (form.password.length < 8)
        next.password = "Mật khẩu phải có ít nhất 8 ký tự.";
      if (!form.confirmPassword)
        next.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
      else if (form.confirmPassword !== form.password)
        next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    return next;
  }

  function rememberEmail(enabled: boolean, email: string) {
    if (enabled) localStorage.setItem(STORAGE_KEY, email.trim());
    else localStorage.removeItem(STORAGE_KEY);
  }

  function safeRedirect(): string {
    const state = location.state as { from?: string } | null;
    const from = state?.from;
    return typeof from === "string" &&
      from.startsWith("/") &&
      !from.startsWith("//")
      ? from
      : "/";
  }

  async function resendResetCode() {
    if (busy || resetSeconds > 0) return;
    setBusy(true);
    setServerError("");
    try {
      await authService.forgotPassword({
        email: form.email.trim().toLowerCase(),
      });
      setResetSeconds(RESET_CODE_TTL_SECONDS);
      setForm((current) => ({ ...current, otp: "" }));
      setErrors((current) => ({ ...current, otp: undefined }));
      setNotice("Mã xác nhận mới đã được gửi đến email của bạn.");
    } catch (error) {
      setServerError(
        message(error) || "Không thể gửi lại mã xác nhận. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openEmailApp() {
    window.location.href = `mailto:${encodeURIComponent(form.email.trim())}`;
  }

  function formatResetCountdown(seconds: number) {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setServerError("");

    try {
      if (mode === "login") {
        const result = await authService.login({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
        rememberEmail(remember, form.email);

        const target = safeRedirect();
        if (target !== "/") {
          navigate(target, { replace: true });
        } else if (role === "organizer") {
          const roles = result.data?.user?.roles ?? [];
          navigate(
            roles.some((value) => ["ORGANIZER", "ADMIN"].includes(value))
              ? "/organizer"
              : "/",
            { replace: true },
          );
        } else {
          navigate("/", { replace: true });
        }
        return;
      }

      if (mode === "register") {
        await authService.register({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          phone: form.phone.trim() || undefined,
        });
        rememberEmail(remember, form.email);
        setNotice(
          role === "organizer"
            ? "Tài khoản đã được tạo với quyền khán giả. Bạn có thể liên hệ hỗ trợ để nâng cấp Ban tổ chức."
            : "Tạo tài khoản thành công. Chào mừng bạn đến với EVENTHUB!",
        );
        navigate(safeRedirect(), { replace: true });
        return;
      }

      const email = form.email.trim().toLowerCase();
      if (resetStep === "request") {
        await authService.forgotPassword({
          email,
        });
        setResetStep("verify-otp");
        setResetSeconds(RESET_CODE_TTL_SECONDS);
        setNotice("");
        return;
      }

      if (resetStep === "verify-otp") {
        await authService.verifyOTP({
          email,
          otp: form.otp.trim(),
        });
        setResetStep("reset-password");
        setErrors({});
        setServerError("");
        return;
      }

      if (resetStep === "reset-password") {
        await authService.resetPassword({
          email,
          otp: form.otp.trim(),
          newPassword: form.password,
          confirmPassword: form.confirmPassword,
        });
        navigate("/auth/login", {
          replace: true,
          state: { notice: "Đổi mật khẩu thành công. Hãy đăng nhập lại." },
        });
      }
    } catch (error) {
      const fallback =
        mode === "reset" && resetStep === "verify-otp"
          ? "Mã xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại email."
          : mode === "reset" && resetStep === "reset-password"
            ? "Không thể cập nhật mật khẩu. Vui lòng thử lại."
            : mode === "reset"
              ? "Không thể gửi mã xác nhận. Vui lòng thử lại."
              : "Đã xảy ra lỗi. Vui lòng thử lại.";
      setServerError(message(error) || fallback);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? "CHÀO MỪNG TRỞ LẠI VŨ TRỤ EVENTHUB"
      : mode === "register"
        ? "KHỞI TẠO TÀI KHOẢN EVENTHUB"
        : "QUÊN MẬT KHẨU ?";

  const subtitle =
    mode === "login"
      ? "Truy cập ví vé điện tử chuẩn QR và không gian lễ hội âm nhạc số."
      : mode === "register"
        ? "Nhận mã định danh nghệ thuật số & kích hoạt quyền đặt chỗ trước các đại nhạc hội."
        : resetStep === "verify-otp"
          ? "Nhập mã xác nhận 6 chữ số trong email để tiếp tục."
          : resetStep === "reset-password"
            ? "Tạo mật khẩu mới sau khi mã xác nhận đã được xác minh."
            : "Đừng lo lắng! Nhập địa chỉ email liên kết với tài khoản EVENT HUB của bạn. Chúng tôi sẽ gửi một liên kết bảo mật kèm mã OTP để đặt lại mật khẩu trong tích tắc.";

  const cta =
    mode === "login"
      ? "ĐĂNG NHẬP NGAY"
      : mode === "register"
        ? "TẠO TÀI KHOẢN MỚI"
        : resetStep === "verify-otp"
          ? "XÁC NHẬN MÃ"
          : resetStep === "reset-password"
            ? "CẬP NHẬT MẬT KHẨU & ĐĂNG NHẬP"
            : "GỬI OTP ĐẶT LẠI MẬT KHẨU";

  const busyLabel =
    mode === "login"
      ? "ĐANG XÁC THỰC..."
      : mode === "register"
        ? "ĐANG TẠO TÀI KHOẢN..."
        : resetStep === "verify-otp"
          ? "ĐANG XÁC NHẬN..."
          : resetStep === "reset-password"
            ? "ĐANG CẬP NHẬT..."
            : "ĐANG GỬI...";

  return (
    <div className={`auth-shell auth-shell-${mode}`}>
      <AuthBackground />
      <AuthHeader
        mode={mode}
        user={currentUser}
        search={search}
        onSearchChange={setSearch}
        onSearch={(event) => {
          event.preventDefault();
          const query = search.trim();
          navigate(query ? `/?q=${encodeURIComponent(query)}` : "/");
        }}
      />

      <div className={`auth-main${mode === "reset" ? " auth-main-reset" : ""}`}>
        <div
          className={
            mode === "reset" ? "auth-recovery-layout" : "auth-main-layout"
          }
        >
          <section
            className={`auth-card${mode === "reset" ? " auth-recovery-card" : ""}`}
            aria-labelledby="auth-title"
          >
          {mode !== "reset" ? (
            <div className="auth-card-head">
              <div className="auth-card-kicker">
                <span className="auth-pill">
                  <Orbit size={14} aria-hidden="true" />
                  CỔNG BẢO MẬT GIAO THỨC NEBULA
                </span>
              </div>
              <RoleSelector role={role} onChange={setRole} />
              <AuthTabs mode={mode} />
            </div>
          ) : (
            <div className="auth-recovery-topline">
              <span className="auth-recovery-kicker">
                <LockKeyhole size={15} aria-hidden="true" />
                GIAO THỨC BẢO MẬT LUỒNG TỪ EVENTHUB
              </span>
              <span className="auth-recovery-progress">
                GIAI ĐOẠN {resetStep === "reset-password" ? "02" : "01"} / 02
              </span>
            </div>
          )}

          <div className="auth-card-intro">
            {mode === "reset" && (
              <div className="auth-recovery-title-mark" aria-hidden="true">
                <Ticket size={24} />
              </div>
            )}
            <h1 className="auth-title" id="auth-title">
              {title}
              {mode !== "reset" && (
                <span
                  className={`auth-title-dot auth-title-dot-${mode}`}
                  aria-hidden="true"
                />
              )}
            </h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          <form id="auth-form" className="auth-form" onSubmit={submit} noValidate>
            {serverError && (
              <div className="auth-alert" role="alert" aria-live="assertive">
                <AlertCircle size={15} aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            {mode === "login" && (
              <>
                <AuthField
                  label="Email hoặc Tên tài khoản"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField("email")}
                  error={errors.email}
                  hint="Hiện hỗ trợ đăng nhập bằng email."
                  icon={<Mail size={18} />}
                  autoComplete="username"
                  placeholder="user@eventhub.vn"
                  disabled={busy}
                 // topRight={<span className="auth-field-code">AUTH_ID_V2</span>}
                />
                <AuthField
                  label="Mật mã vũ trụ"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField("password")}
                  error={errors.password}
                  icon={<KeyRound size={18} />}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  disabled={busy}
                  topRight={
                    <Link className="auth-field-link" to="/auth/reset-password">
                      Quên mật khẩu?
                    </Link>
                  }
                  rightAction={
                    <PasswordToggle
                      shown={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                      disabled={busy}
                    />
                  }
                />

                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    disabled={busy}
                  />
                  <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
                </label>
              </>
            )}

            {mode === "register" && (
              <>
                <AuthField
                  label="Họ và tên đầy đủ"
                  name="name"
                  value={form.name}
                  onChange={updateField("name")}
                  error={errors.name}
                  icon={<UserRound size={18} />}
                  autoComplete="name"
                  placeholder="Trần Khả Hảo"
                  disabled={busy}
                />
                <div className="auth-row">
                  <AuthField
                    label="Hộp thư điện tử"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    error={errors.email}
                    icon={<Mail size={18} />}
                    autoComplete="email"
                    placeholder="trankhahao7@gmail.com"
                    disabled={busy}
                  />
                  <AuthField
                    label="Số điện thoại xác thực"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField("phone")}
                    error={errors.phone}
                    icon={<Phone size={18} />}
                    autoComplete="tel"
                    placeholder="0378531013"
                    disabled={busy}
                  />
                </div>
                <div className="auth-password-block">
                  <AuthField
                    label="Mật mã bảo mật"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={updateField("password")}
                    error={errors.password}
                    icon={<LockKeyhole size={18} />}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự, có số và ký hiệu"
                    disabled={busy}
                    rightAction={
                      <PasswordToggle
                        shown={showPassword}
                        onToggle={() => setShowPassword((value) => !value)}
                        disabled={busy}
                      />
                    }
                  />
                  <PasswordStrength value={form.password} />
                </div>
                <AuthField
                  label="Xác nhận lại mật mã"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={updateField("confirmPassword")}
                  error={errors.confirmPassword}
                  icon={<LockKeyhole size={18} />}
                  autoComplete="new-password"
                  placeholder="Nhập lại chính xác mật khẩu"
                  disabled={busy}
                  rightAction={
                    <PasswordToggle
                      shown={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                      disabled={busy}
                    />
                  }
                />

                <div className={`auth-terms${errors.terms ? " has-error" : ""}`}>
                  <input
                    id="auth-terms"
                    type="checkbox"
                    checked={terms}
                    onChange={(event) => {
                      setTerms(event.target.checked);
                      setErrors((current) => ({ ...current, terms: undefined }));
                    }}
                    disabled={busy}
                    aria-label="Tôi đồng ý với điều khoản dịch vụ và chính sách bảo mật"
                    aria-invalid={errors.terms ? true : undefined}
                    aria-describedby={errors.terms ? "auth-terms-error" : undefined}
                  />
                  <label htmlFor="auth-terms">
                    Tôi đồng ý với{" "}
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setNotice("Điều khoản dịch vụ đang được cập nhật.");
                      }}
                    >
                      Điều khoản dịch vụ
                    </button>{" "}
                    và cam kết tuân thủ{" "}
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setNotice("Chính sách bảo mật vé số hóa đang được cập nhật.");
                      }}
                    >
                      Chính sách bảo mật vé số hóa
                    </button>{" "}
                    của EVENTHUB.
                  </label>
                </div>
                {errors.terms && (
                  <p className="auth-field-error" id="auth-terms-error">
                    <AlertCircle size={12} aria-hidden="true" /> {errors.terms}
                  </p>
                )}
              </>
            )}

            {mode === "reset" && (
              <>
                <AuthField
                  label="ĐỊA CHỈ EMAIL TÀI KHOẢN *"
                  name="reset-email"
                  type="email"
                  value={form.email}
                  onChange={updateField("email")}
                  error={errors.email}
                  icon={<Mail size={18} />}
                  autoComplete="email"
                  placeholder="user@eventhub.vn"
                  hint={
                    resetStep === "request"
                      ? "Hệ thống sẽ gửi mã xác nhận có hiệu lực trong vòng 5 phút."
                      : undefined
                  }
                  disabled={busy || resetStep !== "request"}
                  topRight={<span className="auth-recovery-verified"><ShieldCheck size={12} aria-hidden="true" /> Đã xác minh KYC</span>}
                />
                {resetStep !== "request" && (
                  <AuthField
                    label="Mã xác nhận 6 số"
                    name="otp"
                    value={form.otp}
                    onChange={updateField("otp")}
                    error={errors.otp}
                    hint="Nhập đúng 6 chữ số trong email để tiếp tục."
                    icon={<ShieldCheck size={18} />}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="000000"
                    disabled={busy}
                  />
                )}
              </>
            )}

            {(mode !== "reset" || resetStep !== "reset-password") && (
              <button
                className={`auth-submit auth-submit-${mode}`}
                type="submit"
                disabled={busy}
              >
                {busy && (
                  <Loader2 className="auth-spin" size={16} aria-hidden="true" />
                )}
                {busy ? busyLabel : cta}
                {!busy && mode === "login" && (
                  <Zap size={18} aria-hidden="true" />
                )}
                {!busy && mode === "register" && (
                  <ArrowRight size={18} aria-hidden="true" />
                )}
                {!busy && mode === "reset" && (
                  <ShieldCheck size={16} aria-hidden="true" />
                )}
              </button>
            )}
          </form>

          {mode === "reset" && (
            <>
              <div className="auth-recovery-feature-row" aria-label="Thông tin bảo vệ tài khoản">
                <span><LockKeyhole size={15} aria-hidden="true" /> Khóa Token 15p</span>
                <span><ShieldCheck size={15} aria-hidden="true" /> Xác thực 2 lớp</span>
                <span><ShieldCheck size={15} aria-hidden="true" /> Chống Brute-force</span>
              </div>
              <div className="auth-recovery-card-footer">
                <Link to="/auth/login"><ArrowLeft size={14} aria-hidden="true" /> Quay lại đăng nhập</Link>
                <span>Cần hỗ trợ khẩn cấp?</span>
              </div>
            </>
          )}

          {mode === "login" && (
            <div className="auth-extra">
              <div className="auth-divider">
                <span>HOẶC TIẾP TỤC VỚI</span>
              </div>
              <SocialButtons onNotice={setNotice} />
            </div>
          )}

          {mode !== "reset" && <AuthSupport />}
        </section>
        {mode === "reset" && resetStep !== "request" && (
          <aside
            className="auth-recovery-aside"
            aria-label="Các bước khôi phục mật khẩu"
          >
            <section
              className={`auth-recovery-panel ${
                resetStep === "verify-otp" ? "is-active" : "is-complete"
              }`}
            >
              <div className="auth-recovery-panel-heading">
                <span className="auth-recovery-panel-icon">
                  <Mail size={21} />
                </span>
                <div>
                  <span className="auth-recovery-overline">LUỒNG 01 · TRẠNG THÁI HOÀN TẤT GỬI</span>
                  <h2>ĐÃ GỬI LIÊN KẾT THÀNH CÔNG</h2>
                </div>
              </div>
              <div className="auth-recovery-status is-sent" aria-label="Bản xem trước trạng thái đã gửi">
                <span className="auth-recovery-status-icon"><Mail size={17} aria-hidden="true" /></span>
                <div>
                  <strong>EVENT HUB đã phát hành mã Token an toàn tới hộp thư của bạn.</strong>

                </div>
              </div>
              <div className="auth-recovery-resend">
                <span>
                  <Hourglass
                    className={`auth-countdown-icon${resetSeconds > 0 ? " is-counting" : ""}`}
                    size={13}
                    aria-hidden="true"
                  />
                  {resetSeconds > 0 ? "GỬI LẠI MÃ SAU" : "CÓ THỂ GỬI LẠI MÃ"}{" "}
                  <b>{formatResetCountdown(resetSeconds)}</b>
                </span>
                <button
                  type="button"
                  onClick={resendResetCode}
                  disabled={busy || resetSeconds > 0}
                >
                  GỬI LẠI NGAY
                </button>
              </div>
              <div className="auth-recovery-email-actions">
                <button type="button" onClick={openEmailApp} disabled={busy}>
                  <Mail size={14} aria-hidden="true" /> Mở ứng dụng Email
                </button>
                <button type="button" onClick={() => {
                  setResetStep("request");
                  setErrors({});
                  setServerError("");
                  setForm((current) => ({ ...current, password: "", confirmPassword: "", otp: "" }));
                }}>Đổi Email</button>
              </div>
            </section>

            <section
              className={`auth-recovery-panel auth-recovery-reset-preview ${
                resetStep === "reset-password" ? "is-active" : "is-locked"
              }`}
            >
              <div className="auth-recovery-panel-heading">
                <span className="auth-recovery-panel-icon auth-recovery-panel-icon-purple">
                  <LockKeyhole size={20} aria-hidden="true" />
                </span>
                <div>
                  <span className="auth-recovery-overline auth-recovery-overline-purple">LUỒNG 02 · ĐẶT LẠI MẬT KHẨU MỚI (STEP 2)</span>
                  <h2>TẠO MẬT KHẨU MỚI</h2>
                </div>
              </div>
            {resetStep === "reset-password" ? (
              <div className="auth-recovery-password-form">
                <AuthField
                  label="Mật khẩu mới"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField("password")}
                  error={errors.password}
                  icon={<KeyRound size={18} />}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  hint="Mật khẩu cần có ít nhất 8 ký tự."
                  disabled={busy}
                  rightAction={
                    <PasswordToggle
                      shown={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                      disabled={busy}
                    />
                  }
                />
                <AuthField
                  label="Xác nhận lại mật khẩu"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={updateField("confirmPassword")}
                  error={errors.confirmPassword}
                  icon={<LockKeyhole size={18} />}
                  autoComplete="new-password"
                  placeholder="Nhập lại chính xác mật khẩu"
                  disabled={busy}
                  rightAction={
                    <PasswordToggle
                      shown={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                      disabled={busy}
                    />
                  }
                />
                <PasswordStrength value={form.password} />
                <button
                  className="auth-submit auth-submit-reset auth-recovery-password-submit"
                  type="submit"
                  form="auth-form"
                  disabled={busy}
                >
                  {busy && (
                    <Loader2 className="auth-spin" size={16} aria-hidden="true" />
                  )}
                  {busy ? busyLabel : "CẬP NHẬT MẬT KHẨU & ĐĂNG NHẬP"}
                  {!busy && <ShieldCheck size={16} aria-hidden="true" />}
                </button>
              </div>
            ) : (
              <p className="auth-recovery-locked-note">
                Xác nhận mã OTP ở biểu mẫu bên trái để mở khóa bước này.
              </p>
            )}
          </section>
          </aside>
        )}

        {mode === "reset" && (
          <section className="auth-recovery-safety" aria-label="Thông tin an toàn">
            <span className="auth-recovery-safety-icon">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <h2>HỆ THỐNG KIỂM SOÁT TRUY CẬP CYBER NEBULA POS</h2>
              <p>Nếu bạn không yêu cầu đổi lại mật khẩu này, hãy bỏ qua email hoặc liên hệ với Trung tâm điều phối để đảm bảo an toàn về sự kiện của bạn.</p>
            </div>
            <a className="auth-recovery-safety-label" href="tel:0378531013"><Phone size={14} aria-hidden="true" /> 0378531013</a>
          </section>
        )}
        </div>
      </div>

      <AuthFooter onNotice={setNotice} a11Reference={mode === "reset"} />
      {notice && (
        <AuthToast message={notice} onClose={() => setNotice("")} />
      )}
    </div>
  );
}
