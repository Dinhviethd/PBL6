import type { Store, Row } from "../../contracts/core";
import { ensure } from "../../contracts/core";
import { paymentStore } from "./infrastructure/store";
import type { PaymentProvider } from "./provider";
export { demoProvider } from "./provider";
export type { PaymentProvider } from "./provider";
export function createPayments(db: Store, provider: PaymentProvider) {
  const r = paymentStore(db);
  return {
    ...r,
    provider,
    create: (order: Row) =>
      r.create(
        order,
        provider.createIntent({
          orderId: order.id,
          amount: String(order.total_amount),
          expiresAt: new Date(order.expires_at),
        }),
      ),
    result: (id: string, success: boolean) =>
      r.result(id, success, provider.demoTransactionId(id)),
    requireProvider() {
      ensure(
        provider.enabled(),
        "PAYMENT_NOT_CONFIGURED",
        "Chưa cấu hình cổng thanh toán.",
        503,
      );
    },
    requireDemo() {
      ensure(
        provider.demo &&
          provider.enabled() &&
          process.env.NODE_ENV !== "production",
        "DEMO_DISABLED",
        "Thanh toán demo không được bật.",
        404,
      );
    },
  };
}
export type Payments = ReturnType<typeof createPayments>;
