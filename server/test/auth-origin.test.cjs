const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createApplication } = require("../dist/app");

test("web refresh accepts only the configured origin and distinguishes missing cookies", async (t) => {
  const app = createApplication({
    databaseUrl: "postgres://eventhub:eventhub@127.0.0.1/eventhub_test",
    secret: "integration-secret-".repeat(3),
    qrSecret: "integration-qr-secret-".repeat(3),
    clientUrl: "http://localhost:5173",
  });
  const server = app.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  ));
  const base = `http://127.0.0.1:${server.address().port}/api/auth/refresh-token`;

  const accepted = await fetch(base, {
    method: "POST",
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(accepted.status, 401);
  assert.equal((await accepted.json()).code, "UNAUTHORIZED");
  assert.equal(
    accepted.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  assert.equal(accepted.headers.get("access-control-allow-credentials"), "true");

  const rejected = await fetch(base, {
    method: "POST",
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  assert.equal(rejected.status, 403);
  assert.equal((await rejected.json()).code, "ORIGIN");
  assert.equal(
    rejected.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  assert.notEqual(
    rejected.headers.get("access-control-allow-origin"),
    "http://127.0.0.1:5173",
  );
});
