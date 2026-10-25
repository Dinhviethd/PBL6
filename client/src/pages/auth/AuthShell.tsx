import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Headset,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import type { User } from "@/features/auth/stores/authStore";

export type AuthMode = "login" | "register" | "reset";
export type AuthRole = "attendee" | "organizer";

const HOTLINE = "0378531013";
const SUPPORT_EMAIL = "trankhahao7@gmail.com";

export function AuthBackground() {
  return (
    <div className="auth-bg" aria-hidden="true">
      <span className="auth-glow auth-glow-primary" />
      <span className="auth-glow auth-glow-secondary" />
      <span className="auth-glow auth-glow-tertiary" />
      <span className="auth-bg-word auth-bg-word-left">
        NEBULA
        <small> TICKET DISRUPTION 2026</small>
      </span>
      <span className="auth-bg-word auth-bg-word-right">
        CYBER_BEAT
        <small>STREET CODE [{HOTLINE}]</small>
      </span>
    </div>
  );
}

export function AuthHeader({
  mode,
  user,
  search,
  onSearchChange,
  onSearch,
}: {
  mode: AuthMode;
  user: User | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <header className="auth-header">
      <div className="auth-header-inner">
        <Link className="auth-logo" to="/" aria-label={mode === "reset" ? "ENVENT HUB — Trang chủ" : "EVENTHUB — Trang chủ"}>
          <span className="auth-logo-mark">
            <Ticket size={18} />
          </span>
          <span>
            {mode === "reset" ? "ENVENT" : "EVENT"}<span>HUB</span>
          </span>
        </Link>

        <nav
          className={`auth-nav${mode === "reset" ? " auth-nav-recovery" : ""}`}
          aria-label="Điều hướng chính"
        >
          <Link to="/">Khám phá sự kiện</Link>
          <a href="/#discover">
            Danh mục <ChevronDown size={12} />
          </a>
          <Link
            to={user ? "/tickets" : "/auth/login"}
            state={user ? undefined : { from: "/tickets" }}
          >
            Vé của tôi
          </Link>
          {mode === "reset" && (
            <Link
              to={user ? "/orders" : "/auth/login"}
              state={user ? undefined : { from: "/orders" }}
            >
              Lịch sử đơn hàng
            </Link>
          )}
        </nav>

        <form className="auth-search" role="search" onSubmit={onSearch}>
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="Tìm kiếm sự kiện"
            placeholder="Tìm kiếm lễ hội, nghệ sĩ, vé..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </form>

        <div className="auth-header-actions">
          {mode === "reset" ? (
            <>
              <Link className="auth-header-link" to="/auth/login">
                Đăng nhập
              </Link>
              <Link className="auth-header-cta" to="/auth/register">
                Đăng ký
              </Link>
              <Link
                className="auth-avatar auth-avatar-recovery"
                to={user ? "/profile" : "/auth/login"}
                state={user ? undefined : { from: "/profile" }}
                aria-label={user ? `Tài khoản ${user.name}` : "Tài khoản"}
              >
                {user ? (
                  <span>{user.name.slice(0, 1).toUpperCase()}</span>
                ) : (
                  <UserRound className="auth-user-icon" size={17} aria-hidden="true" />
                )}
                <ChevronDown className="auth-avatar-chevron" size={12} aria-hidden="true" />
              </Link>
            </>
          ) : user ? (
            <Link className="auth-avatar" to="/profile" title="Trang cá nhân">
              <span>{user.name.slice(0, 1).toUpperCase()}</span>
              <b>{user.name}</b>
            </Link>
          ) : (
            <>
              <Link
                className={`auth-header-link${mode === "login" ? " is-active" : ""}`}
                to="/auth/login"
                aria-current={mode === "login" ? "page" : undefined}
              >
                Đăng nhập
              </Link>
              <Link
                className={`auth-header-cta${mode === "register" ? " is-active" : ""}`}
                to="/auth/register"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function AuthFooter({
  onNotice,
  a11Reference = false,
}: {
  onNotice: (message: string) => void;
  a11Reference?: boolean;
}) {
  const policy = (label: string) =>
    onNotice(
      `${label} đang được cập nhật. Vui lòng liên hệ hỗ trợ nếu cần thêm thông tin.`,
    );

  return (
      <footer className="auth-footer">
      <div className="auth-footer-grid">
        <div className="auth-footer-brand">
          <Link className="auth-logo" to="/" aria-label={a11Reference ? "ENVENT HUB — Trang chủ" : "EVENTHUB — Trang chủ"}>
            <span className="auth-logo-mark">
              <Ticket size={20} />
            </span>
            <span>
              {a11Reference ? "ENVENT" : "EVENT"}<span>HUB</span>
            </span>
          </Link>
          <p>
            {a11Reference
              ? "Nền tảng phát hành vé số hóa, phân phối sự kiện âm nhạc và kiểm soát check-in theo phong cách Cyber Nebula đỉnh cao. Trải nghiệm giải trí chuẩn xác, bảo mật và bùng nổ năng lượng."
              : "Nền tảng phát hành vé số hóa, phân phối sự kiện âm nhạc và kiểm soát check-in theo phong cách Cyber Cosmic đỉnh cao. Trải nghiệm giải trí chuẩn xác, bảo mật và bùng nổ năng lượng."}
          </p>
          <span className="auth-footer-tech">
            <ShieldCheck size={14} /> Công nghệ vé QR Độc Bản Thời Gian Thực
          </span>
        </div>

        <div className="auth-footer-col">
          <h2>{a11Reference ? "Tài khoản & khách hàng" : "Liên kết nhanh"}</h2>
          {a11Reference ? (
            <>
              <Link to="/profile">Hồ sơ cá nhân</Link>
              <Link to="/orders">Lịch sử đơn hàng</Link>
              <Link to="/tickets">Vé của tôi</Link>
              <Link to="/auth/reset-password">Khôi phục mật khẩu</Link>
            </>
          ) : (
            <>
              <Link to="/?q=l%E1%BB%85%20h%E1%BB%99i">Lễ hội Âm nhạc Hot</Link>
              <Link to="/?q=underground">Sự kiện Underground</Link>
              <Link to="/organizer">Dành cho Ban tổ chức</Link>
              <Link to="/tickets">Hướng dẫn mua vé QR</Link>
            </>
          )}
        </div>

        <div className="auth-footer-col">
          <h2>Chính sách &amp; Pháp lý</h2>
          <button type="button" onClick={() => policy("Điều khoản sử dụng")}>
            Điều khoản sử dụng
          </button>
          <button type="button" onClick={() => policy("Chính sách bảo mật")}>
            Chính sách bảo mật
          </button>
          <button
            type="button"
            onClick={() => policy(a11Reference ? "Chính sách hủy/đổi vé" : "Chính sách hoàn/đổi vé")}
          >
            {a11Reference ? "Chính sách hủy/đổi vé" : "Chính sách hoàn/đổi vé"}
          </button>
          <button
            type="button"
            onClick={() => policy("Bảo mật thông tin POS")}
          >
            Bảo mật thông tin POS
          </button>
        </div>

        <div className="auth-footer-col auth-footer-support">
          <h2>Hỗ trợ 24/7</h2>
          <a href={`tel:${HOTLINE}`}>
            <Phone size={14} /> <span>{HOTLINE}</span>
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={14} /> <span>{SUPPORT_EMAIL}</span>
          </a>
          <span>
            <MapPin size={14} /> Trung tâm điều phối {a11Reference ? "TicketHub" : "EventHub"}
          </span>
        </div>
      </div>

      <div className="auth-footer-bottom">
        <span>
          {a11Reference
            ? "© 2025 ENVENT HUB. Bản quyền thuộc về nền tảng sự kiện ENVENT HUB."
            : "© 2026 EVENTHUB. Bản quyền thuộc về nền tảng sự kiện EVENTHUB."}
        </span>
        <div>
          <span>VN | VI</span>
          <span>Hạ tầng Cloud Nebula</span>
          <span>Hỗ trợ check-in sự kiện</span>
        </div>
      </div>
    </footer>
  );
}

export function AuthSupport() {
  return (
    <div className="auth-support" aria-label="Hỗ trợ kỹ thuật 24/7">
      <div className="auth-support-main">
        <span className="auth-support-icon">
          <Headset size={18} />
        </span>
        <div>
          <span className="auth-support-title">Hỗ trợ kỹ thuật 24/7</span>
          <span className="auth-support-hotline">
            Hotline:{" "}
            <a href={`tel:${HOTLINE}`}>{HOTLINE}</a>
          </span>
        </div>
      </div>
      <a className="auth-support-email" href={`mailto:${SUPPORT_EMAIL}`}>
        <Mail size={14} /> {SUPPORT_EMAIL}
      </a>
    </div>
  );
}

export function AuthToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="auth-toast" role="status" aria-live="polite">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" aria-label="Đóng thông báo" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
}
