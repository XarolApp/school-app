// Current registered handlers with synthetic storage/auth/DB responses only.
// The archive RPC is modelled for control-flow faults, not executed in PostgreSQL.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const testPath = path.join(root, 'tests/server-boundaries.test.cjs');
const source = fs.readFileSync(testPath, 'utf8');
const end = source.indexOf("\ntest('on-demand questionnaire explanations");
assert.ok(end > 0, 'Changed harness boundary requires re-review');
const context = { require: createRequire(testPath), __dirname: path.dirname(testPath), console, Buffer, URL, setTimeout, clearTimeout };
vm.createContext(context);
const harnessSource = source.slice(0, end).replace('...module.exports, storageRemovals,', '...module.exports, _db: db, storageRemovals,');
assert.notEqual(harnessSource, source.slice(0, end));
vm.runInContext(harnessSource + '\nthis.harness = harness;', context);

async function deletionRetry(optOutOnRetry) {
  const archive = [];
  let authAttempts = 0;
  const h = context.harness({ result: () => ({ data: {}, error: null }) });
  h._db.rpc = async (name, args) => {
    assert.equal(name, 'archive_beta_contributions');
    assert.equal(args.p_user_id, 'user-test');
    archive.push({ kind: 'feedback', content: { message: 'Synthetic contribution' } });
    return { data: 1, error: null };
  };
  h._db.auth.admin.deleteUser = async () => {
    authAttempts++;
    return { error: authAttempts === 1 ? { message: 'Synthetic Auth failure' } : null };
  };
  const first = await h.call('delete', '/api/me', { body: { delete_contributions: false } });
  assert.equal(first.statusCode, 500);
  assert.equal(archive.length, 1);
  const retry = await h.call('delete', '/api/me', { body: { delete_contributions: optOutOnRetry } });
  assert.equal(retry.statusCode, 204);
  assert.equal(archive.length, optOutOnRetry ? 1 : 2);
  return { optOutOnRetry, firstStatus: first.statusCode, retryStatus: retry.statusCode, authAttempts, retainedArchiveCopies: archive.length };
}

async function withdrawalCleanupFailure() {
  let paused = false;
  const retained = { beta_events: 1, beta_rankings: 1 };
  const h = context.harness({ result: (query) => {
    if (query.table === 'beta_profile') {
      if (query.calls.some(([method]) => method === 'update')) paused = true;
      return { data: { consent_tracking_at: '2026-10-10T00:00:00Z', tracking_paused_at: paused ? '2026-10-10T01:00:00Z' : null }, error: null };
    }
    if (query.calls.some(([method]) => method === 'delete')) {
      if (query.table === 'beta_rankings') return { data: null, error: { message: 'Synthetic delete failure' } };
      retained[query.table] = 0;
    }
    return { data: null, error: null };
  } });
  const result = await h.call('post', '/api/beta/tracking', { body: { enabled: false } });
  assert.equal(result.statusCode, 500);
  assert.equal(paused, true);
  assert.equal(retained.beta_rankings, 1);
  return { status: result.statusCode, paused, retained, errorText: result.body.error };
}

(async () => {
  const hashes = Object.fromEntries(['server.js', 'supabase-setup.sql', 'frontend/src/pages/Settings.jsx', 'migrations/2026-10-10-beta-contributions-archive.sql', 'migrations/2026-10-10-tracking-withdrawal-guard.sql']
    .map((name) => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')]));
  console.log(JSON.stringify({ checkedAtUtc: new Date().toISOString(), sourceHashes: hashes,
    archiveRetry: await deletionRetry(false), archiveOptOutAfterFailedDeletion: await deletionRetry(true),
    withdrawalPartialCleanup: await withdrawalCleanupFailure(),
    limitation: 'Actual JS handler control flow, synthetic archive/Storage/Auth/PostgREST responses. No hosted mutation, SQL execution, real upload or concurrency certification. Founder D1/D4 retained.' }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
