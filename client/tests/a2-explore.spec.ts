import { test, expect } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

// Live, read-only integration checks. Run against the local frontend + backend;
// no seeded accounts, mocked event data, or writes to application data.
test("A2 uses live data, filters, pagination and shared navigation", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/events?page=0");
  expect(response.ok()).toBeTruthy();
  const { data } = await response.json();
  expect(data.items.length).toBeGreaterThan(0);
  const first = data.items[0];
  await page.goto("/explore");
  await expect(page.locator(".explore-card")).toHaveCount(
    Math.min(6, data.items.length),
  );
  await expect(page.locator(".auth-header")).toHaveCount(1);
  await expect(page.locator(".auth-footer")).toHaveCount(1);
  await expect(page.locator(".site-header")).toHaveCount(0);
  await expect(page).toHaveTitle("Khám phá sự kiện | EventHub");
  await expect(page.locator(".explore-result-bar")).toContainText(
    String(data.total),
  );
  await expect(
    page.locator(".explore-card").first().locator("h2 a"),
  ).toHaveAttribute("href", "/events/" + first.slug);
  if (data.items.length > 6) {
    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(
      page.locator(".explore-card").first().locator("h2"),
    ).toHaveText(data.items[6].title);
    await page.goBack();
    await expect(
      page.locator(".explore-card").first().locator("h2"),
    ).toHaveText(first.title);
  }
  await page
    .getByRole("textbox", { name: "Tên sự kiện", exact: true })
    .fill(first.title);
  await page.getByRole("button", { name: "Quét sự kiện", exact: true }).click();
  await expect(page.locator(".explore-card")).toHaveCount(1);
  await expect(page.locator(".explore-card h2")).toHaveText(first.title);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Tên sự kiện", exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".explore-card")).toHaveCount(
    Math.min(6, data.items.length),
  );
  const categories = (await (await request.get("/api/categories")).json()).data;
  const category = categories.find(
    (item: { id: string }) => item.id === first.category_id,
  );
  const filtered = (
    await (await request.get("/api/events?category=" + category.id)).json()
  ).data;
  await page.getByRole("button", { name: category.name, exact: true }).click();
  await expect(page.locator(".explore-card")).toHaveCount(
    Math.min(6, filtered.items.length),
  );
  await expect(
    page.getByRole("radio", { name: category.name, exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Giá tối đa", exact: true })
    .fill("50000");
  await page
    .getByRole("button", { name: "Áp dụng bộ lọc", exact: true })
    .click();
  const priced = (
    await (await request.get("/api/events?maxPrice=50000")).json()
  ).data;
  await expect(page.locator(".explore-card")).toHaveCount(
    Math.min(6, priced.items.length),
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByLabel("Thành phố", { exact: true }).fill("Hà Nội");
  await page.getByRole("button", { name: "Quét sự kiện", exact: true }).click();
  const city = (
    await (
      await request.get("/api/events?city=" + encodeURIComponent("Hà Nội"))
    ).json()
  ).data;
  await expect(page.locator(".explore-card")).toHaveCount(
    Math.min(6, city.items.length),
  );
  await page
    .getByRole("textbox", { name: "Tên sự kiện", exact: true })
    .fill("a2-no-match-unique-20261027");
  await page.getByRole("button", { name: "Quét sự kiện", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy sự kiện phù hợp" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".explore-card")).toHaveCount(
    Math.min(6, data.items.length),
  );
  await page.locator(".explore-card h2 a").first().click();
  await expect(page).toHaveURL(new RegExp("/events/" + first.slug));
  await page.goto("/");
  await expect(page.locator(".home-page")).toBeVisible();
  await page
    .locator(".home-hero-actions")
    .getByRole("link", { name: "Khám phá sự kiện" })
    .click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.locator(".auth-search input").fill(first.title);
  await page.locator(".auth-search input").press("Enter");
  await expect(page.locator(".explore-card")).toHaveCount(1);
});

test("A2 validates ranges and recovers from failed requests", async ({
  page,
  request,
}) => {
  await page.goto("/explore");
  await expect(page.locator(".explore-card").first()).toBeVisible();
  await page
    .getByRole("combobox", { name: "Thời gian", exact: true })
    .selectOption("custom");
  await page.getByLabel("Từ ngày", { exact: true }).fill("2027-02-01");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2026-12-01");
  await page.getByRole("button", { name: "Quét sự kiện", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Ngày kết thúc");
  const all = (await (await request.get("/api/events")).json()).data;
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(all.items[0].starts_at));
  await page.getByLabel("Từ ngày", { exact: true }).fill(day);
  await page.getByLabel("Đến ngày", { exact: true }).fill(day);
  await page.getByRole("button", { name: "Quét sự kiện", exact: true }).click();
  const from = new Date(day + "T00:00:00+07:00").toISOString();
  const to = new Date(day + "T23:59:59.999+07:00").toISOString();
  expect(new URL(page.url()).searchParams.get("from")).toBe(from);
  expect(new URL(page.url()).searchParams.get("to")).toBe(to);
  const dated = (await (await request.get("/api/events?" + new URLSearchParams({ from, to }))).json()).data;
  await expect(page.locator(".explore-card")).toHaveCount(Math.min(6, dated.items.length));
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByLabel("Giá tối thiểu", { exact: true }).fill("100000");
  await page.getByLabel("Giá tối đa", { exact: true }).fill("50000");
  await page
    .getByRole("button", { name: "Áp dụng bộ lọc", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Giá tối đa");
  await page.route("**/api/events?*", (route) => route.abort());
  await page.goto("/explore?q=network-check");
  await expect(
    page.getByRole("heading", { name: "Không tải được sự kiện" }),
  ).toBeVisible();
  await page.unroute("**/api/events?*");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy sự kiện phù hợp" }),
  ).toBeVisible();
  await page.goto("/explore?page=40000");
  await expect(
    page.getByRole("heading", { name: "Trang này không có sự kiện" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Về trang đầu" }).click();
  await expect(page.locator(".explore-card").first()).toBeVisible();
});

for (const width of [1440, 768, 390]) {
  test(`A2 responsive ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/explore");
    await expect(page.locator(".explore-card")).toHaveCount(6);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator(".auth-header")).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Tên sự kiện", exact: true })
      .focus();
    await expect(
      page.getByRole("textbox", { name: "Tên sự kiện", exact: true }),
    ).toBeFocused();
    for (const poster of await page.locator(".explore-poster").all()) {
      await poster.scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll<HTMLImageElement>(".explore-poster img")).every((img) => img.complete && img.naturalWidth > 0),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `../docs/reports/stitch/evidence/A2_20261027_implementation/${width}.png`,
      fullPage: true,
    });
    if (width === 390) await page.screenshot({
      path: "../docs/reports/stitch/evidence/A2_20261027_implementation/390-top.png",
    });
  });
}
