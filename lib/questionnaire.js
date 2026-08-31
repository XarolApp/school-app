/**
 * The AI questionnaire: what gets asked, how answers are checked, and how the
 * ranked matches are produced.
 *
 * Everything here runs on the server. The questions are *served* to the browser
 * rather than duplicated in React, so there is exactly one definition of what a
 * valid answer looks like — and it lives on the side that cannot be edited by
 * whoever is filling the form in.
 *
 * The split of work is the important part: `matching.js` decides *which* schools
 * and *what percentage*, in plain code; the model here only writes the Czech
 * sentence explaining a match it was handed. See the header of matching.js for
 * why the score is not the model's to give.
 */

const { scoreSchools } = require('./matching');
// The 22 správní obvody, generated with the map they are drawn on. The `casti`
// options are built from this so the picker, the checkboxes and the scorer
// cannot disagree about what districts exist.
const { DISTRICT_IDS } = require('./pragueDistricts');

// How many runs an account gets per calendar month.
//
// This is a COST control, not an anti-sharing measure. Sharing is already
// bounded by the fact that the whole product sits behind one login; a monthly
// cap would not stop someone handing over their password, it would only annoy a
// student who legitimately wants to try different answers. What actually needs
// bounding is "how many times can one account make us pay for an AI call", and
// ten is far above what any real person does while still capping the damage
// from a script. Raise it freely — nothing else depends on the number.
const MONTHLY_LIMIT = 10;

// Ranked matches asked of the model. More than this and the tail is noise:
// nobody applies to their 15th-best fit.
const MATCH_COUNT = 8;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Sonnet is the right tier here — the task is reading ~60 short records and
// ranking them, which does not need Opus, and this runs on the user's own
// OpenRouter credits. Override with OPENROUTER_MODEL to switch without a
// code change.
const DEFAULT_MODEL = 'anthropic/claude-sonnet-5';

/**
 * The questions.
 *
 * `type` is 'single' (one choice), 'multi' (up to `max` choices) or 'text'.
 * `optional` questions may be left empty; everything else must be answered.
 * `showIf: { field, equals }` marks a question as conditional — see
 * `questionApplies` below, and CLAUDE.md's questionnaire section, for why it
 * has to stay a plain object rather than a function. No question uses it right
 * now (the one that did was deleted with the commute redesign); it is kept
 * because it is tested on both sides of the wire and is what the next
 * branching question should use rather than inventing a second mechanism.
 *
 * There is deliberately no question about grades. The schools table has no
 * admission-difficulty data to match a grade average against, so asking would
 * imply a filter that does not exist. Add the question when the scraper starts
 * collecting cut-off points, not before.
 */
