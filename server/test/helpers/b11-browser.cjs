const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { chromium } = require("../../../client/node_modules/@playwright/test");
module.exports = async ({ base, owner, staff, other, event }) => {
  const clientDir = path.resolve(__dirname, "../../../client"),
    origin = "http://localhost:5179";
  const evidence =
    process.env.B11_SCREENSHOTS ||
    path.join(require("node:os").tmpdir(), "b11-existing-browser");
  await fs.mkdir(evidence, { recursive: true });
  const vite = spawn(
    process.execPath,
    [
      path.join(clientDir, "node_modules/vite/bin/vite.js"),
      "--host",
      "localhost",
      "--port",
      "5179",
      "--strictPort",
    ],
    {
      cwd: clientDir,
      env: {
        ...process.env,
        VITE_DEV_API_PROXY_TARGET: base.replace(/\/api$/, ""),
      },
      windowsHide: true,
      stdio: "ignore",
    },
  );
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        ready = (await fetch(origin)).ok;
      } catch {}
      if (ready) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready);
    browser = await chromium.launch({
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: true,
    });
    async function login(page, email, target = "/organizer/profile") {
      await page.goto(origin + target);
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill("LocalDemo2026!");
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().endsWith("/api/auth/login") && r.status() === 200,
        ),
        page.getByRole("button", { name: "ĐĂNG NHẬP NGAY" }).click(),
      ]);
      if (target === "/organizer/profile")
        await page.locator("#b11-organizationName").waitFor();
      else
        await page
          .getByRole("heading", { name: "Phân công check-in", exact: true })
          .waitFor();
    }
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page, owner.user.email);
    assert.equal(
      await page.locator("#b11-businessName").inputValue(),
      "New Legal Company",
    );
    assert.equal(await page.locator("#b11-legalRepresentativeName").count(), 0);
    assert.equal(await page.getByRole("checkbox").count(), 0);
    await page.locator("#b11-organizationName").fill("Existing Application UI");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Thông tin hồ sơ đã được lưu." })
      .waitFor();
    await page.reload();
    await page.locator("#b11-organizationName").waitFor();
    assert.equal(
      await page.locator("#b11-organizationName").inputValue(),
      "Existing Application UI",
    );
    await page.locator("#b11-organizationName").fill("Not saved");
    await page
      .getByRole("button", { name: "Hủy thay đổi", exact: true })
      .click();
    assert.equal(
      await page.locator("#b11-organizationName").inputValue(),
      "Existing Application UI",
    );
    const png = await require("sharp")({
      create: { width: 32, height: 32, channels: 3, background: "#7c3aed" },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Thay đổi logo BTC", { exact: true })
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await page
      .getByRole("status")
      .filter({ hasText: "Logo đã tải lên." })
      .waitFor();
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Thông tin hồ sơ đã được lưu." })
      .waitFor();
    await page.locator("#b11-businessName").fill("UI pending legal");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await page.getByText(/Yêu cầu ngày .* đang chờ duyệt/).waitFor();
    assert.equal(
      await page.locator("#b11-businessName").inputValue(),
      "New Legal Company",
    );
    await page
      .getByRole("button", { name: "Thêm nhân sự kiểm soát vé", exact: true })
      .click();
    await page
      .getByLabel("Email tài khoản đã đăng ký", { exact: true })
      .fill(staff.user.email);
    await page
      .getByLabel("Chọn sự kiện để gửi lời mời check-in", { exact: true })
      .selectOption(event.id);
    await page
      .getByRole("button", { name: "Gửi lời mời", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const recipientContext = await browser.newContext(),
      recipient = await recipientContext.newPage();
    await login(recipient, staff.user.email, "/organizer/team-invitations");
    await recipient
      .getByRole("button", { name: "Chấp nhận", exact: true })
      .click();
    await recipient.getByText("Đã tham gia", { exact: false }).waitFor();
    await page.reload();
    await page.locator("#b11-organizationName").waitFor();
    await page
      .getByRole("button", {
        name: `Phân công ${staff.user.email}`,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByText("Đã tham gia", { exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + "/organizer/profile");
      await page.locator("#b11-organizationName").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: path.join(evidence, width + ".png"),
        fullPage: true,
      });
      if (width <= 900) {
        await page
          .getByRole("button", { name: "Mở menu", exact: true })
          .click();
        await page
          .locator('.osb-sidebar a[aria-current="page"]')
          .waitFor({ state: "visible" });
        await page.keyboard.press("Escape");
      }
    }
    const missingContext = await browser.newContext(),
      missingPage = await missingContext.newPage();
    await login(missingPage, other.user.email);
    await missingPage
      .getByRole("status")
      .filter({ hasText: "Tài khoản chưa có hồ sơ tổ chức đã duyệt" })
      .waitFor();
    assert.equal(
      await missingPage.locator("#b11-organizationName").isDisabled(),
      true,
    );
    await missingContext.close();
    await page.locator("#b11-password-current").fill("LocalDemo2026!");
    await page.locator("#b11-password-next").fill("B11Changed2026!");
    await page.locator("#b11-password-confirm").fill("B11Changed2026!");
    await page
      .getByRole("button", { name: "Lưu tất cả thiết lập", exact: true })
      .click();
    await page.waitForURL("**/auth/login");
    assert.deepEqual(errors, []);
    await recipientContext.close();
    await context.close();
    console.log(
      "B11 existing-tables Chrome PASS: approved application save/reload/cancel/logo/legal pending; event invitation/accept; missing application; password logout; four viewports.",
    );
  } finally {
    if (browser) await browser.close();
    vite.kill();
  }
};
