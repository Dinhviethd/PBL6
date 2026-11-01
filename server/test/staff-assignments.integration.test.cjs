const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");

const url = process.env.TEST_DATABASE_URL;
test("A13 real HTTP: image, snapshot pagination, invitation decisions and access", {
  skip: !url, timeout: 180000,
}, async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
  assert.ok(new URL(url).pathname.endsWith("_test"));
  const migration = new DataSource({ type: "postgres", url, migrations: [
    require("../dist/migrations/InitialMvp1790812800000").InitialMvp1790812800000,
    require("../dist/migrations/EventCheckinStaff1791072000000").EventCheckinStaff1791072000000,
    require("../dist/migrations/Notifications1791331200000").Notifications1791331200000,
    require("../dist/migrations/WaitQueue1792627200000").WaitQueue1792627200000,
  ] });
  const fixture = createDatabase(url);
  const app = createApplication({ databaseUrl: url, secret: "a13-local-test".repeat(4),
    qrSecret: "a13-local-qr".repeat(4), clientUrl: "http://localhost:5183" });
  let server, coverServer;
  const evidence = [];
  try {
    await migration.initialize();
    await migration.runMigrations();
    await fixture.start();
    await app.start();
    // A real local static fixture, never a product asset or intercepted API response.
    coverServer = require("node:http").createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#7c3aed"/><circle cx="128" cy="128" r="70" fill="#22d3ee"/></svg>');
    }).listen(0, "127.0.0.1");
    await new Promise((resolve) => coverServer.on("listening", resolve));
    const imageUrl = `http://127.0.0.1:${coverServer.address().port}/cover.svg`;
    server = app.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const base = origin + "/api";
    const call = async (method, path, token, body, expected = 200) => {
      const response = await fetch(base + path, { method, headers: {
        "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await response.json();
      assert.equal(response.status, expected, JSON.stringify(json));
      evidence.push({ method, path, status: response.status });
      return json;
    };
    const password = "A13Fixture2026!";
    const account = async () => (await call("POST", "/auth/register", null, {
      name: "Nhân viên kiểm thử A13", email: `${randomUUID()}@example.test`,
      password, confirmPassword: password,
    })).data;
    const user = await account(), other = await account(), owner = await account();
    const db = fixture.owner("event");
    const categoryId = randomUUID();
    await db.query("INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)",
      [categoryId, "A13 fixture", categoryId]);
    const invitations = [];
    for (let i = 0; i < 51; i++) {
      const eventId = randomUUID(), invitationId = randomUUID();
      await db.query(`INSERT INTO events(id,organizer_id,category_id,slug,title,description,
        cover_image_url,venue_name,address,city_code,starts_at,ends_at,checkin_opens_at,
        checkin_closes_at,status,published_at)
        VALUES($1::uuid,$2,$3,$1::text,$4,'Fixture A13',$5,'Nhà văn hóa kiểm thử','Địa chỉ kiểm thử','DN',
        now()+interval '1 hour',now()+interval '1 day',now()-interval '1 hour',
        now()+interval '8 hours','PUBLISHED',now())`,
        [eventId, owner.user.idUser, categoryId, `Sự kiện kiểm thử A13 ${i + 1}`,
          i === 1 ? null : imageUrl]);
      invitations.push({ id: invitationId, eventId });
    }
    const seed = async (count, showcase = false) => {
      await db.query("DELETE FROM event_checkin_staff WHERE user_id=$1", [user.user.idUser]);
      for (let i = 0; i < count; i++) {
        const status = showcase ? ["PENDING", "ACTIVE", "PENDING", "DECLINED", "REVOKED"][i % 5] : "PENDING";
        await db.query(`INSERT INTO event_checkin_staff(id,event_id,user_id,invited_by,
          staff_name,staff_email,status,invited_at,expires_at)
          VALUES($1,$2,$3,$4,'Staff',$5,$6,'2026-11-01T08:00:00Z',
            CASE WHEN $7::boolean THEN now()-interval '1 hour' ELSE now()+interval '1 day' END)`,
          [invitations[i].id, invitations[i].eventId, user.user.idUser, owner.user.idUser,
            user.user.email, status, showcase && i === 2]);
      }
    };
    const list = "/me/checkin-assignments";
    for (const count of [0, 1, 50, 51]) {
      await seed(count);
      const ids = [];
      for (let page = 0; page <= Math.ceil(count / 50); page++) {
        const result = await call("GET", `${list}?page=${page}`, user.accessToken);
        assert.ok(Array.isArray(result.data), "legacy data remains an array");
        assert.deepEqual(result.pagination, { page, pageSize: 50, total: count, totalPages: Math.ceil(count / 50) });
        assert.equal(result.data.length, Math.min(50, Math.max(0, count - page * 50)));
        for (const item of result.data) {
          assert.equal(item.image_url, item.event_id === invitations[1].eventId ? null : imageUrl);
          assert.equal(item.total, undefined);
          ids.push(item.id);
        }
      }
      assert.equal(new Set(ids).size, count);
      assert.deepEqual(ids, [...ids].sort(), "stable invited_at/id order across pages");
    }
    assert.equal((await call("GET", list, other.accessToken)).pagination.total, 0);
    await call("GET", list, null, undefined, 401);
    for (const page of ["-1", "1.5", "10001", "bad"])
      await call("GET", `${list}?page=${page}`, user.accessToken, undefined, 400);
    const invitation = invitations[0];
    const respond = `/me/checkin-invitations/${invitation.id}/respond`;
    await call("POST", respond, other.accessToken, { accept: true }, 404);
    await call("POST", respond, user.accessToken, { accept: "true" }, 400);
    await call("POST", respond, null, { accept: true }, 401);
    await call("GET", `/checkin/events/${invitation.eventId}`, user.accessToken, undefined, 403);
    assert.equal((await call("POST", respond, user.accessToken, { accept: false })).data.status, "DECLINED");
    await call("POST", respond, user.accessToken, { accept: true }, 409);
    await seed(1);
    assert.equal((await call("POST", respond, user.accessToken, { accept: true })).data.status, "ACTIVE");
    assert.equal((await call("GET", `/checkin/events/${invitation.eventId}`, user.accessToken)).data.id, invitation.eventId);
    await app.events.revokeCheckinStaff(invitation.eventId, invitation.id);
    await call("GET", `/checkin/events/${invitation.eventId}`, user.accessToken, undefined, 403);
    await seed(1);
    await db.query("UPDATE event_checkin_staff SET expires_at=now()-interval '1 second' WHERE id=$1", [invitation.id]);
    await call("POST", respond, user.accessToken, { accept: true }, 409);
    await seed(1);
    await db.query("UPDATE events SET ends_at=now()-interval '1 second',starts_at=now()-interval '3 hours',checkin_closes_at=now()-interval '1 minute' WHERE id=$1", [invitation.eventId]);
    await call("POST", respond, user.accessToken, { accept: true }, 409);
    await db.query("UPDATE events SET starts_at=now()+interval '1 hour',ends_at=now()+interval '1 day',checkin_closes_at=now()+interval '8 hours' WHERE id=$1", [invitation.eventId]);
    await call("POST", `/me/checkin-invitations/${randomUUID()}/respond`, user.accessToken, { accept: true }, 404);
    await call("POST", "/me/checkin-invitations/invalid/respond", user.accessToken, { accept: true }, 400);
    console.log(`A13 HTTP PASS: ${evidence.length} requests; image/null, 0/1/50/51, legacy array, ownership, accept/decline/expired/closed/revoked.`);
    if (process.env.A13_UI === "1") {
      await seed(51, true);
      await require("./helpers/a13-browser.cjs")({ base, user, other, password, seed, call, invitations, db });
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (coverServer) await new Promise((resolve) => coverServer.close(resolve));
    await app.close().catch(() => {});
    await fixture.close().catch(() => {});
    if (migration.isInitialized) await migration.destroy();
  }
});
