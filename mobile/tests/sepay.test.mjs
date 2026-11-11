import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransfer,
  shouldPoll,
  retryDelay,
  createSepayController,
} from "../src/lib/sepay.ts";
const payment = {
  orderStatus: "PENDING_PAYMENT",
  status: "PENDING",
  canTransfer: true,
  requiresReview: false,
  expiresAt: new Date(10000).toISOString(),
  holdUntil: new Date(30000).toISOString(),
};
const absent = () =>
  Object.assign(new Error("absent"), { status: 404, code: "SEPAY_NOT_FOUND" });
function fixture(request) {
  let now = 0,
    state,
    paid = 0;
  const controller = createSepayController({
    request,
    now: () => now,
    changed: (s) => (state = s),
    paid: () => paid++,
  });
  return {
    controller,
    get state() {
      return state;
    },
    get paid() {
      return paid;
    },
    advance: (n) => (now += n),
  };
}
test("QR deadline differs from reconciliation deadline; review and terminal states cannot transfer", () => {
  assert.equal(canTransfer(payment, 9999), true);
  assert.equal(canTransfer(payment, 10000), false);
  assert.equal(shouldPoll(payment, 10000), true);
  assert.equal(shouldPoll(payment, 30000), false);
  for (const patch of [
    { requiresReview: true },
    { orderStatus: "PAID" },
    { orderStatus: "CANCELLED" },
    { status: "FAILED" },
    { canTransfer: false },
  ])
    assert.equal(canTransfer({ ...payment, ...patch }, 0), false);
});
test("restore is read-only and concurrent taps create at most one payment", async () => {
  let created = false,
    posts = 0;
  const f = fixture(async (method) => {
    if (method === "POST") {
      posts++;
      created = true;
      return payment;
    }
    if (!created) throw absent();
    return payment;
  });
  await f.controller.activate();
  assert.equal(posts, 0);
  f.advance(3000);
  await Promise.all([
    f.controller.start(),
    f.controller.start(),
    f.controller.refresh(),
  ]);
  assert.equal(posts, 1);
  assert.equal(f.state.payment, payment);
});
test("lost POST response is reconciled with GET without another write", async () => {
  let created = false,
    posts = 0;
  const f = fixture(async (method) => {
    if (method === "POST") {
      created = true;
      posts++;
      throw Object.assign(new Error("offline"), { status: 0 });
    }
    if (!created) throw absent();
    return payment;
  });
  await f.controller.activate();
  f.advance(3000);
  await f.controller.start();
  assert.equal(posts, 1);
  assert.equal(f.state.payment, payment);
  assert.equal(f.state.error, "");
});
test("background and disposed session stop requests and ignore late results", async () => {
  let resolve,
    calls = 0;
  const f = fixture(() => {
    calls++;
    return new Promise((r) => (resolve = r));
  });
  const task = f.controller.activate();
  f.controller.deactivate();
  f.advance(9000);
  await f.controller.tick();
  assert.equal(calls, 1);
  f.controller.dispose();
  resolve({ ...payment, orderStatus: "PAID" });
  await task;
  assert.equal(f.paid, 0);
  assert.equal(f.state.payment, null);
});
test("poll no more often than 8s, stop at terminal, refresh on resume", async () => {
  let calls = 0,
    paid = false;
  const f = fixture(async () => {
    calls++;
    return paid ? { ...payment, orderStatus: "PAID" } : payment;
  });
  await f.controller.activate();
  f.advance(8000);
  await f.controller.tick();
  assert.equal(calls, 2);
  f.advance(7000);
  await f.controller.tick();
  assert.equal(calls, 2);
  f.controller.deactivate();
  paid = true;
  await f.controller.activate();
  assert.equal(f.paid, 1);
  f.advance(8000);
  await f.controller.tick();
  assert.equal(calls, 3);
});
test("429 honors Retry-After across resume; errors conceal transfer UI through state", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    throw Object.assign(new Error("limit"), { status: 429, retryAfter: "60" });
  });
  await f.controller.activate();
  f.advance(59000);
  await f.controller.activate();
  assert.equal(calls, 1);
  assert.equal(f.state.error, "limit");
  f.advance(1000);
  await f.controller.refresh();
  assert.equal(calls, 2);
  assert.equal(retryDelay(null, 0), 60000);
  assert.equal(retryDelay("bad", 0), 60000);
  assert.equal(retryDelay(new Date(60000).toUTCString(), 10000), 50000);
});
test("401/403/404/conflict/maintenance stop automatic retries; explicit retry remains possible", async () => {
  for (const status of [401, 403, 404, 409, 503]) {
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      throw Object.assign(new Error("blocked"), { status });
    });
    await f.controller.activate();
    f.advance(9000);
    await f.controller.tick();
    assert.equal(calls, 1);
    await f.controller.refresh();
    assert.equal(calls, 2);
  }
});
