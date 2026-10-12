/**
 * Special-needs schools: which SECONDARY schools are built for pupils with a
 * disability, plus a short "Praktické informace" text about the support each
 * school describes. Writes school_extracted_details.urceno_pro_postizeni and
 * .specialni_potreby_detail (supabase-setup.sql).
 *
 *   node scripts/extract-special-needs.js [--school-id ID[,ID...]]   # model run → reports/special-needs-2026-10-10.json
 *   node scripts/extract-special-needs.js --write-report [--dry-run]  # review the report, then write it + OVERRIDES
 *
 * Three steps per visible school:
 *   1. Keyword prefilter over the cached markdown (filtered, else raw scrape)
 *      plus name and Cermat programme focus. No hit = no model call, nulls.
 *   2. Extraction: detail text + candidate disability types.
 *   3. Verification, only when step 2 or the name suggests a special school:
 *      a stricter prompt asks whether the STŘEDNÍ ŠKOLA itself (not a ZŠ/MŠ
 *      sharing the name) is for these pupils, with a quote that must appear in
 *      the source. A failed check drops the types and keeps the text.
 *
 * NEVER FABRICATE: null when the site says nothing concrete. A wrong "this
 * school is for deaf pupils" would steer a 14-year-old away from a normal school.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { logAiUsage, fetchWithAiUsage } = require('../lib/aiUsage');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_EXTRACT_MODEL || 'openai/gpt-6-luna';
const PROVIDER = process.env.OPENROUTER_EXTRACT_PROVIDER;
const DRY_RUN = process.argv.includes('--dry-run'); // only affects --write-report
const idArg = process.argv.indexOf('--school-id');
const ONLY_IDS = idArg !== -1 ? new Set(process.argv[idArg + 1].split(',').map(Number)) : null;
const DATA = path.join(__dirname, 'data');
const REPORT = path.join(__dirname, '..', 'reports', 'special-needs-2026-10-10.json');

const TYPES = ['sluchove', 'zrakove', 'telesne', 'mentalni', 'autismus', 'kombinovane'];
const TYPE_PHRASE = {
  sluchove: 'se sluchovým postižením', zrakove: 'se zrakovým postižením', telesne: 's tělesným postižením',
  mentalni: 's mentálním postižením', autismus: 's poruchou autistického spektra', kombinovane: 's více druhy postižení',
};
const KEYWORDS = /posti[žz]en|sluchov|zrakov|nesly[šs]|nevidom|slabozrak|t[ěe]lesn[ěe]m? posti|imobil|voz[íi][čc]k|bezbari[ée]r|autis|ment[áa]ln|speci[áa]ln[íi]m?i? vzd[ěe]l|\bSVP\b|asistent(a|em)? pedagoga|kochle[áa]r|znakov|braill|v[íi]ce vad|zdravotn[íi]m? (posti|znev)|inkluz/i;
const NAME_SIGNAL = /posti[žz]en|sluchov|zrakov|v[íi]ce vad|praktick[áa] [šs]kola|speci[áa]ln/i;

function markdownFor(id) {
  for (const dir of ['filtered-schools', 'scraped-schools']) {
    const file = path.join(DATA, dir, `${id}.md`);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  return '';
}

// Keyword blocks, deduplicated (sites repeat the same header on every page).
// Concrete signals first, so generic SVP boilerplate can't crowd out a
// one-line "budova je bezbariérová" before the cap.
const STRONG = /posti[žz]en|sluchov|zrakov|nesly[šs]|nevidom|bezbari[ée]r|v[ýy]tah|voz[íi][čc]k|imobil|znakov|braill|kochle[áa]r|autis/i;
function excerpts(markdown, cap = 9000) {
  const seen = new Set();
  const blocks = [];
  for (const block of markdown.split(/\n\s*\n/)) {
    if (!KEYWORDS.test(block) && !STRONG.test(block)) continue;
    const text = block.replace(/\s+/g, ' ').trim().slice(0, 900);
    const key = text.toLowerCase();
    if (seen.has(key) || text.length < 25) continue;
    seen.add(key);
    blocks.push(text);
  }
  blocks.sort((a, b) => STRONG.test(b) - STRONG.test(a));
  const out = [];
  let total = 0;
  for (const text of blocks) {
    if (total > cap) break;
    out.push(text);
    total += text.length;
  }
  return out;
}

// Hand-checked corrections (2026-10-10 review of the dry-run report).
const OVERRIDES = {
  176: { urceno: null }, // výchovný ústav: institutional care, not a disability school
  172: { urceno: ['mentalni'], detail: 'Střední škola nabízí jen praktickou školu dvouletou, určenou žákům s mentálním postižením.' }, // site says nothing beyond the obor
  65: { detail: null }, // "not barrier-free" was about a garden concert venue
  152: { detail: null }, // planned 2026 renovation, not the current building
};

const norm = (s) => s.toLowerCase().replace(/[\s*_#>"„“”]+/g, ' ').trim();

async function callTool(system, user, tool) {
  const response = await fetchWithAiUsage('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'SkolaMatch' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 1500,
      reasoning_effort: process.env.OPENROUTER_EXTRACT_EFFORT || 'low',
      ...(PROVIDER ? { provider: { order: [PROVIDER], allow_fallbacks: false } } : {}),
      tools: [{ type: 'function', function: tool }],
      tool_choice: { type: 'function', function: { name: tool.name } },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(120_000),
  }, (outcome) => logAiUsage(supabase, { ...outcome, source: 'extract', model: MODEL }));
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const args = (await response.json())?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error('no tool call');
  return JSON.parse(args);
}

const EXTRACT = {
  name: 'special_needs',
  parameters: {
    type: 'object',
    properties: {
      detail: { type: ['string', 'null'] },
      urceno_pro: { type: 'array', items: { type: 'string', enum: TYPES } },
    },
    required: ['detail', 'urceno_pro'],
  },
};
const EXTRACT_PROMPT = `Z úryvků webu školy zjisti, co STŘEDNÍ ŠKOLA nabízí žákům se zdravotním postižením nebo speciálními vzdělávacími potřebami.
- detail: 1–3 krátké věty česky pro žáka 9. třídy: pro koho je střední škola určena (např. sluchové postižení, výuka ve znakovém jazyce), bezbariérovost, asistenti, speciální obory, internát pro tyto žáky. Pouze konkrétní fakta z textu. Obecné fráze („podporujeme žáky se SVP podle zákona“, „máme výchovného poradce“) nestačí → null. Samotná informace o bezbariérovosti je konkrétní fakt (např. „budova je bezbariérová“, „bezbariérové je jen přízemí“, „škola není bezbariérová“) → vyplň, i u běžné školy. Plány do budoucna nepiš. Pokud konkrétní info chybí, null. Pokud je škola pro postižené určena, detail vždy vyplň. Nepiš, co v textu chybí, a nezmiňuj „úryvky“.
- urceno_pro: typy postižení, pro které je SAMOTNÁ STŘEDNÍ ŠKOLA primárně určena (sluchove, zrakove, telesne, mentalni, autismus, kombinovane = více vad nebo škola zaměřená obecně na žáky se SVP/různá postižení, např. vyžaduje doporučení školského poradenského zařízení). Prázdné pole, pokud je to běžná střední škola, i když přijímá jednotlivé žáky se SVP nebo má jeden obor kategorie E. Pokud je pro postižené jen základní/mateřská škola se stejným názvem, prázdné pole. Praktická škola (78-62-C) a školy jen s obory E pro žáky s mentálním postižením → mentalni.`;

const VERIFY = {
  name: 'verify',
  parameters: {
    type: 'object',
    properties: {
      stredni_skola_urcena: { type: 'boolean' },
      typy: { type: 'array', items: { type: 'string', enum: TYPES } },
      citace: { type: 'string', description: 'doslovná citace z úryvků, max 200 znaků' },
    },
    required: ['stredni_skola_urcena', 'typy', 'citace'],
  },
};
const VERIFY_PROMPT = `Kontrola: Je STŘEDNÍ ŠKOLA (obory, na které se hlásí žák po 9. třídě) primárně určena pro žáky s určitým zdravotním postižením?
Pozor na školy, kde je pro postižené jen základní nebo mateřská škola a střední škola je běžná — pak false. Pozor také na běžné školy, které jen zmiňují inkluzi, jednotlivé žáky se SVP nebo obor sociální péče o postižené — false.
Škola zaměřená především na žáky se SVP / různá postižení (např. přihláška vyžaduje doporučení poradenského zařízení) → true, typ kombinovane.
true jen pokud text (nebo zaměření oborů) výslovně říká, že střední škola / její obory jsou pro žáky s postižením. citace musí být doslovně z úryvků nebo ze seznamu oborů a dokládat právě střední školu.`;

async function processSchool(school) {
  const markdown = markdownFor(school.id);
  const programs = [...new Set((school.school_programs || [])
    .map((p) => `${p.kkov} ${p.obor_nazev}${p.zamereni ? ` (${p.zamereni.slice(0, 90)})` : ''}`))].slice(0, 25);
  const nameHit = NAME_SIGNAL.test(school.name) || programs.some((p) => /posti|sluch|zrak|78-62-C/.test(p));
  const chunks = excerpts(markdown);
  if (!chunks.length && !nameHit) return { id: school.id, name: school.name, skipped: true, urceno: null, detail: null };

  const context = `Škola: ${school.name}\nObory střední školy (Cermat):\n${programs.join('\n') || '(žádné)'}\n\nÚryvky webu:\n${chunks.join('\n---\n') || '(web nic nezmiňuje)'}`;
  const first = await callTool(EXTRACT_PROMPT, context, EXTRACT);
  let urceno = (first.urceno_pro || []).filter((t) => TYPES.includes(t));
  let verify = null;
  if (urceno.length || nameHit || first.detail) {
    verify = await callTool(VERIFY_PROMPT, context, VERIFY);
    const haystack = norm(`${context} ${markdown}`);
    // The model sometimes elides with "…": every remaining piece must be verbatim.
    const pieces = (verify.citace || '').split(/\.\.\.|…/).map(norm).filter((x) => x.length >= 12);
    const quoteOk = pieces.length > 0 && pieces.every((x) => haystack.includes(x.slice(0, 100)));
    const verified = (verify.typy || []).filter((t) => TYPES.includes(t));
    urceno = verify.stredni_skola_urcena && quoteOk ? (verified.length ? verified : urceno) : [];
    verify.quoteOk = Boolean(quoteOk);
  }
  // Praktická škola (78-62-C) is by law for pupils with moderate/severe
  // mental disability — a school offering nothing else is a special school.
  const codes = (school.school_programs || []).map((p) => p.kkov);
  if (codes.length && codes.every((c) => /^78-62-C/.test(c)) && !urceno.includes('mentalni')) urceno.push('mentalni');
  let detail = typeof first.detail === 'string' && first.detail.trim().length > 20 ? first.detail.trim() : null;
  // Meta-commentary about the source or future plans is not a fact about the school.
  if (detail && /úryvk|v textu|nikoli popis|neuveden|nejsou uveden|plánovan/i.test(detail)) detail = null;
  if (!detail && urceno.length) detail = `Střední škola je určena žákům ${urceno.map((t) => TYPE_PHRASE[t]).join(', ')}.`;
  return { id: school.id, name: school.name, nameHit, urceno: urceno.length ? urceno : null, detail, verify };
}

async function main() {
  if (!API_KEY) throw new Error('OPENROUTER_API_KEY missing');
  const { data: schools, error } = await supabase.from('schools')
    .select('id,name,school_programs(kkov,obor_nazev,zamereni),school_extracted_details(school_id)')
    .is('merged_into', null).is('hidden_reason', null).order('id');
  if (error) throw error;
  const todo = schools.filter((s) => !ONLY_IDS || ONLY_IDS.has(s.id));
  const results = [];
  for (let i = 0; i < todo.length; i += 4) {
    const batch = await Promise.all(todo.slice(i, i + 4).map((s) =>
      processSchool(s).catch((e) => ({ id: s.id, name: s.name, error: e.message }))));
    for (const r of batch) {
      results.push(r);
      if (!r.skipped) console.log(r.id, r.error ? `ERROR ${r.error}` : `${r.urceno ? `[${r.urceno}]` : '[]'} ${r.detail ? r.detail.slice(0, 110) : '—'}`);
    }
  }
  fs.writeFileSync(REPORT, JSON.stringify({ model: MODEL, results }, null, 2));
  console.log(`\n${results.filter((r) => r.urceno).length} special schools, ${results.filter((r) => r.detail).length} with text, ${results.filter((r) => r.error).length} errors. Report: ${REPORT}`);
}

// Writes exactly the reviewed report (model output varies run to run).
async function writeReport() {
  const { results } = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const { data: rows, error } = await supabase.from('school_extracted_details').select('school_id');
  if (error) throw error;
  const hasRow = new Set(rows.map((r) => r.school_id));
  for (const r of results) {
    if (r.error) throw new Error(`report has an error for ${r.id}; re-run the dry run`);
    const fix = OVERRIDES[r.id] || {};
    const urceno = 'urceno' in fix ? fix.urceno : r.urceno;
    const row = { urceno_pro_postizeni: urceno?.length ? urceno : null, specialni_potreby_detail: 'detail' in fix ? fix.detail : r.detail };
    console.log(r.id, row.urceno_pro_postizeni || '', row.specialni_potreby_detail ? row.specialni_potreby_detail.slice(0, 80) : '');
    if (DRY_RUN) continue;
    // Don't create an empty details row just to store "nothing found".
    const { error: writeError } = hasRow.has(r.id)
      ? await supabase.from('school_extracted_details').update(row).eq('school_id', r.id)
      : (row.urceno_pro_postizeni || row.specialni_potreby_detail)
        ? await supabase.from('school_extracted_details').insert({ school_id: r.id, ...row })
        : { error: null };
    if (writeError) throw new Error(`${r.id}: ${writeError.message}`);
  }
  console.log('Written.');
}

(process.argv.includes('--write-report') ? writeReport() : main()).catch((e) => { console.error(e); process.exit(1); });
