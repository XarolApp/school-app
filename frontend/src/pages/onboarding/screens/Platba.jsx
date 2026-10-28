import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ObScreen } from '../../../components/onboarding/ObKit';
import {
  PAYMENTS_MOCKED,
  cancellationTerms,
  formatCzDate,
  formatCzk,
  getPlan,
  planCopy,
  refundTerms,
  trialChargeDate,
} from '../../../config/pricing';
import { createCheckoutSession } from '../../../api';
import { useOffer } from '../../../lib/usePrices';
import { useG } from '../../../lib/gender';
import { useOnboarding } from '../useOnboarding';
import { useAuth } from '../../../components/AuthContext';
import ParentPayHandoff from '../../../components/ParentPayHandoff';
import { Icon, PayCta, PayStepChrome } from './paywallKit';

/**
 * Paywall step 5 of 5 — PLATBA (card, consent, order summary).
 *
 * Deliberately NOT numbered in the step chrome: a counter still ticking while
 * the card form is open reads as "there is more after this".
 *
 * PAYMENTS (plan 009): a real Stripe Checkout session is created server-side
 * and the browser is redirected to Stripe's own hosted page — card data never
 * enters this app's state. We retain Stripe identifiers needed to manage the
 * order/access. `PAYMENTS_MOCKED` is a static display flag, not a key detector;
 * missing backend keys produce the handled STRIPE_NOT_CONFIGURED API error.
 *
 * CONSENT: the parental self-attestation was removed by founder decision on
 * 2026-09-22 (commit 9a8f8cc); the age / guardian confirmation happens once, at
 * account creation (ConsentCheckbox). There is ONE checkbox here, a different
 * thing: the express request for access to start at once (plan 025 §4.9). Without
 * it the law (§1834 OZ, CRD Art. 14(3)) lets us keep nothing if the person
 * withdraws within 14 days, so it is required and unticked by default.
 * The student branch keeps a visible "Platí ti to rodič?" route — an option,
 * not a gate (§0.2). The parent branch says the account is for their child.
 *
 * Plan amounts, trial dates and cancellation copy come from config/pricing.js.
 * The statutory withdrawal summary links to the contractual terms.
 *
 * Source: design/paywall-multipage-extract4/{Platba,WebPlatba,ParentPlatba}.
 */
