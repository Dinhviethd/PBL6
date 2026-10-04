import { test, expect, type Page } from "@playwright/test";
const password = process.env.DEMO_PASSWORD || "LocalDemo2026!";
async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Mật khẩu (ít nhất 8 ký tự)", { exact: true })
    .fill(password);
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Đăng nhập", exact: true }).click(),
  ]);
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
}
test("public discovery is responsive and has working filters", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Đi đâu tiếp theo?" }),
  ).toBeVisible();
  await expect(page.locator(".event-card").first()).toBeVisible();
  await page.screenshot({
    path: "../.local/qa/home-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Tìm sự kiện", { exact: true }).fill("Đêm nhạc");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".event-card")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".event-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../.local/qa/home-mobile.png",
    fullPage: true,
  });
});
test("customer purchases demo ticket and organizer checks in exactly once", async ({
  page,
  request,
}) => {
  const email = `web-${Date.now()}@example.test`;
  await page.goto("/auth/register");
  await page.getByLabel("Họ và tên").fill("Khách kiểm thử web");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu (ít nhất 8 ký tự)").fill(password);
  await page.getByLabel("Nhập lại mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/events/dem-nhac-song-han");
  await page.getByLabel("Số lượng Vé tiêu chuẩn").selectOption("1");
  await page.getByRole("button", { name: "Đặt vé ngay" }).click();
  await expect(page).toHaveURL(/\/checkout\//);
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
  await page
    .getByRole("button", { name: "Mô phỏng thanh toán thành công" })
    .click();
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Xem vé QR của bạn" }).click();
  await page.locator(".wallet-card").first().click();
  await expect(page.getByAltText("Mã QR của vé")).toBeVisible();
  const code = await page.locator(".qr-card .mono").innerText();
  await page.screenshot({ path: "../.local/qa/ticket.png", fullPage: true });
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await login(page, "organizer@example.test");
  const event = (
    await (await request.get("/api/events/dem-nhac-song-han")).json()
  ).data;
  await page.goto(`/organizer/events/${event.id}/checkin`);
  await page.getByLabel("Mã vé / nội dung QR").fill(code);
  await page.getByRole("button", { name: "Kiểm tra & check-in" }).click();
  await expect(page.getByText(/Check-in thành công/)).toBeVisible();
  await page.getByRole("button", { name: "Kiểm tra & check-in" }).click();
  await expect(page.getByText(/Vé đã check-in lúc/)).toBeVisible();
});
test("admin overview and access guards render correctly", async ({ page }) => {
  await page.goto("/admin/stats");
  await expect(page).toHaveURL(/auth\/login/);
  await login(page, "admin@example.test");
  await page.goto("/admin/stats");
  await expect(
    page.getByRole("heading", { name: "Trung tâm quản trị" }),
  ).toBeVisible();
  await expect(page.getByText("Doanh thu vé", { exact: true })).toBeVisible();
  await page.screenshot({ path: "../.local/qa/admin.png", fullPage: true });
  await page.getByRole("link", { name: "Giao dịch", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Mã giao dịch" }),
  ).toBeVisible();
});

test("organizer creates event with uploaded cover and admin publishes it", async ({
  page,
}) => {
  const slug = `web-event-${Date.now()}`;
  const date = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  await login(page, "organizer@example.test");
  await page.goto("/organizer/new");
  await page.getByLabel("Tên sự kiện", { exact: true }).fill(slug);
  await page.getByLabel("Đường dẫn (chữ thường, dấu gạch ngang)").fill(slug);
  await page.getByLabel("Danh mục", { exact: true }).selectOption({ index: 1 });
  await page
    .getByLabel("Giới thiệu sự kiện")
    .fill("Sự kiện kiểm thử quy trình tạo và phê duyệt trên web.");
  await page
    .getByLabel("Tải ảnh bìa")
    .setInputFiles("../.local/qa/home-desktop.png");
  await expect(page.getByLabel("Ảnh bìa", { exact: true })).toHaveValue(
    /\/uploads\/.*\.webp/,
  );
  await page.getByLabel("Địa điểm", { exact: true }).fill("Hội trường MVP");
  await page.getByLabel("Thành phố", { exact: true }).fill("Đà Nẵng");
  await page.getByLabel("Địa chỉ", { exact: true }).fill("01 Đường thử nghiệm");
  await page.getByLabel("Bắt đầu", { exact: true }).fill(date(2, 18));
  await page.getByLabel("Kết thúc", { exact: true }).fill(date(2, 22));
  await page.getByLabel("Mở check-in", { exact: true }).fill(date(2, 17));
  await page.getByLabel("Đóng check-in", { exact: true }).fill(date(2, 21));
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/organizer\/events\//);
  await page.getByLabel("Tên loại vé", { exact: true }).fill("Vé web");
  await page.getByLabel("Giá vé (đ)", { exact: true }).fill("50000");
  await page.getByLabel("Số lượng", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Thêm loại vé" }).click();
  await expect(page.getByText("Vé web", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gửi Admin phê duyệt" }).click();
  await expect(
    page.getByText("Chờ duyệt", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await login(page, "admin@example.test");
  await page.goto("/admin/events");
  const card = page
    .locator(".review-card")
    .filter({ has: page.getByRole("heading", { name: slug, exact: true }) });
  await card.getByRole("button", { name: "Lưu quyết định" }).click();
  await expect(
    card.getByRole("button", { name: "Lưu quyết định" }),
  ).toHaveCount(0);
  await page.goto(`/events/${slug}`);
  await expect(
    page.getByRole("heading", { name: slug, exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Số lượng Vé web")).toBeVisible();
});

test("editing a sold event preserves timestamps while real schedule changes remain blocked", async ({
  page,
  request,
}) => {
  const owner = (
    await (
      await request.post("/api/auth/login", {
        data: { email: "organizer@example.test", password },
      })
    ).json()
  ).data;
  const admin = (
    await (
      await request.post("/api/auth/login", {
        data: { email: "admin@example.test", password },
      })
    ).json()
  ).data;
  const headers = { Authorization: `Bearer ${owner.accessToken}` };
  const category = (await (await request.get("/api/categories")).json())
    .data[0];
  const start = new Date(Date.now() + 86400000);
  start.setSeconds(37, 123);
  const body = {
    categoryId: category.id,
    slug: `timestamp-${crypto.randomUUID()}`,
    title: "Timestamp regression",
    description: "Preserve the original schedule",
    venueName: "Hall",
    address: "01 Test",
    cityCode: "DN",
    startsAt: start.toISOString(),
    endsAt: new Date(+start + 7200000).toISOString(),
    checkinOpensAt: new Date(+start - 3600000).toISOString(),
    checkinClosesAt: new Date(+start + 3600000).toISOString(),
  };
  const created = await request.post("/api/organizer/events", {
    headers,
    data: body,
  });
  expect(created.ok()).toBeTruthy();
  const event = (await created.json()).data;
  const ticket = (
    await (
      await request.post(`/api/organizer/events/${event.id}/ticket-types`, {
        headers,
        data: {
          name: "Standard",
          price: "100000",
          capacity: 1,
          saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
          saleEndsAt: body.startsAt,
        },
      })
    ).json()
  ).data;
  expect(
    (
      await request.post(`/api/organizer/events/${event.id}/submit`, {
        headers,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post(`/api/admin/events/${event.id}/review`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
        data: { approve: true },
      })
    ).ok(),
  ).toBeTruthy();
  const order = (
    await (
      await request.post("/api/orders", {
        headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
        data: {
          eventId: event.id,
          items: [{ ticketTypeId: ticket.id, quantity: 1 }],
        },
      })
    ).json()
  ).data;
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
  await login(page, "organizer@example.test");
  await page.goto(`/organizer/events/${event.id}`);
  await expect(page.getByLabel("Danh mục", { exact: true })).toHaveValue(
    category.id,
  );
  await page
    .getByLabel("Tên sự kiện", { exact: true })
    .fill("Updated title, same schedule");
  const saved = page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" &&
      r.url().endsWith(`/api/organizer/events/${event.id}`),
  );
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const payload = response.request().postDataJSON();
  for (const key of [
    "startsAt",
    "endsAt",
    "checkinOpensAt",
    "checkinClosesAt",
  ] as const)
    expect(payload[key]).toBe(body[key]);
  await expect(
    page.getByText("Bản nháp", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Tên sự kiện", { exact: true })).toHaveValue(
    "Updated title, same schedule",
  );
  const changed = new Date(+start + 60000);
  const local = new Date(+changed - changed.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("Bắt đầu", { exact: true }).fill(local);
  const refused = page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" &&
      r.url().endsWith(`/api/organizer/events/${event.id}`),
  );
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const rejection = await refused;
  expect(rejection.status()).toBe(409);
  expect((await rejection.json()).code).toBe("SOLD_EVENT");
});
