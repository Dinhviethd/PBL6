import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const legacy = "eventhub.register-organizer.draft.v1";
const key = (id: string) => `eventhub.register-organizer.draft.v2:${id}`;
const draft = (ownerId: string, tax = "PRIVATE-A") => JSON.stringify({
  version: 2, ownerId, savedAt: "2026-11-09T00:00:00Z", form: { taxIdOrBusinessLicense: tax },
});
async function fixture(context: BrowserContext, initial: string | null = "A") {
  let user = initial;
  await context.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if ((path === "/api/auth/me" && !user) || path === "/api/auth/refresh-token")
      return route.fulfill({ status: 401, json: { success: false, code: "UNAUTHORIZED" } });
    let data: unknown = [];
    if (path === "/api/auth/me") data = { idUser: user, name: `User ${user}`, email: `${user}@example.test`, roles: ["USER"], permissions: [] };
    if (path === "/api/config") data = { paymentMode: "disabled" };
    if (path === "/api/me/notifications/count") data = { unreadCount: 0 };
    if (path === "/api/me/organizer-applications" && request.method() === "POST") {
      const body = request.postDataJSON();
      data = { id: "12345678-1234-1234-1234-123456789012", status: "PENDING", created_at: new Date().toISOString(), organization_name: body.organizationName, business_name: body.businessName, contact_email: body.contactEmail };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return (next: string | null) => { user = next; };
}
async function seed(page: Page, values: Record<string, string>) {
  await page.goto("/auth/login");
  await page.evaluate(values => { for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, values);
}
const tax = (page: Page) => page.locator('[name="taxIdOrBusinessLicense"]');
const save = (page: Page) => page.getByRole("button", { name: "Lưu bản nháp hồ sơ" });

test("verified A saves and reloads only an allowlisted owner-bound draft", async ({ page, context }) => {
  await fixture(context);
  await seed(page, { [key("A")]: JSON.stringify({ version: 2, ownerId: "A", savedAt: "2026-11-09T00:00:00Z", form: { taxIdOrBusinessLicense: "RESTORED-A", password: "discard-me", roles: ["ADMIN"] } }) });
  await page.goto("/register-organizer");
  await expect(save(page)).toBeEnabled();
  await expect(tax(page)).toHaveValue("RESTORED-A");
  await tax(page).fill("PRIVATE-A"); await save(page).click();
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key("A"));
  expect(stored).toMatchObject({ version: 2, ownerId: "A", form: { taxIdOrBusinessLicense: "PRIVATE-A" } });
  expect(stored.form).not.toHaveProperty("password");
  expect(stored.form).not.toHaveProperty("roles");
  await page.reload(); await expect(tax(page)).toHaveValue("PRIVATE-A");
});

test("guest guidance and disabled save remain usable on desktop and mobile", async ({ page, context }, testInfo) => {
  await fixture(context, null);
  for (const width of [1440, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/register-organizer");
    await expect(save(page)).toBeDisabled();
    await expect(page.locator('.reg-alert-info')).toContainText("Đăng nhập trước khi nhập để lưu bản nháp");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`guest-${width}.png`), fullPage: true });
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll("body *")]
        .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 10)
        .map(el => ({ tag: el.tagName, className: el.getAttribute("class"), right: el.getBoundingClientRect().right })),
    }));
    expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
    expect(await page.locator(".reg-alert-info > div").evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(180);
  }
});

test("legacy draft is removed and guest cannot persist or carry form through login", async ({ page, context }) => {
  await fixture(context, null);
  await seed(page, { [legacy]: JSON.stringify({ savedAt: new Date().toISOString(), form: { taxIdOrBusinessLicense: "OLD-PRIVATE" } }), [key("A")]: draft("A") });
  await page.goto("/register-organizer");
  await expect(save(page)).toBeDisabled(); await expect(tax(page)).toHaveValue("");
  expect(await page.evaluate(k => localStorage.getItem(k), legacy)).toBeNull();
  await tax(page).fill("GUEST-PRIVATE");
  await page.locator('.reg-alert').getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/auth\/login/);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain("GUEST-PRIVATE");
});

