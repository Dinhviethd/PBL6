// Run after building server/client and exporting mobile with EXPO_PUBLIC_API_URL=/api.
const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const { DataSource } = require("../server/node_modules/typeorm");
const { createApplication } = require("../server/dist/app");
const root = path.resolve(__dirname, "..");
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw Error("Set TEST_DATABASE_URL to an isolated database ending in _test.");
const output = path.join(root, ".local/wait-queue-e2e");
fs.mkdirSync(output, { recursive: true });
const run = (config, fixture) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(root, "client/node_modules/@playwright/test/cli.js"),
        "test",
        "-c",
        config,
      ],
      {
        cwd: path.join(root, "client"),
        windowsHide: true,
        stdio: "inherit",
        env: { ...process.env, WAIT_QUEUE_FIXTURE: JSON.stringify(fixture) },
      },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`Playwright exit ${code}`)),
    );
  });
(async () => {
  const db = new DataSource({
    type: "postgres",
    url,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
    migrations: [
      "InitialMvp1790812800000",
      "EventCheckinStaff1791072000000",
      "Notifications1791331200000",
      "WaitQueue1792627200000",
    ].map((name) => require(`../server/dist/migrations/${name}`)[name]),
  });
  await db.initialize();
  try {
    await db.runMigrations();
    for (const code of ["USER", "ADMIN", "ORGANIZER"])
      await db.query(
        'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
        [randomUUID(), code],
      );
    for (const [folder, port, tests] of [
      ["client", 18826, "tests"],
      ["mobile", 18827, "tests-mobile"],
    ]) {
      process.env.STATIC_DIR = path.join(root, folder, "dist");
      process.env.UPLOAD_DIR = path.join(output, "uploads");
      const app = createApplication({
        databaseUrl: url,
        secret: randomUUID().repeat(2),
        qrSecret: randomUUID().repeat(2),
        demo: true,
        clientUrl: `http://127.0.0.1:${port}`,
      });
      await app.start();
      let server, timer, running;
      try {
        const account = async (role) => {
          const session = await app.auth.register({
            name: role,
            email: `${randomUUID()}@example.test`,
            password: "QueueFixture2026!",
          });
          await db.query(
            'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2 ON CONFLICT DO NOTHING',
            [session.user.idUser, role],
          );
          return { ...session, p: await app.auth.resolve(session.accessToken) };
        };
        const organizer = await account("ORGANIZER"),
          admin = await account("ADMIN"),
          holder = await account("USER");
        const category = (
          await app.events.saveCategory({
            name: "Queue browser",
            slug: randomUUID(),
          })
        )[0];
        const end = new Date(Date.now() + 86400000).toISOString();
        const event = await app.booking.saveEvent(organizer.p, {
          categoryId: category.id,
          slug: randomUUID(),
          title: "Queue browser event",
          description: "Wait queue end-to-end",
          venueName: "Hall",
          address: "Da Nang",
          cityCode: "DN",
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: end,
          checkinOpensAt: new Date().toISOString(),
          checkinClosesAt: end,
        });
        const type = await app.booking.configureType(organizer.p, event.id, {
          name: "Standard",
          price: "100000",
          capacity: 1,
          saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
          saleEndsAt: end,
        });
        await app.booking.submit(organizer.p, event.id);
        await app.booking.review(admin.p, event.id, true, "");
        const held = await app.booking.createOrder(
          holder.p,
          event.id,
          [{ ticketTypeId: type.id, quantity: 1 }],
          randomUUID(),
        );
        server = app.app.listen(port, "127.0.0.1");
        await new Promise((resolve) => server.on("listening", resolve));
        timer = setInterval(() => {
          if (!running)
            running = app.waitQueue
              .process()
              .catch((e) => {
                console.error(e.message);
                process.exitCode = 1;
              })
              .finally(() => {
                running = null;
              });
        }, 200);
        const config = path.join(output, `${folder}.config.cjs`);
        fs.writeFileSync(
          config,
          `module.exports={testDir:${JSON.stringify(path.join(root, "client", tests))},testMatch:['wait-queue.spec.ts'],workers:1,timeout:30000,outputDir:${JSON.stringify(path.join(output, folder))},use:{baseURL:'http://127.0.0.1:${port}',headless:true},reporter:'list'};`,
        );
        await run(config, {
          slug: event.slug,
          orderId: held.id,
          holderToken: holder.accessToken,
        });
      } finally {
        clearInterval(timer);
        if (running) await running;
        if (server) await new Promise((resolve) => server.close(resolve));
        await app.close();
      }
    }
  } finally {
    await db.destroy();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
