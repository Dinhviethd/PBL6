// Synthetic-only PG17 API acceptance on a verified L2 local container.
const {execFileSync,spawnSync}=require('node:child_process');
const {randomBytes}=require('node:crypto');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {Client}=require('pg'),{DataSource}=require('typeorm');
async function main(){
 if(process.env.DATABASE_URL||process.env.TEST_DATABASE_URL)throw Error('Ambient database URLs are forbidden');
 const name=process.argv[2];assert.match(name||'',/^eventhub-sepay-l2-[a-f0-9]{12}$/);
 const info=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8',stdio:['ignore','pipe','pipe']}))[0];
 assert.equal(info.State.Running,true);assert.equal(info.Config.Image,'postgres:17-alpine');assert.equal(info.Config.Labels['eventhub.purpose'],'sepay-l2-synthetic');
 assert.deepEqual(info.NetworkSettings.Ports['5432/tcp'],[{HostIp:'127.0.0.1',HostPort:'55434'}]);
 const password=info.Config.Env.find(v=>v.startsWith('POSTGRES_PASSWORD=')).slice('POSTGRES_PASSWORD='.length);
 const admin=new Client({host:'127.0.0.1',port:55434,user:'postgres',password,database:'postgres',ssl:false});await admin.connect();
 const suffix=randomBytes(6).toString('hex'),role='l3_owner_'+suffix,dbName='eventhub_sepay_'+suffix+'_test',secret=randomBytes(24).toString('hex');
 try {
  assert.match((await admin.query('SHOW server_version')).rows[0].server_version,/^17\./);
  await admin.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${secret}'`);
  await admin.query(`CREATE DATABASE ${dbName} OWNER ${role}`);
 }finally{await admin.end()}
 const names=['InitialMvp1790812800000','EventCheckinStaff1791072000000','Notifications1791331200000','WaitQueue1792627200000','SepayLiveFoundation1793319300000'];
 const url=`postgresql://${role}:${secret}@127.0.0.1:55434/${dbName}`;
 const source=new DataSource({type:'postgres',url,ssl:false,synchronize:false,migrations:names.map(n=>require('../dist/migrations/'+n)[n])});
 await source.initialize();try{await source.runMigrations({transaction:'all'})}finally{await source.destroy()}
 const files=['integration.test.cjs','sepay.integration.test.cjs','vnpay.integration.test.cjs','sepay.test.cjs','sepay-v2.test.cjs','sepay-live-config.test.cjs','vnpay.test.cjs'];
 const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,NODE_ENV:'test',DB_SSL:'false',TEST_DATABASE_URL:url};
 console.log('L3 isolated PostgreSQL 17 database:',dbName);
 const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...files.map(f=>path.join(__dirname,'../test',f))],{cwd:path.resolve(__dirname,'../..'),env,encoding:'utf8'});
 const dir=path.resolve(__dirname,'../../.local/sepay-l3');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,suffix+'-tests.log'),result.stdout+result.stderr);
 console.log(result.stdout);if(result.status!==0)console.error('L3 failed; inspect ignored local test log.');process.exitCode=result.status??1;
}
main().catch(e=>{console.error('L3 setup failed:',e.code||e.name);process.exitCode=1});
