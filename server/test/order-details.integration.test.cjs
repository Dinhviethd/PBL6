const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const sharp = require("sharp");
const { RGBLuminanceSource, BinaryBitmap, HybridBinarizer, QRCodeReader } = require("@zxing/library");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");

const url = process.env.TEST_DATABASE_URL;

test("B7 isolated HTTP: detail ownership, states, safe metadata and canonical payment", {
  skip: !url, timeout: 120000,
}, async () => {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname),
    "B7 integration tests require a local database host");
  assert.ok(new URL(url).pathname.endsWith("_test"));
  const migration = new DataSource({ type: "postgres", url, migrations: [
    require("../dist/migrations/InitialMvp1790812800000").InitialMvp1790812800000,
    require("../dist/migrations/EventCheckinStaff1791072000000").EventCheckinStaff1791072000000,
    require("../dist/migrations/Notifications1791331200000").Notifications1791331200000,
    require("../dist/migrations/WaitQueue1792627200000").WaitQueue1792627200000,
    require("../dist/migrations/SepayLocalFoundation1793289600000").SepayLocalFoundation1793289600000,
  ] });
  await migration.initialize();
  await migration.runMigrations();
  await migration.destroy();
  const fixture = createDatabase(url);
  await fixture.start();
  const app = createApplication({ databaseUrl: url,
    secret: "b7-test-secret".repeat(4), qrSecret: "b7-test-qr-secret".repeat(4),
    demo: true, clientUrl: process.env.B7_UI === "1" ? "http://localhost:5178" : "http://localhost:5173" });
  let server;
  try {
    const auth = fixture.owner("auth"), orderDb = fixture.owner("order");
    for (const code of ["USER", "ORGANIZER", "ADMIN"])
      await auth.query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
        [randomUUID(), code]);
    await app.start();
    server = app.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, path, token, body) => {
      const response = await fetch(base + path, { method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, cache: response.headers.get("cache-control"), body: await response.json() };
    };
    const ok = async (method, path, token, body) => {
      const result = await call(method, path, token, body);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      return result.body.data;
    };
    const account = async (role) => {
      const data = await app.auth.register({ name: "B7 Test", email: `${randomUUID()}@example.test`, password: "Fixture2026!" });
      if (role !== "USER") await auth.query(
        'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
        [data.user.idUser, role]);
      return data;
    };
    const buyer = await account("USER"), owner = await account("ORGANIZER"),
      other = await account("ORGANIZER"), admin = await account("ADMIN");
    const buyerPrincipal = await app.auth.resolve(buyer.accessToken);
    const category = await ok("POST", "/admin/categories", admin.accessToken,
      { name: "B7 category", slug: randomUUID() });
    const end = new Date(Date.now() + 86400000).toISOString();
    const event = await ok("POST", "/organizer/events", owner.accessToken, {
      categoryId: category.id, slug: randomUUID(), title: "B7 Event",
      description: "Test", venueName: "Test Venue", address: "Test", cityCode: "DN",
      startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: end,
      checkinOpensAt: new Date(Date.now() - 3600000).toISOString(), checkinClosesAt: end,
    });
    const type = await ok("POST", `/organizer/events/${event.id}/ticket-types`, owner.accessToken,
      { name: "VIP", price: "100000", capacity: 500,
        saleStartsAt: new Date(Date.now() - 3600000).toISOString(), saleEndsAt: end });
    await ok("POST", `/organizer/events/${event.id}/submit`, owner.accessToken, {});
    await ok("POST", `/admin/events/${event.id}/review`, admin.accessToken, { approve: true });
    const make = () => app.booking.createOrder(buyerPrincipal, event.id,
      [{ ticketTypeId: type.id, quantity: 2 }], randomUUID());
    const paid = await make(), pending = await make(), cancelled = await make();
    await ok("POST", `/orders/${cancelled.id}/cancel`, buyer.accessToken, {});
    const payment = await ok("POST", `/orders/${paid.id}/payments`, buyer.accessToken, {});
    await app.booking.demoPayment(buyerPrincipal, payment.id, true);
    const event2 = await ok("POST", "/organizer/events", owner.accessToken, {
      categoryId: category.id, slug: randomUUID(), title: "B7 Second Event",
      description: "Test", venueName: "Test Venue", address: "Test", cityCode: "DN",
      startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: end,
      checkinOpensAt: new Date(Date.now() - 3600000).toISOString(), checkinClosesAt: end,
    });
    const detailPath = (orderId = paid.id, eventId = event.id) =>
      `/organizer/events/${eventId}/orders/${orderId}`;
    assert.equal((await call("GET", detailPath())).status, 401);
    for (const token of [other.accessToken, buyer.accessToken])
      assert.equal((await call("GET", detailPath(), token)).status, 403);
    assert.equal((await call("GET", detailPath(), admin.accessToken)).status, 200);
    assert.equal((await call("GET", detailPath(randomUUID()), owner.accessToken)).status, 404);
    assert.equal((await call("GET", detailPath(paid.id, event2.id), owner.accessToken)).status, 404);
    assert.equal((await call("GET", detailPath("bad-id"), owner.accessToken)).status, 400);
    assert.equal((await call("GET", detailPath() + "?extra=true", owner.accessToken)).status, 400);
    const result = await call("GET", detailPath(), owner.accessToken);
    assert.equal(result.status, 200);
    assert.equal(result.cache, "no-store");
    const detail = result.body.data;
    assert.equal(detail.id, paid.id);
    assert.equal(detail.totalAmount, "200000");
    assert.equal(detail.buyer.email, buyer.user.email);
    assert.equal(detail.buyer.phone, null);
    assert.equal(detail.items[0].lineTotal, "200000");
    assert.equal(detail.payment.paid.id, payment.id);
    assert.equal(detail.tickets.length, 2);
    assert.equal(detail.tickets[0].unitPrice, "100000");
    assert.equal(detail.actions.canPrintTickets, true);
    assert.equal(detail.capabilities.dynamicQr, false);
    assert.ok(!/qr_token|ciphertext|merchant_account|qrImage/.test(JSON.stringify(detail)));
    assert.equal((await ok("GET", detailPath(pending.id), owner.accessToken)).actions.canPreviewTickets, false);
    assert.equal((await ok("GET", detailPath(cancelled.id), owner.accessToken)).status, "CANCELLED");
    // Model an expired order in the isolated fixture without waiting for a worker.
    const expired = await make();
    await orderDb.query("UPDATE orders SET status='EXPIRED',closed_at=now() WHERE id=$1", [expired.id]);
    assert.equal((await ok("GET", detailPath(expired.id), owner.accessToken)).status, "EXPIRED");
    const paymentDb = fixture.owner("payment");
    const reference = `B7-${randomUUID()}`;
    await paymentDb.query("UPDATE payments SET provider_transaction_id=$2 WHERE id=$1", [payment.id, reference]);
    assert.equal((await ok("GET", detailPath(), owner.accessToken)).payment.display.providerTransactionId, reference);
    await paymentDb.query("UPDATE payments SET requires_review=true,review_reason='B7_TEST' WHERE id=$1", [payment.id]);
    const review = await ok("GET", detailPath(), owner.accessToken);
    assert.equal(review.payment.unresolvedReview, true);
    assert.equal(review.actions.canPreviewTickets, false);
    assert.equal((await call("GET", detailPath() + "/tickets", owner.accessToken)).status, 409);
    await paymentDb.query("UPDATE payments SET requires_review=false WHERE id=$1", [payment.id]);
    const preview = await ok("GET", detailPath() + "/tickets", owner.accessToken);
    assert.equal(preview.tickets.length, 2);
    assert.ok(preview.tickets.every((ticket) => ticket.qrImage.startsWith("data:image/png;base64,")));
    const png = Buffer.from(preview.tickets[0].qrImage.split(",")[1], "base64");
    let decoded;
    for (const width of [320, 640, 960]) {
      const pixels = await sharp(png).resize(width, width, { kernel: "nearest" })
        .greyscale().raw().toBuffer({ resolveWithObject: true });
      try {
        decoded = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(
          new RGBLuminanceSource(new Uint8ClampedArray(pixels.data), pixels.info.width, pixels.info.height)))).getText();
        break;
      } catch { /* Try another QR sampling resolution, as in the B6 decoder test. */ }
    }
    assert.ok(decoded, "The actual preview QR must decode at a supported sampling resolution");
    assert.equal(decoded, (await app.orders.qr(buyerPrincipal, preview.tickets[0].id)).token);
    await require("./helpers/b7-contact-timeline.cjs")({
      ok, call, detailPath, paid, pending, buyer, owner, admin, other,
      payment, paymentDb, orderDb, fixture,
    });
    console.log("B7 API HTTP verified: detail200/no-store, guest401, tenant/buyer403, missing/cross-event404, invalid400, four states, review409, reference, safe DTO, QR decode");
    if (process.env.B7_UI === "1") await require("./helpers/b7-browser.cjs")({
      base, owner, buyer, other, admin, event, event2, paid, pending, cancelled, expired,
      payment, paymentDb, orderDb, app, buyerPrincipal,
    });
    const laterAttempt = randomUUID();
    await paymentDb.query(
      `INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,status,
        amount,provider_expires_at,reconcile_until,created_at)
       VALUES($1,$2,'demo','local',$3,'FAILED',200000,now()+interval '1 day',now()+interval '2 days',now()+interval '1 second')`,
      [laterAttempt, paid.id, randomUUID()],
    );
    const canonical = await ok("GET", detailPath(), owner.accessToken);
    assert.equal(canonical.payment.latest.id, laterAttempt);
    assert.equal(canonical.payment.display.id, payment.id);
    await ok("POST", `/checkin/events/${event.id}/checkins`, owner.accessToken, { code: decoded });
    const checked = (await ok("GET", detailPath(), owner.accessToken)).tickets.find((t) => t.id === preview.tickets[0].id);
    assert.equal(checked.status, "CHECKED_IN");
    assert.ok(checked.checkedInAt);
    for (const ticket of preview.tickets)
      await orderDb.query("UPDATE tickets SET status='VOID',void_reason='B7_TEST',voided_at=now() WHERE id=$1", [ticket.id]);
    const voided = await ok("GET", detailPath(), owner.accessToken);
    assert.equal(voided.actions.canPrintTickets, false);
    assert.ok(voided.tickets.every((t) => t.status === "VOID"));
    assert.ok((await ok("GET", detailPath() + "/tickets", owner.accessToken)).tickets.every((t) => !t.qrImage && !t.printable));
    console.log("B7 additional PASS: canonical PAID over later FAILED, check-in timestamp, all-VOID metadata and no printable QR");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await app.close();
    await fixture.close();
  }
});
