const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOrderHistory,
  historyGroup,
} = require("../dist/workflows/order-history");
const principal = { userId: "buyer" };
test("history: all-period totals, search beyond page 50, review precedence and canonical payment", async () => {
  const rows = Array.from({ length: 61 }, (_, i) => ({
    id: String(i),
    buyer_id: "buyer",
    order_code: `EH-${i}`,
    event_title_snapshot: i === 60 ? "Unique event" : "Festival",
    status: i % 2 ? "EXPIRED" : "PAID",
    total_amount: "10000000000000001",
    paid_payment_id: `paid-${i}`,
    total_quantity: 2,
  }));
  const paymentRows = [
    { id: "new", order_id: "60", status: "FAILED" },
    { id: "paid-60", order_id: "60", status: "SUCCEEDED" },
  ];
  const orders = {
    historyScope: async (buyer) => {
      assert.equal(buyer, "buyer");
      return rows;
    },
    historyItems: async () => [],
    historyTickets: async () => [],
    one: async (id) => rows.find((o) => o.id === id),
  };
  const service = createOrderHistory(orders, {
    historyPayments: async () => paymentRows,
  });
  const result = await service.list(principal, {
    page: 0,
    pageSize: 5,
    q: "unique",
    group: "all",
  });
  assert.equal(result.pagination.total, 1);
  assert.equal(
    result.summary.totalAmount,
    (31n * 10000000000000001n).toString(),
  );
  assert.equal(result.items[0].payment.paid.id, "paid-60");
  assert.equal(result.items[0].payment.latest.status, "FAILED");
  const page = await service.list(principal, {
    page: 12,
    pageSize: 5,
    q: "",
    group: "all",
  });
  assert.equal(page.items.length, 1);
  assert.equal(page.pagination.totalPages, 13);
  await assert.rejects(
    service.detail({ userId: "other" }, "60"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    service.detail(principal, "absent"),
    (e) => e.status === 404,
  );
  await assert.rejects(
    service.list(principal, {
      page: 0,
      pageSize: 5,
      q: "",
      group: "all",
      from: "2026-10-28T17:00:00Z",
      toExclusive: "2026-10-27T17:00:00Z",
    }),
    (e) => e.status === 400,
  );
  assert.equal(
    historyGroup({ status: "PAID" }, [{ requires_review: true }]),
    "processing",
  );
  assert.equal(historyGroup({status:"EXPIRED"},[{status:"UNKNOWN"}]),"processing");
  assert.equal(
    historyGroup({ status: "PAID" }, [
      { requires_review: true, review_resolved_at: "now" },
    ]),
    "paid",
  );
});
test("history: pending/unknown block cancel, expired cannot continue, mixed tickets remain distinct", async () => {
  const rows = [
    {
      id: "a",
      buyer_id: "buyer",
      status: "PENDING_PAYMENT",
      expires_at: new Date(Date.now() + 60000).toISOString(),
      total_quantity: 3,
    },
    { id: "b", buyer_id: "buyer", status: "EXPIRED", total_quantity: 0 },
  ];
  const service = createOrderHistory(
    {
      one: async (id) => rows.find((o) => o.id === id),
      historyItems: async () => [],
      historyTickets: async (ids) =>
        ids.includes("a")
          ? [
              { order_id: "a", status: "VALID" },
              { order_id: "a", status: "CHECKED_IN" },
              { order_id: "a", status: "VOID" },
            ]
          : [],
    },
    {
      historyPayments: async (ids) =>
        ids.includes("a") ? [{ order_id: "a", status: "UNKNOWN" }] : [],
    },
  );
  const a = await service.detail(principal, "a");
  assert.equal(a.actions.canCancel, false);
  assert.equal(a.tickets.valid, 1);
  assert.equal(a.tickets.checkedIn, 1);
  assert.equal(a.tickets.void, 1);
  assert.equal(
    (await service.detail(principal, "b")).actions.canContinueCheckout,
    false,
  );
});
