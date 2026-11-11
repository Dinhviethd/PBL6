import { test, expect, type Page } from "@playwright/test";

async function session(
  page: Page,
  handler: (url: URL, method: string) => unknown | Promise<unknown>,
) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let data: unknown;
    if (url.pathname === "/api/auth/refresh-token")
      data = { accessToken: "pagination-test" };
    else if (url.pathname === "/api/auth/me")
      data = {
        idUser: "pagination-user",
        name: "Pagination QA",
        roles: ["USER"],
      };
    else if (url.pathname === "/api/me/notifications/count")
      data = { unreadCount: 0 };
    else data = await handler(url, route.request().method());
    if (data === "FAIL")
      return route.fulfill({
        status: 503,
        json: { success: false, message: "Trang tiếp theo tạm lỗi" },
      });
    await route.fulfill({ json: { success: true, data: data ?? [] } });
  });
}
const ticket = (index: number) => ({
  id: `ticket-${index}`,
  ticket_code: `PAGE-${index}`,
  event_title_snapshot: `Sự kiện vé ${index}`,
  ticket_type_name_snapshot: "Tiêu chuẩn",
  status: "VALID",
});
const notice = (index: number, read = false) => ({
  id: `notice-${index}`,
  kind: "EVENT_UPDATED",
  title: `Tin ${index}`,
  message: "Nội dung cập nhật",
  target: "TICKETS",
  target_id: "event",
  created_at: "2026-11-11T10:00:00Z",
  read_at: read ? "2026-11-11T11:00:00Z" : null,
});
const inbox = (items: ReturnType<typeof notice>[], hasNext: boolean) => ({
  items,
  unreadCount: 11,
  hasNext,
  pagination: { page: 0, pageSize: 10, total: 11, totalPages: 2 },
});

test("tickets append once, retain old rows on error, retry same page and deduplicate", async ({
  page,
}) => {
  const calls: number[] = [];
  let fail = true;
  await session(page, async (url) => {
    if (url.pathname !== "/api/me/tickets") return [];
    const index = Number(url.searchParams.get("page"));
    calls.push(index);
    if (!index) return Array.from({ length: 50 }, (_, i) => ticket(i));
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (fail) {
      fail = false;
      return "FAIL";
    }
    return [ticket(49), ticket(50)];
  });
  await page.goto("/tickets");
  const more = page.getByRole("button", { name: "Tải thêm", exact: true });
  await more.scrollIntoViewIfNeeded();
  await more.evaluate((element) => {
    (element as HTMLElement).click();
    (element as HTMLElement).click();
  });
  await expect(
    page.getByText("Trang tiếp theo tạm lỗi", { exact: true }),
  ).toBeVisible();
  expect(calls.filter((value) => value === 1)).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Mở vé PAGE-0", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Thử tải lại", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mở vé PAGE-50", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở vé PAGE-49", exact: true }),
  ).toHaveCount(1);
  expect(calls).toEqual([0, 1, 1]);
  await expect(more).toHaveCount(0);
  await expect(page.getByText(/^Trang \d+$/)).toHaveCount(0);
});

test("single-page customer lists show no paging controls", async ({ page }) => {
  await session(page, (url) =>
    url.pathname === "/api/me/tickets" ? [ticket(0)] : [],
  );
  await page.goto("/tickets");
  await expect(
    page.getByRole("button", { name: "Mở vé PAGE-0", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tải thêm", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Trang (trước|sau)$/ }),
  ).toHaveCount(0);
});

test("explore loads the next API page on scroll and keeps the first page", async ({
  page,
}) => {
  const calls: number[] = [];
  await session(page, (url) => {
    if (url.pathname !== "/api/events") return [];
    const index = Number(url.searchParams.get("page"));
    calls.push(index);
    return {
      total: 26,
      items: Array.from({ length: index ? 2 : 24 }, (_, i) => {
        const id = index * 24 + i;
        return {
          id: `e-${id}`,
          slug: `event-${id}`,
          title: `Sự kiện tải tiếp ${id}`,
          starts_at: "2026-12-01T10:00:00Z",
          venue_name: "Hội trường",
          city_code: "Đà Nẵng",
          priceFrom: "0",
        };
      }),
    };
  });
  await page.goto("/explore");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).waitFor();
  // Virtualized cells expand the estimated content height as scrolling proceeds.
  await expect
    .poll(
      async () => {
        await page.getByTestId("event-results").evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        return calls.includes(1);
      },
      { timeout: 15000, intervals: [100, 250, 500] },
    )
    .toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Sự kiện tải tiếp 25", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Sự kiện tải tiếp 0", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Tải thêm", exact: true }),
  ).toHaveCount(0);
});

test("late notification page cannot leak into a new unread filter", async ({
  page,
}) => {
  let release!: () => void;
  let requested = false;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await session(page, async (url) => {
    if (url.pathname !== "/api/me/notifications") return [];
    if (url.searchParams.get("unread") === "true")
      return inbox([notice(100)], false);
    if (url.searchParams.get("page") === "1") {
      requested = true;
      await pending;
      return inbox([notice(10)], false);
    }
    return inbox(
      Array.from({ length: 10 }, (_, i) => notice(i)),
      true,
    );
  });
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect.poll(() => requested).toBeTruthy();
  await page.getByRole("button", { name: "Chưa đọc", exact: true }).click();
  await expect(page.getByText("Tin 100", { exact: true })).toBeVisible();
  release();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Tin 10", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Tin 0", { exact: true })).toHaveCount(0);
});

test("marking read refreshes every loaded notification page without dropping later rows", async ({
  page,
}) => {
  const calls: number[] = [];
  let read = false;
  await session(page, (url, method) => {
    if (method === "POST") {
      read = true;
      return {};
    }
    if (url.pathname !== "/api/me/notifications") return [];
    const index = Number(url.searchParams.get("page"));
    calls.push(index);
    return index
      ? inbox([notice(10)], false)
      : inbox(
          Array.from({ length: 10 }, (_, i) => notice(i, read && i === 0)),
          true,
        );
  });
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect(page.getByText("Tin 10", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Đánh dấu đã đọc", exact: true })
    .first()
    .click();
  await expect.poll(() => calls.join(",")).toBe("0,1,0,1");
  await expect(page.getByText("Tin 10", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }),
  ).toHaveCount(10);
});
