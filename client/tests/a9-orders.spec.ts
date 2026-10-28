import { test, expect } from "@playwright/test";
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL, trace: "off" });
test("A9 live API, search, pagination, detail, VAT, responsive and retry", async ({
  page,
}) => {
  const email = process.env.A9_TEST_EMAIL,
    password = process.env.A9_TEST_PASSWORD;
  if (!email || !password)
    throw Error("Set A9_TEST_EMAIL and A9_TEST_PASSWORD.");
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/auth\/login/);
  await page
    .getByLabel("Email hoặc Tên tài khoản", { exact: true })
    .fill(email);
  await page.getByLabel("Mật mã vũ trụ", { exact: true }).fill(password);
  const login = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true })
    .click();
  const credentials = (await (await login).json()).data;
  const headers = { Authorization: `Bearer ${credentials.accessToken}` };
  await expect(page.locator(".oh-page h1")).toContainText("Lịch sử đơn hàng");
  await expect(page.locator(".oh-table-panel tbody tr")).toHaveCount(5);
  await expect(page.locator(".auth-header")).toHaveCount(1);
  await expect(page.locator(".auth-footer")).toHaveCount(1);
  const history = await page.request.get("/api/me/order-history", { headers });
  expect(history.status()).toBe(200);
  const data = (await history.json()).data;
  expect(data.pagination.total).toBeGreaterThan(5);
  const before = await page.locator(".oh-kpis").innerText();
  await page.getByRole("button", { name: "Sau ›", exact: true }).click();
  await expect(page.locator(".oh-pagination")).toContainText(
    `6–${Math.min(10, data.pagination.total)}`,
  );
  await page
    .getByLabel("Tìm mã đơn hoặc tên sự kiện")
    .fill(data.items[0].event_title_snapshot);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".oh-table-panel tbody tr").first()).toContainText(
    data.items[0].event_title_snapshot,
  );
  expect(await page.locator(".oh-kpis").innerText()).toBe(before);
  const code = page.locator(".oh-code").first();
  await code.click();
  await expect(page.getByRole("dialog")).toContainText("Chi tiết đơn hàng");
  await expect(page.getByRole("dialog")).toContainText("Tổng tiền:");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xuất báo cáo VAT", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Chức năng đang trong quá trình phát triển",
  );
  await page.getByRole("button", { name: "Đóng thông báo" }).click();
  await page
    .getByLabel("Tìm mã đơn hoặc tên sự kiện")
    .fill("no-such-order-a9-test");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".oh-state")).toContainText("Không tìm thấy");
  await page.getByRole("button", { name: "Xem toàn bộ đơn hàng" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        overflow: Array.from(
          document.querySelectorAll(
            ".oh-page, .oh-toolbar, .oh-table-panel, .oh-support, .site-main, .oh-pagination",
          ),
        ).map((e) => ({
          class: e.className,
          right: e.getBoundingClientRect().right,
          width: e.getBoundingClientRect().width,
        })),
      })),
    ).toMatchObject({ width, scroll: width });
    await page.screenshot({
      path: `../docs/reports/stitch/evidence/A9_20261028_implementation/${width}.png`,
      fullPage: true,
      mask: [
        page.locator(".oh-code"),
        page.locator(".auth-header .auth-user-menu"),
      ],
    });
  }
  const invalid = await page.request.get("/api/me/order-history?group=FAILED", {
    headers,
  });
  expect(invalid.status()).toBe(400);
  const dates = await page.request.get(
    "/api/me/order-history?from=2026-10-29T00:00:00Z&toExclusive=2026-10-28T00:00:00Z",
    { headers },
  );
  expect(dates.status()).toBe(400);
  const absent = await page.request.get(
    "/api/me/order-history/00000000-0000-4000-8000-000000000000",
    { headers },
  );
  expect(absent.status()).toBe(404);
  const guest = await page.request.get(
    "http://localhost:8000/api/me/order-history",
  );
  expect(guest.status()).toBe(401);
  await page.route("**/api/me/order-history?**", (r) => r.abort());
  await page.getByRole("button", { name: /Đã thanh toán \(/ }).click();
  await expect(page.locator(".oh-state")).toContainText("Không kết nối");
  await page.unroute("**/api/me/order-history?**");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});
