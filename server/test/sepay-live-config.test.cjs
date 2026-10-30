const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {loadRuntimeConfig}=require('../dist/configs/sepay-runtime');
const {createSepayV2Client,createSepayV2Reconciler}=require('../dist/modules/payment/public');
const {createSepayWorkerTasks}=require('../dist/workflows/sepay-worker');
const token='synthetic-live-api-token-only';
test('maintenance accepts only explicit boolean strings',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'sepay-ca-')),file=path.join(folder,'ca.pem');
 fs.writeFileSync(file,require('node:tls').rootCertificates[0]);
 try {
  const env={...base,DB_SSL_CA_FILE:file};
  assert.equal(loadRuntimeConfig({...env,SEPAY_ACCEPT_NEW_PAYMENTS:'false'}).app.sepayAcceptNewPayments,false);
  assert.throws(()=>loadRuntimeConfig({...env,SEPAY_ACCEPT_NEW_PAYMENTS:'yes'}));
 } finally {fs.rmSync(folder,{recursive:true,force:true});}
});
const base={SEPAY_ENABLED:'true',SEPAY_ENV:'live',SEPAY_CREDENTIAL_ENV:'live',PAYMENT_MODE:'disabled',NODE_ENV:'production',
 DATABASE_URL:'postgresql://synthetic:synthetic@db.example.test:5432/test',SEPAY_DB_TARGET:'db.example.test:5432/test',DB_SSL:'true',
 JWT_ACCESS_SECRET:'j'.repeat(32),QR_SECRET:'q'.repeat(32),SEPAY_BANK_CODE:'MBBank',SEPAY_ACCOUNT_NUMBER:'123456789',SEPAY_ACCOUNT_NAME:'SYNTHETIC',
 SEPAY_WEBHOOK_SECRET:'s'.repeat(32),SEPAY_API_V2_TOKEN:token};
const response=()=>new Response(JSON.stringify({status:'success',data:[],meta:{pagination:{has_more:false}}}));

