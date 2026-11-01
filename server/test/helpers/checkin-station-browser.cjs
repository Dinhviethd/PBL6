const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { chromium, expect } = require("../../../client/node_modules/@playwright/test");

module.exports = async ({ base, owner, staff, buyer, password, event, second, cards, db }) => {
  const clientDir = path.resolve(__dirname, "../../../client");
  const origin = "http://localhost:5185";
  const evidence = path.resolve(__dirname, "../../../.local/qa/staff-checkin");
  await fs.mkdir(evidence, { recursive: true });
  const vite = spawn(process.execPath, [path.join(clientDir, "node_modules/vite/bin/vite.js"),
    "--host", "localhost", "--port", "5185", "--strictPort"], {
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
    browser = await chromium.launch({
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true,
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "America/New_York" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const station = page.locator(".qs-station");
    const result = station.getByRole("region", { name: "Kết quả quét" });
    const input = station.getByRole("textbox", { name: "Mã vé / nội dung QR", exact: true });
    const submit = station.getByRole("button", { name: "Xác thực ngay", exact: true });
    const camera = station.getByRole("button", { name: "Bật camera quét QR", exact: true });
    async function login(account, target) {
      await page.goto(origin + "/auth/login");
      await page.locator('input[name="email"]').fill(account.user.email);
      await page.locator('input[name="password"]').fill(password);
      const loggedIn = page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.status() === 200);
      await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true }).click();
      await loggedIn;
      await page.waitForURL((url) => !url.pathname.startsWith("/auth/"));
      await page.goto(origin + target);
      await expect(station.locator(".qs-event strong")).toHaveText(event.title);
      await expect(input).toBeEnabled();
    }
    async function scan(code, heading) {
      await input.fill(code);
      await submit.click();
      await expect(result.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await login(staff, `/checkin/events/${event.id}`);
    assert.equal(await page.locator("header.auth-header").count(), 1);
    assert.equal(await page.locator("footer.auth-footer").count(), 1);
    assert.equal(await page.locator(".qs-sidebar, .qs-header").count(), 0);
    await expect(station.locator(".qs-back")).toHaveAttribute("href", "/checkin");
    await expect(camera).toBeEnabled();
    assert.equal(await station.locator("video").evaluate((video) => video.srcObject), null);

    let posts = 0;
    page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/checkins")) posts++; });
    await page.route("**/checkin/events/*/checkins", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 450));
      await route.continue();
    });
    await input.fill(cards[3].code);
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(camera).toBeDisabled();
    await expect(result.getByRole("heading", { name: "Vé hợp lệ", exact: true })).toBeVisible();
    assert.equal(posts, 1, "one POST while pending");
    await page.unroute("**/checkin/events/*/checkins");
    await expect(result.getByText(buyer.user.name, { exact: true })).toBeVisible();
    await expect(result.getByText("VIP Thiên Hà", { exact: true })).toBeVisible();
    await expect(result.getByText(cards[3].code, { exact: true })).toBeVisible();
    const usedAt = await result.locator("dd").last().innerText();
    const checkin = (await db.query("SELECT checked_in_at FROM checkins WHERE ticket_id=$1", [cards[3].id]))[0];
    assert.equal(usedAt, new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(checkin.checked_in_at)));
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(evidence, `staff-${width}.png`), fullPage: true });
      const boxes = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        header: document.querySelector("header.auth-header").getBoundingClientRect().bottom,
        top: document.querySelector(".qs-back").getBoundingClientRect().top,
        camera: document.querySelector(".qs-left").getBoundingClientRect().toJSON(),
        result: document.querySelector(".qs-result").getBoundingClientRect().toJSON(),
      }));
      assert.ok(boxes.scroll <= width, `no overflow at ${width}: ${JSON.stringify(boxes)}`);
      assert.ok(boxes.top >= boxes.header, "content clears header");
      if (width === 390) assert.ok(boxes.result.top >= boxes.camera.bottom, "mobile stacks results after camera/input");
      else assert.ok(boxes.result.left >= boxes.camera.right, "two columns on tablet/desktop");
    }
    await result.getByRole("button", { name: "Kiểm tra vé tiếp theo →" }).click();
    await expect(input).toBeFocused();
    await scan(cards[3].code, "Vé đã sử dụng");
    assert.equal(await result.locator("dd").last().innerText(), usedAt);
    await scan("invalid-code", "Mã vé không hợp lệ");
    await expect(result.getByText(buyer.user.name, { exact: true })).toHaveCount(0);
    await scan(cards[2].code, "Vé đã bị hủy");
    const unpaidOrder = (await db.query("SELECT o.id,o.paid_at,o.paid_payment_id FROM tickets t JOIN order_items i ON i.id=t.order_item_id JOIN orders o ON o.id=i.order_id WHERE t.id=$1", [cards[5].id]))[0];
    await db.query("UPDATE orders SET status='PENDING_PAYMENT',paid_at=NULL,paid_payment_id=NULL WHERE id=$1", [unpaidOrder.id]);
    await scan(cards[5].code, "Vé chưa thanh toán");
    await db.query("UPDATE orders SET status='PAID',paid_at=$2,paid_payment_id=$3 WHERE id=$1", [unpaidOrder.id, unpaidOrder.paid_at, unpaidOrder.paid_payment_id]);
    await db.query("UPDATE events SET checkin_paused=true WHERE id=$1", [event.id]);
    await scan(cards[4].code, "Chưa mở hoặc đã đóng check-in");
    await db.query("UPDATE events SET checkin_paused=false WHERE id=$1", [event.id]);
    await db.query("UPDATE event_checkin_staff SET status='REVOKED' WHERE event_id=$1 AND user_id=$2", [event.id, staff.user.idUser]);
    await scan(cards[4].code, "Không có quyền check-in");
    await page.reload();
    await expect(station.getByRole("alert")).toContainText("Bạn chưa được cấp quyền");
    await expect(input).toBeDisabled();
    await expect(camera).toBeDisabled();
    await db.query("UPDATE event_checkin_staff SET status='ACTIVE' WHERE event_id=$1 AND user_id=$2", [event.id, staff.user.idUser]);
    await station.getByRole("button", { name: "Thử tải lại" }).click();
    await expect(input).toBeEnabled();

    const beforeFailure = posts;
    await page.route("**/checkin/events/*/checkins", (route) => route.abort("failed"));
    await scan(cards[4].code, "Chưa xác nhận được kết quả");
    await page.waitForTimeout(300);
    assert.equal(posts, beforeFailure + 1, "no automatic scan retry on lost response");
    await page.unroute("**/checkin/events/*/checkins");

    await page.evaluate(() => {
      window.originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    });
    await camera.click();
    await expect(station.locator(".qs-camera-error")).toContainText("Không mở được camera");
    await expect(input).toBeEnabled();
    await page.evaluate(() => {
      // Deterministic media tracks isolate app lifecycle from Chrome's fake-device
      // driver, which can return NotFoundError when reopened after disposal.
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext("2d").fillRect(0, 0, 640, 480);
        return canvas.captureStream(10);
      };
    });

    // Browser media simulation verifies lifecycle, not optical QR recognition.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await camera.click();
    await expect(station.locator(".qs-camera-status")).toContainText("CAMERA ĐANG QUÉT");
    await page.evaluate(() => { window.checkinTracks = document.querySelector(".qs-station video").srcObject.getTracks(); });
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      delete document.hidden;
    });
    await expect(station.locator(".qs-camera-status")).toContainText("CAMERA ĐANG TẮT");
    assert.ok(await page.evaluate(() => window.checkinTracks.every((track) => track.readyState === "ended")), "camera tracks stop when tab hidden");
    await camera.click();
    await expect(station.locator(".qs-camera-status")).toContainText("CAMERA ĐANG QUÉT");
    await page.evaluate(() => { window.checkinTracks = document.querySelector(".qs-station video").srcObject.getTracks(); });
    await station.locator(".qs-back").click();
    await expect(page).toHaveURL(origin + "/checkin");
    assert.ok(await page.evaluate(() => window.checkinTracks.every((track) => track.readyState === "ended")), "camera tracks stop on route leave");
    await page.goto(origin + `/checkin/events/${second.id}`);
    await expect(station.getByRole("alert")).toBeVisible();
    await expect(input).toBeDisabled();
    await expect(result.getByText(buyer.user.name, { exact: true })).toHaveCount(0);
    await page.goto(origin + `/checkin/events/${require("node:crypto").randomUUID()}`);
    await expect(station.getByRole("alert")).toContainText("Không tìm thấy sự kiện");
    await expect(camera).toBeDisabled();
    await page.goto(origin + `/checkin/events/${event.id}`);
    await expect(input).toBeEnabled();
    await scan(cards[3].code, "Vé đã sử dụng");
    // A real logout clears the mounted station and its previous customer's details.
    await page.getByTitle("Tài khoản", { exact: true }).click();
    await page.getByRole("menuitem", { name: "Đăng xuất", exact: true }).click();
    await expect(station).toHaveCount(0);
    await expect(page.getByText(buyer.user.name, { exact: true })).toHaveCount(0);

    // A separate authenticated organizer context checks the other shared consumer.
    const organizerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const organizerPage = await organizerContext.newPage();
    await organizerPage.goto(origin + "/auth/login");
    await organizerPage.locator('input[name="email"]').fill(owner.user.email);
    await organizerPage.locator('input[name="password"]').fill(password);
    await organizerPage.getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true }).click();
    await organizerPage.waitForURL((url) => !url.pathname.startsWith("/auth/"));
    await organizerPage.goto(origin + `/organizer/events/${event.id}/checkin`);
    const organizerStation = organizerPage.locator(".qs-station");
    await expect(organizerStation.locator(".qs-event strong")).toHaveText(event.title);
    assert.equal(await organizerPage.locator(".qs-sidebar").count(), 1);
    assert.equal(await organizerPage.locator("header.auth-header, footer.auth-footer").count(), 0);
    await organizerStation.getByRole("textbox", { name: "Mã vé / nội dung QR", exact: true }).fill(cards[4].code);
    await organizerStation.getByRole("button", { name: "Xác thực ngay" }).click();
    await expect(organizerStation.getByRole("heading", { name: "Vé hợp lệ", exact: true })).toBeVisible();
    await expect(organizerStation.getByText(buyer.user.name, { exact: true })).toBeVisible();
    for (const width of [1440, 768, 390]) {
      await organizerPage.setViewportSize({ width, height: 1000 });
      await organizerPage.screenshot({ path: path.join(evidence, `organizer-${width}.png`), fullPage: true });
      assert.ok(await organizerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    assert.deepEqual(errors, []);
    await organizerContext.close();
    await context.close();
    console.log(JSON.stringify({ result: "PASS", suite: "shared check-in browser", evidence, posts }));
  } finally {
    await browser?.close();
    vite.kill();
  }
};
