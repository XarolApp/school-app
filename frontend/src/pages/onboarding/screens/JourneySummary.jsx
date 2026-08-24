import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 20 — Journey summary.
 *
 * A visual roadmap from today to the decision, with the user's own stated goals
 * repeated back one last time before the ask.
 *
 * This is also where seasonal urgency belongs (ruling C-9, permitted source 1):
 * the přihlášky deadline and dny otevřených dveří are REAL, externally
 * verifiable dates. Real deadlines motivate better than any manufactured timer
 * and cost nothing in trust.
 *
 * The dates below are the standard Czech schedule. TODO(content): move to a
 * config with the exact MŠMT dates for the current school year and show the
 * year explicitly — a stale date here is worse than no date.
 */
const MILESTONES = [
  {
    id: 'dnes',
    when: 'Dnes',
    student: 'Máš pořadí škol, které ti sedí.',
    parent: 'Máte pořadí škol, které dítěti odpovídají.',
  },
  {
    id: 'dod',
    when: 'Podzim a zima',
    student: 'Dny otevřených dveří — projdi si ty nejlepší naživo.',
    parent: 'Dny otevřených dveří — osobní návštěva nejlepších kandidátů.',
  },
  {
    id: 'prihlasky',
    when: 'Do 1. března',
    student: 'Přihlášky. Pořadí škol se vyplňuje podle priority.',
    parent: 'Podání přihlášek. Pořadí škol se uvádí podle priority.',
  },
  {
    id: 'prijimacky',
    when: 'Duben',
    student: 'Jednotná přijímací zkouška.',
    parent: 'Jednotná přijímací zkouška.',
  },
];

function JourneySummary() {
  const { role, goNext, goBack, progress, ranked } = useOnboarding();
  const parent = role === 'parent';

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      actions={<ObButton onClick={goNext}>Pokračovat</ObButton>}
    >
      <h1 className="ob-title">{parent ? 'Co vás čeká' : 'Co tě čeká'}</h1>
      <p className="ob-lead">
        {parent
          ? 'Výběr školy není jedno rozhodnutí, ale několik kroků rozložených do celého školního roku.'
          : 'Výběr školy není jedno rozhodnutí, ale několik kroků přes celý rok.'}
      </p>

      <ol className="ob-timeline">
        {MILESTONES.map((m) => (
          <li key={m.id}>
            <span className="ob-timeline-when">{m.when}</span>
            <span className="ob-timeline-what">{parent ? m.parent : m.student}</span>
          </li>
        ))}
      </ol>

      {ranked.length > 0 && (
        <p className="ob-microcopy">
          {parent
            ? `Seřadili jsme pro vás ${ranked.length} pražských škol. Celé pořadí i odůvodnění najdete v plné verzi.`
            : `Seřadili jsme ti ${ranked.length} pražských škol. Celé pořadí i vysvětlení máš v plné verzi.`}
        </p>
      )}
    </ObScreen>
  );
}

export default JourneySummary;
