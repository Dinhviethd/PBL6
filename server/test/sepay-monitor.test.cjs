const {test}=require('node:test'),assert=require('node:assert/strict');
const {evaluate}=require('../scripts/sepay-monitor-policy.cjs');
const now=Date.now(),stamp=new Date(now).toISOString();
const healthy={localHealthy:true,publicHealthy:true,databaseHealthy:true,worker:{environment:'live',observedAt:stamp,lastInboxAt:stamp,lastReconcileAt:stamp},queue:{}};
test('healthy monitoring has no alerts',()=>assert.deepEqual(evaluate(healthy,now),[]));
test('health alone cannot hide a dead worker or DB failure',()=>{const a=evaluate({...healthy,worker:null,databaseHealthy:false},now);for(const s of ['DATABASE_UNHEALTHY','WORKER_HEARTBEAT_STALE','WORKER_INBOX_STALE','WORKER_RECONCILE_STALE'])assert.ok(a.includes(s))});
test('stalled work, expired leases and review are actionable',()=>{const a=evaluate({...healthy,queue:{oldestPendingSeconds:61,expiredLeases:1,errors:1,reviews:1}},now);assert.deepEqual(a,['INBOX_LAG','EXPIRED_LEASE','INBOX_ERROR','REVIEW_REQUIRED'])});
test('heartbeat cannot mask stalled loops or invalid timestamps',()=>{const a=evaluate({...healthy,worker:{...healthy.worker,lastInboxAt:'bad',lastReconcileAt:new Date(now-181000).toISOString()}},now);assert.deepEqual(a,['WORKER_INBOX_STALE','WORKER_RECONCILE_STALE'])});
test('public tunnel failure remains visible with healthy local API',()=>assert.deepEqual(evaluate({...healthy,publicHealthy:false},now),['NGROK_UNHEALTHY']));