const QUESTIONS = [
  {
    id: 'typ',
    type: 'single',
    label: 'Jaký typ školy tě láká?',
    hint: 'Nevadí, když si nejsi jistý — vyber „ještě nevím“.',
    options: [
      { value: 'gymnazium', label: 'Gymnázium — široký základ, příprava na vysokou' },
      { value: 'odborna', label: 'Odborná škola s maturitou' },
      { value: 'ucebni', label: 'Učební obor s výučním listem' },
      { value: 'nevim', label: 'Ještě nevím' },
    ],
  },
  {
    id: 'oblasti',
    type: 'multi',
    max: 5,
    label: 'Které oblasti tě baví nejvíc?',
    hint: 'Vyber až pět.',
    options: [
      { value: 'it', label: 'IT a programování' },
      { value: 'technika', label: 'Technika a strojírenství' },
      { value: 'prirodni', label: 'Přírodní vědy' },
      { value: 'humanitni', label: 'Humanitní obory a jazyky' },
      { value: 'ekonomika', label: 'Ekonomika a podnikání' },
      { value: 'umeni', label: 'Umění a design' },
      { value: 'zdravotnictvi', label: 'Zdravotnictví' },
      { value: 'remesla', label: 'Řemesla a praktická práce' },
      { value: 'pedagogika', label: 'Práce s lidmi a pedagogika' },
      { value: 'gastro', label: 'Gastronomie a cestovní ruch' },
    ],
  },
  {
    id: 'predmety',
    type: 'multi',
    max: 5,
    label: 'Ve kterých předmětech se ti daří?',
    hint: 'Vyber až pět.',
    options: [
      { value: 'matematika', label: 'Matematika' },
      { value: 'cestina', label: 'Čeština' },
      { value: 'cizi_jazyky', label: 'Cizí jazyky' },
      { value: 'fyzika', label: 'Fyzika' },
      { value: 'chemie', label: 'Chemie' },
      { value: 'biologie', label: 'Biologie' },
      { value: 'dejepis', label: 'Dějepis a společenské vědy' },
      { value: 'informatika', label: 'Informatika' },
      { value: 'vytvarka', label: 'Výtvarná a hudební výchova' },
      { value: 'telocvik', label: 'Tělesná výchova' },
    ],
  },
  {
    id: 'styl',
    type: 'single',
    label: 'Jak se učíš nejradši?',
    options: [
      { value: 'teorie', label: 'Teorie — čtení, výklad, přemýšlení nad látkou' },
      { value: 'praxe', label: 'Praxe — dělat věci rukama, projekty, dílny' },
      { value: 'kombinace', label: 'Kombinace obojího' },
    ],
  },
  {
    id: 'po_skole',
    type: 'single',
    label: 'Co plánuješ po střední škole?',
    options: [
      { value: 'vysoka', label: 'Jít na vysokou školu' },
      { value: 'prace', label: 'Rovnou do práce' },
      { value: 'nevim', label: 'Ještě nevím' },
    ],
  },
  {
    /**
     * Phrased as willingness to *travel*, not as taste in neighbourhoods.
     *
     * That wording is doing the work of a whole routing stack. A student
     * answering "which districts would you commute to" has already weighed
     * their own home address, their own tolerance for a tram ride and their
     * own idea of far — privately, in their head, and more accurately than a
     * transit API could. So there is no address to collect, nothing to send to
     * Google, and no travel-time table to seed and keep current. The earlier
     * design asked for a home district and a commute tolerance and then tried
     * to compute the answer; this asks for the answer.
     */
    id: 'casti',
    type: 'multi',
    // Raised from 6 when the option list went from 10 districts to 22. Six of
    // ten was most of the city; six of twenty-two is barely a quarter, which
    // turns "where would you commute to" into a much narrower question than it
    // was meant to be. Ten of twenty-two keeps roughly the old proportion.
    max: 10,
    optional: true,
    // Selecting every district says exactly as much as selecting none — "I'd
    // go anywhere" is not a preference. Handled once, at validation, by
    // normalising a full selection down to the same [] a blank answer produces
    // — see the `clearsWhenAll` check in validateAnswers. Not automatic for
    // every multi-select: it only makes sense for a question where "all of
    // them" is coherently "I don't care", which is not true of e.g. `oblasti`.
    clearsWhenAll: true,
    label: 'Do kterých částí Prahy preferuješ dojíždět (kde chceš mít školu)?',
    hint: 'Klikni do mapy nebo vyber ze seznamu — klidně i tu část, kde bydlíš.',
    // Draws components/DistrictMap.jsx above the options. A named capability
    // rather than the frontend special-casing `id === 'casti'`, so the next
    // question that wants a picker declares it here with the rest of the
    // question definition.
    map: 'praha-obvody',
    /**
     * Praha 1–22, the *správní obvody* — the division Praguers mean when they
     * say "Praha 13", and the one drawn on the map.
     *
     * ⚠️ These are NOT the numbers in a school's postal address. A Czech
     * address names a *městský obvod*, which only ever runs 1–10; measured
     * across all 60 schools the two divisions disagree for 18 of them. That is
     * why `matching.js` scores this from the school's coordinates and not by
     * parsing `location`, and why an ungeocoded school matches no district at
     * all. Do not "simplify" that back into a string match on the address.
     *
     * Generated from DISTRICT_IDS rather than typed out, so the options, the
     * map regions and the scorer can never drift apart — all three come from
     * one run of scripts/build-district-map.js. Districts with no schools yet
     * (Praha 7, 12, 17, 21, 22 today) are still offered, so they work the day
     * one is scraped there.
     */
    options: DISTRICT_IDS.map((id) => ({ value: id, label: id })),
  },
  {
    id: 'zacatek',
    type: 'single',
    label: 'Kdy by měla škola začínat?',
    options: [
      { value: 'nezalezi', label: 'Nezáleží mi na tom' },
      { value: 'zalezi', label: 'Záleží mi na tom — zatím to ale nedokážeme zohlednit' },
    ],
  },
  {
    id: 'velikost',
    type: 'single',
    label: 'Jak velkou školu si představuješ?',
    options: [
      { value: 'velka', label: 'Velkou — víc lidí, víc možností' },
      { value: 'mala', label: 'Menší — kde se všichni znají' },
      { value: 'nezalezi', label: 'Nezáleží mi na tom' },
    ],
  },
  {
    id: 'jazyky',
    type: 'single',
    label: 'Jak důležitá je pro tebe výuka jazyků?',
    options: [
      { value: 'velmi', label: 'Hodně — chci jazyky na vysoké úrovni' },
      { value: 'stredne', label: 'Středně — stačí mi běžná výuka' },
      { value: 'malo', label: 'Málo — radši se soustředím na jiné věci' },
    ],
  },
  {
    id: 'poznamka',
    type: 'text',
    optional: true,
    maxLength: 500,
    label: 'Chceš něco doplnit?',
    hint: 'Cokoliv, co by nám pomohlo — sport, kroužky, konkrétní představa. Nech prázdné, pokud tě nic nenapadá; prázdná odpověď ti shodu nesníží.',
  },
];

