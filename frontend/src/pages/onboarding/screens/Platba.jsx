import { useMemo, useState } from 'react';
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
import { mockStartSubscription } from '../../../api';
import { useOnboarding } from '../useOnboarding';
import { Icon, PayCta, PayStepChrome, useHandoffShare } from './paywallKit';

/**
 * Paywall step 5 of 5 — PLATBA (card, consent, order summary).
 *
 * Deliberately NOT numbered in the step chrome: a counter still ticking while
 * the card form is open reads as "there is more after this".
 *
 * PAYMENTS ARE MOCKED (PAYMENTS_MOCKED). The card fields are rendered inert and
 * labelled as such, and nothing is typed into React state. This is not
 * laziness — a real-looking card input that posts nowhere is the one thing that
 * cannot be walked back with a parent, and card data must never touch this app
 * at all: the live version embeds Stripe's own hosted fields here, which is
 * also what makes "kartu nevidíme ani neukládáme" true rather than aspirational.
 *
 * CONSENT (§0.4, ruling C-8's parental-confirmation requirement):
 *  - Nothing is pre-ticked, ever.
 *  - The submit button is disabled until the box is ticked, and says so.
 *  - Student branch: a single age/guardian self-attestation, plus a visible
 *    "sdílet s rodičem" route BESIDE it — an option, not a gate, and no copy
 *    anywhere implies a teenager needs permission to buy (§0.2).
 *  - Parent branch: the buyer IS the adult, so the attestation becomes a
 *    guardianship confirmation and the handoff turns around ("účet je pro vaše
 *    dítě").
 *
 * Every amount, date, term and cancellation claim comes from
 * config/pricing.js. Nothing about money is hardcoded in this file.
 *
 * Source: design/paywall-multipage-extract4/{Platba,WebPlatba,ParentPlatba}.
 */
function Platba() {
  const { role, goNext, goToStep, planId, setPurchased } = useOnboarding();
  const parent = role === 'parent';
  const voice = parent ? 'parent' : 'student';
  const plan = getPlan(planId);
  const { share, note } = useHandoffShare(role);

  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);

  const chargeLabel = useMemo(
    () => (plan.hasTrial ? formatCzDate(trialChargeDate(new Date())) : null),
    [plan.hasTrial]
  );

  const cancellation = cancellationTerms(plan, voice);
  const refund = refundTerms(plan, voice);
  const backStep = plan.hasTrial ? 'zkusebni' : 'plan';

  const submit = async () => {
    setWorking(true);
    await mockStartSubscription({ planId: plan.id, priceCzk: plan.priceCzk, role });
    setPurchased(true);
    goNext();
  };

  const summary = (
    <div className="ob-pw-card ob-pw-summary">
      <span className="ob-pw-caps is-accent">{plan.name}</span>
      <div className="ob-pw-row">
        <span className="ob-pw-row-label is-strong">K úhradě dnes</span>
        <span className="ob-pw-due">{plan.hasTrial ? '0 Kč' : formatCzk(plan.priceCzk)}</span>
      </div>
      {plan.hasTrial && (
        <>
          <span className="ob-pw-rule is-accent" />
          <div className="ob-pw-row">
            <span className="ob-pw-row-label">
              {chargeLabel}, {plan.priceSuffix}
            </span>
            <span className="ob-pw-row-value">{formatCzk(plan.priceCzk)}</span>
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

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-pw">
        <PayStepChrome onBack={() => goToStep(backStep)} role={role} />

        <h1 className="ob-title ob-pw-title">
          {parent ? 'Ještě karta a potvrzení' : 'Ještě karta a potvrzení rodiče'}
        </h1>

        {/* Mobile: the summary is pinned above everything, because further down
            it would simply never be seen. Desktop moves it to the right column,
            where it cannot be scrolled past either. */}
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

              {/* Inert on purpose while PAYMENTS_MOCKED is true — see the file
                  header. Card data never enters this app's state. */}
              <input
                className="ob-pw-field"
                type="text"
                inputMode="numeric"
                placeholder="Číslo karty"
                aria-label="Číslo karty"
                autoComplete="off"
                disabled
              />
              <div className="ob-pw-field-pair">
                <input
                  className="ob-pw-field"
                  type="text"
                  placeholder="MM / RR"
                  aria-label="Platnost karty"
                  autoComplete="off"
                  disabled
                />
                <input
                  className="ob-pw-field"
                  type="text"
                  placeholder="CVC"
                  aria-label="Kód CVC"
                  autoComplete="off"
                  disabled
                />
              </div>
              <p className="ob-pw-fine">
                {parent
                  ? 'Kartu zadáváte do formuláře Stripe. My ji nevidíme ani neukládáme — dostaneme jen potvrzení, že platba prošla.'
                  : 'Kartu zadáváš do formuláře Stripe. My ji nevidíme ani neukládáme — dostaneme jen potvrzení, že platba prošla.'}
              </p>
            </div>

            <div className="ob-pw-card ob-pw-consent">
              <span className="ob-pw-caps">{parent ? 'Souhlas' : 'Věk a souhlas'}</span>
              <label className="ob-check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={working}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  {parent
                    ? 'Potvrzuji, že jsem rodič nebo zákonný zástupce a s touto platbou souhlasím.'
                    : 'Potvrzuji, že je mi 18 let, nebo že o téhle platbě ví můj rodič či zákonný zástupce.'}
                </span>
              </label>
              <span className="ob-pw-rule" />
              <div className="ob-pw-handoff">
                {parent ? (
                  <>
                    <span className="ob-pw-fine">Účet je pro</span>
                    <strong>vaše dítě</strong>
                  </>
                ) : (
                  <>
                    <span className="ob-pw-fine">Platí ti to rodič?</span>
                    <button type="button" className="ob-inline-link" onClick={share}>
                      Sdílet s rodičem
                    </button>
                  </>
                )}
              </div>
              {note && <span className="ob-share-note">{note}</span>}
            </div>
          </div>

          <div className="ob-pw-side">
            <div className="ob-pw-summary-wide">{summary}</div>

            <div className="ob-pw-foot">
              <PayCta onClick={submit} disabled={!confirmed || working}>
                {working ? 'Zpracováváme…' : 'Začít používat'}
              </PayCta>
              {!confirmed && (
                <p className="ob-microcopy ob-pw-centered">
                  Tlačítko se odemkne po zaškrtnutí potvrzení.
                </p>
              )}

              <ul className="ob-pw-chips ob-pw-chips-quiet">
                <li>
                  <Icon.check size={14} className="ob-pw-ic is-ok" />
                  <span className={cancellation.unbuilt ? 'ob-trust-unbuilt' : undefined}>
                    {cancellation.text}
                  </span>
                </li>
                {plan.hasTrial && (
                  <li>
                    <Icon.check size={14} className="ob-pw-ic is-ok" />
                    <span>Karta jen ověřuje — nic se nestrhne dřív než {chargeLabel}.</span>
                  </li>
                )}
                <li>
                  <Icon.check size={14} className="ob-pw-ic is-ok" />
                  <span>Ceny jsou včetně DPH.</span>
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
