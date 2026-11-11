// Explicit remote API; does not start a local backend or load server secrets.
const { spawn } = require("node:child_process");
const path = require("node:path");
const cwd = path.resolve(__dirname, "../mobile");
console.log("EventHub API: https://eventhubqrmarketing.tech/api");
const child = spawn(process.execPath, [path.join(cwd, "node_modules/expo/bin/cli"), "start", "--dev-client", "--localhost", "--port", "8084", "--clear"], {
  cwd, stdio: "inherit", windowsHide: true,
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --dns-result-order=ipv4first`.trim(), EXPO_PUBLIC_API_URL: "https://eventhubqrmarketing.tech/api", APP_VARIANT: "development" },
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill());
