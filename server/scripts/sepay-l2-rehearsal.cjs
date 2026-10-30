// Creates a fresh, synthetic-only PG17 container. Never loads application dotenv.
const {execFileSync,spawnSync}=require('node:child_process');
const {randomBytes,randomUUID,createHash}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Client}=require('pg'),{DataSource}=require('typeorm');
const root=path.resolve(__dirname,'../..');
const baseline=['InitialMvp1790812800000','EventCheckinStaff1791072000000','Notifications1791331200000','WaitQueue1792627200000'];
const version='SepayLiveFoundation1793319300000';
const classes=names=>names.map(n=>require('../dist/migrations/'+n)[n]);
const runId=randomBytes(6).toString('hex'),container='eventhub-sepay-l2-'+runId;
const adminPassword=randomBytes(24).toString('hex'),ownerPassword=randomBytes(24).toString('hex');
const results=[];let admin;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
function options(database='postgres',owner=false){return {host:'127.0.0.1',port:55434,user:owner?'l2_owner':'postgres',password:owner?ownerPassword:adminPassword,database,ssl:false,connectionTimeoutMillis:3000}}
async function connect(database,owner){const c=new Client(options(database,owner));await c.connect();return c}
async function source(database,names){const c=options(database,true);const ds=new DataSource({type:'postgres',host:c.host,port:c.port,username:c.user,password:c.password,database,ssl:false,synchronize:false,migrations:classes(names)});await ds.initialize();return ds}
async function migrate(database){const ds=await source(database,[...baseline,version]);try{return await ds.runMigrations({transaction:'all'})}finally{await ds.destroy()}}
async function fresh(){const name='eventhub_sepay_'+randomBytes(6).toString('hex')+'_test';await admin.query(`CREATE DATABASE "${name}" OWNER l2_owner`);const ds=await source(name,baseline);try{await ds.runMigrations({transaction:'all'})}finally{await ds.destroy()}const c=await connect(name,true);await c.query('GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role');await c.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role');await c.query('INSERT INTO roles("idRole",code,name) VALUES($1,$2,$3)',[randomUUID(),'L2_SENTINEL','Synthetic preservation fixture']);await c.end();return name}
const tables=['sepay_payment_details','sepay_transactions','sepay_transaction_reviews'];
async function fingerprint(c){
 const names=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'sepay_%' AND tablename <> 'migrations' ORDER BY tablename")).rows.map(r=>r.tablename);
 const rows=[];
 for(const name of names){assert.match(name,/^[a-z_]+$/);const data=(await c.query(`SELECT coalesce(json_agg(s ORDER BY s::text)::text,'[]') AS data FROM (SELECT row_to_json(t) AS s FROM public."${name}" t) q`)).rows[0];rows.push([name,data.data])}
 const metadata=(await c.query(`SELECT c.relname,c.relacl::text,c.relrowsecurity,c.relowner::regrole::text,
   (SELECT json_agg(pg_get_constraintdef(k.oid) ORDER BY k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid) AS constraints,
   (SELECT json_agg(pg_get_indexdef(i.indexrelid) ORDER BY i.indexrelid) FROM pg_index i WHERE i.indrelid=c.oid) AS indexes,
   (SELECT json_agg(json_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT LIKE 'sepay_%' AND c.relname<>'migrations' ORDER BY c.relname`)).rows;
 const defaults=(await c.query('SELECT defaclrole::regrole::text,defaclobjtype,defaclacl::text FROM pg_default_acl ORDER BY oid')).rows;
 return createHash('sha256').update(JSON.stringify({rows,metadata,defaults})).digest('hex');
}
async function noPartial(name){const c=await connect(name,true);try{assert.equal((await c.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sepay_%'")).rows[0].n,0);assert.equal((await c.query('SELECT count(*)::int n FROM migrations')).rows[0].n,4)}finally{await c.end()}}
async function check(name,work){await work();results.push({name,status:'PASS'});console.log('PASS:',name)}
async function main(){
 for(const key of ['DATABASE_URL','TEST_DATABASE_URL'])if(process.env[key])throw Error('Ambient database target is forbidden');
 docker(['run','-d','--name',container,'--label','eventhub.purpose=sepay-l2-synthetic','-p','127.0.0.1:55434:5432','-e','POSTGRES_PASSWORD='+adminPassword,'postgres:17-alpine']);
 const inspected=JSON.parse(docker(['inspect',container]))[0];assert.equal(inspected.Config.Image,'postgres:17-alpine');assert.equal(inspected.Config.Labels['eventhub.purpose'],'sepay-l2-synthetic');assert.deepEqual(inspected.NetworkSettings.Ports['5432/tcp'],[{HostIp:'127.0.0.1',HostPort:'55434'}]);
 for(let i=0;i<40;i++){try{admin=await connect();break}catch{await new Promise(r=>setTimeout(r,500))}}assert.ok(admin);
 const pgVersion=(await admin.query('SHOW server_version')).rows[0].server_version;assert.match(pgVersion,/^17\./);
 await admin.query(`CREATE ROLE l2_owner LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${ownerPassword}'`);
 await admin.query('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS');
 const mainDb=await fresh();const c=await connect(mainDb,true);
 let before;
 await check('non-superuser owner and synthetic wide default ACL',async()=>{
  const role=(await c.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);
  await c.query('BEGIN');await c.query('CREATE TABLE public.l2_acl_probe(id int)');
  assert.equal((await c.query("SELECT has_table_privilege('service_role','public.l2_acl_probe','MAINTAIN') AS allowed")).rows[0].allowed,true);await c.query('ROLLBACK');before=await fingerprint(c);
 });
 await check('commit migration, preserve old data/schema/ACL/default ACL and history',async()=>{
  const old=(await c.query('SELECT * FROM migrations ORDER BY id')).rows;
  const applied=await migrate(mainDb);assert.deepEqual(applied.map(m=>m.name),[version]);
  assert.equal(await fingerprint(c),before);assert.deepEqual((await c.query('SELECT * FROM migrations ORDER BY id LIMIT 4')).rows,old);
  assert.equal((await c.query('SELECT count(*)::int n FROM migrations')).rows[0].n,5);
 });
 await check('RLS enabled, API roles denied every privilege including MAINTAIN; owner can write',async()=>{
  for(const table of tables){
   assert.equal((await c.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity,true);
   for(const role of ['anon','authenticated','service_role'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])
    assert.equal((await c.query('SELECT has_table_privilege($1,$2,$3) allowed',[role,'public.'+table,privilege])).rows[0].allowed,false);
  }
  const audit=await connect(mainDb,false);
  try{for(const role of ['anon','authenticated','service_role'])for(const table of tables){await audit.query('BEGIN');await audit.query('SET LOCAL ROLE '+role);await assert.rejects(()=>audit.query('SELECT * FROM public.'+table),e=>e.code==='42501');await audit.query('ROLLBACK')}}finally{await audit.end()}
  await c.query(`INSERT INTO sepay_transactions(id,environment,integration_account,webhook_transaction_id,bank_code,account_number,transfer_type,amount,content,transaction_at,payload_hash,status) VALUES($1,'live','MBBank:SYNTHETIC','1','MBBank','SYNTHETIC','in',1,'synthetic',now(),$2,'RECEIVED')`,[randomUUID(),'a'.repeat(64)]);
 });
 await check('runner rerun skips recorded migration; direct invocation rejects history drift',async()=>{
  assert.equal((await migrate(mainDb)).length,0);const ds=await source(mainDb,[]);const q=ds.createQueryRunner();await q.connect();await q.startTransaction();
  try{await assert.rejects(()=>new (classes([version])[0])().up(q),/Unexpected migration history/);await q.rollbackTransaction()}finally{await q.release();await ds.destroy()}
  assert.equal((await c.query('SELECT count(*)::int n FROM migrations')).rows[0].n,5);
 });
 await check('RLS default deny remains effective if SELECT is temporarily granted',async()=>{
  const x=await connect(mainDb,false);
  try {await x.query('BEGIN');await x.query('GRANT SELECT ON public.sepay_transactions TO authenticated');await x.query('SET LOCAL ROLE authenticated');
   assert.equal((await x.query('SELECT count(*)::int n FROM public.sepay_transactions')).rows[0].n,0);await x.query('ROLLBACK');
  } finally {await x.end()}
 });
 await check('required indexes exist and migration rejects missing transaction',async()=>{
  for(const index of ['sepay_transactions_work_idx','sepay_transactions_payment_idx','sepay_transactions_code_idx','sepay_transactions_received_idx','sepay_reviews_transaction_idx'])
   assert.ok((await c.query('SELECT to_regclass($1) name',['public.'+index])).rows[0].name);
  const ds=await source(mainDb,[]),q=ds.createQueryRunner();await q.connect();
  try {await assert.rejects(()=>new (classes([version])[0])().up(q),/enclosing transaction/)}finally{await q.release();await ds.destroy()}
 });
 await c.end();
 await check('object collision rolls back all new objects and does not record history',async()=>{
  const name=await fresh(),x=await connect(name,true);await x.query('CREATE TABLE public.sepay_transactions(id int)');
  await assert.rejects(()=>migrate(name),e=>e.code==='42P07');assert.equal((await x.query("SELECT to_regclass('public.sepay_payment_details') AS relation")).rows[0].relation,null);
  assert.equal((await x.query('SELECT count(*)::int n FROM migrations')).rows[0].n,4);await x.end();
 });
 await check('parent lock contention times out and rollback leaves baseline intact',async()=>{
  const name=await fresh(),holder=await connect(name,true);await holder.query('BEGIN');await holder.query('LOCK TABLE public.payments IN ACCESS EXCLUSIVE MODE');
  const start=Date.now();try{await assert.rejects(()=>migrate(name),e=>e.code==='55P03');assert.ok(Date.now()-start<10000)}finally{await holder.query('ROLLBACK');await holder.end()}
  await noPartial(name);
 });
 await check('late failure after DDL rolls back schema and permits clean retry',async()=>{
  const name=await fresh(),ds=await source(name,[]),q=ds.createQueryRunner();await q.connect();await q.startTransaction();
  try{await new (classes([version])[0])().up(q);await assert.rejects(()=>q.query('SELECT 1/0'),e=>e.code==='22012');await q.rollbackTransaction()}finally{await q.release();await ds.destroy()}
  await noPartial(name);assert.equal((await migrate(name)).length,1);
 });
 // Existing suites create only synthetic fixtures and use the non-superuser table owner.
 const testUrl=`postgresql://l2_owner:${ownerPassword}@127.0.0.1:55434/${mainDb}`;
 const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,NODE_ENV:'test',DB_SSL:'false',TEST_DATABASE_URL:testUrl};
 const files=['integration.test.cjs','sepay.integration.test.cjs','vnpay.integration.test.cjs','sepay.test.cjs','sepay-v2.test.cjs','sepay-live-config.test.cjs','vnpay.test.cjs'];
 await check('PG17 owner-runtime API regression on hardened migration',async()=>{
  const run=spawnSync(process.execPath,['--test','--test-concurrency=1',...files.map(f=>path.join(__dirname,'../test',f))],{cwd:root,env,encoding:'utf8'});
  const dir=path.join(root,'.local/sepay-l2');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,runId+'-tests.log'),run.stdout+run.stderr);
  console.log((run.stdout||'').split('\n').filter(l=>/tests |pass |fail |skipped |not ok|✖/.test(l)).join('\n'));
  assert.equal(run.status,0,'Regression failed; inspect ignored local log');
 });
 const dir=path.join(root,'.local/sepay-l2');fs.mkdirSync(dir,{recursive:true});
 const summary={container,pgVersion,mainDb,preservationSha256:before,results};
 fs.writeFileSync(path.join(dir,runId+'-result.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}
main().catch(error=>{console.error('L2 rehearsal failed:',error.code||error.name,error.message?.includes('Regression failed')?'Regression failed':'');process.exitCode=1}).finally(async()=>{if(admin)await admin.end()});
