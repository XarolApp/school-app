/**
 * Numbers the marketing copy quotes. One shared fallback keeps the landing, onboarding
 * and quiz copy aligned while the live catalogue loads.
 *
 * SCHOOL_COUNT is only the FALLBACK shown until the live list loads (or if it
 * fails) — copy reads the real number through useSchoolCount(). Merged and hidden schools
 * are excluded server-side, so it is lower than the raw row count.
 */
export const SCHOOL_COUNT = 192;

/** The onboarding quiz (QUESTIONS.length questions). */
export const QUIZ_MINUTES = 3;
