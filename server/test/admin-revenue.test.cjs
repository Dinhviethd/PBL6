const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAdminRevenue } = require('../dist/workflows/admin-revenue');
const { assertOwned } = require('../dist/platform/database');
const { orderAnalyticsStore } = require('../dist/modules/order/infrastructure/analytics');

const admin = { userId: 'admin', roles: ['ADMIN'] };
const range = { fromDate: '2026-10-31', toDate: '2026-11-02' };

test('C1 daily revenue: UTC+7 boundaries, zeros, canonical payment, BigInt and batches', async () => {
  const rows = [
    ['a', '9007199254740991', '2026-10-30T17:00:00Z'],
    ['b', '150000', '2026-10-31T16:59:59.999Z'],
    ['c', '200000', '2026-11-02T16:59:59.999Z'],
    ['d', '999', '2026-11-02T17:00:00Z'],
  ];
  let inSnapshot = false;
  const cursors = [];
  const orders = {
    adminPaidOrderBatch: async cursor => {
      assert.equal(inSnapshot, true);
      cursors.push(cursor);
      return rows.filter(([id]) => cursor === null || id > cursor).slice(0, 2)
        .map(([id, amount]) => ({ id, total_amount: amount, paid_payment_id: `pay-${id}` }));
    },
  };
  const payments = {
    analyticsOutcomes: async ids => rows.filter(([id]) => ids.includes(`pay-${id}`))
      .map(([id, , time]) => ({ id: `pay-${id}`, order_id: id, status: 'SUCCEEDED', succeeded_at: time })),
  };
  const snapshot = { run: async work => { inSnapshot = true; try { return await work(); } finally { inSnapshot = false; } } };
  const report = await createAdminRevenue(orders, payments, snapshot).report(admin, range);
  assert.deepEqual(cursors, [null, 'b', 'd']);
  assert.deepEqual(report.series, [
    { date: '2026-10-31', revenue: '9007199254890991' },
    { date: '2026-11-01', revenue: '0' },
    { date: '2026-11-02', revenue: '200000' },
  ]);
  assert.equal(report.totalRevenue, '9007199255090991');
  assert.equal(report.totalRevenue, report.series.reduce((sum, day) => sum + BigInt(day.revenue), 0n).toString());
});

test('C1 fails explicitly on missing, wrong-order, failed or undated canonical payments', async () => {
  for (const payment of [null, { order_id: 'other', status: 'SUCCEEDED', succeeded_at: new Date() },
    { order_id: 'a', status: 'FAILED', succeeded_at: new Date() },
    { order_id: 'a', status: 'SUCCEEDED', succeeded_at: null },
    { order_id: 'a', status: 'SUCCEEDED', succeeded_at: 'invalid' }]) {
    const workflow = createAdminRevenue(
      { adminPaidOrderBatch: async () => [{ id: 'a', total_amount: '100', paid_payment_id: 'p' }] },
      { analyticsOutcomes: async () => payment ? [{ id: 'p', ...payment }] : [] },
      { run: work => work() },
    );
    await assert.rejects(workflow.report(admin, range), error => error.status === 409 && error.code === 'ANALYTICS_DATA_INCONSISTENT');
  }
});

test('C1 revenue guards roles and invalid calendar/range before reading stores', async () => {
  const workflow = createAdminRevenue({}, {}, { run: () => { throw Error('must not read'); } });
  for (const roles of [['USER'], ['ORGANIZER']]) {
    await assert.rejects(workflow.report({ roles }, range), error => error.status === 403);
  }
  for (const query of [
    { fromDate: '2026-02-29', toDate: '2026-03-01' },
    { fromDate: '2026-11-03', toDate: '2026-11-01' },
    { fromDate: '2025-01-01', toDate: '2026-01-02' },
  ]) await assert.rejects(workflow.report(admin, query), error => error.status === 400);
});

test('C1 SQL reads only PAID orders in owner-guarded keyset batches', async () => {
  let executed = false;
  await orderAnalyticsStore({ query: async (sql, args) => {
    assertOwned('order', sql);
    assert.match(sql, /status='PAID'/);
    assert.match(sql, /ORDER BY id LIMIT 500/);
    assert.deepEqual(args, [null]);
    executed = true;
    return [];
  } }).adminPaidOrderBatch(null);
  assert.equal(executed, true);
});
