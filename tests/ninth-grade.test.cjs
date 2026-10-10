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
