const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const root = path.resolve(__dirname, "..");
const addresses = Object.entries(os.networkInterfaces()).flatMap(
  ([name, entries]) =>
    (entries ?? [])
      .filter((e) => !e.internal && e.family === "IPv4")
      .map((e) => ({ name, address: e.address })),
);
const lan =
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME ||
  addresses.find((e) => /wi-?fi|wlan/i.test(e.name))?.address ||
  addresses.find((e) => !/virtual|vmware|vethernet|vpn|wsl/i.test(e.name))
    ?.address;
if (!fs.existsSync(path.join(root, "server/dist/main.js"))) {
  throw new Error("Run npm run build --prefix server first.");
}
const children = [
  spawn(process.execPath, ["dist/main.js"], {
    cwd: path.join(root, "server"),
    env: { ...process.env, HOST: "0.0.0.0" },
    stdio: "inherit",
    windowsHide: true,
  }),
  spawn(process.execPath, ["scripts/worker.cjs"], {
    cwd: path.join(root, "server"),
    stdio: "inherit",
    windowsHide: true,
  }),
  spawn(
    process.execPath,
    ["node_modules/expo/bin/cli", "start", "--go", "--lan"],
    {
      cwd: path.join(root, "mobile"),
      env: {
        ...process.env,
        APP_VARIANT: "development",
        ...(lan ? { REACT_NATIVE_PACKAGER_HOSTNAME: lan } : {}),
      },
      stdio: "inherit",
      windowsHide: true,
    },
  ),
];
if (lan) {
  console.log(`Phone API: http://${lan}:8000/api`);
  console.log(`Expo Go: exp://${lan}:8081`);
}
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  children.forEach((child) => child.kill());
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, close);
children.forEach((child) =>
  child.on("exit", (code) => {
    if (!closing) {
      process.exitCode = code ?? 1;
      close();
    }
  }),
);
