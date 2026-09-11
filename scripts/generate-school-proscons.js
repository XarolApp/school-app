/**
 * Generates cached pros/cons text per school for the comparison view
 * (plans/006-comparison-decision-tools.md §5).
 *
 *   node scripts/generate-school-proscons.js --dry-run [--limit 5] [--model ...]
 *   node scripts/generate-school-proscons.js [--force]
 *
 * WHY THIS RUNS ONCE PER SCHOOL, NOT PER REQUEST (plan 006 §1.3): the pros/cons
 * text is a function of the school's OWN data (cutoff, acceptance rate,
 * capacity, obor mix, trend) — it is not personalized per student, so there is
 * nothing to gain by generating it live. Doing it here means ~60 calls ever
 * (once per school, again only when that school's underlying data actually
 * changes) instead of one call per student per school viewed. It also means
 * the comparison page renders instantly with no LLM round-trip on the request
 * path.
 *
 * IDEMPOTENT: each school's `data_fingerprint` (sha256 of the exact numbers
 * handed to the model) is compared against the stored one, and a re-run only
 * regenerates schools whose numbers actually moved — normally right after
 * scripts/import-admission-data.js has been run for a new year. --force
 * ignores the fingerprint and regenerates everything (use this when changing
 * the prompt itself, not the data).
 *
 * MODEL: defaults to google/gemini-2.5-flash — chosen 2026-09-10 after the
 * user's explicit push to justify AI cost rather than default to Claude. At
 * this volume (tens of calls, ever) the price difference between models is
 * cents; the real variable is Czech fluency, which cannot be reasoned about
 * in the abstract. Compare models with --model before trusting the default:
 *   for M in google/gemini-2.5-flash-lite google/gemini-2.5-flash anthropic/claude-haiku-4.5; do
 *     node scripts/generate-school-proscons.js --dry-run --limit 5 --model "$M"
 *   done
 * and read the Czech output yourself. See UNFORGET.md "AI feature prompts need
 * real human editing" — this prompt has NOT had that pass yet.
 */

require('dotenv').config();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY in the root .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const DEFAULT_MODEL = process.env.OPENROUTER_PROSCONS_MODEL || 'google/gemini-2.5-flash';

const SYSTEM_PROMPT = `Jsi asistent, který píše krátké shrnutí klad a záporů střední školy pro
českého deváťáka (15 let), tykáním, neformálně ale věcně.

PRAVIDLA (dodržuj přesně):
1. Používej POUZE čísla a fakta, která dostaneš ve vstupu. Nikdy nic o škole
   nevymýšlej — žádné zmínky o učitelích, atmosféře, pověsti, vybavení ani
   ničem, co není v datech.
2. "Zápor" musí být skutečný kompromis vyplývající z dat (např. vyšší hranice
   přijetí, méně oborů, klesající počet míst) — nikdy odrazující nebo
   znevažující formulace. Nikdy neříkej, že se student "nedostane" nebo že
   "nemá šanci".
3. Pokud data na nějaký klad/zápor nestačí, vrať méně položek — nevyplňuj
   prázdné místo obecnou frází.
4. Každá položka je JEDNA věta, max 90 znaků, česky.
5. Vrať 2–3 klady a 2–3 zápory.
6. NIKDY netvrď, že se čtenář/čtenářka na školu dostane nebo nedostane, ani
   že "je přijatý/á". Nevíš, kolik bodů čtenář má — hranice přijetí je
   průměr za školu/obor, ne predikce pro konkrétního člověka. Piš o škole
   ("hranice je X bodů"), nikdy o čtenáři ("dostaneš se", "jsi přijatý").

Odpověz JEN validním JSON, přesně v tomto tvaru, nic jiného:
{"pros": ["věta", "věta"], "cons": ["věta", "věta"]}`;

function median(nums) {
  const sorted = [...nums].filter((n) => n != null && !Number.isNaN(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Minimal obor grouping — mirrors frontend/src/lib/schoolPrograms.js's logic
 *  just enough to get a current-year summary and a 2-point trend, without
 *  importing an ES module into this CommonJS script. */
function summarizeSchool(school) {
  const rows = school.school_programs || [];
  const years = [...new Set(rows.map((r) => r.rok))].sort((a, b) => a - b);
  const latestYear = years[years.length - 1];
  const latestRows = rows.filter((r) => r.rok === latestYear);

  const kapacita = latestRows.reduce((sum, r) => sum + (r.kapacita || 0), 0) || null;
  const prihlasky = latestRows.reduce((sum, r) => sum + (r.prihlasky || 0), 0) || null;
  const oborCount = new Set(latestRows.map((r) => r.kkov || r.obor_nazev)).size;
  const jazyky = [...new Set(rows.map((r) => r.jazyk_studia).filter(Boolean))];

  let trend = null;
  if (years.length >= 2) {
    const oldestYear = years[0];
    const oldestRows = rows.filter((r) => r.rok === oldestYear);
    const oldestPrihlasky = oldestRows.reduce((sum, r) => sum + (r.prihlasky || 0), 0);
    if (oldestPrihlasky && prihlasky) {
      const pct = Math.round(((prihlasky - oldestPrihlasky) / oldestPrihlasky) * 100);
      trend = Math.abs(pct) < 10 ? 'stabilní' : pct > 0 ? 'rostoucí zájem' : 'klesající zájem';
    }
  }

  return { latestYear, kapacita, prihlasky, oborCount, jazyky, trend };
}

// Pre-formats to Czech-locale strings so the model echoes numbers instead of
// re-deciding decimal style itself — otherwise it mixes "78 bodů" (comma
// locale, no decimal) with "39.4 %" (period) across a single run.
const czNum = (v, digits = 1) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: digits }));

