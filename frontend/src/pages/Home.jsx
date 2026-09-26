import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { trialDaysPhrase } from '../config/pricing';
import { QUESTIONS } from './onboarding/quizQuestions';
import './landing.css';

/**
 * Home / úvodní stránka — long-form landing (rebuilt 2026-09-26).
 *
 * One offer, one action: every primary button goes to /onboarding. Browsing
 * the database stays a demoted text link (hybrid paywall, ruling C-7).
 *
 * Two kinds of placeholder are deliberate, not missing work:
 * - `.ls-motion` slots: where the product-demo motion graphic will go. Built
 *   later in the separate animation pass (DESIGN.md → "ANIMATION BUILD
 *   INSTRUCTION"), never hand-written here. Each slot's caption is its brief.
 * - `.ls-photo` slots: real photography of real people, per DESIGN.md.
 *
 * No testimonials, user counts or ratings: config/socialProof.js is empty on
 * purpose. Proof here is methodology and data sources, which are true today.
 */

const QUESTION_COUNT = QUESTIONS.length;

const FACTS = [
  { value: '223', label: 'pražských středních škol v databázi' },
  { value: String(QUESTION_COUNT), label: 'otázek v dotazníku, asi 4 minuty' },
  { value: '3 roky', label: 'hranic přijetí u každého oboru' },
  { value: '0 Kč', label: 'za základní výsledek a databázi škol' },
];

const STEPS = [
  {
    title: 'Odpovíš na pár otázek',
    body: 'Co tě baví, kam se vidíš za pět let, jestli tě táhne gympl nebo odborka a kam po Praze dojedeš. Otázku, kterou nevíš, přeskočíš — výsledek tím nezhoršíš.',
    shot: 'Obrazovka otázky · „Co tě baví nejvíc?“ s vybranou odpovědí',
  },
  {
    title: 'Uvidíš školy seřazené podle shody',
    body: 'U každé školy je napsané, podle čeho sedí: obor, vzdálenost, jazyky, praxe. Když něco nesedí, stojí to tam taky.',
    shot: 'Výsledky · seznam škol s procentem shody a důvody',
  },
  {
    title: 'Projdeš si detail každé školy',
    body: 'Obory, počet míst, kolik lidí se hlásilo a kolik jich vzali, hranice přijetí za poslední tři roky. U každého čísla je rok a zdroj.',
    shot: 'Detail školy · karta oboru s grafem hranice přijetí',
  },
  {
    title: 'Seřadíš si tři přihlášky',
    body: 'Vybereš tři školy v pořadí, ve kterém je dáš na přihlášku, a uvidíš, kde je tvoje skóre z přijímaček proti loňské hranici.',
    shot: 'Přihláška · tři školy v pořadí s porovnáním skóre',
  },
];

const FAQ = [
  {
    q: 'Co je ŠkolaMatch?',
    a: 'Průvodce výběrem střední školy v Praze. Databáze všech škol s obory a výsledky přijímaček na jednom místě, a dotazník, který z nich vybere ty, které sedí tomu, co hledáš.',
  },
  {
    q: 'Kolik to stojí?',
    a: `Dotazník, základní výsledek a celá databáze škol jsou zdarma. Placený přístup odemyká podrobné porovnání, rozhodovací matici a plánování přihlášek. Prvních ${trialDaysPhrase()} je zdarma a zrušit se to dá jedním kliknutím v nastavení.`,
  },
  {
    q: 'Odkud máte data o školách?',
    a: 'Obory, kapacity a hranice přijetí jsou z veřejných výsledků jednotné přijímací zkoušky (Cermat) a z rejstříku škol MŠMT. U každého čísla uvádíme rok. Když najdeš chybu, u školy je tlačítko „Nahlásit chybu v údajích“.',
  },
  {
    q: 'Znamená vysoké procento shody, že mě vezmou?',
    a: 'Ne. Shoda říká, jak škola odpovídá tomu, co jsi napsal v dotazníku. O přijetí rozhodují přijímačky a známky. Proto u škol zvlášť ukazujeme hranice přijetí z minulých let.',
  },
  {
    q: 'Platí mi školy za lepší umístění?',
    a: 'Ne. Pořadí počítá pevný vzorec z tvých odpovědí a z veřejných dat. Nikdo si v něm nemůže koupit místo.',
  },
  {
    q: 'Co se děje s mými odpověďmi?',
    a: 'Během dotazníku zůstávají jen v tvém prohlížeči. Uložíme je až ve chvíli, kdy si založíš účet, a smazat je můžeš kdykoli i s celým účtem.',
  },
  {
    q: 'Je to jen pro Prahu?',
    a: 'Zatím ano, všech 223 pražských středních škol. Další kraje přidáme, až bude Praha fungovat tak, jak má.',
  },
  {
    q: 'Můžu to vyplnit jako rodič?',
    a: 'Ano. Na začátku dotazníku si vyberete, jestli ho vyplňuje student, nebo rodič, a otázky se tomu přizpůsobí. Výsledek pak můžete sdílet odkazem.',
  },
];

