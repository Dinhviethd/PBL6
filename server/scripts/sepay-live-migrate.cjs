// Dedicated reviewed SePay migration. Never invokes the shared migration runner.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {DataSource}=require('typeorm');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'.local/sepay-l4');
const version='SepayLiveFoundation1793319300000';
const expectedHash='AD0CC5DE900912E8B25C614BCDCF207864F647867011D04CBA9F44DAAFF486D9';
const baseline=['InitialMvp1790812800000','EventCheckinStaff1791072000000','Notifications1791331200000','WaitQueue1792627200000'];
const tables=['sepay_payment_details','sepay_transactions','sepay_transaction_reviews'];
const indexes=['sepay_transactions_work_idx','sepay_transactions_payment_idx','sepay_transactions_code_idx','sepay_transactions_received_idx','sepay_reviews_transaction_idx'];
const hash=value=>createHash('sha256').update(value).digest('hex');
function check(value,message){if(!value)throw Error(message)}
async function snapshot(q){
 const metadata=await q.query(`SELECT c.relname,c.relowner::regrole::text AS owner,c.relacl::text,c.relrowsecurity,
 (SELECT json_agg(json_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
 (SELECT json_agg(pg_get_constraintdef(k.oid) ORDER BY k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid) AS constraints,
 (SELECT json_agg(pg_get_indexdef(i.indexrelid) ORDER BY i.indexrelid) FROM pg_index i WHERE i.indrelid=c.oid) AS indexes
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT LIKE 'sepay_%' ORDER BY c.relname`);
 const data=[];
 for(const {relname} of metadata){
  if(relname==='migrations')continue;check(/^[A-Za-z_][A-Za-z0-9_]*$/.test(relname),'Unsupported table identifier');
  const rows=await q.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(digest,',' ORDER BY digest),'')) AS digest FROM (SELECT md5(row_to_json(t)::text) AS digest FROM public."${relname}" t) s`);
  data.push({table:relname,...rows[0]});
 }
 const defaults=await q.query('SELECT defaclrole::regrole::text,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl ORDER BY oid');
 return {schemaHash:hash(JSON.stringify(metadata)),dataHash:hash(JSON.stringify(data)),defaultAclHash:hash(JSON.stringify(defaults)),tables:metadata.length,counts:data.map(({table,count})=>({table,count}))};
}
async function main(){
 const mode=process.argv[2]||'preflight';check(['preflight','apply'].includes(mode),'Unsupported mode');
 const env=require('dotenv').parse(fs.readFileSync(path.join(root,'server/.env'))),url=new URL(env.DATABASE_URL);
 check(/\.supabase\.(com|co)$/.test(url.hostname),'Target must be Supabase');
 check([...url.searchParams.keys()].every(k=>['ssl','sslmode','sslrootcert','sslkey','sslcert'].includes(k)),'Unsafe URL override');url.search='';
 const targetHash=hash(`${url.hostname}:${url.port||'5432'}${url.pathname}:${url.username}`);
 const migrationHash=hash(fs.readFileSync(path.join(root,'server/src/migrations',version+'.ts'))).toUpperCase();check(migrationHash===expectedHash,'Migration hash differs from L2 review');
 fs.mkdirSync(dir,{recursive:true});
 if(mode==='apply'){
  check(process.argv[3]==='--apply-reviewed-sepay-only','Explicit migration switch required');
  const pre=JSON.parse(fs.readFileSync(path.join(dir,'preflight.json'),'utf8'));
  check(pre.targetHash===targetHash&&pre.migrationHash===migrationHash&&Date.now()-Date.parse(pre.at)<3600000,'Preflight expired or target changed');
 }
 const ds=new DataSource({type:'postgres',url:url.toString(),ssl:{ca:fs.readFileSync(path.join(root,'server/.local/certs/supabase-ca.crt'),'utf8'),rejectUnauthorized:true},synchronize:false,extra:{max:1,connectionTimeoutMillis:10000,statement_timeout:30000}});
 await ds.initialize();const q=ds.createQueryRunner();await q.connect();let committed=false;
 try{
  await q.startTransaction();if(mode==='preflight')await q.query('SET TRANSACTION READ ONLY');
  await q.query("SET LOCAL lock_timeout='2s'");await q.query("SET LOCAL statement_timeout='30s'");
  const identity=(await q.query("SELECT current_database() AS database,current_user AS role,current_setting('server_version') AS version"))[0];check(identity.role==='postgres'&&identity.version.startsWith('17.'),'Unexpected role/server');
  const history=await q.query('SELECT * FROM public.migrations ORDER BY timestamp');check(JSON.stringify(history.map(r=>r.name))===JSON.stringify(baseline),'Unexpected migration history');
  const collision=await q.query('SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[])',['public',[...tables,...indexes]]);check(collision.length===0,'SePay object collision');
  const parents=await q.query("SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS type,c.relowner::regrole::text AS owner FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE (a.attrelid='public.payments'::regclass AND a.attname='id') OR (a.attrelid='public.users'::regclass AND a.attname='idUser')");check(parents.length===2&&parents.every(r=>r.type==='uuid'&&r.owner===identity.role),'Parent FK or owner mismatch');
  check((await q.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')")).length===3,'Missing API roles');
  const before=await snapshot(q);
  const report={at:new Date().toISOString(),mode,targetHash,migrationHash,identity,baseline:history.map(r=>r.name),before};
  if(mode==='preflight'){await q.rollbackTransaction();fs.writeFileSync(path.join(dir,'preflight.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({preflight:'PASS',...report}));return}
  // PostgreSQL DDL and history are committed together; postchecks run before commit.
  const Migration=require('../dist/migrations/'+version)[version];await new Migration().up(q);
  await q.query('INSERT INTO public.migrations(timestamp,name) VALUES($1,$2)',[1793319300000,version]);
  const security=[];
  for(const table of tables){
   const row=(await q.query('SELECT relrowsecurity,relowner::regrole::text AS owner FROM pg_class WHERE oid=$1::regclass',['public.'+table]))[0];check(row.relrowsecurity&&row.owner===identity.role,'New table RLS/owner mismatch');
   for(const role of ['anon','authenticated','service_role'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']){
    check(!(await q.query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,'public.'+table,privilege]))[0].allowed,'API role retains table privilege');
   }
   security.push({table,rls:true,apiPrivilegesDenied:true});
  }
  for(const index of indexes)check((await q.query('SELECT to_regclass($1) AS object',['public.'+index]))[0].object,'Missing index');
  const after=await snapshot(q);for(const key of ['schemaHash','dataHash','defaultAclHash'])check(before[key]===after[key],'Existing schema/data/ACL changed during migration');
  const finalHistory=await q.query('SELECT * FROM public.migrations ORDER BY timestamp');check(finalHistory.length===5&&JSON.stringify(finalHistory.slice(0,4))===JSON.stringify(history),'History preservation failed');
  await q.commitTransaction();committed=true;
  const result={...report,after,security,history:finalHistory.map(r=>r.name),committed:true};fs.writeFileSync(path.join(dir,'apply.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(error){if(q.isTransactionActive)await q.rollbackTransaction();console.error(JSON.stringify({migration:'failed',committed,code:error.code||error.name}));process.exitCode=1}
 finally{await q.release();await ds.destroy()}
}
main().catch(error=>{console.error(JSON.stringify({setup:'failed',code:error.code||error.name}));process.exitCode=1});
