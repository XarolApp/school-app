import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSchools, fetchPicks } from '../api';
import { getCompareSelection } from '../lib/searchPrefs';
import { CRITERIA, scoreByWeights } from '../lib/decisionMatrix';
import DecisionTabs from '../components/decision/DecisionTabs';
import './decision.css';

const LEVELS = [
  { key: 'nezalezi', label: 'Nezáleží' },
  { key: 'trochu', label: 'Trochu' },
  { key: 'dost', label: 'Dost' },
  { key: 'zasadni', label: 'Zásadní' },
];

const defaultWeights = () => Object.fromEntries(CRITERIA.filter((c) => c.available).map((c) => [c.id, 'dost']));

function Matice() {
  const navigate = useNavigate();
  const [allSchools, setAllSchools] = useState([]);
  const [selection] = useState(() => getCompareSelection());
  const [pickCount, setPickCount] = useState(0);
  const [weights, setWeights] = useState(defaultWeights);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSchools()
      .then((data) => {
        if (!cancelled) setAllSchools(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchPicks()
      .then((picks) => {
        if (!cancelled) setPickCount(picks.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const schools = useMemo(() => {
    const byId = new Map(allSchools.map((s) => [s.id, s]));
    return selection.map((id) => byId.get(id)).filter(Boolean);
  }, [allSchools, selection]);

  const ranked = useMemo(() => (schools.length ? scoreByWeights(schools, weights) : []), [schools, weights]);

  const setWeight = (criterionId, level) => {
    setWeights((prev) => ({ ...prev, [criterionId]: level }));
  };

  const bestCriteria = (breakdown) => {
    if (!breakdown.length) return null;
    const max = Math.max(...breakdown.map((b) => b.weighted));
    return breakdown.filter((b) => b.weighted === max && b.weighted > 0).map((b) => b.label);
  };

  if (loading) {
    return (
      <div className="decision-page">
        <p className="ss-body-md">Načítám…</p>
      </div>
    );
  }

  if (!schools.length) {
    return (
      <div className="decision-page dp-empty">
        <h1 className="ss-headline-lg h">Rozhodovací matice</h1>
        <p className="ss-body-md">
          Zatím nemáš vybrané žádné školy. Vyber je na stránce <Link to="/skoly">Školy</Link> a vrať se sem.
        </p>
      </div>
    );
  }

  return (
    <div className="decision-page">
      <div className="dp-header">
        <div>
          <h1 className="ss-headline-lg h">Rozhodovací matice</h1>
          <p className="ss-body-md dp-subtitle">
            Řekni, co je pro tebe důležité. Přepočítáme školy podle tvých vah — ne podle našeho pořadí.
          </p>
        </div>
      </div>

      <DecisionTabs pickCount={pickCount} />

      <div className="dp-matrix-layout">
        <div className="dp-matrix-weights">
          <div className="dp-matrix-weights-head">
            <div className="ss-headline-sm h">Co je pro tebe důležité?</div>
            <p className="ss-caption">
              Nastav každé kritérium. Co necháš na „nezáleží", se do výpočtu vůbec nepočítá.
            </p>
          </div>

          {CRITERIA.map((c) => (
            <div className={`dp-criterion${!c.available ? ' is-locked' : ''}`} key={c.id}>
              <div className="dp-criterion-head">
                <span className="dp-criterion-label">
                  {c.label} {!c.available && <span aria-hidden="true">🔒</span>}
                </span>
                <span className="ss-caption">
                  {c.available ? LEVELS.find((l) => l.key === weights[c.id])?.label : 'Nemáme data'}
                </span>
              </div>
              <div className="dp-segmented">
                {LEVELS.map((level) => (
                  <button
                    type="button"
                    key={level.key}
                    className={`dp-segment${c.available && weights[c.id] === level.key ? ' is-on' : ''}`}
                    disabled={!c.available}
                    onClick={() => setWeight(c.id, level.key)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              {!c.available && <p className="ss-caption dp-criterion-note">{c.unavailableNote}</p>}
            </div>
          ))}
        </div>

        <div className="dp-matrix-result">
          <div className="dp-matrix-result-card">
            <div className="dp-matrix-result-head">
              <div className="ss-headline-sm h">Pořadí podle tvých vah</div>
            </div>

            {ranked.every((r) => r.score == null) ? (
              <p className="ss-body-md dp-matrix-empty">
                Nastav aspoň jedno kritérium na víc než „nezáleží" a spočítáme pořadí.
              </p>
            ) : (
              ranked.map((r, i) => {
                const best = bestCriteria(r.breakdown);
                return (
                  <div className="dp-matrix-row" key={r.school.id}>
                    <div className="dp-matrix-rank h">{i + 1}.</div>
                    <div className="dp-matrix-row-body">
                      <div className="dp-matrix-row-head">
                        <Link to={`/skoly/${r.school.id}`} className="h dp-matrix-name">
                          {r.school.name}
                        </Link>
                        {best && (
                          <span className="ss-caption">
                            Nejlepší podle: <strong>{best.join(', ')}</strong>
                          </span>
                        )}
                      </div>
                      {r.breakdown.length > 0 && (
                        <div className="dp-matrix-bar">
                          {r.breakdown.map((b) => (
                            <div
                              key={b.criterionId}
                              className={`dp-matrix-bar-seg dp-matrix-bar-${b.criterionId}`}
                              style={{ width: `${Math.max(b.weighted * 100, 2)}%` }}
                              title={`${b.label}: ${Math.round(b.weighted * 100)}%`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="dp-matrix-callout">
            <span aria-hidden="true">💡</span>
            <div>
              <div className="ss-body-md dp-matrix-callout-title">Pořadí tady není pořadí přihlášky</div>
              <p className="ss-body-sm">
                Tohle je jen srovnání podle toho, co jsi zadal. Do přihlášky se řadí školy podle toho, kam se
                nejvíc chceš dostat — to řešíme na další záložce.
              </p>
              <button type="button" className="ss-btn ss-btn-primary ss-btn-sm" onClick={() => navigate('/prihlaska')}>
                Přejít na moji přihlášku →
              </button>
            </div>
          </div>

          <p className="ss-caption">
            Výpočet je obyčejná matematika nad daty z Cermatu — žádná AI. Kritéria, u kterých nemáme data pro
            všechny porovnávané školy, se do součtu nezapočítávají a váhy se přepočítají mezi zbytek, takže
            chybějící údaj nikdy školu netrestá.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Matice;