/** Words go from muted to full ink in reading order. Driven by useReveal()
 *  like every other section (it adds `.is-in`); the per-word stagger is CSS.
 *  Reduced motion shows the finished state. */
function Statement({ text }) {
  return (
    <p className="ls-statement" data-reveal>
      {text.split(' ').map((word, i) => (
        <span key={i} style={{ '--i': i }}>
          {word}{' '}
        </span>
      ))}
    </p>
  );
}

/** Scroll reveal for everything marked `data-reveal`: one observer, each
 *  element fades up once and is then unobserved. `.js-reveal` is added here,
 *  so without JS (or IntersectionObserver) nothing is ever hidden. */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return undefined;
    root.classList.add('js-reveal');
    const pending = new Set(root.querySelectorAll('[data-reveal]'));
    // A fast fling can jump an element from below the fold to above it
    // between two frames, and the observer never fires for it. So every
    // callback (and scrollend) sweeps: anything whose top is above the
    // viewport's bottom edge is revealed.
    const sweep = () => {
      for (const el of pending) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.88) {
          el.classList.add('is-in');
          pending.delete(el);
          io.unobserve(el);
        }
      }
      if (!pending.size) window.removeEventListener('scrollend', sweep);
    };
    const io = new IntersectionObserver(sweep, { rootMargin: '0px 0px -12% 0px' });
    pending.forEach((el) => io.observe(el));
    window.addEventListener('scrollend', sweep);
    return () => {
      io.disconnect();
      window.removeEventListener('scrollend', sweep);
    };
  }, []);
  return ref;
}

