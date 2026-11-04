// Run against the isolated C5 fixture, never the default application database.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { chromium, expect } = require("@playwright/test");

async function main() {
  const fixtureFile = process.env.C5_BROWSER_FIXTURE;
  if (!fixtureFile) throw Error("C5_BROWSER_FIXTURE must point to the isolated fixture metadata");
  const f = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  if (new URL(f.base).port !== "8035") throw Error("Expected isolated C5 API on port 8035");
  const origin = "http://localhost:5185";
  const evidence = path.resolve(process.env.C5_BROWSER_EVIDENCE || "../docs/reports/stitch/evidence/C5_20261105_005837");
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const checks = [];
  const errors = [];
  const apiReads = [];
  let c5Writes = 0;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => {
    if (r.url().includes("/api/admin/") && r.method() !== "GET") c5Writes++;
    if (r.url().includes("/api/admin/")) apiReads.push(new URL(r.url()).pathname + new URL(r.url()).search);
  });
  const profile = key => `${origin}/admin/applications/${f.applications[key].id}`;
  const ready = async (key, count) => {
    await expect(page.locator("#c5-profile-name")).toHaveText(f.applications[key].name);
    await expect(page.locator(".c5-events")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".c5-event-card")).toHaveCount(count);
  };
  try {
    await page.goto(profile("ownerA"));
    await page.locator('input[name="email"]').fill(f.accounts.admin.email);
    await page.locator('input[name="password"]').fill(f.accounts.admin.password);
    await page.locator('input[name="password"]').press("Enter");
    await ready("ownerA", 10);
    await expect(page.locator(".c5-events-heading")).toContainText("23 sự kiện");
    assert.equal(await page.locator(".admin-header").count(), 1);
    assert.equal(await page.locator(".admin-sidebar").count(), 1);
    await expect(page.locator(".admin-nav-link.is-active")).toHaveText("Ban tổ chức");
    const firstPageTitles = await page.locator(".c5-event-title h3").allTextContents();
    checks.push("Login redirect opens the correct deep link, one shared shell, owner total 23");

    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect(page.locator(".c5-pagination")).toContainText("Trang 2 / 3");
    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await ready("ownerA", 3);
    await expect(page.locator(".c5-pagination")).toContainText("21–23 / 23");
    await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
    await page.reload();
    await ready("ownerA", 3);
    await expect(page.locator(".c5-pagination")).toContainText("Trang 3 / 3");
    await page.getByRole("button", { name: "Trang trước", exact: true }).click();
    await ready("ownerA", 10);
    assert.ok((await page.locator(".c5-event-title h3").allTextContents()).every(t => !firstPageTitles.includes(t)));
    checks.push("Server pagination 10/10/3, no duplicate pages, reload restores page and auth");

    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width <= 800) {
        await expect.poll(() => page.locator(".admin-sidebar").evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      await page.screenshot({ path: path.join(evidence, `c5-${width}.png`), fullPage: true });
    }
    checks.push("Four viewports: no document overflow, screenshots saved");

    await page.goto(profile("ownerA") + "?page=999");
    await ready("ownerA", 3);
    await expect(page).toHaveURL(/\?page=2$/);
    await page.goto(profile("empty") + "?page=2");
    await ready("empty", 0);
    await expect(page.locator(".c5-events-heading")).toContainText("0 sự kiện");
    await expect(page.locator(".c5-events")).toContainText("Ban tổ chức chưa có sự kiện nào.");
    await expect(page).toHaveURL(profile("empty"));
    await page.goto(profile("ownerB"));
    await ready("ownerB", 3);
    await expect(page.locator(".c5-profile")).toContainText("Đã từ chối");
    await expect(page.locator(".c5-events-heading")).toContainText("3 sự kiện");
    checks.push("Out-of-range pages clamp, empty owner resets page, rejected profile shows only its events");

    await page.goto(origin + "/admin/applications/not-a-uuid");
    await expect(page.locator(".c5-error")).toContainText("Đường dẫn hồ sơ không hợp lệ.");
    await expect(page.locator(".c5-event-card")).toHaveCount(0);
    await page.goto(origin + "/admin/applications/" + randomUUID());
    await expect(page.locator(".c5-error")).toContainText("Không tìm thấy hồ sơ ban tổ chức.");
    checks.push("Invalid and missing profile errors never show old profile/events");

    let failed = false;
    await page.route("**/api/admin/events?*", async route => {
      if (!failed) { failed = true; await route.abort("failed"); }
      else await route.continue();
    });
    await page.goto(profile("ownerA"));
    await expect(page.locator("#c5-profile-name")).toHaveText(f.applications.ownerA.name);
    await expect(page.locator(".c5-events .c5-error")).toBeVisible();
    await page.locator(".c5-events").getByRole("button", { name: "Thử lại", exact: true }).click();
    await ready("ownerA", 10);
    await page.unroute("**/api/admin/events?*");
    checks.push("Network failure shows an error, retry reads real API and restores events");

    await page.setViewportSize({ width: 1440, height: 1000 });
    const listUrl = origin + "/admin/applications?page=1&limit=10&status=REJECTED&q=C5";
    await page.goto(listUrl);
    await expect(page.locator(".c4-page-meta")).toContainText("11–13 / 13");
    await page.locator("a.c4-action").first().click();
    await expect(page.locator("#c5-profile-name")).toBeVisible();
    await page.getByRole("link", { name: "Quay lại danh sách", exact: true }).click();
    await expect(page).toHaveURL(listUrl);
    await expect(page.locator(".c4-page-meta")).toContainText("11–13 / 13");
    await expect(page.getByRole("textbox", { name: "Tìm ban tổ chức", exact: true })).toHaveValue("C5");
    await page.locator("a.c4-action").first().click();
    await expect(page.locator("#c5-profile-name")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".c4-page-meta")).toContainText("11–13 / 13");
    checks.push("C4 Xem -> C5 -> link back/browser back preserves search, status and page");

    await page.goto(origin + "/admin/applications/review");
    await expect(page.locator(".c6-page")).toBeVisible();
    await page.goto(origin + "/admin/applications?status=PENDING");
    await expect(page.locator("a.c4-action")).toHaveCount(1);
    await page.getByRole("button", { name: `Xét duyệt hồ sơ ${f.applications.empty.name}`, exact: true }).click();
    await expect(page.locator(".c4-dialog")).toBeVisible();
    checks.push("Static C6 review route and existing C4 pending review modal still work");

    const second = await context.newPage();
    await second.goto(profile("ownerA"));
    await expect(second.locator("#c5-profile-name")).toHaveText(f.applications.ownerA.name);
    await expect(second.locator(".c5-event-card")).toHaveCount(10);
    assert.ok(!/Escrow|Payout|KYC|GMV|Safe Hold|TIER|Xuất hồ sơ PDF|Giám sát vé/.test(await second.locator(".c5-page").innerText()));
    assert.equal(await second.locator(".c5-page [role=tab]").count(), 0);
    await second.close();
    checks.push("New tab deep link works without navigation state; removed features absent");

    await page.goto(profile("ownerA"));
    await ready("ownerA", 10);
    await page.getByRole("button", { name: "Trang sau", exact: true }).focus();
    await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".c5-pagination")).toContainText("Trang 2 / 3");
    checks.push("Pagination supports keyboard focus and Enter");

    // Hold an old profile read while changing routes, then release its real response.
    let releaseOld;
    let sawOld;
    const oldSeen = new Promise(resolve => { sawOld = resolve; });
    const oldGate = new Promise(resolve => { releaseOld = resolve; });
    const oldPattern = `**/api/admin/organizer-applications/${f.applications.ownerA.id}`;
    await page.route(oldPattern, async route => {
      sawOld();
      await oldGate;
      try { await route.continue(); } catch { /* aborted by route change */ }
    });
    await page.goto(origin + "/admin/applications?status=APPROVED");
    await page.getByRole("link", { name: `Xem hồ sơ ${f.applications.ownerA.name}`, exact: true }).click();
    await oldSeen;
    await expect(page.getByRole("status")).toContainText("Đang tải hồ sơ");
    await page.getByRole("link", { name: "Quay lại danh sách", exact: true }).click();
    await page.getByRole("button", { name: /^Tất cả/ }).click();
    await expect(page.locator("a.c4-action")).not.toHaveCount(0);
    // Search the other organization to keep the target stable regardless of C4 page ordering.
    await page.getByRole("textbox", { name: "Tìm ban tổ chức", exact: true }).fill("C5 extra rejected");
    await expect(page.locator(".c4-page-meta")).toContainText("/ 12");
    const otherLink = page.locator("a.c4-action").first();
    const otherName = (await otherLink.getAttribute("aria-label")).replace("Xem hồ sơ ", "");
    await otherLink.click();
    await expect(page.locator("#c5-profile-name")).toHaveText(otherName);
    await expect(page.locator(".c5-event-card")).toHaveCount(3);
    releaseOld();
    await page.unroute(oldPattern);
    await expect(page.locator("#c5-profile-name")).toHaveText(otherName);
    await expect(page.locator(".c5-events-heading")).toContainText("3 sự kiện");
    checks.push("Delayed prior profile read cannot overwrite another organization after SPA navigation");

    for (const role of ["customer", "ownerA"]) {
      const otherContext = await browser.newContext();
      const other = await otherContext.newPage();
      await other.goto(origin + "/auth/login");
      await other.locator('input[name="email"]').fill(f.accounts[role].email);
      await other.locator('input[name="password"]').fill(f.accounts[role].password);
      const signedIn = other.waitForResponse(r => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
      await other.locator('input[name="password"]').press("Enter");
      assert.equal((await signedIn).status(), 200);
      await other.goto(profile("ownerA"));
      await expect(other.getByText("Tài khoản chưa có quyền truy cập khu vực này.", { exact: true })).toBeVisible();
      await expect(other.locator(".c5-profile")).toHaveCount(0);
      await otherContext.close();
    }
    checks.push("Customer and Organizer sessions cannot open C5 in browser");
    assert.equal(c5Writes, 0);
    assert.deepEqual(errors, []);
    assert.ok(apiReads.some(p => p.includes("organizerId=" + f.accounts.ownerA.id)));
    assert.ok(!apiReads.some(p => /metrics|analytics|payout|escrow/.test(p)));
    checks.push("No page errors, no admin writes or advanced API requests");
    fs.writeFileSync(path.join(evidence, "browser-results.json"), JSON.stringify({ origin, checks, pageErrors: errors, adminWrites: c5Writes }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, pageErrors: errors.length, adminWrites: c5Writes }));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
