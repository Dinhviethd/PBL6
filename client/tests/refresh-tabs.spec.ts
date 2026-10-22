import { test, expect } from "@playwright/test";

test("two tabs restore one rotating cookie without revoking the new session", async ({
  context,
}) => {
  const request = context.request;
  const registered = await request.post("/api/auth/register", {
    data: {
      name: "Refresh tabs",
      email: `tabs-${crypto.randomUUID()}@example.test`,
      password: "RefreshTabs2026!",
      confirmPassword: "RefreshTabs2026!",
    },
  });
  expect(registered.ok()).toBeTruthy();
  const account = (await registered.json()).data;
  const first = await context.newPage(),
    second = await context.newPage();
  let release!: () => void, entered!: () => void;
  const hold = new Promise<void>((r) => {
      release = r;
    }),
    started = new Promise<void>((r) => {
      entered = r;
    });
  let refreshCount = 0;
  const statuses: number[] = [];
  await context.route("**/api/auth/refresh-token", async (route) => {
    if (++refreshCount === 1) {
      entered();
      await hold;
    }
    const response = await route.fetch();
    statuses.push(response.status());
    await route.fulfill({ response });
  });
  try {
    await first.goto("/profile");
    await started;
    await second.goto("/profile");
    // This tab is waiting on the origin-wide browser lock, not sending the old cookie.
    await expect
      .poll(() =>
        second.evaluate(
          async () => (await navigator.locks.query()).pending?.length ?? 0,
        ),
      )
      .toBe(1);
    expect(refreshCount).toBe(1);
    release();
    await expect(first.getByLabel("Họ tên", { exact: true })).toHaveValue(
      "Refresh tabs",
    );
    await expect(second.getByLabel("Họ tên", { exact: true })).toHaveValue(
      "Refresh tabs",
    );
    expect(statuses).toEqual([200, 200]);
    // Original access token shares sid with both new tokens; a revoke would reject it too.
    expect(
      (
        await request.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        })
      ).status(),
    ).toBe(200);
  } finally {
    release();
    await first.close();
    await second.close();
  }
});

test("closing the tab holding the browser lock lets the waiting tab restore", async ({
  context,
}) => {
  const request = context.request;
  const r = await request.post("/api/auth/register", {
    data: {
      name: "Closed holder",
      email: `${crypto.randomUUID()}@example.test`,
      password: "RefreshTabs2026!",
      confirmPassword: "RefreshTabs2026!",
    },
  });
  expect(r.status()).toBe(200);
  const first = await context.newPage(),
    second = await context.newPage();
  try {
    await first.goto("/profile");
    await expect(first.getByLabel("Họ tên", { exact: true })).toHaveValue(
      "Closed holder",
    );
    await first.evaluate(() => {
      void navigator.locks.request(
        "eventhub:cookie-refresh",
        () => new Promise<void>(() => {}),
      );
    });
    await expect
      .poll(() =>
        first.evaluate(
          async () => (await navigator.locks.query()).held?.length ?? 0,
        ),
      )
      .toBe(1);
    await second.goto("/profile");
    await expect
      .poll(() =>
        second.evaluate(
          async () => (await navigator.locks.query()).pending?.length ?? 0,
        ),
      )
      .toBe(1);
    await first.close();
    await expect(second.getByLabel("Họ tên", { exact: true })).toHaveValue(
      "Closed holder",
    );
  } finally {
    if (!first.isClosed()) await first.close();
    await second.close();
  }
});

test("simultaneously expired access tokens retry both writes without a refresh replay", async ({
  context,
}) => {
  const request = context.request;
  const r = await request.post("/api/auth/register", {
    data: {
      name: "Expired tabs",
      email: `${crypto.randomUUID()}@example.test`,
      password: "RefreshTabs2026!",
      confirmPassword: "RefreshTabs2026!",
    },
  });
  expect(r.status()).toBe(200);
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
  try {
    for (const p of [first, second]) {
      await p.goto("/profile");
      await expect(p.getByLabel("Họ tên", { exact: true })).toHaveValue(
        "Expired tabs",
      );
      let writes = 0;
      await p.route("**/api/me", async (route) => {
        if (route.request().method() === "PATCH" && ++writes === 1)
          return route.fulfill({
            status: 401,
            json: { success: false, code: "INVALID_SESSION" },
          });
        await route.continue();
      });
    }
    await context.route("**/api/auth/refresh-token", async (route) => {
      if (++count === 1) {
        entered();
        await held;
      }
      const response = await route.fetch();
      statuses.push(response.status());
      await route.fulfill({ response });
    });
    const saved = [first, second].map((p) =>
      p.waitForResponse(
        (r) =>
          r.url().endsWith("/api/me") &&
          r.request().method() === "PATCH" &&
          r.status() === 200,
      ),
    );
    await first.getByRole("button", { name: "Lưu", exact: true }).click();
    await started;
    await second.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect
      .poll(() =>
        second.evaluate(
          async () => (await navigator.locks.query()).pending?.length ?? 0,
        ),
      )
      .toBe(1);
    release();
    await Promise.all(saved);
    await expect.poll(() => statuses.length).toBe(2);
    expect(statuses).toEqual([200, 200]);
    for (const p of [first, second])
      await expect(p.getByLabel("Họ tên", { exact: true })).toHaveValue(
        "Expired tabs",
      );
  } finally {
    release();
    await first.close();
    await second.close();
  }
});
