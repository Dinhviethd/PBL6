import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Opt-in: point ONLY at the disposable API fixture from create-event.integration.test.cjs --serve.
test.skip(process.env.B4_LIVE_TEST !== "1", "Requires isolated B4 database/API on port 8014");
test.use({ channel: "chrome", timezoneId: "America/New_York" });

test("B4 real API, drafts, upload, validation, responsive and create", async ({ page, context }) => {
  test.setTimeout(120000);
  const login = await context.request.post("/api/auth/login", { data: {
    email: "organizer@example.test", password: process.env.B4_TEST_PASSWORD,
  } });
  expect(login.status()).toBe(200);
  const auth = (await login.json()).data;
  const key = `eventhub.create-event.${auth.user.idUser}.v1`;
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto("/organizer/new");
  await expect(page.getByRole("heading", { name:"Khởi tạo sự kiện của bạn" })).toBeVisible();
  await expect(page.getByRole("button", { name:"Mở bản đồ", exact:true })).toBeDisabled();
  const title = `[TEST B4 UI] Đêm nhạc mùa thu ${Date.now()}`;
  await page.locator('[name="title"]').fill(title);
  await page.keyboard.press("Tab");
  await expect(page.locator('[name="categoryId"]')).toBeFocused();
  await page.locator('textarea[name="description"]').fill("Câu chuyện âm nhạc\nDòng thứ hai giữ xuống dòng.");
  await expect(page.locator(".ce-preview-description")).toHaveText("Câu chuyện âm nhạc\nDòng thứ hai giữ xuống dòng.");
  await page.reload();
  await expect(page.locator('[name="title"]')).toHaveValue(title);
  await expect(page.locator(".ce-draft-note")).toContainText("khôi phục");
  const categories = await context.request.get("/api/categories");
  const categoryId = (await categories.json()).data[0].id;
  await page.locator('[name="categoryId"]').selectOption(categoryId);
  const fields = { venueName:"Trung tâm sự kiện", address:"123 Trần Phú & đường A, Hải Châu", cityCode:"Đà Nẵng",
    startsDate:"2027-11-25", startsTime:"18:00", endsDate:"2027-11-25", endsTime:"22:00",
    checkinOpensAt:"2027-11-25T17:00", checkinClosesAt:"2027-11-25T21:00" };
  for (const [name,value] of Object.entries(fields)) await page.locator(`[name="${name}"]`).fill(value);
  const maps = page.getByRole("link", { name:"Mở bản đồ" });
  expect(new URL((await maps.getAttribute("href"))!).searchParams.get("query")).toBe(`${fields.venueName}, ${fields.address}, ${fields.cityCode}`);
  await expect(maps).toHaveAttribute("target", "_blank");
  await page.locator('[name="endsTime"]').fill("17:00");
  await page.getByRole("button", { name:"Tạo sự kiện", exact:true }).click();
  await expect(page.getByRole("alert")).toContainText("Thời gian kết thúc phải sau");
  await page.locator('[name="endsTime"]').fill("22:00");
  const upload = page.getByLabel("Tải banner");
  await upload.setInputFiles({ name:"too-big.png", mimeType:"image/png", buffer:Buffer.alloc(5242881) });
  await expect(page.locator("#ce-banner [role=alert]")).toContainText("5 MB");
  await upload.setInputFiles({ name:"invalid.png", mimeType:"image/png", buffer:Buffer.from("not an image") });
  await expect(page.locator("#ce-banner [role=alert]")).not.toContainText("5 MB");
  const png = await page.evaluate(() => { const c=document.createElement("canvas"); c.width=1600;c.height=900; const g=c.getContext("2d")!;g.fillStyle="#7c3aed";g.fillRect(0,0,1600,900);g.fillStyle="#5de6ff";g.font="bold 100px sans-serif";g.fillText("EVENTHUB / B4",150,470);return c.toDataURL().split(",")[1]; });
  await upload.setInputFiles({ name:"banner.png", mimeType:"image/png", buffer:Buffer.from(png,"base64") });
  await expect(page.getByAltText("Banner sự kiện đã tải lên")).toBeVisible();
  await expect(page.locator("#ce-banner [role=alert]")).toHaveCount(0);
  const output = path.resolve(process.env.B4_EVIDENCE_DIR || "test-results/b4-evidence");
  await mkdir(output,{ recursive:true });
  for (const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(() => window.scrollTo(0,0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".osb-sidebar")).toBeVisible({ visible:width>900 });
    await page.screenshot({ path:path.join(output,`${width}.png`),fullPage:true });
  }
  await page.setViewportSize({width:1440,height:1000});
  // A genuine network outage preserves the form and never claims server success.
  await context.setOffline(true);
  await page.getByRole("button", { name:"Tạo sự kiện",exact:true }).click();
  await expect(page.locator(".ce-form>[role=alert]")).toBeVisible();
  await expect(page.locator('[name="title"]')).toHaveValue(title);
  await context.setOffline(false);
  let creates = 0;
  page.on("request", (r) => { if(r.method()==="POST" && r.url().endsWith("/api/organizer/events")) creates++; });
  const responsePromise = page.waitForResponse(r => r.request().method()==="POST" && r.url().endsWith("/api/organizer/events"));
  await page.getByRole("button", { name:"Tạo sự kiện",exact:true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const created = (await response.json()).data;
  await expect(page.locator(".ce-inline-success").getByRole("status")).toContainText("Tạo bản nháp thành công");
  await expect(page.getByRole("link", { name: "Tạo loại vé", exact: true })).toBeVisible();
  expect(creates).toBe(1);
  expect(await page.evaluate(k => localStorage.getItem(k),key)).toBeNull();
  const detail = await context.request.get(`/api/organizer/events/${created.id}`,{ headers:{Authorization:`Bearer ${auth.accessToken}`} });
  expect(detail.status()).toBe(200);
  const event = (await detail.json()).data;
  expect(event.title).toBe(title);
  expect(event.ticketTypes).toHaveLength(0);
  expect(event.status).toBe("DRAFT");
  expect(new Date(event.starts_at).toISOString()).toBe("2027-11-25T11:00:00.000Z");
  expect(event.description).toContain("\n");
  expect(event.cover_image_url).toMatch(/^\/uploads\//);
  await page.screenshot({path:path.join(output,"success.png"),fullPage:true});
  // Corrupt drafts and unavailable storage must not break event entry.
  await page.evaluate(k => localStorage.setItem(k,"{broken"),key);
  await page.goto("/organizer/new");
  await expect(page.getByRole("alert")).toContainText("Không đọc được bản nháp");
  await page.evaluate(() => { Storage.prototype.setItem=()=>{throw new DOMException("Denied","QuotaExceededError");}; });
  await page.locator('[name="title"]').fill("Still editable");
  await expect(page.getByRole("alert")).toContainText("Không thể lưu nháp");
  expect(failures).toEqual([]);
});

test("B4 draft belongs to its account and clear needs confirmation", async ({ page, context }) => {
  const login = await context.request.post("/api/auth/login", {data:{email:"organizer@example.test",password:process.env.B4_TEST_PASSWORD}});
  expect(login.status()).toBe(200);
  const auth = (await login.json()).data;
  const key = `eventhub.create-event.${auth.user.idUser}.v1`;
  await page.goto("/organizer/new");
  await page.locator('[name="title"]').fill("Private organizer draft");
  // Register a real second account. Role guard must prevent access to B4.
  const registered = await context.request.post("/api/auth/register", {data:{name:"B4 second account",email:`b4-ui-${Date.now()}@example.test`,password:"B4Fixture2026!",confirmPassword:"B4Fixture2026!"}});
  expect(registered.status()).toBe(200);
  await page.reload();
  await expect(page.locator('[name="title"]')).toHaveCount(0);
  await expect(page.getByText("Tài khoản chưa có quyền truy cập khu vực này.")).toBeVisible();
  await context.request.post("/api/auth/login", {data:{email:"organizer@example.test",password:process.env.B4_TEST_PASSWORD}});
  await page.reload();
  await expect(page.locator('[name="title"]')).toHaveValue("Private organizer draft");
  await page.getByRole("button",{name:"Xóa bản nháp trên thiết bị",exact:true}).click();
  await page.getByRole("button",{name:"Giữ lại",exact:true}).click();
  await expect(page.locator('[name="title"]')).toHaveValue("Private organizer draft");
  await page.getByRole("button",{name:"Xóa bản nháp trên thiết bị",exact:true}).click();
  await page.getByRole("button",{name:"Xóa bản nháp",exact:true}).click();
  await expect(page.locator('[name="title"]')).toHaveValue("");
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
});
