/**
 * The match percentage for one school.
 *
 * The number arrives from the backend as `match_score`, recomputed there from
 * the student's most recent questionnaire answers — the same `scoreSchools`
 * call, the same inputs, so a school reads the same percentage here as it does
 * on the questionnaire results page.
 *
 * Nothing renders when there is no score: a student who has never taken the
 * questionnaire sees these pages exactly as they were, with no empty badge and
 * no zero. A score of 0 is a legitimate result, so the check is against
 * null/undefined rather than falsiness.
 *
 * The number only. The AI-written sentence explaining a match stays on the
 * questionnaire results page, where the ranking that justifies it lives.
 */

/**
 * Cut points for the colour bands, in percent.
 *
 * ⚠️ These are calibrated against the real score distribution, not picked to
 * look tidy. Scores here are absolute rather than curved (see CLAUDE.md's
 * questionnaire section), so most schools genuinely do not fit any given
 * student: pooled over five representative student profiles against all 60
 * schools, the median score is 31% and three quarters of all school-profile
 * pairs land under 50%.
 *
 * That is why the obvious-looking 80/50 split is wrong here. At 80 the strong
 * band catches only 6% of pairs, so a genuinely good 74% match reads as
 * lukewarm; at 50 the weak band swallows 75% of every list. 70/45 puts ~13% of
 * pairs in the strong band and ~17% in the moderate one, which on the surface
 * that matters most — the questionnaire's own top 8 — means a student with good
 * options sees mostly strong badges and a student in a thin field (health, say)
 * honestly sees moderate and weak ones instead of a page of flattering green.
 *
 * Re-check these if the weights in `lib/matching.js` change, since that moves
 * the whole distribution underneath them.
 */
const STRONG_FROM = 70;
const MODERATE_FROM = 45;

function bandFor(score) {
  if (score >= STRONG_FROM) return 'strong';
  if (score >= MODERATE_FROM) return 'moderate';
  return 'weak';
}

function MatchScore({ score }) {
  if (score == null) return null;

  return (
    <span className={`match-score is-${bandFor(score)}`}>
      <span className="match-score-value">{score}%</span>
      <span className="match-score-label">shoda</span>
    </span>
  );
}

export default MatchScore;
