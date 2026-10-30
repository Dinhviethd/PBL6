// Explicitly authorized L4 fixture smoke; never fabricates a bank transaction.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto'),{spawnSync}=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
const evidence=path.resolve('../.local/sepay-l4/live-smoke.json');
async function main(){
 if(process.argv[2]!=='--authorized-fixtures')throw Error('Explicit fixture scope required');
 const env=require('dotenv').parse(fs.readFileSync('.env'));
 const config=require('../dist/configs/sepay-runtime').loadRuntimeConfig(env);
 assert.equal(env.SEPAY_ENV,'live');assert.ok(config.worker);
 const app=require('../dist/app').createApplication(config.app);
 const db=new (require('pg').Client)({connectionString:config.app.databaseUrl,ssl:config.app.databaseSsl});
 const resume=process.argv[3]==='--resume-cleanup';
 if(fs.existsSync(evidence)&&!resume)assert.equal(JSON.parse(fs.readFileSync(evidence)).cleaned,true,'Previous fixture requires cleanup');
 const run=randomUUID(),record=resume?JSON.parse(fs.readFileSync(evidence)):{run,startedAt:new Date().toISOString(),users:[],checks:[],cleaned:false};
 if(resume){assert.equal(record.cleaned,false);assert.ok(record.order&&record.payment&&record.event);assert.ok(record.checks.every(c=>c.pass));}
 await db.connect();await app.start();
 const save=()=>fs.writeFileSync(evidence,JSON.stringify(record,null,2));save();
 function call(name,method,route,body,token,expected){
   const lines=[`url = "http://127.0.0.1:8011/api${route}"`,`request = "${method}"`,'silent','show-error','max-time = 30','header = "Content-Type: application/json"'];
   if(token)lines.push(`header = "Authorization: Bearer ${token}"`);
   if(body!==undefined)lines.push(`data = ${JSON.stringify(JSON.stringify(body))}`);
   lines.push('write-out = "\\n%{http_code}"');
   const r=spawnSync('curl.exe',['--config','-'],{input:lines.join('\n'),encoding:'utf8',windowsHide:true});
   assert.equal(r.status,0,'curl failed');const split=r.stdout.lastIndexOf('\n');
   const status=Number(r.stdout.slice(split+1));let response;try{response=JSON.parse(r.stdout.slice(0,split))}catch{response={}}
   record.checks.push({name,status,expected,pass:status===expected});save();assert.equal(status,expected,name);return response.data;
 }
 try {
  if(!resume){
  const accounts=[];
  for(const name of ['admin','buyer','other']){
   const account=await app.auth.register({name:`L4 temporary ${name}`,email:`l4-${run}-${name}@example.test`,password:randomBytes(32).toString('hex')});
   accounts.push(account);record.users.push(account.user.idUser);save();
  }
  const [admin,buyer,other]=accounts;
  await db.query(`INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code IN ('ADMIN','ORGANIZER')`,[record.users[0]]);
  const principal=await app.auth.resolve(admin.accessToken),buyerPrincipal=await app.auth.resolve(buyer.accessToken);
  const category=call('create fixture category','POST','/admin/categories',{name:'L4 temporary smoke',slug:run},admin.accessToken,200);
  record.category=category.id;save();
  const end=new Date(Date.now()+86400000).toISOString();
  const event=await app.booking.saveEvent(principal,{categoryId:category.id,slug:run,title:'L4 temporary API verification — do not book',description:'Temporary authorized smoke fixture; no transfer requested',venueName:'L4 fixture',address:'L4 fixture',cityCode:'DN',startsAt:new Date(Date.now()+3600000).toISOString(),endsAt:end,checkinOpensAt:new Date(Date.now()-3600000).toISOString(),checkinClosesAt:end});
  record.event=event.id;save();
  const type=await app.booking.configureType(principal,event.id,{name:'L4 fixture',description:'No transfer',price:'10000',capacity:1,saleStartsAt:new Date(Date.now()-3600000).toISOString(),saleEndsAt:end});
  await app.booking.submit(principal,event.id);await app.booking.review(principal,event.id,true,'');
  const order=await app.booking.createOrder(buyerPrincipal,event.id,[{ticketTypeId:type.id,quantity:1}],run);
  record.order=order.id;save();const route=`/sepay/orders/${order.id}/payment`;
  call('buyer unauthenticated','GET',route,undefined,null,401);
  call('foreign buyer','GET',route,undefined,other.accessToken,404);
  call('reject amount override','POST',route,{amount:1},buyer.accessToken,400);
  const payment=call('create Live payment','POST',route,{},buyer.accessToken,201);record.payment=payment.paymentId;save();
  assert.equal(payment.environment,'live');assert.equal(payment.amount,'10000');
  assert.equal(call('reuse Live payment','POST',route,{},buyer.accessToken,200).paymentId,payment.paymentId);
  assert.equal(call('read Live payment','GET',route,undefined,buyer.accessToken,200).paymentId,payment.paymentId);
  call('buyer denied admin','GET','/admin/sepay/transactions',undefined,buyer.accessToken,403);
  call('admin list','GET','/admin/sepay/transactions',undefined,admin.accessToken,200);
  call('reject reconcile range','POST','/admin/sepay/reconcile',{lookbackMinutes:1441},admin.accessToken,400);
  const missing=randomUUID();
  call('missing transaction','GET',`/admin/sepay/transactions/${missing}`,undefined,admin.accessToken,404);
  call('missing reprocess','POST',`/admin/sepay/transactions/${missing}/reprocess`,{},admin.accessToken,404);
  call('missing resolve','POST',`/admin/sepay/transactions/${missing}/resolve`,{outcome:'unmatched',reason:'L4 missing transaction check'},admin.accessToken,404);
  call('unsigned webhook rejected','POST','/payments/sepay/webhook',{},null,401);
  }
  const state=await db.query('SELECT status FROM orders WHERE id=$1',[record.order]);assert.equal(state.rows[0].status,'PENDING_PAYMENT');
  assert.equal((await db.query('SELECT count(*) FROM tickets WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[record.order])).rows[0].count,'0');
  record.noPaymentOrTicketFabricated=true;record.passed=true;save();
  // Stop if any real bank record or foreign buyer references this fixture.
  await db.query('BEGIN');
  await db.query('SELECT id FROM events WHERE id=$1 FOR UPDATE',[record.event]);
  assert.equal((await db.query('SELECT count(*) FROM orders WHERE event_id=$1 AND buyer_id<>ALL($2::uuid[])',[record.event,record.users])).rows[0].count,'0');
  assert.equal((await db.query('SELECT count(*) FROM sepay_transactions WHERE payment_id=$1',[record.payment])).rows[0].count,'0');
  assert.equal((await db.query("SELECT count(*) FROM payments WHERE id=$1 AND status IN ('PENDING','UNKNOWN')",[record.payment])).rows[0].count,'1');
  await db.query('DELETE FROM sepay_payment_details WHERE payment_id=$1',[record.payment]);
  await db.query('DELETE FROM payments WHERE id=$1',[record.payment]);
  await db.query('DELETE FROM reservations WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1)',[record.order]);
  await db.query('DELETE FROM order_items WHERE order_id=$1',[record.order]);
  await db.query('DELETE FROM orders WHERE id=$1',[record.order]);
  await db.query('DELETE FROM ticket_types WHERE event_id=$1',[record.event]);
  await db.query('DELETE FROM event_reviews WHERE event_id=$1',[record.event]);
  await db.query('DELETE FROM events WHERE id=$1',[record.event]);
  await db.query('DELETE FROM categories WHERE id=$1',[record.category]);
  for(const table of ['notifications','auth_sessions'])await db.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`,[record.users]);
  await db.query('DELETE FROM audit_logs WHERE actor_id=ANY($1::uuid[])',[record.users]);
  await db.query('DELETE FROM users_roles WHERE "idUser"=ANY($1::uuid[])',[record.users]);
  await db.query('DELETE FROM users WHERE "idUser"=ANY($1::uuid[])',[record.users]);
  await db.query('COMMIT');record.cleaned=true;record.completedAt=new Date().toISOString();save();
  console.log(JSON.stringify({checks:record.checks.length,passed:true,cleaned:true}));
 }catch(e){await db.query('ROLLBACK');record.error={code:e.code||e.name};save();console.error(JSON.stringify({smoke:'failed',code:e.code||e.name,check:record.checks.at(-1),fixturesRetained:true}));process.exitCode=1}
 finally{await app.close();await db.end()}
}
main().catch(e=>{console.error(JSON.stringify({setup:'failed',code:e.code||e.name}));process.exitCode=1});
