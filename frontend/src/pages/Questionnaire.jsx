import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ClipboardCheck, Info, RotateCcw } from 'lucide-react';
import {
  fetchQuestionnaire,
  submitQuestionnaire,
  renameQuestionnaireRun,
  setDefaultQuestionnaireRun,
  archiveQuestionnaireRun,
} from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import DistrictMap from '../components/onboarding/DistrictMap';
import './questionnaire.css';

/**
 * The standalone questionnaire (lib/questionnaire.js on the server) — separate
 * from the onboarding quiz, see CLAUDE.md. Four views on one page, driven by
 * what GET /api/questionnaire returns:
 *
 *   empty    — the account has no run yet
 *   results  — the default run's top 10 with reasoning, expandable to the full
 *              ranking of every school in the database
 *   history  — every run: rename, set as default, archive
 *   form     — the questions (reached from "Vyplnit znovu" or the empty state)
 *
 * The score is a percentage here on purpose (the onboarding quiz shows bands):
 * with ~220 schools, bands would lump huge groups together and lose the
 * 98 % vs 83 % difference.
 *
 * Sentences are written by a model at submission time only. A run saved
 * without one never gets one later, so the copy never promises it will fill in.
 */

const TOP_COUNT = 10;
const LABEL_MAX = 60;

// Mirrors questionApplies in lib/questionnaire.js — kept tiny since no
// question currently sets showIf, but the server contract allows it.
function questionApplies(question, answers) {
  return !question.showIf || answers[question.showIf.field] === question.showIf.equals;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

// The server stores no label for an unnamed run, so it falls back to its date.
function runName(run) {
  return run.label || `Sada z ${formatDate(run.created_at)}`;
}

function answeredCount(answers) {
  return Object.values(answers || {}).filter((v) => (Array.isArray(v) ? v.length : v != null && v !== '')).length;
}

function runMeta(run, total) {
  const origin = run.source === 'onboarding' ? ' · z úvodu do aplikace' : '';
  return `${formatDate(run.created_at)}${origin} · ${answeredCount(run.answers)} z ${total} odpovědí`;
}

function MatchRow({ match, rank, compact }) {
  const school = match.school;
  const signals = Array.isArray(match.signals) ? match.signals : [];

  return (
    <li className="qz-row">
      <div className="qz-row-score">
        <span className="qz-rank">{rank}.</span>
        <span className="qz-pct">{Math.round(match.score)} %</span>
        <span className="qz-pct-label">shoda</span>
      </div>
      <div className="qz-row-body">
        <Link className="qz-school" to={`/skoly/${match.school_id}`}>
          {school?.name || `Škola #${match.school_id}`}
        </Link>
        {school?.district && <div className="qz-meta">{school.district}</div>}
        {!compact && match.reason && <p className="qz-reason">{match.reason}</p>}
        {!compact && !match.reason && signals.length > 0 && (
          <p className="qz-reason qz-reason-quiet">Shoda podle: {signals.join(' · ')}</p>
        )}
      </div>
    </li>
  );
}

function Results({ active, runCount, onRetake, onOpenHistory }) {
  const [showAll, setShowAll] = useState(false);
  const matches = active.matches ?? [];
  const top = matches.slice(0, TOP_COUNT);
  const rest = matches.slice(TOP_COUNT);
  const hasSentences = top.some((m) => m.reason);

  return (
    <>
      <div className="qz-runbar">
        <div className="qz-runbar-main">
          <div className="qz-runbar-title">
            <span className="ss-headline-sm h">{runName(active)}</span>
            <span className="qz-badge">Výchozí</span>
          </div>
          <div className="ss-caption qz-muted">
            Vyplněno {formatDate(active.created_at)}
            {active.source === 'onboarding' ? ' · z úvodu do aplikace' : ''}
          </div>
        </div>
        <button type="button" className="qz-link" onClick={onOpenHistory}>
          Moje sady odpovědí ({runCount})
        </button>
      </div>

      <div className="qz-note">
        <Info size={18} aria-hidden="true" />
        <p className="ss-body-sm">
          Dotazník nemusíš vyplňovat víckrát. Výsledek se zlepší tím, že odpovíš popravdě — ne tím, že ho
          zopakuješ. Pořadí se samo přepočítává, když do databáze přibudou nová data o školách.
        </p>
      </div>

      {!hasSentences && (
        <div className="qz-note qz-note-strong">
          <Info size={18} aria-hidden="true" />
          <div>
            <div className="qz-note-title">U téhle sady chybí slovní zdůvodnění</div>
            <p className="ss-body-sm">
              Píše ho jazykový model při odeslání dotazníku a ten nebyl dostupný. Procenta i důvody shody u škol
              počítá aplikace sama a jsou úplné.
            </p>
          </div>
        </div>
      )}

      <div className="qz-section-head">
        <h2 className="ss-headline-md h">Nejlepší shoda</h2>
        <span className="ss-caption qz-muted">
          Prvních {top.length} z {matches.length} škol
        </span>
      </div>

      <ol className="qz-list">
        {top.map((m, i) => (
          <MatchRow key={m.school_id} match={m} rank={i + 1} />
        ))}
        {showAll &&
          rest.map((m, i) => <MatchRow key={m.school_id} match={m} rank={TOP_COUNT + i + 1} compact />)}
      </ol>

      <div className="qz-actions">
        {rest.length > 0 ? (
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Skrýt zbytek pořadí' : `Zobrazit celé pořadí (všech ${matches.length} škol)`}
            {showAll ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="ss-btn ss-btn-primary" onClick={onRetake}>
          Vyplnit znovu
        </button>
      </div>
    </>
  );
}

function RunRow({ run, isCurrent, total, busy, onSetDefault, onArchive, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(run.label || '');
  const archived = Boolean(run.archived_at);

  const save = async () => {
    const ok = await onRename(run.id, draft);
    if (ok) setEditing(false);
  };

  return (
    <li className={`qz-run${isCurrent ? ' is-current' : ''}${archived ? ' is-archived' : ''}`}>
      <div className="qz-run-main">
        {editing ? (
          <>
            <label className="qz-field-label" htmlFor={`run-name-${run.id}`}>
              Název sady
            </label>
            <input
              id={`run-name-${run.id}`}
              className="input qz-name-input"
              type="text"
              value={draft}
              maxLength={LABEL_MAX}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) save();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <div className="ss-caption qz-muted">
              {runMeta(run, total)} · zbývá {LABEL_MAX - draft.length} znaků
            </div>
          </>
        ) : (
          <>
            <div className="qz-run-title">
              <span className="qz-run-name">{runName(run)}</span>
              {isCurrent && <span className="qz-badge">Výchozí</span>}
              {archived && <span className="qz-badge qz-badge-quiet">Archivováno</span>}
            </div>
            <div className="ss-caption qz-muted">{runMeta(run, total)}</div>
          </>
        )}
      </div>

      <div className="qz-run-actions">
        {editing ? (
          <>
            <button type="button" className="ss-btn ss-btn-secondary ss-btn-sm" onClick={() => setEditing(false)}>
              Zrušit
            </button>
            <button type="button" className="ss-btn ss-btn-primary ss-btn-sm" disabled={busy} onClick={save}>
              Uložit název
            </button>
          </>
        ) : (
          <>
            {!isCurrent && !archived && (
              <button type="button" className="ss-btn ss-btn-secondary ss-btn-sm" disabled={busy} onClick={() => onSetDefault(run.id)}>
                Nastavit jako výchozí
              </button>
            )}
            {!archived && (
              <button
                type="button"
                className="ss-btn ss-btn-secondary ss-btn-sm"
                onClick={() => {
                  setDraft(run.label || '');
                  setEditing(true);
                }}
              >
                Přejmenovat
              </button>
            )}
            <button
              type="button"
              className="ss-btn ss-btn-secondary ss-btn-sm"
              disabled={busy || isCurrent}
              onClick={() => onArchive(run.id, !archived)}
            >
              {archived ? 'Vrátit z archivu' : 'Archivovat'}
            </button>
          </>
        )}
      </div>
      {isCurrent && !editing && (
        <p className="ss-caption qz-muted qz-run-hint">Výchozí sadu nejde archivovat. Nejdřív nastav jako výchozí jinou.</p>
      )}
    </li>
  );
}

function History({ runs, currentId, total, error, busyId, onBack, onSetDefault, onArchive, onRename }) {
  // Current first, then the rest newest-first, archived last.
  const ordered = [...runs].sort((a, b) => {
    const rank = (r) => (r.id === currentId ? 0 : r.archived_at ? 2 : 1);
    return rank(a) - rank(b) || new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <>
      <div className="qz-head">
        <button type="button" className="qz-link" onClick={onBack}>
          ← Zpět na výsledky
        </button>
        <h1 className="ss-headline-lg h">Moje sady odpovědí</h1>
        <p className="ss-body-md qz-subtitle">
          Výchozí sada rozhoduje o procentech shody všude v aplikaci — u škol, v porovnání i v rozhodovací
          matici. Přepnout ji můžeš kdykoli.
        </p>
      </div>

      {error && <p className="qz-error" role="alert">{error}</p>}

      <ul className="qz-runs">
        {ordered.map((run) => (
          <RunRow
            key={run.id}
            run={run}
            isCurrent={run.id === currentId}
            total={total}
            busy={busyId !== null}
            onSetDefault={onSetDefault}
            onArchive={onArchive}
            onRename={onRename}
          />
        ))}
      </ul>

      <div className="qz-note">
        <Info size={18} aria-hidden="true" />
        <p className="ss-body-sm">
          Starší sadu klidně nech jako výchozí, pokud ti její výsledky sedí víc. Novější neznamená přesnější —
          rozhoduje to, jak popravdě jsi odpovídal.
        </p>
      </div>
    </>
  );
}

function Questionnaire() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [view, setView] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmRetake, setConfirmRetake] = useState(false);
  const [afterSubmit, setAfterSubmit] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetchQuestionnaire();
    setState({ loading: false, error: null, data });
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchQuestionnaire()
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, error: null, data });
        setView(data.active ? 'results' : 'empty');
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, error: err.message || 'Dotazník se nepodařilo načíst.', data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const setSingle = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const toggleMulti = (id, value, max) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? prev[id] : [];
      const has = current.includes(value);
      if (has) return { ...prev, [id]: current.filter((v) => v !== value) };
      if (current.length >= max) return prev;
      return { ...prev, [id]: [...current, value] };
    });
  };

  const setText = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Captured BEFORE submitting: once the new run is saved it becomes the
    // default and the old one is no longer flagged anywhere.
    const { active, runs } = state.data;
    const previous = active ? runs.find((r) => r.id === active.id) ?? active : null;

    try {
      await submitQuestionnaire(answers);
      await refresh();
      setAnswers({});
      setView('results');
      if (previous) setAfterSubmit({ previous });
    } catch (err) {
      setSubmitError(err.message || 'Odeslání se nepodařilo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id) => {
    setBusyId(id);
    setHistoryError(null);
    try {
      await setDefaultQuestionnaireRun(id);
      await refresh();
    } catch (err) {
      setHistoryError(err.message || 'Výchozí sadu se nepodařilo změnit.');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (id, archived) => {
    setBusyId(id);
    setHistoryError(null);
    try {
      await archiveQuestionnaireRun(id, archived);
      await refresh();
    } catch (err) {
      setHistoryError(err.message || 'Sadu se nepodařilo archivovat.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRename = async (id, label) => {
    setBusyId(id);
    setHistoryError(null);
    try {
      await renameQuestionnaireRun(id, label);
      await refresh();
      return true;
    } catch (err) {
      setHistoryError(err.message || 'Název se nepodařilo uložit.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const keepPrevious = async () => {
    setSwitching(true);
    try {
      await setDefaultQuestionnaireRun(afterSubmit.previous.id);
      await refresh();
    } catch (err) {
      setHistoryError(err.message || 'Výchozí sadu se nepodařilo změnit.');
    } finally {
      setSwitching(false);
      setAfterSubmit(null);
    }
  };

  if (state.loading) {
    return (
      <div className="qz-page">
        <p className="ss-body-md">Načítám…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="qz-page">
        <h1 className="ss-headline-lg h">Dotazník</h1>
        <p className="ss-body-md">{state.error}</p>
      </div>
    );
  }

  const { questions, active, runs } = state.data;
  const total = questions.filter((q) => questionApplies(q, {})).length;

  return (
    <div className={`qz-page${view === 'form' ? ' qz-page-narrow' : ''}`}>
      {view === 'empty' && (
        <>
          <h1 className="ss-headline-lg h">Tvůj dotazník</h1>
          <div className="qz-empty">
            <div className="qz-empty-icon">
              <ClipboardCheck size={26} aria-hidden="true" />
            </div>
            <h2 className="ss-headline-md h">Zatím nemáš vyplněný dotazník</h2>
            <p className="ss-body-md">
              Deset otázek, zabere to pár minut. Podle odpovědí ti spočítáme shodu se všemi pražskými školami a u
              prvních deseti vysvětlíme, proč zrovna ony.
            </p>
            <p className="qz-empty-tip">
              Odpovídej popravdě, ne podle toho, co zní dobře. Kde je možnost „nevím“, klidně ji vyber. Nepovinnou
              otázku můžeš přeskočit a shodu ti to nesníží.
            </p>
            <button type="button" className="ss-btn ss-btn-primary qz-cta" onClick={() => setView('form')}>
              Vyplnit dotazník
            </button>
          </div>
        </>
      )}

      {view === 'results' && active && (
        <>
          <div className="qz-head">
            <h1 className="ss-headline-lg h">Tvůj dotazník</h1>
            <p className="ss-body-md qz-subtitle">
              Podle tvých odpovědí počítáme procentuální shodu se všemi pražskými školami. Tahle sada se používá i
              u škol a v <Link to="/porovnani/matice">rozhodovací matici</Link>.
            </p>
          </div>
          {historyError && <p className="qz-error" role="alert">{historyError}</p>}
          <Results
            active={active}
            runCount={runs.length}
            onRetake={() => setConfirmRetake(true)}
            onOpenHistory={() => {
              setHistoryError(null);
              setView('history');
            }}
          />
        </>
      )}

      {view === 'history' && (
        <History
          runs={runs}
          currentId={active?.id}
          total={total}
          error={historyError}
          busyId={busyId}
          onBack={() => setView('results')}
          onSetDefault={handleSetDefault}
          onArchive={handleArchive}
          onRename={handleRename}
        />
      )}

      {view === 'form' && (
        <>
          {active && (
            <button type="button" className="qz-link" onClick={() => setView('results')}>
              ← Zpět na výsledky
            </button>
          )}
          <h1 className="ss-headline-lg h">Dotazník</h1>
          <p className="ss-body-md qz-subtitle">
            Odpovídej popravdě — vyplnit ho víckrát nepomůže, pomůže jen upřímnost. Otázky označené jako nepovinné
            můžeš přeskočit a shodu ti to nesníží.
          </p>

          <form className="qz-form" onSubmit={handleSubmit}>
            {questions
              .filter((q) => questionApplies(q, answers))
              .map((q) => (
                <div className="field qz-question" key={q.id}>
                  <div className="field-label">
                    {q.label}
                    {q.optional && <span className="qz-optional"> (nepovinné)</span>}
                  </div>
                  {q.hint && <p className="field-hint">{q.hint}</p>}

                  {q.type === 'text' && (
                    <textarea
                      className="input qz-textarea"
                      maxLength={q.maxLength}
                      value={answers[q.id] || ''}
                      onChange={(e) => setText(q.id, e.target.value)}
                    />
                  )}

                  {q.type === 'single' && (
                    <div className="qz-options">
                      {q.options.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          className={`qz-option${answers[q.id] === opt.value ? ' is-on' : ''}`}
                          onClick={() => setSingle(q.id, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'multi' && (
                    <>
                      {q.map === 'praha-obvody' && (
                        <DistrictMap
                          selected={(answers[q.id] || []).map((value) => value.replace(/^Praha\s+/, ''))}
                          max={q.max}
                          onToggle={(district) => toggleMulti(q.id, `Praha ${district}`, q.max)}
                        />
                      )}
                      <div className="qz-options">
                        {q.options.map((opt) => {
                          const selected = Array.isArray(answers[q.id]) && answers[q.id].includes(opt.value);
                          return (
                            <button
                              type="button"
                              key={opt.value}
                              className={`qz-option${selected ? ' is-on' : ''}`}
                              onClick={() => toggleMulti(q.id, opt.value, q.max)}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}

            {submitError && <p className="qz-error" role="alert">{submitError}</p>}

            <button type="submit" className="ss-btn ss-btn-primary" disabled={submitting}>
              {submitting ? 'Počítám…' : 'Spočítat shodu'}
            </button>
          </form>
        </>
      )}

      {confirmRetake && (
        <ConfirmDialog
          icon={<RotateCcw size={22} aria-hidden="true" />}
          title="Vyplnit dotazník znovu?"
          cancelLabel="Nechat tu současnou"
          confirmLabel="Vyplnit znovu"
          onCancel={() => setConfirmRetake(false)}
          onConfirm={() => {
            setConfirmRetake(false);
            setAnswers({});
            setSubmitError(null);
            setView('form');
          }}
        >
          <p className="ss-body-md">
            Nová sada se stane výchozí a procenta shody se všude přepočítají. Ta stará se nikam neztratí — najdeš
            ji v sadách odpovědí a můžeš se k ní kdykoli vrátit.
          </p>
          <p className="qz-dialog-tip">
            Opakované vyplnění samo o sobě lepší školy nenajde. Pomůže jedině to, když odpovíš popravdě — i když je
            odpověď „nevím“.
          </p>
        </ConfirmDialog>
      )}

      {afterSubmit && active && (
        <ConfirmDialog
          icon={<ClipboardCheck size={22} aria-hidden="true" />}
          title="Hotovo — máš nové výsledky"
          cancelLabel="Vrátit se k předchozí"
          confirmLabel="Zobrazit výsledky"
          busy={switching}
          onCancel={keepPrevious}
          onConfirm={() => setAfterSubmit(null)}
          onDismiss={() => setAfterSubmit(null)}
        >
          <p className="ss-body-md">
            Nová sada je teď výchozí, takže procenta shody u škol, v porovnání i v matici počítáme z ní. Jestli ti
            víc seděla ta předchozí, přepni zpátky — obě zůstávají uložené.
          </p>
          <ul className="qz-dialog-runs">
            <li className="qz-dialog-run is-new">
              <span className="qz-dialog-run-name">{runName(active)}</span>
              <span className="ss-caption qz-muted">právě teď · nová</span>
            </li>
            <li className="qz-dialog-run">
              <span className="qz-dialog-run-name">{runName(afterSubmit.previous)}</span>
              <span className="ss-caption qz-muted">{formatDate(afterSubmit.previous.created_at)}</span>
            </li>
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default Questionnaire;
