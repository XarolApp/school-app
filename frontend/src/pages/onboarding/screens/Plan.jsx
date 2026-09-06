import { ObScreen } from '../../../components/onboarding/ObKit';
import {
  PAYMENTS_MOCKED,
  PLANS,
  cancellationTerms,
  formatCzk,
  getPlan,
  perDayCzk,
  planCopy,
  savingsVsMonthly,
  trialFreeLabel,
} from '../../../config/pricing';
import { useOnboarding } from '../useOnboarding';
import { Icon, PayCta, PayStepChrome, useHandoffShare } from './paywallKit';

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
 * THE SAVINGS BADGE IS CHECKABLE. "Ušetříš X %" is computed by
 * savingsVsMonthly() from the same constants the cards display, and the
 * footnote under the cards names both sides of the comparison and admits where
 * it stops holding ("kdo skončí dřív, ušetří míň"). A badge whose arithmetic
 * the reader cannot reproduce is a claim, not a saving — and Měsíční keeps its
 * own "pro koho to je" line and its own benefit so the badge cannot turn it
 * into a decoy tier, which C-8 explicitly forbids.
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
    'Přehled ke stažení, se kterým se dá jít na dny otevřených dveří',
  ],
};

/**
 * Trust block, desktop-only, beside the cards.
 *
 * config/socialProof.js is deliberately empty — ŠkolaMatch has no users yet,
 * and an invented "už 1 240 deváťáků" shown to a minor and their parent is a
 * misleading commercial practice under the UCPD. So these are the strongest
 * claims that are TRUE TODAY: the free #1 match they have already seen,
 * deterministic scoring nobody can buy a place in, and where the answers live.
 */
const TRUST = {
  student: [
    { icon: 'shield', lead: 'První školu jsi viděl zdarma.', rest: 'Nekupuješ nic naslepo — víš přesně, jak výsledek vypadá.' },
    { icon: 'check', lead: 'Pořadí počítá matematika', rest: 'z tvých odpovědí. Ne náhoda a ne reklama — školy si u nás pozici nekoupí.' },
    { icon: 'lock', lead: 'Odpovědi zůstávají u tebe', rest: 'v prohlížeči. Neprodáváme je a nepředáváme školám.' },
  ],
  parent: [
    { icon: 'shield', lead: 'Nejlepší shodu jste viděli zdarma.', rest: 'Nekupujete nic naslepo — víte přesně, jak výsledek vypadá.' },
    { icon: 'check', lead: 'Pořadí je deterministický výpočet', rest: 'z odpovědí, u každé školy rozepsaný. Školy si u nás pozici nekoupí.' },
    { icon: 'lock', lead: 'Odpovědi zůstávají ve vašem prohlížeči.', rest: 'Neprodáváme je a nepředáváme školám.' },
  ],
};

const REASSURANCE = [
  'Dnes se z karty nestrhne nic. Ukážeme přesné datum první platby.',
  'Platební údaje nevidíme ani neukládáme.',
  'Ceny jsou včetně DPH. Žádné skryté poplatky.',
];

function PlanCard({ plan, selected, onSelect, voice, savings }) {
  const perDay = perDayCzk(plan);
  const cancellation = cancellationTerms(plan, voice);
  const showBadge = plan.recommended && savings.percent > 0;

  return (
    <button
      type="button"
      className={`ob-pw-plan${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
    >
      {showBadge && (
        <span className="ob-pw-plan-badge">
          {voice === 'parent' ? 'Ušetříte' : 'Ušetříš'} {savings.percent} %
        </span>
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
        <span className="ob-pw-plan-perday">
          {perDay} Kč <span className="ob-pw-plan-unit">na den</span>
        </span>
        <span className="ob-pw-plan-real">
          {formatCzk(plan.priceCzk)} {plan.priceSuffix} · {plan.windowLabel}
        </span>
        {plan.recommended && savings.percent > 0 && (
          <span className="ob-pw-plan-ref">
            <s>{formatCzk(savings.referenceCzk)}</s> při platbě po měsících
          </span>
        )}
      </span>

      <span className="ob-pw-rule" />

      {plan.hasTrial ? (
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
      ) : (
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
      )}
    </button>
  );
}

function Plan() {
  const { role, goBack, goNext, goToStep, planId, setPlanId } = useOnboarding();
  const parent = role === 'parent';
  const voice = parent ? 'parent' : 'student';
  const plan = getPlan(planId);
  const savings = savingsVsMonthly();
  const { share, note } = useHandoffShare(role);

  // A plan without a trial has no trial rail to show, so step 4 is skipped
  // rather than rendered empty. The step counter still reads "ze 4" because
  // that is what this branch of the flow actually contains.
  const onContinue = () => (plan.hasTrial ? goNext() : goToStep('platba'));

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
                      <strong>{t.lead}</strong> {t.rest}
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
              {PLANS.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  voice={voice}
                  savings={savings}
                  selected={p.id === plan.id}
                  onSelect={() => setPlanId(p.id)}
                />
              ))}
            </div>

            {savings.percent > 0 && (
              <p className="ob-pw-fine">
                Srovnáváme {formatCzk(savings.seasonCzk)} jednorázově proti{' '}
                {formatCzk(savings.monthlyCzk)} měsíčně po celých {savings.months} měsíců
                rozhodovacího období (září–březen), tedy {formatCzk(savings.referenceCzk)}. Kdo
                skončí dřív, ušetří míň.
              </p>
            )}

            <div className="ob-pw-foot">
              <PayCta onClick={onContinue}>{planCopy(plan, voice, 'ctaLabel')}</PayCta>

              <ul className="ob-pw-chips">
                {REASSURANCE.map((line) => (
                  <li key={line}>
                    <Icon.check size={14} className="ob-pw-ic is-ok" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <button type="button" className="ob-btn ob-btn-ghost" onClick={share}>
                {parent ? 'Poslat odkaz dítěti' : 'Ať to zaplatí rodič'}
              </button>
              {note && <span className="ob-share-note">{note}</span>}

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
