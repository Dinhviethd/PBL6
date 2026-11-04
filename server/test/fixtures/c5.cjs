const { DataSource } = require("typeorm");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { createApplication } = require("../../dist/app");

async function c5Fixture(url, port = 0, clientUrl = "http://localhost:5185") {
  const parsed = new URL(url);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) {
    throw Error("C5 requires an isolated loopback database ending in _test");
  }
  const db = new DataSource({ type: "postgres", url, ssl: false });
  await db.initialize();
  if ((await db.query("SELECT to_regclass('public.users') AS name"))[0].name) {
    await db.destroy();
    throw Error("C5 fixture requires a fresh empty database");
  }
  for (const name of [
    "InitialMvp1790812800000",
    "EventCheckinStaff1791072000000",
    "Notifications1791331200000",
    "WaitQueue1792627200000",
    "OrganizerApplicationProfile1793437200000",
  ]) {
    await new (require("../../dist/migrations/" + name)[name])().up(db);
  }
  for (const code of ["USER", "ADMIN", "ORGANIZER"]) {
    await db.query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2)', [randomUUID(), code]);
  }
  const password = "C5IsolatedFixture2026!";
  const hash = await bcrypt.hash(password, 4);
  const accounts = {};
  for (const [key, roles] of [
    ["admin", ["USER", "ADMIN"]],
    ["customer", ["USER"]],
    ["ownerA", ["USER", "ORGANIZER"]],
    ["ownerB", ["USER", "ORGANIZER"]],
    ["empty", ["USER"]],
  ]) {
    const id = randomUUID();
    const email = `${key.toLowerCase()}.${id.slice(0, 8)}@example.test`;
    await db.query('INSERT INTO users("idUser",name,email,password) VALUES($1,$2,$3,$4)', [id, `C5 ${key}`, email, hash]);
    for (const code of roles) {
      await db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2', [id, code]);
    }
    accounts[key] = { id, email, password };
  }
  const applications = {};
  for (const [key, status] of [["ownerA", "APPROVED"], ["ownerB", "REJECTED"], ["empty", "PENDING"]]) {
    const id = randomUUID();
    const name = `C5 ${key} Organization`;
    await db.query(
      `INSERT INTO organizer_applications(id,user_id,organization_name,contact_name,contact_email,
        contact_phone,description,business_name,tax_id_or_business_license,website_or_social,
        head_office_address,main_event_category,expected_event_scale,status,reviewed_by,reviewed_at,rejection_reason)
       VALUES($1,$2,$3,$3,$4,'0900000000','C5 isolated profile','C5 Test Company','TEST-C5',
        'https://example.test','Test address','Test category','Small',$5,$6,$7,$8)`,
      [id, accounts[key].id, name, accounts[key].email, status,
        status === "PENDING" ? null : accounts.admin.id,
        status === "PENDING" ? null : "2026-11-01T00:00:00Z",
        status === "REJECTED" ? "Test rejection" : null],
    );
    applications[key] = { id, name };
  }
  const categoryId = randomUUID();
  await db.query("INSERT INTO categories(id,name,slug) VALUES($1,'C5 Category','c5-category')", [categoryId]);
  const eventIds = { ownerA: [], ownerB: [] };
  for (const [owner, count] of [["ownerA", 23], ["ownerB", 3]]) {
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      // Same timestamp exercises the ID tiebreaker. Other-owner titles deliberately contain ownerA's UUID.
      const title = owner === "ownerB" ? `Decoy ${accounts.ownerA.id} ${i}` : `C5 Event ${String(i + 1).padStart(2, "0")}`;
      await db.query(
        `INSERT INTO events(id,organizer_id,category_id,slug,title,description,venue_name,address,city_code,
          starts_at,ends_at,checkin_opens_at,checkin_closes_at,status,created_at)
         VALUES($1,$2,$3,$4,$5,'C5 test event','Test Venue','Test Street','Test City',
          '2026-12-01T09:00:00Z','2026-12-01T12:00:00Z','2026-12-01T08:00:00Z',
          '2026-12-01T11:00:00Z',$6,'2026-11-01T00:00:00Z')`,
        [id, accounts[owner].id, categoryId, `c5-${id}`, title, i % 2 ? "DRAFT" : "PENDING_REVIEW"],
      );
      eventIds[owner].push(id);
    }
  }
  const application = createApplication({
    databaseUrl: url,
    databaseSsl: false,
    secret: "c5-test-secret-".repeat(4),
    qrSecret: "c5-test-qr-secret-".repeat(4),
    clientUrl,
  });
  await application.start();
  const server = application.app.listen(port, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const calls = [];
  async function call(method, path, body, token) {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    calls.push({ method, path, status: response.status, code: result.code ?? null });
    return { status: response.status, body: result, headers: response.headers };
  }
  async function login(key) {
    const result = await call("POST", "/auth/login", { email: accounts[key].email, password });
    if (result.status !== 200) throw Error(JSON.stringify(result.body));
    return result.body.data.accessToken;
  }
  return {
    db, accounts, applications, eventIds, categoryId, base, calls, call, login,
    async close() {
      await new Promise(resolve => server.close(resolve));
      await application.close();
      await db.destroy();
    },
  };
}
module.exports = { c5Fixture };
