import { randomInt,createHmac,timingSafeEqual } from "node:crypto";
import { ensure, type Row, type Store } from "../../contracts/core";
import { sepayStore } from "./infrastructure/sepay-store";

export interface SepayConfig {
  environment: "test" | "live";
  bankCode: "MBBank";
  accountNumber: string;
  accountName: string;
  webhookSecret: string;
}
export function validateSepayConfig(c: SepayConfig): SepayConfig {
  ensure((c.environment === "test" || c.environment === "live") && c.bankCode === "MBBank" &&
    /^[A-Za-z0-9]{1,19}$/.test(c.accountNumber) &&
    typeof c.accountName === "string" && c.accountName.trim().length > 0 && c.accountName.length <= 150 &&
    typeof c.webhookSecret === "string" && Buffer.byteLength(c.webhookSecret, "utf8") >= 1 && Buffer.byteLength(c.webhookSecret, "utf8") <= 256,
    "SEPAY_CONFIG", "Cấu hình MBBank/SePay chưa hợp lệ.", 500);
  if (c.environment === "live") ensure(/^\d{1,19}$/.test(c.accountNumber) && Buffer.byteLength(c.webhookSecret, "utf8") >= 32,
    "SEPAY_CONFIG", "Cấu hình SePay Live chưa hợp lệ.", 500);
  return Object.freeze({ ...c, accountName: c.accountName.trim() });
}
export const validSepayCode = (s: string) => /^tkh[A-Za-z0-9]{3,10}$/.test(s);
export function newSepayCode() {
  // Variable length 3..10 as requested; randomInt avoids modulo bias.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "tkh" + Array.from({ length: randomInt(3, 11) }, () => alphabet[randomInt(alphabet.length)]).join("");
}
export function sepayQrUrl(account: string, amount: string, code: string) {
  ensure(/^[A-Za-z0-9]{1,19}$/.test(account) && /^[1-9]\d*$/.test(amount) &&
    BigInt(amount) <= 9007199254740991n && validSepayCode(code),
    "SEPAY_QR", "Thông tin QR không hợp lệ.", 500);
  const url = new URL("https://vietqr.app/img");
  url.search = new URLSearchParams({ acc: account, bank: "MBBank", amount, des: code, template: "compact" }).toString();
  return url.toString();
}
export type SepayWebhookPayload = {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  code: string | null;
  content: string;
  transferType: "in" | "out";
  transferAmount: number;
  accumulated: number;
  description: string;
  referenceCode: string;
};
export function parseSepayWebhook(raw: Buffer): SepayWebhookPayload {
  ensure(raw.length > 0 && raw.length <= 32768, "SEPAY_BODY", "Webhook payload không hợp lệ.", 400);
  let value: any;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { ensure(false, "SEPAY_JSON", "Webhook JSON không hợp lệ.", 400); }
  ensure(value !== null && typeof value === "object" && !Array.isArray(value), "SEPAY_PAYLOAD", "Webhook phải là JSON object.", 400);
  const string = (x: unknown, max: number, nullable = false) => nullable && (x === null || x === "") ? (x === "" ? null : null) : typeof x === "string" && x.length <= max ? x : undefined;
  const sub = string(value.subAccount, 100, true);
  const code = string(value.code, 128, true);
  ensure(Number.isSafeInteger(value.id) && value.id > 0 &&
    typeof value.gateway === "string" && value.gateway.length > 0 && value.gateway.length <= 32 &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value.transactionDate) &&
    typeof value.accountNumber === "string" && value.accountNumber.length > 0 && value.accountNumber.length <= 100 &&
    (sub === null || typeof sub === "string") && (code === null || typeof code === "string") &&
    typeof value.content === "string" && value.content.length <= 2048 &&
    (value.transferType === "in" || value.transferType === "out") &&
    Number.isSafeInteger(value.transferAmount) && value.transferAmount > 0 &&
    Number.isSafeInteger(value.accumulated) && value.accumulated >= 0 &&
    typeof value.description === "string" && value.description.length <= 2048 &&
    typeof value.referenceCode === "string" && value.referenceCode.length <= 256,
    "SEPAY_PAYLOAD", "Webhook có trường thiếu hoặc sai định dạng.", 400);
  const [date, time] = value.transactionDate.split(" ");
  const iso = new Date(`${date}T${time}Z`);
  ensure(Number.isFinite(iso.getTime()) && iso.toISOString().slice(0, 19) === `${date}T${time}`,
    "SEPAY_DATE", "Ngày giao dịch không hợp lệ.", 400);
  return { id:value.id, gateway:value.gateway, transactionDate:value.transactionDate, accountNumber:value.accountNumber,
    subAccount:sub as string|null, code:code as string|null, content:value.content, transferType:value.transferType,
    transferAmount:value.transferAmount, accumulated:value.accumulated, description:value.description, referenceCode:value.referenceCode };
}
export function extractSepayCode(content: string) {
  const matches = content.match(/(?:^|[^A-Za-z0-9])(tkh[A-Za-z0-9]{3,10})(?=$|[^A-Za-z0-9])/g) ?? [];
  const codes = matches.map((m) => m.match(/tkh[A-Za-z0-9]{3,10}/)![0]);
  return codes.length === 1 ? codes[0] : null;
}
export function verifySepayHmac(raw: Buffer, timestamp: string | undefined, signature: string | undefined, secret: string, nowSeconds = Math.floor(Date.now()/1000)) {
  if (!timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(nowSeconds-ts)>300) return false;
  const expected = createHmac("sha256",secret).update(timestamp+".").update(raw).digest();
  const received = Buffer.from(signature.slice(7),"hex");
  return received.length===expected.length && timingSafeEqual(expected,received);
}
export function sepayDto(order: Row, payment: Row) {
  const canTransfer = order.status === "PENDING_PAYMENT" && payment.status === "PENDING" &&
    !payment.requires_review && new Date(payment.provider_expires_at).getTime() > Date.now();
  return {
    paymentId: payment.id, orderId: order.id, orderStatus: order.status,
    status: payment.status, environment: payment.environment,
    amount: String(payment.amount), currency: payment.currency,
    bank: payment.bank_code, accountNumber: payment.account_number, accountName: payment.account_name,
    transferContent: payment.transfer_content,
    qrUrl: canTransfer ? sepayQrUrl(payment.account_number, String(payment.amount), payment.transfer_content) : null,
    canTransfer, expiresAt: new Date(payment.provider_expires_at).toISOString(),
    holdUntil: new Date(payment.reconcile_until).toISOString(),
    requiresReview: payment.requires_review,
    updatedAt: new Date(payment.updated_at).toISOString(),
    lastVerifiedAt: payment.last_verified_at ? new Date(payment.last_verified_at).toISOString() : null,
  };
}
export function createSepayPayments(db: Store, config: SepayConfig) {
  const safe = validateSepayConfig(config);
  return { ...sepayStore(db, safe), config: safe };
}
export type SepayPayments = ReturnType<typeof createSepayPayments>;
