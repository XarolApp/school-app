/**
 * Builds the row model the comparison table renders — one function shared by
 * the desktop and mobile layouts (frontend/src/pages/Porovnani.jsx) so the
 * two can never disagree about what a row means or how "best in row" is
 * decided.
 *
 * Every row is { id, label, values: [{ text, isBest }], info? }. `values`
 * has exactly one entry per compared school, in the same order. A value with
 * no data is `{ text: '—', isBest: false }` — an explicit dash, never a
 * blank cell (see the mobbin-core-product-patterns skill §C: "absence must
 * be drawn, not omitted").
 */

import { summarizeCurrentYear, groupProgramsByObor } from './schoolPrograms';

const numCz = (v, digits = 1) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: digits }));

function bestIndex(values, { lowerIsBetter = false } = {}) {
  let bestI = -1;
  let bestV = null;
  values.forEach((v, i) => {
    if (v == null) return;
    if (bestV == null || (lowerIsBetter ? v < bestV : v > bestV)) {
      bestV = v;
      bestI = i;
    }
  });
  // Only mark a "best" when the schools actually differ — otherwise every
  // identical cell would light up as a false winner.
  const distinct = new Set(values.filter((v) => v != null)).size;
  return distinct > 1 ? bestI : -1;
}

function row(id, label, values, formatted, bestI, info) {
  return {
    id,
    label,
    info,
    values: values.map((v, i) => ({
      text: v == null ? '—' : formatted[i],
      isBest: i === bestI,
    })),
  };
}

export function buildComparisonRows(schools) {
  const summaries = schools.map((s) => summarizeCurrentYear(groupProgramsByObor(s)));

  const cutoffs = schools.map((s) => s.admission_cutoff ?? null);
  const rates = schools.map((s) => s.acceptance_rate ?? null);
  const ratios = summaries.map((sum) => sum.ratio);
  const kapacity = summaries.map((sum) => sum.kapacita);

  const admissionsSection = {
    id: 'prijimacky',
    title: 'Přijímačky',
    rows: [
      row(
        'hranice',
        'Hranice přijetí',
        cutoffs,
        cutoffs.map((v) => `${numCz(v)} b.`),
        bestIndex(cutoffs, { lowerIsBetter: true }),
        'Průměr z posledních 3 let, přes všechny obory školy.'
      ),
      row(
        'prijato',
        'Přijato z přihlášených',
        rates,
        rates.map((v) => `${numCz(v)} %`),
        bestIndex(rates)
      ),
      row('naMisto', 'Uchazečů na místo', ratios, ratios.map((v) => `${numCz(v)}×`), bestIndex(ratios, { lowerIsBetter: true })),
      row('mist', `Míst v roce ${summaries.find((s) => s.year)?.year ?? ''}`, kapacity, kapacity.map((v) => `${v}`), bestIndex(kapacity)),
    ],
  };

  const skolaSection = {
    id: 'skola',
    title: 'Škola',
    rows: [
      {
        id: 'typ',
        label: 'Typ',
        values: schools.map((s) => ({
          text: [...new Set((s.school_programs || []).map((p) => p.typ_skoly).filter(Boolean))].join(', ') || '—',
          isBest: false,
        })),
      },
      {
        id: 'zrizovatel',
        label: 'Zřizovatel',
        values: schools.map((s) => ({ text: s.zrizovatel || '—', isBest: false })),
      },
      {
        id: 'ukonceni',
        label: 'Ukončení',
        values: schools.map((s) => {
          const programs = s.school_programs || [];
          const hasMaturita = programs.some((p) => p.maturitni === true);
          const hasVyucni = programs.some((p) => p.maturitni === false);
          const text = hasMaturita && hasVyucni ? 'Maturita i výuční list' : hasMaturita ? 'Maturita' : hasVyucni ? 'Výuční list' : '—';
          return { text, isBest: false };
        }),
      },
      {
        id: 'jazyky',
        label: 'Jazyky výuky',
        values: schools.map((s) => {
          const jazyky = [...new Set((s.school_programs || []).map((p) => p.jazyk_studia).filter(Boolean))];
          return { text: jazyky.length ? jazyky.join(', ') : '—', isBest: false };
        }),
      },
      {
        id: 'oboru',
        label: 'Počet oborů',
        values: schools.map((s) => {
          const count = groupProgramsByObor(s).filter((e) => !e.isDiscontinued).length;
          return { text: count ? String(count) : '—', isBest: false };
        }),
      },
      {
        id: 'skolne',
        label: 'Školné',
        values: schools.map((s) => {
          const zrizovatel = (s.zrizovatel || '').toLowerCase();
          if (!zrizovatel) return { text: '—', isBest: false };
          const isPublic = !zrizovatel.includes('soukrom') && !zrizovatel.includes('církev');
          return { text: isPublic ? 'Bez školného' : 'Placená škola', isBest: false };
        }),
      },
    ],
  };

  const missingSection = {
    id: 'doplnujeme',
    title: 'Zatím doplňujeme',
    subtitle: 'na těchto údajích pracujeme',
    rows: ['Dojezd MHD', 'Úspěšnost u maturity', 'Kam míří absolventi', 'Obědy a ubytování'].map((label, i) => ({
      id: `missing-${i}`,
      label,
      values: schools.map(() => ({ text: '— pracujeme na tom', isBest: false, isMuted: true })),
    })),
  };

  return [admissionsSection, skolaSection, missingSection];
}
