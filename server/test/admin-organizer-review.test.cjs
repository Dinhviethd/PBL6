const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { c5Fixture } = require("./fixtures/c5.cjs");

test("C6 real HTTP detail, approve/reject, authorization, concurrent decisions and audit rollback", {
  skip: !process.env.C6_TEST_DATABASE_URL,
}, async t => {
  const f = await c5Fixture(process.env.C6_TEST_DATABASE_URL);
  t.after(() => f.close());
  const admin = await f.login("admin");
  const user = await f.login("customer");
  const organizer = await f.login("ownerA");
  const pending = f.applications.empty.id;
  const detailPath = id => `/admin/organizer-applications/${id}`;
  const reviewPath = id => `${detailPath(id)}/review`;
  const read = async id => {
    const r = await f.call("GET", detailPath(id), undefined, admin);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data;
  };
  for (const key of ["ownerA", "ownerB", "empty"]) {
    const d = await read(f.applications[key].id);
    assert.equal(d.main_event_category, "Test category");
    assert.equal(d.expected_event_scale, "Small");
    assert.doesNotMatch(JSON.stringify(d), /password|pending_legal_changes|reviewed_by/);
  }
  for (const [method, path, body] of [
    ["GET", detailPath(pending), undefined],
    ["POST", reviewPath(pending), { approve: true }],
  ]) {
    assert.equal((await f.call(method, path, body)).status, 401);
    for (const token of [user, organizer]) {
      assert.equal((await f.call(method, path, body, token)).status, 403);
    }
  }
  for (const body of [{ approve: false, reason: "  " }, { approve: false, reason: "x".repeat(2001) }, { approve: "true" }]) {
    assert.equal((await f.call("POST", reviewPath(pending), body, admin)).status, 400);
  }
  assert.equal((await read(pending)).status, "PENDING");
  assert.equal((await f.call("POST", reviewPath(randomUUID()), { approve: true }, admin)).status, 404);
  assert.equal((await f.call("POST", reviewPath("bad-id"), { approve: true }, admin)).status, 400);
  const roles = async () => f.db.query('SELECT r.code FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE ur."idUser"=$1', [f.accounts.empty.id]);
  const result = await f.call("POST", reviewPath(pending), { approve: true, reason: "" }, admin);
  assert.equal(result.status, 200);
  assert.equal((await read(pending)).status, "APPROVED");
  assert.ok((await roles()).some(r => r.code === "ORGANIZER"));
  assert.equal((await f.call("POST", reviewPath(pending), { approve: false, reason: "Retry" }, admin)).status, 409);

  async function fresh(name) {
    const id = randomUUID();
    // Same owner may submit again after rejection; use the customer to keep approved uniqueness valid.
    await f.db.query(`INSERT INTO organizer_applications(id,user_id,organization_name,contact_name,contact_email,contact_phone,
      description,business_name,tax_id_or_business_license,website_or_social,head_office_address,main_event_category,expected_event_scale)
      VALUES($1,$2,$3,'C6 contact','c6@example.test','0900000000','C6 description','C6 company','C6TAX','https://example.test','Test address','Music','Small')`, [id, f.accounts.customer.id, name]);
    return id;
  }
  const rejected = await fresh("C6 rejection");
  assert.equal((await f.call("POST", reviewPath(rejected), { approve: false, reason: "  Missing evidence  " }, admin)).status, 200);
  const rejectedData = await read(rejected);
  assert.equal(rejectedData.status, "REJECTED");
  assert.equal(rejectedData.rejection_reason, "Missing evidence");
  assert.ok(rejectedData.reviewed_at);
  assert.equal((await f.call("POST", reviewPath(rejected), { approve: true }, admin)).status, 409);
  const noRole = await f.db.query('SELECT 1 FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE ur."idUser"=$1 AND r.code=\'ORGANIZER\'', [f.accounts.customer.id]);
  assert.equal(noRole.length, 0);
  const race = await fresh("C6 concurrent");
  const secondAdminId = randomUUID();
  const secondAdminEmail = `c6-admin-${secondAdminId.slice(0, 8)}@example.test`;
  await f.db.query('INSERT INTO users("idUser",name,email,password) SELECT $1,\'C6 other admin\',$2,password FROM users WHERE "idUser"=$3', [secondAdminId, secondAdminEmail, f.accounts.admin.id]);
  await f.db.query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code IN (\'USER\',\'ADMIN\')', [secondAdminId]);
  const loginOther = await f.call("POST", "/auth/login", { email: secondAdminEmail, password: f.accounts.admin.password });
  assert.equal(loginOther.status, 200);
  const secondAdmin = loginOther.body.data.accessToken;
  const decisions = await Promise.all([
    f.call("POST", reviewPath(race), { approve: false, reason: "First reviewer" }, admin),
    f.call("POST", reviewPath(race), { approve: false, reason: "Other reviewer" }, secondAdmin),
  ]);
  assert.deepEqual(decisions.map(r => r.status).sort(), [200, 409]);
  assert.equal((await read(race)).status, "REJECTED");
  const rollback = await fresh("C6 rollback");
  // Fail the actual audit append after the status update: entire route transaction must roll back.
  await f.db.query(`CREATE FUNCTION c6_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'C6 audit test failure'; END $$`);
  await f.db.query(`CREATE TRIGGER c6_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION c6_fail_audit()`);
  const failure = await f.call("POST", reviewPath(rollback), { approve: true }, admin);
  assert.equal(failure.status, 500);
  assert.equal((await read(rollback)).status, "PENDING");
  assert.equal((await f.db.query('SELECT 1 FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE ur."idUser"=$1 AND r.code=\'ORGANIZER\'', [f.accounts.customer.id])).length, 0);
  await f.db.query("DROP TRIGGER c6_fail_audit ON audit_logs");
  const queue = await f.call("GET", "/admin/organizer-applications?status=PENDING_OR_REJECTED&limit=100", undefined, admin);
  assert.equal(queue.status, 200);
  assert.ok(queue.body.data.items.every(a => a.status !== "APPROVED"));
  if (process.env.C6_API_EVIDENCE) require("node:fs").writeFileSync(process.env.C6_API_EVIDENCE, JSON.stringify({ environment: "isolated loopback PostgreSQL", calls: f.calls }, null, 2));
});
