import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.skip(process.env.B10_TEST !== "1", "Requires isolated B10 source API and real PostgreSQL fixture");
test.use({ channel: "chrome" });
const evidence = path.resolve("../docs/reports/stitch/evidence/B10_20261101_implementation");
const fixture = () => JSON.parse(readFileSync(path.resolve("../server/.local/b10-fixture.json"), "utf8"));

async function login(context: BrowserContext, page: Page) {
  const f = fixture();
  const response = await context.request.post("/api/auth/login", { data: { email: f.email, password: f.password } });
  expect(response.status()).toBe(200);
  await page.goto(`/organizer/events/${f.eventId}/stats`);
  await expect(page.locator(".b10-period-total")).toContainText("7.770.000");
  return f;
}

async function filter(page: Page, from: string, to: string) {
  await page.getByLabel("Từ ngày", { exact: true }).fill(from);
  await page.getByLabel("Đến ngày", { exact: true }).fill(to);
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
}

test("B10 real date-filter, chart, historical ticket revenue and CSV", async ({ context, page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(context, page);
  await expect(page.locator(".b10-kpis .b10-kpi")).toHaveCount(3);
  await expect(page.locator(".b10-kpis")).toContainText("7.770.000");
  await expect(page.locator(".b10-kpis")).toContainText("1.000 vé");
  await expect(page.locator(".b10-types tbody tr")).toHaveCount(2);
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  await filter(page, "2026-10-31", "2026-10-31");
  await expect(page.locator(".b10-period-total")).toContainText("20 vé trong kỳ");
  await expect(page.getByRole("img", { name: "Biểu đồ doanh thu và vé bán theo ngày", exact: true })).toBeVisible();
  await expect(page.locator(".b10-kpis")).toContainText("7.770.000");
  await page.getByText("Xem dữ liệu theo ngày", { exact: true }).click();
  await expect(page.locator(".b10-daily tbody tr")).toHaveCount(1);
  await expect(page.locator(".b10-daily tbody")).toContainText("2026-10-31");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/2026-10-31-2026-10-31\.csv$/);
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv).toContain('"20","20"');
  expect(csv).toContain("'=VIP");
  expect(csv).not.toContain("fixture@example.test");
  await expect(page.getByRole("status")).toContainText("Đã tải báo cáo CSV");
  await filter(page, "2099-01-01", "2099-01-02");
  await expect(page.getByRole("heading", { name: "Chưa có giao dịch trong khoảng ngày này" })).toBeVisible();
  await expect(page.locator(".b10-types tfoot")).toContainText("0 ₫");
  await filter(page, "2026-11-02", "2026-11-01");
  await expect(page.getByRole("alert")).toContainText("Chọn khoảng ngày hợp lệ");
  for (const removed of ["ARPU", "Đối soát doanh thu", "Kênh Mua Vé", "Địa Lý Khách Hàng", "Lưu Lượng Quét Cổng", "CSAT", "Live Gate Sync", "Đội Điều Phối Cosmic"]) {
    await expect(page.getByText(removed, { exact: false })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("B10 shared shell, picker, empty event and desktop/mobile screenshots", async ({ context, page }) => {
  const f = await login(context, page);
  mkdirSync(evidence, { recursive: true });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".org-header")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Báo cáo Phân tích & Thống kê Sự kiện" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator(".org-create-btn").boundingBox())!.height).toBeLessThan(64);
    await page.screenshot({ path: path.join(evidence, `report-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(page.locator('.osb-nav a[aria-current="page"]')).toHaveText("Thống kê doanh thu");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Mở menu", exact: true })).toBeFocused();
  await page.locator(".b10-event").click();
  await expect(page).toHaveURL(/\/organizer\/events\/stats$/);
  await expect(page.getByRole("heading", { name: "Chọn sự kiện để xem báo cáo" })).toBeVisible();
  await expect(page.locator(".qse-grid .qse-card")).not.toHaveCount(0);
  await page.screenshot({ path: path.join(evidence, "picker-390.png"), fullPage: true });
  await page.locator(`.qse-grid a[href="/organizer/events/${f.emptyEventId}/stats"]`).click();
  await expect(page.getByText("Sự kiện chưa có loại vé.", { exact: true })).toBeVisible();
  await expect(page.locator(".b10-kpis")).toContainText("Chưa có sức chứa");
  await expect(page.locator(".b10-kpis")).toContainText("Chưa có vé bán");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/organizer");
  await page.getByRole("link", { name: "Thống kê doanh thu", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/stats$/);
});

test("B10 network retry, stale responses, CSV error and missing event", async ({ context, page }) => {
  const f = await login(context, page);
  await page.route('**/analytics?*', async route => { await route.abort(); });
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeDisabled();
  await page.unroute('**/analytics?*');
  await page.getByRole("button", { name: "Thử tải lại báo cáo", exact: true }).click();
  await expect(page.locator(".b10-period-total")).toContainText("60 vé");
  await page.route('**/analytics?*fromDate=2026-10-31*', async route => {
    const response = await route.fetch(); await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ response });
  });
  await filter(page, "2026-10-31", "2026-10-31");
  await filter(page, "2099-01-01", "2099-01-02");
  await expect(page.locator(".b10-period-total")).toContainText("0 vé");
  await page.waitForTimeout(900);
  await expect(page.locator(".b10-period-total")).toContainText("0 vé");
  await page.route('**/analytics/export.csv?*', route => route.abort());
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Không thể xuất CSV");
  await page.goto('/organizer/events/00000000-0000-4000-8000-000000000000/stats');
  await expect(page.getByRole("alert")).toContainText("Không tìm thấy sự kiện");
  await page.goto(`/organizer/events/${f.eventId}/stats`);
  await expect(page.locator(".b10-period-total")).toContainText("60 vé");
});
