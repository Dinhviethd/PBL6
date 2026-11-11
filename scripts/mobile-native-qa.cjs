// UIAutomator/ADB checks against the connected QA emulator and synthetic fixture.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const adb = 'D:/AndroidStudiosdk/platform-tools/adb.exe';
const dir = path.resolve(__dirname, '../.local/mobile-migration');
const run = (...args) => execFileSync(adb, ['-s', 'emulator-5554', ...args], { encoding: 'utf8', timeout: 20000 });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = s => s.replace(/&amp;/g, '&').replace(/&#10;/g, '\n').replace(/&quot;/g, '"');
function nodes() {
  run('shell', 'uiautomator', 'dump', '/sdcard/eventhub-native-qa.xml');
  const xml = run('shell', 'cat', '/sdcard/eventhub-native-qa.xml');
  return [...xml.matchAll(/<node[^>]+>/g)].map(m => Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], decode(x[2])])));
}
function tapNode(node) {
  assert.ok(node, 'Expected UI element exists');
  const bounds = node.bounds.match(/\d+/g).map(Number);
  run('shell', 'input', 'tap', String(Math.round((bounds[0] + bounds[2]) / 2)), String(Math.round((bounds[1] + bounds[3]) / 2)));
}
function byLabel(label, list = nodes()) { return list.find(n => n['content-desc'] === label || n.text === label); }
async function open(route) {
  assert.ok(route.startsWith('/') && !/[\s'";&]/.test(route));
  run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `eventhub://${route.slice(1)}`, 'com.pbl6.eventhub');
  await delay(1200);
}
async function snapshot(name) {
  assert.match(name, /^[a-z0-9-]+$/);
  const list = nodes();
  fs.writeFileSync(path.join(dir, `${name}-ui.json`), JSON.stringify(list.filter(n => n.text || n['content-desc']).map(n => ({ text: n.password === 'true' ? '[password]' : n.text, label: n['content-desc'], bounds: n.bounds, class: n.class })), null, 2));
  run('shell', 'screencap', '-p', `/sdcard/${name}.png`);
  run('pull', `/sdcard/${name}.png`, path.join(dir, `${name}.png`));
  console.log(`Saved ${name}: ${list.length} UI nodes`);
  return list;
}
async function waitFor(predicate, timeout = 20000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const list = nodes();
    if (predicate(list)) return list;
    await delay(600);
  }
  throw new Error('Native UI did not reach expected state before timeout');
}
async function main() {
  const [action, argument] = process.argv.slice(2);
  if (action === 'offline-restore') {
    const previousWifi = run('shell', 'settings', 'get', 'global', 'wifi_on').trim();
    const previousData = run('shell', 'settings', 'get', 'global', 'mobile_data').trim();
    const evidence = [];
    try {
      run('shell', 'svc', 'wifi', 'disable'); run('shell', 'svc', 'data', 'disable');
      run('shell', 'am', 'force-stop', 'com.pbl6.eventhub');
      run('shell', 'input', 'keyevent', '3'); run('shell', 'input', 'keyevent', '284');
      await delay(700); tapNode(byLabel('EventHub'));
      await delay(17000); tapNode(byLabel('Tài khoản'));
      await waitFor(list => list.some(n => n['content-desc'] === 'Thử khôi phục phiên'));
      await snapshot('native-offline-restore');
      evidence.push({ check: 'offline startup exposes session retry without deleting refresh', result: 'PASS' });
    } finally {
      if (previousWifi === '1') run('shell', 'svc', 'wifi', 'enable');
      if (previousData === '1') run('shell', 'svc', 'data', 'enable');
    }
    await delay(3500); tapNode(byLabel('Thử khôi phục phiên'));
    await delay(5000); tapNode(byLabel('Tài khoản'));
    await waitFor(list => list.some(n => n.text === 'admin@example.test'));
    await snapshot('native-online-restored');
    evidence.push({ check: 'network restored retries the same Admin session', result: 'PASS' });
    fs.writeFileSync(path.join(dir, 'native-offline-evidence.json'), JSON.stringify({ timestamp: new Date().toISOString(), checks: evidence }, null, 2));
    console.log('PASS offline boot and online session retry'); return;
  }
  if (action === 'customer-smoke') {
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, 'booking-fixture.json'), 'utf8'));
    const evidence = [];
    const check = (label, ok) => { assert.ok(ok, label); evidence.push({ label, result: 'PASS' }); console.log('PASS', label); };
    try {
      await open('/profile');
      let list = nodes();
      check('native profile loads authenticated customer', list.some(n => n.text === fixture.buyer.email));
      const phone = list.find(n => n.class === 'android.widget.EditText' && n['content-desc'] === 'Số điện thoại');
      tapNode(phone); run('shell', 'input', 'text', '0901234567'); run('shell', 'input', 'keyevent', '4');
      tapNode(nodes().find(n => n.class === 'android.widget.Button' && n['content-desc'] === 'Lưu thay đổi'));
      await delay(800); list = nodes();
      check('native profile save acknowledged', list.some(n => /Đã lưu thông tin cá nhân/.test(n.text)));
      await snapshot('native-profile-saved');
      await open('/admin/users'); list = nodes();
      check('customer deep link denied admin access', list.some(n => n.text === 'Bạn chưa có quyền truy cập'));
      await snapshot('native-customer-admin-denied');
      await open(`/payment-status/${fixture.paidOrder}`); list = nodes();
      check('native payment result reads PAID from server', list.some(n => n.text === 'Thanh toán thành công'));
      await snapshot('native-paid-result');
      await open('/tickets'); list = nodes();
      check('native ticket wallet renders', list.some(n => /Mở vé /.test(n['content-desc'])));
      await snapshot('native-wallet');
      // Kill the background app process, then reload the dev client to test persisted refresh.
      run('shell', 'input', 'keyevent', '3'); run('shell', 'am', 'kill', 'com.pbl6.eventhub');
      run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'exp+eventhub-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084', 'com.pbl6.eventhub');
      await delay(3500); await open('/account');
      list = await waitFor(items => items.some(n => n.text === fixture.buyer.email));
      check('native session restored after process restart', list.some(n => n.text === fixture.buyer.email));
      await snapshot('native-session-restored');
    } finally { fs.writeFileSync(path.join(dir, 'native-customer-evidence.json'), JSON.stringify({ timestamp: new Date().toISOString(), device: 'Pixel_8 emulator Android 17', api: 'http://10.0.2.2:8016/api', checks: evidence }, null, 2)); }
    return;
  }
  if (action === 'restore-check') {
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, 'booking-fixture.json'), 'utf8'));
    await open('/account');
    await waitFor(items => items.some(n => n.text === fixture.buyer.email));
    await snapshot('native-session-restored');
    const file = path.join(dir, 'native-customer-evidence.json');
    const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    evidence.checks.push({ label: 'native session restored after process restart (wait for asynchronous restore)', result: 'PASS' });
    evidence.timestamp = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
    console.log('PASS native persisted refresh restored expected account'); return;
  }
  if (action === 'management-smoke') {
    const f = JSON.parse(fs.readFileSync(path.join(dir, 'booking-fixture.json'), 'utf8'));
    const evidence = [];
    for (const [route, expected, name] of [
      ['/organizer', 'Tổng quan Ban tổ chức', 'native-organizer-dashboard'],
      ['/organizer/events', 'Sự kiện của bạn', 'native-organizer-events'],
      [`/organizer/events/${f.event.id}`, f.event.title, 'native-organizer-event-detail'],
      [`/organizer/events/${f.event.id}/stats`, 'Thống kê sự kiện', 'native-organizer-stats'],
      ['/admin', 'Tổng quan quản trị', 'native-admin-dashboard'],
      ['/admin/categories', 'Danh mục sự kiện', 'native-admin-categories'],
      ['/admin/settings', 'Cấu hình thanh toán', 'native-admin-settings'],
    ]) {
      await open(route); await waitFor(list => list.some(n => n.text === expected));
      const list = await snapshot(name);
      assert.ok(!list.some(n => /Bạn chưa có quyền truy cập|Unmatched Route|Render Error/.test(n.text)));
      evidence.push({ route, expected, result: 'PASS' }); console.log('PASS native', route);
    }
    fs.writeFileSync(path.join(dir, 'native-management-evidence.json'), JSON.stringify({ timestamp: new Date().toISOString(), device: 'Pixel_8 emulator Android 17', checks: evidence }, null, 2)); return;
  }
  if (action === 'scanner-smoke') {
    const f = JSON.parse(fs.readFileSync(path.join(dir, 'booking-fixture.json'), 'utf8'));
    const base = 'http://127.0.0.1:8016/api';
    const login = await (await fetch(base + '/auth/mobile/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f.buyer) })).json();
    const tickets = await (await fetch(base + '/me/tickets', { headers: { Authorization: `Bearer ${login.data.accessToken}` } })).json();
    const ticket = tickets.data.find(t => t.event_id === f.event.id && t.status === 'VALID');
    assert.ok(ticket, 'A real synthetic VALID ticket is available');
    const evidence = [];
    try {
      // Camera was explicitly started through the real Android permission dialog.
      run('shell', 'input', 'keyevent', '3');
      run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `eventhub://checkin/${f.event.id}`, 'com.pbl6.eventhub');
      await waitFor(list => list.some(n => n['content-desc'] === 'Bật camera quét QR'));
      evidence.push({ label: 'camera stops after background/resume', result: 'PASS' });
      await snapshot('native-camera-resumed-stopped');
      async function enter() {
        let list = nodes();
        const input = list.find(n => n.class === 'android.widget.EditText' && n['content-desc'] === 'Mã vé / nội dung QR');
        tapNode(input); run('shell', 'input', 'text', ticket.ticket_code); run('shell', 'input', 'keyevent', '4');
        tapNode(nodes().find(n => n.class === 'android.widget.Button' && n['content-desc'] === 'Kiểm tra & check-in'));
      }
      await enter(); await waitFor(list => list.some(n => /Check-in thành công/.test(n.text)));
      evidence.push({ label: 'native manual entry checks in real VALID ticket', result: 'PASS' });
      await snapshot('native-checkin-success');
      await enter(); await waitFor(list => list.some(n => /Vé đã check-in lúc/.test(n.text)));
      evidence.push({ label: 'native duplicate entry displays already checked in', result: 'PASS' });
      await snapshot('native-checkin-duplicate');
      const after = await (await fetch(base + '/me/tickets', { headers: { Authorization: `Bearer ${login.data.accessToken}` } })).json();
      assert.equal(after.data.find(t => t.id === ticket.id).status, 'CHECKED_IN');
      evidence.push({ label: 'server ticket state is CHECKED_IN', result: 'PASS' });
      console.log('PASS native camera lifecycle and manual check-in/duplicate/server state');
    } finally { fs.writeFileSync(path.join(dir, 'native-scanner-evidence.json'), JSON.stringify({ timestamp: new Date().toISOString(), device: 'Pixel_8 emulator Android 17', checks: evidence }, null, 2)); }
    return;
  }
  if (action === 'snapshot') return snapshot(argument);
  if (action === 'open') { await open(argument); return snapshot('native-current'); }
  if (action === 'open-valid-ticket') {
    for (let i = 0; i < 10; i++) {
      const list = nodes();
      const start = list.findIndex(n => n.text === 'Vé hợp lệ');
      if (start >= 0) {
        const button = list.slice(start).find(n => n.class === 'android.widget.Button' && n['content-desc'].startsWith('Mở vé '));
        if (button) { tapNode(button); await delay(1000); return snapshot('native-live-valid-ticket'); }
      }
      run('shell', 'input', 'swipe', '540', '1850', '540', '750', '350'); await delay(300);
    }
    throw new Error('No visible valid ticket on the current wallet page');
  }
  if (action === 'tap' || action === 'tap-prefix') {
    let target;
    for (let i = 0; i < 7; i++) {
      target = action === 'tap' ? byLabel(argument) : nodes().find(n => n['content-desc'].startsWith(argument) || n.text.startsWith(argument));
      if (target) break;
      run('shell', 'input', 'swipe', '540', '1850', '540', '750', '350');
      await delay(200);
    }
    tapNode(target); await delay(600); return snapshot('native-current');
  }
  if (action === 'login' || action === 'login-live' || action === 'login-visible') {
    const live = action !== 'login';
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, live ? 'live-accounts.json' : 'booking-fixture.json'), 'utf8'));
    const account = fixture[argument || 'buyer'];
    assert.ok(account?.email && account?.password, 'Synthetic QA account exists');
    assert.match(account.email, /^[a-zA-Z0-9@._+-]+$/); assert.match(account.password, /^[a-zA-Z0-9!]+$/);
    if (action === 'login-visible') {
      const accountTab = byLabel('Tài khoản');
      if (accountTab) { tapNode(accountTab); await delay(800); }
      tapNode(byLabel('Đăng nhập')); await delay(1000);
    } else await open('/auth');
    let list = nodes();
    const inputs = list.filter(n => n.class === 'android.widget.EditText');
    assert.equal(inputs.length, 2);
    tapNode(inputs[0]); run('shell', 'input', 'text', account.email);
    run('shell', 'input', 'keyevent', '4');
    list = nodes(); tapNode(list.find(n => n.class === 'android.widget.EditText' && n['content-desc'] === 'Mật khẩu'));
    run('shell', 'input', 'text', account.password); run('shell', 'input', 'keyevent', '4');
    tapNode(nodes().find(n => n.class === 'android.widget.Button' && n['content-desc'] === 'Đăng nhập'));
    await delay(4000);
    if (action === 'login-visible') {
      const tab = byLabel('Tài khoản'); if (tab) tapNode(tab);
    } else await open('/account');
    await waitFor(items => items.some(n => n.text === account.email));
    const result = await snapshot(`native-${live ? 'live-' : ''}${argument || 'buyer'}-account`);
    assert.ok(result.some(n => n.text === account.email), 'Native login displays expected synthetic account');
    console.log('PASS native login and account identity');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
