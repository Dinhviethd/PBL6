import { expect, type Page } from "@playwright/test";

export async function waitQueueScenario(
  page: Page,
  mobile: boolean,
  width: number,
) {
  await page.setViewportSize({ width, height: 844 });
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  const now = Date.now(),
    end = new Date(now + 86400000).toISOString();
  let entry: Record<string, unknown> | null = null,
    failLeave = false;
  const user = {
    idUser: "buyer",
    name: "Queue Buyer",
    email: "queue@example.test",
    roles: ["USER"],
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/me") data = user;
    else if (path === "/api/auth/refresh-token")
      data = { accessToken: "ui-token" };
    else if (path === "/api/config") data = { paymentMode: "demo" };
    else if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    else if (path === "/api/events/queue-demo")
      data = {
        id: "event",
        slug: "queue-demo",
        title: "Đêm nhạc hàng chờ",
        description: "Sự kiện kiểm thử",
        venue_name: "Nhà hát",
        address: "Đà Nẵng",
        city_code: "DN",
        status: "PUBLISHED",
        sales_paused: false,
        starts_at: end,
        ends_at: end,
        ticketTypes: [
          {
            id: "type",
            name: "Standard",
            price_amount: "100000",
            capacity: 1,
            sold_quantity: 0,
            reserved_quantity: 1,
            sale_starts_at: new Date(now - 3600000).toISOString(),
            sale_ends_at: end,
          },
        ],
      };
    else if (path === "/api/events/event/wait-queue") {
      expect(req.postDataJSON()).toEqual({ ticketTypeId: "type" });
      entry = {
        id: "wait",
        event_title: "Đêm nhạc hàng chờ",
        type_name: "Standard",
        status: "WAITING",
        position: "2",
        order_id: null,
        expires_at: null,
      };
      data = entry;
    } else if (path === "/api/me/wait-queue") data = entry ? [entry] : [];
    else if (path === "/api/me/wait-queue/wait" && req.method() === "DELETE") {
      if (failLeave)
        return route.fulfill({
          status: 409,
          json: { success: false, message: "Đang có giao dịch cần xử lý." },
        });
      entry = { ...entry, status: "CANCELLED" };
      data = entry;
    } else if (path === "/api/me/orders/order")
      data = {
        id: "order",
        order_code: "EH-QUEUE",
        status: "PENDING_PAYMENT",
        event_title_snapshot: "Đêm nhạc hàng chờ",
        total_quantity: 1,
        total_amount: "100000",
        buyer_name_snapshot: user.name,
        buyer_email_snapshot: user.email,
        expires_at: new Date(now + 900000).toISOString(),
        created_at: new Date(now).toISOString(),
        items: [],
        payment: null,
      };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/events/queue-demo");
  await page
    .getByRole("button", { name: "Chờ vé Standard", exact: true })
    .click();
  await expect(
    page.getByText("Đang chờ · Vị trí 2", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rời hàng chờ", exact: true }).click();
  await expect(
    page.getByText("Đã rời / đóng hàng chờ", { exact: true }),
  ).toBeVisible();
  await page.goto("/events/queue-demo");
  await page
    .getByRole("button", { name: "Chờ vé Standard", exact: true })
    .click();
  await expect(
    page.getByText("Đang chờ · Vị trí 2", { exact: true }),
  ).toBeVisible();
  entry = {
    ...entry,
    status: "OFFERED",
    order_id: "order",
    expires_at: new Date(now + 900000).toISOString(),
  };
  await page
    .getByRole("button", { name: "Cập nhật hàng chờ", exact: true })
    .click();
  await expect(
    page.getByText("Đã giữ vé cho bạn", { exact: true }),
  ).toBeVisible();
  failLeave = true;
  await page.getByRole("button", { name: "Từ chối vé", exact: true }).click();
  await expect(
    page.getByText("Đang có giao dịch cần xử lý.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../.local/wait-queue-${mobile ? "mobile" : "web"}-${width}.png`,
    fullPage: true,
  });
  await page
    .getByRole(mobile ? "button" : "link", {
      name: "Xem đơn giữ vé",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(
    mobile ? /\/orders\/order$/ : /\/checkout\/order$/,
  );
  await expect(page.getByText("EH-QUEUE", { exact: true })).toBeVisible();
  expect(failures).toEqual([]);
}
