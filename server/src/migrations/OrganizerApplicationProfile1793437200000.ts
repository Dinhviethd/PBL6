import type { MigrationInterface, QueryRunner } from "typeorm";

/** Two approved additions to the existing Auth-owned table; no new tables/backfill. */
export class OrganizerApplicationProfile1793437200000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organizer_applications
      ADD COLUMN logo_url text,
      ADD COLUMN pending_legal_changes jsonb`);
  }
  async down() {
    throw new Error(
      "Application/profile history must be preserved; restore a verified backup instead.",
    );
  }
}
