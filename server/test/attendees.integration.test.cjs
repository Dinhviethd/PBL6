const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DataSource } = require('typeorm');

async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
  assert.ok(new URL(url).pathname.endsWith('_test'), 'Disposable local test database required');
  const db = new DataSource({ type: 'postgres', url, ssl: false, migrations: [
    'InitialMvp1790812800000', 'EventCheckinStaff1791072000000',
    'Notifications1791331200000', 'WaitQueue1792627200000',
  ].map(name => require('../dist/migrations/' + name)[name]) });
  await db.initialize();
  await db.runMigrations();
  const app = require('../dist/app').createApplication({ databaseUrl: url, databaseSsl: false,
    secret: 'b8-isolated-secret'.repeat(4), qrSecret: 'b8-isolated-qr'.repeat(4),
    demo: true, clientUrl: 'http://127.0.0.1:5188' });
  let server;
  const evidence = [];
  try {
    await app.start();
    for (const code of ['USER', 'ORGANIZER', 'ADMIN']) await db.query(
      'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING', [randomUUID(), code]);
    const password = 'B8Disposable2026!';
    async function account(role) {
      const a = await app.auth.register({ name: 'B8 Test Buyer', email: randomUUID() + '@example.test', password });
      if (role !== 'USER') await db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [a.user.idUser, role]);
      return a;
    }
    const owner = await account('ORGANIZER'), other = await account('ORGANIZER'),
      admin = await account('ADMIN'), buyer = await account('USER');
    server = app.app.listen(serve ? 8018 : 0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(method, route, body, status = 200, token = owner.accessToken) {
      const res = await fetch(base + route, { method, headers: {
        'Content-Type': 'application/json', 'Idempotency-Key': randomUUID(),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await res.json();
      assert.equal(res.status, status, route + ': ' + JSON.stringify(json));
      evidence.push({ method, route, status });
      return json;
    }
    const categoryId = randomUUID();
    await db.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)', [categoryId, 'B8 Test Music', randomUUID()]);
    const at = h => new Date(Date.now() + h * 3600000).toISOString();
    const eventBody = { title: 'B8 Test Festival', categoryId, description: 'Disposable B8 fixture',
      venueName: 'B8 Test Arena', address: '123 Test Street', cityCode: 'TP.HCM',
      startsAt: at(24), endsAt: at(28), checkinOpensAt: at(-1), checkinClosesAt: at(27) };
    const event = (await call('POST', '/organizer/events', eventBody)).data;
    const empty = (await call('POST', '/organizer/events', { ...eventBody, title: 'B8 Empty Event' })).data;
    const eventBase = '/organizer/events/' + event.id;
    const typeBody = { name: 'Same Ticket Name', price: '100000', capacity: 200, saleStartsAt: at(-2), saleEndsAt: at(23) };
    const typeA = (await call('POST', eventBase + '/ticket-types', typeBody)).data;
    const typeB = (await call('POST', eventBase + '/ticket-types', typeBody)).data;
    const foreign = (await call('POST', `/organizer/events/${empty.id}/ticket-types`, typeBody)).data;
    await call('POST', eventBase + '/submit', {});
    await call('POST', `/admin/events/${event.id}/review`, { approve: true }, 200, admin.accessToken);
    for (let n = 0; n < 7; n++) {
      const order = (await call('POST', '/orders', { eventId: event.id,
        items: [{ ticketTypeId: n < 3 ? typeA.id : typeB.id, quantity: n === 6 ? 3 : 10 }],
        idempotencyKey: randomUUID() }, 200, buyer.accessToken)).data;
      const payment = (await call('POST', `/orders/${order.id}/payments`, {}, 200, buyer.accessToken)).data;
      await call('POST', `/payments/${payment.id}/demo`, { success: true }, 200, buyer.accessToken);
    }
    const rows = await db.query('SELECT t.id,i.ticket_type_id FROM tickets t JOIN order_items i ON i.id=t.order_item_id WHERE t.event_id=$1 ORDER BY t.issued_at,t.id', [event.id]);
    assert.equal(rows.length, 63);
    for (const row of rows.slice(0, 20)) {
      await db.query("UPDATE tickets SET status='CHECKED_IN' WHERE id=$1", [row.id]);
      await db.query("INSERT INTO checkins(ticket_id,event_id,checked_in_by,method) VALUES($1,$2,$3,'MANUAL_CODE')", [row.id, event.id, owner.user.idUser]);
    }
    for (const row of rows.slice(20, 23)) await db.query("UPDATE tickets SET status='VOID',voided_at=now(),void_reason='B8 test' WHERE id=$1", [row.id]);
    await db.query('UPDATE ticket_types SET archived_at=now() WHERE id=$1', [typeA.id]);
    const firstOrder = (await db.query('SELECT order_id FROM order_items WHERE id=(SELECT order_item_id FROM tickets WHERE id=$1)', [rows[0].id]))[0].order_id;
    await db.query('UPDATE orders SET buyer_name_snapshot=$1,buyer_email_snapshot=$2 WHERE id=$3', ['B8 100%_\\ literal', 'literal@example.test', firstOrder]);
    const roster = eventBase + '/attendees';
    const paged = roster + '?paginated=true';
    const all = await call('GET', paged);
    assert.deepEqual(all.pagination, { page: 0, pageSize: 5, total: 63, totalPages: 13 });
    assert.equal(all.data.length, 5);
    const ids = new Set();
    for (let page = 0; page < 13; page++) {
      const result = await call('GET', paged + '&page=' + page);
      assert.equal(result.pagination.total, 63);
      assert.equal(result.data.length, page === 12 ? 3 : 5);
      for (const row of result.data) { assert.ok(!ids.has(row.id)); ids.add(row.id); }
    }
    assert.equal(ids.size, 63);
    for (const [filter, total] of [
      ['&status=VALID', 40], ['&status=CHECKED_IN', 20],
      ['&ticketTypeId=' + typeA.id, 30], ['&ticketTypeId=' + typeB.id, 33],
      ['&status=VALID&ticketTypeId=' + typeA.id, 7],
      ['&status=CHECKED_IN&ticketTypeId=' + typeB.id, 0],
      ['&q=' + encodeURIComponent('100%_\\'), 10],
      ['&q=' + encodeURIComponent('literal@example.test'), 10],
      ['&q=' + encodeURIComponent('  B8 100%_\\ literal  ') + '&status=CHECKED_IN&ticketTypeId=' + typeA.id, 10],
      ['&q=NO_MATCH_B8', 0],
    ]) {
      const result = await call('GET', paged + filter);
      assert.equal(result.pagination.total, total, filter);
      assert.equal(result.pagination.totalPages, Math.ceil(total / 5));
    }
    const code = all.data[0].ticket_code;
    assert.equal((await call('GET', paged + '&q=' + encodeURIComponent(code))).pagination.total, 1);
    const beyond = await call('GET', paged + '&page=100');
    assert.equal(beyond.pagination.total, 63); assert.equal(beyond.data.length, 0);
    const emptyResult = await call('GET', `/organizer/events/${empty.id}/attendees?paginated=true`);
    assert.equal(emptyResult.pagination.totalPages, 0);
    const archived = (await call('GET', eventBase)).data.ticketTypes;
    assert.ok(archived.some(type => type.id === typeA.id && type.archived_at));
    for (const query of ['&page=-1', '&page=1.5', '&limit=0', '&limit=51', '&status=BOGUS', '&status=VOID',
      '&ticketTypeId=invalid', '&ticketTypeId=' + foreign.id, '&gateId=unknown', '&q=' + 'a'.repeat(201)]) {
      await call('GET', paged + query, undefined, 400);
    }
    await call('GET', roster + '?paginated=false', undefined, 400);
    await call('GET', paged, undefined, 401, null);
    await call('GET', paged, undefined, 403, other.accessToken);
    await call('GET', paged, undefined, 403, buyer.accessToken);
    await call('GET', paged, undefined, 200, admin.accessToken);
    await call('GET', '/organizer/events/not-uuid/attendees?paginated=true', undefined, 400);
    await call('GET', `/organizer/events/${randomUUID()}/attendees?paginated=true`, undefined, 404);
    const legacy = await call('GET', roster);
    assert.equal(legacy.data.length, 50); assert.equal(legacy.pagination, undefined);
    assert.equal((await call('GET', roster + '?page=1')).data.length, 13);
    // A concurrent change between COUNT and SELECT must not change the page's snapshot.
    const snapshotDb = require('../dist/platform/database').createDatabase(url, false);
    await snapshotDb.start();
    try {
      const store = snapshotDb.owner('order');
      const reader = require('../dist/modules/order/infrastructure/store').orderStore({
        async query(sql, args) {
          const result = await store.query(sql, args);
          if (sql.startsWith('SELECT count(*) AS total')) await db.query(
            'UPDATE orders SET buyer_name_snapshot=$1 WHERE id=$2', ['Concurrent rename', firstOrder]);
          return result;
        },
      });
      const snapshot = await snapshotDb.snapshot.run(() => reader.attendeePage(event.id,
        { page: 0, limit: 50, q: '100%_\\' }));
      assert.equal(snapshot.pagination.total, 10);
      assert.equal(snapshot.data.length, 10);
      assert.ok(snapshot.data.every(row => row.buyer_name_snapshot.includes('100%_\\')));
    } finally {
      await db.query('UPDATE orders SET buyer_name_snapshot=$1 WHERE id=$2', ['B8 100%_\\ literal', firstOrder]);
      await snapshotDb.close();
    }
    const output = process.env.B8_EVIDENCE_DIR;
    if (output) { await fs.mkdir(output, { recursive: true }); await fs.writeFile(path.join(output, 'api.json'), JSON.stringify({ result: 'PASS', tickets: 63, snapshotConsistency: 'PASS', evidence }, null, 2)); }
    console.log(JSON.stringify({ result: 'PASS', tickets: 63, snapshotConsistency: 'PASS', httpChecks: evidence.length }));
    if (serve) {
      const directory = path.resolve(__dirname, '../.local'); await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, 'b8-fixture.json'), JSON.stringify({ eventId: event.id, emptyEventId: empty.id, typeAId: typeA.id, typeBId: typeB.id, email: owner.user.email, password }));
      console.log('B8 isolated API ready on 8018; send input to stop.');
      await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); });
      process.stdin.pause();
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await app.close(); await db.destroy();
  }
}
if (process.argv.includes('--serve')) verify(true).catch(error => { console.error(error); process.exitCode = 1; });
else test('B8 attendee filters, snapshot pagination, ownership and legacy compatibility', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 120000,
}, () => verify());
