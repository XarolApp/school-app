import { ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';
import { Icon, PayCta, PayStepChrome } from './paywallKit';

/**
 * Paywall step 2 of 5 — CESTA (the season, today to March).
 *
 * Replaces the old `JourneySummary` screen. The milestone content is ported
 * from it rather than rewritten — those dates and their role-keyed phrasing
 * were already correct — and two stops were added (leden–únor shortlisting,
 * and duben as the payoff) to match the approved design.
 *
 * This is where seasonal urgency belongs (ruling C-9, permitted source 1): the
 * přihlášky deadline and dny otevřených dveří are REAL, externally verifiable
 * dates. No countdown, no manufactured scarcity — the calendar is doing the
 * work, and it costs nothing in trust.
 *
 * The March stop is also the honest frame for the season pass: the plan ends
 * exactly where the decision ends. That is the UWorld fixed-window framing
 * (ruling C-8) shown as a picture instead of asserted as a term.
 *
 * MOBILE vs WEB is the biggest structural difference in the whole design: the
 * rail runs vertically on a phone and HORIZONTALLY on desktop, where the entire
 * September-April season is visible at once — the one thing 390px physically
 * cannot do. Same DOM, one media query.
 *
 * The dates below are the standard Czech schedule. TODO(content): move to a
 * config with the exact MŠMT dates for the current school year and show the
 * year explicitly — a stale date here is worse than no date.
 *
 * Source: design/paywall-multipage-extract4/{Cesta,WebCesta,ParentCesta}.
 */
const MILESTONES = [
  {
    id: 'dnes',
    when: 'Teď · září',
    tone: 'now',
    student: {
      what: 'Máš pořadí všech škol',
      detail:
        'Víš, kterých deset má smysl řešit, a proč. Zbytek můžeš s klidem pustit z hlavy.',
    },
    parent: {
      what: 'Máte pořadí všech škol',
      detail:
        'Víte, kterých deset má smysl řešit, a proč. Zbytek můžete s klidem pustit z hlavy.',
    },
  },
  {
    id: 'dod',
    when: 'Říjen – prosinec',
    tone: 'step',
    step: 2,
    student: {
      what: 'Dny otevřených dveří',
      detail:
        'Nejdeš do náhodných tří škol, ale do těch, do kterých se hodíš — a víš, na co se ptát.',
    },
    parent: {
      what: 'Dny otevřených dveří',
      detail:
        'Nejdete do náhodných tří škol, ale do těch, které vašemu dítěti sedí — a víte, na co se ptát.',
    },
  },
  {
    id: 'uzsi-vyber',
    when: 'Leden – únor',
    tone: 'step',
    step: 3,
    student: {
      what: 'Zužuješ výběr na tři',
      detail:
        'Pomůžeme ti srovnat finalisty vedle sebe a seřadit je podle priority. Nejtěžší rozhodnutí roku.',
    },
    parent: {
      what: 'Zužujete výběr na tři',
      detail:
        'Pomůžeme vám srovnat finalisty vedle sebe a seřadit je podle priority. Nejtěžší rozhodnutí roku.',
    },
  },
  {
    id: 'prihlasky',
    when: 'Do 1. března',
    tone: 'done',
    student: {
      what: 'Přihlášky odeslané',
      detail: 'Sezónní přístup běží přesně sem — do chvíle, kdy už není co vybírat.',
    },
    parent: {
      what: 'Přihlášky odeslané',
      detail: 'Sezónní přístup běží přesně sem — do chvíle, kdy už není co vybírat.',
    },
  },
  {
    id: 'prijimacky',
    when: 'Duben',
    tone: 'future',
    step: 4,
    student: {
      what: 'Přijímačky',
      detail:
        'Tady už ti nepomůžeme — a právě proto ti chceme vrátit čas dřív. Hodně štěstí!',
    },
    parent: {
      what: 'Přijímačky',
      detail:
        'Tady už vašemu dítěti nepomůžeme — a právě proto mu chceme vrátit čas dřív. Hodně štěstí!',
    },
  },
];

function Mark({ m }) {
  return (
    <span className="ob-pw-rail-mark">
      <span className={`ob-pw-rail-dot is-${m.tone}`} aria-hidden="true">
        {m.tone === 'now' && <Icon.check size={16} />}
        {m.tone === 'done' && <Icon.sent size={15} />}
        {(m.tone === 'step' || m.tone === 'future') && m.step}
      </span>
      <span className={`ob-pw-rail-line is-${m.tone}`} aria-hidden="true" />
    </span>
  );
}

function Cesta() {
  const { role, goNext, goBack } = useOnboarding();
  const parent = role === 'parent';

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-pw">
        <PayStepChrome step={2} onBack={goBack} role={role} />

        <div className="ob-pw-head">
          <p className="ob-eyebrow">{parent ? 'Co vás čeká' : 'Co tě čeká'}</p>
          <h1 className="ob-title ob-pw-title">
            {parent
              ? 'Rozhodování trvá do března. Nejste v tom sami.'
              : 'Rozhodování trvá do března. Nejsi v tom sám.'}
          </h1>
          <p className="ob-lead">
            Tohle je celá cesta od dneška k odeslané přihlášce — a kde u toho budeme.
          </p>
        </div>

        <ol className="ob-pw-rail">
          {MILESTONES.map((m) => {
            const copy = parent ? m.parent : m.student;
            return (
              <li key={m.id} className="ob-pw-rail-item">
                <Mark m={m} />
                <div className="ob-pw-rail-body">
                  <span className={`ob-pw-rail-when is-${m.tone}`}>{m.when}</span>
                  <strong className="ob-pw-rail-what">{copy.what}</strong>
                  <span className="ob-pw-rail-detail">{copy.detail}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Desktop only: on a phone the April stop already carries this line and
            printing it twice in a row would just make it cheaper. */}
        <div className="ob-pw-payoff ob-pw-payoff-band ob-pw-only-wide">
          <Icon.clock size={22} className="ob-pw-ic is-ok" />
          <p>
            {parent
              ? 'Ty hodiny, co vaše dítě nestráví hledáním, může dát do přípravy na přijímačky — '
              : 'Ty hodiny, co nestrávíš hledáním, můžeš dát do přípravy na přijímačky — '}
            <strong>na tu část, kterou za {parent ? 'něj' : 'tebe'} nikdo neudělá.</strong>
          </p>
        </div>

        <div className="ob-pw-foot ob-pw-foot-end">
          <PayCta onClick={goNext}>Vybrat si přístup</PayCta>
        </div>
      </div>
    </ObScreen>
  );
}

export default Cesta;
