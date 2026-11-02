import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.skip(process.env.B1_TEST !== "1", "Requires B1 source API and isolated PostgreSQL fixture");
test.use({ channel: "chrome" });
const evidence = path.resolve("../docs/reports/stitch/evidence/B1_20261102_implementation");
const fixture = () => JSON.parse(readFileSync(path.resolve("../server/.local/b1-fixture.json"), "utf8"));
async function login(context: BrowserContext, page: Page) {
  const f = fixture();
  const response = await context.request.post("/api/auth/login", { data: { email: f.email, password: f.password } });
  expect(response.status()).toBe(200);
  await page.goto("/organizer/dashboard");
  await expect(page.locator(".b1-kpis")).toContainText("6.200.000");
  await expect(page.getByLabel("Sự kiện", { exact: true })).toBeEnabled();
  return f;
}
async function dates(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: "Tùy chọn", exact: true }).click();
  await page.getByLabel("Từ ngày", { exact: true }).fill(from);
  await page.getByLabel("Đến ngày", { exact: true }).fill(to);
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
}

test("B1 live owner aggregate, full event selector, date filters and chart", async ({ context, page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const f = await login(context, page);
  await expect(page.locator('.b1-select option')).toHaveCount(59);
  await expect(page.locator(".b1-kpi")).toHaveCount(4);
  await expect(page.locator(".b1-event-card")).toHaveCount(5);
  await expect(page.locator(".b1-event-card").first()).toContainText("60 / 1.000");
  await expect(page.locator(".b1-event-card").first()).toContainText("1 / 2");
  await expect(page.locator(".b1-kpis")).toContainText("49 sự kiện");
  await dates(page, "2026-10-31", "2026-10-31");
  await expect(page.locator(".b1-kpis")).toContainText("2.200.000");
  await expect(page.locator(".b1-kpis")).toContainText("21 vé");
  await expect(page.locator(".b1-event-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Vé đã bán", exact: true }).click();
  await expect(page.getByRole("img", { name: "Vé bán theo ngày", exact: true })).toBeVisible();
  await page.getByText("Xem dữ liệu theo ngày", { exact: true }).click();
  await expect(page.locator(".b1-daily tbody tr")).toHaveCount(1);
  await expect(page.locator(".b1-daily tbody")).toContainText("2.200.000");
  await page.getByLabel("Sự kiện", { exact: true }).selectOption(f.lateEventId);
  await expect(page.locator(".b1-kpis")).toContainText("200.000");
  await expect(page.locator(".b1-event-card")).toHaveCount(1);
  await dates(page, "2099-01-01", "2099-01-02");
  await expect(page.getByText("Chưa có giao dịch trong khoảng ngày này.", { exact: true })).toBeVisible();
  await expect(page.locator(".b1-event-card")).toHaveCount(1);
  await page.getByLabel("Sự kiện", { exact: true }).selectOption(f.draftEventId);
  await expect(page.getByRole("heading", { name: "Chưa có sự kiện sắp hoặc đang diễn ra" })).toBeVisible();
  await dates(page, "2026-11-02", "2026-11-01");
  await expect(page.getByRole("alert")).toContainText("Chọn khoảng ngày hợp lệ");
  for (const removed of ["Công việc cần xử lý", "Đơn hàng gần đây", "Xuất báo cáo PDF", "so với kỳ trước", "Khung giờ cao điểm", "Live Gate Sync"]) {
    await expect(page.getByText(removed, { exact: false })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("B1 shared shell, responsive, keyboard and navigation", async ({ context, page }) => {
  await login(context, page);
  mkdirSync(evidence, { recursive: true });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".org-header")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Tổng quan", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator(".org-create-btn").boundingBox())!.height).toBeLessThan(64);
    await page.screenshot({ path: path.join(evidence, `dashboard-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(page.locator('.osb-nav a[aria-current="page"]')).toHaveText("Tổng quan (Dashboard)");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Mở menu", exact: true })).toBeFocused();
  const slider = page.getByRole("slider", { name: "Chọn ngày trên biểu đồ" });
  await slider.focus(); await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Quản lý sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer$/);
  await page.getByRole("link", { name: "Tổng quan (Dashboard)", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/dashboard$/);
  await expect(page.locator(".b1-kpis")).toContainText("6.200.000");
});

test("B1 network error/retry, stale filters, picker failure and empty account", async ({ context, page }) => {
  await login(context, page);
  await page.route('**/organizer/dashboard?*', route => route.abort());
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không thể tải tổng quan" })).toBeVisible();
  await expect(page.locator(".b1-kpi")).toHaveCount(0);
  await page.unroute('**/organizer/dashboard?*');
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".b1-kpis")).toContainText("6.200.000");
  await page.route('**/organizer/dashboard?*fromDate=2026-10-31*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000)); await route.continue().catch(() => {});
  });
  await dates(page, "2026-10-31", "2026-10-31");
  await dates(page, "2099-01-01", "2099-01-02");
  await expect(page.getByText("Chưa có giao dịch trong khoảng ngày này.", { exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.locator(".b1-kpis")).toContainText("0 ₫");
  await page.route('**/organizer/events?*', route => route.abort());
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Không tải được bộ chọn sự kiện");
  await page.unroute('**/organizer/events?*');
  await page.getByRole("button", { name: "Thử tải lại danh sách", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  const f = fixture();
  const emptyLogin = await context.request.post("/api/auth/login", { data: { email: f.emptyEmail, password: f.password } });
  expect(emptyLogin.status()).toBe(200);
  await page.goto("/organizer/dashboard");
  await expect(page.getByRole("heading", { name: "Chưa có sự kiện nào", exact: true })).toBeVisible();
  await expect(page.locator(".b1-kpis")).toContainText("0 ₫");
  await expect(page.locator(".b1-event-card")).toHaveCount(0);
});
