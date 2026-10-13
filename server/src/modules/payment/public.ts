import type { Store, Row } from "../../contracts/core";
import { ensure } from "../../contracts/core";
import { paymentStore } from "./infrastructure/store";
import type { PaymentProvider } from "./provider";
import { randomUUID } from "node:crypto";
import { demoProvider } from "./provider";
import { vnpayProvider } from "./vnpay";
export { demoProvider } from "./provider";
export type { PaymentProvider, VerifiedPayment } from "./provider";
export function paymentProviderFromEnv(env = process.env): PaymentProvider {
  const mode = env.PAYMENT_MODE || "disabled";
  ensure(
    ["disabled", "demo", "vnpay_sandbox"].includes(mode),
    "CONFIG",
    "PAYMENT_MODE không hợp lệ.",
    500,
  );
  ensure(
    !(mode !== "disabled" && env.NODE_ENV === "production"),
    "CONFIG",
    "Thanh toán thử không được bật trong production.",
    500,
  );
  return mode === "vnpay_sandbox"
    ? vnpayProvider({
        tmnCode: env.VNPAY_TMN_CODE || "",
        hashSecret: env.VNPAY_HASH_SECRET || "",
        publicApiUrl: env.PUBLIC_API_URL || "",
        queryIp: env.VNPAY_QUERY_IP,
      })
    : demoProvider(mode === "demo");
}
export function createPayments(db: Store, provider: PaymentProvider) {
  const r = paymentStore(db);
  return {
    ...r,
    provider,
    create: (order: Row, ip = "127.0.0.1") => {
      const reference = randomUUID().replaceAll("-", "");
      return r.create(
        order,
        provider.createIntent({
          orderId: order.id,
          amount: String(order.total_amount),
          expiresAt: new Date(order.expires_at),
          reference,
          ip,
        }),
        reference,
      );
    },
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