const QUESTIONS_BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]));

/**
 * Whether a question is currently relevant, given answers gathered so far.
 *
 * `showIf` is deliberately a plain `{ field, equals }` object rather than a
 * function — QUESTIONS is sent to the browser as JSON via GET /api/questionnaire,
 * and a function property silently disappears in JSON.stringify. This predicate
 * is the one place that interprets the object, and both the backend validator
 * below and the frontend stepper (Questionnaire.jsx) carry an identical copy of
 * it, since the frontend cannot require() a Node file.
 */
/**
 * Czech counts in three forms: 1 "možnost", 2–4 "možnosti", 5 and up
 * "možností". A single hardcoded form was correct only while every `max` in
 * QUESTIONS happened to be under five — raising one to 6 is what surfaced it.
 * Search.jsx does the same thing for result counts.
 */
function pluralOptions(count) {
  if (count === 1) return 'možnost';
  if (count >= 2 && count <= 4) return 'možnosti';
  return 'možností';
}

function questionApplies(question, answers) {
  return !question.showIf || answers[question.showIf.field] === question.showIf.equals;
}

/**
 * Checks submitted answers against the definitions above.
 *
 * The browser is not trusted with any of this. An answer that is not one of the
 * offered options is rejected outright rather than passed through to the model —
 * otherwise the answers field becomes a free text channel into our AI prompt,
 * which is both a prompt-injection surface and a way to run up the bill.
 *
 * Returns { ok: true, answers } or { ok: false, error }.
 */
