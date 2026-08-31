const { Button, OptionRow, Divider } = window.KolaMatchDesignSystem_90cf52;

const QUESTIONS = [
  { q: 'Co bys na střední chtěl dělat nejvíc?', multiple: false, options: [
    ['Programovat a pracovat s technikou', 'Vede na IT a technické obory'],
    ['Pracovat s lidmi', 'Vede na zdravotnické a pedagogické obory'],
    ['Zatím nevím', 'Ukážeme ti hlavně všeobecné gymnázium'],
  ] },
  { q: 'Co je pro tebe u školy důležité? Vyber klidně víc věcí.', multiple: true, options: [
    ['Dojezd do 30 minut', null],
    ['Silná výuka matematiky', null],
    ['Možnost jazykové zkoušky', null],
    ['Malé třídy', null],
  ] },
  { q: 'Jaký máš průměr na posledním vysvědčení?', multiple: false, options: [
    ['1,0 – 1,5', null], ['1,6 – 2,2', null], ['2,3 a výš', null],
  ] },
];

function Questionnaire({ go }) {
  const [step, setStep] = React.useState(0);
  const [picks, setPicks] = React.useState({});
  const item = QUESTIONS[step];
  const chosen = picks[step] || [];
  const toggle = (label) => setPicks({ ...picks,
    [step]: item.multiple ? (chosen.includes(label) ? chosen.filter((x) => x !== label) : [...chosen, label]) : [label] });
  const last = step === QUESTIONS.length - 1;
  return (
    <main>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-xxl) var(--page-margin)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span className="sm-label-caps" style={{ background: 'var(--neutral)', color: 'var(--secondary)',
            borderRadius: 'var(--radius-full)', padding: '5px 12px' }}>Otázka {step + 1} z {QUESTIONS.length}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 'var(--radius-full)', background: 'var(--neutral)' }}>
            <div style={{ width: ((step + 1) / QUESTIONS.length * 100) + '%', height: '100%',
              borderRadius: 'var(--radius-full)', background: 'var(--primary)' }} />
          </div>
        </div>
        <h1 className="sm-headline-lg" style={{ marginTop: 'var(--space-xl)' }}>{item.q}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
          {item.options.map(([label, desc]) => (
            <OptionRow key={label} label={label} description={desc} multiple={item.multiple}
              selected={chosen.includes(label)} onSelect={() => toggle(label)} />
          ))}
        </div>
        <Divider spacing="var(--space-xl)" />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={() => step === 0 ? go('landing') : setStep(step - 1)}>Zpět</Button>
          <Button disabled={chosen.length === 0} onClick={() => last ? go('results') : setStep(step + 1)}>
            {last ? 'Zobrazit výsledky' : 'Pokračovat'}
          </Button>
        </div>
      </div>
    </main>
  );
}
Object.assign(window, { Questionnaire });
