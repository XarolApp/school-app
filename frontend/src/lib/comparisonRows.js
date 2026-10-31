/**
 * Builds the row model the comparison table renders — one function shared by
 * the desktop and mobile layouts (frontend/src/pages/Porovnani.jsx) so the
 * two can never disagree about what a row means or how "best in row" is
 * decided.
 *
 * Every row is { id, label, values: [{ text, isBest }], info? }. `values`
 * has exactly one entry per compared school, in the same order. Missing
 * Cermat values say "bez dat"; missing extracted school-life values say
 * "neuvedeno" and are muted.
 */

import { summarizeCurrentYear, groupProgramsByObor, latestProgramValue, summarizeAdmission, formatCutoffRange, schoolHistory } from './schoolPrograms';
import { formatClubCategories, formatTeachingStyles } from './schoolDetailTagLabels';

export const numCz = (v, digits = 1) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: digits }));
const TWO_SCHOOL_TAGS = {
  'nejnižší': 'nižší',
  'nejvyšší': 'vyšší',
  'nejméně': 'méně',
  'nejvíc': 'víc',
  'nejkratší': 'kratší',
};

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
function row(id, label, values, formatted, bestI, info, extremeTag, schoolCount) {
  const tag = schoolCount === 2 ? TWO_SCHOOL_TAGS[extremeTag] : extremeTag;
  return {
    id,
    label,
    info,
    values: values.map((v, i) => ({
      text: v == null ? 'bez dat' : formatted[i],
      isBest: i === bestI,
      tag: i === bestI ? tag : null,
    })),
  };
}

function extractedOf(school) {
  const extracted = school.school_extracted_details;
  return Array.isArray(extracted) ? extracted[0] : extracted;
}

function detailRow(id, label, values) {
  if (!values.some((value) => value != null)) return null;
  return {
    id,
    label,
    values: values.map((text) => ({
      text: text ?? 'neuvedeno',
      isBest: false,
      isMuted: text == null,
    })),
  };
}

function yesNo(value) {
  return value === true ? 'Ano' : value === false ? 'Ne' : null;
}

const HISTORY_YEARS = 3;

// "Vývoj": the same admission numbers for the last three years the compared
// schools have data for, one row per year (newest first), plus the change of
// the lowest cutoff since each school's oldest year in that window. A school
// with no row for a year says "bez dat" — never a zero or a guess.
function historySection(schools) {
  const histories = schools.map((s) => schoolHistory(groupProgramsByObor(s)));
  const years = [...new Set(histories.flatMap((h) => h.map((p) => p.year)))].sort((a, b) => b - a).slice(0, HISTORY_YEARS);
  if (years.length < 2) return null;

  const at = (h, year) => h.find((p) => p.year === year);
  const range = (p) => formatCutoffRange({ cutoffMin: p.cutoffMin, cutoffMax: p.cutoffMax });
  const yearRows = years.map((year) => ({
    id: `historie-${year}`,
    label: `Hranice v roce ${year}`,
    values: histories.map((h) => {
      const p = at(h, year);
      const text = p && range(p);
      if (!text) return { text: 'bez dat', isBest: false, isMuted: true };
      const sub = [p.acceptance != null ? `přijato ${numCz(p.acceptance)} %` : null, p.prihlasky != null && p.kapacita > 0 ? `${numCz(p.prihlasky / p.kapacita)}× na místo` : null].filter(Boolean).join(' · ');
      return { text, sub, isBest: false };
    }),
  }));

  const oldest = years.at(-1);
  const trend = histories.map((h) => {
    const first = h.filter((p) => p.cutoffMin != null && p.year >= oldest)[0];
    const last = h.filter((p) => p.cutoffMin != null && p.year >= oldest).at(-1);
    if (!first || !last || first.year === last.year) return null;
    return { delta: last.cutoffMin - first.cutoffMin, from: first.year };
  });
  const trendRow = {
    id: 'historie-trend',
    label: 'Změna nejnižší hranice',
    info: `Rozdíl nejnižší hranice mezi nejstarším a nejnovějším rokem, který pro školu máme (od ${oldest}). Kladné číslo = škola je teď náročnější na vstup, záporné = lehčí. Hranice se mění i podle ročníku, ne jen podle školy.`,
    values: trend.map((t) => (t
      ? { text: `${t.delta > 0 ? '+' : t.delta < 0 ? '−' : ''}${numCz(Math.abs(t.delta))} b.`, sub: `od ${t.from}`, isBest: false }
      : { text: 'bez dat', isBest: false, isMuted: true })),
  };
  return { id: 'vyvoj', title: 'Vývoj přijímaček', subtitle: `poslední ${years.length} roky`, rows: [...yearRows, trendRow] };
}

