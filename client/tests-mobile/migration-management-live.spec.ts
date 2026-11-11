import { test, expect, type Page } from "./live-test-fixture";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../.local/mobile-migration/booking-fixture.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
async function login(page: Page) {
  const result = await page.request.post("/api/auth/login", {
    headers: { Origin: "http://127.0.0.1:8083" },
    data: fixture.owner,
  });
  expect(result.ok()).toBeTruthy();
}
async function field(page: Page, name: string, val: string) {
  await page.getByRole("textbox", { name, exact: true }).fill(val);
}

test("real public API: price sheet validates ranges and sends zero-priced bounds", async ({
  page,
}) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await field(page, "Giá vé tối thiểu (VND)", "200000");
  await field(page, "Giá vé tối đa (VND)", "100000");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(
    page.getByText("Giá tối đa phải bằng hoặc lớn hơn giá tối thiểu.", {
      exact: true,
    }),
  ).toBeVisible();
  await field(page, "Giá vé tối thiểu (VND)", "0");
  await field(page, "Giá vé tối đa (VND)", "0");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/events" &&
      new URL(r.url()).searchParams.get("maxPrice") === "0",
  );
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  expect(new URL(result.url()).searchParams.get("minPrice")).toBe("0");
  expect((await result.json()).data.items).toEqual([]);
});

