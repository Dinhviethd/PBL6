import { randomUUID, createHash } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
import type { PaymentIntent, VerifiedPayment } from "../provider";
export function paymentStore(db: Store) {
  return {
    historyPayments: (ids: string[]) => db.query(
      `SELECT id,order_id,provider,status,amount,created_at,succeeded_at,requires_review,review_resolved_at
       FROM payments WHERE order_id=ANY($1::uuid[]) ORDER BY created_at DESC,id DESC`, [ids]),
    latest: async (order: string) =>
      (
        await db.query(
          "SELECT * FROM payments WHERE order_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
          [order],
        )
      )[0],
    byReference: async (
      provider: string,
      merchant: string,
      reference: string,
    ) =>
      (
        await db.query(
          "SELECT * FROM payments WHERE provider=$1 AND merchant_account=$2 AND merchant_reference=$3",
          [provider, merchant, reference],
        )
      )[0],
    due: () =>
      db.query(
        "SELECT * FROM payments WHERE provider='vnpay_sandbox' AND status IN ('PENDING','UNKNOWN') AND next_reconcile_at<=now() ORDER BY next_reconcile_at,id LIMIT 20",
      ),
    claim: async (id: string) =>
      (
        await db.query(
          "UPDATE payments SET next_reconcile_at=now()+interval '60 seconds' WHERE id=$1 AND status IN ('PENDING','UNKNOWN') AND next_reconcile_at<=now() RETURNING id",
          [id],
        )
      ).length > 0,
    defer: (id: string) =>
      db.query(
        "UPDATE payments SET next_reconcile_at=CASE WHEN now()>reconcile_until+interval '24 hours' THEN NULL WHEN now()>reconcile_until THEN now()+interval '15 minutes' ELSE now()+interval '60 seconds' END WHERE id=$1 AND status IN ('PENDING','UNKNOWN')",
        [id],
      ),
    verifiedResult: (id: string, result: VerifiedPayment) =>
      db.query(
        "UPDATE payments SET status=$2::text,succeeded_at=CASE WHEN $2::text='SUCCEEDED' THEN now() ELSE NULL END,provider_transaction_id=$3,last_verified_at=now(),failure_code=$4,next_reconcile_at=CASE WHEN $2::text='UNKNOWN' THEN next_reconcile_at ELSE NULL END,updated_at=now() WHERE id=$1",
        [id, result.status, result.transactionId, result.code],
      ),
    recordVerified: async (p: Row, result: VerifiedPayment) => {
      const payload = JSON.stringify(result),
        hash = createHash("sha256").update(payload).digest("hex");
      await db.query(
        "INSERT INTO payment_notifications(id,payment_id,provider,merchant_account,dedupe_key,payload_hash,sanitized_payload,processing_status,processed_at,attempt_count) VALUES($1,$2,$3,$4,$5,$5,$6,'PROCESSED',now(),1) ON CONFLICT DO NOTHING",
        [randomUUID(), p.id, p.provider, p.merchant_account, hash, payload],
      );
    },
    clearTransientReview: (id: string) =>
      db.query(
        "UPDATE payments SET requires_review=false,review_reason=NULL WHERE id=$1 AND review_reason='VNPAY_UNRESOLVED' AND review_resolved_at IS NULL",
        [id],
      ),
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
    create: async (order: Row, intent: PaymentIntent, reference: string) =>
      (
        await db.query(
          "INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,amount,provider_expires_at,reconcile_until,next_reconcile_at,checkout_url) VALUES($1,$2,$7,$8,$3,$4,$5,$6,now()+interval '60 seconds',$9) RETURNING *",
          [
            randomUUID(),
            order.id,
            reference,
            order.total_amount,
            intent.expiresAt,
            intent.reconcileUntil,
            intent.provider,
            intent.merchantAccount,
            intent.checkoutUrl ?? null,
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