function Home() {
  const rootRef = useReveal();
  return (
    <div ref={rootRef} className="page page-home">
      {/* ---------- 1. hero ---------- */}
      <section className="ls-hero">
        <div className="ls-hero-copy">
          <p className="ls-eyebrow">Výběr střední školy · Praha</p>
          <h1 className="ls-title">Najdi střední školu, která ti opravdu sedí</h1>
          <p className="ls-lede">
            ŠkolaMatch dává všech 223 pražských středních škol na jedno místo. Odpovíš na{' '}
            {QUESTION_COUNT} otázek a uvidíš, které školy odpovídají tomu, co tě baví, kam
            dojedeš a jak se ti učí — a u každé proč.
          </p>
          <div className="ls-ctas">
            <Link to="/onboarding" className="btn btn-primary btn-lg">
              Začít dotazník zdarma
            </Link>
            <Link to="/skoly" className="ls-textlink">
              nebo si projdi databázi škol →
            </Link>
          </div>
          <p className="ls-fineprint">Bez registrace · asi 4 minuty · přeskočit můžeš cokoli</p>
        </div>

        <figure className="ls-motion ls-motion--phone" aria-hidden="true">
          <div className="ls-phone">
            <span className="ls-slot-tag">Motion · hero</span>
            <span className="ls-slot-brief">
              Smyčka 8–10 s: odpověď v dotazníku → seznam škol se seřadí → otevře se detail
              školy. Skutečné obrazovky, žádné ilustrace.
            </span>
          </div>
        </figure>
      </section>

      {/* ---------- 2. facts ---------- */}
      <dl className="ls-facts">
        {FACTS.map((f) => (
          <div key={f.label} className="ls-fact" data-reveal style={{ '--i': FACTS.indexOf(f) }}>
            <dt className="ls-fact-value">{f.value}</dt>
            <dd className="ls-fact-label">{f.label}</dd>
          </div>
        ))}
      </dl>

      {/* ---------- 3. problem ---------- */}
      <section className="ls-split" data-reveal>
        <div>
          <p className="ls-eyebrow">Jak se to dělá dnes</p>
          <h2 className="ls-h2">Třicet otevřených záložek a pořád nevíš</h2>
          <div className="ls-prose">
            <p>
              Katalog škol existuje, ale ukáže ti jen dlouhý seznam. Podrobnosti hledáš
              zvlášť na webu každé školy, hranice přijetí v tabulkách Cermatu a zbytek se
              dozvíš od známých.
            </p>
            <p>
              A přitom jde o rozhodnutí na čtyři roky, které musíš udělat do
              termínu přihlášek, v době, kdy tě čekají i přijímačky.
            </p>
          </div>
        </div>
        <figure className="ls-photo ls-photo--tall">
          <span className="ls-slot-tag">Fotografie</span>
          <span className="ls-slot-brief">
            Student u stolu večer, notebook s mnoha záložkami, sešit s poznámkami. Skutečný
            člověk, přirozené světlo, ne stock.
          </span>
        </figure>
      </section>

      {/* ---------- 4. statement ---------- */}
      <section className="ls-statement-wrap">
        <Statement text="Všechny školy na jednom místě. Seřazené podle toho, co chceš ty, ne podle toho, kdo má hezčí web." />
      </section>

      {/* ---------- 5. product demo ---------- */}
      <section className="ls-demo">
        <div className="ls-section-head">
          <p className="ls-eyebrow">Jak to vypadá</p>
          <h2 className="ls-h2">Od první otázky po hotové přihlášky</h2>
        </div>
        <figure className="ls-motion ls-motion--wide" aria-hidden="true" data-reveal>
          <span className="ls-slot-tag">Motion · produktové demo, 16 : 9</span>
          <ol className="ls-slot-storyboard">
            <li>Dotazník na telefonu, 2–3 odpovědi</li>
            <li>Výsledky na notebooku, školy seřazené podle shody</li>
            <li>Detail školy, graf hranice přijetí za 3 roky</li>
            <li>Porovnání dvou škol vedle sebe</li>
            <li>Tři přihlášky seřazené v pořadí</li>
          </ol>
        </figure>
      </section>

      {/* ---------- 6. how it works ---------- */}
      <section className="ls-steps">
        <div className="ls-section-head">
          <p className="ls-eyebrow">Postup</p>
          <h2 className="ls-h2">Čtyři kroky, žádné hádání</h2>
        </div>
        <ol className="ls-step-list">
          {STEPS.map((s, i) => (
            <li key={s.title} className="ls-step" data-reveal>
              <div className="ls-step-copy">
                <span className="ls-step-num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="ls-h3">{s.title}</h3>
                <p className="ls-body">{s.body}</p>
              </div>
              <figure className="ls-shot" aria-hidden="true">
                <span className="ls-slot-tag">Snímek obrazovky</span>
                <span className="ls-slot-brief">{s.shot}</span>
              </figure>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 7. features (bento, 1 large + 4 small) ---------- */}
      <section className="ls-bento-wrap">
        <div className="ls-section-head">
          <p className="ls-eyebrow">Co v tom najdeš</p>
          <h2 className="ls-h2">Všechno, co se jinak hledá po kouskách</h2>
        </div>
        <div className="ls-bento">
          <article className="ls-tile ls-tile--lead" data-reveal style={{ '--i': 0 }}>
            <h3 className="ls-h3">Hranice přijetí u každého oboru</h3>
            <p className="ls-body">
              Kolik bodů stačilo loni, předloni i před třemi lety, kolik bylo míst a kolik
              přihlášek. Vidíš, jestli se na obor dostává snáz, nebo hůř.
            </p>
            <figure className="ls-shot ls-shot--inset" aria-hidden="true">
              <span className="ls-slot-tag">Snímek obrazovky</span>
              <span className="ls-slot-brief">Karta oboru s tříletým trendem hranice</span>
            </figure>
          </article>
          <article className="ls-tile" data-reveal style={{ '--i': 1 }}>
            <h3 className="ls-h3">Porovnání vedle sebe</h3>
            <p className="ls-body">Až čtyři školy v jedné tabulce, stejné údaje na stejném řádku.</p>
          </article>
          <article className="ls-tile" data-reveal style={{ '--i': 2 }}>
            <h3 className="ls-h3">Mapa a dojezd</h3>
            <p className="ls-body">Vybereš městské části, kam dojedeš, a vzdálenost se promítne do shody.</p>
          </article>
          <article className="ls-tile" data-reveal style={{ '--i': 3 }}>
            <h3 className="ls-h3">Recenze od studentů</h3>
            <p className="ls-body">Psané lidmi, kteří na škole jsou nebo byli. Anonymně podle role.</p>
          </article>
          <article className="ls-tile" data-reveal style={{ '--i': 4 }}>
            <h3 className="ls-h3">Sdílení s rodiči</h3>
            <p className="ls-body">Jeden odkaz, jen pro čtení. Kdykoli ho zase zrušíš.</p>
          </article>
        </div>
      </section>

      {/* ---------- 8. two audiences ---------- */}
      <section className="ls-roles">
        <article className="ls-role" data-reveal style={{ '--i': 0 }}>
          <figure className="ls-photo ls-photo--role">
            <span className="ls-slot-tag">Fotografie</span>
            <span className="ls-slot-brief">Deváťák s telefonem, venku nebo v tramvaji</span>
          </figure>
          <p className="ls-eyebrow">Pro studenty</p>
          <h2 className="ls-h3">Vyber si podle sebe</h2>
          <p className="ls-body">
            Nemusíš vědět, čím chceš být. Stačí vědět, co tě baví víc a co míň. Zbytek
            dopočítáme a ukážeme, proč vychází zrovna tahle škola.
          </p>
          <Link to="/onboarding" className="ls-textlink">Začít jako student →</Link>
        </article>
        <article className="ls-role" data-reveal style={{ '--i': 1 }}>
          <figure className="ls-photo ls-photo--role">
            <span className="ls-slot-tag">Fotografie</span>
            <span className="ls-slot-brief">Rodič s dítětem u notebooku, doma u stolu</span>
          </figure>
          <p className="ls-eyebrow">Pro rodiče</p>
          <h2 className="ls-h3">Mějte přehled, ne další starost</h2>
          <p className="ls-body">
            Data ze stejných zdrojů, jaké používají školy, na jednom místě. Výsledek vašeho
            dítěte si můžete otevřít na vlastním počítači a projít v klidu.
          </p>
          <Link to="/onboarding" className="ls-textlink">Začít jako rodič →</Link>
        </article>
      </section>

      {/* ---------- 9. honesty ---------- */}
      <section className="ls-honesty" data-reveal>
        <div className="ls-section-head">
          <p className="ls-eyebrow">Na rovinu</p>
          <h2 className="ls-h2">Co ŠkolaMatch umí a co ne</h2>
        </div>
        <div className="ls-honesty-grid">
          <div>
            <h3 className="ls-list-title">Je to</h3>
            <ul className="ls-list ls-list--yes">
              <li>Přehled všech pražských středních škol s veřejnými daty</li>
              <li>Pořadí podle tvých odpovědí, s vysvětlením u každé školy</li>
              <li>Pomůcka pro rozhodnutí, které nakonec děláš ty</li>
            </ul>
          </div>
          <div>
            <h3 className="ls-list-title">Není to</h3>
            <ul className="ls-list ls-list--no">
              <li>Záruka přijetí ani odhad tvých šancí na zkoušce</li>
              <li>Žebříček nejlepších škol</li>
              <li>Reklama, za kterou si školy platí</li>
            </ul>
          </div>
        </div>
        <p className="ls-source">
          Zdroje: výsledky jednotné přijímací zkoušky (Cermat), rejstřík škol a školských
          zařízení (MŠMT). U každého čísla v aplikaci uvádíme rok.
        </p>
      </section>

      {/* ---------- 10. founder ---------- */}
      <section className="ls-founder" data-reveal>
        <figure className="ls-photo ls-photo--portrait">
          <span className="ls-slot-tag">Portrét</span>
          <span className="ls-slot-brief">Zakladatel, neformálně</span>
        </figure>
        <blockquote className="ls-founder-quote">
          {/* TODO(founder): replace with the founder's own words and name. */}
          <p>
            „[Návrh textu] Sám jsem si střední vybíral z tabulek a doslechu. ŠkolaMatch je
            nástroj, který jsem tehdy chtěl mít.“
          </p>
          <footer>[Jméno], zakladatel ŠkolaMatch</footer>
        </blockquote>
      </section>

      {/* ---------- 11. pricing summary ---------- */}
      <section className="ls-price">
        <div>
          <p className="ls-eyebrow">Cena</p>
          <h2 className="ls-h2">Začátek je zdarma</h2>
          <p className="ls-body">
            Dotazník, výsledek a databázi škol používáš bez placení. Podrobné nástroje pro
            rozhodování si můžeš {trialDaysPhrase()} vyzkoušet zdarma.
          </p>
        </div>
        <div className="ls-price-cols" data-reveal>
          <div className="ls-price-col">
            <h3 className="ls-list-title">Zdarma</h3>
            <ul className="ls-list">
              <li>Dotazník a výsledek se shodou</li>
              <li>Databáze všech 223 škol</li>
              <li>Detail školy s hranicemi přijetí</li>
            </ul>
          </div>
          <div className="ls-price-col ls-price-col--paid">
            <h3 className="ls-list-title">Plný přístup</h3>
            <ul className="ls-list">
              <li>Porovnání a rozhodovací matice</li>
              <li>Plán tří přihlášek se skóre</li>
              <li>Poznámky a sdílení s rodiči</li>
            </ul>
            <p className="ls-fineprint">
              Prvních {trialDaysPhrase()} zdarma · zrušení jedním kliknutím
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 12. FAQ ---------- */}
      <section className="ls-faq">
        <div className="ls-faq-head">
          <p className="ls-eyebrow">Otázky</p>
          <h2 className="ls-h2">Na co se lidé ptají</h2>
        </div>
        <div className="ls-faq-list">
          {FAQ.map((item) => (
            <details key={item.q} className="ls-faq-item" data-reveal style={{ '--i': FAQ.indexOf(item) }}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- 13. final CTA ---------- */}
      <section className="ls-final" data-reveal>
        <h2 className="ls-final-title">Za čtyři minuty víš, kde začít hledat</h2>
        <Link to="/onboarding" className="btn btn-primary btn-lg">
          Začít dotazník zdarma
        </Link>
        <p className="ls-fineprint">Bez registrace · {QUESTION_COUNT} otázek · přeskočit můžeš cokoli</p>
      </section>

      <footer className="ls-footer">
        <div>
          <span className="ls-wordmark">ŠkolaMatch</span>
          <p className="ls-footer-note">
            Data o oborech a hranicích přijetí přebíráme z veřejných rejstříků MŠMT a
            z výsledků jednotné přijímací zkoušky. U každého čísla uvádíme rok a zdroj.
          </p>
        </div>
        <nav className="ls-footer-links" aria-label="Patička">
          <Link to="/skoly">Databáze škol</Link>
          <Link to="/onboarding">Dotazník</Link>
          <Link to="/predplatne">Ceník</Link>
        </nav>
      </footer>
    </div>
  );
}

export default Home;
