const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const directory = path.join(root, "mobile/dist");
if (!fs.existsSync(path.join(directory, "index.html")))
  throw new Error("Run npm run export --prefix mobile first.");
const port = process.env.MOBILE_PREVIEW_PORT || "8082";
const child = spawn(process.execPath, ["dist/main.js"], {
  cwd: path.join(root, "server"),
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    PORT: port,
    HOST: "127.0.0.1",
    CLIENT_URL: `http://127.0.0.1:${port}`,
    STATIC_DIR: directory,
  },
});
console.log(`Mobile web preview: http://127.0.0.1:${port}`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
