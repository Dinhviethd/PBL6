// Explicit Live entry point: load the single private server/.env and reject non-Live mode.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const file = path.join(root, '.env');
try {
  const mode = process.argv[2];
  if (!['check', 'api', 'worker'].includes(mode)) throw Error('Invalid mode');
  const env = require('dotenv').parse(fs.readFileSync(file));
  if (env.SEPAY_ENV !== 'live') throw Error('Live configuration required');
  const cloudinaryKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  if (cloudinaryKeys.some((key) => !env[key]?.trim())) throw Error('Cloudinary configuration required');
  // Docker may safely override only bind address, port, browser origins and the
  // mounted CA path. Secrets and database identity always come from the private .env file.
  const overrides = {
    HOST: process.env.SEPAY_RUNTIME_HOST,
    PORT: process.env.SEPAY_RUNTIME_PORT,
    CLIENT_URL: process.env.SEPAY_RUNTIME_CLIENT_URL,
    CLIENT_EXTRA_ORIGINS: process.env.SEPAY_RUNTIME_CLIENT_EXTRA_ORIGINS,
    DB_SSL_CA_FILE: process.env.SEPAY_RUNTIME_DB_SSL_CA_FILE,
    WORKER_HEALTH_FILE: process.env.SEPAY_RUNTIME_WORKER_HEALTH_FILE,
  };
  // The unified file may retain legacy VNPAY sandbox settings for local use.
  // They are intentionally excluded from the SePay Live process.
  const runtimeEnv = Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/^VNPAY_/.test(key) && key !== 'TEST_DATABASE_URL' &&
    key !== 'SEPAY_API_V2_SANDBOX_TOKEN' && key !== 'SEPAY_TEST_WEBHOOK_SECRET'));
  for (const [key, value] of Object.entries(overrides)) if (value) runtimeEnv[key] = value;
  if (runtimeEnv.HOST !== env.HOST && !/^[A-Za-z0-9.:[\]-]+$/.test(runtimeEnv.HOST)) throw Error('Invalid runtime host');
  if (runtimeEnv.PORT !== env.PORT && (!/^\d+$/.test(runtimeEnv.PORT) || Number(runtimeEnv.PORT) < 1 || Number(runtimeEnv.PORT) > 65535)) throw Error('Invalid runtime port');
  if (runtimeEnv.CLIENT_URL !== env.CLIENT_URL && !['http:', 'https:'].includes(new URL(runtimeEnv.CLIENT_URL).protocol)) throw Error('Invalid client origin');
  if (overrides.WORKER_HEALTH_FILE && !/^\/app\/\.local\/runtime\/[A-Za-z0-9._-]+$/.test(overrides.WORKER_HEALTH_FILE)) throw Error('Invalid worker health path');
  const config = require('../dist/configs/sepay-runtime').loadRuntimeConfig(runtimeEnv);
  if (!config.worker) throw Error('Live runtime is disabled');
  for (const key of Object.keys(process.env)) {
    if (/^(SEPAY_|DATABASE_URL$|DB_SSL|JWT_|QR_SECRET$|PAYMENT_MODE$|NODE_ENV$|CLIENT_URL$)/.test(key)) delete process.env[key];
  }
  Object.assign(process.env, runtimeEnv, { DOTENV_CONFIG_PATH: file });
  process.env.SEPAY_WORKER_HEALTH_FILE = overrides.WORKER_HEALTH_FILE || path.join(root, '.local/sepay-live-runtime/sepay-worker-health.json');
  fs.mkdirSync(path.dirname(process.env.SEPAY_WORKER_HEALTH_FILE), { recursive: true });
  if (mode === 'check') console.log(JSON.stringify({
    runtimeConfig: 'valid', environment: runtimeEnv.SEPAY_ENV,
    cloudinaryConfigured: cloudinaryKeys.every((key) => Boolean(process.env[key])),
    legacyVnpayExcluded: !Object.keys(process.env).some((key) => key.startsWith('VNPAY_')),
  }));
  else require(mode === 'api' ? '../dist/main' : './worker.cjs');
} catch {
  console.error('Live runtime configuration rejected; check the private configuration file.');
  process.exitCode = 1;
}
