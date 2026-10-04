/**
 * Matching simulation (plan 019, step 1).
 *
 * Scores every school against N generated answer sets, with BOTH scoring
 * engines (the /dotaznik one in lib/matching.js and the onboarding one in
 * frontend/src/lib/matching.js), and reports which schools land at the top or
 * bottom far more often than the rest. A school that is #3 on average while
 * most sit around #110 is a sign the engine rewards something about its DATA
 * (more extracted text, a cutoff on file, many obory) rather than fit.
 *
 * Answers are sampled uniformly from each question's options, with a skip rate
 * on optional questions. Real students do not answer uniformly, so this finds
 * STRUCTURAL bias, not realistic popularity — the beta's real runs are compared
 * against this baseline in /admin → Matching.
 *
 * Read-only: one SELECT of the schools table, no writes.
 *
 *   node scripts/simulate-matching.mjs [--n 5000] [--seed 1] [--skip 0.25]
 *
 * Output: reports/matching-simulation-<date>.json and .md
 */
import { createRequire, registerHooks } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The frontend imports some files without the ".js" extension (Vite resolves
// it, Node does not). Retry those with ".js" so the real onboarding engine can
// be imported unchanged rather than copied here.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.endsWith('.js')) {
        return nextResolve(`${specifier}.js`, context);
      }
      throw err;
    }
  },
});

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
require('dotenv').config({ path: join(ROOT, '.env') });

const { createClient } = require('@supabase/supabase-js');
const { scoreSchools } = require('../lib/matching');
const { QUESTIONS, questionApplies, validateAnswers } = require('../lib/questionnaire');
const { districtOfSchool } = require('../lib/pragueDistricts');
const obMatching = await import('../frontend/src/lib/matching.js');
const obQuiz = await import('../frontend/src/pages/onboarding/quizQuestions.js');

// --- args -------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
const N = Number(args.n ?? 5000);
const SEED = Number(args.seed ?? 1);
const SKIP = Number(args.skip ?? 0.25);

// --- seeded PRNG (mulberry32), so a run is reproducible ---------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const pick = (list) => list[Math.floor(rand() * list.length)];
function pickSome(list, max) {
  const k = 1 + Math.floor(rand() * Math.min(max, list.length));
  return [...list].sort(() => rand() - 0.5).slice(0, k);
}

// --- answer generators -------------------------------------------------------
function questionnaireAnswers() {
  const raw = {};
  for (const q of QUESTIONS) {
    if (!questionApplies(q, raw) || q.type === 'text') continue;
    if (q.optional && rand() < SKIP) continue;
    const values = (q.options || []).map((o) => o.value);
    if (q.type === 'number') raw[q.id] = 30 + Math.floor(rand() * 66); // 30–95 b.
    else if (q.type === 'multi') raw[q.id] = pickSome(values, Math.min(q.max ?? values.length, values.length - 1));
    else raw[q.id] = pick(values);
  }
  const v = validateAnswers(raw);
  if (!v.ok) throw new Error(`Generated answers rejected: ${v.error}`);
  return v.answers;
}

function onboardingAnswers() {
  const raw = {};
  for (const q of obQuiz.QUESTIONS) {
    if (rand() < SKIP) continue; // every quiz question is skippable
    const values = (q.options || []).map((o) => o.value);
    if (q.type === 'number') raw[q.key] = String(30 + Math.floor(rand() * 66));
    else if (q.type === 'multi') raw[q.key] = pickSome(values, q.max ?? values.length);
    else if (values.length) raw[q.key] = pick(values);
  }
  return obQuiz.cleanAnswers(raw);
}

// --- data ----------------------------------------------------------------------
async function loadSchools() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
  const rows = [];
  for (let from = 0; ; from += 1000) {
    // Same select and merged filter as server.js fetchAllSchools/LIST_SELECT.
    const { data, error } = await supabase
      .from('schools')
      .select('*, school_programs(*), school_extracted_details(*)')
      .is('merged_into', null)
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows.map((s) => ({ ...s, district: districtOfSchool(s) }));
}

// The onboarding gets /api/schools' slimmed list (latest year only).
// ponytail: keeps only the newest year's rows instead of server.js's full
// slimProgramsForList merge; good enough for ranking, swap in the export if
// capacity-group sums ever matter to the onboarding score.
function latestYearOnly(school) {
  const rows = school.school_programs || [];
  const latest = Math.max(0, ...rows.map((r) => r.rok ?? 0));
  return { ...school, school_programs: rows.filter((r) => (r.rok ?? 0) === latest) };
}

function completeness(s) {
  const ext = Array.isArray(s.school_extracted_details) ? s.school_extracted_details[0] : s.school_extracted_details;
  const extFilled = ext ? Object.values(ext).filter((v) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).length : 0;
  const latest = latestYearOnly(s).school_programs;
  return {
    has_cutoff: s.admission_cutoff != null,
    extracted_fields: extFilled,
    obory: new Set(latest.map((r) => `${r.kkov}|${r.zamereni ?? ''}`)).size,
    programs_text_len: String(s.programs || '').length,
  };
}

