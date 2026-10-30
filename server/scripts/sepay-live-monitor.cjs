// Read-only monitor; prints aggregate status only, never bank payloads or credentials.
const fs=require('node:fs'),path=require('node:path');
const {evaluate}=require('./sepay-monitor-policy.cjs');
process.chdir(path.resolve(__dirname,'..'));
const dir=path.resolve('../.local/sepay-l6');fs.mkdirSync(dir,{recursive:true});
async function probe(url){try{const r=await fetch(url,{headers:{'ngrok-skip-browser-warning':'1'},redirect:'error',signal:AbortSignal.timeout(10000)});const b=await r.json();return r.status===200&&b.success===true&&b.data?.status==='ok'}catch{return false}}
async function sample(){
 const env=require('dotenv').parse(fs.readFileSync('.env'));
 const config=require('../dist/configs/sepay-runtime').loadRuntimeConfig(env);
 if(env.SEPAY_ENV!=='live'||!config.worker)throw Error('Live required');
 const out={at:new Date().toISOString(),reconcileStaleSeconds:Math.max(180,config.worker.reconcileMs/1000*3),acceptNewPayments:config.app.sepayAcceptNewPayments};
 [out.localHealthy,out.publicHealthy]=await Promise.all([probe(`http://127.0.0.1:${Number(env.PORT||8011)}/api/health`),probe('https://richelle-unrelapsing-flavourlessly.ngrok-free.dev/api/health')]);
 try{out.worker=JSON.parse(fs.readFileSync('.local/sepay-live-runtime/sepay-worker-health.json'))}catch{out.worker=null}
 const c=new(require('pg').Client)({connectionString:config.app.databaseUrl,ssl:config.app.databaseSsl,connectionTimeoutMillis:10000});
 try{
  await c.connect();await c.query('BEGIN READ ONLY');await c.query("SET LOCAL statement_timeout='10s'");
  out.queue=(await c.query(`SELECT
   count(*) FILTER(WHERE status='ERROR')::int AS errors,
   count(*) FILTER(WHERE status='REVIEW')::int AS reviews,
   count(*) FILTER(WHERE status='PROCESSING' AND lease_until<now())::int AS "expiredLeases",
   coalesce(max(extract(epoch FROM now()-received_at)) FILTER(WHERE status IN ('RECEIVED','PROCESSING','ERROR')),0)::float AS "oldestPendingSeconds",
   count(*) FILTER(WHERE status='PROCESSED')::int AS processed
   FROM sepay_transactions WHERE environment='live' AND integration_account=$1`,[`${env.SEPAY_BANK_CODE}:${env.SEPAY_ACCOUNT_NUMBER}`])).rows[0];
  await c.query('ROLLBACK');out.databaseHealthy=true;
 }catch{out.databaseHealthy=false}finally{await c.end().catch(()=>{})}
 out.alerts=evaluate(out);out.status=out.alerts.length?'ATTENTION':'OK';
 return out;
}
let stop=false;process.on('SIGTERM',()=>{stop=true});process.on('SIGINT',()=>{stop=true});
(async()=>{do{
 let result;try{result=await sample()}catch{result={at:new Date().toISOString(),status:'ATTENTION',alerts:['MONITOR_CONFIG_OR_INTERNAL_ERROR']}}
 fs.writeFileSync(path.join(dir,'monitor-latest.json'),JSON.stringify(result,null,2));
 const log=path.join(dir,'monitor.jsonl');if(fs.existsSync(log)&&fs.statSync(log).size>1024*1024)fs.renameSync(log,log+'.previous');
 fs.appendFileSync(log,JSON.stringify(result)+'\n');console.log(JSON.stringify(result));
 if(process.argv[2]!=='--watch'){process.exitCode=result.status==='OK'?0:1;break}
 for(let i=0;i<30&&!stop;i++)await new Promise(r=>setTimeout(r,1000));
 }while(!stop)})().catch(()=>{console.error('Monitor stopped; inspect local runtime.');process.exitCode=1});
