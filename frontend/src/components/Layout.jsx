import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from './AuthContext';

function Layout() {
  const { isSignedIn, signOut, trialDaysLeft, hasAccess } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // A route change is the clearest signal the visitor is done with the menu —
  // closing it here means every nav link can stay a plain <Link>, no per-link
  // onClick handler to keep in sync as links are added or removed.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          ŠkolaMatch
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-expanded={menuOpen}
          aria-controls="navbar-links"
          aria-label={menuOpen ? 'Zavřít menu' : 'Otevřít menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>

        <div id="navbar-links" className={`navbar-links${menuOpen ? ' is-open' : ''}`}>
          <Link to="/">Domů</Link>
          <Link to="/skoly">Školy</Link>
          <Link to="/onboarding">Najít školu</Link>
          <Link to="/porovnani">Porovnání</Link>
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
