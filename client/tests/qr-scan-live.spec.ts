import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.skip(
  process.env.B9_LIVE_TEST !== "1",
  "Requires isolated B9 API fixture on 8019",
);
test.use({ channel: "chrome" });

test("B9 real scan, duplicate, errors, navigation and responsive layout", async ({
  page,
}) => {
  const fixture = JSON.parse(
    readFileSync("../server/.local/b9-fixture.json", "utf8"),
  );
  // Forward to the isolated real API; no response body is mocked.
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: `http://127.0.0.1:8019${url.pathname}${url.search}`,
    });
    await route.fulfill({ response });
  });
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(fixture.email);
  await page.locator('input[type="password"]').fill(fixture.password);
  await page.locator("button.auth-submit-login").click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await page.goto(`/organizer/events/${fixture.eventId}/checkin`);
  await expect(page.locator(".qs-event")).toContainText("Đêm nhạc thiên hà");
  const result = page.getByRole("region", { name: "Kết quả quét" });
  const input = page.getByRole("textbox", { name: "Mã vé / nội dung QR" });
  const submit = page.getByRole("button", { name: "Xác thực ngay" });
  await expect(submit).toBeDisabled();
  await input.fill(fixture.code);
  await submit.click();
  await expect(result).toContainText("CHECK-IN THÀNH CÔNG");
  await expect(result).toContainText("Nguyễn Minh Anh");
  await expect(result).toContainText("VIP Thiên Hà");
  await expect(result).not.toContainText("Nhật ký");
  const dir = path.resolve("test-results/b9-evidence");
  mkdirSync(dir, { recursive: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: path.join(dir, `success-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(
    page
      .locator(".qs-sidebar")
      .getByRole("link", { name: "Quản lý loại vé", exact: true }),
  ).toHaveAttribute("href", `/organizer/events/${fixture.eventId}/tickets`);
  await expect(
    page
      .locator(".qs-sidebar")
      .getByRole("link", { name: "Hồ sơ BTC", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Đóng menu", exact: true }).click();
  await input.fill(fixture.code);
  await submit.click();
  await expect(result).toContainText("Vé đã sử dụng");
  await input.fill("invalid-code");
  await submit.click();
  await expect(result).toContainText("Mã vé không hợp lệ");
  await expect(result).not.toContainText("Nguyễn Minh Anh");
  await input.fill(fixture.voidCode);
  await submit.click();
  await expect(result).toContainText("Vé đã bị hủy");
  await page.getByRole("button", { name: "Bật camera quét QR" }).click();
  await expect(page.getByRole("alert")).toContainText("Không mở được camera");
  expect(failures).toEqual([]);
});
