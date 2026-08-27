import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import useHideOnScroll from '../lib/useHideOnScroll';

// The header stays put on these. They are short forms rather than pages to be
// read, so there is no length to reclaim — and sliding the nav away mid-form
// takes the way out from under someone who has decided not to sign in after
// all. The whole auth flow is here, not just the two tabs: password reset is
// reached from the login form and behaves like part of it.
const PINNED_HEADER_PATHS = new Set([
  '/prihlaseni',
  '/registrace',
  '/zapomenute-heslo',
  '/nove-heslo',
]);

const navClass = (isActive) =>
  isActive ? 'site-nav-link is-active' : 'site-nav-link';

const avatarClass = ({ isActive }) =>
  isActive ? 'avatar-link is-active' : 'avatar-link';

// Two initials from the name, one from the e-mail as a fallback. Diacritics
// survive toUpperCase, so "Šárka Nováková" gives "ŠN" and not "SN".
function initialsFrom(name, email) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }
  return (email || '?').trim()[0].toUpperCase();
}

function Layout() {
  const {
    isSignedIn,
    hasAccess,
    isDeveloper,
    user,
    profile,
    trialDaysLeft,
    signOut,
  } = useAuth();
  const showTrialBanner =
    isSignedIn && hasAccess && profile?.subscription_status === 'trialing';

  const { pathname, state } = useLocation();
  const headerHidden = useHideOnScroll(
    pathname,
    !PINNED_HEADER_PATHS.has(pathname)
  );

  /**
   * Which nav item is lit.
   *
   * A school detail page lives at /skoly/:id whichever list it was opened
   * from, so plain URL matching always highlights "Hledat školy" — including
   * when the visitor is halfway through reading their questionnaire results.
   * The marker is the same router state the detail page's back link reads, so
   * the header and that link can never point at different places.
   *
   * State does not survive a refresh, which falls back to the search tab. That
   * is the honest answer once the trail is gone, and it matches where the back
   * link would send them too.
   */
  const cameFrom = pathname.startsWith('/skoly/') ? state?.from : null;
  const isQuestionnaire = pathname === '/dotaznik' || cameFrom === 'questionnaire';
  const isFavorites = pathname === '/oblibene' || cameFrom === 'favorites';
  const isSearch =
    pathname === '/skoly' ||
    (pathname.startsWith('/skoly/') && !isQuestionnaire && !isFavorites);

  return (
    <div className="app-shell">
      <header
        className={headerHidden ? 'site-header is-hidden' : 'site-header'}
      >
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            <span>
              Škola<span className="brand-accent">Match</span>
            </span>
            <span className="brand-region">Praha</span>
          </Link>

          {/* Plain Links rather than NavLinks: the active item is decided
              above from path *and* origin, which NavLink's own URL matching
              cannot express. */}
          <nav className="site-nav">
            <Link
              to="/"
              className={navClass(pathname === '/')}
              aria-current={pathname === '/' ? 'page' : undefined}
            >
              Úvod
            </Link>
            <Link
              to="/skoly"
              className={navClass(isSearch)}
              aria-current={isSearch ? 'page' : undefined}
            >
              Hledat školy
            </Link>
            <Link
              to="/dotaznik"
              className={navClass(isQuestionnaire)}
              aria-current={isQuestionnaire ? 'page' : undefined}
            >
              Dotazník
            </Link>
            {isSignedIn && (
              <Link
                to="/oblibene"
                className={navClass(isFavorites)}
                aria-current={isFavorites ? 'page' : undefined}
              >
                Oblíbené
              </Link>
            )}
          </nav>

          {isSignedIn ? (
            <div className="site-header-actions">
              {isDeveloper && <span className="badge">Vývojář</span>}
              <button
                type="button"
                className="btn btn-secondary btn-sm site-header-cta"
                onClick={signOut}
              >
                Odhlásit se
              </button>
              <NavLink
                to="/nastaveni"
                className={avatarClass}
                aria-label="Nastavení účtu"
                title={profile?.name || user?.email || 'Nastavení účtu'}
              >
                <span aria-hidden="true">
                  {initialsFrom(profile?.name, user?.email)}
                </span>
              </NavLink>
            </div>
          ) : (
            <div className="site-header-actions">
              <Link to="/prihlaseni" className="btn btn-ghost btn-sm">
                Přihlásit
              </Link>
              <Link
                to="/registrace"
                className="btn btn-primary btn-sm site-header-cta"
              >
                7 dní zdarma
              </Link>
            </div>
          )}
        </div>

        {showTrialBanner && (
          <div className="trial-banner">
            <div className="container trial-banner-inner">
              <span>
                Zkušební období:{' '}
                <strong>
                  {trialDaysLeft}{' '}
                  {trialDaysLeft === 1
                    ? 'den'
                    : trialDaysLeft >= 2 && trialDaysLeft <= 4
                      ? 'dny'
                      : 'dní'}
                </strong>{' '}
                zbývá
              </span>
              <Link to="/predplatne">Aktivovat předplatné</Link>
            </div>
          </div>
        )}
      </header>

      <main className="app-content">
        {/* Keyed by path so React tears the old page down and mounts a new
            node, which restarts the entrance animation. Without the key the
            same element is reused and the transition only ever plays once. */}
        <div className="container route-view" key={pathname}>
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container site-footer-inner">
          <span>
            © {new Date().getFullYear()} ŠkolaMatch — střední školy v Praze
          </span>
          <div className="site-footer-links">
            <Link to="/skoly">Databáze škol</Link>
            <Link to="/predplatne">Předplatné</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
