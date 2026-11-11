// Acceptance runner: each backend test file gets a fresh database in the fixed QA container.
const fs = require('node:fs'), path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), dir = path.join(root, '.local/mobile-migration/final-acceptance');
fs.mkdirSync(dir, { recursive: true });
const container = 'eventhub-mobile-migration-test';
async function main() {
  const runtime = JSON.parse(fs.readFileSync(path.join(root, '.local/mobile-migration/runtime.json')));
  const inspect = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }))[0];
  if (!inspect.Config.Env.includes(`POSTGRES_PASSWORD=${runtime.password}`) || inspect.NetworkSettings.Ports['5432/tcp'][0].HostPort !== '55433' || inspect.NetworkSettings.Ports['5432/tcp'][0].HostIp !== '127.0.0.1') throw Error('QA container identity mismatch');
  const { Client } = require('../server/node_modules/pg');
  const admin = new Client({ host: '127.0.0.1', port: 55433, user: 'mobile_test', password: runtime.password, database: 'postgres' });
  await admin.connect();
  const results = [];
  try {
    for (const file of fs.readdirSync(path.join(root, 'server/test')).filter(n => n.endsWith('.test.cjs')).sort()) {
      const source = fs.readFileSync(path.join(root, 'server/test', file), 'utf8');
      const needsDb = /TEST_DATABASE_URL/.test(source);
      const name = `eventhub_sepay_${randomBytes(6).toString('hex')}_test`;
      const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => ['PATH','SystemRoot','SYSTEMROOT','TEMP','TMP','APPDATA','LOCALAPPDATA'].includes(k)));
      env.NODE_ENV = 'test'; env.DB_SSL = 'false';
      if (needsDb) {
        await admin.query(`CREATE DATABASE "${name}"`);
        const url = `postgresql://mobile_test:${runtime.password}@127.0.0.1:55433/${name}`;
        for (const key of ['TEST_DATABASE_URL', ...[...source.matchAll(/process\.env\.([A-Z0-9_]*TEST_DATABASE_URL)/g)].map(m => m[1])]) env[key] = url;
        if (file === 'sepay.integration.test.cjs') {
          const { DataSource } = require('../server/node_modules/typeorm');
          const names = fs.readdirSync(path.join(root, 'server/dist/migrations')).filter(n => /\d{13}\.js$/.test(n) && !n.startsWith('SepayLiveFoundation'));
          const db = new DataSource({ type: 'postgres', url, migrations: names.map(n => require(path.join(root, 'server/dist/migrations', n))[n.slice(0,-3)]) });
          await db.initialize(); await db.runMigrations(); await db.destroy();
        }
      }
      const started = Date.now(), log = fs.createWriteStream(path.join(dir, file + '.tap'));
      const exitCode = await new Promise(resolve => {
        const child = spawn(process.execPath, ['--test', '--test-reporter=tap', 'test/' + file], { cwd: path.join(root,'server'), env, windowsHide: true });
        child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
        const timer = setTimeout(() => child.kill(), 240000);
        child.on('exit', code => { clearTimeout(timer); log.end(); resolve(code ?? 1); });
      });
      const result = { file, exitCode, durationMs: Date.now() - started, isolatedDatabase: needsDb, note: file === 'sepay-live.integration.test.cjs' ? 'Suite requires fixed55432; expected skip on isolated55433, do not bypass guard.' : undefined };
      results.push(result); console.log(exitCode ? 'FAIL' : 'DONE', file, result.durationMs + 'ms');
      fs.writeFileSync(path.join(dir, 'backend-results.json'), JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
    }
  } finally { await admin.end(); }
  if (results.some(r => r.exitCode)) process.exitCode = 1;
}
main().catch(e => { console.error('Acceptance backend runner:', e.name, String(e.message).replace(/postgresql:\/\/[^\s]+/g,'[redacted]')); process.exitCode = 1; });
