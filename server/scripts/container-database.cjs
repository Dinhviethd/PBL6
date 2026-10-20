// Docker supplies env vars before Node starts. Override a host-specific CA path
// with the mounted container path for the API, worker and migration commands.
const fs = require("node:fs");

if (process.env.DB_SSL_CA_FILE) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DB_SSL_CA_FILE is set.");
  }
  fs.accessSync(process.env.DB_SSL_CA_FILE, fs.constants.R_OK);
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.set("sslrootcert", process.env.DB_SSL_CA_FILE);
  process.env.DATABASE_URL = url.toString();
  process.env.DB_SSL = "true";
}
