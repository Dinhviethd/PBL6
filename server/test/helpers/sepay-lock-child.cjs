const {createDatabase}=require('../../dist/platform/database');
const u=new URL(process.env.TEST_DATABASE_URL);
if(u.hostname!=='127.0.0.1'||u.port!=='55432'||!/^\/eventhub_sepay_[a-f0-9]{12}_test$/.test(u.pathname))process.exit(2);
const db=createDatabase(u.toString(),false);
(async()=>{
 await db.start();
 await db.exclusive('sepay:v2:live',async()=>{
  process.send({locked:true});
  await new Promise(resolve=>process.on('message',message=>{if(message==='release')resolve()}));
 });
 await db.close();process.exit(0);
})().catch(()=>process.exit(1));
