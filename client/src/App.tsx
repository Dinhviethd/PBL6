import { useEffect } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Ticket, ArrowUpRight } from "lucide-react";
import authService from "./features/auth/services/authService";
import { useAuth } from "./features/auth/stores/authStore";
import {
  Explore,
  EventDetail,
  AuthPage,
  Checkout,
  MyOrders,
  MyTickets,
  TicketPage,
  Profile,
} from "./features/ticketing/customer";
import {
  Organizer,
  EditorPage,
  Operations,
  Admin,
} from "./features/ticketing/management";
import { Loading, Notice } from "./features/ticketing/shared";
import { useLoad } from "./features/ticketing/data";
import type { ReactNode } from "react";
import "./features/ticketing/ticketing.css";
function Guard({
  children,
  roles = [],
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const { user, isAuthVerified } = useAuth(),
    location = useLocation();
  if (!isAuthVerified) return <Loading />;
  if (!user)
    return (
      <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
    );
  if (roles.length && !roles.some((r) => user.roles.includes(r)))
    return <Notice error="Tài khoản chưa có quyền truy cập khu vực này." />;
  return <>{children}</>;
}
export function App() {
  const { user } = useAuth(),
    config = useLoad<{ paymentMode: string }>("/config"),
    location = useLocation();
  useEffect(() => {
    authService
      .getCurrentUser()
      .catch(() => useAuth.getState().clearAuth())
      .finally(() => useAuth.getState().setAuthVerified(true));
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="eventhub">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Ticket size={23} />
          </span>
          event<span>hub</span>
          <span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <NavLink to="/" end>
            Khám phá
          </NavLink>
          {user && (
            <>
              <NavLink to="/tickets">Vé của tôi</NavLink>
              <NavLink to="/orders">Đơn hàng</NavLink>
            </>
          )}
          {user?.roles.some((r) => ["ORGANIZER", "ADMIN"].includes(r)) && (
            <NavLink to="/organizer">Organizer</NavLink>
          )}
          {user?.roles.includes("ADMIN") && (
            <NavLink to="/admin/stats">Quản trị</NavLink>
          )}
        </nav>
        <div className="header-account">
          {user ? (
            <>
              <Link className="avatar-link" to="/profile">
                <span>{user.name.slice(0, 1).toUpperCase()}</span>
                <b>{user.name}</b>
              </Link>
              <button
                className="text-btn"
                onClick={() => void authService.logout().catch(() => {})}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login">Đăng nhập</Link>
              <Link className="btn dark small" to="/auth/register">
                Bắt đầu <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>
      {config.data?.paymentMode === "demo" && (
        <div className="demo-banner">
          Bản trải nghiệm MVP · Thanh toán demo, không thu tiền thật
        </div>
      )}
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/auth/login" element={<AuthPage />} />
          <Route path="/auth/register" element={<AuthPage register />} />
          <Route path="/auth/reset-password" element={<AuthPage reset />} />
          <Route
            path="/checkout/:id"
            element={
              <Guard>
                <Checkout />
              </Guard>
            }
          />
          <Route
            path="/orders"
            element={
              <Guard>
                <MyOrders />
              </Guard>
            }
          />
          <Route
            path="/tickets"
            element={
              <Guard>
                <MyTickets />
              </Guard>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <Guard>
                <TicketPage />
              </Guard>
            }
          />
          <Route
            path="/profile"
            element={
              <Guard>
                <Profile />
              </Guard>
            }
          />
          <Route
            path="/organizer"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <Organizer />
              </Guard>
            }
          />
          <Route
            path="/organizer/new"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <EditorPage />
              </Guard>
            }
          />
          <Route
            path="/organizer/events/:id"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <EditorPage />
              </Guard>
            }
          />
          <Route
            path="/organizer/events/:id/:tab"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <Operations />
              </Guard>
            }
          />
          <Route
            path="/admin/:tab"
            element={
              <Guard roles={["ADMIN"]}>
                <Admin />
              </Guard>
            }
          />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Không tìm thấy trang</h1>
                <Link className="btn primary" to="/">
                  Trở lại khám phá
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <Link className="brand" to="/">
          eventhub.
        </Link>
        <span>Những trải nghiệm đáng nhớ, bắt đầu từ một chiếc vé.</span>
        <span>© 2026 EventHub</span>
      </footer>
    </div>
  );
}
