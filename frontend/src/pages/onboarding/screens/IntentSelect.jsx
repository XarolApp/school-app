import { ObButton, ObOption, ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 5 — Multi-intent selection.
 *
 * Two mechanics at once:
 *  1. Multi-intent, not one forced primary goal. Headspace's multi-select
 *     produced a 10% relative lift in free-trial conversion, and this product
 *     genuinely solves several problems at once.
 *  2. Self-articulation. These options are not primarily data collection —
 *     they make the user say out loud what they need, which is what convinces
 *     them they need the tool. The answers come back at them on the mirroring
 *     screen and again in the journey summary.
 *
 * Kept OUT of the scoring engine on purpose: intents drive copy, not matches.
 * They stay client-side and are never written to the database.
 */
const STUDENT_INTENTS = [
  { value: 'nevim', label: 'Vůbec nevím, kam chci' },
  { value: 'srovnat', label: 'Chci školy konečně porovnat na jednom místě' },
  { value: 'blizko', label: 'Chci školu, kam to nebudu mít přes celou Prahu' },
  { value: 'obor', label: 'Vím, co mě baví — hledám k tomu školu' },
  { value: 'rodice', label: 'Chci to ukázat rodičům, ať to nemusím pořád vysvětlovat' },
  { value: 'jistota', label: 'Chci si být jistý, že nedělám blbost' },
];

const PARENT_INTENTS = [
  { value: 'prehled', label: 'Chci přehled o všech pražských školách na jednom místě' },
  { value: 'podpora', label: 'Chci dítě podpořit, ale nerozhodovat za něj' },
  { value: 'obor', label: 'Chci ověřit, jestli zvolený obor dává smysl' },
  { value: 'dojezd', label: 'Řeším dojíždění a čas' },
  { value: 'jistota', label: 'Chci mít jistotu, že jsme na nic nezapomněli' },
  { value: 'termin', label: 'Potřebuji se zorientovat v termínech přihlášek' },
];

function IntentSelect() {
  const { role, intents, setIntents, goNext, goBack, progress } = useOnboarding();
  const parent = role === 'parent';
  const options = parent ? PARENT_INTENTS : STUDENT_INTENTS;

  const toggle = (value) => {
    setIntents(intents.includes(value) ? intents.filter((v) => v !== value) : [...intents, value]);
  };

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      actions={
        <>
          <ObButton onClick={goNext}>Pokračovat</ObButton>
          <button type="button" className="ob-skip" onClick={goNext}>
            Přeskočit
          </button>
        </>
      }
    >
      <h1 className="ob-title">{parent ? 'S čím vám máme pomoct?' : 'S čím ti máme pomoct?'}</h1>
      <p className="ob-hint">
        {parent ? 'Klidně vyberte více možností.' : 'Klidně vyber víc věcí najednou.'}
      </p>
      <div className="ob-options">
        {options.map((o) => (
          <ObOption
            key={o.value}
            multi
            selected={intents.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </ObOption>
        ))}
      </div>
    </ObScreen>
  );
}

export default IntentSelect;
