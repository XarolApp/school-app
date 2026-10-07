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
 * Zero-shame branch: a low answer is NEVER punished, guilt-tripped or used to
 * pressure. It routes to confidence-rebuilding copy instead, and the flow
 * continues to exactly the same paywall. "Ještě si nejsem jistý" from a
 * 15-year-old is an honest answer to a genuinely hard question.
 */
const OPTIONS = [
  { value: 'maximalne', student: 'Chci to vyřešit pořádně', parent: 'Chceme to vyřešit důkladně' },
  { value: 'hodne', student: 'Docela dost', parent: 'Je to pro nás důležité' },
  { value: 'zjistuji', student: 'Zatím to jen zjišťuju', parent: 'Zatím se rozhlížíme' },
];

const REASSURANCE = {
  student: 'V pohodě — rozhlížet se je přesně to, k čemu tohle je. Nikam tě netlačíme.',
  parent: 'To je v pořádku — orientace je první krok a nic víc po vás teď nechceme.',
};

function Commitment() {
  const { role, answers, commitment, setCommitment, goNext, goBack, phase } = useOnboarding();
  const parent = role === 'parent';
  const soft = commitment === 'zjistuji';

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      center
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
        {parent ? 'Jak vážně to teď řešíte?' : 'Jak vážně to teď řešíš?'}
      </h1>
      <p className="ob-hint">
        {parent
          ? 'Vyberte možnost, která nejlépe odpovídá vaší situaci.'
          : 'Vyber možnost, která ti je nejbližší.'}
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
