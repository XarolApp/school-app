import { Link } from 'react-router-dom';

/**
 * Home.
 *
 * The quiz is the primary intake primitive, not a feature buried in a menu, so
 * the questionnaire is the main call to action and browsing is secondary.
 * Browsing stays free forever (hybrid paywall, ruling C-7): it is the directory
 * promise and the organic/SEO surface. The depth is what is paid for.
 */
function Home() {
  return (
    <div className="page page-home">
      <h1>Najdi střední školu, kam se opravdu hodíš</h1>
      <p>
        Deset otázek a seřadíme ti pražské střední školy podle toho, co tě baví a odkud budeš
        dojíždět. U každé školy vysvětlíme, proč zrovna ona.
      </p>
      <div className="home-actions">
        <Link to="/onboarding" className="btn btn-primary">
          Spustit dotazník
        </Link>
        <Link to="/search" className="btn btn-secondary">
          Procházet školy
        </Link>
      </div>
    </div>
  );
}

export default Home;
