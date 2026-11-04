const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  paymentDisplayFromEnv,
  paymentConfigurationInfo,
} = require("../dist/modules/payment/public");
const { c12Fixture } = require("./fixtures/c12.cjs");

test("C12 payment information is allowlisted, separates configured/enabled, validates sandbox origin", () => {
  const display = paymentDisplayFromEnv({
    VNPAY_TMN_CODE: "TEST1234",
    VNPAY_HASH_SECRET: "a-secret-with-32-characters-exactly",
    PUBLIC_API_URL: "https://sandbox-app.example.test",
    SEPAY_API_V2_TOKEN: "never-return-this",
  });
  const info = paymentConfigurationInfo(
    {
      environment: "test",
      bankCode: "MBBank",
      accountNumber: "12345",
      accountName: "Test",
      webhookSecret: "never-return-this",
    },
    false,
    { name: "disabled", enabled: () => false },
    display,
  );
  assert.equal(info.sepay.configured, true);
  assert.equal(info.sepay.enabled, false);
  assert.equal(info.sepay.environment, "test");
  assert.equal(info.vnpay.configured, true);
  assert.equal(info.vnpay.enabled, false);
  assert.equal(
    info.vnpay.ipnUrl,
    "https://sandbox-app.example.test/api/payments/vnpay/ipn",
  );
  assert.doesNotMatch(
    JSON.stringify(info),
    /never-return|hashSecret|webhookSecret|API_V2_TOKEN/,
  );
  assert.equal(
    paymentConfigurationInfo(undefined, undefined, {
      name: "disabled",
      enabled: () => false,
    }).sepay.environment,
    null,
  );
  for (const PUBLIC_API_URL of [
    "https://user:secret@example.test",
    "https://example.test?token=secret",
    "http://localhost:8000",
    "invalid",
  ]) {
    const result = paymentDisplayFromEnv({
      PUBLIC_API_URL,
      VNPAY_TMN_CODE: "TEST1234",
      VNPAY_HASH_SECRET: "a".repeat(32),
    });
    assert.equal(result.vnpay.configured, false);
    assert.equal(result.publicApiOrigin, null);
  }
});

