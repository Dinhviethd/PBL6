import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { InitialMvp1790812800000 } from "../migrations/InitialMvp1790812800000";
import { EventCheckinStaff1791072000000 } from "../migrations/EventCheckinStaff1791072000000";
// CLI-only migration connection. Runtime modules receive owner-scoped stores instead.
export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
  synchronize: false,
  migrations: [InitialMvp1790812800000, EventCheckinStaff1791072000000],
});
