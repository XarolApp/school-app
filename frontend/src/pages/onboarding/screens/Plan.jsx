import { ObScreen } from '../../../components/onboarding/ObKit';
import {
  ACCESS_END_LABEL,
  DEADLINE_LABEL,
  PAYMENTS_MOCKED,
  PLANS,
  cancellationTerms,
  formatCzk,
  getPlan,
  planCopy,
  trialFreeLabel,
} from '../../../config/pricing';
import { useOffer } from '../../../lib/usePrices';
import { useOnboarding } from '../useOnboarding';
import { useG } from '../../../lib/gender';
import ParentPayHandoff from '../../../components/ParentPayHandoff';
import { Icon, PayCta, PayStepChrome } from './paywallKit';

/**
 * Paywall step 3 of 5 — PLAN (choose your access).
 *
 * The first screen in the sequence where a price appears at all. Everything
 * about money on it is read from config/pricing.js; there is not one hardcoded
 * amount, plan name, trial length or cancellation claim in this file.
 *
 * RULING C-8 (third revision) — two plans on a commitment-shape axis, Sezónní
 * pre-selected, Měsíční secondary and NOT a decoy. Both prices render at equal
 * visual weight: pre-selecting one is only legitimate because the other's cost
 * is right there, unhidden. Weekly does not exist and must not come back.
 *
 * PRICES COME FROM THE SERVER (plan 025). The season price falls a few crowns
 * every day until the end of applications, so a number kept in this file would
 * be wrong tomorrow. There is deliberately NO struck-through "was" price and no
 * "sleva" wording: a price that simply falls over time is not an announced
 * reduction, and a crossed-out figure would make it one (Omnibus Art. 6a). The
 * comparison that remains is checkable: the monthly card names the most it can
 * cost in total ("celkem nejvýš …"), so the season card's advantage is visible.
 *
 * VARIANT A (per the design annotation): the cards SELECT, and one shared CTA
 * at the bottom confirms. A button inside each card would put two primary
 * actions on one screen of a multi-step wizard.
 *
 * §0.2 — "Ať to zaplatí rodič" sits BESIDE the buy button, never instead of it,
 * and nothing here implies a teenager needs permission to buy. On the parent
 * branch the same control points the other way ("Poslat odkaz dítěti").
 *
 * Source: design/paywall-multipage-extract4/{Main,WebPlan,ParentMain}.
 */

/** Outcomes, never features (§1.5). Desktop-only: on a phone the two cards and
 *  the CTA are already a full screen, and this list would push them under the
 *  fold. Both plans unlock exactly the same thing, which is why it sits once,
 *  above the cards, instead of being duplicated into each card. */
const UNLOCKS = {
  student: [
    'Celé pořadí pražských středních škol podle toho, jak ti sedí',
    'U každé školy vysvětlení, proč zrovna ona se k tobě hodí nebo nehodí',
    'Porovnání škol vedle sebe',
    'Přehled, který můžeš rovnou ukázat rodičům',
  ],
  parent: [
    'Celé pořadí pražských středních škol podle shody s vaším dítětem',
    'U každé školy rozepsané odůvodnění, ne jen číslo',
    'Porovnání škol vedle sebe',
    'Přehled k vytištění, se kterým se dá jít na dny otevřených dveří',
  ],
};

/**
 * Trust block, desktop-only, beside the cards.
 *
 * config/socialProof.js is deliberately empty — Střední na míru has no users yet,
 * and an invented "už 1 240 deváťáků" shown to a minor and their parent is a
 * misleading commercial practice under the UCPD. So these are the strongest
 * claims that are TRUE TODAY: the free #1 match they have already seen,
 * deterministic scoring nobody can buy a place in, and where the answers live.
 */