test("real API: organizer creates event and ticket, submits it, admin approves in mobile UI", async ({
  page,
}) => {
  await login(page);
  const title = `Sự kiện UI ${randomUUID().slice(0, 8)}`;
  await page.goto("/organizer/events/new");
  await field(page, "Tên sự kiện", title);
  await field(
    page,
    "Mô tả sự kiện",
    "Sự kiện kiểm thử giao diện mobile với API thật.",
  );
  await field(page, "Tên địa điểm", "Hội trường kiểm thử");
  await field(page, "Địa chỉ", "Địa chỉ QA");
  await field(page, "Tỉnh / Thành phố", "Đà Nẵng");
  await page
    .getByRole("button", { name: "Danh mục: Chọn danh mục", exact: true })
    .click();
  const category = (await (await page.request.get("/api/categories")).json())
    .data[0];
  await page.getByRole("button", { name: category.name, exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const baseline = Date.now();
  const date = (offset: number) => new Date(baseline + offset).toISOString();
  await field(page, "Bắt đầu sự kiện (ISO, có múi giờ)", date(86400000));
  await field(page, "Kết thúc sự kiện (ISO, có múi giờ)", date(172800000));
  await field(page, "Mở check-in (ISO, có múi giờ)", date(-3600000));
  await field(page, "Đóng check-in (ISO, có múi giờ)", date(172800000));
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/events\/[\da-f-]+$/);
  const id = new URL(page.url()).pathname.split("/").pop();
  await page.getByRole("button", { name: "Loại vé", exact: true }).click();
  await page.getByRole("button", { name: "Thêm loại vé", exact: true }).click();
  await field(page, "Tên loại vé", "Vé UI");
  await field(page, "Mô tả", "Vé kiểm thử");
  await field(page, "Giá vé (VND)", "100000");
  await field(page, "Số lượng vé", "30");
  await field(page, "Mở bán (ISO, có múi giờ)", date(-3600000));
  await field(page, "Đóng bán (ISO, có múi giờ)", date(86400000));
  await page.getByRole("button", { name: "Lưu loại vé", exact: true }).click();
  await expect(page.getByText("Vé UI", { exact: true })).toBeVisible();
  await page.goto(`/organizer/events/${id}`);
  await page
    .getByRole("button", { name: "Gửi sự kiện xét duyệt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận thao tác", exact: true })
    .click();
  await expect(page.getByText("Chờ xét duyệt", { exact: true })).toBeVisible();
  await page.goto(`/admin/events/${id}`);
  await page.getByRole("button", { name: "Phê duyệt", exact: true }).click();
  await page
    .getByRole("button", { name: "Xác nhận quyết định", exact: true })
    .click();
  await expect(page.getByText("Đã xuất bản", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../.local/mobile-migration/admin-event-approved-390.png",
    fullPage: true,
  });
});

test("real API: category create/edit/archive in mobile sheets", async ({
  page,
}) => {
  await login(page);
  const name = `Danh mục UI ${randomUUID().slice(0, 8)}`;
  await page.goto("/admin/categories");
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await field(page, "Tên danh mục", name);
  await field(page, "Mô tả danh mục", "Tạo từ UI mobile");
  await page.getByRole("button", { name: "Lưu danh mục", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Tên danh mục", exact: true }),
  ).toHaveCount(0);
  await field(page, "Tìm kiếm", name);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page
    .getByRole("button", { name: `Xem chi tiết ${name}`, exact: true })
    .click();
  await field(page, "Mô tả danh mục", "Mô tả đã chỉnh sửa");
  await page.getByRole("button", { name: "Lưu danh mục", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Tên danh mục", exact: true }),
  ).toHaveCount(0);
  await field(page, "Tìm kiếm", name);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page
    .getByRole("button", { name: `Xem chi tiết ${name}`, exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Mô tả danh mục", exact: true }),
  ).toHaveValue("Mô tả đã chỉnh sửa");
  await page.getByRole("button", { name: "Ẩn danh mục", exact: true }).click();
  await page
    .getByRole("button", { name: "Xác nhận ẩn danh mục", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Tên danh mục", exact: true }),
  ).toHaveCount(0);
  await field(page, "Tìm kiếm", name);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByText(/Đã ẩn/)).toBeVisible();
});

test("role guards reject customer deep links to organizer/admin without showing private data", async ({
  page,
}) => {
  const credentials = {
    name: "Customer QA",
    email: `${randomUUID()}@example.test`,
    password: "MobileTest2026!",
    confirmPassword: "MobileTest2026!",
  };
  expect(
    (
      await page.request.post("/api/auth/register", {
        headers: { Origin: "http://127.0.0.1:8083" },
        data: credentials,
      })
    ).ok(),
  ).toBeTruthy();
  for (const route of [
    "/admin/users",
    `/organizer/events/${fixture.event.id}`,
  ]) {
    await page.goto(route);
    await expect(
      page.getByText("Bạn chưa có quyền truy cập", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(fixture.event.title, { exact: true }),
    ).toHaveCount(0);
  }
});

test("real API: customer submits organizer application and admin rejects it with a reason", async ({
  page,
}) => {
  const credentials = {
    name: "Ứng viên BTC",
    email: `${randomUUID()}@example.test`,
    password: "MobileTest2026!",
    confirmPassword: "MobileTest2026!",
  };
  expect(
    (
      await page.request.post("/api/auth/register", {
        headers: { Origin: "http://127.0.0.1:8083" },
        data: credentials,
      })
    ).ok(),
  ).toBeTruthy();
  const organization = `BTC UI ${randomUUID().slice(0, 8)}`;
  await page.goto("/register-organizer");
  for (const [name, val] of [
    ["Tên Ban tổ chức", organization],
    ["Người liên hệ", "Ứng viên BTC"],
    ["Email liên hệ", credentials.email],
    ["Số điện thoại liên hệ", "0900000000"],
  ])
    await field(page, name, val);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const [name, val] of [
    ["Tên pháp nhân", "Công ty QA"],
    ["Mã số thuế / Giấy phép kinh doanh", "QA-TEST-ONLY"],
    ["Địa chỉ trụ sở", "Địa chỉ kiểm thử"],
    ["Website / Mạng xã hội", "https://example.test"],
  ])
    await field(page, name, val);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const [name, val] of [
    ["Giới thiệu tổ chức", "Tổ chức sự kiện kiểm thử mobile"],
    ["Loại sự kiện chính", "Âm nhạc"],
    ["Quy mô sự kiện dự kiến", "100 người"],
  ])
    await field(page, name, val);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page
    .getByRole("switch", { name: "Xác nhận thông tin hồ sơ chính xác" })
    .check();
  await page
    .getByRole("button", { name: "Gửi hồ sơ xét duyệt", exact: true })
    .click();
  await expect(page.getByText("Chờ xét duyệt", { exact: true })).toBeVisible();
  await login(page);
  await page.goto("/admin/applications");
  await field(page, "Tìm kiếm", organization);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page
    .getByRole("button", { name: `Xem chi tiết ${organization}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Từ chối", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Xác nhận quyết định", exact: true }),
  ).toBeDisabled();
  await field(page, "Lý do từ chối", "Hồ sơ kiểm thử cần bổ sung thông tin.");
  await page
    .getByRole("button", { name: "Xác nhận quyết định", exact: true })
    .click();
  await expect(page.getByText("Đã từ chối", { exact: true })).toBeVisible();
});

test("management routes render real data without runtime exceptions or horizontal overflow at 320/390", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "/organizer",
    "/organizer/events",
    `/organizer/events/${fixture.event.id}`,
    `/organizer/events/${fixture.event.id}/orders`,
    `/organizer/events/${fixture.event.id}/orders/${fixture.paidOrder}`,
    `/organizer/events/${fixture.event.id}/attendees`,
    `/organizer/events/${fixture.event.id}/staff`,
    `/organizer/events/${fixture.event.id}/stats`,
    `/organizer/events/${fixture.event.id}/checkins`,
    "/organizer/profile",
    "/admin",
    "/admin/manage",
    "/admin/users",
    "/admin/organizers",
    "/admin/applications",
    "/admin/events",
    "/admin/reviews",
    "/admin/payments",
    "/admin/settings",
    "/admin/legal-requests",
    "/admin/administrators",
    `/admin/transactions/${fixture.reviewTransactionId}`,
  ];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Unmatched Route", { exact: true }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});
