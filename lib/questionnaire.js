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

// How many top schools get an AI sentence — and therefore how many matches a
// run stores. Every school is still ranked and scored at read time (see
// buildRunResult in server.js), so nothing beyond this needs storing. There is
// deliberately NO cap on how many runs an account may make: a run costs a
// fraction of a cent (cheap model, ~1.5k input / ~0.8k output tokens),
// `requireAccess` already restricts this to trialing or paying accounts, and the
// route's rate limiter stops a scripted loop. If abuse ever appears the old
// monthly quota is in git history.
const REASON_COUNT = 10;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// The model only writes short Czech explanations from evidence the scorer
// already produced. Keep its cost and effort low; OPENROUTER_MODEL can override
// this default without a code change.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-6-luna';
const OPENROUTER_PROVIDER = process.env.OPENROUTER_PROVIDER || 'openai/flex';
const PROVIDER_ORDER = [...new Set([OPENROUTER_PROVIDER, 'openai'])];

/**
 * The questions.
 *
 * `type` is 'single' (one choice), 'multi' (up to `max` choices), 'number'
 * (integer between `min` and `max`) or 'text'. `section` is a display heading.
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
const BASE_QUESTIONS = [
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
    hint: 'Vyber ze seznamu (na počítači můžeš klikat i do mapy) — klidně i tu část, kde bydlíš.',
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
    /**
     * Scored against `school_extracted_details.krouzky_kategorie`, which we
     * only have for ~86% of schools (189/219 as of 2026-09-26) — good enough
     * to be a real dimension, not just display. See matching.js's `krouzky`
     * dimension and its comment on why a null school is dropped from this
     * dimension rather than scored as a miss.
     */
    id: 'krouzky',
    type: 'multi',
    max: 3,
    optional: true,
    label: 'Jaké kroužky nebo mimoškolní aktivity by tě zajímaly?',
    hint: 'Vyber až tři. Tahle data nemáme u všech škol, takže otázka pomáhá jen u škol, kde je máme.',
    options: [
      { value: 'sport', label: 'Sport' },
      { value: 'umeni_hudba_divadlo', label: 'Umění, hudba, divadlo' },
      { value: 'technika_robotika_it', label: 'Technika, robotika, IT' },
      { value: 'jazyky', label: 'Jazykové kroužky' },
      { value: 'veda_debata', label: 'Věda a debatní kluby' },
      { value: 'jine', label: 'Jiné' },
    ],
  },
  {
    /**
     * Scored against `school_extracted_details.ma_jidelnu`, whose coverage is
     * incomplete and changes as schools are refreshed. It has a low weight
     * in matching.js: a school we know has lunch
     * gains a little, a school we know does not have it loses a little, and a
     * school with no data (the common case) is skipped entirely rather than
     * treated as "no".
     */
    id: 'jidelna',
    type: 'single',
    optional: true,
    label: 'Je pro tebe důležité, aby škola měla vlastní jídelnu nebo zajištěné obědy?',
    hint: 'Tuhle informaci nemáme u všech škol, proto má nižší váhu.',
    options: [
      { value: 'ano', label: 'Ano, chci mít obědy ve škole' },
      { value: 'nezalezi', label: 'Nezáleží mi na tom' },
    ],
  },
  {
    id: 'poznamka',
    type: 'text',
    optional: true,
    maxLength: 500,
    label: 'Chceš něco doplnit?',
    hint: 'Soukromý kontext k této sadě odpovědí. Uloží se s dotazníkem, ale shodu neovlivňuje a neposíláme ho jazykovému modelu. Můžeš ho nechat prázdný.',
  },
];

