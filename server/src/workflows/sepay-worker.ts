// Separate loops let slow API v2 calls leave inbox processing responsive.
export function createSepayWorkerTasks(app: {
  sepayWebhook: { processBatch(limit: number): Promise<number> } | null;
  sepayV2: { reconcile(minutes: number): Promise<unknown> } | null;
}, options: { batch: number; lookbackMinutes: number }) {
  const health = { inboxRuns: 0, reconcileRuns: 0, busy: 0, failures: 0, lastInboxAt: null as string | null, lastReconcileAt: null as string | null };
  return {
    health,
    async inbox() {
      if (!app.sepayWebhook) return;
      try {
        const count = await app.sepayWebhook.processBatch(options.batch);
        health.inboxRuns++; health.lastInboxAt = new Date().toISOString();
        return count;
      } catch { health.failures++; console.error("SePay inbox batch failed; retry scheduled."); }
    },
    async reconcile() {
      if (!app.sepayV2) return;
      try {
        await app.sepayV2.reconcile(options.lookbackMinutes);
        health.reconcileRuns++; health.lastReconcileAt = new Date().toISOString();
      } catch (error) {
        if ((error as { code?: string })?.code === "SEPAY_V2_BUSY") health.busy++;
        else { health.failures++; console.error("SePay reconciliation failed; retry scheduled."); }
      }
    },
  };
}
