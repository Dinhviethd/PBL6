import { MigrationInterface, QueryRunner } from "typeorm";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
export class InitialMvp1790812800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    const existing = await queryRunner.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users','orders','events')",
    );
    if (existing.length)
      throw new Error(
        "Existing application tables detected. Review and baseline the existing database before applying the initial MVP migration. No data has been reset.",
      );
    const copied = path.join(__dirname, "schema.sql");
    const sql = readFileSync(
      existsSync(copied)
        ? copied
        : path.resolve(__dirname, "../../../docs/database/mvp-schema.sql"),
      "utf8",
    )
      .replace(/^BEGIN;\s*$/m, "")
      .replace(/^COMMIT;\s*$/m, "");
    await queryRunner.query(sql);
  }
  async down() {
    throw new Error(
      "MVP baseline rollback would destroy business data. Restore a verified backup instead.",
    );
  }
}
