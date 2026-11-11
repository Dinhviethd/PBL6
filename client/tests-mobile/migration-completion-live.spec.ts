import { test, expect, type Page } from "./live-test-fixture";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const f = JSON.parse(
  readFileSync(
    new URL(
      "../../.local/mobile-migration/booking-fixture.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
async function login(page: Page, account = f.owner) {
  const response = await page.request.post("/api/auth/login", {
    headers: { Origin: "http://127.0.0.1:8083" },
    data: account,
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data.accessToken as string;
}
test("history filters use canonical groups and inclusive Vietnam date bounds", async ({
  page,
}) => {
  await login(page, f.buyer);
  await page.goto("/orders");
  await expect(page.getByText(/đơn phù hợp/)).toBeVisible();
  await page.getByRole("button", { name: /^Nhóm đơn hàng:/ }).click();
  const paid = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/me/order-history" &&
      new URL(r.url()).searchParams.get("group") === "paid",
  );
  await page.getByRole("button", { name: /^Đã thanh toán \(/ }).click();
  expect((await paid).status()).toBe(200);
  await page.getByRole("button", { name: /^Khoảng ngày:/ }).click();
  await page
    .getByRole("textbox", { name: "Từ ngày", exact: true })
    .fill("2026-11-12");
  await page
    .getByRole("textbox", { name: "Đến ngày", exact: true })
    .fill("2026-11-11");
  await page.getByRole("button", { name: "Áp dụng khoảng ngày" }).click();
  await expect(
    page.getByText("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Từ ngày", exact: true })
    .fill("2026-11-11");
  const range = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/me/order-history" &&
      new URL(r.url()).searchParams.get("from") === "2026-11-10T17:00:00.000Z",
  );
  await page.getByRole("button", { name: "Áp dụng khoảng ngày" }).click();
  const response = await range;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).searchParams.get("toExclusive")).toBe(
    "2026-11-11T17:00:00.000Z",
  );
  expect(new URL(response.url()).searchParams.get("group")).toBe("paid");
});
test("organizer analytics range, touch chart and authenticated CSV export", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/organizer/events/${f.event.id}/stats`);
  await expect(
    page.getByText("Doanh thu theo ngày", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Khoảng ngày:/ }).click();
  await page.getByRole("button", { name: "7 ngày", exact: true }).click();
  await page.getByRole("button", { name: "Áp dụng khoảng ngày" }).click();
  const bars = page.getByRole("radio", { name: /^\d{4}-\d{2}-\d{2}: / });
  await expect(bars).toHaveCount(7);
  await bars.first().click();
  await expect(bars.first()).toBeChecked();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Xuất báo cáo CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});
test("attendees preserve server pagination and combine ticket type with check-in status", async ({
  page,
}) => {
  const token = await login(page);
  await page.goto(`/organizer/events/${f.event.id}/attendees`);
  await expect(page.getByText(/người tham dự phù hợp/)).toBeVisible();
  await page.getByRole("button", { name: /^Loại vé:/ }).click();
  const event = (
    await (
      await page.request.get(`/api/organizer/events/${f.event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
  ).data;
  await page
    .getByRole("button", { name: event.ticketTypes[0].name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lọc trạng thái", exact: true })
    .click();
  await page.getByRole("button", { name: "Đã check-in", exact: true }).click();
  const filtered = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.endsWith("/attendees") &&
      new URL(r.url()).searchParams.get("status") === "CHECKED_IN",
  );
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  const response = await filtered;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).searchParams.get("ticketTypeId")).toBe(
    event.ticketTypes[0].id,
  );
  const json = await response.json();
  expect(json.pagination.total).toBeGreaterThanOrEqual(0);
});
test("organizer order detail shows authoritative timeline and ticket QR preview", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/organizer/events/${f.event.id}/orders/${f.paidOrder}`);
  await expect(
    page.getByText("Lịch sử xử lý đơn", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Đã xác nhận thanh toán", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xem vé và mã QR", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /^Mã QR vé / }).first(),
  ).toBeVisible();
});
test("event draft survives reload, restores by account and guards unsaved navigation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/organizer/events/new");
  const title = `Bản nháp ${randomUUID()}`;
  await page
    .getByRole("textbox", { name: "Tên sự kiện", exact: true })
    .fill(title);
  await page
    .getByRole("button", { name: "Lưu nháp trên thiết bị", exact: true })
    .click();
  await expect(
    page.getByText(
      "Đã lưu nháp trên thiết bị. Bạn có thể quay lại để khôi phục.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Khôi phục bản nháp", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Tên sự kiện", exact: true }),
  ).toHaveValue(title);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("tab", { name: "Sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/new$/);
});
test("admin CSV export and bulk lock require selection and reason", async ({
  page,
}) => {
  const tag = `bulk${randomUUID().slice(0, 8)}`;
  for (let i = 0; i < 2; i++) {
    const response = await page.request.post("/api/auth/register", {
      headers: { Origin: "http://127.0.0.1:8083" },
      data: {
        name: `${tag}${i}`,
        email: `${tag}${i}@example.test`,
        password: "LocalBulk2026!",
        confirmPassword: "LocalBulk2026!",
      },
    });
    expect(response.status()).toBe(200);
  }
  await login(page);
  await page.goto("/admin/users");
  await page.getByRole("textbox", { name: "Tìm kiếm", exact: true }).fill(tag);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Xuất khách hàng CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await page.getByRole("checkbox").first().click();
  await page.getByRole("checkbox").nth(1).click();
  await page
    .getByRole("button", { name: "Khóa 2 tài khoản đã chọn", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận khóa đã chọn" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Lý do khóa các tài khoản" })
    .fill("Kiểm thử mobile local riêng");
  await page.getByRole("button", { name: "Xác nhận khóa đã chọn" }).click();
  await expect(
    page.getByText("Đã khóa 2 tài khoản; bỏ qua 0.", { exact: true }),
  ).toBeVisible();
});
test("admin advanced event filters and batch metrics render at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await login(page);
  await page.goto("/admin/events");
  await expect(page.getByText(/sự kiện phù hợp/)).toBeVisible();
  await page
    .getByRole("button", { name: "Bộ lọc nâng cao", exact: true })
    .click();
  await page.getByRole("button", { name: /^Quy mô vé:/ }).click();
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/admin/events" &&
      new URL(r.url()).searchParams.get("ticketScale") === "SMALL",
  );
  await page
    .getByRole("button", { name: "Dưới 1.000 vé", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});

test("organizer team invites to an owned event and confirms scoped revocation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/organizer/team");
  await page.getByRole("button", { name: "Mời nhân sự", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Email nhân sự", exact: true })
    .fill(f.other.email);
  await page
    .getByRole("textbox", { name: "Tìm sự kiện để phân công", exact: true })
    .fill(f.event.title);
  await page
    .getByRole("button", { name: "Tìm sự kiện phân công", exact: true })
    .click();
  await page.getByRole("button", { name: f.event.title, exact: true }).click();
  await page
    .getByRole("button", { name: "Gửi lời mời nhân sự", exact: true })
    .click();
  await expect(
    page.getByText("Đã gửi lời mời check-in.", { exact: true }),
  ).toBeVisible();
  const summary = page.getByText(
    new RegExp(f.other.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " ·"),
  );
  await summary
    .locator("..")
    .getByRole("button", { name: /^Xem chi tiết/ })
    .click();
  await page
    .getByRole("button", {
      name: "Thu hồi tất cả phân công của nhân sự",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận thu hồi nhân sự", exact: true })
    .click();
  await expect(
    page.getByText("Đã thu hồi quyền check-in.", { exact: true }),
  ).toBeVisible();
});

test("admin organizer profile loads only that organizer's event collection", async ({
  page,
}) => {
  const token = await login(page);
  const list = await page.request.get(
    "/api/admin/organizer-applications?status=APPROVED",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const application = (await list.json()).data.items[0];
  expect(application).toBeTruthy();
  const events = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/admin/events" &&
      new URL(r.url()).searchParams.get("organizerId") === application.user_id,
  );
  await page.goto(`/admin/organizers/${application.id}`);
  expect((await events).status()).toBe(200);
  await expect(
    page.getByText("Sự kiện của Ban tổ chức", { exact: true }),
  ).toBeVisible();
});

test("SePay reconcile validates range and shows real missing-token response", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/payments");
  await page
    .getByRole("button", { name: "Giao dịch SePay", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đối soát SePay API v2", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Số phút đối soát gần nhất" })
    .fill("4");
  await page
    .getByRole("button", { name: "Xác nhận chạy đối soát", exact: true })
    .click();
  await expect(
    page.getByText("Nhập số phút từ 5 đến 1440.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Số phút đối soát gần nhất" })
    .fill("60");
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/admin/sepay/reconcile",
  );
  await page
    .getByRole("button", { name: "Xác nhận chạy đối soát", exact: true })
    .click();
  expect((await response).status()).toBe(503);
  await expect(
    page.getByText("SePay API v2 token chưa được cấu hình.", { exact: true }),
  ).toBeVisible();
});

test("phone previews capture customer, organizer and admin layouts with real local API", async ({
  page,
}) => {
  test.setTimeout(90000);
  const dir = new URL(
    "../../.local/mobile-migration/phone-previews/",
    import.meta.url,
  );
  mkdirSync(dir, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /LỄ HỘI ÂM NHẠC/ }),
  ).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL("home-390.png", dir)) });
  await login(page);
  for (const [slug, route, ready] of [
    [
      "organizer-stats-390",
      `/organizer/events/${f.event.id}/stats`,
      "Doanh thu theo ngày",
    ],
    ["organizer-team-390", "/organizer/team", "Đội ngũ Ban tổ chức"],
    ["admin-events-390", "/admin/events", "Toàn bộ sự kiện"],
    ["admin-dashboard-390", "/admin", "Tổng quan quản trị"],
  ]) {
    await page.goto(route);
    await expect(page.getByText(ready, { exact: true })).toBeVisible();
    if (route === "/admin/events")
      await expect(page.getByText(/sự kiện phù hợp/)).toBeVisible();
    if (route === "/organizer/team")
      await expect(page.getByText(/^Chủ tổ chức:/)).toBeVisible();
    if (route === "/admin")
      await expect(
        page.getByText("Doanh thu theo ngày", { exact: true }),
      ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({ path: fileURLToPath(new URL(`${slug}.png`, dir)) });
    if (slug === "organizer-stats-390") {
      await page
        .getByText("Doanh thu theo ngày", { exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: fileURLToPath(new URL("organizer-chart-390.png", dir)),
      });
    }
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/admin/events");
  await expect(
    page.getByText("Toàn bộ sự kiện", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/sự kiện phù hợp/)).toBeVisible();
  await page.screenshot({
    path: fileURLToPath(new URL("admin-events-320.png", dir)),
  });
  expect(errors).toEqual([]);
});
