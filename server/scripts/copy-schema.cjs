const fs = require("node:fs");
const path = require("node:path");
const target = path.resolve(__dirname, "../dist/migrations");
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(
  path.resolve(__dirname, "../../docs/database/mvp-schema.sql"),
  path.join(target, "schema.sql"),
);
