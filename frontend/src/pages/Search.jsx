import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { fetchSchools, fetchFavorites } from '../api';
import FilterSelect from '../components/FilterSelect';
import Pagination from '../components/Pagination';
import FavoriteButton from '../components/FavoriteButton';
import MatchScore from '../components/MatchScore';
import {
  baseProgram,
  buildIndex,
  collectFacet,
  compareByCount,
  compareDistricts,
  districtOf,
  prepareQuery,
  scoreSchool,
  splitPrograms,
} from '../lib/schoolSearch';

// One page of results. Not derived from anything — how many pages exist is
// computed from the number of matches, so scraping another city adds pages by
// itself with nothing to change here.
const PAGE_SIZE = 20;

// The one explicit ordering — "Podle názvu" below is the built-in empty-value
// fallback FilterSelect always adds. Kept as its own value rather than a
// boolean so a second sort (by district, say) is one entry rather than a
// rewrite. It opens selected by default when a run exists; see the effect
// that sets `razeni=shoda` on first load, below `canSortByMatch`.
const SORT_OPTIONS = [{ value: 'shoda', label: 'Podle shody', count: null }];

// Czech has three plural forms: 1, 2–4, and 0 or 5+. The verb agrees too.
function formatResultCount(count) {
  if (count === 1) return { verb: 'Nalezena', noun: 'škola' };
  if (count >= 2 && count <= 4) return { verb: 'Nalezeny', noun: 'školy' };
  return { verb: 'Nalezeno', noun: 'škol' };
}

function SchoolCardSkeleton() {
  return (
    <li className="skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-line-title" />
      <div className="skeleton-line skeleton-line-short" />
      <div className="skeleton-line" />
    </li>
  );
}

function SearchIcon() {
  return (
    <svg
      className="search-bar-icon"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M13.5 13.5 17 17" />
    </svg>
  );
}

