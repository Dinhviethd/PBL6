const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DataSource } = require('typeorm');

async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
  assert.ok(new URL(url).pathname.endsWith('_test'), 'Disposable test database required');
  const db = new DataSource({ type: 'postgres', url, ssl: false, migrations: [
    'InitialMvp1790812800000', 'EventCheckinStaff1791072000000',
    'Notifications1791331200000', 'WaitQueue1792627200000',
  ].map(name => require('../dist/migrations/' + name)[name]) });
  await db.initialize(); await db.runMigrations();
  const app = require('../dist/app').createApplication({ databaseUrl: url, databaseSsl: false,
    secret: 'b10-disposable-secret'.repeat(4), qrSecret: 'b10-disposable-qr'.repeat(4),
    demo: true, clientUrl: 'http://127.0.0.1:5190' });
  let server;
  const evidence = [];
  try {
    await app.start();
    for (const role of ['USER', 'ORGANIZER', 'ADMIN']) await db.query(
      'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING', [randomUUID(), role]);
    const password = 'B10Disposable2026!';
    async function account(role) {
      const a = await app.auth.register({ name: 'B10 Test', email: randomUUID() + '@example.test', password });
      if (role !== 'USER') await db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [a.user.idUser, role]);
      return a;
    }
    const owner = await account('ORGANIZER'), other = await account('ORGANIZER'),
      admin = await account('ADMIN'), buyer = await account('USER');
    server = app.app.listen(serve ? 8020 : 0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(method, route, body, status = 200, token = owner.accessToken) {
      const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const csv = res.headers.get('content-type')?.startsWith('text/csv');
      const result = csv ? await res.text() : await res.json();
      assert.equal(res.status, status, route + ': ' + JSON.stringify(result));
      evidence.push({ method, route, status });
      if (csv) {
        assert.match(res.headers.get('content-disposition'), /attachment; filename="event-/);
        assert.equal(res.headers.get('cache-control'), 'no-store');
      }
      return result;
    }
    const categoryId = randomUUID();
    await db.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)', [categoryId, 'B10 Test', randomUUID()]);
    const at = h => new Date(Date.now() + h * 3600000).toISOString();
    const body = { title: 'B10 Festival', categoryId, description: 'B10 disposable test', venueName: 'Test Arena',
      address: 'Test address', cityCode: 'TP.HCM', startsAt: at(48), endsAt: at(52), checkinOpensAt: at(47), checkinClosesAt: at(52) };
    const event = (await call('POST', '/organizer/events', body)).data;
    const empty = (await call('POST', '/organizer/events', { ...body, title: 'B10 Empty Event' })).data;
    const type = name => ({ name, price: '100000', capacity: 500, saleStartsAt: at(-24), saleEndsAt: at(47) });
    const typeA = (await call('POST', `/organizer/events/${event.id}/ticket-types`, type('Vé thường'))).data;
    const typeB = (await call('POST', `/organizer/events/${event.id}/ticket-types`, type('=VIP,"Đặc biệt"\nHạng A'))).data;
    const times = ['2026-10-30T16:59:59Z', '2026-10-30T17:00:00Z', '2026-10-31T17:00:00Z'];
    let total = 0n;
    const orderIds = [];
    // Real PostgreSQL fixture: 60 PAID orders, canonical payments plus duplicate-success retries.
    for (let n = 0; n < 60; n++) {
      const id = randomUUID(), pid = randomUUID(), typeId = n % 2 ? typeB.id : typeA.id;
      const price = 100000 + n * 1000;
      total += BigInt(price); orderIds.push(id);
      await db.query(`INSERT INTO orders(id,order_code,buyer_id,event_id,total_quantity,total_amount,
        buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,created_at,expires_at)
        VALUES($1::uuid,$2,$3,$4,1,$5,'Test Buyer','fixture@example.test','B10 Festival',$1::uuid::text,'test','2026-10-01','2027-01-01')`,
      [id, 'B10-' + id.slice(0, 20), buyer.user.idUser, event.id, price]);
      await db.query(`INSERT INTO order_items(id,order_id,event_id,ticket_type_id,ticket_type_name_snapshot,unit_price,quantity)
        VALUES($1,$2,$3,$4,'Historical name',$5,1)`, [randomUUID(), id, event.id, typeId, price]);
      for (const paymentId of [pid, randomUUID()]) await db.query(`INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,
        status,amount,succeeded_at,created_at,provider_expires_at,reconcile_until)
        VALUES($1::uuid,$2,'demo','test',$1::uuid::text,'SUCCEEDED',$3,$4,'2026-10-01','2027-01-01','2027-01-02')`, [paymentId, id, price, times[n % 3]]);
      await db.query(`UPDATE orders SET status='PAID',paid_payment_id=$2,paid_at=$3 WHERE id=$1`, [id, pid, times[n % 3]]);
    }
    await db.query('UPDATE ticket_types SET sold_quantity=30,price_amount=999999 WHERE event_id=$1', [event.id]);
    await db.query('UPDATE ticket_types SET archived_at=now() WHERE id=$1', [typeB.id]);
    for (const status of ['PENDING_PAYMENT', 'CANCELLED']) await db.query(`INSERT INTO orders(id,order_code,buyer_id,event_id,status,
      total_quantity,total_amount,buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,
      created_at,expires_at,closed_at) VALUES($1::uuid,left($1::uuid::text,32),$2,$3,$4::text,1,999999,'Excluded','fixture@example.test','B10',
      $1::uuid::text,'test','2026-10-01','2027-01-01',CASE WHEN $4::text='CANCELLED' THEN now() ELSE NULL END)`,
    [randomUUID(), buyer.user.idUser, event.id, status]);
    const route = `/organizer/events/${event.id}/analytics`;
    const q = '?fromDate=2026-10-30&toDate=2026-11-02';
    const report = (await call('GET', route + q)).data;
    assert.equal(report.totals.revenue, total.toString()); assert.equal(report.totals.sold, '60');
    assert.equal(report.totals.paidOrders, 60); assert.equal(report.dailySeries.length, 4);
    assert.deepEqual(report.dailySeries.map(day => day.sold), ['20', '20', '20', '0']);
    assert.equal(report.ticketTypes.length, 2); assert.ok(report.ticketTypes.some(row => row.archived && row.sold === '30'));
    assert.equal(report.ticketTypes.reduce((s, row) => s + BigInt(row.revenue), 0n), total);
    assert.equal(report.dailySeries.reduce((s, row) => s + BigInt(row.revenue), 0n), total);
    const one = (await call('GET', route + '?fromDate=2026-10-31&toDate=2026-10-31')).data;
    assert.equal(one.totals.sold, '20'); assert.equal(one.dailySeries.length, 1);
    const csv = await call('GET', route + '/export.csv' + q);
    assert.match(csv, /"Tổng","7770000","60","60"/);
    assert.match(csv, /"'=VIP,""Đặc biệt""\nHạng A"/);
    assert.ok(!csv.includes('fixture@example.test'));
    const noSales = (await call('GET', route + '?fromDate=2099-01-01&toDate=2099-01-02')).data;
    assert.equal(noSales.totals.sold, '0'); assert.equal(noSales.dailySeries.length, 2);
    const emptyReport = (await call('GET', `/organizer/events/${empty.id}/analytics`)).data;
    assert.equal(emptyReport.dailySeries.length, 30); assert.equal(emptyReport.ticketTypes.length, 0);
    for (const query of ['?fromDate=bad', '?fromDate=2026-02-30', '?fromDate=2026-11-02&toDate=2026-11-01',
      '?fromDate=2025-01-01&toDate=2026-11-01', '?unknown=1', '?fromDate=2026-10-31&fromDate=2026-11-01']) {
      await call('GET', route + query, undefined, 400);
      await call('GET', route + '/export.csv' + query, undefined, 400);
    }
    for (const suffix of ['', '/export.csv']) {
      await call('GET', route + suffix, undefined, 401, null);
      await call('GET', route + suffix, undefined, 403, other.accessToken);
      await call('GET', route + suffix, undefined, 403, buyer.accessToken);
      await call('GET', route + suffix, undefined, 200, admin.accessToken);
      await call('GET', '/organizer/events/not-a-uuid/analytics' + suffix, undefined, 400);
      await call('GET', '/organizer/events/' + randomUUID() + '/analytics' + suffix, undefined, 404);
    }
    const stats = (await call('GET', `/organizer/events/${event.id}/stats`)).data;
    assert.equal(stats.revenue, total.toString()); assert.equal(stats.sold, '60');
    await call('GET', '/organizer/events?page=0&limit=6'); await call('GET', `/organizer/events/${event.id}`);
    // Broken order/item totals are surfaced, not silently exported as a valid report.
    await db.query('UPDATE orders SET total_amount=total_amount+1 WHERE id=$1', [orderIds[0]]);
    await call('GET', route + q, undefined, 409);
    await db.query('UPDATE orders SET total_amount=total_amount-1 WHERE id=$1', [orderIds[0]]);
    const snapshotDb = require('../dist/platform/database').createDatabase(url, false);
    await snapshotDb.start();
    try {
      const ownOrders = require('../dist/modules/order/public').createOrders(snapshotDb.owner('order'), 'b10-snapshot');
      const analytics = require('../dist/workflows/event-analytics').createEventAnalytics(
        require('../dist/modules/event/public').createEvents(snapshotDb.owner('event')),
        { ...ownOrders, async analyticsPaidOrders(id) {
          const rows = await ownOrders.analyticsPaidOrders(id);
          await db.query('UPDATE order_items SET unit_price=unit_price+1 WHERE order_id=$1', [orderIds[0]]);
          return rows;
        } },
        require('../dist/modules/payment/public').createPayments(snapshotDb.owner('payment'), require('../dist/modules/payment/public').demoProvider(true)),
        snapshotDb.snapshot,
      );
      const snapshotReport = await analytics.report({ userId: owner.user.idUser, roles: ['ORGANIZER'], permissions: [], sessionId: '' },
        event.id, { fromDate: '2026-10-30', toDate: '2026-11-02' });
      assert.equal(snapshotReport.totals.revenue, total.toString());
      assert.equal(snapshotReport.ticketTypes.reduce((sum, row) => sum + BigInt(row.revenue), 0n), total);
    } finally {
      await db.query('UPDATE order_items SET unit_price=unit_price-1 WHERE order_id=$1', [orderIds[0]]);
      await snapshotDb.close();
    }
    const { analyticsCsv, analyticsRange } = require('../dist/workflows/event-analytics');
    assert.equal(analyticsRange({}, new Date('2026-10-31T17:00:00Z')).toDate, '2026-11-01');
    assert.equal(analyticsRange({}, new Date('2026-10-31T17:00:00Z')).fromDate, '2026-10-03');
    const big = '900719925474099312345';
    assert.ok(analyticsCsv({ ...report, totals: { revenue: big, sold: '60', paidOrders: 60 } }).includes(big));
    const output = process.env.B10_EVIDENCE_DIR;
    if (output) { await fs.mkdir(output, { recursive: true }); await fs.writeFile(path.join(output, 'api.json'), JSON.stringify({
      result: 'PASS', orders: 60, revenue: total.toString(), snapshotConsistency: 'PASS', httpChecks: evidence.length, sample: report, evidence,
    }, null, 2)); }
    console.log(JSON.stringify({ result: 'PASS', orders: 60, revenue: total.toString(), httpChecks: evidence.length }));
    if (serve) {
      const dir = path.resolve(__dirname, '../.local'); await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'b10-fixture.json'), JSON.stringify({ eventId: event.id, emptyEventId: empty.id, email: owner.user.email, password }));
      console.log('B10 API ready on 8020; send input to stop.');
      await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); }); process.stdin.pause();
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await app.close(); await db.destroy();
  }
}
if (process.argv.includes('--serve')) verify(true).catch(error => { console.error(error); process.exitCode = 1; });
else test('B10 analytics and CSV: canonical payment dates, totals, validation and tenant permissions', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 120000,
}, () => verify());