// Added 2026-09-28 (plan 017). Weight-only and profile-only questions have no
// DIMENSIONS entry in matching.js; the ones listed in WEIGHT_RULES change how
// much other dimensions count, and the "Něco o tobě" ones only reach the AI
// sentence through describeAnswers.
const ADDED_QUESTIONS = [
  {
    id: 'povolani',
    type: 'single',
    optional: true,
    label: 'Máš už jasno, čím chceš být (třeba lékař, programátor, kuchař)?',
    options: [
      { value: 'ano', label: 'Ano, mám konkrétní cíl' },
      { value: 'napul', label: 'Tak napůl' },
      { value: 'ne', label: 'Zatím ne' },
    ],
  },
  {
    id: 'specializace',
    type: 'single',
    optional: true,
    label: 'Chceš si nechat otevřené možnosti, nebo se brzy zaměřit na jeden obor?',
    options: [
      { value: 'otevrene', label: 'Nechat si otevřené možnosti' },
      { value: 'brzy', label: 'Brzy se specializovat' },
      { value: 'nevim', label: 'Nevím' },
    ],
  },
  {
    id: 'alternativni',
    type: 'single',
    optional: true,
    label: 'Láká tě alternativní pedagogika (třeba Montessori nebo waldorfská škola)?',
    hint: 'Tuhle informaci máme zatím jen u části škol.',
    options: [
      { value: 'ano', label: 'Ano' },
      { value: 'ne', label: 'Radši klasickou školu' },
      { value: 'nezalezi', label: 'Nezáleží mi na tom' },
    ],
  },
  {
    /**
     * Cermat points, 0-100. Copied into decision_profile.jpz_points by the POST
     * handler so /prihlaska and the questionnaire share one number.
     * privateToServer: describeAnswers never forwards it to the AI provider.
     */
    id: 'body',
    type: 'number',
    min: 0,
    max: 100,
    optional: true,
    privateToServer: true,
    label: 'Kolik bodů máš z přijímaček nanečisto (Cermat, ze 100)?',
    hint: 'Nepovinné. Odpovídej upřímně — nikdo tě nesoudí. Když odpovíš jinak, než to je, dostaneš horší výsledky. Stejné číslo uvidíš i v plánování přihlášek.',
  },
  {
    id: 'body_zlepseni',
    type: 'single',
    optional: true,
    privateToServer: true,
    label: 'O kolik bodů si myslíš, že se do ostrých přijímaček zlepšíš?',
    hint: 'Použije se jen když výše vyplníš body. Buď k sobě upřímný — přestřelený odhad ti doporučí školy, kam se nedostaneš.',
    options: [
      { value: 'stejne', label: 'Asi zůstanu na stejném' },
      { value: 'plus5', label: 'O pár bodů (asi +5)' },
      { value: 'plus10', label: 'Znatelně (asi +10)' },
      { value: 'plus15', label: 'Hodně (+15 a víc)' },
    ],
  },
  {
    id: 'rezerva',
    type: 'single',
    optional: true,
    label: 'Chceš školy, kam se dostaneš s rezervou, nebo zkusíš lepší, ale těžší školy?',
    hint: 'Funguje, jen když výše vyplníš body.',
    options: [
      { value: 'jistota', label: 'Chci jistotu a velkou rezervu' },
      { value: 'vyvazene', label: 'Něco mezi' },
      { value: 'ambice', label: 'Zkusím těžší školy i s malou rezervou' },
    ],
  },
  {
    id: 'selektivita_vyzva',
    type: 'single',
    optional: true,
    label: 'Chceš mezi spolužáky, kteří tě budou tlačit dopředu, nebo mezi lidi na podobné úrovni jako ty?',
    options: [
      { value: 'vyzva', label: 'Chci výzvu' },
      { value: 'podobna', label: 'Radši podobnou úroveň' },
      { value: 'nezalezi', label: 'Nezáleží mi na tom' },
    ],
  },
  {
    id: 'selektivita_tezka',
    type: 'single',
    optional: true,
    label: 'Chceš na školu, která je známá tím, že je těžké se na ni dostat?',
    options: [
      { value: 'ano', label: 'Ano' },
      { value: 'ne', label: 'Ne' },
      { value: 'jedno', label: 'Je mi to jedno' },
    ],
  },
  {
    id: 'tlak_chytrejsi',
    type: 'single',
    optional: true,
    label: 'Jak se cítíš mezi lidmi, kteří jsou ve škole lepší než ty?',
    options: [
      { value: 'motivuje', label: 'Motivuje mě to' },
      { value: 'stresuje', label: 'Spíš mě to stresuje' },
      { value: 'nevim', label: 'Nevím' },
    ],
  },
  {
    id: 'tlak_vykon',
    type: 'single',
    optional: true,
    label: 'Jak zvládáš, když je ve škole velký tlak na výkon?',
    options: [
      { value: 'dari', label: 'Daří se mi pod tlakem' },
      { value: 'zaseknu', label: 'Spíš se zaseknu' },
      { value: 'nevim', label: 'Nevím' },
    ],
  },
  {
    id: 'prvni_volba',
    type: 'single',
    optional: true,
    label: 'Jak bys to nesl, kdyby tě nevzali na školu, kterou máš na prvním místě?',
    options: [
      { value: 'ok', label: 'Zvládl bych to' },
      { value: 'stres', label: 'Hodně by mě to vzalo' },
    ],
  },
  {
    id: 'priorita_nabidka_misto',
    type: 'single',
    optional: true,
    label: 'Co je pro tebe důležitější?',
    options: [
      { value: 'nabidka', label: 'Co škola nabízí (obory, zaměření)' },
      { value: 'misto', label: 'Kde škola je a jak daleko budu dojíždět' },
      { value: 'oboji', label: 'Obojí stejně' },
    ],
  },
  {
    id: 'priorita_typ_obor',
    type: 'single',
    optional: true,
    label: 'Co je pro tebe důležitější?',
    options: [
      { value: 'typ', label: 'Typ školy (gymnázium, odborná…)' },
      { value: 'obor', label: 'Konkrétní obor, který mě baví' },
      { value: 'oboji', label: 'Obojí stejně' },
    ],
  },
  {
    id: 'prestiz',
    type: 'single',
    optional: true,
    label: 'Záleží ti na tom, jak je škola prestižní, nebo hlavně na tom, aby ti sedla?',
    options: [
      { value: 'prestiz', label: 'Prestiž je pro mě důležitá' },
      { value: 'sedi', label: 'Hlavně ať mi sedí' },
      { value: 'oboji', label: 'Obojí' },
    ],
  },
  {
    id: 'skolne',
    type: 'single',
    optional: true,
    label: 'Můžete (ty a rodina) platit školné na soukromé škole?',
    hint: 'Placené školy tím neschováme, jen je posuneme v pořadí níž.',
    options: [
      { value: 'ano', label: 'Ano, školné nevadí' },
      { value: 'male', label: 'Jen menší částku' },
      { value: 'ne', label: 'Ne, potřebuju školu bez školného' },
    ],
  },
  {
    id: 'cirkevni',
    type: 'single',
    optional: true,
    label: 'Chceš církevní školu?',
    options: [
      { value: 'ano', label: 'Ano' },
      { value: 'ne', label: 'Radši ne' },
      { value: 'nezalezi', label: 'Nezáleží mi na tom' },
    ],
  },
  {
    id: 'povaha',
    type: 'single',
    optional: true,
    label: 'Jsi spíš introvert, nebo extrovert?',
    options: [
      { value: 'introvert', label: 'Spíš introvert' },
      { value: 'extrovert', label: 'Spíš extrovert' },
      { value: 'mezi', label: 'Někde mezi' },
    ],
  },
  {
    id: 'novy_kolektiv',
    type: 'single',
    optional: true,
    label: 'Jak se cítíš, když přijdeš mezi nové lidi?',
    options: [
      { value: 'pohoda', label: 'V pohodě, rychle zapadnu' },
      { value: 'chvili', label: 'Chvíli mi to trvá' },
      { value: 'nesvuj', label: 'Dost nesvůj' },
    ],
  },
  {
    id: 'motivace',
    type: 'single',
    optional: true,
    label: 'Co tě ve škole nejvíc žene dopředu?',
    options: [
      { value: 'znamky', label: 'Známky' },
      { value: 'zvedavost', label: 'Zvědavost, chci věcem rozumět' },
      { value: 'rodice', label: 'Očekávání rodičů' },
      { value: 'kamaradi', label: 'Kamarádi a parta' },
    ],
  },
  {
    // A choice, not free text: describeAnswers never forwards free text to the
    // AI (it can hold personal data), so a text answer could not feed the
    // explanation at all.
    id: 'soucasna_skola',
    type: 'multi',
    max: 3,
    optional: true,
    label: 'Co ti na tvé současné škole vyhovuje?',
    options: [
      { value: 'ucitele', label: 'Učitelé' },
      { value: 'kamaradi', label: 'Kamarádi' },
      { value: 'atmosfera', label: 'Atmosféra' },
      { value: 'predmety', label: 'Předměty' },
      { value: 'kruzky', label: 'Kroužky a akce' },
      { value: 'nic', label: 'Nic moc' },
    ],
  },
];

