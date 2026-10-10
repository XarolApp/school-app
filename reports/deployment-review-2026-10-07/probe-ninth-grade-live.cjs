// Read-only public-school catalogue and service metadata. No user rows, RPC,
// schema/hosted writes, accounts, email, Stripe or model calls. Keys stay private.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../../node_modules/dotenv');
const { isNinthGradeProgram } = require('../../lib/ninthGrade');
const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../.env')));
const fields = ['ma_jidelnu', 'ma_koleje', 'krouzky_kategorie', 'vyukovy_styl_tagy', 'vs_pokracuje_pct', 'pocet_krouzku'];
const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact' };
async function readAll(table, select) {
  const rows = []; let total;
  for (let offset = 0; ; offset += 1000) {
    const url = new URL('/rest/v1/' + table, env.SUPABASE_URL);
    Object.entries({ select, order: 'id', offset, limit: 1000 }).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(table + ' read HTTP ' + response.status);
    const page = await response.json();
    const text = response.headers.get('content-range')?.split('/')[1];
    if (!Array.isArray(page) || !/^\d+$/.test(text || '')) throw Error('Incomplete count metadata: ' + table);
    const count = Number(text);
    if (total != null && total !== count) throw Error('Catalogue count changed during paging: ' + table);
    total = count; rows.push(...page);
    if (page.length < 1000) break;
  }
  if (rows.length !== total || new Set(rows.map(row => row.id)).size !== total) throw Error('Incomplete or duplicate page: ' + table);
  return rows;
}
function summarize(rows) {
  const detail = school => Array.isArray(school.school_extracted_details) ? school.school_extracted_details[0] : school.school_extracted_details;
  return { schools: rows.length, withExtractedRow: rows.filter(school => detail(school) != null).length,
    fields: Object.fromEntries(fields.map(field => {
      const known = rows.map(school => detail(school)?.[field]).filter(value => value != null && (!Array.isArray(value) || value.length));
      return [field, { known: known.length, percent: rows.length ? Math.round(known.length / rows.length * 1000) / 10 : null,
        trueValues: known.filter(value => value === true).length, falseValues: known.filter(value => value === false).length }];
    })) };
}
(async () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Missing read-only service configuration');
  const [schools, visiblePrograms, hiddenPrograms] = await Promise.all([
    readAll('schools', `id,merged_into,hidden_reason,admission_cutoff,acceptance_rate,school_extracted_details(${fields.join(',')})`),
    readAll('school_programs', 'id,school_id,rok,typ_skoly,delka_studia,cutoff,prihlasky,prijati'),
    readAll('school_programs_hidden', 'id,school_id,rok,typ_skoly,delka_studia'),
  ]);
  const visible = schools.filter(school => school.merged_into == null && school.hidden_reason == null);
  const hidden = schools.filter(school => school.hidden_reason != null);
  const byId = new Map(schools.map(school => [school.id, school]));
  const schoolIds = new Set(visible.map(school => school.id));
  const report = { checkedAt: new Date().toISOString(), rawSchools: schools.length,
    mergedSchools: schools.filter(school => school.merged_into != null).length,
    visible: summarize(visible), hiddenSchools: hidden.length,
    partiallyAffectedSchools: new Set(hiddenPrograms.filter(row => schoolIds.has(row.school_id)).map(row => row.school_id)).size,
    visibleProgrammeRows: visiblePrograms.length, hiddenProgrammeRows: hiddenPrograms.length,
    incorrectlyVisibleByJsPredicate: visiblePrograms.filter(row => !isNinthGradeProgram(row)).length,
    incorrectlyHiddenByJsPredicate: hiddenPrograms.filter(isNinthGradeProgram).length,
    visibleSchoolsWithoutProgrammeRows: visible.filter(school => !visiblePrograms.some(row => row.school_id === school.id)).length,
    unknownTypeProgrammeRows: visiblePrograms.filter(row => row.typ_skoly == null).length,
    unknownConservatoryLengthRows: visiblePrograms.filter(row => row.typ_skoly === 'Konzervatoře' && row.delka_studia == null).length,
    visibleProgrammesOnUnavailableSchools: visiblePrograms.filter(row => { const school = byId.get(row.school_id); return !school || school.hidden_reason || school.merged_into; }).length,
    limitation: 'Independent read-only stored-row/count check. Does not execute migrations/RPCs or verify function bodies, grants/RLS, authenticated API isolation, external register completeness, programme eligibility or extracted/source facts. Unknown-type records require provenance checks; JS/SQL nullable parity remains a separate source finding.' };
  const output = path.join(__dirname, 'ninth-grade-live-2026-10-10.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
