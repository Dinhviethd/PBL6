import { test, expect, type Page } from "@playwright/test";
const password = process.env.DEMO_PASSWORD || "LocalDemo2026!";
async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Mật khẩu (ít nhất 8 ký tự)", { exact: true })
    .fill(password);
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST'),
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
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
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