// Display order and section headings. Existing question ids never change —
// stored runs are keyed on them. Every id must appear exactly once.
const SECTIONS = [
  ['Co tě zajímá', ['typ', 'oblasti', 'predmety', 'povolani', 'specializace', 'po_skole']],
  ['Jak se učíš', ['styl', 'alternativni', 'jazyky']],
  ['Přijímačky a náročnost', ['body', 'body_zlepseni', 'rezerva', 'selektivita_vyzva', 'selektivita_tezka', 'tlak_chytrejsi', 'tlak_vykon', 'prvni_volba']],
  ['Na čem ti záleží víc', ['priorita_nabidka_misto', 'priorita_typ_obor', 'prestiz']],
  ['Praktické věci', ['casti', 'skolne', 'jidelna', 'velikost', 'cirkevni', 'krouzky']],
  ['Něco o tobě', ['povaha', 'novy_kolektiv', 'motivace', 'soucasna_skola']],
  ['Na závěr', ['poznamka']],
];

const QUESTIONS = (() => {
  const byId = new Map([...BASE_QUESTIONS, ...ADDED_QUESTIONS].map((q) => [q.id, q]));
  const ordered = SECTIONS.flatMap(([section, ids]) => ids.map((id) => ({ ...byId.get(id), section })));
  if (ordered.length !== byId.size || ordered.some((q) => !q.id)) {
    throw new Error('QUESTIONS: SECTIONS must list every question exactly once.');
  }
  return ordered;
})();

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

    if (question.type === 'number') {
      if (value === '' || value == null) {
        if (question.optional) continue;
        return { ok: false, error: `Odpověz prosím na „${question.label}“.` };
      }
      const n = Number(value);
      if (!Number.isInteger(n) || n < question.min || n > question.max) {
        return { ok: false, error: `U „${question.label}“ zadej celé číslo ${question.min}–${question.max}.` };
      }
      clean[question.id] = n;
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
function describeAnswers(answers, gender = 'm') {
  const lines = [];

  for (const question of QUESTIONS) {
    // Some answers are for scoring only and must never be narrated. See
    // `privateToServer` on the question itself for why.
    if (question.privateToServer) continue;

    const value = answers[question.id];
    if (value == null || (Array.isArray(value) && !value.length)) continue;

    // Free text can contain contact or other personal data. It remains in the
    // user's stored run, but is never forwarded to the external AI provider.
    if (question.type === 'text') continue;

    const labelFor = (entry) =>
      question.options.find((option) => option.value === entry)?.label ?? entry;

    lines.push(
      `${question.label} ${
        Array.isArray(value) ? value.map(labelFor).join(', ') : labelFor(value)
      }`
    );
  }

  // This is presentation metadata, not a questionnaire answer. The model only
  // receives the grammatical form it needs, never an explanation of the choice.
  lines.push(`Rod pro oslovení: ${gender === 'f' ? 'ženský' : 'mužský'}`);
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
        `  obory: ${programs}`,
        `  signály shody: ${signals}`,
      ].join('\n');
    })
    .join('\n\n');
}

