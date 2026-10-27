import { test, expect, type Page } from "@playwright/test";

// Deliberately isolated from the shared application database.
const event = {
  id: "show",
  slug: "dem-nhac",
  title: "Đêm nhạc bên sông · Những khoảnh khắc đáng nhớ",
  description:
    "Âm nhạc và những cuộc gặp bên sông.\nHãy mang vé điện tử khi đến sự kiện.",
  venue_name: "Không gian nghệ thuật bên sông",
  address: "Đường Bạch Đằng, Đà Nẵng",
  city_code: "Đà Nẵng",
  starts_at: "2027-11-15T12:00:00Z",
  ends_at: "2027-11-15T16:00:00Z",
  priceFrom: "450000",
  status: "PUBLISHED",
  sales_paused: false,
  organizer: { name: "EventHub Live" },
  ticketTypes: [
    {
      id: "standard",
      name: "Vé tiêu chuẩn",
      price_amount: "450000",
      capacity: 100,
      reserved_quantity: 2,
      sold_quantity: 30,
      sale_starts_at: "2020-01-01T00:00:00Z",
      sale_ends_at: "2099-01-01T00:00:00Z",
    },
  ],
};
const qr =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="white"/><path d="M40 40h80v80H40zM200 40h80v80h-80zM40 200h80v80H40zM180 180h40v40h-40z" fill="black"/></svg>',
  );

async function fixture(page: Page, role = "USER") {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    let data: unknown;
    if (path === "/api/auth/me")
      data = { idUser: "web-test", name: "Nguyễn Minh Anh", roles: [role] };
    else if (path === "/api/config") data = { paymentMode: "demo" };
    else if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    else if (path === "/api/categories")
      data = [{ id: "music", name: "Âm nhạc", slug: "music" }];
    else if (path === "/api/events")
      data = {
        items:
          url.searchParams.get("q") === "không tồn tại"
            ? []
            : [
                event,
                {
                  ...event,
                  id: "other",
                  slug: "other",
                  title: "Hội thảo sáng tạo",
                  cover_image_url: "/missing-event-cover.webp",
                },
              ],
        total: url.searchParams.get("q") === "không tồn tại" ? 0 : 2,
      };
    else if (path === "/api/events/dem-nhac") data = event;
    else if (path === "/api/orders" && route.request().method() === "POST")
      data = { id: "order" };
    else if (path === "/api/me/orders/order")
      data = {
        id: "order",
        order_code: "EH-TEST",
        event_title_snapshot: event.title,
        buyer_name_snapshot: "Nguyễn Minh Anh",
        buyer_email_snapshot: "minhanh@example.test",
        status: "PENDING_PAYMENT",
        total_amount: "900000",
        total_quantity: 2,
        expires_at: new Date(Date.now() + 900000).toISOString(),
        event: {
          id: event.id,
          slug: event.slug,
          title: event.title,
          cover_image_url: undefined,
          venue_name: event.venue_name,
          address: event.address,
          city_code: event.city_code,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
        },
        items: [
          {
            ticket_type_name_snapshot: "Vé tiêu chuẩn",
            quantity: 2,
            unit_price: "450000",
            line_total: "900000",
          },
        ],
      };
    else if (path === "/api/me/tickets/ticket")
      data = {
        id: "ticket",
        eventTitle: event.title,
        typeName: "Vé tiêu chuẩn",
        status: "VALID",
        code: "EH-TEST-001",
        qrImage: qr,
      };
    else if (path === "/api/admin/stats")
      data = {
        revenue: "900000",
        sold: 2,
        checkins: 1,
        users: 12,
        events: 3,
        needs_review: 0,
      };
    else
      return route.fulfill({
        status: 404,
        json: { message: "Unexpected test endpoint: " + path },
      });
    await route.fulfill({ json: { success: true, data } });
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
}

for (const width of [1440, 1024, 768, 390]) {
  test(`discovery filters, image fallback and layout at ${width}px`, async ({
    page,
  }) => {
    await fixture(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".event-card")).toHaveCount(2);
    await expect(
      page.locator(".event-card").nth(1).locator(".cover-fallback"),
    ).toBeVisible();
    await expect(page.locator(".featured-copy h1")).toHaveText(event.title);
    await noOverflow(page);
    await page.screenshot({
      path: `../.local/qa/stitch-home-${width}.png`,
      fullPage: true,
    });
    await page.getByLabel("Tìm sự kiện", { exact: true }).fill("không tồn tại");
    const request = page.waitForRequest(
      (r) => new URL(r.url()).searchParams.get("q") === "không tồn tại",
    );
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await request;
    await expect(page.locator(".event-card")).toHaveCount(0);
    await expect(
      page.getByText("Chưa có sự kiện phù hợp. Thử thay đổi bộ lọc."),
    ).toBeVisible();
    await noOverflow(page);
  });
}

