import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/lib/api-client.ts";
const json = (data, status = 200) =>
  new Response(
    JSON.stringify(
      status === 200
        ? { success: true, data }
        : { success: false, message: "expired", code: "INVALID_SESSION" },
    ),
    { status },
  );
function memory() {
  let value = null;
  return {
    read: async () => value,
    write: async (v) => {
      value = v;
    },
    clear: async () => {
      value = null;
    },
  };
}
test("native refresh is single-flight, stores rotated token, preserves booking idempotency", async () => {
  const storage = memory(),
    requests = [];
  let refreshes = 0;
  const client = createApiClient({
    baseUrl: "https://example.test/api",
    native: true,
    storage,
    fetcher: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith("/login"))
        return json({
          user: { idUser: "u" },
          accessToken: "old",
          refreshToken: "r1",
        });
      if (url.endsWith("/refresh-token")) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 15));
        return json({ accessToken: "new", refreshToken: "r2" });
      }
      return options.headers.Authorization === "Bearer new"
        ? json({ id: "order" })
        : json(null, 401);
    },
  });
  await client.authenticate("login", { email: "x", password: "y" });
  const [a, b] = await Promise.all([
    client.request(
      "/orders",
      "POST",
      { items: [] },
      { "Idempotency-Key": "same-key" },
    ),
    client.request("/me/tickets"),
  ]);
  assert.equal(a.id, "order");
  assert.equal(b.id, "order");
  assert.equal(refreshes, 1);
  assert.equal(await storage.read(), "r2");
  assert.deepEqual(
    requests
      .filter((r) => r.url.endsWith("/orders"))
      .map((r) => r.options.headers["Idempotency-Key"]),
    ["same-key", "same-key"],
  );
  assert.ok(requests.every((r) => r.options.credentials === "omit"));
});
test("rejected refresh clears native storage and signals session loss", async () => {
  const storage = memory();
  await storage.write("stale");
  let lost = 0;
  const client = createApiClient({
    baseUrl: "",
    native: true,
    storage,
    onSessionLost: () => lost++,
    fetcher: async () => json(null, 401),
  });
  assert.equal(await client.restore(), null);
  assert.equal(await storage.read(), null);
  assert.equal(lost, 1);
});
test("network failure during restore preserves the saved token for retry", async () => {
  const storage = memory();
  await storage.write("valid");
  const client = createApiClient({
    baseUrl: "",
    native: true,
    storage,
    fetcher: async () => {
      throw Error("offline");
    },
  });
  await assert.rejects(client.restore(), /Không kết nối/);
  assert.equal(await storage.read(), "valid");
});
test("web uses cookie auth and never stores refresh tokens", async () => {
  const requests = [],
    storage = {
      read: async () => {
        throw Error("unexpected read");
      },
      write: async () => {
        throw Error("unexpected write");
      },
      clear: async () => {},
    };
  const client = createApiClient({
    baseUrl: "/api",
    native: false,
    storage,
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return json(
        url.endsWith("/auth/me")
          ? { idUser: "u" }
          : { user: { idUser: "u" }, accessToken: "access" },
      );
    },
  });
  await client.authenticate("login", {});
  await client.restore();
  assert.ok(
    requests.every(
      (r) => !r.url.includes("/mobile/") && r.options.credentials === "include",
    ),
  );
});
test("forbidden event permission does not log out an otherwise valid account", async () => {
  let lost = false;
  const client = createApiClient({
    baseUrl: "",
    native: true,
    storage: memory(),
    onSessionLost: () => {
      lost = true;
    },
    fetcher: async () =>
      new Response(
        JSON.stringify({
          success: false,
          code: "FORBIDDEN",
          message: "revoked",
        }),
        { status: 403 },
      ),
  });
  await assert.rejects(
    client.request("/checkin/events/event/checkins", "POST", {
      code: "ticket",
    }),
    /revoked/,
  );
  assert.equal(lost, false);
});

for (const [status, code, shouldClear] of [
  [403, "FORBIDDEN", false],
  [403, "ACCOUNT_DISABLED", true],
  [401, "INVALID_SESSION", true],
]) {
  test(`after refresh, ${code} ${shouldClear ? "clears" : "preserves"} the session`, async () => {
    const storage = memory();
    let lost = 0;
    const client = createApiClient({
      baseUrl: "",
      native: true,
      storage,
      onSessionLost: () => lost++,
      fetcher: async (url, options) => {
        if (url.endsWith("/login"))
          return json({
            user: { idUser: "u" },
            accessToken: "old",
            refreshToken: "r1",
          });
        if (url.endsWith("/refresh-token"))
          return json({ accessToken: "new", refreshToken: "r2" });
        if (options.headers.Authorization === "Bearer old")
          return json(null, 401);
        if (url === "/me/tickets") return json([{ id: "owned-ticket" }]);
        return new Response(
          JSON.stringify({ success: false, message: code, code }),
          { status },
        );
      },
    });
    await client.authenticate("login", {});
    await assert.rejects(
      client.request("/checkin/events/event/checkins", "POST", {
        code: "ticket",
      }),
      (e) => e.status === status && e.code === code,
    );
    assert.equal(lost, shouldClear ? 1 : 0);
    assert.equal(await storage.read(), shouldClear ? null : "r2");
    if (!shouldClear)
      assert.deepEqual(await client.request("/me/tickets"), [
        { id: "owned-ticket" },
      ]);
  });
}
