import { Link } from 'react-router-dom';
import './landing.css';

/**
 * Home / úvodní stránka.
 *
 * Ported from `design/system/ui_kits/skolamatch/Landing.jsx` — the Claude Design
 * mockup built against `design/DESIGN.md`. Layout, hierarchy and Czech copy are
 * the mockup's; see `landing.css` for why the colour tokens are the app's own
 * rather than the design system's.
 *
 * Two things in the mockup are deliberately NOT carried over:
 *
 * - Its `Header`, `Page` and the outer max-width wrapper, which duplicate what
 *   `components/Layout.jsx` and `.app-content` already provide. The mockup is a
 *   standalone click-through and has to draw its own chrome; this page is
 *   rendered inside the real shell.
 * - The ambient idle animation DESIGN.md specifies under "Motion — landing
 *   page". The mockup omits it too, on purpose, as its own README records.
 *
 * The quiz is the primary intake, not a feature buried in a menu, so it is the
 * first CTA; browsing is secondary but stays free forever (hybrid paywall,
 * ruling C-7) because it is the directory promise and the organic/SEO surface.
 */
function Home() {
  return (
    <div className="page page-home">
      <section className="ls-hero">
        {/* The single ambient idle loop from DESIGN.md's "Motion — landing page".
            Purely decorative and out of the accessibility tree; see landing.css
            for the containment, reduced-motion and mobile rules. */}
        <div className="ls-ambient" aria-hidden="true">
          <span className="ls-bloom" />
        </div>

        <div className="ls-hero-copy">
          <p className="ls-eyebrow">Pro deváťáky a jejich rodiče</p>
          <h1 className="ls-title">Vyber si školu podle sebe</h1>
          <p className="ls-lede">
            Odpovíš na dvacet otázek o tom, co tě zajímá, kam dojedeš a jak se ti učí.
            Pak uvidíš školy, které tomu odpovídají — a u každé napsané, čím konkrétně.
          </p>
          <div className="ls-ctas">
            <Link to="/onboarding" className="btn btn-primary btn-lg">
              Začít dotazník
            </Link>
            <Link to="/skoly" className="btn btn-secondary btn-lg">
              Prohlédnout databázi škol
            </Link>
          </div>
          <p className="ls-fineprint">
            Dotazník je zdarma. Platí se až za podrobné srovnání.
          </p>
        </div>

        {/* Placeholder, not a missing image — see .ls-photo in landing.css. */}
        <div className="ls-photo" aria-hidden="true">
          <span className="ls-photo-label">Fotografie · reální lidé, teplý tón</span>
        </div>
      </section>

      <hr className="ls-rule" />

      <section className="ls-features">
        <article className="ls-card">
          <h2 className="ls-card-title">Podle tvých kritérií</h2>
          <p className="ls-card-body">
            U každé školy je napsané, které z věcí, co jsi označil jako důležité, škola
            nabízí — a které ne.
          </p>
        </article>
        <article className="ls-card">
          <h2 className="ls-card-title">Čísla se zdrojem</h2>
          <p className="ls-card-body">
            Hranice přijetí, počet míst a obory pocházejí z veřejných rejstříků. U každého
            čísla je rok.
          </p>
        </article>
        <article className="ls-card">
          <h2 className="ls-card-title">Beze skóre</h2>
          <p className="ls-card-body">
            Nedáváme školám známky ani ti neříkáme, jak dobrý jsi kandidát. Ukazujeme
            fakta a jak sedí k tomu, co jsi napsal.
          </p>
        </article>
      </section>

      <footer>
        <hr className="ls-rule" />
        <div className="ls-footer-row">
          <div>
            <span className="ls-wordmark">ŠkolaMatch</span>
            <p className="ls-footer-note">
              Data o oborech a hranicích přijetí přebíráme z veřejných rejstříků MŠMT a
              z výsledků jednotné přijímací zkoušky. U každého čísla uvádíme rok a zdroj.
            </p>
          </div>
          <nav className="ls-footer-links">
            <Link to="/skoly">Databáze škol</Link>
            <Link to="/onboarding">Jak to funguje</Link>
            <Link to="/predplatne">Ceník</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Home;
