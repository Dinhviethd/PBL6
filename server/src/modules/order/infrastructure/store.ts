import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
export function orderStore(db: Store) {
  return {
    types: (event: string) =>
      db.query(
        "SELECT * FROM ticket_types WHERE event_id=$1 ORDER BY price_amount,id",
        [event],
      ),
    offerings: (ids: string[]) =>
      db.query(
        "SELECT * FROM ticket_types WHERE event_id=ANY($1::uuid[]) AND archived_at IS NULL ORDER BY price_amount,id",
        [ids],
      ),
    matchingEvents: (min: string, max: string) =>
      db.query(
        "SELECT DISTINCT event_id FROM ticket_types WHERE archived_at IS NULL AND price_amount >= $1::bigint AND price_amount <= $2::bigint",
        [min, max],
      ),
    type: async (id: string, lock = false) =>
      (
        await db.query(
          `SELECT * FROM ticket_types WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
          [id],
        )
      )[0],
    saveType: (event: string, d: Row, id?: string) =>
      id
        ? db.query(
            "UPDATE ticket_types SET name=$3,description=$4,price_amount=$5,capacity=$6,sale_starts_at=$7,sale_ends_at=$8,updated_at=now() WHERE id=$1 AND event_id=$2 RETURNING *",
            [
              id,
              event,
              d.name,
              d.description ?? null,
              d.price,
              d.capacity,
              d.saleStartsAt,
              d.saleEndsAt,
            ],
          )
        : db.query(
            "INSERT INTO ticket_types(id,event_id,name,description,price_amount,capacity,sale_starts_at,sale_ends_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
            [
              randomUUID(),
              event,
              d.name,
              d.description ?? null,
              d.price,
              d.capacity,
              d.saleStartsAt,
              d.saleEndsAt,
            ],
          ),
    archiveType: (id: string) =>
      db.query("UPDATE ticket_types SET archived_at=now() WHERE id=$1", [id]),
    inventory: (id: string, reserved: number, sold: number) =>
      db.query(
        "UPDATE ticket_types SET reserved_quantity=reserved_quantity+$2,sold_quantity=sold_quantity+$3,updated_at=now() WHERE id=$1",
        [id, reserved, sold],
      ),
    byKey: async (user: string, key: string) =>
      (
        await db.query(
          "SELECT * FROM orders WHERE buyer_id=$1 AND idempotency_key=$2",
          [user, key],
        )
      )[0],
    one: async (id: string, lock = false) =>
      (
        await db.query(
          `SELECT * FROM orders WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
          [id],
        )
      )[0],
    items: (id: string) =>
      db.query(
        "SELECT * FROM order_items WHERE order_id=$1 ORDER BY ticket_type_id",
        [id],
      ),
    create: async (d: Row) =>
      (
        await db.query(
          "INSERT INTO orders(id,order_code,buyer_id,event_id,total_quantity,total_amount,buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
          [
            d.id,
            d.code,
            d.user,
            d.event,
            d.quantity,
            d.total,
            d.name,
            d.email,
            d.title,
            d.key,
            d.hash,
            d.expires,
          ],
        )
      )[0],
    addItem: async (d: Row) => {
      await db.query(
        "INSERT INTO order_items(id,order_id,event_id,ticket_type_id,ticket_type_name_snapshot,unit_price,quantity) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [d.id, d.order, d.event, d.type, d.name, d.price, d.quantity],
      );
      await db.query(
        "INSERT INTO reservations(order_item_id,release_after) VALUES($1,$2)",
        [d.id, d.expires],
      );
    },
    reservations: (id: string) =>
      db.query(
        "SELECT r.*,i.quantity,i.ticket_type_id FROM reservations r JOIN order_items i ON i.id=r.order_item_id WHERE i.order_id=$1 ORDER BY i.ticket_type_id FOR UPDATE",
        [id],
      ),
    reserveState: (id: string, status: string) =>
      db.query(
        "UPDATE reservations SET status=$2::varchar,consumed_at=CASE WHEN $2='CONSUMED' THEN now() ELSE NULL END,released_at=CASE WHEN $2='RELEASED' THEN now() ELSE NULL END WHERE order_item_id=$1",
        [id, status],
      ),
    extend: (id: string, until: Date) =>
      db.query(
        "UPDATE reservations SET release_after=$2 WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1) AND status='HELD'",
        [id, until],
      ),
    paid: (id: string, payment: string) =>
      db.query(
        "UPDATE orders SET status='PAID',paid_payment_id=$2,paid_at=now(),updated_at=now() WHERE id=$1",
        [id, payment],
      ),
    close: (id: string, status: string, reason: string) =>
      db.query(
        "UPDATE orders SET status=$2,closed_at=now(),close_reason=$3,updated_at=now() WHERE id=$1",
        [id, status, reason],
      ),
    newTicket: (d: Row) =>
      db.query(
        "INSERT INTO tickets(id,order_item_id,event_id,sequence_no,ticket_code,qr_token_hash,qr_token_ciphertext,qr_key_version) VALUES($1,$2,$3,$4,$5,$6,$7,1)",
        [d.id, d.item, d.event, d.sequence, d.code, d.hash, d.cipher],
      ),
    ticketByCode: async (code: string, hash: string, lock = false) =>
      (
        await db.query(
          `SELECT * FROM tickets WHERE ticket_code=$1 OR qr_token_hash=$2${lock ? " FOR UPDATE" : ""}`,
          [code, hash],
        )
      )[0],
    ticket: async (id: string) =>
      (
        await db.query(
          "SELECT t.*,o.buyer_id,o.status AS order_status,o.event_title_snapshot,i.ticket_type_name_snapshot FROM tickets t JOIN order_items i ON i.id=t.order_item_id JOIN orders o ON o.id=i.order_id WHERE t.id=$1",
          [id],
        )
      )[0],
    tickets: (user: string, event: string | null, offset = 0, q = "") =>
      db.query(
        "SELECT t.id,t.event_id,t.ticket_code,t.status,t.issued_at,i.ticket_type_name_snapshot,o.event_title_snapshot,o.buyer_name_snapshot,o.buyer_email_snapshot,c.checked_in_at FROM tickets t JOIN order_items i ON i.id=t.order_item_id JOIN orders o ON o.id=i.order_id LEFT JOIN checkins c ON c.ticket_id=t.id WHERE ($1::uuid IS NULL OR o.buyer_id=$1) AND ($2::uuid IS NULL OR t.event_id=$2) AND (t.ticket_code ILIKE $4 OR o.buyer_name_snapshot ILIKE $4 OR o.buyer_email_snapshot ILIKE $4) ORDER BY t.issued_at DESC,t.id LIMIT 50 OFFSET $3",
        [user || null, event, offset, `%${q}%`],
      ),
    checkin: async (
      id: string,
      event: string,
      actor: string,
      method: string,
    ) => {
      const rows = await db.query(
        "INSERT INTO checkins(ticket_id,event_id,checked_in_by,method) VALUES($1,$2,$3,$4) RETURNING *",
        [id, event, actor, method],
      );
      await db.query("UPDATE tickets SET status='CHECKED_IN' WHERE id=$1", [
        id,
      ]);
      return rows[0];
    },
    checkinInfo: async (id: string) =>
      (await db.query("SELECT * FROM checkins WHERE ticket_id=$1", [id]))[0],
    list: (
      user: string | null,
      event: string | null,
      offset = 0,
      status: string | null = null,
      q = "",
      from: string | null = null,
      to: string | null = null,
    ) =>
      db.query(
        "SELECT * FROM orders WHERE ($1::uuid IS NULL OR buyer_id=$1) AND ($2::uuid IS NULL OR event_id=$2) AND ($4::text IS NULL OR status=$4) AND (order_code ILIKE $5 OR buyer_name_snapshot ILIKE $5) AND ($6::timestamptz IS NULL OR created_at >= $6) AND ($7::timestamptz IS NULL OR created_at <= $7) ORDER BY created_at DESC,id LIMIT 50 OFFSET $3",
        [user, event, offset, status, `%${q}%`, from, to],
      ),
    obligations: async (event: string) =>
      (
        await db.query(
          "SELECT count(*) FILTER (WHERE status='PAID') AS paid,count(*) FILTER (WHERE status='PENDING_PAYMENT') AS pending FROM orders WHERE event_id=$1",
          [event],
        )
      )[0],
    eventOrders: (event: string) =>
      db.query(
        "SELECT id FROM orders WHERE event_id=$1 AND status='PENDING_PAYMENT' ORDER BY id",
        [event],
      ),
    eventOrderIds: (event: string) =>
      db.query("SELECT id FROM orders WHERE event_id=$1 ORDER BY id", [event]),
    due: () =>
      db.query(
        "SELECT DISTINCT o.id,o.event_id FROM orders o JOIN order_items i ON i.order_id=o.id JOIN reservations r ON r.order_item_id=i.id WHERE o.status='PENDING_PAYMENT' AND r.status='HELD' AND r.release_after<=now() LIMIT 100",
      ),
    summary: async (event: string | null) => {
      const a = (
        await db.query(
          "SELECT count(*) AS orders,coalesce(sum(total_amount),0) AS revenue,coalesce(sum(total_quantity),0) AS sold FROM orders WHERE status='PAID' AND ($1::uuid IS NULL OR event_id=$1)",
          [event],
        )
      )[0];
      const b = (
        await db.query(
          "SELECT count(*) AS checkins FROM checkins WHERE ($1::uuid IS NULL OR event_id=$1)",
          [event],
        )
      )[0];
      return { ...a, ...b };
    },
  };
}
