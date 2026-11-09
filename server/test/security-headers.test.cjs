const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApplication } = require('../dist/app');
const { loadRuntimeConfig } = require('../dist/configs/sepay-runtime');
const config = { databaseUrl: 'postgres://unused:unused@127.0.0.1/security_test', secret: 's'.repeat(32), qrSecret: 'q'.repeat(32) };
const policy = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";
async function listen(t, extra = {}) {
  const app = createApplication({ ...config, ...extra });
  const server = app.app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(r => server.close(r)));
  return `http://127.0.0.1:${server.address().port}`;
}
function common(r, hsts = null) {
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('strict-transport-security'), hsts);
}
test('security headers cover built HTML, SPA fallback, API and errors without a DB', async t => {
  const base = await listen(t);
  for (const path of ['/', '/register-organizer', '/api/config', '/api/me/tickets']) {
    const r = await fetch(base + path); common(r);
    assert.equal(r.status, path === '/api/me/tickets' ? 401 : 200);
    assert.equal(r.headers.get('content-security-policy'), policy);
    assert.equal(r.headers.get('referrer-policy'), 'same-origin');
    if (!path.startsWith('/api')) assert.match(await r.text(), /<html/);
  }
  const malformed = await fetch(base+'/api/auth/login', { method:'POST',headers:{'Content-Type':'application/json'},body:'{' });
  assert.equal(malformed.status,400); common(malformed);
  assert.equal(malformed.headers.get('content-security-policy'),policy);
  const invalid = await fetch(base+'/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(invalid.status,400); common(invalid);
  const vnpay = await fetch(base+'/api/payments/vnpay/return'); common(vnpay);
  assert.match(vnpay.headers.get('content-security-policy'),/default-src 'none'/);
  assert.match(vnpay.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal(vnpay.headers.get('referrer-policy'),'no-referrer');
});
test('HSTS opt-in applies to webhook failures before JSON parsing', async t => {
  const base=await listen(t,{hstsMaxAgeSeconds:86400,sepay:{environment:'test',bankCode:'MBBank',accountNumber:'TESTONLY',accountName:'TEST',webhookSecret:'s'.repeat(40)}});
  const r=await fetch(base+'/api/payments/sepay/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,401);common(r,'max-age=86400');assert.equal(r.headers.get('content-security-policy'),policy);
});
test('runtime and direct construction validate HSTS, including explicit zero', () => {
  assert.equal(loadRuntimeConfig({}).app.hstsMaxAgeSeconds,0);
  for(const value of ['0','86400','31536000']) assert.equal(loadRuntimeConfig({HSTS_MAX_AGE_SECONDS:value}).app.hstsMaxAgeSeconds,Number(value));
  for(const value of ['', '-1','1.5','31536001','abc',' 86400','Infinity'])
    assert.throws(()=>loadRuntimeConfig({HSTS_MAX_AGE_SECONDS:value}),/HSTS_MAX_AGE_SECONDS/);
  for(const value of [-1,0.5,31536001,NaN,Infinity,'86400'])
    assert.throws(()=>createApplication({...config,hstsMaxAgeSeconds:value}),/HSTS_MAX_AGE_SECONDS/);
});
