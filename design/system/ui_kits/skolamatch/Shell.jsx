const { Button, Divider } = window.KolaMatchDesignSystem_90cf52;

function Wordmark({ tone = 'primary' }) {
  return <span style={{ fontFamily: 'var(--font-serif-display)', fontWeight: 600, fontSize: 21,
    letterSpacing: '-0.01em', fontVariationSettings: "'SOFT' 40, 'opsz' 24",
    color: tone === 'primary' ? 'var(--primary)' : 'var(--surface)' }}>ŠkolaMatch</span>;
}

function Header({ go, active }) {
  const items = [['search', 'Databáze škol'], ['quiz', 'Dotazník'], ['results', 'Moje shody']];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--surface)',
      borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 var(--page-margin)',
        height: 68, display: 'flex', alignItems: 'center', gap: 'var(--space-xxl)' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); go('landing'); }} style={{ borderBottom: 0, display: 'flex' }}><Wordmark /></a>
        <nav style={{ display: 'flex', gap: 'var(--space-lg)', flex: 1 }}>
          {items.map(([k, label]) => (
            <a key={k} href="#" onClick={(e) => { e.preventDefault(); go(k); }}
              style={{ fontSize: 'var(--fs-body-sm)', fontWeight: active === k ? 600 : 400,
                color: active === k ? 'var(--on-surface)' : 'var(--secondary)', borderBottom: 0 }}>{label}</a>
          ))}
        </nav>
        <Button variant="secondary" size="sm" onClick={() => go('paywall')}>Přihlásit se</Button>
        <Button size="sm" onClick={() => go('quiz')}>Začít dotazník</Button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 var(--page-margin) var(--space-xxl)' }}>
      <Divider strong spacing="var(--space-xl)" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-xl)' }}>
        <div>
          <Wordmark />
          <p className="sm-caption" style={{ marginTop: 'var(--space-sm)', maxWidth: '46ch' }}>
            Data o oborech a hranicích přijetí přebíráme z veřejných rejstříků MŠMT a z výsledků
            jednotné přijímací zkoušky. U každého čísla uvádíme rok a zdroj.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
          {['Jak to funguje', 'Zdroje dat', 'Ceník', 'Kontakt'].map((t) => (
            <a key={t} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--secondary)', borderBottom: 0 }}>{t}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* Photography placeholder — no imagery assets were supplied with DESIGN.md. */
function PhotoSlot({ height = 320, label = 'Fotografie · reální lidé, teplý tón' }) {
  return <div style={{ height, borderRadius: 'var(--radius-card)', background: 'var(--neutral)',
    border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'flex-end', padding: 'var(--space-md)' }}>
    <span className="sm-caption" style={{ color: 'var(--on-surface-faint)' }}>{label}</span>
  </div>;
}

function Page({ children, wide }) {
  return <div style={{ maxWidth: wide ? '100%' : 'var(--content-max)', margin: '0 auto',
    padding: 'var(--space-xxl) var(--page-margin)' }}>{children}</div>;
}

Object.assign(window, { Wordmark, Header, Footer, PhotoSlot, Page });
