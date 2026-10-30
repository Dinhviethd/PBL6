import "dotenv/config";
import { createApplication } from "./app";
import { loadRuntimeConfig } from "./configs/sepay-runtime";
async function main() {
  const app = createApplication(loadRuntimeConfig().app);
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
  console.error("Startup failed:", e.code ?? e.name);
  process.exit(1);
});
