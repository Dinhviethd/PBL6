import { test, expect, type APIRequestContext } from "@playwright/test";
import type { Event, TicketType } from "../src/features/ticketing/types";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const money = (value: number | string) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(Number(value));

async function liveEvent(request: APIRequestContext) {
  const list = await request.get("/api/events");
  expect(list.ok()).toBeTruthy();
  const entries = (await list.json()).data.items;
  for (const entry of entries) {
    const response = await request.get("/api/events/" + entry.slug);
    expect(response.ok()).toBeTruthy();
    const event: Event = (await response.json()).data;
    const available = (event.ticketTypes ?? []).filter((type) =>
      !event.sales_paused && Date.parse(event.ends_at) > Date.now() &&
      Date.parse(type.sale_starts_at) <= Date.now() && Date.parse(type.sale_ends_at) > Date.now() &&
      type.capacity - type.reserved_quantity - type.sold_quantity >= 10 && Number(type.waiting_count ?? 0) === 0);
    if (available.length >= 2) return { event, available };
  }
  throw new Error("Live test requires an event with two currently available ticket types.");
}

test("A3 live data, aggregate quantity limit, estimate and guest redirect", async ({ page, request }) => {
  const { event, available } = await liveEvent(request);
  const requests: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/orders")) requests.push(r.url()); });
  await page.goto("/events/" + event.slug);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(event.title);
  await expect(page).toHaveTitle(event.title + " | EventHub");
  await expect(page.locator(".auth-header")).toHaveCount(1);
  await expect(page.locator(".auth-footer")).toHaveCount(1);
  await expect(page.locator(".site-header")).toHaveCount(0);
  await expect(page.locator(".event-detail-ticket")).toHaveCount(event.ticketTypes!.length);
  await expect(page.locator(".event-detail-description")).toHaveText(event.description);
  const like = page.getByRole("button", { name: "Yêu thích sự kiện", exact: true });
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await like.click();
  await page.reload();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".event-detail-guidance")).toContainText("16 tuổi");
  const buy = page.getByRole("button", { name: "Tiến hành đặt vé", exact: true });
  await expect(buy).toBeDisabled();
  const plus = (type: TicketType) => page.getByRole("button", { name: "Tăng vé: " + type.name, exact: true });
  for (let n = 0; n < 9; n++) await plus(available[0]).click();
  await plus(available[1]).focus();
  await page.keyboard.press("Enter");
  await expect(plus(available[0])).toBeDisabled();
  await expect(plus(available[1])).toBeDisabled();
  await expect(page.locator(".event-detail-summary-total strong")).toHaveText(
    money(Number(available[0].price_amount) * 9 + Number(available[1].price_amount)));
  await page.getByRole("button", { name: "Giảm vé: " + available[0].name, exact: true }).click();
  await expect(plus(available[1])).toBeEnabled();
  expect(requests).toHaveLength(0);
  await expect(page.locator(".event-detail-page")).not.toContainText("mã giảm giá");
  const map = page.getByRole("link", { name: "Mở Google Maps", exact: true });
  expect(new URL((await map.getAttribute("href"))!).searchParams.get("query")).toContain(event.address);
  await buy.click();
  await expect(page).toHaveURL(/\/auth\/login/);
  expect(requests).toHaveLength(0);
});

