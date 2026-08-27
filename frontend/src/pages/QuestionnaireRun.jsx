import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { fetchQuestionnaire, fetchRun, fetchFavorites } from '../api';
import DefaultRunPanel from '../components/DefaultRunPanel';
import MatchList from '../components/MatchList';
import { describeAnswers } from '../lib/answerSummary';

/**
 * One stored set of answers: what was answered, and the schools it produced.
 *
 * Reading a stored set is free and unmetered — it is a database read, not an AI
 * call — so there is nothing to warn about here and no reason to gate it.
 */
function QuestionnaireRun() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // The questions come along because the answers are stored as option values;
    // rendering them as words needs the same definitions the form was built
    // from. See lib/answerSummary.js.
    Promise.all([
      fetchRun(id),
      fetchQuestionnaire(),
      fetchFavorites().catch(() => []),
    ])
      .then(([runPayload, questionnaire, favorites]) => {
        setRun(runPayload.run);
        setQuestions(questionnaire.questions ?? []);
        setFavoriteIds(new Set(favorites.map((school) => school.id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const answers = useMemo(
    () => (run ? describeAnswers(questions, run.answers) : []),
    [questions, run]
  );

  const setFavorite = (schoolId, next) => {
    setFavoriteIds((current) => {
      const updated = new Set(current);
      if (next) updated.add(schoolId);
      else updated.delete(schoolId);
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám sadu odpovědí…
      </div>
    );
  }

  if (!run) {
    return (
      <div className="page page-questionnaire">
        <div className="questionnaire-layout">
          <Link to="/dotaznik/sady" className="back-link">
            <span aria-hidden="true">←</span> Zpět na sady odpovědí
          </Link>
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Sadu se nepodařilo načíst</span>
            <p className="notice-text">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-questionnaire">
      <div className="questionnaire-layout">
        <Link to="/dotaznik/sady" className="back-link">
          <span aria-hidden="true">←</span> Zpět na sady odpovědí
        </Link>

        <DefaultRunPanel run={run} onChange={setRun} />

        <div className="run-answers">
          <button
            type="button"
            className={`run-row-toggle${showAnswers ? ' is-open' : ''}`}
            onClick={() => setShowAnswers((current) => !current)}
            aria-expanded={showAnswers}
          >
            <ChevronDown className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
            {showAnswers ? 'Skrýt tvoje odpovědi' : 'Zobrazit tvoje odpovědi'}
          </button>

          {showAnswers && (
            <dl className="answer-list">
              {answers.map((entry) => (
                <div className="answer-item" key={entry.id}>
                  <dt className="answer-term">{entry.label}</dt>
                  <dd className="answer-value">{entry.values.join(', ')}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <h2 className="run-results-title">Školy podle téhle sady</h2>

        {/* `from`/`state` send the school detail page's back link to this set
            rather than to the newest one. */}
        <MatchList
          matches={run.matches}
          favoriteIds={favoriteIds}
          onFavoriteChange={setFavorite}
          from="run"
          state={{ runId: run.id }}
        />
      </div>
    </div>
  );
}

export default QuestionnaireRun;
