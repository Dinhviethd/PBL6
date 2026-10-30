const {test}=require('node:test'), assert=require('node:assert/strict');
const {validSepayCode,newSepayCode,sepayQrUrl,validateSepayConfig,verifySepayHmac,parseSepayWebhook,extractSepayCode}=require('../dist/modules/payment/sepay');
const {assertOwned}=require('../dist/platform/database');
test('SePay lowercase prefix and every permitted suffix length',()=>{
  for(let n=3;n<=10;n++) assert.ok(validSepayCode('tkh'+'a1B'.repeat(4).slice(0,n)));
  for(const value of ['TKHabc','tkhab','tkh12345678901','tkhab_','tkhắbc']) assert.equal(validSepayCode(value),false);
  for(let n=0;n<300;n++) assert.ok(validSepayCode(newSepayCode()));
});
test('SePay QR preserves exact integer VND and reference',()=>{
  const url=new URL(sepayQrUrl('TESTONLY','100001','tkha1B'));
  assert.equal(url.searchParams.get('amount'),'100001');assert.equal(url.searchParams.get('des'),'tkha1B');
  assert.equal(url.searchParams.get('bank'),'MBBank');assert.equal(url.searchParams.get('acc'),'TESTONLY');
  for(const amount of ['0','-1','1.5','9007199254740992']) assert.throws(()=>sepayQrUrl('TESTONLY',amount,'tkhabc'));
  assert.throws(()=>validateSepayConfig({environment:'live'}));
});
test('SePay tables stay under payment ownership',()=>{
  for(const table of ['sepay_payment_details','sepay_transactions','sepay_transaction_reviews']) {
    assert.doesNotThrow(()=>assertOwned('payment',`SELECT * FROM ${table}`));
    assert.throws(()=>assertOwned('order',`SELECT * FROM ${table}`));
  }
});
test('HMAC signs exact raw bytes and rejects timestamps outside five minutes',()=>{
  const {createHmac}=require('node:crypto'),secret='unit-test-secret'.repeat(3),raw=Buffer.from('{ "x": "á" }'),now=1793289600,ts=String(now);
  const sig='sha256='+createHmac('sha256',secret).update(ts+'.').update(raw).digest('hex');
  assert.equal(verifySepayHmac(raw,ts,sig,secret,now),true);
  assert.equal(verifySepayHmac(Buffer.from('{"x":"á"}'),ts,sig,secret,now),false);
  assert.equal(verifySepayHmac(raw,String(now-301),sig,secret,now),false);
  assert.equal(verifySepayHmac(raw,String(now+301),sig,secret,now),false);
  assert.equal(verifySepayHmac(raw,undefined,sig,secret,now),false);
  assert.equal(verifySepayHmac(raw,ts,undefined,secret,now),false);
  assert.equal(verifySepayHmac(raw,ts,'sha256='+sig.slice(7,70)+'0',secret,now),false);
  assert.equal(verifySepayHmac(raw,ts,sig,secret+'x',now),false);
});
test('webhook payload validates optional nulls, timezone date and safe amount',()=>{
  const f={id:100,gateway:'MBBank',transactionDate:'2026-10-29 15:00:00',accountNumber:'TESTONLY',subAccount:null,code:null,content:'tkhAb3 chuyen tien',transferType:'in',transferAmount:100001,accumulated:0,description:'',referenceCode:''};
  assert.equal(parseSepayWebhook(Buffer.from(JSON.stringify(f))).subAccount,null);
  assert.equal(extractSepayCode(f.content),'tkhAb3');
  assert.equal(extractSepayCode('tkhAb3 then tkhCd4'),null);
  for(const override of [{transferAmount:Number.MAX_SAFE_INTEGER+1},{transactionDate:'2026-02-30 12:00:00'},{subAccount:17},{transferType:'outgoing'},{content:5}])
    assert.throws(()=>parseSepayWebhook(Buffer.from(JSON.stringify({...f,...override}))));
  assert.throws(()=>parseSepayWebhook(Buffer.alloc(32769)));
  assert.equal(parseSepayWebhook(Buffer.from(JSON.stringify({...f,content:'Thanh toán vé tkhAb3 — Nguyễn',description:'Chuyển khoản'}))).content,'Thanh toán vé tkhAb3 — Nguyễn');
  for(const raw of [Buffer.from('null'),Buffer.from('[]'),Buffer.from([0xff,0xfe])])assert.throws(()=>parseSepayWebhook(raw));
});
