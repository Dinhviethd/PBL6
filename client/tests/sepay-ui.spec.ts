import { test, expect } from "@playwright/test";

test("SePay checkout redirects to A7 after the server confirms payment", async ({ page }) => {
  let created = false;
  let checks = 0;
  let paid = false;
  const instructions = {
    paymentId: "sepay-payment",
    orderId: "order",
    orderStatus: "PENDING_PAYMENT",
    status: "PENDING",
    environment: "test",
    amount: "100000",
    currency: "VND",
    bank: "MBBank",
    accountNumber: "123456789",
    accountName: "TEST ACCOUNT",
    transferContent: "tkhABC123",
    qrUrl: "https://vietqr.app/img?acc=123456789&bank=MBBank&amount=100000&des=tkhABC123",
    canTransfer: true,
    expiresAt: new Date(Date.now() + 900000).toISOString(),
    holdUntil: new Date(Date.now() + 1800000).toISOString(),
    requiresReview: false,
    updatedAt: new Date().toISOString(),
    lastVerifiedAt: null,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/me") data = { idUser: "ui-user", name: "Tester", email: "ui@example.test", roles: ["USER"] };
    if (path === "/api/config") data = { paymentMode: "disabled", sepayEnabled: true };
    if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    if (path === "/api/me/orders/order") data = {
      id: "order", order_code: "EH-TEST", event_title_snapshot: "SePay UI test",
      buyer_name_snapshot: "Tester", status: paid ? "PAID" : "PENDING_PAYMENT", total_amount: "100000",
      expires_at: new Date(Date.now() + 900000).toISOString(),
      payment: created && !paid ? { id: "sepay-payment", provider: "sepay", status: "PENDING", provider_expires_at: instructions.expiresAt } : null,
      latest_payment: created ? { id: "sepay-payment", provider: "sepay", status: paid ? "SUCCEEDED" : "PENDING", provider_expires_at: instructions.expiresAt } : null,
      items: [],
    };
    if (path === "/api/me/order-history/order") data = {
      id: "order",
      order_code: "EH-TEST",
      event_title_snapshot: "SePay UI test",
      status: "PAID",
      total_amount: "100000",
      currency: "VND",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 900000).toISOString(),
      total_quantity: 1,
      group: "paid",
      items: [],
      payment: {
        paid: {
          id: "sepay-payment",
          order_id: "order",
          provider: "sepay",
          status: "SUCCEEDED",
          amount: "100000",
          created_at: new Date().toISOString(),
          requires_review: false,
        },
        active: null,
        latest: null,
        unresolvedReview: false,
      },
      tickets: {
        expected: 1,
        issued: 1,
        valid: 1,
        checkedIn: 0,
        void: 0,
      },
      actions: {
        canCancel: false,
        canViewTickets: true,
        canContinueCheckout: false,
      },
      ticketList: [],
    };
    if (path === "/api/sepay/orders/order/payment" && request.method() === "POST") {
      created = true;
      data = instructions;
    }
    if (path === "/api/sepay/orders/order/payment" && request.method() === "GET") {
      checks++;
      if (checks >= 2) paid = true;
      data = paid ? { ...instructions, status: "SUCCEEDED", orderStatus: "PAID", canTransfer: false, qrUrl: null } : instructions;
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route("https://vietqr.app/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>" }));

  await page.goto("/checkout/order");
  await page.locator(".ck-method-primary").click();
  await expect(page.getByRole("status")).toContainText("Chức năng sẽ sớm được cập nhật");
  await expect(page.getByRole("radio", { name: /Chuyển khoản MB Bank/ })).toBeChecked();
  const methods = await page.locator(".ck-methods input[type=radio]").evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).id),
  );
  expect(methods.slice(0, 2)).toEqual(["ck-method-mbbank", "ck-method-vnpay"]);
  await expect(page.getByRole("radio", { name: /Chuyển khoản MB Bank/ })).toBeChecked();
  await page.getByRole("button", { name: "Xác nhận và tiến hành thanh toán" }).click();
  await expect(page.getByText("tkhABC123")).toBeVisible();
  await expect(page.getByText("123456789")).toBeVisible();
  await expect(page.getByText("Đang chờ chuyển khoản")).toBeVisible();
  await expect.poll(() => checks, { timeout: 15000 }).toBeGreaterThanOrEqual(2);
  await expect(page).toHaveURL(/\/payment-status\/order$/);
  await expect(
    page.getByRole("heading", { name: "Thanh toán thành công" }),
  ).toBeVisible();
  await expect(page.getByText("EH-TEST").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xem vé của tôi" }),
  ).toHaveAttribute("href", "/tickets");
});
