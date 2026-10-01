import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
import type { PaymentIntent } from "../provider";
export function paymentStore(db: Store) {
  return {
    one: async (id: string, lock = false) =>
      (
        await db.query(
          `SELECT * FROM payments WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
          [id],
        )
      )[0],
    active: async (order: string) =>
      (
        await db.query(
          "SELECT * FROM payments WHERE order_id=$1 AND status IN ('PENDING','UNKNOWN')",
          [order],
        )
      )[0],
    create: async (order: Row, intent: PaymentIntent) =>
      (
        await db.query(
          "INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,amount,provider_expires_at,reconcile_until,next_reconcile_at) VALUES($1,$2,$7,$8,$3,$4,$5,$6,$6) RETURNING *",
          [
            randomUUID(),
            order.id,
            randomUUID(),
            order.total_amount,
            intent.expiresAt,
            intent.reconcileUntil,
            intent.provider,
            intent.merchantAccount,
          ],
        )
      )[0],
    result: (id: string, success: boolean, transactionId: string) =>
      db.query(
        "UPDATE payments SET status=$2,succeeded_at=CASE WHEN $3 THEN now() ELSE NULL END,provider_transaction_id=$4,last_verified_at=now(),updated_at=now() WHERE id=$1",
        [id, success ? "SUCCEEDED" : "FAILED", success, transactionId],
      ),
    review: (id: string, reason: string) =>
      db.query(
        "UPDATE payments SET requires_review=true,review_reason=$2,updated_at=now() WHERE id=$1",
        [id, reason],
      ),
    notification: async (p: Row, success: boolean) => {
      const key = `${p.id}:${success ? "success" : "failure"}`;
      await db.query(
        "INSERT INTO payment_notifications(id,payment_id,provider,merchant_account,dedupe_key,payload_hash,sanitized_payload) VALUES($1,$2,'demo','local',$3,$3,$4) ON CONFLICT DO NOTHING",
        [randomUUID(), p.id, key, JSON.stringify({ paymentId: p.id, success })],
      );
      await db.query(
        "UPDATE payment_notifications SET processing_status='PROCESSED',processed_at=now(),attempt_count=attempt_count+1 WHERE provider='demo' AND merchant_account='local' AND dedupe_key=$1",
        [key],
      );
    },
    list: (
      status: string | null,
      offset = 0,
      from: string | null = null,
      to: string | null = null,
      q = "",
    ) =>
      db.query(
        "SELECT * FROM payments WHERE ($1::text IS NULL OR status=$1) AND ($3::timestamptz IS NULL OR created_at >= $3) AND ($4::timestamptz IS NULL OR created_at <= $4) AND merchant_reference ILIKE $5 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        [status, offset, from, to, `%${q}%`],
      ),
    summary: async () =>
      (
        await db.query(
          "SELECT coalesce(sum(amount) FILTER (WHERE status='SUCCEEDED'),0) AS provider_received,count(*) FILTER (WHERE requires_review AND review_resolved_at IS NULL) AS needs_review FROM payments",
        )
      )[0],
    blocking: (ids: string[]) =>
      db.query(
        "SELECT id FROM payments WHERE order_id=ANY($1::uuid[]) AND (status IN ('PENDING','UNKNOWN') OR (status='SUCCEEDED' AND requires_review AND review_resolved_at IS NULL)) LIMIT 1",
        [ids],
      ),
  };
}
