// Explicit read-only verification. Does not start the app, workers or migrations.
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const env = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env')));

async function main() {
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !(/\.supabase\.(com|co)$/.test(url.hostname))) {
    throw new Error('Unrecognized database target');
  }
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const client = new Client({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(path.join(__dirname, '../.local/certs/supabase-ca.crt')),
      rejectUnauthorized: true,
    },
    connectionTimeoutMillis: 10000,
    application_name: 'eventhub-l0-readonly-verification',
  });
  await client.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SET LOCAL lock_timeout = '2s'");
    const metadata = await client.query(`SELECT current_database() AS database,
      current_setting('transaction_read_only') AS read_only,
      current_setting('server_version') AS version,
      current_user = 'postgres' AS configured_role_is_postgres`);
    // Aggregate real table rows; never select customer/payment identifiers or payloads.
    const data = await client.query(`SELECT
      (SELECT count(*)::text FROM public.users) AS users,
      (SELECT count(*)::text FROM public.orders) AS orders,
      (SELECT count(*)::text FROM public.payments) AS payments,
      (SELECT count(*)::text FROM public.tickets) AS tickets`);
    const schema = await client.query(`SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('sepay_payment_details','sepay_transactions','sepay_transaction_reviews') ORDER BY relname`);
    const history = await client.query('SELECT name FROM public.migrations ORDER BY timestamp');
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ metadata: metadata.rows[0], row_counts: data.rows[0], sepay_tables: schema.rows, migrations: history.rows.map(row=>row.name), transaction: 'rolled_back', tls_verified: true }));
  } finally {
    await client.end();
  }
}
main().catch(error => {
  // Error messages can contain connection data: emit only an error classification.
  console.error(JSON.stringify({ verification: 'failed', code: error.code || error.name }));
  process.exitCode = 1;
});
