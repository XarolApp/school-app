/**
 * Translates the ONBOARDING quiz's answer shape into the shape the server
 * questionnaire engine (matching.js's scoreSchools) understands.
 *
 * Two separate quizzes exist deliberately (see CLAUDE.md — the onboarding quiz
 * and the standalone questionnaire were built independently, with different
 * scoring engines: the onboarding engine is band-only and runs in the browser,
 * this one is percentage-based and runs here). This module is the one place
 * that bridges them, so that a match_score computed from an onboarding answer
 * set means the same thing as one computed from the server questionnaire — the
 * app has exactly one `%` engine, per the founder's explicit decision to keep
 * match_score as a real percentage everywhere.
 *
 * Nothing here calls the model and nothing here costs anything: nothing on
 * this path is billed against a monthly allowance.
 */

const FOCUS_TO_OBLASTI = {
  prirodni: ['prirodni'],
  it: ['it', 'technika'],
  ekonomie: ['ekonomika'],
  humanitni: ['humanitni'],
  umeni: ['umeni'],
  zdravotnictvi: ['zdravotnictvi'],
  pedagogika: ['pedagogika'],
  gastro: ['gastro'],
  remeslo: ['remesla'],
  // 'sport' has no server-side oblasti area (matching.js's AREA_KEYWORDS has
  // no sport entry) — dropped rather than mapped to something misleading. See
  // UNFORGET.md.
};

const FUTURE_TO_PO_SKOLE = { vysoka: 'vysoka', remeslo: 'prace' };

const ALLOWED = {
  focus: new Set(['prirodni', 'it', 'ekonomie', 'humanitni', 'umeni', 'zdravotnictvi', 'pedagogika', 'gastro', 'sport', 'remeslo', 'nevim']),
  future: new Set(['vysoka', 'remeslo', 'nevim']),
  studyType: new Set(['gymnazium', 'odborna', 'ucebni', 'nevim']),
  language: new Set(['hodne', 'trochu', 'nezalezi', 'nevim']),
  practice: new Set(['praxe', 'teorie', 'obojí', 'nevim']),
  certainty: new Set(['jiste', 'spis', 'vubec']),
  priority: new Set(['zamereni', 'blizkost', 'obojí']),
};

const SINGLE_KEYS = ['future', 'studyType', 'language', 'practice', 'certainty', 'priority'];

/**
 * Validates the raw onboarding answers object the client posts. Every key is
 * optional; an unknown key is ignored; a known key with a value outside its
 * allowed set is rejected outright — same "don't trust the browser" posture
 * as validateAnswers in questionnaire.js.
 */
function validateOnboardingAnswers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
  }

  const clean = {};

  if (raw.focus !== undefined) {
    if (!Array.isArray(raw.focus)) {
      return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
    }
    const unique = [...new Set(raw.focus)];
    if (!unique.every((v) => ALLOWED.focus.has(v))) {
      return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
    }
    if (unique.length > 11) {
      return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
    }
    if (unique.length) clean.focus = unique;
  }

  if (raw.districts !== undefined) {
    if (!Array.isArray(raw.districts)) {
      return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
    }
    const unique = [...new Set(raw.districts.map(String))];
    const validDistrict = (v) => /^([1-9]|1[0-9]|2[0-2])$/.test(v);
    if (!unique.every(validDistrict) || unique.length > 22) {
      return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
    }
    if (unique.length) clean.districts = unique;
  }

  for (const key of SINGLE_KEYS) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== 'string' || !ALLOWED[key].has(raw[key])) {
      return { ok: false, error: 'Odpovědi z dotazníku mají neplatný formát.' };
    }
    clean[key] = raw[key];
  }

  return { ok: true, answers: clean };
}

/**
 * Translates validated onboarding answers into the server questionnaire's
 * answer shape (matching.js's DIMENSIONS read these keys). Only sets a key
 * when it has a real value — an omitted key is how matching.js's dimensions
 * already express "no preference here", so this never needs to invent a
 * neutral default.
 */
function translateOnboardingAnswers(clean) {
  const out = {};

  if (clean.studyType && clean.studyType !== 'nevim') {
    out.typ = clean.studyType;
  }

  if (clean.future && clean.future !== 'nevim') {
    out.po_skole = FUTURE_TO_PO_SKOLE[clean.future];
  }

  if (clean.practice === 'praxe' || clean.practice === 'teorie') {
    out.styl = clean.practice;
  }

  if (clean.language === 'hodne') {
    out.jazyky = 'velmi';
  }

  if (Array.isArray(clean.districts) && clean.districts.length && clean.districts.length < 22) {
    out.casti = clean.districts.map((n) => `Praha ${n}`);
  }

  if (Array.isArray(clean.focus)) {
    const oblasti = [...new Set(clean.focus.flatMap((f) => FOCUS_TO_OBLASTI[f] || []))];
    if (oblasti.length) out.oblasti = oblasti;
  }

  return out;
}

/** True when the translated answers give matching.js at least one dimension
 *  to score on — otherwise every school would tie at 0%, which is not a
 *  match, it's an empty questionnaire wearing a percentage. */
function isScoreable(serverAnswers) {
  return ['typ', 'po_skole', 'styl', 'jazyky', 'casti', 'oblasti'].some(
    (key) => serverAnswers[key] !== undefined
  );
}

module.exports = { validateOnboardingAnswers, translateOnboardingAnswers, isScoreable };
