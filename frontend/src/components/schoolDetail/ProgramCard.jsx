import InfoHint from './InfoHint';

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
  const years = Object.keys(entry.years).map(Number).sort((a, b) => a - b).slice(-3);
  const maxPrihlasky = Math.max(...years.map((rok) => entry.years[rok].prihlasky || 0), 1);

  return (
    <div className="sd-program-card">
      <div className="sd-program-head">
        <div>
          <h3 className="sd-program-name">{entry.oborNazev}</h3>
          <div className="sd-chips">
            {entry.typSkoly && <span className="sd-chip">{entry.typSkoly}</span>}
            {delkaLabel(entry.delkaStudia) && <span className="sd-chip">{delkaLabel(entry.delkaStudia)}</span>}
            <span className="sd-chip">{entry.maturitni ? 'maturita' : 'výuční list'}</span>
            <span className="sd-chip">{hasJPZ ? 'JPZ povinná' : 'bez JPZ'}</span>
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
          <div className="sd-program-stat-value">{y.kapacita ?? '—'}</div>
          <div className="sd-program-stat-label">
            míst
            <InfoHint text={`Kolik míst tento obor otevírá pro rok ${entry.latestYear}.`} />
          </div>
        </div>
        <div>
          <div className="sd-program-stat-value">{y.prihlasky ?? '—'}</div>
          <div className="sd-program-stat-label">
            přihlášek
            <InfoHint text={`Kolik uchazečů si v roce ${entry.latestYear} podalo přihlášku právě na tento obor.`} />
          </div>
        </div>
        <div>
          <div className="sd-program-stat-value">{y.prijati ?? '—'}</div>
          <div className="sd-program-stat-label">
            přijatých
            <InfoHint text={`Kolik uchazečů bylo do tohoto oboru v roce ${entry.latestYear} skutečně přijato.`} />
          </div>
        </div>
        <div>
          <div className={`sd-program-stat-value${y.cutoff == null ? ' is-empty' : ''}`}>
            {y.cutoff != null ? `${numCz(y.cutoff)} b.` : '—'}
          </div>
          <div className="sd-program-stat-label">
            {y.cutoff != null ? `hranice ${entry.latestYear}` : 'bez jednotné zkoušky'}
            <InfoHint
              text={
                y.cutoff != null
                  ? `Nejnižší počet bodů z češtiny a matematiky (max. 100 — 50 + 50), který v roce ${entry.latestYear} stačil na přijetí přímo do tohoto oboru — je to jeho vlastní hranice, ne průměr celé školy.`
                  : `Tento obor nemá jednotnou přijímací zkoušku (JPZ) — přijímá se jinak, např. talentovou zkouškou, takže tu není bodová hranice.`
              }
            />
          </div>
        </div>
      </div>

      {years.length > 1 && (
        <div>
          <div className="sd-program-trend-label">Vývoj {years[0]} → {years[years.length - 1]}</div>
          <div className="sd-trend-rows">
            {years.map((rok, i) => {
              const yr = entry.years[rok];
              const pct = yr.prihlasky ? Math.max(6, Math.round((yr.prihlasky / maxPrihlasky) * 100)) : 0;
              const isCurrent = i === years.length - 1;
              return (
                <div className="sd-trend-row" key={rok}>
                  <div className="sd-trend-year">
                    <span>{rok}</span>
                    <strong>
                      {yr.prihlasky != null ? `${yr.prihlasky} přihlášek` : 'bez dat'}
                      {yr.cutoff != null ? ` · hranice ${numCz(yr.cutoff)} b.` : ''}
                    </strong>
                  </div>
                  <div className="sd-trend-bar-track">
                    <div
                      className={`sd-trend-bar-fill${isCurrent ? ' is-current' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {entry.trend && <p className="sd-program-note">{entry.trend.note}</p>}
        </div>
      )}
    </div>
  );
}

export default ProgramCard;
