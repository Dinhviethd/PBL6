const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
(async () => {
  if (!process.env.C6_BROWSER_FIXTURE) throw Error("Isolated C6 fixture required");
  const f = JSON.parse(fs.readFileSync(process.env.C6_BROWSER_FIXTURE));
  if (new URL(f.base).port !== "8036") throw Error("Only isolated API8036 allowed");
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const checks = [];
  let posts = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on("request", r => { if (r.method() === "POST" && r.url().includes("/api/admin/")) posts++; });
    const origin = "http://localhost:5186";
    const detail = item => `${origin}/admin/applications/review/${item.id}`;
    await page.goto(detail(f.fixtures.long));
    await page.locator('input[name="email"]').fill(f.accounts.admin.email);
    await page.locator('input[name="password"]').fill(f.accounts.admin.password);
    await page.locator('input[name="password"]').press("Enter");
    await expect(page.locator("#c6-detail-name")).toHaveText(f.fixtures.long.name);
    await expect(page.locator(".c6-detail-content")).toContainText("Long description");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(process.env.C6_BROWSER_EVIDENCE, "c6-long-390.png"), fullPage: true });
    checks.push("Long registration content keeps natural page flow and no mobile overflow");

    const pattern = `**/api/admin/organizer-applications/${f.fixtures.reload.id}`;
    let fail = true;
    await page.route(pattern, async route => { if (fail) await route.abort("failed"); else await route.continue(); });
    await page.goto(detail(f.fixtures.reload));
    await expect(page.locator(".c6-detail-error")).toBeVisible();
    await expect(page.locator(".c6-detail-profile")).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await expect(page.locator("#c6-detail-name")).toHaveText(f.fixtures.reload.name);
    await page.unroute(pattern);
    checks.push("Initial GET error does not show cached profile; explicit retry reads real API");

    await page.setViewportSize({ width: 1440, height: 1000 });
    let release;
    let seen;
    const gate = new Promise(resolve => { release = resolve; });
    const observed = new Promise(resolve => { seen = resolve; });
    await page.route(pattern, async route => {
      seen();
      await gate;
      try { await route.continue(); } catch { /* old navigation was aborted */ }
    });
    await page.goto(origin + "/admin/applications/review?q=C6+Review+reload&status=PENDING");
    await page.getByRole("link", { name: `Xét duyệt hồ sơ ${f.fixtures.reload.name}`, exact: true }).click();
    await observed;
    await page.getByRole("link", { name: "Quay lại danh sách", exact: true }).click();
    await page.getByRole("textbox", { name: "Tìm hồ sơ ban tổ chức", exact: true }).fill("C6 Review long");
    await page.getByRole("link", { name: `Xét duyệt hồ sơ ${f.fixtures.long.name}`, exact: true }).click();
    await expect(page.locator("#c6-detail-name")).toHaveText(f.fixtures.long.name);
    release();
    await page.unroute(pattern);
    await expect(page.locator("#c6-detail-name")).toHaveText(f.fixtures.long.name);
    checks.push("An old delayed profile request cannot overwrite another selected application");

    await page.getByRole("button", { name: "Phê duyệt & cấp quyền BTC", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.evaluate(async () => {
      const { useAuth } = await import("/src/features/auth/stores/authStore.ts");
      useAuth.getState().clearAuth("C6 isolated session-change test");
    });
    await expect(page.locator(".c6-detail-profile")).toHaveCount(0);
    assert.equal(posts, 0);
    checks.push("Session change unmounts pending confirmation and sends no review under another session");
    fs.writeFileSync(path.join(process.env.C6_BROWSER_EVIDENCE, "edge-results.json"), JSON.stringify({ checks, adminWrites: posts }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, adminWrites: posts }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
