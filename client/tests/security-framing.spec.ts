import { test, expect } from "@playwright/test";
test("built Express frontend opens directly but is blocked in a cross-origin frame", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const response = await page.goto("http://127.0.0.1:5188/auth/login");
  expect(response?.headers()["strict-transport-security"]).toBe("max-age=86400");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  expect(errors).toEqual([]);
  const parent = await context.newPage();
  const blocked = parent.waitForEvent("console", { timeout: 10000, predicate: m => /Refused to (frame|display)|frame-ancestors/i.test(m.text()) });
  await parent.goto("http://127.0.0.1:5199/");
  await blocked;
  await expect(parent.frameLocator("iframe").locator('input[type="email"]')).toHaveCount(0);
});
