const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertLocalUrl, assertContainer } = require('../scripts/sepay-local-guard.cjs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const good = 'postgresql://sepay_local:test@127.0.0.1:55432/eventhub_sepay_local';
test('local guard rejects remote, redirected and wrong database targets before connection', () => {
  assert.equal(assertLocalUrl(good),good);
  for(const value of [good.replace('127.0.0.1','db.example.supabase.co'),good.replace('127.0.0.1','localhost'),good.replace('55432','5432'),good.replace('eventhub_sepay_local','postgres'),good+'?host=remote',good+'#remote','bad',good.replace('postgresql:','https:')])
    assert.throws(()=>assertLocalUrl(value));
});
test('runner rejects ambient remote DATABASE_URL before Docker or database access', () => {
  const result=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/sepay-local.cjs'),'verify'],{
    env:{SystemRoot:process.env.SystemRoot,PATH:'',DATABASE_URL:'postgresql://fake:do-not-log@db.invalid.supabase.co:5432/postgres'},encoding:'utf8'
  });
  assert.equal(result.status,1);
  assert.match(result.stderr,/SePay local operation failed/);
  assert.doesNotMatch(result.stderr,/do-not-log|supabase|ENOENT/);
});
test('local guard requires dedicated running Docker instance with loopback binding and volume', () => {
  const c={Name:'/eventhub-sepay-local',State:{Running:true},Config:{Image:'postgres:16-alpine',Labels:{'eventhub.purpose':'sepay-local-only'},Env:['POSTGRES_DB=eventhub_sepay_local','POSTGRES_USER=sepay_local']},NetworkSettings:{Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'55432'}]}},Mounts:[{Type:'volume',Name:'eventhub-sepay-local-data',Destination:'/var/lib/postgresql/data'}]};
  assert.doesNotThrow(()=>assertContainer(c));
  for(const change of [x=>x.State.Running=false,x=>x.NetworkSettings.Ports['5432/tcp'][0].HostIp='0.0.0.0',x=>x.Mounts=[],x=>x.Config.Labels={},x=>x.Config.Env=[]]) {
    const bad=structuredClone(c);change(bad);assert.throws(()=>assertContainer(bad));
  }
});
