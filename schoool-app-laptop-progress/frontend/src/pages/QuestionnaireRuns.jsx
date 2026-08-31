import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronDown, Archive, ArchiveRestore } from 'lucide-react';
import {
  fetchQuestionnaire,
  setDefaultRun,
  setRunArchived,
} from '../api';
import { useToast } from '../components/ToastContext';
import {
  describeAnswers,
  digestAnswers,
  formatRunDate,
  runTitle,
} from '../lib/answerSummary';

/**
 * Every set of answers this account has completed.
 *
 * The list's job is orientation: with eight sets, a column of identical dates is
 * useless, so each row leads with its name and a digest of its own answers. That
 * digest is what actually differs between two sets, and it is built in the
 * browser from data already on the page — see lib/answerSummary.js for why no
 * percentage appears here.
 */
function RunRow({ questions, run, onDefault, onArchive, busy, index }) {
  const [open, setOpen] = useState(false);

  const digest = useMemo(() => digestAnswers(questions, run.answers), [questions, run.answers]);
  const answers = useMemo(
    () => (open ? describeAnswers(questions, run.answers) : []),
    [open, questions, run.answers]
  );

  const archived = Boolean(run.archived_at);

  return (
    <li
      className={`run-row${run.is_default ? ' is-default' : ''}${archived ? ' is-archived' : ''}`}
      style={{ '--stagger': Math.min(index, 7) }}
    >
      <div className="run-row-head">
        <div className="run-row-main">
          <div className="run-row-title-line">
            <Link to={`/dotaznik/sady/${run.id}`} className="run-row-title">
              {runTitle(run)}
            </Link>
            {run.is_default && (
              <span className="badge run-badge">
                <Star
                  className="meta-icon"
                  aria-hidden="true"
                  strokeWidth={1.75}
                  fill="currentColor"
                />
                Výchozí
              </span>
            )}
            {archived && <span className="tag run-row-archived-tag">Archivováno</span>}
          </div>

          <p className="run-row-date">{formatRunDate(run.created_at)}</p>
          {digest && <p className="run-row-digest">{digest}</p>}
        </div>

        <div className="run-row-actions">
          {!run.is_default && !archived && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onDefault(run)}
              disabled={busy}
            >
              {busy && <span className="btn-spinner" aria-hidden="true" />}
              Nastavit jako výchozí
            </button>
          )}

          <Link to={`/dotaznik/sady/${run.id}`} className="btn btn-ghost btn-sm">
            Výsledky
          </Link>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onArchive(run, !archived)}
            disabled={busy}
            title={
              run.is_default
                ? 'Nejdřív nastav jako výchozí jinou sadu'
                : undefined
            }
          >
            {archived ? (
              <ArchiveRestore className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
            ) : (
              <Archive className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
            )}
            {archived ? 'Vrátit' : 'Archivovat'}
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`run-row-toggle${open ? ' is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <ChevronDown className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
        {open ? 'Skrýt odpovědi' : 'Zobrazit odpovědi'}
      </button>

      {open && (
        <dl className="answer-list">
          {answers.map((entry) => (
            <div className="answer-item" key={entry.id}>
              <dt className="answer-term">{entry.label}</dt>
              <dd className="answer-value">{entry.values.join(', ')}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function QuestionnaireRuns() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestionnaire()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const questions = data?.questions ?? [];
  const runs = data?.runs ?? [];

  // Default first, then newest. Pinning a set to the top is the point — it is
  // the one whose answers are shaping every percentage the student sees, so
  // hunting for it down a date-ordered list would be the wrong way round.
  const visible = useMemo(() => {
    const pool = runs.filter((run) => showArchived || !run.archived_at);
    return [...pool].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [runs, showArchived]);

  const archivedCount = runs.filter((run) => run.archived_at).length;

  const patchRun = (id, changes) =>
    setData((current) => ({
      ...current,
      runs: current.runs.map((run) => (run.id === id ? { ...run, ...changes } : run)),
    }));

  const handleDefault = async (run) => {
    setBusyId(run.id);
    try {
      await setDefaultRun(run.id);
      // Every other set loses the flag, not just the one that had it — the
      // server enforces one default, and mirroring that here keeps the list from
      // briefly showing two.
      setData((current) => ({
        ...current,
        runs: current.runs.map((entry) => ({
          ...entry,
          is_default: entry.id === run.id,
        })),
      }));
      toast(`Shody se teď počítají podle „${runTitle(run)}“`);
    } catch (err) {
      toast(err.message || 'Sadu se nepodařilo nastavit jako výchozí', {
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (run, archived) => {
    setBusyId(run.id);
    try {
      const saved = await setRunArchived(run.id, archived);
      patchRun(run.id, { archived_at: saved.archived_at });
      toast(archived ? 'Sada přesunuta do archivu' : 'Sada vrácena z archivu');
    } catch (err) {
      toast(err.message || 'Sadu se nepodařilo archivovat', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám sady odpovědí…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page page-questionnaire">
        <div className="questionnaire-layout">
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Sady se nepodařilo načíst</span>
            <p className="notice-text">
              Zkontroluj, že běží backend na portu 5000. Detail chyby: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-questionnaire">
      <div className="questionnaire-layout">
        <div className="page-header">
          <p className="eyebrow">Dotazník</p>
          <h1>Moje sady odpovědí</h1>
          <p className="lede">
            Každé vyplnění dotazníku je jedna sada odpovědí a zůstává ti tady.
            Jednu z nich máš nastavenou jako <strong>výchozí</strong> — podle té
            se počítají procenta shody u všech škol v aplikaci. Přepnout ji můžeš
            kdykoliv.
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="empty-state">
            <h3>Zatím tu nic není</h3>
            <p className="lede">
              Vyplň dotazník a tvoje odpovědi se sem uloží.
            </p>
            <Link to="/dotaznik" className="btn btn-primary btn-sm">
              Vyplnit dotazník
            </Link>
          </div>
        ) : (
          <>
            <ul className="run-list">
              {visible.map((run, index) => (
                <RunRow
                  key={run.id}
                  questions={questions}
                  run={run}
                  index={index}
                  onDefault={handleDefault}
                  onArchive={handleArchive}
                  busy={busyId === run.id}
                />
              ))}
            </ul>

            <div className="questionnaire-actions">
              <Link to="/dotaznik" className="btn btn-secondary btn-sm">
                Vyplnit další dotazník
              </Link>
              {archivedCount > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowArchived((current) => !current)}
                >
                  {showArchived
                    ? 'Skrýt archivované'
                    : `Zobrazit archivované (${archivedCount})`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default QuestionnaireRuns;
