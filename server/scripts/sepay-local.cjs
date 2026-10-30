const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { root, localDir, assertLocalUrl, verifiedConfig, docker } = require('./sepay-local-guard.cjs');

async function main() {
  const action = process.argv[2];
  if (!['init','verify','baseline','migrate','seed','check'].includes(action)) throw Error('Usage: node scripts/sepay-local.cjs init|verify|baseline|migrate|seed|check');
  for (const k of ['DATABASE_URL','TEST_DATABASE_URL']) if (process.env[k]) assertLocalUrl(process.env[k]);
  if (process.env.NODE_ENV === 'production') throw Error('Local tooling disabled in production');
  if (action === 'init') {
    fs.mkdirSync(localDir, { recursive: true });
    const configPath = path.join(localDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      const containers = docker(['ps','-a','--format','{{.Names}}']).split(/\r?\n/);
      const volumes = docker(['volume','ls','--format','{{.Name}}']).split(/\r?\n/);
      if (containers.includes('eventhub-sepay-local') || volumes.includes('eventhub-sepay-local-data'))
        throw Error('Unmanaged existing local resources: refusing adoption');
      const password = randomBytes(24).toString('hex');
      fs.writeFileSync(configPath, JSON.stringify({ url: `postgresql://sepay_local:${password}@127.0.0.1:55432/eventhub_sepay_local`, seedPassword: randomBytes(18).toString('base64url') }, null, 2), { flag: 'wx', mode: 0o600 });
      fs.writeFileSync(path.join(localDir, 'compose.env'), `SEPAY_LOCAL_PASSWORD=${password}\n`, { flag: 'wx', mode: 0o600 });
    }
    docker(['compose','--env-file',path.join(localDir,'compose.env'),'-f',path.join(root,'compose.sepay-local.yaml'),'up','-d','--wait','db']);
    console.log('Local container created/started; credentials stored only in ignored .local/sepay.');
  }
  const config = verifiedConfig();
  // Connect only after URL and Docker target attestation; SSL/PG env cannot override explicit settings.
  const { Client } = require('pg');
  const client = new Client({ connectionString: config.url, ssl: false, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    const identity = (await client.query('SELECT current_database() AS db, current_user AS usr, inet_server_port() AS port')).rows[0];
    if (identity.db !== 'eventhub_sepay_local' || identity.usr !== 'sepay_local' || identity.port !== 5432)
      throw Error('Connected database identity mismatch');
    console.log('Verified: 127.0.0.1:55432 / eventhub_sepay_local / sepay_local / isolated Docker volume.');
    if (action === 'migrate' || action === 'baseline') {
      const { DataSource } = require('typeorm');
      const names = ['InitialMvp1790812800000','EventCheckinStaff1791072000000','Notifications1791331200000','WaitQueue1792627200000'];
      if(action === 'migrate') names.push('SepayLocalFoundation1793289600000');
      const existing = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'sepay_%' AND tablename <> 'migrations' ORDER BY tablename")).rows.map(r=>r.tablename);
      async function fingerprint() {
        const hash=createHash('sha256');
        for(const table of existing) {
          if(!/^[a-z_]+$/.test(table)) throw Error('Unexpected table name');
          const rows=(await client.query(`SELECT row_to_json(t)::text AS row FROM ${table} t ORDER BY row_to_json(t)::text`)).rows;
          hash.update(JSON.stringify([table,rows]));
        }
        return hash.digest('hex');
      }
      const before=await fingerprint();
      const db = new DataSource({ type:'postgres', url:config.url, ssl:false, synchronize:false, migrations:names.map(n => require(`../dist/migrations/${n}`)[n]) });
      await db.initialize();
      try { console.log('Applied:', (await db.runMigrations()).map(m => m.name)); } finally { await db.destroy(); }
      if(before!==await fingerprint()) throw Error('Existing data changed during migration');
      console.log(`PASS preservation fingerprint: ${existing.length} existing application tables unchanged`);
    }
    if (action === 'seed') {
      // Existing fake-data seed, unchanged. Empty cwd prevents dotenv from loading server/.env.
      if (fs.existsSync(path.join(localDir,'.env'))) throw Error('Unexpected dotenv file in isolated working directory');
      const env = { PATH:process.env.PATH, SystemRoot:process.env.SystemRoot, TEMP:process.env.TEMP,
        DATABASE_URL:config.url, NODE_ENV:'development', DB_SSL:'false', DEMO_PASSWORD:config.seedPassword };
      execFileSync(process.execPath, [path.join(__dirname,'seed.cjs')], { cwd:localDir, env, stdio:'pipe' });
      console.log('Synthetic seed complete; generated login password remains in ignored config.json.');
    }
    if (action === 'check') {
      const tables = ['users','events','orders','payments','tickets','sepay_payment_details','sepay_transactions','sepay_transaction_reviews'];
      for (const table of tables) console.log(table, (await client.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n);
      // Transactional constraint checks, always rolled back; no retained bank data.
      await client.query('BEGIN');
      try {
        const id = randomUUID();
        await client.query(`INSERT INTO sepay_transactions(id,environment,integration_account,webhook_transaction_id,bank_code,account_number,transfer_type,amount,content,transaction_at,payload_hash) VALUES($1,'test','synthetic','123','MBBank','FAKE','in',1000,'tkhA12',now(),$2)`, [id,'a'.repeat(64)]);
        for (const [label,sql,args,code] of [
          ['duplicate webhook',`INSERT INTO sepay_transactions SELECT $1,environment,integration_account,webhook_transaction_id,api_transaction_id,reference_code,bank_code,account_number,sub_account,transfer_type,amount,currency,payment_code,content,transaction_at,payload_hash,payment_id,status,reason,attempt_count,next_retry_at,lease_until,lease_token,received_at,processed_at FROM sepay_transactions WHERE id=$2`,[randomUUID(),id],'23505'],
          ['negative amount','UPDATE sepay_transactions SET amount=-1 WHERE id=$1',[id],'23514'],
          ['review reason','UPDATE sepay_transactions SET status=\'REVIEW\' WHERE id=$1',[id],'23514'],
          ['unknown payment','UPDATE sepay_transactions SET payment_id=$1 WHERE id=$2',[randomUUID(),id],'23503']
        ]) {
          await client.query('SAVEPOINT constraint_check');
          let errorCode;
          try { await client.query(sql,args); } catch(e) { errorCode=e.code; }
          await client.query('ROLLBACK TO SAVEPOINT constraint_check');
          if(errorCode!==code) throw Error(`Constraint check failed: ${label}`);
          console.log('PASS',label);
        }
      } finally { await client.query('ROLLBACK'); }
    }
  } finally { await client.end(); }
}
main().catch(() => { console.error('SePay local operation failed; check local Docker/config/build. No credentials printed.'); process.exitCode=1; });
