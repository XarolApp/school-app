import { useMemo, useState } from 'react';
import { ObButton, ObOption, ObScreen, SelectionCount } from '../../../components/onboarding/ObKit';
import DistrictMap from '../../../components/onboarding/DistrictMap';
import { countCandidates } from '../../../lib/matching';
import { useOnboarding } from '../useOnboarding';
import { QUESTIONS, optionLabel, questionCopy, questionOptions } from '../quizQuestions';

/**
 * Screens 6-15 — the quiz. ONE QUESTION PER SCREEN.
 *
 * Single-question screens raise quiz completion by up to 40% versus one long
 * vertical form, by removing visual overwhelm and decision paralysis.
 *
 * Mechanics on this screen:
 *  - Smart defaults are pre-selected where an honest modal answer exists,
 *    which cuts decision fatigue and drop-off.
 *  - A live counter of matching schools updates after every answer. This is the
 *    variable-reward loop — the moving number is the anticipation engine.
 *    DEVIATION, stated deliberately: the playbook calls for a live "match %".
 *    With only name/location/programs in the database, a percentage would be
 *    invented precision. A real count of real candidates narrowing down is the
 *    same dopamine mechanic and is true.
 *  - "Přeskočit" is on every screen and never costs the user anything. A skip
 *    drops the component and widens the confidence interval instead of
 *    lowering the score (zero-shame rule).
 */
function QuizQuestion({ step }) {
  const {
    role,
    answers,
    setAnswer,
    goNext,
    goBack,
    progress,
    schools,
    cleanedAnswers,
  } = useOnboarding();
  const parent = role === 'parent';
  const question = QUESTIONS[step.questionIndex];
  const copy = questionCopy(question, role);
  const options = questionOptions(question, role);
  const value = answers[question.key];
  // Synced both ways with the map, when this question has one — pointing at
  // either representation highlights the other.
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  const candidates = useMemo(
    () => countCandidates(schools, cleanedAnswers, role || 'student'),
    [schools, cleanedAnswers, role]
  );

  const answered = Array.isArray(value) ? value.length > 0 : Boolean(value);

  const selectSingle = (optionValue) => {
    setAnswer(question.key, optionValue);
    // No auto-advance: an accidental tap that skips a screen is far more
    // annoying on a phone than one extra tap on "Pokračovat".
  };

  const toggleMulti = (optionValue) => {
    const current = Array.isArray(value) ? value : [];
    if (current.includes(optionValue)) {
      setAnswer(question.key, current.filter((v) => v !== optionValue));
      return;
    }
    // Past the cap, adding is simply ignored — matching how the option chips
    // (and the map's own regions) dim rather than silently doing nothing.
    if (question.max && current.length >= question.max) return;
    setAnswer(question.key, [...current, optionValue]);
  };

  const clear = () => setAnswer(question.key, question.type === 'multi' ? [] : '');

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      progressLabel={`Otázka ${step.questionIndex + 1} z ${QUESTIONS.length}`}
      actions={
        <>
          <ObButton onClick={goNext} disabled={false}>
            {answered ? 'Pokračovat' : 'Pokračovat bez odpovědi'}
          </ObButton>
          <button
            type="button"
            className="ob-skip"
            onClick={() => {
              clear();
              goNext();
            }}
          >
            {parent ? 'Přeskočit — nevím' : 'Přeskočit'}
          </button>
        </>
      }
    >
      <h1 className="ob-title">{copy.title}</h1>
      {copy.hint && <p className="ob-hint">{copy.hint}</p>}

      {question.type === 'select' ? (
        <div className="ob-select-wrap">
          <select
            className="ob-select"
            aria-label={copy.title}
            value={value || ''}
            onChange={(e) => setAnswer(question.key, e.target.value)}
          >
            <option value="">{copy.placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {optionLabel(o, role)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          {question.max && (
            <SelectionCount count={Array.isArray(value) ? value.length : 0} max={question.max} />
          )}

          {question.map && (
            <DistrictMap
              selected={Array.isArray(value) ? value : []}
              onToggle={toggleMulti}
              max={question.max}
              hovered={hoveredDistrict}
              onHover={setHoveredDistrict}
            />
          )}

          <div className="ob-options">
            {options.map((o) => {
              const selected =
                question.type === 'multi'
                  ? Array.isArray(value) && value.includes(o.value)
                  : value === o.value;
              const atMax =
                question.type === 'multi' &&
                question.max &&
                Array.isArray(value) &&
                value.length >= question.max;
              return (
                <ObOption
                  key={o.value}
                  multi={question.type === 'multi'}
                  unsure={Boolean(o.unsure)}
                  selected={selected}
                  disabled={atMax && !selected}
                  onClick={() =>
                    question.type === 'multi' ? toggleMulti(o.value) : selectSingle(o.value)
                  }
                  onHover={
                    question.map
                      ? (isOver) => setHoveredDistrict(isOver ? o.value : null)
                      : undefined
                  }
                >
                  {optionLabel(o, role)}
                </ObOption>
              );
            })}
          </div>
        </>
      )}

      {question.honesty && <p className="ob-honesty">{question.honesty}</p>}

      {schools.length > 0 && (
        <p className="ob-live" aria-live="polite">
          {candidates.fitting > 0 ? (
            <>
              Zatím {parent ? 'vyhovuje' : 'ti sedí'}{' '}
              <strong>{candidates.fitting}</strong> {schoolWord(candidates.fitting)} z{' '}
              {candidates.total}
            </>
          ) : (
            <>
              {parent
                ? 'Zatím zpřesňujeme výběr z ' + candidates.total + ' škol'
                : 'Zatím vybíráme z ' + candidates.total + ' škol'}
            </>
          )}
        </p>
      )}
    </ObScreen>
  );
}

function schoolWord(n) {
  if (n === 1) return 'škola';
  if (n >= 2 && n <= 4) return 'školy';
  return 'škol';
}

export default QuizQuestion;
