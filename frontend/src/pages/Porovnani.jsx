import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSchools, fetchPicks, savePicks } from '../api';
import { getCompareSelection, toggleCompareSelection } from '../lib/searchPrefs';
import { buildComparisonRows } from '../lib/comparisonRows';
import DecisionTabs from '../components/decision/DecisionTabs';
import ProsCons from '../components/decision/ProsCons';
import { useToast } from '../components/ToastContext';
import './decision.css';

function Porovnani() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allSchools, setAllSchools] = useState([]);
  const [selection, setSelection] = useState(() => getCompareSelection());
  const [pickIds, setPickIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSchools()
      .then((data) => {
        if (!cancelled) setAllSchools(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Nepodařilo se načíst školy.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchPicks()
      .then((picks) => {
        if (!cancelled) setPickIds(new Set(picks.map((p) => p.school.id)));
      })
      .catch(() => {
        // Signed out or expired — picks simply stay empty, the compare page
        // itself works fine without an account.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const schools = useMemo(() => {
    const byId = new Map(allSchools.map((s) => [s.id, s]));
    return selection.map((id) => byId.get(id)).filter(Boolean);
  }, [allSchools, selection]);

  const rows = useMemo(() => (schools.length ? buildComparisonRows(schools) : []), [schools]);

  const handleRemove = (schoolId) => {
    const next = toggleCompareSelection(schoolId);
    setSelection(next);
  };

  const handleAddToPicks = async (school) => {
    if (pickIds.has(school.id)) {
      // Toggle off.
      const nextIds = [...pickIds].filter((id) => id !== school.id);
      try {
        await savePicks(nextIds.map((id) => ({ schoolId: id })));
        setPickIds(new Set(nextIds));
      } catch (err) {
        toast(err.message || 'Nepodařilo se upravit přihlášku.', { type: 'error' });
      }
      return;
    }
    if (pickIds.size >= 3) {
      toast('Do přihlášky patří nejvýš 3 školy — nejdřív jednu odeber na záložce Moje přihláška.', { type: 'error' });
      return;
    }
    try {
      const nextIds = [...pickIds, school.id];
      await savePicks(nextIds.map((id) => ({ schoolId: id })));
      setPickIds(new Set(nextIds));
      toast(`${school.name} přidána do přihlášky.`);
    } catch (err) {
      if (err.code === 'TOO_MANY_PICKS') {
        toast('Do přihlášky patří nejvýš 3 školy.', { type: 'error' });
      } else if (err.isUnauthorized) {
        toast('Přihlas se, abys mohl/a sestavit přihlášku.', { type: 'error' });
      } else {
        toast(err.message || 'Nepodařilo se upravit přihlášku.', { type: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <div className="decision-page">
        <p className="ss-body-md">Načítám…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="decision-page">
        <p className="ss-body-md">{error}</p>
      </div>
    );
  }

  if (!schools.length) {
    return (
      <div className="decision-page dp-empty">
        <h1 className="ss-headline-lg h">Porovnání škol</h1>
        <p className="ss-body-md">
          Zatím nemáš vybrané žádné školy k porovnání. Na stránce <Link to="/skoly">Školy</Link> klikni na
          „Přidat k porovnání" u škol, které tě zajímají — a vrať se sem.
        </p>
      </div>
    );
  }

  return (
    <div className="decision-page">
      <div className="dp-header">
        <div>
          <h1 className="ss-headline-lg h">Porovnání škol</h1>
          <p className="ss-body-md dp-subtitle">
            {schools.length} {schools.length === 1 ? 'škola' : schools.length < 5 ? 'školy' : 'škol'} vedle sebe,
            stejné řádky. Čísla jsou z Cermatu, průměr 2024–2026.
          </p>
        </div>
        <div className="dp-header-actions">
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => window.print()}>
            Tisk / PDF
          </button>
          <Link to="/skoly" className="ss-btn ss-btn-secondary">
            Přidat školu
          </Link>
        </div>
      </div>

      <DecisionTabs pickCount={pickIds.size} />

      <div className="dp-table-scroll">
        <div className="dp-table" style={{ '--dp-cols': schools.length }}>
          <div className="dp-table-head">
            <div className="dp-table-head-corner" />
            {schools.map((school) => (
              <div className="dp-table-head-cell" key={school.id}>
                <div className="dp-table-head-top">
                  <Link to={`/skoly/${school.id}`} className="dp-table-head-name h">
                    {school.name}
                  </Link>
                  <button
                    type="button"
                    className="dp-table-head-remove"
                    onClick={() => handleRemove(school.id)}
                    aria-label={`Odebrat ${school.name} z porovnání`}
                  >
                    ×
                  </button>
                </div>
                <div className="ss-caption">{school.location}</div>
                {school.match_score != null && <div className="dp-pill dp-pill-accent">{Math.round(school.match_score)} % shoda</div>}
              </div>
            ))}
          </div>

          {rows.map((section) => (
            <div key={section.id} className="dp-table-section">
              <div className="dp-table-section-title">
                {section.title}
                {section.subtitle && <span className="dp-table-section-subtitle"> · {section.subtitle}</span>}
              </div>
              {section.rows.map((row) => (
                <div className="dp-table-row" key={row.id}>
                  <div className="dp-table-row-label">
                    {row.label}
                    {row.info && (
                      <span className="ss-stat-info">
                        <span className="ss-stat-tooltip">{row.info}</span>ⓘ
                      </span>
                    )}
                  </div>
                  {row.values.map((v, i) => (
                    <div className={`dp-table-cell${v.isBest ? ' is-best' : ''}${v.isMuted ? ' is-muted' : ''}`} key={schools[i].id}>
                      <strong>{v.text}</strong>
                      {v.isBest && <span className="dp-best-tag">nejlepší</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="dp-table-section">
            <div className="dp-table-section-title">
              Klady a zápory<span className="dp-table-section-subtitle"> · shrnutí z dat školy</span>
            </div>
            <div className="dp-table-row dp-table-row-proscons">
              <div className="dp-table-row-label">Klady a zápory</div>
              {schools.map((school) => (
                <div className="dp-table-cell dp-table-cell-proscons" key={school.id}>
                  <ProsCons summary={school.school_ai_summary} />
                </div>
              ))}
            </div>
          </div>

          <div className="dp-table-row dp-table-row-actions">
            <div className="dp-table-row-label" />
            {schools.map((school) => (
              <div className="dp-table-cell" key={school.id}>
                <button
                  type="button"
                  className={`ss-btn ss-btn-sm${pickIds.has(school.id) ? ' dp-btn-picked' : ' ss-btn-primary'}`}
                  onClick={() => handleAddToPicks(school)}
                >
                  {pickIds.has(school.id) ? '✓ V přihlášce' : 'Přidat do přihlášky'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="ss-caption dp-footnote">
        Hranice přijetí, míra přijetí a počty míst jsou reálná data z Cermatu (1. kolo, průměr 2024–2026, přes
        všechny obory školy). U nových škol může být období kratší. Klady a zápory jsou automatické shrnutí těchto
        dat, ne názor školy.
      </p>

      {pickIds.size > 0 && (
        <div className="dp-goto-picks">
          <button type="button" className="ss-btn ss-btn-primary" onClick={() => navigate('/prihlaska')}>
            Přejít na moji přihlášku ({pickIds.size}/3) →
          </button>
        </div>
      )}
    </div>
  );
}

export default Porovnani;
