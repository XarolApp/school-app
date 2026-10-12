// Reads current source only. No dotenv, provider, database, or script main runs.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const extractor = fs.readFileSync(path.join(root, 'scripts/extract-special-needs.js'), 'utf8');
function between(a, b) {
  const start = extractor.indexOf(a), end = extractor.indexOf(b, start);
  assert.ok(start >= 0 && end > start);
  return extractor.slice(start, end);
}
const extracted = between('const TYPES =', 'async function callTool(')
  + between('const EXTRACT =', 'async function processSchool(')
  + between('async function processSchool(', 'async function main(')
  + between('async function writeReport(', "(process.argv.includes('--write-report')");
let markdown = '', answers = [], report = { results: [] }, calls = [], writes = [];
const fakeDb = { from(table) { assert.equal(table, 'school_extracted_details'); return {
  select() { return Promise.resolve({ data: [{ school_id: 901 }, { school_id: 902 }], error: null }); },
  update(row) { return { eq(column, id) { writes.push({ column, id, row }); return Promise.resolve({ error: null }); } }; },
  insert(row) { writes.push({ insert: row }); return Promise.resolve({ error: null }); },
}; } };
const context = vm.createContext({
  DATA: '/fixture', REPORT: '/fixture/report.json', DRY_RUN: false, ONLY_IDS: new Set([901]),
  path, fs: { existsSync() { return true; }, readFileSync(file) { return file === '/fixture/report.json' ? JSON.stringify(report) : markdown; } },
  supabase: fakeDb, console: { log() {} },
  callTool: async (...args) => { calls.push(args); assert.ok(answers.length); return structuredClone(answers.shift()); },
});
new vm.Script(extracted + '\nglobalThis.probe = { processSchool, writeReport, excerpts };').runInContext(context);
const school = { id: 901, name: 'Fixture ordinary secondary school', school_programs: [{ kkov: '18-20-M/01', obor_nazev: 'Informační technologie' }] };
async function runSchool(text, extraction, verification) {
  markdown = text; answers = [extraction, verification]; calls = [];
  const result = JSON.parse(JSON.stringify(await context.probe.processSchool(school)));
  assert.equal(calls.length, 2);
  return result;
}
(async () => {
  const prefix = 'Tato základní škola poskytuje podporu žákům se sluchovým postižením a nabízí speciální výukové pomůcky. '.padEnd(110, 'x').slice(0, 100);
  const invented = prefix + ' Střední škola je výhradně určena žákům se sluchovým postižením.';
  const fabricatedTail = await runSchool(prefix + '\nDalší skutečný text.',
    { detail: 'Střední škola je určena žákům se sluchovým postižením.', urceno_pro: ['sluchove'] },
    { stredni_skola_urcena: true, typy: ['sluchove'], citace: invented });
  assert.equal(fabricatedTail.verify.quoteOk, true);
  assert.deepEqual(fabricatedTail.urceno, ['sluchove']);
  assert.equal(markdown.includes(invented), false);
  const missingQuote = await runSchool(prefix,
    { detail: null, urceno_pro: ['sluchove'] },
    { stredni_skola_urcena: true, typy: ['sluchove'], citace: 'Zcela nepřítomná doslovná citace o jiné škole.' });
  assert.equal(missingQuote.verify.quoteOk, false);
  assert.equal(missingQuote.urceno, null);
  assert.equal(missingQuote.detail, null);
  const denied = await runSchool(prefix,
    { detail: 'Střední škola je určena žákům se sluchovým postižením.', urceno_pro: ['sluchove'] },
    { stredni_skola_urcena: false, typy: [], citace: prefix });
  assert.equal(denied.urceno, null);
  assert.equal(denied.detail, 'Střední škola je určena žákům se sluchovým postižením.');
  report = { results: [{ id: 901, urceno: null, detail: 'Reviewed fixture text.' }, { id: 902, error: 'fixture provider error' }] };
  writes = [];
  await assert.rejects(() => context.probe.writeReport(), /report has an error for 902/);
  assert.equal(writes.length, 1);
  const beforeErrorWrites = structuredClone(writes);
  report = { results: [{ id: 901, urceno: null, detail: 'Fixture A.' }, { id: 902, urceno: null, detail: 'Fixture B.' }] };
  writes = [];
  await context.probe.writeReport();
  assert.deepEqual(writes.map(w => w.id), [901, 902]);
  const out = {
    source_sha256: crypto.createHash('sha256').update(extractor).digest('hex'),
    method: 'Exact current helper/function slices executed in VM with fake file/model/database objects; script main and imports excluded.',
    fabricated_quote_tail: { citation_length: invented.length, full_citation_in_source: false, accepted: fabricatedTail },
    wholly_missing_quote_control: missingQuote,
    failed_secondary_audience_verification: denied,
    writes_before_later_report_error: beforeErrorWrites,
    write_report_with_only_ids_901: writes,
    limitations: 'Synthetic controls prove code behavior, not that any specific live school value or model response is incorrect. No network, secrets, dotenv, database writes, or provider calls.'
  };
  fs.writeFileSync('/private/tmp/special-needs-offline-probes-2026-10-12.json', JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