test(
  "C12 HTTP permissions, grants, transactions, conflicts, sessions and concurrent manager protection",
  { skip: !process.env.C12_TEST_DATABASE_URL },
  async (t) => {
    const f = await c12Fixture(process.env.C12_TEST_DATABASE_URL);
    t.after(() => f.close());
    const manager = await f.login("manager");
    const admin = await f.login("admin");
    const user = await f.login("customer");
    const candidateBefore = await f.login("candidate");
    const get = async (path, token = manager) => {
      const r = await f.call("GET", path, undefined, token);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data;
    };
    for (const path of [
      "/admin/settings/payment-information",
      "/admin/administrators",
      "/admin/administrators/catalog",
    ]) {
      assert.equal((await f.call("GET", path)).status, 401);
      assert.equal((await f.call("GET", path, undefined, user)).status, 403);
      const result = await f.call("GET", path, undefined, admin);
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("cache-control"), "no-store");
    }
    const info = await get("/admin/settings/payment-information");
    assert.equal(info.sepay.enabled, true);
    assert.equal(info.vnpay.configured, true);
    assert.equal(info.vnpay.enabled, false);
    assert.equal(
      (await get("/admin/administrators/catalog", admin)).canManage,
      false,
    );
    assert.equal((await get("/admin/administrators/catalog")).canManage, true);
    const list = await get("/admin/administrators?limit=1&page=0");
    assert.equal(list.items.length, 1);
    assert.ok(list.pagination.total >= 2);
    const secondPage = await get("/admin/administrators?limit=1&page=1");
    assert.equal(secondPage.items.length, 1);
    assert.notEqual(secondPage.items[0].id, list.items[0].id);
    assert.equal(
      (
        await get(
          "/admin/administrators?q=" +
            encodeURIComponent(f.accounts.customer.email),
        )
      ).items.length,
      0,
    );
    assert.equal(
      (await f.call("GET", "/admin/administrators?page=-1", undefined, manager))
        .status,
      400,
    );
    assert.equal(
      (
        await f.call(
          "GET",
          "/admin/administrators?limit=101",
          undefined,
          manager,
        )
      ).status,
      400,
    );
    const grant = { email: f.accounts.candidate.email, manager: false };
    assert.equal(
      (await f.call("POST", "/admin/administrators", grant, admin)).status,
      403,
    );
    assert.equal(
      (
        await f.call(
          "POST",
          "/admin/administrators",
          { email: "absent@example.test", manager: false },
          manager,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await f.call(
          "POST",
          "/admin/administrators",
          { ...grant, roles: ["ADMIN_MANAGER"] },
          manager,
        )
      ).status,
      400,
    );
    const granted = await f.call(
      "POST",
      "/admin/administrators",
      grant,
      manager,
    );
    assert.equal(granted.status, 200, JSON.stringify(granted.body));
    assert.equal(granted.body.data.manager, false);
    assert.equal(
      (await f.call("GET", "/auth/me", undefined, candidateBefore)).status,
      401,
    );
    assert.equal(
      (await f.call("POST", "/admin/administrators", grant, manager)).status,
      409,
    );
    const candidate = await f.login("candidate");
    const initial = await get(
      "/admin/administrators/" + f.accounts.candidate.id,
    );
    assert.equal(
      (
        await f.call(
          "POST",
          "/admin/administrators",
          { email: f.accounts.other.email, manager: true },
          candidate,
        )
      ).status,
      403,
    );
    const update = {
      version: initial.version,
      admin: true,
      manager: true,
      locked: false,
      reason: "C12 test grant",
    };
    const updated = await f.call(
      "PATCH",
      "/admin/administrators/" + initial.id,
      update,
      manager,
    );
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(
      (await f.call("GET", "/auth/me", undefined, candidate)).status,
      401,
    );
    assert.equal(
      (
        await f.call(
          "PATCH",
          "/admin/administrators/" + initial.id,
          update,
          manager,
        )
      ).status,
      409,
    );
    const self = await get("/admin/administrators/" + f.accounts.manager.id);
    assert.equal(
      (
        await f.call(
          "PATCH",
          "/admin/administrators/" + self.id,
          { ...update, version: self.version },
          manager,
        )
      ).status,
      400,
    );
    // Customer endpoint cannot bypass administrator protections.
    assert.equal(
      (
        await f.call(
          "PATCH",
          "/admin/users/" + initial.id,
          { status: "INACTIVE", locked: true, reason: "Bypass attempt" },
          manager,
        )
      ).status,
      400,
    );
    const after = await get("/admin/administrators/" + initial.id);
    assert.equal(after.manager, true);
    const lock = await f.call(
      "PATCH",
      "/admin/administrators/" + initial.id,
      { ...update, version: after.version, locked: true, reason: "C12 lock" },
      manager,
    );
    assert.equal(lock.status, 200);
    assert.equal(
      (
        await f.call("POST", "/auth/login", {
          email: f.accounts.candidate.email,
          password: f.accounts.candidate.password,
        })
      ).status,
      403,
    );
    const locked = await get("/admin/administrators/" + initial.id);
    assert.equal(
      (
        await f.call(
          "PATCH",
          "/admin/administrators/" + initial.id,
          {
            ...update,
            version: locked.version,
            locked: false,
            reason: "C12 unlock",
          },
          manager,
        )
      ).status,
      200,
    );
    const candidateManager = await f.login("candidate");
    const a = await get("/admin/administrators/" + initial.id);
    const b = await get("/admin/administrators/" + self.id);
    // Both managers try to remove the other's management access. Serialization + reauthorization
    // allow exactly one; the surviving manager cannot be removed by a stale principal.
    const results = await Promise.all([
      f.call(
        "PATCH",
        "/admin/administrators/" + a.id,
        { ...update, version: a.version, manager: false },
        manager,
      ),
      f.call(
        "PATCH",
        "/admin/administrators/" + b.id,
        { ...update, version: b.version, manager: false },
        candidateManager,
      ),
    ]);
    assert.equal(
      results.filter((r) => r.status === 200).length,
      1,
      JSON.stringify(results),
    );
    assert.ok(results.some((r) => [401, 403].includes(r.status)));
    const logs = await f.db.query(
      `SELECT action FROM audit_logs WHERE action IN ('administrator.granted','administrator.updated') AND resource_id=$1`,
      [initial.id],
    );
    assert.ok(logs.length >= 4);
    // Fresh surviving manager can revoke ADMIN, retaining USER and preventing old sessions.
    const surviving =
      results[0].status === 200
        ? await f.login("manager")
        : await f.login("candidate");
    const otherId = results[0].status === 200 ? initial.id : self.id;
    const target = await get("/admin/administrators/" + otherId, surviving);
    assert.equal(
      (
        await f.call(
          "PATCH",
          "/admin/administrators/" + otherId,
          { ...update, version: target.version, admin: false, manager: false },
          surviving,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await f.call(
          "GET",
          "/admin/administrators/" + otherId,
          undefined,
          surviving,
        )
      ).status,
      404,
    );
    const roles = await f.db.query(
      `SELECT r.code FROM roles r JOIN users_roles ur ON ur."idRole"=r."idRole" WHERE ur."idUser"=$1`,
      [otherId],
    );
    assert.ok(roles.some((r) => r.code === "USER"));
    assert.ok(!roles.some((r) => ["ADMIN", "ADMIN_MANAGER"].includes(r.code)));
    // Audit and privilege/session changes must commit or roll back together.
    const oldSession = await f.login("other");
    await f.db
      .query(`CREATE OR REPLACE FUNCTION c12_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.resource_id='${f.accounts.other.id}'::uuid AND NEW.action='administrator.granted'
      THEN RAISE EXCEPTION 'C12 fixture audit failure'; END IF; RETURN NEW; END $$`);
    await f.db.query(
      `CREATE TRIGGER c12_reject_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION c12_reject_audit()`,
    );
    try {
      const failed = await f.call(
        "POST",
        "/admin/administrators",
        { email: f.accounts.other.email, manager: true },
        surviving,
      );
      assert.equal(failed.status, 500);
      const actual = await f.db.query(
        `SELECT r.code FROM roles r JOIN users_roles ur ON ur."idRole"=r."idRole" WHERE ur."idUser"=$1`,
        [f.accounts.other.id],
      );
      assert.deepEqual(
        actual.map((r) => r.code),
        ["USER"],
      );
      assert.equal(
        (await f.call("GET", "/auth/me", undefined, oldSession)).status,
        200,
      );
    } finally {
      await f.db.query(`DROP TRIGGER c12_reject_audit ON audit_logs`);
      await f.db.query(`DROP FUNCTION c12_reject_audit()`);
    }
  },
);
