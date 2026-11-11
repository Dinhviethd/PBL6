import { test, expect, type Page } from "@playwright/test";

const categoryId = "81ab66e7-a3cd-4a70-b5d4-33c073a8114e";
const event = {
  id: "home-event",
  slug: "home-concert",
  title: "Đêm nhạc bên sông Hàn",
  starts_at: "2026-11-20T12:00:00Z",
  venue_name: "Sân khấu bên sông",
  city_code: "Đà Nẵng",
  priceFrom: "0",
  cover_image_url: "/missing-home-cover.png",
};
async function mockHome(
  page: Page,
  options: {
    failEvents?: boolean;
    failCategories?: boolean;
    guest?: boolean;
  } = {},
) {
  const calls: URL[] = [];
  await page.route("**/missing-home-cover.png", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    let data: unknown = [];
    if (url.pathname === "/api/auth/refresh-token") {
      if (options.guest)
        return route.fulfill({
          status: 401,
          json: { success: false, code: "INVALID_SESSION" },
        });
      data = { accessToken: "home-test-token" };
    } else if (url.pathname === "/api/auth/me")
      data = { idUser: "home-user", name: "Minh Anh", roles: ["USER"] };
    else if (url.pathname === "/api/categories") {
      if (options.failCategories)
        return route.fulfill({
          status: 503,
          json: { success: false, message: "Không tải được danh mục" },
        });
      data = [
        { id: categoryId, name: "Âm nhạc", slug: "am-nhac" },
        { id: "technology", name: "Công nghệ", slug: "cong-nghe" },
      ];
    } else if (url.pathname === "/api/config") data = { paymentMode: "demo" };
    else if (url.pathname === "/api/me/notifications/count")
      data = { unreadCount: 2 };
    else if (url.pathname === "/api/events") {
      if (options.failEvents)
        return route.fulfill({
          status: 503,
          json: { success: false, message: "Không tải được sự kiện" },
        });
      data = {
        items:
          url.searchParams.get("q") === "khong-co"
            ? []
            : Array.from({ length: 7 }, (_, i) => ({
                ...event,
                id: `home-${i}`,
                slug: `home-concert-${i}`,
              })),
        total: 25,
      };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return { calls, options };
}

for (const width of [320, 360, 390, 430, 768]) {
  test(`home sections and native routes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await mockHome(page, { guest: true });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /LỄ HỘI ÂM NHẠC/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `../.local/qa/home-mobile-top-${width}.png`,
    });
    await expect(page.getByText("Miễn phí", { exact: true })).toHaveCount(6);
    for (const title of [
      "Danh mục sự kiện nổi bật",
      "Sự kiện nổi bật",
      "Sẵn sàng cho khoảnh khắc đáng nhớ?",
      "Đưa sự kiện của bạn đến gần khán giả hơn.",
    ]) {
      const heading = page.getByRole("heading", { name: title, exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeInViewport();
    }
    await page
      .getByRole("button", { name: "Bắt đầu tổ chức", exact: true })
      .click();
    await expect(page).toHaveURL(/\/register-organizer$/);
    await expect(
      page.getByRole("heading", { name: "Đăng ký Ban tổ chức", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await page
      .getByRole("button", { name: "Chính sách & Pháp lý", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Chính sách bảo mật", exact: true })
      .click();
    await expect(
      page.getByText("Chức năng đang phát triển", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    await page.screenshot({
      path: `../.local/qa/home-mobile-bottom-${width}.png`,
    });
    await page
      .getByRole("button", { name: "Danh mục Âm nhạc", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/explore\\?.*category=${categoryId}`),
    );
    await expect(
      page.getByText("Sự kiện dành cho bạn", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("search preserves home draft, filters calendar dates and resets pagination", async ({
  page,
}) => {
  const { calls } = await mockHome(page);
  await page.goto("/");
  await page.getByLabel("Tìm sự kiện", { exact: true }).fill("âm nhạc");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("button", { name: "Đà Nẵng", exact: true }).click();
  await page
    .getByRole("button", { name: "Từ ngày: Chọn ngày", exact: true })
    .click();
  await page.getByRole("button", { name: /Chọn ngày \d{4}-\d{2}-10$/ }).click();
  await page
    .getByRole("button", { name: "Đến ngày: Chọn ngày", exact: true })
    .click();
  await page.getByRole("button", { name: /Chọn ngày \d{4}-\d{2}-09$/ }).click();
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(
    page.getByText("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu."),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Đến ngày: / }).click();
  await page.getByRole("button", { name: /Chọn ngày \d{4}-\d{2}-20$/ }).click();
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?/);
  await expect
    .poll(() =>
      calls.some(
        (url) =>
          url.pathname === "/api/events" &&
          url.searchParams.get("city") === "Đà Nẵng" &&
          url.searchParams.has("from") &&
          url.searchParams.has("to") &&
          url.searchParams.get("q") === "âm nhạc",
      ),
    )
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Tải thêm", exact: true })
    .evaluate((element) => (element as HTMLElement).click());
  await expect
    .poll(() => calls.some((url) => url.searchParams.get("page") === "1"))
    .toBeTruthy();
  const beforeClear = calls.length;
  await page
    .getByRole("button", { name: "Xóa tất cả bộ lọc", exact: true })
    .click();
  await expect
    .poll(() =>
      calls
        .slice(beforeClear)
        .some(
          (url) =>
            url.pathname === "/api/events" &&
            url.searchParams.get("page") === "0" &&
            !url.searchParams.has("q"),
        ),
    )
    .toBeTruthy();
  await expect(page.getByText(/^Trang \d+$/)).toHaveCount(0);
  await page.goBack();
  await expect(page.getByLabel("Tìm sự kiện", { exact: true })).toHaveValue(
    "âm nhạc",
  );
});

test("event errors can retry independently without displaying an empty result", async ({
  page,
}) => {
  const { options } = await mockHome(page, { failEvents: true });
  await page.goto("/");
  await expect(
    page.getByText("Không tải được sự kiện", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Chưa có sự kiện phù hợp. Hãy thử điều chỉnh bộ lọc."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Danh mục Âm nhạc", exact: true }),
  ).toBeVisible();
  options.failEvents = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByText("Miễn phí", { exact: true })).toHaveCount(6);
});

test("category failure preserves event cards and empty search can be cleared", async ({
  page,
}) => {
  const { options } = await mockHome(page, { failCategories: true });
  await page.goto("/");
  await expect(
    page.getByText("Không tải được danh mục", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Miễn phí", { exact: true })).toHaveCount(6);
  options.failCategories = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Danh mục Âm nhạc", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tìm sự kiện", { exact: true }).fill("khong-co");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    page.getByText("Chưa có sự kiện phù hợp. Hãy thử bộ lọc khác."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xóa tất cả bộ lọc", exact: true })
    .click();
  await expect
    .poll(async () => {
      const prices = await page.getByText("Miễn phí", { exact: true }).all();
      return (
        await Promise.all(prices.map((price) => price.isVisible()))
      ).filter(Boolean).length;
    })
    .toBe(7);
});

test("filter sheet remains usable on a short landscape viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await mockHome(page, { guest: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("button", { name: "Đà Nẵng", exact: true }).click();
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Thành phố: Đà Nẵng", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("home poster routes to mobile detail and account tabs still work", async ({
  page,
}) => {
  await mockHome(page, { guest: true });
  await page.goto("/");
  await page
    .getByRole("button", { name: `Xem sự kiện: ${event.title}`, exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/events\/home-concert-0$/);
  await page.goBack();
  await page.getByRole("button", { name: "Vé của tôi", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
