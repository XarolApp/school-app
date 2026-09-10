/**
 * Review word filter — decides whether a new review is published immediately
 * or held for a human to look at, before anything else happens to it.
 *
 * This is deliberately a blunt heuristic, not a moderation system: it never
 * edits, rejects or scores a review, and it never blocks the write — the row
 * is always saved, just with `status: 'held'` instead of `'published'` when
 * either rule trips. The real backstop is the report button (server.js's
 * POST /api/reviews/:id/report), which holds a review the moment anyone
 * flags it. This filter only catches the two cheapest, highest-value cases
 * before a single reader sees them: profanity, and a review naming a
 * specific teacher — the one place a "review of a school" turns into a
 * personal attack on a named adult.
 */

// A short, deliberately non-exhaustive list. Widen it if abuse shows up in
// practice — better to under-hold this month than pretend a bigger list
// would have been complete anyway.
const PROFANITY = [
  'kurva', 'kurvy', 'kurvu', 'kurvi',
  'debil', 'debilni', 'debilní',
  'idiot', 'kreten', 'kretén',
  'blbec', 'hovado', 'hajzl',
  'píča', 'pica', 'zkurven',
  'sráč', 'srac',
];

// "pan Novák", "paní učitelka Nováková", "prof. Svoboda" — a title or role
// word immediately followed by a capitalised word. This is a review naming a
// specific person, which a review of a SCHOOL should not need to do.
const NAMED_PERSON = /\b(pan|paní|učitel|učitelka|prof\.?|profesor|profesorka|ředitel|ředitelka)\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+/u;

function containsProfanity(text) {
  const lower = text.toLowerCase();
  return PROFANITY.some((word) => lower.includes(word));
}

function namesAPerson(text) {
  return NAMED_PERSON.test(text);
}

/**
 * @param {string} text — the review body, already trimmed
 * @returns {boolean} true when the review should be held for review instead
 *   of published immediately
 */
function shouldHold(text) {
  return containsProfanity(text) || namesAPerson(text);
}

module.exports = { shouldHold };
