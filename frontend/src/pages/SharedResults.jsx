import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { fetchSharedResults } from '../api';
import './decision.css';
import { LoadingSpinner } from '../components/PageSkeleton';

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
}

function SharedResults() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchSharedResults(token)
      .then((value) => { if (alive) setData(value); })
      .catch((err) => { if (alive) setError(err); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, attempt]);

  return (
    <div className="dp-share-page dp-plan018-page">
      <div className="dp-share-topbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true"><BrandMark size={22} /></span>
          Střední na míru
        </Link>
      </div>
      {loading ? (
        <LoadingSpinner label="Načítám výsledky…" />
      ) : error?.status === 404 || (!data && !error) ? (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Tento odkaz už neplatí</h1>
          <p className="ss-body-md">Kdo vám ho poslal, mohl sdílení mezitím zrušit. Požádejte o nový odkaz.</p>
          <Link to="/skoly" className="ss-btn ss-btn-primary">Prohlédnout pražské školy</Link>
        </div>
      ) : error ? (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Výsledky se nepodařilo načíst</h1>
          <p className="ss-body-md">{error.status ? error.message : 'Připojení se nepodařilo. Zkus to prosím znovu.'}</p>
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Zkusit znovu</button>
        </div>
      ) : (
        <>
          <div className="dp-share-header">
            <div className="ss-label-caps">Sdílené výsledky</div>
            <h1 className="ss-headline-md h">
              {data.source === 'snapshot' ? 'Výsledek dotazníku' : 'Výsledky dotazníku'}
            </h1>
            {data.source === 'snapshot' && (
              <p className="ss-body-md">
                Z pražských škol sedí {data.fitting_count}. Nejvíc:
              </p>
            )}
            {data.created_at && <p className="ss-caption">Vyplněno {formatDate(data.created_at)}</p>}
          </div>

          <div className="dp-share-picks dp-results-list">
            {data.top.map((item) => (
              <article className="dp-share-card" key={item.school.id}>
                <div className="dp-share-card-rank h">{item.rank}</div>
                <div className="dp-share-card-body">
                  <Link className="dp-share-card-name" to={'/skoly/' + item.school.id}>{item.school.name}</Link>
                  {item.school.district && <div className="ss-caption">{item.school.district}</div>}
                  <div className="ss-body-md">{item.score} % shoda</div>
                  {item.reason && <p className="dp-share-note ss-body-sm">{item.reason}</p>}
                </div>
              </article>
            ))}
            {data.locked_count > 0 && (
              <div className="dp-results-locked ss-body-sm">
                a dalších {data.locked_count} škol — zbytek pořadí se zobrazí, až bude účet aktivní.
              </div>
            )}
          </div>

          <p className="ss-caption dp-share-footer">Jen ke čtení. Odkaz nedává přístup do aplikace.</p>
          <div className="dp-share-cta">
            <div className="h ss-headline-sm">Chcete si zkusit vlastní výběr?</div>
            <Link to="/onboarding/welcome" className="ss-btn ss-btn-secondary">Vyplnit vlastní dotazník</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default SharedResults;
