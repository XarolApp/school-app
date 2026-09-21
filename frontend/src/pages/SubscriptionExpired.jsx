import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { createCheckoutSession } from '../api';
import { DEFAULT_PLAN_ID, PLANS, formatCzk, getPlan, planCopy, trialDaysPhrase } from '../config/pricing';

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
function usePostCheckoutVerification(hasAccess, refreshProfile) {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(searchParams.get('platba') === 'ok');
  const [gaveUp, setGaveUp] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!verifying || hasAccess) return;

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
  }, [verifying, hasAccess]);

  useEffect(() => {
    if (hasAccess) setVerifying(false);
  }, [hasAccess]);

  return { verifying, gaveUp };
}

function Paywall() {
  const { loading, isSignedIn, hasAccess, profile, signOut, refreshProfile } = useAuth();
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [paymentConsent, setPaymentConsent] = useState(false);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const { verifying, gaveUp } = usePostCheckoutVerification(hasAccess, refreshProfile);

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám…
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/prihlaseni" replace />;
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

  const plan = getPlan(planId);

  const handleSubscribe = async () => {
    setError(null);
    setRedirecting(true);
    try {
      const { url } = await createCheckoutSession({ planId, returnTo: '/predplatne', paymentConsent });
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

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={paymentConsent}
              onChange={(e) => setPaymentConsent(e.target.checked)}
            />
            <span>Potvrzuji, že je mi 18 let, nebo že s touto platbou souhlasí můj rodič či zákonný zástupce.</span>
          </label>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubscribe}
            disabled={redirecting || !paymentConsent}
          >
            {redirecting && <span className="btn-spinner" aria-hidden="true" />}
            {redirecting ? 'Přesměrovávám…' : 'Objednat s povinností platby'}
          </button>
        </div>

        <p className="auth-footnote">
          Přihlášen jako {profile?.email}.{' '}
          <button type="button" className="link-button" onClick={signOut}>
            Odhlásit se
          </button>
        </p>
      </div>
    </div>
  );
}

export default Paywall;
