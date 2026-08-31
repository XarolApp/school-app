import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { createCheckoutSession } from '../api';
import { trialDaysPhrase } from '../config/pricing';

// Four short parallel claims — a checkmark each reads faster than a bullet and
// says "included", which a bullet does not.
const BENEFITS = [
  'Všech 60 pražských středních škol s detaily',
  'Filtrování podle oboru a městské části',
  'Dotazník, který ti školy seřadí podle shody',
  'Uložené oblíbené školy na jednom místě',
  'Zrušit můžeš kdykoli',
];

function Paywall() {
  const { loading, isSignedIn, hasAccess, profile, signOut } = useAuth();
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám…
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/prihlaseni" replace />;
  if (hasAccess) return <Navigate to="/skoly" replace />;

  const handleSubscribe = async () => {
    setError(null);
    setRedirecting(true);
    try {
      const { url } = await createCheckoutSession();
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
          <p className="eyebrow">Zkušební období skončilo</p>
          <h1>Pokračuj v hledání školy</h1>
          <p className="lede">
            Tvých {trialDaysPhrase()} zdarma uplynulo. S předplatným máš dál přístup k celé
            databázi pražských středních škol i ke svým uloženým favoritům.
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

          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubscribe}
            disabled={redirecting}
          >
            {redirecting && <span className="btn-spinner" aria-hidden="true" />}
            {redirecting ? 'Přesměrovávám…' : 'Aktivovat předplatné'}
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
