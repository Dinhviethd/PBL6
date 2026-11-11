const assert = require("node:assert/strict");
const { randomUUID, createHmac } = require("node:crypto");
const fs = require("node:fs"),
  path = require("node:path");
const dir = path.resolve(__dirname, "../.local/mobile-migration");
async function main() {
  const config = JSON.parse(
    fs.readFileSync(path.join(dir, "runtime.json"), "utf8"),
  );
  const { Client } = require("../server/node_modules/pg");
  // Target is fixed to the database created and attested by mobile-test-runtime.
  const db = new Client({
    host: "127.0.0.1",
    port: 55433,
    database: "eventhub_mobile_test",
    user: "mobile_test",
    password: config.password,
    ssl: false,
  });
  await db.connect();
  const evidence = [],
    base = "http://127.0.0.1:8016/api";
  async function call(
    method,
    endpoint,
    body,
    token,
    expected = 200,
    extra = {},
  ) {
    const response = await fetch(base + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
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
  try {
    async function account(roles) {
      const credentials = {
        name: "Migration QA",
        email: `${randomUUID()}@example.test`,
        password: "MobileTest2026!",
        confirmPassword: "MobileTest2026!",
      };
      const registered = await call(
        "POST",
        "/auth/mobile/register",
        credentials,
      );
      for (const role of roles) {
        await db.query(
          'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
          [randomUUID(), role],
        );
        await db.query(
          'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2 ON CONFLICT DO NOTHING',
          [registered.user.idUser, role],
        );
      }
      return {
        ...(await call("POST", "/auth/mobile/login", credentials)),
        credentials,
      };
    }
    const owner = await account(["ORGANIZER", "ADMIN"]),
      buyer = await account([]),
      other = await account([]);
    const token = owner.accessToken;
    const category = await call(
      "POST",
      "/admin/categories",
      { name: `Mobile QA ${randomUUID().slice(0, 8)}` },
      token,
    );
    const date = (offset) => new Date(Date.now() + offset).toISOString();
    const event = await call(
      "POST",
      "/organizer/events",
      {
        categoryId: category.id,
        title: `Sự kiện mobile ${randomUUID().slice(0, 8)}`,
        description: "Sự kiện kiểm thử tổng thể mobile trên DB riêng.",
        venueName: "Sân khấu kiểm thử",
        address: "Địa điểm kiểm thử",
        cityCode: "Đà Nẵng",
        startsAt: date(86400000),
        endsAt: date(172800000),
        checkinOpensAt: date(-3600000),
        checkinClosesAt: date(172800000),
      },
      token,
    );
    const type = await call(
      "POST",
      `/organizer/events/${event.id}/ticket-types`,
      {
        name: "Vé tiêu chuẩn",
        description: "Vé test",
        price: "100000",
        capacity: 100,
        saleStartsAt: date(-86400000),
        saleEndsAt: date(86400000),
      },
      token,
    );
    await call("POST", `/organizer/events/${event.id}/submit`, {}, token);
    await call(
      "POST",
      `/admin/events/${event.id}/review`,
      { approve: true },
      token,
    );
    await call("GET", `/events/${event.slug}`, undefined);
    const orderBody = {
        eventId: event.id,
        items: [{ ticketTypeId: type.id, quantity: 1 }],
      },
      key = randomUUID();
    const order = await call(
      "POST",
      "/orders",
      orderBody,
      buyer.accessToken,
      200,
      { "Idempotency-Key": key },
    );
    const repeated = await call(
      "POST",
      "/orders",
      orderBody,
      buyer.accessToken,
      200,
      { "Idempotency-Key": key },
    );
    assert.equal(order.id, repeated.id);
    await call(
      "GET",
      `/me/orders/${order.id}`,
      undefined,
      other.accessToken,
      403,
    );
    const payment = await call(
      "POST",
      `/sepay/orders/${order.id}/payment`,
      {},
      buyer.accessToken,
      201,
    );
    const repeatedPayment = await call(
      "POST",
      `/sepay/orders/${order.id}/payment`,
      {},
      buyer.accessToken,
    );
    assert.equal(payment.paymentId, repeatedPayment.paymentId);
    await call(
      "GET",
      `/sepay/orders/${order.id}/payment`,
      undefined,
      buyer.accessToken,
    );
    const fixtures = {
      base,
      owner: owner.credentials,
      buyer: buyer.credentials,
      other: other.credentials,
      event,
      type,
      pendingOrder: order.id,
      payment,
    };
    fs.writeFileSync(
      path.join(dir, "booking-fixture.json"),
      JSON.stringify(fixtures, null, 2),
      { mode: 0o600 },
    );
    // Signed synthetic incoming transfer; no external bank or real money.
    const payload = {
      id: Date.now(),
      gateway: "MBBank",
      transactionDate: new Date().toLocaleString("sv-SE", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      accountNumber: "MOBILEQA001",
      subAccount: null,
      code: payment.transferContent,
      content: payment.transferContent,
      transferType: "in",
      transferAmount: Number(payment.amount),
      accumulated: 0,
      description: "Synthetic QA",
      referenceCode: randomUUID(),
    };
    const raw = JSON.stringify(payload),
      ts = String(Math.floor(Date.now() / 1000));
    const signature =
      "sha256=" +
      createHmac("sha256", config.jwt)
        .update(ts + ".")
        .update(raw)
        .digest("hex");
    const webhook = await fetch(base + "/payments/sepay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SePay-Timestamp": ts,
        "X-SePay-Signature": signature,
      },
      body: raw,
    });
    assert.equal(webhook.status, 200);
    // Runtime worker processes durable inbox; no browser return can mark it paid.
    let paid;
    for (let i = 0; i < 15; i++) {
      paid = await call(
        "GET",
        `/me/orders/${order.id}`,
        undefined,
        buyer.accessToken,
      );
      if (paid.status === "PAID") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    assert.equal(paid.status, "PAID");
    const history = await call(
      "GET",
      `/me/order-history/${order.id}`,
      undefined,
      buyer.accessToken,
    );
    assert.equal(history.status, "PAID");
    const tickets = await call(
      "GET",
      "/me/tickets",
      undefined,
      buyer.accessToken,
    );
    assert.ok(tickets.length);
    await call(
      "GET",
      `/me/tickets/${tickets[0].id}`,
      undefined,
      buyer.accessToken,
    );
    fixtures.paidOrder = order.id;
    fs.writeFileSync(
      path.join(dir, "booking-fixture.json"),
      JSON.stringify(fixtures, null, 2),
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(dir, "booking-api-evidence.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          target: base,
          calls: evidence,
          assertions:
            "create/submit/review/order/idempotency/ownership/SePay/HMAC/PAID/history/tickets",
        },
        null,
        2,
      ),
    );
    console.log(
      `PASS ${evidence.length} real HTTP calls: synthetic SePay→PAID→ticket; isolated test fixture saved.`,
    );
  } finally {
    await db.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