test("A3 recovers from network failure and missing event", async ({ page, request }) => {
  const { event } = await liveEvent(request);
  await page.route("**/api/events/" + event.slug, (route) => route.abort());
  await page.goto("/events/" + event.slug);
  await expect(page.getByRole("heading", { name: "Không tải được sự kiện" })).toBeVisible();
  await page.unroute("**/api/events/" + event.slug);
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(event.title);
  await page.goto("/events/a3-nonexistent-event-20261027");
  await expect(page.getByRole("heading", { name: "Không tải được sự kiện" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiến hành đặt vé" })).toHaveCount(0);
});

test("A3 distinguishes closed sales and does not allow selecting them", async ({ page, request }) => {
  const list = (await (await request.get("/api/events")).json()).data.items;
  const event: Event = (await (await request.get("/api/events/" + list[0].slug)).json()).data;
  const closed = event.ticketTypes!.filter((type) => Date.parse(type.sale_ends_at) <= Date.now());
  expect(closed.length, "Live fixture needs a closed ticket type").toBeGreaterThan(0);
  await page.goto("/events/" + event.slug);
  for (const type of closed) {
    const card = page.locator(`[data-ticket-id="${type.id}"]`);
    await expect(card).toContainText("Đã đóng bán");
    await expect(card.getByRole("button", { name: "Tăng vé: " + type.name, exact: true })).toHaveCount(0);
  }
});

test("A3 authenticated order uses backend total, then releases reservation", async ({ page, request }) => {
  const { event, available } = await liveEvent(request);
  await page.goto("/events/" + event.slug);
  await page.getByRole("button", { name: "Tăng vé: " + available[0].name, exact: true }).click();
  await page.getByRole("button", { name: "Tiến hành đặt vé", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel("Email hoặc Tên tài khoản", { exact: true }).fill("customer@example.test");
  await page.getByLabel("Mật mã vũ trụ", { exact: true }).fill(process.env.DEMO_PASSWORD || "LocalDemo2026!");
  await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/events/" + event.slug));
  await page.getByRole("button", { name: "Tăng vé: " + available[0].name, exact: true }).click();
  const responsePromise = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/orders"));
  await page.getByRole("button", { name: "Tiến hành đặt vé", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const order = (await response.json()).data;
  try {
    expect(response.request().postDataJSON()).toEqual({ eventId: event.id, items: [{ ticketTypeId: available[0].id, quantity: 1 }] });
    expect(response.request().headers()["idempotency-key"]).toBeTruthy();
    expect(order.total_amount).toBe(available[0].price_amount);
    await expect(page).toHaveURL(new RegExp("/checkout/" + order.id));
    await expect(page.locator(".total strong")).toHaveText(money(order.total_amount));
  } finally {
    // Stay in the normal A3 -> A6 navigation flow; cancel the order just created.
    await expect(page).toHaveURL(new RegExp("/checkout/" + order.id));
    const cancelled = page.waitForResponse((r) => r.url().endsWith("/orders/" + order.id + "/cancel"));
    await page.getByRole("button", { name: "Hủy đơn chưa thanh toán", exact: true }).click();
    expect((await cancelled).ok()).toBeTruthy();
  }
});

test("web session restores after a full reload on A3", async ({ page, request }) => {
  const { event, available } = await liveEvent(request);
  await page.goto("/events/" + event.slug);
  await page.getByRole("button", { name: "Tăng vé: " + available[0].name, exact: true }).click();
  await page.getByRole("button", { name: "Tiến hành đặt vé", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel("Email hoặc Tên tài khoản", { exact: true }).fill("customer@example.test");
  await page.getByLabel("Mật mã vũ trụ", { exact: true }).fill(process.env.DEMO_PASSWORD || "LocalDemo2026!");
  await page.getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/events/" + event.slug));
  await expect(page.locator(".auth-avatar[aria-haspopup='menu']")).toBeVisible();

  const refreshCookie = (await page.context().cookies()).find((cookie) => cookie.name === "refreshToken");
  expect(refreshCookie).toBeTruthy();
  expect(refreshCookie!.httpOnly).toBe(true);
  expect(refreshCookie!.sameSite).toBe("Strict");
  expect(refreshCookie!.path).toBe("/api/auth");

  const refreshResponse = page.waitForResponse((response) =>
    response.request().method() === "POST" && response.url().endsWith("/api/auth/refresh-token"),
  );
  await page.reload();
  expect((await refreshResponse).status()).toBe(200);
  await expect(page.locator(".auth-avatar[aria-haspopup='menu']")).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Hồ sơ cá nhân" })).toBeVisible();
});

for (const width of [1440, 768, 390]) {
  test(`A3 responsive ${width}px`, async ({ page, request }) => {
    const { event } = await liveEvent(request);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/events/" + event.slug);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(event.title);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>(".event-detail-hero img");
      return !img || (img.complete && img.naturalWidth > 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(page.locator(".event-detail-booking")).toBeVisible();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.screenshot({ path: `../docs/reports/stitch/evidence/A3_20261027_implementation/${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
