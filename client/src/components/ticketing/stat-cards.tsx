import {
  CalendarDays,
  Users,
  Wallet,
  ScanLine,
  ClipboardList,
  ShieldCheck,
  CircleAlert,
  Ticket as TicketIcon,
} from "lucide-react";
import { money } from "@/features/ticketing/data";
import type { Stats } from "@/features/ticketing/types";

function statLabel(k: string) {
  return (
    (
      {
        revenue: "Doanh thu vé",
        sold: "Vé đã bán",
        checkins: "Đã check-in",
        orders: "Đơn thanh toán",
        users: "Người dùng",
        organizers: "Organizer",
        events: "Sự kiện",
        provider_received: "Tiền ghi nhận",
        needs_review: "Cần đối soát",
      } as Record<string, string>
    )[k] ?? k
  );
}
export function StatCards({ data }: { data: Stats }) {
  const icons = {
    revenue: Wallet,
    sold: TicketIcon,
    checkins: ScanLine,
    orders: ClipboardList,
    users: Users,
    organizers: ShieldCheck,
    events: CalendarDays,
    provider_received: Wallet,
    needs_review: CircleAlert,
  };
  return (
    <div className="stats-grid">
      {Object.entries(data).map(([k, v]) => {
        const Icon = icons[k as keyof typeof icons] ?? ClipboardList;
        return (
          <div className="stat-card" key={k}>
            <Icon size={21} aria-hidden="true" />
            <span>{statLabel(k)}</span>
            <strong>
              {k === "revenue" || k === "provider_received" ? money(v) : v}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
