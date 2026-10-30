// Local development only. Never load dotenv or accept an arbitrary DATABASE_URL.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const localDir = path.join(root, '.local/sepay');
function assertLocalUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw Error('Invalid local database URL'); }
  if (u.protocol !== 'postgresql:' || u.hostname !== '127.0.0.1' ||
      u.port !== '55432' || u.pathname !== '/eventhub_sepay_local' ||
      u.username !== 'sepay_local' || !u.password || u.search || u.hash)
    throw Error('Refusing database target: only dedicated SePay local database is allowed');
  return value;
}
function docker(args) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function assertContainer(c) {
  const ports = c.NetworkSettings?.Ports?.['5432/tcp'];
  if (c.Name !== '/eventhub-sepay-local' || !c.State?.Running ||
      c.Config?.Image !== 'postgres:16-alpine' ||
      c.Config?.Labels?.['eventhub.purpose'] !== 'sepay-local-only' ||
      ports?.length !== 1 || ports[0].HostIp !== '127.0.0.1' || ports[0].HostPort !== '55432' ||
      !c.Mounts?.some(m => m.Type === 'volume' && m.Name === 'eventhub-sepay-local-data' && m.Destination === '/var/lib/postgresql/data'))
    throw Error('Local container identity/binding/volume verification failed');
  for (const expected of ['POSTGRES_DB=eventhub_sepay_local', 'POSTGRES_USER=sepay_local'])
    if (!c.Config.Env.includes(expected)) throw Error('Local container database identity mismatch');
}
function verifiedConfig() {
  // Reject ambient DB targets before any DB connection; do not print their credentials.
  for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL'])
    if (process.env[key]) assertLocalUrl(process.env[key]);
  if (process.env.NODE_ENV === 'production') throw Error('Local tooling disabled in production');
  const config = JSON.parse(fs.readFileSync(path.join(localDir, 'config.json'), 'utf8'));
  assertLocalUrl(config.url);
  const container = JSON.parse(docker(['inspect', 'eventhub-sepay-local']))[0];
  assertContainer(container);
  const networks = Object.keys(container.NetworkSettings.Networks);
  if (networks.length !== 1) throw Error('Expected one isolated network');
  const network = JSON.parse(docker(['network', 'inspect', networks[0]]))[0];
  if (network.Labels?.['eventhub.purpose'] !== 'sepay-local-only') throw Error('Expected dedicated local database network');
  const expectedPassword = 'POSTGRES_PASSWORD=' + decodeURIComponent(new URL(config.url).password);
  if (!container.Config.Env.includes(expectedPassword)) throw Error('Local credential does not match container');
  return config;
}
module.exports = { root, localDir, assertLocalUrl, assertContainer, verifiedConfig, docker };
