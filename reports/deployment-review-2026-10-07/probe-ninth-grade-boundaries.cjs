// Offline actual-source probes only. No .env, server startup, network, hosted
// account/database writes, imports, model request or migration execution.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const sourceFiles = ['server.js', 'tests/server-boundaries.test.cjs', 'lib/ninthGrade.js',
  'supabase-setup.sql', 'migrations/2026-10-10-ninth-grade-scope.sql',
  'scripts/import-admission-data.js', 'tests/ninth-grade.test.cjs'];
const hashSources = () => Object.fromEntries(sourceFiles.map(file => [file,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const before = hashSources();
const testsPath = path.join(root, 'tests/server-boundaries.test.cjs');
const tests = fs.readFileSync(testsPath, 'utf8');
const boundary = tests.indexOf("\ntest('on-demand questionnaire explanations");
assert.ok(boundary >= 0, 'reviewed boundary harness marker exists');
const exported = { exports: {} };
vm.runInNewContext(tests.slice(0, boundary) + '\nmodule.exports = { harness };', {
  module: exported, require: createRequire(testsPath), __dirname: path.dirname(testsPath),
  Date, Buffer, URL, setTimeout, clearTimeout,
}, { filename: testsPath });
const { harness } = exported.exports;
const { isNinthGradeProgram } = require(path.join(root, 'lib/ninthGrade'));

function predicateProbe() {
  const files = ['supabase-setup.sql', 'migrations/2026-10-10-ninth-grade-scope.sql'];
  const expressions = files.map(file => {
    const sql = fs.readFileSync(path.join(root, file), 'utf8');
    const match = sql.match(/function public\.ninth_grade_program\([^]*?as \$\$\s*select ([^]*?)\s*\$\$;/);
    assert.ok(match, 'actual SQL predicate exists: ' + file);
    return match[1];
  });
  assert.equal(expressions[0], expressions[1], 'both actual source predicates match');
  const cases = [
    [null, null], [null, 8], [null, 6], ['Konzervatoře', null],
    ['Konzervatoře', 8], ['Konzervatoře', 6], ['Gymnázia 6letá', null],
    ['Gymnázia 8letá', 8], ['Nástavby', null], ['Gymnázia 4letá', null],
    ['', null], ['Unknown', null],
  ];
  // SQLite shares the documented three-valued AND/OR/NOT semantics used by
  // this expression. This is NOT a PostgreSQL function/migration test.
  const python = 'import json,sqlite3,sys\np=json.load(sys.stdin)\ne=p["expression"].replace("p_typ","?1").replace("p_delka","?2")\nc=sqlite3.connect(":memory:")\nprint(json.dumps([c.execute("select "+e,row).fetchone()[0] for row in p["cases"]]))';
  const sqlResults = JSON.parse(execFileSync('python3', ['-c', python], {
    input: JSON.stringify({ expression: expressions[0], cases }), encoding: 'utf8',
  }));
  const results = cases.map(([typ_skoly, delka_studia], i) => ({ typ_skoly, delka_studia,
    js: isNinthGradeProgram({ typ_skoly, delka_studia }),
    sqlExpression: sqlResults[i] === null ? null : Boolean(sqlResults[i]),
  }));
  const mismatches = results.filter(row => row.js !== row.sqlExpression);
  assert.equal(mismatches.length, 3);
  return { scope: 'Actual extracted SQL expression evaluated by in-memory SQLite; actual JS predicate. PostgreSQL NULL logic independently documented. Does not execute PostgreSQL, migration, grants or hosted SQL.',
    primarySource: 'https://www.postgresql.org/docs/current/functions-logical.html', results, mismatches };
}

async function unknownPickProbe() {
  let stored = [{ user_id: 'user-test', school_id: 1, priority: 1 }];
  const h = harness({ result(query) {
    if (query.table === 'schools') return { data: [{ id: 1, merged_into: null, hidden_reason: null }], error: null };
    if (query.table === 'application_picks' && query.calls.some(([method]) => method === 'delete')) {
      stored = [];
      return { data: null, error: null };
    }
    if (query.table === 'application_picks' && query.calls.some(([method]) => method === 'insert')) {
      return { data: null, error: { code: '23503', message: 'Synthetic unknown-school foreign-key failure' } };
    }
    return { data: null, error: null };
  } });
  const response = await h.call('put', '/api/picks', { body: { picks: [{ schoolId: 999999 }] } });
  assert.equal(response.statusCode, 500);
  assert.equal(stored.length, 0);
  return { scope: 'Actual registered PUT handler with modelled successful DELETE and subsequent FK failure; middleware and database synthetic, no hosted write.',
    requestedUnknownId: 999999, status: response.statusCode, body: response.body,
    originalVisiblePicks: 1, survivingVisiblePicks: stored.length, queryOrder: h.queries };
}

async function cachedExplanationProbe() {
  const h = harness({ result(query) {
    if (query.table === 'questionnaire_runs') return { data: { id: 1, answers: {},
      matches: [], extra_reasons: { 80: 'Synthetic cached explanation for a now-hidden school' } }, error: null };
    if (query.table === 'schools') return { data: [], error: null };
    return { data: null, error: null };
  } });
  const response = await h.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '80' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cached, true);
  assert.equal(h.queries.filter(query => query.table === 'schools').length, 0);
  return { scope: 'Actual registered explanation handler with a synthetic old run cache and no visible school. Middleware/database synthetic; no model/hosted operation.',
    status: response.statusCode, body: response.body, schoolVisibilityReads: 0 };
}

async function importProbe() {
  const source = fs.readFileSync(path.join(root, 'scripts/import-admission-data.js'), 'utf8');
  const start = source.indexOf('  async function writePrograms(table, rows)');
  const end = source.indexOf("\n  const programsWritten = await writePrograms", start);
  assert.ok(start >= 0 && end > start, 'reviewed actual import writer boundary exists');
  const results = [];
  for (const direction of ['visible-to-hidden', 'hidden-to-visible']) {
    const oldRow = { school_id: 1, rok: 2026, kkov: 'synthetic', typ_skoly: direction === 'visible-to-hidden' ? 'Unknown' : 'Gymnázia 8letá' };
    const newRow = { ...oldRow, typ_skoly: direction === 'visible-to-hidden' ? 'Gymnázia 8letá' : 'Gymnázia 4letá' };
    const tables = { school_programs: direction === 'visible-to-hidden' ? [oldRow] : [],
      school_programs_hidden: direction === 'hidden-to-visible' ? [oldRow] : [] };
    const queries = [];
    const supabase = { from(table) {
      const query = { table, calls: [] }; queries.push(query);
      const chain = new Proxy({}, { get(_, method) {
        if (method === 'then') return resolve => {
          const deletion = query.calls.some(([m]) => m === 'delete');
          if (deletion) {
            const year = query.calls.find(([m]) => m === 'eq')[2];
            const ids = query.calls.find(([m]) => m === 'in')[2];
            tables[table] = tables[table].filter(row => row.rok !== year || !ids.includes(row.school_id));
          } else {
            tables[table].push(...query.calls.find(([m]) => m === 'insert')[1]);
          }
          return resolve({ data: null, error: null });
        };
        return (...args) => { query.calls.push([method, ...args]); return chain; };
      } }); return chain;
    } };
    const context = { supabase, console: { error() {} } };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end) + '\nthis.writePrograms = writePrograms;', context);
    const visible = isNinthGradeProgram(newRow) ? [newRow] : [];
    const hidden = isNinthGradeProgram(newRow) ? [] : [newRow];
    await context.writePrograms('school_programs', visible);
    await context.writePrograms('school_programs_hidden', hidden);
    assert.equal(tables.school_programs.length, 1);
    assert.equal(tables.school_programs_hidden.length, 1);
    results.push({ direction, scope: 'Actual extracted import writer; in-memory synthetic Supabase delete/insert responses. No import/model/migration/hosted operation.', tables, queries });
  }
  return results;
}

(async () => {
  const nullablePredicate = predicateProbe();
  const unknownPick = await unknownPickProbe();
  const cachedHiddenExplanation = await cachedExplanationProbe();
  const importClassificationChange = await importProbe();
  assert.deepEqual(hashSources(), before, 'Concurrent source edit: rerun the probe');
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), sourceHashes: before,
    nullablePredicate, unknownPick, cachedHiddenExplanation, importClassificationChange }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
