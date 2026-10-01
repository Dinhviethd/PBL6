require("dotenv").config({ quiet: true });
const { setTimeout: pause } = require("node:timers/promises");
const { createApplication } = require("../dist/app");
const a = createApplication({
  databaseUrl: process.env.DATABASE_URL,
  secret: process.env.JWT_ACCESS_SECRET,
  qrSecret: process.env.QR_SECRET,
  demo: process.env.PAYMENT_MODE === "demo",
});
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopping = true;
  });
(async () => {
  await a.start();
  try {
    while (!stopping) {
      try {
        const n = await a.booking.expire();
        if (n) console.log(`Released ${n} expired orders`);
      } catch (e) {
        console.error("Expiry job failed:", e.message);
      }
      for (let i = 0; i < 30 && !stopping; i++) await pause(1000);
    }
  } finally {
    await a.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
