/**
 * Per-obor aggregation of `school.school_programs` for the school detail
 * page. This groups the raw rows back into one card per real obor, with its
 * year-by-year history (shown only in the history charts; everything else
 * shows the newest year).
 *
 * Cermat's file genuinely publishes several rows for the same
 * school+obor+year (different zaměření/capacity groups within one obor) —
 * verified against the real data, not a defensive guess — so grouping has to
 * SUM the counts and AVERAGE the cutoff across those duplicate rows, or a
 * school with two capacity groups in one obor would silently double-count.
 *
 * Not the same job as summarizePrograms() in pages/Search.jsx, which
 * flattens to school-level booleans/sets for filtering — this stays at
 * obor+year granularity and is not a drop-in replacement for it.
 */

function groupKey(row) {
  // Two rows are "the same obor" when they share a KKOV + obor name + typ
  // školy + délka + jazyk. KKOV alone is not always present (a handful of
  // rows resolve to nulls in the real data), so the rest are load-bearing,
  // not decorative.
  return [row.kkov, row.obor_nazev, row.typ_skoly, row.delka_studia, row.jazyk_studia].join('|');
}

function sumKnown(values) {
  const known = values.filter((value) => value != null);
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

/** Reads a program-level school fact from the newest year that supplies it.
 *  Fields such as `zrizovatel` do not exist on the `schools` table itself;
 *  callers must not silently read `school.zrizovatel` and treat the resulting
 *  undefined value as missing data. */
export function latestProgramValue(school, field) {
  const rows = (school.school_programs ?? []).filter(
    (row) => row[field] !== null && row[field] !== undefined && row[field] !== ''
  );
  if (!rows.length) return null;

  const latest = rows.reduce((best, row) => {
    if (!best) return row;
    return Number(row.rok ?? -Infinity) > Number(best.rok ?? -Infinity) ? row : best;
  }, null);
  return latest[field];
}

function aggregateYear(rows) {
  const kapacita = sumKnown(rows.map((r) => r.kapacita));
  const prihlasky = sumKnown(rows.map((r) => r.prihlasky));
  const prijati = sumKnown(rows.map((r) => r.prijati));
  const cutoffs = rows.map((r) => r.cutoff).filter((c) => c != null);
  const cutoff = cutoffs.length
    ? Math.round((cutoffs.reduce((s, c) => s + c, 0) / cutoffs.length) * 10) / 10
    : null;
  return { kapacita, prihlasky, prijati, cutoff };
}

/**
 * @param {object} school — a row from GET /api/schools or /api/schools/:id
 * @returns {Array} one entry per real obor, newest year first internally,
 *   sorted by 2026 (or the latest year present) přihlášky descending
 */
export function groupProgramsByObor(school) {
  const programs = school.school_programs ?? [];
  if (!programs.length) return [];

  const groups = new Map();
  for (const row of programs) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const datasetLatestYear = Math.max(...programs.map((r) => r.rok));

  const entries = [...groups.values()].map((rows) => {
    const first = rows[0];
    const byYear = new Map();
    for (const row of rows) {
      if (!byYear.has(row.rok)) byYear.set(row.rok, []);
      byYear.get(row.rok).push(row);
    }

    const years = {};
    for (const [rok, yearRows] of byYear) {
      years[rok] = aggregateYear(yearRows);
    }

    const presentYears = Object.keys(years).map(Number).sort((a, b) => b - a);
    const latestYear = presentYears[0];
    const latest = years[latestYear];

    const ratio =
      latest.kapacita > 0 && latest.prihlasky != null ? Math.round((latest.prihlasky / latest.kapacita) * 10) / 10 : null;

    // An obor that ran in an earlier year but is absent from the newest year
    // in the dataset — the real case is a nástavba offered in 2024 and not
    // since. Absence, not a zero.
    const isDiscontinued = latestYear < datasetLatestYear;

    const trend = buildTrend(years, presentYears);

    return {
      kkov: first.kkov,
      oborNazev: first.obor_nazev,
      typSkoly: first.typ_skoly,
      zrizovatel: first.zrizovatel,
      delkaStudia: first.delka_studia,
      jazykStudia: first.jazyk_studia,
      maturitni: first.maturitni,
      jpzPovinna: first.jpz_povinna,
      years,
      latestYear,
      latest,
      ratio,
      isDiscontinued,
      trend,
    };
  });

  entries.sort((a, b) => (b.latest.prihlasky || 0) - (a.latest.prihlasky || 0));
  return entries;
}

/**
 * A plain-Czech sentence describing how přihlášky/cutoff moved from the
 * oldest to the newest year present — never claimed with fewer than 2 years.
 */
function buildTrend(years, presentYearsDesc) {
  if (presentYearsDesc.length < 2) return null;

  const newest = years[presentYearsDesc[0]];
  const oldest = years[presentYearsDesc[presentYearsDesc.length - 1]];
  if (!newest.prihlasky || !oldest.prihlasky) return null;

  const delta = newest.prihlasky - oldest.prihlasky;
  const pct = Math.round((delta / oldest.prihlasky) * 100);

  let note;
  if (Math.abs(pct) < 10) {
    note = 'Zájem je poslední roky zhruba stejný.';
  } else if (delta < 0) {
    note =
      newest.cutoff != null && oldest.cutoff != null && newest.cutoff < oldest.cutoff
        ? 'Zájem klesá a s ním i hranice — dostat se sem je rok od roku snazší.'
        : 'Zájem o obor v posledních letech klesá.';
  } else {
    note =
      newest.cutoff != null && oldest.cutoff != null && newest.cutoff > oldest.cutoff
        ? 'Zájem roste a s ním i hranice — dostat se sem je rok od roku těžší.'
        : 'Zájem o obor v posledních letech roste.';
  }

  return { direction: delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat', note };
}

/** The newest Cermat year imported. Bump after each yearly import; a school
 *  whose newest rows are older than this is shown as "starší data". */
export const CURRENT_ADMISSION_YEAR = 2026;

const numCz = (v) => String(v).replace('.', ',');

/**
 * School-level admission numbers for ONE year: the school's newest year in
 * `school_programs`. Never averaged across years, and the cutoff is a range
 * over the school's obory, never their average. Works on both the slimmed
 * list shape (one row per obor, newest year only) and the full detail shape.
 *
 * @returns {null | { year, isOld, cutoffMin, cutoffMax, acceptance, prihlasky, prijati }}
 */
export function summarizeAdmission(school) {
  const rows = (school?.school_programs ?? []).filter((r) => Number.isFinite(r.rok));
  if (!rows.length) return null;
  const year = Math.max(...rows.map((r) => r.rok));

  const groups = new Map();
  for (const row of rows) {
    if (row.rok !== year) continue;
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const obory = [...groups.values()].map(aggregateYear);

  const cutoffs = obory.map((o) => o.cutoff).filter((c) => c != null);
  // A rate only from obory that report both counts, so a missing prijati
  // cannot read as "nobody admitted".
  const counted = obory.filter((o) => o.prihlasky > 0 && o.prijati != null);
  const prihlasky = counted.reduce((s, o) => s + o.prihlasky, 0);
  const prijati = counted.reduce((s, o) => s + o.prijati, 0);

  return {
    year,
    isOld: year < CURRENT_ADMISSION_YEAR,
    cutoffMin: cutoffs.length ? Math.min(...cutoffs) : null,
    cutoffMax: cutoffs.length ? Math.max(...cutoffs) : null,
    acceptance: prihlasky > 0 ? Math.round((prijati / prihlasky) * 1000) / 10 : null,
    prihlasky: counted.length ? prihlasky : null,
    prijati: counted.length ? prijati : null,
  };
}

/** "26–35 b.", "35 b." for a one-obor school, or null. */
export function formatCutoffRange(adm) {
  if (adm?.cutoffMin == null) return null;
  return adm.cutoffMin === adm.cutoffMax
    ? `${numCz(adm.cutoffMin)} b.`
    : `${numCz(adm.cutoffMin)}–${numCz(adm.cutoffMax)} b.`;
}

/** "2026", or "starší data, 2025" when the school has nothing newer. */
export function admissionYearLabel(adm) {
  if (!adm) return '';
  return adm.isOld ? `starší data, ${adm.year}` : String(adm.year);
}

/**
 * One point per year for the history charts. `cutoffMin`/`cutoffMax` span
 * the obory that year (a school-level range, never averaged); for a single
 * obor they are equal. Years with no rows are left out, not zero-filled.
 */
export function yearlyHistory(rowsOrEntry) {
  const perYear = Array.isArray(rowsOrEntry)
    ? rowsOrEntry
    : Object.entries(rowsOrEntry.years).map(([rok, y]) => ({ rok: Number(rok), obory: [y] }));
  return perYear
    .map(({ rok, obory }) => {
      const cutoffs = obory.map((o) => o.cutoff).filter((c) => c != null);
      const counted = obory.filter((o) => o.prihlasky > 0 && o.prijati != null);
      const prihlasky = counted.reduce((s, o) => s + o.prihlasky, 0);
      const prijati = counted.reduce((s, o) => s + o.prijati, 0);
      return {
        year: rok,
        cutoffMin: cutoffs.length ? Math.min(...cutoffs) : null,
        cutoffMax: cutoffs.length ? Math.max(...cutoffs) : null,
        prihlasky: sumKnown(obory.map((o) => o.prihlasky)),
        kapacita: sumKnown(obory.map((o) => o.kapacita)),
        acceptance: prihlasky > 0 ? Math.round((prijati / prihlasky) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => a.year - b.year);
}

/** School-wide history: every obor's per-year numbers, grouped by year. */
export function schoolHistory(entries) {
  const byYear = new Map();
  for (const e of entries) {
    for (const [rok, y] of Object.entries(e.years)) {
      if (!byYear.has(rok)) byYear.set(rok, []);
      byYear.get(rok).push(y);
    }
  }
  return yearlyHistory([...byYear].map(([rok, obory]) => ({ rok: Number(rok), obory })));
}

/**
 * Totals across only the obory actually offered in the school's most recent
 * year — a discontinued obor's old capacity must not inflate "places this
 * year" or "applicants per place". Both null when there is nothing current.
 */
export function summarizeCurrentYear(entries) {
  const current = entries.filter((e) => !e.isDiscontinued);
  const kapacita = sumKnown(current.map((e) => e.latest.kapacita));
  const prihlasky = sumKnown(current.map((e) => e.latest.prihlasky));
  const ratio = kapacita > 0 && prihlasky != null ? Math.round((prihlasky / kapacita) * 10) / 10 : null;
  const year = current[0]?.latestYear ?? null;
  return { kapacita, prihlasky, ratio, year, oborCount: current.length };
}
