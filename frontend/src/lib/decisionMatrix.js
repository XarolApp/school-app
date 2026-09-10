/**
 * Weighted decision matrix (feature-brainstorm.md §5 "Weighted decision
 * matrix"). Pure arithmetic over data already on the school row — same rule
 * as lib/matching.js: the model never produces a number, only the AI-written
 * pros/cons sentences do, and those are separate (school_ai_summary).
 *
 * Every raw score is normalized 0–1 relative to the schools ACTUALLY being
 * compared, not to all of Prague — this is a relative ranking of the
 * shortlist on screen, not an absolute grade.
 */

import { summarizeCurrentYear, groupProgramsByObor } from './schoolPrograms';

export const WEIGHTS = { nezalezi: 0, trochu: 1, dost: 2, zasadni: 3 };

export const CRITERIA = [
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
      const weight = WEIGHTS[weightsById[c.id]] / totalWeight;
      return { criterionId: c.id, label: c.label, raw, weighted: raw * weight };
    });

    const score = breakdown.reduce((sum, b) => sum + b.weighted, 0);
    return { school, score, breakdown };
  });

  return results.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
