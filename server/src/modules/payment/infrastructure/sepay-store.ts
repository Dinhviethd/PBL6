import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
import type { SepayConfig } from "../sepay";
export type SepayTransactionFilter = { from?: string; to?: string; reference?: string };
export function sepayStore(db: Store, config: SepayConfig) {
  const integration = `${config.bankCode}:${config.accountNumber}`;
  const select = `SELECT p.*, d.environment,d.bank_code,d.account_number,d.account_name,d.transfer_content
    FROM payments p JOIN sepay_payment_details d ON d.payment_id=p.id`;
  return {
    receive: async (payload: import("../sepay").SepayWebhookPayload, payloadHash: string) => {
      const integration = `${config.bankCode}:${config.accountNumber}`;
      const transactionAt = new Date(payload.transactionDate.replace(' ','T')+'+07:00');
      // API v2 UUID and webhook numeric ID are separate identifiers. If reconciliation
      // already imported this exact bank transaction, attach the webhook ID to that row.
      const apiMatches=await db.query(`SELECT id,payload_hash FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 AND api_transaction_id IS NOT NULL AND webhook_transaction_id IS NULL AND bank_code=$3 AND account_number=$4 AND transfer_type=$5 AND amount=$6 AND content=$7 AND transaction_at=$8 AND (reference_code=$9 OR (reference_code IS NULL AND $9 IS NULL))`,
        [config.environment,integration,payload.gateway,payload.accountNumber,payload.transferType,payload.transferAmount,payload.content,transactionAt,payload.referenceCode]);
      if(apiMatches.length===1) {
        const linked=await db.query(`UPDATE sepay_transactions SET webhook_transaction_id=$2,payload_hash=$3,bank_code=$4,account_number=$5,sub_account=$6,payment_code=$7,reference_code=$8 WHERE id=$1 AND webhook_transaction_id IS NULL RETURNING id`,
          [apiMatches[0].id,String(payload.id),payloadHash,payload.gateway,payload.accountNumber,payload.subAccount,payload.code,payload.referenceCode]);
        if(linked.length) return {duplicate:false,conflict:false,linked:true};
      }
      const ambiguous=apiMatches.length>1;
      const rows = await db.query(`INSERT INTO sepay_transactions(id,environment,integration_account,webhook_transaction_id,bank_code,account_number,sub_account,transfer_type,amount,currency,payment_code,content,transaction_at,reference_code,payload_hash,status,reason,next_retry_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'VND',$10,$11,$12,$13,$14,$15,$16,CASE WHEN $15::varchar='RECEIVED' THEN now() ELSE NULL END)
        ON CONFLICT(environment,integration_account,webhook_transaction_id) DO NOTHING RETURNING id,payload_hash`,
        [randomUUID(),config.environment,integration,String(payload.id),payload.gateway,payload.accountNumber,payload.subAccount,payload.transferType,payload.transferAmount,payload.code,payload.content,transactionAt,payload.referenceCode,payloadHash,ambiguous?'REVIEW':'RECEIVED',ambiguous?'API_WEBHOOK_MATCH_AMBIGUOUS':null]);
      if(rows.length) return {duplicate:false,conflict:ambiguous};
      const existing=(await db.query(`SELECT payload_hash,payment_id,status FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 AND webhook_transaction_id=$3 FOR UPDATE`,[config.environment,integration,String(payload.id)]))[0];
      if(existing?.payload_hash===payloadHash) return {duplicate:true,conflict:false};
      if(existing) {
        await db.query(`UPDATE sepay_transactions SET status='REVIEW',reason='PAYLOAD_CONFLICT',next_retry_at=NULL,lease_until=NULL,lease_token=NULL WHERE environment=$1 AND integration_account=$2 AND webhook_transaction_id=$3`,[config.environment,integration,String(payload.id)]);
        if(existing.payment_id) await db.query(`UPDATE payments SET requires_review=true,review_reason='SEPAY_PAYLOAD_CONFLICT',updated_at=now() WHERE id=$1 AND review_resolved_at IS NULL`,[existing.payment_id]);
        await db.query(`INSERT INTO sepay_transaction_reviews(id,transaction_id,action,reason) SELECT $1,id,'PAYLOAD_CONFLICT','Same SePay transaction ID received with a different payload' FROM sepay_transactions WHERE environment=$2 AND integration_account=$3 AND webhook_transaction_id=$4`,[randomUUID(),config.environment,integration,String(payload.id)]);
      }
      return {duplicate:false,conflict:true};
    },
    claim: async (limit = 10) => {
      const candidates=await db.query(`SELECT id FROM sepay_transactions WHERE environment=$2 AND integration_account=$3 AND status IN ('RECEIVED','ERROR','PROCESSING') AND (next_retry_at IS NULL OR next_retry_at<=now()) AND (lease_until IS NULL OR lease_until<=now()) ORDER BY received_at,id LIMIT $1`,[limit,config.environment,integration]);
      const claimed=[];
      for(const candidate of candidates) {
        const token=randomUUID();
        const rows=await db.query(`UPDATE sepay_transactions SET status='PROCESSING',attempt_count=attempt_count+1,lease_until=now()+interval '120 seconds',lease_token=$2 WHERE id=$1 AND environment=$3 AND integration_account=$4 AND status IN ('RECEIVED','ERROR','PROCESSING') AND (next_retry_at IS NULL OR next_retry_at<=now()) AND (lease_until IS NULL OR lease_until<=now()) RETURNING *`,[candidate.id,token,config.environment,integration]);
        claimed.push(...rows);
      }
      return claimed;
    },
    // Revalidate the claim and hold its row lock for the whole settlement transaction.
    lockClaim: async (id: string, lease: string) => (await db.query(`SELECT * FROM sepay_transactions WHERE id=$1 AND lease_token=$2 AND status='PROCESSING' AND lease_until>now() AND environment=$3 AND integration_account=$4 FOR UPDATE`,[id,lease,config.environment,integration]))[0],
    latest: async (orderId: string) => (await db.query(`${select} WHERE p.order_id=$1 AND p.provider='sepay' AND d.environment=$2 AND d.account_number=$3 AND d.bank_code=$4 ORDER BY p.created_at DESC,p.id DESC LIMIT 1`, [orderId,config.environment,config.accountNumber,config.bankCode]))[0],
    one: async (id: string) => (await db.query(`${select} WHERE p.id=$1 AND p.provider='sepay' AND d.environment=$2 AND d.account_number=$3 AND d.bank_code=$4`, [id,config.environment,config.accountNumber,config.bankCode]))[0],
    hasReview: async (orderId: string) => (await db.query("SELECT id FROM payments WHERE order_id=$1 AND requires_review AND review_resolved_at IS NULL LIMIT 1", [orderId])).length > 0,
    findByCode: async (code: string) => db.query(`${select} WHERE p.provider='sepay' AND d.environment=$1 AND d.bank_code='MBBank' AND d.account_number=$2 AND d.transfer_content=$3 ORDER BY p.created_at DESC,p.id DESC LIMIT 2`,[config.environment,config.accountNumber,code]),
    finishTransaction: (id: string, lease: string, status: 'PROCESSED'|'REVIEW'|'ERROR', reason: string|null, paymentId: string|null = null) => db.query(`UPDATE sepay_transactions SET status=$3::varchar,reason=$4,payment_id=$5,processed_at=CASE WHEN $3::varchar IN ('PROCESSED','REVIEW') THEN now() ELSE NULL END,next_retry_at=CASE WHEN $3::varchar='ERROR' THEN now()+interval '60 seconds' ELSE NULL END,lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2 AND status='PROCESSING'`,[id,lease,status,reason,paymentId]),
    listTransactions: (status:string|null,offset:number,limit:number,filter:SepayTransactionFilter={}) => db.query(`SELECT id,environment,'MBBank:****' AS integration_account,webhook_transaction_id,api_transaction_id,reference_code,bank_code,'****' AS account_masked,transfer_type,amount,currency,payment_code,payment_id,status,reason,attempt_count,transaction_at,received_at,processed_at FROM sepay_transactions WHERE ($1::text IS NULL OR status=$1) AND environment=$4 AND integration_account=$5 AND ($6::timestamptz IS NULL OR transaction_at >= $6::timestamptz) AND ($7::timestamptz IS NULL OR transaction_at <= $7::timestamptz) AND ($8::text IS NULL OR reference_code=$8) ORDER BY received_at DESC,id LIMIT $2 OFFSET $3`,[status,limit,offset,config.environment,integration,filter.from??null,filter.to??null,filter.reference??null]),
    transaction: async (id:string) => (await db.query(`SELECT id,environment,'MBBank:****' AS integration_account,webhook_transaction_id,reference_code,bank_code,'****' AS account_masked,transfer_type,amount,currency,payment_code,payment_id,status,reason,attempt_count,received_at,processed_at FROM sepay_transactions WHERE id=$1 AND environment=$2 AND integration_account=$3`,[id,config.environment,integration]))[0],
    reviews: (id:string) => db.query(`SELECT r.id,r.transaction_id,r.actor_id,r.action,r.reason,r.evidence_reference,r.created_at FROM sepay_transaction_reviews r JOIN sepay_transactions t ON t.id=r.transaction_id WHERE r.transaction_id=$1 AND t.environment=$2 AND t.integration_account=$3 ORDER BY r.created_at,r.id`,[id,config.environment,integration]),
    reprocess: (id:string) => db.query(`UPDATE sepay_transactions SET status='RECEIVED',reason=NULL,processed_at=NULL,next_retry_at=now(),lease_until=NULL,lease_token=NULL WHERE id=$1 AND environment=$2 AND integration_account=$3 AND status IN ('ERROR','REVIEW') RETURNING id`,[id,config.environment,integration]),
    addReview: (transactionId:string,actorId:string,action:string,reason:string,evidence:string|null) => db.query(`INSERT INTO sepay_transaction_reviews(id,transaction_id,actor_id,action,reason,evidence_reference) SELECT $1,id,$3,$4,$5,$6 FROM sepay_transactions WHERE id=$2 AND environment=$7 AND integration_account=$8`,[randomUUID(),transactionId,actorId,action,reason,evidence,config.environment,integration]),
    resolve: async (id:string,actor:string,reason:string) => { const tx=(await db.query(`SELECT payment_id FROM sepay_transactions WHERE id=$1 AND environment=$2 AND integration_account=$3 FOR UPDATE`,[id,config.environment,integration]))[0]; if(!tx) return; await db.query(`UPDATE sepay_transactions SET status='REVIEW',reason=$2,processed_at=now() WHERE id=$1`,[id,reason]); if(tx.payment_id) await db.query(`UPDATE payments SET requires_review=true,review_reason=$2,review_resolved_at=now(),review_resolved_by=$3,review_resolution_note=$2,updated_at=now() WHERE id=$1`,[tx.payment_id,reason,actor]); },
    pendingCount: async () => Number((await db.query(`SELECT count(*) AS n FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 AND status IN ('RECEIVED','PROCESSING','ERROR')`,[config.environment,integration]))[0].n),
    create: async (order: Row, reference: string) => {
      const id = randomUUID();
      const hold = new Date(new Date(order.expires_at).getTime() + 15 * 60000);
      await db.query(`INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,amount,currency,provider_expires_at,reconcile_until)
        VALUES($1,$2,'sepay',$3,$4,$5,'VND',$6,$7)`,
        [id, order.id, `${config.environment}:${config.accountNumber}`, reference, order.total_amount, order.expires_at, hold]);
      await db.query(`INSERT INTO sepay_payment_details(payment_id,environment,bank_code,account_number,account_name,transfer_content)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, config.environment, config.bankCode, config.accountNumber, config.accountName, reference]);
      return id;
    },
  };
}
