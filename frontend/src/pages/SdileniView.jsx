import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { Link2Off } from 'lucide-react';
import { fetchSharedShortlist } from '../api';
import { cutoffForPick } from '../lib/admissionRisk';
import './decision.css';
import { LoadingSpinner } from '../components/PageSkeleton';

const numCz = (v) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: 1 }));

/**
 * The public, no-account read-only view behind a share link (feature-
 * brainstorm.md §5 "Share shortlist with parents"). Deliberately renders
 * OUTSIDE <Layout> (see App.jsx) — a parent following a link from their kid
 * should not see a nav bar inviting them elsewhere, same reasoning as the
 * onboarding flow.
 */
function SdileniView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSharedShortlist(token)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Odkaz nenalezen.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <div className="dp-share-page"><LoadingSpinner label="Načítám sdílený výběr…" /></div>;
  }

  if (error || !data) {
    return (
      <div className="dp-share-page">
        <div className="dp-share-topbar">
          <Link to="/" className="navbar-brand">
            <span className="navbar-mark" aria-hidden="true">
              <BrandMark size={22} />
            </span>
            Střední na míru
          </Link>
        </div>
        <div className="dp-share-notfound">
          <span className="dp-share-notfound-icon" aria-hidden="true">
            <Link2Off size={28} />
          </span>
          <div>
            <h1 className="ss-headline-md h">Tento odkaz už neplatí</h1>
            <p className="ss-body-md">Kdo vám ho poslal, mohl sdílení mezitím zrušit. Požádejte ho o nový odkaz.</p>
          </div>
          <Link to="/skoly" className="ss-btn ss-btn-primary dp-btn-lg">
            Prohlédnout pražské školy
          </Link>
          <Link to="/">Co je Střední na míru?</Link>
        </div>
      </div>
    );
  }

  const { picks } = data;

  return (
    <div className="dp-share-page">
      <div className="dp-share-topbar h">Střední na míru</div>

      <div className="dp-share-header">
        <div className="ss-label-caps">Sdílený přehled</div>
        <h1 className="ss-headline-md h">Vybrané školy</h1>
        <p className="ss-body-md">
          Tohle je pořadí přihlášek. Přijetí proběhne na nejvýš postavenou školu, kam se uchazeč/ka dostane.
        </p>
        <p className="ss-caption">Jen ke čtení.</p>
      </div>

      <div className="dp-share-picks">
        {picks.map((pick) => {
          const { cutoff, year, range, needsObor } = cutoffForPick(pick, pick.school);

          return (
            <div className="dp-share-card" key={pick.school.id}>
              <div className="dp-share-card-rank h">{pick.priority}</div>
              <div className="dp-share-card-body">
                <div className="dp-share-card-head">
                  <div className="h dp-share-card-name">{pick.school.name}</div>
                </div>
                <div className="ss-caption">
                  {pick.school.location}
                  {pick.obor_nazev ? ` · ${pick.obor_nazev}` : ''}
                </div>

                <div className="dp-share-card-stats">
                  <div>
                    <div className="ss-label-caps">Hranice {year ?? ''}</div>
                    <div className="ss-body-md">{cutoff != null ? `${numCz(cutoff)} b.` : range ?? '—'}</div>
                  </div>
                </div>
                {needsObor && range && (
                  <p className="ss-caption">Obor zatím není vybraný, proto rozpětí mezi obory školy.</p>
                )}

                {pick.note && (
                  <div className="dp-share-note">
                    <div className="ss-label-caps">Poznámka</div>
                    <p className="ss-body-sm">{pick.note}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dp-share-disclaimer">
        <div className="ss-label-caps">Jak to počítáme</div>
        <p className="ss-body-sm">
          Hranice je nejnižší bodový výsledek, který v uvedeném roce stačil na přijetí do daného oboru (data Cermat, 1.
          kolo). Každý rok se mění podle počtu přihlášek a obtížnosti testu. Je to vodítko, ne záruka přijetí.
        </p>
      </div>

      <div className="dp-share-cta">
        <div className="h ss-headline-sm">Chcete si školy projít sami?</div>
        <p className="ss-body-sm">
          Ve Střední na míru najdete všechny pražské střední školy, jejich hranice přijetí a srovnání vedle sebe.
        </p>
        <Link to="/skoly" className="ss-btn ss-btn-primary">
          Prohlédnout školy
        </Link>
      </div>

      <p className="ss-caption dp-share-footer">
        Tento odkaz může jeho autor/ka kdykoliv zrušit.
      </p>
    </div>
  );
}

export default SdileniView;
