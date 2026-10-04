require("dotenv").config({ quiet: true });
require("reflect-metadata");
const { DataSource } = require("typeorm");
const {
  InitialMvp1790812800000,
} = require("../dist/migrations/InitialMvp1790812800000");
const db = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
  migrations: [
    InitialMvp1790812800000,
    require("../dist/migrations/EventCheckinStaff1791072000000")
      .EventCheckinStaff1791072000000,
  ],
  synchronize: false,
});
(async () => {
  await db.initialize();
  try {
    console.log(
      "Applied migrations:",
      (await db.runMigrations()).map((m) => m.name),
    );
  } finally {
    await db.destroy();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
