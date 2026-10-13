// Pure synthetic core-handler probes: no .env, server startup, network or provider.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { loadBetaData } = require('../../lib/betaAdmin');
const source = fs.readFileSync('server.js', 'utf8');

async function withdrawal(mode) {
  const start = source.indexOf("app.post('/api/questionnaire/health-consent/withdraw'");
  const end = source.indexOf("\napp.patch('/api/questionnaire/runs/:id/archive'", start);
  assert.ok(start >= 0 && end > start);
  let handler;
  const rows = [1, 2].map(id => ({ id, answers: { postizeni: 'ano', postizeni_typ: ['sluchove'] },
    matches: [{ school_id: 11, reason: 'Hearing-support explanation from the old answers.' }],
    extra_reasons: { 11: 'Cached hearing-support explanation.' } }));
  const updates = [];
  const db = { from() {
    let patch, id;
    const q = {
      select() { return q; }, update(value) { patch = value; return q; },
      eq(key, value) { if (key === 'id') id = value; return q; },
      then(resolve, reject) {
        let result;
        if (!patch) result = { data: structuredClone(rows), error: null };
        else {
          updates.push({ id, patch });
          result = mode === 'partial' && id === 2 ? { data: null, error: { code: 'synthetic' } }
            : { data: null, error: null };
          if (!result.error && mode !== 'zero-affected') Object.assign(rows.find(r => r.id === id), patch);
        }
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return q;
  } };
  vm.runInNewContext(source.slice(start, end), {
    app: { post(...args) { handler = args.at(-1); } }, requireAuth() {}, supabase: db,
    getScoringCatalogue: async () => [], REASON_COUNT: 10,
    scoreSchools: () => [{ school_id: 11, score: 50, signals: [], breakdown: {} }],
  });
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; } };
  await handler({ user: { id: 'synthetic-owner' } }, res);
  return { mode, status: res.statusCode, response: res.body, updates: updates.length,
    health_remaining: rows.map(r => 'postizeni' in r.answers),
    old_reason_retained: rows[0].matches[0].reason.includes('Hearing'),
    extra_reason_retained: rows[0].extra_reasons[11].includes('hearing') };
}

async function main() {
  const success = await withdrawal('success'), partial = await withdrawal('partial'), zero = await withdrawal('zero-affected');
  assert.deepEqual(success.health_remaining, [false, false]);
  assert.equal(success.old_reason_retained && success.extra_reason_retained, true);
  assert.deepEqual(partial.health_remaining, [false, true]);
  assert.equal(partial.status, 500);
  assert.deepEqual(zero.health_remaining, [true, true]);
  assert.equal(zero.response.updated, 2);
  let visit;
  const start = source.indexOf('const visitLimiter ='), end = source.indexOf('\nregisterBetaAdmin', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { rateLimit: () => () => {},
    app: { post(...args) { visit = args.at(-1); } },
    supabase: { rpc: async () => ({ data: null, error: { code: '42883' } }) } });
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, end() {} };
  await visit({ get: () => 'Mozilla synthetic desktop' }, res);
  assert.equal(res.statusCode, 204);
  let loadError;
  const missingDb = { from(table) {
    const q = { select() { return q; }, order() { return q; }, range() { return q; }, eq() { return q; }, is() { return q; },
      then(resolve, reject) { return Promise.resolve(table === 'visit_counts'
        ? { error: { code: '42P01' }, data: null } : { data: [], error: null }).then(resolve, reject); } };
    return q;
  } };
  try { await loadBetaData(missingDb); } catch (error) { loadError = error.code; }
  assert.equal(loadError, '42P01');
  const result = { withdrawal: [success, partial, zero],
    missing_visit_rpc_still_returns: res.statusCode, missing_visit_table_rejects_all_admin_snapshot: loadError,
    limits: 'Actual core handlers with synthetic services; auth/RLS, scoring accuracy, transactions and deployed schema are not verified.' };
  fs.writeFileSync('/private/tmp/post-interruption-boundary-probes-2026-10-13.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
