const test = require('node:test');
const assert = require('node:assert/strict');
const { createSepayV2Client, createSepayV2Reconciler: reconciler } = require('../dist/modules/payment/public');
// Unit-only transaction stub; real lock/rollback is covered by L1 DB tests.
const createSepayV2Reconciler = (db, config, token, fetcher) => reconciler(db, config, token, fetcher, async (_key, work) => work());

const transaction = (overrides={}) => ({
  id:'f9e8d7c6-b5a4-4321-8fed-cba098765432', transaction_date:'2026-10-29T12:00:00+07:00',
  account_number:'5130000000000', va:null, transfer_type:'in', amount_in:150000, amount_out:0,
  accumulated:150000, transaction_content:'Thanh toan tkhPN8V', reference_number:'SB-REF-001',
  code:'tkhPN8V', bank_brand_name:'MBBank', bank_account_id:'a1b2c3d4-e5f6-4789-8123-456789abcdef', va_id:null,
  ...overrides,
});
const response = (data, hasMore=false, status='success') => new Response(JSON.stringify({status,data,meta:{pagination:{has_more:hasMore}}}), {status:200,headers:{'content-type':'application/json'}});
const config = {environment:'test',bankCode:'MBBank',accountNumber:'5130000000000',accountName:'Synthetic Test',webhookSecret:'not-a-real-secret'};

test('v2 client uses Sandbox, Bearer token and validates envelope without leaking upstream body', async()=>{
  let captured;
  const client=createSepayV2Client('sandbox-token-placeholder',async(url,init)=>{captured={url:String(url),init};return response([]);});
  const result=await client.listTransactions(new URLSearchParams({page:'1'}));
  assert.equal(result.data.length,0);assert.match(captured.url,/userapi-sandbox\.sepay\.vn\/v2\/transactions/);
  assert.equal(captured.init.headers.Authorization,'Bearer sandbox-token-placeholder');
  const bad=createSepayV2Client('sandbox-token-placeholder',async()=>new Response('secret-bearing upstream body',{status:401}));
  await assert.rejects(()=>bad.listTransactions(new URLSearchParams()),e=>e.status===503&&!e.message.includes('secret-bearing'));
});

test('reconcile imports eligible Sandbox transaction with API UUID, not webhook integer ID', async()=>{
  const calls=[];let apiAlready=false;
  const db={query:async(sql,args=[])=>{calls.push({sql,args});if(sql.includes('SELECT id FROM sepay_transactions')&&sql.includes('api_transaction_id=$3'))return apiAlready?[{id:'internal-id'}]:[];if(sql.includes('SELECT id FROM sepay_transactions')&&sql.includes('webhook_transaction_id IS NOT NULL'))return [];if(sql.includes('INSERT INTO sepay_transactions')){apiAlready=true;return [{id:args[0]}];}return [];}};
  const reconciler=createSepayV2Reconciler(db,config,'sandbox-token-placeholder',async(_url,init)=>{assert.equal(init.method,'GET');return response([transaction()]);});
  const result=await reconciler.reconcile(60);
  assert.deepEqual(result,{scanned:1,imported:1,reviewed:0,matchedWebhook:0,duplicates:0,ignored:0,windowMinutes:60,truncated:false});
  const insert=calls.find(c=>c.sql.includes('INSERT INTO sepay_transactions'));
  assert.ok(insert);assert.equal(insert.args[3],transaction().id);assert.match(insert.sql,/api_transaction_id/);
  assert.equal(insert.args[2],'MBBank:5130000000000');assert.equal(insert.args[9],'tkhPN8V');
  const second=await reconciler.reconcile(60);assert.equal(second.duplicates,1);
});

test('reconcile ignores wrong account and never imports ambiguous transfer code', async()=>{
  const calls=[];
  const db={query:async(sql,args=[])=>{calls.push({sql,args});if(sql.includes('SELECT id FROM sepay_transactions'))return [];return [];}};
  const reconciler=createSepayV2Reconciler(db,config,'sandbox-token-placeholder',async()=>response([
    transaction({id:'f9e8d7c6-b5a4-4321-8fed-cba098765433',account_number:'other'}),
    transaction({id:'f9e8d7c6-b5a4-4321-8fed-cba098765434',code:null,transaction_content:'tkhPN8V then tkhABC12'}),
  ]));
  const result=await reconciler.reconcile(30);
  assert.equal(result.scanned,2);assert.equal(result.ignored,1);assert.equal(result.reviewed,1);
  const inserts=calls.filter(c=>c.sql.includes('INSERT INTO'));assert.equal(inserts.length,1);assert.equal(inserts[0].args[13],'REVIEW');assert.equal(inserts[0].args[14],'PAYMENT_CODE_MISSING_OR_AMBIGUOUS');
});

test('reconcile validates bounded lookback before contacting SePay', async()=>{
  let called=false;
  const reconciler=createSepayV2Reconciler({query:async()=>[]},config,'sandbox-token-placeholder',async()=>{called=true;return response([]);});
  await assert.rejects(()=>reconciler.reconcile(4),e=>e.code==='SEPAY_V2_RANGE');
  assert.equal(called,false);
});

test('reconcile follows the documented page envelope and caps requests safely', async()=>{
  const pages=[],db={query:async()=>[]};
  const reconciler=createSepayV2Reconciler(db,config,'sandbox-token-placeholder',async(url)=>{
    const parsed=new URL(url);pages.push(parsed.searchParams.get('page'));
    const instant=key=>Date.parse(parsed.searchParams.get(key).replace(' ','T')+'+07:00');
    assert.equal(instant('transaction_date_to')-instant('transaction_date_from'),60*60000);
    return response([],parsed.searchParams.get('page')==='1');
  });
  const result=await reconciler.reconcile(60);
  assert.deepEqual(pages,['1','2']);assert.equal(result.scanned,0);
});
