// Targeted release runner: loads only the reviewed two-column B11 migration.
const { DataSource } = require("typeorm");
const { createHash } = require("node:crypto");
const { OrganizerApplicationProfile1793437200000 } = require("../dist/migrations/OrganizerApplicationProfile1793437200000");
const migrationName = "OrganizerApplicationProfile1793437200000";
const args = process.argv.slice(2);
const expectedHost = args.find((arg) => arg.startsWith("--expect-host="))?.slice(14);
const apply = args.includes("--apply-b11");
async function applicationFingerprint(db) {
  const rows = await db.query("SELECT * FROM organizer_applications ORDER BY id");
  for (const row of rows) { delete row.logo_url; delete row.pending_legal_changes; }
  return { count: rows.length, sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
}
(async () => {
  if (!process.env.DATABASE_URL || !expectedHost) throw Error("DATABASE_URL and explicit --expect-host are required.");
  const target = new URL(process.env.DATABASE_URL);
  if (target.hostname !== expectedHost) throw Error("Database host differs from the reviewed target.");
  const db = new DataSource({ type: "postgres", url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
    synchronize: false, migrationsRun: false, migrationsTransactionMode: "all",
    migrations: [OrganizerApplicationProfile1793437200000],
    extra: { statement_timeout: 30000, lock_timeout: 10000 },
  });
  await db.initialize();
  try {
    const migrations = await db.query("SELECT name FROM migrations");
    if (!migrations.some((row) => row.name === "InitialMvp1790812800000")) throw Error("Initial MVP schema is required.");
    const columns = await db.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=ANY($3::text[]) ORDER BY column_name",
      ["public", "organizer_applications", ["logo_url", "pending_legal_changes"]]);
    const recorded = migrations.some((row) => row.name === migrationName);
    if (recorded ? columns.length !== 2 : columns.length !== 0) throw Error("Migration history and two-column schema are inconsistent; stop for inspection.");
    const before = await applicationFingerprint(db);
    console.log(JSON.stringify({ stage: "preflight", mode: apply ? "apply" : "read-only", host: target.hostname, database: target.pathname,
      migrationName, recorded, columns, existingApplications: before }));
    if (apply) {
      const applied = (await db.runMigrations({ transaction: "all" })).map((m) => m.name);
      const after = await applicationFingerprint(db);
      if (JSON.stringify(before) !== JSON.stringify(after)) throw Error("Existing application data changed during migration; investigate before rollout.");
      const finalColumns = await db.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=ANY($3::text[]) ORDER BY column_name",
        ["public", "organizer_applications", ["logo_url", "pending_legal_changes"]]);
      console.log(JSON.stringify({ stage: "verified", applied, columns: finalColumns, existingApplications: after, existingApplicationDataUnchanged: true }));
    }
  } finally { await db.destroy(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
