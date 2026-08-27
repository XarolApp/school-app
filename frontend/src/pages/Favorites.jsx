import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { fetchFavorites } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import FilterSelect from '../components/FilterSelect';
import MatchScore from '../components/MatchScore';

const SORT_OPTIONS = [{ value: 'shoda', label: 'Podle shody', count: null }];

function Favorites() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // In the URL, the same `razeni` param the search page uses. Opening a school
  // and pressing Back would otherwise drop the ordering and re-sort the list
  // under someone who had just chosen how to read it. Replace rather than push,
  // so changing the sort does not put an extra entry between the list and
  // wherever the visitor came from.
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('razeni') ?? '';
  const setSort = (value) =>
    setSearchParams(value ? { razeni: value } : {}, { replace: true });
  // Guards the auto-default below so it fires once per page load, not once
  // per render — otherwise picking "Podle názvu" back off would bounce
  // straight back to "Podle shody" the instant the param was removed.
  const didDefaultSort = useRef(false);

  useEffect(() => {
    fetchFavorites()
      .then(setSchools)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Every card here is a favorite by definition, so the star always starts
  // filled and unstarring removes it — the same gesture as everywhere else in
  // the app, just with the meaning flipped. FavoriteButton already makes the
  // add/remove call and its own optimistic update; this only has to keep the
  // visible list in sync with what it decides, including putting a school
  // back if the removal call actually failed (it calls onChange(true) again
  // when that happens).
  const handleFavoriteChange = (school, next) => {
    if (next) {
      setSchools((current) =>
        current.some((s) => s.id === school.id) ? current : [...current, school]
      );
    } else {
      setSchools((current) => current.filter((s) => s.id !== school.id));
    }
  };

  const canSortByMatch = schools.some((school) => school.match_score != null);

  // Opens sorted by match whenever the account has a run, same as search —
  // see the matching effect there for why the ref is needed.
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

  // The join behind /api/favorites has no ordering of its own, so the list
  // could come back differently on any two loads. Alphabetical by default, and
  // it stays the tie-break under the match sort because Array#sort is stable —
  // two schools on the same percentage keep a predictable order instead of
  // swapping places when a third is starred.
  const ordered = useMemo(() => {
    const list = [...schools].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'cs')
    );
    if (sort === 'shoda') {
      list.sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
    }
    return list;
  }, [schools, sort]);

  return (
    <div className="page page-favorites">
      <div className="page-header">
        <p className="eyebrow">Tvůj výběr</p>
        <h1>Oblíbené školy</h1>
        <p className="lede">
          Školy, které sis uložil. Vrať se k nim, až budeš podávat přihlášky.
        </p>
      </div>

      {loading && (
        <ul className="card-grid">
          <li className="skeleton-card" aria-hidden="true">
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line skeleton-line-short" />
          </li>
        </ul>
      )}

      {error && (
        <div className="notice notice-error" role="alert">
          <span className="notice-title">Nepodařilo se načíst oblíbené</span>
          <p className="notice-text">{error}</p>
        </div>
      )}

      {!loading && !error && schools.length === 0 && (
        <div className="empty-state">
          <h3>Zatím nemáš žádné oblíbené školy</h3>
          <p className="lede">
            Otevři detail školy a klikni na „Uložit mezi oblíbené“.
          </p>
          <Link to="/skoly" className="btn btn-secondary btn-sm">
            Procházet školy
          </Link>
        </div>
      )}

      {!loading && schools.length > 0 && canSortByMatch && (
        <div className="results-bar">
          <FilterSelect
            label="Řadit"
            value={sort}
            options={SORT_OPTIONS}
            onChange={setSort}
            allLabel="Podle názvu"
          />
          {/* Says where the percentages come from. They are computed from one
              chosen set of answers, which is not necessarily the most recent
              questionnaire — without this the number has no visible source. */}
          <p className="match-source-note">
            Shody se počítají podle tvé výchozí{' '}
            <Link to="/dotaznik/sady">sady odpovědí</Link>.
          </p>
        </div>
      )}

      {!loading && schools.length > 0 && (
        <ul className="card-grid">
          {ordered.map((school, i) => (
            <li
              key={school.id}
              className="school-card"
              style={{ '--stagger': Math.min(i, 7) }}
            >
              <FavoriteButton
                schoolId={school.id}
                isFavorite
                onChange={(next) => handleFavoriteChange(school, next)}
              />
              <Link
                to={`/skoly/${school.id}`}
                state={{ from: 'favorites' }}
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
                </span>
                <MatchScore score={school.match_score} />
                {/* Same card, same affordance as on the search page — this was
                    the one school list missing the arrow, which made an
                    identical card look non-clickable here. */}
                <span className="school-card-chevron" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Favorites;
