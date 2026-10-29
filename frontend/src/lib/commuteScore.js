// Browser copy of lib/commuteScore.js on the server (the onboarding quiz scores
// in the browser, the saved questionnaire on the server). Same constants, same
// curve: tests/commute-parity.test.mjs fails if the two drift apart.

export const COMMUTE_LIMIT_MIN = 1;
export const COMMUTE_LIMIT_MAX = 60;
export const GRACE_FACTOR = 1.5;
export const GRACE_MIN = 20;
export const GRACE_MAX = 40;
export const DECAY_EXP = 2.25;
export const RAMP_MIN = 10;
export const STRICTNESS_P = { preference: 0, dulezite: 0.25, nutne: 0.5 };
export const DEFAULT_STRICTNESS = 'dulezite';

export const graceMinutes = (limit) => Math.min(GRACE_MAX, Math.max(GRACE_MIN, GRACE_FACTOR * limit));

/** 0..1. `minutes === null` is "over 90 minutes or unreachable": known far, so 0. */
export function commuteCredit(minutes, limit) {
  if (minutes == null) return 0;
  if (minutes <= limit) return 1;
  const left = 1 - (minutes - limit) / graceMinutes(limit);
  return left <= 0 ? 0 : Math.pow(left, DECAY_EXP);
}

const smoothstep = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Multiplier for the final score: 1 inside the limit, down to 1 - P. */
export function commuteMultiplier(minutes, limit, strictness = DEFAULT_STRICTNESS) {
  const p = STRICTNESS_P[strictness] ?? STRICTNESS_P[DEFAULT_STRICTNESS];
  if (!p) return 1;
  if (minutes == null) return 1 - p;
  if (minutes <= limit) return 1;
  return 1 - p * smoothstep((minutes - limit) / RAMP_MIN);
}

export const isCommuteLimit = (value) =>
  Number.isInteger(value) && value >= COMMUTE_LIMIT_MIN && value <= COMMUTE_LIMIT_MAX;
