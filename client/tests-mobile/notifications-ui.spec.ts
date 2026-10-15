import { test, expect } from "@playwright/test";

test("Expo notification UI with mocked API: bell, read state and staff navigation", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  let read = false;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()), path = url.pathname;
    let data: unknown = [];
    if (path === "/api/auth/refresh-token") data = { accessToken: "ui-token" };
    else if (path === "/api/auth/me") data = { idUser: "mobile-ui", name: "Minh Anh", email: "mobile@example.test", roles: ["USER"] };
    else if (path === "/api/config") data = { paymentMode: "demo" };
    else if (path === "/api/events") data = { items: [], total: 0 };
    else if (path === "/api/me/notifications/count") data = { unreadCount: read ? 0 : 1 };
    else if (path === "/api/me/notifications") data = {
      items: read && url.searchParams.get("unread") === "true" ? [] : [{
        id: "n1", kind: "STAFF_INVITED", title: "Lời mời nhân viên check-in",
        message: "Bạn được mời hỗ trợ check-in cho Đêm nhạc bên sông Hàn. Vào mục phân công để xem và trả lời lời mời.",
        target: "STAFF", target_id: "event", created_at: "2026-10-07T10:00:00Z", read_at: read ? "2026-10-07T11:00:00Z" : null,
      }], unreadCount: read ? 0 : 1, hasNext: false,
    };
    else if (path.endsWith("/read") || path.endsWith("/read-all")) { read = true; data = null; }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Thông báo, 1 chưa đọc" }).click();
  await expect(page.getByText("Thông báo của bạn.", { exact: true })).toBeVisible();
  await expect(page.getByText("Lời mời nhân viên check-in", { exact: true })).toBeVisible();
  await page.screenshot({ path: "../.local/qa/notifications-expo.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Chưa đọc", exact: true }).click();
  await expect(page.getByText("Bạn đã đọc hết thông báo trên trang này.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByRole("button", { name: "Xem phân công", exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByText("Sự kiện được phân công.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thông báo, 0 chưa đọc" })).toBeVisible();
  expect(failures).toEqual([]);
});
