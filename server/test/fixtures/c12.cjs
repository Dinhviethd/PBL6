const { DataSource } = require("typeorm");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { createApplication } = require("../../dist/app");
const { paymentDisplayFromEnv } = require("../../dist/modules/payment/public");

async function c12Fixture(url, port = 0) {
  const parsed = new URL(url);
  if (
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    !parsed.pathname.endsWith("_test")
  ) {
    throw Error("C12 fixtures require a loopback database ending in _test");
  }
  const db = new DataSource({ type: "postgres", url, ssl: false });
  await db.initialize();
  for (const [file, name] of [
    ["InitialMvp1790812800000", "InitialMvp1790812800000"],
    ["EventCheckinStaff1791072000000", "EventCheckinStaff1791072000000"],
    ["Notifications1791331200000", "Notifications1791331200000"],
    ["WaitQueue1792627200000", "WaitQueue1792627200000"],
    [
      "OrganizerApplicationProfile1793437200000",
      "OrganizerApplicationProfile1793437200000",
    ],
  ]) {
    // One fixture schema per fresh test database; caller supplies an isolated DB.
    if (
      file.startsWith("Initial") &&
      (await db.query(`SELECT to_regclass('public.users') AS name`))[0].name
    )
      break;
    await new (require("../../dist/migrations/" + file)[name])().up(db);
  }
  for (const code of ["USER", "ADMIN", "ORGANIZER"]) {
    await db.query(
      `INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING`,
      [randomUUID(), code],
    );
  }
  const suffix = randomUUID().slice(0, 8);
  const password = "C12Fixture2026!";
  const hash = await bcrypt.hash(password, 4);
  const accounts = {};
  async function account(key, roles) {
    const id = randomUUID();
    const email = `${key}.${suffix}@example.test`;
    await db.query(
      `INSERT INTO users("idUser",name,email,password) VALUES($1,$2,$3,$4)`,
      [id, "C12 " + key, email, hash],
    );
    for (const code of roles)
      await db.query(
        `INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2 ON CONFLICT DO NOTHING`,
        [id, code],
      );
    accounts[key] = { id, email, password };
  }
  await account("manager", ["USER", "ADMIN"]);
  const migration =
    new (require("../../dist/migrations/AdminManagement1793812800000").AdminManagement1793812800000)();
  await migration.up(db);
  await account("admin", ["USER", "ADMIN"]);
  await account("customer", ["USER"]);
  await account("candidate", ["USER"]);
  await account("other", ["USER"]);
  const application = createApplication({
    databaseUrl: url,
    databaseSsl: false,
    secret: "c12-fixture-jwt-secret-".repeat(3),
    qrSecret: "c12-fixture-qr-secret-".repeat(3),
    clientUrl: "http://localhost:5183",
    sepay: {
      environment: "test",
      bankCode: "MBBank",
      accountNumber: "123456789",
      accountName: "C12 ISOLATED FIXTURE",
      webhookSecret: "c12-webhook-fixture",
    },
    paymentDisplay: paymentDisplayFromEnv({
      PUBLIC_API_URL: "https://c12.example.test",
      VNPAY_TMN_CODE: "TEST1234",
      VNPAY_HASH_SECRET: "c12-vnpay-fixture-secret",
    }),
  });
  await application.start();
  const server = application.app.listen(port, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const calls = [];
  async function call(method, path, body, token) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const bodyData = await response.json();
    calls.push({
      method,
      path,
      status: response.status,
      code: bodyData.code ?? null,
    });
    return {
      status: response.status,
      body: bodyData,
      headers: response.headers,
    };
  }
  async function login(key) {
    const { email, password } = accounts[key];
    const result = await call("POST", "/auth/login", { email, password });
    if (result.status !== 200) throw Error(JSON.stringify(result.body));
    return result.body.data.accessToken;
  }
  return {
    db,
    accounts,
    base,
    call,
    login,
    async close() {
      if (process.env.C12_API_EVIDENCE) {
        const fs = require("node:fs");
        const path = require("node:path");
        const file = path.resolve(process.env.C12_API_EVIDENCE);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(
          file,
          JSON.stringify(
            { environment: "loopback isolated C12 test database", calls },
            null,
            2,
          ),
        );
      }
      await new Promise((resolve) => server.close(resolve));
      await application.close();
      await db.destroy();
    },
  };
}
module.exports = { c12Fixture };
