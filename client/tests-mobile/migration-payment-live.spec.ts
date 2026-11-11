import { test, expect, type Page } from "./live-test-fixture";
import { readFileSync } from "node:fs";
import { randomUUID, createHmac } from "node:crypto";
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../.local/mobile-migration/booking-fixture.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const runtime = JSON.parse(
  readFileSync(
    new URL("../../.local/mobile-migration/runtime.json", import.meta.url),
    "utf8",
  ),
);

async function pending(page: Page) {
  const login = await page.request.post("/api/auth/login", {
    headers: { Origin: "http://127.0.0.1:8083" },
    data: fixture.buyer,
  });
  expect(login.ok()).toBeTruthy();
  const auth = (await login.json()).data;
  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
    "Idempotency-Key": randomUUID(),
  };
  const created = await page.request.post("/api/orders", {
    headers,
    data: {
      eventId: fixture.event.id,
      items: [{ ticketTypeId: fixture.type.id, quantity: 1 }],
    },
  });
  expect(created.ok()).toBeTruthy();
  return { id: (await created.json()).data.id as string, headers };
}
test("real SePay: pending never reports success, transfer details and signed webhook lead to PAID and tickets", async ({
  page,
}) => {
  const { id, headers } = await pending(page);
  await page.goto(`/payment-status/${id}`);
  await expect(
    page.getByText("Chưa xác nhận thanh toán", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Thanh toán thành công", { exact: true }),
  ).toHaveCount(0);
  await page.goto(`/orders/${id}`);
  await page
    .getByRole("button", { name: "Thanh toán qua MB Bank", exact: true })
    .click();
  await expect(
    page.getByText("Số tài khoản: MOBILEQA001", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Sao chép nội dung chuyển khoản",
      exact: true,
    }),
  ).toBeVisible();
  const payment = (
    await (
      await page.request.get(`/api/sepay/orders/${id}/payment`, { headers })
    ).json()
  ).data;
  expect(payment.environment).toBe("test");
  const payload = {
    id: Date.now(),
    gateway: "MBBank",
    transactionDate: new Date().toLocaleString("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
    accountNumber: "MOBILEQA001",
    subAccount: null,
    code: payment.transferContent,
    content: payment.transferContent,
    transferType: "in",
    transferAmount: Number(payment.amount),
    accumulated: 0,
    description: "Synthetic mobile UI test",
    referenceCode: randomUUID(),
  };
  const body = JSON.stringify(payload),
    ts = String(Math.floor(Date.now() / 1000));
  const signature =
    "sha256=" +
    createHmac("sha256", runtime.jwt)
      .update(ts + ".")
      .update(body)
      .digest("hex");
  const response = await page.request.post("/api/payments/sepay/webhook", {
    headers: {
      "Content-Type": "application/json",
      "X-SePay-Timestamp": ts,
      "X-SePay-Signature": signature,
    },
    data: body,
  });
  expect(response.ok()).toBeTruthy();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/me/orders/${id}`, { headers })
          ).json()
        ).data.status,
    )
    .toBe("PAID");
  await page
    .getByRole("button", { name: "Cập nhật trạng thái", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem kết quả thanh toán", exact: true })
    .click();
  await expect(
    page.getByText("Thanh toán thành công", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Đã phát hành 1/1 vé.", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "../.local/mobile-migration/payment-success-390.png",
    fullPage: true,
  });
});

test("real API: cancel requires confirmation and cannot display paid result", async ({
  page,
}) => {
  const { id, headers } = await pending(page);
  await page.goto(`/orders/${id}`);
  await page
    .getByRole("button", { name: "Hủy đơn chưa thanh toán", exact: true })
    .click();
  await expect(
    page.getByText("Hủy đơn này và trả số vé đang giữ về kho?"),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`/api/me/orders/${id}`, { headers })).json())
      .data.status,
  ).toBe("PENDING_PAYMENT");
  await page
    .getByRole("button", { name: "Xác nhận hủy đơn", exact: true })
    .click();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await page.goto(`/payment-status/${id}`);
  await expect(
    page.getByText("Chưa xác nhận thanh toán", { exact: true }),
  ).toBeVisible();
});
