import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";
import type { DatabaseTls } from "../platform/database";
import { ensure } from "../contracts/core";
import { paymentProviderFromEnv, validateSepayConfig, type SepayConfig } from "../modules/payment/public";

type Env = Record<string, string | undefined>;
const required = (env: Env, key: string, min = 1) => {
  const value = env[key];
  ensure(typeof value === "string" && value.trim() === value && value.length >= min,
    "SEPAY_RUNTIME_CONFIG", `Missing or invalid ${key}.`, 500);
  return value;
};
const integer = (env: Env, key: string, fallback: number, min: number, max: number) => {
  const raw = env[key] ?? String(fallback);
  ensure(/^\d+$/.test(raw) && Number(raw) >= min && Number(raw) <= max,
    "SEPAY_RUNTIME_CONFIG", `Invalid ${key}.`, 500);
  return Number(raw);
};
const additionalClientOrigins = (raw: string | undefined) => {
  if (!raw) return [];
  const values = raw.split(",").map((value) => value.trim());
  ensure(values.length <= 5 && values.every(Boolean), "SEPAY_RUNTIME_CONFIG", "Invalid CLIENT_EXTRA_ORIGINS.", 500);
  const origins = values.map((value) => {
    let url: URL;
    try { url = new URL(value); } catch { throw Object.assign(new Error("Invalid CLIENT_EXTRA_ORIGINS."), { code: "SEPAY_RUNTIME_CONFIG", status: 500 }); }
    ensure(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.origin === value && !url.username && !url.password,
      "SEPAY_RUNTIME_CONFIG", "Extra client origins must be explicit loopback HTTP origins.", 500);
    return url.origin;
  });
  return [...new Set(origins)];
};

// Used by both API and worker; no dotenv loading, network calls or random secrets here.
export function loadRuntimeConfig(env: Env = process.env) {
  const enabled = env.SEPAY_ENABLED ?? "false";
  ensure(enabled === "true" || enabled === "false", "SEPAY_RUNTIME_CONFIG", "SEPAY_ENABLED must be true or false.", 500);
  const base = {
    databaseUrl: env.DATABASE_URL ?? "", secret: env.JWT_ACCESS_SECRET ?? "",
    qrSecret: env.QR_SECRET ?? "", demo: env.PAYMENT_MODE === "demo",
    paymentProvider: paymentProviderFromEnv(env), clientUrl: env.CLIENT_URL,
    clientOrigins: additionalClientOrigins(env.CLIENT_EXTRA_ORIGINS),
  };
  if (enabled === "false") return { app: base, worker: null };
  const acceptNewPayments = env.SEPAY_ACCEPT_NEW_PAYMENTS ?? "true";
  ensure(["true", "false"].includes(acceptNewPayments), "SEPAY_RUNTIME_CONFIG", "Invalid SEPAY_ACCEPT_NEW_PAYMENTS.", 500);
  const environment = required(env, "SEPAY_ENV");
  ensure(environment === "test" || environment === "live", "SEPAY_RUNTIME_CONFIG", "Invalid SEPAY_ENV.", 500);
  ensure(!base.paymentProvider.enabled(), "SEPAY_LEGACY_MODE", "SePay requires PAYMENT_MODE=disabled.", 500);
  ensure(env.SEPAY_CREDENTIAL_ENV === environment, "SEPAY_RUNTIME_CONFIG", "SEPAY_CREDENTIAL_ENV must match SEPAY_ENV.", 500);
  required(env, "JWT_ACCESS_SECRET", 32); required(env, "QR_SECRET", 32);
  const sepay: SepayConfig = {
    environment, bankCode: required(env, "SEPAY_BANK_CODE") as "MBBank",
    accountNumber: required(env, "SEPAY_ACCOUNT_NUMBER"), accountName: required(env, "SEPAY_ACCOUNT_NAME"),
    webhookSecret: required(env, "SEPAY_WEBHOOK_SECRET", environment === "live" ? 32 : 1),
  };
  const token = required(env, "SEPAY_API_V2_TOKEN", 10);
  validateSepayConfig(sepay);
  ensure(token.length <= 512 && !/\s/.test(token), "SEPAY_RUNTIME_CONFIG", "Invalid SEPAY_API_V2_TOKEN.", 500);
  ensure(!env.SEPAY_API_V2_BASE_URL, "SEPAY_RUNTIME_CONFIG", "SePay endpoint overrides are not supported.", 500);
  let url: URL;
  try { url = new URL(required(env, "DATABASE_URL")); } catch { throw new Error("Invalid database configuration."); }
  ensure(["postgres:", "postgresql:"].includes(url.protocol), "SEPAY_RUNTIME_CONFIG", "Invalid database protocol.", 500);
  ensure(url.username && url.password && url.pathname.length > 1 && !url.hash &&
    [...url.searchParams.keys()].every(key => ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"].includes(key)),
    "SEPAY_RUNTIME_CONFIG", "Database URL must not override connection identity or runtime settings.", 500);
  ensure(env.SEPAY_DB_TARGET === `${url.hostname}:${url.port || "5432"}${url.pathname}`,
    "SEPAY_RUNTIME_CONFIG", "Database target does not match SEPAY_DB_TARGET.", 500);
  let databaseSsl: DatabaseTls | false = false;
  if (environment === "live") {
    ensure(env.DB_SSL === "true", "SEPAY_RUNTIME_CONFIG", "Live requires verified database TLS.", 500);
    ensure(!env.SEPAY_API_V2_SANDBOX_TOKEN && !env.SEPAY_TEST_WEBHOOK_SECRET,
      "SEPAY_RUNTIME_CONFIG", "Remove Test/Sandbox credentials from the Live environment.", 500);
    let ca: string;
    try { ca = readFileSync(required(env, "DB_SSL_CA_FILE"), "utf8"); new X509Certificate(ca); }
    catch { throw new Error("Invalid or unreadable DB_SSL_CA_FILE."); }
    databaseSsl = { ca, rejectUnauthorized: true };
  } else {
    ensure(env.NODE_ENV !== "production" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
      "SEPAY_RUNTIME_CONFIG", "Test runtime requires a local isolated database and non-production mode.", 500);
  }
  // Prevent connection-string SSL parameters overriding verified TLS options.
  url.search = "";
  return {
    app: { ...base, databaseUrl: url.toString(), databaseSsl: databaseSsl as DatabaseTls | false, sepay, sepayApiV2Token: token, sepayAcceptNewPayments: acceptNewPayments === "true" },
    worker: {
      pollMs: integer(env, "SEPAY_WORKER_POLL_MS", 2000, 250, 30000),
      batch: integer(env, "SEPAY_WORKER_BATCH", 10, 1, 100),
      reconcileMs: integer(env, "SEPAY_RECONCILE_MS", 60000, 10000, 3600000),
      lookbackMinutes: integer(env, "SEPAY_LOOKBACK_MINUTES", 60, 5, 1440),
    },
  };
}