const TRUST = {
  student: [
    { icon: 'shield', lead: 'První školu jsi viděl zdarma.', rest: 'Nekupuješ nic naslepo — víš přesně, jak výsledek vypadá.' },
    { icon: 'check', lead: 'Pořadí počítá matematika', rest: 'z tvých odpovědí. Ne náhoda a ne reklama — školy si u nás pozici nekoupí.' },
    { icon: 'lock', lead: 'Odpovědi používáme jen pro tvůj výsledek.', rest: 'Po přihlášení je uložíme k účtu. Neprodáváme je a nepředáváme školám.' },
  ],
  parent: [
    { icon: 'shield', lead: 'Nejlepší shodu jste viděli zdarma.', rest: 'Nekupujete nic naslepo — víte přesně, jak výsledek vypadá.' },
    { icon: 'check', lead: 'Pořadí je deterministický výpočet', rest: 'z odpovědí, u každé školy rozepsaný. Školy si u nás pozici nekoupí.' },
    { icon: 'lock', lead: 'Odpovědi používáme jen pro váš výsledek.', rest: 'Po přihlášení je uložíme k účtu. Neprodáváme je a nepředáváme školám.' },
  ],
};

const reassuranceFor = (plan, offer, trial) => [
  trial
    ? 'Dnes se z karty nestrhne nic. Ukážeme přesné datum první platby.'
    : plan.billing === 'recurring'
      ? `Dnes se strhne ${offer.priceCzk === null ? '…' : formatCzk(offer.priceCzk)} ${offer.monthlySingleCharge ? `za dny do ${DEADLINE_LABEL}` : 'za první měsíc'}.`
      : `Dnes se strhne ${offer.priceCzk === null ? '…' : formatCzk(offer.priceCzk)} jednorázově.`,
  'Celé číslo karty zpracovává Stripe; v aplikaci ho neukládáme.',
  'Ceny jsou konečné. Žádné skryté poplatky.',
];

