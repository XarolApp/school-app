import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { fetchQuestionnaire, submitQuestionnaire } from '../api';
import './questionnaire.css';

/**
 * The standalone AI questionnaire (lib/questionnaire.js on the server) —
 * separate from the onboarding quiz, see CLAUDE.md. This is the one surface
 * on `main` that writes a real `questionnaire_runs` row with
 * `source: 'questionnaire'` (the onboarding quiz writes its own row with
 * `source: 'onboarding'`, see plan 008), which is what the rozhodovací
 * matice's "Shoda s tvým dotazníkem" criterion reads. Added so match_score
 * can be produced/tested on an account that signed up outside onboarding.
 *
 * Deliberately a single page, not a multi-step wizard like onboarding — this
 * is a utility surface for an already-signed-in, already-paying account, not
 * an acquisition flow, so a stepper's ceremony buys nothing here.
 */

// Mirrors questionApplies in lib/questionnaire.js — kept tiny since no
// question currently sets showIf, but the server contract allows it.
function questionApplies(question, answers) {
  return !question.showIf || answers[question.showIf.field] === question.showIf.equals;
}

function Questionnaire() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuestionnaire()
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, error: null, data });
        if (data.active) setResult(data.active);
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
    try {
      const body = await submitQuestionnaire(answers);
      setResult(body.run);
      setState((prev) => ({ ...prev, data: { ...prev.data, usage: body.usage } }));
    } catch (err) {
      setSubmitError(err.message || 'Odeslání se nepodařilo.');
    } finally {
      setSubmitting(false);
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

  const { questions, usage, configured } = state.data;

  return (
    <div className="qz-page">
      <h1 className="ss-headline-lg h">Dotazník</h1>
      <p className="ss-body-md qz-subtitle">
        Vyplň, co máš — přeskočené otázky ti shodu nesníží. Podle odpovědí spočítáme procentuální shodu se
        školami, kterou pak vidíš u škol i v <Link to="/porovnani/matice">rozhodovací matici</Link>.
      </p>

      {!configured && (
        <p className="qz-notice">
          AI část dotazníku zatím na tomto serveru není nastavená (chybí <code>OPENROUTER_API_KEY</code>) —
          odeslání skončí chybou, dokud klíč nepřidáš do <code>.env</code>.
        </p>
      )}

      {usage && !usage.unlimited && (
        <p className="ss-caption">
          Využito {usage.used} z {usage.limit} pokusů tento měsíc.
        </p>
      )}

      {result && (
        <div className="qz-result">
          <div className="qz-result-head">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span className="ss-body-md">
              Dotazník uložen — jdi na <Link to="/skoly">seznam škol</Link> nebo{' '}
              <Link to="/porovnani/matice">rozhodovací matici</Link>, procenta shody se tam teď spočítají z
              tohoto dotazníku.
            </span>
          </div>
          {Array.isArray(result.matches) && result.matches.length > 0 && (
            <ol className="qz-matches">
              {result.matches.slice(0, 8).map((m) => (
                <li key={m.school_id} className="qz-match-row">
                  <span className="qz-match-score">{Math.round(m.score)} %</span>
                  <span className="qz-match-name">{m.school?.name || `Škola #${m.school_id}`}</span>
                  {m.reason && <p className="ss-caption qz-match-reason">{m.reason}</p>}
                </li>
              ))}
            </ol>
          )}
          <button type="button" className="ss-btn ss-btn-secondary ss-btn-sm" onClick={() => setResult(null)}>
            Vyplnit znovu
          </button>
        </div>
      )}

      {!result && (
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
                )}
              </div>
            ))}

          {submitError && <p className="qz-error">{submitError}</p>}

          <button type="submit" className="ss-btn ss-btn-primary" disabled={submitting}>
            {submitting ? 'Odesílám…' : 'Spočítat shodu'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Questionnaire;