test("cross-tab invalidation clears A form and B never restores A draft", async ({ page, context }) => {
  const setUser = await fixture(context);
  await seed(page, { [key("A")]: draft("A"), [key("B")]: draft("B", "PRIVATE-B") });
  await page.goto("/register-organizer"); await expect(tax(page)).toHaveValue("PRIVATE-A");
  const other = await context.newPage(); await other.goto("/auth/login");
  setUser(null);
  await other.evaluate(() => localStorage.setItem("eventhub:session-change", crypto.randomUUID()));
  await expect(tax(page)).toHaveValue(""); await expect(save(page)).toBeDisabled();
  setUser("B"); await page.reload(); await expect(tax(page)).toHaveValue("PRIVATE-B");
  await page.getByRole("button", { name: "Xóa bản nháp" }).click();
  expect(await page.evaluate(k => localStorage.getItem(k), key("B"))).toBeNull();
  expect(await page.evaluate(k => localStorage.getItem(k), key("A"))).not.toBeNull();
});

for (const [label, value] of [["wrong owner", draft("B")], ["invalid JSON", "{"], ["invalid date", JSON.stringify({ version: 2, ownerId: "A", savedAt: "broken", form: { taxIdOrBusinessLicense: "PRIVATE-A" } })]]) {
  test(`${label} is not restored`, async ({ page, context }) => {
    await fixture(context); await seed(page, { [key("A")]: value });
    await page.goto("/register-organizer"); await expect(save(page)).toBeEnabled();
    await expect(tax(page)).toHaveValue("");
  });
}

test("unverified bootstrap cannot restore the draft", async ({ page, context }) => {
  await fixture(context); await seed(page, { [key("A")]: draft("A") });
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  await page.route("**/api/auth/me", async route => { await gate; await route.fallback(); });
  await page.goto("/register-organizer", { waitUntil: "domcontentloaded" });
  try { await expect(save(page)).toBeDisabled(); await expect(tax(page)).toHaveValue(""); }
  finally { release(); }
  await expect(tax(page)).toHaveValue("PRIVATE-A");
});

test("blocked storage does not crash the page and failed save is explained", async ({ page, context }) => {
  await fixture(context);
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"])
      Object.defineProperty(Storage.prototype, method, { value() { throw new DOMException("blocked", "SecurityError"); } });
  });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/register-organizer"); await expect(save(page)).toBeEnabled();
  await tax(page).fill("PRIVATE-A"); await save(page).click();
  await expect(page.getByRole("status")).toContainText("Không thể lưu"); expect(errors).toEqual([]);
});

test("successful submit removes only the submitting account draft", async ({ page, context }) => {
  await fixture(context); await seed(page, { [key("A")]: draft("A"), [key("B")]: draft("B", "PRIVATE-B") });
  await page.goto("/register-organizer"); await expect(tax(page)).toHaveValue("PRIVATE-A");
  for (const [name, value] of Object.entries({ organizationName: "Audit Org", contactEmail: "a@example.test", contactPhone: "0900000000", businessName: "Audit Company", taxIdOrBusinessLicense: "TEST12345", websiteOrSocial: "https://example.test", headOfficeAddress: "Synthetic address", description: "Synthetic organizer application for a mocked security test. ".repeat(3) }))
    await page.locator(`form [name="${name}"]`).fill(value);
  await page.locator('[name="mainEventCategory"]').selectOption({ index: 1 });
  await page.locator('[name="expectedEventScale"]').selectOption({ index: 1 });
  await page.locator('[name="confirmation"]').check();
  const sent = page.waitForResponse(r => r.url().endsWith("/me/organizer-applications") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Gửi hồ sơ phê duyệt" }).click(); await sent;
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), key("A"))).toBeNull();
  expect(await page.evaluate(k => localStorage.getItem(k), key("B"))).not.toBeNull();
});
