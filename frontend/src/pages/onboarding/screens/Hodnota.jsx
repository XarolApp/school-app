import { ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';
import { Icon, PayCta, PayStepChrome } from './paywallKit';

/**
 * Paywall step 1 of 5 — HODNOTA (what this saves you).
 *
 * Position: first screen of the split paywall, immediately after `proof`.
 * Nothing is for sale here and no price appears — that is the point. By the
 * time the plan screen asks for money the user has already received two things
 * (this argument and the season roadmap), so the sequence reads as a guided
 * path rather than a wall. The footer says "zatím nic neplatíš" out loud.
 *
 * WHY THE MATH IS SHOWN INSTEAD OF ASSERTED. "Ušetříš 12 hodin" as a bare claim
 * is unfalsifiable marketing. Rendering 60 x ~12 min and admitting in the same
 * card that it is an estimate rather than a measurement is what makes it a
 * calculation the reader can disagree with — and a claim someone can check is
 * worth more with a sceptical parent than a bigger claim they cannot.
 *
 * ZERO-SHAME (§0.3). The "bez ŠkolaMatch" column describes the SITUATION (60
 * inconsistent websites, notes in ten tabs), never the reader's competence, and
 * the payoff paragraph offers the saved hours back for přijímačky prep rather
 * than warning what happens if they get it wrong.
 *
 * Source: design/paywall-multipage-extract4/{Hodnota,WebHodnota,ParentHodnota}.
 */

/** Minutes it takes to get obory + přijímačky + DOD off one school's website.
 *  An estimate, and the card says so in the same breath it shows the number. */
const MINUTES_PER_SCHOOL = 12;

/** Used only when the catalogue has not loaded, so the argument still holds
 *  together instead of rendering "0 škol". Matches the V1 Prague scope. */
const FALLBACK_SCHOOL_COUNT = 60;

function Hodnota() {
  const { role, goNext, goBack, schools } = useOnboarding();
  const parent = role === 'parent';

  const count = schools.length || FALLBACK_SCHOOL_COUNT;
  const hours = Math.round((count * MINUTES_PER_SCHOOL) / 60);

  const cta = parent ? 'Ukázat, co nás čeká' : 'Ukázat, co mě čeká';

  const without = parent
    ? [
        <>
          Až <b>{hours} hodin</b> ztracených proklikáváním nepřehledných webů škol
        </>,
        <>{count} webů, každý jinak poskládaný</>,
        <>Poznámky na papíře nebo v deseti otevřených kartách</>,
        <>
          4 roky života strávené na škole, která <b>nevyhovuje</b> vašemu dítěti
        </>,
      ]
    : [
        <>{count} webů, každý jinak poskládaný</>,
        <>Poznámky na papíře nebo v deseti otevřených kartách</>,
        <>
          4 roky života strávené na škole, která ti <b>nevyhovuje</b>
        </>,
      ];

  const withUs = parent
    ? [
        `Všech ${count} škol na jednom místě seřazených podle preferencí vašeho dítěte`,
        'U každé napsané, proč se hodí právě jemu',
        'Srovnání škol vedle sebe na jedné obrazovce',
        // Forward-looking: the one-click handoff is designed, not built. Kept as
        // a plain sentence with no control attached, so nothing here pretends to
        // be a button that sends something.
        'Dítě vám jedním kliknutím pošle uložené školy i výsledky dotazníku',
      ]
    : [
        `Všech ${count} škol na jednom místě seřazených podle tvých preferencí`,
        'U každé napsané, proč sedí zrovna tobě',
        'Srovnání škol vedle sebe na jedné obrazovce',
        'Přehled, který můžeš rovnou nasdílet rodičům',
      ];

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-pw">
        <PayStepChrome step={1} onBack={goBack} role={role} />

        <div className="ob-pw-grid ob-pw-grid-hodnota">
          <div className="ob-pw-main">
            <div className="ob-pw-head" style={{ order: 1 }}>
              <p className="ob-eyebrow">{parent ? 'Co tím získá vaše dítě' : 'Co tím získáš'}</p>
              <h1 className="ob-title ob-pw-title">
                {parent
                  ? 'Pomůžeme vašemu dítěti vybrat školu, která se k němu doopravdy hodí'
                  : `Ušetříš si asi ${hours} odpolední klikání po webech škol`}
              </h1>
            </div>

            {/* THE MATH */}
            <div className="ob-pw-card ob-pw-math" style={{ order: 2 }}>
              <div className="ob-pw-row">
                <span className="ob-pw-row-label">Pražských středních škol</span>
                <span className="ob-pw-row-value">{count}</span>
              </div>
              <div className="ob-pw-row">
                <span className="ob-pw-row-label">
                  {parent
                    ? 'Na webu jedné školy zjistíte obory, přijímačky, den otevřených dveří'
                    : 'Na webu jedné školy zjistíš obory, přijímačky, den otevřených dveří'}
                </span>
                <span className="ob-pw-row-value">~{MINUTES_PER_SCHOOL} min</span>
              </div>
              <div className="ob-pw-rule" />
              <div className="ob-pw-row">
                <span className="ob-pw-row-label is-strong">Dohromady</span>
                <span className="ob-pw-total">{hours} hodin</span>
              </div>
              <p className="ob-pw-fine">
                Odhad, ne měřený údaj — počítáme s {count} školami v naší databázi a s tím, kolik
                zabere projít jeden školní web.{' '}
                {parent ? 'Číslo vašeho dítěte bude jiné.' : 'Tvoje číslo bude jiné.'}
              </p>
            </div>

            {/* the emotional payoff, stated plainly */}
            <div className="ob-pw-payoff" style={{ order: 5 }}>
              <p>
                {hours} hodin je zhruba <strong>{hours} odpolední</strong>
                {parent
                  ? ', když tomu vaše dítě dá hodinu denně. Buď je prosedí u klikání po nepřehledných webech — nebo je věnuje přípravě na přijímačky, které o jeho škole nakonec rozhodnou.'
                  : ', když tomu dáš hodinu denně. Buď je prosedíš u klikání po nepřehledných webech — nebo je dáš přípravě na přijímačky, které o tvé škole nakonec rozhodnou.'}
              </p>
            </div>
          </div>

          <div className="ob-pw-side">
            <div className="ob-pw-card ob-pw-compare" style={{ order: 3 }}>
              <span className="ob-pw-caps">Bez ŠkolaMatch</span>
              <ul className="ob-pw-list">
                {without.map((line, i) => (
                  <li key={i}>
                    <span className="ob-pw-dash" aria-hidden="true">
                      —
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ob-pw-card ob-pw-compare is-raised" style={{ order: 4 }}>
              <span className="ob-pw-caps is-accent">Se ŠkolaMatch</span>
              <ul className="ob-pw-list">
                {withUs.map((line) => (
                  <li key={line}>
                    <Icon.check size={16} className="ob-pw-ic is-ok" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ob-pw-foot" style={{ order: 6 }}>
              <PayCta onClick={goNext}>{cta}</PayCta>
            </div>
          </div>
        </div>
      </div>
    </ObScreen>
  );
}

export default Hodnota;
