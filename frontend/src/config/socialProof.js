/**
 * Social proof — SINGLE SOURCE OF TRUTH.
 *
 * Deliberately EMPTY on purpose. ŠkolaMatch has no users yet, so
 * "už 1 240 deváťáků našlo svou školu" and invented testimonials would be a
 * fabricated claim shown to a 15-year-old and to a parent deciding whether to
 * pay. Under UCPD that is a misleading commercial practice, and it is the
 * single fastest way to lose a Czech parent's trust.
 *
 * Until real numbers exist, the proof screens fall back to claims that are
 * true today: how the matching works, what data it uses, what it does not
 * claim, and the fact that cancellation is free. Methodology transparency is
 * genuinely persuasive to the parent branch anyway.
 *
 * WHEN REAL DATA EXISTS: fill these in and the proof screens switch over
 * automatically. Only ever put a number here that you can evidence.
 */

/** Verified count of completed quizzes. null = do not claim a number. */
export const STUDENTS_HELPED = null;

/** Verified count of schools in the live catalogue. null = read from the API. */
export const SCHOOLS_IN_CATALOGUE = null;

/**
 * Real testimonials only. Shape:
 * { id, quote, author, role: 'student' | 'parent' }
 */
export const TESTIMONIALS = [];

export function testimonialsFor(role) {
  return TESTIMONIALS.filter((t) => t.role === role);
}
