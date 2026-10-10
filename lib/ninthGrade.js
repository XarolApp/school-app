// Founder rule 2026-10-10: a programme is shown only if a pupil finishing 9th
// grade can apply to it. Mirrors `ninth_grade_program()` in supabase-setup.sql
// (tests/ninth-grade.test.cjs keeps the two identical).
const HIDDEN_TYPES = new Set(['Gymnázia 6letá', 'Gymnázia 8letá', 'Nástavby']);
const HIDDEN_REASON = 'not_for_9th_grade';

function isNinthGradeProgram(row) {
  if (HIDDEN_TYPES.has(row?.typ_skoly)) return false;
  if (row?.typ_skoly === 'Konzervatoře' && Number(row?.delka_studia) === 8) return false;
  return true;
}

module.exports = { isNinthGradeProgram, HIDDEN_TYPES, HIDDEN_REASON };
