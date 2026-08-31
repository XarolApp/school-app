import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Layout() {
  const { isSignedIn, signOut, trialDaysLeft, hasAccess } = useAuth();

  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          ŠkolaMatch
        </Link>
        <div className="navbar-links">
          <Link to="/">Domů</Link>
          <Link to="/skoly">Školy</Link>
          <Link to="/onboarding">Najít školu</Link>
          {isSignedIn ? (
            <>
              <Link to="/nastaveni">Nastavení</Link>
              <button type="button" className="navbar-signout" onClick={signOut}>
                Odhlásit se
              </button>
            </>
          ) : (
            <Link to="/prihlaseni">Přihlásit se</Link>
          )}
        </div>
      </nav>

      {isSignedIn && hasAccess && trialDaysLeft > 0 && (
        <p className="trial-banner">
          Zkušební období: zbývá {trialDaysLeft}{' '}
          {trialDaysLeft === 1 ? 'den' : trialDaysLeft < 5 ? 'dny' : 'dní'}.
        </p>
      )}

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
