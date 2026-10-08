import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import ParentPayHandoff from '../components/ParentPayHandoff';
import { createCheckoutSession } from '../api';
import BetaSoftGate from '../components/BetaSoftGate';
import { DEFAULT_PLAN_ID, PLANS, formatCzk, planCopy, trialDaysPhrase } from '../config/pricing';
import { LoadingSpinner } from '../components/PageSkeleton';

// Four short parallel claims — a checkmark each reads faster than a bullet and
// says "included", which a bullet does not.
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
// claiming failure — it very likely succeeded and is just mid-flight.
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
  const { verifying, gaveUp } = usePostCheckoutVerification(hasAccess, refreshProfile, !isTester);

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
  if (isTester) return <BetaPaused />;
  if (hasAccess) return <Navigate to="/skoly" replace />;

  if (verifying) {
    return (
      <div className="page page-paywall">
        <div className="auth-layout">
          <div className="page-header">
            <p className="eyebrow">Platba přijata</p>
            <h1>Ověřujeme platbu…</h1>
            <p className="lede">Za pár vteřin tě přesměrujeme k hledání škol.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubscribe = async () => {
    setError(null);
    setRedirecting(true);
    try {
      const { url } = await createCheckoutSession({ planId, returnTo: '/predplatne' });
      window.location.href = url;
    } catch (err) {
      setRedirecting(false);
      setError(
        err.code === 'STRIPE_NOT_CONFIGURED'
          ? 'Platby zatím nejsou spuštěné. Zkus to prosím později.'
          : err.message
      );
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
            uloženým favoritům. Sezónní plán nabízí {trialDaysPhrase()} zdarma před
            jednorázovou platbou.
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
                Platba se zpracovává. Za chvíli obnov stránku — pokud se nic nezmění, ozvi se nám.
              </p>
            </div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
            </div>
          )}

          <div className="plan-picker">
            {PLANS.map((p) => (
              <label key={p.id} className={`plan-picker-option${planId === p.id ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={planId === p.id}
                  onChange={() => setPlanId(p.id)}
                />
                <span className="plan-picker-name">{p.name}</span>
                <span className="plan-picker-price">
                  {formatCzk(p.priceCzk)} {p.priceSuffix}
                </span>
                <span className="plan-picker-terms">{planCopy(p, 'student', 'terms')}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubscribe}
            disabled={redirecting}
          >
            {redirecting && <span className="btn-spinner" aria-hidden="true" />}
            {redirecting ? 'Přesměrovávám…' : 'Objednat s povinností platby'}
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
