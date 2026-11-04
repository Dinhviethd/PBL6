const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { c12Fixture } = require("../../server/test/fixtures/c12.cjs");

// Explicit, isolated database required. No requests to the default app on port 8000.
(async () => {
  if (!process.env.C12_TEST_DATABASE_URL)
    throw Error("Set C12_TEST_DATABASE_URL");
  const out = path.resolve(
    process.env.C12_EVIDENCE_DIR ||
      "../docs/reports/stitch/evidence/C12_20261105_001401",
  );
  fs.mkdirSync(out, { recursive: true });
  const fixture = await c12Fixture(process.env.C12_TEST_DATABASE_URL, 8033);
  for (let i = 0; i < 9; i++) {
    const id = randomUUID();
    await fixture.db.query(
      `INSERT INTO users("idUser",name,email,password) SELECT $1,$2,$3,password FROM users WHERE "idUser"=$4`,
      [
        id,
        "C12 Reader " + i,
        `reader.${id}@example.test`,
        fixture.accounts.manager.id,
      ],
    );
    await fixture.db.query(
      `INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code IN ('USER','ADMIN')`,
      [id],
    );
  }
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const checkpoints = [];
  const errors = [];
  const record = (name) => {
    checkpoints.push(name);
    console.log("PASS", name);
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  async function login(targetPage, key) {
    await targetPage.goto("http://localhost:5183/admin/settings");
    await targetPage
      .getByLabel("Email hoặc Tên tài khoản", { exact: true })
      .fill(fixture.accounts[key].email);
    await targetPage
      .getByLabel("Mật mã vũ trụ", { exact: true })
      .fill(fixture.accounts[key].password);
    await targetPage
      .getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true })
      .click();
    await targetPage
      .getByRole("heading", {
        name: "Cấu hình hệ thống & cổng thanh toán",
        exact: true,
      })
      .waitFor();
    await targetPage
      .getByText(fixture.accounts[key].email, { exact: true })
      .first()
      .waitFor();
  }
  try {
    await login(page, "manager");
    await expect(
      page.getByRole("heading", { name: "VNPay Sandbox", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("ĐÃ CẤU HÌNH · CHƯA KÍCH HOẠT", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Thêm quản trị viên", exact: true }),
    ).toBeVisible();
    assert.equal(await page.locator(".admin-sidebar").count(), 1);
    assert.equal(await page.locator(".admin-header").count(), 1);
    for (const name of [
      "Sao lưu dữ liệu",
      "Bảo trì hệ thống",
      "Lưu tất cả cấu hình",
      "Thêm Cổng Thanh Toán Mới",
      "Nhật ký kiểm toán",
    ]) {
      assert.equal(
        await page.getByRole("button", { name, exact: true }).count(),
        0,
      );
    }
    record(
      "real payment-information + manager catalog + shared shell + removed actions",
    );
    await page.getByRole("button", { name: "Trang tiếp", exact: true }).click();
    await expect(page.getByText(/Trang 2\//)).toBeVisible();
    await page
      .getByRole("button", { name: "Trang trước", exact: true })
      .click();
    await expect(page.getByText(/Trang 1\//)).toBeVisible();
    record("real pagination over ten admins");
    for (const [width, height] of [
      [1440, 1000],
      [1280, 900],
      [768, 1024],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, "viewport overflow at " + width);
      await page.screenshot({
        path: path.join(out, `c12-${width}.png`),
        fullPage: true,
      });
      record("viewport " + width + " no page overflow");
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByLabel("Tìm quản trị viên", { exact: true })
      .fill("c12-no-result-" + Date.now());
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await expect(
      page.getByText("Không tìm thấy quản trị viên phù hợp.", { exact: true }),
    ).toBeVisible();
    record("search + empty state");
    await page.getByLabel("Tìm quản trị viên", { exact: true }).fill("");
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await page
      .getByRole("button", { name: "Thêm quản trị viên", exact: true })
      .click();
    let dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          Boolean(
            document
              .querySelector('[role="dialog"]')
              ?.contains(document.activeElement),
          ),
        ),
        true,
      );
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.screenshot({
      path: path.join(out, "c12-dialog-390.png"),
      fullPage: true,
    });
    record("mobile dialog + keyboard focus trap");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await dialog
      .getByLabel("Email tài khoản", { exact: true })
      .fill(fixture.accounts.candidate.email);
    await dialog
      .getByRole("button", { name: "Cấp quyền ADMIN", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText("Đã cập nhật quyền quản trị viên.", { exact: false }),
    ).toBeVisible();
    record("grant existing account via real API + success");
    await page
      .getByLabel("Tìm quản trị viên", { exact: true })
      .fill(fixture.accounts.candidate.email);
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    const row = page
      .locator("tbody tr")
      .filter({ hasText: fixture.accounts.candidate.email });
    await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByLabel("Khóa tài khoản", { exact: true }),
    ).toBeEnabled();
    await dialog.getByLabel("Khóa tài khoản", { exact: true }).check();
    await dialog
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Browser fixture lock");
    page.once("dialog", (confirm) => confirm.accept());
    await dialog
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(row.getByText("ĐÃ KHÓA", { exact: true })).toBeVisible();
    record("lock admin via real API + confirmation + refreshed state");
    await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByLabel("Khóa tài khoản", { exact: true }),
    ).toBeChecked();
    await dialog.getByLabel("Khóa tài khoản", { exact: true }).uncheck();
    await dialog.getByLabel("Quản lý quản trị viên", { exact: true }).check();
    await dialog
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Browser fixture unlock and manager");
    page.once("dialog", (confirm) => confirm.accept());
    await dialog
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      row.getByText("Có quyền quản lý", { exact: true }),
    ).toBeVisible();
    record("unlock + management permission via real API");
    // Conflict generated by another real request, not an intercepted success response.
    await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByLabel("Khóa tài khoản", { exact: true }),
    ).toBeEnabled();
    const token = await fixture.login("manager");
    const detail = (
      await fixture.call(
        "GET",
        "/admin/administrators/" + fixture.accounts.candidate.id,
        undefined,
        token,
      )
    ).body.data;
    const concurrent = await fixture.call(
      "PATCH",
      "/admin/administrators/" + detail.id,
      {
        version: detail.version,
        admin: true,
        manager: false,
        locked: false,
        reason: "Other session changed role",
      },
      token,
    );
    assert.equal(concurrent.status, 200);
    await dialog.getByLabel("Khóa tài khoản", { exact: true }).check();
    await dialog
      .getByLabel("Lý do thay đổi", { exact: true })
      .fill("Stale browser edit");
    page.once("dialog", (confirm) => confirm.accept());
    await dialog
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Thông tin đã thay đổi",
    );
    await expect(
      dialog.getByRole("button", { name: "Lưu thay đổi", exact: true }),
    ).toBeDisabled();
    await dialog
      .getByRole("button", { name: "Tải lại trước khi thử lại", exact: true })
      .click();
    await expect(
      dialog.getByLabel("Quản lý quản trị viên", { exact: true }),
    ).not.toBeChecked();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    record("real version conflict + reload + keyboard Escape");
    // Deliberate fault injection only for frontend state handling; no mock data in product.
    await page.route("**/api/admin/settings/payment-information", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "C12 fixture unavailable",
        }),
      }),
    );
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "C12 fixture unavailable" }),
    ).toBeVisible();
    await page.unroute("**/api/admin/settings/payment-information");
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "VNPay Sandbox", exact: true }),
    ).toBeVisible();
    record("payment error + retry restores real data");
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(
      "**/api/admin/settings/payment-information",
      async (route) => {
        await held;
        await route.continue();
      },
    );
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(
      page.getByText("Đang tải thông tin thanh toán…", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Làm mới", exact: true }),
    ).toBeDisabled();
    release();
    await expect(
      page.getByRole("heading", { name: "VNPay Sandbox", exact: true }),
    ).toBeVisible();
    await page.unroute("**/api/admin/settings/payment-information");
    record("loading state + refresh disabled while pending");
    const readerContext = await browser.newContext();
    const reader = await readerContext.newPage();
    await login(reader, "admin");
    assert.equal(
      await reader
        .getByRole("button", { name: "Thêm quản trị viên", exact: true })
        .count(),
      0,
    );
    const readerRow = reader
      .locator("tbody tr")
      .filter({ hasText: fixture.accounts.admin.email });
    await readerRow
      .getByRole("button", { name: "Xem chi tiết", exact: true })
      .click();
    await expect(
      reader.getByRole("dialog").getByLabel("Khóa tài khoản", { exact: true }),
    ).toBeDisabled();
    assert.equal(
      await reader
        .getByRole("button", { name: "Lưu thay đổi", exact: true })
        .count(),
      0,
    );
    await readerContext.close();
    record("ordinary ADMIN read-only management UI");
    assert.deepEqual(errors, []);
    record("no browser page errors");
  } finally {
    fs.writeFileSync(
      path.join(out, "browser-results.json"),
      JSON.stringify({ checkpoints, errors }, null, 2),
    );
    await context.close();
    await browser.close();
    await fixture.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
