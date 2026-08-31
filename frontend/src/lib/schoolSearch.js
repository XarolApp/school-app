/**
 * Search helpers for the school database.
 *
 * Everything runs in the browser over the full list of schools. That is fine
 * at Prague scale (~60 rows) and it means typing feels instant with no
 * round-trip per keystroke. If the database ever grows past a few thousand
 * rows this needs to move behind the API.
 */

/**
 * Diacritics and case are noise in a search box. A ninth grader types
 * "gymnazium"; the database says "Gymnázium". Folding both sides removes the
 * biggest class of "why does nothing show up" before fuzzy matching is even
 * involved.
 */
export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function tokenize(text) {
  return normalize(text)
    // "praha6" is the same query as "praha 6"; people skip the space.
    .replace(/([a-z])(\d)/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Levenshtein distance, abandoned as soon as it is certain to exceed `max`.
 * The bail-out matters: this runs for every query token against every word of
 * every school on every keystroke.
 */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < best) best = curr[j];
    }
    if (best > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

// How wrong a word is allowed to be before it stops counting as a match.
// Short tokens get no budget at all — at three letters, one edit turns almost
// any word into almost any other and the results become noise.
function typoBudget(token) {
  if (token.length >= 8) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

/**
 * Words that are not misspellings of each other but mean the same thing to the
 * person typing. Czech teenagers write "gympl", not "gymnázium", and no amount
 * of edit distance bridges that. Keys and values are already normalised.
 *
 * Deliberately short: every entry is a guess about intent, so this only holds
 * cases where the guess is safe. Extend it when real searches show a gap.
 */
const ALIASES = {
  gympl: ['gymnazium'],
  it: ['informacni'],
  informatika: ['informacni'],
  zdravka: ['zdravotnicka'],
  prumka: ['prumyslova'],
  ekonomka: ['ekonomicka'],
  ucnak: ['uciliste'],
};

/**
 * Does one query token match one indexed word? Prefix first (so "info" finds
 * "informační" while the user is still typing), then a typo-tolerant compare
 * against the same-length prefix of the word — comparing against the whole
 * word would let the budget be eaten by the tail, so "eko" would match
 * "ekonomika" only by accident.
 */
function variantMatches(variant, budget, word) {
  if (word.startsWith(variant)) return true;
  if (budget === 0) return false;

  const probe = word.slice(0, variant.length + budget);
  return editDistance(variant, probe, budget) <= budget;
}

function tokenMatchesWord(token, word) {
  // A number is never half-typed the way a word is: in "praha 6" the 6 means
  // district six, not house number 695. So digits have to match a whole word,
  // or every address with a 6-something street number comes back as a hit.
  if (token.numeric) return word === token.text;

  for (const variant of token.variants) {
    if (variantMatches(variant, token.budget, word)) return true;
  }
  return false;
}

function fieldMatches(token, words) {
  for (const word of words) {
    if (tokenMatchesWord(token, word)) return true;
  }
  return false;
}

const isNumber = (word) => /^\d+$/.test(word);

/**
 * "Praha 6" is one idea, not two words. Kept as separate tokens the 6 collides
 * with everything — house number 82/6, postal code, even "Gymnázium (6 let)" in
 * the programs column. So an adjacent "praha" + number is folded into a single
 * token matched against the school's district and nothing else.
 */
function foldDistrictPhrase(words) {
  const tokens = [];

  for (let i = 0; i < words.length; i += 1) {
    const next = words[i + 1];
    if (words[i] === 'praha' && next && /^\d{1,2}$/.test(next)) {
      tokens.push({ district: `praha ${next}` });
      i += 1;
      continue;
    }

    const text = words[i];
    tokens.push({
      text,
      numeric: isNumber(text),
      budget: typoBudget(text),
      variants: [text, ...(ALIASES[text] || [])],
    });
  }

  return tokens;
}

/**
 * Turns raw input into the shape the scorer wants, once per keystroke rather
 * than once per school.
 */
export function prepareQuery(input) {
  const trimmed = (input || '').trim();

  return {
    text: normalize(trimmed),
    tokens: foldDistrictPhrase(tokenize(trimmed)),
  };
}

/**
 * Addresses and school names are full of numbers nobody searches by — house
 * numbers, postal codes, "Voděradská 2". Left in the index they poison the one
 * number that does matter, so they are dropped; the district is matched
 * through its own field instead.
 *
 * Program codes ("18-20-M/01") are left alone — those are worth searching for.
 */
export function buildIndex(schools) {
  return schools.map((school) => ({
    school,
    name: tokenize(school.name).filter((word) => !isNumber(word)),
    location: tokenize(school.location).filter((word) => !isNumber(word)),
    programs: tokenize(school.programs),
    nameText: normalize(school.name),
    districtText: normalize(districtOf(school) || ''),
  }));
}

// A hit in the school's name says more about intent than a hit in its address,
// so the fields are not worth the same.
const FIELD_WEIGHTS = { name: 3, programs: 2, location: 1 };

/**
 * Scores one indexed school against the query. Returns 0 when any token fails
 * to match anywhere — tokens are ANDed, so "gymnazium praha 6" means both, the
 * way every search box the user has ever used behaves.
 */
export function scoreSchool(entry, query) {
  let score = 0;

  for (const token of query.tokens) {
    // A district is an exact fact about a school, so it either holds or the
    // school is out — no point scoring it against name or programs.
    if (token.district) {
      if (entry.districtText !== token.district) return 0;
      score += FIELD_WEIGHTS.programs;
      continue;
    }

    let tokenScore = 0;
    if (fieldMatches(token, entry.name)) tokenScore = FIELD_WEIGHTS.name;
    else if (fieldMatches(token, entry.programs)) tokenScore = FIELD_WEIGHTS.programs;
    else if (fieldMatches(token, entry.location)) tokenScore = FIELD_WEIGHTS.location;

    if (tokenScore === 0) return 0;
    score += tokenScore;
  }

  // Typing most of an actual school name should put that school on top, even
  // though its individual words also appear in a dozen other names.
  if (query.text.length >= 3 && entry.nameText.includes(query.text)) score += 6;

  return score;
}

/**
 * The school's správní obvod — "Praha 1".."Praha 22".
 *
 * ⚠️ This reads the `district` field the backend attaches, and deliberately no
 * longer parses the address. The "Praha N" written in a Czech postal address
 * names a *městský obvod* (only ever 1–10), which is a different division from
 * the 22 *správní obvody* the questionnaire asks about — the two disagree for
 * 18 of the 60 schools. Parsing here would put this filter and the
 * questionnaire's district preference on two different maps, so the same school
 * would be called "Praha 9" in one place and "Praha 14" in the other.
 *
 * `server.js` derives it from the school's coordinates (`withDistricts`), so an
 * ungeocoded school returns null and stays findable by text while never
 * matching a district filter — the same absence rule as before.
 */
export function districtOf(school) {
  return school?.district ?? null;
}

/**
 * Programs arrive as one comma-separated text field, but a program's optional
 * qualifier is itself a comma-separated list in brackets:
 *
 *   "Veřejnosprávní činnost (Mezinárodní vztahy, Finance, Právo), Gymnázium"
 *
 * Splitting on every comma would shatter that into nonsense, so commas inside
 * brackets are left alone.
 */
export function splitPrograms(text) {
  const parts = [];
  let depth = 0;
  let buffer = '';

  for (const char of text || '') {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      parts.push(buffer);
      buffer = '';
    } else {
      buffer += char;
    }
  }
  parts.push(buffer);

  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * The dropdown lists fields of study, not every variant a school markets. Drop
 * the bracketed qualifier and the MŠMT code so the four FOSTRA gymnasium
 * variants collapse into one selectable "Gymnázium".
 */
export function baseProgram(program) {
  return program
    .replace(/\s*\(.*$/, '')
    .replace(/\s*\d{2}-\d{2}-[A-Z]\/\d{2}\s*/g, '')
    .replace(/;.*$/, '')
    .trim();
}

/**
 * Distinct values for a dropdown, each with the number of schools behind it,
 * ordered so the options a visitor actually wants are near the top.
 */
export function collectFacet(schools, valuesOf, compare) {
  const counts = new Map();

  for (const school of schools) {
    for (const value of new Set(valuesOf(school))) {
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort(compare);
}

// Praha 2 before Praha 10 — the default string sort gets this backwards.
export function compareDistricts(a, b) {
  const num = (value) => Number(value.replace(/\D/g, '')) || 0;
  return num(a.value) - num(b.value);
}

// Common fields first, then alphabetically. Czech collation matters here:
// plain sort puts "Čalouník" after "Zlatník".
export function compareByCount(a, b) {
  return b.count - a.count || a.label.localeCompare(b.label, 'cs');
}