// The model writes prose only. Scores and ordering are decided in matching.js
// and are not up for negotiation here — asking a model for a percentage gets a
// number that reads like a measurement but is really just more generated text,
// which is the whole reason the scoring moved into code.
const SYSTEM_PROMPT = `Pomáháš českému deváťákovi nebo deváťačce porozumět doporučení střední školy.

Dostaneš odpovědi studenta a seřazený seznam škol. U každé školy jsou uvedené její obory a konkrétní signály shody.

Ke každé škole napiš 1–2 krátké věty, dohromady nejvýš přibližně 260 znaků:
1. věta vysvětlí, proč škola sedí, a opře se pouze o její uvedené signály shody a obory. Nepřidej do ní studentovy odpovědi ani jiný kontext;
2. věta je nepovinná a může osobně navázat na odpovědi o povaze, novém kolektivu, motivaci, současné škole nebo velikosti školy. Tyto odpovědi skóre nemění.

Pevná pravidla:
- Vrať jen školy ze vstupu, použij jejich přesná číselná ID a zachovej pořadí.
- Nevymýšlej vlastnosti školy. Obory a signály jsou jediný podklad pro tvrzení o škole.
- Neuváděj procenta, skóre, pořadí ani obecné fráze.
- Piš česky a tykej.
- Pokud je ve vstupu alespoň jedna osobní odpověď, použij ji alespoň u jedné školy napříč celým seznamem. Jen ji citlivě parafrázuj; neodvozuj z ní vlastnost školy ani předpověď budoucího chování.
- Řádek „Rod pro oslovení“ určuje gramatický rod. Když je uveden mužský, použij mužské tvary; když ženský, použij ženské tvary. Pokud chybí nebo je nejasný, použij mužský rod. Rod nikdy výslovně nezmiňuj.
- Osobní odpovědi nepřeváděj na vlastnosti školy. Například extroverzi můžeš citlivě vztáhnout k tomu, že student rád poznává lidi, ale neodvozuj z ní velikost třídy.

Krátké ukázky (data i školy jsou smyšlené):
Vstup: povaha „extrovert“, rod „ženský“; obor „gastronomie“; signál „vede rovnou do praxe“.
Výstup: „Gastronomie vede rovnou do praxe, kterou hledáš. Jsi extrovertka, takže tě může těšit poznávání nových lidí.“

Vstup: bez odpovědi o povaze; rod „mužský“; obor „gymnázium“; signály „je to gymnázium; dává široký základ“.
Výstup: „Gymnázium ti nabídne široký základ a nechá otevřené možnosti dalšího studia.“

Odpověz pouze podle tohoto JSON schématu, bez dalšího textu a bez markdown bloku.`;

