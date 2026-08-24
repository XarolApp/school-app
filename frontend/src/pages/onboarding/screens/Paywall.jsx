import { useEffect, useMemo, useState } from 'react';
import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import {
  DEFAULT_PLAN_ID,
  ONE_TIME_OFFER,
  PAYMENTS_MOCKED,
  PLANS,
  TRIAL_DAYS,
  TRIAL_REMINDER_IMPLEMENTED,
  cancellationTerms,
  discountedPriceCzk,
  formatCzk,
  getPlan,
  perDayCzk,
  planCopy,
  refundTerms,
  trialFreeLabel,
  trialPlan,
} from '../../../config/pricing';
import { STUDENTS_HELPED, testimonialsFor } from '../../../config/socialProof';
import { claimOneTimeOffer, consumeOneTimeOffer } from '../../../lib/offerEntitlement';
import { mockStartSubscription } from '../../../api';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 23 — PAYWALL.
 *
 * Placement: fires the moment the quiz completes and the taste has landed —
 * contextual placement after a high-value moment converts far better than
 * walling the app at launch.
 *
 * PLAN STRUCTURE — ruling C-8, THIRD revision (2026-08-23), after the
 * single-lifetime-use follow-up in docs/sources/pricing_research.md. The two
 * options differ in COMMITMENT SHAPE, not duration, and the default FLIPPED:
 *
 *   Sezónní přístup (one-time, fixed window) — PRE-SELECTED, recommended.
 *   Měsíční (recurring, carries the 3-day trial) — secondary.
 *
 * A user goes through this product exactly once in their life, so recurring
 * billing solves a renewal problem that does not exist here; and the parent —
 * the more likely actual payer — reads an open-ended monthly charge tied to a
 * one-off decision as one more thing to remember to cancel. Weekly is dropped
 * permanently and must not come back. Do NOT re-pre-select Měsíční.
 *
 * Two things follow from the flip, and both are implemented below:
 *  1. The season pass is described as a FIXED-WINDOW pass with an explicit end
 *     ("přístup do konce března"), never as lifetime/open-ended access —
 *     the UWorld precedent, and the one way this model misleads a buyer.
 *  2. Měsíční is NOT a cheap decoy. Its job is absorbing distrust from someone
 *     who has never heard of ŠkolaMatch and wants the exit to feel close. Its
 *     copy says that out loud, and the free trial is surfaced even when the
 *     default (trial-less) plan is selected — a distrust-absorbing option the
 *     distrusting user never discovers does no work.
 *
 * Role branching (§0.2):
 *  - student: daily micro-cost framed against teen spending, "Poslat rodičům"
 *    sits BESIDE the buy button and never instead of it. No copy anywhere
 *    implies a teenager needs permission to buy.
 *  - parent: total price stated plainly first, daily breakdown second, framed
 *    against the stakes of the decision — never against snacks. Authority
 *    proof rather than peer proof. "Sdílet s dítětem" is available here too.
 *
 * Legal surfaces on this screen — every promise is gated behind a flag in
 * config/pricing.js, because a promise we have not built is worse than no
 * promise at all on the one screen where money changes hands:
 *  - Parental confirmation checkpoint on the student branch before the charge.
 *    A checkout that lets a minor put a parent's card through silently is
 *    close to the exact pattern EU regulators are looking at.
 *  - Trial reminder: TRIAL_REMINDER_IMPLEMENTED.
 *  - One-step cancellation: ONE_STEP_CANCELLATION_IMPLEMENTED.
 *  - Refund guarantee on the one-time plan: REFUND_GUARANTEE_DAYS.
 *  - One-time offer on the FIRST view only, real countdown, honest expiry copy
 *    (the price returns to normal; the product never becomes unavailable).
 *  - Nothing is pre-ticked. Exit terms sit next to the CTA.
 */
