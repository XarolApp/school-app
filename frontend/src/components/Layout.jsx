import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from './AuthContext';

function Layout() {
  const { isSignedIn, signOut, trialDaysLeft, hasAccess } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef(null);

  // A route change is the clearest signal the visitor is done with the menu —
  // closing it here means every nav link can stay a plain <Link>, no per-link
  // onClick handler to keep in sync as links are added or removed.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Escape closes the disclosure and hands focus back to its trigger.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a href="#obsah" className="skip-link">
        Přeskočit na obsah
      </a>
      <nav className="navbar" aria-label="Hlavní navigace">
        <Link to="/" className="navbar-brand">
          ŠkolaMatch
        </Link>

        <button
          type="button"
          ref={toggleRef}
          className="navbar-toggle"
          aria-expanded={menuOpen}
          aria-controls="navbar-links"
          aria-label={menuOpen ? 'Zavřít menu' : 'Otevřít menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>

        <div id="navbar-links" className={`navbar-links${menuOpen ? ' is-open' : ''}`}>
          <NavLink to="/" end>Domů</NavLink>
          <NavLink to="/skoly">Školy</NavLink>
          <NavLink to="/onboarding" end>Najít školu</NavLink>
          <NavLink to="/porovnani">Porovnání</NavLink>
          {isSignedIn ? (
            <>
              <NavLink to="/dotaznik">Dotazník</NavLink>
              <NavLink to="/nastaveni">Nastavení</NavLink>
              <button type="button" className="navbar-signout" onClick={signOut}>
                Odhlásit se
              </button>
            </>
          ) : (
            <NavLink to="/prihlaseni">Přihlásit se</NavLink>
          )}
        </div>
      </nav>

      {isSignedIn && hasAccess && trialDaysLeft > 0 && (
        <p className="trial-banner">
          Zkušební období: zbývá {trialDaysLeft}{' '}
          {trialDaysLeft === 1 ? 'den' : trialDaysLeft < 5 ? 'dny' : 'dní'}.
        </p>
      )}

      <main id="obsah" className="app-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
