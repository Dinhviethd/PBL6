const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");
const url = process.env.TEST_DATABASE_URL;
test(
  "A9 PostgreSQL: scoped history, date boundaries, >50 orders, payment retries, cancel and tickets",
  { skip: !url, timeout: 90000 },
  async () => {
    assert.ok(new URL(url).pathname.endsWith("_test"));
    const migration = new DataSource({
      type: "postgres",
      url,
      migrations: [
        require("../dist/migrations/InitialMvp1790812800000")
          .InitialMvp1790812800000,
        require("../dist/migrations/EventCheckinStaff1791072000000")
          .EventCheckinStaff1791072000000,
        require("../dist/migrations/Notifications1791331200000")
          .Notifications1791331200000,
        require("../dist/migrations/WaitQueue1792627200000")
          .WaitQueue1792627200000,
      ],
    });
    await migration.initialize();
    await migration.runMigrations();
    await migration.destroy();
    const fixture = createDatabase(url);
    await fixture.start();
    const app = createApplication({
      databaseUrl: url,
      secret: "a9-integration-secret".repeat(3),
      qrSecret: "a9-qr-secret".repeat(3),
      demo: true,
      clientUrl: "http://localhost:5173",
    });
    let server;
    try {
      const auth = fixture.owner("auth");
      for (const code of ["USER", "ORGANIZER", "ADMIN"])
        await auth.query(
          'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
          [randomUUID(), code],
        );
      await app.start();
      server = app.app.listen(0, "127.0.0.1");
      await new Promise((r) => server.on("listening", r));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      const request = async (method, path, body, token) => {
        const r = await fetch(base + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: r.status, ...(await r.json()) };
      };
      const ok = async (...args) => {
        const r = await request(...args);
        assert.equal(r.status, 200, JSON.stringify(r));
        return r.data;
      };
      const account = async (role) => {
        const a = await app.auth.register({
          name: "A9 fixture",
          email: `${randomUUID()}@example.test`,
          password: "Fixture2026!",
        });
        if (role !== "USER")
          await auth.query(
            'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
            [a.user.idUser, role],
          );
        return a;
      };
      const buyer = await account("USER"),
        other = await account("USER"),
        organizer = await account("ORGANIZER"),
        admin = await account("ADMIN");
      const bp = await app.auth.resolve(buyer.accessToken);
      const cat = await ok(
        "POST",
        "/admin/categories",
        { name: "A9 fixture", slug: randomUUID() },
        admin.accessToken,
      );
      const end = new Date(Date.now() + 86400000).toISOString();
      const e = await ok(
        "POST",
        "/organizer/events",
        {
          categoryId: cat.id,
          slug: randomUUID(),
          title: "A9 isolated event",
          description: "Test",
          venueName: "Test",
          address: "Test",
          cityCode: "DN",
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: end,
          checkinOpensAt: new Date(Date.now() - 3600000).toISOString(),
          checkinClosesAt: end,
        },
        organizer.accessToken,
      );
      const t = await ok(
        "POST",
        `/organizer/events/${e.id}/ticket-types`,
        {
          name: "Standard",
          price: "100000",
          capacity: 100,
          saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
          saleEndsAt: end,
        },
        organizer.accessToken,
      );
      await ok(
        "POST",
        `/organizer/events/${e.id}/submit`,
        {},
        organizer.accessToken,
      );
      await ok(
        "POST",
        `/admin/events/${e.id}/review`,
        { approve: true },
        admin.accessToken,
      );
      const make = () =>
        app.booking.createOrder(
          bp,
          e.id,
          [{ ticketTypeId: t.id, quantity: 2 }],
          randomUUID(),
        );
      const cancelled = await make();
      await ok("POST", `/orders/${cancelled.id}/cancel`, {}, buyer.accessToken);
      assert.equal(
        (
          await ok(
            "GET",
            `/me/order-history/${cancelled.id}`,
            undefined,
            buyer.accessToken,
          )
        ).status,
        "CANCELLED",
      );
      assert.equal(
        (
          await request(
            "POST",
            `/orders/${cancelled.id}/payments`,
            {},
            buyer.accessToken,
          )
        ).status,
        409,
      );
      const paid = await make();
      const first = await ok(
        "POST",
        `/orders/${paid.id}/payments`,
        {},
        buyer.accessToken,
      );
      assert.equal(
        (
          await request(
            "POST",
            `/orders/${paid.id}/cancel`,
            {},
            buyer.accessToken,
          )
        ).code,
        "PAYMENT_IN_PROGRESS",
      );
      await app.booking.demoPayment(bp, first.id, false);
      const retry = await ok(
        "POST",
        `/orders/${paid.id}/payments`,
        {},
        buyer.accessToken,
      );
      assert.notEqual(retry.id, first.id);
      await app.booking.demoPayment(bp, retry.id, true);
      const detail = await ok(
        "GET",
        `/me/order-history/${paid.id}`,
        undefined,
        buyer.accessToken,
      );
      assert.equal(detail.ticketList.length, 2);
      assert.equal(detail.payment.paid.id, retry.id);
      assert.equal(detail.actions.canCancel, false);
      // Isolated fixtures emulate a duplicate provider attempt after the canonical payment.
      const duplicate = await app.payments.create(await app.orders.one(paid.id));
      await app.booking.demoPayment(bp, duplicate.id, false);
      let observed = await ok("GET", `/me/order-history/${paid.id}`, undefined, buyer.accessToken);
      assert.equal(observed.payment.latest.id, duplicate.id);
      assert.equal(observed.payment.paid.id, retry.id);
      assert.equal(observed.group, "paid");
      await app.booking.demoPayment(bp, duplicate.id, true);
      observed = await ok("GET", `/me/order-history/${paid.id}`, undefined, buyer.accessToken);
      assert.equal(observed.payment.unresolvedReview, true);
      assert.equal(observed.group, "processing");
      assert.equal(observed.ticketList.length, 2);
      const late = await app.payments.create(await app.orders.one(cancelled.id));
      await app.booking.demoPayment(bp, late.id, true);
      observed = await ok("GET", `/me/order-history/${cancelled.id}`, undefined, buyer.accessToken);
      assert.equal(observed.status, "CANCELLED");
      assert.equal(observed.payment.unresolvedReview, true);
      assert.equal(observed.ticketList.length, 0);
      assert.equal(
        (
          await request(
            "GET",
            `/me/order-history/${paid.id}`,
            undefined,
            other.accessToken,
          )
        ).status,
        403,
      );
      assert.equal((await request("GET", "/me/order-history")).status, 401);
      assert.equal(
        (await ok("GET", "/me/order-history", undefined, other.accessToken))
          .pagination.total,
        0,
      );
      const orderDb = fixture.owner("order");
      for (let i = 0; i < 61; i++)
        await orderDb.query(
          `INSERT INTO orders(id,order_code,buyer_id,event_id,status,total_quantity,total_amount,buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,created_at,expires_at,closed_at) VALUES($1,$2,$3,$4,'EXPIRED',1,100000,'Fixture','fixture@example.test',$5,$1::uuid::text,'fixture',$6,$7,$7)`,
          [
            randomUUID(),
            `A9-${randomUUID().slice(0, 20)}`,
            buyer.user.idUser,
            e.id,
            i === 60 ? "Unique boundary event" : "Batch fixture",
            i === 60 ? "2026-01-01T17:00:00Z" : "2026-01-01T16:59:59.999Z",
            "2026-01-02T17:00:00Z",
          ],
        );
      const history = await ok(
        "GET",
        "/me/order-history?page=12&pageSize=5",
        undefined,
        buyer.accessToken,
      );
      assert.equal(history.pagination.total, 63);
      assert.equal(history.items.length, 3);
      assert.equal(history.summary.totalAmount, "200000");
      const search = await ok(
        "GET",
        "/me/order-history?q=Unique%20boundary",
        undefined,
        buyer.accessToken,
      );
      assert.equal(search.pagination.total, 1);
      assert.equal(search.summary.totalAmount, "200000");
      const dates = await ok(
        "GET",
        "/me/order-history?from=2025-12-31T17:00:00Z&toExclusive=2026-01-01T17:00:00Z",
        undefined,
        buyer.accessToken,
      );
      assert.equal(dates.pagination.total, 60);
      const legacy = await ok(
        "GET",
        "/me/orders",
        undefined,
        buyer.accessToken,
      );
      assert.ok(Array.isArray(legacy));
      assert.equal(legacy.length, 50);
    } finally {
      if (server) await new Promise((r) => server.close(r));
      await app.close();
      await fixture.close();
    }
  },
);
