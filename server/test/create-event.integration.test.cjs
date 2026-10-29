const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { DataSource } = require("typeorm");
const sharp = require("sharp");

// Uses only an explicitly selected disposable test database and local upload directory.
async function verify(serve = false) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(new URL(url).pathname.endsWith("_test"));
  const root = path.resolve(__dirname, "../.local");
  await fs.mkdir(root, { recursive: true });
  const uploads = await fs.mkdtemp(path.join(root, "b4-media-test-"));
  process.env.UPLOAD_DIR = uploads;
  process.env.NODE_ENV = "test";
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"])
    delete process.env[key];
  const { createApplication } = require("../dist/app");
  const migration = new DataSource({
    type: "postgres", url,
    migrations: [
      require("../dist/migrations/InitialMvp1790812800000").InitialMvp1790812800000,
      require("../dist/migrations/EventCheckinStaff1791072000000").EventCheckinStaff1791072000000,
      require("../dist/migrations/Notifications1791331200000").Notifications1791331200000,
      require("../dist/migrations/WaitQueue1792627200000").WaitQueue1792627200000,
    ],
  });
  await migration.initialize();
  await migration.runMigrations();
  const app = createApplication({ databaseUrl: url, secret: "b4-test-secret".repeat(4),
    qrSecret: "b4-test-qr".repeat(4), clientUrl: "http://localhost:5176" });
  let server;
  const cleanup = async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await app.close();
    await migration.destroy();
    for (const file of await fs.readdir(uploads)) await fs.unlink(path.join(uploads, file));
    await fs.rmdir(uploads);
  };
  let keepServing = false;
  try {
    await app.start();
    for (const role of ["USER", "ADMIN", "ORGANIZER"])
      await migration.query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING', [randomUUID(), role]);
    const organizerEmail = serve ? "organizer@example.test" : `${randomUUID()}@example.test`;
    const password = serve ? "LocalDemo2026!" : "B4Fixture2026!";
    async function account(role, email = `${randomUUID()}@example.test`) {
      const a = await app.auth.register({ name: "Ban tổ chức kiểm thử", email, password });
      if (role !== "USER") await migration.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [a.user.idUser, role]);
      return a;
    }
    const owner = await account("ORGANIZER", organizerEmail);
    const other = await account("ORGANIZER");
    const user = await account("USER");
    const categoryId = randomUUID();
    await migration.query("INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)", [categoryId, "Âm nhạc", `b4-${randomUUID()}`]);
    server = app.app.listen(serve ? 8014 : 0, "127.0.0.1");
    await new Promise((resolve) => server.on("listening", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const evidence = [];
    async function call(method, route, body, token = owner.accessToken, status = 200) {
      const response = await fetch(origin + "/api" + route, { method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json();
      assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`);
      evidence.push({ method, route, status: response.status, code: result.code });
      return result.data ?? result;
    }
    await call("POST", "/auth/login", { email: organizerEmail, password }, null);
    assert.ok((await call("GET", "/auth/me")).roles.includes("ORGANIZER"));
    assert.ok((await call("GET", "/categories")).some((c) => c.id === categoryId));
    const baseTime = Date.now() + 7 * 86400000;
    const at = (hours) => new Date(baseTime + hours * 3600000).toISOString();
    const payload = { categoryId, title: "[TEST B4] Đêm nhạc mùa thu", description: "Dòng thứ nhất\nDòng thứ hai",
      venueName: "Trung tâm sự kiện", address: "123 Đường Kiểm Thử, Đà Nẵng", cityCode: "DA_NANG",
      startsAt: at(1), endsAt: at(5), checkinOpensAt: at(0), checkinClosesAt: at(4) };
    const created = await call("POST", "/organizer/events", payload);
    assert.equal(created.status, "DRAFT");
    assert.equal(created.organizer_id, owner.user.idUser);
    assert.match(created.slug, /^[a-z0-9-]+$/);
    const detail = await call("GET", `/organizer/events/${created.id}`);
    assert.equal(detail.description, payload.description);
    assert.equal(detail.ticketTypes.length, 0);
    assert.equal(Date.parse(detail.starts_at), Date.parse(payload.startsAt));
    const next = { ...payload, title: "[TEST B4] Tên sự kiện đã đổi", description: "Nội dung được cập nhật\nVẫn giữ xuống dòng" };
    const saved = await call("PATCH", `/organizer/events/${created.id}`, next);
    assert.equal(saved.id, created.id);
    assert.equal(saved.slug, created.slug);
    assert.equal(saved.status, "DRAFT");
    assert.equal((await call("GET", `/organizer/events/${created.id}`)).description, next.description);
    await call("GET", `/organizer/events/${created.id}`, undefined, other.accessToken, 403);
    await call("PATCH", `/organizer/events/${created.id}`, next, other.accessToken, 403);
    await call("GET", `/organizer/events/${created.id}`, undefined, null, 401);
    await call("POST", "/organizer/events", payload, user.accessToken, 403);
    await call("POST", "/organizer/events", { title: "Incomplete" }, owner.accessToken, 400);
    await call("PATCH", `/organizer/events/${created.id}`, { title: "Incomplete" }, owner.accessToken, 400);
    await call("POST", "/organizer/events", { ...payload, endsAt: payload.startsAt }, owner.accessToken, 400);
    await call("POST", "/organizer/events", { ...payload, categoryId: randomUUID() }, owner.accessToken, 400);
    const rejected = await call("POST", `/organizer/events/${created.id}/submit`, {}, owner.accessToken, 400);
    assert.equal(rejected.code, "MISSING_TICKETS");
    assert.equal((await call("GET", `/organizer/events/${created.id}`)).title, next.title);
    const image = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "#7c3aed" } }).png().toBuffer();
    async function upload(bytes, expected, mime = "image/png") {
      const body = new FormData();
      body.append("image", new Blob([bytes], { type: mime }), "b4-test.png");
      const response = await fetch(origin + "/api/media", { method: "POST", headers: { Authorization: `Bearer ${owner.accessToken}` }, body });
      const result = await response.json();
      assert.equal(response.status, expected, JSON.stringify(result));
      evidence.push({ method: "POST", route: "/media", bytes: bytes.length, status: response.status, code: result.code });
      return result;
    }
    const media = (await upload(image, 200)).data;
    const downloaded = await fetch(origin + media.url);
    assert.equal(downloaded.status, 200);
    const metadata = await sharp(Buffer.from(await downloaded.arrayBuffer())).metadata();
    assert.equal(metadata.width, 1600);
    assert.equal(metadata.format, "webp");
    await upload(Buffer.concat([image, Buffer.alloc(5 * 1024 * 1024)]), 413);
    await upload(Buffer.from("not an image"), 400);
    await call("PATCH", `/organizer/events/${created.id}`, { ...next, coverImageUrl: media.url });
    assert.equal((await call("GET", `/organizer/events/${created.id}`)).cover_image_url, media.url);
    const rows = await call("GET", "/organizer/events");
    assert.equal(rows.length, 1);
    // A stale runtime with mandatory slug must fail the valid create test above.
    console.log(JSON.stringify({ result: "PASS", origin, eventId: created.id, slug: created.slug,
      categoryId, imageWidth: metadata.width, cases: evidence }, null, 2));
    if (serve) {
      await fs.writeFile(path.join(root, "b4-api-evidence.json"), JSON.stringify({ result: "PASS", eventId: created.id, evidence }, null, 2));
      process.once("SIGINT", () => void cleanup().then(() => process.exit(0)));
      process.once("SIGTERM", () => void cleanup().then(() => process.exit(0)));
      console.log("B4 isolated API ready on 8014; terminate to remove test uploads.");
      keepServing = true;
      return;
    }
  } finally {
    if (!keepServing) await cleanup();
  }
}

if (process.argv.includes("--serve")) {
  verify(true).catch((error) => { console.error(error); process.exitCode = 1; });
} else {
  test("B4 valid event lifecycle, owner isolation, media and no-ticket submit", { skip: !process.env.TEST_DATABASE_URL, timeout: 90000 }, () => verify());
}
