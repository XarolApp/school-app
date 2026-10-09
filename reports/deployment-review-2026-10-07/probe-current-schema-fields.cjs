// Read-only service-role OpenAPI metadata: no user rows, RPC calls or schema writes.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../../node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const expected = {
  users: ['gender'],
  questionnaire_runs: ['extra_reasons'],
  decision_profile: ['jpz_expected_gain'],
  beta_profile: ['role_note'],
  beta_feedback: ['reply_read_at'],
  beta_reviews: ['consent_text_version', 'consent_at'],
};
const rpcNames = ['record_beta_events', 'submit_beta_micro', 'submit_beta_closing', 'submit_beta_review'];
(async () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Required backend service configuration is missing.');
  const response = await fetch(new URL('/rest/v1/', env.SUPABASE_URL), {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Schema metadata HTTP ' + response.status);
  const api = await response.json();
  const definitions = api.definitions || api.components?.schemas;
  if (!definitions || !api.paths) throw new Error('Unrecognized metadata format; inspect before claiming coverage.');
  const report = {
    checkedAt: new Date().toISOString(),
    status: response.status,
    tables: Object.fromEntries(Object.entries(expected).map(([table, columns]) => {
      const schema = definitions[table]?.properties;
      return [table, { metadataPresent: Boolean(schema), columns: Object.fromEntries(columns.map(column => [column, Boolean(schema && Object.hasOwn(schema, column))])) }];
    })),
    serviceRoleExposedRpcPaths: Object.fromEntries(rpcNames.map(name => [name, Boolean(api.paths['/rpc/' + name])])),
    limitation: 'OpenAPI presence/absence can reflect schema-cache exposure, not full database definitions. Does not verify current function bodies, constraints, RLS, authenticated grants or behavior. No user rows, RPC calls, schema writes or production mutations.',
  };
  fs.writeFileSync(path.join(__dirname, 'schema-fields-2026-10-09.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
