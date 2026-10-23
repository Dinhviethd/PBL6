import { ensure, type Principal, type UnitOfWork } from "../contracts/core";
import type { Auth } from "../modules/auth/public";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Notifications } from "../modules/notification/public";
import type { createBooking } from "./booking";

export function createWaitQueue(
  auth: Auth,
  events: Events,
  orders: Orders,
  notifications: Notifications,
  uow: UnitOfWork,
  booking: ReturnType<typeof createBooking>,
) {
  return {
    join: (p: Principal, eventId: string, typeId: string) =>
      uow.run(async () => {
        // Exclusive event lock serializes joins, cancellations and promotions,
        // and excludes normal purchases/event edits while allocating a place.
        const event = await events.guard(eventId, undefined, true);
        const type = await orders.type(typeId, true);
        ensure(
          type && type.event_id === eventId && !type.archived_at,
          "NOT_FOUND",
          "Không tìm thấy loại vé.",
          404,
        );
        const existing = await orders.waitActive(p.userId, typeId);
        if (existing) return existing;
        ensure(
          event.status === "PUBLISHED" &&
            !event.sales_paused &&
            new Date(event.ends_at) > new Date() &&
            new Date(type.sale_starts_at) <= new Date() &&
            new Date(type.sale_ends_at) > new Date(),
          "SALES_CLOSED",
          "Danh sách chờ chưa mở hoặc đã đóng.",
        );
        ensure(
          type.capacity - type.reserved_quantity - type.sold_quantity === 0 ||
            (await orders.waitHead(typeId)),
          "TICKETS_AVAILABLE",
          "Vẫn còn vé. Bạn có thể đặt vé trực tiếp.",
        );
        return orders.waitJoin(p.userId, event, type);
      }),
    leave: (p: Principal, id: string) =>
      uow.run(async () => {
        const initial = await orders.waitOne(id);
        ensure(
          initial?.user_id === p.userId,
          "NOT_FOUND",
          "Không tìm thấy lượt chờ.",
          404,
        );
        await events.guard(initial.event_id, undefined, true);
        const entry = await orders.waitOne(id);
        if (entry.status === "OFFERED")
          await booking.cancelOrder(p, entry.order_id);
        else if (entry.status === "WAITING") await orders.waitCancel(id);
        return orders.waitOne(id);
      }),
    async process() {
      let after: string | null = null,
        count = 0;
      for (;;) {
        const candidates = await orders.waitEvents(after);
        if (!candidates.length) return count;
        for (const candidate of candidates) {
          count += await uow.run(async () => {
            const event = await events.guard(
              candidate.event_id,
              undefined,
              true,
            );
            let offered = 0;
            for (const row of await orders.waitTypes(event.id)) {
              const type = await orders.type(row.ticket_type_id, true);
              if (
                event.status !== "PUBLISHED" ||
                new Date(event.ends_at) <= new Date() ||
                type.archived_at ||
                new Date(type.sale_ends_at) <= new Date()
              ) {
                await orders.waitCloseType(type.id);
                continue;
              }
              if (
                event.sales_paused ||
                new Date(type.sale_starts_at) > new Date()
              )
                continue;
              let available =
                type.capacity - type.reserved_quantity - type.sold_quantity;
              // Bound each transaction while keyset paging visits every event.
              for (let n = 0; available > 0 && n < 100; n++) {
                const head = await orders.waitHead(type.id);
                if (!head) break;
                const buyer = await auth.waitQueueBuyer(head.user_id);
                if (!buyer) {
                  await orders.waitCancel(head.id);
                  continue;
                }
                const p: Principal = {
                  userId: head.user_id,
                  sessionId: "",
                  roles: [],
                  permissions: [],
                };
                const order = await orders.createOrder(
                  p,
                  event,
                  buyer,
                  [{ ticketTypeId: type.id, quantity: 1 }],
                  `wait-queue:${head.id}`,
                  true,
                );
                await orders.waitOffer(head.id, order.id);
                await notifications.send({
                  userId: head.user_id,
                  kind: "WAIT_QUEUE_OFFER",
                  title: "Đến lượt mua vé của bạn",
                  message: `${event.title} — ${type.name}: đã giữ 1 vé. Mở đơn để xem hạn thanh toán; hết hạn sẽ nhường lượt tiếp theo.`,
                  target: "ORDER",
                  targetId: order.id,
                  dedupeKey: `wait-queue:${head.id}`,
                });
                offered++;
                available--;
              }
            }
            return offered;
          });
        }
        after = candidates[candidates.length - 1].event_id;
      }
    },
  };
}
