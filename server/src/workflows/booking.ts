import type { Auth } from "../modules/auth/public";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Payments, VerifiedPayment } from "../modules/payment/public";
import type { createAudit } from "../modules/audit/public";
import type { Notifications } from "../modules/notification/public";
import { randomUUID } from "node:crypto";
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
  notifications: Notifications,
) {
  const schedule = (e: Row) =>
    `${new Date(e.starts_at).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "medium",
      timeStyle: "short",
    })} (UTC+7), ${e.venue_name}, ${e.address}`;
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
  async function applyVerified(result: VerifiedPayment) {
    return uow.run(async () => {
      const initial = await payments.byReference(
        "vnpay_sandbox",
        result.merchant,
        result.reference,
      );
      ensure(initial, "VNPAY_NOT_FOUND", "Không tìm thấy giao dịch.", 404);
      const { order } = await lockedOrder(initial.order_id);
      await orders.lockInventory(order);
      const payment = await payments.one(initial.id, true);
      ensure(
        BigInt(payment.amount) * 100n === BigInt(result.amount) &&
          payment.currency === "VND",
        "VNPAY_AMOUNT",
        "Số tiền không khớp.",
        400,
      );
      // A later failure/query snapshot cannot overwrite confirmed success.
      if (
        payment.status === "SUCCEEDED" ||
        (payment.status === "FAILED" && result.status !== "SUCCEEDED")
      )
        return "ALREADY_APPLIED";
      await payments.verifiedResult(payment.id, result);
      const outcome =
        result.status === "SUCCEEDED"
          ? await orders.complete(order, payment)
          : result.status;
      if (outcome === "APPLIED" || outcome === "FAILED")
        await payments.clearTransientReview(payment.id);
      if (
        ["LATE_PAYMENT", "DIFFERENT_PAYMENT_ALREADY_APPLIED"].includes(outcome)
      )
        await payments.review(payment.id, outcome);
      if (
        result.status === "UNKNOWN" &&
        !["00:01", "01:01"].includes(result.code)
      )
        await payments.review(payment.id, "VNPAY_UNRESOLVED");
      await payments.recordVerified(payment, result);
      if (outcome === "APPLIED")
        await notifications.send({
          userId: order.buyer_id,
          kind: "ORDER_PAID",
          title: "Đặt vé thành công",
          message: `Đơn ${order.order_code} cho ${order.event_title_snapshot} đã thanh toán. Vé QR đã sẵn sàng.`,
          target: "ORDER",
          targetId: order.id,
          dedupeKey: `paid:${order.id}`,
        });
      await audit.append(null, "payment.verified", "payment", payment.id, {
        outcome,
      });
      return outcome;
    });
  }
  return {
    async vnpayIpn(input: unknown) {
      ensure(
        payments.provider.verifyIpn,
        "VNPAY_DISABLED",
        "VNPay chưa được bật.",
        503,
      );
      return applyVerified(payments.provider.verifyIpn(input));
    },
    async reconcile() {
      const provider = payments.provider;
      if (!provider.reconcile) return 0;
      let count = 0;
      for (const candidate of await payments.due()) {
        if (!(await payments.claim(candidate.id))) continue;
        try {
          const result = await provider.reconcile({
            merchant_reference: candidate.merchant_reference,
            checkout_url: candidate.checkout_url,
          });
          if (result) {
            await applyVerified(result);
            count++;
          }
        } catch {
          // Network and signature failures leave the payment unresolved, never FAILED.
          console.warn("VNPay reconciliation pending", candidate.id);
        } finally {
          await payments.defer(candidate.id);
        }
      }
      return count;
    },
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
      const event =
        o.buyer_id === p.userId
          ? await events.one(o.event_id)
          : await events.guard(o.event_id, p);
      ensure(event, "NOT_FOUND", "Không tìm thấy sự kiện.", 404);
      return {
        ...o,
        event: {
          id: event.id,
          slug: event.slug,
          title: event.title,
          cover_image_url: event.cover_image_url,
          venue_name: event.venue_name,
          address: event.address,
          city_code: event.city_code,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
        },
        items: await orders.items(id),
        payment: await payments.active(id),
        latest_payment: await payments.latest(id),
      };
    },
    startPayment: (p: Principal, id: string, ip = "127.0.0.1") =>
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
        if (prior) {
          ensure(
            prior.provider === payments.provider.name,
            "PAYMENT_PROVIDER_CHANGED",
            "Đơn đang có giao dịch từ chế độ thanh toán cũ. Vui lòng dùng đơn mới.",
          );
          return prior;
        }
        const attempt = await payments.create(order, ip);
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
        if (outcome === "APPLIED")
          await notifications.send({
            userId: order.buyer_id,
            kind: "ORDER_PAID",
            title: "Đặt vé thành công",
            message: `Đơn ${order.order_code} cho ${order.event_title_snapshot} đã thanh toán. Vé QR đã sẵn sàng.`,
            target: "ORDER",
            targetId: order.id,
            dedupeKey: `paid:${order.id}`,
          });
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
        d.slug = d.slug || e.slug;
        const saved = await events.save(e.organizer_id, d, id);
        const changed =
          new Date(d.startsAt).getTime() !== new Date(e.starts_at).getTime() ||
          new Date(d.endsAt).getTime() !== new Date(e.ends_at).getTime() ||
          d.address !== e.address ||
          d.venueName !== e.venue_name ||
          d.cityCode !== e.city_code ||
          new Date(d.checkinOpensAt).getTime() !==
            new Date(e.checkin_opens_at).getTime() ||
          new Date(d.checkinClosesAt).getTime() !==
            new Date(e.checkin_closes_at).getTime();
        if (changed) {
          const revision = randomUUID();
          for (const staff of await events.notificationStaff(id, true))
            await notifications.send({
              userId: staff.user_id,
              kind: "EVENT_UPDATED",
              title: "Lịch hoặc địa điểm đã thay đổi",
              message: `${saved.title}: ${schedule(saved)}. Vui lòng kiểm tra lại giờ check-in trong phân công.`,
              target: "STAFF",
              targetId: id,
              dedupeKey: `event-update:${id}:${revision}`,
            });
        }
        return saved;
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
        const event = await events.checkinGuard(id, p);
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
    inviteStaff: (p: Principal, eventId: string, email: string) =>
      uow.run(async () => {
        const event = await events.guard(eventId, p, true);
        const user = await auth.checkinInvitee(email);
        const invitation = await events.inviteCheckinStaff(event, p, user);
        await notifications.send({
          userId: user.id,
          kind: "STAFF_INVITED",
          title: "Lời mời nhân viên check-in",
          message: `Bạn được mời hỗ trợ check-in cho ${event.title}. Vào mục phân công để xem và trả lời lời mời.`,
          target: "STAFF",
          targetId: eventId,
          dedupeKey: `staff-invite:${invitation.id}`,
        });
        await audit.append(p, "event.staff_invited", "event", eventId, {
          invitationId: invitation.id,
          userId: user.id,
        });
        return invitation;
      }),
    respondStaff: (p: Principal, id: string, accept: boolean) =>
      uow.run(async () => {
        const initial = await events.staffInvitation(id);
        ensure(
          initial?.user_id === p.userId,
          "NOT_FOUND",
          "Không tìm thấy lời mời.",
          404,
        );
        const event = await events.guard(initial.event_id, undefined, true);
        const result = await events.respondCheckinInvitation(
          event,
          p,
          id,
          accept,
        );
        await audit.append(
          p,
          accept ? "event.staff_accepted" : "event.staff_declined",
          "event",
          event.id,
          { invitationId: id },
        );
        return result;
      }),
    revokeStaff: (p: Principal, eventId: string, id: string) =>
      uow.run(async () => {
        await events.guard(eventId, p, true);
        const result = await events.revokeCheckinStaff(eventId, id);
        await audit.append(p, "event.staff_revoked", "event", eventId, {
          invitationId: id,
          userId: result.user_id,
        });
        return result;
      }),
    async checkinHistory(p: Principal, eventId: string, offset: number) {
      await events.guard(eventId, p);
      const rows = await orders.checkinHistory(eventId, offset);
      const names = await auth.checkinActorNames([
        ...new Set(rows.map((r) => r.checked_in_by as string)),
      ]);
      return rows.map((r) => ({
        ...r,
        checked_in_by_name:
          names.find((n) => n.idUser === r.checked_in_by)?.name ??
          "Tài khoản không còn tồn tại",
      }));
    },
    async remind() {
      let after: string | null = null,
        count = 0;
      // Keyset pagination avoids starving later events; each retry recomputes
      // recipients so purchases made within the last 24 hours are included.
      for (;;) {
        const candidates = await events.reminderEvents(after);
        if (!candidates.length) break;
        for (const candidate of candidates) {
          count += await uow.run(async () => {
            const e = await events.guard(candidate.id);
            const remaining = new Date(e.starts_at).getTime() - Date.now();
            if (
              e.status !== "PUBLISHED" ||
              remaining <= 0 ||
              remaining > 86400000
            )
              return 0;
            const recipients = new Map<string, "TICKETS" | "STAFF">();
            for (const s of await events.notificationStaff(e.id))
              recipients.set(s.user_id, "STAFF");
            for (const b of await orders.reminderBuyers(e.id))
              recipients.set(b.user_id, "TICKETS");
            let sent = 0;
            // Stable ordering also prevents deadlocks between concurrent workers.
            for (const [userId, target] of [...recipients].sort(([a], [b]) =>
              a.localeCompare(b),
            )) {
              sent += await notifications.send({
                userId,
                kind: "EVENT_REMINDER",
                title: "Sự kiện sắp bắt đầu",
                message: `${e.title} bắt đầu lúc ${schedule(e)}. ${target === "STAFF" ? "Kiểm tra giờ check-in trong phân công của bạn." : "Chuẩn bị vé QR để check-in."}`,
                target,
                targetId: e.id,
                dedupeKey: `reminder:${e.id}:${new Date(e.starts_at).toISOString()}`,
              });
            }
            return sent;
          });
        }
        after = candidates[candidates.length - 1].id;
      }
      return count;
    },
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
