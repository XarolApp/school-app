import { Link, useLocation } from 'react-router-dom';

/**
 * A segmented control showing "Přihlásit se" and "Vytvořit účet" tabs,
 * used on the login and signup pages. Makes it clear how to switch between
 * them without leaving the page, and keeps both options visible at once.
 *
 * The selected state is painted by one pill that slides between the two cells
 * rather than by a background on the active tab — so switching reads as the
 * same object moving, not as one box vanishing and another appearing. The
 * index goes to CSS as a custom property and the pill translates by whole
 * multiples of its own width, which needs no measuring and survives the tabs
 * being any width at all.
 */
function AuthTabs() {
  const location = useLocation();
  const isLogin = location.pathname === '/prihlaseni';

  return (
    <div
      className="auth-tabs"
      role="tablist"
      aria-label="Přepínač přihlášení a registrace"
      style={{ '--tab-index': isLogin ? 0 : 1 }}
    >
      <span className="tab-thumb" aria-hidden="true" />
      <Link
        to="/prihlaseni"
        role="tab"
        aria-selected={isLogin}
        className={isLogin ? 'auth-tab is-active' : 'auth-tab'}
      >
        Přihlásit se
      </Link>
      <Link
        to="/registrace"
        role="tab"
        aria-selected={!isLogin}
        className={!isLogin ? 'auth-tab is-active' : 'auth-tab'}
      >
        Vytvořit účet
      </Link>
    </div>
  );
}

export default AuthTabs;