function validateAnswers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Odpovědi chybí nebo mají špatný formát.' };
  }

  const clean = {};

  for (const question of QUESTIONS) {
    // A conditional question whose `showIf` does not currently hold is skipped
    // outright — not required regardless of its own `optional` flag, and any
    // value the client sent for it anyway is dropped rather than carried into
    // `clean`. `clean` is what reaches the AI prompt and matching.js, so an
    // answer to a question the student was never shown would be actively wrong
    // data to score or narrate against. Checked against `clean`, not `raw`:
    // a `showIf` may only depend on a question earlier in QUESTIONS, so the
    // field it reads is always already validated — the same defence-in-depth
    // the rest of this validator follows.
    if (!questionApplies(question, clean)) continue;

    const value = raw[question.id];
    const allowed = new Set((question.options || []).map((option) => option.value));

    if (question.type === 'text') {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text.length > question.maxLength) {
        return {
          ok: false,
          error: `Odpověď „${question.label}“ je příliš dlouhá.`,
        };
      }
      if (text) clean[question.id] = text;
      continue;
    }

    if (question.type === 'multi') {
      const list = Array.isArray(value) ? value : [];
      // Duplicates would let one answer be weighted several times in the prompt.
      const unique = [...new Set(list)];

      if (!unique.every((entry) => allowed.has(entry))) {
        return { ok: false, error: `Neplatná odpověď u „${question.label}“.` };
      }
      // Every district selected says exactly as much as none selected — "I'd
      // go anywhere" carries no preference to score against. Normalising it to
      // [] here means matching.js and everywhere else downstream never has to
      // know this shortcut exists; it sees the same null-dimension case it
      // already handles for a blank answer. Checked before the max cap, since
      // "select all" is meant to bypass that cap rather than be rejected by it.
      if (question.clearsWhenAll && unique.length === allowed.size) {
        continue;
      }
      if (unique.length > question.max) {
        return {
          ok: false,
          error: `U „${question.label}“ vyber nejvýš ${question.max} ${pluralOptions(question.max)}.`,
        };
      }
      if (!unique.length && !question.optional) {
        return { ok: false, error: `Odpověz prosím na „${question.label}“.` };
      }
      if (unique.length) clean[question.id] = unique;
      continue;
    }

    // single
    if (typeof value !== 'string' || !allowed.has(value)) {
      if (question.optional && !value) continue;
      return { ok: false, error: `Odpověz prosím na „${question.label}“.` };
    }
    clean[question.id] = value;
  }

  return { ok: true, answers: clean };
}

// Turns stored answer values back into the human labels the model should read.
function describeAnswers(answers) {
  const lines = [];

  for (const question of QUESTIONS) {
    // Some answers are for scoring only and must never be narrated. See
    // `privateToServer` on the question itself for why.
    if (question.privateToServer) continue;

    const value = answers[question.id];
    if (value == null || (Array.isArray(value) && !value.length)) continue;

    if (question.type === 'text') {
      lines.push(`${question.label} ${value}`);
      continue;
    }

    const labelFor = (entry) =>
      question.options.find((option) => option.value === entry)?.label ?? entry;

    lines.push(
      `${question.label} ${
        Array.isArray(value) ? value.map(labelFor).join(', ') : labelFor(value)
      }`
    );
  }

  return lines.join('\n');
}

/**
 * The shortlist handed to the model for wording.
 *
 * Only the already-selected matches appear here, each with the score computed
 * in matching.js and the concrete signals behind it, so the model is writing
 * *from* evidence rather than forming its own opinion. The whole database used
 * to go into this prompt; sending the top few instead is also what stops the
 * questionnaire hitting the same ceiling as the schools endpoint when the
 * scraper moves past Prague.
 */
function describeMatches(matches, byId) {
  return matches
    .map((match) => {
      const school = byId.get(match.school_id);
      const programs = (school.programs || '').replace(/\s+/g, ' ').slice(0, 300);
      const signals = match.signals.length ? match.signals.join('; ') : 'žádné konkrétní shody';
      return [
        `[${school.id}] ${school.name}`,
        `  lokalita: ${school.location || 'Praha'}`,
        `  obory: ${programs}`,
        `  shoda: ${match.score}% — ${signals}`,
      ].join('\n');
    })
    .join('\n\n');
}

