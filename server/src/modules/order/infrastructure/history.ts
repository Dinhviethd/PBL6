import type { Store } from "../../../contracts/core";

export function orderHistoryStore(db: Store) {
  return {
    historyScope: (buyer: string, from: string | null, to: string | null) =>
      db.query(
        `SELECT id,order_code,event_title_snapshot,status,total_amount,currency,created_at,expires_at,paid_payment_id,total_quantity
       FROM orders WHERE buyer_id=$1 AND ($2::timestamptz IS NULL OR created_at >= $2)
       AND ($3::timestamptz IS NULL OR created_at < $3) ORDER BY created_at DESC,id`,
        [buyer, from, to],
      ),
    historyItems: (ids: string[]) =>
      db.query(
        `SELECT order_id,ticket_type_name_snapshot,quantity,unit_price,line_total FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY order_id,id`,
        [ids],
      ),
    historyTickets: (ids: string[]) =>
      db.query(
        `SELECT i.order_id,t.id,t.order_item_id,i.ticket_type_name_snapshot,t.status,c.checked_in_at
       FROM order_items i JOIN tickets t ON t.order_item_id=i.id LEFT JOIN checkins c ON c.ticket_id=t.id
       WHERE i.order_id=ANY($1::uuid[]) ORDER BY i.order_id,i.id,t.sequence_no`,
        [ids],
      ),
  };
}
