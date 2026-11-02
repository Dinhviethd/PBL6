const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DataSource } = require('typeorm');

async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
  assert.ok(new URL(url).pathname.endsWith('_test'));
  const db = new DataSource({ type: 'postgres', url, ssl: false, migrations: [
    'InitialMvp1790812800000', 'EventCheckinStaff1791072000000', 'Notifications1791331200000', 'WaitQueue1792627200000',
  ].map(name => require('../dist/migrations/' + name)[name]) });
  await db.initialize(); await db.runMigrations();
  const app = require('../dist/app').createApplication({ databaseUrl: url, databaseSsl: false,
    secret: 'b1-disposable-secret'.repeat(4), qrSecret: 'b1-disposable-qr'.repeat(4), demo: true, clientUrl: 'http://127.0.0.1:5191' });
  let server;
  const evidence = [];
  try {
    await app.start();
    for (const role of ['USER', 'ORGANIZER', 'ADMIN']) await db.query(
      'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING', [randomUUID(), role]);
    const password = 'B1Disposable2026!';
    async function account(role) {
      const a = await app.auth.register({ name: 'B1 Test', email: randomUUID() + '@example.test', password });
      if (role !== 'USER') await db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [a.user.idUser, role]);
      return a;
    }
    const owner = await account('ORGANIZER'), other = await account('ORGANIZER'), buyer = await account('USER'), admin = await account('ADMIN');
    server = app.app.listen(serve ? 8021 : 0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(route, status = 200, token = owner.accessToken) {
      const res = await fetch(base + route, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
      const body = await res.json();
      assert.equal(res.status, status, route + ': ' + JSON.stringify(body));
      if (status === 200) assert.equal(res.headers.get('cache-control'), 'no-store');
      evidence.push({ route, status }); return body.data;
    }
    const category = randomUUID();
    await db.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)', [category, 'B1 Test', randomUUID()]);
    const at = h => new Date(Date.now() + h * 3600000).toISOString();
    async function event(title, offset, status = 'PUBLISHED', user = owner) {
      const id = randomUUID();
      await db.query(`INSERT INTO events(id,organizer_id,category_id,slug,title,description,venue_name,address,city_code,
        starts_at,ends_at,checkin_opens_at,checkin_closes_at,status,published_at,cancelled_at,cancellation_reason)
        VALUES($1::uuid,$2,$3,$1::uuid::text,$4,'Fixture','Test Arena','Test address','TP.HCM',$5,$6,$5,$6,$7::text,
          CASE WHEN $7::text='PUBLISHED' THEN now() ELSE NULL END,
          CASE WHEN $7::text='CANCELLED' THEN now() ELSE NULL END,
          CASE WHEN $7::text='CANCELLED' THEN 'Test' ELSE NULL END)`,
      [id, user.user.idUser, category, title, at(offset), at(offset + 4), status]);
      const type = randomUUID();
      await db.query(`INSERT INTO ticket_types(id,event_id,name,price_amount,capacity,sale_starts_at,sale_ends_at)
        VALUES($1,$2,'Vé thường',100000,1000,$3,$4)`, [type, id, at(-24), at(100)]);
      return { id, type };
    }
    const events = [];
    for (let i = 0; i < 55; i++) events.push(await event('B1 Event ' + i, i < 2 ? -2 + i : i * 5));
    const excluded = await event('Other owner', 1, 'PUBLISHED', other);
    const draft = await event('Draft', 1, 'DRAFT');
    const cancelled = await event('Cancelled', 1, 'CANCELLED');
    const ended = await event('Ended', -10);
    await db.query('UPDATE events SET sales_paused=true WHERE id=$1', [events[2].id]);
    await db.query('UPDATE ticket_types SET reserved_quantity=capacity WHERE id=$1', [events[3].type]);
    await db.query('UPDATE ticket_types SET sale_starts_at=$2 WHERE id=$1', [events[4].type, at(24)]);
    await db.query('UPDATE ticket_types SET sale_ends_at=$2 WHERE id=$1', [events[5].type, at(-1)]);
    await db.query('UPDATE ticket_types SET archived_at=now() WHERE id=$1', [events[6].type]);
    await db.query(`INSERT INTO wait_queue(id,user_id,event_id,ticket_type_id,event_title,type_name)
      VALUES($1,$2,$3,$4,'B1','Vé thường')`, [randomUUID(), buyer.user.idUser, events[7].id, events[7].type]);
    const payments = [], orders = [];
    async function paid(e, amount, time) {
      const id = randomUUID(), pid = randomUUID(), item = randomUUID();
      await db.query(`INSERT INTO orders(id,order_code,buyer_id,event_id,total_quantity,total_amount,
        buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,created_at,expires_at)
        VALUES($1::uuid,left($1::uuid::text,32),$2,$3,1,$4,'Test buyer','test@example.test','B1',$1::uuid::text,'test','2026-01-01','2027-01-01')`,
      [id, buyer.user.idUser, e.id, amount]);
      await db.query(`INSERT INTO order_items(id,order_id,event_id,ticket_type_id,ticket_type_name_snapshot,unit_price,quantity)
        VALUES($1,$2,$3,$4,'Historical price',$5,1)`, [item, id, e.id, e.type, amount]);
      for (const p of [pid, randomUUID()]) await db.query(`INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,
        status,amount,succeeded_at,created_at,provider_expires_at,reconcile_until)
        VALUES($1::uuid,$2,'demo','test',$1::uuid::text,'SUCCEEDED',$3,$4,'2026-01-01','2027-01-01','2027-01-02')`, [p, id, amount, time]);
      await db.query(`UPDATE orders SET status='PAID',paid_payment_id=$2,paid_at=$3 WHERE id=$1`, [id, pid, time]);
      payments.push(pid); orders.push(id);
      return item;
    }
    const times = ['2026-10-30T16:59:59Z', '2026-10-30T17:00:00Z', '2026-10-31T17:00:00Z'];
    for (let i = 0; i < 60; i++) {
      const item = await paid(events[0], '100000', times[i % 3]);
      if (i < 3) await db.query(`INSERT INTO tickets(id,order_item_id,event_id,sequence_no,ticket_code,qr_token_hash,
        qr_token_ciphertext,qr_key_version,status,voided_at,void_reason)
        VALUES($1::uuid,$2,$3,1,left($1::uuid::text,32),$1::uuid::text,'test',1,$4::text,CASE WHEN $4::text='VOID' THEN now() ELSE NULL END,
        CASE WHEN $4::text='VOID' THEN 'Test' ELSE NULL END)`,
      [randomUUID(), item, events[0].id, ['CHECKED_IN', 'VALID', 'VOID'][i]]);
    }
    await paid(events[54], '200000', times[1]); // Beyond the first page of fifty events.
    await paid(excluded, '999999', times[1]);
    for (const status of ['PENDING_PAYMENT', 'CANCELLED']) await db.query(`INSERT INTO orders(id,order_code,buyer_id,event_id,
      status,total_quantity,total_amount,buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,
      request_hash,created_at,expires_at,closed_at) VALUES($1::uuid,left($1::uuid::text,32),$2,$3,$4::text,1,999999,
      'Excluded','test@example.test','B1',$1::uuid::text,'test','2026-01-01','2027-01-01',
      CASE WHEN $4::text='CANCELLED' THEN now() ELSE NULL END)`, [randomUUID(), buyer.user.idUser, events[0].id, status]);
    await db.query('UPDATE ticket_types SET sold_quantity=60,price_amount=999999 WHERE id=$1', [events[0].type]);
    const route = '/organizer/dashboard', q = '?fromDate=2026-10-30&toDate=2026-11-02';
    const report = await call(route + q);
    assert.deepEqual(report.totals, { revenue: '6200000', sold: '61', paidOrders: 61 });
    assert.deepEqual(report.dailySeries.map(day => day.sold), ['20', '21', '20', '0']);
    assert.equal(report.dailySeries.reduce((sum, day) => sum + BigInt(day.revenue), 0n), 6200000n);
    assert.equal(report.currentEventCounts.onSale, 49); // 55 less paused/held/not-open/expired/archived/queue.
    assert.equal(report.upcomingEvents.length, 5);
    assert.equal(report.upcomingEvents[0].id, events[0].id);
    assert.equal(report.upcomingEvents[0].temporalStatus, 'ONGOING');
    assert.equal(report.upcomingEvents[0].checkedIn, '1');
    assert.equal(report.upcomingEvents[0].eligibleTickets, '2');
    assert.equal(report.upcomingEvents[0].sold, '60');
    assert.ok(report.upcomingEvents.every(e => ![excluded.id, draft.id, cancelled.id, ended.id].includes(e.id)));
    const one = await call(route + q + '&eventId=' + events[54].id);
    assert.deepEqual(one.totals, { revenue: '200000', sold: '1', paidOrders: 1 });
    assert.equal(one.upcomingEvents.length, 1);
    for (const e of events.slice(2, 8)) {
      const notOnSale = await call(route + q + '&eventId=' + e.id);
      assert.equal(notOnSale.currentEventCounts.onSale, 0);
    }
    await db.query('UPDATE ticket_types SET archived_at=now() WHERE id=$1', [events[0].type]);
    const archivedSold = await call(route + q + '&eventId=' + events[0].id);
    assert.equal(archivedSold.currentEventCounts.onSale, 0);
    assert.equal(archivedSold.upcomingEvents[0].sold, '60');
    assert.equal(archivedSold.upcomingEvents[0].capacity, '1000');
    await db.query('UPDATE ticket_types SET archived_at=NULL WHERE id=$1', [events[0].type]);
    await db.query('UPDATE ticket_types SET sold_quantity=capacity WHERE id=$1', [events[1].type]);
    assert.equal((await call(route + q + '&eventId=' + events[1].id)).currentEventCounts.onSale, 0);
    await db.query('UPDATE ticket_types SET sold_quantity=0 WHERE id=$1', [events[1].type]);
    const emptyEvent = await call(route + q + '&eventId=' + draft.id);
    assert.equal(emptyEvent.upcomingEvents.length, 0);
    assert.equal(emptyEvent.totals.revenue, '0');
    const boundary = await call(route + '?fromDate=2026-10-31&toDate=2026-10-31');
    assert.deepEqual(boundary.totals, { revenue: '2200000', sold: '21', paidOrders: 21 });
    const zero = await call(route + '?fromDate=2099-01-01&toDate=2099-01-02');
    assert.equal(zero.totals.revenue, '0'); assert.equal(zero.dailySeries.length, 2);
    assert.deepEqual(zero.upcomingEvents, report.upcomingEvents); // Current events ignore the historical date filter.
    assert.deepEqual((await call(route, 200, admin.accessToken)).totals, { revenue: '0', sold: '0', paidOrders: 0 });
    await call(route, 401, null); await call(route, 403, buyer.accessToken);
    await call(route + '?eventId=' + excluded.id, 404);
    await call(route + '?eventId=' + events[0].id, 404, other.accessToken);
    await call(route + '?eventId=' + randomUUID(), 404);
    for (const suffix of ['?eventId=all', '?fromDate=bad', '?fromDate=2026-02-30', '?unknown=1',
      '?fromDate=2026-11-02&toDate=2026-11-01', '?fromDate=2025-01-01&toDate=2026-11-02',
      '?fromDate=2026-10-31&fromDate=2026-11-01']) await call(route + suffix, 400);
    await db.query('UPDATE orders SET total_amount=total_amount+1 WHERE id=$1', [orders[0]]);
    await call(route + q, 409);
    await db.query('UPDATE orders SET total_amount=total_amount-1 WHERE id=$1', [orders[0]]);
    const largeOrders = orders.slice(0, 18);
    await db.query('UPDATE order_items SET unit_price=900719925474099 WHERE order_id=ANY($1::uuid[])', [largeOrders]);
    await db.query('UPDATE orders SET total_amount=900719925474099 WHERE id=ANY($1::uuid[])', [largeOrders]);
    const large = await call(route + q);
    assert.equal(large.totals.revenue, (900719925474099n * 18n + 42n * 100000n + 200000n).toString());
    assert.equal(large.dailySeries.reduce((sum, day) => sum + BigInt(day.revenue), 0n).toString(), large.totals.revenue);
    await db.query('UPDATE order_items SET unit_price=100000 WHERE order_id=ANY($1::uuid[])', [largeOrders]);
    await db.query('UPDATE orders SET total_amount=100000 WHERE id=ANY($1::uuid[])', [largeOrders]);
    const snapshotDb = require('../dist/platform/database').createDatabase(url, false);
    await snapshotDb.start();
    try {
      const ownEvents = require('../dist/modules/event/public').createEvents(snapshotDb.owner('event'));
      const dashboard = require('../dist/workflows/organizer-dashboard').createOrganizerDashboard(
        { ...ownEvents, async dashboardEvents(...args) {
          const rows = await ownEvents.dashboardEvents(...args);
          await db.query('UPDATE ticket_types SET sold_quantity=61 WHERE id=$1', [events[0].type]);
          return rows;
        } },
        require('../dist/modules/order/public').createOrders(snapshotDb.owner('order'), 'b1-test'),
        require('../dist/modules/payment/public').createPayments(snapshotDb.owner('payment'), require('../dist/modules/payment/public').demoProvider(true)),
        snapshotDb.snapshot);
      const snap = await dashboard.report({ userId: owner.user.idUser, roles: ['ORGANIZER'], permissions: [], sessionId: '' },
        { fromDate: '2026-10-30', toDate: '2026-11-02' });
      assert.equal(snap.upcomingEvents[0].sold, '60');
    } finally { await db.query('UPDATE ticket_types SET sold_quantity=60 WHERE id=$1', [events[0].type]); await snapshotDb.close(); }
    if (process.env.B1_EVIDENCE_DIR) {
      await fs.mkdir(process.env.B1_EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(process.env.B1_EVIDENCE_DIR, 'api.json'), JSON.stringify({ result: 'PASS', httpChecks: evidence.length,
        snapshotConsistency: 'PASS', sample: report, evidence }, null, 2));
    }
    console.log(JSON.stringify({ result: 'PASS', httpChecks: evidence.length, revenue: report.totals.revenue }));
    if (serve) {
      const dir = path.resolve(__dirname, '../.local'); await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'b1-fixture.json'), JSON.stringify({ eventId: events[0].id, lateEventId: events[54].id,
        draftEventId: draft.id, email: owner.user.email, emptyEmail: admin.user.email, password }));
      console.log('B1 source API ready on 8021');
      await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); }); process.stdin.pause();
    }
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await app.close(); await db.destroy(); }
}
if (process.argv.includes('--serve')) verify(true).catch(error => { console.error(error); process.exitCode = 1; });
else test('B1 dashboard: owner aggregate, canonical payments, sale inventory, upcoming check-in and snapshot', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 120000,
}, () => verify());
