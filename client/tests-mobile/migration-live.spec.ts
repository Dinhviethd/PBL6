import { test, expect, type Page } from "./live-test-fixture";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

async function register(page: Page) {
  const email = `ui-${randomUUID()}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: "http://127.0.0.1:8083" },
    data: {
      name: "Mobile QA",
      email,
      password: "MobileTest2026!",
      confirmPassword: "MobileTest2026!",
    },
  });
  expect(response.ok()).toBeTruthy();
  return email;
}
async function fill(page: Page, label: string, value: string) {
  await page.getByRole("textbox", { name: label, exact: true }).fill(value);
}

test("real API: profile saves name/phone and uploaded avatar survives later edits", async ({
  page,
}) => {
  await register(page);
  await page.goto("/profile");
  await fill(page, "Họ và tên", "Nguyễn Minh Anh");
  await fill(page, "Số điện thoại", "0900000001");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByText("Đã lưu thông tin cá nhân.")).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Thay ảnh đại diện", exact: true })
    .click();
  const file = await chooser;
  // A real PNG is decoded by the backend; this is test input, not an API mock.
  const sharp = createRequire(import.meta.url)(
    "../../server/node_modules/sharp",
  );
  const buffer = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#7c3aed" },
  })
    .png()
    .toBuffer();
  await file.setFiles({ name: "avatar.png", mimeType: "image/png", buffer });
  await expect(page.getByText("Đã cập nhật ảnh đại diện.")).toBeVisible();
  await expect(
    page.getByAltText("Ảnh đại diện", { exact: true }),
  ).toBeVisible();
  await fill(page, "Họ và tên", "Nguyễn Minh Anh Updated");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByText("Đã lưu thông tin cá nhân.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Họ và tên", exact: true }),
  ).toHaveValue("Nguyễn Minh Anh Updated");
  await expect(
    page.getByAltText("Ảnh đại diện", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "../.local/mobile-migration/profile-390.png",
    fullPage: true,
  });
});

test("real API: password mismatch blocks submit, password change ends old session", async ({
  page,
}) => {
  await register(page);
  await page.goto("/change-password");
  await page
    .getByLabel("Mật khẩu hiện tại", { exact: true })
    .fill("MobileTest2026!");
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("ChangedMobile2026!");
  await page
    .getByLabel("Nhập lại mật khẩu mới", { exact: true })
    .fill("Mismatch2026!");
  await page
    .getByRole("button", { name: "Cập nhật mật khẩu", exact: true })
    .click();
  await expect(page.getByText("Mật khẩu nhập lại không khớp.")).toBeVisible();
  await page
    .getByLabel("Nhập lại mật khẩu mới", { exact: true })
    .fill("ChangedMobile2026!");
  await page
    .getByRole("button", { name: "Cập nhật mật khẩu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/auth/);
  await expect(
    page.getByText("Đã đổi mật khẩu. Vui lòng đăng nhập lại."),
  ).toBeVisible();
});

test("real SMTP: reset password sends OTP, verifies it and returns to intended route", async ({
  page,
  request,
}) => {
  const email = await register(page);
  await page.goto("/reset-password?next=/tickets");
  await fill(page, "Email tài khoản", email);
  await page
    .getByRole("button", { name: "Gửi mã xác nhận", exact: true })
    .click();
  await expect(page.getByText("Kiểm tra email", { exact: true })).toBeVisible();
  const mailbox = await (
    await request.get("http://127.0.0.1:8026/api/v1/messages")
  ).json();
  const message = mailbox.messages.find((m: { To: { Address: string }[] }) =>
    m.To.some((to) => to.Address === email),
  );
  expect(message).toBeTruthy();
  const mail = await (
    await request.get(`http://127.0.0.1:8026/api/v1/message/${message.ID}`)
  ).json();
  const otp = mail.Text.match(/\b\d{6}\b/)[0];
  await fill(page, "Mã xác nhận 6 số", otp);
  await page.getByRole("button", { name: "Xác minh mã", exact: true }).click();
  await expect(
    page.getByText("Mật khẩu mới", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("ResetMobile2026!");
  await page
    .getByLabel("Nhập lại mật khẩu mới", { exact: true })
    .fill("ResetMobile2026!");
  await page
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/auth/);
  await fill(page, "Email", email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("ResetMobile2026!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
});
