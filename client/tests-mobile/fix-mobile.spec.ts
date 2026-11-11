import { test, expect } from "@playwright/test";

test("network failure never renders empty lists or a zero notification count; retry recovers", async ({
  page,
}) => {
  let offline = true;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/refresh-token") data = { accessToken: "fixture" };
    else if (path === "/api/auth/me")
      data = { idUser: "qa", name: "QA", roles: ["USER"] };
    else if (
      offline &&
      (path.startsWith("/api/me/") || path === "/api/events")
    ) {
      await route.abort();
      return;
    } else if (path === "/api/events") data = { items: [], total: 0 };
    else if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    else if (path === "/api/me/notifications")
      data = { items: [], unreadCount: 0 };
    await route.fulfill({ json: { success: true, data } });
  });
  for (const path of ["/staff", "/tickets", "/orders", "/"]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Thử lại", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Chưa có lời mời|Chưa có vé|Chưa có đơn|Không tìm thấy sự kiện/,
      ),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Chưa tải được số thông báo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Thông báo, 0 chưa đọc" }),
    ).toHaveCount(0);
  }
  offline = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Thử lại", exact: true }),
  ).toHaveCount(0);
  await page.goto("/notifications");
  await expect(
    page.getByText("0 thông báo chưa đọc.", { exact: false }),
  ).toBeVisible();
});

test("SePay option works with disabled legacy payments, creates once, hides QR on error, then accepts server PAID", async ({
  page,
}) => {
  let created = false,
    posts = 0,
    paid = false,
    failure = false;
  const later = new Date(Date.now() + 600000).toISOString();
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/refresh-token") data = { accessToken: "fixture" };
    else if (path === "/api/auth/me")
      data = { idUser: "qa", name: "QA", roles: ["USER"] };
    else if (path === "/api/config")
      data = { paymentMode: "disabled", sepayEnabled: true };
    else if (path === "/api/me/orders/test")
      data = {
        id: "test",
        order_code: "TEST-MOBILE",
        event_title_snapshot: "Local QA",
        status: paid ? "PAID" : "PENDING_PAYMENT",
        total_amount: "100000",
        expires_at: later,
        items: [],
      };
    else if (path === "/api/sepay/orders/test/payment") {
      if (route.request().method() === "POST") {
        created = true;
        posts++;
      }
      if (failure) {
        await route.abort();
        return;
      }
      if (!created) {
        await route.fulfill({
          status: 404,
          json: {
            success: false,
            code: "SEPAY_NOT_FOUND",
            message: "Chưa có giao dịch",
          },
        });
        return;
      }
      data = {
        paymentId: "p",
        orderId: "test",
        orderStatus: paid ? "PAID" : "PENDING_PAYMENT",
        status: paid ? "SUCCEEDED" : "PENDING",
        environment: "test",
        amount: "100000",
        currency: "VND",
        bank: "MBBank",
        accountNumber: "TESTONLY",
        accountName: "LOCAL TEST",
        transferContent: "tkhTEST",
        qrUrl: null,
        canTransfer: !paid,
        expiresAt: later,
        holdUntil: later,
        requiresReview: false,
        updatedAt: later,
        lastVerifiedAt: null,
      };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/orders/test");
  await page
    .getByRole("button", { name: "Chuyển khoản ngân hàng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tạo giao dịch chuyển khoản" }),
  ).toBeVisible();
  // Controller deliberately rate-limits explicit actions after the initial lookup.
  await page.waitForTimeout(3100);
  await page
    .getByRole("button", { name: "Tạo giao dịch chuyển khoản" })
    .dblclick();
  await expect(
    page.getByText("Nội dung: tkhTEST", { exact: true }),
  ).toBeVisible();
  expect(posts).toBe(1);
  await page.screenshot({
    path: "../.local/mobile-expo-qa/20261111-fix/sepay-ui.png",
    fullPage: true,
  });
  await expect(page.getByRole("button", { name: "Mở ví vé QR" })).toHaveCount(
    0,
  );
  failure = true;
  await page.waitForTimeout(3100);
  await page
    .getByRole("button", { name: "Kiểm tra giao dịch", exact: true })
    .click();
  await expect(page.getByText(/Không kết nối được máy chủ/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sao chép nội dung" }),
  ).toHaveCount(0);
  failure = false;
  paid = true;
  await page.waitForTimeout(3100);
  await page
    .getByRole("button", { name: "Kiểm tra giao dịch", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Mở ví vé QR" })).toBeVisible();
  expect(posts).toBe(1);
});