const REASONS_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'school_reasons',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        reasons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              school_id: { type: 'integer' },
              reason: { type: 'string', maxLength: 260 },
            },
            required: ['school_id', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['reasons'],
      additionalProperties: false,
    },
  },
};

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
async function requestMatches({ answers, schools, apiKey, model, referer, onUsage, gender = 'm' }) {
  const byId = new Map(schools.map((school) => [school.id, school]));
  const fullOrder = scoreSchools(answers, schools);
  const shortlist = fullOrder.slice(0, REASON_COUNT);

  if (!shortlist.length) {
    throw new Error('Žádné školy k vyhodnocení.');
  }

  // Scoring is complete and valid without the model, so a missing key or a
  // failed call degrades to "percentages, no sentences" instead of failing the
  // submission. The UI reads an empty `reason` as "not available", never as a
  // reason to invent text.
  let reasons = new Map();
  if (apiKey) {
    try {
      reasons = await requestReasons({
        answers,
        shortlist,
        byId,
        apiKey,
        model,
        referer,
        onUsage,
        gender,
      });
    } catch (err) {
      console.error('Questionnaire reasons unavailable, saving scores only:', err.message);
    }
  }

  return {
    fullRanking: fullOrder.map(match=>match.school_id),
    aiUsed: reasons.size > 0,
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
async function requestReasons({ answers, shortlist, byId, apiKey, model, referer, onUsage, gender = 'm' }) {
  const { fetchWithAiUsage } = require('./aiUsage');
  const response = await fetchWithAiUsage(OPENROUTER_URL, {
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
      max_tokens: 4000,
      reasoning: { effort: 'low' },
      provider: { order: PROVIDER_ORDER, allow_fallbacks: false },
      response_format: REASONS_RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `ODPOVĚDI STUDENTA:\n${describeAnswers(
            answers,
            gender
          )}\n\nVYBRANÉ ŠKOLY:\n${describeMatches(shortlist, byId)}`,
        },
      ],
    }),
    // Without this a hung upstream would hold an Express worker open forever.
    signal: AbortSignal.timeout(120_000),
  }, onUsage);

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
    reasons.set(id, entry.reason.trim().slice(0, 260));
  }

  if (!reasons.size) {
    throw new Error('Model nevrátil žádné vysvětlení.');
  }

  reasons.usage = payload?.usage ?? null;
  return reasons;
}

module.exports = {
  QUESTIONS,
  QUESTIONS_BY_ID,
  REASON_COUNT,
  DEFAULT_MODEL,
  questionApplies,
  validateAnswers,
  describeAnswers,
  requestReasons,
  requestMatches,
};
