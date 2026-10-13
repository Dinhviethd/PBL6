import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

const password = "SessionIsolation2026!";
test.setTimeout(120000);
// The complete E2E suite shares one IP and the real 20/minute credential limit.
// Respect a 429 once instead of weakening production rate limiting for tests.
const waitForCredentialWindow = () =>
  new Promise((resolve) => setTimeout(resolve, 60000));
async function account(request: APIRequestContext, name: string) {
  const payload = {
    data: {
      name,
      email: `${crypto.randomUUID()}@example.test`,
      password,
      confirmPassword: password,
    },
  };
  let response = await request.post("/api/auth/register", payload);
  if (response.status() === 429) {
    await waitForCredentialWindow();
    response = await request.post("/api/auth/register", payload);
  }
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data;
}
async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await submitLogin(page, email);
}
async function submitLogin(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Mật khẩu (ít nhất 8 ký tự)", { exact: true })
    .fill(password);
  const submit = async () => {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    return response;
  };
  let response = await submit();
  if (response.status() === 429) {
    await waitForCredentialWindow();
    response = await submit();
  }
  expect(response.ok(), await response.text()).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
}
async function profile(request: APIRequestContext, token: string) {
  const response = await request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

test("switching accounts in another tab removes old private forms", async ({
  page,
  context,
  request,
}) => {
  const a = await account(request, "Session A"),
    b = await account(request, "Session B");
  await login(page, a.user.email);
  await page.goto("/profile");
  await page
    .getByLabel("Số điện thoại", { exact: true })
    .first()
    .fill("0900000001");
  const second = await context.newPage();
  try {
    await second.goto("/");
    await second
      .getByRole("button", { name: "Đăng xuất", exact: true })
      .click();
    await expect(page).toHaveURL(/auth\/login/);
    await expect(page.getByLabel("Họ tên", { exact: true })).toHaveCount(0);
    await login(second, b.user.email);
    await expect(page.getByText(/Phiên đăng nhập đã thay đổi/)).toBeVisible();
    expect((await profile(request, b.accessToken)).phone).toBeNull();
    expect((await profile(request, b.accessToken)).name).toBe("Session B");
  } finally {
    await second.close();
  }
});

test("missed cross-tab signals cannot replay A's profile write with B's token", async ({
  page,
  context,
  request,
}) => {
  const a = await account(request, "Missed A"),
    b = await account(request, "Missed B");
  await login(page, a.user.email);
  await page.goto("/profile");
  await page
    .getByLabel("Số điện thoại", { exact: true })
    .first()
    .fill("0900000002");
  const second = await context.newPage();
  try {
    // Emulate storage being unavailable in the other tab; auth still uses the real API/cookie.
    await second.addInitScript(() => {
      Storage.prototype.setItem = () => {};
    });
    await second.goto("/");
    await second
      .getByRole("button", { name: "Đăng xuất", exact: true })
      .click();
    await expect(
      second.getByRole("link", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await login(second, b.user.email);
    await expect(page.getByLabel("Họ tên", { exact: true })).toHaveValue(
      "Missed A",
    );
    const writes: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/api/me") && r.method() === "PATCH")
        writes.push(r.headers().authorization);
    });
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page).toHaveURL(/auth\/login/);
    await expect(page.getByText(/Phiên đăng nhập đã thay đổi/)).toBeVisible();
    expect(writes).toHaveLength(1);
    const actual = await profile(request, b.accessToken);
    expect(actual.name).toBe("Missed B");
    expect(actual.phone).toBeNull();
  } finally {
    await second.close();
  }
});

test("same-account refresh retries a profile write and preserves the form", async ({
  page,
  request,
}) => {
  const a = await account(request, "Refresh A");
  await login(page, a.user.email);
  await page.goto("/profile");
  await page
    .getByLabel("Số điện thoại", { exact: true })
    .first()
    .fill("0900000003");
  let writes = 0,
    refreshes = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/auth/refresh-token")) refreshes++;
  });
  await page.route("**/api/me", async (route) => {
    if (route.request().method() === "PATCH" && ++writes === 1)
      return route.fulfill({
        status: 401,
        json: { success: false, code: "INVALID_SESSION" },
      });
    await route.continue();
  });
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/me") && r.status() === 200,
  );
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await saved;
  expect(writes).toBe(2);
  expect(refreshes).toBe(1);
  await expect(page.getByLabel("Họ tên", { exact: true })).toHaveValue(
    "Refresh A",
  );
  expect((await profile(request, a.accessToken)).phone).toBe("0900000003");
});

for (const status of [200, 401]) {
  test(`late refresh ${status} cannot replace or clear a newly authenticated session`, async ({
    page,
    context,
    request,
  }) => {
    const a = await account(request, `Late A ${status}`),
      b = await account(request, `Late B ${status}`);
    await login(page, a.user.email);
    await page.goto("/profile");
    await page
      .getByLabel("Số điện thoại", { exact: true })
      .first()
      .fill("0900000004");
    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 401, json: { success: false } }),
    );
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/auth/refresh-token", async (route) => {
      entered();
      await held;
      await route.fulfill({
        status,
        json: { success: status === 200, data: { accessToken: a.accessToken } },
      });
    });
    const second = await context.newPage();
    // These timing cases use a previously issued, real B session as the login response.
    // Avoid a credential-rate-limit wait while intentionally holding a 15s refresh request.
    await context.route("**/api/auth/login", async (route) => {
      if (route.request().postDataJSON().email === b.user.email)
        return route.fulfill({ json: { success: true, data: b } });
      await route.continue();
    });
    try {
      await page.getByRole("button", { name: "Lưu", exact: true }).click();
      await started;
      await login(second, b.user.email);
      await expect(page).toHaveURL(/auth\/login/);
      // Authenticate on this same document while the old refresh is still pending.
      await submitLogin(page, b.user.email);
      await expect(page.locator(".avatar-link")).toContainText(
        `Late B ${status}`,
      );
      const completed = page.waitForResponse((r) =>
        r.url().endsWith("/auth/refresh-token"),
      );
      release();
      await completed;
      // A fresh protected read must still work as B after handling the delayed response.
      await page.locator(".avatar-link").click();
      await expect(page.getByLabel("Họ tên", { exact: true })).toHaveValue(
        `Late B ${status}`,
      );
      await expect(
        page.getByRole("button", { name: "Đăng xuất", exact: true }),
      ).toBeVisible();
      expect((await profile(request, b.accessToken)).phone).toBeNull();
    } finally {
      release();
      await second.close();
    }
  });
}