const OUTCOMES = {
  student: [
    'Celé pořadí pražských středních škol podle toho, jak ti sedí',
    'U každé školy vysvětlení, proč zrovna ona',
    'Porovnání škol vedle sebe, ať se v tom neztratíš',
    'Přehled, který můžeš rovnou ukázat rodičům',
  ],
  parent: [
    'Celé pořadí pražských středních škol podle shody s vaším dítětem',
    'U každé školy rozepsané odůvodnění, ne jen číslo',
    'Srovnání škol vedle sebe podle zaměření a dostupnosti',
    'Přehled ke stažení, se kterým se dá jít na dny otevřených dveří',
  ],
};

/**
 * Trust anchors immediately adjacent to the CTA (§1.6) — they defuse payment
 * anxiety at the exact moment it peaks.
 *
 * HONESTY CONSTRAINT: config/socialProof.js is deliberately empty because
 * ŠkolaMatch has no users yet, and an invented "už 1 240 deváťáků" shown to a
 * minor and their parent is a misleading commercial practice under the UCPD.
 * So this block ships the strongest claims that are TRUE TODAY — the free #1
 * match they have already seen with their own eyes, deterministic scoring,
 * where their answers live, and the fact that we refuse to fake reviews.
 * Methodology transparency is genuinely the right proof for the parent branch
 * anyway (§0.2 authority proof).
 *
 * Real proof drops in with no change here: fill STUDENTS_HELPED / TESTIMONIALS
 * and the count line and quote appear above the method claims automatically.
 */
const CTA_PROOF = {
  student: [
    'Jedničku máš zdarma — nekupuješ nic naslepo.',
    'Pořadí počítá matematika z tvých odpovědí, ne náhoda ani reklama.',
    'Odpovědi z dotazníku zůstávají u tebe v prohlížeči.',
  ],
  parent: [
    'Nejlepší shodu jste viděli zdarma ještě před jakoukoli platbou.',
    'Skóre je deterministický výpočet z odpovědí, u každé školy rozepsaný.',
    'Odpovědi z dotazníku neprodáváme a nepředáváme školám.',
  ],
};

function CtaProof({ role }) {
  const parent = role === 'parent';
  const testimonials = testimonialsFor(parent ? 'parent' : 'student');
  const quote = testimonials[0];

  return (
    <div className="ob-cta-proof">
      {STUDENTS_HELPED && (
        <p className="ob-cta-proof-count">
          {parent
            ? `Dotazníkem už prošlo ${STUDENTS_HELPED.toLocaleString('cs-CZ')} rodin.`
            : `Dotazníkem už prošlo ${STUDENTS_HELPED.toLocaleString('cs-CZ')} deváťáků.`}
        </p>
      )}

      {quote && (
        <blockquote className="ob-cta-proof-quote">
          <p>{quote.quote}</p>
          <cite>{quote.author}</cite>
        </blockquote>
      )}

      <ul className="ob-cta-proof-list">
        {(parent ? CTA_PROOF.parent : CTA_PROOF.student).map((line) => (
          <li key={line}>{line}</li>
        ))}
        {!quote && (
          <li>
            {parent
              ? 'Nezveřejňujeme vymyšlené recenze ani čísla uživatelů. Až budou skutečné, uvidíte je tady.'
              : 'Vymyšlené recenze tu nenajdeš. Ukážeme je, až budou od skutečných lidí.'}
          </li>
        )}
      </ul>
    </div>
  );
}

function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const left = Math.max(0, expiresAt - now);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  return { left, label: `${mm}:${String(ss).padStart(2, '0')}` };
}

