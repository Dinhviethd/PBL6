const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { DataSource } = require('typeorm');

async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(new URL(url).pathname.endsWith('_test'), 'Disposable test database required');
  const db = new DataSource({ type: 'postgres', url, migrations: [
    require('../dist/migrations/InitialMvp1790812800000').InitialMvp1790812800000,
    require('../dist/migrations/EventCheckinStaff1791072000000').EventCheckinStaff1791072000000,
    require('../dist/migrations/Notifications1791331200000').Notifications1791331200000,
    require('../dist/migrations/WaitQueue1792627200000').WaitQueue1792627200000,
  ] });
  await db.initialize(); await db.runMigrations();
  const { createApplication } = require('../dist/app');
  const app = createApplication({ databaseUrl: url, secret: 'b5-isolated-test-secret'.repeat(4), qrSecret: 'b5-test-qr'.repeat(4), clientUrl: 'http://localhost:5176' });
  let server;
  try {
    await app.start();
    for (const role of ['USER', 'ADMIN', 'ORGANIZER']) await db.query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING', [randomUUID(), role]);
    const password = process.env.B5_TEST_PASSWORD;
    assert.ok(password, 'B5_TEST_PASSWORD required');
    const owner = await app.auth.register({ name: 'BTC kiểm thử B5', email: 'organizer@example.test', password });
    const other = await app.auth.register({ name: 'Other organizer', email: 'b5-other@example.test', password });
    const user = await app.auth.register({ name: 'Customer', email: 'b5-user@example.test', password });
    for (const a of [owner, other]) await db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [a.user.idUser, 'ORGANIZER']);
    const categoryId = randomUUID();
    await db.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)', [categoryId, 'Âm nhạc', 'b5-music']);
    server = app.app.listen(serve ? 8015 : 0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}/api`;
    const evidence = [];
    async function call(method, route, body, status = 200, token = owner.accessToken) {
      const r = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const j = await r.json();
      assert.equal(r.status, status, JSON.stringify({ route, body: j }));
      evidence.push({ method, route, status: r.status, code: j.code });
      return j.data ?? j;
    }
    const auth = await call('POST', '/auth/login', { email: 'organizer@example.test', password }, 200, null);
    owner.accessToken = auth.accessToken;
    assert.ok((await call('GET', '/auth/me')).roles.includes('ORGANIZER'));
    const at = h => new Date(Date.now() + (24 * 30 + h) * 3600000).toISOString();
    const eventBody = { categoryId, title: '[TEST B5] API lifecycle', description: 'Music event', venueName: 'Test venue', address: '123 Test Street', cityCode: 'DA_NANG', startsAt: at(0), endsAt: at(5), checkinOpensAt: at(-1), checkinClosesAt: at(4) };
    const e = await call('POST', '/organizer/events', eventBody);
    const base = `/organizer/events/${e.id}`;
    assert.equal(e.status, 'DRAFT');
    assert.equal((await call('GET', base)).ticketTypes.length, 0);
    assert.equal((await call('POST', base + '/submit', {}, 400)).code, 'MISSING_TICKETS');
    const body = { name: 'Standard', description: 'Test tier', price: '250000', capacity: 100, saleStartsAt: at(-24), saleEndsAt: at(4) };
    const t = await call('POST', base + '/ticket-types', body);
    assert.equal((await call('GET', base)).ticketTypes[0].id, t.id);
    for (const invalid of [{ name: ' ' }, { price: '0' }, { price: '1.5' }, { capacity: 0 }, { capacity: 1000001 }, { saleEndsAt: body.saleStartsAt }]) await call('POST', base + '/ticket-types', { ...body, ...invalid }, 400);
    assert.equal((await call('POST', base + '/ticket-types', { ...body, saleEndsAt: at(6) }, 400)).code, 'INVALID_DATES');
    const edited = await call('PATCH', base + '/ticket-types/' + t.id, { ...body, name: 'Updated', capacity: 120 });
    assert.equal(edited.capacity, 120);
    await call('PATCH', base + '/ticket-types/' + t.id, { name: 'Incomplete' }, 400);
    for (const token of [other.accessToken, user.accessToken]) {
      await call('GET', base, undefined, 403, token);
      await call('POST', base + '/ticket-types', body, 403, token);
      await call('PATCH', base + '/ticket-types/' + t.id, body, 403, token);
      await call('DELETE', base + '/ticket-types/' + t.id, undefined, 403, token);
      await call('POST', base + '/submit', {}, 403, token);
    }
    await call('GET', base, undefined, 401, null);
    const second = await call('POST', '/organizer/events', { ...eventBody, title: '[TEST B5] Other event' });
    await call('PATCH', `/organizer/events/${second.id}/ticket-types/${t.id}`, body, 404);
    await call('DELETE', `/organizer/events/${second.id}/ticket-types/${t.id}`, undefined, 409);
    await call('DELETE', base + '/ticket-types/' + t.id);
    assert.ok((await call('GET', base)).ticketTypes[0].archived_at);
    await call('POST', base + '/submit', {}, 400);
    const active = await call('POST', base + '/ticket-types', body);
    await db.query('UPDATE ticket_types SET sold_quantity=2,reserved_quantity=3 WHERE id=$1', [active.id]);
    await call('PATCH', base + '/ticket-types/' + active.id, { ...body, capacity: 4 }, 409);
    await call('DELETE', base + '/ticket-types/' + active.id, undefined, 409);
    await db.query('UPDATE ticket_types SET sold_quantity=0,reserved_quantity=0 WHERE id=$1', [active.id]);
    assert.equal((await call('POST', base + '/submit', {})).status, 'PENDING_REVIEW');
    for (const method of ['POST', 'PATCH', 'DELETE']) await call(method, base + '/ticket-types' + (method === 'POST' ? '' : '/' + active.id), method === 'DELETE' ? undefined : body, 409);
    assert.equal((await call('GET', base)).status, 'PENDING_REVIEW');
    console.log(JSON.stringify({ result: 'PASS', eventId: e.id, categoryId, assertions: evidence.length, evidence }));
    if (serve) {
      console.log('B5 isolated API ready on 8015; send q on stdin to stop cleanly.');
      await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); });
      process.stdin.pause();
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await app.close(); await db.destroy();
  }
}
if (process.argv.includes('--serve')) verify(true).catch(e => { console.error(e); process.exitCode = 1; });
else test('B5 ticket lifecycle, ownership, validation and submission', { skip: !process.env.TEST_DATABASE_URL, timeout: 90000 }, () => verify());
