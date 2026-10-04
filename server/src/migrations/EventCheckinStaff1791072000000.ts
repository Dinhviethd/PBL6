import { MigrationInterface, QueryRunner } from "typeorm";

// Event owns invitations and event-scoped check-in permissions.
export class EventCheckinStaff1791072000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE event_checkin_staff (
        id uuid PRIMARY KEY,
        event_id uuid NOT NULL REFERENCES events(id),
        user_id uuid NOT NULL REFERENCES users("idUser"),
        invited_by uuid NOT NULL REFERENCES users("idUser"),
        staff_name varchar(150) NOT NULL,
        staff_email varchar(320) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING','ACTIVE','DECLINED','REVOKED')),
        invited_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
        responded_at timestamptz,
        revoked_at timestamptz,
        UNIQUE(event_id, user_id)
      );
      CREATE INDEX event_checkin_staff_user_idx ON event_checkin_staff(user_id, invited_at DESC, id);
    `);
  }
  async down() {
    throw new Error(
      "Staff invitations contain business history. Restore a verified backup instead.",
    );
  }
}
