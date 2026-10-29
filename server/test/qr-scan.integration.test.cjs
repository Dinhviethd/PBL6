const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const { DataSource } = require("typeorm");

async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
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
  await db.runMigrations();
  const app = require("../dist/app").createApplication({
    databaseUrl: url,
    secret: "b9-test-secret".repeat(5),
    qrSecret: "b9-qr-secret".repeat(5),
    demo: true,
    clientUrl: "http://localhost:5173",
  });
  let server;
  try {
    await app.start();
    for (const code of ["USER", "ADMIN", "ORGANIZER"]) {
      await db.query(
        'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
        [randomUUID(), code],
      );
    }
    const password = "B9Isolated2026!";
    const owner = await app.auth.register({
      name: "Ban tổ chức B9",
      email: `${randomUUID()}@example.test`,
      password,
    });
    const buyer = await app.auth.register({
      name: "Nguyễn Minh Anh",
      email: `${randomUUID()}@example.test`,
      password,
    });
    await db.query(
      'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
      [owner.user.idUser, "ORGANIZER"],
    );
    server = app.app.listen(serve ? 8019 : 0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    let assertions = 0;
    async function call(
      method,
      path,
      body,
      status = 200,
      token = owner.accessToken,
    ) {
      const r = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const j = await r.json();
      assert.equal(r.status, status, JSON.stringify(j));
      assertions++;
      return j.data ?? j;
    }
    const category = randomUUID();
    await db.query("INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)", [
      category,
      "Âm nhạc",
      randomUUID(),
    ]);
    const at = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
    const payload = {
      categoryId: category,
      title: "Đêm nhạc thiên hà",
      description: "B9 isolated test",
      venueName: "Nhà hát",
      address: "Đà Nẵng",
      cityCode: "DN",
      startsAt: at(1),
      endsAt: at(4),
      checkinOpensAt: at(-1),
      checkinClosesAt: at(3),
    };
    const event = await call("POST", "/organizer/events", payload);
    const second = await call("POST", "/organizer/events", {
      ...payload,
      title: "Sự kiện khác",
    });
    const type = await call(
      "POST",
      `/organizer/events/${event.id}/ticket-types`,
      {
        name: "VIP Thiên Hà",
        price: "250000",
        capacity: 30,
        saleStartsAt: at(-2),
        saleEndsAt: at(3),
      },
    );
    await db.query(
      "UPDATE events SET status='PUBLISHED',published_at=now() WHERE id=$1",
      [event.id],
    );
    const order = await call(
      "POST",
      "/orders",
      { eventId: event.id, items: [{ ticketTypeId: type.id, quantity: 6 }] },
      200,
      buyer.accessToken,
    );
    const payment = await call(
      "POST",
      `/orders/${order.id}/payments`,
      {},
      200,
      buyer.accessToken,
    );
    await call(
      "POST",
      `/payments/${payment.id}/demo`,
      { success: true },
      200,
      buyer.accessToken,
    );
    const tickets = await call(
      "GET",
      "/me/tickets",
      undefined,
      200,
      buyer.accessToken,
    );
    const cards = [];
    for (const ticket of tickets)
      cards.push(
        await call(
          "GET",
          `/me/tickets/${ticket.id}`,
          undefined,
          200,
          buyer.accessToken,
        ),
      );
    const principal = await app.auth.resolve(buyer.accessToken);
    for (const card of cards)
      card.token = (await app.orders.qr(principal, card.id)).token;
    const scan = `/checkin/events/${event.id}/checkins`;
    await call("GET", `/checkin/events/${event.id}`);
    await call("POST", scan, { code: cards[0].code }, 401, null);
    await call("POST", scan, { code: cards[0].code }, 403, buyer.accessToken);
    const first = await call("POST", scan, { code: cards[0].token });
    assert.equal(first.duplicate, false);
    assert.equal(first.method, "QR");
    assert.equal(first.buyer_name, "Nguyễn Minh Anh");
    assert.equal(first.ticket_type_name, "VIP Thiên Hà");
    assert.equal(first.ticket_code, cards[0].code);
    assert.equal(first.qr_token_ciphertext, undefined);
    const duplicate = await call("POST", scan, { code: cards[0].code });
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.checked_in_at, first.checked_in_at);
    assert.equal(duplicate.buyer_name, first.buyer_name);
    assert.equal(
      (await call("POST", scan, { code: "invalid-code" }, 400)).code,
      "INVALID_QR",
    );
    assert.equal(
      (
        await call(
          "POST",
          `/checkin/events/${second.id}/checkins`,
          { code: cards[1].code },
          400,
        )
      ).code,
      "INVALID_QR",
    );
    await db.query(
      "UPDATE tickets SET status='VOID',voided_at=now(),void_reason='B9 test' WHERE id=$1",
      [tickets[2].id],
    );
    assert.equal(
      (await call("POST", scan, { code: cards[2].code }, 409)).code,
      "VOID_TICKET",
    );
    await db.query("UPDATE events SET checkin_paused=true WHERE id=$1", [
      event.id,
    ]);
    assert.equal(
      (await call("POST", scan, { code: cards[1].code }, 409)).code,
      "CHECKIN_CLOSED",
    );
    await db.query("UPDATE events SET checkin_paused=false WHERE id=$1", [
      event.id,
    ]);
    const parallel = await Promise.all(
      [1, 2].map(() => call("POST", scan, { code: cards[1].code })),
    );
    assert.equal(parallel.filter((r) => !r.duplicate).length, 1);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int n FROM checkins WHERE event_id=$1",
          [event.id],
        )
      )[0].n,
      2,
    );
    console.log(
      JSON.stringify({
        result: "PASS",
        httpAssertions: assertions,
        eventId: event.id,
      }),
    );
    if (serve) {
      require("fs").writeFileSync(
        ".local/b9-fixture.json",
        JSON.stringify({
          email: owner.user.email,
          password,
          eventId: event.id,
          code: cards[3].code,
          qr: cards[4].token,
          voidCode: cards[2].code,
        }),
      );
      console.log("B9 isolated API ready on 8019");
      await new Promise((resolve) => {
        process.stdin.resume();
        process.stdin.once("data", resolve);
      });
      process.stdin.pause();
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await app.close();
    await db.destroy();
  }
}
if (process.argv.includes("--serve"))
  verify(true).catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
else
  test(
    "B9 scan display contract, QR, duplicate, permissions and concurrency",
    { skip: !process.env.TEST_DATABASE_URL, timeout: 90000 },
    () => verify(),
  );