test('Live loader fails closed and does not silently use Test credentials or another DB',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'sepay-ca-')),file=path.join(folder,'ca.pem');
 fs.writeFileSync(file,require('node:tls').rootCertificates[0]);
 try {
  const env={...base,DB_SSL_CA_FILE:file};const cfg=loadRuntimeConfig(env);
  assert.equal(cfg.app.sepay.environment,'live');assert.equal(cfg.app.databaseSsl.rejectUnauthorized,true);
  assert.equal(cfg.app.secret,base.JWT_ACCESS_SECRET);assert.equal(cfg.app.qrSecret,base.QR_SECRET);
  assert.equal(cfg.worker.pollMs,2000);assert.equal(cfg.worker.reconcileMs,60000);
  for(const key of ['SEPAY_ENV','SEPAY_CREDENTIAL_ENV','SEPAY_BANK_CODE','SEPAY_ACCOUNT_NUMBER','SEPAY_ACCOUNT_NAME','SEPAY_WEBHOOK_SECRET','SEPAY_API_V2_TOKEN','JWT_ACCESS_SECRET','QR_SECRET','DATABASE_URL','SEPAY_DB_TARGET','DB_SSL_CA_FILE']) {
   const invalid={...env};delete invalid[key];assert.throws(()=>loadRuntimeConfig(invalid),undefined,key);
  }
  for(const patch of [{SEPAY_ENABLED:'1'},{SEPAY_ENV:'other'},{SEPAY_CREDENTIAL_ENV:'test'},{SEPAY_BANK_CODE:'VCB'},
   {SEPAY_WEBHOOK_SECRET:'short'},{SEPAY_API_V2_TOKEN:'short'},{SEPAY_ACCOUNT_NUMBER:'TESTONLY'},{DB_SSL:'false'},
   {SEPAY_DB_TARGET:'other:5432/test'},{SEPAY_API_V2_BASE_URL:'https://evil.test'},
   {SEPAY_API_V2_SANDBOX_TOKEN:'sandbox'},{SEPAY_TEST_WEBHOOK_SECRET:'test'},{SEPAY_WORKER_BATCH:'0'},
   {SEPAY_RECONCILE_MS:'100'},{SEPAY_LOOKBACK_MINUTES:'1441'},{PAYMENT_MODE:'demo'},{PAYMENT_MODE:'vnpay_sandbox'}])
   assert.throws(()=>loadRuntimeConfig({...env,...patch}));
  const sslOverride=loadRuntimeConfig({...env,DATABASE_URL:env.DATABASE_URL+'?sslmode=no-verify'});
  assert.equal(new URL(sslOverride.app.databaseUrl).searchParams.has('sslmode'),false);
  assert.equal(sslOverride.app.databaseSsl.rejectUnauthorized,true);
  for(const query of ['host=evil.test','port=9999','options=unsafe','user=other'])
   assert.throws(()=>loadRuntimeConfig({...env,DATABASE_URL:env.DATABASE_URL+'?'+query}));
  assert.equal(loadRuntimeConfig({...env,DATABASE_URL:env.DATABASE_URL+'?ssl=0'}).app.databaseSsl.rejectUnauthorized,true);
 } finally {fs.rmSync(folder,{recursive:true,force:true});}
});
test('disabled loader preserves legacy config; Test loader cannot target remote or production',()=>{
 const cfg=loadRuntimeConfig({SEPAY_ENABLED:'false',PAYMENT_MODE:'demo',NODE_ENV:'development'});
 assert.equal(cfg.app.demo,true);assert.equal(cfg.app.sepay,undefined);assert.equal(cfg.worker,null);
 const localOrigins=loadRuntimeConfig({SEPAY_ENABLED:'false',CLIENT_EXTRA_ORIGINS:'http://localhost:5173,http://127.0.0.1:5173'});
 assert.deepEqual(localOrigins.app.clientOrigins,['http://localhost:5173','http://127.0.0.1:5173']);
 for(const value of ['https://localhost:5173','http://example.test','http://localhost:5173/path'])
  assert.throws(()=>loadRuntimeConfig({SEPAY_ENABLED:'false',CLIENT_EXTRA_ORIGINS:value}));
 const env={...base,SEPAY_ENV:'test',SEPAY_CREDENTIAL_ENV:'test',NODE_ENV:'development',DATABASE_URL:'postgresql://fake:fake@127.0.0.1:55432/synthetic_test',SEPAY_DB_TARGET:'127.0.0.1:55432/synthetic_test'};
 assert.equal(loadRuntimeConfig(env).app.sepay.environment,'test');
 assert.throws(()=>loadRuntimeConfig({...env,NODE_ENV:'production'}));
 assert.throws(()=>loadRuntimeConfig({...env,DATABASE_URL:base.DATABASE_URL,SEPAY_DB_TARGET:base.SEPAY_DB_TARGET}));
});
test('v2 Live/Sandbox allowlist, no redirects, safe failures and strict pagination',async()=>{
 for(const [environment,host] of [['live','userapi.sepay.vn'],['test','userapi-sandbox.sepay.vn']]) {
  const client=createSepayV2Client(token,async(url,init)=>{
   assert.equal(new URL(url).host,host);assert.equal(init.redirect,'error');assert.ok(init.signal);
   assert.equal(init.headers.Authorization,'Bearer '+token);return response();
  },environment);await client.listTransactions(new URLSearchParams());
 }
 assert.throws(()=>createSepayV2Client(token,undefined,'https://evil.test'));
 for(const status of [401,429,500,302]) {
  const client=createSepayV2Client(token,async()=>new Response(token,{status}),'live');
  await assert.rejects(()=>client.listTransactions(new URLSearchParams()),e=>!e.message.includes(token));
 }
 const timeout=createSepayV2Client(token,async()=>{throw Error(token)},'live');
 await assert.rejects(()=>timeout.listTransactions(new URLSearchParams()),e=>e.code==='SEPAY_V2_NETWORK'&&!e.message.includes(token));
 const malformed=createSepayV2Client(token,async()=>new Response(JSON.stringify({status:'success',data:[]})),'live');
 await assert.rejects(()=>malformed.listTransactions(new URLSearchParams()),e=>e.code==='SEPAY_V2_RESPONSE');
});
test('reconciler requires database lock before making any upstream call',async()=>{
 let called=false;const r=createSepayV2Reconciler({query:async()=>[]},{environment:'live'},token,async()=>{called=true;return response()});
 await assert.rejects(()=>r.reconcile(),e=>e.code==='SEPAY_V2_LOCK_REQUIRED');assert.equal(called,false);
});
test('worker inbox remains usable during reconciliation; retries and busy counters are safe',async()=>{
 let release;const held=new Promise(r=>release=r);
 const worker=createSepayWorkerTasks({sepayWebhook:{processBatch:async n=>n},sepayV2:{reconcile:async()=>held}},{batch:3,lookbackMinutes:60});
 const pending=worker.reconcile();assert.equal(await worker.inbox(),3);assert.equal(worker.health.inboxRuns,1);
 release();await pending;assert.equal(worker.health.reconcileRuns,1);
 const busy=createSepayWorkerTasks({sepayWebhook:null,sepayV2:{reconcile:async()=>{throw {code:'SEPAY_V2_BUSY'}}}},{batch:1,lookbackMinutes:60});
 await busy.reconcile();assert.equal(busy.health.busy,1);assert.equal(busy.health.failures,0);
});
