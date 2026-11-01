const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { chromium, expect } = require("../../../client/node_modules/@playwright/test");

module.exports = async ({ base, user, other, password, seed, call }) => {
  const clientDir = path.resolve(__dirname, "../../../client");
  const origin = "http://localhost:5182";
  const evidence = process.env.A12_SCREENSHOTS || path.join(require("node:os").tmpdir(), "a12-browser");
  await fs.mkdir(evidence, { recursive: true });
  const vite = spawn(process.execPath, [path.join(clientDir, "node_modules/vite/bin/vite.js"),
    "--host", "localhost", "--port", "5182", "--strictPort"], {
    cwd: clientDir, env: { ...process.env, VITE_DEV_API_PROXY_TARGET: base.replace(/\/api$/, "") },
    windowsHide: true, stdio: "ignore",
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { ready = (await fetch(origin)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, "isolated Vite server ready");
    browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const root = page.locator(".a12-notifications");
    const cards = root.locator("article");
    const button = (name) => root.getByRole("button", { name, exact: true });
    async function login(account) {
      await page.goto(origin + "/notifications");
      await page.locator('input[name="email"]').fill(account.user.email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true }).click();
      await expect(root.getByRole("heading", { name: "Thông báo của bạn", exact: true })).toBeVisible();
    }
    await login(user);
    await expect(cards).toHaveCount(10);
    await expect(root.getByText("Trang 1 / 3", { exact: true })).toBeVisible();
    assert.equal(await page.locator("header.auth-header").count(), 1);
    assert.equal(await page.locator("footer.auth-footer").count(), 1);
    assert.equal(await root.getByText(/Mô phỏng/).count(), 0);
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({ path: path.join(evidence, `a12-${width}.png`), fullPage: true });
      const overflow = await page.evaluate(() => ({
        width: innerWidth, scroll: document.documentElement.scrollWidth,
        nodes: [...document.querySelectorAll("body *")].filter((el) => {
          const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0;
        }).slice(0, 12).map((el) => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })),
      }));
      assert.ok(overflow.scroll <= width, `no overflow ${width}: ${JSON.stringify(overflow)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await button("Tất cả").focus();
    await page.keyboard.press("Tab");
    await expect(button("Chưa đọc (21)")).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await root.locator(".a12-refresh svg").evaluate((el) => getComputedStyle(el).animationName), "none");

    await button("Chưa đọc (21)").click();
    await button("Sau").click();
    await expect(root.getByText("Trang 2 / 3", { exact: true })).toBeVisible();
    await button("Sau").click();
    await expect(cards).toHaveCount(1);
    await expect(button("Sau")).toBeDisabled();
    await button("Đánh dấu đã đọc").click();
    await expect(root.getByText("Trang 2 / 2", { exact: true })).toBeVisible();
    await expect(cards).toHaveCount(10);
    assert.equal((await call("GET", "/me/notifications/count", user.accessToken)).unreadCount, 20);
    await button("Đánh dấu tất cả đã đọc").click();
    await expect(root.getByRole("heading", { name: "Bạn đã đọc hết thông báo trên trang này.", exact: true })).toBeVisible();
    await expect(root.getByRole("navigation")).toHaveCount(0);
    await expect(button("Đánh dấu tất cả đã đọc")).toBeDisabled();
    await button("Xem tất cả thông báo").click();
    await expect(root.getByText("Trang 1 / 3", { exact: true })).toBeVisible();
    await expect(cards).toHaveCount(10);
    await expect(root.locator(".a12-unread")).toHaveCount(0);

    // Actual backend data throughout; only inject transport failures/delay for recovery checks.
    const inboxPattern = /\/api\/me\/notifications\?/;
    await page.route(inboxPattern, (route) => route.abort("failed"));
    await button("Làm mới").click();
    await expect(root.getByRole("heading", { name: "Không thể đồng bộ thông báo", exact: true })).toBeVisible();
    await expect(cards).toHaveCount(0);
    await page.unroute(inboxPattern);
    await button("Thử lại").click();
    await expect(cards).toHaveCount(10);

    await seed(21);
    await button("Làm mới").click();
    await expect(button("Chưa đọc (21)")).toBeVisible();
    const readPattern = /\/api\/me\/notifications\/[^/]+\/read$/;
    await page.route(readPattern, (route) => route.abort("failed"));
    await button("Đánh dấu đã đọc").first().click();
    await expect(root.getByRole("alert")).toBeVisible();
    await expect(root.locator(".a12-unread")).toHaveCount(10);
    assert.equal((await call("GET", "/me/notifications/count", user.accessToken)).unreadCount, 21);
    await page.unroute(readPattern);

    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(inboxPattern, async (route) => { await gate; await route.continue(); });
    await button("Chưa đọc (21)").click();
    await expect(root.getByRole("heading", { name: "Đang tải dữ liệu thông báo mới nhất…", exact: true })).toBeVisible();
    release();
    await expect(cards).toHaveCount(10);
    await page.unroute(inboxPattern);

    // Follow each target using server-provided data; target detail content is outside A12.
    for (const [label, expected] of [["Xem vé của tôi", /\/tickets$/], ["Xem phân công", /\/checkin$/], ["Xem đơn hàng", /\/payment-status\/[^/]+$/]]) {
      const current = await call("GET", "/me/notifications", user.accessToken);
      const target = label === "Xem đơn hàng" ? "ORDER" : label === "Xem phân công" ? "STAFF" : "TICKETS";
      // Random UUID ordering can put a kind on the next page. Find it through API pages.
      let targetPage = 0;
      if (!current.items.some((item) => item.target === target)) targetPage = 1;
      await button("Tất cả").click();
      await expect(cards).toHaveCount(10);
      if (targetPage) { await button("Sau").click(); await expect(root.getByText("Trang 2 / 3", { exact: true })).toBeVisible(); }
      await button(label).first().click();
      await expect(page).toHaveURL(expected);
      await page.goto(origin + "/notifications");
      await expect(cards).toHaveCount(10);
    }
    const beforeFocus = await call("GET", "/me/notifications/count", user.accessToken);
    await call("POST", "/me/notifications/read-all", user.accessToken);
    assert.ok(beforeFocus.unreadCount > 0);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(button("Chưa đọc (0)")).toBeVisible();

    // Sign out through the real shared header then open the other user's empty inbox.
    await page.locator(".auth-avatar-menu > button").click();
    await page.getByRole("menuitem", { name: /Đăng xuất/ }).click();
    await expect(root).toHaveCount(0);
    await login(other);
    await expect(root.getByRole("heading", { name: "Chưa có thông báo", exact: true })).toBeVisible();
    await expect(root.getByRole("navigation")).toHaveCount(0);
    await expect(root.getByRole("link", { name: "Khám phá sự kiện ngay", exact: true })).toHaveAttribute("href", "/explore");
    assert.deepEqual(errors, []);
    console.log(`A12 Chrome PASS: real API, four viewports, pagination/read/recovery/loading/targets/focus/session; screenshots ${evidence}`);
    await context.close();
  } finally {
    if (browser) await browser.close();
    vite.kill();
  }
};
