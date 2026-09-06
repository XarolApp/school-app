import { useMemo } from 'react';
import { ObScreen } from '../../../components/onboarding/ObKit';
import {
  TRIAL_CHARGE_DAY_NUMBER,
  TRIAL_REMINDER_DAY_NUMBER,
  TRIAL_REMINDER_IMPLEMENTED,
  formatCzDate,
  formatCzk,
  getPlan,
  planCopy,
  trialChargeDate,
  trialReminderDate,
} from '../../../config/pricing';
import { useOnboarding } from '../useOnboarding';
import { Icon, PayCta, PayStepChrome } from './paywallKit';

/**
 * Paywall step 4 of 5 — ZKUŠEBNÍ (how the free days actually run).
 *
 * Only reachable when the selected plan carries a trial; the plan screen skips
 * straight to `platba` otherwise, rather than showing an empty rail.
 *
 * WHY IT IS ITS OWN SCREEN. Ruling C-1 makes the trial timeline mandatory and a
 * 3-day trial makes it more important, not less: there is barely any time for
 * the user to notice on their own, and a trial that bills before the user
 * registers they were in one is exactly the pattern EU regulators pursue. On
 * one combined paywall this rail competed with the price for attention. Here it
 * is the only thing on the screen, with REAL dates rather than "za 3 dny" —
 * a concrete date is what a person can put in a calendar.
 *
 * THE REMINDER BEAT IS RENDERED AS NOT PROMISED.
 * TRIAL_REMINDER_IMPLEMENTED is false — there is no e-mail system in this
 * codebase — so the step stays in the timeline (removing it would hide that
 * billing arrives unannounced) but with a dashed marker and copy that says out
 * loud we do not promise it, and tells the user to note the date themselves.
 * When the flag flips, the marker fills in and the disclaimer disappears with
 * no other change. Do not silently upgrade this to look promised: a reminder
 * that was promised and never arrives is what chargebacks are made of.
 *
 * RECORDED OBJECTION (design annotation "poctivost"): collecting card details
 * purely to unlock a trial is what pricing_research.md §4 flags as the
 * direction the Digital Fairness Act is moving against, and the audience here
 * is minors. Built as specified; this comment is the record that our own
 * research advises otherwise.
 *
 * Source: design/paywall-multipage-extract4/{Zkusebni,WebZkusebni,ParentZkusebni}.
 */
