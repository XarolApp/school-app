import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSchoolsByIds } from '../api';
import { ArrowRight, Check, Plus, X } from 'lucide-react';
import { getCompareSelection, getRecentSchoolIds, toggleCompareSelection, setCompareSelection } from '../lib/searchPrefs';
import { buildComparisonRows } from '../lib/comparisonRows';
import StatInfo from '../components/StatInfo';
import DecisionTabs from '../components/decision/DecisionTabs';
import ProsCons from '../components/decision/ProsCons';
import './decision.css';
import { SkeletonPage, Sk } from '../components/PageSkeleton';
import { readHint } from '../lib/skeletonHints';
import { usePicks } from '../lib/usePicks';

// The header and table, drawn either with data or — while loading — with the
// same rows and columns filled with grey blocks (row labels are static, the
// column count is the comparison selection), so nothing moves when data lands.
function CompareView({ schools, rows, pickIds, savingPick, onRemove, onClearAll, onAddToPicks, skeleton = false }) {
  return (
    <>
      <div className="dp-header">
        <div>
          <h1 className="ss-headline-lg h">Porovnání škol</h1>
          <p className="ss-body-md dp-subtitle">
            {schools.length} {schools.length === 1 ? 'škola' : schools.length < 5 ? 'školy' : 'škol'} vedle sebe,
            stejné řádky. Údaje o přijímačkách jsou z Cermatu podle dostupného roku každé školy.
          </p>
        </div>
        <div className="dp-header-actions">
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => window.print()}>
            Tisk / PDF
          </button>
          <Link to="/skoly" className="ss-btn ss-btn-secondary">
            Přidat školu
          </Link>
          <button type="button" className="ss-btn ss-btn-secondary dp-clear-all" onClick={onClearAll}>
            Vymazat vše
          </button>
        </div>
      </div>

      <DecisionTabs pickCount={skeleton ? readHint('picks', 0) : pickIds.size} />

      <div className="dp-table-scroll">
        <div className="dp-table" style={{ '--dp-cols': schools.length }}>
          <div className="dp-table-head">
            <div className="dp-table-head-corner" />
            {schools.map((school) => (
              <div className="dp-table-head-cell" key={school.id}>
                {skeleton ? (
                  <><Sk w="80%" h={26} /><Sk w="40%" h={16} /><Sk w={84} h={24} r="999px" /></>
                ) : (
                  <>
                    <div className="dp-table-head-top">
                      <Link to={`/skoly/${school.id}`} className="dp-table-head-name h">
                        {school.name}
                      </Link>
                      <button
                        type="button"
                        className="dp-table-head-remove"
                        onClick={() => onRemove(school.id)}
                        aria-label={`Odebrat ${school.name} z porovnání`}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                    {school.official_name && <div className="ss-caption">{school.official_name}</div>}
                    <div className="ss-caption">{school.location}</div>
                    {school.match_score != null && <div className="dp-pill dp-pill-accent">{Math.round(school.match_score)} % shoda</div>}
                  </>
                )}
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
                    {row.info && <StatInfo text={row.info} />}
                  </div>
                  {row.values.map((v, i) => (
                    <div className={`dp-table-cell${v.isBest ? ' is-best' : ''}${v.isMuted ? ' is-muted' : ''}`} key={schools[i].id}>
                      {skeleton ? <Sk w="55%" h={24} /> : <strong>{v.text}</strong>}
                      {v.tag && <span className="dp-best-tag">{v.tag}</span>}
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
                  {skeleton ? <><Sk h={14} /><Sk w="85%" h={14} /><Sk w="70%" h={14} /></> : <ProsCons summary={school.school_ai_summary} />}
                </div>
              ))}
            </div>
          </div>

          <div className="dp-table-row dp-table-row-actions">
            <div className="dp-table-row-label" />
            {schools.map((school) => (
              <div className="dp-table-cell" key={school.id}>
                {skeleton ? <Sk w={150} h={36} /> : (
                  <button
                    type="button"
                    className={`ss-btn ss-btn-sm${pickIds.has(school.id) ? ' dp-btn-picked' : ' ss-btn-primary'}`}
                    onClick={() => onAddToPicks(school)}
                    disabled={savingPick}
                  >
                    {pickIds.has(school.id) ? <><Check size={14} aria-hidden="true" /> V přihlášce</> : 'Přidat do přihlášky'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Porovnani() {
  const navigate = useNavigate();
  const [allSchools, setAllSchools] = useState([]);
  const [selection, setSelection] = useState(() => getCompareSelection());
  const { pickIds, toggle, saving: savingPick } = usePicks();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (selection.length === 0) {
      setAllSchools([]);
      setLoading(false);
      // Empty state offers the schools viewed most recently as one-tap adds.
      fetchSchoolsByIds(getRecentSchoolIds().slice(0, 3))
        .then((data) => {
          if (!cancelled) setRecent(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    } else {
      fetchSchoolsByIds(selection)
        .then((data) => {
          if (!cancelled) setAllSchools(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message || 'Nepodařilo se načíst školy.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const schools = useMemo(() => {
    const byId = new Map(allSchools.map((s) => [s.id, s]));
    return selection.map((id) => byId.get(id)).filter(Boolean);
  }, [allSchools, selection]);

  const rows = useMemo(() => (schools.length ? buildComparisonRows(schools) : []), [schools]);

  const handleRemove = (schoolId) => {
    const next = toggleCompareSelection(schoolId);
    setSelection(next);
  };

  const handleClearAll = () => {
    setSelection(setCompareSelection([]));
  };

  if (loading) {
    const stubs = selection.map((id) => ({ id }));
    return (
      <SkeletonPage className="decision-page" label="Načítám porovnání…">
        <CompareView skeleton schools={stubs} rows={buildComparisonRows(stubs)} pickIds={new Set()} />
      </SkeletonPage>
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
      <div className="decision-page">
        <div className="dp-header">
          <div>
            <p className="ss-label-caps dp-eyebrow">Rozhodování</p>
            <h1 className="ss-headline-lg h">Porovnání škol</h1>
            <p className="ss-body-md dp-subtitle">
              Až 5 škol vedle sebe, řádek po řádku: hranice bodů, kolik se hlásilo a kolik jich vzali, typ školy,
              zřizovatel i školné.
            </p>
          </div>
        </div>

        <DecisionTabs pickCount={pickIds.size} />

        <section className="dp-empty-card">
          <div className="dp-empty-copy">
            <h2 className="ss-headline-md h">Zatím tu nic není. Stačí tři kroky.</h2>
            <ol className="dp-empty-steps">
              <li>
                <span className="dp-step-num">1</span>
                <span>
                  Otevři <strong>Školy</strong> a najdi ty, které tě zajímají.
                </span>
              </li>
              <li>
                <span className="dp-step-num">2</span>
                <span>
                  U každé klikni na{' '}
                  <span className="dp-fake-btn">
                    <Plus size={14} aria-hidden="true" />
                    Přidat k porovnání
                  </span>
                </span>
              </li>
              <li>
                <span className="dp-step-num">3</span>
                <span>Vrať se sem. Počet vybraných škol uvidíš i v horní liště.</span>
              </li>
            </ol>
            <div className="dp-empty-actions">
              <Link to="/skoly" className="ss-btn ss-btn-primary dp-btn-lg">
                Projít školy
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/dotaznik">Nevíš, kde začít? Vyplň dotazník</Link>
            </div>
          </div>

          <div className="dp-ghost-table" aria-hidden="true">
            <span />
            {['1. škola', '2. škola', '3. škola'].map((label, i) => (
              <span key={label} className={`dp-ghost-slot${i === 0 ? ' is-next' : ''}`}>
                <Plus size={20} />
                {label}
              </span>
            ))}
            {['Hranice bodů', 'Přijato', 'Typ školy', 'Školné'].map((label, row) => (
              <div key={label} className="dp-ghost-row">
                <span>{label}</span>
                {[0, 1, 2].map((col) => (
                  <span key={col}>
                    <i style={{ width: `${30 + ((row * 3 + col) * 17) % 40}%` }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <section className="dp-recent">
            <h2 className="ss-headline-sm h">Naposledy prohlížené</h2>
            <div className="dp-recent-grid">
              {recent.map((school) => (
                <div key={school.id} className="dp-recent-card">
                  <div>
                    <Link to={`/skoly/${school.id}`} className="dp-recent-name">
                      {school.name}
                    </Link>
                    <div className="ss-caption">{school.location}</div>
                  </div>
                  <button
                    type="button"
                    className="ss-btn ss-btn-secondary"
                    onClick={() => setSelection(toggleCompareSelection(school.id))}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Přidat k porovnání
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="decision-page">
      <CompareView schools={schools} rows={rows} pickIds={pickIds} savingPick={savingPick}
        onRemove={handleRemove} onClearAll={handleClearAll} onAddToPicks={toggle} />

      <p className="ss-caption dp-footnote">
        Hranice přijetí, míra přijetí a počty míst jsou data z Cermatu podle dostupného roku každé školy. Hranice je rozpětí
        mezi obory školy. Rok v závorce znamená, že novější data zatím nemáme. Starší roky najdeš v grafu v detailu školy. Klady a zápory jsou automatické shrnutí těchto
        dat, ne názor školy. Údaje v části Život ve škole vycházejí z webů škol a mohou být zastaralé.
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
