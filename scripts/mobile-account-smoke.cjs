// Real HTTP smoke against the dedicated local migration runtime; no API mocks.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:8015/api";
async function main() {
  const evidence = [];
  async function call(method, endpoint, body, token, expected = 200) {
    const form = body instanceof FormData;
    const response = await fetch(base + endpoint, {
      method,
      headers: {
        ...(!form ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
    const result = await response.json();
    evidence.push({
      method,
      endpoint,
      status: response.status,
      expected,
      code: result.code,
    });
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${result.message || ""}`,
    );
    return result.data;
  }
  await call("GET", "/health");
  const email = `mobile-${randomUUID()}@example.test`,
    password = "MobileTest2026!";
  const account = await call("POST", "/auth/mobile/register", {
    name: "Mobile QA",
    email,
    password,
    confirmPassword: password,
  });
  const token = account.accessToken;
  await call("GET", "/auth/me", undefined, token);
  const image = await require("../server/node_modules/sharp")({
    create: { width: 16, height: 16, channels: 3, background: "#7c3aed" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.append("image", new Blob([image], { type: "image/png" }), "avatar.png");
  const uploaded = await call("POST", "/media", form, token);
  const profile = await call(
    "PATCH",
    "/me",
    { name: "Mobile QA Updated", phone: "0900000000", avatarUrl: uploaded.url },
    token,
  );
  assert.equal(profile.avatarUrl, uploaded.url);
  assert.equal(profile.name, "Mobile QA Updated");
  await call(
    "POST",
    "/me/password",
    { currentPassword: "WrongPassword!", newPassword: "MobileChanged2026!" },
    token,
    400,
  );
  await call(
    "POST",
    "/me/password",
    { currentPassword: password, newPassword: "MobileChanged2026!" },
    token,
  );
  await call("GET", "/auth/me", undefined, token, 401);
  await call("POST", "/auth/mobile/login", {
    email,
    password: "MobileChanged2026!",
  });
  await call("POST", "/auth/forgot-password", { email });
  const mailbox = await (
    await fetch("http://127.0.0.1:8026/api/v1/messages")
  ).json();
  const message = mailbox.messages.find((m) =>
    m.To.some((to) => to.Address === email),
  );
  assert.ok(message, "OTP email received by local SMTP sink");
  const mail = await (
    await fetch(`http://127.0.0.1:8026/api/v1/message/${message.ID}`)
  ).json();
  const otp = mail.Text.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp);
  await call(
    "POST",
    "/auth/verify-otp",
    { email, otp: "000000" },
    undefined,
    400,
  );
  await call("POST", "/auth/verify-otp", { email, otp });
  await call("POST", "/auth/reset-password", {
    email,
    otp,
    newPassword: "MobileReset2026!",
    confirmPassword: "MobileReset2026!",
  });
  await call("POST", "/auth/mobile/login", {
    email,
    password: "MobileReset2026!",
  });
  await call("POST", "/auth/verify-otp", { email, otp }, undefined, 400);
  const result = {
    timestamp: new Date().toISOString(),
    target: base,
    test: "real PostgreSQL/HTTP/local SMTP",
    calls: evidence,
    assertions:
      "profile/avatar preserved, password revokes session, OTP sent/verified/consumed",
  };
  fs.mkdirSync(path.resolve(__dirname, "../.local/mobile-migration"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.resolve(
      __dirname,
      "../.local/mobile-migration/account-api-evidence.json",
    ),
    JSON.stringify(result, null, 2),
  );
  console.log(
    `PASS ${evidence.length} HTTP checks; real profile/upload/password/OTP, evidence redacted in .local/mobile-migration/account-api-evidence.json`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
