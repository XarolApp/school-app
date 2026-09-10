import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSharedShortlist } from '../api';
import { cutoffForPick, bandFor, BANDS } from '../lib/admissionRisk';
import RiskSummary from '../components/decision/RiskSummary';
import './decision.css';

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
    return (
      <div className="dp-share-page">
        <p className="ss-body-md">Načítám…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dp-share-page">
        <div className="dp-share-topbar h">ŠkolaMatch</div>
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Odkaz nenalezen</h1>
          <p className="ss-body-md">Tenhle odkaz už neplatí — buď byl zrušen, nebo nikdy neexistoval.</p>
          <Link to="/skoly" className="ss-btn ss-btn-primary">
            Prohlédnout školy
          </Link>
        </div>
      </div>
    );
  }

  const { firstName, jpzPoints, picks } = data;

  return (
    <div className="dp-share-page">
      <div className="dp-share-topbar h">ŠkolaMatch</div>

      <div className="dp-share-header">
        <div className="ss-label-caps">Sdílený přehled</div>
        <h1 className="ss-headline-md h">{firstName ? `${firstName}ovy tři školy` : 'Tři vybrané školy'}</h1>
        <p className="ss-body-md">
          Takhle si {firstName || 'student/ka'} seřadil/a přihlášku. Pořadí je závazné — přijmou ho/ji na nejvýš
          postavenou školu, kam se dostane.
        </p>
        <p className="ss-caption">Jen ke čtení.</p>
      </div>

      <div className="dp-share-risk">
        <RiskSummary picks={picks.map((p) => ({ ...p, school: p.school }))} studentPoints={jpzPoints} />
      </div>

      <div className="dp-share-picks">
        {picks.map((pick) => {
          const { cutoff, source } = cutoffForPick(pick, pick.school);
          const band = bandFor({ studentPoints: jpzPoints, cutoff });
          const tone = band ? BANDS[band].tone : null;

          return (
            <div className="dp-share-card" key={pick.school.id}>
              <div className="dp-share-card-rank h">{pick.priority}</div>
              <div className="dp-share-card-body">
                <div className="dp-share-card-head">
                  <div className="h dp-share-card-name">{pick.school.name}</div>
                  {tone && <span className={`dp-pill dp-pill-${tone}`}>{BANDS[band].label}</span>}
                </div>
                <div className="ss-caption">
                  {pick.school.location}
                  {pick.obor_nazev ? ` · ${pick.obor_nazev}` : ''}
                </div>

                <div className="dp-share-card-stats">
                  <div>
                    <div className="ss-label-caps">Hranice</div>
                    <div className="ss-body-md">{cutoff != null ? `${numCz(cutoff)} b.` : '—'}</div>
                  </div>
                  <div>
                    <div className="ss-label-caps">Body</div>
                    <div className="ss-body-md">{jpzPoints != null ? `${numCz(jpzPoints)} b.` : '—'}</div>
                  </div>
                </div>
                {source === 'skola' && cutoff != null && (
                  <p className="ss-caption">Bez vybraného oboru jde o průměr celé školy.</p>
                )}

                {pick.note && (
                  <div className="dp-share-note">
                    <div className="ss-label-caps">{firstName || 'Poznámka'}ova poznámka</div>
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
          Hranice je nejnižší bodový výsledek, který loni stačil na přijetí do daného oboru (data Cermat, 1.
          kolo). Každý rok se mění podle počtu přihlášek a obtížnosti testu. Je to vodítko, ne záruka přijetí.
        </p>
      </div>

      <div className="dp-share-cta">
        <div className="h ss-headline-sm">Chcete si školy projít sami?</div>
        <p className="ss-body-sm">
          V ŠkolaMatch najdete všechny pražské střední školy, jejich hranice přijetí a srovnání vedle sebe.
        </p>
        <Link to="/skoly" className="ss-btn ss-btn-primary">
          Prohlédnout školy
        </Link>
      </div>

      <p className="ss-caption dp-share-footer">
        Tento odkaz vytvořil/a {firstName || 'student/ka'} a může ho kdykoliv zrušit.
      </p>
    </div>
  );
}

export default SdileniView;
