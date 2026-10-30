const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {fork}=require('node:child_process');
const {once}=require('node:events');
const {createDatabase}=require('../dist/platform/database');
const {createSepayPayments,createSepayV2Reconciler}=require('../dist/modules/payment/public');
const candidate=process.env.TEST_DATABASE_URL;
const url=(()=>{try{const u=new URL(candidate);return u.hostname==='127.0.0.1'&&u.port==='55432'&&/^\/eventhub_sepay_[a-f0-9]{12}_test$/.test(u.pathname)?candidate:undefined}catch{return undefined}})();
const cfg={environment:'live',bankCode:'MBBank',accountNumber:'987654321',accountName:'SYNTHETIC',webhookSecret:'s'.repeat(32)};
test('L1 database isolation and cross-process reconciliation',{skip:!url,timeout:30000},async t=>{
 const target=new URL(url);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55432');assert.match(target.pathname,/^\/eventhub_sepay_[a-f0-9]{12}_test$/);
 const db=createDatabase(url,false);await db.start();t.after(()=>db.close());
 const live=createSepayPayments(db.owner('payment'),cfg),sandbox=createSepayPayments(db.owner('payment'),{...cfg,environment:'test'}),other=createSepayPayments(db.owner('payment'),{...cfg,accountNumber:'111111111'});
 const payload={id:987654321,gateway:'MBBank',transactionDate:'2026-10-29 12:00:00',accountNumber:cfg.accountNumber,subAccount:null,code:'tkhL1TEST',content:'tkhL1TEST',transferType:'in',transferAmount:100001,accumulated:0,description:'',referenceCode:'L1-SYNTHETIC'};
 await t.test('workers and admin stores cannot claim or read another environment/account',async()=>{
  for(const store of [live,sandbox,other])await db.uow.run(()=>store.receive(payload,'a'.repeat(64)));
  const own=await live.listTransactions(null,0,100);assert.equal(own.length,1);assert.equal(own[0].environment,'live');
  const foreign=(await sandbox.listTransactions(null,0,100))[0];
  assert.equal(await live.transaction(foreign.id),undefined);assert.deepEqual(await live.reprocess(foreign.id),[]);
  assert.deepEqual(await live.reviews(foreign.id),[]);await live.addReview(foreign.id,null,'IGNORE','synthetic',null);
  assert.deepEqual(await sandbox.reviews(foreign.id),[]);
  const claims=await db.uow.run(()=>live.claim(100));assert.equal(claims.length,1);assert.equal(claims[0].id,own[0].id);
  assert.equal((await sandbox.transaction(foreign.id)).status,'RECEIVED');
 });
 await t.test('a second process cannot reconcile until first exits; process death releases lock',async()=>{
  const child=fork(path.join(__dirname,'helpers/sepay-lock-child.cjs'),[],{env:{...process.env,DB_SSL:'false'},stdio:['ignore','ignore','ignore','ipc']});
  t.after(()=>{if(child.exitCode===null)child.kill()});
  const ready=await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw Error('Lock child exited early')})]);assert.equal(ready[0].locked,true);
  let requested=false;
  const r=createSepayV2Reconciler(db.owner('payment'),cfg,'synthetic-api-token',async()=>{requested=true;throw Error('must not request')},db.exclusive);
  await assert.rejects(()=>r.reconcile(),e=>e.code==='SEPAY_V2_BUSY');assert.equal(requested,false);
  const exited=once(child,'exit');child.kill();await exited;
  let acquired=false;
  for(let i=0;i<20&&!acquired;i++) {
   try {await db.exclusive('sepay:v2:live',async()=>{acquired=true})} catch(e){if(e.code!=='SEPAY_V2_BUSY')throw e;await new Promise(r=>setTimeout(r,100))}
  }
  assert.equal(acquired,true);
 });
 await t.test('exclusive work rolls back writes on failure and releases transaction lock',async()=>{
  await assert.rejects(()=>db.exclusive('l1-rollback',async()=>{await live.receive({...payload,id:987654322},'b'.repeat(64));throw Error('synthetic failure')}),/synthetic failure/);
  assert.equal((await live.listTransactions(null,0,100)).length,1);
  await db.exclusive('l1-rollback',async()=>{});
 });
});