function PlanCard({ plan, selected, onSelect, onKeyDown, voice, offer }) {
  const cancellation = cancellationTerms(plan, voice);
  const trial = plan.id === 'season' && offer.trialAvailable;
  const priceText = offer.priceCzk === null ? '…' : formatCzk(offer.priceCzk);
  const seasonLine = offer.isSpring
    ? `Jarní přístup · do ${ACCESS_END_LABEL}`
    : `${plan.priceSuffix} · ${plan.windowLabel}`;

  return (
    <button
      type="button"
      className={`ob-pw-plan${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
    >
      {offer.discountCzk > 0 && (
        <span className="ob-pw-plan-badge">Pozvánka uplatněna: −{formatCzk(offer.discountCzk)}</span>
      )}

      <span className="ob-pw-plan-head">
        <span className="ob-pw-plan-names">
          <span className="ob-pw-plan-name">{plan.name}</span>
          <span className="ob-pw-plan-for">{planCopy(plan, voice, 'pitch')}</span>
        </span>
        <span className="ob-pw-radio" aria-hidden="true">
          {selected && <Icon.check size={13} />}
        </span>
      </span>

      <span className="ob-pw-plan-price">
        <span className="ob-pw-plan-perday">{priceText}</span>
        <span className="ob-pw-plan-real">
          {plan.billing === 'recurring'
            ? (offer.monthlySingleCharge ? `jednou · přístup do ${DEADLINE_LABEL}` : `${plan.priceSuffix} · ${plan.windowLabel}`)
            : seasonLine}
        </span>
        {plan.billing === 'recurring' && offer.monthlyTotalCzk !== null && (
          <span className="ob-pw-plan-ref">
            {offer.monthlySingleCharge
              ? `Platí se jednou za dny do ${DEADLINE_LABEL}, nic dalšího se nestrhne.`
              : `Celkem nejvýš ${formatCzk(offer.monthlyTotalCzk)}: poslední měsíc se platí jen za dny do ${DEADLINE_LABEL}, pak předplatné samo skončí.`}
          </span>
        )}
        {plan.id === 'season' && offer.seasonFalling && offer.priceCzk !== null && (
          <span className="ob-pw-plan-ref">
            Cena klesá s tím, kolik zbývá do {DEADLINE_LABEL}. Vždy je výhodnější než měsíční předplatné a jaro dohromady.
          </span>
        )}
      </span>

      <span className="ob-pw-rule" />

      {trial ? (
        <>
          <span className="ob-pw-plan-line">
            <Icon.shield size={16} className="ob-pw-ic is-ok" />
            <span>
              <strong>{trialFreeLabel()}.</strong> Dnes se nestrhne nic.
            </span>
          </span>
          <span className="ob-pw-plan-line">
            <Icon.cross size={16} className="ob-pw-ic is-ok" />
            <span>
              <strong>Bez závazku.</strong> {planCopy(plan, voice, 'terms')}
            </span>
          </span>
        </>
      ) : plan.billing === 'recurring' ? (
        <>
          <span className="ob-pw-plan-line">
            <Icon.cross size={16} className="ob-pw-ic" />
            <span className={cancellation.unbuilt ? 'ob-trust-unbuilt' : undefined}>
              <strong>Bez závazku.</strong>{' '}
              {voice === 'parent'
                ? 'Skončíte, kdy budete chtít — další měsíc se pak nestrhne.'
                : 'Skončíš, kdy budeš chtít — další měsíc se pak nestrhne.'}
            </span>
          </span>
          <span className="ob-pw-plan-line">
            <Icon.info size={16} className="ob-pw-ic" />
            <span>Platí se hned. Zkušební dny má jen sezónní varianta.</span>
          </span>
        </>
      ) : (
        <>
          <span className="ob-pw-plan-line">
            <Icon.info size={16} className="ob-pw-ic" />
            <span>
              <strong>Platí se hned.</strong>{' '}
              {voice === 'parent'
                ? 'Zkušební období už na tomto účtu nebo kartě proběhlo, nebo do přihlášek zbývá málo dní.'
                : 'Zkušební období už na tomto účtu nebo kartě proběhlo, nebo do přihlášek zbývá málo dní.'}
            </span>
          </span>
          <span className="ob-pw-plan-line">
            <Icon.cross size={16} className="ob-pw-ic is-ok" />
            <span>{planCopy(plan, voice, 'terms')}</span>
          </span>
        </>
      )}
    </button>
  );
}

function Plan() {
  const { role, goBack, goNext, goToStep, planId, setPlanId } = useOnboarding();
  const g = useG();
  const parent = role === 'parent';
  const voice = parent ? 'parent' : 'student';
  const seasonOffer = useOffer('season');
  const monthlyOffer = useOffer('monthly');
  // Monthly stops being sold when too little is left before the deadline (and
  // after it): then only the season pass is shown.
  const plans = seasonOffer.ready && !seasonOffer.monthlyAvailable ? PLANS.filter((p) => p.id !== 'monthly') : PLANS;
  const plan = getPlan(plans.some((p) => p.id === planId) ? planId : 'season');
  const offer = plan.id === 'monthly' ? monthlyOffer : seasonOffer;
  const trial = plan.id === 'season' && seasonOffer.trialAvailable;
  const closed = seasonOffer.ready && !seasonOffer.onSale;

  // A plan without a trial has no trial rail to show, so step 4 is skipped
  // rather than rendered empty. The step counter still reads "ze 4" because
  // that is what this branch of the flow actually contains.
  const onContinue = () => {
    if (plan.id !== planId) setPlanId(plan.id);
    return trial ? goNext() : goToStep('platba');
  };

  const onPlanKeyDown = (event, index) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + plans.length) % plans.length;
    setPlanId(plans[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-pw">
        <PayStepChrome step={3} onBack={goBack} role={role} />

        <div className="ob-pw-grid ob-pw-grid-plan">
          <div className="ob-pw-main">
            <div className="ob-pw-head">
              <p className="ob-eyebrow">{parent ? 'Vyberte přístup' : 'Vyber si přístup'}</p>
              <h1 className="ob-title ob-pw-title">Dvě varianty. Obě odemknou to samé.</h1>
              <p className="ob-lead">
                {parent
                  ? 'Liší se jen tím, jak se platí. Co uvidí vaše dítě v aplikaci, je u obou stejné.'
                  : 'Liší se jen tím, jak se platí. Co uvidíš v aplikaci, je u obou stejné.'}
              </p>
            </div>

            <ul className="ob-pw-list ob-pw-only-wide">
              {UNLOCKS[voice].map((line) => (
                <li key={line}>
                  <Icon.check size={17} className="ob-pw-ic is-ok" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="ob-pw-card ob-pw-trust ob-pw-only-wide">
              <span className="ob-pw-caps">Proč nám věřit</span>
              {TRUST[voice].map((t) => {
                const Ico = Icon[t.icon];
                return (
                  <p key={t.lead} className="ob-pw-plan-line">
                    <Ico size={17} className="ob-pw-ic is-ok" />
                    <span>
                      <strong>{t.icon === 'shield' && !parent ? g('První školu jsi viděl zdarma.', 'První školu jsi viděla zdarma.') : t.lead}</strong> {t.rest}
                    </span>
                  </p>
                );
              })}
              <span className="ob-pw-rule" />
              <p className="ob-pw-plan-line">
                <Icon.info size={17} className="ob-pw-ic" />
                <span className="ob-pw-fine">
                  {parent
                    ? 'Vymyšlené recenze ani počty uživatelů tu nenajdete. Ukážeme je, až budou od skutečných lidí.'
                    : 'Vymyšlené recenze ani počty uživatelů tu nenajdeš. Ukážeme je, až budou od skutečných lidí.'}
                </span>
              </p>
            </div>
          </div>

          <div className="ob-pw-side ob-pw-buybox">
            <div className="ob-pw-plans" role="radiogroup" aria-label="Varianty přístupu">
              {plans.map((p, index) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  voice={voice}
                  offer={p.id === 'monthly' ? monthlyOffer : seasonOffer}
                  selected={p.id === plan.id}
                  onSelect={() => setPlanId(p.id)}
                  onKeyDown={(event) => onPlanKeyDown(event, index)}
                />
              ))}
            </div>

            <div className="ob-pw-foot">
              {closed && (
                <div className="notice notice-error" role="alert">
                  <p className="notice-text">Prodej pro tuto sezónu už skončil.</p>
                </div>
              )}
              {seasonOffer.error && (
                <div className="notice notice-error" role="alert">
                  <p className="notice-text">Ceny se nepodařilo načíst. Obnov stránku.</p>
                </div>
              )}
              <PayCta onClick={onContinue} disabled={!offer.ready || closed}>
                {trial ? planCopy(plan, voice, 'ctaLabel') : offer.priceCzk === null ? 'Načítám cenu…' : `Pokračovat · ${formatCzk(offer.priceCzk)}`}
              </PayCta>

              <ul className="ob-pw-chips">
                {reassuranceFor(plan, offer, trial).map((line) => (
                  <li key={line}>
                    <Icon.check size={14} className="ob-pw-ic is-ok" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {!parent && (
                <ParentPayHandoff
                  voice="student"
                  variant="ghost"
                  onActivated={() => goToStep('hotovo')}
                />
              )}

              {PAYMENTS_MOCKED && (
                <p className="ob-mock-note">
                  Ukázková verze: platební brána zatím není napojená, nic se nestrhne.
                </p>
              )}

              {/* Neutral decline, same size and legibility as the accept.
                  Never confirmshaming — it would be aimed at a 15-year-old. */}
              <button type="button" className="ob-btn ob-btn-ghost ob-pw-decline" onClick={() => goToStep('hotovo')}>
                {parent ? 'Zatím ne, rozmyslíme si to' : 'Zatím ne, rozmyslím si to'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ObScreen>
  );
}

export default Plan;
