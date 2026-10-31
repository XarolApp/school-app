/**
 * Commute-time scoring helpers (plan reports/mhd-commute-plan-2026-10-29.md).
 *
 * Pure arithmetic, no routing: `minutes` comes from the committed stop-level
 * matrix (lib/data/commute-matrix.json) via server.js's `withCommute`, `limit`
 * is the whole minute the student picked (1..COMMUTE_LIMIT_MAX).
 *
 * Two separate effects, kept separate on purpose:
 *   - commuteCredit: the smooth 0..1 score of the `dojezd` dimension. Full
 *     credit inside the limit, then a decay over a grace window.
 *   - commuteMultiplier: the "how strict" penalty on the final raw score. It
 *     ramps in over RAMP_MIN minutes instead of cutting at the limit, because
 *     the matrix is an estimate (IDOS spot check: median error 3 min, max 10,
 *     optimistic in 10 of 11 pairs). A hard cliff at exactly T would claim a
 *     precision the data does not have.
 *
 * The browser never scores: its live count is a plain "minutes <= limit" over
 * the stop's row (GET /api/commute/stops/:id/schools).
 */

const COMMUTE_LIMIT_MIN = 1;
const COMMUTE_LIMIT_MAX = 60; // the slider's "60+" end means no limit and stores nothing

const GRACE_FACTOR = 1.5;
const GRACE_MIN = 20;
const GRACE_MAX = 40;
const DECAY_EXP = 2.25;
const RAMP_MIN = 10;

// Values of the 3-way `dojezd_prisnost` question -> strength of the penalty.
const STRICTNESS_P = { preference: 0, dulezite: 0.25, nutne: 0.5 };
const DEFAULT_STRICTNESS = 'dulezite';

/** Grace window: the credit reaches 0 at T + G. Scales with T, clamped 20..40. */
function graceMinutes(limit) {
  return Math.min(GRACE_MAX, Math.max(GRACE_MIN, GRACE_FACTOR * limit));
}

/** 0..1. `minutes === null` is "over 90 minutes or unreachable" - known far, so 0. */
function commuteCredit(minutes, limit) {
  if (minutes == null) return 0;
  if (minutes <= limit) return 1;
  const grace = graceMinutes(limit);
  const left = 1 - (minutes - limit) / grace;
  return left <= 0 ? 0 : Math.pow(left, DECAY_EXP);
}

function smoothstep(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Multiplier for the raw score: 1 inside the limit, down to 1 - P. */
function commuteMultiplier(minutes, limit, strictness = DEFAULT_STRICTNESS) {
  const p = STRICTNESS_P[strictness] ?? STRICTNESS_P[DEFAULT_STRICTNESS];
  if (!p) return 1;
  if (minutes == null) return 1 - p;
  if (minutes <= limit) return 1;
  return 1 - p * smoothstep((minutes - limit) / RAMP_MIN);
}

function isCommuteLimit(value) {
  return Number.isInteger(value) && value >= COMMUTE_LIMIT_MIN && value <= COMMUTE_LIMIT_MAX;
}

module.exports = {
  COMMUTE_LIMIT_MIN,
  COMMUTE_LIMIT_MAX,
  GRACE_FACTOR,
  GRACE_MIN,
  GRACE_MAX,
  DECAY_EXP,
  RAMP_MIN,
  STRICTNESS_P,
  DEFAULT_STRICTNESS,
  graceMinutes,
  commuteCredit,
  commuteMultiplier,
  isCommuteLimit,
};
