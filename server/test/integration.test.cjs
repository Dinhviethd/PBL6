const { test, before, after } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");
const {
  InitialMvp1790812800000,
} = require("../dist/migrations/InitialMvp1790812800000");
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  test(
    "PostgreSQL integration suite (set TEST_DATABASE_URL)",
    { skip: true },
    () => {},
  );
} else {
  if (!new URL(url).pathname.endsWith("_test"))
    throw Error("Integration database name must end with _test.");
  let app,
    fixture,
    server,
    base,
    admin,
    organizer,
    other,
    buyer,
    eventId,
    typeId;
  const password = "Integration2026!";
  const call = async (method, path, body, token, headers = {}) => {
    const r = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie"),
    };
  };
  const ok = async (...args) => {
    const r = await call(...args);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data;
  };
  before(async () => {
    const migration = new DataSource({
      type: "postgres",
      url,
      migrations: [InitialMvp1790812800000],
    });
    await migration.initialize();
    await migration.runMigrations();
    await migration.destroy();
    fixture = createDatabase(url);
    await fixture.start();
    const db = fixture.owner("auth");
    for (const code of ["USER", "ADMIN", "ORGANIZER"])
      await db.query(
        'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
        [randomUUID(), code],
      );
    app = createApplication({
      databaseUrl: url,
      secret: "integration-secret-".repeat(3),
      qrSecret: "integration-qr-secret-".repeat(3),
      demo: true,
    });
    await app.start();
    server = app.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    async function account(role) {
      const data = await ok("POST", "/auth/register", {
        name: role,
        email: `${randomUUID()}@example.test`,
        password,
        confirmPassword: password,
      });
      if (role !== "USER")
        await db.query(
          'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
          [data.user.idUser, role],
        );
      return data;
    }
    admin = await account("ADMIN");
    organizer = await account("ORGANIZER");
    other = await account("ORGANIZER");
    buyer = await account("USER");
    const cat = await ok(
      "POST",
      "/admin/categories",
      { name: "Integration", slug: randomUUID() },
      admin.accessToken,
    );
    const start = new Date(Date.now() + 3600000).toISOString(),
      end = new Date(Date.now() + 86400000).toISOString();
    const event = await ok(
      "POST",
      "/organizer/events",
      {
        categoryId: cat.id,
        slug: randomUUID(),
        title: "Integration event",
        description: "Integration test fixture",
        venueName: "Hall",
        address: "Test address",
        cityCode: "DN",
        startsAt: start,
        endsAt: end,
        checkinOpensAt: new Date(Date.now() - 3600000).toISOString(),
        checkinClosesAt: end,
      },
      organizer.accessToken,
    );
    eventId = event.id;
    const type = await ok(
      "POST",
      `/organizer/events/${eventId}/ticket-types`,
      {
        name: "Standard",
        price: "100000",
        capacity: 5,
        saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
        saleEndsAt: end,
      },
      organizer.accessToken,
    );
    typeId = type.id;
    await ok(
      "POST",
      `/organizer/events/${eventId}/submit`,
      {},
      organizer.accessToken,
    );
    await ok(
      "POST",
      `/admin/events/${eventId}/review`,
      { approve: true },
      admin.accessToken,
    );
  });
  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (app) await app.close();
    if (fixture) await fixture.close();
  });
  test("three-role workflow, concurrent inventory, repeated payment, QR and isolation", async () => {
    assert.equal(
      (await call("GET", "/admin/users", undefined, buyer.accessToken)).status,
      403,
    );
    assert.equal(
      (
        await call(
          "GET",
          `/organizer/events/${eventId}`,
          undefined,
          other.accessToken,
        )
      ).status,
      403,
    );
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        call(
          "POST",
          "/orders",
          { eventId, items: [{ ticketTypeId: typeId, quantity: 1 }] },
          buyer.accessToken,
          { "Idempotency-Key": randomUUID() },
        ),
      ),
    );
    const accepted = results.filter((r) => r.status === 200);
    assert.equal(
      accepted.length,
      5,
      JSON.stringify(results.map((r) => r.body)),
    );
    const order = accepted[0].body.data;
    const payment = await ok(
      "POST",
      `/orders/${order.id}/payments`,
      {},
      buyer.accessToken,
    );
    const raw = new DataSource({ type: "postgres", url });
    await raw.initialize();
    try {
      await raw.query(
        "ALTER TABLE tickets ADD CONSTRAINT integration_block_issue CHECK (false) NOT VALID",
      );
      assert.equal(
        (
          await call(
            "POST",
            `/payments/${payment.id}/demo`,
            { success: true },
            buyer.accessToken,
          )
        ).status,
        409,
      );
      assert.equal((await app.payments.one(payment.id)).status, "PENDING");
      assert.equal((await app.orders.one(order.id)).status, "PENDING_PAYMENT");
      assert.equal((await app.orders.type(typeId)).sold_quantity, 0);
    } finally {
      await raw.query(
        "ALTER TABLE tickets DROP CONSTRAINT integration_block_issue",
      );
      await raw.destroy();
    }
    const callbacks = await Promise.all(
      [1, 2].map(() =>
        call(
          "POST",
          `/payments/${payment.id}/demo`,
          { success: true },
          buyer.accessToken,
        ),
      ),
    );
    assert.ok(
      callbacks.every((r) => r.status === 200),
      JSON.stringify(callbacks),
    );
    const tickets = await ok(
      "GET",
      "/me/tickets",
      undefined,
      buyer.accessToken,
    );
    assert.equal(tickets.length, 1);
    const qr = await ok(
      "GET",
      `/me/tickets/${tickets[0].id}`,
      undefined,
      buyer.accessToken,
    );
    assert.match(qr.qrImage, /^data:image\/png;base64,/);
    assert.equal(
      (
        await call(
          "GET",
          `/me/tickets/${tickets[0].id}`,
          undefined,
          other.accessToken,
        )
      ).status,
      404,
    );
    const scans = await Promise.all(
      [1, 2].map(() =>
        call(
          "POST",
          `/organizer/events/${eventId}/checkins`,
          { code: qr.code },
          organizer.accessToken,
        ),
      ),
    );
    assert.ok(
      scans.every((r) => r.status === 200),
      JSON.stringify(scans),
    );
    assert.equal(scans.filter((r) => !r.body.data.duplicate).length, 1);
    const stats = await ok(
      "GET",
      `/organizer/events/${eventId}/stats`,
      undefined,
      organizer.accessToken,
    );
    assert.equal(stats.revenue, "100000");
    assert.equal(stats.sold, "1");
    assert.equal(stats.checkins, "1");
    const publicList = await ok(
      "GET",
      "/events?minPrice=100000&maxPrice=100000",
    );
    assert.ok(publicList.items.length > 0);
    await ok(
      "POST",
      `/orders/${accepted[1].body.data.id}/cancel`,
      {},
      buyer.accessToken,
    );
    const key = randomUUID(),
      payload = { eventId, items: [{ ticketTypeId: typeId, quantity: 1 }] };
    const a = await ok("POST", "/orders", payload, buyer.accessToken, {
      "Idempotency-Key": key,
    });
    const b = await ok("POST", "/orders", payload, buyer.accessToken, {
      "Idempotency-Key": key,
    });
    assert.equal(a.id, b.id);
    assert.equal(
      (
        await call(
          "POST",
          "/orders",
          { eventId, items: [{ ticketTypeId: typeId, quantity: 2 }] },
          buyer.accessToken,
          { "Idempotency-Key": key },
        )
      ).status,
      409,
    );
  });
  test("shared UnitOfWork rolls back mutations from multiple owners", async () => {
    const id = randomUUID();
    await assert.rejects(() =>
      fixture.uow.run(async () => {
        await fixture
          .owner("event")
          .query("INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)", [
            id,
            "Rollback",
            id,
          ]);
        await fixture
          .owner("audit")
          .query(
            "INSERT INTO audit_logs(id,actor_kind,action,resource_type,resource_id) VALUES($1,'SYSTEM','test','category',$2)",
            [randomUUID(), id],
          );
        throw Error("fault injection");
      }),
    );
    assert.equal(
      (
        await fixture
          .owner("event")
          .query("SELECT id FROM categories WHERE id=$1", [id])
      ).length,
      0,
    );
    assert.equal(
      (
        await fixture
          .owner("audit")
          .query("SELECT id FROM audit_logs WHERE resource_id=$1", [id])
      ).length,
      0,
    );
  });
  test("late demo result cannot issue tickets after expiry; expiry is idempotent", async () => {
    const pending = (await app.orders.list(buyer.user.idUser, eventId)).find(
      (o) => o.status === "PENDING_PAYMENT",
    );
    const p = await ok(
      "POST",
      `/orders/${pending.id}/payments`,
      {},
      buyer.accessToken,
    );
    await fixture
      .owner("order")
      .query(
        "UPDATE reservations SET created_at=now()-interval '1 hour',release_after=now()-interval '1 minute' WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)",
        [pending.id],
      );
    await fixture
      .owner("payment")
      .query(
        "UPDATE payments SET created_at=now()-interval '1 hour',provider_expires_at=now()-interval '2 minutes',reconcile_until=now()-interval '1 minute' WHERE id=$1",
        [p.id],
      );
    await app.booking.expire();
    await app.booking.expire();
    const result = await ok(
      "POST",
      `/payments/${p.id}/demo`,
      { success: true },
      buyer.accessToken,
    );
    assert.equal(result.outcome, "LATE_PAYMENT");
    assert.equal((await app.orders.one(pending.id)).status, "EXPIRED");
    assert.equal((await app.payments.one(p.id)).requires_review, true);
    assert.equal((await app.orders.tickets(buyer.user.idUser, null)).length, 1);
  });
  test("refresh rotates cookie and replay revokes the session", async () => {
    const login = await call("POST", "/auth/login", {
      email: buyer.user.email,
      password,
    });
    const oldCookie = login.cookie.split(";")[0];
    const rotated = await call("POST", "/auth/refresh-token", {}, undefined, {
      Cookie: oldCookie,
    });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.cookie.split(";")[0], oldCookie);
    assert.equal(
      (
        await call("POST", "/auth/refresh-token", {}, undefined, {
          Cookie: oldCookie,
        })
      ).status,
      401,
    );
    assert.equal(
      (await call("GET", "/auth/me", undefined, rotated.body.data.accessToken))
        .status,
      401,
    );
  });
  test("logout and account lock invalidate existing access sessions", async () => {
    await ok(
      "PATCH",
      `/admin/users/${other.user.idUser}`,
      { status: "ACTIVE", locked: true, reason: "integration" },
      admin.accessToken,
    );
    assert.equal(
      (await call("GET", "/auth/me", undefined, other.accessToken)).status,
      403,
    );
    const login = await call("POST", "/auth/login", {
      email: buyer.user.email,
      password,
    });
    const token = login.body.data.accessToken;
    assert.ok(!("refreshToken" in login.body.data));
    await ok("POST", "/auth/logout", {}, token);
    assert.equal((await call("GET", "/auth/me", undefined, token)).status, 401);
    const refresh = await call("POST", "/auth/refresh-token", {}, undefined, {
      Cookie: login.cookie.split(";")[0],
    });
    assert.equal(refresh.status, 401);
  });
}
