// Explicitly authorized B11 application fixture only; no users, events, staff or payments are mutated.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("../../../client/node_modules/@playwright/test");
const sharp = require("sharp");
const fixtureId = randomUUID();
const output = process.env.B11_LIVE_EVIDENCE;
assert.ok(output, "B11_LIVE_EVIDENCE directory required");
const results = [];
let uploadedPublicId = null;

function database(command) {
  const script = `
const {DataSource}=require('typeorm'),{createHash}=require('crypto');
const command=${JSON.stringify(command)},fixtureId=${JSON.stringify(fixtureId)};
(async()=>{const d=new DataSource({type:'postgres',url:process.env.DATABASE_URL,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:false});await d.initialize();try{
const users=await d.query('SELECT "idUser" FROM users WHERE email=$1',['organizer@example.test']);if(users.length!==1)throw Error('Expected one test organizer');const owner=users[0].idUser;
const fingerprint=async()=>{const rows=await d.query('SELECT * FROM organizer_applications WHERE id<>$1 ORDER BY id',[fixtureId]);const staff=await d.query('SELECT * FROM event_checkin_staff ORDER BY id');const account=await d.query('SELECT * FROM users WHERE "idUser"=$1',[owner]);return {originalApplicationCount:rows.length,applications:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),staff:createHash('sha256').update(JSON.stringify(staff)).digest('hex'),account:createHash('sha256').update(JSON.stringify(account)).digest('hex')};};
if(command==='before'){if((await d.query('SELECT id FROM organizer_applications WHERE user_id=$1',[owner])).length)throw Error('Organizer already has an application; do not overwrite');console.log(JSON.stringify(await fingerprint()));}
if(command==='create'){await d.transaction(async tx=>{await tx.query('SELECT "idUser" FROM users WHERE "idUser"=$1 FOR UPDATE',[owner]);if((await tx.query('SELECT id FROM organizer_applications WHERE user_id=$1',[owner])).length)throw Error('Application appeared concurrently');const admin=(await tx.query('SELECT ur."idUser" FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE r.code=$1 ORDER BY ur."idUser" LIMIT 1',['ADMIN']))[0];if(!admin)throw Error('No administrator FK for synthetic approved fixture');await tx.query("INSERT INTO organizer_applications(id,user_id,organization_name,contact_name,contact_email,contact_phone,description,business_name,tax_id_or_business_license,website_or_social,head_office_address,main_event_category,expected_event_scale,status,reviewed_by,reviewed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'APPROVED',$14,now())",[fixtureId,owner,'TEST B11 ROLLOUT','TEST B11 CONTACT','organizer@example.test','0000000000','TEST B11 temporary authorized fixture; not legal verification.','TEST B11 COMPANY','TEST-B11-NOT-LEGAL','https://example.test/b11','TEST B11 ADDRESS','TEST B11','TEST B11',admin.idUser]);});console.log(JSON.stringify({fixtureId,created:true}));}
if(command==='cleanup'){await d.transaction(async tx=>{const row=(await tx.query('SELECT id,organization_name FROM organizer_applications WHERE id=$1 AND user_id=$2 FOR UPDATE',[fixtureId,owner]))[0];if(row&&!row.organization_name.startsWith('TEST B11'))throw Error('Fixture marker changed; refuse cleanup');const logs=await tx.query("DELETE FROM audit_logs WHERE resource_type='organizer' AND resource_id=$1 AND metadata->>'applicationId'=$2 AND action=ANY($3::text[]) RETURNING id",[owner,fixtureId,['organizer.profile_updated','organizer.legal_requested','organizer.legal_approved','organizer.legal_rejected']]);await tx.query('DELETE FROM organizer_applications WHERE id=$1 AND user_id=$2',[fixtureId,owner]);console.log(JSON.stringify({fixtureRemoved:true,testAuditRowsRemoved:Array.isArray(logs[0])?logs[0].length:logs.length}));});console.log(JSON.stringify(await fingerprint()));}
}finally{await d.destroy();}})().catch(e=>{console.error(e.message);process.exitCode=1});
`;
  return execFileSync("docker", ["exec", "-i", "pbl6-api-1", "node"], { input: script, encoding: "utf8", windowsHide: true }).trim().split("\n").map((line) => JSON.parse(line));
}

