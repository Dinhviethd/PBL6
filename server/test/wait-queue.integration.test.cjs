const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createWaitQueue } = require("../dist/workflows/wait-queue");
const url = process.env.TEST_DATABASE_URL;

test(
  "wait queue PostgreSQL invariants and HTTP ownership",
  { skip: !url, timeout: 90000 },
  async (t) => {
    assert.ok(new URL(url).pathname.endsWith("_test"));
    const db = new DataSource({
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
    await db.initialize();
    t.after(() => db.destroy());
    await db.runMigrations();
    assert.deepEqual(await db.runMigrations(), []);
    for (const role of ["USER", "ADMIN", "ORGANIZER"])
      await db.query(
        'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
        [randomUUID(), role],
      );
    const app = createApplication({
      databaseUrl: url,
      secret: "wait-queue-secret-".repeat(4),
      qrSecret: "wait-queue-qr-".repeat(4),
      demo: true,
    });
    await app.start();
    t.after(() => app.close());
    const server = app.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const account = async (role) => {
      const session = await app.auth.register({
        name: role,
        email: `${randomUUID()}@example.test`,
        password: "WaitQueueTest2026!",
      });
      await db.query(
        'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2 ON CONFLICT DO NOTHING',
        [session.user.idUser, role],
      );
      return { ...session, p: await app.auth.resolve(session.accessToken) };
    };
    const organizer = await account("ORGANIZER"),
      admin = await account("ADMIN");
    const a = await account("USER"),
      b = await account("USER"),
      c = await account("USER");
    const category = (
      await app.events.saveCategory({ name: "Queue test", slug: randomUUID() })
    )[0];
    const fixture = async (capacity = 1) => {
      const end = new Date(Date.now() + 86400000).toISOString();
      const event = await app.booking.saveEvent(organizer.p, {
        categoryId: category.id,
        slug: randomUUID(),
        title: "Queue event",
        description: "Queue regression",
        venueName: "Hall",
        address: "Test",
        cityCode: "DN",
        startsAt: new Date(Date.now() + 3600000).toISOString(),
        endsAt: end,
        checkinOpensAt: new Date().toISOString(),
        checkinClosesAt: end,
      });
      const type = await app.booking.configureType(organizer.p, event.id, {
        name: "Standard",
        price: "100000",
        capacity,
        saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
        saleEndsAt: end,
      });
      await app.booking.submit(organizer.p, event.id);
      await app.booking.review(admin.p, event.id, true, "");
      const buy = (user = a, quantity = 1, key = randomUUID()) =>
        app.booking.createOrder(
          user.p,
          event.id,
          [{ ticketTypeId: type.id, quantity }],
          key,
        );
      return {
        event,
        type,
        buy,
        join: (user) => app.waitQueue.join(user.p, event.id, type.id),
      };
    };
    const state = async (id) => app.orders.waitOne(id);
    const http = async (method, path, user, body) => {
      const r = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${user.accessToken}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };
    await t.test(
      "join requires sold out; duplicate joins are idempotent; HTTP isolates ownership",
      async () => {
        const f = await fixture();
        await assert.rejects(f.join(b), (e) => e.code === "TICKETS_AVAILABLE");
        const held = await f.buy();
        const joins = await Promise.all([f.join(b), f.join(b), f.join(b)]);
        assert.equal(new Set(joins.map((w) => w.id)).size, 1);
        const id = joins[0].id;
        assert.equal(
          (
            await http("POST", `/events/${f.event.id}/wait-queue`, null, {
              ticketTypeId: f.type.id,
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await http("POST", `/events/${f.event.id}/wait-queue`, b, {
              ticketTypeId: "bad",
            })
          ).status,
          400,
        );
        const list = await http("GET", "/me/wait-queue", b);
        assert.equal(list.status, 200);
        assert.ok(
          list.body.data.some((w) => w.id === id && w.position === "1"),
        );
        assert.ok(
          !(await http("GET", "/me/wait-queue", c)).body.data.some(
            (w) => w.id === id,
          ),
        );
        assert.equal(
          (await http("DELETE", `/me/wait-queue/${id}`, c)).status,
          404,
        );
        assert.equal(
          (await http("DELETE", `/me/wait-queue/${id}`, b)).status,
          200,
        );
        assert.equal((await state(id)).status, "CANCELLED");
        const again = await f.join(b);
        assert.notEqual(again.id, id);
        await app.waitQueue.leave(b.p, again.id);
        await app.booking.cancelOrder(a.p, held.id);
      },
    );
    await t.test(
      "FIFO, two workers, no queue jumping, payment completes one offer",
      async () => {
        const f = await fixture(),
          held = await f.buy(),
          first = await f.join(b),
          second = await f.join(c);
        await app.booking.cancelOrder(a.p, held.id);
        await assert.rejects(f.buy(), (e) => e.code === "WAIT_QUEUE_PRIORITY");
        await Promise.all([app.waitQueue.process(), app.waitQueue.process()]);
        const offered = await state(first.id);
        assert.equal(offered.status, "OFFERED");
        assert.equal((await state(second.id)).status, "WAITING");
        assert.equal((await app.orders.type(f.type.id)).reserved_quantity, 1);
        assert.equal(
          (await app.notifications.inbox(b.p, 0, false)).items.filter(
            (n) => n.target_id === offered.order_id,
          ).length,
          1,
        );
        assert.equal(
          (await http("GET", `/me/orders/${offered.order_id}`, c)).status,
          403,
        );
        const payment = await app.booking.startPayment(b.p, offered.order_id);
        await assert.rejects(
          app.waitQueue.leave(b.p, first.id),
          (e) => e.code === "PAYMENT_IN_PROGRESS",
        );
        await app.booking.demoPayment(b.p, payment.id, true);
        assert.equal((await state(first.id)).status, "COMPLETED");
        const inventory = await app.orders.type(f.type.id);
        assert.equal(inventory.sold_quantity, 1);
        assert.equal(inventory.reserved_quantity, 0);
        await app.waitQueue.leave(c.p, second.id);
      },
    );
    await t.test(
      "expiry passes to next buyer; rejecting offer releases reservation",
      async () => {
        const f = await fixture(),
          held = await f.buy(),
          first = await f.join(b),
          second = await f.join(c);
        await app.booking.cancelOrder(a.p, held.id);
        await app.waitQueue.process();
        const offered = await state(first.id);
        await db.query(
          "UPDATE reservations SET created_at=now()-interval '1 hour',release_after=now()-interval '1 second' WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)",
          [offered.order_id],
        );
        await app.booking.expire();
        await app.waitQueue.process();
        assert.equal((await state(first.id)).status, "EXPIRED");
        assert.equal((await state(second.id)).status, "OFFERED");
        await app.waitQueue.leave(c.p, second.id);
        assert.equal((await state(second.id)).status, "CANCELLED");
        assert.equal((await app.orders.type(f.type.id)).reserved_quantity, 0);
      },
    );
    await t.test(
      "notification failure rolls back order, inventory and queue promotion",
      async () => {
        const f = await fixture(),
          held = await f.buy(),
          first = await f.join(b);
        await app.booking.cancelOrder(a.p, held.id);
        const failing = createWaitQueue(
          app.auth,
          app.events,
          app.orders,
          {
            send: async () => {
              throw Error("delivery-failed");
            },
          },
          app.uow,
          app.booking,
        );
        await assert.rejects(failing.process(), /delivery-failed/);
        assert.equal((await state(first.id)).status, "WAITING");
        assert.equal((await app.orders.type(f.type.id)).reserved_quantity, 0);
        assert.equal(
          await app.orders.byKey(b.p.userId, `wait-queue:${first.id}`),
          undefined,
        );
        await app.waitQueue.process();
        await app.waitQueue.leave(b.p, first.id);
      },
    );
    await t.test(
      "pause defers offers; disabled head is skipped; closing sale cancels waiters",
      async () => {
        const f = await fixture(),
          held = await f.buy(),
          first = await f.join(b),
          second = await f.join(c);
        await app.booking.cancelOrder(a.p, held.id);
        await app.booking.pause(organizer.p, f.event.id, true);
        await app.waitQueue.process();
        assert.equal((await state(first.id)).status, "WAITING");
        await db.query(
          "UPDATE users SET locked_at=now(),lock_reason='Queue test' WHERE \"idUser\"=$1",
          [b.p.userId],
        );
        try {
          await app.booking.pause(organizer.p, f.event.id, false);
          await app.waitQueue.process();
        } finally {
          await db.query(
            'UPDATE users SET locked_at=NULL,lock_reason=NULL WHERE "idUser"=$1',
            [b.p.userId],
          );
        }
        assert.equal((await state(first.id)).status, "CANCELLED");
        assert.equal((await state(second.id)).status, "OFFERED");
        const last = await f.join(b);
        await db.query(
          "UPDATE ticket_types SET sale_ends_at=now()-interval '1 second' WHERE id=$1",
          [f.type.id],
        );
        await app.waitQueue.process();
        assert.equal((await state(last.id)).status, "CANCELLED");
        await app.waitQueue.leave(c.p, second.id);
      },
    );
    await t.test(
      "normal buyer racing worker cannot take the queued place",
      async () => {
        const f = await fixture(),
          held = await f.buy(),
          first = await f.join(b);
        await app.booking.cancelOrder(a.p, held.id);
        const results = await Promise.allSettled([
          app.waitQueue.process(),
          f.buy(c),
        ]);
        assert.equal(results[0].status, "fulfilled");
        assert.equal(results[1].status, "rejected");
        assert.equal((await state(first.id)).status, "OFFERED");
        assert.equal((await app.orders.type(f.type.id)).reserved_quantity, 1);
        await app.waitQueue.leave(b.p, first.id);
      },
    );
  },
);
