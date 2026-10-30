// Dedicated worker; never loads dotenv or the existing shared worker configuration.
const {verifiedConfig}=require('./sepay-local-guard.cjs');
const {randomBytes}=require('node:crypto');
async function main(){
  const dbConfig=verifiedConfig(),fs=require('node:fs'),path=require('node:path');
  const runtime=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../.local/sepay/runtime.json'),'utf8'));
  if(runtime.environment!=='test'||runtime.bankCode!=='MBBank'||!runtime.webhookSecret) throw Error('Test-mode runtime configuration invalid');
  for(const key of Object.keys(process.env)) if(!['PATH','SystemRoot','SYSTEMROOT','TEMP','TMP'].includes(key)) delete process.env[key];
  process.env.NODE_ENV='development';process.env.DB_SSL='false';
  const {createDatabase}=require('../dist/platform/database');
  const {createPayments,demoProvider,createSepayPayments}=require('../dist/modules/payment/public');
  const {createOrders}=require('../dist/modules/order/public');
  const {createSepayWebhook}=require('../dist/workflows/sepay-webhook');
  const {createAudit}=require('../dist/modules/audit/public');
  const {createNotifications}=require('../dist/modules/notification/public');
  const db=createDatabase(dbConfig.url);await db.start();
  const payments=createPayments(db.owner('payment'),demoProvider(false));
  const sepay=createSepayPayments(db.owner('payment'),runtime);
  const orders=createOrders(db.owner('order'),randomBytes(32).toString('hex'));
  const service=createSepayWebhook(sepay,payments,orders,db.uow,createNotifications(db.owner('notification')),createAudit(db.owner('audit')));
  let stopping=false;for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>stopping=true);
  console.log('SePay local worker running on dedicated local DB; no shared worker or .env loaded.');
  try{while(!stopping){try{const n=await service.processBatch(10);if(n)console.log(`SePay inbox items claimed: ${n}`);}catch{console.error('SePay inbox polling failed; will retry.');}await new Promise(r=>setTimeout(r,1000));}}finally{await db.close();}
}
main().catch(()=>{console.error('Local SePay worker failed; no credential printed.');process.exitCode=1;});
