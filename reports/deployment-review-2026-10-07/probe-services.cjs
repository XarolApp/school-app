// Read-only readiness probe. Never prints credentials, identities, or row bodies.
const fs = require('node:fs');
const dotenv = require('../../node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const front = dotenv.parse(fs.readFileSync('frontend/.env'));
const result = { checkedAt: new Date().toISOString(), supabase: {}, stripe: {} };

async function call(url, key, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...options.headers },
      signal: AbortSignal.timeout(20000),
    });
    const body = options.method === 'HEAD' ? null : await response.json().catch(() => null);
    return { status: response.status, count: response.headers.get('content-range'), body };
  } catch (error) {
    return { status: null, error: error.cause?.code || error.name };
  }
}

(async () => {
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = front.VITE_SUPABASE_ANON_KEY || env.SUPABASE_KEY;
  const origin = env.SUPABASE_URL;
  result.supabase.sameFrontendProject = front.VITE_SUPABASE_URL === origin;
  const sql = fs.readFileSync('supabase-setup.sql', 'utf8');
  const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
  result.supabase.tables = [];
  for (const table of tables) {
    const res = await call(`${origin}/rest/v1/${table}?select=*&limit=0`, service, {
      method: 'HEAD', headers: { Prefer: 'count=exact' },
    });
    result.supabase.tables.push({ table, status: res.status, count: res.count, error: res.error });
  }
  result.supabase.anonymousReads = [];
  for (const table of tables) {
    const res = await call(`${origin}/rest/v1/${table}?select=*&limit=0`, anon, {
      method: 'HEAD', headers: { Prefer: 'count=exact' },
    });
    result.supabase.anonymousReads.push({ table, status: res.status, count: res.count, error: res.error });
  }
  const catalogue = await call(`${origin}/rest/v1/schools?select=id&merged_into=is.null&limit=0`, service, {
    method: 'HEAD', headers: { Prefer: 'count=exact' },
  });
  result.supabase.visibleCatalogue = { status: catalogue.status, count: catalogue.count, error: catalogue.error };
  const settings = await call(`${origin}/rest/v1/beta_program_settings?select=singleton,ends_at,access_hours,feedback_form_url`, service);
  result.supabase.betaSettings = { status: settings.status, error: settings.error };
  if (Array.isArray(settings.body)) result.supabase.betaSettings.rows = settings.body.map((row) => ({
    singleton: row.singleton, ends_at: row.ends_at, access_hours: row.access_hours,
    hasExternalFeedbackForm: Boolean(row.feedback_form_url),
  }));
  const auth = await call(`${origin}/auth/v1/settings`, anon);
  result.supabase.auth = { status: auth.status, error: auth.error };
  if (auth.status === 200) Object.assign(result.supabase.auth, {
    signupDisabled: auth.body?.disable_signup,
    emailAutoconfirm: auth.body?.mailer_autoconfirm,
    emailEnabled: auth.body?.external?.email,
  });
  const schema = await call(`${origin}/rest/v1/`, service, { headers: { Accept: 'application/openapi+json' } });
  result.supabase.schema = { status: schema.status, error: schema.error };
  if (schema.status === 200) {
    result.supabase.schema.betaProfileColumns = Object.keys(schema.body?.definitions?.beta_profile?.properties || {});
    const functions = [...new Set([...sql.matchAll(/create or replace function public\.(\w+)/gi)].map((m) => m[1]))];
    result.supabase.schema.functions = functions.map((name) => ({ name, exposed: Boolean(schema.body?.paths?.[`/rpc/${name}`]) }));
  }
  const roleNote = await call(`${origin}/rest/v1/beta_profile?select=role_note&limit=0`, service, { method: 'HEAD' });
  result.supabase.roleNoteColumn = { status: roleNote.status, error: roleNote.error };
  const buckets = await call(`${origin}/storage/v1/bucket`, service);
  result.supabase.storage = { status: buckets.status, error: buckets.error };
  if (Array.isArray(buckets.body)) result.supabase.storage.buckets = buckets.body.map((bucket) => ({
    name: bucket.name, public: bucket.public, fileSizeLimit: bucket.file_size_limit, allowedMimeTypes: bucket.allowed_mime_types,
  }));
  if (env.STRIPE_SECRET_KEY) {
    const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
    const balance = await call('https://api.stripe.com/v1/balance', '', { headers });
    result.stripe.key = { status: balance.status, error: balance.error, livemode: balance.body?.livemode };
    if (env.STRIPE_PRICE_ID_MONTHLY) {
      const price = await call(`https://api.stripe.com/v1/prices/${encodeURIComponent(env.STRIPE_PRICE_ID_MONTHLY)}`, '', { headers });
      result.stripe.monthlyPrice = {
        status: price.status, error: price.error, active: price.body?.active,
        currency: price.body?.currency, unitAmount: price.body?.unit_amount,
        interval: price.body?.recurring?.interval, livemode: price.body?.livemode,
      };
    }
    const hooks = await call('https://api.stripe.com/v1/webhook_endpoints?limit=100', '', { headers });
    result.stripe.webhooks = { status: hooks.status, error: hooks.error };
    if (hooks.status === 200) result.stripe.webhooks.endpoints = hooks.body.data.map((hook) => ({
      status: hook.status, livemode: hook.livemode,
      usesHttps: hook.url.startsWith('https:'), apiVersion: hook.api_version, events: hook.enabled_events,
    }));
    const account = await call('https://api.stripe.com/v1/account', '', { headers });
    result.stripe.account = { status: account.status, error: account.error, chargesEnabled: account.body?.charges_enabled,
      payoutsEnabled: account.body?.payouts_enabled, hasSupportEmail: Boolean(account.body?.business_profile?.support_email),
      hasSupportUrl: Boolean(account.body?.business_profile?.support_url),
      hasStatementDescriptor: Boolean(account.body?.settings?.payments?.statement_descriptor) };
  }
  if (env.OPENROUTER_API_KEY) {
    const key = await call('https://openrouter.ai/api/v1/key', '', { headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` } });
    result.openrouter = { keyStatus: key.status, error: key.error,
      configuredModelHasProviderPrefix: (env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite').includes('/') };
  }
  fs.writeFileSync('reports/deployment-review-2026-10-07/services.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => { console.error(error.name); process.exitCode = 1; });
