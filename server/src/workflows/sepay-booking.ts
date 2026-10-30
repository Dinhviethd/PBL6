import { ensure, type Principal, type UnitOfWork, type Row } from "../contracts/core";
import type { Orders } from "../modules/order/public";
import type { Events } from "../modules/event/public";
import { newSepayCode, sepayDto, type Payments, type SepayPayments } from "../modules/payment/public";
import type { createAudit } from "../modules/audit/public";

export function createSepayBooking(orders: Orders, events: Events, payments: Payments,
  sepay: SepayPayments, audit: ReturnType<typeof createAudit>, uow: UnitOfWork,
  nextCode = newSepayCode) {
  async function owned(p: Principal, id: string) {
    const order = await orders.one(id);
    ensure(order && order.buyer_id === p.userId, "NOT_FOUND", "Không tìm thấy đơn hàng.", 404);
    return order;
  }
  return {
    async detail(p: Principal, id: string) {
      return uow.run(async () => {
        const initial = await owned(p, id);
        await events.guard(initial.event_id);
        const order = await orders.one(id, true);
        const payment = await sepay.latest(id);
        ensure(payment, "SEPAY_NOT_FOUND", "Đơn chưa có thanh toán SePay.", 404);
        return sepayDto(order, payment);
      });
    },
    async start(p: Principal, id: string) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await uow.run(async () => {
            const initial = await owned(p, id);
            const event = await events.guard(initial.event_id);
            const order = await orders.one(id, true);
            const reservations = await orders.lockInventory(order);
            ensure(!(await sepay.hasReview(id)), "PAYMENT_REVIEW", "Đơn đang cần tra soát thanh toán.");
            const prior = await payments.active(id);
            if (prior) {
              ensure(prior.provider === "sepay", "PAYMENT_PROVIDER_CONFLICT", "Đơn đang có thanh toán bằng phương thức khác.");
              const payment = await sepay.one(prior.id);
              ensure(payment, "PAYMENT_PROVIDER_CONFLICT", "Đơn đang có thanh toán ở môi trường hoặc tài khoản khác.");
              // Retry returns the original snapshot/deadlines, even when QR has expired.
              return { created: false, data: sepayDto(order, payment) };
            }
            ensure(event.status === "PUBLISHED" && !event.sales_paused, "SALES_CLOSED", "Sự kiện đã ngừng bán.");
            await orders.prepare(order, p);
            ensure(reservations.length > 0 && reservations.every(r => r.status === "HELD" && new Date(r.release_after).getTime() > Date.now()),
              "ORDER_CLOSED", "Vé không còn được giữ chỗ.");
            ensure(order.currency === "VND" && BigInt(order.total_amount) > 0n && BigInt(order.total_amount) <= 9007199254740991n,
              "SEPAY_AMOUNT", "Số tiền đơn không phù hợp thanh toán chuyển khoản.");
            ensure(new Date(order.expires_at).getTime() > Date.now() + 1000, "ORDER_CLOSED", "Đơn hàng sắp hết hạn.");
            const paymentId = await sepay.create(order, nextCode());
            const payment = await sepay.one(paymentId);
            await orders.extend(id, new Date(payment.reconcile_until));
            await audit.append(p, "sepay.payment.created", "payment", paymentId);
            return { created: true, data: sepayDto(order, payment) };
          });
        } catch (error) {
          // Any unique conflict rolls back the whole UoW before generating a fresh reference.
          if ((error as Row).code !== "23505") throw error;
        }
      }
      ensure(false, "SEPAY_RETRY", "Chưa tạo được mã thanh toán, vui lòng thử lại.", 409);
    },
  };
}
