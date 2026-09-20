import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { fetchSchoolReviews } from '../../api';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';

function SchoolReviews({ schoolId }) {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const requestRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestRef.current;
    setError(null);
    setReviews(null);
    fetchSchoolReviews(schoolId)
      .then((rows) => {
        if (requestRef.current === requestId) setReviews(rows);
      })
      .catch((err) => {
        if (requestRef.current !== requestId) return;
        setError(err.message || 'Recenze se nepodařilo načíst.');
        setReviews([]);
      });
  }, [schoolId]);

  useEffect(() => {
    setReviews(null);
    setTab('all');
    load();
    return () => { requestRef.current += 1; };
  }, [load]);

  if (reviews === null) return null;

  const published = reviews.filter((r) => r.status !== 'held' || r.is_mine);
  const verifiedCount = published.filter((r) => r.verified).length;
  const unverifiedCount = published.length - verifiedCount;
  const shown =
    tab === 'verified' ? published.filter((r) => r.verified) : tab === 'unverified' ? published.filter((r) => !r.verified) : published;

  return (
    <div id="recenze">
      <div className="sd-section-head">
        <h2 className="sd-section-title">Recenze</h2>
        {!error && (
          <span className="sd-section-meta">
            {verifiedCount} ověřených · {unverifiedCount} neověřených
          </span>
        )}
      </div>

      {error ? (
        <div className="notice notice-error" role="alert">
          <p className="notice-text">{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Zkusit načíst znovu
          </button>
        </div>
      ) : published.length === 0 ? (
        <div className="sd-reviews-empty">
          <MessageSquare size={32} strokeWidth={1.4} color="var(--line2)" aria-hidden="true" />
          <div className="sd-reviews-empty-title">O téhle škole zatím nikdo nenapsal</div>
          <div className="sd-reviews-empty-body">
            Chodíš sem, chodil jsi sem, učíš tu nebo jsi rodič studenta? Napiš,
            jaké to tu doopravdy je. Stačilo ti otevřít dveře na dni otevřených
            dveří — i to je užitečné, jen to prosím napiš.
          </div>
          <div className="sd-reviews-empty-note">
            Recenze píšeme pod přezdívkou podle role, ne pod jménem. Nepiš si
            recenzi o škole, kterou neznáš.
          </div>
        </div>
      ) : (
        <>
          <div className="sd-reviews-tabs">
            <button type="button" className={`sd-reviews-tab${tab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')}>
              Všechny {published.length}
            </button>
            <button
              type="button"
              className={`sd-reviews-tab${tab === 'verified' ? ' is-active' : ''}`}
              onClick={() => setTab('verified')}
            >
              Ověřené {verifiedCount}
            </button>
            <button
              type="button"
              className={`sd-reviews-tab${tab === 'unverified' ? ' is-active' : ''}`}
              onClick={() => setTab('unverified')}
            >
              Neověřené {unverifiedCount}
            </button>
          </div>
          <div className="sd-reviews-list">
            {shown.map((r) => (
              <ReviewCard key={r.id} review={r} onChanged={load} />
            ))}
          </div>
        </>
      )}

      <ReviewForm schoolId={schoolId} onSubmitted={load} />
    </div>
  );
}

export default SchoolReviews;
