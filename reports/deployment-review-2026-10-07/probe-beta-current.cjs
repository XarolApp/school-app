// Read-only configuration and OpenAPI probe: no user rows, RPC execution or writes.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../../node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
async function get(route, method = 'GET', extra = {}) {
  const response = await fetch(new URL(route, env.SUPABASE_URL), {
    method,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, ...extra },
    signal: AbortSignal.timeout(20000),
  });
  const body = method === 'HEAD' ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Read-only probe HTTP ${response.status}`);
  return { status: response.status, body, range: response.headers.get('content-range') };
}
(async () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Required local service configuration missing');
  const [settings, schools, expected, metadata] = await Promise.all([
    get('/rest/v1/beta_program_settings?select=singleton,ends_at,access_hours,feedback_form_url'),
    get('/rest/v1/beta_schools?select=code&limit=0', 'HEAD', { Prefer: 'count=exact' }),
    get('/rest/v1/beta_schools?select=code&code=eq.PRISTUPTESTOVACIVERZE&limit=0', 'HEAD', { Prefer: 'count=exact' }),
    get('/rest/v1/'),
  ]);
  const properties = metadata.body?.definitions?.beta_profile?.properties || {};
  const result = {
    checkedAt: new Date().toISOString(),
    settings: (settings.body || []).map(row => ({ singleton: row.singleton, ends_at: row.ends_at, access_hours: row.access_hours, hasExternalFeedbackForm: Boolean(row.feedback_form_url) })),
    schoolCodeCount: schools.range,
    intendedCohortCodeCount: expected.range,
    betaProfileMetadata: Object.fromEntries(['role_note', 'consent_tracking_at', 'consent_tracking_version', 'consent_tracking_revoked_at'].map(name => [name, Object.hasOwn(properties, name)])),
    limitation: 'Local service credentials, read-only hosted configuration and exposed column metadata. Does not prove deployed env/build, policy/function bodies/grants, controller approval, actual signup or isolation. No user rows or code values printed; no writes, charges, uploads or messages.',
  };
  fs.writeFileSync(path.join(__dirname, 'beta-cohort-schema-2026-10-10.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