function buildInputRecord(school, medians) {
  const summary = summarizeSchool(school);
  // zrizovatel lives on school_programs (per obor per year), not on schools
  // itself — take the most recent year's value, same source the frontend's
  // lib/decisionMatrix.js and lib/comparisonRows.js use.
  const programs = school.school_programs || [];
  const latestYear = Math.max(0, ...programs.map((p) => p.rok || 0));
  const zrizovatel = programs.find((p) => p.rok === latestYear && p.zrizovatel)?.zrizovatel
    || programs.find((p) => p.zrizovatel)?.zrizovatel
    || null;

  return {
    nazev: school.name,
    zrizovatel,
    typy_skoly: [...new Set((school.school_programs || []).map((r) => r.typ_skoly).filter(Boolean))],
    hranice_prijeti_prumer: czNum(school.admission_cutoff),
    mira_prijeti_prumer: czNum(school.acceptance_rate) ? `${czNum(school.acceptance_rate)} %` : null,
    mista_aktualni_rok: summary.kapacita,
    prihlasky_aktualni_rok: summary.prihlasky,
    pocet_oboru: summary.oborCount,
    jazyky: summary.jazyky,
    trend_zajmu: summary.trend,
    prazsky_median_hranice: czNum(medians.cutoff),
    prazsky_median_miry_prijeti: czNum(medians.rate) ? `${czNum(medians.rate)} %` : null,
  };
}

function fingerprint(inputRecord) {
  return crypto.createHash('sha256').update(JSON.stringify(inputRecord)).digest('hex');
}

async function callModel(inputRecord, model) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'SkolaMatch',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 700,
      reasoning: { effort: 'low' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `DATA ŠKOLY:\n${JSON.stringify(inputRecord, null, 2)}` },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Prázdná odpověď modelu.');
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Odpověď neobsahuje JSON.');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.pros) || !Array.isArray(parsed.cons)) {
    throw new Error('Odpověď nemá očekávaný tvar { pros, cons }.');
  }

  const clean = (arr) =>
    arr.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 200)).slice(0, 3);

  return { pros: clean(parsed.pros), cons: clean(parsed.cons), usage: payload?.usage ?? null };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : null;
  const modelArg = args.indexOf('--model');
  const model = modelArg !== -1 ? args[modelArg + 1] : DEFAULT_MODEL;

  console.log(`Model: ${model}${dryRun ? ' (dry run — nothing written)' : ''}\n`);

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name, admission_cutoff, acceptance_rate, school_programs(*)')
    .order('name');

  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }

  const medians = {
    cutoff: median(schools.map((s) => s.admission_cutoff)),
    rate: median(schools.map((s) => s.acceptance_rate)),
  };

  const { data: existing } = await supabase
    .from('school_ai_summary')
    .select('school_id, data_fingerprint');
  const existingBySchool = new Map((existing || []).map((row) => [row.school_id, row.data_fingerprint]));

  let targets = schools;
  if (limit) targets = targets.slice(0, limit);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let totalTokens = 0;

  for (const school of targets) {
    const inputRecord = buildInputRecord(school, medians);
    const fp = fingerprint(inputRecord);

    if (!force && existingBySchool.get(school.id) === fp) {
      skipped += 1;
      continue;
    }

    try {
      const { pros, cons, usage } = await callModel(inputRecord, model);
      if (usage?.total_tokens) totalTokens += usage.total_tokens;

      console.log(`\n${school.name}`);
      pros.forEach((p) => console.log(`  + ${p}`));
      cons.forEach((c) => console.log(`  - ${c}`));

      if (!dryRun) {
        const { error: upsertError } = await supabase.from('school_ai_summary').upsert({
          school_id: school.id,
          pros,
          cons,
          model,
          data_fingerprint: fp,
          generated_at: new Date().toISOString(),
        });
        if (upsertError) throw new Error(upsertError.message);
      }

      generated += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ! ${school.name}: ${err.message}`);
    }
  }

  console.log(
    `\nGenerated ${generated}, skipped ${skipped} (unchanged), failed ${failed}, of ${targets.length} targeted.`
  );
  if (totalTokens) console.log(`~${totalTokens} tokens used this run.`);
  if (dryRun) console.log('--dry-run: nothing written to Supabase.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
