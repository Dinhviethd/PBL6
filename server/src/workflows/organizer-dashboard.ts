import { ensure, role, type Principal, type Row, type UnitOfWork } from "../contracts/core";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Payments } from "../modules/payment/public";
import { analyticsRange } from "./event-analytics";

type DashboardQuery = { eventId?: string; fromDate?: string; toDate?: string };
const localDay = (time: number) => new Date(time + 7 * 3600000).toISOString().slice(0, 10);

export function createOrganizerDashboard(events: Events, orders: Orders, payments: Payments, snapshot: UnitOfWork) {
  return {
    async report(principal: Principal, query: DashboardQuery) {
      role(principal, ["ORGANIZER", "ADMIN"]);
      return snapshot.run(async () => {
        const now = new Date();
        const range = analyticsRange(query, now);
        // Even Admin dashboards are scoped to the current owner, never the entire system.
        const scope = await events.dashboardEvents(principal.userId, query.eventId);
        ensure(!query.eventId || scope.length > 0, "NOT_FOUND", "Không tìm thấy sự kiện trong phạm vi của bạn.", 404);
        const ids = scope.map(event => event.id as string);
        const paid = await orders.dashboardPaidOrders(ids);
        const daily = new Map<string, { revenue: bigint; sold: bigint }>();
        const start = new Date(range.start).getTime(), end = new Date(range.end).getTime();
        for (let time = start; time < end; time += 86400000) daily.set(localDay(time), { revenue: 0n, sold: 0n });
        let revenue = 0n, sold = 0n, paidOrders = 0;
        for (let offset = 0; offset < paid.length; offset += 500) {
          const batch = paid.slice(offset, offset + 500);
          const outcomes = new Map<string, Row>((await payments.analyticsOutcomes(batch.map(order => order.paid_payment_id)))
            .map(payment => [payment.id, payment]));
          const selected = batch.filter(order => {
            const payment = outcomes.get(order.paid_payment_id);
            ensure(payment && payment.order_id === order.id && payment.status === "SUCCEEDED" && payment.succeeded_at,
              "ANALYTICS_DATA_INCONSISTENT", "Đơn đã thanh toán thiếu giao dịch thành công chuẩn.");
            const time = new Date(payment.succeeded_at).getTime();
            ensure(Number.isFinite(time), "ANALYTICS_DATA_INCONSISTENT", "Ngày thanh toán không hợp lệ.");
            return time >= start && time < end;
          });
          const itemTotals = new Map<string, { revenue: bigint; sold: bigint }>();
          for (const item of await orders.analyticsItems(selected.map(order => order.id))) {
            const totals = itemTotals.get(item.order_id) ?? { revenue: 0n, sold: 0n };
            totals.revenue += BigInt(item.line_total); totals.sold += BigInt(item.quantity);
            itemTotals.set(item.order_id, totals);
          }
          for (const order of selected) {
            const amount = BigInt(order.total_amount), quantity = BigInt(order.total_quantity);
            const items = itemTotals.get(order.id);
            ensure(items?.revenue === amount && items?.sold === quantity, "ANALYTICS_DATA_INCONSISTENT",
              "Tổng đơn hàng và chi tiết vé không khớp.");
            const bucket = daily.get(localDay(new Date(outcomes.get(order.paid_payment_id)!.succeeded_at).getTime()))!;
            bucket.revenue += amount; bucket.sold += quantity;
            revenue += amount; sold += quantity; paidOrders++;
          }
        }
        const inventory = new Map<string, Row>((await orders.dashboardInventory(ids, now.toISOString())).map(row => [row.event_id, row]));
        const published = scope.filter(event => event.status === "PUBLISHED" && !event.archived_at && !event.cancelled_at
          && new Date(event.ends_at).getTime() > now.getTime());
        const upcoming = published.sort((a, b) => {
          const activeA = new Date(a.starts_at).getTime() <= now.getTime();
          const activeB = new Date(b.starts_at).getTime() <= now.getTime();
          return Number(activeB) - Number(activeA) || new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
            || String(a.id).localeCompare(String(b.id));
        }).slice(0, 5);
        const tickets = new Map<string, Row>((await orders.dashboardTickets(upcoming.map(event => event.id)))
          .map(row => [row.event_id, row]));
        return {
          asOf: now.toISOString(), timezone: "Asia/Ho_Chi_Minh",
          range: { fromDate: range.fromDate, toDate: range.toDate }, scope: { eventId: query.eventId ?? null },
          totals: { revenue: revenue.toString(), sold: sold.toString(), paidOrders },
          currentEventCounts: { onSale: published.filter(event => !event.sales_paused && Number(inventory.get(event.id)?.sellable_types ?? 0) > 0).length },
          dailySeries: [...daily].map(([date, value]) => ({ date, revenue: value.revenue.toString(), sold: value.sold.toString() })),
          upcomingEvents: upcoming.map(event => ({
            id: event.id, title: event.title, coverImageUrl: event.cover_image_url, venueName: event.venue_name,
            startsAt: event.starts_at, endsAt: event.ends_at,
            temporalStatus: new Date(event.starts_at).getTime() <= now.getTime() ? "ONGOING" : "UPCOMING",
            capacity: String(inventory.get(event.id)?.capacity ?? 0), sold: String(inventory.get(event.id)?.sold ?? 0),
            checkedIn: String(tickets.get(event.id)?.checked_in ?? 0), eligibleTickets: String(tickets.get(event.id)?.eligible_tickets ?? 0),
          })),
        };
      });
    },
  };
}
