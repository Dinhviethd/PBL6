import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { ensure } from "../../contracts/core";
import type { PaymentProvider, VerifiedPayment } from "./provider";

const checkout = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const gateway = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
type Fields = Record<string, string>;
export const vnpDate = (date: Date) =>
  new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, "");
// VNPay 2.1.0 uses form encoding (spaces as +), sorted by parameter name.
export function canonical(fields: Fields) {
  return new URLSearchParams(
    Object.entries(fields)
      .filter(
        ([key]) => key !== "vnp_SecureHash" && key !== "vnp_SecureHashType",
      )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ).toString();
}
const digest = (secret: string, value: string) =>
  createHmac("sha512", secret).update(value).digest("hex");
function checkHash(secret: string, data: string, hash: string) {
  ensure(
    /^[a-f\d]{128}$/i.test(hash) &&
      timingSafeEqual(
        Buffer.from(digest(secret, data), "hex"),
        Buffer.from(hash, "hex"),
      ),
    "VNPAY_SIGNATURE",
    "Chữ ký VNPay không hợp lệ.",
    400,
  );
}
function fields(input: unknown, json = false): Fields {
  ensure(
    input && typeof input === "object" && !Array.isArray(input),
    "VNPAY_DATA",
    "Dữ liệu VNPay không hợp lệ.",
    400,
  );
  const result: Fields = {};
  for (const [key, raw] of Object.entries(input)) {
    // querydr JSON may serialize numeric fields as numbers; query parameters must remain scalar strings.
    const value =
      json &&
      ["vnp_Amount", "vnp_TransactionNo", "vnp_PromotionAmount"].includes(
        key,
      ) &&
      typeof raw === "number" &&
      Number.isSafeInteger(raw) &&
      raw >= 0
        ? String(raw)
        : raw;
    ensure(
      key.startsWith("vnp_") &&
        typeof value === "string" &&
        value.length <= 2048,
      "VNPAY_DATA",
      "Dữ liệu VNPay không hợp lệ.",
      400,
    );
    result[key] = value;
  }
  return result;
}
function verified(f: Fields, merchant: string): VerifiedPayment {
  ensure(
    f.vnp_TmnCode === merchant,
    "VNPAY_MERCHANT",
    "Merchant không khớp.",
    400,
  );
  ensure(
    /^[a-z\d]{1,100}$/i.test(f.vnp_TxnRef ?? "") &&
      /^\d{1,12}$/.test(f.vnp_Amount ?? "") &&
      /^\d{2}$/.test(f.vnp_ResponseCode ?? "") &&
      /^\d{2}$/.test(f.vnp_TransactionStatus ?? "") &&
      /^\d{1,15}$/.test(f.vnp_TransactionNo ?? ""),
    "VNPAY_DATA",
    "Dữ liệu VNPay không hợp lệ.",
    400,
  );
  const success =
    f.vnp_ResponseCode === "00" && f.vnp_TransactionStatus === "00";
  ensure(
    !success || BigInt(f.vnp_TransactionNo) > 0n,
    "VNPAY_DATA",
    "Thiếu mã giao dịch.",
    400,
  );
  return {
    reference: f.vnp_TxnRef,
    merchant,
    amount: f.vnp_Amount,
    transactionId:
      BigInt(f.vnp_TransactionNo) > 0n ? f.vnp_TransactionNo : null,
    status: success
      ? "SUCCEEDED"
      : f.vnp_TransactionStatus === "02"
        ? "FAILED"
        : "UNKNOWN",
    code: `${f.vnp_ResponseCode}:${f.vnp_TransactionStatus}`,
  };
}
export function vnpayProvider(
  config: {
    tmnCode: string;
    hashSecret: string;
    publicApiUrl: string;
    queryIp?: string;
  },
  send: typeof fetch = fetch,
): PaymentProvider {
  ensure(
    /^[a-z\d]{8}$/i.test(config.tmnCode) &&
      config.hashSecret.trim().length >= 16,
    "CONFIG",
    "Cần VNPAY_TMN_CODE và VNPAY_HASH_SECRET hợp lệ.",
    500,
  );
  let base: URL;
  try {
    base = new URL(config.publicApiUrl);
  } catch {
    throw Error("PUBLIC_API_URL phải là HTTPS origin công khai.");
  }
  ensure(
    base.protocol === "https:" &&
      !base.username &&
      !base.password &&
      base.pathname === "/" &&
      !base.search &&
      !base.hash &&
      !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname),
    "CONFIG",
    "PUBLIC_API_URL phải là HTTPS origin công khai.",
    500,
  );
  const queryIp = config.queryIp || "127.0.0.1";
  ensure(isIP(queryIp), "CONFIG", "VNPAY_QUERY_IP không hợp lệ.", 500);
  return {
    name: "vnpay_sandbox",
    demo: false,
    enabled: () => true,
    demoTransactionId() {
      throw Error("VNPay does not support demo results");
    },
    createIntent({ amount, expiresAt, reference, ip }) {
      const value = BigInt(amount) * 100n;
      ensure(
        value > 0n && value <= 999999999999n,
        "VNPAY_AMOUNT",
        "Số tiền vượt giới hạn VNPay.",
        400,
      );
      ensure(
        expiresAt.getTime() > Date.now() + 1000,
        "ORDER_CLOSED",
        "Đơn hàng sắp hết hạn.",
      );
      const f: Fields = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: config.tmnCode,
        vnp_Amount: String(value),
        vnp_CurrCode: "VND",
        vnp_TxnRef: reference,
        vnp_OrderInfo: `Thanh toan EventHub ${reference}`,
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: `${base.origin}/api/payments/vnpay/return`,
        vnp_IpAddr: isIP(ip) ? ip : "127.0.0.1",
        vnp_CreateDate: vnpDate(new Date()),
        vnp_ExpireDate: vnpDate(expiresAt),
      };
      const data = canonical(f);
      return {
        provider: "vnpay_sandbox",
        merchantAccount: config.tmnCode,
        expiresAt,
        reconcileUntil: new Date(expiresAt.getTime() + 300000),
        checkoutUrl: `${checkout}?${data}&vnp_SecureHash=${digest(config.hashSecret, data)}`,
      };
    },
    verifyIpn(input) {
      const f = fields(input);
      checkHash(config.hashSecret, canonical(f), f.vnp_SecureHash ?? "");
      return verified(f, config.tmnCode);
    },
    async reconcile(payment) {
      const date = new URL(payment.checkout_url).searchParams.get(
        "vnp_CreateDate",
      );
      ensure(
        date && /^\d{14}$/.test(date),
        "VNPAY_DATA",
        "Thiếu thời gian giao dịch.",
      );
      const f: Fields = {
        vnp_RequestId: randomUUID().replaceAll("-", ""),
        vnp_Version: "2.1.0",
        vnp_Command: "querydr",
        vnp_TmnCode: config.tmnCode,
        vnp_TxnRef: payment.merchant_reference,
        vnp_TransactionDate: date,
        vnp_CreateDate: vnpDate(new Date()),
        vnp_IpAddr: queryIp,
        vnp_OrderInfo: `Truy van EventHub ${payment.merchant_reference}`,
      };
      f.vnp_SecureHash = digest(config.hashSecret, Object.values(f).join("|"));
      const response = await send(gateway, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
        signal: AbortSignal.timeout(15000),
      });
      ensure(
        response.ok,
        "VNPAY_UNAVAILABLE",
        "Chưa truy vấn được VNPay.",
        503,
      );
      const r = fields(await response.json(), true);
      const keys = [
        "ResponseId",
        "Command",
        "ResponseCode",
        "Message",
        "TmnCode",
        "TxnRef",
        "Amount",
        "BankCode",
        "PayDate",
        "TransactionNo",
        "TransactionType",
        "TransactionStatus",
        "OrderInfo",
        "PromotionCode",
        "PromotionAmount",
      ];
      checkHash(
        config.hashSecret,
        keys.map((k) => r[`vnp_${k}`] ?? "").join("|"),
        r.vnp_SecureHash ?? "",
      );
      ensure(
        r.vnp_TmnCode === config.tmnCode &&
          r.vnp_TxnRef === payment.merchant_reference &&
          (!r.vnp_Command || r.vnp_Command === "querydr"),
        "VNPAY_DATA",
        "Kết quả truy vấn không khớp.",
      );
      // A failed query is not proof that the payment failed (91 = not found).
      if (r.vnp_ResponseCode !== "00") return null;
      ensure(
        r.vnp_TransactionType === "01",
        "VNPAY_DATA",
        "Không phải giao dịch thanh toán.",
      );
      return verified(r, config.tmnCode);
    },
  };
}
