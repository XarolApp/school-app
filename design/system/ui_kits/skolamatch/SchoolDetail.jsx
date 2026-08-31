const { Card, Chip, Divider, MatchIndicator, Tooltip, Button } = window.KolaMatchDesignSystem_90cf52;

function Row({ label, value, note }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: 'var(--row-pad-dense) 0', borderBottom: '1px solid var(--border)', gap: 'var(--space-lg)' }}>
      <span className="sm-body-sm" style={{ color: 'var(--secondary)' }}>{label}</span>
      <span style={{ textAlign: 'right' }}>
        <span className="sm-data-md">{value}</span>
        {note && <span className="sm-caption" style={{ display: 'block' }}>{note}</span>}
      </span>
    </div>
  );
}

function SchoolDetail({ go }) {
  return (
    <main>
      <Page>
        <a href="#" onClick={(e) => { e.preventDefault(); go('results'); }} className="sm-body-sm">← Zpět na shody</a>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-xxxl)', marginTop: 'var(--space-md)' }}>
          <div>
            <h1 className="sm-headline-lg">Smíchovská SPŠ a gymnázium</h1>
            <div style={{ display: 'flex', gap: '6px', marginTop: 'var(--space-md)' }}>
              {['Praha 5', 'státní', '4 roky', 'Informatika', 'Preslova 25'].map((t) => <Chip key={t}>{t}</Chip>)}
            </div>
            <p className="sm-body-md" style={{ marginTop: 'var(--space-lg)' }}>
              Škola nabízí dva maturitní obory se zaměřením na informační technologie a jeden
              všeobecný gymnaziální program. Výuka programování začíná v prvním ročníku.
            </p>
            <PhotoSlot height={260} label="Fotografie školy · dodá redakce" />

            <h2 className="sm-headline-md" style={{ marginTop: 'var(--space-xl)' }}>Přijímací řízení</h2>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Row label="Hranice přijetí 2025" value="44,0 bodu" note="ze 100 bodů jednotné zkoušky" />
              <Row label="Hranice přijetí 2024" value="41,5 bodu" />
              <Row label="Přijato z přihlášených" value="120 / 287" />
              <Row label="Počet míst 2026" value="120" note="o 8 více než v roce 2025" />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--row-pad-dense) 0' }}>
                <Tooltip content="DiPSy — digitální přihlašovací systém pro střední školy, spravovaný MŠMT.">
                  <span className="sm-body-sm" style={{ color: 'var(--secondary)', borderBottom: '1px dashed var(--border-strong)' }}>Přihlášky přes DiPSy</span>
                </Tooltip>
                <span className="sm-data-md">1.–20. 2. 2026</span>
              </div>
            </div>
            <p className="sm-body-sm" style={{ marginTop: 'var(--space-md)', color: 'var(--secondary)' }}>
              Hranice přijetí se rok od roku mění podle toho, kolik lidí se přihlásí a jak dopadne
              zkouška — číslo z roku 2025 je vodítko, ne podmínka.
            </p>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Card>
              <MatchIndicator criteria={[
                { text: 'Nabízí IT zaměření, které jsi označil jako důležité' },
                { text: 'Dojezd 22 minut z tvé adresy' },
                { text: 'Otevírá 120 míst, o 8 více než v roce 2025' },
                { text: 'Malé třídy jsi označil jako důležité; průměrná třída má 30 žáků', met: false },
              ]} />
              <Divider spacing="var(--space-md)" />
              <Button fullWidth onClick={() => go('paywall')}>Přidat do srovnání</Button>
            </Card>
            <Card raised={false}>
              <p className="sm-label-caps" style={{ color: 'var(--on-surface-faint)' }}>Zdroje</p>
              <p className="sm-body-sm" style={{ marginTop: 'var(--space-sm)', color: 'var(--secondary)' }}>
                Rejstřík škol MŠMT (2026-01) · výsledky jednotné přijímací zkoušky CERMAT (2024, 2025) ·
                webové stránky školy.
              </p>
            </Card>
          </aside>
        </div>
      </Page>
      <Footer />
    </main>
  );
}
Object.assign(window, { SchoolDetail });
