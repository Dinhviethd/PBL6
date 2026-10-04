import { test, expect } from "@playwright/test";
const password = process.env.DEMO_PASSWORD || "LocalDemo2026!";
test("Expo customer buys a ticket, accepts staff assignment, scans and loses revoked access", async ({
  page,
  request,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("Sự kiện dành cho bạn", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Xem sự kiện: Đêm nhạc bên sông Hàn",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "../.local/qa/mobile-explore.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const email = `expo-${Date.now()}@example.test`;
  await page.goto("/auth");
  await page
    .getByRole("button", { name: "Chưa có tài khoản? Đăng ký", exact: true })
    .click();
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách mobile");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/events/dem-nhac-song-han");
  await page
    .getByRole("button", { name: "Thêm Vé tiêu chuẩn", exact: true })
    .click();
  await page.getByRole("button", { name: "Đặt 1 vé", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await page
    .getByRole("button", { name: "Tiếp tục thanh toán", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Mô phỏng thanh toán thành công",
      exact: true,
    })
    .click();
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mở ví vé QR", exact: true }).click();
  await page
    .getByRole("button", { name: /^Mở vé / })
    .first()
    .click();
  await expect(
    page.getByRole("img", { name: "Mã QR của vé", exact: true }),
  ).toBeVisible();
  const code = await page.getByLabel("Mã vé", { exact: true }).innerText();
  await page.screenshot({
    path: "../.local/qa/mobile-ticket.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Mã QR của vé", exact: true }),
  ).toBeVisible();

  const organizer = (
    await (
      await request.post("/api/auth/login", {
        data: { email: "organizer@example.test", password },
      })
    ).json()
  ).data;
  const headers = { Authorization: `Bearer ${organizer.accessToken}` };
  const event = (
    await (await request.get("/api/events/dem-nhac-song-han")).json()
  ).data;
  const invitationResponse = await request.post(
    `/api/organizer/events/${event.id}/staff`,
    { headers, data: { email } },
  );
  expect(invitationResponse.ok()).toBeTruthy();
  const invitation = (await invitationResponse.json()).data;
  await page.goto("/staff");
  await page
    .getByRole("button", { name: "Chấp nhận lời mời", exact: true })
    .click();
  await page.getByRole("button", { name: "Mở quét vé", exact: true }).click();
  await page.getByLabel("Mã vé / nội dung QR", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Kiểm tra & check-in", exact: true })
    .click();
  await expect(page.getByText(/Check-in thành công/)).toBeVisible();
  await page.screenshot({
    path: "../.local/qa/mobile-checkin.png",
    fullPage: true,
  });
  await page.getByLabel("Mã vé / nội dung QR", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Kiểm tra & check-in", exact: true })
    .click();
  await expect(page.getByText(/Vé đã check-in lúc/)).toBeVisible();
  expect(
    (
      await request.delete(
        `/api/organizer/events/${event.id}/staff/${invitation.id}`,
        { headers },
      )
    ).ok(),
  ).toBeTruthy();
  await page.getByLabel("Mã vé / nội dung QR", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Kiểm tra & check-in", exact: true })
    .click();
  await expect(page.getByText(/quyền đã bị thu hồi/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bật camera quét QR" }),
  ).toHaveCount(0);
  await page.goto("/account");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.goto("/tickets");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  assertNoErrors();
  function assertNoErrors() {
    expect(failures).toEqual([]);
  }
});
