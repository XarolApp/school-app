import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Info, Lock, TriangleAlert } from 'lucide-react';
import { fetchSchools, fetchPicks } from '../api';
import { getCompareSelection } from '../lib/searchPrefs';
import { useAuth } from '../components/AuthContext';
import {
  CRITERIA,
  scoreByWeights,
  hasMatchScores,
  matchBand,
  weakSpots,
  MATCH_GAP,
} from '../lib/decisionMatrix';
import DecisionTabs from '../components/decision/DecisionTabs';
import './decision.css';

const LEVELS = [
  { key: 'nezalezi', label: 'Nezáleží' },
  { key: 'trochu', label: 'Trochu' },
  { key: 'dost', label: 'Dost' },
  { key: 'zasadni', label: 'Zásadní' },
];

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.key, l.label]));

const defaultWeights = () =>
  Object.fromEntries(
    CRITERIA.filter((c) => c.available).map((c) => [c.id, c.id === 'shoda' ? 'zasadni' : 'dost'])
  );

/** Lowercases just the first character — Czech sentences read as one clause,
 *  not as a list of capitalized criterion names. */
function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Wraps each label in <strong> and joins them the Czech way ("a" / "a, b a c"),
 *  returning React nodes rather than a string since joinCz itself is plain text. */
function strongJoinCz(labels) {
  const nodes = labels.map((label, i) => <strong key={i}>{lowerFirst(label)}</strong>);
  if (nodes.length <= 1) return nodes;
  if (nodes.length === 2) return [nodes[0], ' a ', nodes[1]];
  const out = [];
  nodes.slice(0, -1).forEach((node, i) => {
    out.push(node);
    out.push(i < nodes.length - 2 ? ', ' : ' a ');
  });
  out.push(nodes[nodes.length - 1]);
  return out;
}

/** Rank-1-only note when a different compared school fits the questionnaire
 *  notably better — the whole reason match_score belongs in this matrix. */
function gapNote(row, index, ranked) {
  if (index !== 0) return null;
  const shoda = row.breakdown.find((b) => b.criterionId === 'shoda');
  if (!shoda) return null;

  const best = ranked.reduce((acc, r) =>
    (r.school.match_score ?? -1) > (acc.school.match_score ?? -1) ? r : acc
  );
  if (best.school.id === row.school.id) return null;

  const gap = (best.school.match_score ?? 0) - (row.school.match_score ?? 0);
  if (gap < MATCH_GAP) return null;

  return (
    <div className="dp-matrix-note">
      <Info size={16} aria-hidden="true" />
      <div>
        Vede celkově — ale <strong>{best.school.name}</strong> ti podle dotazníku sedí výrazně víc.
      </div>
    </div>
  );
}

/** Weak-spot warning: criteria the user marked important where this school
 *  underperforms the rest of the compared set. */
function weakNote(row, ranked) {
  const weak = weakSpots(row.breakdown);
  if (!weak.length) return null;

  if (weak.length === 1 && weak[0].criterionId === 'shoda') {
    const b = weak[0];
    const start =
      b.raw === 0
        ? 'Nejnižší shoda s dotazníkem z porovnávaných škol — a '
        : 'Shoda s dotazníkem tu vychází slabě — a ';
    const end = b.weightKey === 'zasadni' ? 'shodu máš nastavenou jako zásadní.' : 'na shodě ti dost záleží.';
    return (
      <div className="dp-matrix-note is-warn">
        <TriangleAlert size={16} aria-hidden="true" />
        <div>
          {start}
          {end}
        </div>
      </div>
    );
  }

  const topMatch = ranked.reduce((acc, r) =>
    (r.school.match_score ?? -1) > (acc.school.match_score ?? -1) ? r : acc
  );
  const hasShoda = row.breakdown.some((b) => b.criterionId === 'shoda');
  const prefix =
    hasShoda && topMatch.school.id === row.school.id
      ? 'Sedí ti nejvíc ze všech — ale slabá místa'
      : 'Slabá místa';

  return (
    <div className="dp-matrix-note is-warn">
      <TriangleAlert size={16} aria-hidden="true" />
      <div>
        {prefix} jsou přesně v tom, na čem ti záleží: {strongJoinCz(weak.map((b) => b.label))}.
      </div>
    </div>
  );
}

