import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Ticket, ArrowUpRight } from "lucide-react";
import authService from "./features/auth/services/authService";
import { useAuth } from "./features/auth/stores/authStore";
import { Explore } from "./pages/public/Explore";
import { EventDiscovery } from "./pages/public/EventDiscovery";
import { EventDetail } from "./pages/public/EventDetail";
import { AuthPage } from "./pages/auth/AuthPage";
import { AuthFooter, AuthHeader, AuthToast } from "./pages/auth/AuthShell";
import { Checkout } from "./pages/booking/Checkout";
import { PaymentStatus } from "./pages/booking/PaymentStatus";
import { MyOrders } from "./pages/account/MyOrders";
import { MyTickets } from "./pages/account/MyTickets";
import { TicketPage } from "./pages/account/TicketPage";
import { Profile } from "./pages/account/Profile";
import { Notifications } from "./pages/account/Notifications";
import { Organizer } from "./pages/organizer/Organizer";
import { DashboardPage } from "./pages/organizer/DashboardPage";
import { RegisterOrganizer } from "./pages/organizer/RegisterOrganizer";
import { EditorPage } from "./pages/organizer/EditorPage";
import { CreateEventPage } from "./pages/organizer/CreateEventPage";
import { CreateTicketsPage } from "./pages/organizer/CreateTicketsPage";
import { QRScanPage } from "./pages/organizer/QRScanPage";
import { QRScanEventListPage } from "./pages/organizer/QRScanEventListPage";
import { OrganizerEventListPage } from "./pages/organizer/OrganizerEventListPage";
import { AttendeeManagerPage } from "./pages/organizer/AttendeeManagerPage";
import { OrderManagerPage } from "./pages/organizer/OrderManagerPage";
import { OrderDetailsPage } from "./pages/organizer/OrderDetailsPage";
import { OrganizerProfilePage, OrganizerTeamInvitationsPage } from "./pages/organizer/OrganizerProfilePage";
import { OrderManagerEventListPage } from "./pages/organizer/OrderManagerEventListPage";
import { Operations } from "./pages/organizer/Operations";
import { ReportPage } from "./pages/organizer/ReportPage";
import { Admin } from "./pages/admin/Admin";
import { C6Approve } from "./pages/admin/C6Approve";
import { C6OrganizerApplicationDetail } from "./pages/admin/C6OrganizerApplicationDetail";
import { C5OrganizerDetail } from "./pages/admin/C5OrganizerDetail";
import { C11ApproveEvent } from "./pages/admin/C11ApproveEvent";
import { C9ApproveEventDetail } from "./pages/admin/C9ApproveEventDetail";
import { StaffAssignments } from "./pages/staff/StaffAssignments";
import { StaffCheckin } from "./pages/staff/StaffCheckin";
import { Loading, Notice } from "./components/ticketing/shared";
import { useLoad } from "./features/ticketing/data";
import { NotificationLink } from "./components/ticketing/notification-link";
import type { ReactNode } from "react";
import "./features/ticketing/ticketing.css";
import "./pages/auth/auth.css";
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
    return <Navigate to="/" replace />;
  return <>{children}</>;
}
export function App() {
  const { user, revision, sessionNotice, isAuthVerified } = useAuth(),
    config = useLoad<{ paymentMode: string }>("/config"),
    location = useLocation(),
    navigate = useNavigate();
  const [homeSearch, setHomeSearch] = useState("");
  const [homeNotice, setHomeNotice] = useState("");
  useEffect(() => {
    setHomeSearch(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.search]);
  useEffect(() => {
    const started = useAuth.getState().revision;
    authService
      .getCurrentUser()
      .catch(() => {
        const state = useAuth.getState();
        if (state.revision === started && state.user) state.clearAuth();
      })
      .finally(() => {
        if (useAuth.getState().revision === started)
          useAuth.getState().setAuthVerified(true);
      });
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const isAuthPage = location.pathname.startsWith("/auth/");
  const isAdminConsolePage =
    location.pathname === "/admin/payments" ||
    location.pathname === "/admin/settings" ||
    location.pathname === "/admin/stats" ||
    location.pathname === "/admin/users" ||
    location.pathname === "/admin/categories" ||
    location.pathname === "/admin/applications" ||
    location.pathname === "/admin/applications/review" ||
    /^\/admin\/applications\/review\/[^/]+\/?$/.test(location.pathname) ||
    /^\/admin\/applications\/[^/]+\/?$/.test(location.pathname) ||
    location.pathname === "/admin/events" ||
    location.pathname === "/admin/events/review" ||
    /^\/admin\/events\/review\/[^/]+\/?$/.test(location.pathname);
  const isProfilePage = location.pathname === "/profile";
  const isEventDetailPage = /^\/events\/[^/]+\/?$/.test(location.pathname);
  const isCheckoutPage = location.pathname.startsWith("/checkout/");
  const isRegisterOrganizerPage =
    location.pathname === "/register-organizer";
  const isOrganizerDashboard = ["/organizer/dashboard", "/organizer", "/organizer/events", "/organizer/events/tickets", "/organizer/events/attendees", "/organizer/events/stats", "/organizer/new", "/organizer/qr-scan", "/organizer/order-events", "/organizer/profile", "/organizer/team-invitations"].includes(location.pathname) || /^\/organizer\/events\/[^/]+(?:\/(tickets|attendees|checkin|stats|orders(?:\/[^/]+)?))?\/?$/.test(location.pathname);
  const isPublicHome = location.pathname === "/" && isAuthVerified && !user;
  const isUserHome =
    location.pathname === "/" &&
    isAuthVerified &&
    Boolean(user);
  const usesSharedHomeShell =
    isPublicHome ||
    isUserHome ||
    location.pathname === "/explore" ||
    location.pathname === "/orders" ||
    location.pathname === "/notifications" ||
    location.pathname === "/checkin" ||
    /^\/checkin\/events\/[^/]+\/?$/.test(location.pathname) ||
    isEventDetailPage ||
    isCheckoutPage ||
    location.pathname.startsWith("/payment-status/") ||
    /^\/tickets(?:\/[^/]+)?\/?$/.test(location.pathname) ||
    isRegisterOrganizerPage;
  return (
    <div
      className={`eventhub${isProfilePage ? " profile-route" : ""}${
        isRegisterOrganizerPage ? " register-organizer-route" : ""
      }`}
    >
      {usesSharedHomeShell ? (
        <AuthHeader
          mode="login"
          user={user}
          variant="home"
          search={homeSearch}
          onSearchChange={setHomeSearch}
          onSearch={(event) => {
            event.preventDefault();
            const query = homeSearch.trim();
            navigate(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
          }}
        />
      ) : !isAuthPage && !isAdminConsolePage &&
        !isProfilePage &&
        !isOrganizerDashboard && <header className="site-header">
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
              <NavLink to="/checkin">Nhân viên check-in</NavLink>
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
          {user && <NotificationLink key={user.idUser} />}
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
      </header>}
      {!isAuthPage && !isProfilePage && !isAdminConsolePage && config.data?.paymentMode === "demo" && (
        <div className="demo-banner">
          Bản trải nghiệm MVP · Thanh toán demo, không thu tiền thật
        </div>
      )}
      <main
        className={
          isAdminConsolePage
            ? "admin-c2-main"
            : isAuthPage
            ? "site-main auth-main"
            : isOrganizerDashboard
              ? "organizer-main"
              : "site-main"
        }
        key={revision}
      >
        {!isAuthPage && !isAdminConsolePage && sessionNotice && <Notice error={sessionNotice} />}
        <Routes>
          <Route
            path="/notifications"
            element={
              <Guard>
                <Notifications key={user?.idUser} />
              </Guard>
            }
          />
          <Route
            path="/checkin"
            element={
              <Guard>
                <StaffAssignments key={user?.idUser} />
              </Guard>
            }
          />
          <Route
            path="/checkin/events/:id"
            element={
              <Guard>
                <StaffCheckin key={location.pathname} />
              </Guard>
            }
          />
          <Route path="/" element={<Explore />} />
          <Route path="/explore" element={<EventDiscovery />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/register-organizer" element={<RegisterOrganizer />} />
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
            path="/payment-status/:orderId"
            element={
              <Guard>
                <PaymentStatus />
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
          <Route path="/organizer/dashboard" element={<Guard roles={["ORGANIZER", "ADMIN"]}><DashboardPage /></Guard>} />
          <Route path="/organizer/profile" element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrganizerProfilePage /></Guard>} />
          <Route path="/organizer/team-invitations" element={<Guard><OrganizerTeamInvitationsPage /></Guard>} />
          <Route
            path="/organizer/new"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <CreateEventPage />
              </Guard>
            }
          />
          <Route
            path="/organizer/qr-scan"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <QRScanEventListPage />
              </Guard>
            }
          />
          <Route
            path="/organizer/order-events"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrderManagerEventListPage /></Guard>}
          />
          <Route
            path="/organizer/events"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrganizerEventListPage key="edit" purpose="edit" /></Guard>}
          />
          <Route
            path="/organizer/events/tickets"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrganizerEventListPage key="tickets" purpose="tickets" /></Guard>}
          />
          <Route
            path="/organizer/events/attendees"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrganizerEventListPage key="attendees" purpose="attendees" /></Guard>}
          />
          <Route
            path="/organizer/events/stats"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrganizerEventListPage key="stats" purpose="stats" /></Guard>}
          />
          <Route
            path="/organizer/events/:id/stats"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><ReportPage /></Guard>}
          />
          <Route
            path="/organizer/events/:id/attendees"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><AttendeeManagerPage /></Guard>}
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
            path="/organizer/events/:id/tickets"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><CreateTicketsPage /></Guard>}
          />
          <Route
            path="/organizer/events/:id/checkin"
            element={
              <Guard roles={["ORGANIZER", "ADMIN"]}>
                <QRScanPage />
              </Guard>
            }
          />
          <Route
            path="/organizer/events/:id/orders"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrderManagerPage /></Guard>}
          />
          <Route
            path="/organizer/events/:id/orders/:orderId"
            element={<Guard roles={["ORGANIZER", "ADMIN"]}><OrderDetailsPage /></Guard>}
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
            path="/admin/applications/review"
            element={
              <Guard roles={["ADMIN"]}>
                <C6Approve />
              </Guard>
            }
          />
          <Route
            path="/admin/applications/review/:applicationId"
            element={
              <Guard roles={["ADMIN"]}>
                <C6OrganizerApplicationDetail />
              </Guard>
            }
          />
          <Route
            path="/admin/applications/:applicationId"
            element={
              <Guard roles={["ADMIN"]}>
                <C5OrganizerDetail />
              </Guard>
            }
          />
          <Route
            path="/admin/events/review/:id"
            element={
              <Guard roles={["ADMIN"]}>
                <C9ApproveEventDetail />
              </Guard>
            }
          />
          <Route
            path="/admin/events/review"
            element={
              <Guard roles={["ADMIN"]}>
                <C11ApproveEvent />
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
      {usesSharedHomeShell ? (
        <>
          <AuthFooter onNotice={setHomeNotice} />
          {homeNotice && (
            <AuthToast
              message={homeNotice}
              onClose={() => setHomeNotice("")}
            />
          )}
        </>
      ) : !isAuthPage && !isAdminConsolePage &&
        !isProfilePage &&
        !isOrganizerDashboard && <footer className="site-footer">
        <Link className="brand" to="/">
          eventhub.
        </Link>
        <span>Những trải nghiệm đáng nhớ, bắt đầu từ một chiếc vé.</span>
        <span>© 2026 EventHub</span>
      </footer>}
    </div>
  );
}
