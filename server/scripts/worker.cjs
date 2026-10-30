require('dotenv').config({ quiet: true });
const { setTimeout: pause } = require('node:timers/promises');
const { createApplication } = require('../dist/app');
const { loadRuntimeConfig } = require('../dist/configs/sepay-runtime');
const { createSepayWorkerTasks } = require('../dist/workflows/sepay-worker');
const fs = require('node:fs');

let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; });
async function loop(task, interval) {
  while (!stopping) {
    await task();
    for (let elapsed = 0; elapsed < interval && !stopping; elapsed += 250)
      await pause(Math.min(250, interval - elapsed));
  }
}
async function main() {
  const config = loadRuntimeConfig();
  const app = createApplication(config.app);
  await app.start();
  try {
    const legacy = loop(async () => {
      for (const [name, task] of [
        ['expiry', () => app.booking.expire()],
        ['VNPAY reconciliation', () => app.booking.reconcile()],
        ['wait queue', () => app.waitQueue.process()],
        ['reminders', () => app.booking.remind()],
      ]) {
        try { await task(); } catch { console.error(`${name} job failed; retry scheduled.`); }
      }
    }, 30000);
    const loops = [legacy];
    if (config.worker) {
      const tasks = createSepayWorkerTasks(app, config.worker);
      loops.push(loop(() => tasks.inbox(), config.worker.pollMs));
      loops.push(loop(() => tasks.reconcile(), config.worker.reconcileMs));
      loops.push(loop(async () => {
        const health = { ...tasks.health, pid: process.pid, environment: config.app.sepay.environment, observedAt: new Date().toISOString() };
        console.log('SePay worker health', JSON.stringify(health));
        const target = process.env.SEPAY_WORKER_HEALTH_FILE;
        if (target) {
          try { fs.writeFileSync(target + '.' + process.pid + '.tmp', JSON.stringify(health)); fs.renameSync(target + '.' + process.pid + '.tmp', target); }
          catch { console.error('SePay worker health file could not be updated.'); }
        }
      }, 30000));
    }
    await Promise.all(loops);
  } finally { await app.close(); }
}
main().catch(() => { stopping = true; console.error('Worker startup failed.'); process.exitCode = 1; });
