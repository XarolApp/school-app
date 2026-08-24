import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 4 — Neutral stakes clarifier + the pivotal reframe.
 *
 * Ruling C-3 applied. The source playbook prescribes a fear-based shock stat
 * here ("you will spend 16 years staring at your phone"). Pointed at a
 * 15-year-old already under the most stressful decision of their life so far,
 * that is a guilt mechanic and it is forbidden by the zero-shame rule.
 *
 * The STRUCTURE survives, the fear is removed: a true, high-salience,
 * blames-nobody fact (4 years ~ 5 800 hodin), immediately followed by the
 * antidote half of the pattern ("nebojte, od toho jsme tu my"). That second
 * half is what actually converts, and it is fully compliant.
 *
 * Explicitly NOT shipped: "když si vybereš špatně, budeš litovat 4 roky."
 */
function StakesClarifier() {
  const { role, goNext, goBack, progress } = useOnboarding();
  const parent = role === 'parent';

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      actions={<ObButton onClick={goNext}>{parent ? 'Pojďme na to' : 'Jdu do toho'}</ObButton>}
    >
      <div className="ob-stat">
        <span className="ob-stat-number">5 800</span>
        <span className="ob-stat-unit">hodin</span>
      </div>
      <h1 className="ob-title">
        {parent ? 'Tolik hodin dítě na střední škole stráví.' : 'Tolik hodin na střední strávíš.'}
      </h1>
      <p className="ob-lead">
        {parent
          ? 'Čtyři roky, každý všední den. Vyplatí se věnovat výběru o něco víc než odpoledne strávené proklikáváním webů jednotlivých škol.'
          : 'Čtyři roky, každý všední den. Za tři minuty tady zjistíš víc než za odpoledne proklikávání webů jednotlivých škol.'}
      </p>
      <p className="ob-reframe">
        {parent
          ? 'Od toho jsme tu my. Projdeme s vámi deset otázek a seřadíme pražské školy podle toho, jak k vašemu dítěti sedí.'
          : 'A od toho jsme tu my. Deset otázek a seřadíme ti pražské školy podle toho, jak k tobě sedí.'}
      </p>
    </ObScreen>
  );
}

export default StakesClarifier;
