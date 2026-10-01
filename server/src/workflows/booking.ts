import type { Auth } from "../modules/auth/public";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Payments } from "../modules/payment/public";
import type { createAudit } from "../modules/audit/public";
import {
  ensure,
  role,
  type Principal,
  type Row,
  type UnitOfWork,
} from "../contracts/core";
export function createBooking(
  auth: Auth,
  events: Events,
  orders: Orders,
  payments: Payments,
  audit: ReturnType<typeof createAudit>,
  uow: UnitOfWork,
) {
  async function lockedOrder(id: string, p?: Principal) {
    const initial = await orders.one(id);
    ensure(initial, "NOT_FOUND", "Không tìm thấy đơn hàng.", 404);
    const event = await events.guard(initial.event_id);
    const order = await orders.one(id, true);
    if (p)
      ensure(
        order.buyer_id === p.userId,
        "FORBIDDEN",
        "Đơn hàng không thuộc tài khoản này.",
        403,
      );
    return { order, event };
  }
  return {
    async createOrder(
      p: Principal,
      eventId: string,
      items: Row[],
      key: string,
    ) {
      try {
        return await uow.run(async () => {
          const buyer = await auth.profile(p.userId),
            event = await events.guard(eventId);
          return orders.createOrder(p, event, buyer, items, key);
        });
      } catch (error) {
        if ((error as Row).code === "23505") {
          return uow.run(async () => {
            const buyer = await auth.profile(p.userId),
              event = await events.guard(eventId);
            return orders.createOrder(p, event, buyer, items, key);
          });
        }
        throw error;
      }
    },
    async detail(p: Principal, id: string) {
      const o = await orders.one(id);
      ensure(o, "NOT_FOUND", "Không tìm thấy đơn.", 404);
      if (o.buyer_id !== p.userId) await events.guard(o.event_id, p);
      return {
        ...o,
        items: await orders.items(id),
        payment: await payments.active(id),
      };
    },
    startPayment: (p: Principal, id: string) =>
      uow.run(async () => {
        payments.requireProvider();
        const { order, event } = await lockedOrder(id, p);
        ensure(
          !event.sales_paused && event.status === "PUBLISHED",
          "SALES_CLOSED",
          "Sự kiện đã ngừng bán.",
        );
        await orders.prepare(order, p);
        const prior = await payments.active(id);
        if (prior) return prior;
        const attempt = await payments.create(order);
        await orders.extend(id, new Date(attempt.reconcile_until));
        await audit.append(p, "payment.created", "payment", attempt.id);
        return attempt;
      }),
    demoPayment: (p: Principal, id: string, success: boolean) =>
      uow.run(async () => {
        payments.requireDemo();
        const initial = await payments.one(id);
        ensure(initial, "NOT_FOUND", "Không tìm thấy giao dịch.", 404);
        const { order } = await lockedOrder(initial.order_id, p);
        await orders.lockInventory(order);
        const payment = await payments.one(id, true);
        if (payment.status === "SUCCEEDED" && !success)
          return { outcome: "ALREADY_APPLIED" };
        await payments.result(id, success);
        let outcome = success
          ? await orders.complete(order, payment)
          : "FAILED";
        if (
          ["LATE_PAYMENT", "DIFFERENT_PAYMENT_ALREADY_APPLIED"].includes(
            outcome,
          )
        )
          await payments.review(id, outcome);
        await payments.notification(payment, success);
        await audit.append(p, "payment.result", "payment", id, { outcome });
        return { outcome };
      }),
    cancelOrder: (p: Principal, id: string) =>
      uow.run(async () => {
        const { order } = await lockedOrder(id, p);
        ensure(
          order.status === "PENDING_PAYMENT",
          "ORDER_CLOSED",
          "Đơn không thể hủy.",
        );
        ensure(
          !(await payments.active(id)),
          "PAYMENT_IN_PROGRESS",
          "Đang có giao dịch cần xử lý.",
        );
        await orders.release(order, "CANCELLED");
      }),
    configureType: (p: Principal, eventId: string, d: Row, id?: string) =>
      uow.run(async () => {
        const e = await events.guard(eventId, p, true);
        ensure(
          ["DRAFT", "REJECTED"].includes(e.status),
          "EVENT_LOCKED",
          "Chỉ sửa loại vé khi sự kiện ở bản nháp hoặc bị từ chối.",
        );
        ensure(
          new Date(d.saleEndsAt) <= new Date(e.ends_at),
          "INVALID_DATES",
          "Thời gian bán phải trước lúc kết thúc sự kiện.",
          400,
        );
        if (id) {
          const t = await orders.type(id, true);
          ensure(
            t && t.event_id === eventId,
            "NOT_FOUND",
            "Không tìm thấy loại vé.",
            404,
          );
          ensure(
            d.capacity >= t.reserved_quantity + t.sold_quantity,
            "INVALID_CAPACITY",
            "Số lượng thấp hơn vé đã bán/đang giữ.",
          );
        }
        return (await orders.saveType(eventId, d, id))[0];
      }),
    archiveType: (p: Principal, eventId: string, id: string) =>
      uow.run(async () => {
        const e = await events.guard(eventId, p, true);
        ensure(
          ["DRAFT", "REJECTED"].includes(e.status),
          "EVENT_LOCKED",
          "Sự kiện phải ở bản nháp.",
        );
        const t = await orders.type(id, true);
        ensure(
          t &&
            t.event_id === eventId &&
            !t.sold_quantity &&
            !t.reserved_quantity,
          "TICKET_IN_USE",
          "Loại vé đã có giao dịch.",
        );
        await orders.archiveType(id);
      }),
    saveEvent: (p: Principal, d: Row, id?: string) =>
      uow.run(async () => {
        if (!id) return events.create(p, d);
        const e = await events.guard(id, p, true);
        ensure(
          !["PENDING_REVIEW", "CANCELLED", "ARCHIVED"].includes(e.status),
          "EVENT_LOCKED",
          "Không thể sửa sự kiện ở trạng thái hiện tại.",
        );
        const obligations = await orders.obligations(id);
        ensure(
          Number(obligations.pending) === 0,
          "ACTIVE_ORDERS",
          "Còn đơn đang giữ vé.",
        );
        if (Number(obligations.paid) > 0)
          ensure(
            new Date(d.startsAt).getTime() ===
              new Date(e.starts_at).getTime() &&
              new Date(d.endsAt).getTime() === new Date(e.ends_at).getTime() &&
              d.address === e.address &&
              d.venueName === e.venue_name &&
              d.cityCode === e.city_code,
            "SOLD_EVENT",
            "Không đổi thời gian/địa điểm sau khi đã bán vé.",
          );
        const c = await events.category(d.categoryId);
        ensure(
          c && !c.archived_at,
          "INVALID_CATEGORY",
          "Danh mục không hợp lệ.",
          400,
        );
        return events.save(e.organizer_id, d, id);
      }),
    submit: (p: Principal, id: string) =>
      uow.run(async () => {
        const e = await events.guard(id, p, true);
        ensure(
          ["DRAFT", "REJECTED"].includes(e.status),
          "INVALID_STATE",
          "Sự kiện không thể gửi duyệt.",
        );
        ensure(
          (await orders.types(id)).some((t) => !t.archived_at),
          "MISSING_TICKETS",
          "Thêm ít nhất một loại vé trước khi gửi duyệt.",
          400,
        );
        await audit.append(p, "event.submitted", "event", id);
        return (await events.submit(id))[0];
      }),
    review: (p: Principal, id: string, approve: boolean, reason: string) =>
      uow.run(async () => {
        role(p, ["ADMIN"]);
        const e = await events.guard(id, p, true);
        ensure(
          e.status === "PENDING_REVIEW",
          "INVALID_STATE",
          "Sự kiện không còn chờ duyệt.",
        );
        const result = await events.review(e, p.userId, approve, reason, {
          event: e,
          ticketTypes: await orders.types(id),
        });
        await audit.append(p, "event.reviewed", "event", id, {
          approve,
          reason,
        });
        return result[0];
      }),
    cancelEvent: (p: Principal, id: string, reason: string) =>
      uow.run(async () => {
        const e = await events.guard(id, p, true);
        ensure(
          !["CANCELLED", "ARCHIVED"].includes(e.status),
          "EVENT_CLOSED",
          "Sự kiện đã đóng.",
        );
        const obligations = await orders.obligations(id);
        ensure(
          Number(obligations.paid) === 0,
          "PAID_ORDERS",
          "Sự kiện có vé đã thanh toán, chỉ có thể ngừng bán.",
        );
        ensure(
          !(
            await payments.blocking(
              (await orders.eventOrderIds(id)).map((o) => o.id),
            )
          ).length,
          "PAYMENT_REVIEW",
          "Còn giao dịch cần đối soát.",
        );
        const pending = await orders.eventOrders(id);
        for (const o of pending)
          ensure(
            !(await payments.active(o.id)),
            "PAYMENT_IN_PROGRESS",
            "Còn thanh toán đang xử lý.",
          );
        for (const o of pending)
          await orders.release(await orders.one(o.id, true), "CANCELLED");
        await events.cancel(id, reason);
        await audit.append(p, "event.cancelled", "event", id, { reason });
      }),
    pause: (p: Principal, id: string, paused: boolean) =>
      uow.run(async () => {
        await events.guard(id, p, true);
        await events.pause(id, paused);
        await audit.append(p, "event.sales_paused", "event", id, { paused });
      }),
    scan: (p: Principal, id: string, code: string) =>
      uow.run(async () => {
        const event = await events.guard(id, p);
        const result = await orders.scan(p, event, code);
        if (!result.duplicate)
          await audit.append(
            p,
            "ticket.checked_in",
            "ticket",
            (result as Row).ticket_id,
          );
        return result;
      }),
    async expire() {
      let count = 0;
      for (const due of await orders.due()) {
        await uow.run(async () => {
          const { order } = await lockedOrder(due.id);
          if (order.status !== "PENDING_PAYMENT") return;
          const rs = await orders.lockInventory(order);
          if (rs.some((r) => new Date(r.release_after) > new Date())) return;
          const p = await payments.active(order.id);
          if (p) {
            if (new Date(p.reconcile_until) > new Date()) return;
            await payments.review(p.id, "EXPIRED_UNRESOLVED");
          }
          await orders.release(order);
          count++;
        });
      }
      return count;
    },
    async overview(p: Principal, eventId?: string) {
      if (eventId) {
        await events.guard(eventId, p);
        return orders.summary(eventId);
      }
      role(p, ["ADMIN"]);
      return {
        ...(await orders.summary(null)),
        ...(await payments.summary()),
        ...(await events.summary()),
        ...(await auth.summary()),
      };
    },
  };
}
