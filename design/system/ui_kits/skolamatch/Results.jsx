const { Card, Chip, Divider, MatchIndicator, Button } = window.KolaMatchDesignSystem_90cf52;

const MATCHES = [
  { name: 'Smíchovská SPŠ a gymnázium', meta: ['Praha 5', 'státní', 'Informatika'], cut: '44,0',
    criteria: [
      { text: 'Nabízí IT zaměření, které jsi označil jako důležité' },
      { text: 'Dojezd 22 minut z tvé adresy' },
      { text: 'Otevírá 120 míst, o 8 více než v roce 2025' },
    ] },
  { name: 'SPŠ elektrotechnická Ječná', meta: ['Praha 2', 'státní', 'Informatika'], cut: '41,0',
    criteria: [
      { text: 'Nabízí IT zaměření, které jsi označil jako důležité' },
      { text: 'Loňská hranice přijetí 41,0 bodu' },
      { text: 'Dojezd 41 minut — víc než 30 minut, které jsi zadal', met: false },
    ] },
  { name: 'Gymnázium Na Zatlance', meta: ['Praha 5', 'státní', 'Všeobecné'], cut: '49,0',
    criteria: [
      { text: 'Dojezd 17 minut z tvé adresy' },
      { text: 'Silná výuka matematiky — čtyři hodiny týdně ve všech ročnících' },
      { text: 'Nemá samostatný IT obor', met: false },
    ] },
];

function Results({ go }) {
  return (
    <main>
      <Page>
        <h1 className="sm-headline-lg">Školy, které odpovídají tvým odpovědím</h1>
        <p className="sm-body-md" style={{ marginTop: 'var(--space-sm)', color: 'var(--secondary)' }}>
          Řazeno podle toho, kolik z tvých kritérií škola splňuje. U každé je napsané které.
          Čísla pocházejí z přijímacího řízení 2025.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
          {MATCHES.map((m) => (
            <Card key={m.name} interactive onClick={() => go('detail')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-xxl)' }}>
                <div>
                  <h2 className="sm-headline-sm" style={{ margin: 0 }}>{m.name}</h2>
                  <div style={{ display: 'flex', gap: '6px', marginTop: 'var(--space-sm)' }}>
                    {m.meta.map((t) => <Chip key={t}>{t}</Chip>)}
                  </div>
                  <Divider spacing="var(--space-md)" />
                  <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
                    <div><div className="sm-caption">Hranice přijetí 2025</div><div className="sm-data-md">{m.cut} bodu</div></div>
                    <div><div className="sm-caption">Přijato z přihlášených</div><div className="sm-data-md">120 / 287</div></div>
                  </div>
                </div>
                <MatchIndicator criteria={m.criteria} />
              </div>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <Button onClick={() => go('paywall')}>Odemknout podrobné srovnání</Button>
          <span className="sm-caption">Zbylých 14 shod, srovnávací tabulka a odhad podle tvého průměru.</span>
        </div>
      </Page>
      <Footer />
    </main>
  );
}
Object.assign(window, { Results });
