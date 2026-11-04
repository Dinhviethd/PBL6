// Requires a dedicated C6 source API and isolated PostgreSQL fixture; never reviews live records.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 15000 });

async function main() {
  if (!process.env.C6_BROWSER_FIXTURE) throw Error("C6_BROWSER_FIXTURE is required");
  const f = JSON.parse(fs.readFileSync(process.env.C6_BROWSER_FIXTURE, "utf8"));
  if (new URL(f.base).port !== "8036") throw Error("Only isolated source API8036 is allowed");
  const origin = "http://localhost:5186";
  const evidence = path.resolve(process.env.C6_BROWSER_EVIDENCE);
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const checks = [];
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const posts = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => {
    if (r.method() === "POST" && /\/api\/admin\/organizer-applications\/[^/]+\/review$/.test(r.url())) posts.push({ url: r.url(), body: r.postDataJSON() });
  });
  let token;
  const detail = item => `${origin}/admin/applications/review/${item.id}`;
  const ready = async item => {
    await expect(page.locator("#c6-detail-name")).toHaveText(item.name);
    await expect(page.getByRole("status", { name: "Đang tải hồ sơ đăng ký BTC…" })).toHaveCount(0);
  };
  const approve = () => page.getByRole("button", { name: "Phê duyệt & cấp quyền BTC", exact: true });
  const reject = () => page.getByRole("button", { name: "Từ chối hồ sơ", exact: true });
  const externalReview = async (item, decision) => {
    const r = await fetch(`${f.base}/admin/organizer-applications/${item.id}/review`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(decision),
    });
    assert.equal(r.status, 200);
  };
  try {
    await page.goto(detail(f.fixtures.reload));
    await page.locator('input[name="email"]').fill(f.accounts.admin.email);
    await page.locator('input[name="password"]').fill(f.accounts.admin.password);
    const login = page.waitForResponse(r => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
    await page.locator('input[name="password"]').press("Enter");
    const lr = await login;
    assert.equal(lr.status(), 200);
    token = (await lr.json()).data.accessToken;
    await ready(f.fixtures.reload);
    await expect(page.locator(".c6-detail-content")).toContainText("Music");
    await expect(page.locator(".c6-detail-content")).toContainText("Small");
    assert.equal(await page.locator(".admin-header").count(), 1);
    assert.equal(await page.locator(".admin-sidebar").count(), 1);
    await expect(page.locator(".admin-nav-link.is-active")).toHaveText("Hồ sơ đăng ký BTC");
    await page.reload();
    await ready(f.fixtures.reload);
    const second = await context.newPage();
    await second.goto(detail(f.fixtures.reload));
    await expect(second.locator("#c6-detail-name")).toHaveText(f.fixtures.reload.name);
    await second.close();
    checks.push("PENDING deep link/login/reload/new tab reads DTO fields; one shared shell and correct active menu");

    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width <= 800) await expect.poll(() => page.locator(".admin-sidebar").evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      await page.screenshot({ path: path.join(evidence, `c6-detail-${width}.png`), fullPage: true });
    }
    await page.getByRole("button", { name: "AI Score Đang phát triển", exact: true }).click();
    await expect(page.locator(".c6-detail-toast")).toHaveText("Chức năng đang phát triển");
    checks.push("Four viewports no overflow; legal placeholders explicitly developing and show toast");

    await expect(reject()).toBeDisabled();
    await page.getByLabel("Lý do (bắt buộc khi từ chối)", { exact: true }).fill(" ");
    await expect(reject()).toBeDisabled();
    await page.getByLabel("Lý do (bắt buộc khi từ chối)", { exact: true }).fill("x".repeat(2001));
    assert.equal((await page.locator("#c6-detail-reason").inputValue()).length, 2000);
    await approve().click();
    await expect(page.getByRole("dialog")).toContainText(f.fixtures.reload.name);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(approve()).toBeFocused();
    assert.equal(posts.length, 0);
    checks.push("Blank reject disabled, max2000, accessible confirmation cancel/Escape sends no POST and restores focus");

    await page.goto(detail(f.fixtures.approve));
    await ready(f.fixtures.approve);
    await approve().click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).dblclick();
    await expect(page.locator(".c6-detail-result")).toContainText("Đã phê duyệt");
    await expect(approve()).toHaveCount(0);
    assert.equal(posts.filter(p => p.url.includes(f.fixtures.approve.id)).length, 1);
    checks.push("Approve real POST succeeds, status refetched read-only, double click sends one decision");

    await page.goto(detail(f.fixtures.reject));
    await ready(f.fixtures.reject);
    await page.locator("#c6-detail-reason").fill("  Hồ sơ cần đối chiếu thêm  ");
    await reject().click();
    await expect(page.getByRole("dialog")).toContainText("Hồ sơ cần đối chiếu thêm");
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.locator(".c6-detail-result")).toContainText("Đã từ chối");
    await expect(page.locator(".c6-detail-rejection")).toContainText("Hồ sơ cần đối chiếu thêm");
    await page.reload();
    await ready(f.fixtures.reject);
    await expect(reject()).toHaveCount(0);
    checks.push("Reject trims reason and persists status/reason/date across reload without further review action");

    const lostItem = f.fixtures.lost;
    let lose = true;
    const lostPattern = `**/api/admin/organizer-applications/${lostItem.id}/review`;
    await page.route(lostPattern, async route => {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      if (lose) { lose = false; await route.abort("failed"); }
      else await route.fulfill({ response });
    });
    await page.goto(detail(lostItem));
    await ready(lostItem);
    await approve().click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.locator(".c6-detail-result")).toContainText("Đã phê duyệt");
    assert.equal(posts.filter(p => p.url.includes(lostItem.id)).length, 1);
    await page.unroute(lostPattern);
    checks.push("Lost POST response after actual commit rechecks GET and never auto-repeats POST");

    const conflict = f.fixtures.conflict;
    const conflictPattern = `**/api/admin/organizer-applications/${conflict.id}/review`;
    await page.route(conflictPattern, async route => {
      await externalReview(conflict, { approve: false, reason: "Other admin decision" });
      await route.continue();
    });
    await page.goto(detail(conflict));
    await ready(conflict);
    await approve().click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.locator(".c6-detail-result")).toContainText("Other admin decision");
    await expect(approve()).toHaveCount(0);
    await page.unroute(conflictPattern);
    checks.push("409 from actual concurrent decision rechecks latest rejected status and becomes read-only");

    const network = f.fixtures.network;
    let committed = false;
    let blockReads = true;
    const postPattern = `**/api/admin/organizer-applications/${network.id}/review`;
    const getPattern = `**/api/admin/organizer-applications/${network.id}`;
    await page.route(postPattern, async route => {
      const response = await route.fetch();
      committed = true;
      await route.fulfill({ response });
    });
    await page.route(getPattern, async route => {
      if (committed && blockReads) await route.abort("failed");
      else await route.continue();
    });
    await page.goto(detail(network));
    await ready(network);
    await approve().click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.locator(".c6-detail-error")).toContainText("Đã gửi quyết định, chưa tải được trạng thái mới");
    await expect(approve()).toBeDisabled();
    blockReads = false;
    await page.locator(".c6-detail-error").getByRole("button", { name: "Tải lại trạng thái", exact: true }).click();
    await expect(page.locator(".c6-detail-result")).toContainText("Đã phê duyệt");
    assert.equal(posts.filter(p => p.url.includes(network.id)).length, 1);
    await page.unroute(postPattern);
    await page.unroute(getPattern);
    checks.push("GET failure after successful POST locks form until explicit status reload; no repeated mutation");

    await page.setViewportSize({ width: 1440, height: 1000 });
    const listUrl = `${origin}/admin/applications/review?page=1&limit=10&status=PENDING_OR_REJECTED&q=C6+Lastpage`;
    await page.goto(listUrl);
    await expect(page.locator(".c6-page-meta")).toContainText("11–11 / 11");
    await page.getByRole("link", { name: `Xét duyệt hồ sơ ${f.fixtures.lastpage.name}`, exact: true }).click();
    await ready(f.fixtures.lastpage);
    await page.getByRole("link", { name: "Quay lại danh sách", exact: true }).click();
    await expect(page).toHaveURL(listUrl);
    await expect(page.locator(".c6-page-meta")).toContainText("11–11 / 11");
    await page.getByRole("link", { name: `Xét duyệt hồ sơ ${f.fixtures.lastpage.name}`, exact: true }).click();
    await ready(f.fixtures.lastpage);
    await approve().click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.locator(".c6-detail-result")).toContainText("Đã phê duyệt");
    await page.getByRole("link", { name: "Quay lại danh sách", exact: true }).click();
    await expect(page.locator(".c6-page-meta")).toContainText("1–10 / 10");
    await expect(page.getByRole("textbox", { name: "Tìm hồ sơ ban tổ chức", exact: true })).toHaveValue("C6 Lastpage");
    await page.getByRole("link", { name: /^Xem hồ sơ/ }).first().click();
    await expect(page.locator(".c6-detail-result")).toContainText("Đã từ chối");
    await page.goBack();
    await expect(page.locator(".c6-page-meta")).toContainText("1–10 / 10");
    checks.push("C6 link back/browser back preserve filters; approving last pending record clamps empty final page and refreshes totals");

    await page.goto(`${origin}/admin/applications/review/not-a-uuid`);
    await expect(page.locator(".c6-detail-error")).toContainText("Đường dẫn hồ sơ không hợp lệ");
    await page.goto(`${origin}/admin/applications/review/00000000-0000-4000-8000-000000000099`);
    await expect(page.locator(".c6-detail-error")).toContainText("Không tìm thấy hồ sơ");
    await expect(page.locator(".c6-detail-profile")).toHaveCount(0);
    await page.goto(`${origin}/admin/applications/${f.applications.ownerA.id}`);
    await expect(page.locator("#c5-profile-name")).toHaveText(f.applications.ownerA.name);
    checks.push("400/404 explicit, and C5 route is still separate and functional");

    for (const role of ["customer", "ownerA"]) {
      const c = await browser.newContext();
      const p = await c.newPage();
      await p.goto(origin + "/auth/login");
      await p.locator('input[name="email"]').fill(f.accounts[role].email);
      await p.locator('input[name="password"]').fill(f.accounts[role].password);
      const response = p.waitForResponse(r => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
      await p.locator('input[name="password"]').press("Enter");
      assert.equal((await response).status(), 200);
      await p.goto(detail(f.fixtures.reload));
      await expect(p.getByText("Tài khoản chưa có quyền truy cập khu vực này.", { exact: true })).toBeVisible();
      await expect(p.locator(".c6-detail-profile")).toHaveCount(0);
      await c.close();
    }
    checks.push("Customer and Organizer browser sessions cannot open C6 detail");
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(evidence, "browser-results.json"), JSON.stringify({ origin, checks, pageErrors: errors, reviewRequests: posts.map(p => ({ applicationId: p.url.split("/").at(-2), approve: p.body.approve })) }, null, 2));
    console.log(JSON.stringify({ checks: checks.length, pageErrors: errors.length, realReviewPosts: posts.length }));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
