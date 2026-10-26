import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import type { User } from "@/features/auth/stores/authStore";
import authService from "@/features/auth/services/authService";

export type AuthMode = "login" | "register" | "reset";

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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      setAvatarMenuOpen(false);
    }
  }

  return (
    <header className="auth-header auth-shared">
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
          <Link to="/">Trang chủ</Link>
          {/* <a href="/#discover">
            Danh mục <ChevronDown size={12} />
          </a> */}
          <Link
            to={user ? "/tickets" : "/auth/login"}
            state={user ? undefined : { from: "/tickets" }}
          >
            Khám phá sự kiện
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
            <div className="auth-avatar-menu" ref={avatarMenuRef}>
              <button
                type="button"
                className="auth-avatar"
                title="Tài khoản"
                aria-expanded={avatarMenuOpen}
                aria-haspopup="menu"
                onClick={() => setAvatarMenuOpen((open) => !open)}
              >
                {user.avatarUrl ? (
                  <img
                    className="auth-avatar-image"
                    src={user.avatarUrl}
                    alt=""
                  />
                ) : (
                  <span>{user.name.slice(0, 1).toUpperCase()}</span>
                )}
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              {avatarMenuOpen && (
                <div className="auth-avatar-dropdown" role="menu">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setAvatarMenuOpen(false)}
                  >
                    Hồ sơ cá nhân
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
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