import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
const password = "MobileIsolation2026!";
async function account(request: APIRequestContext, name: string) {
  const r = await request.post("/api/auth/register", {
    data: {
      name,
      email: `${crypto.randomUUID()}@example.test`,
      password,
      confirmPassword: password,
    },
  });
  expect(r.status()).toBe(200);
  return (await r.json()).data;
}
test("Expo web refuses A booking after cookie silently changes to B", async ({
  page,
  context,
}) => {
  const request = context.request;
  const a = await account(request, "Mobile A");
  await page.goto("/events/dem-nhac-song-han");
  await page
    .getByRole("button", { name: "Thêm Vé tiêu chuẩn", exact: true })
    .click();
  // API client changes the shared cookie without dispatching a storage signal.
  await request.post("/api/auth/logout", {
    headers: { Authorization: `Bearer ${a.accessToken}` },
  });
  const b = await account(request, "Mobile B");
  let writes = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/orders") && r.method() === "POST") writes++;
  });
  await page.getByRole("button", { name: "Đặt 1 vé", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  await expect(
    page.getByRole("button", { name: "Đăng nhập để đặt vé", exact: true }),
  ).toBeVisible();
  const orders = await request.get("/api/me/orders", {
    headers: { Authorization: `Bearer ${b.accessToken}` },
  });
  expect((await orders.json()).data).toEqual([]);
  expect(writes).toBe(1);
});
test("Expo web clears old private views on another tab login", async ({
  page,
  context,
}) => {
  const request = context.request;
  await account(request, "Visible A");
  await page.goto("/account");
  await expect(page.getByText("Visible A", { exact: true })).toBeVisible();
  const second = await context.newPage();
  try {
    await second.goto("/auth");
    await second
      .getByRole("button", { name: "Chưa có tài khoản? Đăng ký", exact: true })
      .click();
    await second.getByLabel("Họ và tên", { exact: true }).fill("Visible B");
    await second
      .getByLabel("Email", { exact: true })
      .fill(`${crypto.randomUUID()}@example.test`);
    await second.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await second
      .getByLabel("Nhập lại mật khẩu", { exact: true })
      .fill(password);
    await second
      .getByRole("button", { name: "Tạo tài khoản", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Visible A", { exact: true })).toHaveCount(0);
  } finally {
    await second.close();
  }
});
test("Expo web tabs serialize cookie rotation and remain authenticated", async ({
  context,
}) => {
  const request = context.request;
  const a = await account(request, "Mobile tabs");
  const first = await context.newPage(),
    second = await context.newPage();
  let release!: () => void,
    entered!: () => void,
    count = 0;
  const held = new Promise<void>((r) => {
      release = r;
    }),
    started = new Promise<void>((r) => {
      entered = r;
    });
  const statuses: number[] = [];
  await context.route("**/api/auth/refresh-token", async (route) => {
    if (++count === 1) {
      entered();
      await held;
    }
    const response = await route.fetch();
    statuses.push(response.status());
    await route.fulfill({ response });
  });
  try {
    await first.goto("/account");
    await started;
    await second.goto("/account");
    await expect
      .poll(() =>
        second.evaluate(
          async () => (await navigator.locks.query()).pending?.length ?? 0,
        ),
      )
      .toBe(1);
    expect(count).toBe(1);
    release();
    await expect(first.getByText("Mobile tabs", { exact: true })).toBeVisible();
    await expect(
      second.getByText("Mobile tabs", { exact: true }),
    ).toBeVisible();
    expect(statuses).toEqual([200, 200]);
    expect(
      (
        await request.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${a.accessToken}` },
        })
      ).status(),
    ).toBe(200);
  } finally {
    release();
    await first.close();
    await second.close();
  }
});
