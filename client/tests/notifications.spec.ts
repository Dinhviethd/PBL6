import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`notification inbox reads, filters and opens links at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const email = `notifications-${width}-${Date.now()}@example.test`;
    const password = "Notifications2026!";
    const register = await request.post("/api/auth/register", {
      data: {
        name: "Khách nhận thông báo",
        email,
        password,
        confirmPassword: password,
      },
    });
    expect(register.ok()).toBeTruthy();
    const user = (await register.json()).data;
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const event = (
      await (await request.get("/api/events/dem-nhac-song-han")).json()
    ).data;
    const orderResponse = await request.post("/api/orders", {
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      data: {
        eventId: event.id,
        items: [{ ticketTypeId: event.ticketTypes[0].id, quantity: 1 }],
      },
    });
    expect(orderResponse.ok()).toBeTruthy();
    const order = (await orderResponse.json()).data;
    const payment = (
      await (
        await request.post(`/api/orders/${order.id}/payments`, { headers })
      ).json()
    ).data;
    expect(
      (
        await request.post(`/api/payments/${payment.id}/demo`, {
          headers,
          data: { success: true },
        })
      ).ok(),
    ).toBeTruthy();

    await page.goto("/auth/login");
    await page
      .getByLabel("Email hoặc Tên tài khoản", { exact: true })
      .fill(email);
    await page.getByLabel("Mật mã vũ trụ", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "ĐĂNG NHẬP NGAY", exact: true })
      .click();
    await page.getByRole("link", { name: /Thông báo, 1 chưa đọc/ }).click();
    await expect(
      page.getByRole("heading", { name: "Thông báo của bạn" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Đặt vé thành công" }),
    ).toBeVisible();
    await page.screenshot({
      path: `../.local/qa/notifications-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page
      .getByRole("button", { name: "Đánh dấu đã đọc", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Chưa đọc (0)", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Chưa đọc (0)", exact: true })
      .click();
    await expect(
      page.getByText("Bạn đã đọc hết thông báo trên trang này."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tất cả", exact: true }).click();
    await page
      .getByRole("button", { name: "Xem đơn hàng →", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/checkout/${order.id}$`));
    await page.goto("/notifications");
    await expect(
      page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(
      page.getByRole("heading", { name: "Thông báo của bạn" }),
    ).toHaveCount(0);
  });
}
