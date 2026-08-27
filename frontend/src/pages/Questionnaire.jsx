import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchQuestionnaire, fetchFavorites, submitQuestionnaire } from '../api';
import UsageMeter from '../components/UsageMeter';
import MatchList from '../components/MatchList';
import DefaultRunPanel from '../components/DefaultRunPanel';
import DistrictMap from '../components/DistrictMap';
import { questionApplies } from '../lib/answerSummary';

function isAnswered(question, value) {
  if (question.optional) return true;
  if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
  if (question.type === 'text') return true;
  return Boolean(value);
}

// Walks the fixed, full-order question list from `fromId` and returns the id
// of the next one whose showIf currently applies, or null past the end.
function nextApplicableId(allQuestions, fromId, answers) {
  const idx = allQuestions.findIndex((q) => q.id === fromId);
  for (let i = idx + 1; i < allQuestions.length; i += 1) {
    if (questionApplies(allQuestions[i], answers)) return allQuestions[i].id;
  }
  return null;
}

function prevApplicableId(allQuestions, fromId, answers) {
  const idx = allQuestions.findIndex((q) => q.id === fromId);
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (questionApplies(allQuestions[i], answers)) return allQuestions[i].id;
  }
  return null;
}

function Questionnaire() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [answers, setAnswers] = useState({});
  // The current question's id, not a numeric index — a `showIf` question can
  // appear or disappear the moment the field it depends on is answered, so an
  // index would point at the wrong question depending on timing. No question
  // uses `showIf` today, but the id-based navigation is what makes adding one
  // safe. See nextApplicableId/prevApplicableId above.
  const [currentId, setCurrentId] = useState(null);
  // 'intro' | 'form' | 'results'
  const [view, setView] = useState('intro');
  // Which option the pointer is over, shared by the checkbox list and the
  // district map so hovering either one highlights the other. Pointer-only, so
  // it stays null for the whole of a touch or keyboard session.
  const [hoveredOption, setHoveredOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  // Ids only, not the full favorite rows — the star just needs to know
  // whether to render filled, and a Set makes that a single lookup per card
  // regardless of how many results are on screen.
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    Promise.all([fetchQuestionnaire(), fetchFavorites().catch(() => [])])
      .then(([payload, favorites]) => {
        setData(payload);
        setCurrentId(payload.questions?.[0]?.id ?? null);
        // `active` is the set currently driving match percentages — normally the
        // newest, but an older one once the student has chosen it as default. It
        // is what this page shows, so what you see here and what the percentages
        // elsewhere are based on cannot disagree.
        if (payload.active) {
          setResult(payload.active);
          // Coming back to the page should show the results you already have,
          // not make you walk past an intro to find them. Reading a stored run
          // is free, so there is no cost reason to hide it behind a click.
          setView('results');
        }
        setFavoriteIds(new Set(favorites.map((school) => school.id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setFavorite = (schoolId, next) => {
    setFavoriteIds((current) => {
      const updated = new Set(current);
      if (next) updated.add(schoolId);
      else updated.delete(schoolId);
      return updated;
    });
  };

  const questions = data?.questions ?? [];
  // Only the currently-applicable questions count for progress display and
  // the "X z Y" label — a question hidden by `showIf` should not appear as an
  // unanswered step. Navigation itself never uses this array's indices, only
  // the id-based helpers above; this is display-only.
  const visibleQuestions = useMemo(
    () => questions.filter((q) => questionApplies(q, answers)),
    [questions, answers]
  );
  const question = questions.find((q) => q.id === currentId) ?? null;
  const stepIndex = visibleQuestions.findIndex((q) => q.id === currentId);
  const isLast = nextApplicableId(questions, currentId, answers) === null;

  /**
   * Every question change lands at the top of the page, in both directions
   * (Další and Zpět alike — both go through setCurrentId, so one effect
   * covers both). Without this, a long question like the 22-option district
   * picker leaves the next, possibly much shorter, question scrolled to
   * wherever the previous one's bottom happened to be — which can be well
   * past its own label and options.
   *
   * From an effect keyed on `currentId`, not from the nav button's own click
   * handler, for the same reason Search.jsx's pagination does it this way:
   * scrolling inside the click handler races the re-render, since it starts
   * against the still-mounted old question and gets cut short as React swaps
   * the content out from under it.
   *
   * Skipped on mount so loading straight into the form (or coming back to an
   * in-progress one) does not yank an already-correct scroll position.
   */
  const didMountForm = useRef(false);
  useEffect(() => {
    if (view !== 'form') return;
    if (!didMountForm.current) {
      didMountForm.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [currentId, view]);

  const answeredCount = useMemo(
    () => visibleQuestions.filter((q) => isAnswered(q, answers[q.id])).length,
    [visibleQuestions, answers]
  );

  const setAnswer = (id, value) =>
    setAnswers((current) => ({ ...current, [id]: value }));

  // A dedicated action rather than clicking every chip: it bypasses the `max`
  // cap on purpose (selecting all 22 says "I don't care", same as none — see
  // clearsWhenAll in lib/questionnaire.js), which toggleMulti's own per-click
  // cap check must not apply to.
  const toggleSelectAll = (id, allValues) => {
    setAnswers((current) => {
      const list = current[id] ?? [];
      const allSelected = allValues.length > 0 && allValues.every((v) => list.includes(v));
      return { ...current, [id]: allSelected ? [] : [...allValues] };
    });
  };

  const toggleMulti = (id, value, max) => {
    setAnswers((current) => {
      const list = current[id] ?? [];
      if (list.includes(value)) {
        return { ...current, [id]: list.filter((entry) => entry !== value) };
      }
      // Silently ignoring the click past the cap would look broken; the option
      // is visibly disabled instead, so this is only a backstop.
      if (list.length >= max) return current;
      return { ...current, [id]: [...list, value] };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = await submitQuestionnaire(answers);
      setResult(payload.run);
      setData((current) => ({
        ...current,
        usage: payload.usage,
        // Added to the list here rather than by refetching. The new set is now
        // the default, so every other one loses the flag — mirroring the
        // server's one-default rule keeps the set list from showing two.
        runs: [
          {
            id: payload.run.id,
            label: payload.run.label ?? null,
            created_at: payload.run.created_at,
            is_default: true,
            archived_at: null,
            answers: payload.run.answers,
          },
          ...(current.runs ?? []).map((run) => ({ ...run, is_default: false })),
        ],
      }));
      setView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setAnswers({});
    setCurrentId(questions[0]?.id ?? null);
    setError(null);
    setView('form');
  };

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám dotazník…
      </div>
    );
  }

  // A failed load has to be its own screen. Falling through to the intro would
  // show "dotazník není nastavený" — which reads as a missing API key when the
  // real problem is that the request never arrived.
  if (!data) {
    return (
      <div className="page page-questionnaire">
        <div className="questionnaire-layout">
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Dotazník se nepodařilo načíst</span>
            <p className="notice-text">
              Zkontroluj, že běží backend na portu 5000. Detail chyby: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const usage = data?.usage;
  const exhausted = usage && !usage.unlimited && usage.remaining <= 0;
  // Archived sets are still in `runs`, but the link exists to reach the sets you
  // are actively choosing between, so they are not counted.
  const runCount = (data?.runs ?? []).filter((run) => !run.archived_at).length;

  /* --- Results ---------------------------------------------------------- */

  if (view === 'results' && result) {
    return (
      <div className="page page-questionnaire">
        <div className="questionnaire-layout">
          <div className="page-header">
            <p className="eyebrow">Tvoje výsledky</p>
            <h1>Školy, které ti sedí nejvíc</h1>
            <p className="lede">
              Seřazeno podle toho, jak dobře odpovídají tvým odpovědím. Klikni na
              školu pro detail — obory, kontakt i odkaz na web.
            </p>
          </div>

          <UsageMeter usage={usage} onRestart={startOver} />

          {/* Names the set and states what being the default actually decides.
              Without this the mechanic is invisible: a student with two sets has
              no way to tell which one the percentages elsewhere come from. */}
          <DefaultRunPanel run={result} onChange={setResult} />

          <MatchList
            matches={result.matches}
            favoriteIds={favoriteIds}
            onFavoriteChange={setFavorite}
          />

          {/* Restarting now lives on the usage meter, next to the count of
              attempts it spends — the two belong together. */}
          <div className="questionnaire-actions">
            <Link to="/skoly" className="btn btn-ghost">
              Procházet všechny školy
            </Link>
            {runCount > 1 && (
              <Link to="/dotaznik/sady" className="btn btn-ghost">
                Moje sady odpovědí ({runCount})
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* --- Intro ------------------------------------------------------------ */

  if (view === 'intro') {
    return (
      <div className="page page-questionnaire">
        <div className="questionnaire-layout">
          <div className="page-header">
            <p className="eyebrow">Dotazník</p>
            <h1>Najdi školu, která ti sedne</h1>
            <p className="lede">
              Pár otázek na to, co tě baví a jak se učíš. Pak projdeme všechny
              pražské střední školy a vybereme ty, které ti odpovídají nejvíc.
              Zabere to asi tři minuty.
            </p>
          </div>

          <UsageMeter usage={usage} />

          {!data?.configured && (
            <div className="notice notice-error" role="alert">
              <span className="notice-title">Dotazník zatím není nastavený</span>
              <p className="notice-text">
                Chybí klíč k AI službě. Doplň <code>OPENROUTER_API_KEY</code> do{' '}
                <code>.env</code> a restartuj server.
              </p>
            </div>
          )}

          {exhausted && (
            <div className="notice" role="status">
              <span className="notice-title">Tento měsíc máš vyčerpáno</span>
              <p className="notice-text">
                Využil jsi všech {usage.limit} vyhodnocení. Své poslední výsledky
                si můžeš prohlížet dál zdarma.
              </p>
            </div>
          )}

          <div className="questionnaire-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setView('form')}
              disabled={exhausted || !data?.configured}
            >
              Začít dotazník
            </button>
            {result && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setView('results')}
              >
                Zobrazit výsledky
              </button>
            )}
            {runCount > 1 && (
              <Link to="/dotaznik/sady" className="btn btn-ghost">
                Moje sady odpovědí ({runCount})
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* --- Form ------------------------------------------------------------- */

  const value = answers[question.id];
  const canAdvance = isAnswered(question, value);

  return (
    <div className="page page-questionnaire">
      <div className="questionnaire-layout">
        <div className="questionnaire-progress">
          <div className="questionnaire-progress-head">
            <span>
              Otázka {stepIndex + 1} z {visibleQuestions.length}
            </span>
            <span>{answeredCount} zodpovězeno</span>
          </div>
          <div
            className="questionnaire-progress-track"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={visibleQuestions.length}
          >
            <div
              className="questionnaire-progress-fill"
              style={{
                '--percent': `${((stepIndex + 1) / visibleQuestions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="panel panel-lg questionnaire-card">
          {/* Keyed by question id so each step mounts fresh and the entrance
              animation replays as you move through the form. */}
          <div className="questionnaire-question" key={question.id}>
            <h2 className="questionnaire-question-label">{question.label}</h2>
            {question.hint && (
              <p className="questionnaire-question-hint">{question.hint}</p>
            )}

            {question.type === 'text' ? (
              <textarea
                className="input questionnaire-textarea"
                rows={4}
                maxLength={question.maxLength}
                value={value ?? ''}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                placeholder="Nepovinné"
              />
            ) : (
              <>
                {/* Declared by the question itself (lib/questionnaire.js), not
                    matched on id here — the map and the checkboxes below drive
                    the same answer, so clicking either one is the same edit. */}
                {question.map === 'praha-obvody' && (
                  <DistrictMap
                    selected={value ?? []}
                    max={question.max}
                    onToggle={(districtId) =>
                      toggleMulti(question.id, districtId, question.max)
                    }
                    hovered={hoveredOption}
                    onHover={setHoveredOption}
                  />
                )}

                {/* Every multi-select gets the running count, not just the
                    mapped one. Reaching the cap is the moment the remaining
                    options dim, and without a number on screen that looks like
                    the page breaking rather than a limit being reached. */}
                {question.type === 'multi' && (
                  <div className="option-count-row">
                    <p
                      className={
                        (value ?? []).length >= question.max
                          ? 'option-count is-full'
                          : 'option-count'
                      }
                    >
                      Vybráno {(value ?? []).length} z {question.max}
                    </p>

                    {/* Only on a question that declared clearsWhenAll — this
                        button's whole point is that "all" collapses to "none",
                        which is not true of every multi-select (e.g. oblasti). */}
                    {question.clearsWhenAll && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          toggleSelectAll(
                            question.id,
                            question.options.map((o) => o.value)
                          )
                        }
                      >
                        {(value ?? []).length === question.options.length
                          ? 'Zrušit výběr'
                          : 'Vybrat vše'}
                      </button>
                    )}
                  </div>
                )}

                {/* A district picker's labels are short ("Praha 14"), unlike
                    every other question's sentence-length options — so this
                    one gets a compact 2-column grid instead of the default
                    full-width rows. Keyed off `question.map`, the same
                    data-driven capability the map itself uses, rather than
                    the question id, so the next picker question gets this for
                    free too. */}
                <div
                  className={
                    question.map
                      ? 'option-grid option-grid-compact'
                      : 'option-grid'
                  }
                >
                  {question.options.map((option) => {
                    const selected =
                      question.type === 'multi'
                        ? (value ?? []).includes(option.value)
                        : value === option.value;

                    const atMax =
                      question.type === 'multi' &&
                      !selected &&
                      (value ?? []).length >= question.max;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={[
                          'option-chip',
                          selected ? 'is-selected' : '',
                          hoveredOption === option.value ? 'is-peer-hovered' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={selected}
                        disabled={atMax}
                        // Only wired up when a map is showing. Elsewhere there
                        // is no second representation for a highlight to travel
                        // to, so this would be state changing with nothing to
                        // show for it.
                        onMouseEnter={
                          question.map
                            ? () => setHoveredOption(option.value)
                            : undefined
                        }
                        onMouseLeave={
                          question.map ? () => setHoveredOption(null) : undefined
                        }
                        onClick={() => {
                          if (question.type === 'multi') {
                            toggleMulti(question.id, option.value, question.max);
                          } else {
                            const updated = { ...answers, [question.id]: option.value };
                            setAnswers(updated);
                            // Single-choice questions advance on their own —
                            // picking an option IS the decision, so making the
                            // student then press "next" is a wasted click ten
                            // times over. Multi-select cannot do this: there is
                            // no way to know they are finished choosing.
                            //
                            // `updated` is built explicitly and passed in rather
                            // than read back from `answers` state, which would
                            // still show the pre-click value inside this same
                            // handler — an answer that reveals a `showIf`
                            // question has to reveal it as the very next step,
                            // not one step later.
                            const next = nextApplicableId(questions, question.id, updated);
                            if (next) setCurrentId(next);
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {/* Placed right above the nav rather than up by the label —
                    this is the moment the student is about to decide whether
                    to answer at all, so the reassurance lands right before the
                    click instead of being read once and forgotten three
                    seconds earlier. */}
                {question.optional && question.clearsWhenAll && (
                  <p className="questionnaire-optional-note">
                    Nemáš preferenci? Nech výběr prázdný, nebo klikni na
                    „Vybrat vše“ — obojí znamená totéž a shodu ti to nesníží.
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
            </div>
          )}

          <div className="questionnaire-nav">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const prev = prevApplicableId(questions, question.id, answers);
                if (prev) setCurrentId(prev);
              }}
              disabled={stepIndex === 0 || submitting}
            >
              Zpět
            </button>

            {isLast ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!canAdvance || submitting}
              >
                {submitting && <span className="btn-spinner" aria-hidden="true" />}
                {submitting ? 'Vyhodnocuji…' : 'Zobrazit moje školy'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const next = nextApplicableId(questions, question.id, answers);
                  if (next) setCurrentId(next);
                }}
                disabled={!canAdvance}
              >
                Další
              </button>
            )}
          </div>
        </div>

        {submitting && (
          <p className="questionnaire-waiting" role="status">
            Procházíme všechny pražské školy a porovnáváme je s tvými odpověďmi.
            Chvilku to trvá.
          </p>
        )}
      </div>
    </div>
  );
}

export default Questionnaire;