test("ticket selection keeps order payload and checkout state", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/events/dem-nhac");
  await page
    .getByLabel("Số lượng Vé tiêu chuẩn", { exact: true })
    .selectOption("10");
  await expect(
    page.getByRole("button", { name: "Tăng vé: Vé tiêu chuẩn" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Giảm vé: Vé tiêu chuẩn" }).click();
  await expect(
    page.getByLabel("Số lượng Vé tiêu chuẩn", { exact: true }),
  ).toHaveValue("9");
  await page
    .getByLabel("Số lượng Vé tiêu chuẩn", { exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Tăng vé: Vé tiêu chuẩn" }).click();
  await expect(page.locator(".total strong")).toHaveText(/900\.000/);
  const order = page.waitForRequest(
    (r) => r.url().endsWith("/api/orders") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Đặt vé ngay" }).click();
  const request = await order;
  expect(request.postDataJSON()).toEqual({
    eventId: "show",
    items: [{ ticketTypeId: "standard", quantity: 2 }],
  });
  expect(request.headers()["idempotency-key"]).toBeTruthy();
  await expect(page).toHaveURL(/checkout\/order$/);
  await expect(
    page.getByRole("button", { name: "Xác nhận và tiến hành thanh toán" }),
  ).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Thanh toán",
  );
});

for (const width of [1440, 390]) {
  test(`detail, checkout, QR and admin render at ${width}px`, async ({
    page,
  }) => {
    await fixture(page, "ADMIN");
    await page.setViewportSize({ width, height: 1000 });
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    for (const [path, selector, name] of [
      ["/events/dem-nhac", ".booking-panel", "detail"],
      ["/checkout/order", ".ck-ticket-total", "checkout"],
      ["/tickets/ticket", ".qr-image img", "ticket"],
      ["/admin/stats", ".stats-grid", "admin"],
    ]) {
      await page.goto(path);
      await expect(page.locator(selector)).toBeVisible();
      await noOverflow(page);
      await page.screenshot({
        path: `../.local/qa/stitch-${name}-${width}.png`,
        fullPage: true,
      });
    }
    expect(failures).toEqual([]);
  });
}

test("customer cannot open staff scanner through ticket page or admin route", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/tickets/ticket");
  await expect(page.getByAltText("Mã QR của vé")).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  await page.goto("/admin/stats");
  await expect(page.getByRole("alert")).toContainText("chưa có quyền");
  await expect(page.locator(".stats-grid")).toHaveCount(0);
});

test("staff scanner uses server confirmation and handles repeated or invalid codes", async ({
  page,
}) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/checkin/events/show", (route) =>
    route.fulfill({
      json: {
        data: {
          ...event,
          checkin_opens_at: event.starts_at,
          checkin_closes_at: event.ends_at,
        },
      },
    }),
  );
  let scans = 0;
  await page.route("**/api/checkin/events/show/checkins", (route) => {
    if (route.request().postDataJSON().code === "invalid")
      return route.fulfill({
        status: 400,
        json: { message: "Vé không hợp lệ" },
      });
    scans += 1;
    return route.fulfill({
      json: {
        data: { duplicate: scans > 1, checked_in_at: "2027-11-15T12:00:00Z" },
      },
    });
  });
  await page.goto("/checkin/events/show");
  await expect(
    page.getByRole("heading", { name: "Trạm quét QR check-in" }),
  ).toBeVisible();
  await page.getByLabel("Mã vé / nội dung QR").fill("EH-TEST-001");
  await page.getByRole("button", { name: "Kiểm tra & check-in" }).click();
  await expect(page.getByText(/Check-in thành công/)).toBeVisible();
  await page.getByRole("button", { name: "Kiểm tra & check-in" }).click();
  await expect(page.getByText(/Vé đã check-in lúc/)).toBeVisible();
  await page.getByLabel("Mã vé / nội dung QR").fill("invalid");
  await page.getByRole("button", { name: "Kiểm tra & check-in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Vé không hợp lệ");
  await noOverflow(page);
  await page.screenshot({
    path: "../.local/qa/stitch-scanner-390.png",
    fullPage: true,
  });
});
