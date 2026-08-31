const { Card, Button, Input, Checkbox, Divider } = window.KolaMatchDesignSystem_90cf52;

function Paywall({ go }) {
  const [email, setEmail] = React.useState('');
  const [terms, setTerms] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const bad = tried && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);
  return (
    <main>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 'var(--space-xxl) var(--page-margin)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-xxxl)', alignItems: 'start' }}>
          <div>
            <h1 className="sm-headline-lg">Podrobné srovnání</h1>
            <p className="sm-body-lg" style={{ marginTop: 'var(--space-md)', color: 'var(--secondary)' }}>
              Dotazník a seznam shod zůstávají zdarma. Platí se za srovnávací tabulku všech škol,
              historii hranic přijetí a odhad podle průměru na vysvědčení.
            </p>
            <Divider spacing="var(--space-lg)" />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {['Všech 17 shod, ne jen prvních tři',
                'Srovnávací tabulka až pěti škol vedle sebe',
                'Hranice přijetí za roky 2021–2025 u každého oboru',
                'Termíny DiPSy a podklady k přihlášce v PDF',
                'Přístup pro rodiče na stejný účet'].map((t) => (
                <li key={t} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 4, flex: '0 0 auto' }}><path d="M20 6.5 9.5 17.5 4.5 12.5" /></svg>
                  <span className="sm-body-md">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
              <span className="sm-headline-md" style={{ fontFamily: 'var(--font-serif-display)' }}>390 Kč</span>
              <span className="sm-caption">jednorázově, bez obnovení</span>
            </div>
            <Divider spacing="var(--space-md)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Input label="E-mail rodiče" placeholder="jmeno@email.cz" value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={bad ? 'Zkontrolujte prosím tvar e-mailové adresy.' : undefined}
                hint="Na tuto adresu pošleme přístup ke srovnání." />
              <Checkbox label="Souhlasím s podmínkami služby" checked={terms} onChange={setTerms} />
              <Button fullWidth size="lg" disabled={!terms} onClick={() => setTried(true)}>Zaplatit 390 Kč</Button>
              <p className="sm-caption">
                Platba přes Stripe. Do 14 dnů vracíme peníze bez uvedení důvodu.
              </p>
            </div>
          </Card>
        </div>
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <Button variant="secondary" onClick={() => go('results')}>Zpět na shody</Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
Object.assign(window, { Paywall });
