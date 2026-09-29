/**
 * Derives structured features for scoring, search filters and "similar
 * schools".
 *
 * PRIMARY SOURCE: `school.school_programs` — Cermat's official per-obor rows
 * (KKOV code, typ_skoly, maturitni, jazyk_studia). The obor group, the kind
 * of study and the exit exam are read from those codes, not guessed.
 *
 * FALLBACK: free-text keyword matching over name + programs, used only when a
 * school has no `school_programs` (demo data). This used to be the only path,
 * and it mis-tagged schools: "průmyslová" and "technick" put a clothing-design
 * school and a food-technology school into "IT a technika", and a school with
 * "… a Gymnázium" in its name was typed purely as a gymnázium. Fixed
 * 2026-09-28 by moving to the codes.
 *
 * Every feature still carries a `known` flag. If a feature is unknown the
 * matcher DROPS it instead of guessing — see matching.js.
 */

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Focus categories. Keys must match the option ids of quiz question `focus`. */
export const FOCUS_CATEGORIES = [
  { id: 'prirodni', label: 'Přírodní vědy', keywords: ['prirodovedn', 'biolog', 'chemi', 'fyzik', 'ekolog', 'zivotni prostredi', 'laborator', 'lyceum prirodo'] },
  { id: 'it', label: 'IT a technika', keywords: ['informatik', 'informacni technolog', 'kyberneti', 'elektrotechn', 'strojiren', 'programov', 'pocitac', 'mechanik elektro'] },
  { id: 'ekonomie', label: 'Ekonomie a podnikání', keywords: ['ekonom', 'obchodni akademie', 'podnikani', 'ucetnic', 'management', 'marketing', 'financ', 'bankovnic'] },
  { id: 'humanitni', label: 'Humanitní obory a jazyky', keywords: ['humanitn', 'jazyk', 'filolog', 'historie', 'spolecensk', 'pravni', 'verejnospravni', 'verejna sprava', 'lyceum'] },
  { id: 'umeni', label: 'Umění a design', keywords: ['umelec', 'design', 'grafik', 'vytvarn', 'hudebn', 'konzervator', 'fotograf', 'multimedi', 'anima'] },
  { id: 'zdravotnictvi', label: 'Zdravotnictví a péče o lidi', keywords: ['zdravotn', 'osetrovatel', 'farmaceut', 'laborantsk', 'socialni cinnost', 'masér', 'maser', 'zubni'] },
  { id: 'pedagogika', label: 'Pedagogika a práce s dětmi', keywords: ['pedagog', 'predskolni', 'vychovatel', 'ucitelstv'] },
  { id: 'gastro', label: 'Gastronomie a služby', keywords: ['gastronom', 'kuchar', 'cisnik', 'hotelnictv', 'cestovni ruch', 'cukrar', 'kadernic', 'kosmetic', 'sluzby'] },
  { id: 'sport', label: 'Sport', keywords: ['sportov', 'telesn', 'trener'] },
  { id: 'remeslo', label: 'Řemeslo a praktická práce', keywords: ['ucebni obor', 'uciliste', 'vyucni', 'remesl', 'instalater', 'truhlar', 'automechanik', 'zednik', 'elektrikar', 'oprava', 'autotronik'] },
];

const LANGUAGE_KEYWORDS = ['jazyk', 'bilingv', 'anglic', 'nemeck', 'spanel', 'francouz', 'zivych jazyku', 'cizich jazyku'];
const PRACTICE_KEYWORDS = ['praxe', 'odborny vycvik', 'ucebni obor', 'vyucni list', 'uciliste', 'dilny', 'prakticke vyucovani'];
const MATURITA_KEYWORDS = ['maturit', 'gymnaz', 'lyceum', 'obchodni akademie', 'akademie'];

/** Praha 1–22 adjacency, coarse but real geography. Used ONLY for a
 *  same / sousední / vzdálená band. We never claim minutes — we have no
 *  timetable data and saying "25 minut" would be an invented number. */
const CORE_ADJACENCY = {
  1: [2, 5, 6, 7, 8],
  2: [1, 3, 4, 5, 10],
  3: [1, 2, 8, 9, 10],
  4: [2, 5, 10],
  5: [1, 2, 4, 6],
  6: [1, 5, 7],
  7: [1, 6, 8],
  8: [1, 3, 7, 9],
  9: [3, 8, 10],
  10: [2, 3, 4, 9],
};

/** Outer districts folded onto their nearest core district. */
const OUTER_TO_CORE = { 11: 4, 12: 4, 13: 5, 14: 9, 15: 10, 16: 5, 17: 6, 18: 9, 19: 9, 20: 9, 21: 9, 22: 10 };

export function toCoreDistrict(district) {
  if (!district) return null;
  if (district >= 1 && district <= 10) return district;
  return OUTER_TO_CORE[district] || null;
}

