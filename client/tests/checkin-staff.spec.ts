import { test, expect, type Page } from "@playwright/test";

const password = process.env.DEMO_PASSWORD || "LocalDemo2026!";
async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Mật khẩu (ít nhất 8 ký tự)", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
}

test("organizer invites staff, staff accepts and scans, organizer audits and revokes", async ({
  page,
  browser,
  request,
}) => {
  const email = `staff-web-${Date.now()}@example.test`;
  const registered = await request.post("/api/auth/register", {
    data: {
      name: "Nhân viên cửa vào",
      email,
      password,
      confirmPassword: password,
    },
  });
  expect(registered.ok()).toBeTruthy();
  const staff = (await registered.json()).data;
  const headers = { Authorization: `Bearer ${staff.accessToken}` };
  const event = (
    await (await request.get("/api/events/dem-nhac-song-han")).json()
  ).data;
  const ordered = await request.post("/api/orders", {
    headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
    data: {
      eventId: event.id,
      items: [{ ticketTypeId: event.ticketTypes[0].id, quantity: 1 }],
    },
  });
  expect(ordered.ok()).toBeTruthy();
  const order = (await ordered.json()).data;
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
  const ticket = (
    await (await request.get("/api/me/tickets", { headers })).json()
  ).data[0];

  await login(page, "organizer@example.test");
  await page.goto(`/organizer/events/${event.id}/staff`);
  await page.getByLabel("Email nhân viên").fill(email);
  await page.getByRole("button", { name: "Gửi lời mời" }).click();
  await expect(page.getByRole("cell", { name: /Chờ chấp nhận/ })).toBeVisible();
  await page.screenshot({
    path: "../.local/qa/staff-management.png",
    fullPage: true,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const staffPage = await context.newPage();
  try {
    await login(staffPage, email);
    await staffPage
      .getByRole("link", { name: "Nhân viên check-in", exact: true })
      .click();
    await expect(
      staffPage.getByRole("heading", { name: event.title }),
    ).toBeVisible();
    await staffPage.screenshot({
      path: "../.local/qa/staff-invitation-mobile.png",
      fullPage: true,
    });
    expect(
      await staffPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await staffPage
      .getByRole("button", { name: "Chấp nhận", exact: true })
      .click();
    await staffPage.getByRole("link", { name: "Mở quét vé" }).click();
    await staffPage.getByLabel("Mã vé / nội dung QR").fill(ticket.ticket_code);
    await staffPage
      .getByRole("button", { name: "Kiểm tra & check-in" })
      .click();
    await expect(staffPage.getByText(/Check-in thành công/)).toBeVisible();
    await staffPage.screenshot({
      path: "../.local/qa/staff-scanner-mobile.png",
      fullPage: true,
    });
    await staffPage
      .getByRole("button", { name: "Kiểm tra & check-in" })
      .click();
    await expect(staffPage.getByText(/Vé đã check-in lúc/)).toBeVisible();

    await page.getByRole("link", { name: "Nhật ký check-in" }).click();
    const row = page.getByRole("row").filter({ hasText: ticket.ticket_code });
    await expect(row).toContainText("Nhân viên cửa vào");
    await expect(row).toContainText("Nhập mã");
    await page.screenshot({
      path: "../.local/qa/staff-history.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Nhân viên", exact: true }).click();
    await page
      .getByRole("row")
      .filter({ hasText: email })
      .getByRole("button", { name: "Thu hồi quyền / lời mời" })
      .click();
    await expect(
      page.getByRole("row").filter({ hasText: email }),
    ).toContainText("Đã thu hồi");
    await staffPage
      .getByRole("button", { name: "Kiểm tra & check-in" })
      .click();
    await expect(staffPage.getByText(/quyền đã bị thu hồi/)).toBeVisible();
    await staffPage.reload();
    await expect(staffPage.getByText(/quyền đã bị thu hồi/)).toBeVisible();
    await expect(
      staffPage.getByRole("button", { name: "Bật camera quét QR" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
