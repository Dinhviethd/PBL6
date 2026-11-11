import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayBoundary, recentRange, rangeParams, validateRange } from '../src/lib/report-filters.ts';
import { ticketDocument } from '../src/lib/ticket-document.ts';
import { createApiClient } from '../src/lib/api-client.ts';
test('report dates reject impossible days and ranges, preserve inclusive Vietnam days', () => {
  assert.equal(dayBoundary('2026-11-11'), '2026-11-10T17:00:00.000Z');
  assert.equal(dayBoundary('2026-11-11', true), '2026-11-11T17:00:00.000Z');
  assert.throws(() => dayBoundary('2026-02-30'));
  assert.throws(() => validateRange({ fromDate: '2026-11-12', toDate: '2026-11-11' }));
  assert.throws(() => validateRange({ fromDate: '2025-01-01', toDate: '2026-01-02' }, 366));
  assert.deepEqual(recentRange(7, new Date('2026-11-10T18:00:00Z')), { fromDate: '2026-11-05', toDate: '2026-11-11' });
  assert.equal(rangeParams({ fromDate: '', toDate: '' }).toString(), '');
  assert.equal(rangeParams({ fromDate: '2026-11-11', toDate: '2026-11-11' }, true).get('toExclusive'), '2026-11-11T17:00:00.000Z');
});
test('ticket PDF escapes untrusted content, rejects void tickets and remote images', () => {
  const ticket = { code: '<code>', eventTitle: '<script>alert(1)</script>', typeName: 'VIP & "Guest"', status: 'VALID', qrImage: 'https://evil.test/tracker' };
  const html = ticketDocument([ticket]);
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('https://evil.test')); assert.ok(html.includes('&lt;code&gt;'));
  assert.throws(() => ticketDocument([{ ...ticket, status: 'VOID' }]));
  assert.throws(() => ticketDocument([]));
  assert.ok(ticketDocument([{ ...ticket, qrImage: 'data:image/png;base64,aGVsbG8=' }]).includes('<img'));
});
test('API preserves attendee pagination envelope and authenticated CSV response', async () => {
  const client = createApiClient({ baseUrl: 'https://example.test/api', native: true, storage: { read: async () => null, write: async () => {}, clear: async () => {} }, fetcher: async (url, options) => {
    if (url.endsWith('/auth/mobile/login')) return Response.json({ success: true, data: { accessToken: 'access', refreshToken: 'refresh', user: { idUser: 'buyer', roles: ['USER'] } } });
    assert.equal(options.headers.Authorization, 'Bearer access');
    if (url.endsWith('.csv')) return new Response('\uFEFFName,Value\r\nQA,0', { headers: { 'Content-Type': 'text/csv' } });
    return Response.json({ success: true, data: [{ id: 'one' }], pagination: { total: 12, totalPages: 2 } });
  }});
  await client.authenticate('login', { email: 'qa@example.test', password: 'test' });
  assert.equal((await client.request('/attendees', 'GET', undefined, {}, true)).pagination.total, 12);
  assert.deepEqual(await client.request('/attendees'), [{ id: 'one' }]);
  assert.match(await client.request('/export.csv', 'GET', undefined, {}, 'text'), /Name,Value\r\nQA,0/);
});
