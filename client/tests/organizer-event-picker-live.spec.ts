import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.skip(process.env.B3_PICKER_TEST !== "1", "Requires isolated organizer API and fixture");
test.use({ channel: "chrome" });

test("edit and ticket pickers share QR grid, keep event IDs and work on mobile", async ({ page, context }) => {
  const fixture = JSON.parse(readFileSync(path.resolve("../server/.local/b3-fixture.json"), "utf8"));
  const login = await context.request.post("/api/auth/login", { data: { email: fixture.email, password: fixture.password } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).data.accessToken;
  const list = await context.request.get("/api/organizer/events?page=0&limit=6", { headers: { Authorization: `Bearer ${token}` } });
  expect(list.status()).toBe(200);
  const events = (await list.json()).data;
  expect(events.length).toBeGreaterThan(0);
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  await page.goto("/organizer");
  await page.locator(".osb-nav").getByRole("link", { name: "Chỉnh sửa sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events$/);
  await expect(page.getByRole("heading", { name: "Chọn sự kiện để chỉnh sửa", exact: true })).toBeVisible();
  await expect(page.locator(".qse-grid .qse-card")).toHaveCount(events.length);
  const first = page.locator(".qse-grid .qse-scan-button").first();
  await expect(first).toHaveAttribute("href", `/organizer/events/${events[0].id}`);
  await first.click();
  await expect(page.getByRole("heading", { name: "Chỉnh sửa sự kiện", exact: true })).toBeVisible();
  await expect(page.locator('[name="title"]')).toHaveValue(events[0].title);
  await page.goto("/organizer/events/tickets");
  await expect(page.getByRole("heading", { name: "Chọn sự kiện để quản lý loại vé" })).toBeVisible();
  await expect(page.locator(".qse-grid .qse-card")).toHaveCount(events.length);
  await expect(page.locator(".qse-grid .qse-scan-button").first()).toHaveAttribute("href", `/organizer/events/${events[0].id}/tickets`);
  await page.locator(".qse-grid .qse-scan-button").first().click();
  await expect(page).toHaveURL(new RegExp(`/organizer/events/${events[0].id}/tickets$`));
  await expect(page.getByRole("heading", { name: "Quản lý loại vé & Sức chứa" })).toBeVisible();
  await page.getByRole("link", { name: "Chọn sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/tickets$/);
  const output = path.resolve("../docs/reports/stitch/evidence/B3_B5_20261101_event_pickers");
  mkdirSync(output, { recursive: true });
  for (const route of ["/organizer/events/", "/organizer/events/tickets"]) {
    await page.goto(route);
    await expect(page.locator(".qse-grid .qse-card")).toHaveCount(events.length);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: path.join(output, `${route.includes("tickets") ? "tickets" : "edit"}-${width}.png`), fullPage: true });
    }
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await expect(page.locator('.osb-nav a[aria-current="page"]')).toHaveText(route.includes("tickets") ? "Quản lý loại vé" : "Chỉnh sửa sự kiện");
    await page.getByRole("button", { name: "Đóng điều hướng", exact: true }).click({ position: { x: 380, y: 400 } });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/organizer");
  await page.locator(".osb-nav").getByRole("link", { name: "Quản lý loại vé", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/tickets$/);
  await page.goto("/organizer/qr-scan");
  await expect(page.getByRole("heading", { name: "Chọn sự kiện để quét mã QR" })).toBeVisible();
  await expect(page.locator(".qse-grid .qse-scan-button").first()).toHaveAttribute("href", `/organizer/events/${events[0].id}/checkin`);
  expect(failures).toEqual([]);
});
