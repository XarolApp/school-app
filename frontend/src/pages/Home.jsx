import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

// Illustrative results shown in the hero. Replaced by real matches once the
// questionnaire is wired up.
const PREVIEW_MATCHES = [
  {
    name: 'Gymnázium Nad Alejí',
    meta: 'Praha 6 · Všeobecné studium',
    match: 94,
    lead: true,
  },
  {
    name: 'SPŠ strojnická, Betlémská',
    meta: 'Praha 1 · Strojírenství, IT',
    match: 87,
  },
  {
    name: 'Obchodní akademie Praha',
    meta: 'Praha 2 · Ekonomika',
    match: 81,
  },
];

const STATS = [
  { value: '60', label: 'škol v databázi' },
  { value: '1', label: 'město' },
  { value: '6', label: 'typů oborů' },
  { value: '2 min', label: 'na vyplnění dotazníku' },
];

const STEPS = [
  {
    title: 'Zadej, co tě zajímá',
    text: 'Obor, lokalita a průměr ze základky — pár otázek stačí na první výběr.',
  },
  {
    title: 'Porovnej v klidu',
    text: 'Obory, přijímačky i kontakty vedle sebe, bez otevírání deseti webů.',
  },
  {
    title: 'Ulož si favority',
    text: 'Vytvoř si žebříček škol a vrať se k němu, až budeš podávat přihlášky.',
  },
];

function Home() {
  const { isSignedIn, hasAccess } = useAuth();

  return (
    <div className="page page-home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Pražské střední školy na jednom místě</p>
          <h1 className="hero-title">
            Vyber si střední školu <em>s jistotou</em>, ne odhadem.
          </h1>
          <p className="lede">
            Porovnej obory, přijímačky a lokalitu napříč Prahou. Zodpověz pár
            otázek a uvidíš, které školy k tobě sedí nejlíp — podle dat, ne
            náhody.
          </p>
          <div className="hero-actions">
            {!isSignedIn ? (
              <>
                <Link to="/registrace" className="btn btn-primary">
                  Vyzkoušet 7 dní zdarma
                </Link>
                <Link to="/prihlaseni" className="btn btn-secondary">
                  Přihlásit se
                </Link>
              </>
            ) : hasAccess ? (
              <Link to="/skoly" className="btn btn-primary">
                Prohlížet školy
              </Link>
            ) : (
              <Link to="/predplatne" className="btn btn-primary">
                Aktivovat předplatné
              </Link>
            )}
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          {PREVIEW_MATCHES.map((school) => (
            <div
              key={school.name}
              className={
                school.lead ? 'preview-card preview-card-lead' : 'preview-card'
              }
            >
              <div className="preview-card-body">
                {school.lead && <span className="badge">Nejlepší shoda</span>}
                <span className="preview-card-name">{school.name}</span>
                <span className="preview-card-meta">{school.meta}</span>
              </div>
              <div className="match">
                <div className="match-value">{school.match} %</div>
                <div className="match-label">shoda</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="stat-strip">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="steps">
        {STEPS.map((step, index) => (
          <div key={step.title} className="step">
            <p className="step-index">Krok {index + 1}</p>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-text">{step.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Home;
