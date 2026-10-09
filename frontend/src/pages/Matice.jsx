import { track } from '../lib/betaTrack';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Heart, Info, Lightbulb, Plus, TriangleAlert } from 'lucide-react';
import { fetchSchoolsByIds } from '../api';
import { getCompareSelection } from '../lib/searchPrefs';
import { useAuth } from '../components/AuthContext';
import StatInfo from '../components/StatInfo';
import {
  CRITERIA,
  scoreByWeights,
  hasMatchScores,
  matchBand,
  weakSpots,
  MATCH_GAP,
} from '../lib/decisionMatrix';
import DecisionTabs from '../components/decision/DecisionTabs';
import ConfirmDialog from '../components/ConfirmDialog';
import './decision.css';
import '../components/decision/matrixMobile.css';
import { SkeletonPage, Sk, SkLines } from '../components/PageSkeleton';
import { readHint } from '../lib/skeletonHints';
import { useDraft } from '../lib/useDraft';
import { usePicks } from '../lib/usePicks';

const LEVELS = [
  { key: 'nezalezi', label: 'Nezáleží' },
  { key: 'trochu', label: 'Trochu' },
  { key: 'dost', label: 'Dost' },
  { key: 'zasadni', label: 'Zásadní' },
];

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.key, l.label]));
const LEVEL_KEYS = new Set(LEVELS.map((level) => level.key));

const defaultWeights = () =>
  Object.fromEntries(
    CRITERIA.filter((c) => c.available).map((c) => [c.id, c.id === 'shoda' ? 'zasadni' : 'dost'])
  );

function normalizeWeights(value) {
  const defaults = defaultWeights();
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(defaults).map(([id, fallback]) => [id, LEVEL_KEYS.has(saved[id]) ? saved[id] : fallback])
  );
}

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
  if (index !== 0 || row.score == null) return null;
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
        ? 'Shoda s tebou tu vychází na nulu — a '
        : 'Shoda s tebou tu vychází slabě — a ';
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

function MaticeEmpty({ pickCount }) {
  return (
      <div className="decision-page">
        <div className="dp-header">
          <div>
            <p className="ss-label-caps dp-eyebrow">Rozhodování</p>
            <h1 className="ss-headline-lg h">Rozhodovací matice</h1>
            <p className="ss-body-md dp-subtitle">
              Nastavíš, na čem ti záleží nejvíc, a matice školy seřadí. Žádná AI, jen počty nad daty z Cermatu.
            </p>
          </div>
        </div>

        <DecisionTabs pickCount={pickCount} />

        <section className="dp-empty-card">
          <div className="dp-empty-copy">
            <h2 className="ss-headline-md h">Matice počítá se školami z porovnání</h2>
            <p className="ss-body-md">
              Teď tam nemáš žádnou. Přidej aspoň dvě, ať je co srovnávat, a pořadí se tu spočítá samo.
            </p>
            <div className="dp-empty-actions">
              <Link to="/skoly" className="ss-btn ss-btn-primary dp-btn-lg">
                Projít školy
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="dp-ghost-weights" aria-hidden="true">
            {[
              ['Šance na přijetí', 'Zásadní', 100],
              ['Shoda s tebou', 'Dost', 66],
              ['Bez školného', 'Trochu', 33],
            ].map(([label, level, pct]) => (
              <div key={label} className="dp-ghost-weight">
                <span>{label}</span>
                <span className="dp-ghost-track">
                  <i style={{ width: `${pct}%` }} />
                </span>
                <span>{level}</span>
              </div>
            ))}
            <div className="dp-ghost-podium">
              <span className="dp-ghost-slot is-next">1.</span>
              <span className="dp-ghost-slot">2.</span>
              <span className="dp-ghost-slot">3.</span>
            </div>
          </div>
        </section>
      </div>
  );
}

