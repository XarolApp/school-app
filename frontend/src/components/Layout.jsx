import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          ŠkolaMatch
        </Link>
        <div className="navbar-links">
          <Link to="/">Domů</Link>
          <Link to="/search">Školy</Link>
          <Link to="/onboarding">Najít školu</Link>
          <Link to="/onboarding">Registrace</Link>
        </div>
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
