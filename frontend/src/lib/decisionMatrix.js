/**
 * Weighted decision matrix (feature-brainstorm.md §5 "Weighted decision
 * matrix"). Pure arithmetic over data already on the school row — same rule
 * as lib/matching.js: the model never produces a number, only the AI-written
 * pros/cons sentences do, and those are separate (school_ai_summary). This
 * also reads `match_score` (the questionnaire result, attached server-side by
 * withMatchScores) as one more criterion — still no AI in the number itself.
 *
 * Every raw score is normalized 0–1 relative to the schools ACTUALLY being
 * compared, not to all of Prague — this is a relative ranking of the
 * shortlist on screen, not an absolute grade.
 */

import { summarizeCurrentYear, groupProgramsByObor } from './schoolPrograms';

export const WEIGHTS = { nezalezi: 0, trochu: 1, dost: 2, zasadni: 3 };

// A weak criterion the user marked at least "dost" is worth flagging in a
// callout — below this, "sedí ti" would be dishonest.
export const WEAK_THRESHOLD = 0.35;
// How many percentage points of match_score gap counts as "notably better",
// for the rank-1 gap callout.
export const MATCH_GAP = 15;

export const CRITERIA = [
  { id: 'shoda', label: 'Shoda s tvým dotazníkem', available: true },
  { id: 'sance', label: 'Šance na přijetí', available: true },
  { id: 'mista', label: 'Počet míst', available: true },
  { id: 'typ', label: 'Typ školy odpovídá mým plánům', available: true },
  { id: 'jazyky', label: 'Nabídka jazyků', available: true },
  { id: 'skolne', label: 'Bez školného', available: true },
  {
    id: 'dojezd',
    label: 'Dojezd z domova',
    available: false,
    unavailableNote: 'Na dojezdových časech MHD pracujeme.',
  },
  {
    id: 'maturita',
    label: 'Úspěšnost u maturity',
    available: false,
    unavailableNote: 'Data o maturitě zatím nemáme.',
  },
];

function minMax(values) {
  const known = values.filter((v) => v != null);
  if (!known.length) return () => null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  if (min === max) return (v) => (v == null ? null : 0.5);
  return (v) => (v == null ? null : (v - min) / (max - min));
}

function rawForCriterion(id, schools) {
  switch (id) {
    case 'shoda': {
      const values = schools.map((s) => (typeof s.match_score === 'number' ? s.match_score : null));
      const scale = minMax(values);
      return values.map((v) => scale(v));
    }
    case 'sance': {
      // Lower cutoff = easier = better, so invert.
      const scale = minMax(schools.map((s) => s.admission_cutoff));
      return schools.map((s) => {
        const v = scale(s.admission_cutoff);
        return v == null ? null : 1 - v;
      });
    }
    case 'mista': {
      const capacities = schools.map((s) => summarizeCurrentYear(groupProgramsByObor(s)).kapacita);
      const scale = minMax(capacities);
      return capacities.map((v) => scale(v));
    }
    case 'typ': {
      // Placeholder until a student "plans" input exists — maturita-bearing
      // schools score higher, everything else is neutral. Deliberately not
      // hidden as unavailable: it is a real (if crude) signal today.
      return schools.map((s) => {
        const programs = s.school_programs || [];
        if (!programs.length) return null;
        const anyMaturitni = programs.some((p) => p.maturitni === true);
        return anyMaturitni ? 1 : 0.5;
      });
    }
    case 'jazyky': {
      const counts = schools.map((s) => {
        const jazyky = new Set((s.school_programs || []).map((p) => p.jazyk_studia).filter(Boolean));
        return jazyky.size || null;
      });
      const scale = minMax(counts);
      return counts.map((v) => scale(v));
    }
    case 'skolne': {
      return schools.map((s) => {
        const zrizovatel = (s.zrizovatel || '').toLowerCase();
        if (!zrizovatel) return null;
        const isPrivate = zrizovatel.includes('soukrom') || zrizovatel.includes('církev');
        return isPrivate ? 0 : 1;
      });
    }
    default:
      return schools.map(() => null);
  }
}

/**
 * @param {Array} schools — full school rows (with school_programs)
 * @param {Object} weightsById — { criterionId: 'nezalezi'|'trochu'|'dost'|'zasadni' }
 * @returns {Array} one entry per school: { school, score, breakdown }, sorted
 *   best-first. `score` is null when nothing scoreable remains.
 */
export function scoreByWeights(schools, weightsById) {
  const activeCriteria = CRITERIA.filter(
    (c) => c.available && (weightsById[c.id] ?? 'nezalezi') !== 'nezalezi'
  );

  const perCriterionRaw = new Map(activeCriteria.map((c) => [c.id, rawForCriterion(c.id, schools)]));

  // Drop a criterion entirely if ANY school in the set has no value for it —
  // a partially-known criterion would silently penalize whichever school
  // happens to be missing the data, exactly what the zero-shame /
  // never-fabricate rule forbids.
  const usableCriteria = activeCriteria.filter((c) => {
    const raws = perCriterionRaw.get(c.id);
    return raws.every((v) => v != null);
  });

  const totalWeight = usableCriteria.reduce((sum, c) => sum + WEIGHTS[weightsById[c.id]], 0);

  const results = schools.map((school, i) => {
    if (!usableCriteria.length || totalWeight === 0) {
      return { school, score: null, breakdown: [] };
    }

    const breakdown = usableCriteria.map((c) => {
      const raw = perCriterionRaw.get(c.id)[i];
      const weightKey = weightsById[c.id];
      const weight = WEIGHTS[weightKey] / totalWeight;
      return { criterionId: c.id, label: c.label, raw, weightKey, weighted: raw * weight };
    });

    const score = breakdown.reduce((sum, b) => sum + b.weighted, 0);
    return { school, score, breakdown };
  });

  return results.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/** Whether every compared school carries a real match_score — the criterion
 *  is all-or-nothing per account (withMatchScores in server.js), so this is
 *  really "is the signed-in user's account scored", not a per-school check. */
export function hasMatchScores(schools) {
  return schools.length > 0 && schools.every((s) => typeof s.match_score === 'number');
}

/** Presentation-only band for the match_score chip — never fed back into the
 *  weighted math, which uses the raw percentage via minMax above. */
export function matchBand(score) {
  if (score >= 75) return { label: 'Silná shoda', tone: 'ok' };
  if (score >= 45) return { label: 'Střední shoda', tone: 'acc' };
  return { label: 'Slabá shoda', tone: 'neutral' };
}

/** Criteria the user marked at least "dost" important where this school
 *  scores under WEAK_THRESHOLD — the raw material for the weak-spot callout. */
export function weakSpots(breakdown) {
  return breakdown.filter(
    (b) => (b.weightKey === 'dost' || b.weightKey === 'zasadni') && b.raw < WEAK_THRESHOLD
  );
}

/** Czech list joining: "a" / "a a b" / "a, b a c". */
export function joinCz(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} a ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} a ${items[items.length - 1]}`;
}
