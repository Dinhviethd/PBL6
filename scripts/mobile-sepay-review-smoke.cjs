const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { randomUUID, createHmac } = require("node:crypto");
const dir = path.resolve(__dirname, "../.local/mobile-migration");
async function main() {
  const fixture = JSON.parse(
      fs.readFileSync(path.join(dir, "booking-fixture.json"), "utf8"),
    ),
    config = JSON.parse(
      fs.readFileSync(path.join(dir, "runtime.json"), "utf8"),
    ),
    evidence = [];
  const base = "http://127.0.0.1:8016/api";
  async function call(
    method,
    endpoint,
    body,
    token,
    expected = 200,
    extra = {},
  ) {
    const response = await fetch(base + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    evidence.push({
      method,
      endpoint,
      status: response.status,
      expected,
      code: result.code,
    });
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${result.message || ""}`,
    );
    return result.data;
  }
  try {
    const buyer = await call("POST", "/auth/mobile/login", fixture.buyer),
      admin = await call("POST", "/auth/mobile/login", fixture.owner);
    const order = await call(
      "POST",
      "/orders",
      {
        eventId: fixture.event.id,
        items: [{ ticketTypeId: fixture.type.id, quantity: 1 }],
      },
      buyer.accessToken,
      200,
      { "Idempotency-Key": randomUUID() },
    );
    const payment = await call(
      "POST",
      `/sepay/orders/${order.id}/payment`,
      {},
      buyer.accessToken,
      201,
    );
    const webhookId = Date.now(),
      payload = {
        id: webhookId,
        gateway: "MBBank",
        transactionDate: new Date().toLocaleString("sv-SE", {
          timeZone: "Asia/Ho_Chi_Minh",
        }),
        accountNumber: "MOBILEQA001",
        subAccount: null,
        code: payment.transferContent,
        content: payment.transferContent,
        transferType: "in",
        transferAmount: Number(payment.amount) + 1,
        accumulated: 0,
        description: "Synthetic mismatched transfer",
        referenceCode: randomUUID(),
      };
    const raw = JSON.stringify(payload),
      ts = String(Math.floor(Date.now() / 1000)),
      signature =
        "sha256=" +
        createHmac("sha256", config.jwt)
          .update(ts + ".")
          .update(raw)
          .digest("hex");
    const response = await fetch(base + "/payments/sepay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SePay-Timestamp": ts,
        "X-SePay-Signature": signature,
      },
      body: raw,
    });
    assert.equal(response.status, 200);
    let transaction;
    for (let i = 0; i < 10; i++) {
      const rows = await call(
        "GET",
        "/admin/sepay/transactions",
        undefined,
        admin.accessToken,
      );
      transaction = rows.find(
        (r) => r.webhook_transaction_id === String(webhookId),
      );
      if (transaction?.status === "REVIEW") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    assert.equal(transaction.status, "REVIEW");
    await call(
      "GET",
      `/admin/sepay/transactions/${transaction.id}`,
      undefined,
      admin.accessToken,
    );
    await call(
      "POST",
      `/admin/sepay/transactions/${transaction.id}/reprocess`,
      {},
      admin.accessToken,
    );
    for (let i = 0; i < 10; i++) {
      transaction = await call(
        "GET",
        `/admin/sepay/transactions/${transaction.id}`,
        undefined,
        admin.accessToken,
      );
      if (transaction.status === "REVIEW") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    await call(
      "POST",
      `/admin/sepay/transactions/${transaction.id}/resolve`,
      {
        outcome: "unmatched",
        reason: "Dữ liệu tổng hợp kiểm thử, không có chuyển tiền thật",
        evidenceReference: "MOBILE-QA",
      },
      admin.accessToken,
    );
    const pending = await call(
      "GET",
      `/me/orders/${order.id}`,
      undefined,
      buyer.accessToken,
    );
    assert.equal(pending.status, "PENDING_PAYMENT");
    fixture.reviewTransactionId = transaction.id;
    fs.writeFileSync(
      path.join(dir, "booking-fixture.json"),
      JSON.stringify(fixture, null, 2),
      { mode: 0o600 },
    );
    console.log(
      `PASS ${evidence.length} SePay review/reprocess/resolve HTTP checks; no ticket issued for mismatched amount.`,
    );
  } finally {
    fs.writeFileSync(
      path.join(dir, "sepay-review-evidence.json"),
      JSON.stringify(
        { timestamp: new Date().toISOString(), target: base, calls: evidence },
        null,
        2,
      ),
    );
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
