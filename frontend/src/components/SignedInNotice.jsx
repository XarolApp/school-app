import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useG } from '../lib/gender';

// Shown instead of the sign-in / sign-up form when an account is already signed
// in. Switching accounts goes through signing out first, so a half-finished
// onboarding or checkout can never run under two accounts at once.
function SignedInNotice() {
  const { user, signOut } = useAuth();
  const g = useG();
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try { await signOut(); } finally { setBusy(false); }
  };

  return (
    <div className="page page-auth">
      <div className="auth-layout">
        <div className="page-header">
          <h1>Už jsi {g('přihlášený', 'přihlášená')}</h1>
          <p className="lede">{user?.email}</p>
        </div>
        <div className="panel panel-lg auth-form">
          <p>Chceš-li použít jiný účet, nejdřív se odhlas.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <Link to="/skoly" className="btn btn-primary">Pokračovat s tímto účtem</Link>
            <button type="button" className="btn btn-secondary" onClick={leave} disabled={busy}>
              {busy ? 'Odhlašuji…' : 'Odhlásit se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignedInNotice;
