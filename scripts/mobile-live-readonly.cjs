// Read-only verification of the user-authorized remote API. Credentials stay in .local.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../.local/mobile-migration');
const base = 'https://eventhubqrmarketing.tech/api';
const checks = [];
async function call(route, token, payload) {
  const started = Date.now();
  const response = await fetch(base + route, { method: payload ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(20000) });
  const json = await response.json();
  checks.push({ method: payload ? 'POST' : 'GET', route, status: response.status, durationMs: Date.now() - started, success: json.success === true, keys: Object.keys(json.data ?? {}), code: json.code });
  console.log(payload ? 'login' : route.replace(/[a-f\d]{8}-[a-f\d-]{27,}/gi, ':id'), response.status);
  return { status: response.status, data: json.data };
}
async function main() {
  const accounts = JSON.parse(fs.readFileSync(path.join(dir, 'live-accounts.json'), 'utf8'));
  for (const route of ['/health', '/config', '/categories', '/events?page=0&limit=2']) await call(route);
  for (const [role, account] of Object.entries(accounts)) {
    console.log('Role:', role);
    const login = await call('/auth/mobile/login', null, account);
    if (login.status !== 200 || !login.data?.accessToken) continue;
    const token = login.data.accessToken;
    const profile = await call('/auth/me', token);
    checks.push({ role, roles: profile.data?.roles ?? [] });
    if (role === 'buyer') {
      for (const route of ['/me/order-history?page=0&pageSize=10&group=all', '/me/tickets?page=0', '/me/notifications?page=0', '/me/checkin-assignments?page=0', '/me/organizer-applications', '/admin/stats']) await call(route, token);
    } else if (role === 'organizer') {
      for (const route of ['/organizer/dashboard', '/organizer/profile']) await call(route, token);
      const events = await call('/organizer/events?page=0', token);
      const event = Array.isArray(events.data) ? events.data[0] : events.data?.items?.[0];
      if (event) for (const suffix of ['', '/order-manager', '/attendees?paginated=true&limit=10', '/analytics', '/checkins?page=0', '/staff']) await call(`/organizer/events/${event.id}${suffix}`, token);
    } else {
      for (const route of ['/admin/stats', '/admin/stats/revenue-daily?fromDate=2026-11-01&toDate=2026-11-11', '/admin/users?page=0', '/admin/organizer-applications?page=0', '/admin/events?page=0', '/admin/payments?page=0', '/admin/sepay/transactions?page=0', '/admin/settings/payment-information', '/admin/administrators?page=0']) await call(route, token);
    }
    // Logout revokes only this QA session; never keep remote tokens in evidence.
    await call('/auth/logout', token, {});
  }
}
main().catch(e => { console.error('Live verification:', e.name); process.exitCode = 1; }).finally(() => fs.writeFileSync(path.join(dir, 'live-readonly-evidence.json'), JSON.stringify({ timestamp: new Date().toISOString(), base, writes: 'login/logout sessions only; business GET only', checks }, null, 2)));
