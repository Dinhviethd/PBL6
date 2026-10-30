const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createApplication}=require('../dist/app');
const {createDatabase}=require('../dist/platform/database');
const {createHmac,randomUUID:uuid}=require('node:crypto');
const url=process.env.TEST_DATABASE_URL;
test('SePay buyer API on isolated PostgreSQL',{skip:!url,timeout:60000},async t=>{
  assert.match(new URL(url).pathname,/^\/eventhub_sepay_[a-f0-9]{12}_test$/);
  const config={databaseUrl:url,secret:'local-integration-secret'.repeat(3),qrSecret:'local-qr-secret'.repeat(3)};
  const sepay={environment:'test',bankCode:'MBBank',accountNumber:'TESTONLY',accountName:'LOCAL TEST ONLY',webhookSecret:'sepay-local-webhook-test-secret'.repeat(2)};
  assert.throws(()=>createApplication({...config,demo:true,sepay}),/disabled/);
  const app=createApplication({...config,sepay});await app.start();t.after(()=>app.close());
  const db=createDatabase(url);await db.start();t.after(()=>db.close());
  const server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
  t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const account=await app.auth.register({name:'SePay tester',email:randomUUID()+'@example.test',password:'Integration2026!'});
  const other=await app.auth.register({name:'Other',email:randomUUID()+'@example.test',password:'Integration2026!'});
  for(const role of ['ADMIN','ORGANIZER']) {
    await db.owner('auth').query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',[randomUUID(),role]);
    await db.owner('auth').query('INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',[account.user.idUser,role]);
  }
  const p=await app.auth.resolve(account.accessToken);
  async function call(method,path,body,token=account.accessToken){
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:r.status,body:await r.json()};
  }
  await t.test('maintenance blocks new payment POST while preserving reads and webhook verification',async()=>{
    const paused=createApplication({...config,sepay,sepayAcceptNewPayments:false});await paused.start();
    const listener=paused.app.listen(0,'127.0.0.1');await new Promise(r=>listener.on('listening',r));
    try{
      const root=`http://127.0.0.1:${listener.address().port}/api`;
      const headers={'Content-Type':'application/json',Authorization:'Bearer '+account.accessToken};
      const post=await fetch(root+'/sepay/orders/'+randomUUID()+'/payment',{method:'POST',headers,body:'{}'});
      assert.equal(post.status,503);assert.equal((await post.json()).code,'SEPAY_MAINTENANCE');
      assert.equal((await fetch(root+'/sepay/orders/'+randomUUID()+'/payment',{headers})).status,404);
      assert.equal((await fetch(root+'/payments/sepay/webhook',{method:'POST',headers,body:'{}'})).status,401);
      assert.equal((await fetch(root+'/health')).status,200);
    }finally{await new Promise(r=>listener.close(r));await paused.close()}
  });
  await t.test('API v2 reconciliation is admin-only and fails closed until a Sandbox token is configured',async()=>{
    assert.equal((await call('POST','/admin/sepay/reconcile',{})).status,503);
    assert.equal((await call('POST','/admin/sepay/reconcile',{},other.accessToken)).status,403);
    assert.equal((await call('POST','/admin/sepay/reconcile',{},null)).status,401);
    assert.equal((await call('POST','/admin/sepay/reconcile',{lookbackMinutes:1441})).status,400);
  });
  const cat=await call('POST','/admin/categories',{name:'SePay tests',slug:randomUUID()});assert.equal(cat.status,200);
  const end=new Date(Date.now()+86400000).toISOString();
  const event=await app.booking.saveEvent(p,{categoryId:cat.body.data.id,slug:randomUUID(),title:'SePay test',description:'Test',venueName:'Hall',address:'Address',cityCode:'DN',startsAt:new Date(Date.now()+3600000).toISOString(),endsAt:end,checkinOpensAt:new Date(Date.now()-3600000).toISOString(),checkinClosesAt:end});
  const type=await app.booking.configureType(p,event.id,{name:'Standard',description:'',price:'100001',capacity:100,saleStartsAt:new Date(Date.now()-3600000).toISOString(),saleEndsAt:end});
  await app.booking.submit(p,event.id);await app.booking.review(p,event.id,true,'');
  const order=()=>app.booking.createOrder(p,event.id,[{ticketTypeId:type.id,quantity:1}],randomUUID());
  const path=o=>'/sepay/orders/'+o.id+'/payment';
  const o=await order();
  await t.test('authentication, ownership, empty input and missing attempt',async()=>{
    assert.equal((await call('POST',path(o),{},null)).status,401);
    assert.equal((await call('POST',path(o),{},other.accessToken)).status,404);
    assert.equal((await call('GET',path(o))).status,404);
    assert.equal((await call('POST',path(o),{amount:'1'})).status,400);
  });
  let payment;
  await t.test('concurrent requests create one attempt, fixed amount and hold deadline',async()=>{
    const results=await Promise.all(Array.from({length:5},()=>call('POST',path(o),{})));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,200,200,200,201]);
    payment=results[0].body.data;assert.equal(payment.amount,'100001');
    assert.equal(new Set(results.map(r=>r.body.data.paymentId)).size,1);
    assert.equal(Date.parse(payment.holdUntil)-Date.parse(payment.expiresAt),900000);
    assert.match(payment.transferContent,/^tkh[A-Za-z0-9]{3,10}$/);
    const reservations=await db.owner('order').query('SELECT release_after FROM reservations WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[o.id]);
    assert.ok(reservations.every(r=>new Date(r.release_after).toISOString()===payment.holdUntil));
    assert.equal((await call('GET',path(o))).body.data.paymentId,payment.paymentId);
    assert.equal((await db.owner('order').query('SELECT status FROM orders WHERE id=$1',[o.id]))[0].status,'PENDING_PAYMENT');
  });
  await t.test('expired QR is hidden and retry does not reset deadlines',async()=>{
    await db.owner('payment').query("UPDATE payments SET created_at=now()-interval '2 minutes',provider_expires_at=now()-interval '1 minute' WHERE id=$1",[payment.paymentId]);
    const response=await call('POST',path(o),{});assert.equal(response.status,200);
    assert.equal(response.body.data.qrUrl,null);assert.equal(response.body.data.canTransfer,false);
    assert.equal(response.body.data.holdUntil,payment.holdUntil);
  });
  await t.test('expired order and closed sales cannot create payment',async()=>{
    const expired=await order();await db.owner('order').query("UPDATE orders SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE id=$1",[expired.id]);
    assert.equal((await call('POST',path(expired),{})).status,409);
    const closed=await order();await db.owner('event').query('UPDATE events SET sales_paused=true WHERE id=$1',[event.id]);
    assert.equal((await call('POST',path(closed),{})).status,409);
    await db.owner('event').query('UPDATE events SET sales_paused=false WHERE id=$1',[event.id]);
  });
  await t.test('legacy unresolved payment is rejected without modification',async()=>{
    const legacy=createApplication({...config,demo:true});await legacy.start();
    try {
      const pending=await order();await legacy.booking.startPayment(p,pending.id);
      const before=await db.owner('payment').query('SELECT * FROM payments WHERE order_id=$1',[pending.id]);
      assert.equal((await call('POST',path(pending),{})).status,409);
      assert.deepEqual(await db.owner('payment').query('SELECT * FROM payments WHERE order_id=$1',[pending.id]),before);
    } finally {await legacy.close();}
  });
  await t.test('released reservations cannot create an attempt',async()=>{
    const released=await order();
    await db.owner('order').query("UPDATE reservations SET status='RELEASED',released_at=now() WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)",[released.id]);
    assert.equal((await call('POST',path(released),{})).status,409);
  });
  await t.test('reference collision rolls back and accepts a different code',async()=>{
    const {createSepayPayments}=require('../dist/modules/payment/public');
    const target=await order();
    const {createDatabase}=require('../dist/platform/database');
    const isolated=createDatabase(url);await isolated.start();
    try {
      // The HTTP concurrency test covers the normal path; use a payment-store conflict
      // inside one UoW to prove rollback then retry without orphan details.
      const store=createSepayPayments(isolated.owner('payment'),sepay);
      const original=(await isolated.owner('order').query('SELECT * FROM orders WHERE id=$1',[target.id]))[0];
      await assert.rejects(()=>isolated.uow.run(()=>store.create(original,payment.transferContent)),e=>e.code==='23505');
      assert.equal((await isolated.owner('payment').query('SELECT id FROM payments WHERE order_id=$1',[target.id])).length,0);
      await isolated.uow.run(()=>store.create(original,'tkhCOLLIDE1'));
    } finally {await isolated.close();}
  });
  await t.test('GET polling is bounded per authenticated user',async()=>{
    let response;
    for(let i=0;i<31;i++) response=await call('GET',path(o));
    assert.equal(response.status,429);
  });
  async function webhook(payload, rawOverride=null, secret=sepay.webhookSecret) {
    const raw=rawOverride??Buffer.from(JSON.stringify(payload)),ts=String(Math.floor(Date.now()/1000));
    const signature='sha256='+createHmac('sha256',secret).update(ts+'.').update(raw).digest('hex');
    return fetch(base+'/payments/sepay/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':ts,'X-SePay-Signature':signature},body:raw});
  }
  const sepayPayload=(p,id)=>({id,gateway:'MBBank',transactionDate:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}),accountNumber:'TESTONLY',subAccount:null,code:p.transferContent,content:p.transferContent+' chuyen tien',transferType:'in',transferAmount:Number(p.amount),accumulated:0,description:'',referenceCode:'BANK-'+id});
  await t.test('webhook HMAC, durable ACK, idempotency and worker issue one ticket',async()=>{
    const paidOrder=await order(),created=await call('POST',path(paidOrder),{}),p=created.body.data,payload=sepayPayload(p,710001);
    const bad=await webhook(payload,null,'different-secret'.repeat(3));assert.equal(bad.status,401);
    const response=await webhook(payload);assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});
    const duplicates=await Promise.all([webhook(payload),webhook(payload)]);assert.deepEqual(duplicates.map(x=>x.status),[200,200]);
    assert.equal(await app.sepayWebhook.processBatch(10),1);
    assert.equal(await app.sepayWebhook.processBatch(10),0);
    const result=await db.owner('payment').query('SELECT status,payment_id FROM sepay_transactions WHERE webhook_transaction_id=$1',['710001']);assert.equal(result[0].status,'PROCESSED');
    assert.equal((await db.owner('order').query('SELECT status FROM orders WHERE id=$1',[paidOrder.id]))[0].status,'PAID');
    assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[paidOrder.id]))[0].n,'1');
    assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'SUCCEEDED');
    assert.equal((await db.owner('notification').query("SELECT count(*) AS n FROM notifications WHERE target_id=$1 AND kind='ORDER_PAID'",[paidOrder.id]))[0].n,'1');
    assert.equal((await db.owner('audit').query("SELECT count(*) AS n FROM audit_logs WHERE resource_id=$1 AND action='payment.verified'",[p.paymentId]))[0].n,'1');
    const conflict=await webhook({...payload,transferAmount:payload.transferAmount+1});assert.equal(conflict.status,200);
    assert.equal((await db.owner('payment').query("SELECT status,reason FROM sepay_transactions WHERE webhook_transaction_id='710001'"))[0].status,'REVIEW');
    assert.equal((await db.owner('payment').query('SELECT requires_review FROM payments WHERE id=$1',[p.paymentId]))[0].requires_review,true);
  });
  await t.test('mismatched amount and account enter REVIEW without issuing a ticket',async()=>{
    for(const [id,override] of [[710002,{transferAmount:1}],[710003,{accountNumber:'OTHER'}]]) {
      const pending=await order(),created=await call('POST',path(pending),{}),p=created.body.data,payload={...sepayPayload(p,id),...override};
      assert.equal((await webhook(payload)).status,200);await app.sepayWebhook.processBatch(10);
      assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'PENDING');
      assert.equal((await db.owner('payment').query('SELECT requires_review FROM payments WHERE id=$1',[p.paymentId]))[0].requires_review,id===710002);
      assert.equal((await db.owner('order').query('SELECT status FROM orders WHERE id=$1',[pending.id]))[0].status,'PENDING_PAYMENT');
      assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[pending.id]))[0].n,'0');
    }
  });
  await t.test('outgoing, missing/ambiguous code, late transfer, VA mismatch and released inventory enter REVIEW',async()=>{
    const scenarios=[
      [710005,{transferType:'out'},'TRANSFER_NOT_IN'],
      [710006,{code:null,content:'khong co ma'},'PAYMENT_CODE_MISSING_OR_AMBIGUOUS'],
      [710007,{code:null,content:'tkhAAA tkhBBB'},'PAYMENT_CODE_MISSING_OR_AMBIGUOUS'],
      [710008,{late:true},'LATE_TRANSFER'],
      [710009,{released:true},'RESERVATION_NOT_HELD'],
      [710010,{subAccount:'TEST-VA'},'ACCOUNT_MISMATCH'],
    ];
    for(const [id,override,reason] of scenarios){
      const pending=await order(),created=await call('POST',path(pending),{}),p=created.body.data;
      if(override.late) await db.owner('payment').query("UPDATE payments SET created_at=now()-interval '2 minutes',provider_expires_at=now()-interval '1 minute' WHERE id=$1",[p.paymentId]);
      if(override.released) await db.owner('order').query("UPDATE reservations SET status='RELEASED',released_at=now() WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)",[pending.id]);
      const payload={...sepayPayload(p,id),...override};delete payload.late;delete payload.released;
      assert.equal((await webhook(payload)).status,200);
      await app.sepayWebhook.processBatch(10);
      const tx=(await db.owner('payment').query('SELECT status,reason FROM sepay_transactions WHERE webhook_transaction_id=$1',[String(id)]))[0];
      assert.equal(tx.status,'REVIEW');assert.equal(tx.reason,reason);
      assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'PENDING');
      assert.equal((await db.owner('order').query('SELECT status FROM orders WHERE id=$1',[pending.id]))[0].status,'PENDING_PAYMENT');
      assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[pending.id]))[0].n,'0');
    }
  });
  await t.test('unknown code, wrong gateway, overpayment and cancelled order cannot issue tickets',async()=>{
    const scenarios=[
      [710011,{code:'tkhXYZ'},'PAYMENT_NOT_FOUND'],
      [710012,{gateway:'OtherBank'},'ACCOUNT_MISMATCH'],
      [710013,{transferAmount:100002},'AMOUNT_MISMATCH'],
      [710014,{cancelled:true},'RESERVATION_NOT_HELD'],
    ];
    for(const [id,override,reason] of scenarios){
      const pending=await order(),created=await call('POST',path(pending),{}),p=created.body.data;
      if(override.cancelled) await db.owner('order').query("UPDATE orders SET status='CANCELLED',closed_at=now(),close_reason='cancelled for acceptance test' WHERE id=$1",[pending.id]);
      const payload={...sepayPayload(p,id),...override};delete payload.cancelled;
      assert.equal((await webhook(payload)).status,200);await app.sepayWebhook.processBatch(10);
      const tx=(await db.owner('payment').query('SELECT status,reason FROM sepay_transactions WHERE webhook_transaction_id=$1',[String(id)]))[0];
      assert.equal(tx.status,'REVIEW');assert.equal(tx.reason,reason);
      assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'PENDING');
      assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[pending.id]))[0].n,'0');
    }
  });
  await t.test('two distinct deposits racing one payment issue exactly one ticket',async()=>{
    const pending=await order(),created=await call('POST',path(pending),{}),p=created.body.data;
    const payloads=[sepayPayload(p,710015),sepayPayload(p,710016)];
    assert.deepEqual((await Promise.all(payloads.map(x=>webhook(x)))).map(x=>x.status),[200,200]);
    await Promise.all([app.sepayWebhook.processBatch(10),app.sepayWebhook.processBatch(10)]);
    await app.sepayWebhook.processBatch(10);
    const states=(await db.owner('payment').query("SELECT status FROM sepay_transactions WHERE webhook_transaction_id IN ('710015','710016') ORDER BY status")).map(x=>x.status).sort();
    assert.deepEqual(states,['PROCESSED','REVIEW']);
    assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'SUCCEEDED');
    assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[pending.id]))[0].n,'1');
  });
  await t.test('failed durable insert is not ACKed; worker failure is retried without losing inbox',async()=>{
    const {DataSource}=require('typeorm'),raw=new DataSource({type:'postgres',url});await raw.initialize();
    try {
      await raw.query("CREATE FUNCTION sepay_test_fail_inbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'inbox unavailable'; END $$");
      await raw.query('CREATE TRIGGER sepay_test_fail_inbox BEFORE INSERT ON sepay_transactions FOR EACH ROW EXECUTE FUNCTION sepay_test_fail_inbox()');
      const noAck=await webhook(sepayPayload({transferContent:'tkhNoAck',amount:'100001'},710017));assert.equal(noAck.status,500);
      assert.equal((await db.owner('payment').query("SELECT count(*) AS n FROM sepay_transactions WHERE webhook_transaction_id='710017'"))[0].n,'0');
      await raw.query('DROP TRIGGER sepay_test_fail_inbox ON sepay_transactions');await raw.query('DROP FUNCTION sepay_test_fail_inbox()');

      const pending=await order(),created=await call('POST',path(pending),{}),p=created.body.data,payload=sepayPayload(p,710018);
      assert.equal((await webhook(payload)).status,200);
      await raw.query("CREATE FUNCTION sepay_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit temporarily unavailable'; END $$");
      await raw.query('CREATE TRIGGER sepay_test_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION sepay_test_fail_audit()');
      assert.equal(await app.sepayWebhook.processBatch(10),1);
      assert.equal((await db.owner('payment').query("SELECT status FROM sepay_transactions WHERE webhook_transaction_id='710018'"))[0].status,'ERROR');
      assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'PENDING');
      assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[pending.id]))[0].n,'0');
      await raw.query('DROP TRIGGER sepay_test_fail_audit ON audit_logs');await raw.query('DROP FUNCTION sepay_test_fail_audit()');
      await db.owner('payment').query("UPDATE sepay_transactions SET next_retry_at=now()-interval '1 second' WHERE webhook_transaction_id='710018'");
      assert.equal(await app.sepayWebhook.processBatch(10),1);
      assert.equal((await db.owner('payment').query("SELECT status FROM sepay_transactions WHERE webhook_transaction_id='710018'"))[0].status,'PROCESSED');
      assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[p.paymentId]))[0].status,'SUCCEEDED');
      assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[pending.id]))[0].n,'1');
    } finally {await raw.destroy();}
  });
  await t.test('expired processing lease is reclaimable',async()=>{
    const pending=await order(),created=await call('POST',path(pending),{}),p=created.body.data;
    const payload=sepayPayload(p,710004);assert.equal((await webhook(payload)).status,200);
    await db.owner('payment').query("UPDATE sepay_transactions SET status='PROCESSING',lease_until=now()-interval '1 second',lease_token=$1 WHERE webhook_transaction_id='710004'",[uuid()]);
    assert.equal(await app.sepayWebhook.processBatch(10),1);
    assert.equal((await db.owner('payment').query("SELECT status FROM sepay_transactions WHERE webhook_transaction_id='710004'"))[0].status,'PROCESSED');
  });
  await t.test('API v2 UUID and webhook ID link to one exact transaction and issue one ticket',async()=>{
    const paidOrder=await order(),created=await call('POST',path(paidOrder),{}),p=created.body.data,payload=sepayPayload(p,710099);
    const apiUuid=randomUUID(),integration='MBBank:TESTONLY',transactionAt=new Date(payload.transactionDate.replace(' ','T')+'+07:00');
    await db.owner('payment').query(`INSERT INTO sepay_transactions(id,environment,integration_account,api_transaction_id,reference_code,bank_code,account_number,transfer_type,amount,currency,payment_code,content,transaction_at,payload_hash,status,next_retry_at)
      VALUES($1,'test',$2,$3,$4,'MBBank','TESTONLY','in',$5,'VND',$6,$7,$8,$9,'RECEIVED',now())`,[randomUUID(),integration,apiUuid,payload.referenceCode,payload.transferAmount,payload.code,payload.content,transactionAt,'a'.repeat(64)]);
    assert.equal(await app.sepayWebhook.processBatch(10),1);
    const paid=(await db.owner('payment').query('SELECT status,provider_transaction_id FROM payments WHERE id=$1',[p.paymentId]))[0];
    assert.equal(paid.status,'SUCCEEDED');assert.equal(paid.provider_transaction_id,apiUuid);
    assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets t JOIN order_items oi ON oi.id=t.order_item_id WHERE oi.order_id=$1',[paidOrder.id]))[0].n,'1');
    assert.equal((await webhook(payload)).status,200);
    const linked=(await db.owner('payment').query('SELECT api_transaction_id,webhook_transaction_id,status FROM sepay_transactions WHERE api_transaction_id=$1',[apiUuid]))[0];
    assert.equal(linked.webhook_transaction_id,String(payload.id));assert.equal(linked.status,'PROCESSED');
    assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets t JOIN order_items oi ON oi.id=t.order_item_id WHERE oi.order_id=$1',[paidOrder.id]))[0].n,'1');
  });
  await t.test('synthetic Live API keeps Test attempts isolated and settles one ticket through HMAC inbox',async()=>{
    const liveConfig={...sepay,environment:'live',accountNumber:'123456789',webhookSecret:'synthetic-live-webhook-secret'.repeat(2)};
    const live=createApplication({...config,sepay:liveConfig,sepayApiV2Token:'synthetic-live-api-token',databaseSsl:false});
    await live.start();const listener=live.app.listen(0,'127.0.0.1');await new Promise(r=>listener.on('listening',r));
    const endpoint=`http://127.0.0.1:${listener.address().port}/api`;
    const request=async(method,route,body)=>{const r=await fetch(endpoint+route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+account.accessToken},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
    try {
      const testOrder=await order();assert.equal((await call('POST',path(testOrder),{})).status,201);
      assert.equal((await request('GET',path(testOrder))).status,404);
      assert.equal((await request('POST',path(testOrder),{})).status,409);
      const foreign=(await db.owner('payment').query("SELECT id FROM sepay_transactions WHERE environment='test' LIMIT 1"))[0];
      assert.equal((await request('GET','/admin/sepay/transactions/'+foreign.id)).status,404);
      assert.equal((await request('POST','/admin/sepay/transactions/'+foreign.id+'/reprocess',{})).status,404);
      const liveOrder=await order();const created=await request('POST',path(liveOrder),{});
      assert.equal(created.status,201);const payment=created.body.data;assert.equal(payment.environment,'live');
      assert.equal((await request('POST',path(liveOrder),{})).body.data.paymentId,payment.paymentId);
      const payload={...sepayPayload(payment,719999),accountNumber:liveConfig.accountNumber};
      const raw=Buffer.from(JSON.stringify(payload)),ts=String(Math.floor(Date.now()/1000));
      const signature='sha256='+createHmac('sha256',liveConfig.webhookSecret).update(ts+'.').update(raw).digest('hex');
      for(let i=0;i<2;i++)assert.equal((await fetch(endpoint+'/payments/sepay/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':ts,'X-SePay-Signature':signature},body:raw})).status,200);
      assert.equal(await live.sepayWebhook.processBatch(10),1);assert.equal(await live.sepayWebhook.processBatch(10),0);
      assert.equal((await request('GET',path(liveOrder))).body.data.status,'SUCCEEDED');
      assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[liveOrder.id]))[0].n,'1');
      const recoveredOrder=await order(),intent=await request('POST',path(recoveredOrder),{}),rp=intent.body.data;
      assert.equal(intent.status,201);
      const apiId=uuid(),realFetch=globalThis.fetch;let apiCalls=0;
      globalThis.fetch=async(input,init)=>{
        if(String(input).startsWith('https://userapi.sepay.vn/v2/transactions?')) {
          apiCalls++;assert.equal(init.method,'GET');
          return new Response(JSON.stringify({status:'success',data:[{id:apiId,transaction_date:new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),account_number:liveConfig.accountNumber,va:null,transfer_type:'in',amount_in:Number(rp.amount),amount_out:0,transaction_content:rp.transferContent,reference_number:'L3-RECOVERY',code:rp.transferContent,bank_brand_name:'MBBank',bank_account_id:uuid(),va_id:null}],meta:{pagination:{has_more:false}}}));
        }
        return realFetch(input,init);
      };
      try {
        assert.equal((await request('POST','/admin/sepay/reconcile',{token:'must-not-be-accepted'})).status,400);
        const recovered=await request('POST','/admin/sepay/reconcile',{lookbackMinutes:60});assert.equal(recovered.status,200);assert.equal(recovered.body.data.imported,1);
        await live.sepayWebhook.processBatch(10);
        assert.equal((await request('GET',path(recoveredOrder))).body.data.status,'SUCCEEDED');
        assert.equal((await request('POST','/admin/sepay/reconcile',{})).body.data.duplicates,1);assert.equal(apiCalls,2);
        assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[recoveredOrder.id]))[0].n,'1');
      } finally {globalThis.fetch=realFetch}
    } finally {await new Promise(r=>listener.close(r));await live.close()}
  });
  await t.test('malformed signed webhook is rejected and no inbox row is written',async()=>{
    const before=(await db.owner('payment').query('SELECT count(*) AS n FROM sepay_transactions'))[0].n;
    const r=await webhook({},Buffer.from('{invalid json'));assert.equal(r.status,400);
    assert.equal((await db.owner('payment').query('SELECT count(*) AS n FROM sepay_transactions'))[0].n,before);
  });
  await t.test('Unicode webhook accepts signed raw bytes; null and invalid UTF-8 are 400',async()=>{
    const payload=sepayPayload({transferContent:'tkhUTF8',amount:'100001'},720001);
    payload.content='Thanh toán vé tkhUTF8 — Nguyễn';payload.description='Chuyển khoản';
    assert.equal((await webhook(payload)).status,200);
    assert.equal((await webhook({},Buffer.from('null'))).status,400);
    assert.equal((await webhook({},Buffer.from([0xff,0xfe]))).status,400);
    await app.sepayWebhook.processBatch(100);
  });
  await t.test('duplicate HMAC headers are rejected before inbox write',async()=>{
    const http=require('node:http'),raw=JSON.stringify(sepayPayload({transferContent:'tkhDupHdr',amount:'100001'},720004));
    const ts=String(Math.floor(Date.now()/1000)),sig='sha256='+createHmac('sha256',sepay.webhookSecret).update(ts+'.').update(raw).digest('hex');
    const status=await new Promise((resolve,reject)=>{const req=http.request(base+'/payments/sepay/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':ts,'X-SePay-Signature':[sig,sig]}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode))});req.on('error',reject);req.end(raw)});
    assert.equal(status,401);
    assert.equal((await db.owner('payment').query("SELECT count(*) AS n FROM sepay_transactions WHERE webhook_transaction_id='720004'"))[0].n,'0');
  });
  await t.test('admin filters use transaction time and exact reference with bounded pagination',async()=>{
    const result=await call('GET','/admin/sepay/transactions?reference=BANK-720001&from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z&limit=1');
    assert.equal(result.status,200);assert.equal(result.body.data.length,1);assert.equal(result.body.data[0].reference_code,'BANK-720001');
    assert.equal((await call('GET','/admin/sepay/transactions?reference=does-not-exist')).body.data.length,0);
    assert.equal((await call('GET','/admin/sepay/transactions?from=2099-01-01T00:00:00Z&to=2020-01-01T00:00:00Z')).status,400);
    assert.equal((await call('GET','/admin/sepay/transactions?from=bad')).status,400);
    assert.equal((await call('GET','/admin/sepay/transactions?limit=101')).status,400);
  });
  await t.test('reprocess and audit are atomic if review insert fails',async()=>{
    const tx=(await db.owner('payment').query("SELECT id,status FROM sepay_transactions WHERE webhook_transaction_id='720001'"))[0];
    assert.equal(tx.status,'REVIEW');
    const {DataSource}=require('typeorm'),raw=new DataSource({type:'postgres',url});await raw.initialize();
    try {
      await raw.query("CREATE FUNCTION sepay_test_fail_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic review failure'; END $$");
      await raw.query('CREATE TRIGGER sepay_test_fail_review BEFORE INSERT ON sepay_transaction_reviews FOR EACH ROW EXECUTE FUNCTION sepay_test_fail_review()');
      assert.equal((await call('POST',`/admin/sepay/transactions/${tx.id}/reprocess`,{})).status,500);
      assert.equal((await db.owner('payment').query('SELECT status FROM sepay_transactions WHERE id=$1',[tx.id]))[0].status,'REVIEW');
    } finally {await raw.query('DROP TRIGGER IF EXISTS sepay_test_fail_review ON sepay_transaction_reviews');await raw.query('DROP FUNCTION IF EXISTS sepay_test_fail_review()');await raw.destroy()}
  });
  await t.test('stale claimed snapshot cannot settle payment after lease replacement',async()=>{
    const pending=await order(),created=await call('POST',path(pending),{}),payment=created.body.data;
    assert.equal((await webhook(sepayPayload(payment,720002))).status,200);
    const {createSepayPayments}=require('../dist/modules/payment/public');
    const store=createSepayPayments(db.owner('payment'),sepay);
    const [claim]=await db.uow.run(()=>store.claim(1));assert.ok(claim);
    await db.owner('payment').query('UPDATE sepay_transactions SET lease_token=$2 WHERE id=$1',[claim.id,uuid()]);
    const {createSepayWebhook}=require('../dist/workflows/sepay-webhook');
    const stale=createSepayWebhook({...store,claim:async()=>[claim]},app.payments,app.orders,app.uow,app.notifications,{append:async()=>{throw Error('stale worker must not audit')}});
    await stale.processBatch(1);
    assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[payment.paymentId]))[0].status,'PENDING');
    await db.owner('payment').query("UPDATE sepay_transactions SET lease_until=now()-interval '1 second' WHERE id=$1",[claim.id]);
    await app.sepayWebhook.processBatch(10);
    assert.equal((await db.owner('payment').query('SELECT status FROM payments WHERE id=$1',[payment.paymentId]))[0].status,'SUCCEEDED');
  });
  await t.test('ambiguous API matches still persist webhook as REVIEW before ACK',async()=>{
    const payload=sepayPayload({transferContent:'tkhAmbig',amount:'100001'},720003);
    for(let i=0;i<2;i++)await db.owner('payment').query(`INSERT INTO sepay_transactions(id,environment,integration_account,api_transaction_id,reference_code,bank_code,account_number,transfer_type,amount,currency,payment_code,content,transaction_at,payload_hash,status,reason)
      VALUES($1,'test','MBBank:TESTONLY',$2,$3,'MBBank','TESTONLY','in',$4,'VND',$5,$6,$7,$8,'REVIEW','SYNTHETIC')`,[uuid(),uuid(),payload.referenceCode,payload.transferAmount,payload.code,payload.content,new Date(payload.transactionDate.replace(' ','T')+'+07:00'),'a'.repeat(64)]);
    assert.equal((await webhook(payload)).status,200);
    const rows=await db.owner('payment').query("SELECT status,reason FROM sepay_transactions WHERE webhook_transaction_id='720003'");
    assert.equal(rows.length,1);assert.equal(rows[0].status,'REVIEW');assert.equal(rows[0].reason,'API_WEBHOOK_MATCH_AMBIGUOUS');
  });
  await t.test('admin review APIs require ADMIN and never issue tickets manually',async()=>{
    const tx=(await db.owner('payment').query("SELECT id,payment_id FROM sepay_transactions WHERE webhook_transaction_id='710001'"))[0];
    const listing=await call('GET','/admin/sepay/transactions');assert.equal(listing.status,200);assert.equal(JSON.stringify(listing.body).includes('TESTONLY'),false);
    assert.equal((await call('GET','/admin/sepay/transactions',undefined,other.accessToken)).status,403);
    const detail=await call('GET',`/admin/sepay/transactions/${tx.id}`);assert.equal(detail.status,200);
    const resolved=await call('POST',`/admin/sepay/transactions/${tx.id}/resolve`,{outcome:'confirmed_external',reason:'Checked against bank dashboard'});assert.equal(resolved.status,200);
    assert.equal((await call('POST',`/admin/sepay/transactions/${tx.id}/reprocess`,{})).status,200);
    assert.equal(await app.sepayWebhook.processBatch(10),1);
    const paidOrder=(await db.owner('payment').query('SELECT order_id,status FROM payments WHERE id=$1',[tx.payment_id]))[0];
    assert.equal(paidOrder.status,'SUCCEEDED');
    assert.equal((await db.owner('order').query('SELECT count(*) AS n FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[paidOrder.order_id]))[0].n,'1');
  });
});
