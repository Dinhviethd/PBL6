import { createHash, randomUUID } from "node:crypto";
import type { Store } from "../../../contracts/core";
import type { SepayConfig } from "../sepay";

export type ApiTransactionRecord = {
  id: string; transaction_date: string; account_number: string; va: string | null;
  transfer_type: "in" | "out"; amount_in: number; amount_out: number;
  transaction_content: string; reference_number: string | null; code: string | null;
};
function providerInstant(value: string) {
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  return new Date(value.replace(" ", "T") + "+07:00");
}
const hash = (t: ApiTransactionRecord) => createHash("sha256").update(JSON.stringify(t)).digest("hex");

export function sepayV2Store(db: Store, config: SepayConfig) {
  const integration = `${config.bankCode}:${config.accountNumber}`;
  return {
    hasApiTransaction: async (id: string) => (await db.query(
      `SELECT id FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 AND api_transaction_id=$3`,
      [config.environment, integration, id])).length > 0,
    exactWebhookMatches: (t: ApiTransactionRecord, when: Date) => db.query(
      `SELECT id FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 AND webhook_transaction_id IS NOT NULL AND account_number=$3 AND bank_code=$4 AND transfer_type='in' AND amount=$5 AND content=$6 AND transaction_at=$7 AND (reference_code=$8 OR (reference_code IS NULL AND $8 IS NULL)) FOR UPDATE`,
      [config.environment, integration, t.account_number, config.bankCode, t.amount_in, t.transaction_content, when, t.reference_number]),
    attachApiId: (id: string, apiId: string) => db.query(
      `UPDATE sepay_transactions SET api_transaction_id=$2 WHERE id=$1 AND api_transaction_id IS NULL RETURNING id`, [id, apiId]),
    hasPotentialDuplicate: async (code: string, amount: number, when: Date) => (await db.query(
      `SELECT id FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 AND payment_code=$3 AND amount=$4 AND transaction_at=$5`,
      [config.environment, integration, code, amount, when])).length > 0,
    recordApiTransaction: async (t: ApiTransactionRecord, code: string | null, status: 'RECEIVED'|'REVIEW', reason: string | null) => {
      const when = providerInstant(t.transaction_date);
      return db.query(`INSERT INTO sepay_transactions(id,environment,integration_account,api_transaction_id,reference_code,bank_code,account_number,sub_account,transfer_type,amount,currency,payment_code,content,transaction_at,payload_hash,status,reason,next_retry_at,processed_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'in',$9,'VND',$10,$11,$12,$13,$14,$15,CASE WHEN $14::varchar='RECEIVED' THEN now() ELSE NULL END,CASE WHEN $14::varchar='REVIEW' THEN now() ELSE NULL END) ON CONFLICT(environment,integration_account,api_transaction_id) DO NOTHING RETURNING id`,
        [randomUUID(), config.environment, integration, t.id, t.reference_number, config.bankCode, t.account_number, t.va, t.amount_in, code, t.transaction_content, when, hash(t), status, reason]);
    },
  };
}