function Search() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  // Guards the auto-default below so it fires once per page load, not once per
  // render — otherwise picking "Podle názvu" back off would bounce straight
  // back to "Podle shody" the instant the param was removed from the URL.
  const didDefaultSort = useRef(false);

  // The search lives in the URL rather than in useState. Without it, opening a
  // school from page 3 and pressing Back drops you on page 1 of an empty
  // search — and a filtered result set stops being something you can send to
  // a parent as a link.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const district = searchParams.get('cast') ?? '';
  const program = searchParams.get('obor') ?? '';
  const sort = searchParams.get('razeni') ?? '';
  const requestedPage = Math.max(1, Number(searchParams.get('strana')) || 1);

  /**
   * Any change to the search resets to page one — staying on page 4 of a
   * result set that just shrank to 12 schools would show an empty list.
   * Only page changes go into history; typing would otherwise bury the back
   * button under one entry per keystroke.
   */
  const updateSearch = (changes, { pushHistory = false } = {}) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!('strana' in changes)) next.delete('strana');
        return next;
      },
      { replace: !pushHistory }
    );
  };

  useEffect(() => {
    setLoading(true);
    fetchSchools()
      .then(setSchools)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // A separate, non-fatal fetch: failing to load favorites should not stop
    // the search results themselves from rendering, so it degrades to
    // "nothing starred" rather than an error screen.
    fetchFavorites()
      .then((favorites) => setFavoriteIds(new Set(favorites.map((s) => s.id))))
      .catch(() => {});
  }, []);

  const setFavorite = (schoolId, next) => {
    setFavoriteIds((current) => {
      const updated = new Set(current);
      if (next) updated.add(schoolId);
      else updated.delete(schoolId);
      return updated;
    });
  };

  // Tokenising 60 schools on every keystroke is wasted work — the schools only
  // change once, when they load.
  const index = useMemo(() => buildIndex(schools), [schools]);

  const districtOptions = useMemo(
    () =>
      collectFacet(
        schools,
        (school) => [districtOf(school)],
        compareDistricts
      ),
    [schools]
  );

  const programOptions = useMemo(
    () =>
      collectFacet(
        schools,
        (school) => splitPrograms(school.programs).map(baseProgram),
        compareByCount
      ),
    [schools]
  );

  const results = useMemo(() => {
    const prepared = prepareQuery(query);
    const hasQuery = prepared.tokens.length > 0;

    const matched = [];

    for (const entry of index) {
      const { school } = entry;

      if (district && districtOf(school) !== district) continue;

      if (program) {
        const programs = splitPrograms(school.programs).map(baseProgram);
        if (!programs.includes(program)) continue;
      }

      if (!hasQuery) {
        matched.push({ school, score: 0 });
        continue;
      }

      const score = scoreSchool(entry, prepared);
      if (score > 0) matched.push({ school, score });
    }

    // Without a query there is no meaningful ranking, so the database order is
    // left alone rather than shuffled by an arbitrary tie-break.
    if (hasQuery) matched.sort((a, b) => b.score - a.score);

    // Wins over relevance whenever it applies — either the student typed
    // "gymnázium" and then said how to order what is left, or they never
    // touched the control and it opened this way on its own (see the
    // default-sort effect below). Sorting after the relevance pass keeps
    // relevance as the tie-break either way, and a school with no score
    // (never happens once one exists, but a stale ?razeni= in a shared link
    // can arrive before any run) sinks instead of jumping to the top on
    // `undefined`.
    if (sort === 'shoda') {
      matched.sort(
        (a, b) => (b.school.match_score ?? -1) - (a.school.match_score ?? -1)
      );
    }

    return matched.map((item) => item.school);
  }, [index, query, district, program, sort]);

  // Same absence rule as the badge itself: no questionnaire run means no
  // percentages to order by, so the control is not offered at all.
  const canSortByMatch = useMemo(
    () => schools.some((school) => school.match_score != null),
    [schools]
  );

  // Opens sorted by match whenever the account has a run and the URL did not
  // already say otherwise — a shared or revisited `?razeni=…` link is always
  // honoured as-is. `schools` starts empty while loading, so this only fires
  // once `canSortByMatch` has a real answer, and the ref stops it firing again
  // after that — including after the visitor picks "Podle názvu" back off,
  // which removes the param and would otherwise look identical to "never set".
  useEffect(() => {
    if (didDefaultSort.current || !canSortByMatch) return;
    didDefaultSort.current = true;
    if (!searchParams.get('razeni')) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('razeni', 'shoda');
          return next;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSortByMatch]);

  const hasFilters = query !== '' || district !== '' || program !== '';

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  // A hand-edited or stale "?strana=9" must not render an empty page.
  const page = Math.min(requestedPage, pageCount);
  const firstOnPage = (page - 1) * PAGE_SIZE;
  const pageResults = results.slice(firstOnPage, firstOnPage + PAGE_SIZE);

  // Ordering is not a filter — clearing the search should widen the list, not
  // quietly reshuffle what is already on screen.
  const clearFilters = () =>
    setSearchParams(sort ? { razeni: sort } : {}, { replace: true });

  /**
   * Every page change starts at the top.
   *
   * Reacting to the page number rather than scrolling inside the click
   * handler, because that raced the re-render: the scroll began against the
   * old list and was cut short as React swapped twenty cards out underneath
   * it, so some transitions landed at the top and others did not depending on
   * how the layout happened to shift. Here the DOM already holds the new page
   * before anything moves, which makes every transition behave the same — and
   * keeps behaving the same when scraping another city adds more pages.
   *
   * Jumps rather than animating. A page change replaces the whole list, so
   * there is no continuity for a smooth scroll to express, and an animation
   * long enough to cross a full page is also long enough for a stray wheel
   * nudge to interrupt it — which is the bug this replaced.
   *
   * Skipped on mount, so arriving back from a school detail keeps whatever
   * position it was restored to instead of being yanked upward.
   */
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [page]);

  const goToPage = (next) =>
    updateSearch({ strana: next > 1 ? String(next) : '' }, { pushHistory: true });

  return (
    <div className="page page-search">
      <div className="page-header">
        <p className="eyebrow">Databáze škol</p>
        <h1>Hledat střední školy</h1>
        <p className="lede">
          Hledej podle názvu, oboru i městské části najednou. Klikni na školu
          pro detail — obory, kontakt a odkaz na oficiální web.
        </p>
      </div>

      <div className="panel search-panel">
        <label className="sr-only" htmlFor="school-search">
          Hledat školu
        </label>
        <div className="search-bar">
          <SearchIcon />
          <input
            id="school-search"
            className="search-bar-input"
            type="search"
            autoComplete="off"
            placeholder="Název školy, obor nebo městská část — např. „gymnázium Praha 6“"
            value={query}
            onChange={(e) => updateSearch({ q: e.target.value })}
          />
          {query && (
            <button
              type="button"
              className="search-bar-clear"
              onClick={() => updateSearch({ q: '' })}
              aria-label="Vymazat hledání"
            >
              ×
            </button>
          )}
        </div>

        <div className="search-filters">
          <FilterSelect
            label="Městská část"
            value={district}
            options={districtOptions}
            onChange={(value) => updateSearch({ cast: value })}
            allLabel="Všechny části"
          />
          <FilterSelect
            label="Obor"
            value={program}
            options={programOptions}
            onChange={(value) => updateSearch({ obor: value })}
            searchable
            allLabel="Všechny obory"
            searchPlaceholder="Napiš obor…"
          />
          {canSortByMatch && (
            <FilterSelect
              label="Řadit"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(value) => updateSearch({ razeni: value })}
              allLabel="Podle názvu"
            />
          )}
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm search-filters-clear"
              onClick={clearFilters}
            >
              Zrušit filtry
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="notice notice-error" role="alert">
          <span className="notice-title">Školy se nepodařilo načíst</span>
          <p className="notice-text">
            Zkontroluj, že běží backend na portu 5000. Detail chyby: {error}
          </p>
        </div>
      )}

      {!error && (
        <>
          <div className="results-bar">
            <p className="results-count" role="status" aria-live="polite">
              {loading ? (
                'Načítám školy…'
              ) : (
                <>
                  {formatResultCount(results.length).verb}{' '}
                  <strong>{results.length}</strong>{' '}
                  {formatResultCount(results.length).noun}
                </>
              )}
            </p>
            {!loading && pageCount > 1 && (
              <p className="results-range">
                Zobrazeno {firstOnPage + 1}–{firstOnPage + pageResults.length}
              </p>
            )}
            {/* Says where the percentages on the cards come from. They are
                computed from one chosen set of answers, which is not necessarily
                the most recent questionnaire — without this the number has no
                visible source. */}
            {!loading && canSortByMatch && (
              <p className="match-source-note">
                Shody podle tvé výchozí{' '}
                <Link to="/dotaznik/sady">sady odpovědí</Link>.
              </p>
            )}
          </div>

          {loading && (
            <ul className="card-grid">
              <SchoolCardSkeleton />
              <SchoolCardSkeleton />
              <SchoolCardSkeleton />
            </ul>
          )}

          {!loading && results.length > 0 && (
            <ul className="card-grid">
              {pageResults.map((school, i) => (
                // Cards fade in one after another instead of all at once. The
                // delay is capped so a full page of 20 finishes in a beat
                // rather than trickling in for two seconds. Keying by id means
                // only genuinely new results animate — refiltering leaves the
                // schools that were already on screen alone.
                <li
                  key={school.id}
                  className="school-card"
                  style={{ '--stagger': Math.min(i, 7) }}
                >
                  <FavoriteButton
                    schoolId={school.id}
                    isFavorite={favoriteIds.has(school.id)}
                    onChange={(next) => setFavorite(school.id, next)}
                  />
                  <Link
                    to={`/skoly/${school.id}`}
                    state={{ from: 'search' }}
                    className="school-card-link"
                  >
                    <span className="school-card-body">
                      <span className="school-card-name">{school.name}</span>
                      {school.location && (
                        <span className="school-card-meta">
                          <MapPin className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
                          {school.location}
                        </span>
                      )}
                      {school.programs && (
                        <span className="school-card-programs">
                          {school.programs}
                        </span>
                      )}
                    </span>
                    {/* Sorts by this once a run exists — opens that way by
                        default, and stays opt-out rather than opt-in. A
                        student who explicitly switches to "Podle názvu" still
                        gets exactly what they asked for. */}
                    <MatchScore score={school.match_score} />
                    <span className="school-card-chevron" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!loading && (
            <Pagination page={page} pageCount={pageCount} onChange={goToPage} />
          )}

          {!loading && results.length === 0 && (
            <div className="empty-state">
              <h3>Žádná škola neodpovídá hledání</h3>
              <p className="lede">
                Zkus kratší zadání — třeba jen „gymnázium“ — nebo zruš některý
                z filtrů.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearFilters}
                >
                  Zrušit filtry
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Search;
