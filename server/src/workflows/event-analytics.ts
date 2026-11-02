import { ensure, type Principal, type Row, type UnitOfWork } from "../contracts/core";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Payments } from "../modules/payment/public";
import { vietnamDay } from "./order-manager";

const dayMs = 86400000;
const localDay = (date: Date) => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export function analyticsRange(query: { fromDate?: string; toDate?: string }, now = new Date()) {
  const toDate = query.toDate ?? localDay(now);
  const end = vietnamDay(toDate, true);
  const fromDate = query.fromDate ?? localDay(new Date(new Date(end).getTime() - 30 * dayMs));
  const start = vietnamDay(fromDate);
  const days = (new Date(end).getTime() - new Date(start).getTime()) / dayMs;
  ensure(days > 0 && days <= 366, "VALIDATION", "Chọn khoảng ngày hợp lệ, tối đa 366 ngày.", 400);
  return { fromDate, toDate, start, end, days };
}

export function createEventAnalytics(events: Events, orders: Orders, payments: Payments, snapshot: UnitOfWork) {
  return {
    async report(principal: Principal, eventId: string, query: { fromDate?: string; toDate?: string }) {
      const range = analyticsRange(query);
      return snapshot.run(async () => {
        const event = await events.guard(eventId, principal);
        const asOf = new Date().toISOString();
        const types = await orders.types(eventId);
        const paidOrders = await orders.analyticsPaidOrders(eventId);
        const outcomes = new Map<string, Row>();
        for (let index = 0; index < paidOrders.length; index += 500) {
          const ids = paidOrders.slice(index, index + 500).map(order => order.paid_payment_id).filter(Boolean);
          for (const outcome of await payments.analyticsOutcomes(ids)) outcomes.set(outcome.id, outcome);
        }
        const daily = new Map<string, { revenue: bigint; sold: bigint }>();
        for (let index = 0; index < range.days; index++) {
          daily.set(localDay(new Date(new Date(range.start).getTime() + index * dayMs)), { revenue: 0n, sold: 0n });
        }
        const selected: Row[] = [];
        let revenue = 0n, sold = 0n;
        for (const order of paidOrders) {
          const payment = outcomes.get(order.paid_payment_id);
          ensure(payment && payment.order_id === order.id && payment.status === "SUCCEEDED" && payment.succeeded_at,
            "ANALYTICS_DATA_INCONSISTENT", "Đơn đã thanh toán thiếu giao dịch thành công chuẩn. Vui lòng kiểm tra dữ liệu.");
          const timestamp = new Date(payment.succeeded_at).getTime();
          if (timestamp < new Date(range.start).getTime() || timestamp >= new Date(range.end).getTime()) continue;
          const bucket = daily.get(localDay(new Date(timestamp)))!;
          bucket.revenue += BigInt(order.total_amount);
          bucket.sold += BigInt(order.total_quantity);
          revenue += BigInt(order.total_amount);
          sold += BigInt(order.total_quantity);
          selected.push(order);
        }
        const byType = new Map<string, { id: string; name: string; capacity: number; archived: boolean; sold: bigint; revenue: bigint }>(
          types.map(type => [type.id, { id: type.id, name: type.name, capacity: Number(type.capacity),
            archived: Boolean(type.archived_at), sold: 0n, revenue: 0n }]),
        );
        let itemRevenue = 0n, itemSold = 0n;
        for (let index = 0; index < selected.length; index += 500) {
          for (const item of await orders.analyticsItems(selected.slice(index, index + 500).map(order => order.id))) {
            const row = byType.get(item.ticket_type_id);
            ensure(row, "ANALYTICS_DATA_INCONSISTENT", "Loại vé của giao dịch không thuộc sự kiện.");
            row.sold += BigInt(item.quantity);
            row.revenue += BigInt(item.line_total);
            itemRevenue += BigInt(item.line_total);
            itemSold += BigInt(item.quantity);
          }
        }
        ensure(itemRevenue === revenue && itemSold === sold, "ANALYTICS_DATA_INCONSISTENT",
          "Tổng đơn hàng và chi tiết vé không khớp. Vui lòng kiểm tra dữ liệu.");
        return {
          eventId, eventTitle: String(event.title), asOf, timezone: "Asia/Ho_Chi_Minh",
          range: { fromDate: range.fromDate, toDate: range.toDate },
          totals: { revenue: revenue.toString(), sold: sold.toString(), paidOrders: selected.length },
          dailySeries: [...daily].map(([date, value]) => ({ date, revenue: value.revenue.toString(), sold: value.sold.toString() })),
          ticketTypes: [...byType.values()].filter(type => !type.archived || type.sold > 0n)
            .map(type => ({ ...type, sold: type.sold.toString(), revenue: type.revenue.toString() })),
        };
      });
    },
  };
}

export function analyticsCsv(report: Awaited<ReturnType<ReturnType<typeof createEventAnalytics>["report"]>>) {
  // Text cells can contain user-controlled titles. Neutralize spreadsheet formulas before RFC4180 quoting.
  const cell = (value: string | number) => {
    const text = String(value);
    return `"${(/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  const rows: (string | number)[][] = [
    ["Báo cáo sự kiện", report.eventTitle], ["ID sự kiện", report.eventId],
    ["Từ ngày", report.range.fromDate, "Đến ngày", report.range.toDate],
    ["Múi giờ", report.timezone], ["Thời điểm cập nhật", report.asOf], [],
    ["Tổng kỳ", "Doanh thu (VND)", "Vé bán", "Đơn PAID"],
    ["Tổng", report.totals.revenue, report.totals.sold, report.totals.paidOrders], [],
    ["Ngày thanh toán", "Doanh thu (VND)", "Vé bán"],
    ...report.dailySeries.map(day => [day.date, day.revenue, day.sold]), [],
    ["ID loại vé", "Loại vé", "Sức chứa hiện tại toàn sự kiện", "Vé bán trong kỳ", "Doanh thu trong kỳ (VND)", "Đã lưu trữ"],
    ...report.ticketTypes.map(type => [type.id, type.name, type.capacity, type.sold, type.revenue, type.archived ? "Có" : "Không"]),
  ];
  return "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