function Matice() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
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

  const matchAvailable = hasMatchScores(schools);

  const ranked = useMemo(() => (schools.length ? scoreByWeights(schools, weights) : []), [schools, weights]);

  const setWeight = (criterionId, level) => {
    setWeights((prev) => ({ ...prev, [criterionId]: level }));
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

  const otherCriteria = CRITERIA.filter((c) => c.id !== 'shoda');
  const shodaCriterion = CRITERIA.find((c) => c.id === 'shoda');

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
              Nastav každé kritérium. Co necháš na „nezáleží“, se do výpočtu vůbec nepočítá.
            </p>
          </div>

          <div className={`dp-criterion dp-criterion-featured${!matchAvailable ? ' is-locked' : ''}`}>
            <div className="dp-criterion-head">
              <span className="dp-criterion-label">
                <Heart size={15} aria-hidden="true" />
                {shodaCriterion.label}
              </span>
              <span className="ss-caption dp-criterion-state">
                {matchAvailable ? LEVEL_LABEL[weights.shoda] : 'Nevyplněno'}
              </span>
            </div>
            <div className="dp-segmented">
              {LEVELS.map((level) => (
                <button
                  type="button"
                  key={level.key}
                  className={`dp-segment${matchAvailable && weights.shoda === level.key ? ' is-on' : ''}`}
                  disabled={!matchAvailable}
                  onClick={() => setWeight('shoda', level.key)}
                >
                  {level.label}
                </button>
              ))}
            </div>
            {matchAvailable ? (
              <p className="ss-caption dp-criterion-note">
                Z tvých odpovědí v dotazníku. Ve výchozím nastavení váží nejvíc.
              </p>
            ) : isSignedIn ? (
              <p className="ss-caption dp-criterion-note">
                Shodu počítáme z úvodního dotazníku. Jakmile ho máš uložený u účtu, doplní se tady sama.
              </p>
            ) : (
              <p className="ss-caption dp-criterion-note">
                Shodu počítáme z tvého dotazníku. <Link to="/prihlaseni">Přihlas se</Link> a doplní se sama.
              </p>
            )}
          </div>

          {otherCriteria.map((c) => (
            <div className={`dp-criterion${!c.available ? ' is-locked' : ''}`} key={c.id}>
              <div className="dp-criterion-head">
                <span className="dp-criterion-label">
                  {c.label} {!c.available && <Lock size={13} aria-hidden="true" />}
                </span>
                <span className="ss-caption">
                  {c.available ? LEVEL_LABEL[weights[c.id]] : 'Nemáme data'}
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
              <p className="ss-caption dp-matrix-result-sub">
                Delší proužek = škola je v tom kritériu lepší než ostatní porovnávané. Váhy nastavuješ ty.
              </p>
            </div>

            {ranked.every((r) => r.score == null) ? (
              <p className="ss-body-md dp-matrix-empty">
                Nastav aspoň jedno kritérium na víc než „nezáleží“ a spočítáme pořadí.
              </p>
            ) : (
              ranked.map((r, i) => {
                const band = typeof r.school.match_score === 'number' ? matchBand(r.school.match_score) : null;
                return (
                  <div className="dp-matrix-row" key={r.school.id}>
                    <div className={`dp-matrix-rank-badge${i === 0 ? ' is-first' : ''}`}>{i + 1}</div>
                    <div className="dp-matrix-row-body">
                      <div className="dp-matrix-row-head">
                        <Link to={`/skoly/${r.school.id}`} className="h dp-matrix-name">
                          {r.school.name}
                        </Link>
                        {band && (
                          <span className={`dp-match-chip dp-match-chip-${band.tone}`}>
                            {band.label} · {Math.round(r.school.match_score)} %
                          </span>
                        )}
                      </div>

                      {r.breakdown.length > 0 && (
                        <div className="dp-crit-list">
                          {r.breakdown.map((b) => (
                            <div className="dp-crit-row" key={b.criterionId}>
                              <div className={`dp-crit-label${b.criterionId === 'shoda' ? ' is-featured' : ''}`}>
                                {b.label}
                              </div>
                              <div className="dp-crit-track">
                                <div className="dp-crit-fill" style={{ width: `${b.raw * 100}%` }} />
                              </div>
                              <div className={`dp-crit-weight${b.weightKey === 'zasadni' ? ' is-hi' : ''}`}>
                                {LEVEL_LABEL[b.weightKey]}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {gapNote(r, i, ranked)}
                      {weakNote(r, ranked)}
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
            Výpočet je obyčejná matematika nad daty z Cermatu a tvého dotazníku — žádná AI. Proužky ukazují, jak
            si škola stojí proti ostatním porovnávaným, ne proti celé Praze. Kritéria, u kterých nemáme data pro
            všechny porovnávané školy, se do součtu nezapočítávají.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Matice;
