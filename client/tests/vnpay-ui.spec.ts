import { test, expect } from "@playwright/test";

test("VNPay checkout opens sandbox, polls confirmation and displays paid tickets", async ({
  page,
}) => {
  let paid = false;
  const payment = {
    id: "payment",
    provider: "vnpay_sandbox",
    status: "PENDING",
    checkout_url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?test=1",
    provider_expires_at: new Date(Date.now() + 900000).toISOString(),
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/me")
      data = {
        idUser: "ui-user",
        name: "Tester",
        email: "ui@example.test",
        roles: ["USER"],
      };
    if (path === "/api/config") data = { paymentMode: "vnpay_sandbox" };
    if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    if (path === "/api/me/orders/order")
      data = {
        id: "order",
        order_code: "EH-TEST",
        event_title_snapshot: "VNPay UI test",
        buyer_name_snapshot: "Tester",
        status: paid ? "PAID" : "PENDING_PAYMENT",
        total_amount: "100000",
        expires_at: new Date(Date.now() + 900000).toISOString(),
        payment: paid ? null : payment,
        latest_payment: { ...payment, status: paid ? "SUCCEEDED" : "PENDING" },
        items: [],
      };
    if (path === "/api/me/order-history/order")
      data = {
        id: "order",
        order_code: "EH-TEST",
        event_title_snapshot: "VNPay UI test",
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
            id: "payment",
            order_id: "order",
            provider: "vnpay_sandbox",
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
    if (path === "/api/orders/order/payments") data = payment;
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route("https://sandbox.vnpayment.vn/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Sandbox test page</h1>",
    }),
  );
  await page.goto("/checkout/order");
  await expect(
    page.getByRole("button", { name: "Xác nhận và tiến hành thanh toán" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mô phỏng thanh toán thành công" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xác nhận và tiến hành thanh toán" })
    .click();
  await expect(page).toHaveURL(/sandbox\.vnpayment\.vn/);
  await page.goto("/checkout/order");
  await expect(
    page.getByText("Đang chờ xác nhận thanh toán.", { exact: false }),
  ).toBeVisible();
  paid = true;
  await expect(page).toHaveURL(/\/payment-status\/order$/, { timeout: 10000 });
  await expect(
    page.getByRole("heading", { name: "Thanh toán thành công" }),
  ).toBeVisible();
});

test("VNPay checkout preserves failed/review states and rejects an untrusted checkout URL", async ({
  page,
}) => {
  let review = false;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/me")
      data = {
        idUser: "ui-user",
        name: "Tester",
        email: "ui@example.test",
        roles: ["USER"],
      };
    if (path === "/api/config") data = { paymentMode: "vnpay_sandbox" };
    if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    if (path === "/api/me/orders/order")
      data = {
        id: "order",
        order_code: "EH-TEST",
        event_title_snapshot: "VNPay UI test",
        status: review ? "EXPIRED" : "PENDING_PAYMENT",
        total_amount: "100000",
        expires_at: new Date(Date.now() + 900000).toISOString(),
        latest_payment: { status: "FAILED", requires_review: review },
        items: [],
      };
    if (path === "/api/orders/order/payments")
      data = {
        id: "payment",
        provider: "vnpay_sandbox",
        checkout_url: "https://example.test/phishing",
      };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/checkout/order");
  await expect(
    page.getByText("Thanh toán thất bại hoặc đã hủy.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xác nhận và tiến hành thanh toán" })
    .click();
  await expect(
    page.getByText("Đường dẫn thanh toán VNPay không hợp lệ."),
  ).toBeVisible();
  review = true;
  await page.getByRole("button", { name: "Cập nhật trạng thái" }).click();
  await expect(
    page.getByText("Giao dịch cần đối soát.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Đơn hàng đã hết hạn giữ chỗ.")).toBeVisible();
});
