import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";

export function waitQueueStore(db: Store) {
  return {
    waitActive: async (user: string, type: string) =>
      (
        await db.query(
          "SELECT * FROM wait_queue WHERE user_id=$1 AND ticket_type_id=$2 AND status IN ('WAITING','OFFERED')",
          [user, type],
        )
      )[0],
    waitOne: async (id: string) =>
      (await db.query("SELECT * FROM wait_queue WHERE id=$1", [id]))[0],
    waitHead: async (type: string) =>
      (
        await db.query(
          "SELECT * FROM wait_queue WHERE ticket_type_id=$1 AND status='WAITING' ORDER BY sequence_no LIMIT 1",
          [type],
        )
      )[0],
    waitJoin: async (user: string, event: Row, type: Row) =>
      (
        await db.query(
          "INSERT INTO wait_queue(id,user_id,event_id,ticket_type_id,event_title,type_name) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
          [randomUUID(), user, event.id, type.id, event.title, type.name],
        )
      )[0],
    waitList: (user: string, offset: number) =>
      db.query(
        `SELECT w.*,o.expires_at,o.status AS order_status,
        (SELECT count(*) FROM wait_queue a WHERE a.ticket_type_id=w.ticket_type_id AND a.status='WAITING' AND a.sequence_no<=w.sequence_no) AS position
       FROM wait_queue w LEFT JOIN orders o ON o.id=w.order_id WHERE w.user_id=$1
       ORDER BY w.sequence_no DESC LIMIT 50 OFFSET $2`,
        [user, offset],
      ),
    waitEvents: (after: string | null) =>
      db.query(
        "SELECT DISTINCT event_id FROM wait_queue WHERE status='WAITING' AND ($1::uuid IS NULL OR event_id>$1) ORDER BY event_id LIMIT 100",
        [after],
      ),
    waitTypes: (event: string) =>
      db.query(
        "SELECT DISTINCT ticket_type_id FROM wait_queue WHERE event_id=$1 AND status='WAITING' ORDER BY ticket_type_id",
        [event],
      ),
    waitCloseType: (type: string) =>
      db.query(
        "UPDATE wait_queue SET status='CANCELLED',updated_at=now() WHERE ticket_type_id=$1 AND status='WAITING'",
        [type],
      ),
    waitCancel: (id: string) =>
      db.query(
        "UPDATE wait_queue SET status='CANCELLED',updated_at=now() WHERE id=$1 AND status='WAITING'",
        [id],
      ),
    waitOffer: (id: string, order: string) =>
      db.query(
        "UPDATE wait_queue SET status='OFFERED',order_id=$2,updated_at=now() WHERE id=$1 AND status='WAITING'",
        [id, order],
      ),
    waitFinish: (order: string, status: string) =>
      db.query(
        "UPDATE wait_queue SET status=$2,updated_at=now() WHERE order_id=$1 AND status='OFFERED'",
        [order, status],
      ),
  };
}
