import { expect, type Page, type BrowserContext } from "@playwright/test";

export async function queuePurchase(
  page: Page,
  context: BrowserContext,
  mobile: boolean,
) {
  const fixture = JSON.parse(process.env.WAIT_QUEUE_FIXTURE!);
  const password = "QueueBrowser2026!";
  const registered = await context.request.post("/api/auth/register", {
    data: {
      name: "Queue browser buyer",
      email: `queue-${crypto.randomUUID()}@example.test`,
      password,
      confirmPassword: password,
    },
  });
  expect(registered.ok()).toBeTruthy();
  const session = (await registered.json()).data;
  await page.goto(`/events/${fixture.slug}`);
  await page
    .getByRole("button", { name: "Chờ vé Standard", exact: true })
    .click();
  await expect(
    page.getByText("Đang chờ · Vị trí 1", { exact: true }),
  ).toBeVisible();
  const released = await context.request.post(
    `/api/orders/${fixture.orderId}/cancel`,
    { headers: { Authorization: `Bearer ${fixture.holderToken}` }, data: {} },
  );
  expect(released.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  let entry: { order_id: string; status: string };
  await expect
    .poll(async () => {
      const response = await context.request.get("/api/me/wait-queue", {
        headers,
      });
      entry = (await response.json()).data[0];
      return entry?.status;
    })
    .toBe("OFFERED");
  await page
    .getByRole("button", { name: "Cập nhật hàng chờ", exact: true })
    .click();
  await expect(
    page.getByText("Đã giữ vé cho bạn", { exact: true }),
  ).toBeVisible();
  const payment = await context.request.post(
    `/api/orders/${entry!.order_id}/payments`,
    { headers, data: {} },
  );
  expect(payment.ok()).toBeTruthy();
  await page
    .getByRole(mobile ? "button" : "link", {
      name: "Xem đơn giữ vé",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Mô phỏng thanh toán thành công",
      exact: true,
    })
    .click();
  await expect
    .poll(async () => {
      const response = await context.request.get(
        `/api/me/orders/${entry!.order_id}`,
        { headers },
      );
      return (await response.json()).data.status;
    })
    .toBe("PAID");
  const tickets = await context.request.get("/api/me/tickets", { headers });
  expect((await tickets.json()).data).toHaveLength(1);
  const queue = await context.request.get("/api/me/wait-queue", { headers });
  expect((await queue.json()).data[0].status).toBe("COMPLETED");
  const inbox = await context.request.get("/api/me/notifications", { headers });
  expect(
    (await inbox.json()).data.items.filter(
      (n: { kind: string }) => n.kind === "WAIT_QUEUE_OFFER",
    ),
  ).toHaveLength(1);
}
