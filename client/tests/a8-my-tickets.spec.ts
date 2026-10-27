import { test, expect, type Page } from "@playwright/test";
import {
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
  QRCodeReader,
} from "@zxing/library";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const email = process.env.A8_TEST_EMAIL;
const password = process.env.A8_TEST_PASSWORD;
const evidence = "../docs/reports/stitch/evidence/A8_20261028_implementation";

async function login(page: Page, account = email, secret = password) {
  if (!account || !secret)
    throw new Error(
      "Set A8_TEST_EMAIL and A8_TEST_PASSWORD for a local account with VALID, CHECKED_IN and VOID tickets.",
    );
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/auth\/login/);
  await page
    .getByLabel("Email hoặc Tên tài khoản", { exact: true })
    .fill(account);
  await page.getByLabel("Mật mã vũ trụ", { exact: true }).fill(secret);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/tickets$/);
}

test("A8 live statuses, real decodable QR, feature notices and print", async ({
  page,
}) => {
  await login(page);
  const card = page.locator(".mt-spotlight");
  await expect(card).toHaveAttribute("data-ticket-status", "VALID");
  await expect(page.locator(".auth-header")).toHaveCount(1);
  await expect(page.locator(".auth-footer")).toHaveCount(1);
  await expect(page.locator(".site-header")).toHaveCount(0);
  await expect(card).not.toContainText("Chưa có thông tin");
  const pixels = await page
    .locator(".mt-qr-frame img")
    .evaluate(async (node: HTMLImageElement) => {
      await node.decode();
      const canvas = document.createElement("canvas");
      canvas.width = node.naturalWidth;
      canvas.height = node.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(node, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const grey = Array.from(
        { length: canvas.width * canvas.height },
        (_, i) => (rgba[i * 4] + 2 * rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 4,
      );
      return { width: canvas.width, height: canvas.height, grey };
    });
  const decoded = new QRCodeReader().decode(
    new BinaryBitmap(
      new HybridBinarizer(
        new RGBLuminanceSource(
          Uint8ClampedArray.from(pixels.grey),
          pixels.width,
          pixels.height,
        ),
      ),
    ),
  );
  // Never write the decoded credential to test output or artifacts.
  expect(decoded.getText().length >= 32).toBe(true);
  for (const name of ["Thêm vào Apple Wallet", "Gửi Email", "Chuyển nhượng"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".auth-toast")).toHaveText(
      /Chức năng đang trong quá trình phát triển/,
    );
    await page
      .getByRole("button", { name: "Đóng thông báo", exact: true })
      .click();
  }
  await page.evaluate(() => {
    window.print = () =>
      document.documentElement.setAttribute("data-print-requested", "true");
  });
  await page.getByRole("button", { name: "Tải vé PDF", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-requested",
    "true",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".auth-header")).toBeHidden();
  await expect(page.locator(".auth-footer")).toBeHidden();
  await expect(page.locator(".mt-actions")).toBeHidden();
  await expect(page.locator(".mt-qr-frame img")).toBeVisible();
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.length).toBeGreaterThan(1000);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: /^Đã sử dụng/ }).click();
  await expect(card).toHaveAttribute("data-ticket-status", "CHECKED_IN");
  await expect(page.locator(".mt-qr-frame img")).toHaveCount(0);
  await page.getByRole("button", { name: "Hóa đơn VAT", exact: true }).click();
  await expect(page.locator(".auth-toast")).toContainText(
    "Chức năng đang trong quá trình phát triển",
  );
  await page
    .getByRole("button", { name: "Đóng thông báo", exact: true })
    .click();
  await page.getByRole("button", { name: /^Đã hủy/ }).click();
  await expect(card).toHaveAttribute("data-ticket-status", "VOID");
  await expect(page.locator(".mt-qr-frame img")).toHaveCount(0);
  await expect(card).toContainText("Vé không thể dùng để check-in");
  await page.getByRole("link", { name: "Mở chi tiết vé", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/[\w-]+$/);
  await expect(card).toHaveAttribute("data-ticket-status", "VOID");
  await page.reload();
  await expect(card).toHaveAttribute("data-ticket-status", "VOID");
});

test("A8 live empty account, ownership and request failure recovery", async ({
  page,
  browser,
}) => {
  await login(page);
  await expect(page.locator(".mt-spotlight")).toBeVisible();
  const ownLink = await page
    .getByRole("link", { name: "Mở chi tiết vé", exact: true })
    .getAttribute("href");
  await page.route("**/api/me/tickets?*", (route) => route.abort());
  await page.getByRole("button", { name: "Làm mới danh sách vé" }).click();
  await expect(
    page.getByRole("heading", { name: "Không tải được danh sách vé" }),
  ).toBeVisible();
  await expect(page.locator(".mt-spotlight")).toHaveCount(0);
  await page.unroute("**/api/me/tickets?*");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".mt-spotlight")).toBeVisible();
  const context = await browser.newContext();
  const other = await context.newPage();
  try {
    await login(
      other,
      "customer@example.test",
      process.env.DEMO_PASSWORD || "LocalDemo2026!",
    );
    await expect(
      other.getByRole("heading", { name: "Bạn chưa có vé" }),
    ).toBeVisible();
    const response = other.waitForResponse((r) =>
      r.url().includes("/api/me" + ownLink),
    );
    await other.goto(ownLink!);
    expect((await response).status()).toBe(404);
    await expect(
      other.getByRole("heading", { name: "Không tải được vé" }),
    ).toBeVisible();
    await expect(other.locator(".mt-spotlight")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("A8 desktop/mobile layout, keyboard and shared shell", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(page.locator(".mt-spotlight")).toBeVisible();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const info = await page.locator(".mt-ticket-info").boundingBox();
    const qr = await page.locator(".mt-qr-panel").boundingBox();
    if (width > 760) expect(qr!.x).toBeGreaterThan(info!.x);
    else expect(qr!.y).toBeGreaterThan(info!.y);
    await page.screenshot({
      path: `${evidence}/${width}.png`,
      fullPage: true,
      maskColor: "#313445",
      mask: [
        page.locator(".mt-qr-frame img"),
        page.locator(".mt-code"),
        page.locator(".mt-meta:nth-child(3) dd"),
      ],
    });
  }
  await page.getByRole("button", { name: "Gửi Email", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".auth-toast")).toContainText(
    "Chức năng đang trong quá trình phát triển",
  );
  expect(errors).toEqual([]);
});
