import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { explainQuestionnaireSchool } from '../../api';
import ReasonPending from '../ReasonPending';

/**
 * "Proč tahle shoda" in the main column of a school page. The questionnaire
 * run is loaded by SchoolDetail together with the school, so this card is
 * there on first paint — as the text, the generate button, or a nudge to take
 * the questionnaire.
 */
function SchoolExplanation({ school, questionnaire }) {
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = questionnaire?.active;

  if (questionnaire?.failed) {
    return (
      <section className="sd-explanation">
        <h3>Proč tahle shoda</h3>
        <p className="sd-form-error" role="alert">Vysvětlení se nepodařilo načíst.</p>
      </section>
    );
  }

  if (!active) {
    return (
      <section className="sd-explanation sd-explanation-cta">
        <Sparkles size={22} aria-hidden="true" className="sd-explanation-icon" />
        <div className="sd-explanation-copy">
          <h3>Proč tahle shoda</h3>
          <p>Vyplň dotazník a vysvětlíme ti, proč je tahle škola v tvém pořadí právě na svém místě.</p>
        </div>
        <Link to="/dotaznik" className="ss-btn ss-btn-secondary">Vyplnit dotazník</Link>
      </section>
    );
  }

  const matches = active.matches ?? [];
  const index = matches.findIndex((match) => match.school_id === school.id);
  const explanation = generated
    || (index >= 0 && matches[index].reason)
    || active.extra_reasons?.[String(school.id)]
    || '';

  if (explanation) {
    return (
      <section className="sd-explanation" aria-live="polite">
        <h3>Proč tahle shoda</h3>
        <p>{explanation}</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="sd-explanation">
        <h3>Proč tahle shoda</h3>
        <ReasonPending lines={4} />
      </section>
    );
  }

  const explain = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await explainQuestionnaireSchool(school.id, active.id);
      setGenerated(result.reason || '');
    } catch (err) {
      setError(err.message || 'Vysvětlení teď nejde vytvořit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sd-explanation sd-explanation-cta">
      <Sparkles size={22} aria-hidden="true" className="sd-explanation-icon" />
      <div className="sd-explanation-copy">
        <h3>Proč tahle shoda</h3>
        <p>
          {index >= 0
            ? `V tvém pořadí je na ${index + 1}. místě se shodou ${Math.round(matches[index].score)} %. `
            : ''}
          Necháme ti vysvětlit, co u ní sedí, co jí chybí a proč není výš.
        </p>
        {error && <p className="sd-form-error" role="alert">{error}</p>}
      </div>
      <button type="button" className="ss-btn ss-btn-secondary" onClick={explain}>
        <Sparkles size={16} aria-hidden="true" />
        Získat vysvětlení
      </button>
    </section>
  );
}

export default SchoolExplanation;
