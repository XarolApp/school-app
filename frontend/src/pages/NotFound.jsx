import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

/** Catch-all for unknown URLs inside the app shell (they used to render blank). */
function NotFound() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/skoly?q=${encodeURIComponent(q)}` : '/skoly');
  };

  return (
    <div className="nf-page">
      <div className="nf-code" aria-hidden="true">404</div>
      <div>
        <h1 className="ss-headline-lg h">Tahle stránka tu není</h1>
        <p className="ss-body-lg nf-lede">Možná se změnila adresa, nebo je v odkazu překlep. Školu ale najdeš i odsud.</p>
      </div>
      <form className="nf-search" role="search" onSubmit={submit}>
        <label className="nf-search-field">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Název školy nebo obor"
            aria-label="Hledat školu"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="submit" className="ss-btn ss-btn-primary dp-btn-lg">
          Hledat
        </button>
      </form>
      <nav className="nf-links" aria-label="Kam dál">
        <Link to="/skoly">Všechny školy</Link>
        <Link to="/porovnani">Porovnání</Link>
        <Link to="/">Úvodní stránka</Link>
      </nav>
    </div>
  );
}

export default NotFound;
