const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isNinthGradeProgram, HIDDEN_TYPES } = require('../lib/ninthGrade');

const rootFile = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

test('9th-grade predicate follows the founder rule table', () => {
  const rows = [
    [{ typ_skoly: 'Gymnázia 6letá', delka_studia: 6 }, false],
    [{ typ_skoly: 'Gymnázia 8letá', delka_studia: 8 }, false],
    [{ typ_skoly: 'Nástavby', delka_studia: 2 }, false],
    [{ typ_skoly: 'Nástavby', delka_studia: 3 }, false],
    [{ typ_skoly: 'Konzervatoře', delka_studia: 8 }, false],
    [{ typ_skoly: 'Konzervatoře', delka_studia: 6 }, true],
    [{ typ_skoly: 'Gymnázia 4letá', delka_studia: 4 }, true],
    [{ typ_skoly: 'Střední odborné školy', delka_studia: 4 }, true],
    [{ typ_skoly: 'Střední odborná učiliště', delka_studia: 3 }, true],
    [{ typ_skoly: 'Střední odborná učiliště', delka_studia: 1 }, true],
    [{ typ_skoly: null, delka_studia: null }, true],
    [{}, true],
  ];
  for (const [row, expected] of rows) {
    assert.equal(isNinthGradeProgram(row), expected, JSON.stringify(row));
  }
});

test('the SQL ninth_grade_program() mirrors lib/ninthGrade.js', () => {
  for (const file of ['supabase-setup.sql', 'migrations/2026-10-10-ninth-grade-scope.sql']) {
    const sql = rootFile(file);
    const fn = sql.match(/function public\.ninth_grade_program[\s\S]*?\$\$;/);
    assert.ok(fn, `${file}: function present`);
    const listed = [...fn[0].match(/in \(([^)]*)\)/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(listed.sort(), [...HIDDEN_TYPES].sort(), `${file}: hidden types`);
    assert.match(fn[0], /p_typ = 'Konzervatoře' and p_delka = 8/);
  }
});

test('the admission import sends hidden-type rows to school_programs_hidden', () => {
  const src = rootFile('scripts', 'import-admission-data.js');
  assert.match(src, /require\('\.\.\/lib\/ninthGrade'\)/);
  assert.match(src, /writePrograms\('school_programs', visibleRows\)/);
  assert.match(src, /writePrograms\('school_programs_hidden', hiddenRows\)/);
  assert.match(src, /recompute_school_admission/);
  const rows = [{ typ_skoly: 'Gymnázia 8letá' }, { typ_skoly: 'Gymnázia 4letá' }];
  assert.deepEqual(rows.filter((r) => !isNinthGradeProgram(r)), [rows[0]]);
});

test('server hides 9th-grade-excluded schools on every user-facing read', () => {
  const src = rootFile('server.js');
  assert.match(src, /function visibleSchool\(s\)[\s\S]{0,80}!s\.hidden_reason/);
  // catalogue + scoring catalogue, ids, detail (and its merged successor), beta names
  assert.match(src, /\.is\('merged_into', null\)\s*\.is\('hidden_reason', null\)/);
  assert.match(src, /\.in\('id', ids\)\.is\('hidden_reason', null\)/);
  assert.equal((src.match(/\.hidden_reason\) return res\.status\(404\)/g) || []).length, 2);
  assert.match(src, /select\('name'\)\.is\('merged_into',null\)\.is\('hidden_reason',null\)/);
  // favourites, picks, notes, shares/snapshots
  assert.match(src, /\.filter\(visibleSchool\)/);
  assert.match(src, /const shown = data\.filter\(\(row\) => visibleSchool\(row\.schools\)\)/);
  assert.match(src, /Škola už není v nabídce/);
  assert.match(src, /unavailable\.has\(row\.school_id\)/);
  assert.match(src, /if \(!visibleSchool\(school\)\) return notFound\(\)/);
});

test('pros/cons and extraction skip hidden schools; extraction prompt carries the 9th-grade rule', () => {
  assert.match(rootFile('scripts', 'generate-school-proscons.js'), /\.is\('hidden_reason', null\)/);
  const extract = rootFile('scripts', 'extract-school-details.js');
  assert.match(extract, /TŘETÍ PRAVIDLO: Aplikace je jen pro žáky 9\. třídy/);
  assert.match(extract, /Ignorujte údaje platné jen pro víceleté gymnázium/);
  assert.match(extract, /hidden_reason/);
});
