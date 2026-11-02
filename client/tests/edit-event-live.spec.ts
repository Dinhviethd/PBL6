import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { editEventForm, editEventPayload } from "../src/pages/organizer/edit-event-data";
import type { Event } from "../src/features/ticketing/types";

// Opt-in, real API on a disposable database. Never runs against the user's live events.
test.skip(process.env.B3_LIVE_TEST !== "1", "Requires isolated B3 API fixture on 8013");
test.use({ channel: "chrome", timezoneId: "America/New_York" });
const require = createRequire(import.meta.url);
const { Client } = require("../../server/node_modules/pg");
const fixturePath = path.resolve("../server/.local/b3-fixture.json");
const fixture = () => JSON.parse(readFileSync(fixturePath, "utf8"));
const output = path.resolve("../docs/reports/stitch/evidence/B3_20261101_implementation");

async function sql(query: string, values: unknown[]) {
  const connectionString = process.env.TEST_DATABASE_URL!;
  expect(new URL(connectionString).pathname).toMatch(/_test$/);
  const db = new Client({ connectionString, ssl: false });
  await db.connect();
  try { return (await db.query(query, values)).rows; } finally { await db.end(); }
}

test("edit: real save, timestamps, banner, navigation protection and four viewports", async ({ page, context }) => {
  test.setTimeout(120000);
  const f = fixture();
  await sql("UPDATE events SET title='[TEST B3 UI] Original',status='DRAFT',sales_paused=false,cancelled_at=NULL,cancellation_reason=NULL,archived_at=NULL,cover_image_url='https://example.test/banner.webp' WHERE id=$1", [f.eventId]);
  const login = await context.request.post("/api/auth/login", { data: { email: f.email, password: f.password } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const before = (await (await context.request.get(`/api/organizer/events/${f.eventId}`, { headers })).json()).data;
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  await page.goto(`/organizer/events/${f.eventId}`);
  await expect(page.getByRole("heading", { name: "Chỉnh sửa sự kiện", exact: true })).toBeVisible();
  await expect(page.locator('.osb-nav a[aria-current="page"]')).toHaveText("Chỉnh sửa sự kiện");
  await expect(page.getByLabel("Đường dẫn (tự động)")).toHaveValue(before.slug);
  await page.locator('[name="title"]').focus();
  await page.keyboard.press("Tab");
  await expect(page.locator('[name="categoryId"]')).toBeFocused();
  await expect(page.locator('[name="startsTime"]')).toHaveValue(new Date(Date.parse(before.starts_at) + 7 * 3600000).toISOString().slice(11, 16));
  expect(await page.locator('[name="startsDate"]').inputValue()).toBe(new Date(Date.parse(before.starts_at) + 7 * 3600000).toISOString().slice(0, 10));
  const preview = await page.locator(".ce-preview-card").boundingBox();
  const review = await page.locator(".ee-review").boundingBox();
  expect(review!.y).toBeGreaterThan(preview!.y + preview!.height);
  expect(await page.locator('.ce-form [name="price"]').count()).toBe(0);
  await page.locator('[name="title"]').fill("[TEST B3 UI] Saved title");
  await expect(page.locator(".ce-preview-content h2")).toHaveText("[TEST B3 UI] Saved title");
  await expect(page.getByRole("button", { name: "Gửi Admin phê duyệt", exact: true })).toBeDisabled();
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator(".ce-actions").getByRole("link", { name: "Quản lý loại vé", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/organizer/events/${f.eventId}$`));
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".ee-notice").first()).toContainText("Đã lưu thay đổi");
  const after = (await (await context.request.get(`/api/organizer/events/${f.eventId}`, { headers })).json()).data;
  expect(after.slug).toBe(before.slug); expect(after.cover_image_url).toBe(before.cover_image_url);
  for (const key of ["starts_at", "ends_at", "checkin_opens_at", "checkin_closes_at"]) expect(after[key]).toBe(before[key]);
  await page.getByRole("button", { name: "Bỏ ảnh", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".ee-notice").first()).toContainText("Đã lưu thay đổi");
  expect((await (await context.request.get(`/api/organizer/events/${f.eventId}`, { headers })).json()).data.cover_image_url).toBeNull();
  const sharp = require("../../server/node_modules/sharp");
  const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#7c3aed" } }).png().toBuffer();
  await page.getByLabel("Tải banner").setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Banner sự kiện đã tải lên")).toBeVisible();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".ee-notice").first()).toContainText("Đã lưu thay đổi");
  mkdirSync(output, { recursive: true });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: path.join(output, `${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".ce-actions").getByRole("link", { name: "Quản lý loại vé", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/organizer/events/${f.eventId}/tickets$`));
  await page.getByRole("link", { name: "Chỉnh sửa thông tin sự kiện" }).click();
  await expect(page).toHaveURL(new RegExp(`/organizer/events/${f.eventId}$`));
  await page.locator('[name="title"]').fill("[TEST B3 UI] Unsaved Back");
  const backDialog = page.waitForEvent("dialog", { timeout: 5000 });
  const traversal = page.evaluate(() => history.back());
  const dialog = await backDialog;
  expect(dialog.message()).toContain("thay đổi chưa lưu");
  await dialog.dismiss();
  await traversal;
  await expect(page).toHaveURL(new RegExp(`/organizer/events/${f.eventId}$`));
  await expect(page.locator('[name="title"]')).toHaveValue("[TEST B3 UI] Unsaved Back");
  await page.locator('[name="title"]').fill("[TEST B3 UI] Saved title");
  expect(failures).toEqual([]);
});

test("a successful save with failed reload cannot be accidentally submitted twice", async ({ page, context }) => {
  const f = fixture();
  await sql("UPDATE events SET status='DRAFT',archived_at=NULL,cancelled_at=NULL WHERE id=$1", [f.eventId]);
  await context.request.post("/api/auth/login", { data: { email: f.email, password: f.password } });
  await page.goto(`/organizer/events/${f.eventId}`);
  await expect(page.locator('[name="title"]')).toBeEnabled();
  await page.locator('[name="title"]').fill(`[TEST B3 UI] Reload failure ${Date.now()}`);
  let patches = 0;
  page.on("request", request => { if (request.method() === "PATCH") patches++; });
  // Network fault injection only; all mutations still reach the actual API.
  await page.route(`**/api/organizer/events/${f.eventId}`, route => route.request().method() === "GET" ? route.abort("failed") : route.continue());
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Đã lưu thay đổi nhưng chưa tải lại");
  await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Gửi Admin phê duyệt", exact: true })).toBeDisabled();
  expect(patches).toBe(1);
  await page.unroute(`**/api/organizer/events/${f.eventId}`);
  await page.getByRole("button", { name: "Tải lại dữ liệu sự kiện", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gửi Admin phê duyệt", exact: true })).toBeEnabled();
  expect(patches).toBe(1);
});

test("minute display preserves distinct original timestamps within the same minute", () => {
  const original: Event = { id: "test", organizer_id: "owner", slug: "event", status: "DRAFT", sales_paused: false,
    title: "Event", category_id: "category", description: "Details", venue_name: "Venue", address: "Address", city_code: "DN",
    starts_at: "2027-11-01T11:00:30.123Z", ends_at: "2027-11-01T11:00:45.456Z",
    checkin_opens_at: "2027-11-01T11:00:01.123Z", checkin_closes_at: "2027-11-01T11:00:40.456Z" };
  const payload = editEventPayload({ ...editEventForm(original), title: "Updated" }, original);
  expect(payload.startsAt).toBe(original.starts_at);
  expect(payload.endsAt).toBe(original.ends_at);
  expect(payload.checkinOpensAt).toBe(original.checkin_opens_at);
  expect(payload.checkinClosesAt).toBe(original.checkin_closes_at);
});

test("review states, public edit confirmation, API errors and submission", async ({ page, context }) => {
  test.setTimeout(120000);
  const f = fixture();
  const login = await context.request.post("/api/auth/login", { data: { email: f.email, password: f.password } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const route = `/organizer/events/${f.eventId}`;
  await sql("UPDATE events SET status='PUBLISHED',published_at=now() WHERE id=$1", [f.eventId]);
  await page.goto(route);
  await expect(page.locator(".ce-preview-status")).toContainText("Đã công khai");
  await page.getByRole("button", { name: "Tạm ngừng bán", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mở bán trở lại", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Mở bán trở lại", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tạm ngừng bán", exact: true })).toBeEnabled();
  await page.locator('textarea[name="description"]').fill("Updated public event\nKeep the lines");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".ce-preview-status")).toContainText("Đã công khai");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".ce-preview-status")).toContainText("Bản nháp");
  await page.locator('textarea[name="description"]').fill("Retain text during an outage");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Không kết nối");
  await expect(page.locator('textarea[name="description"]')).toHaveValue("Retain text during an outage");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".ee-notice").first()).toContainText("Đã lưu thay đổi");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Gửi Admin phê duyệt", exact: true }).click();
  await expect(page.locator(".ce-preview-status")).toContainText("Chờ duyệt");
  await expect(page.locator('[name="title"]')).toBeDisabled();
  for (const status of ["REJECTED", "CANCELLED", "ARCHIVED"]) {
    await sql("UPDATE events SET status=$2::varchar,cancelled_at=CASE WHEN $2::text='CANCELLED' THEN now() ELSE NULL END,cancellation_reason=CASE WHEN $2::text='CANCELLED' THEN 'Test' ELSE NULL END,archived_at=CASE WHEN $2::text='ARCHIVED' THEN now() ELSE NULL END WHERE id=$1", [f.eventId, status]);
    await page.reload();
    if (status === "REJECTED") await expect(page.locator('[name="title"]')).toBeEnabled();
    else await expect(page.locator('[name="title"]')).toBeDisabled();
  }
  // Real ownership failure, using another organizer's event from the disposable DB.
  const rows = await sql("SELECT id FROM events WHERE organizer_id<>$1 LIMIT 1", [f.ownerId]);
  if (rows.length) {
    await page.goto(`/organizer/events/${rows[0].id}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator(".ce-form")).toHaveCount(0);
  }
  await page.goto("/organizer/events/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("alert")).toContainText("Không tìm thấy");
  await sql("UPDATE events SET status='DRAFT',archived_at=NULL WHERE id=$1", [f.eventId]);
  const latest = await context.request.get(`/api${route}`, { headers });
  expect(latest.status()).toBe(200);
});
