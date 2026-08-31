const { Button, Card, Divider } = window.KolaMatchDesignSystem_90cf52;

function Landing({ go }) {
  return (
    <main>
      <Page>
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--space-xxxl)', alignItems: 'center' }}>
          <div>
            <p className="sm-label-caps" style={{ color: 'var(--secondary)' }}>Pro deváťáky a jejich rodiče</p>
            <h1 className="sm-display" style={{ marginTop: 'var(--space-md)', maxWidth: '14ch' }}>Vyber si školu podle sebe</h1>
            <p className="sm-body-lg" style={{ marginTop: 'var(--space-lg)', color: 'var(--secondary)' }}>
              Odpovíš na dvacet otázek o tom, co tě zajímá, kam dojedeš a jak se ti učí. Pak uvidíš
              školy, které tomu odpovídají — a u každé napsané, čím konkrétně.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
              <Button size="lg" onClick={() => go('quiz')}>Začít dotazník</Button>
              <Button size="lg" variant="secondary" onClick={() => go('search')}>Prohlédnout databázi škol</Button>
            </div>
            <p className="sm-caption" style={{ marginTop: 'var(--space-md)' }}>
              Dotazník je zdarma. Platí se až za podrobné srovnání.
            </p>
          </div>
          <PhotoSlot height={380} />
        </div>

        <Divider strong spacing="var(--space-xxl)" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--gutter)' }}>
          {[
            ['Podle tvých kritérií', 'U každé školy je napsané, které z věcí, co jsi označil jako důležité, škola nabízí — a které ne.'],
            ['Čísla se zdrojem', 'Hranice přijetí, počet míst a obory pocházejí z veřejných rejstříků. U každého čísla je rok.'],
            ['Beze skóre', 'Nedáváme školám známky ani ti neříkáme, jak dobrý jsi kandidát. Ukazujeme fakta a jak sedí k tomu, co jsi napsal.'],
          ].map(([h, b]) => (
            <Card key={h}>
              <h3 className="sm-headline-sm" style={{ margin: 0 }}>{h}</h3>
              <p className="sm-body-sm" style={{ marginTop: 'var(--space-sm)', color: 'var(--secondary)' }}>{b}</p>
            </Card>
          ))}
        </div>
      </Page>
      <Footer />
    </main>
  );
}
Object.assign(window, { Landing });