// "Cesta MHD" from the chosen stop: the shortest ride is marked, a school over
// 90 minutes counts as the longest, and a school the matrix has no value for
// says "bez dat" - never a guess.
function commuteRow(schools, commute) {
  const values = schools.map((s) => {
    const m = commute.minutes?.[s.id];
    return m === undefined ? null : m == null ? 91 : m;
  });
  const built = row(
    'dojezd',
    'Cesta MHD ze zastávky',
    values,
    values.map((v) => (v > 90 ? 'přes 90 min' : `cca ${v} min`)),
    bestIndex(values, { lowerIsBetter: true }),
    'Odhad podle jízdních řádů PID v ranní špičce, včetně přestupů. Skutečná cesta se může lišit.',
    'nejkratší',
    schools.length
  );
  // The page renders the stop name as a button that opens the stop chooser.
  return { ...built, labelStop: commute.stopName };
}

/** `commute`: { stopName, minutes } for the remembered stop, or omitted. */
export function buildComparisonRows(schools, commute = null) {
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
        'nejnižší',
        schools.length
      ),
      row(
        'prijato',
        `Přijato z přihlášených ${admYear}`,
        rates,
        rates.map((v, i) => `${numCz(v)} %${oldTag(adms[i])}`),
        bestIndex(rates),
        undefined,
        'nejvyšší',
        schools.length
      ),
      row('naMisto', 'Uchazečů na místo', ratios, ratios.map((v) => `${numCz(v)}×`), bestIndex(ratios, { lowerIsBetter: true }), undefined, 'nejméně', schools.length),
      row('mist', `Míst v roce ${summaries.find((s) => s.year)?.year ?? ''}`, kapacity, kapacity.map((v) => `${v}`), bestIndex(kapacity), undefined, 'nejvíc', schools.length),
    ],
  };

  const skolaSection = {
    id: 'skola',
    title: 'Škola',
    rows: [
      ...(commute?.minutes ? [commuteRow(schools, commute)] : []),
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
          const hasNematurita = programs.some((p) => p.maturitni === false);
          const text = hasMaturita && hasNematurita ? 'Maturitní i nematuritní obory' : hasMaturita ? 'Maturita' : hasNematurita ? 'Bez maturity' : '—';
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
    ],
  };

  const extracted = schools.map(extractedOf);
  const tuition = schools.map((school, i) => {
    const zrizovatel = (latestProgramValue(school, 'zrizovatel') || '').toLocaleLowerCase('cs-CZ');
    if (zrizovatel.includes('církev')) return 'Zjistit u školy';
    if (zrizovatel && !zrizovatel.includes('soukrom')) return '0 Kč';
    const amount = extracted[i]?.tuition_czk_per_year;
    return amount == null ? null : `${numCz(amount, 0)} Kč`;
  });
  const maturita = extracted.map((value) => (
    value?.maturita_pass_rate_pct == null ? null : `${numCz(value.maturita_pass_rate_pct)} %`
  ));
  const clubs = extracted.map((value) => formatClubCategories(value?.krouzky_kategorie));
  const teachingStyles = extracted.map((value) => formatTeachingStyles(value?.vyukovy_styl_tagy));
  const schoolLifeRows = [
    detailRow('maturita', 'Úspěšnost u maturity', maturita),
    detailRow('skolne', 'Školné za rok', tuition),
    detailRow('obedy', 'Obědy', extracted.map((value) => yesNo(value?.ma_jidelnu))),
    detailRow('krouzky', 'Kroužky', clubs),
    detailRow('stylVyuky', 'Styl výuky', teachingStyles),
    detailRow('zacatek', 'Začátek vyučování', extracted.map((value) => (
      value?.zacatek_hodin == null ? null : `${value.zacatek_hodin}:00`
    ))),
    detailRow('pozadavky', 'Talentovky / další požadavky', extracted.map((value) => yesNo(value?.ma_dodatecne_pozadavky))),
    ...(extracted.some((value) => value?.alternativni_pedagogika === true)
      ? [detailRow('alternativniPedagogika', 'Alternativní pedagogika', extracted.map((value) => yesNo(value?.alternativni_pedagogika)))]
      : []),
  ].filter(Boolean);

  const vyvoj = historySection(schools);
  return [
    admissionsSection,
    ...(vyvoj ? [vyvoj] : []),
    skolaSection,
    ...(schoolLifeRows.length ? [{ id: 'zivot', title: 'Život ve škole', rows: schoolLifeRows }] : []),
  ];
}
