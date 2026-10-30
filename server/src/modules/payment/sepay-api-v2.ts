import type { Store, ExclusiveWork } from "../../contracts/core";
import type { SepayConfig } from "./sepay";
import { ensure } from "../../contracts/core";
import { extractSepayCode } from "./sepay";
import { sepayV2Store, type ApiTransactionRecord } from "./infrastructure/sepay-v2-store";

const BASES = { test: "https://userapi-sandbox.sepay.vn/v2", live: "https://userapi.sepay.vn/v2" } as const;
type SepayV2Transaction = ApiTransactionRecord & {
  accumulated?: number; bank_brand_name: string; bank_account_id: string; va_id: string | null;
  webhook_success?: number | null;
};
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validTransaction(value: unknown): value is SepayV2Transaction {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return typeof t.id === "string" && uuid.test(t.id) &&
    typeof t.transaction_date === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:?\d{2})?$/.test(t.transaction_date) &&
    typeof t.account_number === "string" && (t.va === null || typeof t.va === "string") &&
    (t.transfer_type === "in" || t.transfer_type === "out") &&
    Number.isSafeInteger(t.amount_in) && Number(t.amount_in) >= 0 &&
    Number.isSafeInteger(t.amount_out) && Number(t.amount_out) >= 0 &&
    typeof t.transaction_content === "string" && t.transaction_content.length <= 2048 &&
    (t.reference_number === null || typeof t.reference_number === "string") &&
    (t.code === null || typeof t.code === "string") && typeof t.bank_brand_name === "string" &&
    typeof t.bank_account_id === "string" && (t.va_id === null || typeof t.va_id === "string");
}

