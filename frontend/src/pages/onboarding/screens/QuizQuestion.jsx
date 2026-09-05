import { Fragment, useMemo, useState } from 'react';
import { ObButton, ObOption, ObScreen, SelectionCount } from '../../../components/onboarding/ObKit';
import DistrictMap from '../../../components/onboarding/DistrictMap';
import ProfilePanel from '../../../components/onboarding/ProfilePanel';
import { countCandidates } from '../../../lib/matching';
import { useOnboarding } from '../useOnboarding';
import { quizProgressPercent } from '../steps';
import {
  QUESTIONS,
  optionLabel,
  questionCopy,
  questionOptions,
  reassuranceFor,
} from '../quizQuestions';

/**
 * The quiz. ONE QUESTION PER SCREEN.
 *
 * Single-question screens raise quiz completion by up to 40% versus one long
 * vertical form, by removing visual overwhelm and decision paralysis.
 *
 * LAYOUT (onboarding-v2). This screen is now responsive in shape, not just in
 * width:
 *  - Mobile: question column full width, the profile collapses to one tappable
 *    strip under the progress bar, and the action bar is sticky so the CTA
 *    never scrolls out of thumb reach. Tap targets are 56px.
 *  - Desktop (1024px+): the question column is CAPPED at ~640px rather than
 *    stretched across the viewport — past roughly 75 characters per line
 *    reading measurably degrades — and the freed right-hand space carries the
 *    live "Tvůj profil" panel. Click targets shrink to 52px. Reusing one target
 *    size across both is the clearest tell of a stretched-phone layout.
 *
 * MECHANICS:
 *  - Progress is HONEST: exactly (question number) / (number of questions),
 *    no pre-filled head start and no easing curve. See steps.js.
 *  - The live counter is a REAL count of REAL candidates recomputed from the
 *    answers so far, not a percentage. A match percentage after two of nine
 *    questions would be invented precision, and this product refuses to show
 *    match percentages anywhere at all.
 *  - Selecting an answer injects a reassurance card directly under it. That is
 *    the migrated Mirroring screen: the same "you were heard" work, spread
 *    across every question instead of costing one more screen.
 *  - Smart defaults are pre-selected where an honest modal answer exists.
 *  - "Přeskočit" is on every screen and never costs anything. A skip drops the
 *    component from the weights and widens the confidence interval; it never
 *    lowers a score (zero-shame rule).
 */
function QuizQuestion({ step }) {
  const { role, answers, setAnswer, goNext, goBack, schools, cleanedAnswers } = useOnboarding();
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

  const reassurance = reassuranceFor(question, value, role);
  const answered = Array.isArray(value) ? value.length > 0 : Boolean(value);

  const selectSingle = (optionValue) => {
    setAnswer(question.key, optionValue);
    // No auto-advance: an accidental tap that skips a screen is far more
    // annoying on a phone than one extra tap on "Pokračovat".
  };

  const toggleMulti = (optionValue) => {
    const current = Array.isArray(value) ? value : [];
    if (current.includes(optionValue)) {
      setAnswer(
        question.key,
        current.filter((v) => v !== optionValue)
      );
      return;
    }
    // Past the cap, adding is simply ignored — matching how the option chips
    // (and the map's own regions) dim rather than silently doing nothing.
    if (question.max && current.length >= question.max) return;
    setAnswer(question.key, [...current, optionValue]);
  };

  const clear = () => setAnswer(question.key, question.type === 'multi' ? [] : '');

  /** The reassurance card. Rendered under the SELECTED row on single-choice
   *  questions and under the whole group on multi-selects. */
  const reassureCard = reassurance ? (
    <div className="ob-reassure" role="status">
      <span className="ob-reassure-icon" aria-hidden="true">
        ✦
      </span>
      <p>{reassurance}</p>
    </div>
  ) : null;

  return (
    <ObScreen
      onBack={goBack}
      progress={quizProgressPercent(step.questionIndex, QUESTIONS.length)}
      progressLabel={`Otázka ${step.questionIndex + 1} z ${QUESTIONS.length}`}
      aside={
        <ProfilePanel
          answers={answers}
          role={role}
          currentQuestionIndex={step.questionIndex}
        />
      }
      actions={
        <>
          <ObButton onClick={goNext}>
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
            {parent ? 'Přeskočit — nevím' : 'Přeskočit otázku'}
          </button>
        </>
      }
    >
      {/* Mobile shape of the same panel. Rendered here (not in the aside) so it
          sits directly under the progress bar, as in the mobile artboard. */}
      <div className="ob-profile-strip-wrap">
        <ProfilePanel
          answers={answers}
          role={role}
          currentQuestionIndex={step.questionIndex}
          variant="strip"
        />
      </div>

      {schools.length > 0 && (
        <p className="ob-live" aria-live="polite">
          <span className="ob-live-dot" aria-hidden="true" />
          {candidates.fitting > 0 ? (
            <>
              Zatím {parent ? 'vyhovuje' : 'ti sedí'} <strong>{candidates.fitting}</strong>{' '}
              {schoolWord(candidates.fitting)} z {candidates.total} pražských
            </>
          ) : (
            <>
              {parent
                ? `Zatím zpřesňujeme výběr z ${candidates.total} škol`
                : `Zatím vybíráme z ${candidates.total} škol`}
            </>
          )}
        </p>
      )}

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

          <div
            className="ob-options"
            role={question.type === 'multi' ? 'group' : 'radiogroup'}
            aria-label={copy.title}
          >
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
                <Fragment key={o.value}>
                  <ObOption
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
                  {/* Injected BETWEEN the chosen row and the rest, so it reads
                      as a response to that specific answer. */}
                  {question.type !== 'multi' && selected && reassureCard}
                </Fragment>
              );
            })}
          </div>

          {question.type === 'multi' && reassureCard}
        </>
      )}

      {question.honesty && <p className="ob-honesty">{question.honesty}</p>}
    </ObScreen>
  );
}

function schoolWord(n) {
  if (n === 1) return 'škola';
  if (n >= 2 && n <= 4) return 'školy';
  return 'škol';
}

export default QuizQuestion;
