// Runs the actual released explanation handler against synthetic services only.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
const start = source.indexOf("app.post(\n  '/api/questionnaire/explain/:schoolId',");
const end = source.indexOf('\n/* ---------------------------------------------------------------------------', start);
if (start < 0 || end < 0) throw new Error('Handler boundaries changed; inspect the source before running.');
let handler;
let cached = {};
let arrivals = 0;
let release;
let ready;
const barrier = new Promise(resolve => { release = resolve; });
const bothArrived = new Promise(resolve => { ready = resolve; });
const updates = [];
vm.runInNewContext(source.slice(start, end), {
  app: { post(route, ...steps) { assert.equal(route, '/api/questionnaire/explain/:schoolId'); handler = steps.at(-1); } },
  requireAuth() {}, requireAccess() {}, questionnaireExplainLimiter() {},
  scoringRunQuery: async () => ({ data: { id: 7, answers: {}, matches: [], extra_reasons: { ...cached } }, error: null }),
  OPENROUTER_API_KEY: 'synthetic', OPENROUTER_MODEL: 'synthetic', FRONTEND_URL: 'http://127.0.0.1',
  withDistricts: rows => rows,
  fetchAllSchools: async () => [{ id: 1, name: 'Synthetic one' }, { id: 2, name: 'Synthetic two' }],
  scoreSchools: (_answers, rows) => rows.map(row => ({ school_id: row.id, score: 50 })),
  requestReasons: async ({ shortlist }) => {
    arrivals += 1;
    if (arrivals === 2) ready();
    await barrier;
    const id = shortlist[0].school_id;
    return new Map([[id, `Synthetic explanation ${id}`]]);
  },
  logAiUsage: async () => {},
  supabase: {
    from(table) {
      assert.equal(table, 'questionnaire_runs');
      return {
        update(patch) {
          const result = { error: null, eq() { return result; }, then(resolve) {
            cached = { ...patch.extra_reasons };
            updates.push(Object.keys(cached));
            return Promise.resolve({ error: null }).then(resolve);
          } };
          return result;
        },
      };
    },
  },
  console: { error() {} },
});

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
(async () => {
  const responses = [response(), response()];
  const requests = [1, 2].map((id, index) => handler({
    user: { id: 'synthetic-owner' }, profile: { gender: 'm' }, params: { schoolId: String(id) },
  }, responses[index]));
  await bothArrived;
  release();
  await Promise.all(requests);
  assert.deepEqual(responses.map(res => res.statusCode), [200, 200]);
  assert.equal(responses.every(res => res.body?.reason), true);
  assert.equal(Object.keys(cached).length, 1);
  console.log(JSON.stringify({
    result: 'Reproduced: both explanations succeed, but a concurrent replacement loses one cache entry.',
    successfulResponses: responses.length,
    modelCalls: arrivals,
    cacheWrites: updates,
    finalCachedSchoolIds: Object.keys(cached),
    limitation: 'Actual handler, synthetic service/cache scheduling only. No database, provider, user or payment mutation.',
  }, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
