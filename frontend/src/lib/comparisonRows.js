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

import { summarizeCurrentYear, groupProgramsByObor, latestProgramValue, summarizeAdmission, formatCutoffRange } from './schoolPrograms';
import { formatClubCategories, formatTeachingStyles } from './schoolDetailTagLabels';

export const numCz = (v, digits = 1) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: digits }));
const TWO_SCHOOL_TAGS = {
  'nejnižší': 'nižší',
  'nejvyšší': 'vyšší',
  'nejméně': 'méně',
  'nejvíc': 'víc',
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

  return [
    admissionsSection,
    skolaSection,
    ...(schoolLifeRows.length ? [{ id: 'zivot', title: 'Život ve škole', rows: schoolLifeRows }] : []),
  ];
}
