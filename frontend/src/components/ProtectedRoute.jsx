import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute() {
  const {
    loading,
    profileLoading,
    profileError,
    isSignedIn,
    emailConfirmed,
    hasAccess,
    isTester,
    signOut,
    refreshProfile,
  } = useAuth();
  const location = useLocation();

  if (loading || (isSignedIn && profileLoading)) {
    return (
      <div className="route-loading" role="status">
        Načítám…
      </div>
    );
  }

  if (!isSignedIn) {
    // Remember where they were headed so login can send them back there.
    return <Navigate to="/prihlaseni" state={{ from: location }} replace />;
  }

  // Checked before access, otherwise an unconfirmed account gets bounced to the
  // paywall and told its trial ended — when the real fix is a link in its inbox.
  if (!emailConfirmed) {
    return (
      <div className="page page-auth">
        <div className="auth-layout">
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Potvrď svůj e-mail</span>
            <p className="notice-text">
              Účet ještě není potvrzený. Klikni na odkaz, který jsme ti poslali —
              pak se sem dostaneš.
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>
            Odhlásit se
          </button>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="page page-auth">
        <div className="auth-layout">
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Přístup se nepodařilo ověřit</span>
            <p className="notice-text">{profileError}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={refreshProfile}>
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Navigate
        to="/predplatne"
        state={{ from: location, ...(isTester ? { betaPaused: true } : {}) }}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
