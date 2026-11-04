const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { c5Fixture } = require("./fixtures/c5.cjs");

test("C5 HTTP detail DTO, roles and exact organizer pagination resist UUID title collisions", {
  skip: !process.env.C5_TEST_DATABASE_URL,
}, async t => {
  const f = await c5Fixture(process.env.C5_TEST_DATABASE_URL);
  t.after(() => f.close());
  const admin = await f.login("admin");
  const customer = await f.login("customer");
  const organizer = await f.login("ownerA");
  const detailPath = `/admin/organizer-applications/${f.applications.ownerA.id}`;
  const listPath = `/admin/events?organizerId=${f.accounts.ownerA.id}`;
  const get = async path => {
    const r = await f.call("GET", path, undefined, admin);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.headers.get("cache-control"), "no-store");
    return r.body.data;
  };
  for (const path of [detailPath, listPath]) {
    assert.equal((await f.call("GET", path)).status, 401);
    for (const token of [customer, organizer]) {
      assert.equal((await f.call("GET", path, undefined, token)).status, 403);
    }
  }
  for (const key of ["ownerA", "ownerB", "empty"]) {
    const detail = await get(`/admin/organizer-applications/${f.applications[key].id}`);
    assert.equal(detail.id, f.applications[key].id);
    assert.equal(detail.user_id, f.accounts[key].id);
    assert.equal(detail.organization_name, f.applications[key].name);
    assert.equal(detail.logo_url, null);
    assert.doesNotMatch(JSON.stringify(detail), /password|pending_legal_changes|reviewed_by|accessToken/);
  }
  for (const path of [
    "/admin/organizer-applications/not-a-uuid",
    `${detailPath}?ownerId=${f.accounts.ownerB.id}`,
    "/admin/events?organizerId=not-a-uuid",
    `${listPath}&page=-1`, `${listPath}&limit=101`, `${listPath}&limit=0`,
  ]) assert.equal((await f.call("GET", path, undefined, admin)).status, 400, path);
  assert.equal((await f.call("GET", `/admin/organizer-applications/${randomUUID()}`, undefined, admin)).status, 404);
  // A user UUID must never accidentally be accepted as an application ID.
  assert.equal((await f.call("GET", `/admin/organizer-applications/${f.accounts.ownerA.id}`, undefined, admin)).status, 404);
  const all = [];
  for (let page = 0; page < 3; page++) {
    const result = await get(`${listPath}&page=${page}&limit=10`);
    assert.deepEqual(result.pagination, { page, limit: 10, total: 23, totalPages: 3 });
    assert.equal(result.items.length, page === 2 ? 3 : 10);
    assert.ok(result.items.every(e => e.organizer_id === f.accounts.ownerA.id));
    all.push(...result.items.map(e => e.id));
  }
  assert.equal(new Set(all).size, 23);
  assert.deepEqual(all, [...f.eventIds.ownerA].sort());
  assert.deepEqual((await get(`${listPath}&limit=100`)).items.map(e => e.id), all);
  const outside = await get(`${listPath}&page=100&limit=10`);
  assert.equal(outside.items.length, 0);
  assert.equal(outside.pagination.total, 23);
  for (const owner of [f.accounts.empty.id, randomUUID()]) {
    const empty = await get(`/admin/events?organizerId=${owner}`);
    assert.deepEqual(empty.items, []);
    assert.equal(empty.pagination.totalPages, 0);
    assert.equal(empty.pagination.total, 0);
  }
  const b = await get(`/admin/events?organizerId=${f.accounts.ownerB.id}`);
  assert.equal(b.pagination.total, 3);
  assert.ok(b.items.every(e => e.organizer_id === f.accounts.ownerB.id));
  // q used alone matches both actual ownership and decoy titles; exact filter must remain an AND.
  const q = await get(`/admin/events?q=${f.accounts.ownerA.id}&limit=100`);
  assert.equal(q.pagination.total, 26);
  const exactQ = await get(`${listPath}&q=${f.accounts.ownerA.id}&limit=100`);
  assert.equal(exactQ.pagination.total, 23);
  const filtered = await get(`${listPath}&status=DRAFT&categoryId=${f.categoryId}&limit=100`);
  assert.equal(filtered.pagination.total, 11);
  const global = await get("/admin/events?limit=100");
  assert.equal(global.pagination.total, 26);
  const kpis = await f.call("GET", `/admin/events/kpis?organizerId=${f.accounts.ownerA.id}`, undefined, admin);
  assert.equal(kpis.status, 200);
  assert.equal(Number(kpis.body.data.total), 23);
  if (process.env.C5_API_EVIDENCE) {
    require("node:fs").writeFileSync(process.env.C5_API_EVIDENCE, JSON.stringify({ environment: "isolated loopback test database", calls: f.calls, verified: { ownerAEvents: 23, ownerBEvents: 3, pages: [10, 10, 3], collisionSearchTotal: 26 } }, null, 2));
  }
});
