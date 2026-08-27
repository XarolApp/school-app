/**
 * Turns a stored set of answers back into something readable.
 *
 * The answers jsonb holds option *values* ("gymnazium", "Praha 6"), which is
 * what the scorer needs and not what a person reads. Every label needed to
 * translate them is already in the `questions` array the page fetched, so this
 * is pure lookup — no request, nothing to keep in sync with the backend.
 *
 * This exists because a set of answers is the only thing that actually tells one
 * questionnaire run apart from another. Two sets taken the same afternoon share
 * a date and may well share a top school; what differs is what was answered.
 */

// Mirrors questionApplies in lib/questionnaire.js. The frontend cannot require a
// Node file, and `showIf` has to stay a plain JSON object rather than a function
// anyway, since QUESTIONS travels here as a response body.
export function questionApplies(question, answers) {
  return !question.showIf || answers[question.showIf.field] === question.showIf.equals;
}

function labelFor(question, value) {
  const option = question.options?.find((entry) => entry.value === value);
  return option?.label ?? value;
}

// The chosen options of one question as readable labels, or null when it was
// left blank. `null`/`[]` is a real answer here ("no preference"), and the
// scorer treats it as one, so it is simply absent rather than shown as empty.
function answerLabels(question, answers) {
  const value = answers?.[question.id];

  if (question.type === 'multi') {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value.map((entry) => labelFor(question, entry));
  }

  if (question.type === 'text') {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? [text] : null;
  }

  return value ? [labelFor(question, value)] : null;
}

/**
 * The three questions that carry the most weight in lib/matching.js — `oblasti`
 * (30), `typ` (20) and `casti` (20). Deliberately not every question: the digest
 * has to be scannable down a list of eight sets, and the dimensions that barely
 * move a score are not what distinguishes one set from another.
 */
const DIGEST_IDS = ['oblasti', 'typ', 'casti'];

// How many options to name before summarising the rest. Someone who picked ten
// districts would otherwise push a single row past two lines.
const DIGEST_MAX = 3;

/**
 * Several option labels explain themselves after a dash — "Gymnázium — široký
 * základ, příprava na vysokou". That reads well beside a radio button and is far
 * too long in a digest, where three of them together ran past 100 characters and
 * defeated the point of a scannable list. The part before the dash is the name of
 * the thing; the rest is the sales pitch, and the expanded answer list still
 * shows it in full.
 */
function shortLabel(label) {
  return label.split(/\s[—–-]\s/)[0].trim();
}

function digestPart(question, answers) {
  const labels = answerLabels(question, answers)?.map(shortLabel);
  if (!labels) return null;
  if (labels.length <= DIGEST_MAX) return labels.join(', ');
  return `${labels.slice(0, DIGEST_MAX).join(', ')} +${labels.length - DIGEST_MAX}`;
}

/**
 * One short line summarising a set, for the list.
 *
 * e.g. "Technika a IT, Přírodní vědy · Gymnázium · Praha 6, Praha 9"
 *
 * Returns an empty string when nothing scoreable was answered, so the caller can
 * fall back rather than render a stray separator.
 */
export function digestAnswers(questions, answers) {
  if (!questions?.length || !answers) return '';

  return DIGEST_IDS.map((id) => questions.find((question) => question.id === id))
    .filter(Boolean)
    .filter((question) => questionApplies(question, answers))
    .map((question) => digestPart(question, answers))
    .filter(Boolean)
    .join(' · ');
}

/**
 * Every answered question as `{ id, label, values }`, in the order they were
 * asked — the full record of what produced a set's results.
 *
 * Questions a `showIf` has since ruled out are dropped, matching what the
 * backend validator did when the answers were stored.
 */
export function describeAnswers(questions, answers) {
  if (!questions?.length || !answers) return [];

  return questions
    .filter((question) => questionApplies(question, answers))
    .map((question) => ({
      id: question.id,
      label: question.label,
      values: answerLabels(question, answers),
    }))
    .filter((entry) => entry.values !== null);
}

const DATE_FORMAT = { day: 'numeric', month: 'long', year: 'numeric' };

export function formatRunDate(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('cs-CZ', DATE_FORMAT);
}

/**
 * What to call a set that has no name of its own. Always available, so a set is
 * never nameless in the interface — naming is an improvement, not a chore the
 * list depends on.
 */
export function runTitle(run) {
  if (run?.label) return run.label;
  const date = formatRunDate(run?.created_at);
  return date ? `Sada z ${date}` : 'Sada odpovědí';
}
