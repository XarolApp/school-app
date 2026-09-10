/**
 * Per-obor aggregation of `school.school_programs` for the school detail
 * page — the school-level admission_cutoff / acceptance_rate columns are an
 * AVERAGE across every obor a school offers, useful as a headline number but
 * useless for judging any one obor. This groups the raw rows back into one
 * card per real obor, with a real 3-year trend.
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

function aggregateYear(rows) {
  const kapacita = rows.reduce((sum, r) => sum + (r.kapacita || 0), 0) || null;
  const prihlasky = rows.reduce((sum, r) => sum + (r.prihlasky || 0), 0) || null;
  const prijati = rows.reduce((sum, r) => sum + (r.prijati || 0), 0) || null;
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
      latest.kapacita && latest.prihlasky ? Math.round((latest.prihlasky / latest.kapacita) * 10) / 10 : null;

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

/**
 * Totals across only the obory actually offered in the school's most recent
 * year — a discontinued obor's old capacity must not inflate "places this
 * year" or "applicants per place". Both null when there is nothing current.
 */
export function summarizeCurrentYear(entries) {
  const current = entries.filter((e) => !e.isDiscontinued);
  const kapacita = current.reduce((sum, e) => sum + (e.latest.kapacita || 0), 0) || null;
  const prihlasky = current.reduce((sum, e) => sum + (e.latest.prihlasky || 0), 0) || null;
  const ratio = kapacita && prihlasky ? Math.round((prihlasky / kapacita) * 10) / 10 : null;
  const year = current[0]?.latestYear ?? null;
  return { kapacita, prihlasky, ratio, year, oborCount: current.length };
}
