import { vnpayProvider } from "./vnpay";
import type { SepayConfig } from "./sepay";

function publicOrigin(value?: string) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

// DTO allowlist. Secrets are used only to validate setup, never returned.
export function paymentDisplayFromEnv(env: Record<string, string | undefined>) {
  const origin = publicOrigin(env.PUBLIC_API_URL);
  let vnpayConfigured = false;
  try {
    vnpayProvider({
      tmnCode: env.VNPAY_TMN_CODE ?? "",
      hashSecret: env.VNPAY_HASH_SECRET ?? "",
      publicApiUrl: env.PUBLIC_API_URL ?? "",
      queryIp: env.VNPAY_QUERY_IP,
    });
    vnpayConfigured = true;
  } catch {
    /* An unused sandbox config must not prevent SePay startup. */
  }
  return {
    publicApiOrigin: origin,
    vnpay: {
      configured: vnpayConfigured,
      merchantCode: /^[a-z\d]{8}$/i.test(env.VNPAY_TMN_CODE ?? "")
        ? env.VNPAY_TMN_CODE!
        : null,
      checkoutUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
      returnUrl: origin ? `${origin}/api/payments/vnpay/return` : null,
      ipnUrl: origin ? `${origin}/api/payments/vnpay/ipn` : null,
    },
  };
}

export type PaymentDisplay = ReturnType<typeof paymentDisplayFromEnv>;
export function paymentConfigurationInfo(
  sepay: SepayConfig | undefined,
  sepayAcceptNewPayments: boolean | undefined,
  provider: { name: string; enabled(): boolean },
  display?: PaymentDisplay,
) {
  const info = display ?? paymentDisplayFromEnv({});
  return {
    sepay: {
      name: "VietQR / SePay",
      configured: Boolean(sepay),
      enabled: Boolean(sepay && sepayAcceptNewPayments !== false),
      environment: sepay?.environment ?? null,
      bankCode: sepay?.bankCode ?? null,
      accountNumber: sepay?.accountNumber ?? null,
      accountName: sepay?.accountName ?? null,
      transferContent: sepay
        ? "tkh + 3–10 ký tự chữ/số (mã riêng của từng thanh toán)"
        : null,
      webhookUrl:
        sepay && info.publicApiOrigin
          ? `${info.publicApiOrigin}/api/payments/sepay/webhook`
          : null,
    },
    vnpay: {
      name: "VNPay Sandbox",
      environment: "sandbox",
      ...info.vnpay,
      enabled: provider.name === "vnpay_sandbox" && provider.enabled(),
    },
  };
}
