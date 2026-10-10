// Actual registered routes, synthetic in-memory DB responses only. Does not run
// SQL or change an account. A later disposable DB test must verify locking.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const testPath = path.join(root, 'tests/server-boundaries.test.cjs');
const testSource = fs.readFileSync(testPath, 'utf8');
const end = testSource.indexOf("\ntest('on-demand questionnaire explanations");
assert.ok(end > 0, 'Changed harness boundary requires a new read');
const context = { require: createRequire(testPath), __dirname: path.dirname(testPath), console, Buffer, URL, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(testSource.slice(0, end) + '\nthis.harness = harness;', context);
let releaseSettings, reachedSettings;
const settingsRead = new Promise(resolve => { releaseSettings = resolve; });
const enteredSettings = new Promise(resolve => { reachedSettings = resolve; });
let pausedAt = null;
const h = context.harness({ result: query => {
  if (query.table === 'users') return { data: { subscription_status: 'beta', tester_school_code: 'SYNTHETIC' }, error: null };
  if (query.table === 'beta_profile') {
    const update = query.calls.find(([method]) => method === 'update');
    if (update) pausedAt = update[1].tracking_paused_at;
    return { data: { consent_tracking_at: '2026-10-10T00:00:00Z', tracking_paused_at: pausedAt }, error: null };
  }
  if (query.table === 'beta_program_settings') { reachedSettings(); return settingsRead; }
  return { data: null, error: null };
} });
(async () => {
  const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const event = h.call('post', '/api/beta/events', { headers: { authorization: 'Bearer synthetic' }, body: {
    anon_id: id, session_id: id, events: [{ name: 'page_view', path: '/skoly', props: { referrer: '/' } }],
  } });
  await enteredSettings;
  const off = await h.call('post', '/api/beta/tracking', { body: { enabled: false } });
  assert.equal(off.statusCode, 200);
  assert.ok(pausedAt);
  assert.equal(h.rpcCalls.length, 0);
  for (const table of ['beta_events', 'beta_rankings']) assert.ok(h.queries.some(query => query.table === table && query.calls.some(([method]) => method === 'delete')));
  releaseSettings({ data: { ends_at: new Date(Date.now() + 86400000).toISOString(), access_hours: 48 }, error: null });
  const after = await event;
  assert.equal(after.statusCode, 204);
  assert.equal(h.rpcCalls.length, 1);
  assert.equal(h.rpcCalls[0].name, 'record_beta_events');
  const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const schema = fs.readFileSync(path.join(root, 'supabase-setup.sql'), 'utf8');
  const start = schema.indexOf('create or replace function public.record_beta_events(');
  const rpc = schema.slice(start, schema.indexOf('\n$$;', start));
  assert.ok(rpc.includes('consent_tracking_at is not null') && !rpc.includes('tracking_paused_at'));
  console.log(JSON.stringify({ checkedAtUtc: new Date().toISOString(), serverSha256: crypto.createHash('sha256').update(source).digest('hex'),
    schemaSha256: crypto.createHash('sha256').update(schema).digest('hex'),
    switchStatus: off.statusCode, pauseStored: Boolean(pausedAt), oldRowsDeletionAttempted: true,
    delayedEventStatus: after.statusCode, newEventRpcAfterWithdrawal: h.rpcCalls[0].name,
    canonicalRpcChecksPause: rpc.includes('tracking_paused_at'),
    limitation: 'Actual JS handlers with held synthetic settings read; RPC execution mocked. Canonical SQL inspected, not executed. No hosted mutation or live concurrency claim.',
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
