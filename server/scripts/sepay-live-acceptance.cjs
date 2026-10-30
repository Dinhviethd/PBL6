// L5 read-only evidence. No fabricated callback, payment update or ticket issuance.
const fs=require('node:fs'),path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
async function main(){
 const env=require('dotenv').parse(fs.readFileSync('.env'));
 const config=require('../dist/configs/sepay-runtime').loadRuntimeConfig(env);
 if(env.SEPAY_ENV!=='live'||!config.worker)throw Error('Live required');
 const dir=path.resolve('../.local/sepay-l5');fs.mkdirSync(dir,{recursive:true});
 const client=new(require('pg').Client)({connectionString:config.app.databaseUrl,ssl:config.app.databaseSsl,connectionTimeoutMillis:10000});
 await client.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='15s'");
  const output={at:new Date().toISOString(),tlsVerified:true,environment:'live'};
  output.inbox=(await client.query('SELECT status,count(*)::int AS count FROM sepay_transactions WHERE environment=$1 AND integration_account=$2 GROUP BY status',['live',`${env.SEPAY_BANK_CODE}:${env.SEPAY_ACCOUNT_NUMBER}`])).rows;
  const file=path.join(dir,'case.json');
  if(fs.existsSync(file)){
   const fixture=JSON.parse(fs.readFileSync(file));
   if(!fixture.order||!fixture.payment)throw Error('Incomplete case');
   output.order=(await client.query('SELECT status,total_amount::text AS amount,total_quantity FROM orders WHERE id=$1',[fixture.order])).rows[0];
   output.payment=(await client.query('SELECT status,amount::text,requires_review FROM payments WHERE id=$1 AND order_id=$2',[fixture.payment,fixture.order])).rows[0];
   output.transactions=(await client.query(`SELECT status,reason,amount::text,bank_code,transfer_type,payment_code=$3 AS content_matches,
    account_number=$2 AS account_matches,webhook_transaction_id IS NOT NULL AS webhook_received,
    api_transaction_id IS NOT NULL AS api_reconciled,reference_code IS NOT NULL AS has_bank_reference
    FROM sepay_transactions WHERE payment_id=$1`,[fixture.payment,env.SEPAY_ACCOUNT_NUMBER,fixture.transferContent])).rows;
   output.ticketCount=Number((await client.query('SELECT count(*) FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[fixture.order])).rows[0].count);
   output.notificationCount=Number((await client.query("SELECT count(*) FROM notifications WHERE target_id=$1 AND kind='ORDER_PAID'",[fixture.order])).rows[0].count);
   output.verifiedAuditCount=Number((await client.query("SELECT count(*) FROM audit_logs WHERE resource_id=$1 AND action='payment.verified'",[fixture.payment])).rows[0].count);
   output.verificationSources=(await client.query("SELECT metadata->>'source' AS source FROM audit_logs WHERE resource_id=$1 AND action='payment.verified'",[fixture.payment])).rows;
   output.settlementPass=output.order?.status==='PAID'&&output.order.amount===fixture.amount&&output.payment?.status==='SUCCEEDED'&&output.payment.amount===fixture.amount&&!output.payment.requires_review&&output.ticketCount===1&&output.notificationCount===1&&output.verifiedAuditCount===1&&output.transactions.length===1&&output.transactions.some(t=>t.status==='PROCESSED'&&t.account_matches&&t.content_matches&&t.bank_code==='MBBank'&&t.transfer_type==='in'&&t.amount===output.payment.amount);
   output.webhookEvidence=output.transactions.some(t=>t.webhook_received&&t.status==='PROCESSED');
  }else output.casePrepared=false;
  await client.query('ROLLBACK');
  const filename=`evidence-${Date.now()}.json`;fs.writeFileSync(path.join(dir,filename),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output));
 }finally{await client.end()}
}
main().catch(e=>{console.error(JSON.stringify({acceptance:'failed',code:e.code||e.name}));process.exitCode=1});