// The model writes prose only. Scores and ordering are decided in matching.js
// and are not up for negotiation here — asking a model for a percentage gets a
// number that reads like a measurement but is really just more generated text,
// which is the whole reason the scoring moved into code.
const SYSTEM_PROMPT = `Jsi poradce, který pomáhá českým deváťákům vybrat střední školu v Praze.

Dostaneš odpovědi studenta a seznam škol, které už byly vybrané a ohodnocené. U každé školy je uvedeno procento shody a důvody, proč vyšla takhle.

Tvým jediným úkolem je ke každé škole napsat jednu větu česky, která studentovi vysvětlí, proč mu ta škola sedí.

Pravidla:
- Piš POUZE ke školám ze seznamu a používej přesně jejich číselné ID.
- Nepřehazuj pořadí a nepřepočítávej procenta — o tom nerozhoduješ.
- Věta je maximálně 200 znaků, konkrétní, odkazuje na obory té školy a na odpovědi studenta. Žádné obecné fráze.
- Vycházej z uvedených důvodů shody. Nevymýšlej si nic, co v datech není — o velikosti školy ani o dojíždění nic nevíš.
- Piš studentovi tykáním, stejně jako zbytek aplikace.

Odpověz POUZE tímto JSON objektem, bez dalšího textu a bez markdown bloku:
{"reasons":[{"school_id":123,"reason":"…"}]}`;

/**
 * Pulls the JSON object out of a model reply.
 *
 * Models are asked for bare JSON above, but will occasionally wrap it in a
 * markdown fence or add a sentence in front. Slicing between the first { and
 * the last } handles both without a hard failure, and anything that still is
 * not JSON throws — which the caller turns into a clean error rather than a
 * half-parsed result.
 */
function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Odpověď modelu neobsahuje JSON.');
  }
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Ranked matches for one set of answers.
 *
 * Two stages, deliberately separated:
 *   1. `scoreSchools` ranks every school and computes the percentage. Pure
 *      arithmetic over the database — no network call, no model, and the same
 *      answers always give the same numbers.
 *   2. The model writes one Czech sentence per shortlisted school, grounded in
 *      the signals stage 1 produced.
 *
 * Because stage 1 owns the ranking, switching models changes only the wording.
 * The model's reply is still checked against the shortlist, so an id it invents
 * or repeats is dropped rather than shown to a student as a real school.
 */
async function requestMatches({ answers, schools, apiKey, model, referer }) {
  const byId = new Map(schools.map((school) => [school.id, school]));
  const shortlist = scoreSchools(answers, schools).slice(0, MATCH_COUNT);

  if (!shortlist.length) {
    throw new Error('Žádné školy k vyhodnocení.');
  }

  const reasons = await requestReasons({
    answers,
    shortlist,
    byId,
    apiKey,
    model,
    referer,
  });

  return {
    matches: shortlist.map((match) => ({
      school_id: match.school_id,
      score: match.score,
      reason: reasons.get(match.school_id) || '',
      // Kept on the row so a stored result can still explain itself later, and
      // so weight changes can be checked against what an old run actually saw.
      signals: match.signals,
      breakdown: match.breakdown,
    })),
    usage: reasons.usage ?? null,
  };
}

/**
 * Asks the model for one sentence per shortlisted school.
 *
 * Returns a Map of school_id -> reason. A school the model skips simply has no
 * sentence; the match itself still stands, because the score behind it was
 * computed without the model's help.
 */
