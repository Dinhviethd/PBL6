// Attest the P1 container before creating a disposable, synthetic-only test database.
const { verifiedConfig, localDir } = require('./sepay-local-guard.cjs');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
async function main() {
  const config = verifiedConfig();
  const { Client } = require('pg');
  const client = new Client({ connectionString: config.url, ssl: false });
  const name = 'eventhub_sepay_' + randomBytes(6).toString('hex') + '_test';
  await client.connect();
  try { await client.query(`CREATE DATABASE "${name}"`); } finally { await client.end(); }
  const url = new URL(config.url); url.pathname = '/' + name;
  const { DataSource } = require('typeorm');
  const names = ['InitialMvp1790812800000','EventCheckinStaff1791072000000','Notifications1791331200000','WaitQueue1792627200000','SepayLocalFoundation1793289600000'];
  const db = new DataSource({type:'postgres',url:url.toString(),ssl:false,migrations:names.map(n=>require('../dist/migrations/'+n)[n])});
  await db.initialize();
  try { await db.runMigrations(); } finally { await db.destroy(); }
  console.log('Verified local test database:', name, 'on 127.0.0.1:55432; retained for inspection.');
  const env = {PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,NODE_ENV:'test',DB_SSL:'false',TEST_DATABASE_URL:url.toString()};
  const files = ['sepay.test.cjs','sepay.integration.test.cjs','sepay-v2.test.cjs','sepay-live-config.test.cjs','sepay-live.integration.test.cjs','sepay-local-guard.test.cjs','vnpay.test.cjs','vnpay.integration.test.cjs','integration.test.cjs'];
  const result = spawnSync(process.execPath,['--test','--test-concurrency=1',...files.map(f=>path.join(__dirname,'../test',f))],{cwd:localDir,env,stdio:'inherit'});
  process.exitCode = result.status ?? 1;
}
main().catch(()=>{console.error('Local test setup failed; no credentials printed.');process.exitCode=1;});
