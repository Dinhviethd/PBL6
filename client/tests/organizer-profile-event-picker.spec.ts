import { expect, test, type Page } from "@playwright/test";

const owner = { id: "owner", name: "Ban tổ chức", email: "owner@example.test" };
const member = { id: "staff", name: "Nhân viên", email: "staff@example.test" };
const titles = [
  "Hội sách",
  "Hội chạy",
  "Hội phim",
  "Hội kịch",
  "Hội gốm",
  "Hội họa",
  "Hội âm nhạc",
  "Hội chợ 50%",
];

async function mockOrganizerApi(page: Page) {
  const invites: unknown[] = [];
  const searchRequests: string[] = [];
  await page.route("**/api/**", async (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    let data: unknown;
    switch (pathname) {
      case "/api/auth/me":
        data = { ...owner, idUser: owner.id, roles: ["ORGANIZER"], permissions: [] };
        break;
      case "/api/organizer/profile":
        data = { ownerId: owner.id, initialized: true, capabilities: {} };
        break;
      case "/api/organizer/profile/stats":
        data = { publishedEvents: titles.length, servedTickets: "0" };
        break;
      case "/api/me/notifications/count":
        data = { unreadCount: 0 };
        break;
      case "/api/organizer/profile/legal-requests":
      case "/api/organizer/team/staff/events":
        data = [];
        break;
      case "/api/organizer/team":
        if (route.request().method() === "POST") {
          invites.push(route.request().postDataJSON());
          data = {};
        } else {
          data = { owner, items: [{ ...member, assignment_count: "1" }], hasNext: false };
        }
        break;
      case "/api/organizer/events": {
        expect(searchParams.get("status")).toBe("PUBLISHED");
        const query = searchParams.get("q") ?? "";
        if (query) searchRequests.push(query);
        const limit = Number(searchParams.get("limit"));
        const offset = Number(searchParams.get("page")) * limit;
        const keyword = query.replace(/\\([\\%_])/g, "$1").toLocaleLowerCase("vi");
        const matches = titles
          .map((title, index) => ({ title, id: `event-${index}` }))
          .filter(({ title }) => title.toLocaleLowerCase("vi").includes(keyword));
        data = matches.slice(offset, offset + limit).map((event) => ({
          ...event,
          status: "PUBLISHED",
          total_results: String(matches.length),
        }));
        break;
      }
      default:
        data = {};
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return { invites, searchRequests };
}

test("searches published events independently of browsing and submits the selected event", async ({ page }) => {
  const { invites, searchRequests } = await mockOrganizerApi(page);
  await page.goto("/organizer/profile");
  await page.getByRole("button", { name: "Thêm nhân sự kiểm soát vé" }).click();
  const dialog = page.getByRole("dialog");
  const browse = dialog.getByRole("group", { name: "Sự kiện đã xuất bản" });
  const search = dialog.getByRole("combobox", { name: "Tìm sự kiện đã xuất bản" });
  const options = dialog.getByRole("option");
  const submit = dialog.getByRole("button", { name: "Gửi lời mời" });
  await expect(submit).toBeDisabled();
  await expect(browse.locator("li")).toHaveText(titles.slice(0, 6));
  await browse.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(browse.locator("li")).toHaveText(titles.slice(6));

  await search.click();
  await expect(options).toHaveText(titles.slice(0, 6));
  await dialog.getByRole("button", { name: "Xem thêm" }).click();
  await expect(options).toHaveText(titles.slice(6));
  await search.fill("không tồn tại");
  await expect(dialog.getByText("Không tìm thấy sự kiện đã xuất bản phù hợp.")).toBeVisible();
  await expect(options).toHaveCount(0);
  await expect(browse.locator("li")).toHaveText(titles.slice(6));
  await search.fill("");
  await expect(options).toHaveText(titles.slice(0, 6));

  await search.fill("gốm");
  await search.fill("HỌA");
  await expect(options).toHaveText(["Hội họa"]);
  expect(searchRequests).not.toContain("gốm");
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", "b11-event-match-0");
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();
  await search.fill("ÂM NHẠC");
  await expect(options).toHaveText(["Hội âm nhạc"]);
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(dialog.getByText("Sự kiện đã chọn:")).toContainText("Hội âm nhạc");

  await browse.getByRole("button", { name: "Trước", exact: true }).click();
  await expect(browse.locator("li")).toHaveText(titles.slice(0, 6));
  await expect(dialog.getByText("Sự kiện đã chọn:")).toContainText("Hội âm nhạc");
  await dialog.getByLabel("Email tài khoản đã đăng ký").fill("invite@example.test");
  await submit.click();
  await expect(dialog).toBeHidden();
  expect(invites).toEqual([{ email: "invite@example.test", eventId: "event-6" }]);
});

test("picks an event by mouse in the existing staff assignment dialog", async ({ page }) => {
  const { invites, searchRequests } = await mockOrganizerApi(page);
  await page.goto("/organizer/profile");
  await page.getByRole("button", { name: `Phân công ${member.email}` }).click();
  const dialog = page.getByRole("dialog");
  const search = dialog.getByRole("combobox");
  await search.fill("%");
  const options = dialog.getByRole("option");
  await expect(options).toHaveText(["Hội chợ 50%"]);
  expect(searchRequests).toContain("\\%");
  await options.first().click();
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByText("Sự kiện đã chọn:")).toContainText("Hội chợ 50%");
  await dialog.getByRole("button", { name: "Mời check-in sự kiện" }).click();
  await expect.poll(() => invites).toEqual([{ email: member.email, eventId: "event-7" }]);
});
