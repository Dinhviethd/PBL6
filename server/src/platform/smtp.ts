import { ensure } from "../contracts/core";
export function smtpOptions(env = process.env) {
  const host = env.SMTP_HOST?.trim(),
    from = env.SMTP_FROM?.trim();
  const port = Number(env.SMTP_PORT || 587),
    secure = env.SMTP_SECURE || "false";
  ensure(
    host && from,
    "EMAIL_NOT_CONFIGURED",
    "Cần SMTP_HOST và SMTP_FROM.",
    503,
  );
  ensure(
    Number.isInteger(port) &&
      port > 0 &&
      port <= 65535 &&
      ["true", "false"].includes(secure) &&
      !(port === 465 && secure !== "true") &&
      !(port === 587 && secure !== "false"),
    "EMAIL_NOT_CONFIGURED",
    "SMTP_PORT hoặc SMTP_SECURE không hợp lệ.",
    503,
  );
  ensure(
    Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS),
    "EMAIL_NOT_CONFIGURED",
    "Cần cả SMTP_USER và SMTP_PASS.",
    503,
  );
  if (host.toLowerCase() === "smtp.gmail.com") {
    const address = from.match(/<([^<>]+)>$/)?.[1] ?? from;
    ensure(
      env.SMTP_USER &&
        env.SMTP_PASS &&
        address.toLowerCase() === env.SMTP_USER.toLowerCase(),
      "EMAIL_NOT_CONFIGURED",
      "Gmail yêu cầu App Password và SMTP_FROM cùng địa chỉ SMTP_USER.",
      503,
    );
  }
  return {
    host,
    port,
    secure: secure === "true",
    requireTLS: secure !== "true",
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  };
}
