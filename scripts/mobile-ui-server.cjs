// Static-only Expo preview for mocked UI tests. Never connects to a database.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../mobile/dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (pathname.startsWith("/api/") || (process.argv.includes("--live-test-api") && pathname.startsWith("/uploads/"))) {
      if (process.argv.includes("--live-test-api")) {
        // Fixed loopback target: never proxy tests to a configured Live API.
        const port = process.argv.includes("--sepay") ? 8016 : 8015;
        const upstream = http.request({ hostname: "127.0.0.1", port, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } }, incoming => {
          res.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(res);
        });
        upstream.on("error", () => res.writeHead(502).end("Local migration API unavailable"));
        req.pipe(upstream); return;
      }
      res.writeHead(503).end("UI tests must mock API requests");
      return;
    }
    const target =
      fs.existsSync(file) && fs.statSync(file).isFile()
        ? file
        : path.join(root, "index.html");
    if (!fs.existsSync(target)) {
      res.writeHead(503).end("Export mobile before running UI tests");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(target).pipe(res);
  })
  .listen(8083, "127.0.0.1", () =>
    console.log("Mobile UI preview: http://127.0.0.1:8083"),
  );
