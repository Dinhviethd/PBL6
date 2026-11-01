const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");

const url = process.env.TEST_DATABASE_URL;

test("A12 isolated HTTP: ten-item pages, counts, filters, ownership and read mutations", {
  skip: !url, timeout: 180000,
}, async () => {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
  assert.ok(new URL(url).pathname.endsWith("_test"));
  const migration = new DataSource({ type: "postgres", url, migrations: [
    require("../dist/migrations/InitialMvp1790812800000").InitialMvp1790812800000,
    require("../dist/migrations/EventCheckinStaff1791072000000").EventCheckinStaff1791072000000,
    require("../dist/migrations/Notifications1791331200000").Notifications1791331200000,
    require("../dist/migrations/WaitQueue1792627200000").WaitQueue1792627200000,
  ] });
  const fixture = createDatabase(url);
  const app = createApplication({ databaseUrl: url, secret: "a12-test-secret".repeat(4),
    qrSecret: "a12-test-qr".repeat(4), clientUrl: "http://localhost:5182" });
  let server;
  const evidence = [];
  try {
    await migration.initialize();
    await migration.runMigrations();
    await fixture.start();
    await app.start();
    server = app.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, path, token, body, expected = 200) => {
      const r = await fetch(base + path, { method, headers: {
        "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await r.json();
      assert.equal(r.status, expected, JSON.stringify(json));
      evidence.push({ method, path, status: r.status });
      return json.data;
    };
    const password = "A12Fixture2026!";
    const account = async () => call("POST", "/auth/register", null, {
      name: "A12 Test", email: `${randomUUID()}@example.test`, password, confirmPassword: password,
    });
    const user = await account(), other = await account();
    const t = user.accessToken, inbox = "/me/notifications";
    const principal = await app.auth.resolve(t);
    const notificationDb = fixture.owner("notification");
    const kinds = ["ORDER_PAID", "STAFF_INVITED", "EVENT_UPDATED", "EVENT_REMINDER", "WAIT_QUEUE_OFFER"];
    const targets = ["ORDER", "STAFF", "TICKETS", "TICKETS", "ORDER"];
    const seed = async (count) => {
      await notificationDb.query("DELETE FROM notifications WHERE user_id=$1", [principal.userId]);
      for (let i = 0; i < count; i++) {
        await app.notifications.send({ userId: principal.userId, kind: kinds[i % 5],
          title: `A12 thông báo kiểm thử ${i + 1}`, message: "Thông báo từ backend kiểm thử cô lập.",
          target: targets[i % 5], targetId: randomUUID(), dedupeKey: randomUUID() });
      }
      // Same timestamp proves the id tie-breaker keeps page boundaries stable.
      await notificationDb.query("UPDATE notifications SET created_at=$2 WHERE user_id=$1",
        [principal.userId, "2026-11-01T08:00:00Z"]);
    };
    for (const count of [0, 1, 10, 11, 20, 21]) {
      await seed(count);
      const ids = [];
      for (let page = 0; page <= Math.ceil(count / 10); page++) {
        const data = await call("GET", `${inbox}?page=${page}&unread=false`, t);
        assert.deepEqual(data.pagination, { page, pageSize: 10, total: count, totalPages: Math.ceil(count / 10) });
        assert.equal(data.items.length, Math.min(10, Math.max(0, count - page * 10)));
        assert.equal(data.unreadCount, count);
        assert.equal(data.hasNext, (page + 1) * 10 < count);
        for (const item of data.items) {
          assert.deepEqual(Object.keys(item).sort(), ["id", "kind", "title", "message", "target", "target_id", "created_at", "read_at"].sort());
          ids.push(item.id);
        }
      }
      assert.equal(new Set(ids).size, count);
      assert.deepEqual(ids, [...ids].sort().reverse());
    }
    const last = await call("GET", `${inbox}?page=2&unread=true`, t);
    const item = last.items[0];
    await call("POST", `${inbox}/${item.id}/read`, other.accessToken, undefined, 404);
    await call("POST", `${inbox}/${item.id}/read`, t);
    const readAt = (await call("GET", `${inbox}?page=2`, t)).items[0].read_at;
    assert.ok(readAt);
    await call("POST", `${inbox}/${item.id}/read`, t);
    assert.equal((await call("GET", `${inbox}?page=2`, t)).items[0].read_at, readAt);
    const filtered = await call("GET", `${inbox}?page=2&unread=true`, t);
    assert.equal(filtered.items.length, 0);
    assert.equal(filtered.pagination.total, 20);
    assert.equal(filtered.pagination.totalPages, 2);
    assert.equal(filtered.unreadCount, 20);
    assert.deepEqual(await call("GET", `${inbox}/count`, t), { unreadCount: 20 });
    await call("POST", `${inbox}/read-all`, other.accessToken);
    assert.equal((await call("GET", `${inbox}/count`, t)).unreadCount, 20);
    await call("POST", `${inbox}/read-all`, t);
    assert.equal((await call("GET", `${inbox}?unread=true`, t)).pagination.total, 0);
    assert.equal((await call("GET", inbox, t)).pagination.total, 21);
    assert.equal((await call("GET", inbox, other.accessToken)).pagination.total, 0);
    for (const path of [inbox, `${inbox}/count`]) await call("GET", path, null, undefined, 401);
    for (const path of [`${inbox}/read-all`, `${inbox}/${item.id}/read`]) await call("POST", path, null, undefined, 401);
    for (const query of ["page=-1", "page=1.5", "page=10001", "unread=1"])
      await call("GET", `${inbox}?${query}`, t, undefined, 400);
    await call("POST", `${inbox}/invalid/read`, t, undefined, 400);
    await call("POST", `${inbox}/${randomUUID()}/read`, t, undefined, 404);
    console.log(`A12 HTTP PASS: ${evidence.length} requests; PostgreSQL isolated; 0/1/10/11/20/21 boundaries.`);
    if (process.env.A12_UI === "1") {
      await seed(21);
      await require("./helpers/a12-browser.cjs")({ base, user, other, password, seed, call });
    }
    if (process.env.A12_EVIDENCE_FILE)
      require("node:fs").writeFileSync(process.env.A12_EVIDENCE_FILE, JSON.stringify(evidence, null, 2));
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await app.close().catch(() => {});
    await fixture.close().catch(() => {});
    if (migration.isInitialized) await migration.destroy();
  }
});
