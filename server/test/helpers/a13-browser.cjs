const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { chromium, expect } = require("../../../client/node_modules/@playwright/test");

module.exports = async ({ base, user, other, password, seed, call, invitations, db }) => {
  const clientDir = path.resolve(__dirname, "../../../client");
  const origin = "http://localhost:5183";
  const evidence = path.join(require("node:os").tmpdir(), "a13-browser");
  await fs.mkdir(evidence, { recursive: true });
  const vite = spawn(process.execPath, [path.join(clientDir, "node_modules/vite/bin/vite.js"),
    "--host", "localhost", "--port", "5183", "--strictPort"], {
    cwd: clientDir, windowsHide: true, stdio: "ignore",
    env: { ...process.env, VITE_DEV_API_PROXY_TARGET: base.replace(/\/api$/, "") },
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { ready = (await fetch(origin)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, "isolated Vite ready");
    browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "America/New_York" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const root = page.locator(".a13-assignments");
    const cards = root.locator("article");
    const button = (name) => root.getByRole("button", { name, exact: true });
    const card = (index) => root.locator(`article[aria-labelledby="assignment-${invitations[index].id}"]`);
    async function login(account) {
      await page.goto(origin + "/checkin");
      await page.locator('input[name="email"]').fill(account.user.email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true }).click();
      await expect(root.getByRole("heading", { name: "Sự kiện được phân công", exact: true })).toBeVisible();
    }
    await login(user);
    await expect(cards).toHaveCount(50);
    await expect(root.getByText("Trang 1 / 2", { exact: true })).toBeVisible();
    await expect(button("Trước")).toBeDisabled();
    await button("Sau").click();
    await expect(cards).toHaveCount(1);
    await expect(root.getByText("Trang 2 / 2", { exact: true })).toBeVisible();
    await expect(button("Sau")).toBeDisabled();
    await seed(1);
    await button("Làm mới danh sách").click();
    await expect(root.getByText("Trang 1 / 1", { exact: true })).toBeVisible();
    await expect(cards).toHaveCount(1);

    await seed(6, true);
    await db.query("UPDATE events SET starts_at=now()-interval '3 hours',ends_at=now()-interval '1 second',checkin_closes_at=now()-interval '1 minute' WHERE id=$1", [invitations[5].eventId]);
    await button("Làm mới danh sách").click();
    await expect(cards).toHaveCount(6);
    await expect(card(0).getByText("Chờ chấp nhận", { exact: true })).toBeVisible();
    await expect(card(1).getByRole("link", { name: "Mở quét vé" })).toBeVisible();
    await expect(card(1).getByText("Chưa có ảnh", { exact: true })).toBeVisible();
    await expect(card(2).getByText("Lời mời hết hạn", { exact: true })).toBeVisible();
    await expect(card(3).getByText("Đã từ chối", { exact: true })).toBeVisible();
    await expect(card(4).getByText("Đã thu hồi", { exact: true })).toBeVisible();
    await expect(card(5).getByText("Sự kiện đã đóng", { exact: true }).first()).toBeVisible();
    for (const i of [2, 3, 4, 5]) {
      await expect(card(i).getByRole("button")).toHaveCount(0);
      await expect(card(i).getByRole("link")).toHaveCount(0);
    }
    assert.equal(await page.locator("header.auth-header").count(), 1);
    assert.equal(await page.locator("footer.auth-footer").count(), 1);
    assert.equal(await root.getByText(/Mô phỏng|30 phút|cần xử lý|Cổng|VIP Zone|EDM Festival/).count(), 0);
    const firstTime = await card(0).locator("time").first().getAttribute("datetime");
    await expect(card(0).locator("time").first()).toHaveText(new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(firstTime)));
    await expect.poll(() => card(0).locator("img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => window.scrollY === 0);
      const placement = await page.evaluate(() => ({
        headerBottom: document.querySelector("header.auth-header").getBoundingClientRect().bottom,
        headingTop: document.querySelector("#a13-heading").getBoundingClientRect().top,
      }));
      assert.ok(placement.headingTop >= placement.headerBottom, `heading clear of shared header: ${JSON.stringify(placement)}`);
      await page.screenshot({ path: path.join(evidence, `a13-${width}.png`), fullPage: true });
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= width, JSON.stringify(dimensions));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const realImage = (await call("GET", "/me/checkin-assignments", user.accessToken)).data.find((item) => item.id === invitations[0].id).image_url;
    await db.query("UPDATE events SET cover_image_url=$2 WHERE id=$1", [invitations[0].eventId, base + "/health"]);
    await button("Làm mới danh sách").click();
    await expect(card(0).getByText("Chưa có ảnh", { exact: true })).toBeVisible();
    await db.query("UPDATE events SET cover_image_url=$2 WHERE id=$1", [invitations[0].eventId, realImage]);
    await button("Làm mới danh sách").click();
    await expect(card(0).locator("img")).toBeVisible();
    await card(0).getByRole("button", { name: "Từ chối", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(card(0).getByRole("button", { name: "Chấp nhận", exact: true })).toBeFocused();
    const listPattern = /\/api\/me\/checkin-assignments\?/;
    await page.route(listPattern, (route) => route.abort("failed"));
    await button("Làm mới danh sách").click();
    await expect(root.getByRole("heading", { name: "Lỗi tải dữ liệu", exact: true })).toBeVisible();
    await expect(cards).toHaveCount(0);
    await expect(root.getByRole("heading", { name: "Bạn chưa có lời mời check-in.", exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "a13-error.png"), fullPage: true });
    await page.unroute(listPattern);
    await button("Thử lại").click();
    await expect(cards).toHaveCount(6);

    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(listPattern, async (route) => { await gate; await route.continue(); });
    await button("Làm mới danh sách").click();
    await expect(root.getByRole("heading", { name: "Đang tải dữ liệu…", exact: true })).toBeVisible();
    await expect(cards).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await root.locator(".a13-spin").evaluate((element) => getComputedStyle(element).animationName), "none");
    release();
    await expect(cards).toHaveCount(6);
    await page.unroute(listPattern);

    // A real server-side expiry after loading proves the UI displays backend409.
    await db.query("UPDATE event_checkin_staff SET expires_at=now()-interval '1 second' WHERE id=$1", [invitations[0].id]);
    await card(0).getByRole("button", { name: "Chấp nhận", exact: true }).click();
    await expect(root.getByRole("alert")).toContainText("Lời mời đã hết hạn hoặc đã được xử lý.");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(card(0).getByText("Lời mời hết hạn", { exact: true })).toBeVisible();

    await seed(6, true);
    await button("Làm mới danh sách").click();
    await expect(card(0).getByRole("button", { name: "Chấp nhận", exact: true })).toBeVisible();
    const respondPattern = /\/api\/me\/checkin-invitations\/[^/]+\/respond$/;
    await page.route(respondPattern, (route) => route.abort("failed"));
    await card(0).getByRole("button", { name: "Chấp nhận", exact: true }).click();
    await expect(root.getByRole("alert")).toContainText("Không kết nối được máy chủ.");
    assert.equal((await call("GET", "/me/checkin-assignments", user.accessToken)).data.find((item) => item.id === invitations[0].id).status, "PENDING");
    await page.unroute(respondPattern);
    let releaseDecision;
    const decisionGate = new Promise((resolve) => { releaseDecision = resolve; });
    let posts = 0;
    await page.route(respondPattern, async (route) => {
      posts++;
      await decisionGate;
      await route.continue();
    });
    await card(0).getByRole("button", { name: "Chấp nhận", exact: true }).click();
    await expect(card(0).getByRole("button", { name: "Đang gửi…", exact: true })).toBeDisabled();
    await expect(button("Làm mới danh sách")).toBeDisabled();
    releaseDecision();
    await expect(card(0).getByRole("link", { name: "Mở quét vé" })).toBeVisible();
    assert.equal(posts, 1);
    await page.unroute(respondPattern);
    await expect(root.locator('[role="status"]')).toHaveText("Đã chấp nhận lời mời check-in.");
    const scannerLink = card(0).getByRole("link", { name: "Mở quét vé" });
    await expect(scannerLink).toHaveAttribute("href", `/checkin/events/${invitations[0].eventId}`);
    await scannerLink.click();
    await expect(page).toHaveURL(new RegExp(`/checkin/events/${invitations[0].eventId}$`));
    await expect(page.getByRole("heading", { name: "Sự kiện kiểm thử A13 1", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "← Sự kiện được phân công", exact: true }).click();
    await expect(cards).toHaveCount(6);

    await seed(1);
    await button("Làm mới danh sách").click();
    await expect(cards).toHaveCount(1);
    await card(0).getByRole("button", { name: "Từ chối", exact: true }).click();
    await expect(card(0).getByText("Đã từ chối", { exact: true })).toBeVisible();
    await expect(root.locator('[role="status"]')).toHaveText("Đã từ chối lời mời check-in.");

    await seed(1);
    await db.query("UPDATE event_checkin_staff SET expires_at=now()+interval '3 seconds' WHERE id=$1", [invitations[0].id]);
    await button("Làm mới danh sách").click();
    await expect(card(0).getByRole("button", { name: "Chấp nhận", exact: true })).toBeVisible();
    await expect(card(0).getByText("Lời mời hết hạn", { exact: true })).toBeVisible({ timeout: 7000 });
    await expect(card(0).getByRole("button")).toHaveCount(0);

    await page.locator(".auth-avatar-menu > button").click();
    await page.getByRole("menuitem", { name: /Đăng xuất/ }).click();
    await expect(root).toHaveCount(0);
    await login(other);
    await expect(root.getByRole("heading", { name: "Bạn chưa có lời mời check-in.", exact: true })).toBeVisible();
    await expect(root.getByRole("navigation")).toHaveCount(0);
    await expect(cards).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "a13-empty.png"), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`A13 Chrome PASS: API real, 4 viewports, image/null, all states, pagination shrink, decisions, 409, transport recovery, focus, expiry, scanner navigation, session. Screenshots: ${evidence}`);
    await context.close();
  } finally {
    if (browser) await browser.close();
    vite.kill();
  }
};
