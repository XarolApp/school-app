/**
 * Phase 2 of the school-detail extraction pipeline (docs/firecrawl-extraction-task.md).
 *
 * Reads the markdown cached by scripts/scrape-schools.js and asks an AI model to
 * pull out six "school life" fields, writing results to
 * public.school_extracted_details. Re-runnable without ever re-scraping —
 * that's the whole point of the two-phase split, so a prompt tweak or a
 * model swap costs no Firecrawl credits.
 *
 *   node scripts/extract-school-details.js --dry-run [--limit N] [--school-id ID]
 *   node scripts/extract-school-details.js [--limit N] [--school-id ID]
 *
 * NEVER FABRICATE: the model is instructed to return null for anything it
 * can't find real evidence for. A wrong "yes this school has a dorm" is
 * actively harmful to a 14-18-year-old making a real decision — see
 * MissingDataGrid.jsx's header comment and the task doc's constraint #1.
 * Generic non-answers ("many clubs are offered") are rejected client-side
 * (looksLikeFiller) and treated as null rather than trusted.
 *
 * Uses either Google Gemini (GOOGLE_GEMINI_API_KEYS) or OpenRouter
 * (OPENROUTER_API_KEY). Google Gemini is checked first — set both keys to choose.
 * Supports multiple comma-separated Google API keys for round-robin load balancing
 * across accounts (avoids 3 RPM per-key rate limit).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}

const GOOGLE_GEMINI_API_KEYS = (process.env.GOOGLE_GEMINI_API_KEYS || '').split(',').filter(Boolean);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!GOOGLE_GEMINI_API_KEYS.length && !OPENROUTER_API_KEY) {
  console.error('Missing both GOOGLE_GEMINI_API_KEYS and OPENROUTER_API_KEY in the root .env. Set at least one.');
  process.exit(1);
}

const USE_GOOGLE = GOOGLE_GEMINI_API_KEYS.length > 0;
console.log(`Using ${USE_GOOGLE ? 'Google Gemini API' : 'OpenRouter'} for extraction.\n`);

const supabase = createClient(supabaseUrl, serviceKey);

const DATA_DIR = path.join(__dirname, 'data', 'scraped-schools');
const MANIFEST_PATH = path.join(DATA_DIR, '_manifest.json');

const DEFAULT_MODEL = USE_GOOGLE
  ? (process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash')
  : (process.env.OPENROUTER_EXTRACT_MODEL || 'anthropic/claude-haiku-4.5');

const FIELDS = [
  ['skolne_poplatky', 'Školné a poplatky — tuition/fees. Only relevant for PRIVATE schools (public/state schools are legally free — do not fill this in as "zdarma"/"free" unless the site is a private school explicitly stating a price).'],
  ['obedy_ubytovani', 'Obědy a ubytování — school meals, dormitory/boarding availability.'],
  ['krouzky_aktivity', 'Kroužky a aktivity — clubs, extracurricular activities, student organizations. Must name specific real activities, not a vague claim that activities exist.'],
  ['maturita_uspesnost', 'Úspěšnost u maturity — ONLY an actual maturita (school-leaving exam) pass rate or statistic, e.g. "95 % úspěšnost u maturity". Do NOT use this field for competition wins, awards, or other student achievements unrelated to the maturita exam itself — those do not belong here even if impressive.'],
  ['vs_uplatneni', 'Kam míří absolventi — ONLY university/college placement: which universities graduates commonly attend, or what share continues to higher education. Do NOT use this field for career outcomes, startups founded, or jobs held — those are not university placement.'],
  ['uplatneni_po_vyuceni', 'Uplatnění po vyučení — post-vocational-training employment outcomes. ONLY applicable to vocational schools (SOU/SOŠ/učiliště) that train students for a trade or profession. If this school is an academic gymnázium with no vocational/apprenticeship track, this field MUST be null.'],
];

const EXTRACT_TOOL = {
  type: 'function',
  function: {
    name: 'extract_school_details',
    description: 'Record the six school-life fields found in the provided page text, or null for any field with no real evidence.',
    parameters: {
      type: 'object',
      properties: Object.fromEntries([
        ...FIELDS.map(([key]) => [
          key,
          {
            type: ['string', 'null'],
            description: 'A short factual answer in Czech, quoting or closely paraphrasing the source text. null if not found.',
          },
        ]),
        ['source_urls', {
          type: 'object',
          description: 'Map of field name -> source URL (from the ## headings in the input) for every non-null field above. Omit keys for null fields.',
          additionalProperties: { type: 'string' },
        }],
      ]),
      required: [...FIELDS.map(([key]) => key), 'source_urls'],
    },
  },
};

const SYSTEM_PROMPT = `Jsi asistent, který z textu webu střední školy extrahuje šest konkrétních
informací pro českého deváťáka vybírajícího si školu.

NEJDŮLEŽITĚJŠÍ PRAVIDLO: Pokud text neobsahuje jasný důkaz pro danou položku,
vrať pro ni null. NIKDY nic nevymýšlej, neodhaduj ani nedosazuj obecně
pravděpodobnou odpověď. Špatná informace (např. "škola má internát", když ve
skutečnosti nemá) je pro studenta škodlivější než přiznání "nevíme".

Nepřijatelné jako odpověď (počítej to jako null): obecné fráze bez konkrétního
obsahu, např. "škola nabízí řadu kroužků" bez jmenování jediného kroužku, nebo
"studenti mají dobré uplatnění" bez čísla nebo konkrétního seznamu škol/firem.

DRUHÉ NEJDŮLEŽITĚJŠÍ PRAVIDLO: Každé pole odpovídá PŘESNĚ JEDNÉ otázce — nikdy
do něj nedávej informaci, která patří jinam, jen proto, že je zajímavá nebo
souvisí s tématem obecně. Konkrétně:
- "maturita_uspesnost" = POUZE reálné číslo/statistika o úspěšnosti u
  maturitní zkoušky. Úspěchy v soutěžích, olympiádách nebo projektech tam
  NEPATŘÍ, i když znějí působivě.
- "vs_uplatneni" = POUZE kam absolventi jdou studovat (vysoké školy, obory,
  podíl pokračujících). Založené startupy, zaměstnání nebo kariérní úspěchy
  tam NEPATŘÍ.
- "uplatneni_po_vyuceni" = POUZE pro učňovské/odborné školy (SOU/SOŠ) s
  výučním listem. Pokud je škola akademické gymnázium bez učňovského oboru,
  toto pole VŽDY vrať jako null, i kdyby text obsahoval nějaké zmínky o
  uplatnění absolventů obecně.
Když si nejsi jistý/á, do kterého pole informace patří, radši ji vynech
(null) než abys ji vložil/a do nesprávného pole.

Pro každé pole, které vyplníš, urči zdrojovou URL z nadpisů
"## PAGE-URL: <url>" ve vstupu, pokud je to jednoznačné.

Zavolej funkci extract_school_details přesně jednou s výsledkem.`;

function looksLikeFiller(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 8) return true;
  // Reject vague claims with no concrete noun/number in them.
  const hasDigit = /\d/.test(trimmed);
  const genericPhrases = [
    /^škola nabízí/i,
    /^studenti (mají|si mohou)/i,
    /^(velký|široký|bohatý) výběr/i,
    /^řada (kroužků|aktivit|možností)/i,
  ];
  const isGeneric = genericPhrases.some((re) => re.test(trimmed));
  return isGeneric && !hasDigit && trimmed.length < 40;
}

// Belt-and-suspenders against wrong-field stuffing (seen in testing: Haiku
// once filled maturita_uspesnost with unrelated competition wins). The
// prompt says these rules explicitly, but a code-side check can't drift the
// way a model's attention can — better to under-fill than mislabel.
const FIELD_GUARDS = {
  maturita_uspesnost: (text) => /matur/i.test(text) && (/\d/.test(text) || /%/.test(text)),
  vs_uplatneni: (text) => /vysok(á|ou|é|ých)?\s*škol|univerzit|(?<![\p{L}\p{N}_])VŠ(?![\p{L}\p{N}_])/iu.test(text),
};

function isVocationalSchool(typySkoly) {
  return typySkoly.some((t) => /odborn|učiliště|(?<![\p{L}\p{N}_])(?:SOU|SOŠ)(?![\p{L}\p{N}_])/iu.test(t || ''));
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`No manifest at ${MANIFEST_PATH} — run scripts/scrape-schools.js first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

let googleKeyIndex = 0;

function getGoogleKey() {
  if (!GOOGLE_GEMINI_API_KEYS.length) return null;
  const key = GOOGLE_GEMINI_API_KEYS[googleKeyIndex % GOOGLE_GEMINI_API_KEYS.length];
  googleKeyIndex += 1;
  return key;
}

async function callModel(text, model, typySkoly) {
  const typeContext = typySkoly.length
    ? `Typ školy (z admission dat): ${typySkoly.join(', ')}${isVocationalSchool(typySkoly) ? '' : ' — TOTO NENÍ učňovská/odborná škola, takže "uplatneni_po_vyuceni" musí být null.'}\n\n`
    : '';

  if (USE_GOOGLE) {
    return callGoogleGemini(text, model, typeContext);
  } else {
    return callOpenRouter(text, model, typeContext);
  }
}

async function callOpenRouter(text, model, typeContext) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'SkolaMatch',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1500,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_school_details' } },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${typeContext}Text webu školy (více stránek oddělených "---"):\n\n${text.slice(0, 150_000)}` },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error('Model did not return a tool call');
  }

  return JSON.parse(toolCall.function.arguments);
}

async function callGoogleGemini(text, model, typeContext) {
  const apiKey = getGoogleKey();
  if (!apiKey) throw new Error('No Google Gemini API key available');

  const googleModel = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: { parts: { text: SYSTEM_PROMPT } },
      contents: {
        parts: [
          {
            text: `${typeContext}Text webu školy (více stránek oddělených "---"):\n\n${text.slice(0, 150_000)}`,
          },
        ],
      },
      tools: [
        {
          function_declarations: [
            {
              name: 'extract_school_details',
              description: 'Record the six school-life fields found in the provided page text, or null for any field with no real evidence.',
              parameters: {
                type: 'OBJECT',
                properties: Object.fromEntries([
                  ...FIELDS.map(([key]) => [
                    key,
                    {
                      type: 'STRING',
                      description: 'A short factual answer in Czech, quoting or closely paraphrasing the source text. null if not found.',
                    },
                  ]),
                  ['source_urls', {
                    type: 'OBJECT',
                    description: 'Map of field name -> source URL (from the ## headings in the input) for every non-null field above. Omit keys for null fields.',
                    additionalProperties: { type: 'STRING' },
                  }],
                ]),
                required: [...FIELDS.map(([key]) => key), 'source_urls'],
              },
            },
          ],
        },
      ],
      tool_config: {
        function_calling_config: {
          mode: 'ANY',
          allowed_function_names: ['extract_school_details'],
        },
      },
      generation_config: {
        temperature: 0,
        max_output_tokens: 1500,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google Gemini ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();

  if (payload.error) {
    throw new Error(`Google Gemini API error: ${payload.error.message}`);
  }

  const toolCall = payload?.candidates?.[0]?.content?.parts?.find((p) => p.functionCall);
  if (!toolCall?.functionCall) {
    throw new Error('Model did not return a function call');
  }

  return toolCall.functionCall.args || {};
}

async function extractSchool(schoolId, model, typySkoly) {
  const filePath = path.join(DATA_DIR, `${schoolId}.md`);
  const text = fs.readFileSync(filePath, 'utf8');

  const raw = await callModel(text, model, typySkoly);
  const vocational = isVocationalSchool(typySkoly);
  const cleaned = {};
  const sourceUrls = {};

  for (const [key] of FIELDS) {
    const value = raw[key];
    const passesGuard = !FIELD_GUARDS[key] || FIELD_GUARDS[key](String(value || ''));
    const allowedField = key !== 'uplatneni_po_vyuceni' || vocational;

    if (typeof value === 'string' && value.trim() && !looksLikeFiller(value) && passesGuard && allowedField) {
      cleaned[key] = value.trim().slice(0, 1000);
      if (raw.source_urls?.[key]) sourceUrls[key] = raw.source_urls[key];
    } else {
      cleaned[key] = null;
    }
  }

  return { ...cleaned, source_urls: sourceUrls };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : null;
  const schoolIdArg = args.indexOf('--school-id');
  const onlySchoolId = schoolIdArg !== -1 ? args[schoolIdArg + 1] : null;
  const modelArg = args.indexOf('--model');
  const model = modelArg !== -1 ? args[modelArg + 1] : DEFAULT_MODEL;

  const manifest = loadManifest();
  let schoolIds = Object.keys(manifest);
  if (onlySchoolId) schoolIds = schoolIds.filter((id) => String(id) === String(onlySchoolId));
  if (limit) schoolIds = schoolIds.slice(0, limit);

  console.log(`Model: ${model}${dryRun ? ' (dry run — nothing written)' : ''}`);
  console.log(`${schoolIds.length} cached schools to process.\n`);

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name, school_programs(typ_skoly)')
    .in('id', schoolIds);
  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }
  const namesById = new Map(schools.map((s) => [String(s.id), s.name]));
  const typesById = new Map(
    schools.map((s) => [String(s.id), [...new Set((s.school_programs || []).map((p) => p.typ_skoly).filter(Boolean))]])
  );

  let processed = 0;
  let failed = 0;
  const failures = [];

  for (const schoolId of schoolIds) {
    const name = namesById.get(String(schoolId)) || `#${schoolId}`;
    const typySkoly = typesById.get(String(schoolId)) || [];
    try {
      const result = await extractSchool(schoolId, model, typySkoly);
      const foundCount = FIELDS.filter(([key]) => result[key] != null).length;
      console.log(`${name}: ${foundCount}/${FIELDS.length} fields found`);

      if (!dryRun) {
        const { source_urls, ...fields } = result;
        const { error: upsertError } = await supabase.from('school_extracted_details').upsert({
          school_id: Number(schoolId),
          ...fields,
          source_urls,
          model,
          extracted_at: new Date().toISOString(),
        });
        if (upsertError) throw new Error(upsertError.message);
      }
      processed += 1;
    } catch (err) {
      failed += 1;
      failures.push(`${name}: ${err.message}`);
      console.error(`  ! ${name}: ${err.message}`);
    }
  }

  console.log(`\nProcessed ${processed}, failed ${failed}, of ${schoolIds.length} targeted.`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  if (dryRun) console.log('--dry-run: nothing written to Supabase.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
