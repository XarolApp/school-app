/**
 * Imports real per-school admission data from Cermat's yearly jednotná
 * přijímací zkouška results files (data.cermat.cz) into `schools`.
 *
 *   node scripts/import-admission-data.js file2022.xlsx file2023.xlsx ...
 *   node scripts/import-admission-data.js --dry-run file2026.xlsx   # preview only, no writes
 *
 * Use the file named like "..._skolobory_vysledky.xlsx" (school-obor results).
 * NOT the "..._polozkova_data.xlsx" file — that one is raw per-student exam
 * item responses (one row per student, one column per test question) and has
 * no admission columns at all. Confirmed by inspecting both files' headers.
 *
 * WHAT EACH FILE GIVES US, PER SCHOOL-OBOR ROW (Prague only — OBEC === "Praha"):
 *   PŘIHLÁŠKY CELKEM / PŘIJATÍ      -> acceptance rate for that obor
 *   ČJ+MA - % SKÓR - MIN (PŘIJATI)  -> the lowest score that still got someone
 *                                      admitted — the actual cutoff, once
 *                                      halved (see below). Blank for obory
 *                                      admitted by talent exam instead of the
 *                                      didactic test (e.g. most
 *                                      uměleckořemeslné obory) — that blank is
 *                                      real, not missing data, and is skipped
 *                                      rather than treated as 0.
 *
 * AGGREGATION (per product decision — a school shows ONE number, not its
 * easiest program's number, which would flatter schools with an easy niche
 * track):
 *   1. Within one school, one year: average across every obor the school
 *      offers that year.
 *   2. Across years: average of step 1's per-year number, over every file
 *      given to this run.
 *   Both land on `schools.admission_cutoff` / `schools.acceptance_rate`.
 *   Search.jsx must label this "průměr" so nobody reads it as one program's
 *   guaranteed cutoff.
 *
 * MATCHING: Cermat's school names don't match our scraped names exactly
 * ("SŠ mediální grafiky a tisku, s.r.o." vs our "Střední škola mediální
 * grafiky a tisku, s. r. o."). REDIZO (Cermat's official school id) is exact
 * and stable across years, so:
 *   - a school with a stored `redizo` (from a previous run of this script)
 *     matches instantly on later runs
 *   - a school without one yet is fuzzy-matched by name — legal-entity
 *     suffixes and generic "střední (odborná) škola" words are stripped from
 *     both sides, then scored by token overlap — and the matched REDIZO is
 *     saved back, so every school needs the fuzzy pass at most once, ever
 *   - anything below the match threshold is left alone and logged to
 *     scripts/admission-import-unmatched.txt for manual review, never guessed
 *
 * Writes with the service_role key, same reason as geocode-schools.js: RLS
 * blocks the anon key from writing to `schools` at all.
 *
 * ALSO WRITES `school_programs` — one row per obor per school per year, for
 * every school this run matches. Unlike the schools-level cutoff/acceptance
 * (which are averaged), this table keeps every obor's own numbers, because
 * the search filters (maturita, typ školy, jazyk, KKOV, kapacita, ...) are
 * genuinely per-program facts that averaging would destroy. Re-running this
 * script for a year first DELETEs that year's rows for matched schools, so
 * re-imports are idempotent — no unique constraint is needed because Cermat
 * legitimately publishes several rows for the same school+obor (different
 * zaměření / capacity groups).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ---- name normalization / matching ----------------------------------------

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,()/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Legal-entity suffixes and generic institutional words that appear in almost
// every school's name and carry no distinguishing information — stripping
// them is what lets "SŠ mediální grafiky a tisku, s.r.o." match "Střední
// škola mediální grafiky a tisku, s. r. o." on their shared, actually
// distinctive words ("mediální", "grafiky", "tisku").
const NOISE_WORDS = new Set([
  's', 'r', 'o', 'a', 'p', 'v', 'spol', 'sro', 'ops', 'vos',
  'stredni', 'skola', 'odborna', 'odborne', 'uciliste', 'sos', 'sou', 'ss',
  'stredisko', 'praha',
]);

function coreTokens(name) {
  return normalize(name)
    .split(' ')
    .filter((word) => word.length > 1 && !NOISE_WORDS.has(word));
}

// Cermat sometimes abbreviates with periods ("Sport.gymn." for "Sportovní
// gymnázium"), which normalize() turns into a bare truncated word ("sport").
// A whole-word match would never catch that, so two tokens count as the same
// word when either one is a prefix of the other — with a length floor so
// "s" (already stripped as noise anyway) or "na" can't match half the
// dictionary by accident.
function sameWord(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return a.startsWith(b) || b.startsWith(a);
}

function jaccard(aTokens, bTokens) {
  let shared = 0;
  const usedB = new Set();
  for (const wordA of aTokens) {
    const i = bTokens.findIndex((wordB, idx) => !usedB.has(idx) && sameWord(wordA, wordB));
    if (i !== -1) {
      shared += 1;
      usedB.add(i);
    }
  }
  const union = aTokens.length + bTokens.length - shared;
  return union === 0 ? 0 : shared / union;
}

// Chosen against the real 2026 file: distinct Prague schools' core-token sets
// score well below this against each other, while every true match (checked
// by hand for a sample) scores at or above it.
const MATCH_THRESHOLD = 0.4;

function bestMatch(cermatName, candidates) {
  const cermatTokens = coreTokens(cermatName);
  let best = null;
  let bestScore = 0;

  for (const school of candidates) {
    const score = jaccard(cermatTokens, coreTokens(school.name));
    if (score > bestScore) {
      bestScore = score;
      best = school;
    }
  }

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

// ---- reading one Cermat results file ---------------------------------------

// Read by header name, not by column letter — the file's column order isn't
// a stable contract, but these names are the same every year (confirmed
// against the real 2026 kolo1 "skolobory_vysledky" file).
const COL = {
  redizo: 'REDIZO',
  name: 'NÁZEV ŠKOLY',
  obec: 'OBEC',
  applied: 'PŘIHLÁŠKY CELKEM',
  admitted: 'PŘIJATÍ',
  cutoff: 'ČJ+MA - % SKÓR - MIN (PŘIJATI)',
  rok: 'ROK',
  kkov: 'KKOV',
  oborNazev: 'OBOR - NÁZEV',
  typSkoly: 'TYP ŠKOLY - NÁZEV',
  zrizovatel: 'ZŘIZOVATEL - NÁZEV',
  maturitniStatus: 'MATURITNÍ STATUS',
  povinnostJpz: 'POVINNOST JPZ',
  jazykStudia: 'JAZYK STUDIA',
  delkaStudia: 'DÉLKA STUDIA',
  formaVzdelavani: 'FORMA VZDĚLÁVÁNÍ',
  kapacita: 'KAPACITA',
};

function avg(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// A cutoff of null in the raw file means "not admitted by didactic test" (a
// talent-exam-only obor) — real, not missing. Shared by the school-level
// average and the per-program row below so the two never disagree.
function halvedCutoff(row) {
  const cutoff = row[COL.cutoff];
  if (cutoff === null || cutoff === '' || Number.isNaN(Number(cutoff))) return null;
  // ČJ+MA is the SUM of the two tests' separate 0–100 scores, not their
  // average, so it reads 0–200 in the raw file (a strong student can post
  // 159, 145, etc.). Dividing by 2 turns it into a plain 0–100 "average %
  // correct across both tests" — the number a 15-year-old can actually
  // compare against their own practice-test scores.
  return Number(cutoff) / 2;
}

function toIntOrNull(v) {
  const n = Number(v);
  return v === null || v === '' || Number.isNaN(n) ? null : n;
}

/** One school per REDIZO (its obor rows averaged into one cutoff/acceptance
 *  for the schools-level columns — aggregation step 1), PLUS the raw per-obor
 *  rows themselves for `school_programs`. */
function readYearFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((n) => n !== 'vysvetlivky') || workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  const praha = rows.filter((row) => row[COL.obec] === 'Praha');

  const byRedizo = new Map();
  for (const row of praha) {
    const redizo = String(row[COL.redizo] ?? '').trim();
    if (!redizo) continue;
    if (!byRedizo.has(redizo)) {
      byRedizo.set(redizo, { redizo, name: row[COL.name], rows: [] });
    }
    byRedizo.get(redizo).rows.push(row);
  }

  const perSchool = [];
  for (const group of byRedizo.values()) {
    const cutoffs = [];
    const rates = [];

    for (const row of group.rows) {
      const cutoff = halvedCutoff(row);
      if (cutoff !== null) cutoffs.push(cutoff);

      const applied = Number(row[COL.applied]);
      const admitted = Number(row[COL.admitted]);
      if (applied > 0 && !Number.isNaN(admitted)) {
        rates.push((admitted / applied) * 100);
      }
    }

    perSchool.push({
      redizo: group.redizo,
      name: group.name,
      cutoff: cutoffs.length ? avg(cutoffs) : null,
      rate: rates.length ? avg(rates) : null,
    });
  }

  // One entry per raw obor row — school_id gets attached later, once matching
  // for this file's schools is resolved (see main()).
  const programRows = praha.map((row) => ({
    redizo: String(row[COL.redizo] ?? '').trim(),
    rok: toIntOrNull(row[COL.rok]),
    kkov: row[COL.kkov] || null,
    obor_nazev: row[COL.oborNazev] || null,
    typ_skoly: row[COL.typSkoly] || null,
    zrizovatel: row[COL.zrizovatel] || null,
    maturitni: row[COL.maturitniStatus] === 'maturitní' ? true
      : row[COL.maturitniStatus] === 'nematuritní' ? false : null,
    jpz_povinna: Number(row[COL.povinnostJpz]) === 1 ? true
      : Number(row[COL.povinnostJpz]) === 2 ? false : null,
    jazyk_studia: row[COL.jazykStudia] || null,
    delka_studia: toIntOrNull(row[COL.delkaStudia]),
    forma_vzdelavani: row[COL.formaVzdelavani] || null,
    kapacita: toIntOrNull(row[COL.kapacita]),
    prihlasky: toIntOrNull(row[COL.applied]),
    prijati: toIntOrNull(row[COL.admitted]),
    cutoff: halvedCutoff(row),
  })).filter((r) => r.redizo);

  return { perSchool, programRows };
}

