import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.skip(process.env.B8_TEST !== "1", "Requires the isolated B8 API and fixture");
test.use({ channel: "chrome" });
const fixture = () => JSON.parse(readFileSync(path.resolve("../server/.local/b8-fixture.json"), "utf8"));
const evidence = path.resolve("../docs/reports/stitch/evidence/B8_20261101_implementation");

async function login(context: BrowserContext, page: Page) {
  const f = fixture();
  const response = await context.request.post("/api/auth/login", { data: { email: f.email, password: f.password } });
  expect(response.status()).toBe(200);
  await page.goto(`/organizer/events/${f.eventId}/attendees`);
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 13");
  return f;
}

test("real B8 API: filter combinations, page totals, literal search and approved scope", async ({ page, context }) => {
  const f = await login(context, page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(5);
  await expect(page.locator(".b8-pagination p")).toContainText("63");
  await page.getByRole("button", { name: "Trang 13", exact: true }).click();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 13 / 13");
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Chưa check-in", exact: true }).click();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 8");
  await expect(page.locator(".b8-pagination p")).toContainText("40");
  await page.getByRole("combobox", { name: "Hạng vé" }).selectOption(f.typeAId);
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 2");
  await expect(page.locator(".b8-pagination p")).toContainText("7");
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Đã check-in", exact: true }).click();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 4");
  await expect(page.locator(".b8-roster tbody .b8-checkin-time")).toHaveCount(5);
  await page.getByRole("combobox", { name: "Hạng vé" }).selectOption(f.typeBId);
  await expect(page.getByRole("heading", { name: "Không có kết quả phù hợp" })).toBeVisible();
  await expect(page.locator(".b8-total-pages")).toHaveText("0 kết quả");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 13");
  const search = page.getByRole("textbox", { name: "Tìm tên, email hoặc mã vé" });
  await search.fill("100%_\\");
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 2");
  await expect(page.locator(".b8-pagination p")).toContainText("10");
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 13");
  await search.fill("NO_MATCH_B8");
  await expect(page.getByRole("heading", { name: "Không có kết quả phù hợp" })).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(5);
  const code = (await page.locator(".b8-ticket-code code").first().textContent())!;
  await search.fill(code);
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(1);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: `Sao chép mã vé ${code}` }).click();
  await expect(page.locator(".b8-copy-notice")).toContainText("Đã sao chép");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
  for (const removed of ["Xuất danh sách", "Nhập danh bạ", "Check-in thủ công", "Live Gate Sync", "Cổng vào chỉ định", "Thiết bị soát vé"]) {
    await expect(page.getByText(removed, { exact: false })).toHaveCount(0);
  }
  await page.reload();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 13");
  expect(errors).toEqual([]);
});

test("B8 shell, picker, event switch and four viewport screenshots", async ({ page, context }) => {
  const f = await login(context, page);
  mkdirSync(evidence, { recursive: true });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".org-header")).toHaveCount(1);
    expect((await page.locator(".org-create-btn").boundingBox())!.height).toBeLessThan(64);
    await expect(page.getByRole("heading", { name: "Danh sách người tham dự & Roster Check-in" })).toBeVisible();
    if (width === 390) {
      await page.locator(".b8-badge").first().scrollIntoViewIfNeeded();
      await expect(page.locator(".b8-badge").first()).toBeInViewport();
      await page.locator(".b8-table-scroll").evaluate(element => { element.scrollLeft = 0; });
      await page.evaluate(() => scrollTo(0, 0));
    }
    await page.screenshot({ path: path.join(evidence, `roster-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(page.locator('.osb-nav a[aria-current="page"]')).toHaveText("Người tham dự");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Mở menu", exact: true })).toBeFocused();
  await page.getByRole("link", { name: "Chọn sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/attendees$/);
  await expect(page.getByRole("heading", { name: "Chọn sự kiện để xem người tham dự" })).toBeVisible();
  await expect(page.locator(".qse-grid .qse-card")).not.toHaveCount(0);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator(".org-create-btn").boundingBox())!.height).toBeLessThan(64);
    await page.screenshot({ path: path.join(evidence, `picker-${width}.png`), fullPage: true });
  }
  const target = page.locator(`.qse-grid a[href="/organizer/events/${f.emptyEventId}/attendees"]`);
  await expect(target).toBeVisible();
  await target.click();
  await expect(page.getByRole("heading", { name: "Chưa có người tham dự", exact: true })).toBeVisible();
  await expect(page.locator(".b8-event-context")).toContainText("B8 Empty Event");
  await expect(page.locator(".b8-total-pages")).toHaveText("0 kết quả");
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/organizer");
  await page.locator(".osb-nav").getByRole("link", { name: "Người tham dự", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/attendees$/);
});

test("B8 network retry, old response cancellation, missing event and legacy-runtime error", async ({ page, context }) => {
  const f = await login(context, page);
  let failed = false;
  await page.route("**/api/organizer/events/*/attendees?**", async route => {
    if (!failed) { failed = true; await route.abort("failed"); }
    else await route.continue();
  });
  await page.getByRole("button", { name: "Đã check-in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không tải được dữ liệu" })).toBeVisible();
  await page.getByRole("button", { name: "Thử tải lại", exact: true }).click();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 4");
  await page.unroute("**/api/organizer/events/*/attendees?**");
  await page.route("**/api/organizer/events/*/attendees?**", async route => {
    if (new URL(route.request().url()).searchParams.get("status") === "VALID") {
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 800));
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Chưa check-in", exact: true }).click();
  await expect(page.getByText("Đang tải danh sách người tham dự…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đã check-in", exact: true }).click();
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 4");
  await page.waitForTimeout(1000);
  await expect(page.locator(".b8-total-pages")).toHaveText("Trang 1 / 4");
  await page.unroute("**/api/organizer/events/*/attendees?**");
  await page.goto("/organizer/events/00000000-0000-4000-8000-000000000000/attendees");
  await expect(page.getByRole("heading", { name: "Không thể mở danh sách" })).toBeVisible();
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(0);
  // Simulate an older deployed server using its REAL legacy endpoint, not fake rows.
  await page.route("**/api/organizer/events/*/attendees?**", async route => {
    const legacy = await route.fetch({ url: route.request().url().split("?")[0] });
    await route.fulfill({ response: legacy });
  });
  await page.goto(`/organizer/events/${f.eventId}/attendees`);
  await expect(page.getByText("Máy chủ chưa hỗ trợ bộ lọc và phân trang người tham dự. Vui lòng thử lại sau.")).toBeVisible();
  await expect(page.locator(".b8-roster tbody tr")).toHaveCount(0);
});