function Platba() {
  const {
    role,
    goToStep,
    planId,
    isTester,
    betaPreview,
    profileResolved,
    profileResolving,
    profileError,
    refreshProfile,
    leaveBetaPreview,
  } = useOnboarding();
  const { isSignedIn, user, profile } = useAuth();
  const g = useG();
  const parent = role === 'parent';
  const voice = parent ? 'parent' : 'student';
  const plan = getPlan(planId);
  const offer = useOffer(plan.id === 'monthly' ? 'monthly' : 'season');
  // The trial is real only while the server still offers it to this account.
  const trial = plan.id === 'season' && offer.trialAvailable;
  // The date allows a trial but this account (or, found after the card form, its
  // card) already had one: say so before any money moves.
  const trialUsed = plan.id === 'season' && Boolean(offer.prices?.season?.trialAvailable) && profile?.trialEligible === false;
  const priceText = offer.priceCzk === null ? '…' : formatCzk(offer.priceCzk);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);
  const [immediateStart, setImmediateStart] = useState(false);
  const [serverNoTrial, setServerNoTrial] = useState(false);
  const payNow = !trial || serverNoTrial;

  const chargeLabel = useMemo(
    () => (trial ? formatCzDate(trialChargeDate(new Date())) : null),
    [trial]
  );

  const cancellation = cancellationTerms(plan, voice);
  const refund = refundTerms(plan, voice);
  const backStep = trial ? 'zkusebni' : 'plan';
  const accountResolved = profileResolved && isSignedIn && Boolean(user);

  const submit = async () => {
    setError(null);
    if (!accountResolved) {
      setError(parent
        ? 'Nejdřív ověřujeme přihlášený účet. Platbu zatím nelze zahájit.'
        : 'Nejdřív ověřujeme tvůj účet. Platbu zatím nelze zahájit.');
      return;
    }
    if (isTester) {
      if (betaPreview) goToStep('hotovo');
      else setError(parent ? 'Ukázku otevřete z obrazovky pro beta testery.' : 'Ukázku otevři z obrazovky pro beta testery.');
      return;
    }

    if (offer.priceCzk === null) return;
    // A trial that the server just refused is only shown, never silently
    // skipped: this click is the person's answer to "zaplatíš hned".
    if (trial && serverNoTrial) {
      setError(null);
    }
    setWorking(true);
    document.documentElement.dataset.snmStripeRedirecting = 'true';
    try {
      const { url } = await createCheckoutSession({
        planId: plan.id,
        returnTo: '/onboarding/hotovo',
        immediateStart: true,
        referralCode: offer.referralCode || undefined,
        confirmPriceCzk: offer.priceCzk,
        acknowledgedNoTrial: trialUsed || serverNoTrial ? true : undefined,
      });
      // Full navigation on purpose — Stripe's hosted checkout page is not part
      // of this SPA. Purchase is confirmed by the webhook, not by anything
      // that happens client-side here, so there is no goNext()/setPurchased()
      // on this path: the account updates once Stripe tells our backend it did.
      window.location.href = url;
    } catch (err) {
      delete document.documentElement.dataset.snmStripeRedirecting;
      setWorking(false);
      // An already running plan means the payment went through; the account
      // is only waiting for Stripe's confirmation, which the next screen awaits.
      if (err.code === 'ALREADY_SUBSCRIBED' || err.code === 'NEEDS_PAYMENT_CONFIRMATION') {
        // Load the fresh account state first: the next screen decides from it.
        try { await refreshProfile(); } catch { /* the next screen reloads it */ }
        goToStep('hotovo');
        return;
      }
      if (err.code === 'TRIAL_NOT_AVAILABLE') {
        setServerNoTrial(true);
        setError(`Zkušební období už bylo využité. ${parent ? 'Zaplatíte' : 'Zaplatíš'} hned ${formatCzk(err.body?.priceCzk ?? offer.priceCzk)} — ${parent ? 'potvrďte' : 'potvrď'} to tlačítkem níže.`);
        return;
      }
      if (err.code === 'PRICE_CHANGED') {
        setError(`Cena se mezitím změnila na ${formatCzk(err.body?.priceCzk)}.${err.body?.referralApplied === false ? ' Pozvánku nešlo použít.' : ''} ${parent ? 'Obnovte' : 'Obnov'} stránku a zkontroluj${parent ? 'te' : ''} ji.`);
        return;
      }
      if (err.code === 'MONTHLY_CLOSED' || err.code === 'SALES_CLOSED') {
        setError(err.message);
        return;
      }
      setError(
        err.code === 'STRIPE_NOT_CONFIGURED'
          ? (parent ? 'Platby zatím nejsou spuštěné. Zkuste to prosím později.' : 'Platby zatím nejsou spuštěné. Zkus to prosím později.')
          : err.message || (parent ? 'Platbu se nepodařilo zahájit. Zkuste to prosím znovu.' : 'Platbu se nepodařilo zahájit. Zkus to prosím znovu.')
      );
    }
  };

  const summary = (
    <div className="ob-pw-card ob-pw-summary">
      <span className="ob-pw-caps is-accent">{plan.name}</span>
      <div className="ob-pw-row">
        <span className="ob-pw-row-label is-strong">K úhradě dnes</span>
        <span className="ob-pw-due">{payNow ? priceText : '0 Kč'}</span>
      </div>
      {offer.discountCzk > 0 && (
        <p className="ob-pw-fine">Pozvánka: −{formatCzk(offer.discountCzk)}. Dnes zaplatíš {priceText}.</p>
      )}
      {!payNow && (
        <>
          <span className="ob-pw-rule is-accent" />
          <div className="ob-pw-row">
            <span className="ob-pw-row-label">
              {chargeLabel}, {plan.priceSuffix}
            </span>
            <span className="ob-pw-row-value">{priceText}</span>
          </div>
        </>
      )}
      <p className="ob-pw-fine">{planCopy(plan, voice, 'terms')}</p>
      <span className="ob-pw-rule is-accent" />
      <p className="ob-pw-plan-line">
        <Icon.check size={15} className="ob-pw-ic is-ok" />
        <span className={`ob-pw-fine${cancellation.unbuilt ? ' ob-trust-unbuilt' : ''}`}>
          {cancellation.text}
        </span>
      </p>
      {refund && (
        <p className="ob-pw-plan-line">
          <Icon.check size={15} className="ob-pw-ic is-ok" />
          <span className="ob-pw-fine">{refund}</span>
        </p>
      )}
    </div>
  );

  if (!accountResolved) {
    return (
      <ObScreen chrome={false}>
        <h1 className="ob-title">Ověřujeme účet</h1>
        <p className="ob-hint">
          {profileError
            ? 'Účet se nepodařilo ověřit. Platbu nespustíme, dokud znovu nenačteme jeho stav.'
            : profileResolving || isSignedIn
              ? 'Počkáme na potvrzení účtu, než otevřeme platební bránu.'
              : parent ? 'Před platbou se přihlaste ke svému účtu.' : 'Před platbou se přihlas ke svému účtu.'}
        </p>
        {profileError && (
          <button type="button" className="ob-btn ob-btn-secondary" onClick={refreshProfile}>
            Načíst účet znovu
          </button>
        )}
        {!isSignedIn && (
          <Link to="/prihlaseni?next=/onboarding/platba" className="ob-btn ob-btn-primary">
            Přejít na přihlášení
          </Link>
        )}
      </ObScreen>
    );
  }

  if (isTester && !betaPreview) {
    return (
      <ObScreen chrome={false}>
        <h1 className="ob-title">Platební stránka je jen ukázka</h1>
        <p className="ob-hint">Testovací účet nic neplatí. Vrať se ke školám a otevři ukázku znovu, pokud si chceš obrazovky prohlédnout.</p>
        <button type="button" className="ob-btn ob-btn-primary" onClick={leaveBetaPreview}>Zpět ke školám</button>
      </ObScreen>
    );
  }

  if (isTester && betaPreview) {
    return (
      <ObScreen chrome={false} wide>
        <div className="ob-pw">
          <PayStepChrome onBack={() => goToStep(backStep)} role={role} />
          <h1 className="ob-title ob-pw-title">
            {parent ? 'Ukázka závěrečné platební obrazovky' : 'Ukázka závěrečné platební stránky'}
          </h1>
          <p className="ob-pw-fine">
            {parent ? 'V betě nic neplatíte.' : 'V betě nic neplatíš.'} Tohle je pouze náhled. Zobrazené částky a podmínky jsou příklady;{' '}
            {parent ? 'vašeho testovacího účtu' : 'tvého testovacího účtu'} se netýkají.
          </p>
          <div className="ob-pw-grid ob-pw-grid-pay">
            <div className="ob-pw-main">{summary}</div>
            <div className="ob-pw-side">
              <PayCta onClick={submit} disabled={working}>
                Dokončit ukázku bez placení
              </PayCta>
              <p className="ob-pw-fine ob-pw-centered">
                {parent
                  ? 'Za pokračování se nic nestrhne a váš beta přístup se tím neprodlouží.'
                  : 'Za pokračování se nic nestrhne a tvůj beta přístup se tím neprodlouží.'}
              </p>
            </div>
          </div>
        </div>
      </ObScreen>
    );
  }

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-pw">
        <PayStepChrome onBack={() => goToStep(backStep)} role={role} />

        <h1 className="ob-title ob-pw-title">
          Zbývá zadat kartu
        </h1>

        {/* Mobile shows the summary before the card explanation. Desktop places
            it in the right column beside the checkout action. */}
        <div className="ob-pw-summary-mobile">{summary}</div>

        <div className="ob-pw-grid ob-pw-grid-pay">
          <div className="ob-pw-main">
            <div className="ob-pw-fields">
              <div className="ob-pw-fields-head">
                <span className="ob-pw-caps">Platební karta</span>
                <span className="ob-pw-secure">
                  <Icon.lock size={13} className="ob-pw-ic is-ok" />
                  Zabezpečeno přes Stripe
                </span>
              </div>

              {/* No card fields here at all: clicking "Začít používat" below
                  redirects to Stripe's own hosted checkout page, where the
                  card is actually entered. Rendering a lookalike form here
                  that posts nowhere would be a false trust signal — the one
                  thing that cannot be walked back with a parent. */}
              <p className="ob-pw-fine">
                {parent
                  ? 'Kartu zadáváte na zabezpečené stránce Stripe. Celé číslo karty nevidíme ani neukládáme. Od Stripe dostaneme údaje potřebné ke správě objednávky a přístupu.'
                  : 'Kartu zadáváš na zabezpečené stránce Stripe. Celé číslo karty nevidíme ani neukládáme. Od Stripe dostaneme údaje potřebné ke správě objednávky a přístupu.'}
              </p>
            </div>

            <div className="ob-pw-card ob-pw-consent">
              <span className="ob-pw-caps">Rodina</span>
              <div className="ob-pw-handoff">
                {parent ? (
                  <>
                    <span className="ob-pw-fine">Účet je pro</span>
                    <strong>vaše dítě</strong>
                  </>
                ) : (
                  <>
                    <span className="ob-pw-fine">Platí ti to rodič?</span>
                    <ParentPayHandoff
                      voice="student"
                      variant="inline"
                      onActivated={() => goToStep('hotovo')}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="ob-pw-side">
            <div className="ob-pw-summary-wide">{summary}</div>

            <div className="ob-pw-foot">
              {error && (
                <div className="notice notice-error" role="alert">
                  <p className="notice-text">{error}</p>
                </div>
              )}
              {trialUsed && (
                <div className="notice notice-info" role="status">
                  <p className="notice-text">
                    Zkušební období už bylo na tomto účtu nebo kartě využité. {parent ? 'Zaplatíte' : 'Zaplatíš'} hned {priceText}.
                  </p>
                </div>
              )}
              <label className="ob-check" htmlFor="immediate-start">
                <input
                  id="immediate-start"
                  type="checkbox"
                  checked={immediateStart}
                  onChange={(event) => setImmediateStart(event.target.checked)}
                />
                <span>
                  {parent
                    ? 'Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy měl/a dítě placený přístup.'
                    : `Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy jsem ${g('měl', 'měla')} placený přístup.`}
                </span>
              </label>
              <PayCta onClick={submit} disabled={working || !immediateStart || !offer.ready || (offer.ready && !offer.onSale)}>
                {working
                  ? 'Přesměrovávám na Stripe…'
                  : !payNow
                    ? 'Začít zkušební období'
                    : `Objednat s povinností platby · ${priceText}`}
              </PayCta>
              {!payNow && (
                <p className="ob-microcopy ob-pw-centered">
                  {parent
                    ? `Dnes se nic neplatí. Po skončení zkušebního období Stripe jednorázově strhne ${priceText}, pokud ho do té doby nezrušíte v Nastavení.`
                    : `Dnes se nic neplatí. Po skončení zkušebního období Stripe jednorázově strhne ${priceText}, pokud ho do té doby nezrušíš v Nastavení.`}
                </p>
              )}
              <p className="ob-microcopy ob-pw-centered">
                {parent ? 'Objednáním souhlasíte s' : 'Objednáním souhlasíš s'}{' '}
                <a href="/obchodni-podminky" target="_blank" rel="noreferrer">obchodními podmínkami</a>
                {' '}včetně práva odstoupit do 14 dnů (vrátíme poměrnou část).
              </p>

              <ul className="ob-pw-chips ob-pw-chips-quiet">
                <li>
                  <Icon.check size={14} className="ob-pw-ic is-ok" />
                  <span className={cancellation.unbuilt ? 'ob-trust-unbuilt' : undefined}>
                    {cancellation.text}
                  </span>
                </li>
                {!payNow && (
                  <li>
                    <Icon.check size={14} className="ob-pw-ic is-ok" />
                    <span>Stripe uloží kartu pro pozdější platbu.</span>
                  </li>
                )}
                <li>
                  <Icon.check size={14} className="ob-pw-ic is-ok" />
                  <span>Ceny jsou konečné.</span>
                </li>
              </ul>

              {PAYMENTS_MOCKED && (
                <p className="ob-mock-note">
                  Ukázková verze: platební brána zatím není napojená, nic se nestrhne.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ObScreen>
  );
}

export default Platba;