function removeUploadedAsset(publicId) {
  assert.match(publicId, /^eventhub\/[a-zA-Z0-9_-]+$/);
  const script = `const c=require('cloudinary').v2;c.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET});c.uploader.destroy(${JSON.stringify(publicId)},{resource_type:'image',invalidate:true}).then(r=>console.log(JSON.stringify({assetCleanup:r.result}))).catch(e=>{console.error(e.message);process.exitCode=1});`;
  return JSON.parse(execFileSync("docker", ["exec", "-i", "pbl6-api-1", "node"], { input: script, encoding: "utf8", windowsHide: true }));
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const before = database("before")[0];
  await fs.writeFile(path.join(output, "fixture-state.json"), JSON.stringify({ fixtureId, before }, null, 2));
  let browser, token;
  async function call(label, method, endpoint, body, expected = 200, authenticated = true) {
    const response = await fetch("http://localhost:8000/api" + endpoint, { method,
      headers: { "Content-Type": "application/json", ...(authenticated && token ? { Authorization: "Bearer " + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    results.push({ label, method, path: endpoint, status: response.status, code: result.code });
    assert.equal(response.status, expected, label + ": " + JSON.stringify(result));
    return result.data;
  }
  async function login(page, origin) {
    await page.goto(origin + "/organizer/profile");
    await page.locator('input[name="email"]').fill("organizer@example.test");
    await page.locator('input[name="password"]').fill("LocalDemo2026!");
    await Promise.all([page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.status() === 200), page.getByRole("button", { name: "ĐĂNG NHẬP NGAY" }).click()]);
    await page.locator("#b11-organizationName").waitFor();
  }
  try {
    const auth = await call("runtime login", "POST", "/auth/login", { email: "organizer@example.test", password: "LocalDemo2026!" }, 200, false);
    token = auth.accessToken;
    await call("guest rejected", "GET", "/organizer/profile", undefined, 401, false);
    assert.equal((await call("missing application before fixture", "GET", "/organizer/profile")).initialized, false);
    database("create");
    let profile = await call("approved TEST application", "GET", "/organizer/profile");
    assert.equal(profile.sourceApplicationId, fixtureId);
    assert.equal(profile.capabilities.logo, true); assert.equal(profile.capabilities.legalReview, true);
    const stale = profile.version;
    profile = await call("real Supabase PATCH", "PATCH", "/organizer/profile", { version: stale, organizationName: "TEST B11 ROLLOUT API", description: "TEST B11 API ROUNDTRIP" });
    assert.equal(profile.contactPhone, "0000000000");
    await call("stale ETag rejected", "PATCH", "/organizer/profile", { version: stale, description: "TEST B11 STALE" }, 409);
    await call("direct legal edit rejected", "PATCH", "/organizer/profile", { version: profile.version, businessName: "TEST B11 BYPASS" }, 400);
    await call("removed representative rejected", "PATCH", "/organizer/profile", { version: profile.version, legalRepresentativeName: "Removed" }, 400);
    await call("removed public field rejected", "PATCH", "/organizer/profile", { version: profile.version, isPublic: true }, 400);
    await call("team requires valid event", "POST", "/organizer/team", { email: "invalid" }, 400);
    await call("actual staff aggregate", "GET", "/organizer/team");
    await call("actual KPI", "GET", "/organizer/profile/stats");
    await call("search empty", "GET", "/organizer/search?q=TESTB11NoSuchOrder");
    browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await login(page, "http://localhost:5173");
    assert.equal(await page.locator("#b11-organizationName").inputValue(), "TEST B11 ROLLOUT API");
    await page.locator("#b11-organizationName").fill("TEST B11 ROLLOUT UI");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Thông tin hồ sơ đã được lưu." }).waitFor();
    await page.reload(); await page.locator("#b11-organizationName").waitFor();
    assert.equal(await page.locator("#b11-organizationName").inputValue(), "TEST B11 ROLLOUT UI");
    await page.locator("#b11-organizationName").fill("TEST B11 UNSAVED");
    await page.getByRole("button", { name: "Hủy thay đổi", exact: true }).click();
    assert.equal(await page.locator("#b11-organizationName").inputValue(), "TEST B11 ROLLOUT UI");
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#7c3aed" } }).png().toBuffer();
    const uploadResponse = page.waitForResponse((r) => r.url().endsWith("/api/media") && r.request().method() === "POST");
    await page.getByLabel("Thay đổi logo BTC", { exact: true }).setInputFiles({ name: "TEST-B11-logo.png", mimeType: "image/png", buffer: png });
    const upload = await (await uploadResponse).json();
    assert.ok(upload.data?.url, "Upload must return a real logo URL");
    const match = new URL(upload.data.url).pathname.match(/\/image\/upload\/(?:v\d+\/)?(eventhub\/[a-zA-Z0-9_-]+)\.[a-zA-Z0-9]+$/);
    assert.ok(match, "Only the newly uploaded eventhub image may be cleaned up");
    uploadedPublicId = match[1];
    await fs.writeFile(path.join(output, "fixture-state.json"), JSON.stringify({ fixtureId, before, uploadedPublicId }, null, 2));
    await page.getByRole("status").filter({ hasText: "Logo đã tải lên." }).waitFor();
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Thông tin hồ sơ đã được lưu." }).waitFor();
    profile = await call("logo roundtrip through application", "GET", "/organizer/profile"); assert.equal(profile.logoUrl, upload.data.url);
    await page.locator("#b11-businessName").fill("TEST B11 LEGAL CHANGE PENDING");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await page.getByText(/Yêu cầu ngày .* đang chờ duyệt/).waitFor();
    assert.equal(await page.locator("#b11-businessName").inputValue(), "TEST B11 COMPANY");
    const requests = await call("real pending request", "GET", "/organizer/profile/legal-requests");
    const pending = requests.find((r) => r.status === "PENDING"); assert.ok(pending); assert.equal(pending.applicationId, fixtureId);
    profile = await call("old legal values retained", "GET", "/organizer/profile");
    await call("duplicate pending rejected", "POST", "/organizer/profile/legal-requests", { version: profile.version, changes: { businessName: "TEST B11 DUPLICATE" } }, 409);
    await call("organizer cannot admin-review", "POST", `/admin/organizer-profile-requests/${pending.id}/review`, { approve: true }, 403);
    async function stable(page) {
      await page.locator(".b11-member").first().waitFor({state:"visible"});
      await page.locator(".b11-kpis strong").first().filter({hasText:/^\d/}).waitFor();
    }
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("http://localhost:5173/organizer/profile"); await page.locator("#b11-organizationName").waitFor();
      await stable(page);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal overflow");
      await page.screenshot({ path: path.join(output, `live-${width}.png`), fullPage: true });
      if (width <= 900) { await page.getByRole("button", { name: "Mở menu", exact: true }).click(); await page.locator('.osb-sidebar a[aria-current="page"]').waitFor({ state: "visible" }); await page.keyboard.press("Escape"); }
    }
    const staticContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const staticPage = await staticContext.newPage(); await login(staticPage, "http://localhost:8000");
    await stable(staticPage);
    assert.equal(await staticPage.locator("#b11-organizationName").inputValue(), "TEST B11 ROLLOUT UI");
    await staticPage.screenshot({ path: path.join(output, "static-8000.png"), fullPage: true });
    await staticContext.close();
    assert.deepEqual(errors, []);
    results.push({ label: "Chrome live criteria", result: "PASS", viewports: [1440, 1024, 768, 390], static8000: true, passwordUnchanged: true, staffGrantsUnchanged: true });
    await context.close();
  } finally {
    if (browser) await browser.close();
    const cleanup = database("cleanup");
    const after = cleanup.at(-1); assert.deepEqual(after, before, "Original applications, staff and organizer account must be unchanged");
    let assetCleanup = null; if (uploadedPublicId) { assetCleanup = removeUploadedAsset(uploadedPublicId); assert.ok(["ok", "not found"].includes(assetCleanup.assetCleanup)); }
    results.push({ label: "fixture cleanup", cleanup: cleanup[0], fingerprintsMatch: true, assetCleanup });
    if (token) assert.equal((await call("missing state restored", "GET", "/organizer/profile")).initialized, false);
    await fs.writeFile(path.join(output, "runtime-results.json"), JSON.stringify({ fixtureId, results }, null, 2));
  }
  console.log(JSON.stringify({ result: "PASS", fixtureId, assertions: results.length, evidence: output }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
