import type { Store } from "../../../contracts/core";

export function orderAnalyticsStore(db: Store) {
  return {
    adminPaidOrderBatch: (afterId: string | null) => db.query(
      `SELECT id,total_amount,paid_payment_id FROM orders
       WHERE status='PAID' AND ($1::uuid IS NULL OR id>$1::uuid)
       ORDER BY id LIMIT 500`,
      [afterId],
    ),
    dashboardPaidOrders: (ids: string[]) => db.query(
      `SELECT id,event_id,paid_payment_id,total_amount,total_quantity FROM orders
       WHERE event_id=ANY($1::uuid[]) AND status='PAID' ORDER BY id`, [ids],
    ),
    dashboardInventory: (ids: string[], asOf: string) => db.query(
      `SELECT t.event_id,coalesce(sum(t.capacity),0) AS capacity,
       coalesce(sum(t.sold_quantity),0) AS sold,
       sum(CASE WHEN t.archived_at IS NULL AND t.sale_starts_at <= $2::timestamptz
         AND t.sale_ends_at > $2::timestamptz AND t.capacity-t.sold_quantity-t.reserved_quantity > 0
         AND NOT EXISTS (SELECT w.id FROM wait_queue w WHERE w.ticket_type_id=t.id AND w.status='WAITING')
         THEN 1 ELSE 0 END) AS sellable_types
       FROM ticket_types t WHERE t.event_id=ANY($1::uuid[])
         AND (t.archived_at IS NULL OR t.sold_quantity > 0) GROUP BY t.event_id`, [ids, asOf],
    ),
    dashboardTickets: (ids: string[]) => db.query(
      `SELECT t.event_id,count(*) AS eligible_tickets,
       sum(CASE WHEN t.status='CHECKED_IN' THEN 1 ELSE 0 END) AS checked_in
       FROM tickets t JOIN order_items i ON i.id=t.order_item_id JOIN orders o ON o.id=i.order_id
       WHERE t.event_id=ANY($1::uuid[]) AND o.status='PAID'
         AND t.status IN ('VALID','CHECKED_IN') GROUP BY t.event_id`, [ids],
    ),
    analyticsPaidOrders: (eventId: string) => db.query(
      `SELECT id,paid_payment_id,total_amount,total_quantity FROM orders
       WHERE event_id=$1 AND status='PAID' ORDER BY id`, [eventId],
    ),
    analyticsItems: (orderIds: string[]) => db.query(
      `SELECT order_id,ticket_type_id,ticket_type_name_snapshot,quantity,line_total
       FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY order_id,id`, [orderIds],
    ),
  };
}
