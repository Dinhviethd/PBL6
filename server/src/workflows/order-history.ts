import { ensure, type Principal, type Row } from "../contracts/core";
import type { Orders } from "../modules/order/public";
import type { Payments } from "../modules/payment/public";

export type HistoryQuery = {
  page: number;
  pageSize: number;
  q: string;
  group: string;
  from?: string;
  toExclusive?: string;
};
export function historyGroup(order: Row, attempts: Row[]) {
  if (attempts.some((p) => p.requires_review && !p.review_resolved_at))
    return "processing";
  if (order.status === "PAID") return "paid";
  if (order.status === "PENDING_PAYMENT" || attempts.some(p => ["PENDING", "UNKNOWN"].includes(p.status))) return "processing";
  return "closed";
}
export function createOrderHistory(orders: Orders, payments: Payments) {
  async function attempts(ids: string[]) {
    const result: Row[] = [];
    // Bound each owner's batch; never issue one request per order.
    for (let i = 0; i < ids.length; i += 500)
      result.push(...(await payments.historyPayments(ids.slice(i, i + 500))));
    const grouped = new Map<string, Row[]>();
    for (const p of result)
      grouped.set(p.order_id, [...(grouped.get(p.order_id) ?? []), p]);
    return grouped;
  }
  async function enrich(rows: Row[], byOrder: Map<string, Row[]>) {
    const ids = rows.map((o) => o.id);
    const [items, tickets] = await Promise.all([
      orders.historyItems(ids),
      orders.historyTickets(ids),
    ]);
    return rows.map((o) => {
      const ps = byOrder.get(o.id) ?? [],
        active =
          ps.find((p) => ["PENDING", "UNKNOWN"].includes(p.status)) ?? null;
      const ts = tickets.filter((t) => t.order_id === o.id);
      return {
        ...o,
        group: historyGroup(o, ps),
        items: items.filter((i) => i.order_id === o.id),
        payment: {
          paid: ps.find((p) => p.id === o.paid_payment_id) ?? null,
          active,
          latest: ps[0] ?? null,
          unresolvedReview: ps.some(
            (p) => p.requires_review && !p.review_resolved_at,
          ),
        },
        tickets: {
          expected: o.total_quantity,
          issued: ts.length,
          valid: ts.filter((t) => t.status === "VALID").length,
          checkedIn: ts.filter((t) => t.status === "CHECKED_IN").length,
          void: ts.filter((t) => t.status === "VOID").length,
        },
        actions: {
          canCancel: o.status === "PENDING_PAYMENT" && !active,
          canViewTickets: ts.length > 0,
          // Checkout performs the final event, reservation and provider checks before creating payment.
          canContinueCheckout:
            o.status === "PENDING_PAYMENT" &&
            new Date(o.expires_at).getTime() > Date.now() &&
            !ps.some((p) => p.requires_review && !p.review_resolved_at),
        },
      };
    });
  }
  return {
    async list(p: Principal, query: HistoryQuery) {
      ensure(
        !query.from ||
          !query.toExclusive ||
          new Date(query.from) < new Date(query.toExclusive),
        "VALIDATION",
        "Khoảng thời gian không hợp lệ.",
        400,
      );
      const scope = await orders.historyScope(
        p.userId,
        query.from ?? null,
        query.toExclusive ?? null,
      );
      const byOrder = await attempts(scope.map((o) => o.id));
      const summary = {
        totalAmount: scope
          .filter((o) => o.status === "PAID")
          .reduce((n, o) => n + BigInt(o.total_amount), 0n)
          .toString(),
        paid: 0,
        processing: 0,
        closed: 0,
      };
      for (const o of scope)
        summary[historyGroup(o, byOrder.get(o.id) ?? [])]++;
      const q = query.q.toLocaleLowerCase("vi-VN");
      const matched = scope.filter((o) =>
        `${o.order_code} ${o.event_title_snapshot}`
          .toLocaleLowerCase("vi-VN")
          .includes(q),
      );
      const counts = { all: matched.length, paid: 0, processing: 0, closed: 0 };
      for (const o of matched)
        counts[historyGroup(o, byOrder.get(o.id) ?? [])]++;
      const filtered = matched.filter(
        (o) =>
          query.group === "all" ||
          historyGroup(o, byOrder.get(o.id) ?? []) === query.group,
      );
      return {
        items: await enrich(
          filtered.slice(
            query.page * query.pageSize,
            (query.page + 1) * query.pageSize,
          ),
          byOrder,
        ),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / query.pageSize),
        },
        summary,
        counts,
        asOf: new Date().toISOString(),
        capabilities: { vat: false, points: false },
      };
    },
    async detail(p: Principal, id: string) {
      const o = await orders.one(id);
      ensure(o, "NOT_FOUND", "Không tìm thấy đơn hàng.", 404);
      ensure(
        o.buyer_id === p.userId,
        "FORBIDDEN",
        "Đơn hàng không thuộc tài khoản này.",
        403,
      );
      const safe = {
        id: o.id,
        order_code: o.order_code,
        event_title_snapshot: o.event_title_snapshot,
        status: o.status,
        total_amount: o.total_amount,
        currency: o.currency,
        created_at: o.created_at,
        expires_at: o.expires_at,
        paid_payment_id: o.paid_payment_id,
        total_quantity: o.total_quantity,
      };
      return {
        ...(await enrich([safe], await attempts([id])))[0],
        ticketList: await orders.historyTickets([id]),
      };
    },
  };
}
