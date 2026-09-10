/**
 * "Risk analysis" of a student's 3 picks (feature-brainstorm.md §5). Pure
 * arithmetic, same rule as lib/matching.js — no model ever produces a number
 * here.
 *
 * Uses the per-OBOR cutoff (school_programs.cutoff) when a pick names an
 * obor, not schools.admission_cutoff — that column is a 3-year average ACROSS
 * every obor a school offers, so comparing a student's points against it
 * would be wrong for any school with a mixed obor portfolio. See plan 006
 * §1.4.
 */

import { groupProgramsByObor } from './schoolPrograms';

export const BANDS = {
  jistota: { label: 'Jistota', tone: 'ok' },
  realna: { label: 'Reálná šance', tone: 'accent' },
  risk: { label: 'Risk', tone: 'danger' },
};

/**
 * @returns {{ cutoff: number|null, source: 'obor'|'skola', year: number|null }}
 */
export function cutoffForPick(pick, school) {
  if (pick.obor_kkov || pick.obor_nazev) {
    const entries = groupProgramsByObor(school);
    const match = entries.find(
      (e) => (pick.obor_kkov && e.kkov === pick.obor_kkov) || (pick.obor_nazev && e.oborNazev === pick.obor_nazev)
    );
    if (match && match.latest.cutoff != null) {
      return { cutoff: match.latest.cutoff, source: 'obor', year: match.latestYear };
    }
  }
  return { cutoff: school.admission_cutoff ?? null, source: 'skola', year: null };
}

/**
 * @param {number|null} studentPoints
 * @param {number|null} cutoff
 * @returns {string|null} a BANDS key, or null when there isn't enough
 *   information for a verdict — the caller must render "hranice neznámá" or
 *   "zadej svoje body", never guess.
 */
export function bandFor({ studentPoints, cutoff }) {
  if (cutoff == null || studentPoints == null) return null;
  if (studentPoints >= cutoff + 10) return 'jistota';
  if (studentPoints >= cutoff - 5) return 'realna';
  return 'risk';
}

/**
 * @param {Array} picks — [{ priority, obor_kkov, obor_nazev, school }]
 * @param {number|null} studentPoints
 */
export function analyseSet(picks, studentPoints) {
  if (picks.length < 3) {
    return { counts: { jistota: 0, realna: 0, risk: 0 }, verdict: 'neuplne', bands: [] };
  }
  if (studentPoints == null) {
    return { counts: { jistota: 0, realna: 0, risk: 0 }, verdict: 'bezBodu', bands: [] };
  }

  const bands = picks.map((pick) => {
    const { cutoff, source, year } = cutoffForPick(pick, pick.school);
    return { pick, cutoff, source, year, band: bandFor({ studentPoints, cutoff }) };
  });

  const counts = { jistota: 0, realna: 0, risk: 0 };
  for (const b of bands) {
    if (b.band) counts[b.band] += 1;
  }

  const known = bands.filter((b) => b.band).length;
  let verdict = 'vyvazene';
  if (known === 0) {
    verdict = 'bezBodu';
  } else if (counts.risk === known) {
    verdict = 'vseRisk';
  } else if (counts.jistota === known) {
    verdict = 'vseJistota';
  } else if (counts.jistota === 0) {
    verdict = 'bezJistoty';
  }

  return { counts, verdict, bands };
}

export const VERDICT_COPY = {
  vyvazene: 'Tohle je dobře rozložené.',
  vseRisk: 'Všechny tři jsou risk — zvaž přidat školu, kam se dostaneš jistě.',
  vseJistota: 'Máš jistotu, ale možná míříš níž, než bys mohl.',
  bezJistoty: 'Chybí ti záložní škola, kam se dostaneš skoro jistě.',
  neuplne: 'Zatím nemáš vybrané všechny 3 školy.',
  bezBodu: 'Zadej svoje body a spočítáme rozbor.',
};
