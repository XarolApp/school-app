// Read-only OpenAPI schema metadata, with no user rows, RPC calls or writes.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../../node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
(async () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing backend service configuration');
  const response = await fetch(new URL('/rest/v1/', env.SUPABASE_URL), {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Metadata HTTP ' + response.status);
  const api = await response.json(), definitions = api.definitions || api.components?.schemas;
  if (!definitions) throw new Error('Unexpected metadata format');
  const expected = { beta_profile: ['consent_tracking_at', 'tracking_paused_at'], beta_events: ['user_id', 'anon_id'], beta_rankings: ['user_id'] };
  const result = { checkedAtUtc: new Date().toISOString(), httpStatus: response.status,
    tables: Object.fromEntries(Object.entries(expected).map(([table, fields]) => [table, Object.fromEntries(fields.map(field => [field, Boolean(definitions[table]?.properties && Object.hasOwn(definitions[table].properties, field))]))])),
    limitation: 'Metadata exposure only; absence may reflect schema cache. Function bodies, grants, policies, consent withdrawal, deletion and fresh/rerun behavior remain unverified. No production mutation.',
  };
  fs.writeFileSync(path.join(__dirname, 'tracking-schema-2026-10-10.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
