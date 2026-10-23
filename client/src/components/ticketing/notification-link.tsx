import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { get } from "@/features/ticketing/data";

export function NotificationLink() {
  const [count, setCount] = useState<number | null>(null);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void get<{ unreadCount: number }>("/me/notifications/count")
        .then((r) => {
          if (active) setCount(r.unreadCount);
        })
        .catch(() => {
          if (active) setCount(null);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("notifications:changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("notifications:changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [location.pathname]);
  return (
    <Link
      to="/notifications"
      className="notification-bell"
      aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ""}`}
      title="Thông báo"
    >
      <Bell size={21} />
      {!!count && (
        <span className="notification-count">{count > 99 ? "99+" : count}</span>
      )}
    </Link>
  );
}
