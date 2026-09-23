/**
 * Phase 2 of the school-detail extraction pipeline (docs/firecrawl-extraction-task.md).
 *
 * Reads the markdown cached by scripts/scrape-schools.js and asks an AI model to
 * pull out a set of "school life" fields — free text (FIELDS), structured
 * numbers (NUMERIC_FIELDS) and booleans (BOOLEAN_FIELDS) — writing results to
 * public.school_extracted_details. Re-runnable without ever re-scraping —
 * that's the whole point of the two-phase split, so a prompt tweak or a
 * model swap costs no Firecrawl credits.
 *
 *   node scripts/extract-school-details.js --dry-run [--limit N] [--school-id ID]
 *   node scripts/extract-school-details.js [--limit N] [--school-id ID[,ID...]]
 *   node scripts/extract-school-details.js --fix-public-tuition [--dry-run]
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
const OPENROUTER_API_KEYS = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '').split(',').filter(Boolean);

if (!GOOGLE_GEMINI_API_KEYS.length && !OPENROUTER_API_KEYS.length) {
  console.error('Missing both GOOGLE_GEMINI_API_KEYS and OPENROUTER_API_KEY(S) in the root .env. Set at least one.');
  process.exit(1);
}

const USE_GOOGLE = GOOGLE_GEMINI_API_KEYS.length > 0;
if (USE_GOOGLE) {
  console.log(`Using Google Gemini API (${GOOGLE_GEMINI_API_KEYS.length} key(s)).\n`);
} else {
  console.log(`Using OpenRouter (${OPENROUTER_API_KEYS.length} key(s)).\n`);
}

const supabase = createClient(supabaseUrl, serviceKey);

const DATA_DIR = path.join(__dirname, 'data', 'scraped-schools');
const MANIFEST_PATH = path.join(DATA_DIR, '_manifest.json');

const DEFAULT_MODEL = USE_GOOGLE
  ? (process.env.GOOGLE_GEMINI_MODEL || 'gemini-3.6-flash')
  : (process.env.OPENROUTER_EXTRACT_MODEL || 'anthropic/claude-haiku-4.5');

const FIELDS = [
  ['skolne_poplatky', 'Školné a poplatky — tuition/fees. Only relevant for PRIVATE schools (public/state schools are legally free — do not fill this in as "zdarma"/"free" unless the site is a private school explicitly stating a price).'],
  ['obedy_ubytovani', 'Obědy a ubytování — school meals, dormitory/boarding availability.'],
  ['krouzky_aktivity', 'Kroužky a aktivity — clubs, extracurricular activities, student organizations. Must name specific real activities, not a vague claim that activities exist.'],
  ['maturita_uspesnost', 'Úspěšnost u maturity — ONLY an actual maturita (school-leaving exam) pass rate or statistic, e.g. "95 % úspěšnost u maturity". Do NOT use this field for competition wins, awards, or other student achievements unrelated to the maturita exam itself — those do not belong here even if impressive.'],
  ['vs_uplatneni', 'Kam míří absolventi — ONLY university/college placement: which universities graduates commonly attend, or what share continues to higher education. Do NOT use this field for career outcomes, startups founded, or jobs held — those are not university placement.'],
  ['uplatneni_po_vyuceni', 'Uplatnění po vyučení — post-vocational-training employment outcomes. ONLY applicable to vocational schools (SOU/SOŠ/učiliště) that train students for a trade or profession. If this school is an academic gymnázium with no vocational/apprenticeship track, this field MUST be null.'],
  ['pripijimaci_pozadavky_detail', 'Popis přijímacích požadavků NAD RÁMEC jednotné přijímací zkoušky (JPZ/CERMAT) — např. talentová zkouška, pohovor, portfolio, vlastní písemný test z jazyka. Pokud škola bere jen JPZ a nic dalšího nezmiňuje, null. Neopisuj samotnou JPZ, jen to NAVÍC.'],
  ['vyukovy_styl_detail', 'Popis výukového stylu, POUZE pokud web explicitně pojmenovává alternativní pedagogický přístup (Montessori, Waldorfská pedagogika, Daltonský plán, program Začít spolu, apod.) nebo jasně popisuje, čím se výuka odlišuje od běžné. Neopisuj obecné fráze o "moderní výuce" nebo "individuálním přístupu" — to není konkrétní.'],
];

// Structured, queryable versions of some of the fields above — a value the
// decision matrix / questionnaire can actually score against, not prose a
// person has to read. Kept separate from FIELDS (rather than replacing the
// free-text ones) because prose can state nuance a bare value can't ("20%
// sourozenecká sleva") — this is additive, not a replacement.
const NUMERIC_FIELDS = [
  [
    'tuition_czk_per_year',
    'Roční školné v Kč, jako celé číslo. Pokud web uvádí částku za pololetí/měsíc, přepočti ji na CELÝ ROK (vynásob 2, resp. 10-12 podle toho, kolik měsíců školního roku pokrývá). Pokud škola nabízí víc programů s různou cenou, použij tu NEJNIŽŠÍ uvedenou. Pouze pro soukromé školy — veřejné/státní školy jsou ze zákona bez školného, takže null.',
  ],
  [
    'maturita_pass_rate_pct',
    'Úspěšnost u maturitní zkoušky v procentech, jako číslo 0-100 (např. "95 % studentů uspělo" -> 95). NEPOUŽÍVEJ pro jiné statistiky (přijímačky, soutěže, umístění). Musí to být explicitně uvedené číslo o maturitě, ne odhad.',
  ],
  [
    'zacatek_hodin',
    'Hodina, kdy typicky začíná výuka, jako celé číslo 6-12 (např. "výuka začíná v 8:00" -> 8). Pouze pokud web tuto informaci explicitně uvádí (často v sekci pro rodiče/uchazeče nebo v řádu školy) — jinak null, nikdy neodhaduj běžný čas.',
  ],
];

// A fixed yes/no signal is enough for matching — WHICH specific admission
// test or WHICH named pedagogy is display-only detail, already captured
// above in pripijimaci_pozadavky_detail / vyukovy_styl_detail. Splitting
// into per-type flags (talent exam vs. interview vs. portfolio; Montessori
// vs. Waldorf vs. ...) is deferred until real data shows it's worth the
// extra columns — see UNFORGET.md.
const BOOLEAN_FIELDS = [
  [
    'ma_dodatecne_pozadavky',
    'true, pokud škola vyžaduje NĚCO NAD RÁMEC jednotné přijímací zkoušky (talentovka, pohovor, portfolio, vlastní test). false, pokud web explicitně říká, že rozhoduje jen JPZ / prospěch, nebo o žádných dalších požadavcích nemluví. Vrať null jen pokud text o přijímacím řízení vůbec nemluví.',
  ],
  [
    'alternativni_pedagogika',
    'true, pokud web explicitně pojmenovává alternativní pedagogický přístup (Montessori, Waldorf, Dalton, Začít spolu, apod.). false, pokud jasně popisuje běžnou/tradiční výuku. null, pokud web se o stylu výuky vůbec nezmiňuje.',
  ],
];

const EXTRACT_TOOL = {
  type: 'function',
  function: {
    name: 'extract_school_details',
    description: 'Record the school-life fields (plus structured numbers and booleans) found in the provided page text, or null for any field with no real evidence.',
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
        ...NUMERIC_FIELDS.map(([key, description]) => [
          key,
          { type: ['number', 'null'], description },
        ]),
        ...BOOLEAN_FIELDS.map(([key, description]) => [
          key,
          { type: ['boolean', 'null'], description },
        ]),
        ['source_urls', {
          type: 'object',
          description: 'Map of field name -> source URL (from the ## headings in the input) for every non-null field above. Omit keys for null fields.',
          additionalProperties: { type: 'string' },
        }],
      ]),
      required: [
        ...FIELDS.map(([key]) => key),
        ...NUMERIC_FIELDS.map(([key]) => key),
        ...BOOLEAN_FIELDS.map(([key]) => key),
        'source_urls',
      ],
    },
  },
};

const SYSTEM_PROMPT = `Jsi asistent, který z textu webu střední školy extrahuje konkrétní
informace pro českého deváťáka vybírajícího si školu — jako text
(volnou větou) i jako čísla a true/false hodnoty (tuition_czk_per_year,
maturita_pass_rate_pct, zacatek_hodin, ma_dodatecne_pozadavky,
alternativni_pedagogika). Stejné pravidlo "nikdy nic nevymýšlej" platí pro
čísla a true/false úplně stejně jako pro text: vrať null, pokud web
neuvádí danou informaci jasně a explicitně, nikdy neodhaduj ani
nedopočítávej z nepřímých náznaků. Výjimka je jen přepočet pololetní/
měsíční částky na celoroční — to je aritmetika, ne odhad.

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
- "skolne_poplatky" / "tuition_czk_per_year" = POUZE školné STŘEDNÍ školy
  (SŠ), o kterou se hlásí deváťák. Pokud web patří i vyšší odborné škole
  (VOŠ), ceny a stránky VOŠ úplně ignoruj — školné VOŠ sem NEPATŘÍ.
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
let openrouterKeyIndex = 0;

function getGoogleKey() {
  if (!GOOGLE_GEMINI_API_KEYS.length) return null;
  const key = GOOGLE_GEMINI_API_KEYS[googleKeyIndex % GOOGLE_GEMINI_API_KEYS.length];
  googleKeyIndex += 1;
  return key;
}

function getOpenRouterKey() {
  if (!OPENROUTER_API_KEYS.length) return null;
  const key = OPENROUTER_API_KEYS[openrouterKeyIndex % OPENROUTER_API_KEYS.length];
  openrouterKeyIndex += 1;
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
  const apiKey = getOpenRouterKey();
  if (!apiKey) throw new Error('No OpenRouter API key available');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'SkolaMatch',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2000,
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

  const googleModel = process.env.GOOGLE_GEMINI_MODEL || 'gemini-3.6-flash';

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
              description: 'Record the school-life fields (plus structured numbers and booleans) found in the provided page text, or null for any field with no real evidence.',
              parameters: {
                type: 'OBJECT',
                properties: Object.fromEntries([
                  ...FIELDS.map(([key]) => [
                    key,
                    {
                      type: 'STRING',
                      description: 'A short factual answer in Czech, quoting or closely paraphrasing the source text. null if not found.',
                      nullable: true,
                    },
                  ]),
                  ...NUMERIC_FIELDS.map(([key, description]) => [
                    key,
                    { type: 'NUMBER', description, nullable: true },
                  ]),
                  ...BOOLEAN_FIELDS.map(([key, description]) => [
                    key,
                    { type: 'BOOLEAN', description, nullable: true },
                  ]),
                  ['source_urls', {
                    type: 'STRING',
                    description: 'JSON string: field name -> source URL for every non-null field. E.g. {"skolne_poplatky": "https://..."}',
                  }],
                ]),
                required: [
                  ...FIELDS.map(([key]) => key),
                  ...NUMERIC_FIELDS.map(([key]) => key),
                  ...BOOLEAN_FIELDS.map(([key]) => key),
                  'source_urls',
                ],
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
        max_output_tokens: 2000,
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

  const args = toolCall.functionCall.args || {};
  // Parse source_urls if it came as a string
  if (typeof args.source_urls === 'string') {
    try {
      args.source_urls = JSON.parse(args.source_urls);
    } catch {
      args.source_urls = {};
    }
  }
  return args;
}

// Plausible-range checks — a model asked for "the number" will sometimes
// invent a round, wrong one (seen in testing: a 100% maturita pass rate with
// nothing in the source backing it) rather than admit null. This can't catch
// every fabrication, but it rejects the physically implausible ones.
const NUMERIC_BOUNDS = {
  tuition_czk_per_year: (v) => v > 0 && v <= 500_000,
  maturita_pass_rate_pct: (v) => v >= 0 && v <= 100,
  zacatek_hodin: (v) => v >= 6 && v <= 12,
};

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

  for (const [key] of NUMERIC_FIELDS) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value) && NUMERIC_BOUNDS[key](value)) {
      cleaned[key] = Math.round(value);
      if (raw.source_urls?.[key]) sourceUrls[key] = raw.source_urls[key];
    } else {
      cleaned[key] = null;
    }
  }

  for (const [key] of BOOLEAN_FIELDS) {
    const value = raw[key];
    if (typeof value === 'boolean') {
      cleaned[key] = value;
      if (raw.source_urls?.[key]) sourceUrls[key] = raw.source_urls[key];
    } else {
      cleaned[key] = null;
    }
  }

  return { ...cleaned, source_urls: sourceUrls };
}

// Public SŠ tuition is zero by law, so a price found for a public school is
// something else: a VOŠ on the same site, a prep course, a club fee. A company
// name overrides Cermat's zrizovatel (seen: an s. r. o. labelled public).
function isPublicSchool(school) {
  if (/s\.\s?r\.\s?o\.|o\.\s?p\.\s?s\.|a\.\s?s\./i.test(school.name)) return false;
  const z = (school.school_programs || []).map((p) => p.zrizovatel).filter(Boolean);
  return z.length > 0 && z.every((v) => v === 'veřejné/státní');
}

function stripPublicTuition(row) {
  row.tuition_czk_per_year = null;
  if (row.skolne_poplatky && /\d\s*(,-)?\s*Kč/.test(row.skolne_poplatky)) row.skolne_poplatky = null;
  return row;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  if (args.includes('--fix-public-tuition')) return fixPublicTuition(dryRun);
  const limitArg = args.indexOf('--limit');
  const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : null;
  const schoolIdArg = args.indexOf('--school-id');
  const onlySchoolId = schoolIdArg !== -1 ? args[schoolIdArg + 1] : null;
  const onlySchoolIds = onlySchoolId ? onlySchoolId.split(',').map((id) => id.trim()) : null;
  const modelArg = args.indexOf('--model');
  const model = modelArg !== -1 ? args[modelArg + 1] : DEFAULT_MODEL;

  const manifest = loadManifest();
  let schoolIds = Object.keys(manifest);
  if (onlySchoolIds) schoolIds = schoolIds.filter((id) => onlySchoolIds.includes(String(id)));
  if (limit) schoolIds = schoolIds.slice(0, limit);

  // Skip schools already extracted (unless --school-id specified to force re-extract).
  // model IS NULL means the row is a stub written by something else entirely
  // (e.g. import-maturita-data.js's upsert, which only ever sets the two
  // maturita columns) rather than a real Phase 2 pass — those still need
  // extracting, so they must not count as "already extracted".
  if (!onlySchoolId) {
    const { data: extracted, error: extractedError } = await supabase
      .from('school_extracted_details')
      .select('school_id')
      .not('model', 'is', null);
    if (!extractedError && extracted) {
      const extractedIds = new Set(extracted.map((row) => String(row.school_id)));
      const before = schoolIds.length;
      schoolIds = schoolIds.filter((id) => !extractedIds.has(id));
      if (schoolIds.length < before) {
        console.log(`Skipping ${before - schoolIds.length} already-extracted schools.\n`);
      }
    }
  }

  console.log(`Model: ${model}${dryRun ? ' (dry run — nothing written)' : ''}`);
  console.log(`${schoolIds.length} cached schools to process.\n`);

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name, school_programs(typ_skoly, zrizovatel)')
    .in('id', schoolIds);
  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }
  const namesById = new Map(schools.map((s) => [String(s.id), s.name]));
  const typesById = new Map(
    schools.map((s) => [String(s.id), [...new Set((s.school_programs || []).map((p) => p.typ_skoly).filter(Boolean))]])
  );

  const publicIds = new Set(schools.filter(isPublicSchool).map((s) => String(s.id)));

  // Cermat's official maturita figures must survive a re-extraction.
  const { data: cermatRows } = await supabase
    .from('school_extracted_details')
    .select('school_id')
    .in('school_id', schoolIds)
    .ilike('maturita_uspesnost', '%zdroj: Cermat%');
  const cermatIds = new Set((cermatRows || []).map((r) => String(r.school_id)));

  let processed = 0;
  let failed = 0;
  const failures = [];

  for (const schoolId of schoolIds) {
    const name = namesById.get(String(schoolId)) || `#${schoolId}`;
    const typySkoly = typesById.get(String(schoolId)) || [];
    try {
      const result = await extractSchool(schoolId, model, typySkoly);
      if (publicIds.has(String(schoolId))) stripPublicTuition(result);
      const allFields = [...FIELDS, ...NUMERIC_FIELDS, ...BOOLEAN_FIELDS];
      const foundCount = allFields.filter(([key]) => result[key] != null).length;
      console.log(`${name}: ${foundCount}/${allFields.length} fields found`);
      for (const [key] of [...NUMERIC_FIELDS, ...BOOLEAN_FIELDS]) {
        if (result[key] != null) console.log(`    ${key} = ${result[key]}`);
      }
      if (dryRun) {
        for (const key of ['pripijimaci_pozadavky_detail', 'vyukovy_styl_detail']) {
          if (result[key]) console.log(`    ${key} = "${result[key].slice(0, 120)}"`);
        }
      }

      if (!dryRun) {
        const { source_urls, ...fields } = result;
        if (cermatIds.has(String(schoolId))) {
          delete fields.maturita_pass_rate_pct;
          delete fields.maturita_uspesnost;
        }
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

// Applies stripPublicTuition to rows already stored, without re-running the
// model — a re-extraction is nondeterministic and loses fields it found before.
async function fixPublicTuition(dryRun) {
  const { data: schools, error } = await supabase.from('schools').select('id, name, school_programs(zrizovatel)');
  if (error) throw new Error(error.message);
  const publicIds = new Set(schools.filter(isPublicSchool).map((s) => s.id));
  const { data: rows, error: rowsError } = await supabase
    .from('school_extracted_details')
    .select('school_id, tuition_czk_per_year, skolne_poplatky');
  if (rowsError) throw new Error(rowsError.message);
  for (const row of rows.filter((r) => publicIds.has(r.school_id))) {
    const before = { ...row };
    stripPublicTuition(row);
    if (before.tuition_czk_per_year === row.tuition_czk_per_year && before.skolne_poplatky === row.skolne_poplatky) continue;
    console.log(`school ${row.school_id}: tuition ${before.tuition_czk_per_year} -> null${before.skolne_poplatky !== row.skolne_poplatky ? ', text cleared' : ''}`);
    if (dryRun) continue;
    const { error: updateError } = await supabase
      .from('school_extracted_details')
      .update({ tuition_czk_per_year: row.tuition_czk_per_year, skolne_poplatky: row.skolne_poplatky })
      .eq('school_id', row.school_id);
    if (updateError) throw new Error(updateError.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
