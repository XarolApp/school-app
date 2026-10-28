import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import ParentPayHandoff from '../components/ParentPayHandoff';
import { cancelSubscription, createCheckoutSession, fetchSeasonChargeStatus } from '../api';
import { getStripeClient } from '../lib/stripeClient';
import { useOffer } from '../lib/usePrices';
import SavedCardBuy from '../components/SavedCardBuy';
import { cardLabel } from '../lib/payFlow';
import { useG } from '../lib/gender';
import BetaSoftGate from '../components/BetaSoftGate';
import { ACCESS_END_LABEL, DEADLINE_LABEL, DEFAULT_PLAN_ID, PLANS, formatCzk, planCopy, trialDaysPhrase } from '../config/pricing';
import { LoadingSpinner } from '../components/PageSkeleton';

// Short statements of the included features and visible payment terms.
const BENEFITS = [
  'Pražské střední školy s podrobnými údaji',
  'Filtrování podle oboru a městské části',
  'Dotazník, který ti školy seřadí podle shody',
  'Uložené oblíbené školy na jednom místě',
  'Podmínky platby uvidíš předem',
];

// Webhooks are asynchronous: the browser can land back here from Stripe
// *before* our own database has been updated, and a user seeing "zkušební
// období skončilo" again right after paying would reasonably conclude the
// payment failed. This polls fetchMe (via refreshProfile) briefly instead of
// claiming either success or failure before the account state is confirmed.
function usePostCheckoutVerification(hasAccess, refreshProfile, enabled) {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(searchParams.get('platba') === 'ok');
  const [gaveUp, setGaveUp] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled || !verifying || hasAccess) return;

    const interval = setInterval(async () => {
      attemptsRef.current += 1;
      await refreshProfile();
      if (attemptsRef.current >= 5) {
        clearInterval(interval);
        setVerifying(false);
        setGaveUp(true);
      }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, verifying, hasAccess]);

  useEffect(() => {
    if (enabled && hasAccess) setVerifying(false);
  }, [enabled, hasAccess]);

  return { verifying: enabled && verifying, gaveUp: enabled && gaveUp };
}

