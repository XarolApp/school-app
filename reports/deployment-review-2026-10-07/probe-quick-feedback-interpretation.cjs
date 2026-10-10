// Offline actual registered-handler/admin-function probe; no backend startup,
// real auth, network, database, account or feedback write.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { buildAdminReport } = require(path.join(root, 'lib/betaAdmin'));
const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const start = source.indexOf('const QUICK_FEATURES =');
const end = source.indexOf("app.post('/api/beta/gate'", start);
if (start < 0 || end < 0) throw Error('Current micro handler not found');
let handler, rpcArgs;
vm.runInNewContext(source.slice(start, end), {
  app: { post(_url, ...callbacks) { handler = callbacks.at(-1); } },
  requireAuth() {}, requireBetaTester() {}, betaMicroLimiter() {},
  supabase: { rpc: async (_name, args) => { rpcArgs = args; return { data: { saved: true }, error: null }; } },
});
(async () => {
  const cases = [];
  for (const [id, note] of [['vyhledavani', 'Ano'], ['dotaznik', '5/5'], ['dotaznik', 'Sedí · Tak akorát']]) {
    let status = 200;
    const res = { status(value) { status = value; return this; }, json() { return this; } };
    const body = { id, action: 'answer', rating: null, answers: [], note };
    await handler({ body, user: { id: 'synthetic-tester' } }, res);
    const feedback = [{ id: 1, source: 'micro', kind: 'obecne', page_url: '/beta/rychle/' + id,
      created_at: '2026-10-10T12:00:00Z', message: 'Rychlé hodnocení · ' + id + ' · ' + rpcArgs.p_answer }];
    const report = buildAdminReport('feedback', { feedback });
    const matching = buildAdminReport('matching', { feedback });
    cases.push({ body, status, storedSummary: rpcArgs.p_answer,
      interpretedMessage: report.sections[0].rows[0].message, matchingCards: matching.cards });
  }
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), sourceHashes: {
    server: hash('server.js'), admin: hash('lib/betaAdmin.js'), schema: hash('supabase-setup.sql') },
    scope: 'Actual registered micro handler after mocked auth/limiter middleware and actual admin report function. RPC persistence/prefix modelled from read canonical SQL. No live operation.', cases }, null, 2));
})();
