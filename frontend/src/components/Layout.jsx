import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ClipboardList,
  Clock,
  Columns3,
  CreditCard,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import BrandMark from './BrandMark';
import { COMPARE_EVENT, getCompareSelection } from '../lib/searchPrefs';

function NavbarMark() {
  return (
    <span className="navbar-mark" aria-hidden="true">
      <BrandMark size={22} />
    </span>
  );
}

// The compare selection lives in localStorage; re-read it whenever any page
// changes it (same tab: COMPARE_EVENT, other tabs: 'storage').
function useCompareCount() {
  const [count, setCount] = useState(() => getCompareSelection().length);
  useEffect(() => {
    const update = () => setCount(getCompareSelection().length);
    window.addEventListener(COMPARE_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(COMPARE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return count;
}

const dayWord = (n) => (n === 1 ? 'den' : n < 5 ? 'dny' : 'dní');

function Layout() {
  const { isSignedIn, isTester, signOut, trialDaysLeft, hasAccess, profile, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef(null);
  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);
  const compareCount = useCompareCount();

  const displayName = profile?.name?.trim() || user?.email?.split('@')[0] || 'Účet';
  const initial = displayName.charAt(0).toUpperCase();
  const showTrial = isSignedIn && !isTester && hasAccess && trialDaysLeft > 0;
  const trialText = `Zkušební verze · ještě ${trialDaysLeft} ${dayWord(trialDaysLeft)}`;

  // A route change is the clearest signal the visitor is done with a menu.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Escape closes whichever menu is open and hands focus back to its trigger.
  useEffect(() => {
    if (!menuOpen && !accountOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (accountOpen) {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      } else {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, accountOpen]);

  // Click outside the account menu closes it.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onDown = (e) => {
      if (!accountRef.current?.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [accountOpen]);

  const compareBadge = compareCount > 0 && (
    <span className="navbar-count" aria-label={`${compareCount} vybrané`}>
      {compareCount}
    </span>
  );

  return (
    <div className="app-shell">
      <a href="#obsah" className="skip-link">
        Přeskočit na obsah
      </a>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand" aria-label="Střední na míru – domů">
            <NavbarMark />
            <span>Střední na míru</span>
          </Link>

          <nav id="navbar-links" className={`navbar-links${menuOpen ? ' is-open' : ''}`} aria-label="Hlavní navigace">
            <NavLink to="/skoly">
              <Search size={16} aria-hidden="true" />
              Školy
            </NavLink>
            {isSignedIn && (
              <NavLink to="/dotaznik">
                <ListChecks size={16} aria-hidden="true" />
                Dotazník
              </NavLink>
            )}
            <NavLink to="/porovnani">
              <Columns3 size={16} aria-hidden="true" />
              Porovnání
              {compareBadge}
            </NavLink>
            {isSignedIn && (
              <>
                <NavLink to="/prihlaska">
                  <ClipboardList size={16} aria-hidden="true" />
                  Přihláška
                </NavLink>
                <NavLink to="/ulozene">
                  <Bookmark size={16} aria-hidden="true" />
                  Uložené
                </NavLink>
              </>
            )}

            {/* Mobile sheet only: account block / sign-in actions under the links. */}
            <div className="navbar-sheet-foot">
              {isSignedIn ? (
                <>
                  <div className="navbar-sheet-user" data-private>
                    <span className="navbar-avatar navbar-avatar-lg" aria-hidden="true">{initial}</span>
                    <span>
                      <strong>{displayName}</strong>
                      {user?.email && <span className="navbar-email" data-private>{user.email}</span>}
                    </span>
                  </div>
                  {showTrial && (
                    <p className="navbar-trial navbar-trial-block">
                      <Clock size={14} aria-hidden="true" />
                      {trialText}
                    </p>
                  )}
                  <div className="navbar-sheet-actions">
                    <Link to="/nastaveni" className="ss-btn ss-btn-secondary">Nastavení</Link>
                    <button type="button" className="ss-btn ss-btn-secondary navbar-danger" onClick={signOut}>
                      Odhlásit se
                    </button>
                  </div>
                </>
              ) : (
                <div className="navbar-sheet-actions">
                  <Link to="/onboarding" className="ss-btn ss-btn-primary">Začít dotazník</Link>
                  <Link to="/prihlaseni" className="ss-btn ss-btn-secondary">Přihlásit se</Link>
                </div>
              )}
            </div>
          </nav>

          <div className="navbar-actions">
            {isSignedIn ? (
              <>
                {showTrial && (
                  <span className="navbar-trial">
                    <Clock size={14} aria-hidden="true" />
                    {trialText}
                  </span>
                )}
                <div className="navbar-account" ref={accountRef}>
                  <button
                    type="button"
                    ref={accountButtonRef}
                    className="navbar-account-btn"
                    data-private
                    aria-expanded={accountOpen}
                    aria-controls="navbar-account-menu"
                    onClick={() => setAccountOpen((open) => !open)}
                  >
                    <span className="navbar-avatar" aria-hidden="true">{initial}</span>
                    <span className="navbar-account-name">{displayName}</span>
                    <ChevronDown size={16} aria-hidden="true" className="navbar-chevron" />
                  </button>
                  {accountOpen && (
                    <div id="navbar-account-menu" className="navbar-account-menu">
                      <div className="navbar-account-head" data-private>
                        <strong>{displayName}</strong>
                        {user?.email && <span className="navbar-email" data-private>{user.email}</span>}
                      </div>
                      <Link to="/nastaveni" className="navbar-menu-item">
                        <SlidersHorizontal size={16} aria-hidden="true" />
                        Nastavení
                      </Link>
                      {import.meta.env.DEV && (
                        <Link to="/onboarding/plan" className="navbar-menu-item">
                          <CreditCard size={16} aria-hidden="true" />
                          Předplatné
                          <span className="navbar-dev-tag">DEV</span>
                        </Link>
                      )}
                      <hr className="navbar-menu-sep" />
                      <button type="button" className="navbar-menu-item navbar-danger" onClick={signOut}>
                        <LogOut size={16} aria-hidden="true" />
                        Odhlásit se
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/prihlaseni" className="navbar-login">
                  <LogIn size={16} aria-hidden="true" />
                  Přihlásit se
                </Link>
                <Link to="/onboarding" className="navbar-cta">
                  Začít dotazník
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>

          <NavLink to="/porovnani" className="navbar-compare-mobile" aria-label={`Porovnání${compareCount ? `, ${compareCount} vybrané` : ''}`}>
            <Columns3 size={20} aria-hidden="true" />
            {compareBadge}
          </NavLink>
          <button
            type="button"
            ref={toggleRef}
            className="navbar-toggle"
            aria-expanded={menuOpen}
            aria-controls="navbar-links"
            aria-label={menuOpen ? 'Zavřít menu' : 'Otevřít menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="obsah" className="app-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="app-footer">
        <span className="app-footer-brand">
          <BrandMark size={16} />
          © {new Date().getFullYear()} Střední na míru
        </span>
        <nav aria-label="Právní informace">
          <Link to="/obchodni-podminky">Obchodní podmínky</Link>
          <Link to="/ochrana-osobnich-udaju">Ochrana osobních údajů</Link>
        </nav>
      </footer>
    </div>
  );
}

export default Layout;
