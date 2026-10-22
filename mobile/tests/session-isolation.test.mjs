import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/lib/api-client.ts";

const json = (data, status = 200) =>
  new Response(
    JSON.stringify({ success: status === 200, data, code: "INVALID_SESSION" }),
    { status },
  );
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function harness(native = false) {
  let cookie = "A",
    lost = 0,
    refreshes = 0,
    stored = null;
  const writes = [];
  const expired = new Set();
  const hooks = new Map();
  const client = createApiClient({
    baseUrl: "",
    native,
    storage: {
      read: async () => stored,
      write: async (v) => {
        stored = v;
      },
      clear: async () => {
        stored = null;
      },
    },
    onSessionLost: () => lost++,
    fetcher: async (url, options) => {
      if (hooks.has(url)) return hooks.get(url)(options);
      if (url.endsWith("/login")) {
        cookie = JSON.parse(options.body).email;
        return json({
          user: { idUser: cookie },
          accessToken: cookie,
          refreshToken: cookie + "-refresh",
        });
      }
      if (url.endsWith("/refresh-token")) {
        refreshes++;
        return json({
          accessToken: cookie + "-new",
          refreshToken: cookie + "-rotated",
        });
      }
      const token = options.headers.Authorization?.slice(7);
      if (expired.has(token) || !token) return json(null, 401);
      if (url === "/auth/me") return json({ idUser: token.split("-")[0] });
      if (options.method === "POST") writes.push(token);
      return json({ owner: token });
    },
  });
  return {
    client,
    hooks,
    expired,
    writes,
    setCookie: (v) => {
      cookie = v;
    },
    lost: () => lost,
    refreshes: () => refreshes,
    stored: () => stored,
  };
}

test("web refuses to retry A write using B cookie even without cross-tab signal", async () => {
  const h = harness();
  await h.client.authenticate("login", { email: "A" });
  h.setCookie("B");
  h.expired.add("A");
  await assert.rejects(
    h.client.request("/orders", "POST", {}),
    (e) => e.code === "SESSION_CHANGED",
  );
  assert.deepEqual(h.writes, []);
  assert.equal(h.lost(), 1);
});
test("same-account web refresh retries and preserves idempotency header", async () => {
  const h = harness();
  await h.client.authenticate("login", { email: "A" });
  h.expired.add("A");
  const result = await h.client.request(
    "/orders",
    "POST",
    {},
    { "Idempotency-Key": "booking-key" },
  );
  assert.equal(result.owner, "A-new");
  assert.deepEqual(h.writes, ["A-new"]);
  assert.equal(h.lost(), 0);
});
test("guest write cannot acquire an unrelated cookie account", async () => {
  const h = harness();
  h.setCookie("B");
  await assert.rejects(
    h.client.request("/orders", "POST", {}),
    (e) => e.status === 401,
  );
  assert.equal(h.refreshes(), 0);
  assert.deepEqual(h.writes, []);
});
for (const native of [false, true]) {
  test(`${native ? "native" : "web"} drops a successful response from the old account`, async () => {
    const h = harness(native),
      response = deferred(),
      entered = deferred();
    await h.client.authenticate("login", { email: "A" });
    h.hooks.set("/me/tickets", () => {
      entered.resolve();
      return response.promise;
    });
    const pending = h.client.request("/me/tickets");
    const rejected = assert.rejects(
      pending,
      (e) => e.code === "SESSION_CHANGED",
    );
    await entered.promise;
    await h.client.authenticate("login", { email: "B" });
    response.resolve(json([{ owner: "A" }]));
    await rejected;
    assert.equal((await h.client.request("/auth/me")).idUser, "B");
    assert.equal(h.lost(), 0);
  });
  for (const status of [200, 401]) {
    test(`${native ? "native" : "web"} late refresh ${status} preserves B and never retries A`, async () => {
      const h = harness(native),
        response = deferred(),
        entered = deferred();
      await h.client.authenticate("login", { email: "A" });
      h.expired.add("A");
      h.hooks.set(
        native ? "/auth/mobile/refresh-token" : "/auth/refresh-token",
        () => {
          entered.resolve();
          return response.promise;
        },
      );
      const pending = h.client.request("/orders", "POST", {});
      const rejected = assert.rejects(pending);
      await entered.promise;
      await h.client.authenticate("login", { email: "B" });
      response.resolve(
        json({ accessToken: "A-new", refreshToken: "A-rotated" }, status),
      );
      await rejected;
      assert.equal((await h.client.request("/auth/me")).idUser, "B");
      assert.deepEqual(h.writes, []);
      assert.equal(h.lost(), 0);
      if (native) assert.equal(h.stored(), "B-refresh");
    });
  }
}
test("late bootstrap failure cannot clear a new authenticated account", async () => {
  const h = harness(),
    response = deferred(),
    entered = deferred();
  h.hooks.set("/auth/refresh-token", () => {
    entered.resolve();
    return response.promise;
  });
  const pending = h.client.restore(),
    rejected = assert.rejects(pending, (e) => e.code === "SESSION_CHANGED");
  await entered.promise;
  await h.client.authenticate("login", { email: "B" });
  response.resolve(json(null, 401));
  await rejected;
  assert.equal((await h.client.request("/auth/me")).idUser, "B");
  assert.equal(h.lost(), 0);
});
test("invalidation while waiting for cross-tab lock sends no refresh or write", async () => {
  const gate = deferred();
  let calls = 0;
  const c = createApiClient({
    baseUrl: "",
    native: false,
    storage: {
      read: async () => null,
      write: async () => {},
      clear: async () => {},
    },
    withRefreshLock: async (work) => {
      await gate.promise;
      return work();
    },
    fetcher: async () => {
      calls++;
      return json(null, 401);
    },
  });
  const pending = c.restore(),
    rejected = assert.rejects(pending, (e) => e.code === "SESSION_CHANGED");
  await c.invalidate();
  gate.resolve();
  await rejected;
  assert.equal(calls, 0);
});

test("late logout cannot clear a newly authenticated account", async () => {
  const h = harness(true), response = deferred(), entered = deferred();
  await h.client.authenticate("login", {email: "A"});
  h.hooks.set("/auth/logout", () => {entered.resolve();return response.promise;});
  const pending = h.client.logout();
  const rejected = assert.rejects(pending, e => e.code === "SESSION_CHANGED");
  await entered.promise;
  await h.client.authenticate("login", {email: "B"});
  response.resolve(json(null));
  await rejected;
  assert.equal((await h.client.request("/auth/me")).idUser, "B");
  assert.equal(h.stored(), "B-refresh");
  assert.equal(h.lost(), 0);
});