// --- run -----------------------------------------------------------------------
function simulate(name, schools, makeAnswers, rank) {
  const stats = new Map(schools.map((s) => [s.id, { sum: 0, sumSq: 0, top10: 0, bottom10: 0, count: 0, scoreSum: 0 }]));
  for (let i = 0; i < N; i++) {
    const ranked = rank(makeAnswers());
    const n = ranked.length;
    ranked.forEach((r, idx) => {
      const st = stats.get(r.id);
      if (!st) return;
      const pos = idx + 1;
      st.sum += pos;
      st.sumSq += pos * pos;
      st.count += 1;
      st.scoreSum += r.score;
      if (pos <= 10) st.top10 += 1;
      if (pos > n - 10) st.bottom10 += 1;
    });
    if ((i + 1) % 1000 === 0) process.stderr.write(`  ${name}: ${i + 1}/${N}\n`);
  }
  return schools.map((s) => {
    const st = stats.get(s.id);
    const mean = st.count ? st.sum / st.count : null;
    const sd = st.count ? Math.sqrt(st.sumSq / st.count - mean * mean) : null;
    return {
      id: s.id,
      name: s.name,
      ranked_in: st.count,
      mean_rank: mean && Math.round(mean * 10) / 10,
      sd_rank: sd && Math.round(sd * 10) / 10,
      top10_pct: Math.round((st.top10 / N) * 1000) / 10,
      bottom10_pct: Math.round((st.bottom10 / N) * 1000) / 10,
      mean_score: st.count ? Math.round((st.scoreSum / st.count) * 10) / 10 : null,
      ...completeness(s),
    };
  });
}

function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? Math.round((num / Math.sqrt(dx * dy)) * 100) / 100 : null;
}

function summarise(rows) {
  const ranked = rows.filter((r) => r.mean_rank != null);
  const expected = ranked.length ? 10 / ranked.length * 100 : 0;
  const byMean = [...ranked].sort((a, b) => a.mean_rank - b.mean_rank);
  const corr = Object.fromEntries(
    ['has_cutoff', 'extracted_fields', 'obory', 'programs_text_len'].map((k) => [
      k,
      pearson(ranked.map((r) => Number(r[k])), ranked.map((r) => r.mean_rank)),
    ]),
  );
  return {
    schools_ranked: ranked.length,
    never_ranked: rows.filter((r) => r.mean_rank == null).map((r) => ({ id: r.id, name: r.name })),
    expected_top10_pct: Math.round(expected * 10) / 10,
    // Negative = more data → better (lower) rank. That is the bias signal.
    rank_vs_completeness_correlation: corr,
    most_favoured: byMean.slice(0, 15),
    least_favoured: byMean.slice(-15).reverse(),
    never_top10: ranked.filter((r) => r.top10_pct === 0).length,
  };
}

function table(rows) {
  const head = '| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |\n|---|---|---|---|---|---|---|---|---|';
  return [head, ...rows.map((r, i) =>
    `| ${i + 1} | ${r.name} (id ${r.id}) | ${r.mean_rank} | ${r.sd_rank} | ${r.top10_pct} % | ${r.bottom10_pct} % | ${r.has_cutoff ? 'ano' : 'ne'} | ${r.extracted_fields} | ${r.obory} |`)].join('\n');
}

const schools = await loadSchools();
console.error(`Loaded ${schools.length} schools. N=${N}, seed=${SEED}, skip=${SKIP}`);

const questionnaire = simulate('dotaznik', schools, questionnaireAnswers, (answers) =>
  scoreSchools(answers, schools).map((m) => ({ id: m.school_id, score: m.score })));

const slim = schools.map(latestYearOnly);
const onboarding = simulate('onboarding', slim, onboardingAnswers, (answers) =>
  obMatching.rankSchools(slim, answers, 'student').map((r) => ({ id: r.school.id, score: Math.round(r.score * 100) })));

const result = {
  generated_at: new Date().toISOString(),
  params: { n: N, seed: SEED, skip: SKIP, schools: schools.length },
  questionnaire: { summary: summarise(questionnaire), schools: questionnaire },
  onboarding: { summary: summarise(onboarding), schools: onboarding },
};

const date = new Date().toISOString().slice(0, 10);
const outDir = join(ROOT, 'reports');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `matching-simulation-${date}.json`), JSON.stringify(result, null, 2));

const section = (title, s) => `## ${title}

- Škol v pořadí: ${s.schools_ranked}; nikdy neohodnoceno: ${s.never_ranked.length}
- Kdyby bylo pořadí férové, každá škola by byla v top 10 v ~${s.expected_top10_pct} % případů.
- Škol, které se do top 10 nedostaly ani jednou: ${s.never_top10}
- Korelace průměrného pořadí s úplností dat (záporná = víc dat → lepší pořadí): ${JSON.stringify(s.rank_vs_completeness_correlation)}

### 15 nejzvýhodněnějších
${table(s.most_favoured)}

### 15 nejznevýhodněnějších
${table(s.least_favoured)}
`;

writeFileSync(join(outDir, `matching-simulation-${date}.md`), `# Simulace matchingu — ${date}

${N} náhodných sad odpovědí (seed ${SEED}, přeskočení ${SKIP * 100} %), ${schools.length} škol. Odpovědi jsou rovnoměrně náhodné, takže výsledek ukazuje STRUKTURÁLNÍ zvýhodnění, ne reálnou oblíbenost.

${section('Dotazník (/dotaznik, lib/matching.js)', result.questionnaire.summary)}
${section('Onboarding (frontend/src/lib/matching.js)', result.onboarding.summary)}`);

console.error(`Wrote reports/matching-simulation-${date}.json and .md`);