function Zkusebni() {
  const { role, goNext, goToStep, planId } = useOnboarding();
  const parent = role === 'parent';
  const voice = parent ? 'parent' : 'student';
  const plan = getPlan(planId);

  // Computed once per mount so the rail and the money box can never disagree
  // about the date, even across a midnight boundary.
  const { reminderLabel, chargeLabel } = useMemo(() => {
    const now = new Date();
    return {
      reminderLabel: formatCzDate(trialReminderDate(now)),
      chargeLabel: formatCzDate(trialChargeDate(now)),
    };
  }, []);

  const chargeSuffix =
    plan.billing === 'one_time' ? 'jednou' : `a pak každý ${plan.periodLabel}`;

  return (
    <ObScreen chrome={false} wide>
      <div className="ob-pw">
        <PayStepChrome step={4} onBack={() => goToStep('plan')} role={role} />

        <div className="ob-pw-grid ob-pw-grid-plan">
          <div className="ob-pw-main">
            <div className="ob-pw-head">
              <h1 className="ob-title ob-pw-title">Jak zkušební dny proběhnou</h1>
              <p className="ob-lead">
                Dnes se z karty nestrhne ani koruna. Tady je celý průběh, včetně přesného data.
              </p>
            </div>

            <ol className="ob-pw-card ob-pw-rail ob-pw-rail-vertical">
              <li className="ob-pw-rail-item">
                <span className="ob-pw-rail-mark">
                  <span className="ob-pw-rail-dot is-done" aria-hidden="true">
                    <Icon.check size={17} />
                  </span>
                  <span className="ob-pw-rail-line is-done" aria-hidden="true" />
                </span>
                <div className="ob-pw-rail-body">
                  <strong className="ob-pw-rail-what is-past">Dotazník vyplněný</strong>
                  <span className="ob-pw-rail-detail">
                    {parent
                      ? 'Pořadí je spočítané a čeká na vás.'
                      : 'Pořadí je spočítané a čeká na tebe.'}
                  </span>
                </div>
              </li>

              <li className="ob-pw-rail-item">
                <span className="ob-pw-rail-mark">
                  <span className="ob-pw-rail-dot is-now" aria-hidden="true">
                    <Icon.unlock size={17} />
                  </span>
                  <span className="ob-pw-rail-line is-now" aria-hidden="true" />
                </span>
                <div className="ob-pw-rail-body">
                  <span className="ob-pw-rail-when is-now">
                    Dnes · {formatCzDate(new Date())}
                  </span>
                  <strong className="ob-pw-rail-what">
                    {parent ? 'Odemknete celou aplikaci' : 'Odemkneš celou aplikaci'} — 0 Kč
                  </strong>
                  <span className="ob-pw-rail-detail">
                    Všechny školy, vysvětlení u každé, srovnání vedle sebe. Kartu potřebujeme jen
                    pro ověření — dnes se z ní nestrhne nic.
                  </span>
                </div>
              </li>

              <li className="ob-pw-rail-item">
                <span className="ob-pw-rail-mark">
                  <span
                    className={`ob-pw-rail-dot ${
                      TRIAL_REMINDER_IMPLEMENTED ? 'is-step' : 'is-unpromised'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon.bell size={16} />
                  </span>
                  <span className="ob-pw-rail-line is-step" aria-hidden="true" />
                </span>
                <div className="ob-pw-rail-body">
                  <span className="ob-pw-rail-when">
                    {TRIAL_REMINDER_DAY_NUMBER}. den · {reminderLabel}
                  </span>
                  <strong
                    className={`ob-pw-rail-what${TRIAL_REMINDER_IMPLEMENTED ? '' : ' is-past'}`}
                  >
                    Připomeneme, že za 24 hodin končí zkušební období
                  </strong>
                  {!TRIAL_REMINDER_IMPLEMENTED && (
                    <span className="ob-honesty ob-trust-unbuilt">
                      Tohle zatím <strong>neslibujeme</strong> — e-maily ještě neumíme posílat.
                      Dokud to nebude opravdu fungovat, nebudeme to tvrdit.{' '}
                      {parent
                        ? 'Do té doby si datum radši poznamenejte.'
                        : 'Do té doby si datum radši poznamenej.'}
                    </span>
                  )}
                </div>
              </li>

              <li className="ob-pw-rail-item">
                <span className="ob-pw-rail-mark">
                  <span className="ob-pw-rail-dot is-charge" aria-hidden="true">
                    <Icon.card size={16} />
                  </span>
                </span>
                <div className="ob-pw-rail-body">
                  <span className="ob-pw-rail-when is-strong">
                    {TRIAL_CHARGE_DAY_NUMBER}. den · {chargeLabel}
                  </span>
                  <strong className="ob-pw-rail-what">
                    Strhne se {formatCzk(plan.priceCzk)} — {chargeSuffix}
                  </strong>
                  <span className="ob-pw-rail-detail">{planCopy(plan, voice, 'terms')}</span>
                </div>
              </li>
            </ol>
          </div>

          <div className="ob-pw-side">
            {/* Due today vs due later as two labelled rows. On a phone this sits
                under the rail; on desktop the 0 Kč is visible at the same time
                as the dates that explain it. */}
            <div className="ob-pw-card ob-pw-summary">
              <span className="ob-pw-caps is-accent">{plan.name}</span>
              <div className="ob-pw-row">
                <span className="ob-pw-row-label is-strong">K úhradě dnes</span>
                <span className="ob-pw-due">0 Kč</span>
              </div>
              <span className="ob-pw-rule is-accent" />
              <div className="ob-pw-row">
                <span className="ob-pw-row-label">
                  Poté {chargeLabel}, {plan.priceSuffix}
                </span>
                <span className="ob-pw-row-value">{formatCzk(plan.priceCzk)}</span>
              </div>
              <p className="ob-pw-fine">{planCopy(plan, voice, 'terms')}</p>
              <span className="ob-pw-rule is-accent" />
              <p className="ob-pw-plan-line">
                <Icon.check size={15} className="ob-pw-ic is-ok" />
                <span className="ob-pw-fine">
                  <strong>Bez závazku,</strong>{' '}
                  {parent
                    ? 'platbu můžete kdykoliv před skončením zkušebního období zrušit.'
                    : 'platbu můžeš kdykoliv před skončením zkušebního období zrušit.'}
                </span>
              </p>
            </div>

            <div className="ob-pw-foot">
              <PayCta onClick={goNext}>Zadat kartu a začít</PayCta>
              <button
                type="button"
                className="ob-btn ob-btn-ghost"
                onClick={() => goToStep('plan')}
              >
                Zpět na výběr přístupu
              </button>
            </div>
          </div>
        </div>
      </div>
    </ObScreen>
  );
}

export default Zkusebni;
