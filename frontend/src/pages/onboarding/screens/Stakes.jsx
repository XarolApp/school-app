import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 3 — neutral stakes + the problem + multi-intent, on ONE screen.
 *
 * MERGED (onboarding-v2): this replaces three separate v1 screens —
 * ProblemFraming, StakesClarifier and IntentSelect. All three did framing work
 * and none of them gave the user anything back, which put them in the steepest
 * part of the drop-off curve. Merged, they cost one tap instead of three and
 * lose nothing: the stat, the 60-schools problem and the self-articulating
 * chips are all still here.
 *
 * The stat is a NEUTRAL stakes clarifier, not a shock stat. The source playbook
 * prescribes fear here ("you will spend 16 years staring at your phone");
 * pointed at a 15-year-old mid-decision that is a guilt mechanic and the
 * zero-shame rule forbids it. Both statements below are true, verifiable and
 * blame nobody. Explicitly NOT shipped: "když si vybereš špatně, budeš litovat
 * 4 roky."
 *
 * The chips are multi-select, not one forced primary goal — Headspace measured
 * a 10% relative trial lift from allowing several. They are also
 * self-articulation: saying out loud what you need is what convinces you that
 * you need the tool. They stay CLIENT-SIDE and never reach the scoring engine —
 * intents drive copy (journey summary, paywall), never matches.
 */
const STUDENT_INTENTS = [
  { value: 'srovnat', label: 'Najít školy, co mi sedí' },
  { value: 'porovnat', label: 'Porovnat je mezi sebou' },
  { value: 'sance', label: 'Zjistit, kam se dá dostat' },
  { value: 'obor', label: 'Vybrat si zaměření' },
  { value: 'rodice', label: 'Ukázat to rodičům' },
  { value: 'terminy', label: 'Zorientovat se v termínech' },
];

const PARENT_INTENTS = [
  { value: 'srovnat', label: 'Najít školy, které dítěti sedí' },
  { value: 'porovnat', label: 'Porovnat je mezi sebou' },
  { value: 'sance', label: 'Zjistit, kam se dá dostat' },
  { value: 'obor', label: 'Ověřit volbu zaměření' },
  { value: 'dojezd', label: 'Vyřešit dojíždění' },
  { value: 'terminy', label: 'Zorientovat se v termínech' },
];

function Stakes() {
  const { role, intents, setIntents, goNext, goBack, phase } = useOnboarding();
  const parent = role === 'parent';
  const options = parent ? PARENT_INTENTS : STUDENT_INTENTS;

  const toggle = (value) => {
    setIntents(intents.includes(value) ? intents.filter((v) => v !== value) : [...intents, value]);
  };

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      actions={
        <>
          <ObButton onClick={goNext}>
            {parent ? 'Pokračovat na otázky' : 'Jdeme na otázky'}
          </ObButton>
          <button type="button" className="ob-skip" onClick={goNext}>
            Přeskočit
          </button>
        </>
      }
    >
      <div className="ob-stakes">
        <div className="ob-stakes-why">
          <p className="ob-stat">
            <span className="ob-stat-number">5 800</span>
            <span className="ob-stat-unit">
              {parent ? 'hodin stráví dítě na střední škole' : 'hodin strávíš na střední škole'}
            </span>
          </p>
          <p className="ob-lead">
            {parent
              ? 'Čtyři roky, pět dní v týdnu. Je to nejdelší souvislá věc, o které se teď rozhoduje — a rozhodnout se dá dobře.'
              : 'Čtyři roky, pět dní v týdnu. Je to nejdelší souvislá věc, o které teď rozhoduješ — a rozhodnout se dá dobře.'}
          </p>
          <div className="ob-stakes-note">
            <p>
              <strong>V Praze je přes 60 středních škol.</strong>{' '}
              {parent
                ? 'Většina rodin si projde tak tři nebo čtyři, než se rozhodne. Ne proto, že by je ostatní nezajímaly — jen je nikde nevidí pohromadě.'
                : 'Většina deváťáků si projde tak tři nebo čtyři, než se rozhodne. Ne proto, že by je ostatní nezajímaly — jen je nikde nevidí pohromadě.'}
            </p>
          </div>
        </div>

        <div className="ob-stakes-ask">
          <h1 className="ob-title">{parent ? 'S čím vám máme pomoct?' : 'S čím ti máme pomoct?'}</h1>
          <p className="ob-hint">
            {parent
              ? 'Vyberte klidně víc věcí. Podle toho poskládáme výsledek.'
              : 'Vyber klidně víc věcí. Podle toho poskládáme výsledek.'}
          </p>
          <div className="ob-chips" role="group" aria-label="S čím pomoct">
            {options.map((o) => {
              const on = intents.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`ob-chip${on ? ' is-selected' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggle(o.value)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ObScreen>
  );
}

export default Stakes;
