import { MigrationInterface, QueryRunner } from "typeorm";

export class WaitQueue1792627200000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE wait_queue (
        id uuid PRIMARY KEY,
        sequence_no bigserial NOT NULL UNIQUE,
        user_id uuid NOT NULL REFERENCES users("idUser"),
        event_id uuid NOT NULL REFERENCES events(id),
        ticket_type_id uuid NOT NULL REFERENCES ticket_types(id),
        event_title varchar(200) NOT NULL,
        type_name varchar(200) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'WAITING'
          CHECK(status IN ('WAITING','OFFERED','COMPLETED','EXPIRED','CANCELLED')),
        order_id uuid UNIQUE REFERENCES orders(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK((status IN ('OFFERED','COMPLETED','EXPIRED')) = (order_id IS NOT NULL) OR status='CANCELLED')
      );
      CREATE UNIQUE INDEX wait_queue_active_user_type ON wait_queue(user_id,ticket_type_id)
        WHERE status IN ('WAITING','OFFERED');
      CREATE INDEX wait_queue_fifo ON wait_queue(ticket_type_id,sequence_no) WHERE status='WAITING';
      CREATE INDEX wait_queue_user ON wait_queue(user_id,sequence_no DESC);
      ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
      ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
        CHECK(kind IN ('ORDER_PAID','STAFF_INVITED','EVENT_UPDATED','EVENT_REMINDER','WAIT_QUEUE_OFFER'));
    `);
  }
  async down() {
    throw new Error(
      "Wait queue contains order history. Restore a verified backup instead.",
    );
  }
}
