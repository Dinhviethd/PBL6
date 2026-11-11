const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const dir = path.resolve(__dirname, "../.local/mobile-migration");
async function main() {
  const fixture = JSON.parse(
      fs.readFileSync(path.join(dir, "booking-fixture.json"), "utf8"),
    ),
    config = JSON.parse(
      fs.readFileSync(path.join(dir, "runtime.json"), "utf8"),
    );
  const base = "http://127.0.0.1:8016/api",
    evidence = [];
  async function call(method, endpoint, body, token, expected = 200) {
    const response = await fetch(base + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
  const initial = await call("POST", "/auth/mobile/login", fixture.owner);
  const { Client } = require("../server/node_modules/pg");
  const db = new Client({
    host: "127.0.0.1",
    port: 55433,
    database: "eventhub_mobile_test",
    user: "mobile_test",
    password: config.password,
    ssl: false,
  });
  await db.connect();
  try {
    await db.query(
      'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=\'ADMIN_MANAGER\' ON CONFLICT DO NOTHING',
      [initial.user.idUser],
    );
  } finally {
    await db.end();
  }
  try {
    const owner = await call("POST", "/auth/mobile/login", fixture.owner),
      token = owner.accessToken;
    const catalog = await call(
      "GET",
      "/admin/administrators/catalog",
      undefined,
      token,
    );
    assert.equal(catalog.canManage, true);
    await call("GET", "/admin/administrators", undefined, token);
    const candidate = await call("POST", "/auth/mobile/register", {
      name: "Admin Mobile QA",
      email: `${randomUUID()}@example.test`,
      password: "MobileTest2026!",
      confirmPassword: "MobileTest2026!",
    });
    const granted = await call(
      "POST",
      "/admin/administrators",
      { email: candidate.user.email, manager: false },
      token,
    );
    const detail = await call(
      "GET",
      `/admin/administrators/${granted.id}`,
      undefined,
      token,
    );
    await call(
      "PATCH",
      `/admin/administrators/${granted.id}`,
      {
        version: detail.version,
        admin: true,
        manager: false,
        locked: true,
        reason: "Kiểm thử khóa quản trị viên",
      },
      token,
    );
    const locked = await call(
      "GET",
      `/admin/administrators/${granted.id}`,
      undefined,
      token,
    );
    await call(
      "PATCH",
      `/admin/administrators/${granted.id}`,
      {
        version: locked.version,
        admin: false,
        manager: false,
        locked: false,
        reason: "Kết thúc kiểm thử phân quyền",
      },
      token,
    );
    await call(
      "POST",
      "/admin/sepay/reconcile",
      { lookbackMinutes: 60 },
      token,
      503,
    );
    console.log(
      `PASS ${evidence.length} administrator/config checks. SePay v2 reconciliation returns 503 without sandbox token (recorded dependency).`,
    );
  } finally {
    fs.writeFileSync(
      path.join(dir, "administrators-api-evidence.json"),
      JSON.stringify(
        { timestamp: new Date().toISOString(), target: base, calls: evidence },
        null,
        2,
      ),
    );
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
