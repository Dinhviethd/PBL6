import { MigrationInterface, QueryRunner } from "typeorm";

export class Notifications1791331200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE notifications (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users("idUser"),
        kind varchar(32) NOT NULL CHECK (kind IN ('ORDER_PAID','STAFF_INVITED','EVENT_UPDATED','EVENT_REMINDER')),
        title varchar(200) NOT NULL,
        message text NOT NULL,
        target varchar(16) NOT NULL CHECK (target IN ('ORDER','TICKETS','STAFF')),
        target_id uuid NOT NULL,
        dedupe_key varchar(200) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        read_at timestamptz,
        UNIQUE(user_id, dedupe_key)
      );
      CREATE INDEX notifications_inbox_idx ON notifications(user_id, created_at DESC, id DESC);
      CREATE INDEX notifications_unread_idx ON notifications(user_id) WHERE read_at IS NULL;
    `);
  }
  async down() {
    throw new Error(
      "Notifications contain user history. Restore a verified backup instead.",
    );
  }
}
