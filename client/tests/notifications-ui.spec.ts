import { test, expect } from "@playwright/test";

// Isolated UI coverage: API behavior is covered by PostgreSQL integration tests.
for (const width of [1280, 390]) {
  test(`notification UI with mocked API at ${width}px: read state, navigation and recovery`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const failures: string[] = [];
    page.on("pageerror", (e) => failures.push(e.message));
    let fail = false;
    const items = [
      {
        id: "n1",
        kind: "EVENT_REMINDER",
        title: "Sự kiện sắp bắt đầu",
        message:
          "Đêm nhạc bên sông Hàn bắt đầu lúc 19:00 ngày 08/10/2026 (UTC+7), Không gian bờ Đông, Đà Nẵng. Chuẩn bị vé QR để check-in.",
        target: "TICKETS",
        target_id: "event",
      },
      {
        id: "n2",
        kind: "STAFF_INVITED",
        title: "Lời mời nhân viên check-in",
        message:
          "Bạn được mời hỗ trợ check-in cho Build Together. Vào mục phân công để xem và trả lời lời mời.",
        target: "STAFF",
        target_id: "event",
      },
      {
        id: "n3",
        kind: "ORDER_PAID",
        title: "Đặt vé thành công",
        message: "Đơn EH-DEMO đã thanh toán. Vé QR đã sẵn sàng.",
        target: "ORDER",
        target_id: "order",
      },
    ].map((n) => ({
      ...n,
      created_at: "2026-10-07T10:00:00Z",
      read_at: null as string | null,
    }));
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname;
      let data: unknown = null;
      if (path === "/api/auth/me")
        data = {
          idUser: "ui-user",
          name: "Minh Anh",
          email: "ui@example.test",
          roles: ["USER"],
        };
      else if (path === "/api/config") data = { paymentMode: "demo" };
      else if (path === "/api/me/notifications/count")
        data = { unreadCount: items.filter((n) => !n.read_at).length };
      else if (path === "/api/me/notifications") {
        if (fail)
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              message: "Tạm thời không tải được thông báo.",
            },
          });
        data = {
          items:
            url.searchParams.get("unread") === "true"
              ? items.filter((n) => !n.read_at)
              : items,
          unreadCount: items.filter((n) => !n.read_at).length,
          hasNext: false,
        };
      } else if (path === "/api/me/notifications/read-all")
        items.forEach((n) => {
          n.read_at ??= new Date().toISOString();
        });
      else if (/\/notifications\/[^/]+\/read$/.test(path)) {
        const item = items.find((n) => path.includes(`/${n.id}/`));
        if (item) item.read_at ??= new Date().toISOString();
      } else if (path === "/api/me/tickets") data = [];
      else if (path === "/api/me/checkin-assignments") data = [];
      else data = [];
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "Thông báo của bạn" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Thông báo, 3 chưa đọc" }),
    ).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(3);
    await page.screenshot({
      path: `../.local/qa/notifications-ui-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page
      .getByRole("button", { name: "Đánh dấu đã đọc", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Chưa đọc (2)" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Chưa đọc (2)" }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }).click();
    await expect(
      page.getByText("Bạn đã đọc hết thông báo trên trang này."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Thông báo", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tất cả", exact: true }).click();
    fail = true;
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(
      page.getByText("Tạm thời không tải được thông báo."),
    ).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(3);
    await page
      .getByRole("button", { name: "Xem phân công →", exact: true })
      .click();
    await expect(page).toHaveURL(/\/checkin$/);
    expect(failures).toEqual([]);
  });
}
