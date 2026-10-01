const { spawn } = require("node:child_process"),
  path = require("node:path"),
  fs = require("node:fs");
const root = path.resolve(__dirname, "..");
if (!fs.existsSync(path.join(root, "server/dist/main.js"))) {
  console.error("Run npm run build --prefix server first.");
  process.exit(1);
}
const specs = [
  ["server", "dist/main.js"],
  ["server", "scripts/worker.cjs"],
  ["client", "node_modules/vite/bin/vite.js"],
];
const children = specs.map(([dir, script]) =>
  spawn(process.execPath, [script], {
    cwd: path.join(root, dir),
    stdio: "inherit",
    windowsHide: true,
  }),
);
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  children.forEach((c) => c.kill());
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, close);
children.forEach((c) =>
  c.on("exit", (code) => {
    if (!closing) {
      process.exitCode = code ?? 1;
      close();
    }
  }),
);