// ---- main -------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const files = args.filter((a) => !a.startsWith('--'));

  if (!files.length) {
    console.error(
      'Usage: node scripts/import-admission-data.js [--dry-run] file1.xlsx [file2.xlsx ...]'
    );
    process.exit(1);
  }

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
  }

  const { data: dbSchools, error } = await supabase.from('schools').select('id, name, redizo');

  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }

  console.log(`${dbSchools.length} schools in the database. Reading ${files.length} file(s)...\n`);

  // schoolId -> { name, redizo, cutoffs: [...], rates: [...] } — one entry
  // per school, filled in across every year file given this run.
  const perSchool = new Map();
  const unmatchedNames = new Map(); // cermat name -> Set of source files it appeared unmatched in
  const rawProgramRows = []; // school_programs candidates, school_id attached once all matching is done

  for (const file of files) {
    const fileLabel = path.basename(file);
    const { perSchool: schoolsThisYear, programRows } = readYearFile(file);
    console.log(`${fileLabel}: ${schoolsThisYear.length} Prague schools found in the file`);

    for (const cermatSchool of schoolsThisYear) {
      // Exact REDIZO match first — free once a school has been matched once,
      // this run or a previous one. Fuzzy name matching only for schools that
      // still don't have a stored REDIZO.
      let dbSchool = dbSchools.find((s) => s.redizo === cermatSchool.redizo);
      if (!dbSchool) {
        dbSchool = bestMatch(cermatSchool.name, dbSchools.filter((s) => !s.redizo));
      }

      if (!dbSchool) {
        if (!unmatchedNames.has(cermatSchool.name)) unmatchedNames.set(cermatSchool.name, new Set());
        unmatchedNames.get(cermatSchool.name).add(fileLabel);
        continue;
      }

      // Remember the match in memory so later files in this same run (and the
      // final write) use it too, and so it stops being a fuzzy-match candidate.
      if (!dbSchool.redizo) dbSchool.redizo = cermatSchool.redizo;

      if (!perSchool.has(dbSchool.id)) {
        perSchool.set(dbSchool.id, { name: dbSchool.name, redizo: dbSchool.redizo, cutoffs: [], rates: [] });
      }
      const entry = perSchool.get(dbSchool.id);
      if (cermatSchool.cutoff !== null) entry.cutoffs.push(cermatSchool.cutoff);
      if (cermatSchool.rate !== null) entry.rates.push(cermatSchool.rate);
    }

    rawProgramRows.push(...programRows);
  }

  // Every redizo that ended up matched, now that the whole run's matching is
  // settled — a redizo seen only in a later file still resolves correctly.
  const redizoToSchoolId = new Map(
    dbSchools.filter((s) => s.redizo).map((s) => [s.redizo, s.id])
  );
  const programRowsToWrite = rawProgramRows
    .map((row) => ({ ...row, school_id: redizoToSchoolId.get(row.redizo) ?? null }))
    .filter((row) => row.school_id !== null)
    .map(({ redizo, ...rest }) => rest); // redizo was only needed to find school_id

  // Aggregation step 2: average each school's per-year numbers across every
  // file provided this run.
  const results = [];
  for (const [schoolId, entry] of perSchool.entries()) {
    results.push({
      id: schoolId,
      name: entry.name,
      redizo: entry.redizo,
      admission_cutoff: entry.cutoffs.length ? round1(avg(entry.cutoffs)) : null,
      acceptance_rate: entry.rates.length ? round1(avg(entry.rates)) : null,
    });
  }

  console.log(`\nMatched ${results.length} of ${dbSchools.length} schools.\n`);
  for (const r of results) {
    console.log(`  ${r.name}: cutoff ${r.admission_cutoff ?? '—'}%, acceptance ${r.acceptance_rate ?? '—'}%`);
  }

  const neverMatched = dbSchools.filter((s) => !perSchool.has(s.id));
  if (neverMatched.length) {
    console.log(`\n${neverMatched.length} schools in the database got no data from any file given this run:`);
    for (const s of neverMatched) console.log(`  - ${s.name}`);
  }

  if (unmatchedNames.size) {
    const reportPath = path.join(__dirname, 'admission-import-unmatched.txt');
    const lines = [...unmatchedNames.entries()].map(
      ([name, files_]) => `${name}  (seen in: ${[...files_].join(', ')})`
    );
    fs.writeFileSync(reportPath, lines.join('\n') + '\n');
    console.log(`\n${unmatchedNames.size} Cermat school names could not be matched to any DB school.`);
    console.log(`Written to ${reportPath} for manual review.`);
  }

  console.log(`\n${programRowsToWrite.length} school_programs rows ready to write (matched schools only).`);

  if (dryRun) {
    console.log('\n--dry-run: nothing written to Supabase.');
    return;
  }

  console.log('\nWriting to Supabase...');
  const now = new Date().toISOString();
  let written = 0;

  for (const r of results) {
    const { error: updateError } = await supabase
      .from('schools')
      .update({
        redizo: r.redizo,
        admission_cutoff: r.admission_cutoff,
        acceptance_rate: r.acceptance_rate,
        admission_data_updated_at: now,
      })
      .eq('id', r.id);

    if (updateError) {
      console.error(`  ! ${r.name}: ${updateError.message}`);
      continue;
    }
    written += 1;
  }

  console.log(`Updated ${written} of ${results.length} schools.`);

  // school_programs: delete-then-insert per (rok, matched schools this run),
  // so re-running a year's file is idempotent without needing a unique
  // constraint (Cermat legitimately publishes several rows per school+obor).
  const rokGroups = new Map();
  for (const row of programRowsToWrite) {
    if (!rokGroups.has(row.rok)) rokGroups.set(row.rok, []);
    rokGroups.get(row.rok).push(row);
  }

  let programsWritten = 0;
  for (const [rok, rowsForYear] of rokGroups.entries()) {
    const schoolIds = [...new Set(rowsForYear.map((r) => r.school_id))];

    const { error: deleteError } = await supabase
      .from('school_programs')
      .delete()
      .eq('rok', rok)
      .in('school_id', schoolIds);

    if (deleteError) {
      console.error(`  ! could not clear existing ${rok} rows: ${deleteError.message}`);
      continue;
    }

    const CHUNK = 500;
    for (let i = 0; i < rowsForYear.length; i += CHUNK) {
      const chunk = rowsForYear.slice(i, i + CHUNK);
      const { error: insertError } = await supabase.from('school_programs').insert(chunk);

      if (insertError) {
        console.error(`  ! could not write ${rok} program rows: ${insertError.message}`);
        continue;
      }
      programsWritten += chunk.length;
    }
  }

  console.log(`Wrote ${programsWritten} of ${programRowsToWrite.length} school_programs rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