function Paywall() {
  const { loading, profileLoading, profileError, isSignedIn, isTester, hasAccess, profile, signOut, refreshProfile } = useAuth();
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [seasonCharge, setSeasonCharge] = useState(null);
  const [chargeBusy, setChargeBusy] = useState(false);
  const [chargeError, setChargeError] = useState(null);
  const [immediateStart, setImmediateStart] = useState(false);
  const [cardBuy, setCardBuy] = useState(null); // 'season' | 'monthly' | null
  const [serverNoTrial, setServerNoTrial] = useState(false);
  const g = useG();
  const seasonOffer = useOffer('season');
  const monthlyOffer = useOffer('monthly');
  const { verifying, gaveUp } = usePostCheckoutVerification(hasAccess, refreshProfile, !isTester);

  useEffect(() => {
    if (!isSignedIn || profile?.plan_id !== 'season' || hasAccess) return undefined;
    let live = true;
    let timer;
    const poll = async () => {
      try {
        const status = await fetchSeasonChargeStatus();
        if (!live) return;
        setSeasonCharge(status);
        if (status.status === 'succeeded') await refreshProfile();
        if (['processing', 'requires_action', 'retryable', 'cancellation_pending', 'succeeded'].includes(status.status)) {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        if (live) timer = setTimeout(poll, 8000);
      }
    };
    poll();
    return () => { live = false; clearTimeout(timer); };
  }, [isSignedIn, profile?.plan_id, hasAccess]);

  if (loading || (isSignedIn && profileLoading)) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) return <Navigate to="/prihlaseni" replace />;
  if (profileError || !profile) {
    return (
      <div className="page page-paywall">
        <div className="auth-layout">
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Přístup se nepodařilo ověřit</span>
            <p className="notice-text">{profileError || 'Platební stav účtu zatím není dostupný.'}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={refreshProfile}>Zkusit znovu</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>Odhlásit se</button>
        </div>
      </div>
    );
  }
  if (hasAccess) return <Navigate to="/skoly" replace />;
  if (profile?.isCreator) {
    return (
      <div className="page page-paywall">
        <div className="auth-layout">
          <p className="lede">Náhled pro tvůrce byl ukončen. Pokud jde o omyl, napiš nám na info@stredninamiru.cz.</p>
          <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>Odhlásit se</button>
        </div>
      </div>
    );
  }
  if (isTester) return <BetaPaused />;

  if (verifying) {
    return (
      <div className="page page-paywall">
        <div className="auth-layout">
          <div className="page-header">
            <p className="eyebrow">Návrat z platební brány</p>
            <h1>Ověřujeme přístup…</h1>
            <p className="lede">Čekáme na potvrzení platební brány. Jakmile ověříme přístup, otevřeme hledání škol.</p>
          </div>
        </div>
      </div>
    );
  }

  // Monthly stops being sold when too little is left before the deadline.
  const plans = seasonOffer.ready && !seasonOffer.monthlyAvailable ? PLANS.filter((p) => p.id !== 'monthly') : PLANS;
  const activePlanId = plans.some((p) => p.id === planId) ? planId : 'season';
  const offer = activePlanId === 'monthly' ? monthlyOffer : seasonOffer;
  const trial = activePlanId === 'season' && seasonOffer.trialAvailable;
  const trialUsed = activePlanId === 'season' && Boolean(seasonOffer.prices?.season?.trialAvailable) && profile?.trialEligible === false;
  const payNow = !trial || serverNoTrial;
  const priceText = offer.priceCzk === null ? '…' : formatCzk(offer.priceCzk);
  const seasonLabel = seasonOffer.isSpring ? 'Jarní přístup' : 'Sezónní přístup';

  const handleSubscribe = async () => {
    setError(null);
    if (offer.priceCzk === null) return;
    setRedirecting(true);
    document.documentElement.dataset.snmStripeRedirecting = 'true';
    try {
      const { url } = await createCheckoutSession({
        planId: activePlanId,
        returnTo: '/predplatne',
        immediateStart: true,
        referralCode: offer.referralCode || undefined,
        confirmPriceCzk: offer.priceCzk,
        acknowledgedNoTrial: trialUsed || serverNoTrial ? true : undefined,
      });
      window.location.href = url;
    } catch (err) {
      delete document.documentElement.dataset.snmStripeRedirecting;
      setRedirecting(false);
      if (err.code === 'TRIAL_NOT_AVAILABLE') {
        setServerNoTrial(true);
        setError(`Zkušební období už bylo využité. Zaplatíš hned ${formatCzk(err.body?.priceCzk ?? offer.priceCzk)} — potvrď to tlačítkem níže.`);
        return;
      }
      if (err.code === 'PRICE_CHANGED') {
        setError(`Cena se mezitím změnila na ${formatCzk(err.body?.priceCzk)}. Obnov stránku a zkontroluj ji.`);
        return;
      }
      setError(
        err.code === 'STRIPE_NOT_CONFIGURED'
          ? 'Platby zatím nejsou spuštěné. Zkus to prosím později.'
          : err.message
      );
    }
  };

  const handleSeasonAuthentication = async () => {
    setChargeBusy(true);
    setChargeError(null);
    try {
      const stripeClient = await getStripeClient();
      const result = await stripeClient.confirmCardPayment(seasonCharge.clientSecret);
      if (result.error) throw new Error(result.error.message || 'Ověření platby se nepodařilo.');
      await refreshProfile();
      const latest = await fetchSeasonChargeStatus();
      setSeasonCharge(latest);
    } catch (err) {
      setChargeError(err.message || 'Ověření platby se nepodařilo.');
      try { setSeasonCharge(await fetchSeasonChargeStatus()); } catch { /* next poll retries */ }
    } finally {
      setChargeBusy(false);
    }
  };

  const handleCancelSeasonCharge = async () => {
    setChargeBusy(true);
    setChargeError(null);
    try {
      const result = await cancelSubscription();
      await refreshProfile();
      setSeasonCharge((current) => ({ ...current, status: result.cancelled === 'pending' ? 'cancellation_pending' : 'canceled' }));
    } catch (err) {
      setChargeError(err.message || 'Zrušení platby se nepodařilo.');
    } finally {
      setChargeBusy(false);
    }
  };

  return (
    <div className="page page-paywall">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">Přístup není aktivní</p>
          <h1>Pokračuj v hledání školy</h1>
          <p className="lede">
            Vyber si další přístup k celé databázi pražských středních škol i ke svým
            uloženým favoritům.{trial ? ` Sezónní plán nabízí ${trialDaysPhrase()} zdarma před jednorázovou platbou.` : ''}
          </p>
        </div>

        <div className="panel panel-lg stack">
          <ul className="benefit-list">
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <Check
                  className="benefit-check"
                  aria-hidden="true"
                  strokeWidth={2.25}
                />
                {benefit}
              </li>
            ))}
          </ul>

          {gaveUp && (
            <div className="notice" role="status">
              <p className="notice-text">
                Přístup zatím nemáme potvrzený. Za chvíli obnov stránku — pokud se nic nezmění, ozvi se nám.
              </p>
            </div>
          )}

          {seasonCharge?.status === 'requires_action' && (
            <section className="notice" aria-live="polite">
              <strong>Je potřeba potvrdit platbu</strong>
              <p className="notice-text">Banka požaduje dodatečné ověření. Platba se dokončí až po tvém potvrzení.</p>
              {chargeError && <p className="notice-text" role="alert">{chargeError}</p>}
              <div className="settings-form-actions">
                <button type="button" className="btn btn-primary" onClick={handleSeasonAuthentication} disabled={chargeBusy || !seasonCharge.clientSecret}>
                  {chargeBusy ? 'Otevírám ověření…' : 'Ověřit platbu'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancelSeasonCharge} disabled={chargeBusy}>
                  Zrušit a zabránit platbě
                </button>
              </div>
            </section>
          )}
          {seasonCharge?.status === 'processing' && (
            <div className="notice" role="status"><p className="notice-text">Platbu ověřujeme. Tato stránka se průběžně aktualizuje.</p></div>
          )}
          {seasonCharge?.status === 'retryable' && (
            <div className="notice" role="status"><p className="notice-text">Platební brána je dočasně nedostupná. Platbu bezpečně zkusíme znovu.</p></div>
          )}
          {seasonCharge?.status === 'declined' && (
            <div className="notice notice-error" role="alert"><p className="notice-text">Banka platbu zamítla. Zkontroluj kartu nebo zvol jiný plán.</p></div>
          )}
          {seasonCharge?.status === 'cancellation_pending' && (
            <div className="notice" role="status"><p className="notice-text">Požadavek na zrušení jsme uložili a ověřujeme, že platba neproběhne.</p></div>
          )}
          {chargeError && seasonCharge?.status !== 'requires_action' && (
            <div className="notice notice-error" role="alert"><p className="notice-text">{chargeError}</p></div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
            </div>
          )}

          {seasonOffer.ready && !seasonOffer.onSale && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">Prodej pro tuto sezónu už skončil.</p>
            </div>
          )}

          {profile?.savedCard && seasonOffer.ready && seasonOffer.onSale && (
            <div className="stack">
              <p className="notice-text">Máš uloženou kartu {cardLabel(profile.savedCard)}.</p>
              {cardBuy ? (
                <SavedCardBuy
                  kind={cardBuy}
                  priceCzk={cardBuy === 'monthly' ? monthlyOffer.priceCzk : seasonOffer.listCzk}
                  card={profile.savedCard}
                  intro={cardBuy === 'monthly' ? (monthlyOffer.monthlySingleCharge ? `Platí se jednou za dny do ${DEADLINE_LABEL}, nic dalšího se nestrhne.` : `Měsíční předplatné samo skončí ${DEADLINE_LABEL}, poslední platba je jen za dny do konce přihlášek.`) : `Přístup platí do ${ACCESS_END_LABEL}.`}
                  onClose={() => setCardBuy(null)}
                />
              ) : (
                <div className="settings-form-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setCardBuy('season')}>
                    {seasonLabel} za {formatCzk(seasonOffer.listCzk)}
                  </button>
                  {seasonOffer.monthlyAvailable && (
                    <button type="button" className="btn btn-secondary" onClick={() => setCardBuy('monthly')}>
                      Měsíčně {formatCzk(monthlyOffer.priceCzk)}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="plan-picker">
            {plans.map((p) => (
              <label key={p.id} className={`plan-picker-option${activePlanId === p.id ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={activePlanId === p.id}
                  onChange={() => setPlanId(p.id)}
                />
                <span className="plan-picker-name">{p.id === 'season' ? seasonLabel : p.name}</span>
                <span className="plan-picker-price">
                  {(p.id === 'monthly' ? monthlyOffer : seasonOffer).priceCzk === null ? '…' : formatCzk((p.id === 'monthly' ? monthlyOffer : seasonOffer).priceCzk)} {p.priceSuffix}
                </span>
                <span className="plan-picker-terms">{planCopy(p, 'student', 'terms')}</span>
              </label>
            ))}
          </div>

          {trialUsed && (
            <div className="notice" role="status">
              <p className="notice-text">Zkušební období už bylo na tomto účtu nebo kartě využité. Zaplatíš hned {priceText}.</p>
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
              Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy jsem {g('měl', 'měla')} placený přístup.
            </span>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubscribe}
            disabled={redirecting || !immediateStart || !offer.ready || !offer.onSale}
          >
            {redirecting && <span className="btn-spinner" aria-hidden="true" />}
            {redirecting ? 'Přesměrovávám…' : payNow ? `Objednat s povinností platby · ${priceText}` : 'Začít zkušební období'}
          </button>
          <ParentPayHandoff voice="student" variant="inline" />

          <p className="auth-footnote">
            Objednáním souhlasíš s <a href="/obchodni-podminky" target="_blank" rel="noreferrer">obchodními podmínkami</a>{' '}
            včetně práva odstoupit do 14 dnů.
          </p>

        </div>

        <p className="auth-footnote" data-private>
          Přihlášen jako {profile?.email}.{' '}
          <button type="button" className="link-button" onClick={signOut}>
            Odhlásit se
          </button>
        </p>
      </div>
    </div>
  );
}

function BetaPaused() {
  const { profile, hasAccess, signOut } = useAuth();
  const location = useLocation();
  const returnPath = location.state?.from?.pathname || '/skoly';

  if (hasAccess) return <Navigate to={returnPath} replace />;

  const programEnded = !profile.betaProgramActive;
  const deadline = profile.betaProgramEndsAt
    ? new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Prague' }).format(new Date(profile.betaProgramEndsAt))
    : null;

  return (
    <div className="page page-paywall">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">Beta testování</p>
          <h1>{programEnded ? 'Beta program skončil' : 'Přístup je pozastavený'}</h1>
          <p className="lede">
            {programEnded
              ? 'Děkujeme za účast. Testovací přístup už nelze obnovit.'
              : `Po odeslání zpětné vazby se přístup obnoví o ${profile.betaAccessHours || 48} hodin, nejdéle do konce programu.`}
          </p>
        </div>
        <section className="panel panel-lg stack">
          {deadline && <p>Program končí {deadline} (pražského času).</p>}
          {!programEnded && !profile.closingPaused && <BetaSoftGate />}
          {profile.betaFeedbackFormUrl && (
            <a href={profile.betaFeedbackFormUrl} target="_blank" rel="noreferrer">
              Otevřít externí formulář (přístup neobnoví)
            </a>
          )}
          <Link to="/nastaveni" className="btn btn-secondary btn-block">Nastavení účtu</Link>
          <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>Odhlásit se</button>
        </section>
      </div>
    </div>
  );
}

export default Paywall;
