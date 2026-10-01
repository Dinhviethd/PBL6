require("dotenv").config({ quiet: true });
const { createApplication } = require("../dist/app");
const a = createApplication({
  databaseUrl: process.env.DATABASE_URL,
  secret: process.env.JWT_ACCESS_SECRET,
  qrSecret: process.env.QR_SECRET,
  demo: process.env.PAYMENT_MODE === "demo",
});
(async () => {
  await a.start();
  try {
    console.log("Expired orders:", await a.booking.expire());
  } finally {
    await a.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
