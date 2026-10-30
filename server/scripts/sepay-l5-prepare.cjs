// One authorized real-transfer case. Retain financial history; no automatic cleanup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
async function main(){
 assert.equal(process.argv[2],'--agreed-10000-retained');
 const dir=path.resolve('../.local/sepay-l5');fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,'case.json');assert.ok(!fs.existsSync(file),'An L5 case already exists; inspect it before retrying');
 const env=require('dotenv').parse(fs.readFileSync('.env'));
 const config=require('../dist/configs/sepay-runtime').loadRuntimeConfig(env);assert.equal(env.SEPAY_ENV,'live');assert.ok(config.worker);
 const app=require('../dist/app').createApplication(config.app);
 const db=new(require('pg').Client)({connectionString:config.app.databaseUrl,ssl:config.app.databaseSsl});
 await db.connect();await app.start();
 const record={run:randomUUID(),amount:'10000',fundsDisposition:'retained_by_user',createdAt:new Date().toISOString(),users:[]};
 const save=()=>fs.writeFileSync(file,JSON.stringify(record,null,2));save();
 try{
  const accounts=[];
  for(const kind of ['organizer','buyer']){
   const password=randomBytes(32).toString('hex'),email=`l5-${record.run}-${kind}@example.test`;
   const account=await app.auth.register({name:`L5 acceptance ${kind}`,email,password});accounts.push(account);record.users.push(account.user.idUser);save();
   fs.writeFileSync(path.join(dir,`${kind}-private.json`),JSON.stringify({email,password,accessToken:account.accessToken}));
  }
  const [organizer,buyer]=accounts;
  await db.query(`INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code IN ('ADMIN','ORGANIZER')`,[record.users[0]]);
  async function api(route,body,token){const r=await fetch('http://127.0.0.1:8011/api'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});assert.ok(r.ok,`HTTP ${r.status}`);return (await r.json()).data}
  record.category=(await api('/admin/categories',{name:'L5 controlled Live acceptance',slug:record.run},organizer.accessToken)).id;save();
  const principal=await app.auth.resolve(organizer.accessToken),end=new Date(Date.now()+86400000).toISOString();
  const event=await app.booking.saveEvent(principal,{categoryId:record.category,slug:record.run,title:'L5 controlled transfer — reserved test',description:'Authorized 10000 VND acceptance; retain financial history',venueName:'Private acceptance',address:'Private acceptance',cityCode:'DN',startsAt:new Date(Date.now()+7200000).toISOString(),endsAt:end,checkinOpensAt:new Date(Date.now()+3600000).toISOString(),checkinClosesAt:end});record.event=event.id;save();
  const type=await app.booking.configureType(principal,event.id,{name:'Single acceptance ticket',description:'User-controlled transfer',price:'10000',capacity:1,saleStartsAt:new Date(Date.now()-60000).toISOString(),saleEndsAt:end});
  await app.booking.submit(principal,event.id);await app.booking.review(principal,event.id,true,'');
  record.order=(await app.booking.createOrder(await app.auth.resolve(buyer.accessToken),event.id,[{ticketTypeId:type.id,quantity:1}],record.run)).id;save();
  const payment=await api(`/sepay/orders/${record.order}/payment`,{},buyer.accessToken);assert.equal(payment.amount,'10000');assert.equal(payment.environment,'live');assert.ok(payment.canTransfer);
  record.payment=payment.paymentId;record.expiresAt=payment.expiresAt;record.transferContent=payment.transferContent;save();
  fs.writeFileSync(path.join(dir,'payment-private.json'),JSON.stringify(payment,null,2));
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fs.writeFileSync(path.join(dir,'transfer.html'),`<!doctype html><meta charset="utf-8"><title>L5 — 10.000 VND</title><h1>Chuyển đúng 10.000 VND — chỉ một lần</h1><p>MBBank: ${escape(payment.accountName)} — ${escape(payment.accountNumber)}</p><p>Nội dung: <strong>${escape(payment.transferContent)}</strong></p><p>Hết hạn: ${escape(new Date(payment.expiresAt).toLocaleString('vi-VN',{timeZone:'Asia/Saigon'}))} (UTC+7)</p><p>Đối chiếu tên người nhận, số tiền và nội dung trong ứng dụng ngân hàng trước khi xác nhận. Không chuyển sau hạn hoặc dùng QR L4 cũ.</p><img width="360" src="${escape(payment.qrUrl)}" alt="QR chuyển khoản"><p>Tiền giữ lại trong tài khoản; đây là giao dịch thật.</p>`);
  // Remove elevated fixture roles once setup has finished; retain the buyer and financial records.
  await db.query(`DELETE FROM users_roles WHERE "idUser"=$1 AND "idRole" IN (SELECT "idRole" FROM roles WHERE code='ADMIN')`,[record.users[0]]);
  console.log(JSON.stringify({prepared:true,amount:record.amount,content:record.transferContent,expiresAt:record.expiresAt,instructions:'.local/sepay-l5/transfer.html'}));
 }finally{await app.close();await db.end()}
}
main().catch(e=>{console.error(JSON.stringify({prepare:'failed',code:e.code||e.name}));process.exitCode=1});
