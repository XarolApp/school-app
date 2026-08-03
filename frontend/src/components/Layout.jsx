import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">School Finder</Link>
        <div className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
