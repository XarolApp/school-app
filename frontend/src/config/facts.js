/**
 * Numbers the marketing copy quotes. One place, so the landing, the onboarding
 * and the quiz can never disagree.
 *
 * SCHOOL_COUNT is only the FALLBACK shown until the live list loads (or if it
 * fails) — copy reads the real number through useSchoolCount(). Merged schools
 * are excluded server-side, so it is lower than the raw row count.
 */
export const SCHOOL_COUNT = 217;

/** The onboarding quiz (QUESTIONS.length questions). */
export const QUIZ_MINUTES = 3;
