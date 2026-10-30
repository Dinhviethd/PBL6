const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const sharp = require("sharp");
const { RGBLuminanceSource, BinaryBitmap, HybridBinarizer, QRCodeReader } = require("@zxing/library");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");
const { vietnamDay } = require("../dist/workflows/order-manager");

const url = process.env.TEST_DATABASE_URL;

test("B6 isolated HTTP: scopes, filters, counts, canonical payment and printable QR", {
  skip: !url, timeout: 120000,
}, async () => {
  assert.equal(new URL(url).hostname, "127.0.0.1");
  assert.ok(new URL(url).pathname.endsWith("_test"));
  const migration = new DataSource({ type: "postgres", url, migrations: [
    require("../dist/migrations/InitialMvp1790812800000").InitialMvp1790812800000,
    require("../dist/migrations/EventCheckinStaff1791072000000").EventCheckinStaff1791072000000,
    require("../dist/migrations/Notifications1791331200000").Notifications1791331200000,
    require("../dist/migrations/WaitQueue1792627200000").WaitQueue1792627200000,
  ] });
  await migration.initialize();
  await migration.runMigrations();
  await migration.destroy();
  const fixture = createDatabase(url);
  await fixture.start();
  const app = createApplication({ databaseUrl: url,
    secret: "b6-test-secret".repeat(4), qrSecret: "b6-test-qr-secret".repeat(4),
    demo: true, clientUrl: process.env.B6_UI === "1" ? "http://localhost:5177" : "http://localhost:5173" });
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
      const data = await app.auth.register({ name: "B6 Test", email: `${randomUUID()}@example.test`, password: "Fixture2026!" });
      if (role !== "USER") await auth.query(
        'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
        [data.user.idUser, role]);
      return data;
    };
    const buyer = await account("USER"), owner = await account("ORGANIZER"),
      other = await account("ORGANIZER"), admin = await account("ADMIN");
    const buyerPrincipal = await app.auth.resolve(buyer.accessToken);
    const category = await ok("POST", "/admin/categories", admin.accessToken,
      { name: "B6 category", slug: randomUUID() });
    const end = new Date(Date.now() + 86400000).toISOString();
    const event = await ok("POST", "/organizer/events", owner.accessToken, {
      categoryId: category.id, slug: randomUUID(), title: "B6 Event",
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
      categoryId: category.id, slug: randomUUID(), title: "B6 Second Event",
      description: "Test", venueName: "Test Venue", address: "Test", cityCode: "DN",
      startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: end,
      checkinOpensAt: new Date(Date.now() - 3600000).toISOString(), checkinClosesAt: end,
    });
    const manager = `/organizer/events/${event.id}/order-manager`;
    assert.equal((await call("GET", manager)).status, 401);
    assert.equal((await call("GET", manager, other.accessToken)).status, 403);
    assert.equal((await call("GET", manager, buyer.accessToken)).status, 403);
    assert.equal((await call("GET", manager, admin.accessToken)).status, 200);
    const result = await call("GET", manager, owner.accessToken);
    assert.equal(result.status, 200);
    assert.equal(result.cache, "no-store");
    const data = result.body.data;
    assert.equal(data.counts.all, 3);
    assert.deepEqual([data.counts.paid, data.counts.processing, data.counts.closed], [1, 1, 1]);
    assert.equal(data.summary.revenuePaid, "200000");
    assert.equal(data.summary.paidRatePercent, 33.33);
    assert.equal(data.pagination.total, 3);
    assert.equal(data.items.find((x) => x.id === paid.id).payment.paid.id, payment.id);
    assert.equal(data.items.find((x) => x.id === paid.id).tickets.issued, 2);
    assert.equal(data.items.find((x) => x.id === paid.id).items[0].typeName, "VIP");
    assert.equal(data.items.find((x) => x.id === paid.id).buyer.phone, null);
    assert.ok(!JSON.stringify(data).includes("qr_token"));
    const filtered = await ok("GET", manager + "?group=closed&q=example.test", owner.accessToken);
    assert.equal(filtered.pagination.total, 1);
    assert.equal(filtered.counts.all, 3);
    assert.equal(filtered.items[0].id, cancelled.id);
    const literal = await ok("GET", manager + "?q=%25", owner.accessToken);
    assert.equal(literal.counts.all, 0);
    assert.equal((await ok("GET", manager + "?q=%20EXAMPLE.TEST%20", owner.accessToken)).counts.all, 3);
    assert.equal((await ok("GET", manager + "?q=B6%20Test", owner.accessToken)).counts.all, 3);
    assert.equal((await ok("GET", manager + "?q=_", owner.accessToken)).counts.all, 0);
    assert.equal((await ok("GET", manager + "?q=%5C", owner.accessToken)).counts.all, 0);
    assert.equal((await ok("GET", manager + "?q=" + encodeURIComponent("' OR true --"), owner.accessToken)).counts.all, 0);
    assert.equal((await call("GET", manager + "?q=" + "x".repeat(201), owner.accessToken)).status, 400);
    assert.equal((await call("GET", manager + "?group=refunded", owner.accessToken)).status, 400);
    assert.equal((await call("GET", manager + "?provider=sepay", owner.accessToken)).status, 400);
    assert.equal((await call("GET", manager + "?fromDate=2026-02-31", owner.accessToken)).status, 400);
    assert.equal((await call("GET", manager + "?fromDate=2026-10-31&toDate=2026-10-30", owner.accessToken)).status, 400);
    assert.equal(vietnamDay("2026-10-30"), "2026-10-29T17:00:00.000Z");
    assert.equal(vietnamDay("2026-10-30", true), "2026-10-30T17:00:00.000Z");
    const previewPath = `/organizer/events/${event.id}/orders/${paid.id}/tickets`;
    assert.equal((await call("GET", previewPath)).status, 401);
    assert.equal((await call("GET", previewPath, other.accessToken)).status, 403);
    assert.equal((await call("GET", previewPath, buyer.accessToken)).status, 403);
    assert.equal((await call("GET", `/organizer/events/${event.id}/orders/${pending.id}/tickets`, owner.accessToken)).status, 409);
    assert.equal((await call("GET", `/organizer/events/${event.id}/orders/${randomUUID()}/tickets`, owner.accessToken)).status, 404);
    const preview = await call("GET", previewPath, owner.accessToken);
    assert.equal(preview.status, 200);
    assert.equal((await call("GET", previewPath, admin.accessToken)).status, 200);
    assert.equal(preview.cache, "no-store");
    assert.equal(preview.body.data.tickets.length, 2);
    assert.ok(preview.body.data.tickets.every((t) => t.printable && t.qrImage.startsWith("data:image/png;base64,")));
    const firstTicket = preview.body.data.tickets[0];
    const qrPng = Buffer.from(firstTicket.qrImage.split(",")[1], "base64");
    let decodedToken;
    for (const width of [320, 640, 960]) {
      const qrPixels = await sharp(qrPng).resize(width, width, { kernel: "nearest" })
        .greyscale().raw().toBuffer({ resolveWithObject: true });
      const luminance = new RGBLuminanceSource(new Uint8ClampedArray(qrPixels.data),
        qrPixels.info.width, qrPixels.info.height);
      try {
        decodedToken = new QRCodeReader().decode(
          new BinaryBitmap(new HybridBinarizer(luminance))).getText();
        break;
      } catch { /* Try another sampling resolution. */ }
    }
    assert.ok(decodedToken, "B6 QR PNG could not be decoded");
    assert.equal(decodedToken, (await app.orders.qr(buyerPrincipal, firstTicket.id)).token);
    const original = await orderDb.query("SELECT count(*) AS n FROM tickets WHERE event_id=$1", [event.id]);
    await ok("GET", previewPath, owner.accessToken);
    const afterward = await orderDb.query("SELECT count(*) AS n FROM tickets WHERE event_id=$1", [event.id]);
    assert.equal(afterward[0].n, original[0].n);
    if (process.env.B6_UI === "1") {
      const { spawn } = require("node:child_process");
      const path = require("node:path");
      const os = require("node:os");
      const { chromium } = require("../../client/node_modules/@playwright/test");
      const clientDir = path.resolve(__dirname, "../../client");
      const vite = spawn(process.execPath, [path.join(clientDir, "node_modules/vite/bin/vite.js"),
        "--host", "localhost", "--port", "5177", "--strictPort"], {
        cwd: clientDir, env: { ...process.env, VITE_DEV_API_PROXY_TARGET: base.replace(/\/api$/, "") },
        stdio: "ignore", windowsHide: true,
      });
      let browser;
      try {
        let ready = false;
        for (let retry = 0; retry < 80; retry++) {
          try { ready = (await fetch("http://localhost:5177/")).status === 200; } catch { /* startup */ }
          if (ready) break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        assert.ok(ready, "B6 Vite test server did not start");
        browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
        for (const width of [1440, 1024, 768, 390]) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          const page = await context.newPage();
          await page.goto(`http://localhost:5177/organizer/events/${event.id}/orders`);
          await page.locator('input[name="email"]').fill(owner.user.email);
          await page.locator('input[name="password"]').fill("Fixture2026!");
          await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY" }).click();
          try { await page.getByRole("heading", { name: "Quản lý đơn hàng & Giao dịch vé" }).waitFor({ timeout: 7000 }); }
          catch { throw new Error(`B6 login failed at ${page.url()}: ${(await page.locator("body").innerText()).slice(0, 800)}`); }
          try {
            await page.waitForFunction(() => document.querySelector(".b6-money")?.textContent?.includes("200.000"), undefined, { timeout: 6000 });
          } catch {
            throw new Error(`B6 browser KPI missing: ${(await page.locator("body").innerText()).slice(0, 1500)}`);
          }
          await page.getByRole("button", { name: "Đã thanh toán (1)" }).click();
          await page.waitForFunction(() => document.querySelectorAll(".b6-table-card tbody tr").length === 1);
          assert.equal(await page.locator(".b6-table-card tbody tr").count(), 1);
          await page.getByRole("button", { name: "Tất cả (3)" }).click();
          const emailResponse = page.waitForResponse((res) => res.url().includes("order-manager") && res.url().includes("q=example.test") && res.status() === 200);
          await page.getByRole("textbox", { name: "Tìm mã đơn, tên hoặc email" }).fill("example.test");
          await emailResponse;
          await page.waitForFunction(() => document.querySelectorAll(".b6-table-card tbody tr").length === 3);
          assert.equal(await page.locator(".b6-table-card tbody tr").count(), 3);
          const emptyResponse = page.waitForResponse((res) => res.url().includes("q=missing%40example.test") && res.status() === 200);
          await page.getByRole("textbox", { name: "Tìm mã đơn, tên hoặc email" }).fill("missing@example.test");
          await emptyResponse;
          await page.getByText("Không có đơn hàng phù hợp với bộ lọc.").waitFor();
          const resetResponse = page.waitForResponse((res) => res.url().includes("order-manager") && !res.url().includes("q=") && res.status() === 200);
          await page.getByRole("textbox", { name: "Tìm mã đơn, tên hoặc email" }).fill("");
          await resetResponse;
          await page.waitForFunction(() => document.querySelectorAll(".b6-table-card tbody tr").length === 3);
          const localDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(paid.created_at));
          const dateResponse = page.waitForResponse((res) => res.url().includes(`fromDate=${localDay}`) && res.status() === 200);
          await page.locator(".b6-date input").first().fill(localDay);
          await dateResponse;
          assert.equal(await page.locator(".b6-kpi").first().locator("strong").innerText(), "3");
          await page.screenshot({ path: path.join(os.tmpdir(), `eventhub-b6-${width}.png`), fullPage: true });
          await page.getByRole("button", { name: `Xem vé đơn ${paid.order_code}` }).click();
          await page.getByAltText(/Mã QR vé/).first().waitFor();
          await page.evaluate(() => { window.print = () => { document.body.dataset.b6PrintCalled = "yes"; }; });
          await page.getByRole("button", { name: "In vé", exact: true }).click();
          await page.waitForFunction(() => document.body.dataset.b6PrintCalled === "yes");
          await page.emulateMedia({ media: "print" });
          assert.equal(await page.locator(".b6-print-root img").count(), 2);
          assert.equal(await page.locator(".b6-print-root").isVisible(), true);
          assert.ok((await page.pdf({ format: "A4" })).length > 1000);
          await page.emulateMedia({ media: "screen" });
          await page.locator("#b6-event").selectOption(event2.id);
          await page.getByText("Không có đơn hàng phù hợp với bộ lọc.").waitFor();
          assert.ok(page.url().includes(`/organizer/events/${event2.id}/orders`));
          await page.locator("#b6-event").selectOption(event.id);
          await page.getByText("200.000 đ").first().waitFor();
          if (width < 900) {
            await page.getByRole("button", { name: "Mở menu" }).click();
            assert.equal(await page.locator(".b6-navigation.is-open .osb-sidebar").isVisible(), true);
            assert.ok(await page.locator(".b6-table-scroll").evaluate((element) => {
              element.scrollLeft = 500;
              return element.scrollLeft > 0;
            }));
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await context.close();
        }
      } finally {
        if (browser) await browser.close();
        vite.kill();
      }
    }
    const legacy = await ok("GET", `/organizer/events/${event.id}/orders`, owner.accessToken);
    assert.ok(Array.isArray(legacy));
    assert.equal(legacy.length, 3);
    const paymentDb = fixture.owner("payment");
    const concurrent = new DataSource({ type: "postgres", url });
    await concurrent.initialize();
    try {
      await fixture.snapshot.run(async () => {
        const initial = await paymentDb.query("SELECT requires_review FROM payments WHERE id=$1", [payment.id]);
        assert.equal(initial[0].requires_review, false);
        await concurrent.query("UPDATE payments SET requires_review=true,review_reason='B6_TEST' WHERE id=$1", [payment.id]);
        const repeat = await paymentDb.query("SELECT requires_review FROM payments WHERE id=$1", [payment.id]);
        assert.equal(repeat[0].requires_review, false);
      });
      assert.equal((await paymentDb.query("SELECT requires_review FROM payments WHERE id=$1", [payment.id]))[0].requires_review, true);
    } finally {
      await concurrent.destroy();
    }
    const reviewed = await ok("GET", manager, owner.accessToken);
    assert.equal(reviewed.counts.processing, 2);
    assert.equal(reviewed.counts.paid, 0);
    assert.equal(reviewed.summary.paidOrders, 1);
    assert.equal(reviewed.summary.revenuePaid, "200000");
    assert.equal((await call("GET", previewPath, owner.accessToken)).status, 409);
    await paymentDb.query("UPDATE payments SET requires_review=false,review_reason=NULL WHERE id=$1", [payment.id]);
    const ticketId = preview.body.data.tickets[0].id;
    await orderDb.query("UPDATE tickets SET status='VOID',void_reason='B6_TEST',voided_at=now() WHERE id=$1", [ticketId]);
    const voidPreview = await ok("GET", previewPath, owner.accessToken);
    const voidTicket = voidPreview.tickets.find((ticket) => ticket.id === ticketId);
    assert.equal(voidTicket.qrImage, null);
    assert.equal(voidTicket.printable, false);
    assert.equal((await ok("GET", manager, owner.accessToken)).items.find((x) => x.id === paid.id).tickets.void, 1);
    assert.equal((await call("GET", `/organizer/events/${event2.id}/orders/${paid.id}/tickets`, owner.accessToken)).status, 404);
    for (let index = 0; index < 61; index++) {
      const createdAt = index === 60 ? "2026-01-01T17:00:00.000Z" : "2026-01-01T16:59:59.999Z";
      await orderDb.query(
        `INSERT INTO orders(id,order_code,buyer_id,event_id,status,total_quantity,total_amount,
         buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,
         created_at,expires_at,closed_at)
         VALUES($1,$2,$3,$4,'EXPIRED',1,100000,'B6 Boundary','boundary@example.test',
         'B6 Event',$1::uuid::text,'b6-fixture',$5,$6,$6)`,
        [randomUUID(), `B6-${randomUUID().slice(0, 20)}`, buyer.user.idUser, event.id,
          createdAt, "2026-01-02T17:00:00.000Z"],
      );
    }
    const boundary = await ok("GET", manager + "?q=boundary%40example.test&toDate=2026-01-01", owner.accessToken);
    assert.equal(boundary.counts.all, 60);
    assert.equal(boundary.pagination.totalPages, 2);
    assert.equal(boundary.items.length, 50);
    const secondPage = await ok("GET", manager + "?q=boundary%40example.test&toDate=2026-01-01&page=1", owner.accessToken);
    assert.equal(secondPage.items.length, 10);
    assert.equal(secondPage.counts.all, 60);
    const nextDay = await ok("GET", manager + "?q=boundary%40example.test&fromDate=2026-01-02", owner.accessToken);
    assert.equal(nextDay.counts.all, 1);
    assert.equal((await ok("GET", manager + "?page=99", owner.accessToken)).items.length, 0);
    if (process.env.B6_BENCH === "1") {
      const seed = new DataSource({ type: "postgres", url });
      await seed.initialize();
      try {
        await seed.query(
          `INSERT INTO orders(id,order_code,buyer_id,event_id,status,total_quantity,total_amount,
           buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,
           created_at,expires_at,closed_at)
           SELECT gen_random_uuid(),'B6BENCH-' || g.n,$1,$2,'EXPIRED',1,100000,
           'B6 Bench','bench@example.test','B6 Event',gen_random_uuid()::text,'b6-bench',
           now(),now()+interval '1 day',now()
           FROM generate_series(1,10000) AS g(n)`, [buyer.user.idUser, event.id],
        );
        await seed.query(
          `INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,
           status,amount,provider_expires_at,reconcile_until,created_at)
           SELECT gen_random_uuid(),o.id,'demo','local',
           o.order_code || '-' || g.n,'FAILED',100000,now()+interval '1 day',
           now()+interval '2 days',now()
           FROM orders o CROSS JOIN generate_series(1,5) AS g(n)
           WHERE o.event_id=$1 AND o.order_code LIKE 'B6BENCH-%'`, [event.id],
        );
        await ok("GET", manager, owner.accessToken);
        const elapsed = [];
        for (let run = 0; run < 30; run++) {
          const start = performance.now();
          const result = await ok("GET", manager, owner.accessToken);
          elapsed.push(performance.now() - start);
          assert.equal(result.counts.all, 10064);
        }
        elapsed.sort((a, b) => a - b);
        const p50 = elapsed[14], p95 = elapsed[28];
        console.log(JSON.stringify({ benchmark: "B6 10k orders x 5 attempts", runs: 30,
          p50ms: Math.round(p50), p95ms: Math.round(p95) }));
        assert.ok(p95 <= 2000, `B6 p95 ${Math.round(p95)}ms exceeds 2000ms target`);
        const ten = await app.booking.createOrder(buyerPrincipal, event.id,
          [{ ticketTypeId: type.id, quantity: 10 }], randomUUID());
        const tenPayment = await ok("POST", `/orders/${ten.id}/payments`, buyer.accessToken, {});
        await app.booking.demoPayment(buyerPrincipal, tenPayment.id, true);
        const tenPreviewPath = `/organizer/events/${event.id}/orders/${ten.id}/tickets`;
        assert.equal((await ok("GET", tenPreviewPath, owner.accessToken)).tickets.length, 10);
        const previewTimes = [];
        for (let run = 0; run < 30; run++) {
          const start = performance.now();
          const preview = await ok("GET", tenPreviewPath, owner.accessToken);
          previewTimes.push(performance.now() - start);
          assert.equal(preview.tickets.length, 10);
        }
        previewTimes.sort((a, b) => a - b);
        const previewP95 = previewTimes[28];
        console.log(JSON.stringify({ benchmark: "B6 preview 10 QR", runs: 30,
          p50ms: Math.round(previewTimes[14]), p95ms: Math.round(previewP95) }));
        assert.ok(previewP95 <= 2000, `B6 preview p95 ${Math.round(previewP95)}ms exceeds 2000ms target`);
      } finally {
        await seed.destroy();
      }
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await app.close();
    await fixture.close();
  }
});