// Skeleton: same header, tabs and two columns; criteria names are static, so
// they are real text — only the weight bars and the ranked schools are grey.
function MaticeSkeleton({ count }) {
  return (
    <SkeletonPage className="decision-page" label="Načítám matici…">
      <div className="dp-header">
        <div>
          <h1 className="ss-headline-lg h">Rozhodovací matice</h1>
          <p className="ss-body-md dp-subtitle">
            Řekni, co je pro tebe důležité. Přepočítáme školy podle tvých vah — ne podle našeho pořadí.
          </p>
        </div>
      </div>
      <div className="dp-how">
        <span className="dp-how-toggle"><ChevronDown size={16} aria-hidden="true" /> Jak to funguje?</span>
      </div>
      <DecisionTabs pickCount={readHint('picks', 0)} />
      <div className="dp-matrix-layout">
        <div className="dp-matrix-weights">
          <div className="dp-matrix-weights-head">
            <div className="ss-headline-sm h">Co je pro tebe důležité?</div>
            <p className="ss-caption">
              Nastav každé kritérium. Co necháš na „nezáleží“, se do výpočtu vůbec nepočítá.
            </p>
          </div>
          {CRITERIA.map((c) => (
            <div className={`dp-criterion${c.id === 'shoda' ? ' dp-criterion-featured' : ''}`} key={c.id}>
              <div className="dp-criterion-head">
                <span className="dp-criterion-label">{c.id === 'shoda' && <Heart size={15} aria-hidden="true" />}{c.label}</span>
                <Sk w={56} h={14} />
              </div>
              <Sk h={32} />
              {c.id === 'shoda' && <div style={{ height: 57 }}><SkLines count={3} h={13} gap={6} last="70%" /></div>}
            </div>
          ))}
        </div>
        <div className="dp-matrix-result">
          <div className="dp-matrix-result-card">
            <div className="dp-matrix-result-head">
              <div className="ss-headline-sm h">Pořadí podle tvých vah</div>
              <p className="ss-caption dp-matrix-result-sub">
                Procenta ukazují skutečný podíl; počty jsou vůči nejvyšší hodnotě mezi vybranými školami.
              </p>
            </div>
            {Array.from({ length: count }, (_, i) => (
              <div className="dp-matrix-row" key={i}>
                <Sk w={32} h={32} r="50%" />
                <div className="dp-matrix-row-body">
                  <div className="dp-matrix-row-head"><Sk w="55%" h={26} /></div>
                  <div className="dp-crit-list">{Array.from({ length: 7 }, (_, j) => <Sk key={j} h={20} />)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}

function Matice() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [allSchools, setAllSchools] = useState([]);
  const [selection] = useState(() => getCompareSelection());
  const { pickIds, toggle: togglePick, saving: savingPick } = usePicks();
  const pickCount = pickIds.size;
  // The criteria weights survive a reload (this tab only).
  const [weights, setWeights] = useDraft('snm.matice.weights', defaultWeights);
  const normalizedWeights = useMemo(() => normalizeWeights(weights), [weights]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Set to the level the user just clicked while the "are you sure" prompt for
  // moving shoda off Zásadní is open; null when no prompt is showing.
  const [confirmShodaLevel, setConfirmShodaLevel] = useState(null);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const schools = useMemo(() => {
    const byId = new Map(allSchools.map((s) => [s.id, s]));
    return selection.map((id) => byId.get(id)).filter(Boolean);
  }, [allSchools, selection]);

  const matchAvailable = hasMatchScores(schools);

  const ranked = useMemo(
    () => (schools.length ? scoreByWeights(schools, normalizedWeights) : []),
    [schools, normalizedWeights]
  );

  useEffect(() => {
    if (JSON.stringify(weights) !== JSON.stringify(normalizedWeights)) setWeights(normalizedWeights);
  }, [weights, normalizedWeights, setWeights]);

  const setWeight = (criterionId, level) => {
    track('matrix_weight', { criterion: criterionId, level });
    setWeights((prev) => ({ ...normalizeWeights(prev), [criterionId]: level }));
  };

  // Shoda defaults to Zásadní because it is the one criterion here that knows
  // the student's own answers, not just hard data about the school — moving
  // it OFF Zásadní is a real decision, not a misclick, so that one transition
  // gets a confirmation. Any other change (nezalezi -> trochu, dost -> trochu,
  // clicking the level that's already selected, ...) applies instantly like
  // every other criterion — only leaving zasadni is guarded.
  const handleShodaClick = (level) => {
    if (level === normalizedWeights.shoda || normalizedWeights.shoda !== 'zasadni') {
      setWeight('shoda', level);
      return;
    }
    setConfirmShodaLevel(level);
  };

  const confirmShodaChange = () => {
    setWeight('shoda', confirmShodaLevel);
    setConfirmShodaLevel(null);
  };

  if (loading) {
    // Nothing selected for comparison: the page can only be the empty state.
    return selection.length ? <MaticeSkeleton count={selection.length} /> : <MaticeEmpty pickCount={readHint('picks', 0)} />;
  }

  if (error) {
    return (
      <div className="decision-page">
        <p className="ss-body-md">{error}</p>
      </div>
    );
  }

  if (!schools.length) return <MaticeEmpty pickCount={pickCount} />;

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

      <div className="dp-how">
        <button
          type="button"
          className="dp-how-toggle"
          aria-expanded={howOpen}
          onClick={() => setHowOpen((v) => !v)}
        >
          <ChevronDown size={16} aria-hidden="true" className={howOpen ? 'is-open' : ''} />
          Jak to funguje?
        </button>
        {howOpen && (
          <div className="dp-how-body">
            <p>
              Procenta (shoda, přijetí a maturita) ukazují skutečný podíl. Počet míst a jazyků se škáluje
              podle nejvyšší hodnoty mezi vybranými školami — její proužek dosáhne na konec. Nulová hodnota
              má prázdný proužek.
            </p>
            <p>
              Ty pak řekneš, jak moc na každém kritériu záleží — <strong>Nezáleží</strong> (nepočítá se
              vůbec), <strong>Trochu</strong>, <strong>Dost</strong> nebo <strong>Zásadní</strong>. Kritérium
              nastavené na Zásadní má na výsledné pořadí přibližně{' '}
              <strong>třikrát větší váhu</strong> než kritérium na Trochu — čím výš váhu nastavíš, tím víc to
              kritérium posouvá pořadí školy nahoru nebo dolů.
            </p>
            <p>
              Škola s nejvyšším součtem (proužek × váha, sečteno přes všechna kritéria) skončí na prvním
              místě. Kritérium, u kterého chybí data pro alespoň jednu z porovnávaných škol, se do součtu
              vůbec nezapočítává — u nikoho, aby to nikoho nezvýhodnilo ani neznevýhodnilo.
            </p>
            <p>
              Žádná AI v tom nefiguruje — je to obyčejná matematika nad daty z Cermatu (a nad tvým
              dotazníkem, pokud ho máš vyplněný). Pořadí se přepočítá okamžitě po každé změně váhy, takže
              si klidně zkoušej různá nastavení.
            </p>
          </div>
        )}
      </div>

      <DecisionTabs pickCount={pickCount} />

      <div className="dp-matrix-layout">
        <div className="dp-matrix-weights" id="vahy">
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
                <StatInfo text={shodaCriterion.tooltip} />
              </span>
              <span className="ss-caption dp-criterion-state">
                {matchAvailable ? LEVEL_LABEL[normalizedWeights.shoda] : 'Nevyplněno'}
              </span>
            </div>
            <div className="dp-segmented">
              {LEVELS.map((level) => (
                <button
                  type="button"
                  key={level.key}
                  className={`dp-segment${matchAvailable && normalizedWeights.shoda === level.key ? ' is-on' : ''}`}
                  disabled={!matchAvailable}
                  onClick={() => handleShodaClick(level.key)}
                >
                  {level.label}
                </button>
              ))}
            </div>
            {matchAvailable ? (
              <p className="ss-caption dp-criterion-note">
                Z tvých odpovědí v dotazníku. <strong>Doporučujeme nechat na „Zásadní“</strong> — je to
                pravděpodobně nejdůležitější kritérium z celé matice, protože jediné zná tebe, ne jen školu.
              </p>
            ) : isSignedIn ? (
              <p className="ss-caption dp-criterion-note">
                Shodu s tebou počítáme z úvodního dotazníku. Jakmile ho máš uložený u účtu, doplní se tady sama.
              </p>
            ) : (
              <p className="ss-caption dp-criterion-note">
                Shodu s tebou počítáme z tvého dotazníku. <Link to="/prihlaseni">Přihlas se</Link> a doplní se sama.
              </p>
            )}
          </div>

          {otherCriteria.map((c) => (
            <div className="dp-criterion" key={c.id}>
              <div className="dp-criterion-head">
                <span className="dp-criterion-label">
                  {c.label}
                  <StatInfo text={c.tooltip} />
                </span>
                <span className="ss-caption">
                  {LEVEL_LABEL[normalizedWeights[c.id]]}
                </span>
              </div>
              <div className="dp-segmented">
                {LEVELS.map((level) => (
                  <button
                    type="button"
                    key={level.key}
                    className={`dp-segment${normalizedWeights[c.id] === level.key ? ' is-on' : ''}`}
                    onClick={() => setWeight(c.id, level.key)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="dp-matrix-result">
          <div className="dp-matrix-result-card">
            <div className="dp-matrix-result-head">
              <div className="ss-headline-sm h">Pořadí podle tvých vah</div>
              <p className="ss-caption dp-matrix-result-sub">
                Procenta ukazují skutečný podíl; počty jsou vůči nejvyšší hodnotě mezi vybranými školami.
              </p>
            </div>
            {/* Shown only when the columns stack (ranking first): jump to the weights. */}
            <a href="#vahy" className="dp-matrix-jump">Nastavit váhy ↓</a>

            {ranked.every((r) => r.breakdown.length === 0) ? (
              <p className="ss-body-md dp-matrix-empty">
                Nastav aspoň jedno kritérium na víc než „nezáleží“ a spočítáme pořadí.
              </p>
            ) : (
              <>
                {ranked.every((r) => r.score == null) && (
                  <p className="ss-body-md dp-matrix-empty">
                    Vybraná kritéria zatím nemají údaje u všech škol, takže pořadí nejde spočítat.
                  </p>
                )}
              {ranked.map((r, i) => {
                const band = typeof r.school.match_score === 'number' ? matchBand(r.school.match_score) : null;
                return (
                  <div className="dp-matrix-row" key={r.school.id}>
                    <div className={`dp-matrix-rank-badge${i === 0 && r.score != null ? ' is-first' : ''}`}>{r.score == null ? '—' : i + 1}</div>
                    <div className="dp-matrix-row-body">
                      <div className="dp-matrix-row-head">
                        <Link to={`/skoly/${r.school.id}`} className="h dp-matrix-name">
                          {r.school.name}
                        </Link>
                        {r.school.official_name && (
                          <div className="ss-caption">{r.school.official_name}</div>
                        )}
                        {band && (
                          <span className={`dp-match-chip dp-match-chip-${band.tone}`}>
                            {band.label} · {Math.round(r.school.match_score)} %
                          </span>
                        )}
                      </div>

                      {r.breakdown.length > 0 && (
                        <div className="dp-crit-list">
                          {r.breakdown.map((b) => (
                            <div className="dp-crit-item" key={b.criterionId}>
                              <div className="dp-crit-row">
                                <div className={`dp-crit-label${b.criterionId === 'shoda' ? ' is-featured' : ''}`}>
                                  <span className="dp-crit-label-text">
                                    {b.label}
                                    <StatInfo text={CRITERIA.find((c) => c.id === b.criterionId)?.tooltip} />
                                  </span>
                                  <span className={`dp-crit-weight${b.weightKey === 'zasadni' ? ' is-hi' : ''}`}>
                                    {LEVEL_LABEL[b.weightKey]}
                                  </span>
                                </div>
                                {b.raw == null ? <span aria-hidden="true" /> : (
                                  <div className="dp-crit-track">
                                    <div className="dp-crit-fill" style={{ width: `${b.raw * 100}%` }} />
                                  </div>
                                )}
                                <span className={`dp-crit-value${b.raw == null ? ' is-missing' : ''}`}>{b.display}</span>
                              </div>
                              {!b.included && (
                                <p className="dp-crit-excluded">Do pořadí se nepočítá — chybí u některé školy.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {gapNote(r, i, ranked)}
                      {weakNote(r, ranked)}
                      <button
                        type="button"
                        className={`ss-btn ss-btn-secondary ss-btn-sm dp-matrix-pick${pickIds.has(r.school.id) ? ' dp-btn-picked' : ''}`}
                        aria-label={pickIds.has(r.school.id) ? `Odebrat ${r.school.name} z přihlášky` : `Přidat ${r.school.name} do přihlášky`}
                        disabled={savingPick}
                        onClick={() => togglePick(r.school)}
                      >
                        {pickIds.has(r.school.id) ? <><Check size={14} aria-hidden="true" /> V přihlášce</> : <><Plus size={14} aria-hidden="true" /> Přidat do přihlášky</>}
                      </button>
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </div>

          <div className="dp-matrix-callout">
            <Lightbulb size={18} aria-hidden="true" />
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
            Výpočet je obyčejná matematika nad daty z Cermatu a tvého dotazníku — žádná AI. Procenta ukazují
            skutečné hodnoty a počty se porovnávají s nejvyšší hodnotou ve výběru. Kritérium s chybějícími údaji
            zůstane viditelné, ale do pořadí se nezapočítá u žádné školy.
          </p>
        </div>
      </div>

      {confirmShodaLevel && (
        <ConfirmDialog
          icon={<TriangleAlert size={22} aria-hidden="true" />}
          title={`Opravdu chceš přepnout shodu s tebou na „${LEVEL_LABEL[confirmShodaLevel]}“?`}
          cancelLabel="Nechat na Zásadní"
          confirmLabel={`Přepnout na „${LEVEL_LABEL[confirmShodaLevel]}“`}
          onCancel={() => setConfirmShodaLevel(null)}
          onConfirm={confirmShodaChange}
        >
          <p className="ss-body-sm">
            Doporučujeme nechat shodu s tebou na <strong>Zásadní</strong> — je to jediné kritérium tady,
            které vychází z tvých vlastních odpovědí, ne jen z dat o škole.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default Matice;
