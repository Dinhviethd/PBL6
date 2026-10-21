import { test, expect, type Page } from "@playwright/test";

const event = {
  id: "e1",
  slug: "dem-nhac",
  title: "Đêm nhạc bên sông Hàn",
  description: "Một đêm âm nhạc và những khoảnh khắc đáng nhớ tại Đà Nẵng.",
  city_code: "Đà Nẵng",
  venue_name: "Sân khấu bên sông",
  address: "Đường Bạch Đằng",
  starts_at: "2099-10-21T12:00:00Z",
  ends_at: "2099-10-22T15:00:00Z",
  sales_paused: false,
  cover_image_url: "/broken-cover.png",
  priceFrom: "250000",
  ticketTypes: [
    {
      id: "t1",
      name: "Vé tiêu chuẩn",
      price_amount: "250000",
      capacity: 50,
      sold_quantity: 0,
      reserved_quantity: 0,
      sale_starts_at: "2020-01-01",
      sale_ends_at: "2099-10-21",
    },
  ],
};

async function mockApi(page: Page, guest = false) {
  let paid = false,
    attempts = 0,
    scans = 0;
  const keys: string[] = [];
  const order = () => ({
    id: "o1",
    order_code: "EH-001",
    event_title_snapshot: event.title,
    status: paid ? "PAID" : "PENDING_PAYMENT",
    total_amount: "250000",
    total_quantity: 1,
    created_at: "2026-10-21",
    expires_at: "2099-10-21",
    items: [
      {
        ticket_type_name_snapshot: "Vé tiêu chuẩn",
        quantity: 1,
        line_total: "250000",
      },
    ],
  });
  let payment = false;
  await page.route("**/broken-cover.png", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    let data: unknown = [];
    if (path === "/api/auth/refresh-token") {
      if (guest)
        return route.fulfill({
          status: 401,
          json: { success: false, code: "INVALID_SESSION" },
        });
      data = { accessToken: "mock-token" };
    } else if (path === "/api/auth/me")
      data = {
        idUser: "u1",
        name: "Minh Anh",
        email: "test@example.test",
        roles: ["USER"],
      };
    else if (path === "/api/config") data = { paymentMode: "demo" };
    else if (path === "/api/categories")
      data = [{ id: "music", name: "Âm nhạc" }];
    else if (path === "/api/events")
      data = {
        items: url.searchParams.get("q") === "khong-co" ? [] : [event],
        total: 1,
      };
    else if (path === "/api/events/dem-nhac") data = event;
    else if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    else if (path === "/api/orders" && route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      if (++attempts === 1)
        return route.fulfill({
          status: 503,
          json: {
            success: false,
            message: "Kết nối gián đoạn. Vui lòng thử lại.",
          },
        });
      data = order();
    } else if (path === "/api/me/orders/o1")
      data = {
        ...order(),
        payment: payment ? { id: "p1", status: "PENDING" } : undefined,
      };
    else if (path === "/api/orders/o1/payments") {
      payment = true;
      data = { id: "p1", provider: "demo", status: "PENDING" };
    } else if (path === "/api/payments/p1/demo") {
      paid = true;
      data = { outcome: "PAID" };
    } else if (path === "/api/me/tickets")
      data = [
        {
          id: "ticket1",
          ticket_code: "EH-TICKET-001",
          event_title_snapshot: event.title,
          ticket_type_name_snapshot: "Vé tiêu chuẩn",
          status: "VALID",
        },
      ];
    else if (path === "/api/me/tickets/ticket1")
      data = {
        id: "ticket1",
        code: "EH-TICKET-001",
        eventTitle: event.title,
        typeName: "Vé tiêu chuẩn",
        status: "VALID",
        qrImage:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><path d="M20 20h50v50H20zM130 20h50v50h-50zM20 130h50v50H20zM100 100h30v30h-30z" fill="black"/></svg>',
          ),
      };
    else if (path === "/api/checkin/events/e1")
      data = {
        title: event.title,
        venue_name: event.venue_name,
        checkin_opens_at: "2026-10-21",
        checkin_closes_at: "2099-10-21",
      };
    else if (path === "/api/checkin/events/e1/checkins")
      data = { duplicate: scans++ > 0, checked_in_at: "2026-10-21T12:00:00Z" };
    await route.fulfill({ json: { success: true, data } });
  });
  return { keys };
}

for (const width of [360, 390, 430, 768]) {
  test(`discovery layout and filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mockApi(page);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Khám phá sự kiện", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel(`Ảnh minh họa: ${event.title}`).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `../.local/qa/stitch-mobile-explore-${width}.png`,
    });
    await page
      .getByRole("textbox", { name: "Tìm sự kiện", exact: true })
      .fill("khong-co");
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await expect(
      page.getByText("Chưa có sự kiện phù hợp. Hãy thử bộ lọc khác."),
    ).toBeVisible();
  });
}

test("quantity cap, retry key, demo payment and ticket QR", async ({
  page,
}) => {
  const { keys } = await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/events/dem-nhac");
  const add = page.getByRole("button", {
    name: "Thêm Vé tiêu chuẩn",
    exact: true,
  });
  for (let i = 0; i < 10; i++) await add.click();
  await expect(add).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Đặt 10 vé", exact: true }),
  ).toBeInViewport();
  for (let i = 0; i < 9; i++)
    await page
      .getByRole("button", { name: "Giảm Vé tiêu chuẩn", exact: true })
      .click();
  await page.screenshot({ path: "../.local/qa/stitch-mobile-detail.png" });
  await page.getByRole("button", { name: "Đặt 1 vé", exact: true }).click();
  await expect(
    page.getByText("Kết nối gián đoạn. Vui lòng thử lại."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đặt 1 vé", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/o1$/);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
  await page
    .getByRole("button", { name: "Tiếp tục thanh toán", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Mô phỏng thanh toán thành công",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Mở ví vé QR", exact: true }).click();
  await page
    .getByRole("button", { name: "Mở vé EH-TICKET-001", exact: true })
    .click();
  const qr = page.getByRole("img", { name: "Mã QR của vé", exact: true });
  await expect(qr).toBeVisible();
  await expect(page.getByTestId("ticket-qr-panel")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.screenshot({ path: "../.local/qa/stitch-mobile-ticket.png" });
  expect(errors).toEqual([]);
});

test("guest booking leads to login and keeps destination", async ({ page }) => {
  await mockApi(page, true);
  await page.goto("/events/dem-nhac");
  await page
    .getByRole("button", { name: "Đăng nhập để đặt vé", exact: true })
    .click();
  await expect(page).toHaveURL(/\/auth\?next=/);
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toBeVisible();
});

test("manual check-in reports success and duplicate", async ({ page }) => {
  await mockApi(page);
  await page.goto("/checkin/e1");
  const input = page.getByRole("textbox", {
    name: "Mã vé / nội dung QR",
    exact: true,
  });
  await input.fill("EH-TICKET-001");
  await page
    .getByRole("button", { name: "Kiểm tra & check-in", exact: true })
    .click();
  await expect(page.getByText(/Check-in thành công ·/)).toBeVisible();
  await input.fill("EH-TICKET-001");
  await page
    .getByRole("button", { name: "Kiểm tra & check-in", exact: true })
    .click();
  await expect(page.getByText(/Vé đã check-in lúc/)).toBeVisible();
  await page.screenshot({ path: "../.local/qa/stitch-mobile-scanner.png" });
});
