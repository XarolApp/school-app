import { ObOption, ObScreen } from '../../../components/onboarding/ObKit';
import ProfilePanel from '../../../components/onboarding/ProfilePanel';
import { QUESTIONS } from '../quizQuestions';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 21 — Explicit commitment.
 *
 * Stating a commitment out loud immediately before the ask raises follow-through
 * (consistency principle); ~95% of users pick one of the two top options.
 *
 * Zero-shame branch: no answer is punished or used to pressure. The softest
 * option is phrased as a goal too ("get oriented"), and its reply points at the
 * next step instead of telling the user there is no rush.
 */
// The question is about the outcome the family wants, not how serious they are:
// every option is a goal worth having, so no answer reads as "I can wait". The
// stored values stay as they are (the server validates them).
const OPTIONS = [
  { value: 'maximalne', student: 'Mít jasno a vybrat tu nejlepší školu', parent: 'Mít jasno a vybrat tu nejlepší školu' },
  { value: 'hodne', student: 'Zúžit výběr na pár škol, které dávají smysl', parent: 'Zúžit výběr na pár škol, které dávají smysl' },
  { value: 'zjistuji', student: 'Nejdřív se v nabídce zorientovat', parent: 'Nejdřív se v nabídce zorientovat' },
];

const REASSURANCE = {
  student: 'Dobré místo, kde začít. Pořadí škol ti ukáže, kam se podívat jako první.',
  parent: 'Dobré místo, kde začít. Pořadí škol ukáže, kam se podívat jako první.',
};

function Commitment() {
  const { role, answers, commitment, setCommitment, goNext, goBack, phase } = useOnboarding();
  const parent = role === 'parent';
  const soft = commitment === 'zjistuji';

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      // The finished profile: what they told us, just before we ask how
      // seriously they are taking it. No row is "current" any more.
      aside={<ProfilePanel answers={answers} role={role} currentQuestionIndex={QUESTIONS.length} />}
      actions={
        <button type="button" className="ob-btn ob-btn-primary" onClick={goNext}>
          Pokračovat
        </button>
      }
    >
      <h1 className="ob-title">
        {parent ? 'Co chcete z výběru školy získat?' : 'Co chceš z výběru školy získat?'}
      </h1>
      <p className="ob-hint">
        {parent
          ? 'Vyberte, co je vám nejbližší.'
          : 'Vyber, co je ti nejbližší.'}
      </p>
      <div className="ob-options">
        {OPTIONS.map((o) => (
          <ObOption
            key={o.value}
            selected={commitment === o.value}
            onClick={() => setCommitment(o.value)}
          >
            {parent ? o.parent : o.student}
          </ObOption>
        ))}
      </div>
      {soft && <p className="ob-reassure">{parent ? REASSURANCE.parent : REASSURANCE.student}</p>}
    </ObScreen>
  );
}

export default Commitment;
