// Emulator lifecycle smoke only; this does not measure physical-device performance.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const adb = 'D:/AndroidStudiosdk/platform-tools/adb.exe';
const run = (...args) => execFileSync(adb, ['-s', 'emulator-5554', ...args], { encoding: 'utf8', timeout: 20000 });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const checks = [];
  const originalPid = run('shell', 'pidof', 'com.pbl6.eventhub').trim();
  try {
    for (let cycle = 1; cycle <= 20; cycle++) {
      run('shell', 'input', 'keyevent', '3');
      run('shell', 'input', 'keyevent', '284');
      await delay(1200);
      let xml;
      for (let attempt = 0; attempt < 3; attempt++) {
        const dumped = run('shell', 'uiautomator', 'dump', '/sdcard/eventhub-lifecycle.xml');
        if (dumped.includes('dumped to:')) {
          xml = run('shell', 'cat', '/sdcard/eventhub-lifecycle.xml');
          break;
        }
        await delay(1000);
      }
      assert.ok(xml, 'UIAutomator returned a current hierarchy');
      const icon = [...xml.matchAll(/<node[^>]+>/g)].map(m => m[0]).find(n => /(?:text|content-desc)="EventHub"/.test(n));
      assert.ok(icon, 'EventHub launcher icon exists');
      const bounds = icon.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);
      run('shell', 'input', 'tap', String(Math.round((bounds[0] + bounds[2]) / 2)), String(Math.round((bounds[1] + bounds[3]) / 2)));
      await delay(800);
      const pid = run('shell', 'pidof', 'com.pbl6.eventhub').trim();
      assert.equal(pid, originalPid, 'Process survives background/resume');
      const activities = run('shell', 'dumpsys', 'activity', 'activities');
      assert.match(activities, /(?:topResumedActivity|mResumedActivity)[^\n]*com\.pbl6\.eventhub/);
      checks.push({ cycle, result: 'PASS', processPreserved: true, foregroundVerified: true });
      if (cycle % 5 === 0) console.log(`PASS ${cycle}/20 emulator background/resume cycles`);
    }
  } finally {
    fs.writeFileSync('.local/mobile-migration/final-acceptance/lifecycle.json', JSON.stringify({ timestamp: new Date().toISOString(), device: 'Pixel_8 emulator Android 17 x86_64', checks, limitations: 'Launcher-based warm resume; no physical-device, FPS, cold-start or iOS measurement.' }, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
