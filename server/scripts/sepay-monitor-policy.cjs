function evaluate(snapshot, now=Date.now()) {
 const alerts=[];
 if(!snapshot.localHealthy)alerts.push('API_UNHEALTHY');
 if(!snapshot.publicHealthy)alerts.push('NGROK_UNHEALTHY');
 if(!snapshot.databaseHealthy)alerts.push('DATABASE_UNHEALTHY');
 const h=snapshot.worker;
 const stale=(value,seconds)=>!value||!Number.isFinite(Date.parse(value))||now-Date.parse(value)>seconds*1000||Date.parse(value)>now+60000;
 if(!h||h.environment!=='live'||stale(h.observedAt,90))alerts.push('WORKER_HEARTBEAT_STALE');
 if(!h||stale(h.lastInboxAt,60))alerts.push('WORKER_INBOX_STALE');
 if(!h||stale(h.lastReconcileAt,snapshot.reconcileStaleSeconds||180))alerts.push('WORKER_RECONCILE_STALE');
 const q=snapshot.queue||{};
 if(q.oldestPendingSeconds>60)alerts.push('INBOX_LAG');
 if(q.expiredLeases>0)alerts.push('EXPIRED_LEASE');
 if(q.errors>0)alerts.push('INBOX_ERROR');
 if(q.reviews>0)alerts.push('REVIEW_REQUIRED');
 return alerts;
}
module.exports={evaluate};