function Paywall() {
  const { role, goBack, ranked, setPurchased, goNext } = useOnboarding();
  const parent = role === 'parent';
  const voice = parent ? 'parent' : 'student';
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [stage, setStage] = useState('plans'); // plans | confirm | working
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [shareNote, setShareNote] = useState('');

  // Ruling C-9: granted once, on the first paywall view, and never again.
  const [offer] = useState(() => claimOneTimeOffer());
  const countdown = useCountdown(offer.eligible ? offer.expiresAt : null);
  const offerLive = offer.eligible && countdown && countdown.left > 0;

  const plan = getPlan(planId);
  const price = offerLive && plan.id === ONE_TIME_OFFER.planId ? discountedPriceCzk(plan) : plan.priceCzk;
  const outcomes = parent ? OUTCOMES.parent : OUTCOMES.student;

  const dailyPlan = useMemo(() => ({ ...plan, priceCzk: price }), [plan, price]);
  const cancellation = cancellationTerms(plan, voice);
  const refund = refundTerms(plan, voice);
  const offerPlan = getPlan(ONE_TIME_OFFER.planId);
  const withTrial = trialPlan();
  const lockedCount = Math.max(ranked.length - 1, 0);

  const finish = async () => {
    setStage('working');
    // Consume on ANY completed purchase, not only when the discounted plan was
    // the one bought. Once a user has converted, the "one-time" window is over;
    // leaving it live would let the same offer greet them again later, which is
    // exactly the reappearing-offer pattern C-9 forbids.
    consumeOneTimeOffer();
    await mockStartSubscription({
      planId: plan.id,
      priceCzk: price,
      role,
      offerApplied: offerLive && plan.id === ONE_TIME_OFFER.planId,
    });
    setPurchased(true);
    goNext();
  };

  /**
   * If the one-time offer expires (or the plan changes) while the guardian
   * confirmation checkbox is already ticked, the price under that consent has
   * moved. Consent to 483 Kč is not consent to 690 Kč — re-ask. Cheap to do,
   * and it is exactly the kind of silent price-swap-after-consent that §0.4
   * exists to prevent.
   */
  useEffect(() => {
    setGuardianConfirmed(false);
  }, [price, plan.id]);

  const onCta = () => {
    // Student branch: a parent/guardian confirms the payment before it happens.
    if (!parent) {
      setStage('confirm');
      return;
    }
    finish();
  };

  /**
   * §0.2: the handoff is an option on BOTH branches. A student shows the
   * result to a parent; a parent shows it to their child. Neither direction is
   * a funnel into the other, and on the student branch this button sits beside
   * the buy button, never instead of it.
   */
  const share = async () => {
    const text = parent
      ? 'Tohle jsou výsledky ze ŠkolaMatch — podívej se na školy, které ti podle dotazníku sedí nejvíc.'
      : 'Podívejte se na moje výsledky na ŠkolaMatch — vybírám střední školu.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ŠkolaMatch', text, url: window.location.origin });
        setShareNote('Odesláno.');
        return;
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      setShareNote(
        parent ? 'Odkaz zkopírován — můžete ho poslat dítěti.' : 'Odkaz zkopírován — pošli ho rodičům.'
      );
    } catch {
      setShareNote(
        parent ? 'Sdílení se nepovedlo, zkuste to prosím znovu.' : 'Sdílení se nepovedlo, zkus to prosím znovu.'
      );
    }
  };

  // Stay on the guardian screen while the (mocked) charge runs. Dropping back
  // to the price list mid-payment reads as "something went wrong" to the adult
  // who just authorised it.
  if (stage === 'confirm' || (stage === 'working' && !parent)) {
    const working = stage === 'working';
    return (
      <ObScreen chrome={false}>
        <div className="ob-confirm">
          <h1 className="ob-title">Ještě potvrzení rodiče</h1>
          <p className="ob-lead">
            U nákupů, kde je kupujícímu méně než 18 let, musí platbu potvrdit rodič nebo zákonný
            zástupce. Není to schvalování tvého výběru školy — jde jenom o tu platbu.
          </p>

          <div className="ob-confirm-box">
            <p className="ob-confirm-line">
              <strong>{plan.name}</strong> — {formatCzk(price)} {plan.priceSuffix}
            </p>
            <p className="ob-confirm-line">{planCopy(plan, voice, 'terms')}</p>
            {plan.hasTrial && (
              <p className="ob-confirm-line">
                {trialFreeLabel()}, platba proběhne {TRIAL_DAYS}. den.
              </p>
            )}
            <p
              className={`ob-confirm-line ob-confirm-terms${
                cancellation.unbuilt ? ' ob-trust-unbuilt' : ''
              }`}
            >
              {cancellation.text}
            </p>
            {refund && <p className="ob-confirm-line ob-confirm-terms">{refund}</p>}
            {PAYMENTS_MOCKED && (
              <p className="ob-confirm-line ob-confirm-terms">
                Ukázková verze: platební brána zatím není napojená, nic se z účtu nestrhne.
              </p>
            )}
          </div>

          <label className="ob-check">
            <input
              type="checkbox"
              checked={guardianConfirmed}
              disabled={working}
              onChange={(e) => setGuardianConfirmed(e.target.checked)}
            />
            <span>
              Jsem rodič nebo zákonný zástupce, rozumím ceně i podmínkám a s platbou souhlasím.
            </span>
          </label>

          <ObButton onClick={finish} disabled={!guardianConfirmed || working}>
            {working ? 'Zpracováváme…' : 'Potvrdit a pokračovat'}
          </ObButton>

          <div className="ob-confirm-alt">
            <p className="ob-microcopy">Rodič není zrovna u tebe?</p>
            <ObButton variant="ghost" onClick={share} disabled={working}>
              Poslat rodičům odkaz
            </ObButton>
            {shareNote && <span className="ob-share-note">{shareNote}</span>}
          </div>

          <button
            type="button"
            className="ob-skip"
            disabled={working}
            onClick={() => setStage('plans')}
          >
            Zpět na ceník
          </button>
        </div>
      </ObScreen>
    );
  }

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-paywall">
        <button type="button" className="ob-back ob-back-loose" onClick={goBack} aria-label="Zpět">
          <span aria-hidden="true">←</span>
        </button>

        <h1 className="ob-title">{parent ? 'Odemkněte celé pořadí' : 'Odemkni si celé pořadí'}</h1>
        <p className="ob-lead">
          {parent
            ? `Nejlepší shodu jste viděli zdarma. V plné verzi najdete zbývajících ${lockedCount} škol i s odůvodněním.`
            : `Jedničku máš zdarma. V plné verzi uvidíš zbylých ${lockedCount} škol i s vysvětlením.`}
        </p>

        <ul className="ob-outcomes">
          {outcomes.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>

        {offerLive && (
          <div className="ob-offer">
            <strong>
              Jednorázová sleva {ONE_TIME_OFFER.discountPercent} % na {offerPlan.name.toLowerCase()}
            </strong>
            <span className="ob-offer-timer">Platí ještě {countdown.label}</span>
            <span className="ob-offer-note">
              {parent
                ? 'Nabídku ukazujeme jednou a znovu se neobjeví. Až vyprší, cena se vrátí na běžnou — aplikace vám zůstane dostupná dál.'
                : 'Nabídku ukazujeme jednou a znovu se neobjeví. Až vyprší, cena se vrátí na běžnou — appka ti zůstane dostupná dál.'}
            </span>
            {plan.id !== ONE_TIME_OFFER.planId && (
              <span className="ob-offer-note">Sleva platí na {offerPlan.name}.</span>
            )}
          </div>
        )}

        <div className="ob-plans">
          {PLANS.map((p) => {
            const selected = p.id === planId;
            const shown = offerLive && p.id === ONE_TIME_OFFER.planId ? discountedPriceCzk(p) : p.priceCzk;
            const discounted = shown !== p.priceCzk;
            return (
              <button
                type="button"
                key={p.id}
                className={`ob-plan${selected ? ' is-selected' : ''}`}
                onClick={() => setPlanId(p.id)}
                aria-pressed={selected}
              >
                <span className="ob-plan-head">
                  <span className="ob-plan-name">{p.name}</span>
                  {p.recommended && <span className="ob-plan-tag">Doporučujeme</span>}
                </span>
                <span className="ob-plan-price">
                  {discounted && <s className="ob-plan-strike">{formatCzk(p.priceCzk)}</s>}{' '}
                  {formatCzk(shown)} <span className="ob-plan-suffix">{p.priceSuffix}</span>
                </span>
                <span className="ob-plan-sub">
                  {p.windowLabel} · {perDayCzk({ ...p, priceCzk: shown })} Kč na den
                </span>
                {p.hasTrial && <span className="ob-plan-trial">{trialFreeLabel()}</span>}
                <span className="ob-plan-pitch">{planCopy(p, voice, 'pitch')}</span>
              </button>
            );
          })}
        </div>

        <p className="ob-price-frame">
          {plan.billing === 'one_time'
            ? parent
              ? `Jednou ${formatCzk(price)}, ${plan.windowLabel}. V přepočtu ${perDayCzk(dailyPlan)} Kč na den po celou dobu, kdy se rozhodnutí o škole opravdu dělá.`
              : `${perDayCzk(dailyPlan)} Kč na den, ${plan.windowLabel}. To je míň než svačina v bufetu — a zaplatíš jenom jednou.`
            : parent
              ? `${formatCzk(price)} měsíčně, tedy ${perDayCzk(dailyPlan)} Kč na den. Účtuje se, dokud předplatné neukončíte.`
              : `${perDayCzk(dailyPlan)} Kč na den. Platí se každý měsíc, dokud to nezrušíš.`}
        </p>

        {plan.hasTrial ? (
          <div className="ob-timeline-trial">
            <h2 className="ob-subtitle">Jak to funguje</h2>
            <ol>
              <li>
                <strong>Dnes</strong> — přístup zdarma, 0 Kč
              </li>
              {TRIAL_REMINDER_IMPLEMENTED && (
                <li>
                  <strong>{TRIAL_DAYS - 1}. den</strong> — připomeneme e-mailem, že zkušební období
                  končí zítra
                </li>
              )}
              <li>
                <strong>{TRIAL_DAYS}. den</strong> — začíná platba {formatCzk(price)} za{' '}
                {plan.periodLabel}
              </li>
            </ol>
            {!TRIAL_REMINDER_IMPLEMENTED && (
              <p className="ob-microcopy">
                {parent
                  ? 'Připomenutí před koncem zkušebního období zatím neslibujeme — dokud ho technicky nemáme, nebudeme ho tvrdit.'
                  : 'Připomínku před koncem zkušebního období zatím neslibujeme — dokud ji fakt nemáme, nebudeme ji tvrdit.'}
              </p>
            )}
          </div>
        ) : (
          withTrial && (
            /**
             * The default plan has no trial, so without this the trial is
             * invisible to a first-time visitor. That would quietly delete the
             * only risk-reducer we have for someone who has never heard of us —
             * which is the exact job C-8 assigns to Měsíční. Surfaced as an
             * option, not as a nudge: Sezónní stays selected and recommended.
             */
            <p className="ob-trial-pointer">
              {parent
                ? `Nechcete platit rovnou? ${withTrial.name} varianta má ${trialFreeLabel().toLowerCase()}.`
                : `Nechceš platit hned? ${withTrial.name} má ${trialFreeLabel().toLowerCase()}.`}{' '}
              <button
                type="button"
                className="ob-inline-link"
                onClick={() => setPlanId(withTrial.id)}
              >
                {parent ? 'Zobrazit podmínky' : 'Mrknout na to'}
              </button>
            </p>
          )
        )}

        <CtaProof role={voice} />

        <div className="ob-cta-cluster">
          <ObButton onClick={onCta} disabled={stage === 'working'}>
            {stage === 'working' ? 'Zpracováváme…' : planCopy(plan, voice, 'ctaLabel')}
          </ObButton>

          <ObButton variant="ghost" onClick={share}>
            {parent ? 'Sdílet s dítětem' : 'Poslat rodičům'}
          </ObButton>
          {shareNote && <span className="ob-share-note">{shareNote}</span>}

          <ul className="ob-trust">
            <li className={cancellation.unbuilt ? 'ob-trust-unbuilt' : undefined}>
              {cancellation.text}
            </li>
            {refund && <li>{refund}</li>}
            <li>Platební údaje nevidíme ani neukládáme.</li>
            <li>Ceny jsou včetně DPH.</li>
          </ul>

          {PAYMENTS_MOCKED && (
            <p className="ob-mock-note">
              Ukázková verze: platební brána zatím není napojená, nic se nestrhne.
            </p>
          )}
        </div>
      </div>
    </ObScreen>
  );
}

export default Paywall;