async function requestReasons({ answers, shortlist, byId, apiKey, model, referer }) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter uses these for its dashboard attribution only; neither
      // affects routing or billing.
      'HTTP-Referer': referer,
      'X-Title': 'SkolaMatch',
    },
    body: JSON.stringify({
      model,
      // Low but not zero: identical answers should give a stable answer, while
      // still letting the model phrase reasons naturally.
      temperature: 0.3,
      max_tokens: 4000,
      // Reasoning models (Gemini 3.1 Pro, at least) cannot turn reasoning off,
      // and left uncapped it spent ~1900 of a 2000 token budget "thinking"
      // before writing a single character of the actual answer — the response
      // came back truncated with content: null. Capping effort to "low" plus
      // raising the ceiling fixes it. Non-reasoning models (Claude Sonnet 5)
      // silently ignore a field they don't use.
      reasoning: { effort: 'low' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `ODPOVĚDI STUDENTA:\n${describeAnswers(
            answers
          )}\n\nVYBRANÉ ŠKOLY:\n${describeMatches(shortlist, byId)}`,
        },
      ],
    }),
    // Without this a hung upstream would hold an Express worker open forever.
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `OpenRouter odpověděl ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`
    );
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenRouter vrátil prázdnou odpověď.');
  }

  const parsed = extractJson(text);
  if (!Array.isArray(parsed?.reasons)) {
    throw new Error('Odpověď modelu nemá očekávaný tvar.');
  }

  // Only ids that are actually on the shortlist are kept, so a hallucinated
  // school cannot attach its sentence to a result.
  const allowed = new Set(shortlist.map((match) => match.school_id));
  const reasons = new Map();

  for (const entry of parsed.reasons) {
    const id = Number(entry?.school_id);
    if (!allowed.has(id) || reasons.has(id)) continue;
    if (typeof entry?.reason !== 'string' || !entry.reason.trim()) continue;
    reasons.set(id, entry.reason.trim().slice(0, 300));
  }

  if (!reasons.size) {
    throw new Error('Model nevrátil žádné vysvětlení.');
  }

  reasons.usage = payload?.usage ?? null;
  return reasons;
}

/**
 * Adds whole months to a date, clamping the day to one the target month has.
 *
 * Plain `setMonth(+1)` on 31 January silently lands on 3 March, because
 * February has no 31st and JavaScript rolls the overflow forward. That would
 * hand anyone who signed up on the 29th–31st a different period length from
 * everyone else, and in February it would skip a reset entirely. Clamping to
 * the last real day of the target month keeps every period exactly one month.
 */
function addMonthsClamped(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  // Day 0 of the following month is the last day of the target month.
  const lastDay = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month + months,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

/**
 * The allowance window that `now` falls inside, anchored to the account.
 *
 * The period runs from the signup anniversary, not from the first of the
 * calendar month: someone who joins on the 28th gets a full ten runs that day
 * rather than a fresh allowance three days later. `end` is when it resets,
 * which the UI shows directly.
 *
 * Anchoring on account creation (the moment the trial starts) rather than on
 * the Stripe billing date keeps the window continuous when a trial converts to
 * a subscription. Moving the anchor at that point would either grant a second
 * allowance days into the first period or cut one short halfway through, and
 * neither is defensible to a student who just paid.
 *
 * A missing or unparseable anchor falls back to the calendar month, so a
 * corrupt profile row cannot deny access to a feature the account paid for.
 */
function usagePeriod(anchorInput, now = new Date()) {
  const anchor = anchorInput ? new Date(anchorInput) : null;

  if (!anchor || Number.isNaN(anchor.getTime())) {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
    };
  }

  // Whole months elapsed, then step back one if the anniversary this month has
  // not arrived yet (either a later day, or the same day earlier in the hour).
  let months =
    (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - anchor.getUTCMonth());

  if (addMonthsClamped(anchor, months) > now) months -= 1;

  // Never before the account existed. Without this, a `now` fractionally
  // behind the anchor — which clock skew between this server and Postgres can
  // produce for an account created seconds ago — would invent a period ending
  // at signup, and every run in the real first period would fall outside the
  // count.
  if (months < 0) months = 0;

  return {
    start: addMonthsClamped(anchor, months),
    end: addMonthsClamped(anchor, months + 1),
  };
}

module.exports = {
  QUESTIONS,
  QUESTIONS_BY_ID,
  MONTHLY_LIMIT,
  MATCH_COUNT,
  DEFAULT_MODEL,
  questionApplies,
  validateAnswers,
  requestMatches,
  usagePeriod,
};
