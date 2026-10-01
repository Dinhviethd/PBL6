import "dotenv/config";
import { createApplication } from "./app";
async function main() {
  const app = createApplication({
    databaseUrl: process.env.DATABASE_URL ?? "",
    secret: process.env.JWT_ACCESS_SECRET ?? "",
    qrSecret: process.env.QR_SECRET ?? "",
    demo: process.env.PAYMENT_MODE === "demo",
    clientUrl: process.env.CLIENT_URL,
  });
  await app.start();
  const server = app.app.listen(
    Number(process.env.PORT ?? 8000),
    process.env.HOST ?? "127.0.0.1",
    () => console.log("EventHub API ready"),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      server.close(() => void app.close().then(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    });
}
void main().catch((e) => {
  console.error("Startup failed:", e.message);
  process.exit(1);
});
