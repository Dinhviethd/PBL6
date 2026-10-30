import QRCode from "qrcode";
import { ensure, type Principal, type Row, type UnitOfWork } from "../contracts/core";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Payments } from "../modules/payment/public";

export type ManagerQuery = {
  page: number;
  q: string;
  group: "all" | "paid" | "processing" | "closed";
  fromDate?: string;
  toDate?: string;
};

// The date range is inclusive in Vietnam, exclusive at the next local midnight in SQL.
export function vietnamDay(value: string, next = false) {
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(value), "VALIDATION", "Ngày không hợp lệ.", 400);
  const [year, month, day] = value.split("-").map(Number);
  ensure(year >= 1970 && year <= 9998 &&
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value,
    "VALIDATION", "Ngày không hợp lệ.", 400);
  return new Date(Date.UTC(year, month - 1, day + Number(next)) - 7 * 3600000).toISOString();
}

export function managerGroup(order: Row, attempts: Row[]) {
  if (attempts.some((p) => p.requires_review && !p.review_resolved_at)) return "processing";
  if (order.status === "PAID") return "paid";
  if (order.status === "PENDING_PAYMENT" || attempts.some((p) =>
    p.status === "PENDING" || p.status === "UNKNOWN")) return "processing";
  return "closed";
}

const paymentDto = (payment?: Row) => payment ? {
  id: payment.id,
  provider: payment.provider,
  status: payment.status,
  amount: String(payment.amount),
  createdAt: payment.created_at,
  succeededAt: payment.succeeded_at ?? null,
} : null;

export function createOrderManager(
  events: Events, orders: Orders, payments: Payments, snapshot: UnitOfWork,
) {
  async function paymentMap(ids: string[]) {
    const map = new Map<string, Row[]>();
    for (let index = 0; index < ids.length; index += 500) {
      const batch = await payments.managerPayments(ids.slice(index, index + 500));
      for (const payment of batch) {
        const key = String(payment.order_id);
        map.set(key, [...(map.get(key) ?? []), payment]);
      }
    }
    return map;
  }
  return {
    async list(p: Principal, eventId: string, query: ManagerQuery) {
      const from = query.fromDate ? vietnamDay(query.fromDate) : null;
      const to = query.toDate ? vietnamDay(query.toDate, true) : null;
      ensure(!from || !to || from < to, "VALIDATION", "Khoảng ngày không hợp lệ.", 400);
      return snapshot.run(async () => {
        await events.guard(eventId, p);
        const asOf = new Date().toISOString();
        const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
        const scope = await orders.managerScope(eventId, pattern, from, to);
        const byOrder = await paymentMap(scope.map((o) => String(o.id)));
        const counts = { all: scope.length, paid: 0, processing: 0, closed: 0 };
        let paidOrders = 0;
        let revenue = 0n;
        const classified = scope.map((order) => {
          const group = managerGroup(order, byOrder.get(String(order.id)) ?? []);
          counts[group]++;
          if (order.status === "PAID") {
            paidOrders++;
            revenue += BigInt(order.total_amount);
          }
          return { order, group };
        });
        const filtered = query.group === "all" ? classified : classified.filter((item) => item.group === query.group);
        const page = filtered.slice(query.page * 50, query.page * 50 + 50);
        const ids = page.map(({ order }) => String(order.id));
        const [items, tickets] = await Promise.all([
          orders.historyItems(ids), orders.historyTickets(ids),
        ]);
        const rows = page.map(({ order, group }) => {
          const attempts = byOrder.get(String(order.id)) ?? [];
          const paid = attempts.find((a) => a.id === order.paid_payment_id);
          const active = attempts.find((a) => a.status === "PENDING" || a.status === "UNKNOWN");
          const latest = attempts[0];
          const ownTickets = tickets.filter((ticket) => ticket.order_id === order.id);
          const unresolvedReview = attempts.some((a) => a.requires_review && !a.review_resolved_at);
          const printable = order.status === "PAID" && !unresolvedReview &&
            ownTickets.some((t) => t.status === "VALID" || t.status === "CHECKED_IN");
          return {
            id: order.id,
            orderCode: order.order_code,
            createdAt: order.created_at,
            buyer: { name: order.buyer_name_snapshot, email: order.buyer_email_snapshot, phone: null },
            event: { id: order.event_id, title: order.event_title_snapshot },
            totalQuantity: order.total_quantity,
            totalAmount: String(order.total_amount),
            currency: order.currency,
            status: order.status,
            group,
            items: items.filter((item) => item.order_id === order.id).map((item) => ({
              typeName: item.ticket_type_name_snapshot,
              quantity: item.quantity,
              unitPrice: String(item.unit_price),
              lineTotal: String(item.line_total),
            })),
            payment: {
              paid: paymentDto(paid), active: paymentDto(active), latest: paymentDto(latest),
              display: paymentDto(paid ?? active ?? latest), unresolvedReview,
            },
            tickets: {
              expected: order.total_quantity, issued: ownTickets.length,
              valid: ownTickets.filter((t) => t.status === "VALID").length,
              checkedIn: ownTickets.filter((t) => t.status === "CHECKED_IN").length,
              void: ownTickets.filter((t) => t.status === "VOID").length,
            },
            actions: { canPreviewTickets: printable, canPrintTickets: printable },
          };
        });
        return {
          asOf, items: rows, counts,
          summary: {
            totalOrders: scope.length, revenuePaid: revenue.toString(), paidOrders,
            paidRatePercent: scope.length ? Math.round(paidOrders / scope.length * 10000) / 100 : 0,
            processingOrders: counts.processing, closedOrders: counts.closed,
          },
          pagination: {
            page: query.page, pageSize: 50, total: filtered.length,
            totalPages: Math.ceil(filtered.length / 50),
          },
        };
      });
    },
    async preview(p: Principal, eventId: string, orderId: string) {
      return snapshot.run(async () => {
        const event = await events.guard(eventId, p);
        const order = await orders.one(orderId);
        ensure(order && order.event_id === eventId, "NOT_FOUND", "Không tìm thấy đơn hàng.", 404);
        ensure(order.status === "PAID", "ORDER_NOT_PAID", "Đơn chưa thanh toán.", 409);
        const attempts = (await paymentMap([orderId])).get(orderId) ?? [];
        ensure(!attempts.some((a) => a.requires_review && !a.review_resolved_at),
          "PAYMENT_REVIEW", "Đơn đang cần tra soát thanh toán.", 409);
        const tickets = await orders.managerTicketPreview(orderId);
        return {
          orderId, orderCode: order.order_code,
          event: { id: event.id, title: order.event_title_snapshot,
            startsAt: event.starts_at, venueName: event.venue_name },
          asOf: new Date().toISOString(),
          tickets: await Promise.all(tickets.map(async (ticket) => {
            const { token, ...safe } = ticket;
            return {
              ...safe,
              qrImage: token ? await QRCode.toDataURL(token, { width: 320, margin: 2 }) : null,
            };
          })),
        };
      });
    },
  };
}