export function createSepayV2Client(token: string, fetcher: FetchLike = fetch, environment: SepayConfig["environment"] = "test") {
  ensure(environment === "test" || environment === "live", "SEPAY_V2_CONFIG", "Invalid SePay environment.", 503);
  ensure(typeof token === "string" && token.trim().length >= 10 && token.length <= 512 && !/\s/.test(token),
    "SEPAY_V2_CONFIG", "SePay API v2 token is missing or invalid.", 503);
  return {
    async listTransactions(query: URLSearchParams): Promise<{ data: SepayV2Transaction[]; hasMore: boolean }> {
      let response: Response;
      try { response = await fetcher(`${BASES[environment]}/transactions?${query}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      }); } catch { throw Object.assign(new Error("SePay API request timed out or failed."), {status:503,code:"SEPAY_V2_NETWORK"}); }
      if (!response.ok) {
        // Never include provider response bodies or credentials in errors/logs.
        const status = response.status;
        const error = new Error(status === 401 ? "SePay token was rejected." : status === 429 ? "SePay API rate limit reached." : `SePay API request failed (${status}).`);
        Object.assign(error, { status: status === 401 ? 503 : status === 429 ? 429 : status >= 500 ? 503 : 502, code: "SEPAY_V2_UPSTREAM" });
        throw error;
      }
      let body: unknown;
      try { body = await response.json(); } catch { throw Object.assign(new Error("SePay API response was not valid JSON."), { status: 502, code: "SEPAY_V2_RESPONSE" }); }
      const envelope = body as { status?: unknown; data?: unknown; meta?: { pagination?: { has_more?: unknown } } };
      ensure(envelope?.status === "success" && Array.isArray(envelope.data) && envelope.data.every(validTransaction) && typeof envelope.meta?.pagination?.has_more === "boolean",
        "SEPAY_V2_RESPONSE", "SePay API returned an unexpected transaction response.", 502);
      return { data: envelope.data, hasMore: envelope.meta?.pagination?.has_more === true };
    },
  };
}

function localTimestamp(date: Date) {
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace("T", " ");
}
export function createSepayV2Reconciler(db: Store, config: SepayConfig, token: string, fetcher?: FetchLike, exclusive?: ExclusiveWork) {
  const store = sepayV2Store(db, config);
  let client: ReturnType<typeof createSepayV2Client> | null = null;
  let busy = false;
  return {
    async reconcile(lookbackMinutes = 60) {
      ensure(Number.isInteger(lookbackMinutes) && lookbackMinutes >= 5 && lookbackMinutes <= 1440,
        "SEPAY_V2_RANGE", "Lookback phải từ 5 đến 1440 phút.", 400);
      ensure(!busy, "SEPAY_V2_BUSY", "Một lượt đối soát SePay đang chạy.", 409);
      ensure(exclusive, "SEPAY_V2_LOCK_REQUIRED", "Database reconciliation lock is not configured.", 503);
      busy = true;
      try {
      return await exclusive(`sepay:v2:${config.environment}`, async () => {
      client ??= createSepayV2Client(token, fetcher, config.environment);
      const now = new Date(), from = new Date(now.getTime() - lookbackMinutes * 60000);
      const queryBase = new URLSearchParams({
        transfer_type: "in", transaction_date_from: localTimestamp(from),
        transaction_date_to: localTimestamp(now), per_page: "100", page: "1", timestamp_format: "iso8601",
      });
      const rows: SepayV2Transaction[] = [];
      let pageNumber = 1, hasMore = true;
      while (hasMore && pageNumber <= 10) {
        const query = new URLSearchParams(queryBase); query.set("page", String(pageNumber));
        // Also delay the first request: separate processes share the DB lock,
        // so a new lock holder cannot immediately burst after its predecessor.
        await new Promise(resolve => setTimeout(resolve, 400));
        const page = await client.listTransactions(query); rows.push(...page.data); hasMore = page.hasMore; pageNumber++;
      }
      ensure(!hasMore, "SEPAY_V2_PAGE_LIMIT", "SePay reconcile exceeded the safe page limit; narrow the time window and retry.", 422);
      let imported = 0, reviewed = 0, matchedWebhook = 0, duplicates = 0, ignored = 0;
      const integration = `${config.bankCode}:${config.accountNumber}`;
      for (const t of rows) {
        if (t.account_number !== config.accountNumber || t.transfer_type !== "in" || t.amount_in <= 0) { ignored++; continue; }
        const code = t.code && /^tkh[A-Za-z0-9]{3,10}$/.test(t.code) ? t.code : extractSepayCode(t.transaction_content);
        const when = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(t.transaction_date) ? t.transaction_date : t.transaction_date.replace(" ", "T") + "+07:00");
        if (!Number.isFinite(when.getTime())) { ignored++; continue; }
        if (await store.hasApiTransaction(t.id)) { duplicates++; continue; }
        // Join an already received webhook only on an exact bank transaction tuple. The
        // API UUID and webhook numeric ID are different namespaces and are never equated.
        const webhookRows = await store.exactWebhookMatches(t, when);
        if (webhookRows.length === 1) {
          await store.attachApiId(webhookRows[0].id, t.id);
          matchedWebhook++; continue;
        }
        if (webhookRows.length > 1) {
          await store.recordApiTransaction(t, code, 'REVIEW', 'API_WEBHOOK_MATCH_AMBIGUOUS');
          reviewed++; continue;
        }
        const duplicateCode = code ? await store.hasPotentialDuplicate(code, t.amount_in, when) : false;
        // Keep unmatched/ambiguous deposits visible for admin review; never queue them
        // for automatic ticket issuance.
        if (!code || duplicateCode) {
          await store.recordApiTransaction(t, code, 'REVIEW', !code ? 'PAYMENT_CODE_MISSING_OR_AMBIGUOUS' : 'PAYMENT_CODE_AMBIGUOUS');
          reviewed++; continue;
        }
        await store.recordApiTransaction(t, code, 'RECEIVED', null);
        imported++;
      }
      return { scanned: rows.length, imported, reviewed, matchedWebhook, duplicates, ignored, windowMinutes: lookbackMinutes, truncated: false };
      });
      } finally { busy = false; }
    },
  };
}
