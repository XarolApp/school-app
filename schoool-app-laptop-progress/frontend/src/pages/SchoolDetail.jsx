import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { MapPin, Phone, Globe } from 'lucide-react';
import {
  fetchSchool,
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from '../api';
import MatchScore from '../components/MatchScore';
import SchoolMap from '../components/SchoolMap';
import { useToast } from '../components/ToastContext';

// Where "back" goes depends on how this page was reached — set as router
// `state` by whichever list linked here (Search, Favorites, Questionnaire).
// A direct visit (shared link, refresh, no state) has nowhere to remember, so
// it falls back to the search page rather than guessing.
const BACK_TARGETS = {
  questionnaire: { to: '/dotaznik', label: 'Zpět na dotazník' },
  favorites: { to: '/oblibene', label: 'Zpět na oblíbené' },
  search: { to: '/skoly', label: 'Zpět na hledání' },
};

function backTarget(state) {
  // A card opened from a stored set returns to *that* set. Sending it to the
  // list instead would lose the place, and sending it to /dotaznik would land on
  // a different set entirely once an older one is the default.
  if (state?.from === 'run' && state.runId) {
    return { to: `/dotaznik/sady/${state.runId}`, label: 'Zpět na sadu odpovědí' };
  }
  return BACK_TARGETS[state?.from] || BACK_TARGETS.search;
}

// Supabase stores programs as one text field; the scraper usually separates
// them with commas, so split them back out into individual tags.
function splitPrograms(programs) {
  if (!programs) return [];
  return programs
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(website) {
  if (!website) return null;
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function DetailShell({ children, back }) {
  return (
    <div className="page page-school-detail">
      <Link to={back.to} className="back-link">
        <span aria-hidden="true">←</span> {back.label}
      </Link>
      {children}
    </div>
  );
}

function SchoolDetail() {
  const { id } = useParams();
  const location = useLocation();
  const back = backTarget(location.state);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSchool(id), fetchFavorites().catch(() => [])])
      .then(([schoolData, favorites]) => {
        setSchool(schoolData);
        setIsFavorite(favorites.some((item) => String(item.id) === String(id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    setSavingFavorite(true);
    try {
      if (next) {
        await addFavorite(Number(id));
      } else {
        await removeFavorite(Number(id));
      }
      toast(next ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených');
    } catch {
      setIsFavorite(!next);
      toast(
        next
          ? 'Školu se nepodařilo přidat do oblíbených'
          : 'Školu se nepodařilo odebrat z oblíbených',
        { type: 'error' }
      );
    } finally {
      setSavingFavorite(false);
    }
  };

  if (loading) {
    return (
      <DetailShell back={back}>
        <div className="skeleton-card" aria-label="Načítám školu">
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line skeleton-line-short" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </DetailShell>
    );
  }

  if (error) {
    return (
      <DetailShell back={back}>
        <div className="notice notice-error" role="alert">
          <span className="notice-title">Školu se nepodařilo načíst</span>
          <p className="notice-text">
            Zkontroluj, že běží backend na portu 5000. Detail chyby: {error}
          </p>
        </div>
      </DetailShell>
    );
  }

  if (!school) {
    return (
      <DetailShell back={back}>
        <div className="empty-state">
          <h3>Škola nenalezena</h3>
          <p className="lede">Tento záznam v databázi neexistuje.</p>
          <Link to={back.to} className="btn btn-secondary btn-sm">
            {back.label}
          </Link>
        </div>
      </DetailShell>
    );
  }

  const programs = splitPrograms(school.programs);
  const websiteUrl = normalizeUrl(school.website);

  return (
    <DetailShell back={back}>
      <div className="detail-header">
        {school.location && <p className="eyebrow">{school.location}</p>}
        <MatchScore score={school.match_score} />
        <h1 className="detail-title">{school.name}</h1>
        {programs.length > 0 && (
          <div className="tag-row">
            {programs.slice(0, 6).map((item) => (
              <span key={item} className="tag tag-accent">
                {item}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          className={
            isFavorite
              ? 'btn btn-secondary btn-sm is-favorite'
              : 'btn btn-secondary btn-sm'
          }
          onClick={toggleFavorite}
          disabled={savingFavorite}
          aria-pressed={isFavorite}
        >
          {isFavorite ? '★ Uloženo mezi oblíbené' : '☆ Uložit mezi oblíbené'}
        </button>
      </div>

      <div className="detail-grid">
        <div className="panel panel-lg detail-section">
          <h2 className="detail-section-title">Nabízené obory</h2>
          {school.programs ? (
            <p className="detail-body">{school.programs}</p>
          ) : (
            <p className="notice-text">
              U této školy zatím nemáme seznam oborů.
            </p>
          )}
        </div>

        <div className="panel panel-lg detail-section">
          <h2 className="detail-section-title">Praktické informace</h2>
          <dl className="info-list">
            <div className="info-item">
              <dt className="info-term">
                <MapPin className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
                Adresa
              </dt>
              <dd className="info-value">{school.location || 'Neuvedeno'}</dd>
            </div>
            <div className="info-item">
              <dt className="info-term">
                <Phone className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
                Kontakt
              </dt>
              <dd className="info-value">{school.contact || 'Neuvedeno'}</dd>
            </div>
            <div className="info-item">
              <dt className="info-term">
                <Globe className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
                Web školy
              </dt>
              <dd className="info-value">
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {school.website}
                  </a>
                ) : (
                  'Neuvedeno'
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Renders nothing at all until the school has been geocoded, so this is
          simply absent rather than empty on an unseeded database. */}
      {school.latitude != null && school.longitude != null && (
        <div className="panel panel-lg detail-section">
          <h2 className="detail-section-title">Kde škola je</h2>
          <SchoolMap
            latitude={school.latitude}
            longitude={school.longitude}
            name={school.name}
          />
        </div>
      )}
    </DetailShell>
  );
}

export default SchoolDetail;
