/**
 * "Risk analysis" of a student's 3 picks (feature-brainstorm.md §5). Pure
 * arithmetic, same rule as lib/matching.js — no model ever produces a number
 * here.
 *
 * Always the per-OBOR cutoff (school_programs.cutoff). A school with one obor
 * uses it without asking; a school with several needs the obor picked,
 * because no single school-wide number is honest (see plan 006 §1.4). Until
 * then the pick shows the newest year's range and gets no verdict.
 */

import { groupProgramsByObor, summarizeAdmission, formatCutoffRange } from './schoolPrograms';

export const BANDS = {
  jistota: { label: 'Jistota', tone: 'ok' },
  realna: { label: 'Reálná šance', tone: 'accent' },
  risk: { label: 'Risk', tone: 'danger' },
};

/**
 * @returns {{ cutoff: number|null, source: 'obor'|'skola', year: number|null,
 *   range?: string|null, needsObor?: boolean }}
 */
export function cutoffForPick(pick, school) {
  const entries = groupProgramsByObor(school);
  if (pick.obor_kkov || pick.obor_nazev) {
    const match = entries.find(
      // Different programs can share a name (e.g. four- and six-year
      // Gymnázium). A matching name must not override a different KKOV.
      (e) => (!pick.obor_kkov || e.kkov === pick.obor_kkov)
        && (!pick.obor_nazev || e.oborNazev === pick.obor_nazev)
    );
    if (match && match.latest.cutoff != null) {
      return { cutoff: match.latest.cutoff, source: 'obor', year: match.latestYear };
    }
  }
  const current = entries.filter((e) => !e.isDiscontinued);
  if (!pick.obor_kkov && !pick.obor_nazev && current.length === 1 && current[0].latest.cutoff != null) {
    return { cutoff: current[0].latest.cutoff, source: 'obor', year: current[0].latestYear };
  }
  const adm = summarizeAdmission(school);
  return {
    cutoff: null,
    source: 'skola',
    year: adm?.year ?? null,
    range: formatCutoffRange(adm),
    needsObor: !pick.obor_kkov && !pick.obor_nazev && current.length > 1,
  };
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
    const { cutoff, source, year, needsObor } = cutoffForPick(pick, pick.school);
    return { pick, cutoff, source, year, needsObor, band: bandFor({ studentPoints, cutoff }) };
  });

  const counts = { jistota: 0, realna: 0, risk: 0 };
  for (const b of bands) {
    if (b.band) counts[b.band] += 1;
  }

  const known = bands.filter((b) => b.band).length;
  let verdict = 'vyvazene';
  if (known < picks.length) {
    verdict = bands.some((b) => !b.band && b.needsObor) ? 'chybiObor' : 'chybiHranice';
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
  chybiHranice: 'U některých škol chybí hranice přijetí. Rozbor všech tří zatím nemůžeme dokončit.',
  chybiObor: 'U některých škol vyber obor. Každý obor má vlastní hranici, rozbor počítáme podle oboru.',
};
