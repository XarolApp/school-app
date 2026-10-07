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

import { summarizeCurrentYear, groupProgramsByObor, latestProgramValue, summarizeAdmission, formatCutoffRange } from './schoolPrograms';

export const numCz = (v, digits = 1) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: digits }));

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

// `extremeTag` names the extreme factually ("nejnižší", "nejvíc"), never
// "nejlepší": a lower hranice means easier to get in, not a better school.
function row(id, label, values, formatted, bestI, info, extremeTag = null) {
  return {
    id,
    label,
    info,
    values: values.map((v, i) => ({
      text: v == null ? 'bez dat' : formatted[i],
      isBest: i === bestI,
      tag: i === bestI ? extremeTag : null,
    })),
  };
}

export function buildComparisonRows(schools) {
  const summaries = schools.map((s) => summarizeCurrentYear(groupProgramsByObor(s)));

  const adms = schools.map((s) => summarizeAdmission(s));
  const oldTag = (a) => (a?.isOld ? ` (${a.year})` : '');
  // "Best" compares the easiest obor, the one a student could realistically reach.
  const cutoffs = adms.map((a) => a?.cutoffMin ?? null);
  const rates = adms.map((a) => a?.acceptance ?? null);
  const admYear = adms.find((a) => a && !a.isOld)?.year ?? adms.find(Boolean)?.year ?? '';
  const ratios = summaries.map((sum) => sum.ratio);
  const kapacity = summaries.map((sum) => sum.kapacita);

  const admissionsSection = {
    id: 'prijimacky',
    title: 'Přijímačky',
    rows: [
      row(
        'hranice',
        `Hranice přijetí ${admYear}`,
        cutoffs,
        adms.map((a) => `${formatCutoffRange(a)}${oldTag(a)}`),
        bestIndex(cutoffs, { lowerIsBetter: true }),
        'Rozpětí od oboru s nejnižší po obor s nejvyšší hranicí. Starší roky najdeš v grafu v detailu školy. Rok v závorce znamená starší data.',
        'nejnižší'
      ),
      row(
        'prijato',
        `Přijato z přihlášených ${admYear}`,
        rates,
        rates.map((v, i) => `${numCz(v)} %${oldTag(adms[i])}`),
        bestIndex(rates),
        undefined,
        'nejvyšší'
      ),
      row('naMisto', 'Uchazečů na místo', ratios, ratios.map((v) => `${numCz(v)}×`), bestIndex(ratios, { lowerIsBetter: true }), undefined, 'nejméně'),
      row('mist', `Míst v roce ${summaries.find((s) => s.year)?.year ?? ''}`, kapacity, kapacity.map((v) => `${v}`), bestIndex(kapacity), undefined, 'nejvíc'),
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
        values: schools.map((s) => ({ text: latestProgramValue(s, 'zrizovatel') || '—', isBest: false })),
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
          const zrizovatel = (latestProgramValue(s, 'zrizovatel') || '').toLowerCase();
          if (!zrizovatel) return { text: '—', isBest: false };
          // Church schools: tuition varies and is mostly zero — founder decision
          // 2026-10-07 is a neutral label until the extracted data is reviewed
          // (UNFORGET "Church schools: tuition").
          if (zrizovatel.includes('církev')) return { text: 'Zjistit u školy', isBest: false };
          const isPublic = !zrizovatel.includes('soukrom');
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
