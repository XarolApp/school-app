// Offline execution of the actual registered server handler. External responses
// are synthetic; no .env, backend startup, network, database or feedback write.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const testsPath = path.join(root, 'tests/server-boundaries.test.cjs');
const tests = fs.readFileSync(testsPath, 'utf8');
const boundary = tests.indexOf("\ntest('on-demand questionnaire explanations");
if (boundary < 0) throw Error('Harness boundary changed; review before running');
const exported = { exports: {} };
vm.runInNewContext(tests.slice(0, boundary) + '\nmodule.exports = { harness };', {
  module: exported, require: createRequire(testsPath), __dirname: path.dirname(testsPath),
  Date, Buffer, URL, setTimeout, clearTimeout,
}, { filename: testsPath });
const { harness } = exported.exports;
const { buildAdminReport } = require(path.join(root, 'lib/betaAdmin'));
const sourceFiles = ['server.js', 'tests/server-boundaries.test.cjs', 'lib/betaAdmin.js',
  'supabase-setup.sql', 'frontend/src/components/BetaReward.jsx'];
const hashSources = () => Object.fromEntries(sourceFiles.map(file => [file,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const sourceBefore = hashSources();
const settings = { singleton: true, access_hours: 48, ends_at: new Date(Date.now() + 86400000).toISOString() };
const request = { body: { id: 'dotaznik', action: 'answer', rating: 5,
  answers: [], note: 'Vlastni napsana zpetna vazba' } };
const renewalCount = h => h.queries.filter(q => q.table === 'users' && q.calls.some(([m]) => m === 'update')).length;
const resultFor = error => q => q.table === 'beta_program_settings' ? { data: settings, error: null }
  : { data: [], error };
(async () => {
  const rpcResult = { data: { micro_asked: { dotaznik: { done: true } } }, error: null };
  const failed = harness({ result: resultFor({ message: 'Synthetic renewal failure' }), rpcResult });
  const first = await failed.call('post', '/api/beta/micro', request);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.accessRenewed, false);
  assert.equal(renewalCount(failed), 1);
  // Model the canonical RPC's already-done guard after its successful commit.
  rpcResult.data = null; rpcResult.error = { code: '23505' };
  const retry = await failed.call('post', '/api/beta/micro', request);
  assert.equal(retry.statusCode, 409);
  assert.equal(renewalCount(failed), 1);
  const zeroRows = harness({ result: resultFor(null) });
  const emptyUpdate = await zeroRows.call('post', '/api/beta/micro', request);
  assert.equal(emptyUpdate.body.accessRenewed, true);
  const interpretation = [];
  for (const [id, note] of [['vyhledavani', 'Ano'], ['dotaznik', '5/5'], ['dotaznik', 'Sedí · Tak akorát']]) {
    const h = harness({ result: resultFor(null) });
    const response = await h.call('post', '/api/beta/micro', { body: { id, action: 'answer', rating: null, answers: [], note } });
    const summary = h.rpcCalls.at(-1).args.p_answer;
    const feedback = [{ id: 1, source: 'micro', kind: 'obecne', page_url: '/beta/rychle/' + id,
      created_at: '2026-10-10T12:00:00Z', message: 'Rychlé hodnocení · ' + id + ' · ' + summary }];
    const report = buildAdminReport('feedback', { feedback });
    interpretation.push({ id, note, status: response.statusCode, accessRenewed: response.body.accessRenewed,
      storedSummary: summary, interpretedMessage: report.sections[0].rows[0].message,
      matchingCards: buildAdminReport('matching', { feedback }).cards });
  }
  const hashes = hashSources();
  assert.deepEqual(hashes, sourceBefore, 'Concurrent source edit: rerun the probe');
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), sourceHashes: hashes,
    scope: 'Actual registered JS handler and helpers with mocked middleware, RPC and database. RPC successful commit/23505 guard modelled from read canonical SQL. Zero matched update rows modelled. Actual admin builder. No hosted operation or PostgreSQL acceptance.',
    failedRenewal: { first: { status: first.statusCode, body: first.body }, retry: { status: retry.statusCode, body: retry.body },
      renewalAttemptsAfterRetry: renewalCount(failed), feedbackRpcCalls: failed.rpcCalls.length },
    zeroMatchedRows: { status: emptyUpdate.statusCode, body: emptyUpdate.body }, interpretation }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
