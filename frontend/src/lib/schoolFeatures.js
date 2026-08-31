/**
 * Derives structured features from the ONLY columns that actually exist in
 * Supabase today: { id, name, location, programs, contact, website }.
 *
 * There is NO grades data, NO capacity, NO admission statistics and NO commute
 * data. Every feature below is derived from free text, so every feature carries
 * a `known` flag. If a feature is unknown the matcher DROPS it instead of
 * guessing — see matching.js. This is what keeps the honesty promise: we never
 * score on something we did not read.
 *
 * When new columns land (e.g. `admission_min_grade`, `capacity`), add a feature
 * here + a component in matching.js. Nothing else has to change.
 */

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Focus categories. Keys must match the option ids of quiz question `focus`. */
export const FOCUS_CATEGORIES = [
  { id: 'prirodni', label: 'Přírodní vědy', keywords: ['prirodovedn', 'biolog', 'chemi', 'fyzik', 'ekolog', 'zivotni prostredi', 'laborator', 'lyceum prirodo'] },
  { id: 'it', label: 'IT a technika', keywords: ['informatik', 'informacni technolog', 'kyberneti', 'elektrotechn', 'strojiren', 'technick', 'programov', 'pocitac', 'mechanik elektro', 'prumyslov'] },
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

export function deriveFeatures(school) {
  const nameN = norm(school.name);
  const programsN = norm(school.programs);
  const haystack = `${nameN} ${programsN}`;

  const focus = FOCUS_CATEGORIES.filter((c) => matchAny(haystack, c.keywords)).map((c) => c.id);

  let type = null;
  if (/gymnaz/.test(nameN)) type = 'gymnazium';
  else if (/uciliste|odborne uciliste|\bsou\b/.test(haystack)) type = 'ucebni';
  else if (/stredni odborna|\bsos\b|prumyslov|obchodni akademie|akademie|skola\b/.test(nameN)) type = 'odborna';
  if (!type && /gymnaz/.test(haystack)) type = 'gymnazium';

  const hasMaturita = matchAny(haystack, MATURITA_KEYWORDS) ? true : /vyucni list/.test(haystack) ? false : null;

  const programList = (school.programs || '')
    .split(/[;\n•]|,(?=\s*[A-ZÁ-Ž])/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    focus,
    focusKnown: programsN.length > 3,
    type,
    hasMaturita,
    language: matchAny(haystack, LANGUAGE_KEYWORDS),
    languageKnown: programsN.length > 3,
    practice: matchAny(haystack, PRACTICE_KEYWORDS),
    practiceKnown: programsN.length > 3,
    district: districtOf(school),
    breadth: programList.length,
    programList,
  };
}