/** Breadth-first hop count between two Prague districts. */
export function districtHops(a, b) {
  const from = toCoreDistrict(a);
  const to = toCoreDistrict(b);
  if (!from || !to) return null;
  if (from === to) return a === b ? 0 : 1;
  const seen = new Set([from]);
  let frontier = [from];
  let hops = 0;
  while (frontier.length && hops < 6) {
    hops += 1;
    const next = [];
    for (const node of frontier) {
      for (const nb of CORE_ADJACENCY[node] || []) {
        if (seen.has(nb)) continue;
        if (nb === to) return hops;
        seen.add(nb);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return null;
}

export function parseDistrict(locationText) {
  const t = norm(locationText);
  const m = t.match(/praha\s*(\d{1,2})/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 22) return n;
  }
  return null;
}

/**
 * `school.district` ("Praha 14") is attached server-side from real
 * coordinates — see server.js `withDistricts`. It is the správní obvod, a
 * different division than the městský obvod in `location` text, and the two
 * disagree for roughly a third of schools. Prefer it; fall back to parsing
 * `location` only when it is absent (demo data has no coordinates to derive
 * a real district from).
 */
export function districtOf(school) {
  if (school.district) {
    const n = Number(String(school.district).replace(/\D/g, ''));
    if (n >= 1 && n <= 22) return n;
  }
  return parseDistrict(school.location);
}

function matchAny(haystack, keywords) {
  return keywords.some((k) => haystack.includes(k));
}

/**
 * KKOV obor group (first two digits) -> focus categories. Groups not listed
 * carry no focus claim. "IT a technika" covers technical fields generally
 * (the option's own label), not only informatics.
 */
const KKOV_FOCUS = {
  16: ['prirodni'], // ekologie a ochrana životního prostředí
  18: ['it'], // informatické obory
  21: ['it'], // hornictví, hutnictví
  23: ['it'], // strojírenství
  26: ['it'], // elektrotechnika, telekomunikační a výpočetní technika
  28: ['prirodni'], // technická chemie
  29: ['prirodni'], // potravinářství a potravinářská chemie
  31: ['umeni'], // textilní výroba a oděvnictví (incl. oděvní návrhářství)
  32: ['remeslo'], // kožedělná výroba
  33: ['remeslo'], // zpracování dřeva a výroba hudebních nástrojů
  34: ['umeni'], // polygrafie, média
  36: ['it'], // stavebnictví
  37: ['it'], // doprava a spoje
  39: ['it'], // speciální a interdisciplinární technické obory
  41: ['prirodni'], // zemědělství a lesnictví
  43: ['prirodni'], // veterinářství
  53: ['zdravotnictvi'], // zdravotnictví
  63: ['ekonomie'], // ekonomika a administrativa
  64: ['ekonomie'], // podnikání v oborech
  65: ['gastro'], // gastronomie, hotelnictví a turismus
  66: ['ekonomie'], // obchod
  68: ['humanitni'], // právo, právní a veřejnosprávní činnost
  69: ['gastro'], // osobní a provozní služby
  72: ['humanitni'], // publicistika, knihovnictví a informatika
  74: ['sport'], // tělesná kultura
  82: ['umeni'], // umění a užité umění
};

/** Codes whose group alone is not specific enough. */
const KKOV_EXACT_FOCUS = {
  '75-31': ['pedagogika'], // předškolní a mimoškolní pedagogika
  '75-41': ['zdravotnictvi'], // sociální činnost ("péče o lidi")
  '78-42-M/01': ['it'], // technické lyceum
  '78-42-M/02': ['ekonomie'], // ekonomické lyceum
  '78-42-M/03': ['pedagogika'], // pedagogické lyceum
  '78-42-M/04': ['zdravotnictvi'], // zdravotnické lyceum
  '78-42-M/05': ['prirodni'], // přírodovědné lyceum
  '79-42': ['sport'], // gymnázium se sportovní přípravou
  '79-43': ['humanitni'], // dvojjazyčné gymnázium
};

/** 79-41/42/43: a gymnázium. The general one (79-41) makes no focus claim. */
const isGymCode = (kkov) => /^79-4[123]-K/.test(kkov);
/** KKOV letter: H/E/C/J = výuční list or praktická škola — hands-on study. */
const letterOf = (kkov) => (kkov.match(/-([A-Z])\//) || [])[1] || null;

/** Focus claimed by the school's own name. "IT" needs a word match — as a
 *  substring it would hit half the language. */
function namedFocus(nameN) {
  const ids = FOCUS_CATEGORIES.filter((c) => matchAny(nameN, c.keywords)).map((c) => c.id);
  if (/(^|[^a-z])it([^a-z]|$)/.test(nameN) && !ids.includes('it')) ids.push('it');
  return ids;
}

function focusFromKkov(kkov) {
  for (const [prefix, ids] of Object.entries(KKOV_EXACT_FOCUS)) {
    if (kkov.startsWith(prefix)) return ids;
  }
  return KKOV_FOCUS[Number(kkov.slice(0, 2))] || [];
}

function featuresFromPrograms(school, programs) {
  const nameN = norm(school.name);
  const kkovs = programs.map((p) => p.kkov || '').filter(Boolean);

  const focus = new Set(kkovs.flatMap(focusFromKkov));
  if (kkovs.some((k) => ['H', 'E', 'C', 'J'].includes(letterOf(k)))) focus.add('remeslo');
  // A name can still carry a real specialisation the code does not
  // (e.g. "IT Gymnázium"); names are specific enough to trust, program
  // prose is not.
  namedFocus(nameN).forEach((id) => focus.add(id));

  const types = new Set();
  for (const k of kkovs) {
    const letter = letterOf(k);
    if (isGymCode(k)) types.add('gymnazium');
    else if (['H', 'E', 'C', 'J'].includes(letter)) types.add('ucebni');
    else types.add('odborna');
  }
  const type = types.has('gymnazium') ? 'gymnazium' : types.has('odborna') ? 'odborna' : types.has('ucebni') ? 'ucebni' : null;

  const maturitaKnown = programs.some((p) => typeof p.maturitni === 'boolean');
  const hasMaturita = maturitaKnown ? programs.some((p) => p.maturitni === true) : null;

  const foreignLanguage = programs.some((p) => p.jazyk_studia && p.jazyk_studia !== 'Český');

  // Per-obor view: a student applies to an obor, not to a school, so the
  // matcher scores each of these and keeps the school's best one.
  // Name keywords describe a gymnázium only when the school IS just a
  // gymnázium ("1. IT Gymnázium"); in "SOŠ přírodovědná … a Gymnázium" the
  // word belongs to the other half of the school.
  const pureGym = kkovs.length > 0 && kkovs.every(isGymCode);
  const nameFocus = pureGym ? namedFocus(nameN) : [];
  const oborFeatures = programs
    .filter((p) => p.kkov)
    .map((p) => {
      const k = p.kkov;
      const letter = letterOf(k);
      const hands = ['H', 'E', 'C', 'J'].includes(letter);
      const oborFocus = new Set(focusFromKkov(k));
      if (hands) oborFocus.add('remeslo');
      // The school's name speaks for its gymnázium too ("IT Gymnázium").
      if (isGymCode(k)) nameFocus.forEach((id) => oborFocus.add(id));
      const oborType = isGymCode(k) ? 'gymnazium' : hands ? 'ucebni' : 'odborna';
      return {
        kkov: k,
        focus: [...oborFocus],
        general: k.startsWith('79-41'),
        type: oborType,
        types: [oborType],
        hasMaturita: typeof p.maturitni === 'boolean' ? p.maturitni : null,
        practice: !/^7[89]-/.test(k),
        cutoff: p.cutoff ?? null,
      };
    });

  return {
    focus: [...focus],
    focusKnown: true,
    // The general gymnázium teaches every academic subject; it is neither a
    // hit nor a miss for an academic interest (see matching.js `focus`).
    general: kkovs.some((k) => k.startsWith('79-41')),
    type,
    types: [...types],
    hasMaturita,
    language: foreignLanguage || kkovs.some((k) => k.startsWith('79-43')) || matchAny(nameN, LANGUAGE_KEYWORDS),
    languageKnown: true,
    // Any non-gymnázium, non-general obor includes odborná praxe.
    practice: kkovs.some((k) => !/^7[89]-/.test(k)),
    practiceKnown: true,
    breadth: new Set(kkovs).size,
    obory: oborFeatures,
  };
}

function featuresFromText(school) {
  const nameN = norm(school.name);
  const programsN = norm(school.programs);
  const haystack = `${nameN} ${programsN}`;

  let type = null;
  if (/gymnaz/.test(nameN)) type = 'gymnazium';
  else if (/uciliste|odborne uciliste|\bsou\b/.test(haystack)) type = 'ucebni';
  else if (/stredni odborna|\bsos\b|prumyslov|obchodni akademie|akademie|skola\b/.test(nameN)) type = 'odborna';
  if (!type && /gymnaz/.test(haystack)) type = 'gymnazium';

  return {
    focus: FOCUS_CATEGORIES.filter((c) => matchAny(haystack, c.keywords)).map((c) => c.id),
    focusKnown: programsN.length > 3,
    general: false,
    type,
    types: type ? [type] : [],
    hasMaturita: matchAny(haystack, MATURITA_KEYWORDS) ? true : /vyucni list/.test(haystack) ? false : null,
    language: matchAny(haystack, LANGUAGE_KEYWORDS),
    languageKnown: programsN.length > 3,
    practice: matchAny(haystack, PRACTICE_KEYWORDS),
    practiceKnown: programsN.length > 3,
    breadth: null,
  };
}

export function deriveFeatures(school) {
  const programs = school.school_programs ?? [];
  const base = programs.length ? featuresFromPrograms(school, programs) : featuresFromText(school);

  const programList = (school.programs || '')
    .split(/[;\n•]|,(?=\s*[A-ZÁ-Ž])/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ...base,
    district: districtOf(school),
    breadth: base.breadth ?? programList.length,
    programList,
  };
}
