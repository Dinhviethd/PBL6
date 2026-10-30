// No dotenv. Only the attested P1 database and synthetic account are enabled in P2.
const { verifiedConfig } = require('./sepay-local-guard.cjs');
const { randomBytes } = require('node:crypto');
async function main() {
  const config = verifiedConfig();
  const fs = require('node:fs'), path = require('node:path');
  const runtimePath = path.resolve(__dirname,'../../.local/sepay/runtime.json');
  const runtime = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath,'utf8')) : null;
  if (!runtime || typeof runtime.webhookSecret !== 'string' || Buffer.byteLength(runtime.webhookSecret,'utf8') < 1 || Buffer.byteLength(runtime.webhookSecret,'utf8') > 256 || typeof runtime.accountNumber !== 'string' || !/^[A-Za-z0-9]{1,19}$/.test(runtime.accountNumber) || typeof runtime.accountName !== 'string' || !runtime.accountName.trim()) throw Error('Protected local runtime config missing');
  for (const key of Object.keys(process.env)) {
    if (!['PATH','SystemRoot','SYSTEMROOT','TEMP','TMP'].includes(key)) delete process.env[key];
  }
  process.env.NODE_ENV = 'development'; process.env.DB_SSL = 'false';
  const { createApplication } = require('../dist/app');
  const app = createApplication({databaseUrl:config.url,secret:randomBytes(32).toString('hex'),qrSecret:randomBytes(32).toString('hex'),
    sepay:{environment:'test',bankCode:'MBBank',accountNumber:runtime.accountNumber,accountName:runtime.accountName,webhookSecret:runtime.webhookSecret},
    sepayApiV2SandboxToken:typeof runtime.apiV2SandboxToken==='string'?runtime.apiV2SandboxToken:''});
  await app.start();
  const server = app.app.listen(8010,'127.0.0.1',()=>console.log('SePay local API: http://127.0.0.1:8010 — Test mode; webhook HMAC enabled.'));
  server.on('error',async()=>{await app.close();process.exitCode=1;});
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{await app.close();process.exit(0);}));
}
main().catch(()=>{console.error('Local API startup failed; no credentials printed.');process.exitCode=1;});
