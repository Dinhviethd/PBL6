const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { c5Fixture } = require('./fixtures/c5.cjs');
const { createApplication } = require('../dist/app');
const { createDatabase } = require('../dist/platform/database');
const { createSepayPayments } = require('../dist/modules/payment/public');
const adminUrl = process.env.SEPAY_CONCURRENCY_ADMIN_URL || process.env.TEST_DATABASE_URL;
const gate = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
async function bounded(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error('Concurrency barrier timed out')), 10000);
  })]); } finally { clearTimeout(timer); }
}

// The supplied connection only provisions a fresh, randomly named test database.
// Never migrate or truncate the supplied database. CI's PostgreSQL service is sufficient.
test('SePay serializes inbox, expiry and retries on isolated PostgreSQL', { skip: !adminUrl, timeout: 90000 }, async t => {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(adminUrl).hostname), 'Loopback PostgreSQL required');
  const name = 'eventhub_sepay_' + randomBytes(6).toString('hex') + '_test';
  const control = new Client({ connectionString: adminUrl, ssl: false });
  await control.connect();
  let f, app, db;
  await control.query(`CREATE DATABASE ${name}`);
  try {
    const target = new URL(adminUrl); target.pathname = '/' + name;
    const url = target.toString();
    f = await c5Fixture(url);
    await new (require('../dist/migrations/SepayLocalFoundation1793289600000').SepayLocalFoundation1793289600000)().up(f.db);
    const config = { environment: 'test', bankCode: 'MBBank', accountNumber: 'TESTONLY', accountName: 'SYNTHETIC', webhookSecret: 's'.repeat(40) };
    app = createApplication({ databaseUrl: url, databaseSsl: false, secret: 'a'.repeat(40), qrSecret: 'b'.repeat(40), sepay: config });
    await app.start(); db = createDatabase(url, false); await db.start();
    const store = createSepayPayments(db.owner('payment'), config);
    const login = await app.auth.login(f.accounts.admin.email, f.accounts.admin.password);
    const principal = await app.auth.resolve(login.accessToken);
    const future = new Date(Date.now() + 86400000).toISOString(), past = new Date(Date.now() - 3600000).toISOString();
    const event = await app.booking.saveEvent(principal, { categoryId: f.categoryId, slug: randomUUID(), title: 'Concurrency fixture', description: 'Synthetic', venueName: 'Test', address: 'Test', cityCode: 'DN', startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: future, checkinOpensAt: past, checkinClosesAt: future });
    const type = await app.booking.configureType(principal, event.id, { name: 'Test', description: '', price: '100000', capacity: 20, saleStartsAt: past, saleEndsAt: future });
    await app.booking.submit(principal, event.id); await app.booking.review(principal, event.id, true, '');
    let transactionId = 1000;
    const errors = [];
    t.mock.method(console, 'error', (...args) => errors.push(args.map(String).join(' ')));
    async function makeOrder(expired = false) {
      const order = await app.booking.createOrder(principal, event.id, [{ ticketTypeId: type.id, quantity: 1 }], randomUUID());
      const reference = 'tkh' + randomBytes(5).toString('hex');
      const paymentId = await db.uow.run(() => store.create(order, reference));
      // Transfer is safely before either deadline; no wall-clock-sensitive bank timestamp.
      const payload = { id: ++transactionId, gateway: 'MBBank', transactionDate: '2020-01-01 12:00:00', accountNumber: 'TESTONLY', subAccount: null, code: reference, content: reference, transferType: 'in', transferAmount: 100000, accumulated: 0, description: 'Synthetic', referenceCode: reference };
      if (expired) await expireHold(order.id);
      await app.sepayWebhook.receive(payload);
      return { order, paymentId, payload };
    }
    async function expireHold(id) {
      await f.db.query("UPDATE orders SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id=$1", [id]);
      await f.db.query("UPDATE reservations SET created_at=now()-interval '2 hours',release_after=now()-interval '1 minute' WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)", [id]);
      await f.db.query("UPDATE payments SET created_at=now()-interval '2 hours',provider_expires_at=now()-interval '1 hour',reconcile_until=now()-interval '1 minute' WHERE order_id=$1", [id]);
    }
    async function waitForOrderWaiter() {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const rows = await f.db.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT * FROM orders WHERE%' AND cardinality(pg_blocking_pids(pid))>0");
        if (rows.length) return;
        await new Promise(r => setTimeout(r, 20));
      }
      throw Error('No order lock waiter observed');
    }
    async function state(item) {
      return {
        order: (await f.db.query('SELECT status FROM orders WHERE id=$1', [item.order.id]))[0].status,
        payment: (await f.db.query('SELECT status,requires_review FROM payments WHERE id=$1', [item.paymentId]))[0],
        tickets: Number((await f.db.query('SELECT count(*) FROM tickets t JOIN order_items i ON i.id=t.order_item_id WHERE i.order_id=$1', [item.order.id]))[0].count),
        inbox: await f.db.query('SELECT status,reason,attempt_count,next_retry_at FROM sepay_transactions WHERE payment_code=$1 ORDER BY webhook_transaction_id', [item.payload.code]),
        reservations: (await f.db.query('SELECT r.status FROM reservations r JOIN order_items i ON i.id=r.order_item_id WHERE i.order_id=$1', [item.order.id])).map(r => r.status),
      };
    }
    await t.test('expiry holds order first: inbox waits without holding payment, then reviews released reservation', async () => {
      const item = await makeOrder(true), held = gate(), release = gate();
      const original = app.payments.review;
      app.payments.review = async (...args) => {
        if (args[0] === item.paymentId && args[1] === 'EXPIRED_UNRESOLVED') { held.resolve(); await bounded(release.promise); }
        return original(...args);
      };
      const expiry = app.booking.expire();
      let inbox;
      try {
        await bounded(held.promise);
        inbox = app.sepayWebhook.processBatch(1);
        await waitForOrderWaiter();
      } finally {
        release.resolve();
        const results = await Promise.allSettled([expiry, inbox]);
        app.payments.review = original;
        for (const result of results) if (result.status === "rejected") throw result.reason;
      }
      const s = await state(item);
      assert.deepEqual(errors, []);
      assert.equal(s.order, 'EXPIRED'); assert.equal(s.tickets, 0);
      assert.deepEqual(s.reservations, ['RELEASED']);
      assert.equal(s.inbox[0].status, 'REVIEW'); assert.equal(s.inbox[0].reason, 'RESERVATION_NOT_HELD');
      assert.equal(s.inbox[0].attempt_count, 1); assert.equal(s.payment.requires_review, true);
      assert.deepEqual(errors, []);
    });
    await t.test('inbox holds order first: expiry waits and releases expired inventory exactly once', async () => {
      const item = await makeOrder(true), held = gate(), release = gate();
      const original = app.payments.one;
      app.payments.one = async (...args) => {
        const value = await original(...args);
        if (args[0] === item.paymentId && args[1]) { held.resolve(); await bounded(release.promise); }
        return value;
      };
      const inbox = app.sepayWebhook.processBatch(1);
      let expiry;
      try { await bounded(held.promise); expiry = app.booking.expire(); await waitForOrderWaiter(); }
      finally {
        release.resolve();
        const results = await Promise.allSettled([inbox, expiry]);
        app.payments.one = original;
        for (const result of results) if (result.status === "rejected") throw result.reason;
      }
      const s = await state(item);
      assert.deepEqual(errors, []);
      assert.equal(s.order, 'EXPIRED'); assert.equal(s.tickets, 0);
      assert.deepEqual(s.reservations, ['RELEASED']); assert.equal(s.inbox[0].status, 'REVIEW');
      assert.equal(s.inbox[0].reason, 'RESERVATION_NOT_HELD'); assert.deepEqual(errors, []);
      assert.equal(await app.booking.expire(), 0);
    });
    await t.test('two inbox workers settle once and re-read SUCCEEDED after waiting for the order', async () => {
      const item = await makeOrder(), held = gate(), release = gate();
      await app.sepayWebhook.receive({ ...item.payload, id: ++transactionId, referenceCode: 'SECOND-SYNTHETIC' });
      const original = app.payments.one; let paused = false;
      app.payments.one = async (...args) => {
        const value = await original(...args);
        if (args[0] === item.paymentId && args[1] && !paused) { paused = true; held.resolve(); await bounded(release.promise); }
        return value;
      };
      const first = app.sepayWebhook.processBatch(1); let second;
      try { await bounded(held.promise); second = app.sepayWebhook.processBatch(1); await waitForOrderWaiter(); }
      finally {
        release.resolve();
        const results = await Promise.allSettled([first, second]);
        app.payments.one = original;
        for (const result of results) if (result.status === "rejected") throw result.reason;
      }
      const s = await state(item);
      assert.equal(s.order, 'PAID'); assert.equal(s.payment.status, 'SUCCEEDED'); assert.equal(s.tickets, 1);
      assert.deepEqual(s.reservations, ['CONSUMED']);
      assert.deepEqual(s.inbox.map(x => x.status), ['PROCESSED', 'REVIEW']);
      assert.equal(s.inbox[1].reason, 'PAYMENT_ALREADY_SETTLED');
      assert.equal(await app.sepayWebhook.processBatch(), 0); assert.deepEqual(errors, []);
    });
    await t.test('a failed transaction rolls back; scheduled retry after expiry reviews instead of issuing tickets', async () => {
      const item = await makeOrder();
      const original = app.payments.verifiedResult;
      app.payments.verifiedResult = async () => { throw Object.assign(Error('Synthetic transient failure'), { code: '40001' }); };
      try { await app.sepayWebhook.processBatch(1); } finally { app.payments.verifiedResult = original; }
      let s = await state(item);
      assert.equal(s.order, 'PENDING_PAYMENT'); assert.equal(s.tickets, 0); assert.equal(s.payment.status, 'PENDING');
      assert.deepEqual(s.reservations, ['HELD']); assert.equal(s.inbox[0].status, 'ERROR');
      assert.ok(s.inbox[0].next_retry_at); assert.equal(await app.sepayWebhook.processBatch(), 0);
      assert.equal(errors.length, 1); assert.match(errors.pop(), /40001/);
      await expireHold(item.order.id); await app.booking.expire();
      await f.db.query("UPDATE sepay_transactions SET next_retry_at=now()-interval '1 second' WHERE payment_code=$1", [item.payload.code]);
      assert.equal(await app.sepayWebhook.processBatch(), 1);
      s = await state(item);
      assert.equal(s.order, 'EXPIRED'); assert.equal(s.tickets, 0); assert.equal(s.inbox[0].status, 'REVIEW');
      assert.equal(s.inbox[0].reason, 'RESERVATION_NOT_HELD'); assert.equal(s.inbox[0].attempt_count, 2);
      assert.equal(s.inbox[0].next_retry_at, null); assert.deepEqual(errors, []);
    });
    const inventory = (await f.db.query('SELECT reserved_quantity,sold_quantity FROM ticket_types WHERE id=$1', [type.id]))[0];
    assert.equal(inventory.reserved_quantity, 0); assert.equal(inventory.sold_quantity, 1);
  } finally {
    if (app) await app.close(); if (db) await db.close(); if (f) await f.close();
    // name is generated here, never taken from configuration or user data.
    await control.query(`DROP DATABASE ${name} WITH (FORCE)`);
    await control.end();
  }
});
