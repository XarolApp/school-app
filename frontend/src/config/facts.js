/**
 * Numbers the marketing copy quotes. One place, so the landing, the onboarding
 * and the quiz can never disagree.
 *
 * SCHOOL_COUNT is what GET /api/schools returns (merged schools are excluded
 * server-side, so it is lower than the raw row count). Where the live list is
 * loaded, prefer its length; this is the fallback and the static-copy value.
 * Update it after a school import.
 */
export const SCHOOL_COUNT = 217;

/** The onboarding quiz (QUESTIONS.length questions). */
export const QUIZ_MINUTES = 3;
