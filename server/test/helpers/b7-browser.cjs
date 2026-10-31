const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { chromium } = require("../../../client/node_modules/@playwright/test");

module.exports = async function b7Browser(fixture) {
  const { base, owner, event, event2, paid, pending, cancelled, expired, payment, paymentDb, app, buyerPrincipal } = fixture;
  const clientDir = path.resolve(__dirname, "../../../client");
  const evidence = path.resolve(process.env.B7_EVIDENCE_DIR || path.join(require("node:os").tmpdir(), `eventhub-b7-${Date.now()}`));
  await fs.mkdir(evidence, { recursive: true });
  const vite = spawn(process.execPath, [path.join(clientDir, "node_modules/vite/bin/vite.js"),
    "--host", "localhost", "--port", "5178", "--strictPort"], {
    cwd: clientDir,
    env: { ...process.env, VITE_DEV_API_PROXY_TARGET: base.replace(/\/api$/, "") },
    windowsHide: true, stdio: "ignore",
  });
  let browser;
  const list = `/organizer/events/${event.id}/orders`;
  const detail = `${list}/${paid.id}`;
  const origin = "http://localhost:5178";
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      try { ready = (await fetch(origin)).ok; } catch { /* Vite starting. */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, "B7 Vite did not start");
    browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
    for (const width of [1440, 1024, 768, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin + list);
      await page.locator('input[name="email"]').fill(owner.user.email);
      await page.locator('input[name="password"]').fill("Fixture2026!");
      await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY" }).click();
      await page.getByRole("heading", { name: "Quản lý đơn hàng & Giao dịch vé" }).waitFor();
      await page.getByRole("button", { name: /^Đã thanh toán \(/ }).click();
      const link = page.getByRole("link", { name: `Chi tiết đơn ${paid.order_code}`, exact: true });
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.getByRole("heading", { name: `Đơn hàng #${paid.order_code}`, exact: true }).waitFor();
      await page.getByAltText(/^Mã QR vé/).first().waitFor();
      assert.equal(await page.locator(".b7-total > strong").innerText(), "200.000 đ");
      assert.equal(await page.locator(".b7-ticket").count(), 2);
      await page.getByText("0900000001", { exact: true }).waitFor();
      await page.getByText("Số điện thoại trong hồ sơ hiện tại", { exact: true }).waitFor();
      assert.equal(await page.locator(".b7-bank-number").innerText(), "000000001234");
      assert.equal(await page.locator(".b7-timeline-item").count(), 5);
      assert.ok(await page.locator(".b7-timeline-item time").count() >= 6);
      assert.equal(await page.getByText("Cấp mã QR vé", { exact: true }).count(), 2);
      assert.equal(await page.getByText(/Cấp vé số hóa.*Gửi Email/).count(), 0);
      await page.getByText("Quét VietQR — tối đa 15 phút", { exact: true }).waitFor();
      const originalTimes = await page.locator(".b7-timeline time").evaluateAll((items) => items.map((item) => item.dateTime));
      assert.equal(await page.locator(".site-header,.site-footer").count(), 0);
      // Each demo section is a real keyboard-operable control with no API mutation.
      const posts = [];
      const record = (request) => { if (request.method() !== "GET") posts.push(request.url()); };
      page.on("request", record);
      for (const button of [
        page.getByRole("button", { name: /^KYC Level 2/ }),
        page.getByRole("button", { name: /^Đánh giá rủi ro/ }),
        page.getByRole("button", { name: "Tải lại QR", exact: true }),
        page.getByRole("button", { name: /Hỗ trợ cổng sự kiện/ }),
      ]) {
        await button.focus();
        await page.keyboard.press("Enter");
        await page.getByText("Chức năng đang được phát triển", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Đóng thông báo", exact: true }).click();
      }
      page.off("request", record);
      assert.deepEqual(posts, []);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: path.join(evidence, `${width}.png`), fullPage: true,
        mask: [page.locator(".b7-qr-frame")] });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      if (width <= 768) {
        await page.getByRole("button", { name: "Mở menu", exact: true }).click();
        await page.locator(".osb-nav a").first().waitFor({ state: "visible" });
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("button", { name: "Mở menu", exact: true }).getAttribute("aria-expanded"), "false");
      }
      await page.evaluate(() => { window.print = () => { document.body.dataset.b7Printed = "yes"; }; });
      await page.getByRole("button", { name: "In vé", exact: true }).click();
      await page.waitForFunction(() => document.body.dataset.b7Printed === "yes");
      assert.deepEqual(await page.locator(".b7-timeline time").evaluateAll((items) => items.map((item) => item.dateTime)), originalTimes);
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.locator(".b7-print-root img").count(), 2);
      assert.equal(await page.locator(".b7-print-root").isVisible(), true);
      assert.ok((await page.pdf({ format: "A4" })).length > 1000);
      await page.emulateMedia({ media: "screen" });
      await page.getByRole("link", { name: "Quay lại danh sách đơn hàng" }).click();
      assert.equal(await page.getByRole("button", { name: /^Đã thanh toán \(/ }).getAttribute("aria-pressed"), "true");
      await page.goto(origin + detail);
      await page.reload();
      await page.getByAltText(/^Mã QR vé/).first().waitFor();
      // Deep links for non-PAID states must keep detail metadata, never request preview.
      for (const [order, label] of [[pending, "Chờ thanh toán"], [cancelled, "Đã hủy"], [expired, "Đã hết hạn"]]) {
        await page.goto(origin + `${list}/${order.id}`);
        await page.getByRole("heading", { name: `Đơn hàng #${order.order_code}` }).waitFor();
        assert.equal(await page.locator(".b7-status-strip .b7-badge").innerText(), label);
        assert.equal(await page.getByRole("button", { name: "In vé", exact: true }).isDisabled(), true);
        assert.equal(await page.locator(".b7-qr-frame img").count(), 0);
      }
      if (width === 1440) {
        await paymentDb.query("UPDATE payments SET requires_review=true,review_reason='B7_UI' WHERE id=$1", [payment.id]);
        await page.goto(origin + detail);
        await page.getByText("Đơn cần tra soát thanh toán. Chưa thể xem hoặc in QR.").waitFor();
        assert.equal(await page.locator(".b7-qr-frame img").count(), 0);
        await paymentDb.query("UPDATE payments SET requires_review=false WHERE id=$1", [payment.id]);
        await page.goto(origin + `/organizer/events/${event2.id}/orders/${paid.id}`);
        await page.getByRole("alert").waitFor();
        assert.equal(await page.locator(".b7-customer-grid").count(), 0);
        // Inject only transport failure to exercise retry; successful data always comes from real API.
        await page.route(`**/api${detail}`, (route) => route.abort("failed"));
        await page.goto(origin + detail);
        await page.getByRole("alert").waitFor();
        await page.unroute(`**/api${detail}`);
        await page.getByRole("button", { name: "Thử tải lại", exact: true }).click();
        await page.getByAltText(/^Mã QR vé/).first().waitFor();
        // Revalidate preview at print time: review becoming active must block printing.
        await paymentDb.query("UPDATE payments SET requires_review=true,review_reason='B7_PRINT' WHERE id=$1", [payment.id]);
        await page.evaluate(() => { delete document.body.dataset.b7Printed; });
        await page.getByRole("button", { name: "In vé", exact: true }).click();
        await page.getByRole("alert").waitFor();
        assert.equal(await page.evaluate(() => document.body.dataset.b7Printed), undefined);
        await paymentDb.query("UPDATE payments SET requires_review=false WHERE id=$1", [payment.id]);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    // More than fifty orders exercise the 10-row UI pages across API batch boundaries.
    for (let index = 0; index < 51; index++) {
      const type = (await app.orders.types(event.id))[0];
      await app.booking.createOrder(buyerPrincipal, event.id, [{ ticketTypeId: type.id, quantity: 1 }], randomUUID());
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(origin + list);
    await page.locator('input[name="email"]').fill(owner.user.email);
    await page.locator('input[name="password"]').fill("Fixture2026!");
    await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY" }).click();
    await page.getByRole("heading", { name: "Quản lý đơn hàng & Giao dịch vé" }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".b6-detail-link").length === 10);
    for (let index = 0; index < 5; index++) {
      const response = index === 4 ? page.waitForResponse((r) => r.url().includes("order-manager?page=1") && r.status() === 200) : null;
      await page.getByRole("button", { name: "Trang sau", exact: true }).click();
      if (response) await response;
    }
    await page.waitForFunction(() => document.querySelectorAll(".b6-detail-link").length === 5);
    assert.equal(await page.locator(".b6-detail-link").count(), 5);
    await page.locator(".b6-detail-link").first().click();
    await page.locator(".b7-status-strip").waitFor();
    await page.getByRole("link", { name: "Quay lại danh sách đơn hàng" }).click();
    await page.getByText("Trang 6 / 6", { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".b6-detail-link").length === 5);
    await context.close();
    console.log("B7 Chrome PASS: 1440/1024/768/390, B6 links/filter/page6 restore, deep-link/reload, four states, QR/print/PDF, review race, error/retry/404, demo keyboard toast/no mutation, mobile menu, overflow");
  } finally {
    if (browser) await browser.close();
    vite.kill();
  }
};
