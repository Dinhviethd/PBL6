// Dedicated synthetic environment for mobile migration QA. Never loads dotenv.
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const dir = path.join(root, ".local", "mobile-migration");
const name = "eventhub-mobile-migration-test";
const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
async function main() {
  fs.mkdirSync(dir, { recursive: true });
  const configFile = path.join(dir, "runtime.json");
  let config;
  if (fs.existsSync(configFile))
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  else {
    const names = docker(["ps", "-a", "--format", "{{.Names}}"])
      .trim()
      .split(/\r?\n/);
    if (names.includes(name)) throw Error("Unmanaged test container exists");
    config = {
      password: randomBytes(24).toString("hex"),
      jwt: randomBytes(32).toString("hex"),
      qr: randomBytes(32).toString("hex"),
    };
    fs.writeFileSync(configFile, JSON.stringify(config), {
      flag: "wx",
      mode: 0o600,
    });
  }
  const names = docker(["ps", "-a", "--format", "{{.Names}}"])
    .trim()
    .split(/\r?\n/);
  if (!names.includes(name))
    docker([
      "run",
      "-d",
      "--name",
      name,
      "--label",
      "eventhub.purpose=mobile-migration-test",
      "-p",
      "127.0.0.1:55433:5432",
      "-e",
      "POSTGRES_DB=eventhub_mobile_test",
      "-e",
      "POSTGRES_USER=mobile_test",
      "-e",
      `POSTGRES_PASSWORD=${config.password}`,
      "postgres:16-alpine",
    ]);
  const inspect = JSON.parse(docker(["inspect", name]))[0];
  const binding = inspect.HostConfig.PortBindings["5432/tcp"];
  if (
    inspect.Config.Labels["eventhub.purpose"] !== "mobile-migration-test" ||
    inspect.Config.Image !== "postgres:16-alpine" ||
    binding.length !== 1 ||
    binding[0].HostIp !== "127.0.0.1" ||
    binding[0].HostPort !== "55433" ||
    !inspect.Config.Env.includes(`POSTGRES_PASSWORD=${config.password}`)
  )
    throw Error("Test container identity mismatch");
  if (!inspect.State.Running) docker(["start", name]);
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      docker([
        "exec",
        name,
        "pg_isready",
        "-U",
        "mobile_test",
        "-d",
        "eventhub_mobile_test",
      ]);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!ready) throw Error("Test database not ready");
  const url = `postgresql://mobile_test:${config.password}@127.0.0.1:55433/eventhub_mobile_test`;
  for (const key of Object.keys(process.env))
    if (
      ![
        "PATH",
        "SystemRoot",
        "SYSTEMROOT",
        "TEMP",
        "TMP",
        "APPDATA",
        "LOCALAPPDATA",
      ].includes(key)
    )
      delete process.env[key];
  process.env.NODE_ENV = "test";
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = "1026";
  process.env.SMTP_FROM = "eventhub@example.test";
  const { DataSource } = require("../server/node_modules/typeorm");
  // Live-only SePay migration intentionally excludes the local foundation.
  const migrations = fs
    .readdirSync(path.join(root, "server/dist/migrations"))
    .filter(
      (n) => /\d{13}\.js$/.test(n) && !n.startsWith("SepayLiveFoundation"),
    )
    .map(
      (file) => require(`../server/dist/migrations/${file}`)[file.slice(0, -3)],
    );
  const db = new DataSource({
    type: "postgres",
    url,
    ssl: false,
    synchronize: false,
    migrations,
  });
  await db.initialize();
  await db.runMigrations();
  for (const role of ["USER", "ORGANIZER", "ADMIN"])
    await db.query(
      'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
      [require("node:crypto").randomUUID(), role],
    );
  await db.destroy();
  if (process.argv[2] === "verify") {
    console.log(
      "PASS isolated mobile database: loopback:55433/eventhub_mobile_test; migrations applied.",
    );
    return;
  }
  // Use a real local SMTP sink; no email leaves the test environment.
  const mailName = `${name}-mail`;
  const certFile = path.join(dir, "cert.pem"),
    keyFile = path.join(dir, "key.pem");
  if (!fs.existsSync(certFile)) {
    const forge = require("../server/node_modules/node-forge");
    const keys = forge.pki.rsa.generateKeyPair(2048),
      cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = randomBytes(16).toString("hex");
    cert.validity.notBefore = new Date(Date.now() - 60000);
    cert.validity.notAfter = new Date(Date.now() + 30 * 86400000);
    cert.setSubject([{ name: "commonName", value: "localhost" }]);
    cert.setIssuer(cert.subject.attributes);
    cert.setExtensions([
      { name: "basicConstraints", cA: true },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    fs.writeFileSync(certFile, forge.pki.certificateToPem(cert));
    fs.writeFileSync(keyFile, forge.pki.privateKeyToPem(keys.privateKey), {
      mode: 0o600,
    });
  }
  const tls = require("node:tls");
  tls.setDefaultCACertificates([
    ...tls.getCACertificates("default"),
    fs.readFileSync(certFile, "utf8"),
  ]);
  if (!names.includes(mailName))
    docker([
      "run",
      "-d",
      "--name",
      mailName,
      "--label",
      "eventhub.purpose=mobile-migration-test",
      "-p",
      "127.0.0.1:1026:1025",
      "-p",
      "127.0.0.1:8026:8025",
      "-v",
      `${dir}:/tls:ro`,
      "-e",
      "MP_SMTP_TLS_CERT=/tls/cert.pem",
      "-e",
      "MP_SMTP_TLS_KEY=/tls/key.pem",
      "axllent/mailpit:v1.27",
    ]);
  else docker(["start", mailName]);
  const { createApplication } = require("../server/dist/app");
  const sepay = process.argv.includes("--sepay");
  const app = createApplication({
    databaseUrl: url,
    secret: config.jwt,
    qrSecret: config.qr,
    clientUrl: "http://127.0.0.1:8083",
    clientOrigins: ["http://localhost:8083"],
    ...(sepay
      ? {
          sepay: {
            environment: "test",
            bankCode: "MBBank",
            accountNumber: "MOBILEQA001",
            accountName: "SYNTHETIC MOBILE QA",
            webhookSecret: config.jwt,
          },
        }
      : { demo: true }),
  });
  await app.start();
  let processing = false;
  const worker = sepay
    ? setInterval(async () => {
        if (processing) return;
        processing = true;
        try {
          await app.sepayWebhook.processBatch(10);
        } catch {
          console.error("Synthetic payment worker failed; retrying.");
        } finally {
          processing = false;
        }
      }, 1000)
    : null;
  const port = sepay ? 8016 : 8015;
  const server = app.app.listen(port, "127.0.0.1", () =>
    console.log(
      `Mobile test API http://127.0.0.1:${port}/api; local mailbox http://127.0.0.1:8026. Synthetic database only.`,
    ),
  );
  server.on("error", async () => {
    clearInterval(worker);
    await app.close();
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      clearInterval(worker);
      server.close(async () => {
        await app.close();
        process.exit(0);
      });
    });
}
main().catch((e) => {
  console.error(
    "Mobile test runtime failed:",
    e.code || e.name,
    "(credentials suppressed)",
  );
  process.exitCode = 1;
});
