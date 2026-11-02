const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DataSource } = require('typeorm');
const fs = require('node:fs/promises');
const path = require('node:path');

async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(new URL(url).pathname.endsWith('_test'), 'Disposable test database required');
  const db = new DataSource({ type: 'postgres', url, ssl: false, migrations: [
    'InitialMvp1790812800000', 'EventCheckinStaff1791072000000', 'Notifications1791331200000', 'WaitQueue1792627200000',
  ].map(name => require('../dist/migrations/' + name)[name]) });
  await db.initialize(); await db.runMigrations();
  const { createApplication } = require('../dist/app');
  const app = createApplication({ databaseUrl: url, databaseSsl: false, secret: 'b3-isolated-secret'.repeat(4), qrSecret: 'b3-isolated-qr'.repeat(4), demo: true, clientUrl: 'http://localhost:5178' });
  let server;
  try {
    await app.start();
    for (const role of ['USER', 'ADMIN', 'ORGANIZER']) await db.query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING', [randomUUID(), role]);
    const password = 'B3Disposable2026!';
    async function account(role) {
      const result = await app.auth.register({ name: 'B3 test ' + role, email: randomUUID() + '@example.test', password });
      if (role !== 'USER') await db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [result.user.idUser, role]);
      return result;
    }
    const owner = await account('ORGANIZER'), other = await account('ORGANIZER'), admin = await account('ADMIN'), buyer = await account('USER');
    const categoryId = randomUUID();
    await db.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)', [categoryId, 'B3 Music', 'b3-' + randomUUID()]);
    server = app.app.listen(serve ? 8013 : 0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}/api`;
    const evidence = [];
    async function call(method, route, body, status = 200, token = owner.accessToken) {
      const res = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID(), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await res.json();
      assert.equal(res.status, status, `${method} ${route}: ${JSON.stringify(json)}`);
      evidence.push({ method, route, status, code: json.code });
      return json.data ?? json;
    }
    const at = hours => new Date(Date.now() + hours * 3600000).toISOString();
    const body = { title: '[TEST B3] Event', categoryId, description: 'First line\nSecond line', venueName: 'Test venue', address: '123 Test Street', cityCode: 'Da Nang', startsAt: at(48), endsAt: at(52), checkinOpensAt: at(47), checkinClosesAt: at(51), coverImageUrl: 'https://example.test/banner.webp' };
    const e = await call('POST', '/organizer/events', body);
    const base = '/organizer/events/' + e.id;
    await call('GET', base);
    await call('GET', base, undefined, 403, other.accessToken);
    await call('PATCH', base, body, 403, other.accessToken);
    await call('GET', base, undefined, 401, null);
    await call('POST', base + '/submit', {}, 400);
    const typeBody = { name: 'GA', price: '100000', capacity: 100, saleStartsAt: at(-1), saleEndsAt: at(46) };
    const type = await call('POST', base + '/ticket-types', typeBody);
    assert.equal((await call('POST', base + '/submit', {})).status, 'PENDING_REVIEW');
    await call('PATCH', base, body, 409);
    await call('PATCH', base + '/ticket-types/' + type.id, typeBody, 409);
    await call('POST', '/admin/events/' + e.id + '/review', { approve: false, reason: 'Please update details' }, 200, admin.accessToken);
    const rejected = await call('GET', base);
    assert.equal(rejected.status, 'REJECTED'); assert.equal(rejected.reviews[0].reason, 'Please update details');
    const saved = await call('PATCH', base, { ...body, title: '[TEST B3] Updated' });
    assert.equal(saved.slug, e.slug); assert.equal(saved.status, 'DRAFT'); assert.equal(saved.cover_image_url, body.coverImageUrl);
    await call('POST', base + '/submit', {});
    await call('POST', '/admin/events/' + e.id + '/review', { approve: true }, 200, admin.accessToken);
    assert.equal((await call('GET', base)).status, 'PUBLISHED');
    await call('POST', base + '/pause', { paused: true });
    assert.equal((await call('GET', base)).sales_paused, true);
    await call('POST', base + '/pause', { paused: false });
    const order = await call('POST', '/orders', { eventId: e.id, items: [{ ticketTypeId: type.id, quantity: 1 }], idempotencyKey: randomUUID() }, 200, buyer.accessToken);
    await call('PATCH', base, body, 409);
    // Local demo simulator only, never contacts a real payment provider.
    const payment = await call('POST', `/orders/${order.id}/payments`, {}, 200, buyer.accessToken);
    await call('POST', `/payments/${payment.id}/demo`, { success: true }, 200, buyer.accessToken);
    await call('PATCH', base, { ...body, address: 'Changed address' }, 409);
    assert.equal((await call('PATCH', base, { ...body, title: '[TEST B3] Paid text edit' })).status, 'DRAFT');
    await call('POST', base + '/cancel', { reason: 'test' }, 409);
    const cancel = await call('POST', '/organizer/events', body);
    await call('POST', `/organizer/events/${cancel.id}/cancel`, { reason: 'No longer needed' });
    await call('PATCH', `/organizer/events/${cancel.id}`, body, 409);
    await db.query("UPDATE events SET status='ARCHIVED',archived_at=now(),cancelled_at=NULL,cancellation_reason=NULL WHERE id=$1", [cancel.id]);
    await call('PATCH', `/organizer/events/${cancel.id}`, body, 409);
    const fixtureEvent = await call('POST', '/organizer/events', { ...body, title: '[TEST B3 UI] Edit event' });
    await call('POST', `/organizer/events/${fixtureEvent.id}/ticket-types`, typeBody);
    console.log(JSON.stringify({ result: 'PASS', assertions: evidence.length, evidence }));
    if (serve) {
      const directory = path.resolve(__dirname, '../.local'); await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, 'b3-fixture.json'), JSON.stringify({ eventId: fixtureEvent.id, categoryId, email: owner.user.email, password, ownerId: owner.user.idUser, evidence }));
      console.log('B3 isolated API ready on 8013; send input to stop.');
      await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); }); process.stdin.pause();
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await app.close(); await db.destroy();
  }
}
if (process.argv.includes('--serve')) verify(true).catch(error => { console.error(error); process.exitCode = 1; });
else test('B3 editing, review, published save, ownership and order restrictions', { skip: !process.env.TEST_DATABASE_URL, timeout: 90000 }, () => verify());
