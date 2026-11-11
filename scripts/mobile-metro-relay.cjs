// Windows may resolve Expo --localhost to ::1 only, while adb reverse uses IPv4.
// Forward only this local Metro port; raw TCP also preserves Metro WebSockets.
const net = require("node:net");
const server = net.createServer((client) => {
  const upstream = net.connect({ host: "::1", port: 8084 });
  client.on("error", () => upstream.destroy());
  upstream.on("error", () => client.destroy());
  client.on("close", () => upstream.destroy());
  upstream.on("close", () => client.destroy());
  client.pipe(upstream).pipe(client);
});
server.on("error", (error) => {
  console.error("Metro loopback relay:", error.code);
  process.exitCode = 1;
});
server.listen(8084, "127.0.0.1", () =>
  console.log("Metro IPv4 relay: 127.0.0.1:8084 -> [::1]:8084 (loopback only)"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
