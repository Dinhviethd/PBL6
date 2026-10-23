const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { randomUUID, createHmac } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");
const { vnpayProvider, canonical } = require("../dist/modules/payment/vnpay");
const url = process.env.TEST_DATABASE_URL;
test(
  "VNPay PostgreSQL: IPN, return, reconciliation, races, failures and late payment",
  { skip: !url, timeout: 90000 },
  async (t) => {
    assert.ok(new URL(url).pathname.endsWith("_test"));
    const migrations = new DataSource({
      type: "postgres",
      url,
      migrations: [
        require("../dist/migrations/WaitQueue1792627200000")
          .WaitQueue1792627200000,
        require("../dist/migrations/InitialMvp1790812800000")
          .InitialMvp1790812800000,
        require("../dist/migrations/EventCheckinStaff1791072000000")
          .EventCheckinStaff1791072000000,
        require("../dist/migrations/Notifications1791331200000")
          .Notifications1791331200000,
      ],
    });
    await migrations.initialize();
    await migrations.runMigrations();
    await migrations.destroy();
    const fixture = createDatabase(url);
    await fixture.start();
    t.after(() => fixture.close());
    const config = {
      tmnCode: "TEST1234",
      hashSecret: "test-vnpay-secret-32-characters!!",
      publicApiUrl: "https://example.ngrok-free.app",
    };
    const hash = (s) =>
      createHmac("sha512", config.hashSecret).update(s).digest("hex");
    let queryMode = "success";
    const provider = vnpayProvider(config, async (_url, options) => {
      if (queryMode === "timeout")
        throw new DOMException("timeout", "TimeoutError");
      const f = JSON.parse(options.body);
      const row = await fixture
        .owner("payment")
        .query("SELECT * FROM payments WHERE merchant_reference=$1", [
          f.vnp_TxnRef,
        ]);
      const p = row[0];
      const response = {
        vnp_ResponseId: randomUUID().replaceAll("-", ""),
        vnp_Command: "querydr",
        vnp_ResponseCode: queryMode === "not-found" ? "91" : "00",
        vnp_Message: "Success",
        vnp_TmnCode: config.tmnCode,
        vnp_TxnRef: f.vnp_TxnRef,
        vnp_Amount: String(BigInt(p.amount) * 100n),
        vnp_BankCode: "NCB",
        vnp_PayDate: "20261013100000",
        vnp_TransactionNo: transactionId(p),
        vnp_TransactionType: "01",
        vnp_TransactionStatus: "00",
        vnp_OrderInfo: "EventHub",
      };
      const keys = [
        "ResponseId",
        "Command",
        "ResponseCode",
        "Message",
        "TmnCode",
        "TxnRef",
        "Amount",
        "BankCode",
        "PayDate",
        "TransactionNo",
        "TransactionType",
        "TransactionStatus",
        "OrderInfo",
        "PromotionCode",
        "PromotionAmount",
      ];
      response.vnp_SecureHash = hash(
        keys.map((k) => response[`vnp_${k}`] ?? "").join("|"),
      );
      return { ok: true, json: async () => response };
    });
    const app = createApplication({
      databaseUrl: url,
      secret: "integration-secret-".repeat(3),
      qrSecret: "integration-qr-secret-".repeat(3),
      paymentProvider: provider,
    });
    await app.start();
    t.after(() => app.close());
    const server = app.app.listen(0, "127.0.0.1");
    await new Promise((r) => server.on("listening", r));
    t.after(() => new Promise((r) => server.close(r)));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const account = await app.auth.register({
      name: "VNPay tester",
      email: `${randomUUID()}@example.test`,
      password: "Integration2026!",
    });
    const authDb = fixture.owner("auth");
    for (const role of ["ADMIN", "ORGANIZER"]) {
      await authDb.query(
        'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
        [randomUUID(), role],
      );
      await authDb.query(
        'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
        [account.user.idUser, role],
      );
    }
    const principal = await app.auth.resolve(account.accessToken);
    const call = async (method, path, body) => {
      const r = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${account.accessToken}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await r.json();
      assert.equal(r.status, 200, JSON.stringify(result));
      return result.data;
    };
    const cat = await call("POST", "/admin/categories", {
      name: "VNPay test",
      slug: randomUUID(),
    });
    const end = new Date(Date.now() + 86400000).toISOString();
    const event = await app.booking.saveEvent(principal, {
      categoryId: cat.id,
      slug: randomUUID(),
      title: "VNPay test",
      description: "Test",
      venueName: "Hall",
      address: "Address",
      cityCode: "DN",
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      endsAt: end,
      checkinOpensAt: new Date(Date.now() - 3600000).toISOString(),
      checkinClosesAt: end,
    });
    const type = await app.booking.configureType(principal, event.id, {
      name: "Standard",
      description: "",
      price: "100000",
      capacity: 100,
      saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
      saleEndsAt: end,
    });
    await app.booking.submit(principal, event.id);
    await app.booking.review(principal, event.id, true, "");
    const newOrder = () =>
      app.booking.createOrder(
        principal,
        event.id,
        [{ ticketTypeId: type.id, quantity: 1 }],
        randomUUID(),
      );
    const transactionId = (p) =>
      String(BigInt("0x" + p.id.replaceAll("-", "").slice(0, 11)));
    const ipn = (p, overrides = {}) => {
      const f = {
        vnp_TmnCode: config.tmnCode,
        vnp_TxnRef: p.merchant_reference,
        vnp_Amount: String(BigInt(p.amount) * 100n),
        vnp_ResponseCode: "00",
        vnp_TransactionStatus: "00",
        vnp_TransactionNo: transactionId(p),
        ...overrides,
      };
      return { ...f, vnp_SecureHash: hash(canonical(f)) };
    };
    const notify = async (f) => {
      const response = await (
        await fetch(base + "/payments/vnpay/ipn?" + new URLSearchParams(f))
      ).json();
      if (response.RspCode === "99") await app.booking.vnpayIpn(f);
      return response;
    };
    const pDb = fixture.owner("payment"),
      oDb = fixture.owner("order");
    const due = (p) =>
      pDb.query(
        "UPDATE payments SET next_reconcile_at=now()-interval '1 second' WHERE id=$1",
        [p.id],
      );
    const ticketCount = async (order) =>
      (
        await oDb.query(
          "SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)",
          [order.id],
        )
      )[0].n;
    await t.test(
      "SMTP OTP is single-use, expires, and sending failures are sanitized",
      async (sub) => {
        const nodemailer = require("nodemailer");
        const saved = {
          SMTP_HOST: process.env.SMTP_HOST,
          SMTP_FROM: process.env.SMTP_FROM,
        };
        process.env.SMTP_HOST = "test.invalid";
        process.env.SMTP_FROM = "test@example.test";
        sub.after(() => {
          for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
          }
        });
        let otp,
          fail = false;
        sub.mock.method(nodemailer, "createTransport", (options) => {
          assert.equal(options.requireTLS, true);
          return {
            sendMail: async (message) => {
              if (fail) throw Error("private-provider-details");
              otp = message.text.match(/\d{6}/)[0];
            },
          };
        });
        const user = await app.auth.register({
          name: "SMTP tester",
          email: `${randomUUID()}@example.test`,
          password: "Integration2026!",
        });
        await app.auth.forgot(user.user.email);
        await app.auth.reset(user.user.email, otp, "ResetPassword2026!");
        await assert.rejects(
          app.auth.reset(user.user.email, otp, "AnotherPassword2026!"),
          (e) => e.code === "INVALID_OTP",
        );
        await app.auth.forgot(user.user.email);
        await authDb.query(
          "UPDATE password_reset_challenges SET created_at=now()-interval '10 minutes',expires_at=now()-interval '1 minute' WHERE user_id=$1",
          [user.user.idUser],
        );
        await assert.rejects(
          app.auth.reset(user.user.email, otp, "AnotherPassword2026!"),
          (e) => e.code === "INVALID_OTP",
        );
        fail = true;
        await assert.rejects(
          app.auth.forgot(user.user.email),
          (e) =>
            e.code === "EMAIL_SEND_FAILED" &&
            !e.message.includes("private-provider-details"),
        );
      },
    );
    await t.test(
      "concurrent start reuses attempt; return alone never issues tickets; IPN validates and deduplicates",
      async () => {
        const order = await newOrder();
        const attempts = await Promise.all([
          app.booking.startPayment(principal, order.id),
          app.booking.startPayment(principal, order.id),
        ]);
        const p = attempts[0];
        assert.equal(p.id, attempts[1].id);
        assert.ok(p.checkout_url);
        const result = ipn(p);
        const page = await fetch(
          base + "/payments/vnpay/return?" + new URLSearchParams(result),
        );
        assert.equal(page.status, 200);
        assert.ok((await page.text()).includes(`/checkout/${order.id}`));
        assert.equal(
          (await app.orders.one(order.id)).status,
          "PENDING_PAYMENT",
        );
        assert.equal(
          (await notify({ ...result, vnp_Amount: "1" })).RspCode,
          "97",
        );
        assert.equal(
          (await notify(ipn(p, { vnp_Amount: "100" }))).RspCode,
          "04",
        );
        assert.equal(
          (await notify(ipn(p, { vnp_TmnCode: "OTHER123" }))).RspCode,
          "97",
        );
        assert.equal(
          (await notify(ipn(p, { vnp_TxnRef: "missing" }))).RspCode,
          "01",
        );
        const codes = await Promise.all([notify(result), notify(result)]);
        assert.deepEqual(codes.map((r) => r.RspCode).sort(), ["00", "02"]);
        assert.equal((await app.orders.one(order.id)).status, "PAID");
        assert.equal(Number(await ticketCount(order)), 1);
        assert.equal(
          (
            await notify(
              ipn(p, { vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }),
            )
          ).RspCode,
          "02",
        );
        assert.equal((await app.payments.one(p.id)).status, "SUCCEEDED");
        const notes = await fixture
          .owner("notification")
          .query("SELECT * FROM notifications WHERE dedupe_key=$1", [
            `paid:${order.id}`,
          ]);
        assert.equal(notes.length, 1);
      },
    );
    await t.test(
      "failed/cancelled payment permits retry and latest status is visible",
      async () => {
        const order = await newOrder(),
          p = await app.booking.startPayment(principal, order.id);
        assert.equal(
          (
            await notify(
              ipn(p, {
                vnp_ResponseCode: "24",
                vnp_TransactionStatus: "02",
                vnp_TransactionNo: "0",
              }),
            )
          ).RspCode,
          "00",
        );
        const detail = await app.booking.detail(principal, order.id);
        assert.equal(detail.payment, undefined);
        assert.equal(detail.latest_payment.status, "FAILED");
        const retry = await app.booking.startPayment(principal, order.id);
        assert.notEqual(p.id, retry.id);
        const demo = await fetch(base + `/payments/${retry.id}/demo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${account.accessToken}`,
          },
          body: JSON.stringify({ success: true }),
        });
        assert.equal(demo.status, 404);
      },
    );
    await t.test(
      "lost IPN is recovered; IPN racing querydr only issues one ticket",
      async () => {
        const order = await newOrder(),
          p = await app.booking.startPayment(principal, order.id);
        await due(p);
        await app.booking.reconcile();
        assert.equal((await app.orders.one(order.id)).status, "PAID");
        assert.equal(Number(await ticketCount(order)), 1);
        const other = await newOrder(),
          q = await app.booking.startPayment(principal, other.id);
        await due(q);
        await Promise.all([app.booking.reconcile(), notify(ipn(q))]);
        assert.equal(Number(await ticketCount(other)), 1);
      },
    );
    await t.test(
      "unresolved result can recover without leaving a stale review flag",
      async () => {
        const order = await newOrder(),
          p = await app.booking.startPayment(principal, order.id);
        await notify(ipn(p, { vnp_TransactionStatus: "07" }));
        assert.equal((await app.payments.one(p.id)).requires_review, true);
        await notify(ipn(p));
        assert.equal((await app.payments.one(p.id)).requires_review, false);
        assert.equal(Number(await ticketCount(order)), 1);
      },
    );
    await t.test(
      "query timeout and not-found leave pending; released inventory is never resurrected",
      async () => {
        const order = await newOrder(),
          p = await app.booking.startPayment(principal, order.id);
        for (const mode of ["timeout", "not-found"]) {
          queryMode = mode;
          await due(p);
          await app.booking.reconcile();
          assert.equal((await app.payments.one(p.id)).status, "PENDING");
        }
        queryMode = "success";
        await pDb.query(
          "UPDATE payments SET created_at=now()-interval '1 hour',provider_expires_at=now()-interval '6 minutes',reconcile_until=now()-interval '1 minute' WHERE id=$1",
          [p.id],
        );
        await oDb.query(
          "UPDATE orders SET created_at=now()-interval '1 hour',expires_at=now()-interval '6 minutes' WHERE id=$1",
          [order.id],
        );
        await oDb.query(
          "UPDATE reservations SET created_at=now()-interval '2 seconds',release_after=now()-interval '1 second' WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)",
          [order.id],
        );
        await app.booking.expire();
        assert.equal((await app.orders.one(order.id)).status, "EXPIRED");
        assert.equal(
          (await app.payments.one(p.id)).review_reason,
          "EXPIRED_UNRESOLVED",
        );
        const result = await notify(ipn(p));
        assert.equal(result.RspCode, "00");
        assert.equal((await app.orders.one(order.id)).status, "EXPIRED");
        assert.equal(Number(await ticketCount(order)), 0);
        assert.equal(
          (await app.payments.one(p.id)).review_reason,
          "LATE_PAYMENT",
        );
      },
    );
  },
);
