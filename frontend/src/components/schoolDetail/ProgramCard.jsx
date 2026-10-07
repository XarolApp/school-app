import InfoHint from './InfoHint';
import HistoryChart from './HistoryChart';
import { yearlyHistory, formatCutoffRange } from '../../lib/schoolPrograms';

const numCz = (v) => (v == null ? null : String(v).replace('.', ','));

function delkaLabel(delka) {
  if (delka == null) return null;
  return delka === 1 ? '1 rok' : delka < 5 ? `${delka} roky` : `${delka} let`;
}

function prijatiWord(n) {
  return n === 1 ? 'přijatý' : n >= 2 && n <= 4 ? 'přijatí' : 'přijatých';
}

function ProgramCard({ entry }) {
  if (entry.isDiscontinued) {
    const y = entry.latest;
    return (
      <div className="sd-program-card sd-program-discontinued">
        <div className="sd-program-head">
          <div>
            <h3 className="sd-program-name">{entry.oborNazev}</h3>
            <div className="sd-chips">
              {entry.typSkoly && <span className="sd-chip">{entry.typSkoly}</span>}
              {entry.kkov && <span className="sd-chip">{entry.kkov}</span>}
            </div>
          </div>
          <span className="sd-discontinued-badge">neotevírá se</span>
        </div>
        <p className="sd-program-note">
          Naposledy otevřeno v roce {entry.latestYear}
          {y.prihlasky != null ? ` (${y.prihlasky} přihlášek` : ''}
          {y.prijati != null ? `, ${y.prijati} ${prijatiWord(y.prijati)})` : y.prihlasky != null ? ')' : ''}. V dalších letech se
          neotevíralo.
        </p>
      </div>
    );
  }

  const y = entry.latest;
  const hasJPZ = entry.jpzPovinna === true;

  return (
    <div className="sd-program-card">
      <div className="sd-program-head">
        <div>
          <h3 className="sd-program-name">{entry.oborNazev}</h3>
          <div className="sd-chips">
            {entry.typSkoly && <span className="sd-chip">{entry.typSkoly}</span>}
            {delkaLabel(entry.delkaStudia) && <span className="sd-chip">{delkaLabel(entry.delkaStudia)}</span>}
            <span className="sd-chip">{entry.maturitni === true ? 'maturita' : entry.maturitni === false ? 'bez maturity' : 'ukončení neuvedeno'}</span>
            <span className="sd-chip">{hasJPZ ? 'JPZ povinná' : entry.jpzPovinna === false ? 'bez JPZ' : 'JPZ neuvedena'}</span>
            {entry.kkov && <span className="sd-chip">{entry.kkov}</span>}
          </div>
        </div>
        {entry.ratio != null && (
          <div className="sd-program-ratio">
            <div className="sd-program-ratio-value">{numCz(entry.ratio)}×</div>
            <div className="sd-program-ratio-label">
              uchazečů na místo
              <InfoHint text={`Kolik uchazečů si v posledním dostupném roce (${entry.latestYear}) podalo přihlášku na jedno volné místo v tomto konkrétním oboru (ne za celou školu).`} />
            </div>
          </div>
        )}
      </div>

      <div className="sd-program-stats">
        <div>
          <div className={`sd-program-stat-value${y.cutoff == null ? ' is-empty' : ''}`}>
            {y.cutoff != null ? formatCutoffRange({ cutoffMin: y.cutoffMin, cutoffMax: y.cutoffMax }) : 'bez dat'}
          </div>
          <div className="sd-program-stat-label">
            {y.cutoff != null ? `hranice ${entry.latestYear}` : entry.jpzPovinna === false ? 'bez jednotné zkoušky' : `hranice ${entry.latestYear} neuvedena`}
            <InfoHint
              text={
                y.cutoff != null
                  ? `Nejnižší počet bodů z češtiny a matematiky (max. 100, tedy 50 + 50), který v roce ${entry.latestYear} stačil na přijetí přímo do tohoto oboru. Je to jeho vlastní hranice, ne průměr celé školy.${y.variants ? ' Obor má více zaměření, každé s vlastní hranicí, proto je tu rozpětí.' : ''}`
                  : entry.jpzPovinna === false
                    ? 'Tento obor nemá jednotnou přijímací zkoušku (JPZ). Přijímá se jinak, např. talentovou zkouškou, takže tu není bodová hranice.'
                    : 'Bodovou hranici tohoto oboru nemáme k dispozici. Chybějící údaj neznamená, že se jednotná přijímací zkouška nekoná. Podmínky ověř v aktuálních kritériích školy.'
              }
            />
          </div>
        </div>
        <div>
          <div className={`sd-program-stat-value${y.prihlasky == null ? ' is-empty' : ''}`}>{y.prihlasky ?? 'bez dat'}</div>
          <div className="sd-program-stat-label">
            přihlášek
            <InfoHint text={`Kolik uchazečů si v roce ${entry.latestYear} podalo přihlášku právě na tento obor.`} />
          </div>
        </div>
        <div>
          <div className={`sd-program-stat-value${y.prijati == null ? ' is-empty' : ''}`}>{y.prijati ?? 'bez dat'}</div>
          <div className="sd-program-stat-label">
            přijatých
            <InfoHint text={`Kolik uchazečů bylo do tohoto oboru v roce ${entry.latestYear} skutečně přijato.`} />
          </div>
        </div>
        <div>
          <div className={`sd-program-stat-value${y.kapacita == null ? ' is-empty' : ''}`}>{y.kapacita ?? 'bez dat'}</div>
          <div className="sd-program-stat-label">
            míst
            <InfoHint text={`Kolik míst tento obor otevíral v přijímačkách ${entry.latestYear}.`} />
          </div>
        </div>
      </div>

      {y.variants && (
        <>
          <div className="sd-variants-head">
            Zaměření v tomto oboru ({y.variants.filter((v) => !v.note).length})
            <InfoHint
              text={`Jeden obor (stejný kód KKOV) může škola otevírat v několika zaměřeních, například jako samostatné třídy nebo programy. Každé má vlastní počet míst, přihlášek i bodovou hranici, proto je hranice oboru rozpětí, ne jedno číslo. Zaměření ukazujeme jen pro rok ${entry.latestYear}: Cermat jejich názvy každý rok přepisuje, takže se mezi roky nedají spolehlivě spárovat. Graf vývoje níž proto sleduje celý obor. Zkrácená, dálková a nástavbová studia (šedě) jsou jen jiná délka nebo forma stejného oboru, ne další zaměření, a do rozpětí hranice se nepočítají.`}
            />
          </div>
          <ul className="sd-variants" aria-label="Zaměření oboru">
            {y.variants.map((v) => (
              <li key={v.zamereni} className={`sd-variant${v.note ? ' is-note' : ''}`}>
                <span className="sd-variant-name">{v.zamereni}</span>
                <span className="sd-variant-nums">
                  {v.cutoff != null ? `${numCz(v.cutoff)} b.` : 'bez hranice'} · {v.prihlasky ?? '–'} přihlášek ·{' '}
                  {v.prijati ?? '–'} přijatých · {v.kapacita ?? '–'} míst
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <HistoryChart points={yearlyHistory(entry)} subject={entry.oborNazev} rangeOf="zamereni" />
      {entry.trend && <p className="sd-program-note">{entry.trend.note}</p>}
    </div>
  );
}

export default ProgramCard;
